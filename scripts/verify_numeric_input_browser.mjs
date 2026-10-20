import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import net from 'node:net'

if (typeof WebSocket !== 'function') throw new Error('This browser verifier requires Node.js with built-in WebSocket support.')

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
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-numeric-browser-'))
const vite = configuredBaseUrl ? null : spawn(process.execPath, [
  resolve(repository, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'
], { cwd: repository, stdio: ['ignore', 'pipe', 'pipe'] })
const viteOutput = []
for (const stream of [vite?.stdout, vite?.stderr]) stream?.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1800', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
let client

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
  const baseUrl = configuredBaseUrl ?? `http://127.0.0.1:${vitePort}/`
  await waitFor(async () => {
    try { return (await fetch(baseUrl)).ok } catch { return false }
  }, 'Vite')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => {
    try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false }
  }, 'Chrome DevTools')

  const targetResponse = await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the test page: ${targetResponse.status}`)
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
  const visibleInputExpression = aria => `(()=>{
    const selector = 'input[aria-label=' + ${JSON.stringify(JSON.stringify(aria))} + ']'
    return [...document.querySelectorAll(selector)].find(element => {
      const rect = element.getBoundingClientRect()
      return element.getClientRects().length > 0 && rect.width > 0 && rect.height > 0
    })
  })()`
  const inputValue = aria => evaluate(`(()=>{const element=${visibleInputExpression(aria)};return element?.value ?? null})()`)
  const clickInput = async aria => {
    const point = await evaluate(`(()=>{const element=${visibleInputExpression(aria)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Visible input not found: ${aria}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(60)
    const focused = await evaluate('document.activeElement?.getAttribute("aria-label")')
    assert.equal(focused, aria, `browser focus reaches ${aria}`)
  }
  const typeInto = async (aria, text) => {
    await clickInput(aria)
    await evaluate('document.activeElement?.select()')
    for (const character of text) {
      await send('Input.insertText', { text: character })
      await delay(20)
    }
    await delay(120)
    return inputValue(aria)
  }
  const clickButton = async expression => {
    const point = await evaluate(`(()=>{const button=${expression};if(!button)return null;const rect=button.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,w:rect.width,h:rect.height}})()`)
    if (!point || point.w === 0 || point.h === 0) throw new Error('Visible test button not found.')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(180)
  }
  const clickRole = async name => clickButton(`([...document.querySelectorAll('button')].find(button => button.getClientRects().length && button.getAttribute('aria-label')?.startsWith(${JSON.stringify(name)})))`)
  const blurInto = async (source, next) => {
    const typed = await inputValue(source)
    assert.equal(typed, '12.3456789', `${source} accepts every typed decimal digit while focused`)
    await clickInput(next)
    await delay(180)
    const committedDisplay = await inputValue(source)
    assert.equal(committedDisplay, '12.35', `${source} keeps the accepted value after blur while display remains two decimals`)
    return { typed, blurred: committedDisplay }
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(async () => (await evaluate('document.title')).includes('COSTBREAKDOWN'), 'application')
  await waitFor(async () => Boolean(await evaluate("[...document.querySelectorAll('button')].some(button => button.innerText.trim() === 'Master Data')")), 'application navigation')

  const results = {}
  await clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Master Data'))`)
  const masterDataIsReadOnly = await evaluate(`document.querySelector('button[role="switch"]')?.getAttribute('aria-checked') === 'false'`)
  if (masterDataIsReadOnly) await clickButton(`document.querySelector('button[role="switch"]')`)
  await waitFor(async () => Boolean(await evaluate(`!!${visibleInputExpression('Selling Price (THB)')}`)), 'Master Data numeric input')
  const masterDraft = await typeInto('Selling Price (THB)', '12.3456789')
  assert.equal(masterDraft, '12.3456789', 'Master Data accepts the complete decimal draft')
  results.masterData = await blurInto('Selling Price (THB)', 'Product Name')

  // Load the bundled complete fixture so Simulation has actual current BOM
  // records on both an empty-workspace build and a seeded build.
  await clickButton(`document.getElementById('header-prepare-dataset-trigger')`)
  await waitFor(async () => Boolean(await evaluate(`!!document.querySelector('[role="group"][aria-label="Development mock datasets"]')`)), 'development dataset controls')
  await clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Complete Mock'))`)
  await waitFor(async () => Boolean(await evaluate(`[...document.querySelectorAll('[aria-label^="Current dataset:"]')].some(element => /[1-9] BOM items/.test(element.getAttribute('aria-label') || ''))`)), 'complete Current fixture')
  await clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Simulation'))`)
  const currentDatasetButton = await evaluate(`(()=>[...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Current' && button.hasAttribute('aria-pressed') && button.getClientRects().length))()?.getAttribute('aria-label')`)
  if (currentDatasetButton) {
    await clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Current' && button.hasAttribute('aria-pressed') && button.getClientRects().length))`)
  }
  await waitFor(async () => Boolean(await evaluate(`(()=>[...document.querySelectorAll('input')].some(element => /Price in (SIM|Custom|Current)$/.test(element.getAttribute('aria-label') || '') && element.getClientRects().length))()`)), 'Simulation parameter input')
  const simulationInput = await evaluate(`([...document.querySelectorAll('input')].find(element => /Price in (SIM|Custom|Current)$/.test(element.getAttribute('aria-label') || '') && element.getClientRects().length))?.getAttribute('aria-label')`)
  assert.ok(simulationInput, 'a visible BOM Price parameter input is available in Simulation')
  const simulationDraft = await typeInto(simulationInput, '12.3456789')
  assert.equal(simulationDraft, '12.3456789', 'Simulation accepts the complete parameter draft')
  results.simulation = await blurInto(simulationInput, 'Selling Price')

  const businessDraft = await typeInto('Selling Price', '12.3456789')
  assert.equal(businessDraft, '12.3456789', 'Business accepts the complete decimal draft')
  results.business = await blurInto('Selling Price', 'Variable Action Cost / Unit')

  const economicDraft = await typeInto('Variable Action Cost / Unit', '12.3456789')
  assert.equal(economicDraft, '12.3456789', 'Economic accepts the complete monetary draft')
  results.economic = await blurInto('Variable Action Cost / Unit', 'Fixed Action Cost')

  console.log(JSON.stringify({ result: 'PASS', browser: 'isolated Chrome', viewport: '1440x1800', value: '12.3456789', results }, null, 2))
} finally {
  client?.close()
  await stopChild(chrome)
  await stopChild(vite)
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
