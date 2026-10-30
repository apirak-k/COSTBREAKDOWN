import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { basename, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import net from 'node:net'
import * as XLSX from 'xlsx'
import { existsSync } from 'node:fs'

function findChrome() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH].filter(Boolean)
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  if (process.platform === 'win32') candidates.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim() } catch {}
  }
  throw new Error('Chrome was not found. Set CHROME_BIN to a Chrome executable.')
}

async function unusedPort() {
  const server = net.createServer()
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const { port } = server.address()
  await new Promise(resolveClose => server.close(resolveClose))
  return port
}

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms))
const repository = process.cwd()
const require = createRequire(import.meta.url)
const loadTypeScript = require('jiti')(import.meta.url)
const artifactDir = process.env.COSTBREAKDOWN_EXCEL_VALIDATION_DIR ?? '/tmp/costbreakdown-excel-validation-2026-10-26'
const requiredArtifacts = ['export-reference.xlsx', 'export-current.xlsx', 'export-custom.xlsx']
for (const artifact of requiredArtifacts) {
  await readFile(join(artifactDir, artifact))
}

const chromeProfile = await mkdtemp(join(tmpdir(), 'costbreakdown-excel-browser-profile-'))
const downloadDir = join(artifactDir, 'browser-downloads')
await rm(downloadDir, { recursive: true, force: true })
await import('node:fs/promises').then(({ mkdir }) => mkdir(downloadDir, { recursive: true }))
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const viteCacheDir = await mkdtemp(join(tmpdir(), 'costbreakdown-import-vite-cache-'))
const viteConfigPath = join(artifactDir, 'vite-import-test.config.mjs')
await writeFile(viteConfigPath, [
  `import projectConfig from ${JSON.stringify(pathToFileURL(join(repository, 'vite.config.ts')).href)}`,
  `export default { ...projectConfig, cacheDir: ${JSON.stringify(viteCacheDir)} }`
].join('\n'))
const vite = spawn(process.execPath, [viteCliPath, '--config', viteConfigPath, '--configLoader', 'runner', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
  cwd: repository,
  stdio: ['ignore', 'pipe', 'pipe']
})
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
let chrome
let client
const browserErrors = []
const browserDownloads = []
const browserViteMessages = []
const mainFrameNavigations = []

function stopChild(child) {
  return new Promise(resolveStop => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolveStop()
    const timer = setTimeout(() => child.kill('SIGKILL'), 2500)
    child.once('exit', () => { clearTimeout(timer); resolveStop() })
    child.kill('SIGTERM')
  })
}

