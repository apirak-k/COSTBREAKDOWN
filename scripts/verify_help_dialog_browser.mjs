import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const repository = process.cwd()
const configuredUrl = process.env.COSTBREAKDOWN_BROWSER_URL
const localUrl = configuredUrl ?? `http://127.0.0.1:${await unusedPort()}/`
const vitePort = configuredUrl ? null : Number(new URL(localUrl).port)
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-help-profile-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-help-evidence-'))
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const vite = configuredUrl ? null : spawn(process.execPath, [
  viteCliPath, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'
], {
  cwd: repository,
  env: { ...process.env, COSTBREAKDOWN_VITE_CACHE_DIR: join(profile, 'vite-cache') },
  stdio: ['ignore', 'pipe', 'pipe']
})
const viteOutput = []
for (const stream of [vite?.stdout, vite?.stderr]) stream?.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
const chromeOutput = []
chrome.stderr.on('data', chunk => chromeOutput.push(String(chunk)))
const browserErrors = []
const resourceErrors = []
const checks = []
let client
let commandId = 0
const pendingCommands = new Map()

function stopChild(child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolve() })
    child.kill('SIGTERM')
  })
}

function command(method, params = {}) {
  const id = ++commandId
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCommands.delete(id)
      reject(new Error(`Chrome DevTools command timed out: ${method}`))
    }, 10000)
    pendingCommands.set(id, { resolve, reject, timer })
    client.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Browser expression failed')
  return response.result?.value
}

async function waitFor(check, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    if ((vite && vite.exitCode !== null) || chrome.exitCode !== null) break
    await delay(100)
  }
  const pageState = client
    ? await evaluate(`JSON.stringify({ href: location.href, readyState: document.readyState, title: document.title, body: document.body?.innerText.slice(0, 400) })`).catch(error => String(error))
    : 'Chrome page is not connected.'
  throw new Error(`${label} did not become ready. Page state: ${pageState}\nBrowser errors: ${browserErrors.join('\n')}\nVite output:\n${viteOutput.join('').slice(-2500)}\nChrome output:\n${chromeOutput.join('').slice(-1500)}`)
}

function verify(condition, message, detail) {
  checks.push({ passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) })
  process.stdout.write(`${condition ? 'PASS' : 'FAIL'} ${message}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}\n`)
}

