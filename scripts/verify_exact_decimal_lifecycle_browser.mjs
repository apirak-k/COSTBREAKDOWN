import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

if (typeof WebSocket !== 'function') throw new Error('This browser verifier requires Node.js with built-in WebSocket support.')

function findChrome() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH].filter(Boolean)
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  if (process.platform === 'win32') candidates.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  )
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
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-exact-decimal-'))
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const vite = spawn(process.execPath, [viteCliPath, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
  cwd: repository,
  stdio: ['ignore', 'pipe', 'pipe']
})
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1200', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
const browserOutput = []
chrome.stderr.on('data', chunk => browserOutput.push(String(chunk)))
let client
let assertionCount = 0

function check(condition, message, details) {
  assert.ok(condition, details === undefined ? message : `${message}: ${JSON.stringify(details)}`)
  assertionCount += 1
}

async function stopChild(child) {
  return new Promise(resolveStop => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolveStop()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolveStop() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolveStop() })
    child.kill('SIGTERM')
  })
}

async function waitFor(checkReady, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkReady()) return
    if (vite.exitCode !== null || chrome.exitCode !== null) break
    await delay(100)
  }
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}\nBrowser output:\n${browserOutput.join('').slice(-2000)}`)
}

try {
  const baseUrl = `http://127.0.0.1:${vitePort}/scripts/fixtures/exact-decimal-browser.html`
  await waitFor(async () => {
    try { return (await fetch(baseUrl)).ok } catch { return false }
  }, 'Vite fixture')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => {
    try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false }
  }, 'Chrome DevTools')

  const targetResponse = await fetch(`${debugUrl}/json/new?about:blank`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the test page: ${targetResponse.status}`)
  const target = await targetResponse.json()
  client = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveOpen, rejectOpen) => {
    client.addEventListener('open', resolveOpen, { once: true })
    client.addEventListener('error', rejectOpen, { once: true })
  })

  const browserErrors = []
  let commandId = 0
  const pending = new Map()
  client.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
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
      if (message.error) rejectCommand(new Error(`${method}: ${message.error.message}`))
      else resolveCommand(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    let response
    try {
      response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    } catch (error) {
      throw new Error(`Runtime.evaluate failed for ${expression.slice(0, 180)}: ${error.message}`)
    }
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
    return response.result.result.value
  }
  const waitUntil = async (expression, label, timeoutMs = 15000) => {
    await waitFor(async () => Boolean(await evaluate(expression)), label, timeoutMs)
  }
  const click = async selector => {
    await evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(selector)});if(!target)throw Error('Missing ${selector}');target.focus();target.click();return true})()`)
  }
  const nextPageLoad = () => new Promise(resolveLoad => {
    const handler = event => {
      if (JSON.parse(String(event.data)).method !== 'Page.loadEventFired') return
      client.removeEventListener('message', handler)
      resolveLoad()
    }
    client.addEventListener('message', handler)
  })
  const readState = async () => evaluate(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]')?.textContent??'{}')`)
  const selectorForState = state => `input[data-grid-field="price"][data-grid-row-id="${state.rowId}"]`
  const focusInput = async (selector, expected) => {
    await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing exact decimal editor');input.focus();return true})()`)
    await waitUntil(`document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(expected)}`, 'exact editable value after focus')
  }
  const replaceInput = async (selector, value) => {
    await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing exact decimal editor');input.focus();input.select();return true})()`)
    await send('Input.insertText', { text: value })
    await waitUntil(`document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`, 'typed exact string')
    await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).exact===${JSON.stringify(value)}`, 'application state exact string')
  }
  const blurWithoutChangingContext = async () => evaluate(`document.querySelector('[data-testid="exact-role-current"]').focus()`)
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: baseUrl })
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]')?.textContent??'{}').itemCode==='EXACT-DECIMAL-VERIFIER'`, 'fixture seeded')
  let state = await readState()
  check(state.role === 'current' && state.rowId, 'Verifier row exists in Current', state)
  let inputSelector = selectorForState(state)
  await waitUntil(`Boolean(document.querySelector(${JSON.stringify(inputSelector)}))`, 'Current price input')

  const critical = '123456789012345.123456789'
  await replaceInput(inputSelector, critical)
  state = await readState()
  check(state.exact === critical, 'Exact critical decimal is authoritative application state', state)
  check(state.calculation === Number(critical), 'Calculation value remains the existing JavaScript number', { actual: state.calculation, expected: Number(critical) })

  await blurWithoutChangingContext()
  await focusInput(inputSelector, critical)
  check(await evaluate(`document.querySelector(${JSON.stringify(inputSelector)}).value`) === critical, 'Blur then refocus restores every critical digit')

  await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(inputSelector)});input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`)
  await send('Input.insertText', { text: '7' })
  await waitUntil(`document.querySelector(${JSON.stringify(inputSelector)})?.value===${JSON.stringify(`${critical}7`)}`, 'long focused value remains editable')
  const horizontalState = await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(inputSelector)});return {scrollLeft:input.scrollLeft,clientWidth:input.clientWidth,selectionStart:input.selectionStart,value:input.value}})()`)
  check(horizontalState.scrollLeft > 0 && horizontalState.selectionStart === `${critical}7`.length, 'Native input scrolls horizontally to keep the long caret visible', horizontalState)
  await replaceInput(inputSelector, critical)
  await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(inputSelector)});input.setSelectionRange(input.value.length,input.value.length);return true})()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await delay(120)
  state = await readState()
  const subUlpStepState = await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(inputSelector)});return {value:input?.value,start:input?.selectionStart,end:input?.selectionEnd,active:document.activeElement===input}})()`)
  check(state.exact === critical && subUlpStepState.value === critical,
    'A sub-ULP step cannot replace the exact edit text', { state, input: subUlpStepState })

  await evaluate(`window.__exactDecimalOriginalInput=document.querySelector(${JSON.stringify(inputSelector)});true`)
  await click('button[data-testid="exact-role-reference"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).role==='reference'`, 'Reference dataset switch')
  await click('button[data-testid="exact-role-current"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).role==='current'`, 'return to Current dataset')
  state = await readState()
  inputSelector = selectorForState(state)
  await waitUntil(`Boolean(document.querySelector(${JSON.stringify(inputSelector)}))`, 'Current editor reconstructed after dataset switch')
  check(await evaluate(`document.querySelector(${JSON.stringify(inputSelector)})!==window.__exactDecimalOriginalInput`), 'Dataset switch reconstructs the editor from application state')
  await focusInput(inputSelector, critical)
  check((await readState()).exact === critical, 'Current to Reference to Current preserves exact digits')

  await click('button[data-testid="exact-product-away"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).productId!==JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).originalProductId`, 'switch to another product context')
  await click('button[data-testid="exact-product-return"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).productId===JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).originalProductId`, 'return to original product context')
  state = await readState()
  inputSelector = selectorForState(state)
  await waitUntil(`Boolean(document.querySelector(${JSON.stringify(inputSelector)}))`, 'product editor reconstructed')
  await focusInput(inputSelector, critical)
  check((await readState()).exact === critical, 'Product context roundtrip preserves exact digits')

  const reloaded = nextPageLoad()
  await send('Page.reload', { ignoreCache: true })
  await reloaded
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]')?.textContent??'{}').itemCode==='EXACT-DECIMAL-VERIFIER'`, 'fixture rehydrated after browser reload')
  state = await readState()
  inputSelector = selectorForState(state)
  await waitUntil(`Boolean(document.querySelector(${JSON.stringify(inputSelector)}))`, 'editor rebuilt after reload')
  await evaluate(`document.querySelector(${JSON.stringify(inputSelector)}).blur();true`)
  await waitUntil(`document.activeElement!==document.querySelector(${JSON.stringify(inputSelector)})`, 'release browser-restored editor focus')
  await delay(100)
  await send('Page.bringToFront')
  await focusInput(inputSelector, critical)
  state = await readState()
  check(state.exact === critical && state.calculation === Number(critical), 'Session reconstruction retains exact text and calculation value', state)

  for (const ordinary of ['12.3456789', '0.00000123456789']) {
    await replaceInput(inputSelector, ordinary)
    await blurWithoutChangingContext()
    await focusInput(inputSelector, ordinary)
    state = await readState()
    check(state.exact === ordinary && state.calculation === Number(ordinary), `Ordinary decimal ${ordinary} survives blur/refocus exactly`, state)
  }

  await replaceInput(inputSelector, critical)
  state = await readState()
  const beforeClear = { rowId: state.rowId, rowCount: state.rowCount }
  await click('button[data-testid="exact-clear-current"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).exact===null`, 'Clear removes the exact edit sidecar')
  await click('button[data-testid="exact-undo"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).exact===${JSON.stringify(critical)}`, 'Undo restores exact decimal state')
  state = await readState()
  check(state.calculation === Number(critical) && state.rowId === beforeClear.rowId && state.rowCount === beforeClear.rowCount,
    'Undo restores the numeric value and preserves row structure', state)
  await click('button[data-testid="exact-redo"]')
  await waitUntil(`JSON.parse(document.querySelector('[data-testid="exact-decimal-state"]').textContent).exact===null`, 'Redo reapplies Clear')
  state = await readState()
  check(state.calculation === null && state.rowId === beforeClear.rowId && state.rowCount === beforeClear.rowCount,
    'Redo clears the value without changing row structure', state)

  check(browserErrors.length === 0, 'Browser reports no runtime errors', browserErrors)
  console.log(`PASS exact decimal lifecycle: ${assertionCount} assertions; exact ${critical}; dataset, product, remount/reload, ordinary values, calculation representation, and native horizontal editing verified.`)
} finally {
  client?.close()
  await stopChild(chrome)
  await stopChild(vite)
  await rm(profile, { recursive: true, force: true })
}
