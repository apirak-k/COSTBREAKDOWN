import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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

function getInstanceDirectory(root) {
  const normalizedRoot = resolve(root).replace(/[\\/]+$/, '').toLowerCase()
  const packageId = createHash('sha256').update(normalizedRoot, 'utf8').digest('hex')
  const localAppData = process.env.LOCALAPPDATA
  assert.ok(localAppData, 'LOCALAPPDATA is available for package-scoped runtime state')
  return join(localAppData, 'COSTBREAKDOWN', 'Portable', packageId)
}

async function readInstanceState(root) {
  const statePath = join(getInstanceDirectory(root), 'instance.state')
  try {
    const entries = Object.fromEntries((await readFile(statePath, 'utf8')).trim().split(/\r?\n/).map(line => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }))
    return {
      path: statePath,
      pid: Number(entries.pid),
      port: Number(entries.port),
      token: entries.token,
      root: Buffer.from(entries.root, 'base64').toString('utf8')
    }
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function hasHealthyServer(state) {
  if (!state || !Number.isInteger(state.port) || !state.token) return false
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}/__costbreakdown_health?token=${encodeURIComponent(state.token)}`, { signal: AbortSignal.timeout(1000) })
    return response.ok && (await response.text()).includes(`COSTBREAKDOWN|${state.pid}|${state.port}`)
  } catch {
    return false
  }
}

async function waitForInstance(root, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await readInstanceState(root)
    if (await hasHealthyServer(state)) return state
    await delay(delayPoll)
  }
  throw new Error(`${label} did not become ready`)
}

function runGuiLauncher(executable, args = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, { cwd: dirname(executable), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    const timer = setTimeout(() => {
      child.kill()
      rejectRun(new Error(`${executable} did not exit promptly`))
    }, 30000)
    child.once('error', error => {
      clearTimeout(timer)
      rejectRun(error)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      resolveRun({ code, signal, stdout, stderr })
    })
  })
}

function runPowerShellJson(command) {
  const output = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true })
  return JSON.parse(output.trim())
}

function getListeningSockets(pid) {
  const rows = runPowerShellJson(`$rows=@(Get-NetTCPConnection -State Listen -OwningProcess ${pid} -ErrorAction Stop | Select-Object @{n='address';e={$_.LocalAddress}},@{n='port';e={$_.LocalPort}}); ConvertTo-Json -InputObject $rows -Compress`)
  return Array.isArray(rows) ? rows : [rows]
}

function getProcessInfo(pid) {
  return runPowerShellJson(`$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if($null -eq $p){exit 3}; $g=Get-Process -Id ${pid}; @{name=$p.Name; commandLine=$p.CommandLine; mainWindowHandle=[string]$g.MainWindowHandle} | ConvertTo-Json -Compress`)
}

function processExists(pid) {
  try {
    execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `Get-Process -Id ${pid} -ErrorAction Stop | Out-Null`], { stdio: 'ignore', windowsHide: true })
    return true
  } catch {
    return false
  }
}

async function stopPackageServer(packageRoot, executable) {
  const result = await runGuiLauncher(executable)
  assert.equal(result.code, 0, `Stop launcher exits successfully: ${result.stderr}`)
  assert.equal(result.stdout, '', 'Stop launcher has no console output')
  assert.equal(result.stderr, '', 'Stop launcher has no console error output')
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const state = await readInstanceState(packageRoot)
    if (!state || !(await hasHealthyServer(state))) return state
    await delay(delayPoll)
  }
  throw new Error('Stop launcher did not stop its package server')
}

const scratchRoot = await mkdtemp(join(tmpdir(), 'costbreakdown-portable-acceptance-'))
const normalizedScratch = resolve(scratchRoot)
const normalizedTemp = resolve(tmpdir()) + sep
assert.ok(normalizedScratch.startsWith(normalizedTemp), 'temporary workspace is contained by the system temp directory')
const packageRoot = join(scratchRoot, 'COSTBREAKDOWN package copy')
const profileRoot = join(scratchRoot, 'chrome-profile')
const downloadRoot = join(scratchRoot, 'downloads')
await mkdir(packageRoot, { recursive: true })
await mkdir(downloadRoot, { recursive: true })
for (const file of await packageFiles(sourcePackage)) {
  const destination = join(packageRoot, file)
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(join(sourcePackage, file), destination)
}

let chromeProcess
let activePackageRoots = []
let activeClient
let secondClient
const browserErrors = []
const networkFailures = []
const networkResponses = []
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
    if (message.method === 'Network.responseReceived' && message.params.response.status < 400) {
      networkResponses.push({ url: message.params.response.url, mimeType: message.params.response.mimeType })
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
    if (chromeProcess && chromeProcess.exitCode !== null) break
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
  check('package has one shared app and OS-specific Start/Stop launchers',
    JSON.stringify(rootFiles) === JSON.stringify(['README.md', 'USER_GUIDE.md']) &&
    packagedFiles.includes('app/index.html') && packagedFiles.some(file => file.startsWith('app/assets/')) &&
    packagedFiles.includes('Windows/Start COSTBREAKDOWN.exe') && packagedFiles.includes('Windows/Stop COSTBREAKDOWN.exe') &&
    packagedFiles.includes('Windows/Serve-COSTBREAKDOWN.ps1') &&
    packagedFiles.includes('macOS/Start COSTBREAKDOWN.app/Contents/Info.plist') &&
    packagedFiles.includes('macOS/Stop COSTBREAKDOWN.app/Contents/Info.plist') &&
    packagedFiles.includes('Linux/Start COSTBREAKDOWN') && packagedFiles.includes('Linux/Stop COSTBREAKDOWN'))
  check('package excludes XLSX workbooks and development/test files',
    packagedFiles.every(file => !/\.(xlsx|mjs|ts|tsx|map)$/i.test(file)) && !packagedFiles.some(file => /(^|\/)(src|scripts|node_modules|excel_models)(\/|$)/i.test(file)))

  const packagedTextFiles = packagedFiles.filter(file => /\.(md|ps1|html|js|css|svg|plist|desktop)$/i.test(file) || /(?:^|\/)(?:Start|Stop) COSTBREAKDOWN$/.test(file))
  const packagedText = await Promise.all(packagedTextFiles.map(async file => (await readFile(join(packageRoot, file))).toString('utf8')))
  const normalizedRepositoryRoot = resolve(process.cwd()).replaceAll('\\', '/').toLowerCase()
  check('package text contains no repository-specific path', packagedText.every(text => !text.replaceAll('\\', '/').toLowerCase().includes(normalizedRepositoryRoot)))
  const launcherSource = await readFile(join(process.cwd(), 'packaging/portable/PortableLauncher.cs'), 'utf8')
  const launcherScript = await readFile(join(packageRoot, 'Windows', 'Serve-COSTBREAKDOWN.ps1'), 'utf8')
  const readme = await readFile(join(packageRoot, 'README.md'), 'utf8')
  const unixSource = await readFile(join(process.cwd(), 'packaging/portable/PortableUnixLauncher.go'), 'utf8')
  check('runtime launchers use only bundled helpers and operating-system tools',
    /powershell\.exe/i.test(launcherSource) && /os\/exec/.test(unixSource) &&
    !/\b(node|npm|vite)(\.exe|\.cmd)?\b/i.test(`${launcherSource}\n${launcherScript}\n${unixSource}`))
  check('README explains all platform launchers, no install, and Excel export/session behavior',
    /Windows\/Start COSTBREAKDOWN\.exe/.test(readme) && /macOS\/Start COSTBREAKDOWN\.app/.test(readme) &&
    /Linux\/Start COSTBREAKDOWN/.test(readme) && /Windows\/Stop COSTBREAKDOWN\.exe/.test(readme) &&
    /macOS\/Stop COSTBREAKDOWN\.app/.test(readme) && /Linux\/Stop COSTBREAKDOWN/.test(readme) &&
    /does not require Node\.js, npm, Go/i.test(readme) && /Excel/i.test(readme) && /browser session/i.test(readme))
  check('package has no installer, registry, or legacy batch files',
    packagedFiles.every(file => !/\.(lnk|msi|reg|bat|cmd|vbs|ps1\.bak)$/i.test(file)) &&
    packagedFiles.includes('Windows/Serve-COSTBREAKDOWN.ps1') && !packagedFiles.includes('Launch-COSTBREAKDOWN.bat'))

  const startExecutable = join(packageRoot, 'Windows', 'Start COSTBREAKDOWN.exe')
  const stopExecutable = join(packageRoot, 'Windows', 'Stop COSTBREAKDOWN.exe')
  activePackageRoots.push(packageRoot)
  const firstStart = await runGuiLauncher(startExecutable, ['--no-browser'])
  assert.equal(firstStart.code, 0, `Start launcher exits successfully: ${firstStart.stderr}`)
  assert.equal(firstStart.stdout, '', 'Start launcher has no console output')
  assert.equal(firstStart.stderr, '', 'Start launcher has no console error output')
  let packageState = await waitForInstance(packageRoot, 'silent Start launcher')
  baseUrl = `http://127.0.0.1:${packageState.port}/`
  check('server chooses an available nonzero port', Number.isInteger(packageState.port) && packageState.port > 0)
  const listeningSockets = getListeningSockets(packageState.pid)
  check('server listens only on IPv4 loopback', listeningSockets.length > 0 &&
    listeningSockets.every(socket => socket.address === '127.0.0.1' && Number(socket.port) === packageState.port))
  check('Start runs the bundled PowerShell server from the copied package without Node/npm', (() => {
    const info = getProcessInfo(packageState.pid)
    return info.name.toLowerCase() === 'powershell.exe' &&
      info.commandLine.toLowerCase().includes(join(packageRoot, 'Windows', 'Serve-COSTBREAKDOWN.ps1').toLowerCase()) &&
      info.commandLine.toLowerCase().includes(packageState.path.toLowerCase()) &&
      !/\b(node|npm|vite)(\.exe|\.cmd)?\b/i.test(info.commandLine) &&
      info.mainWindowHandle === '0'
  })())
  const appResponse = await fetch(baseUrl)
  check('application is served over loopback HTTP 200', appResponse.status === 200)
  check('unknown application routes return the shared app entry',
    (await fetch(`${baseUrl}portable-acceptance-route`)).status === 200)

  const duplicateStart = await runGuiLauncher(startExecutable, ['--no-browser'])
  const duplicateState = await readInstanceState(packageRoot)
  check('a second Start reuses the healthy server without a duplicate',
    duplicateStart.code === 0 && duplicateState.pid === packageState.pid && duplicateState.token === packageState.token)

  const otherPackageRoot = join(scratchRoot, 'separate COSTBREAKDOWN copy')
  await mkdir(otherPackageRoot, { recursive: true })
  for (const file of await packageFiles(packageRoot)) {
    const destination = join(otherPackageRoot, file)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(join(packageRoot, file), destination)
  }
  activePackageRoots.push(otherPackageRoot)
  const otherStart = await runGuiLauncher(join(otherPackageRoot, 'Windows', 'Start COSTBREAKDOWN.exe'), ['--no-browser'])
  const otherState = await waitForInstance(otherPackageRoot, 'separate package copy')
  check('a different copied folder gets a distinct server instance',
    otherStart.code === 0 && otherState.pid !== packageState.pid && otherState.token !== packageState.token && await hasHealthyServer(otherState))

  const unrelatedPowerShell = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', 'Start-Sleep -Seconds 300'], {
    windowsHide: true,
    stdio: 'ignore'
  })
  await delay(250)
  assert.ok(processExists(unrelatedPowerShell.pid), 'unrelated PowerShell sentinel is running before Stop')
  const stoppedState = await stopPackageServer(packageRoot, stopExecutable)
  const stoppedRequest = await fetch(baseUrl).then(response => response.status).catch(() => 0)
  check('Stop makes this package URL stop responding and exits its exact server',
    (stoppedState === null || !(await hasHealthyServer(stoppedState))) && stoppedRequest === 0 && !processExists(packageState.pid))
  check('Stop leaves another copied package server running',
    processExists(otherState.pid) && await hasHealthyServer(otherState))
  check('Stop leaves an unrelated PowerShell process alive', processExists(unrelatedPowerShell.pid))
  const idleStop = await runGuiLauncher(stopExecutable)
  check('Stop exits cleanly and silently when no server is running', idleStop.code === 0 && idleStop.stdout === '' && idleStop.stderr === '')
  check('an idle Stop does not affect the other copied package server', await hasHealthyServer(otherState))
  await stopPackageServer(otherPackageRoot, join(otherPackageRoot, 'Windows', 'Stop COSTBREAKDOWN.exe'))

  const restarted = await runGuiLauncher(startExecutable, ['--no-browser'])
  packageState = await waitForInstance(packageRoot, 'Start after Stop')
  check('Start works again after Stop', restarted.code === 0 && await hasHealthyServer(packageState))

  const crashedState = packageState
  const crashedInfo = getProcessInfo(crashedState.pid)
  assert.ok(crashedInfo.commandLine.toLowerCase().includes(join(packageRoot, 'Windows', 'Serve-COSTBREAKDOWN.ps1').toLowerCase()),
    'crash simulation targets the exact server process for the copied package')
  execFileSync('taskkill.exe', ['/PID', String(crashedState.pid), '/F'], { stdio: 'ignore', windowsHide: true })
  await waitFor(() => !processExists(crashedState.pid), 'simulated package server crash')
  check('crash simulation leaves package-scoped stale state for recovery', Boolean(await readInstanceState(packageRoot)))
  const recoveredStart = await runGuiLauncher(startExecutable, ['--no-browser'])
  packageState = await waitForInstance(packageRoot, 'Start after stale state')
  check('Start recovers from stale package state without path or port reuse',
    recoveredStart.code === 0 && packageState.pid !== crashedState.pid && packageState.token !== crashedState.token && await hasHealthyServer(packageState))
  await stopPackageServer(packageRoot, stopExecutable)
  const sentinelAliveAfterRecovery = processExists(unrelatedPowerShell.pid)
  check('recovery and Stop continue leaving unrelated PowerShell alive', sentinelAliveAfterRecovery)
  unrelatedPowerShell.kill()

  const finalStart = await runGuiLauncher(startExecutable, ['--no-browser'])
  packageState = await waitForInstance(packageRoot, 'app acceptance server')
  baseUrl = `http://127.0.0.1:${packageState.port}/`
  check('copied portable folder starts a fresh HTTP 200 application instance', finalStart.code === 0 && (await fetch(baseUrl)).status === 200)

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
  await waitExpression(`Boolean(document.querySelector('link[rel="stylesheet"]'))`, 'compiled stylesheet link')
  check('the shared app applies its compiled stylesheet', await evaluate(`(()=>{const link=document.querySelector('link[rel="stylesheet"]');return Boolean(link&&link.sheet&&getComputedStyle(document.body).fontFamily)})()`))
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
    httpFailures.length === 0 && networkFailures.length === 0 && externalRequests.length === 0 &&
    networkResponses.some(response => response.mimeType === 'text/css') &&
    networkResponses.some(response => /javascript/i.test(response.mimeType)))
  check('app raises no browser exceptions or console errors', browserErrors.length === 0)

  const acceptedServerPid = packageState.pid
  const finalUrlStatus = await fetch(baseUrl).then(response => response.status).catch(() => 0)
  await stopPackageServer(packageRoot, stopExecutable)
  const stoppedUrlStatus = await fetch(baseUrl).then(response => response.status).catch(() => 0)
  check('Stop after browser workflows closes the serving URL and server process',
    finalUrlStatus === 200 && stoppedUrlStatus === 0 && !processExists(acceptedServerPid))

  console.log(JSON.stringify({
    result: 'PASS',
    checks: checkResults.length,
    passed: checkResults,
    warnings: browserWarnings,
    packageFiles: packagedFiles,
    downloadedWorkbook: exportedFile
  }, null, 2))
} finally {
  for (const client of clients) client.close()
  if (chromeProcess?.pid) stopProcessTree(chromeProcess.pid)
  for (const activePackageRoot of activePackageRoots) {
    try {
      const state = await readInstanceState(activePackageRoot)
      if (state && processExists(state.pid)) {
        const info = getProcessInfo(state.pid)
        if (info.commandLine.toLowerCase().includes(join(activePackageRoot, 'Windows', 'Serve-COSTBREAKDOWN.ps1').toLowerCase())) {
          try {
            await stopPackageServer(activePackageRoot, join(activePackageRoot, 'Windows', 'Stop COSTBREAKDOWN.exe'))
          } catch {
            if (processExists(state.pid)) execFileSync('taskkill.exe', ['/PID', String(state.pid), '/F'], { stdio: 'ignore', windowsHide: true })
          }
        }
      }
    } catch {}
  }
  await delay(250)
  await rm(scratchRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