async function elementRect(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)})
    if (!element || element.getClientRects().length === 0) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
  })()`)
}

async function buttonRect(label, scopeSelector = 'body') {
  return evaluate(`(() => {
    const scope = document.querySelector(${JSON.stringify(scopeSelector)})
    const element = [...(scope?.querySelectorAll('button') ?? [])].find(button => button.getAttribute('aria-label') === ${JSON.stringify(label)} || button.textContent.trim() === ${JSON.stringify(label)})
    if (!element || element.getClientRects().length === 0) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
  })()`)
}

async function textElementRect(selector, text) {
  return evaluate(`(() => {
    const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(item => item.textContent.trim() === ${JSON.stringify(text)})
    if (!element || element.getClientRects().length === 0) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
  })()`)
}

async function moveTo(point) {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none' })
}

async function clickAt(point) {
  await moveTo(point)
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
}

async function clickSelector(selector) {
  const point = await elementRect(selector)
  assert.ok(point, `Expected a visible element: ${selector}`)
  await clickAt(point)
}

async function clickButton(label, scopeSelector = 'body') {
  const point = await buttonRect(label, scopeSelector)
  assert.ok(point, `Expected a visible button: ${label}`)
  await clickAt(point)
}

async function clickTextElement(selector, text) {
  const point = await textElementRect(selector, text)
  assert.ok(point, `Expected visible text control: ${text}`)
  await clickAt(point)
}

async function pressEscape() {
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
}

async function pressTab(shift = false) {
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 })
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 })
}

async function helpOpen() {
  return evaluate('Boolean(document.querySelector(\'[role="dialog"][aria-labelledby="app-help-title"]\'))')
}

async function appSnapshot() {
  return evaluate(`(() => {
    const main = document.querySelector('main')
    const footer = document.querySelector('footer[aria-label="Dataset and comparison status"]')
    const hash = text => {
      let value = 2166136261
      for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619)
      return (value >>> 0).toString(16)
    }
    if (!main) return null
    const scrollPositions = [main, ...main.querySelectorAll('*')]
      .filter(element => element.scrollHeight > element.clientHeight + 1)
      .map(element => ({ tag: element.tagName, id: element.id, role: element.getAttribute('role'), top: element.scrollTop, left: element.scrollLeft }))
    const page = [...document.querySelectorAll('header nav[aria-label="Main navigation"] button')]
      .find(button => button.getAttribute('aria-current') === 'page')?.textContent.trim()
    const selected = [...main.querySelectorAll('[aria-pressed="true"], [aria-selected="true"]')]
      .map(element => ({ label: element.getAttribute('aria-label'), text: element.textContent.trim() }))
    return {
      page,
      mainHtmlHash: hash(main.innerHTML),
      mainTextHash: hash(main.innerText),
      mainScrollTop: main.scrollTop,
      scrollPositions,
      selected,
      footerText: footer?.innerText ?? ''
    }
  })()`)
}

async function captureScreenshot(name) {
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(join(evidenceDir, name), Buffer.from(screenshot.data, 'base64'))
}

async function openHelpAndVerify(expectedSection, baseline) {
  const button = await buttonRect('Help')
  assert.ok(button, 'Expected the separate Help button in the header')
  await moveTo(button)
  await delay(80)
  const actualBefore = await appSnapshot()
  assert.deepEqual(actualBefore, baseline, 'Pointer movement to Help changed the underlying page state')
  await clickAt(button)
  await waitFor(helpOpen, 'Help dialog')
  verify(await evaluate('document.activeElement?.getAttribute("aria-label") === "Close Help"'), 'Help moves keyboard focus into the dialog')
  verify(await evaluate('document.querySelector(\'[role="dialog"][aria-modal="true"]\') !== null'), 'Help is exposed as a modal dialog')
  const activeSection = await evaluate('document.querySelector("nav[aria-label=\\\"Help sections\\\"] [aria-current=\\\"page\\\"]")?.textContent.trim()')
  verify(activeSection === expectedSection, `Help opens the ${expectedSection} section for the current page`, activeSection)
  assert.deepEqual(await appSnapshot(), baseline, 'Opening Help changed the underlying page state')
}

async function closeHelpAndVerify(baseline, method) {
  if (method === 'Escape') await pressEscape()
  else await clickButton('Close Help')
  await waitFor(async () => !(await helpOpen()), `Help closes with ${method}`)
  const helpButton = await buttonRect('Help')
  if (helpButton) await moveTo(helpButton)
  await delay(100)
  verify(await evaluate('document.activeElement?.getAttribute("aria-label") === "Help"'), 'Closing Help restores focus to its header button')
  assert.deepEqual(await appSnapshot(), baseline, `Closing Help changed the underlying page state (${method})`)
  verify(true, `Underlying page data, selection, edits, simulation view, and scroll positions are unchanged after ${method}`)
}

try {
  const baseUrl = localUrl
  if (!configuredUrl) await waitFor(async () => { try { return (await fetch(baseUrl)).ok } catch { return false } }, 'Vite')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => { try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false } }, 'Chrome DevTools')
  const targetResponse = await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the application: ${targetResponse.status}`)
  const target = await targetResponse.json()
  client = new WebSocket(target.webSocketDebuggerUrl)
  client.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails?.text ?? 'Runtime exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push(message.params.args.map(argument => argument.value ?? argument.description ?? '').join(' '))
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && ['javascript', 'console'].includes(message.params.entry.source)) browserErrors.push(message.params.entry.text)
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) resourceErrors.push({ status: message.params.response.status, url: message.params.response.url })
    if (message.id === undefined) return
    const pending = pendingCommands.get(message.id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingCommands.delete(message.id)
    if (message.error) pending.reject(new Error(message.error.message))
    else pending.resolve(message.result ?? {})
  })
  await new Promise((resolve, reject) => {
    client.addEventListener('open', resolve, { once: true })
    client.addEventListener('error', reject, { once: true })
  })
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Log.enable')
  await command('Network.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const navigation = await command('Page.navigate', { url: baseUrl })
  process.stdout.write(`Opened browser target: ${target.url ?? '(no URL reported)'}; navigation: ${JSON.stringify(navigation)}\n`)
  await waitFor(() => evaluate(`document.querySelector('header') !== null && document.querySelector('main') !== null`), 'Application shell')

  const infoRect = await elementRect('#header-prepare-dataset-trigger')
  verify(Boolean(infoRect), 'Existing Prepare Dataset button is present')
  assert.ok(await buttonRect('Help'), 'Expected the new separate Help button in the header')
  const currentRole = await elementRect('main button[aria-label^="Current"]')
  assert.ok(currentRole, 'Expected the Current dataset selector')
  await clickAt(currentRole)
  await waitFor(() => evaluate(`document.querySelector('main button[aria-label^="Current"]')?.getAttribute('aria-pressed') === 'true'`), 'selected Current dataset')
  await evaluate(`(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = Math.min(32, Math.max(0, main.scrollHeight - main.clientHeight))
    for (const element of main?.querySelectorAll('*') ?? []) {
      if (element.scrollHeight > element.clientHeight + 1) element.scrollTop = Math.min(16, element.scrollHeight - element.clientHeight)
    }
  })()`)

  const helpRect = await buttonRect('Help')
  assert.ok(helpRect, 'Expected the separate Help button in the header')
  const headerGeometry = await evaluate(`(() => {
    const info = document.querySelector('#header-prepare-dataset-trigger')
    const help = [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Help')
    const before = [...document.querySelectorAll('header [role="group"][aria-label="Workspace utilities"] button')].map(button => button.getAttribute('aria-label') ?? button.textContent.trim())
    if (!info || !help) return null
    return { infoRight: info.getBoundingClientRect().right, helpLeft: help.getBoundingClientRect().left, helpText: help.textContent.trim(), order: before }
  })()`)
  verify(headerGeometry?.helpText === '?', 'Header Help button displays a question mark')
  verify(headerGeometry?.helpLeft - headerGeometry?.infoRight >= 5, 'Help is a separate button with visible spacing after Prepare Dataset', headerGeometry)
  verify(JSON.stringify(headerGeometry?.order) === JSON.stringify(['Undo', 'Redo', 'Prepare Dataset', 'Help']), 'Undo, Redo, Prepare Dataset, and Help remain separate header controls', headerGeometry?.order)

  await moveTo(helpRect)
  await waitFor(() => evaluate('[...document.querySelectorAll(\'[role="tooltip"]\')].some(item => item.textContent.trim() === "Help" && getComputedStyle(item).display !== "none")'), 'Help tooltip')
  verify(true, 'Hovering over ? shows the Help tooltip')
  await clickAt(helpRect)
  await waitFor(helpOpen, 'Help dialog')
  verify(await evaluate('document.activeElement?.getAttribute("aria-label") === "Close Help"'), 'Help moves keyboard focus into the dialog')
  verify(await evaluate('document.querySelector(\'[role="dialog"][aria-modal="true"]\') !== null'), 'Help is exposed as a modal dialog')
  verify(await evaluate('document.querySelector("nav[aria-label=\\\"Help sections\\\"] [aria-current=\\\"page\\\"]")?.textContent.trim() === "Master Data"'), 'Help opens Master Data while Master Data is active')
  verify(await evaluate('document.querySelector("#app-help-title")?.textContent.trim() === "Help & User Guide"'), 'Help dialog has its requested title')
  verify(await evaluate('document.querySelectorAll("nav[aria-label=\\\"Help sections\\\"] button").length === 8'), 'Help contains all eight requested sections')
  const currentRoleVisible = await evaluate(`document.querySelector('main button[aria-label^="Current"][aria-pressed="true"]') !== null`)
  verify(currentRoleVisible, 'Selected Master Data role remains selected while Help is open')
  await captureScreenshot('help-master-data-desktop.png')

  await pressTab(true)
  verify(await evaluate('document.activeElement?.textContent.trim() === "FAQ"'), 'Shift+Tab wraps within the Help dialog')
  await pressTab(false)
  verify(await evaluate('document.activeElement?.getAttribute("aria-label") === "Close Help"'), 'Tab wraps within the Help dialog')

  const sectionCases = [
    ['Getting Started', 'Cost Breakdown'],
    ['Guided Workflow', 'Import original XLSX into Reference'],
    ['Master Data', 'Last Saved'],
    ['Cost Breakdown', 'Standard Cost Gap'],
    ['Simulation', 'Send follows the Active Dataset, not Result After'],
    ['Important Concepts', 'Save ≠ Export'],
    ['Quick Reference', 'Undo'],
    ['FAQ', 'Where should I start?']
  ]
  for (const [section, expectedText] of sectionCases) {
    await clickButton(section, 'nav[aria-label="Help sections"]')
    const sectionText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
    verify(sectionText.includes(expectedText), `${section} shows its expected quick-guide content`)
  }
  verify(await evaluate('document.querySelectorAll("#app-help-section details").length === 7'), 'FAQ contains seven compact questions')
  await clickTextElement('#app-help-section summary', 'Where should I start?')
  verify(await evaluate('document.querySelector("#app-help-section details")?.open === true'), 'FAQ answer expands from its question')

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 420, deviceScaleFactor: 1, mobile: true })
  const compactGeometry = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="app-help-title"]')
    const content = document.querySelector('#app-help-scroll')
    if (!dialog || !content) return null
    const box = dialog.getBoundingClientRect()
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, contentScrollHeight: content.scrollHeight, contentClientHeight: content.clientHeight }
  })()`)
  verify(Boolean(compactGeometry && compactGeometry.left >= 0 && compactGeometry.right <= compactGeometry.viewportWidth && compactGeometry.top >= 0 && compactGeometry.bottom <= compactGeometry.viewportHeight), 'Help stays within a compact screen viewport', compactGeometry)
  verify(Boolean(compactGeometry && compactGeometry.contentScrollHeight > compactGeometry.contentClientHeight), 'Help details scroll inside the panel on a compact screen', compactGeometry)
  await captureScreenshot('help-faq-compact.png')
  await clickAt({ x: 5, y: 5 })
  verify(await helpOpen(), 'Clicking outside the panel does not dismiss Help')
  await pressEscape()
  await waitFor(async () => !(await helpOpen()), 'Escape close')
  await command('Emulation.clearDeviceMetricsOverride')

  const masterBaseline = await appSnapshot()
  verify(masterBaseline?.selected.length > 0, 'State-neutrality test starts with a selected Master Data role')
  await openHelpAndVerify('Master Data', masterBaseline)
  await closeHelpAndVerify(masterBaseline, 'Escape')
  await clickButton('Cost Breakdown', 'header nav[aria-label="Main navigation"]')
  await waitFor(() => evaluate('document.querySelector("header nav[aria-label=\\\"Main navigation\\\"] button[aria-current=\\\"page\\\"]")?.textContent.trim() === "Cost Breakdown"'), 'Cost Breakdown navigation')
  const breakdownBaseline = await appSnapshot()
  await openHelpAndVerify('Cost Breakdown', breakdownBaseline)
  await closeHelpAndVerify(breakdownBaseline, '×')
  await clickButton('Simulation', 'header nav[aria-label="Main navigation"]')
  await waitFor(() => evaluate('document.querySelector("header nav[aria-label=\\\"Main navigation\\\"] button[aria-current=\\\"page\\\"]")?.textContent.trim() === "Simulation"'), 'Simulation navigation')
  const simulationBaseline = await appSnapshot()
  await openHelpAndVerify('Simulation', simulationBaseline)
  await closeHelpAndVerify(simulationBaseline, 'Escape')

  verify(browserErrors.length === 0, 'Browser has no JavaScript runtime or console errors', browserErrors)
  if (resourceErrors.length > 0) process.stdout.write(`Nonfatal HTTP resource responses: ${JSON.stringify(resourceErrors)}\n`)
  const failures = checks.filter(check => !check.passed)
  process.stdout.write(`Help browser verification: ${checks.length - failures.length}/${checks.length} PASS\n`)
  process.stdout.write(`Visual evidence: ${evidenceDir}\n`)
  if (failures.length > 0) process.exitCode = 1
} catch (error) {
  process.exitCode = 1
  process.stderr.write(`${error.stack ?? error}\n`)
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await rm(profile, { recursive: true, force: true })
  await rm(join(evidenceDir, '.keep'), { force: true })
}
