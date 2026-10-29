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

async function helpNavBlankPoint() {
  return evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Help sections"]')
    const buttons = [...(nav?.querySelectorAll('button') ?? [])]
    const last = buttons.at(-1)?.getBoundingClientRect()
    const box = nav?.getBoundingClientRect()
    if (!nav || !last || !box) return null
    const point = { x: box.left + box.width / 2, y: Math.min(box.bottom - 12, last.bottom + 36) }
    const target = document.elementFromPoint(point.x, point.y)
    return target && nav.contains(target) && !target.closest('button') ? point : null
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
  const helpSectionLabels = await evaluate('[...document.querySelectorAll("nav[aria-label=\\\"Help sections\\\"] button")].map(button => button.textContent.trim())')
  verify(JSON.stringify(helpSectionLabels) === JSON.stringify(['Workflow', 'Master Data', 'Cost Breakdown', 'Simulation', 'Quick Reference']), 'Help has the five sections in the required order')
  verify(!helpSectionLabels.some(label => ['Getting Started', 'Guided Workflow', 'Important Concepts', 'FAQ'].includes(label)), 'Help has no duplicate intro, concepts, or FAQ sections')
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

  verify(await evaluate('document.querySelector("#app-help-title")?.nextElementSibling === null'), 'Help header contains no subtitle')
  verify(await evaluate('document.querySelectorAll("#app-help-section [data-faq-item]").length === 0'), 'Help has no FAQ content')
  const sectionCases = [
    ['Workflow', 'Prepare datasets'],
    ['Master Data', 'Dataset roles'],
    ['Cost Breakdown', 'Standard Cost Gap'],
    ['Simulation', 'Edit scenario'],
    ['Quick Reference', 'Save ≠ Export']
  ]
  for (const [section, expectedText] of sectionCases) {
    await clickButton(section, 'nav[aria-label="Help sections"]')
    await delay(60)
    const sectionText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
    verify(sectionText.includes(expectedText), section + ' shows its expected quick-guide content')
    await captureScreenshot('help-' + section.toLowerCase().replaceAll(' ', '-') + '-desktop.png')
  }

  await clickButton('Workflow', 'nav[aria-label="Help sections"]')
  const workflowText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(await evaluate('(() => { const diagram = document.querySelector("[data-help-workflow-diagram]"); return Boolean(diagram?.querySelector("svg marker") && diagram.querySelectorAll("svg path[marker-end]").length === 3 && diagram.querySelectorAll("[data-help-diagram-node]").length === 4) })()'), 'Workflow diagram shows connected branches and arrowheads')
  verify(!workflowText.includes('↓'), 'Workflow diagram has no floating arrow text')
  const workflowSteps = await evaluate('[...document.querySelectorAll("#app-help-section [data-help-workflow-step]")].map(step => ({ number: step.getAttribute("data-help-workflow-step"), text: step.innerText.trim(), hasIcon: Boolean(step.querySelector("svg")) }))')
  verify(JSON.stringify(workflowSteps.map(step => step.number)) === JSON.stringify(['1', '2', '3', '4', '5', '6']), 'Workflow has six ordered steps')
  verify(workflowSteps.every(step => step.hasIcon) && ['Prepare datasets', 'Check with Prepare Dataset', 'Compare in Cost Breakdown', 'Test supported changes', 'Send to matching Master Data', 'Export dataset'].every(label => workflowSteps.some(step => step.text.includes(label))), 'Workflow steps use the required short actions and real icons')
  verify(!workflowText.includes('Reference → Current') && !workflowText.includes('Current → Custom') && !workflowText.includes('Import original XLSX into Reference'), 'Workflow does not require a fixed dataset-role sequence')

  await clickButton('Master Data', 'nav[aria-label="Help sections"]')
  const masterDataText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(masterDataText.includes('Reference') && masterDataText.includes('Baseline') && masterDataText.includes('Current') && masterDataText.includes('Latest') && masterDataText.includes('Custom') && masterDataText.includes('Alternative'), 'Master Data names the three independent dataset roles')
  verify(masterDataText.includes('Roles are independent, not stages.') && masterDataText.includes('can apply to any role.') && masterDataText.includes('Clone between roles:'), 'Master Data explains independent roles and cloning')
  verify(await evaluate('(() => { const roles = document.querySelector("[data-help-master-roles]"); return Boolean(roles && !roles.classList.contains("border") && roles.querySelectorAll(":scope > div > div").length === 3) })()'), 'Master Data role cards are flat and equal')
  verify(await evaluate('["Saved and Draft", "Working and Last Saved", "Warning and Blocker"].every(label => [...document.querySelectorAll("#app-help-section [role=group]")].some(group => group.getAttribute("aria-label") === label))'), 'Master Data pairs values and statuses by meaning')
  verify(await evaluate('["Saved", "Draft", "Working", "Last Saved", "Warning", "Blocker"].every(title => [...document.querySelectorAll("#app-help-section [role=group]")].some(group => group.innerText.includes(title)) && [...document.querySelectorAll("#app-help-section [role=group]")].filter(group => ["Saved and Draft", "Working and Last Saved", "Warning and Blocker"].includes(group.getAttribute("aria-label"))).every(group => group.querySelectorAll(":scope > svg").length === 1))'), 'Master Data pairs show all states with subtle connectors')
  verify(await evaluate('(() => { const tools = document.querySelector("[aria-label=\\\"Master Data tools\\\"]"); return Boolean(tools && ["Edit", "Import", "Clone", "Sizing", "Prepare Dataset", "Save", "Reset", "Clear", "Export"].every(label => [...tools.children].some(item => item.innerText.includes(label) && item.querySelector("svg")))) })()'), 'Master Data keeps all nine real tool icons and explanations')

  await clickButton('Cost Breakdown', 'nav[aria-label="Help sections"]')
  const costContent = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(costContent.includes('After − Before') && costContent.includes('Standard Cost Gap'), 'Cost Breakdown shows the gap formula')
  verify(costContent.includes('CHANGED') && costContent.includes('ADDED') && costContent.includes('REMOVED'), 'Cost Breakdown explains row statuses')
  verify(costContent.includes('Full Gap') && costContent.includes('Selected rows only.'), 'Cost Breakdown separates full Gap from selected contribution')
  verify(costContent.includes('Uses Master Data Working, including unsaved edits.'), 'Cost Breakdown explains which Master Data values it reads')
  verify(await evaluate('(() => { const row = document.querySelector("[data-help-cost-group=row-status]"); const gap = document.querySelector("[data-help-cost-group=gap]"); return Boolean(row && gap && !row.contains(gap) && row.compareDocumentPosition(gap) & Node.DOCUMENT_POSITION_FOLLOWING && row.getBoundingClientRect().bottom < gap.getBoundingClientRect().top && !row.classList.contains("border") && !gap.classList.contains("border")) })()'), 'Cost Breakdown keeps flat Row status above a separate Gap section')

  await clickButton('Simulation', 'nav[aria-label="Help sections"]')
  const simulationContent = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(await evaluate('JSON.stringify([...document.querySelectorAll("#app-help-section [data-help-simulation-block]")].map(block => block.getAttribute("data-help-simulation-block"))) === JSON.stringify(["edit-scenario", "result-comparison", "actions"])'), 'Simulation has only Edit scenario, Result comparison, and Actions')
  verify(simulationContent.includes('Active Dataset') && simulationContent.includes('Result Before → Result After') && simulationContent.includes('≠') && simulationContent.includes('Changing comparison does not change Active Dataset or Send target.'), 'Simulation separates the active edit target from comparison')
  verify(simulationContent.includes('Price') && simulationContent.includes('Usage') && simulationContent.includes('Loss') && simulationContent.includes('Manning') && simulationContent.includes('Capacity') && simulationContent.includes('Yield'), 'Simulation lists supported BOM and Routing changes')
  verify(simulationContent.includes('Selling Price') && simulationContent.includes('SG&A') && simulationContent.includes('Action Cost') && simulationContent.includes('Batch Size'), 'Simulation lists its economic inputs')
  verify(simulationContent.includes('Simulation edits existing rows. Add/remove rows in Master Data.'), 'Simulation explains where to add or remove rows')
  verify((simulationContent.match(/matching Master Data Working/g) ?? []).length === 1 && simulationContent.includes('BOM / Routing only · Economics stay in Simulation.'), 'Simulation gives one clear Send destination and scope')
  verify(simulationContent.includes("Reload this role's Master Data Working.") && simulationContent.includes('Clear Action Cost and Batch Size.'), 'Simulation Reset matches its current behavior')

  await clickButton('Quick Reference', 'nav[aria-label="Help sections"]')
  const quickText = await evaluate('document.querySelector("#app-help-section")?.innerText ?? ""')
  verify(['Save ≠ Export', 'Working ≠ Last Saved', 'Warning ≠ Blocker', 'Active Dataset ≠ Result Before / After'].every(pair => quickText.includes(pair)), 'Quick Reference includes the four useful distinctions')
  verify(quickText.includes('Export — XLSX saved where you choose.'), 'Export copy matches the choose-location flow')
  verify(quickText.includes('Closing the browser ends the session. Export to keep data.') && quickText.includes('A Master Data source change can rebuild its Simulation scenario.'), 'Quick Reference covers session and scenario rebuilds')
  const headerToolLabels = await evaluate('[...document.querySelectorAll("#app-help-section [data-help-header-tool]")].map(node => node.getAttribute("data-help-header-tool"))')
  verify(JSON.stringify(headerToolLabels) === JSON.stringify(['Undo', 'Redo', 'Help', 'Prepare Dataset']), 'Quick Reference follows the actual header tool order')
  verify(!quickText.includes('? · Help') && !quickText.includes('i · Prepare Dataset'), 'Quick Reference does not repeat header symbols in text')
  verify(await evaluate('(() => { const tools = document.querySelector("[aria-label=\\\"Quick reference tools\\\"]"); return Boolean(tools && tools.children.length === 8 && [...tools.children].every(item => item.querySelector("svg"))) })()'), 'Quick Reference uses real icons for its eight tools')

  await clickButton('Master Data', 'nav[aria-label="Help sections"]')
  const costSectionButton = await buttonRect('Cost Breakdown', 'nav[aria-label="Help sections"]')
  assert.ok(costSectionButton, 'Expected Cost Breakdown Help navigation item')
  await moveTo(costSectionButton)
  const sectionBeforeDelay = await evaluate('new Promise(resolve => setTimeout(() => resolve(document.querySelector("#app-help-section-title")?.textContent.trim()), 210))')
  verify(sectionBeforeDelay === 'Master Data', 'Section preview waits beyond the old 180 ms delay')
  const sectionTitleRect = await elementRect('#app-help-section-title')
  assert.ok(sectionTitleRect, 'Expected visible Help section title')
  await moveTo(sectionTitleRect)
  await delay(350)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Master Data"'), 'Leaving a section trigger early cancels its preview')

  await moveTo(costSectionButton)
  await delay(300)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Cost Breakdown"'), 'Section preview opens after about 275 ms')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [aria-current="page"]\')?.textContent.trim() === "Master Data"'), 'Section preview does not change the selected section')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [data-previewing="true"]\')?.textContent.trim() === "Cost Breakdown"'), 'Previewed section is marked in the navigation')
  await moveTo(await elementRect('#app-help-section-title'))
  await delay(450)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Cost Breakdown"'), 'Preview remains while the pointer reads the section content')

  const navBlankPoint = await helpNavBlankPoint()
  assert.ok(navBlankPoint, 'Expected blank space below the Help navigation items')
  await moveTo(navBlankPoint)
  await delay(280)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Cost Breakdown"'), 'Blank navigation space starts a delayed preview exit')
  await delay(180)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Master Data"'), 'Preview returns to the selected section after about 400 ms in blank space')

  await moveTo(costSectionButton)
  await delay(300)
  await moveTo(navBlankPoint)
  await delay(180)
  const simulationSectionButton = await buttonRect('Simulation', 'nav[aria-label="Help sections"]')
  await moveTo(simulationSectionButton)
  await delay(300)
  verify(await evaluate('document.querySelector("#app-help-section-title")?.textContent.trim() === "Simulation"'), 'Moving to another nav item cancels the blank-space exit timer')
  await clickButton('Simulation', 'nav[aria-label="Help sections"]')
  verify(await evaluate('document.querySelector(\'nav[aria-label="Help sections"] [aria-current="page"]\')?.textContent.trim() === "Simulation"'), 'Clicking a section commits it')
  await command('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false })
  for (const section of helpSectionLabels) {
    await clickButton(section, 'nav[aria-label="Help sections"]')
    await delay(80)
    const laptopGeometry = await evaluate(`(() => {
      const dialog = document.querySelector('#app-help-dialog')
      const content = document.querySelector('#app-help-scroll')
      if (!dialog || !content) return null
      const box = dialog.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, contentWidth: content.clientWidth, contentScrollWidth: content.scrollWidth }
    })()`)
    verify(Boolean(laptopGeometry && laptopGeometry.left >= 0 && laptopGeometry.right <= laptopGeometry.viewportWidth && laptopGeometry.top >= 0 && laptopGeometry.bottom <= laptopGeometry.viewportHeight && laptopGeometry.contentScrollWidth <= laptopGeometry.contentWidth), section + ' fits a smaller laptop viewport without horizontal overflow', laptopGeometry)
    await captureScreenshot('help-' + section.toLowerCase().replaceAll(' ', '-') + '-laptop.png')
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 420, deviceScaleFactor: 1, mobile: true })
  await evaluate('(() => { const button = [...document.querySelectorAll("nav[aria-label=\\\"Help sections\\\"] button")].find(item => item.textContent.trim() === "Simulation"); button?.scrollIntoView({ block: "nearest", inline: "center" }); button?.click() })()')
  await delay(80)
  const compactGeometry = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="app-help-title"]')
    const content = document.querySelector('#app-help-scroll')
    if (!dialog || !content) return null
    const box = dialog.getBoundingClientRect()
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, contentScrollHeight: content.scrollHeight, contentClientHeight: content.clientHeight, contentScrollWidth: content.scrollWidth, contentClientWidth: content.clientWidth }
  })()`)
  verify(Boolean(compactGeometry && compactGeometry.left >= 0 && compactGeometry.right <= compactGeometry.viewportWidth && compactGeometry.top >= 0 && compactGeometry.bottom <= compactGeometry.viewportHeight), 'Help stays within a compact screen viewport', compactGeometry)
  verify(Boolean(compactGeometry && compactGeometry.contentScrollHeight > compactGeometry.contentClientHeight), 'Help details scroll inside the panel on a compact screen', compactGeometry)
  verify(Boolean(compactGeometry && compactGeometry.contentScrollWidth <= compactGeometry.contentClientWidth), 'Help content has no horizontal overflow on a compact screen', compactGeometry)
  await captureScreenshot('help-simulation-mobile.png')
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