try {
  const baseUrl = `http://127.0.0.1:${vitePort}/`
  const chromeArgs = [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeProfile}`, '--window-size=1440,1800', 'about:blank'
  ]
  if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
  chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })

  const waitFor = async (check, label, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await check()) return
      if (chrome.exitCode !== null) break
      await delay(100)
    }
    throw new Error(`${label} did not become ready`)
  }
  const debugUrl = `http://127.0.0.1:${debugPort}`
  try {
    await waitFor(async () => {
      try { return (await fetch(baseUrl)).ok } catch { return false }
    }, 'Vite')
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}; Vite output=${viteOutput.join('').slice(-5000)}`)
  }
  await waitFor(async () => {
    try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false }
  }, 'Chrome DevTools')
  const targetResponse = await fetch(`${debugUrl}/json/new?about:blank`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open app: ${targetResponse.status}`)
  const target = await targetResponse.json()
  client = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveOpen, rejectOpen) => {
    client.addEventListener('open', resolveOpen, { once: true })
    client.addEventListener('error', rejectOpen, { once: true })
  })

  let commandId = 0
  const pending = new Map()
  client.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) {
      mainFrameNavigations.push({ url: message.params.frame.url, loaderId: message.params.frame.loaderId })
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails
      const stack = details.stackTrace?.callFrames?.slice(0, 4).map(frame => `${frame.functionName || '<anonymous>'}@${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1}`).join(' <- ')
      browserErrors.push(`${details.text}: ${details.exception?.description ?? ''}${stack ? ` (${stack})` : ''}`)
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map(argument => argument.value ?? argument.description).join(' ')
      if (['error', 'warning'].includes(message.params.type)) browserErrors.push(text)
      if (/\[vite\]|dependenc(?:y|ies).*optim|page reload/i.test(text)) browserViteMessages.push(text)
    }
    if (message.method?.startsWith('Browser.download')) browserDownloads.push({ method: message.method, params: message.params })
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  })
  const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId
    const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`Chrome DevTools command timed out: ${method}`)) }, 15000)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) rejectCommand(new Error(`${method}: ${message.error.message}${method === 'Runtime.evaluate' ? `; expression=${params.expression}` : ''}`))
      else resolveCommand(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
    return response.result.result.value
  }
  const dispatchClick = async point => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(120)
  }
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    await dispatchClick(point)
  }
  const clickText = async (text, root = 'document') => {
    const point = await evaluate(`(()=>{const r=${root};const e=[...r.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.innerText.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing button '+${JSON.stringify(text)});e.scrollIntoView({block:'center',inline:'nearest'});const rect=e.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    await dispatchClick(point)
  }
  const waitUntil = async (expression, label, timeoutMs = 30000) => {
    let lastValue
    let lastError
    try {
      await waitFor(async () => {
        try {
          lastValue = await evaluate(expression)
          return Boolean(lastValue)
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
          return false
        }
      }, label, timeoutMs)
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; last value=${JSON.stringify(lastValue)}; last evaluation error=${lastError ?? 'none'}; page=${JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,title:document.title})').catch(e=>e.message))}`)
    }
  }
  const replaceInput = async (selector, value) => {
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input '+${JSON.stringify(selector)});e.focus();e.select()})()`)
    const modifier = process.platform === 'darwin' ? 4 : 2
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: modifier, windowsVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: modifier, windowsVirtualKeyCode: 65 })
    await send('Input.insertText', { text: value })
    await delay(100)
    return evaluate(`document.querySelector(${JSON.stringify(selector)})?.value ?? null`)
  }
  const setFile = async filePath => {
    const document = await send('DOM.getDocument', { depth: 1 })
    const query = await send('DOM.querySelector', { nodeId: document.result.root.nodeId, selector: 'input[type="file"]' })
    if (!query.result.nodeId) throw new Error('Import file input is missing')
    await send('DOM.setFileInputFiles', { files: [filePath], nodeId: query.result.nodeId })
  }
  const mainProductValue = () => evaluate(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value ?? null`)
  const statusForRole = role => evaluate(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith(${JSON.stringify(role)}+' —'))?.getAttribute('aria-label') ?? null`)
  const selectRole = async role => {
    await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')?.startsWith(${JSON.stringify(role)}+' —'));if(!b)throw Error('Missing role '+${JSON.stringify(role)});b.click()})()`)
    await waitUntil(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')!==null`, `${role} metadata editor`)
  }
  const openImport = async () => {
    await click('button[aria-label="Import"]')
    await waitUntil(`Boolean(document.querySelector('[role=dialog] input[type=file]'))`, 'Import dialog')
  }
  const stageFile = async filePath => {
    await setFile(filePath)
    const expectedFileName = basename(filePath)
    try {
      await waitUntil(`(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const fileName = [...(dialog?.querySelectorAll('[title]') ?? [])].find(element => element.getAttribute('title') === ${JSON.stringify(expectedFileName)})
        const status = [...(fileName?.parentElement?.querySelectorAll('span') ?? [])].some(element => ['Valid', 'Invalid'].includes(element.textContent.trim()))
        return Boolean(fileName && status)
      })()`, `file validation: ${filePath}`)
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; main-frame navigations=${JSON.stringify(mainFrameNavigations)}; Vite output=${viteOutput.join('').slice(-3000)}; Vite browser messages=${JSON.stringify(browserViteMessages)}`)
    }
  }
  const workbookImportSummary = async filePath => {
    const workbook = XLSX.read(await readFile(filePath), { type: 'buffer' })
    const rows = sheetName => Math.max(0, XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null }).length - 3)
    const meta = XLSX.utils.sheet_to_json(workbook.Sheets.META, { header: 1, defval: null })
    return {
      productName: meta[2]?.[1] ?? '',
      rows: [
        { label: 'Bill of Materials', value: `${rows('BOM')} rows` },
        { label: 'Work Centers', value: `${rows('WORK_CENTER')} rows` },
        { label: 'Routing', value: `${rows('ROUTING')} rows` }
      ]
    }
  }
  const assertValidWorkbookPresentation = async (filePath, label) => {
    const expectedFileName = basename(filePath)
    const expectedSummary = await workbookImportSummary(filePath)
    const state = await evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const fileName = [...(dialog?.querySelectorAll('[title]') ?? [])].find(element => element.getAttribute('title') === ${JSON.stringify(expectedFileName)})
      const status = [...(fileName?.parentElement?.querySelectorAll('span') ?? [])].find(element => ['Valid', 'Invalid'].includes(element.textContent.trim()))?.textContent.trim() ?? null
      const summary = dialog?.querySelector('[aria-label="Workbook import summary"]')
      const summaryRows = [...(summary?.querySelectorAll('dl > div') ?? [])].map(row => ({
        label: row.querySelector('dt')?.textContent.trim() ?? '',
        value: row.querySelector('dd')?.textContent.trim() ?? ''
      }))
      const warningUi = [...(dialog?.querySelectorAll('*') ?? [])].some(element => {
        const classes = typeof element.className === 'string' ? element.className : ''
        return /(?:text|bg|border)-(?:amber|yellow)-/i.test(classes)
      })
      return {
        dialogOpen: Boolean(dialog),
        fileName: fileName?.textContent.trim() ?? null,
        status,
        summary: summary ? {
          productName: summary.querySelector(':scope > div span:last-child')?.textContent.trim() ?? '',
          rows: summaryRows
        } : null,
        importAvailable: Boolean([...dialog?.querySelectorAll('button') ?? []].find(button => button.innerText.trim() === 'Import' && !button.disabled)),
        warningLabelOrDetails: Boolean(dialog?.querySelector('[aria-label*="warning" i], [id*="import-warning" i], [aria-controls="import-warning-details"]')) || /Import warnings?/i.test(dialog?.innerText ?? ''),
        warningUi
      }
    })()`)
    assert.equal(state.dialogOpen, true, `${label}: valid workbook keeps Import modal open`)
    assert.equal(state.fileName, expectedFileName, `${label}: exact filename is shown`)
    assert.equal(state.status, 'Valid', `${label}: status is Valid`)
    assert.deepEqual(state.summary, expectedSummary, `${label}: product and row summary match the workbook`)
    assert.equal(state.importAvailable, true, `${label}: Import action is available`)
    assert.equal(state.warningLabelOrDetails, false, `${label}: Import warning label/count/details are absent`)
    assert.equal(state.warningUi, false, `${label}: warning-specific amber/yellow UI is absent`)
  }
  const assertInvalidWorkbookPresentation = async (filePath, label, priorProductName) => {
    const expectedFileName = basename(filePath)
    const state = await evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const fileName = [...(dialog?.querySelectorAll('[title]') ?? [])].find(element => element.getAttribute('title') === ${JSON.stringify(expectedFileName)})
      const row = fileName?.parentElement
      return {
        dialogOpen: Boolean(dialog),
        fileName: fileName?.textContent.trim() ?? null,
        status: [...(row?.querySelectorAll('span') ?? [])].find(element => ['Valid', 'Invalid'].includes(element.textContent.trim()))?.textContent.trim() ?? null,
        alertPresent: Boolean(dialog?.querySelector('[role="alert"]')),
        explanatoryError: Boolean(dialog?.querySelector('p')) || /Choose an Excel workbook|Workbook structure is not supported|Could not read the workbook|Import rejected/i.test(dialog?.innerText ?? ''),
        importAvailable: Boolean([...dialog?.querySelectorAll('button') ?? []].find(button => button.innerText.trim() === 'Import'))
      }
    })()`)
    assert.equal(state.dialogOpen, true, `${label}: invalid workbook keeps Import modal open`)
    assert.equal(state.fileName, expectedFileName, `${label}: exact invalid filename is shown`)
    assert.equal(state.status, 'Invalid', `${label}: status is Invalid`)
    assert.equal(state.alertPresent, false, `${label}: no alert is rendered`)
    assert.equal(state.explanatoryError, false, `${label}: no red explanation or parser detail is rendered`)
    assert.equal(state.importAvailable, false, `${label}: Import action is absent`)
    assert.equal(await mainProductValue(), priorProductName, `${label}: invalid workbook does not change Working`)
  }
  const dialogButton = text => clickText(text, 'document.querySelector("[role=dialog]")')
  const waitDialogClosed = () => waitUntil('!document.querySelector("[role=dialog]")', 'dialog close')
  const listXlsx = async () => (await readdir(downloadDir)).filter(file => file.endsWith('.xlsx'))
  const waitNewDownload = async previous => {
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      const names = await listXlsx()
      const file = names.find(name => !previous.has(name))
      if (file && !(await readdir(downloadDir)).includes(`${file}.crdownload`)) {
        const bytes = await readFile(join(downloadDir, file))
        if (bytes.length > 1000) return join(downloadDir, file)
      }
      await delay(100)
    }
    throw new Error(`Browser did not finish the expected XLSX download; files=${JSON.stringify(await readdir(downloadDir))}; downloads=${JSON.stringify(browserDownloads)}; browserErrors=${JSON.stringify(browserErrors)}`)
  }
  const workbookProductName = async filePath => {
    const workbook = XLSX.read(await readFile(filePath), { type: 'buffer' })
    return XLSX.utils.sheet_to_json(workbook.Sheets.META, { header: 1, defval: null })[2]?.[1]
  }
  const activeRoleName = role => role[0].toUpperCase() + role.slice(1)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('DOM.enable')
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true })
  await send('Page.navigate', { url: baseUrl })
  await waitUntil(`Boolean(document.querySelector('button[aria-label="Import"]'))`, 'Master Data workspace')
  await evaluate('(()=>{Object.defineProperty(window,"showSaveFilePicker",{value:undefined,configurable:true});return true})()')
  await waitUntil('document.querySelector("[role=switch]")?.getAttribute("aria-checked")==="true"', 'Master Data edit mode')
  const appMainFrameNavigationCount = () => mainFrameNavigations.filter(navigation => navigation.url.startsWith(baseUrl)).length

  const artifacts = {
    reference: join(artifactDir, 'export-reference.xlsx'),
    current: join(artifactDir, 'export-current.xlsx'),
    custom: join(artifactDir, 'export-custom.xlsx')
  }
  const nextRole = { reference: 'current', current: 'custom', custom: 'reference' }
  const expectedWorking = {}
  let firstWorkbookSelected = false

  for (const role of ['reference', 'current', 'custom']) {
    const label = activeRoleName(role)
    await selectRole(label)
    const before = await mainProductValue()
    await openImport()
    const beforeFirstWorkbookNavigationCount = !firstWorkbookSelected
      ? appMainFrameNavigationCount()
      : null
    await stageFile(artifacts[role])
    if (beforeFirstWorkbookNavigationCount !== null) {
      const viteLines = viteOutput.join('').split(/\r?\n/).filter(line => /optim|dependenc|reload/i.test(line))
      const newNavigations = appMainFrameNavigationCount()
      console.log(`First XLSX selection diagnostics: app navigations ${beforeFirstWorkbookNavigationCount} → ${newNavigations}; Vite=${JSON.stringify(viteLines)}; browser=${JSON.stringify(browserViteMessages)}`)
      assert.equal(newNavigations, beforeFirstWorkbookNavigationCount, 'first XLSX selection does not trigger a full-page reload')
      firstWorkbookSelected = true
      await assertValidWorkbookPresentation(artifacts[role], `${label} first valid XLSX selection`)

      const beforeSubsequentSelectionNavigationCount = appMainFrameNavigationCount()
      await stageFile(artifacts[nextRole[role]])
      await assertValidWorkbookPresentation(artifacts[nextRole[role]], `${label} subsequent valid XLSX selection`)
      assert.equal(appMainFrameNavigationCount(), beforeSubsequentSelectionNavigationCount,
        'a subsequent valid workbook selection in the same browser session does not reload the app')

      await stageFile(artifacts[role])
      await assertValidWorkbookPresentation(artifacts[role], `${label} reselected valid XLSX`)
    }
    assert.equal(await mainProductValue(), before, `${label} file selection stages the workbook without mutating Working`)
    await dialogButton('Cancel')
    await waitDialogClosed()
    assert.equal(await mainProductValue(), before, `${label} Cancel leaves Working unchanged`)

    await openImport()
    await stageFile(artifacts[role])
    await assertValidWorkbookPresentation(artifacts[role], `${label} import selection`)
    await dialogButton('Import')
    await waitDialogClosed()
    const baselineName = `${label} Precision Part`
    await waitUntil(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value===${JSON.stringify(baselineName)}`, `${label} explicit Import applies to viewed role`)
    assert.equal(await statusForRole(label), `${label} — Draft`, `${label} import has not overwritten an absent Last Saved checkpoint`)

    await click('button[aria-label="Save"]')
    await waitUntil(`([...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith(${JSON.stringify(label)}+' —'))?.getAttribute('aria-label'))===${JSON.stringify(`${label} — Saved`)}`, `${label} Save checkpoint`)
    const unsavedName = `${label} Working Only`
    assert.equal(await replaceInput('[aria-label="Working dataset controls"] input[aria-label="Product Name"]', unsavedName), unsavedName)
    await waitUntil(`([...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith(${JSON.stringify(label)}+' —'))?.getAttribute('aria-label'))===${JSON.stringify(`${label} — Draft`)}`, `${label} unsaved Working differs from Last Saved`)

    const beforeDownloads = new Set(await listXlsx())
    await click('button[aria-label="Export"]')
    const exported = await waitNewDownload(beforeDownloads)
    assert.equal(await workbookProductName(exported), unsavedName, `${label} Export writes current unsaved Working, not Last Saved`)
    expectedWorking[role] = unsavedName

    await openImport()
    const alternate = nextRole[role]
    await stageFile(artifacts[alternate])
    assert.equal(await mainProductValue(), unsavedName, `${label} parsed Import remains staged behind the modal`)
    await dialogButton('Cancel')
    await waitDialogClosed()
    assert.equal(await mainProductValue(), unsavedName, `${label} cancel leaves unsaved Working intact`)

    await openImport()
    await stageFile(artifacts[alternate])
    await dialogButton('Import')
    await waitDialogClosed()
    const replacementName = `${activeRoleName(alternate)} Precision Part`
    await waitUntil(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value===${JSON.stringify(replacementName)}`, `${label} explicit replacement applies staged values`)
    assert.equal(await statusForRole(label), `${label} — Draft`, `${label} Import leaves its earlier Last Saved checkpoint untouched`)
    expectedWorking[role] = replacementName
    console.log(`${label}: stage/cancel, explicit target import, Saved/Working separation, and Working-state Export PASS`)
  }

  await selectRole('Reference')
  await openImport()
  await stageFile(artifacts.custom)
  const stagedBeforeInvalid = await mainProductValue()
  const invalidWorkbook = XLSX.read(await readFile(artifacts.reference), { type: 'buffer' })
  invalidWorkbook.Sheets.BOM.A3 = { t: 's', v: 'Unsupported Header' }
  const invalidPath = join(artifactDir, 'browser-invalid-header.xlsx')
  await writeFile(invalidPath, XLSX.write(invalidWorkbook, { type: 'buffer', bookType: 'xlsx' }))
  const invalidHeaderNavigationCount = appMainFrameNavigationCount()
  await stageFile(invalidPath)
  await assertInvalidWorkbookPresentation(invalidPath, 'invalid header workbook', stagedBeforeInvalid)
  assert.equal(appMainFrameNavigationCount(), invalidHeaderNavigationCount, 'invalid workbook does not reload the app')
  await dialogButton('Cancel')
  await waitDialogClosed()
  assert.equal(await mainProductValue(), stagedBeforeInvalid)

  const xlsNamedPath = join(artifactDir, 'browser-invalid-extension.xls')
  await copyFile(artifacts.reference, xlsNamedPath)
  await openImport()
  const invalidExtensionNavigationCount = appMainFrameNavigationCount()
  await stageFile(xlsNamedPath)
  await assertInvalidWorkbookPresentation(xlsNamedPath, 'non-.xlsx extension', stagedBeforeInvalid)
  assert.equal(appMainFrameNavigationCount(), invalidExtensionNavigationCount, 'invalid extension does not reload the app')
  await dialogButton('Cancel')
  await waitDialogClosed()
  console.log('Invalid header and non-.xlsx selections keep filename + Invalid status, hide error explanations and Import, stay open, and preserve Working.')

  await selectRole('Custom')
  const warningWorkbook = XLSX.read(await readFile(artifacts.reference), { type: 'buffer' })
  const warningRows = Array.from({ length: 27 }, (_, index) => index === 0
    ? ['', 1, '', '', 0, '']
    : [`Warning material ${index + 1}`, 1, '', 1, 0, ''])
  XLSX.utils.sheet_add_aoa(warningWorkbook.Sheets.BOM, warningRows, { origin: 'A4' })
  const manyWarningsPath = join(artifactDir, 'browser-many-warnings.xlsx')
  await writeFile(manyWarningsPath, XLSX.write(warningWorkbook, { type: 'buffer', bookType: 'xlsx' }))
  const warningBytes = await readFile(manyWarningsPath)
  const { parseSnapshotWorkbookData } = loadTypeScript(join(repository, 'src/services/excel/snapshot-parser.ts'))
  const warningData = warningBytes.buffer.slice(warningBytes.byteOffset, warningBytes.byteOffset + warningBytes.byteLength)
  const warningImportResult = parseSnapshotWorkbookData(warningData, 'custom')
  assert.equal(warningImportResult.success, true, 'workbook containing parser warnings is accepted for import')
  assert.ok(warningImportResult.warnings.length > 0, 'warning fixture produces parser warnings')
  assert.ok(warningImportResult.warnings.some(warning => /Missing unit at row/.test(warning)), 'warning fixture includes missing-unit parser warnings')
  assert.ok(warningImportResult.warnings.some(warning => /Missing price at row/.test(warning)), 'warning fixture includes a missing-price parser warning')
  assert.equal(warningImportResult.snapshot?.bom.length, 27, 'warning fixture preserves all BOM rows')
  assert.equal(warningImportResult.snapshot?.bom[0].price, null, 'missing numeric BOM price remains null')
  assert.equal(warningImportResult.snapshot?.bom[0].isGeneratedBusinessIdentity, true, 'blank BOM identity is preserved as a generated-identity row')
  const warningProductName = await workbookProductName(artifacts.reference)
  await openImport()
  const warningNavigationCount = appMainFrameNavigationCount()
  await stageFile(manyWarningsPath)
  await assertValidWorkbookPresentation(manyWarningsPath, 'parser-warning workbook selection')
  assert.equal(appMainFrameNavigationCount(), warningNavigationCount, 'parser-warning workbook selection does not reload the app')
  await dialogButton('Import')
  await waitDialogClosed()
  await waitUntil(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value===${JSON.stringify(warningProductName)}`, 'Import applies the parser-warning workbook')
  assert.equal(await mainProductValue(), warningProductName, 'Import applies the staged parser-warning workbook')
  const bomIssueControls = await evaluate(`(() => {
    const bom = document.querySelector('section[aria-label="Bill of Materials rows"]')
    const warning = bom?.querySelector('button[aria-label^="Jump to next warning,"]')
    const blocker = bom?.querySelector('button[aria-label^="Jump to next blocker,"]')
    return {
      warningLabel: warning?.getAttribute('aria-label') ?? null,
      warningCount: warning?.querySelector('span')?.textContent.trim() ?? null,
      warningDisabled: warning?.disabled ?? null,
      blockerLabel: blocker?.getAttribute('aria-label') ?? null,
      blockerCount: blocker?.querySelector('span')?.textContent.trim() ?? null,
      blockerDisabled: blocker?.disabled ?? null
    }
  })()`)
  assert.match(bomIssueControls.warningLabel ?? '', /^Jump to next warning, 1 in Bill of Materials$/,
    'Master Data warning navigation/count remains present for the blank BOM identity')
  assert.equal(bomIssueControls.warningCount, '1', 'BOM warning count remains visible after import')
  assert.equal(bomIssueControls.warningDisabled, false, 'BOM warning navigation remains enabled after import')
  assert.match(bomIssueControls.blockerLabel ?? '', /^Jump to next blocker, 1 in Bill of Materials$/,
    'Master Data blocker navigation/count remains present for the missing BOM price')
  assert.equal(bomIssueControls.blockerCount, '1', 'BOM blocker count remains visible after import')
  assert.equal(bomIssueControls.blockerDisabled, false, 'BOM blocker navigation remains enabled after import')
  console.log('Parser-warning workbook imports successfully; generated-identity warning and missing-price blocker remain visible and navigable in Master Data.')
  const customBeforeTemplate = await mainProductValue()
  await click('button[aria-label="Sizing"]')
  await waitUntil('Boolean(document.querySelector("#dataset-sizing-bom-rows"))', 'Sizing dialog')
  await replaceInput('#dataset-sizing-product-name', 'Unapplied Template Draft')
  await replaceInput('#dataset-sizing-uom', 'draft carton')
  await replaceInput('#dataset-sizing-selling-price', '123.456789')
  await replaceInput('#dataset-sizing-sga-percent', '4.25')
  await replaceInput('#dataset-sizing-dataset-remark', 'Draft remark before Apply')
  await replaceInput('#dataset-sizing-bom-rows', '6')
  await replaceInput('#dataset-sizing-work-center-rows', '3')
  await replaceInput('#dataset-sizing-routing-rows', '2')
  const beforeTemplateDownload = new Set(await listXlsx())
  await clickText('Download Template', 'document.querySelector("[role=dialog]")')
  const templatePath = await waitNewDownload(beforeTemplateDownload)
  const template = XLSX.read(await readFile(templatePath), { type: 'buffer' })
  assert.deepEqual(template.SheetNames, ['META', 'BOM', 'WORK_CENTER', 'ROUTING'])
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets.META, { header: 1, defval: null })[2][1], 'Unapplied Template Draft')
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets.META, { header: 1, defval: null })[6][1], 'Draft remark before Apply')
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets.BOM, { header: 1, defval: null }).length - 3, 6)
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets.WORK_CENTER, { header: 1, defval: null }).length - 3, 3)
  assert.equal(XLSX.utils.sheet_to_json(template.Sheets.ROUTING, { header: 1, defval: null }).length - 3, 2)
  await click('button[aria-label="Close dialog"]')
  await waitDialogClosed()
  assert.equal(await mainProductValue(), customBeforeTemplate, 'Download Template uses draft metadata without applying it to Working')
  console.log('Sizing Download Template uses uncommitted metadata/count draft; closing without Apply preserves Working.')

  assert.deepEqual(browserErrors, [], `browser has no uncaught exceptions or console errors/warnings: ${browserErrors.join(' | ')}`)
  console.log('EXCEL VALIDATION BROWSER VERIFIER: PASS')
} finally {
  client?.close()
  await stopChild(chrome)
  await stopChild(vite)
  try { await rm(viteCacheDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch (error) { console.warn(`Temporary Vite cache cleanup deferred: ${error.message}`) }
  try { await rm(chromeProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch (error) { console.warn(`Temporary browser profile cleanup deferred: ${error.message}`) }
}
