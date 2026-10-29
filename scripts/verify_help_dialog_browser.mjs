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
  if (response.exceptionDetails) throw new Error(`${response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? 'Browser expression failed'}\nExpression: ${expression}`)
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

async function faqItemRect(question, part = 'button') {
  return evaluate(`(() => {
    const item = [...document.querySelectorAll('[data-faq-item]')].find(node => node.getAttribute('data-faq-item') === ${JSON.stringify(question)})
    const element = ${JSON.stringify(part)} === 'answer' ? item?.querySelector('p:not([hidden])') : item?.querySelector('button')
    if (!element || element.getClientRects().length === 0) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
  })()`)
}

async function emptyWorkspacePoint() {
  return evaluate(`(() => {
    const main = document.querySelector('main')
    const dialog = document.querySelector('#app-help-dialog')?.getBoundingClientRect()
    if (!main || !dialog) return null
    const box = main.getBoundingClientRect()
    const safe = 'a,button,input,select,textarea,[role="button"],[role="menuitem"],[role="dialog"],[role="slider"],[role="tooltip"],[data-grid-cell="true"],[data-safe-workspace-interaction="true"],[contenteditable="true"]'
    for (let y = Math.ceil(box.top + 8); y < box.bottom - 8; y += 24) {
      for (let x = Math.ceil(box.left + 8); x < box.right - 8; x += 24) {
        if (x >= dialog.left && x <= dialog.right && y >= dialog.top && y <= dialog.bottom) continue
        const target = document.elementFromPoint(x, y)
        if (target && main.contains(target) && !target.closest(safe)) return { x, y, tag: target.tagName }
      }
    }
    return null
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
    const history = ['Undo', 'Redo'].map(label => {
      const button = [...document.querySelectorAll('header button')].find(item => item.getAttribute('aria-label') === label)
      return { label, disabled: button?.disabled ?? null }
    })
    const selected = [...main.querySelectorAll('[aria-pressed="true"], [aria-selected="true"]')]
      .map(element => ({ label: element.getAttribute('aria-label'), text: element.textContent.trim() }))
    return {
      page,
      history,
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
  await clickAt(button)
  await waitFor(helpOpen, 'Help panel')
  verify(await evaluate('document.querySelector(\'[role="dialog"][aria-modal="true"]\') === null'), 'Help is a non-modal panel')
  const activeSection = await evaluate('document.querySelector("nav[aria-label=\\\"Help sections\\\"] [aria-current=\\\"page\\\"]")?.textContent.trim()')
  verify(activeSection === expectedSection, `Help opens the ${expectedSection} section for the current page`, activeSection)
  assert.deepEqual(await appSnapshot(), baseline, 'Opening Help changed the underlying page state')
}

async function closeHelpAndVerify(baseline, method) {
  const focusBefore = await evaluate('document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent.trim() || document.activeElement?.tagName || ""')
  if (method === 'Escape') await pressEscape()
  else await clickButton('Close Help')
  await waitFor(async () => !(await helpOpen()), `Help closes with ${method}`)
  const expectedFocusAfter = method === '×' || focusBefore === 'Help' || focusBefore === 'Close Help' ? 'Help' : focusBefore
  await waitFor(async () => (await evaluate('document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent.trim() || document.activeElement?.tagName || ""')) === expectedFocusAfter, `Help focus is restored after ${method}`)
  const focusAfter = await evaluate('document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent.trim() || document.activeElement?.tagName || ""')
  verify(focusAfter === expectedFocusAfter, 'Closing Help preserves focus or returns it to the Help button', { focusBefore, focusAfter })
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

  let masterBaseline = await appSnapshot()
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
  verify(await evaluate('document.querySelector("#header-prepare-dataset-trigger")?.getBoundingClientRect().left - document.querySelector(\'button[aria-label="Help"]\')?.getBoundingClientRect().right >= 5'), 'Help and Prepare Dataset are separate controls with visible spacing')
  verify(JSON.stringify(headerGeometry?.order) === JSON.stringify(['Undo', 'Redo', 'Help', 'Prepare Dataset']), 'Header utility order is Undo, Redo, Help, Prepare Dataset', headerGeometry?.order)

  await moveTo(helpRect)
  await waitFor(() => evaluate('[...document.querySelectorAll(\'[role="tooltip"]\')].some(item => item.textContent.trim() === "Help" && getComputedStyle(item).display !== "none")'), 'Help tooltip')
  verify(true, 'Hovering over ? shows the Help tooltip')
  await delay(550)
  verify(!(await helpOpen()), 'Help does not preview before the 600–700 ms delay')
  await moveTo({ x: 5, y: 500 })
  await delay(150)
  verify(!(await helpOpen()), 'Leaving ? early cancels the Help preview')
  await moveTo(helpRect)
  await waitFor(() => evaluate('[...document.querySelectorAll(\'[role="tooltip"]\')].some(item => item.textContent.trim() === "Help" && getComputedStyle(item).display !== "none")'), 'Help tooltip before delayed preview')
  await delay(650)
  await waitFor(helpOpen, 'Help hover preview')
  verify(await evaluate('document.querySelector(\'[role="dialog"][aria-modal="true"]\') === null'), 'Help hover preview is non-modal')
  assert.deepEqual(await appSnapshot(), masterBaseline, 'Opening Help preview changed the underlying page state')
  verify(await evaluate('document.querySelector(\'button[aria-label="Help"]\')?.getAttribute("aria-pressed") !== "true"'), 'Hover preview does not pin Help')
  const previewRect = await elementRect('#app-help-dialog')
  assert.ok(previewRect, 'Expected the Help preview panel')
  const centeredGeometry = await evaluate('(() => { const panel = document.querySelector("#app-help-dialog").getBoundingClientRect(); const trigger = document.querySelector("#header-help-trigger").getBoundingClientRect(); return { centerX: panel.left + panel.width / 2, centerY: panel.top + panel.height / 2, viewportCenterX: innerWidth / 2, viewportCenterY: innerHeight / 2, triggerCenterX: trigger.left + trigger.width / 2, triggerCenterY: trigger.top + trigger.height / 2, left: panel.left, top: panel.top } })()')
  verify(Math.abs(centeredGeometry.centerX - centeredGeometry.viewportCenterX) <= 2 && Math.abs(centeredGeometry.centerY - centeredGeometry.viewportCenterY) <= 2, 'Help is centered in the viewport', centeredGeometry)
  verify(Math.abs(centeredGeometry.centerX - centeredGeometry.triggerCenterX) > 100 && Math.abs(centeredGeometry.centerY - centeredGeometry.triggerCenterY) > 100, 'Help position is independent of the ? trigger', centeredGeometry)
  const scrollExperiment = await evaluate('(() => { const main = document.querySelector("main"); const target = [main, ...(main?.querySelectorAll("*") ?? [])].find(node => node && node.scrollHeight > node.clientHeight + 10); if (!target) return null; const top = target.scrollTop; const max = target.scrollHeight - target.clientHeight; const next = top < max ? Math.min(max, top + 20) : Math.max(0, top - 20); target.scrollTop = next; window.__helpScrollRestore = { target, top }; return { changed: target.scrollTop !== top, before: top, after: target.scrollTop } })()')
  verify(Boolean(scrollExperiment?.changed), 'A workspace scroll target is available for the position check', scrollExperiment)
  await delay(80)
  const afterWorkspaceScroll = await elementRect('#app-help-dialog')
  verify(afterWorkspaceScroll?.left === previewRect.left && afterWorkspaceScroll?.top === previewRect.top, 'Workspace scrolling does not move Help', { before: previewRect, after: afterWorkspaceScroll })
  await evaluate('(() => { const saved = window.__helpScrollRestore; if (saved) saved.target.scrollTop = saved.top; delete window.__helpScrollRestore })()')
  await moveTo(previewRect)
  await delay(350)
  verify(await helpOpen(), 'Pointer can move into the Help panel during its grace period')
  verify(await evaluate('[...document.querySelectorAll(\'[role="tooltip"]\')].some(item => item.textContent.trim() === "Help" && getComputedStyle(item).display !== "none") === false'), 'Help tooltip disappears when the pointer leaves ?')
  await moveTo({ x: 5, y: 5 })
  await waitFor(async () => !(await helpOpen()), 'Unpinned Help closes after the pointer leaves')
  verify(true, 'Unpinned preview closes after the pointer leaves both trigger and panel')
  assert.deepEqual(await appSnapshot(), masterBaseline, 'Closing Help preview changed the underlying page state')
  const pinStartedAt = Date.now()
  await clickAt(helpRect)
  await waitFor(helpOpen, 'Pinned Help panel', 500)
  verify(Date.now() - pinStartedAt < 500, 'Clicking ? pins Help immediately')
  verify(await evaluate('document.querySelector(\'button[aria-label="Help"]\')?.getAttribute("aria-pressed") === "true"'), 'Clicking ? pins Help open')
  const pinnedRect = await elementRect('#app-help-dialog')
  assert.ok(pinnedRect, 'Expected pinned Help panel')
  await moveTo(pinnedRect)
  await delay(400)
  verify(await helpOpen(), 'Pinned Help stays open after the pointer leaves ?')
  verify(await evaluate('[...document.querySelectorAll(\'[role="tooltip"]\')].some(item => item.textContent.trim() === "Help" && getComputedStyle(item).display !== "none") === false'), 'Pinning Help does not pin its tooltip')
  verify(await evaluate('document.querySelector(\'[role="dialog"][aria-modal="true"]\') === null'), 'Pinned Help remains non-modal')
  verify(await evaluate('document.activeElement?.getAttribute("aria-label") === "Help"'), 'Opening Help keeps keyboard focus on its trigger')
  verify(await evaluate('document.querySelector("nav[aria-label=\\\"Help sections\\\"] [aria-current=\\\"page\\\"]")?.textContent.trim() === "Master Data"'), 'Help opens Master Data while Master Data is active')
  verify(await evaluate('document.querySelector("#app-help-title")?.textContent.trim() === "Help"'), 'Help panel has a short title')
  verify(await evaluate('document.querySelectorAll("nav[aria-label=\\\"Help sections\\\"] button").length === 7'), 'Help contains seven sections')
  verify(await evaluate('![...document.querySelectorAll("nav[aria-label=\\\"Help sections\\\"] button")].some(button => ["Getting Started", "Guided Workflow"].includes(button.textContent.trim()))'), 'Help no longer has separate Getting Started or Guided Workflow sections')
  const currentRoleVisible = await evaluate(`document.querySelector('main button[aria-label^="Current"][aria-pressed="true"]') !== null`)
  verify(currentRoleVisible, 'Selected Master Data role remains selected while Help is open')
  assert.deepEqual(await appSnapshot(), masterBaseline, 'Pinning Help changed the underlying page state')
  await clickButton('Cost Breakdown', 'header nav[aria-label="Main navigation"]')
  await waitFor(() => evaluate('document.querySelector(\'header nav[aria-label="Main navigation"] button[aria-current="page"]\')?.textContent.trim() === "Cost Breakdown"'), 'Workspace navigation behind Help')
  verify(await helpOpen(), 'Clicking a real workspace control does not close pinned Help')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [aria-current="page"]\')?.textContent.trim() === "Master Data"'), 'Workspace navigation does not switch the selected Help section')
  await clickButton('Master Data', 'header nav[aria-label="Main navigation"]')
  await waitFor(() => evaluate('document.querySelector(\'header nav[aria-label="Main navigation"] button[aria-current="page"]\')?.textContent.trim() === "Master Data"'), 'Restore Master Data page')
  const blankPoint = await emptyWorkspacePoint()
  assert.ok(blankPoint, 'Expected an empty workspace area outside the Help panel')
  const stateBeforeEmptyWorkspaceClick = await appSnapshot()
  await clickAt(blankPoint)
  await waitFor(async () => !(await helpOpen()), 'Empty workspace click closes pinned Help')
  assert.deepEqual(await appSnapshot(), stateBeforeEmptyWorkspaceClick, 'Workspace dismissal changed Master Data or Help state')
  masterBaseline = stateBeforeEmptyWorkspaceClick
  await clickAt(helpRect)
  await waitFor(helpOpen, 'Reopen Help after workspace dismissal')
  await moveTo(await elementRect('#app-help-title'))
  await captureScreenshot('help-master-data-desktop.png')

  verify(await evaluate('document.querySelector("#app-help-title")?.nextElementSibling === null'), 'Help header contains no page subtitle')
  await clickButton('Workflow', 'nav[aria-label="Help sections"]')
  await captureScreenshot('help-workflow-desktop.png')

  const sectionCases = [
    ['Workflow', 'Prepare datasets in Master Data'],
    ['Master Data', 'Last Saved'],
    ['Cost Breakdown', 'Standard Cost Gap'],
    ['Simulation', 'Active Dataset ≠ Result Before / After'],
    ['Important Concepts', 'Save ≠ Export'],
    ['Quick Reference', 'Undo'],
    ['FAQ', 'Where should I start?']
  ]
  for (const [section, expectedText] of sectionCases) {
    await clickButton(section, 'nav[aria-label="Help sections"]')
    const sectionText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
    verify(sectionText.includes(expectedText), `${section} shows its expected quick-guide content`)
  }
  await clickButton('Workflow', 'nav[aria-label="Help sections"]')
  const workflowText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(await evaluate('Boolean(document.querySelector("#app-help-section [data-help-workflow-diagram] [role=img]"))'), 'Workflow includes the app relationship diagram')
  verify(await evaluate('document.querySelectorAll("#app-help-section ol > li").length === 6'), 'Workflow has exactly six steps')
  verify(['Prepare datasets in Master Data', 'Check data with Prepare Dataset', 'Compare datasets in Cost Breakdown', 'Test supported changes in Simulation', 'Send to matching Master Data if needed', 'Export the dataset you want to keep'].every(step => workflowText.includes(step)), 'Workflow uses the neutral six-step wording')
  verify(!workflowText.includes('Reference → Current') && !workflowText.includes('Current → Custom') && !workflowText.includes('Import original XLSX into Reference'), 'Workflow does not require a fixed dataset-role sequence')
  verify(await evaluate('document.querySelectorAll("#app-help-section ol > li").length === 6 && [...document.querySelectorAll("#app-help-section ol > li")].every(step => step.querySelectorAll("svg").length === 0)'), 'Workflow steps stay compact without decorative page icons')

  await clickButton('Cost Breakdown', 'nav[aria-label="Help sections"]')
  const costContent = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(costContent.includes('After − Before') && costContent.includes('Standard Cost Gap'), 'Cost Breakdown shows the gap formula')
  verify(costContent.includes('CHANGED') && costContent.includes('ADDED') && costContent.includes('REMOVED'), 'Cost Breakdown explains row statuses')
  verify(costContent.includes('Full Gap') && costContent.includes('Selected contribution'), 'Cost Breakdown separates selected contribution from the full Gap')
  verify(costContent.includes('Uses Master Data Working, including unsaved edits.'), 'Cost Breakdown explains which Master Data values it reads')
  verify(await evaluate('document.querySelector("[data-help-cost-group=row-status]")?.contains(document.querySelector("[data-help-cost-group=gap]")) === false && document.querySelector("[data-help-cost-group=row-status]") !== null && document.querySelector("[data-help-cost-group=gap]") !== null'), 'Cost Breakdown keeps Row status and Gap in separate groups')
  await captureScreenshot('help-cost-breakdown-desktop.png')

  await clickButton('Simulation', 'nav[aria-label="Help sections"]')
  const simulationContent = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(await evaluate('["edit-scenario", "result-comparison", "actions"].every(name => document.querySelector(`[data-help-simulation-block="${name}"]`))'), 'Simulation has separate Edit scenario, Result comparison, and Actions blocks')
  verify(simulationContent.includes('Active Dataset ≠ Result Before / After') && simulationContent.includes('Changing Before / After does not change Active Dataset or Send target.'), 'Simulation makes the independent controls clear')
  verify(simulationContent.includes('Price') && simulationContent.includes('Usage') && simulationContent.includes('Loss') && simulationContent.includes('Manning') && simulationContent.includes('Capacity') && simulationContent.includes('Yield'), 'Simulation lists supported BOM and Routing changes')
  verify(simulationContent.includes('Selling Price') && simulationContent.includes('SG&A') && simulationContent.includes('Variable / Fixed Action Cost') && simulationContent.includes('Batch Size'), 'Simulation lists its economic inputs')
  verify(simulationContent.includes('Simulation economics are not sent') && simulationContent.includes('Add or remove rows in Master Data.'), 'Simulation explains its scope and Send limits')
  verify(await evaluate('document.querySelectorAll("#app-help-section [data-help-simulation-block=actions] .inline-flex").length === 2'), 'Simulation has one Send explanation and one Reset explanation in Actions')
  verify((simulationContent.match(/matching Master Data Working/g) ?? []).length === 1, 'Simulation states the Send destination once')
  verify(simulationContent.includes('Restores parameters, Selling Price, and SG&A') && simulationContent.includes('Clears Variable/Fixed Action Cost and Batch Size.'), 'Simulation Reset description matches its current behavior')
  await captureScreenshot('help-simulation-desktop.png')

  await clickButton('Important Concepts', 'nav[aria-label="Help sections"]')
  const conceptContent = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(['Save ≠ Export', 'Working ≠ Last Saved', 'Warning ≠ Blocker', 'Active Dataset ≠ Result Before / After'].every(pair => conceptContent.includes(pair)), 'Important Concepts shows the four useful ≠ pairs')
  verify(conceptContent.includes('Closing the browser ends the current session') && conceptContent.includes('Export data you want to keep'), 'Important Concepts explains session limits')
  await captureScreenshot('help-important-concepts-desktop.png')

  await clickButton('Quick Reference', 'nav[aria-label="Help sections"]')
  const headerToolLabels = await evaluate('[...document.querySelectorAll("#app-help-section [data-help-header-tool]")].map(node => node.getAttribute("data-help-header-tool"))')
  verify(JSON.stringify(headerToolLabels) === JSON.stringify(['Undo', 'Redo', 'Help', 'Prepare Dataset']), 'Quick Reference follows the header tool order')
  verify(!await evaluate('document.querySelector("#app-help-section")?.innerText.includes("i · Prepare Dataset") || document.querySelector("#app-help-section")?.innerText.includes("? · Help")'), 'Quick Reference does not repeat i or ? in labels')
  await captureScreenshot('help-quick-reference-desktop.png')

  await clickButton('Master Data', 'nav[aria-label="Help sections"]')
  const costSectionButton = await buttonRect('Cost Breakdown', 'nav[aria-label="Help sections"]')
  assert.ok(costSectionButton, 'Expected Cost Breakdown Help navigation item')
  await moveTo(costSectionButton)
  const sectionBeforeDelay = await evaluate('new Promise(resolve => setTimeout(() => resolve(document.querySelector("#app-help-section-title")?.textContent.trim()), 210))')
  verify(sectionBeforeDelay === 'Master Data', 'Section preview waits beyond the old 180 ms delay')
  const helpContentRect = await elementRect('#app-help-scroll')
  assert.ok(helpContentRect, 'Expected Help content area')
  await moveTo(helpContentRect)
  await delay(350)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Master Data"'), 'Leaving a section trigger early cancels its preview')
  await moveTo(costSectionButton)
  await delay(300)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Cost Breakdown"'), 'Section preview opens after about 275 ms')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [aria-current="page"]\')?.textContent.trim() === "Master Data"'), 'Section preview does not change the selected section')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [data-previewing="true"]\')?.textContent.trim() === "Cost Breakdown"'), 'Previewed section is marked in the navigation')
  const costDetailRect = await elementRect('#app-help-section')
  assert.ok(costDetailRect, 'Expected the previewed section content')
  await moveTo(costDetailRect)
  await delay(350)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Cost Breakdown"'), 'Section preview stays open while the pointer is over its content')
  const panelTitleRect = await elementRect('#app-help-title')
  await moveTo(panelTitleRect)
  await delay(350)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Master Data"'), 'Leaving the whole section interaction region returns to the selected section')
  await clickButton('Simulation', 'nav[aria-label="Help sections"]')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [aria-current="page"]\')?.textContent.trim() === "Simulation"'), 'Clicking a section commits it')

  await clickButton('FAQ', 'nav[aria-label="Help sections"]')
  verify(await evaluate('document.querySelectorAll("#app-help-section [data-faq-item]").length === 7'), 'FAQ contains seven questions')
  const firstQuestion = 'Where should I start?'
  const firstQuestionRect = await faqItemRect(firstQuestion)
  await moveTo(firstQuestionRect)
  const faqBeforeDelay = await evaluate('new Promise(resolve => setTimeout(() => resolve(document.querySelector("[data-faq-item=\\\"Where should I start?\\\"] button")?.getAttribute("aria-expanded")), 210))')
  verify(faqBeforeDelay === 'false', 'FAQ preview waits beyond the old 180 ms delay')
  await moveTo(helpContentRect)
  await delay(350)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where should I start?")?.querySelector("button")?.getAttribute("aria-expanded") === "false"'), 'Leaving a question early cancels its preview')
  const exportQuestion = 'Where is my exported XLSX?'
  await moveTo(await faqItemRect(exportQuestion))
  await delay(300)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.querySelector("button")?.getAttribute("aria-expanded") === "true"'), 'FAQ answer previews after about 275 ms')
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.getAttribute("data-previewing") === "true"'), 'FAQ hover answer is marked as a preview')
  await moveTo(await faqItemRect(exportQuestion, 'answer'))
  await delay(350)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.querySelector("button")?.getAttribute("aria-expanded") === "true"'), 'FAQ stays open while the pointer moves into the answer')
  const sendQuestion = 'Where does Simulation Send go?'
  await moveTo(await faqItemRect(sendQuestion))
  await delay(300)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where does Simulation Send go?")?.getAttribute("data-previewing") === "true"'), 'Hovering another FAQ previews its answer')
  await clickAt(await faqItemRect(sendQuestion))
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where does Simulation Send go?")?.getAttribute("data-previewing") === "false"'), 'Clicking an FAQ question commits its answer')
  await moveTo(await elementRect('#app-help-section-title'))
  await delay(350)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where does Simulation Send go?")?.querySelector("button")?.getAttribute("aria-expanded") === "true"'), 'Committed FAQ stays open after the pointer leaves')
  await moveTo(await faqItemRect(exportQuestion))
  await delay(300)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.querySelector("button")?.getAttribute("aria-expanded") === "true"'), 'Hovering another FAQ temporarily previews it')
  await moveTo(await elementRect('#app-help-section-title'))
  await delay(350)
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.querySelector("button")?.getAttribute("aria-expanded") === "false"') && await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where does Simulation Send go?")?.querySelector("button")?.getAttribute("aria-expanded") === "true"'), 'Leaving an FAQ preview returns to the committed answer')
  await clickAt(await faqItemRect(sendQuestion))
  verify(await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where does Simulation Send go?")?.querySelector("button")?.getAttribute("aria-expanded") === "false"'), 'Clicking the committed FAQ again closes it')
  await clickAt(await faqItemRect(exportQuestion))
  const exportFaq = await evaluate('[...document.querySelectorAll("[data-faq-item]")].find(item => item.getAttribute("data-faq-item") === "Where is my exported XLSX?")?.innerText ?? ""')
  verify(exportFaq.includes('Export saves the XLSX to the location you choose.'), 'Export FAQ matches the app’s choose-location behavior')
  verify(!exportFaq.includes('Downloads list'), 'Export FAQ does not describe browser-managed downloads')
  await captureScreenshot('help-faq-desktop.png')
  await clickButton('Master Data', 'nav[aria-label="Help sections"]')
  const masterDataText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(masterDataText.includes('Reference') && masterDataText.includes('Baseline') && masterDataText.includes('Current') && masterDataText.includes('Latest') && masterDataText.includes('Custom') && masterDataText.includes('Alternative'), 'Master Data names the three independent dataset roles')
  verify(masterDataText.includes('Roles are independent, not stages.') && masterDataText.includes('can apply to any role.'), 'Master Data does not imply that roles are workflow stages')
  verify(await evaluate('["Saved and Draft", "Working and Last Saved", "Warning and Blocker"].every(label => [...document.querySelectorAll("#app-help-section [role=group]")].some(group => group.getAttribute("aria-label") === label))'), 'Master Data pairs values and statuses by meaning')
  verify(await evaluate('["Saved", "Draft", "Working", "Last Saved", "Warning", "Blocker"].every(title => [...document.querySelectorAll("#app-help-section [role=group]")].some(group => group.innerText.includes(title)))'), 'Master Data paired groups include all six states')
  verify(await evaluate('(() => { const groups = [...document.querySelectorAll("#app-help-section [role=group]")]; const tools = groups.find(group => group.getAttribute("aria-label") === "Master Data tools"); return ["Edit", "Import", "Clone", "Sizing", "Prepare Dataset", "Save", "Reset", "Clear", "Export"].every(label => [...(tools?.children ?? [])].some(item => item.innerText.includes(label))) })()'), 'Master Data keeps all nine real tool explanations')

  await clickButton('Workflow', 'nav[aria-label="Help sections"]')
  await clickButton('Simulation', 'nav[aria-label="Help sections"]')
  verify(await evaluate('document.querySelector("#app-help-section")?.innerText.includes("Active Dataset → matching Master Data Working") && document.querySelector("#app-help-section")?.innerText.includes("Simulation economics are not sent")'), 'Simulation section names the Send destination and excluded economics')

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
  await captureScreenshot('help-simulation-compact.png')
  await pressEscape()
  await waitFor(async () => !(await helpOpen()), 'Escape close')
  await command('Emulation.clearDeviceMetricsOverride')

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

  const helpButton = await buttonRect('Help')
  assert.ok(helpButton, 'Expected the Help header button')
  const headerPinStartedAt = Date.now()
  await clickAt(helpButton)
  await waitFor(helpOpen, 'Help opened by click', 500)
  verify(Date.now() - headerPinStartedAt < 500, 'Header click opens Help without the hover delay')
  verify(await evaluate('document.querySelector(\'button[aria-label="Help"]\')?.getAttribute("aria-pressed") === "true"'), 'Header click pins Help')
  await clickButton('Help')
  await waitFor(async () => !(await helpOpen()), 'Help toggles closed from its header button')
  await delay(450)
  verify(!(await helpOpen()), 'Closing pinned Help does not reopen its hover preview')

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
