import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

const sourcePackage = resolve(process.argv[2] ?? '')
const fixtureDirectory = resolve(process.argv[3] ?? '')
if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: node scripts/accept_portable_package.mjs <package-directory> <excel-fixture-directory>')
}

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms))
const checkResults = []
const check = (label, condition) => {
  assert.ok(condition, label)
  checkResults.push(label)
  console.log(`PASS ${label}`)
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

function findChrome() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH].filter(Boolean)
  if (process.platform === 'win32') candidates.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim() } catch {}
  }
  throw new Error('Chrome was not found. Set CHROME_BIN to a Chrome executable.')
}

function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    try { execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }) } catch {}
    return
  }
  try { process.kill(-pid, 'SIGTERM') } catch {}
}

const allowedRootFiles = new Set(['index.html', 'Launch-COSTBREAKDOWN.bat', 'README.md', 'Serve-COSTBREAKDOWN.ps1'])
async function packageFiles(root, relative = '') {
  const entries = await readdir(join(root, relative), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await packageFiles(root, child))
    else files.push(child)
  }
  return files
}

const scratchRoot = await mkdtemp(join(tmpdir(), 'costbreakdown-portable-acceptance-'))
const normalizedScratch = resolve(scratchRoot)
const normalizedTemp = resolve(tmpdir()) + sep
assert.ok(normalizedScratch.startsWith(normalizedTemp), 'temporary workspace is contained by the system temp directory')
const packageRoot = join(scratchRoot, 'package')
const profileRoot = join(scratchRoot, 'chrome-profile')
const downloadRoot = join(scratchRoot, 'downloads')
await mkdir(packageRoot, { recursive: true })
await mkdir(downloadRoot, { recursive: true })
for (const file of await packageFiles(sourcePackage)) {
  const destination = join(packageRoot, file)
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(join(sourcePackage, file), destination)
}

let serverProcess
let chromeProcess
let activeClient
let secondClient
const browserErrors = []
const networkFailures = []
const externalRequests = []
const httpFailures = []
const browserWarnings = []
const clients = new Set()
const clientSenders = new WeakMap()

async function connect(webSocketUrl) {
  const client = new WebSocket(webSocketUrl)
  clients.add(client)
  await new Promise((resolveOpen, rejectOpen) => {
    client.addEventListener('open', resolveOpen, { once: true })
    client.addEventListener('error', rejectOpen, { once: true })
  })
  let commandId = 0
  const pending = new Map()
  client.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      browserErrors.push(message.params.args.map(argument => argument.value ?? argument.description).join(' '))
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'warning') {
      browserWarnings.push(message.params.args.map(argument => argument.value ?? argument.description).join(' '))
    }
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url
      if (!url.startsWith(baseUrl)) externalRequests.push(url)
    }
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      httpFailures.push({ url: message.params.response.url, status: message.params.response.status })
    }
    if (message.method === 'Network.loadingFailed' && message.params.errorText !== 'net::ERR_ABORTED') {
      networkFailures.push({ url: message.params.requestId, error: message.params.errorText })
    }
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
      if (message.error) rejectCommand(new Error(`${method}: ${message.error.message}`))
      else resolveCommand(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
    return response.result.result.value
  }
  clientSenders.set(client, { send, evaluate })
  return client
}

let baseUrl = ''
const delayPoll = 100
async function waitFor(checkCondition, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkCondition()) return
    if ((chromeProcess && chromeProcess.exitCode !== null) || (serverProcess && serverProcess.exitCode !== null)) break
    await delay(delayPoll)
  }
  throw new Error(`${label} did not become ready`)
}

async function evaluate(expression, client = activeClient) {
  return clientSenders.get(client).evaluate(expression)
}

async function send(method, params = {}, client = activeClient) {
  return clientSenders.get(client).send(method, params)
}

async function clickSelector(selector) {
  const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing selector '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await delay(150)
}

