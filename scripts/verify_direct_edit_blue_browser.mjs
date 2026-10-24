import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'

if (typeof WebSocket !== 'function') throw new Error('This verifier requires Node.js with built-in WebSocket support.')

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
const configuredBaseUrl = process.env.COSTBREAKDOWN_BROWSER_BASE_URL
const vitePort = configuredBaseUrl ? null : await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-blue-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-blue-evidence-'))
// Pre-optimize the lazy import parser so opening Import cannot reload the test page.
const vite = configuredBaseUrl ? null : spawn(process.execPath, ['--input-type=module', '-e', `
  import {createServer} from 'vite';
  const server=await createServer({server:{host:'127.0.0.1',port:${vitePort},strictPort:true},optimizeDeps:{include:['xlsx']}});
  await server.listen();server.printUrls();
`], {cwd:repository,stdio:['ignore','pipe','pipe']})
const viteOutput = []
for (const stream of [vite?.stdout, vite?.stderr]) stream?.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1800', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
let client
const browserErrors = []

function stopChild(child) {
  return new Promise(resolveStop => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolveStop()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolveStop() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolveStop() })
    child.kill('SIGTERM')
  })
}

async function waitFor(check, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    if ((vite && vite.exitCode !== null) || chrome.exitCode !== null) break
    await delay(100)
  }
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}`)
}

try {
  const fixtureServer = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  const workbookPath = join(evidenceDir, 'synthetic-direct-edit.xlsx')
  try {
    const { createCompleteMasterDataMockPair } = await fixtureServer.ssrLoadModule('/src/features/master-data/fixtures/synthetic-review-data.ts')
    const { exportSnapshotToExcel } = await fixtureServer.ssrLoadModule('/src/services/excel/snapshot-export.ts')
    const blob = await exportSnapshotToExcel(createCompleteMasterDataMockPair().current)
    await writeFile(workbookPath, Buffer.from(await blob.arrayBuffer()))
  } finally { await fixtureServer.close() }
  const baseUrl = configuredBaseUrl ?? `http://127.0.0.1:${vitePort}/`
  await waitFor(async () => {
    try { return (await fetch(baseUrl)).ok } catch { return false }
  }, 'Vite')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => {
    try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false }
  }, 'Chrome DevTools')
  const targetResponse = await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the application root: ${targetResponse.status}`)
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
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      browserErrors.push(message.params.args.map(argument => argument.value ?? argument.description).join(' '))
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  })
  const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId
    const timer = setTimeout(() => {
      pending.delete(id)
      rejectCommand(new Error(`Chrome DevTools command timed out: ${method}`))
    }, 10000)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) rejectCommand(new Error(message.error.message))
      else resolveCommand(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
    return response.result.result.value
  }
  const visibleExpression = selector => `(()=>[...document.querySelectorAll(${JSON.stringify(selector)})].find(element => {
    const rect = element.getBoundingClientRect()
    return element.getClientRects().length > 0 && rect.width > 0 && rect.height > 0
  }))()`
  const existsVisible = selector => evaluate(`Boolean(${visibleExpression(selector)})`)
  const clickSelector = async selector => {
    const point = await evaluate(`(()=>{const element=${visibleExpression(selector)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,w:rect.width,h:rect.height}})()`)
    if (!point || point.w <= 0 || point.h <= 0) throw new Error(`Visible browser target not found: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(120)
  }
  const clickTextButton = async label => {
    const point = await evaluate(`(()=>{const element=[...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.innerText.trim() === ${JSON.stringify(label)});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Button not found by visible text: ${label}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(180)
  }
  const inputValue = selector => evaluate(`(${visibleExpression(selector)})?.value ?? null`)
  const replaceInput = async (selector, text, modifiers = 4) => {
    await clickSelector(selector)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.insertText', { text })
    await delay(150)
    return inputValue(selector)
  }
  let count = 0
  const check = (condition, message, details) => {
    assert.ok(condition, `${message}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`)
    count++
    process.stdout.write(`PASS ${message}\n`)
  }
  const blue = 'rgb(29, 78, 216)'
  const state = selector => evaluate(`(()=>{const e=${visibleExpression(selector)};return e?{value:e.value??e.textContent.trim(),color:getComputedStyle(e).color,pending:e.dataset.directEditPending??null,background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,rect:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}:null})()`)
  const expectBlue = async (selector, label) => { await delay(250); const s = await state(selector); check(s?.color === blue, label, s) }
  const expectNormal = async (selector, label) => { await delay(250); const s = await state(selector); check(!!s && s.color !== blue, label, s) }
  const blur = async () => { await evaluate('document.activeElement?.blur()'); await delay(180) }
  const toolbar = 'section[aria-label="Working dataset controls"]'
  const field = (section, name) => `section[aria-label="${section} rows"] tbody tr:first-child input[data-grid-field="${name}"]`
  const price = field('Bill of Materials', 'price')
  const usage = field('Bill of Materials', 'consumption')
  const role = name => `${toolbar} [role="group"][aria-label="Master Data workspace"] button[aria-label^="${name} —"]`
  const save = () => clickSelector(`${toolbar} button[aria-label="Save"]`)
  const header = 'header [data-header-value] input[aria-label="Selected value"]'
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(() => existsVisible('#header-prepare-dataset-trigger'), 'app')
  await clickSelector('#header-prepare-dataset-trigger')
  await clickTextButton('Complete Mock')
  await clickTextButton('Master Data')
  await waitFor(() => existsVisible(toolbar), 'Master Data workspace')
  await clickSelector(role('Current'))
  if (await evaluate(`document.querySelector('${toolbar} button[role="switch"]')?.getAttribute('aria-checked')==='false'`)) await clickSelector(`${toolbar} button[role="switch"]`)
  await clickSelector('[role="group"][aria-label="Master Data table section"] button:last-child')
  await waitFor(() => existsVisible(price), 'BOM source')
  await save()
  await expectNormal(price, 'system mock data starts normal')
  const exact = '12.00000000000000001'
  await clickSelector(price)
  await delay(250)
  const beforeEditGeometry = await state(price)
  await evaluate(`(${visibleExpression(price)}).select()`)
  await send('Input.insertText', {text: exact})
  await delay(180)
  await expectBlue(price, 'direct BOM Price edit turns entire source blue')
  const editedGeometry = await state(price)
  check(JSON.stringify(beforeEditGeometry.rect) === JSON.stringify(editedGeometry.rect) && beforeEditGeometry.background === editedGeometry.background && beforeEditGeometry.border === editedGeometry.border, 'indicator changes text color without field geometry/background/border changes', {beforeEditGeometry,editedGeometry})
  await clickSelector(header)
  check(await inputValue(header) === exact, 'Header writer retains exact authoritative input', await state(header))
  const headerState = await state(header)
  check(headerState?.color === 'rgb(147, 197, 253)', 'Header naturally reflects the pending selected source on its dark surface', headerState)
  await blur()
  await expectBlue(price, 'Master Data source stays blue after blur until dataset Save')
  await clickSelector('header button[aria-label="Undo"]')
  await expectNormal(price, 'Undo removes direct edit indication')
  await save()
  await clickSelector('header button[aria-label="Redo"]')
  await expectBlue(price, 'Redo after saving undone baseline restores the still-unsaved direct edit indication')
  await replaceInput(usage, '3.125')
  await blur()
  await expectBlue(price, 'first source remains blue after second direct edit')
  await expectBlue(usage, 'second directly edited source is blue')
  await expectNormal(field('Bill of Materials', 'loss'), 'untouched Loss remains normal')
  const labor = field('Work Centers', 'laborRate')
  const manning = field('Routing', 'manning')
  const selling = `${toolbar} input[aria-label="Selling Price (THB)"]`
  await replaceInput(labor, '123.25')
  await blur()
  await expectBlue(labor, 'direct Work Center labor rate is blue')
  await replaceInput(manning, '4.125')
  await blur()
  await expectBlue(manning, 'direct Routing Manning is blue')
  await replaceInput(selling, '310.00000000000000001')
  await blur()
  await expectBlue(selling, 'direct numeric metadata is blue')
  await save()
  await expectNormal(labor, 'owning Save clears Work Center indicator')
  await expectNormal(manning, 'owning Save clears Routing indicator')
  await expectNormal(selling, 'owning Save clears metadata indicator')
  await expectNormal(price, 'Save clears Price indication')
  await expectNormal(usage, 'Save clears Usage indication')
  await clickSelector('header button[aria-label="Undo"]')
  await expectNormal(price, 'Undo after Save cannot revive retired blue provenance')
  await clickSelector('header button[aria-label="Redo"]')
  await expectNormal(usage, 'Redo after Save cannot revive retired blue provenance')
  await clickSelector(price)
  check(await inputValue(price) === exact, 'Save/refocus preserves exact decimal lexeme')
  await replaceInput(price, '14')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Reset"]`)
  await expectNormal(price, 'Reset removes stale direct indication')
  await clickSelector(price)
  check(await inputValue(price) === exact, 'Reset restores exact saved value')
  await replaceInput(price, '15')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Clone from"]`)
  await clickTextButton('Reference')
  await expectNormal(price, 'Clone replacement is normal rather than direct edited')
  check(await evaluate('document.querySelectorAll("main [data-direct-edit-pending=true]").length') === 0, 'Clone clears source provenance for replaced dataset')

  // Generate a canonical workbook with the public exporter, then use the real file-input/import UI.
  await replaceInput(price, '16')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Import"]`)
  await waitFor(() => existsVisible('[role="dialog"]'), 'Import dialog')
  const doc = await send('DOM.getDocument')
  const fileInput = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '[role="dialog"] input[type="file"]' })
  await send('DOM.setFileInputFiles', { nodeId: fileInput.result.nodeId, files: [workbookPath] })
  await waitFor(() => existsVisible('[aria-label="Workbook import summary"]'), 'canonical workbook parsed')
  await clickTextButton('Import')
  await waitFor(() => evaluate('!document.querySelector("[role=dialog]")'), 'Import applied')
  await expectNormal(price, 'canonical Import replacement never becomes direct blue')
  check(await evaluate('document.querySelectorAll("main [data-direct-edit-pending=true]").length') === 0, 'Import clears pending provenance on all replaced sources')

  await clickTextButton('Simulation')
  await waitFor(() => existsVisible('section[data-simulation-table="bom"]'), 'Simulation')
  await clickTextButton('Current')
  const simPrice = 'section[data-simulation-table="bom"] input[aria-label$="Price in Current"]'
  await waitFor(() => existsVisible(simPrice), 'Simulation Price')
  const result = 'button[data-selected-number][aria-label="Material After"]'
  await expectNormal(simPrice, 'Simulation committed source initially normal')
  await replaceInput(simPrice, exact)
  await expectBlue(simPrice, 'Simulation direct parameter is blue during pending gesture')
  await clickSelector(header)
  check(await inputValue(header) === exact, 'Simulation Header uses the same exact source writer', await state(header))
  await expectNormal(result, 'calculated Simulation Material After keeps normal color during direct edit')
  const derived = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] [data-selected-number], [data-economic-outcome-value] [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute('aria-label'),color:getComputedStyle(e).color,pending:e.getAttribute('data-direct-edit-pending')})))()`)
  check(derived.length > 0 && derived.every(e => e.color !== 'rgb(29, 78, 216)' && e.pending !== 'true'), 'Simulation results and Economic outputs never inherit source blue', derived)
  await blur()
  await expectNormal(simPrice, 'Simulation parameter commit clears blue')
  await clickSelector(simPrice)
  check(await inputValue(simPrice) === exact, 'Simulation commit retains exact text on refocus')
  await blur()
  await clickSelector('header button[aria-label="Undo"]')
  await expectNormal(simPrice, 'Simulation Undo restores committed normal source')
  await clickSelector('header button[aria-label="Redo"]')
  await expectNormal(simPrice, 'Simulation Redo restores committed normal source')
  const economic = 'input[aria-label="Fixed Action Cost"]'
  await replaceInput(economic, '123.00000000000000001')
  await expectBlue(economic, 'Economic direct source is blue while uncommitted')
  await blur()
  await expectNormal(economic, 'Economic source commit clears blue')
  await clickTextButton('Cost Breakdown')
  await delay(400)
  const cbd = await evaluate(`(()=>[...document.querySelectorAll('main [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({color:getComputedStyle(e).color,pending:e.dataset.directEditPending})))()`)
  check(cbd.length > 0 && cbd.every(e=>e.color !== 'rgb(29, 78, 216)' && e.pending !== 'true'), 'Cost Breakdown read-only calculated values remain normal after edits', cbd)
  check(browserErrors.length === 0, 'no browser errors or warnings', browserErrors)
  process.stdout.write(`Direct-edit blue real-app browser verification PASS: ${count} assertions\n`)
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await delay(150)
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
  await rm(evidenceDir, { recursive: true, force: true })
}