async function clickText(text, root = 'document') {
  const point = await evaluate(`(()=>{const root=${root};const e=[...root.querySelectorAll('button')].find(button=>button.getClientRects().length&&button.innerText.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing button '+${JSON.stringify(text)});e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await delay(150)
}

async function waitExpression(expression, label, timeoutMs = 20000, client = activeClient) {
  await waitFor(async () => Boolean(await evaluate(expression, client)), label, timeoutMs)
}

async function selectRole(role) {
  const expression = `(()=>{const button=[...document.querySelectorAll('[aria-label^="${role} —"]')].find(e=>e.tagName==='BUTTON');if(!button)throw Error('Missing role '+${JSON.stringify(role)});button.click();return true})()`
  await evaluate(expression)
  await waitExpression(`[...document.querySelectorAll('button[aria-pressed="true"]')].some(button=>button.getAttribute('aria-label')?.startsWith(${JSON.stringify(role)}+' —'))`, `${role} dataset`)
}

async function editMode() {
  const isEdit = await evaluate(`document.querySelector('[role="switch"]')?.getAttribute('aria-checked')==='true'`)
  if (!isEdit) await clickSelector('[role="switch"]')
  await waitExpression(`document.querySelector('[role="switch"]')?.getAttribute('aria-checked')==='true'`, 'Master Data edit mode')
}

async function setInput(selector, value) {
  await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing input '+${JSON.stringify(selector)});input.focus();input.select()})()`)
  const modifier = process.platform === 'darwin' ? 4 : 2
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: modifier, windowsVirtualKeyCode: 65 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: modifier, windowsVirtualKeyCode: 65 })
  await send('Input.insertText', { text: value })
  await delay(150)
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.value ?? null`)
}

async function setFileInput(filePath) {
  const document = await send('DOM.getDocument', { depth: -1, pierce: true })
  const query = await send('DOM.querySelector', { nodeId: document.result.root.nodeId, selector: '[role="dialog"] input[type="file"]' })
  if (!query.result.nodeId) throw new Error('Import file input is missing')
  await send('DOM.setFileInputFiles', { files: [filePath], nodeId: query.result.nodeId })
}

async function importWorkbook(role, filePath) {
  await selectRole(role)
  await editMode()
  await clickSelector('button[aria-label="Import"]')
  await waitExpression(`Boolean(document.querySelector('[role="dialog"] input[type="file"]'))`, 'Import dialog')
  await setFileInput(filePath)
  await waitExpression(`Boolean(document.querySelector('[role="dialog"] [aria-label="Workbook import summary"]'))`, `Workbook validated for ${role}`)
  await clickText('Import', 'document.querySelector("[role=dialog]")')
  await waitExpression(`!document.querySelector('[role="dialog"]')`, `${role} workbook applied`)
}

async function exportWorkbook() {
  const before = new Set((await readdir(downloadRoot)).filter(file => file.endsWith('.xlsx')))
  await clickSelector('button[aria-label="Export"]')
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    const files = (await readdir(downloadRoot)).filter(file => file.endsWith('.xlsx') && !before.has(file))
    for (const file of files) {
      if ((await readdir(downloadRoot)).includes(`${file}.crdownload`)) continue
      const path = join(downloadRoot, file)
      if ((await stat(path)).size > 1000) return path
    }
    await delay(100)
  }
  throw new Error('Excel export download did not complete')
}

try {
  const packagedFiles = (await packageFiles(packageRoot)).sort()
  const rootFiles = packagedFiles.filter(file => !file.includes('/'))
  check('package has only launcher, README, index.html, and assets at runtime',
    rootFiles.length === 4 && rootFiles.every(file => allowedRootFiles.has(file)) && packagedFiles.some(file => file.startsWith('assets/')))
  check('package excludes XLSX workbooks and development/test files',
    packagedFiles.every(file => !/\.(xlsx|mjs|ts|tsx|map)$/i.test(file)) && !packagedFiles.some(file => /(^|\/)(src|scripts|node_modules|excel_models)(\/|$)/i.test(file)))

  const packagedText = await Promise.all(packagedFiles.map(async file => (await readFile(join(packageRoot, file))).toString('utf8')))
  check('package contains no repository drive path', packagedText.every(text => !/E:[\\/]COSTBREAKDOWN/i.test(text)))
  const launcherBatch = await readFile(join(packageRoot, 'Launch-COSTBREAKDOWN.bat'), 'utf8')
  const launcherScript = await readFile(join(packageRoot, 'Serve-COSTBREAKDOWN.ps1'), 'utf8')
  check('launcher uses Windows PowerShell and contains no Node or npm command',
    /powershell\.exe/i.test(launcherBatch) && !/\b(node|npm)(\.exe|\.cmd)?\b/i.test(`${launcherBatch}\n${launcherScript}`))

  const output = []
  const errors = []
  serverProcess = spawn(process.env.ComSpec ?? 'cmd.exe', ['/c', 'Launch-COSTBREAKDOWN.bat', '--no-browser'], {
    cwd: packageRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  serverProcess.stdout.on('data', chunk => output.push(String(chunk)))
  serverProcess.stderr.on('data', chunk => errors.push(String(chunk)))
  await waitFor(() => output.join('').match(/READY_URL=(http:\/\/127\.0\.0\.1:\d+\/)/), 'portable batch launcher')
  baseUrl = output.join('').match(/READY_URL=(http:\/\/127\.0\.0\.1:\d+\/)/)[1]
  const processInfo = execFileSync('powershell.exe', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${serverProcess.pid} -or $_.ProcessId -eq ${serverProcess.pid} } | Select-Object -ExpandProperty Name`], { encoding: 'utf8' })
  check('portable launcher starts its bundled server without a dev server or npm',
    processInfo.toLowerCase().includes('powershell.exe') && !/node|npm|vite/i.test(processInfo) && (await fetch(baseUrl)).ok)

  const debugPort = await unusedPort()
  const chromeArgs = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileRoot}`, '--window-size=1440,1800', 'about:blank']
  if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
  chromeProcess = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
  await waitFor(async () => {
    try { return (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok } catch { return false }
  }, 'Chrome DevTools')
  const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the portable app: ${targetResponse.status}`)
  const target = await targetResponse.json()
  activeClient = await connect(target.webSocketDebuggerUrl)
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadRoot })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window,"showSaveFilePicker",{configurable:true,value:undefined})' })
  await send('Page.navigate', { url: baseUrl })
  await waitExpression(`document.title.includes('COSTBREAKDOWN')`, 'portable app page')
  await waitExpression(`Boolean(document.querySelector('nav[aria-label="Main navigation"]'))`, 'main navigation')
  const navigation = await evaluate(`[...document.querySelectorAll('nav[aria-label="Main navigation"] button')].map(button=>button.innerText.trim())`)
  check('Master Data, Cost Breakdown, and Simulation navigation load',
    ['Master Data', 'Cost Breakdown', 'Simulation'].every(label => navigation.includes(label)))

  const referenceFixture = join(fixtureDirectory, 'export-reference.xlsx')
  const currentFixture = join(fixtureDirectory, 'export-current.xlsx')
  await importWorkbook('Reference', referenceFixture)
  await importWorkbook('Current', currentFixture)
  const importedProduct = await evaluate(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value ?? ''`)
  check('Excel import applies the Current workbook data', importedProduct === 'Current Precision Part')

  await editMode()
  const editedPrice = await setInput('[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]', '777.125')
  check('Master Data accepts a direct numeric edit', editedPrice === '777.125')
  await clickSelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')
  await clickSelector('[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')
  const refocusedPrice = await evaluate(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')?.value ?? ''`)
  check('Master Data retains the accepted value after blur and refocus', refocusedPrice === '777.125')

  const exportedFile = await exportWorkbook()
  check('Excel export completes a downloadable workbook', (await stat(exportedFile)).size > 1000)
  await importWorkbook('Custom', exportedFile)
  const customProduct = await evaluate(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Product Name"]')?.value ?? ''`)
  check('the app can import its downloaded workbook into Custom', customProduct === 'Current Precision Part')

  await clickText('Cost Breakdown', 'document')
  await waitExpression(`Boolean(document.querySelector('[aria-label="Cost Breakdown controls"]'))`, 'Cost Breakdown view')
  const gapValues = await evaluate(`[...document.querySelectorAll('[data-gap-slot="full"]')].map(node=>node.textContent.trim()).filter(Boolean)`)
  check('Cost Breakdown calculates comparison Gap values', gapValues.length > 0 && gapValues.some(value => /\d/.test(value)))

  await clickText('Simulation', 'document')
  await waitExpression(`Boolean(document.querySelector('input[aria-label$="in Current"],input[aria-label$="in SIM"],input[aria-label$="in Custom"]'))`, 'Simulation parameter editor')
  const simulationInput = await evaluate(`(()=>{const e=[...document.querySelectorAll('input')].find(input=>/Price in (SIM|Custom|Current)$/.test(input.getAttribute('aria-label')||'')&&input.getClientRects().length);return e?.getAttribute('aria-label')||''})()`)
  check('Simulation exposes an editable parameter for the imported dataset', Boolean(simulationInput))
  const beforeSimulation = await evaluate(`document.body.innerText`)
  const beforeSimulationValue = await evaluate(`(()=>[...document.querySelectorAll('input')].find(input=>input.getAttribute('aria-label')===${JSON.stringify(simulationInput)})?.value ?? '')()`)
  const simulationOutputLabels = `()=>[...document.querySelectorAll('[aria-label]')].map(element=>element.getAttribute('aria-label')).filter(label=>/Standard Cost|Material Cost|Conversion Cost|Operating Profit/.test(label||''))`
  const beforeSimulationOutputs = await evaluate(`(${simulationOutputLabels})()`)
  check('Simulation displays calculated cost or profit outputs', beforeSimulationOutputs.length > 0)
  const simulationNumber = Number(beforeSimulationValue)
  assert.ok(Number.isFinite(simulationNumber), `Simulation value is numeric: ${beforeSimulationValue}`)
  const nextSimulationValue = String(simulationNumber + 1)
  await setInput(`input[aria-label=${JSON.stringify(simulationInput)}]`, nextSimulationValue)
  await evaluate(`document.activeElement?.blur()`)
  await delay(300)
  const afterSimulation = await evaluate(`document.body.innerText`)
  const afterSimulationValue = await evaluate(`(()=>[...document.querySelectorAll('input')].find(input=>input.getAttribute('aria-label')===${JSON.stringify(simulationInput)})?.value ?? '')()`)
  const afterSimulationOutputs = await evaluate(`(${simulationOutputLabels})()`)
  check('Simulation edit updates the scenario and a visible calculated result',
    Number(afterSimulationValue) === simulationNumber + 1 && afterSimulation !== beforeSimulation &&
    JSON.stringify(afterSimulationOutputs) !== JSON.stringify(beforeSimulationOutputs))

  const sessionBeforeReload = await evaluate(`JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)))`)
  await send('Page.reload', { ignoreCache: true })
  await delay(700)
  await waitExpression(`document.title.includes('COSTBREAKDOWN') && Boolean(document.querySelector('nav[aria-label="Main navigation"]'))`, 'app after refresh')
  await clickText('Master Data', 'document')
  await selectRole('Current')
  await editMode()
  await clickSelector('[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')
  const refreshedPrice = await evaluate(`document.querySelector('[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')?.value ?? ''`)
  check('sessionStorage restores Master Data edits after refresh', refreshedPrice === '777.125' && sessionBeforeReload.length > 0)

  const secondTargetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' })
  if (!secondTargetResponse.ok) throw new Error(`Chrome could not open a new app tab: ${secondTargetResponse.status}`)
  const secondTarget = await secondTargetResponse.json()
  secondClient = await connect(secondTarget.webSocketDebuggerUrl)
  await send('Page.enable', {}, secondClient)
  await send('Runtime.enable', {}, secondClient)
  await send('Network.enable', {}, secondClient)
  await waitExpression(`document.title.includes('COSTBREAKDOWN')`, 'new app tab', 20000, secondClient)
  const freshTabStorage = await evaluate(`JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)))`, secondClient)
  check('a newly opened tab starts an independent session', !freshTabStorage.includes('Current Precision Part') && !freshTabStorage.includes('777.125'))

  await delay(500)
  check('package loads with no missing-file, asset, or external network requests',
    httpFailures.length === 0 && networkFailures.length === 0 && externalRequests.length === 0)
  check('app raises no browser exceptions or console errors', browserErrors.length === 0)

  console.log(JSON.stringify({
    result: 'PASS',
    checks: checkResults.length,
    passed: checkResults,
    warnings: browserWarnings,
    packageFiles: packagedFiles,
    downloadedWorkbook: exportedFile,
    serverOutput: output.join('').trim(),
    stderr: errors.join('').trim()
  }, null, 2))
} finally {
  for (const client of clients) client.close()
  if (chromeProcess?.pid) stopProcessTree(chromeProcess.pid)
  if (serverProcess?.pid) stopProcessTree(serverProcess.pid)
  await delay(250)
  await rm(scratchRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
