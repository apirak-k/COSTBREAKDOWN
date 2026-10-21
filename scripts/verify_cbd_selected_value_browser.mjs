import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-cbd-selected-value-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-cbd-selected-evidence-'))
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
const chromeOutput = []
chrome.stderr.on('data', chunk => chromeOutput.push(String(chunk)))
let client
const browserErrors = []
const checks = []

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
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}\nChrome output:\n${chromeOutput.join('').slice(-3000)}`)
}

function verify(condition, message, detail) {
  checks.push({ passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) })
  process.stdout.write(`${condition ? 'PASS' : 'FAIL'} ${message}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}\n`)
  if (!condition) throw new Error(`Browser acceptance failed: ${message}`)
}

try {
  const baseUrl = configuredBaseUrl ?? `http://127.0.0.1:${vitePort}/`
  await waitFor(async () => { try { return (await fetch(baseUrl)).ok } catch { return false } }, 'Vite')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => { try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false } }, 'Chrome DevTools')
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
    const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`Chrome DevTools command timed out: ${method}`)) }, 30000)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) rejectCommand(new Error(message.error.message))
      else resolveCommand(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    try {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
      return response.result.result.value
    } catch (error) {
      if (!String(error.message).includes('Chrome DevTools command timed out: Runtime.evaluate')) throw error
      const probeId = ++commandId
      const probe = await Promise.race([
        new Promise(resolveProbe => {
          pending.set(probeId, message => resolveProbe(message.error ? { error: message.error.message } : { value: message.result?.result?.value }))
          client.send(JSON.stringify({ id: probeId, method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } }))
        }),
        delay(2500).then(() => ({ timedOut: true }))
      ])
      pending.delete(probeId)
      throw new Error(`${error.message}; expression=${expression.replace(/\s+/g, ' ').slice(0, 600)}; trivialEval=${JSON.stringify(probe)}; websocketState=${client.readyState}`)
    }
  }
  const visibleExpression = selector => `(()=>[...document.querySelectorAll(${JSON.stringify(selector)})].find(element => {
    const rect=element.getBoundingClientRect(); return element.getClientRects().length>0&&rect.width>0&&rect.height>0
  }))()`
  const existsVisible = selector => evaluate(`Boolean(${visibleExpression(selector)})`)
  const center = async selector => evaluate(`(()=>{const e=${visibleExpression(selector)};if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()`)
  const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mousePressed' || type === 'mouseReleased' ? 1 : undefined })
  const dragMouse = async (type, x, y, buttons = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons })
  const click = async selector => {
    const point = await center(selector)
    if (!point) throw new Error(`Visible browser target not found: ${selector}`)
    await mouse('mouseMoved', point.x, point.y)
    await mouse('mousePressed', point.x, point.y)
    await mouse('mouseReleased', point.x, point.y)
    await delay(160)
  }
  const hover = async (selector, dwell = 0) => {
    const point = await center(selector)
    if (!point) throw new Error(`Visible browser target not found: ${selector}`)
    await mouse('mouseMoved', point.x, point.y)
    if (dwell) await delay(dwell)
    return point
  }
  const moveAway = async () => {
    await mouse('mouseMoved', 1, 1)
    await delay(100)
  }
  const clickButtonText = async label => {
    const selector = `button`
    const point = await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(button=>button.getClientRects().length&&button.innerText.trim()===${JSON.stringify(label)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!point) throw new Error(`Visible button not found by exact text: ${label}`)
    await mouse('mouseMoved', point.x, point.y); await mouse('mousePressed', point.x, point.y); await mouse('mouseReleased', point.x, point.y)
    await delay(180)
  }
  const clickButtonContains = async (selector, fragment) => {
    const point = await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(button=>button.getClientRects().length&&button.innerText.trim().toLowerCase().includes(${JSON.stringify(fragment.toLowerCase())}));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!point) throw new Error(`Visible button containing "${fragment}" not found in ${selector}`)
    await mouse('mouseMoved', point.x, point.y); await mouse('mousePressed', point.x, point.y); await mouse('mouseReleased', point.x, point.y)
    await delay(200)
  }
  const pressKey = async (key, modifiers = 0) => {
    const code = key === 'Enter' ? 'Enter' : key === 'Tab' ? 'Tab' : key === 'a' ? 'KeyA' : key
    const vk = key === 'Enter' ? 13 : key === 'Tab' ? 9 : key === 'a' ? 65 : undefined
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: key === 'Enter' ? '\r' : undefined })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await delay(180)
  }
  const replaceInput = async (selector, value) => {
    await click(selector)
    await pressKey('a', 4)
    await send('Input.insertText', { text: value })
    await delay(150)
    return evaluate(`(${visibleExpression(selector)})?.value??null`)
  }
  const text = selector => evaluate(`(${visibleExpression(selector)})?.textContent?.trim()??null`)
  const rawNumericValue = selector => evaluate(`(()=>{const b=${visibleExpression(selector)};if(!b)return null;const k=Object.keys(b).find(key=>key.startsWith('__reactFiber$'));let fiber=k?b[k]:null;while(fiber){if(fiber.memoizedProps&&Object.prototype.hasOwnProperty.call(fiber.memoizedProps,'value'))return fiber.memoizedProps.value;fiber=fiber.return}return null})()`)
  const measureRect = selector => evaluate(`(()=>{const e=${visibleExpression(selector)};if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`)
  const parseHeaderNumeric = value => Number(String(value).replaceAll(',', '').replaceAll('−', '-').replace(/[^0-9.+-]/g, ''))
  const setViewport = async (width, height = 1800) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await delay(350)
  }
  const wheel = async (x, y, deltaX = 0, deltaY = 0) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY })
    await delay(160)
  }
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(evidenceDir, `${name}.png`), Buffer.from(shot.result.data, 'base64'))
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Accessibility.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(async () => (await evaluate('document.title')).toUpperCase().includes('COSTBREAKDOWN'), 'application page')
  await waitFor(() => existsVisible('button') && evaluate(`[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.innerText.trim()==='Master Data')`), 'Master Data navigation')

  // Seed the real development fixture, then copy Current into Custom so all three
  // comparison directions contain meaningful changed, added, and removed records.
  await clickButtonText('Master Data')
  await waitFor(() => existsVisible('section[aria-label="Working dataset controls"]'), 'Master Data workspace')
  await click('header button[aria-label="Prepare Dataset"]')
  await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.innerText.trim()==='Complete Mock')`), 'Complete Mock fixture action')
  await clickButtonText('Complete Mock')
  await delay(700)
  const roleButton = role => `section[aria-label="Working dataset controls"] [role="group"][aria-label="Master Data workspace"] button[aria-label^=${JSON.stringify(`${role} —`)}]`
  await click(roleButton('Custom'))
  await click('section[aria-label="Working dataset controls"] button[aria-label="Clone from"]')
  await waitFor(() => existsVisible('[role="menu"][aria-label="Clone source"]'), 'Clone source menu')
  const currentMenuItem = await evaluate(`(()=>{const e=[...document.querySelectorAll('[role="menu"][aria-label="Clone source"] [role="menuitem"]')].find(item=>item.innerText.trim()==='Current');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  if (!currentMenuItem) throw new Error('Clone source menu does not offer Current')
  await mouse('mouseMoved', currentMenuItem.x, currentMenuItem.y); await mouse('mousePressed', currentMenuItem.x, currentMenuItem.y); await mouse('mouseReleased', currentMenuItem.x, currentMenuItem.y); await delay(500)
  // Ensure Custom has a meaningful parameter difference from Current using an actual input.
  const customMode = await evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked")')
  if (customMode === 'false') await click('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "true"'), 'Custom Edit mode')
  const customPriceSelector = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]'
  if (!(await existsVisible(customPriceSelector))) throw new Error('Custom clone did not expose a first BOM price editor')
  const customPriceBefore = await replaceInput(customPriceSelector, '12.3456789')
  if (customPriceBefore !== '12.3456789') throw new Error(`Custom BOM price edit did not retain the fixture value: ${customPriceBefore}`)
  await pressKey('Tab')
  await click('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "false"'), 'Custom View mode')
  verify(true, 'real Master Data UI seeded Reference and Current, cloned Current into Custom, and edited a valid Custom BOM price', { customPrice: customPriceBefore })

  await clickButtonText('Cost Breakdown')
  await waitFor(() => existsVisible('header[aria-label="Cost Breakdown subheader"]'), 'Cost Breakdown comparison UI')
  await waitFor(() => existsVisible('section[aria-label="Cost Element"]') && existsVisible('section[aria-label="Work Center"]'), 'Cost Element and Work Center panels')
  const headerValue = () => evaluate('document.querySelector("header [data-header-value] [data-selected-value-output]")?.textContent.trim()??null')
  const headerOutput = 'header [data-header-value] [data-selected-value-output]'
  const chartSnapshot = () => evaluate(`(()=>{const chart=document.querySelector('[data-gap-chart-wrapper]');const svg=chart?.querySelector('svg');return chart?{text:chart.innerText.trim(),svg:svg?.outerHTML??null,paths:chart.querySelectorAll('svg path').length,shapes:chart.querySelectorAll('svg path,svg rect,svg circle,svg line,svg polyline,svg polygon').length}:null})()`)
  await waitFor(() => text(headerOutput).then(value => value === '—'), 'idle Selected Value Header')
  const chartAtRest = await chartSnapshot()
  async function exerciseDetailSource(tableType, candidateId, roleLabel) {
    const source = await evaluate(`(()=>{
      const main=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(candidateId)});
      let detail=main?.nextElementSibling;while(detail&&!detail.hasAttribute('data-candidate-reorder-row')&&detail.querySelector('th[scope="row"]')?.innerText.trim()!==${JSON.stringify(roleLabel)})detail=detail.nextElementSibling;
      const buttons=[...(detail?.querySelectorAll('button[data-selected-number="true"]')??[])];const button=${JSON.stringify(roleLabel)}==='Parameter Cost Effect'?buttons.find(element=>/ gap /i.test(element.getAttribute('aria-label')??'')):buttons[0];if(!button)return null;
      const rect=button.getBoundingClientRect();const key=Object.keys(button).find(name=>name.startsWith('__reactFiber$'));let fiber=key?button[key]:null;let raw=null;while(fiber){if(fiber.memoizedProps&&Object.prototype.hasOwnProperty.call(fiber.memoizedProps,'value')){raw=fiber.memoizedProps.value;break}fiber=fiber.return}
      return {label:button.getAttribute('aria-label'),display:button.innerText.trim(),raw,x:rect.left+rect.width/2,y:rect.top+rect.height/2,role:detail.querySelector('th[scope="row"]')?.innerText.trim()??null}
    })()`)
    if (!source || !Number.isFinite(source.raw)) throw new Error(`${tableType} ${roleLabel} detail row has no finite SelectedNumber source for the fixture`)
    const previousPin = await headerValue()
    await mouse('mouseMoved', source.x, source.y); await delay(430)
    const preview = await headerValue()
    verify(Math.abs(parseHeaderNumeric(preview) - source.raw) < 1e-7,
      `${tableType} ${roleLabel} detail source previews its raw value in Header`, { source, preview })
    await moveAway()
    verify(await headerValue() === previousPin, `${tableType} ${roleLabel} detail preview restores its earlier pin`, { previousPin, restored: await headerValue() })
    await mouse('mouseMoved', source.x, source.y); await mouse('mousePressed', source.x, source.y); await mouse('mouseReleased', source.x, source.y); await delay(160)
    const pinned = await headerValue()
    verify(Math.abs(parseHeaderNumeric(pinned) - source.raw) < 1e-7,
      `${tableType} ${roleLabel} detail source can be pinned through actual pointer input`, { source, pinned })
  }

  async function setComparisonRole(side, targetRole) {
    const trigger = `button[aria-label^=${JSON.stringify(`${side} dataset, `)}]`
    const currentName = await evaluate(`(${visibleExpression(trigger)})?.getAttribute('aria-label')??null`)
    if (!currentName) throw new Error(`${side} dataset selector is missing`)
    const currentRole = currentName.split(', ').at(-1)
    if (currentRole === targetRole) return
    await click(trigger)
    const menu = `[role="menu"][aria-label=${JSON.stringify(`${side} dataset choices`)}]`
    await waitFor(() => existsVisible(menu), `${side} dataset choices menu`)
    const option = await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(`${menu} [role="menuitem"]`)})].find(item=>item.innerText.trim()===${JSON.stringify(targetRole)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!option) throw new Error(`${side} selector cannot choose ${targetRole}`)
    await mouse('mouseMoved', option.x, option.y); await mouse('mousePressed', option.x, option.y); await mouse('mouseReleased', option.x, option.y)
    await waitFor(() => evaluate(`(${visibleExpression(trigger)})?.getAttribute('aria-label')===${JSON.stringify(`${side} dataset, ${targetRole}`)}`), `${side} role ${targetRole}`)
    await delay(250)
  }
  async function setPair(before, after) {
    await setComparisonRole('Before', before)
    await setComparisonRole('After', after)
    await waitFor(() => evaluate(`document.querySelector('[aria-label^="Comparison datasets, Before ${before}, After ${after}"]')!==null`), `comparison pair ${before} to ${after}`)
  }
  const findCandidateRows = () => evaluate(`(()=>[...document.querySelectorAll('tr[data-candidate-reorder-row]')].map(row=>({
    id:row.getAttribute('data-candidate-reorder-row'), name:row.querySelector('th[scope="row"]')?.innerText.trim()??'', status:row.querySelector('td:nth-child(3)')?.innerText.trim()??'',
    expanded:row.getAttribute('aria-expanded'), selected:row.getAttribute('aria-selected'), label:row.getAttribute('aria-label'),
    text:[...row.querySelectorAll('td,th')].map(cell=>cell.innerText.trim())
  })))()`)
  const changedRowSelector = 'tr[data-candidate-reorder-row][aria-expanded="false"]'
  const accessibilityTree = async () => {
    const result = await send('Accessibility.getFullAXTree')
    return result.result.nodes
  }
  const axNodeForLabel = async label => {
    const nodes = await accessibilityTree()
    return nodes.find(node => node.role?.value === 'button' && node.name?.value === label)
      ?? nodes.find(node => node.name?.value === label)
  }

  // Reference -> Current: exercise hover preview, pinning, independent candidate
  // number click / row selection / detail expansion, role detail order, and summaries.
  await setPair('Reference', 'Current')
  const initialHeader = await headerValue()
  verify(initialHeader === '—', 'Selected Value Header starts empty on Cost Breakdown', { value: initialHeader })
  const subheaderNumber = 'header[aria-label="Cost Breakdown subheader"] [data-selected-number="true"]'
  if (!(await existsVisible(subheaderNumber))) throw new Error('Cost Breakdown Standard Cost Gap is not a selectable numeric value for this fixture')
  const subheaderBefore = await headerValue()
  const subheaderRectIdle = await measureRect(subheaderNumber)
  await hover(subheaderNumber, 180)
  const fastHeader = await headerValue()
  const subheaderRectFast = await measureRect(subheaderNumber)
  verify(fastHeader === subheaderBefore, 'subheader hover under 350 ms does not preview a value', { before: subheaderBefore, after: fastHeader })
  await moveAway()
  await hover(subheaderNumber, 430)
  const subheaderPreview = await headerValue()
  const subheaderRectPreview = await measureRect(subheaderNumber)
  const chartAfterSubheaderPreview = await chartSnapshot()
  verify(subheaderPreview !== '—' && subheaderPreview !== subheaderBefore, 'subheader dwell over 350 ms previews the raw Standard Cost Gap', { value: subheaderPreview })
  const rawSubheader = await rawNumericValue(subheaderNumber)
  const subheaderSourceEvidence = await evaluate(`(()=>{const b=${visibleExpression(subheaderNumber)};return b?{display:b.innerText.trim(),aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed')}:null})()`)
  verify(Number.isFinite(rawSubheader) && Math.abs(rawSubheader - Number(subheaderPreview.replaceAll(',', ''))) < 1e-7,
    'Header preview represents the raw React value from the subheader SelectedNumber source', { raw: rawSubheader, preview: subheaderPreview, source: subheaderSourceEvidence })
  await moveAway()
  verify(await headerValue() === '—', 'leaving an unpinned subheader preview restores the empty Header state', { value: await headerValue() })
  await click(subheaderNumber)
  const pinnedSubheader = await headerValue()
  const subheaderRectPinned = await measureRect(subheaderNumber)
  const chartAfterSubheaderPin = await chartSnapshot()
  verify(pinnedSubheader !== '—' && await evaluate(`(${visibleExpression(subheaderNumber)})?.getAttribute('aria-pressed')==='true'`),
    'click pins the subheader SelectedNumber value', { value: pinnedSubheader })
  verify([subheaderRectFast, subheaderRectPreview, subheaderRectPinned].every(rect => rect && rect.width === subheaderRectIdle?.width && rect.height === subheaderRectIdle?.height),
    'subheader hover and pin ring do not change source layout height or width', { idle: subheaderRectIdle, fast: subheaderRectFast, preview: subheaderRectPreview, pinned: subheaderRectPinned })
  verify(JSON.stringify(chartAfterSubheaderPreview)===JSON.stringify(chartAtRest)&&JSON.stringify(chartAfterSubheaderPin)===JSON.stringify(chartAtRest),
    'subheader hover preview and pin leave Gap chart paths and visible content unchanged', { atRest:{paths:chartAtRest?.paths,shapes:chartAtRest?.shapes,text:chartAtRest?.text},preview:{paths:chartAfterSubheaderPreview?.paths,shapes:chartAfterSubheaderPreview?.shapes,text:chartAfterSubheaderPreview?.text},pinned:{paths:chartAfterSubheaderPin?.paths,shapes:chartAfterSubheaderPin?.shapes,text:chartAfterSubheaderPin?.text} })

  const fullGap = 'section[aria-label="Cost Element"] [data-gap-slot="full"][data-selected-number="true"]'
  const selectedGap = 'section[aria-label="Cost Element"] [data-gap-slot="selected"][data-selected-number="true"]'
  const wcGap = 'section[aria-label="Work Center"] [data-selected-number="true"][aria-label*="Gap"]'
  const secondSource = await evaluate(`Boolean(${visibleExpression(fullGap)})`)
    ? fullGap : await evaluate(`Boolean(${visibleExpression(selectedGap)})`) ? selectedGap : wcGap
  if (await existsVisible(secondSource)) {
    await hover(secondSource, 650)
    const secondPreview = await headerValue()
    verify(secondPreview !== pinnedSubheader, 'hovering a second summary value temporarily previews it over a pinned value', { pinned: pinnedSubheader, preview: secondPreview })
    await moveAway()
    verify(await headerValue() === pinnedSubheader, 'leaving the second summary source restores the earlier pinned value', { restored: await headerValue(), pinned: pinnedSubheader })
    const gapAccessibility = await evaluate(`(()=>{const e=${visibleExpression(secondSource)};return e?{label:e.getAttribute('aria-label'),description:e.getAttribute('aria-description'),tooltip:e.closest('[role="tooltip"]')?.textContent??null,ownTitle:e.getAttribute('title')}:null})()`)
    const axNode = await axNodeForLabel(gapAccessibility?.label)
    const axNameAndDescription = `${axNode?.name?.value ?? ''} ${axNode?.description?.value ?? ''}`.trim()
    const expectedDirection = gapAccessibility?.label?.match(/Gap = ([^;]+)/)?.[1]
    verify(Boolean(gapAccessibility?.label) && axNode?.name?.value === gapAccessibility.label && Boolean(expectedDirection)
      && axNameAndDescription.includes(`Gap = ${expectedDirection}`),
      'Cost Element / Work Center Gap direction is present in its computed Chrome AX name/description', { evidence: gapAccessibility, ax: { role: axNode?.role?.value, name: axNode?.name?.value, description: axNode?.description?.value } })
    const visibleTooltipTexts = await evaluate(`[...document.querySelectorAll('[role="tooltip"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim())`)
    const relatedTooltip = visibleTooltipTexts.filter(value => gapAccessibility?.label?.split(' ')[0] && value.includes(gapAccessibility.label.split(' ')[0]))
    verify(!gapAccessibility?.tooltip && relatedTooltip.length === 0,
      'summary numeric values do not create a source-related hover tooltip', { ...gapAccessibility, visibleTooltipTexts })
  } else {
    verify(false, 'Cost Element or Work Center provides a selectable summary Gap source')
  }

  async function exerciseSummarySource(panel, category, selector) {
    if (!(await existsVisible(selector))) throw new Error(`${panel} has no visible SelectedNumber source for ${category}`)
    const rectIdle = await measureRect(selector)
    const source = await evaluate(`(()=>{const e=${visibleExpression(selector)};return e?{label:e.getAttribute('aria-label'),text:e.innerText.trim(),title:e.getAttribute('title')}:null})()`)
    const previousPin = await headerValue()
    await hover(selector, 430)
    const preview = await headerValue()
    const rectPreview = await measureRect(selector)
    const raw = await rawNumericValue(selector)
    verify(Number.isFinite(raw) && Math.abs(parseHeaderNumeric(preview) - raw) < 1e-7,
      `${panel} ${category} source previews its raw numeric value in Header`, { source, raw, preview })
    await moveAway()
    verify(await headerValue() === previousPin, `${panel} ${category} hover leaves the prior pin intact`, { previousPin, restored: await headerValue() })
    await click(selector)
    const pinned = await headerValue()
    const rectPinned = await measureRect(selector)
    const pressed = await evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-pressed')==='true'`)
    verify(pressed && Number.isFinite(raw) && Math.abs(parseHeaderNumeric(pinned) - raw) < 1e-7,
      `${panel} ${category} source can be pinned from the real UI`, { source, raw, pinned, pressed })
    verify([rectPreview, rectPinned].every(rect=>rect&&rect.width===rectIdle?.width&&rect.height===rectIdle?.height),
      `${panel} ${category} hover and pin rings do not change source dimensions`, { idle: rectIdle, preview: rectPreview, pinned: rectPinned })
  }
  const costPanel = 'section[aria-label="Cost Element"]'
  const wcPanel = 'section[aria-label="Work Center"]'
  for (const [panel, category, selector] of [
    [costPanel, 'Before', `${costPanel} button[data-selected-number="true"][aria-label*=" Before "]`],
    [costPanel, 'After', `${costPanel} button[data-selected-number="true"][aria-label*=" After "]`],
    [costPanel, 'Full Gap', `${costPanel} button[data-gap-slot="full"][data-selected-number="true"]`],
    [costPanel, 'percent Gap', `${costPanel} button[data-selected-number="true"][aria-label*="percent Gap"]`],
    [wcPanel, 'Before', `${wcPanel} button[data-selected-number="true"][aria-label*=" Before "]`],
    [wcPanel, 'After', `${wcPanel} button[data-selected-number="true"][aria-label*=" After "]`],
    [wcPanel, 'Gap', `${wcPanel} button[data-selected-number="true"][aria-label*=" Gap "]:not([aria-label*="percent Gap"])`],
    [wcPanel, 'percent Gap', `${wcPanel} button[data-selected-number="true"][aria-label*="percent Gap"]`]
  ]) await exerciseSummarySource(panel === costPanel ? 'Cost Element' : 'Work Center', category, selector)

  for (const [panel, selector] of [
    ['Cost Element', `${costPanel} button[data-gap-slot="full"][data-selected-number="true"]`],
    ['Work Center', `${wcPanel} button[data-selected-number="true"][aria-label*=" Gap "]:not([aria-label*="percent Gap"])`]
  ]) {
    const label = await evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-label')??null`)
    await hover(selector, 650)
    const related = await evaluate(`[...document.querySelectorAll('[role="tooltip"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim()).filter(value=>value.includes(${JSON.stringify(label?.split(' ')[0] ?? '')}))`)
    verify(related.length === 0, `${panel} Gap hover has no related tooltip at the preview dwell`, { label, related })
    await moveAway()
  }

  // Change pair and return through the public selectors to clear all previous pins.
  await setPair('Current', 'Custom')
  await setPair('Reference', 'Current')
  verify(await headerValue() === '—', 'pair changes clear stale summary pins before control-exclusion checks', { value: await headerValue() })
  await clickButtonContains('div[aria-label="Finding type filter"] button', 'All')
  verify(await headerValue() === '—', 'filter/count control does not create a Selected Value', { value: await headerValue() })

  const firstChanged = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(changedRowSelector)});if(!row)return null;return {name:row.querySelector('th[scope="row"]')?.innerText.trim(),rowId:row.getAttribute('data-candidate-reorder-row')}})()`)
  if (!firstChanged) throw new Error('Reference → Current has no collapsed CHANGED Candidate row')
  const firstRow = `tr[data-candidate-reorder-row=${JSON.stringify(firstChanged.rowId)}]`
  const candidateNumber = `${firstRow} button[data-selected-number="true"]`
  const candidateSelectorButton = `${firstRow} td:first-child button[aria-pressed]`
  const chevron = `${firstRow} td:last-child button[aria-label^="Expand"]`
  const candidateInitial = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded'),number:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-label')??null}:null})()`)
  await click(candidateSelectorButton)
  const hashOnly = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded')}:null})()`)
  verify(hashOnly?.selected === 'true' && hashOnly.expanded === 'false' && await headerValue() === '—',
    '# row selector selects independently and does not publish a numeric Header value', { row: hashOnly, header: await headerValue() })
  await click(candidateSelectorButton)
  verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-selected')==='false'`), '# row selector can clear its own selection without activating a Header value')
  const nonChanged = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(e=>['ADDED','REMOVED','UNCHANGED'].includes(e.querySelector('td:nth-child(3)')?.innerText.trim()));return row?{id:row.getAttribute('data-candidate-reorder-row'),status:row.querySelector('td:nth-child(3)')?.innerText.trim()}:null})()`)
  if (nonChanged) {
    const statusSelector = `tr[data-candidate-reorder-row=${JSON.stringify(nonChanged.id)}] td:nth-child(3)`
    await click(statusSelector)
    const statusAfter = await evaluate(`(()=>{const r=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(nonChanged.id)});return r?{status:r.querySelector('td:nth-child(3)')?.innerText.trim(),expanded:r.getAttribute('aria-expanded')}:null})()`)
    verify(statusAfter?.status === nonChanged.status && statusAfter.expanded === null && await headerValue() === '—',
      'clicking an ordinary Candidate status label neither expands it nor changes Header', { before: nonChanged, after: statusAfter, header: await headerValue() })
    const candidateLabelSelector = `tr[data-candidate-reorder-row=${JSON.stringify(nonChanged.id)}] th[scope="row"]`
    await click(candidateLabelSelector)
    verify(await headerValue() === '—', 'clicking a Candidate text label does not create a Selected Value source', { status: nonChanged.status, header: await headerValue() })
  } else {
    verify(false, 'fixture has an ordinary non-CHANGED Candidate row for safe-click verification')
  }
  const controlExclusions = await evaluate(`(()=>({hashHasSelectedNumber:!!document.querySelector('tr[data-candidate-reorder-row] td:first-child button[data-selected-number]'),filterHasSelectedNumber:!!document.querySelector('[aria-label="Finding type filter"] [data-selected-number]'),dashButtons:[...document.querySelectorAll('button[data-selected-number="true"]')].filter(e=>e.innerText.trim()==='—').length,dashSpans:[...document.querySelectorAll('span')].filter(e=>e.innerText.trim()==='—'&&e.closest('[data-selected-number="true"]')).length,filterCount:[...document.querySelectorAll('[aria-label="Finding type filter"] button')].map(e=>e.innerText.trim())}))()`)
  verify(!controlExclusions.hashHasSelectedNumber && !controlExclusions.filterHasSelectedNumber && controlExclusions.dashButtons === 0 && controlExclusions.dashSpans === 0,
    'row numbers, filter counts, and unavailable em dashes stay outside SelectedNumber sources', controlExclusions)
  if (await existsVisible(candidateNumber)) {
    const candidateRectIdle = await measureRect(candidateNumber)
    await click(candidateNumber)
    const candidateRectPinned = await measureRect(candidateNumber)
    const candidateAfterValue = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded'),pinned:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-pressed')}:null})()`)
    verify(candidateAfterValue?.selected === candidateInitial.selected && candidateAfterValue?.expanded === 'false' && candidateAfterValue?.pinned === 'true',
      'clicking a Candidate numeric value pins it without selecting or expanding its row', { before: candidateInitial, after: candidateAfterValue })
    const candidatePinA = await headerValue()
    verify(candidateRectIdle?.width === candidateRectPinned?.width && candidateRectIdle?.height === candidateRectPinned?.height,
      'Candidate selected ring does not change source layout height or width', { idle: candidateRectIdle, pinned: candidateRectPinned })
    const candidateB = await evaluate(`(()=>{const rows=[...document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="false"]')];const row=rows.find(e=>e.getAttribute('data-candidate-reorder-row')!==${JSON.stringify(firstChanged.rowId)});const button=row?.querySelector('[data-selected-number="true"]');if(!row||!button)return null;const r=button.getBoundingClientRect();return {id:row.getAttribute('data-candidate-reorder-row'),label:button.getAttribute('aria-label'),x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()`)
    if (candidateB) {
      await mouse('mouseMoved', candidateB.x, candidateB.y); await delay(430)
      const hoverB = await headerValue()
      verify(hoverB !== candidatePinA, 'Candidate value B preview temporarily replaces pinned Candidate value A', { valueA: candidatePinA, valueB: hoverB, candidateB: candidateB.label })
      await moveAway()
      verify(await headerValue() === candidatePinA, 'leaving Candidate value B restores pinned Candidate value A', { restored: await headerValue(), valueA: candidatePinA })
    const candidateRectB = await evaluate(`(()=>{const r=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(candidateB.id)});const e=r?.querySelector('[data-selected-number="true"]');if(!e)return null;const b=e.getBoundingClientRect();return {width:b.width,height:b.height}})()`)
      verify(candidateRectB?.width === candidateB.width && candidateRectB?.height === candidateB.height,
        'Candidate value B hover ring does not change its layout dimensions', { before: { width: candidateB.width, height: candidateB.height }, after: candidateRectB })
    } else {
      verify(false, 'Reference → Current exposes a second CHANGED Candidate source for B preview')
    }
    await click(candidateSelectorButton)
    const selectedAfterHash = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded')}:null})()`)
    verify(selectedAfterHash?.selected === 'true' && selectedAfterHash?.expanded === 'false', '# selector still selects a Candidate independently of the numeric pin', selectedAfterHash)
    const headerAfterHash = await headerValue()
    await click(candidateSelectorButton)
    const deselected = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-selected')==='false'`)
    verify(deselected && await headerValue() === headerAfterHash, '# selector deselects the Candidate without changing the active Header pin', { deselected, pinned: headerAfterHash, after: await headerValue() })
    await click(candidateSelectorButton)
    const selectedCostSlot = `${costPanel} button[data-gap-slot="selected"][data-selected-number="true"]`
    await waitFor(() => existsVisible(selectedCostSlot), 'Selected Cost Element gap slot after Candidate selection')
    const selectedGapFull = `${costPanel} button[data-gap-slot="full"][data-selected-number="true"]`
    const selectedGapDescription = await evaluate(`(${visibleExpression(selectedGapFull)})?.getAttribute('aria-description')??null`)
    const selectedFullGapDetails = await evaluate(`(()=>{const full=${visibleExpression(selectedGapFull)};const selected=${visibleExpression(selectedCostSlot)};return {full:full?{label:full.getAttribute('aria-label'),description:full.getAttribute('aria-description')}:null,selected:selected?{label:selected.getAttribute('aria-label'),description:selected.getAttribute('aria-description')}:null}})()`)
    const fullAx = await axNodeForLabel(selectedFullGapDetails?.full?.label)
    const selectedAx = await axNodeForLabel(selectedFullGapDetails?.selected?.label)
    const fullAxText = `${fullAx?.name?.value ?? ''} ${fullAx?.description?.value ?? ''}`
    const selectedAxText = `${selectedAx?.name?.value ?? ''} ${selectedAx?.description?.value ?? ''}`
    const gapDirection = selectedFullGapDetails?.full?.label?.match(/Gap = ([^;]+)/)?.[1]
    verify(Boolean(selectedGapDescription?.includes('Selected'))
      && selectedFullGapDetails?.full?.label?.includes('Full Gap')
      && Boolean(gapDirection) && fullAxText.includes(`Gap = ${gapDirection}`)
      && fullAx?.description?.value?.includes('Selected')
      && selectedFullGapDetails?.selected?.label?.includes('Selected Gap')
      && selectedAxText.includes('Selected Gap'),
      'Chrome AX exposes Cost Element Full Gap direction and selected context plus the Selected Gap name',
      { full: selectedFullGapDetails?.full, fullAX: { name: fullAx?.name?.value, description: fullAx?.description?.value }, selected: selectedFullGapDetails?.selected, selectedAX: { name: selectedAx?.name?.value, description: selectedAx?.description?.value } })
    await exerciseSummarySource('Cost Element', 'Selected Gap', selectedCostSlot)
    for (const [panel, label, selector] of [
      ['Cost Element', 'Total Before', `${costPanel} tfoot button[data-selected-number="true"][aria-label*="Standard Cost Before"]`],
      ['Cost Element', 'Total After', `${costPanel} tfoot button[data-selected-number="true"][aria-label*="Standard Cost After"]`],
      ['Cost Element', 'Total Full Gap', `${costPanel} tfoot button[data-gap-slot="full"][data-selected-number="true"]`],
      ['Cost Element', 'Total Selected Gap', `${costPanel} tfoot button[data-gap-slot="selected"][data-selected-number="true"]`],
      ['Cost Element', 'Total percent Gap', `${costPanel} tfoot button[data-selected-number="true"][aria-label*="Standard Cost percent Gap"]`],
      ['Work Center', 'Total Before', `${wcPanel} [data-cbd-summary-footer] button[data-selected-number="true"][aria-label*="Total Before"]`],
      ['Work Center', 'Total After', `${wcPanel} [data-cbd-summary-footer] button[data-selected-number="true"][aria-label*="Total After"]`],
      ['Work Center', 'Total Gap', `${wcPanel} [data-cbd-summary-footer] button[data-selected-number="true"][aria-label*="Total Gap"]:not([aria-label*="percent Gap"])`],
      ['Work Center', 'Total percent Gap', `${wcPanel} [data-cbd-summary-footer] button[data-selected-number="true"][aria-label*="Total percent Gap"]`]
    ]) {
      if (await existsVisible(selector)) await exerciseSummarySource(panel, label, selector)
      else if (label === 'Total Selected Gap') {
        const unavailable = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(`${costPanel} tfoot [data-gap-slot="selected"]`)});return e?{text:e.innerText.trim(),tag:e.tagName,selectable:!!e.closest('[data-selected-number="true"]')}:null})()`)
        verify(unavailable?.text === '—' && !unavailable.selectable,
          'unavailable Cost Element total selected Gap renders as a non-selectable dash', unavailable)
      } else throw new Error(`${panel} ${label} total source is not available in the seeded browser fixture`)
    }
    const rowNameSelector = `${firstRow} th[scope="row"]`
    const pinBeforeIdentityClick = await headerValue()
    await click(rowNameSelector)
    const identityClickState = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
    verify(identityClickState === 'true' && await headerValue() === pinBeforeIdentityClick,
      'clicking a CHANGED Candidate identity cell expands details without changing the active Header value', { expanded: identityClickState, pinned: await headerValue() })
    await click(rowNameSelector)
    verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')==='false'`), 'CHANGED Candidate identity cell can collapse its details')
    await click(chevron)
    const expanded = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};if(!r)return null;const rows=[];let next=r.nextElementSibling;while(next&&!next.hasAttribute('data-candidate-reorder-row')){const label=next.querySelector('th[scope="row"]')?.innerText.trim();if(label)rows.push(label);next=next.nextElementSibling}return {expanded:r.getAttribute('aria-expanded'),ariaControls:r.getAttribute('aria-controls'),detailHeaders:rows}})()`)
    const detailOrder = expanded?.detailHeaders
    verify(expanded?.expanded === 'true' && detailOrder?.join('|') === 'Reference|Current|Parameter Cost Effect',
      'independent real CHANGED chevron opens three ordered Reference, Current, and Parameter Cost Effect detail rows', expanded)
    await click(chevron.replace('button[aria-label^="Expand"]', 'button[aria-label^="Collapse"]'))
    verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')==='false'`), 'the independent chevron closes its Candidate details')
  } else {
    verify(false, 'CHANGED Candidate row has a selectable numeric source')
  }

  const rows = await findCandidateRows()
  const addedRemoved = rows.filter(row => row.status === 'ADDED' || row.status === 'REMOVED')
  verify(rows.some(row => row.status === 'CHANGED') && rows.some(row => row.status === 'ADDED') && rows.some(row => row.status === 'REMOVED'),
    'Reference → Current fixture renders CHANGED, ADDED, and REMOVED Candidate rows', { counts: Object.fromEntries(['CHANGED','ADDED','REMOVED'].map(status => [status, rows.filter(row => row.status === status).length])) })
  const sidePrefixes = addedRemoved.flatMap(row => row.text.slice(3, -2).filter(value => /^(?:Before|After|Reference|Current|REF|CUR)\s+/i.test(value)).map(value => ({ name: row.name, status: row.status, value })))
  verify(sidePrefixes.length === 0, 'ADDED and REMOVED main-row values contain no Before / After / Reference / Current side prefixes', sidePrefixes)
  const chartState = await evaluate(`(()=>{const e=document.querySelector('[data-gap-chart-wrapper]');return e?{buttons:e.querySelectorAll('button,[data-selected-number]').length,svg:!!e.querySelector('svg'),text:e.innerText.trim()}:null})()`)
  verify(Boolean(chartState?.svg) && chartState.buttons === 0, 'Gap chart stays a non-SelectedNumber chart', chartState)

  await waitFor(() => existsVisible('table[aria-label="Routing candidate findings column headers"]'), 'Routing candidate table in All view')
  const multiOpenIds = await evaluate(`(()=>{const bom=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Bill of Material Candidate findings'));const rtg=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Routing Candidate findings'));return {bom:[...bom.querySelectorAll('tbody tr[data-candidate-reorder-row][aria-expanded="false"]')].slice(0,2).map(r=>r.getAttribute('data-candidate-reorder-row')),routing:rtg?[...rtg.querySelectorAll('tbody tr[data-candidate-reorder-row][aria-expanded="false"]')].slice(0,1).map(r=>r.getAttribute('data-candidate-reorder-row')):[]}})()`)
  if (multiOpenIds.bom.length < 2 || multiOpenIds.routing.length < 1) throw new Error(`Fixture lacks changed BOM/Routing rows for independent expansion: ${JSON.stringify(multiOpenIds)}`)
  for (const [type, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Bill of Material', multiOpenIds.bom[1]], ['Routing', multiOpenIds.routing[0]]]) {
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child button[aria-label^="Expand"]`)
  }
  const multiOpenState = await evaluate(`(()=>[...document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="true"]')].map(r=>({id:r.getAttribute('data-candidate-reorder-row'),label:r.getAttribute('aria-label')})))()`)
  verify(multiOpenState.length >= 3, 'multiple BOM and Routing details can remain open together', multiOpenState)
  for (const [tableType, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Routing', multiOpenIds.routing[0]]]) {
    for (const role of ['Reference', 'Current', 'Parameter Cost Effect']) await exerciseDetailSource(tableType, id, role)
  }
  const numericSurfaceInventory = await evaluate(`(()=>{
    const buttons=[...document.querySelectorAll('button[data-selected-number="true"]')];
    const surfaceOf=button=>{
      if(button.closest('header[aria-label="Cost Breakdown subheader"]'))return 'Cost Breakdown subheader';
      const section=button.closest('section[aria-label="Cost Element"],section[aria-label="Work Center"]');if(section)return section.getAttribute('aria-label');
      const table=button.closest('table');const type=table?.querySelector('caption')?.textContent.includes('Routing')?'Routing':'Bill of Material';
      const row=button.closest('tr');if(row?.hasAttribute('data-candidate-reorder-row'))return type+' Candidate main';
      if(row?.querySelector('th[scope="row"]'))return type+' detail: '+row.querySelector('th[scope="row"]').innerText.trim();
      return 'other';
    };
    const surfaces={};for(const button of buttons){const name=surfaceOf(button);surfaces[name]=(surfaces[name]??0)+1}
    const dashNodes=[...document.querySelectorAll('button,span')].filter(element=>element.innerText.trim()==='—');
    return {
      total:buttons.length,surfaces,
      excluded:{chart:document.querySelectorAll('[data-gap-chart-wrapper] [data-selected-number], [data-gap-chart-wrapper] button').length,
        rowNumber:document.querySelectorAll('tr[data-candidate-reorder-row] td:first-child [data-selected-number]').length,
        status:document.querySelectorAll('tr[data-candidate-reorder-row] td:nth-child(3) [data-selected-number]').length,
        filter:document.querySelectorAll('[aria-label="Finding type filter"] [data-selected-number]').length,
        labels:[...document.querySelectorAll('th[scope="row"],[role="rowheader"]')].filter(element=>element.querySelector('[data-selected-number]')).length,
        dashSelected:buttons.filter(button=>button.innerText.trim()==='—').length,
        dashNodesWithSelectedAncestor:dashNodes.filter(element=>element.closest('button[data-selected-number="true"]')).length,
        filterCounts:[...document.querySelectorAll('[aria-label="Finding type filter"] button')].map(element=>element.innerText.trim())}
    };
  })()`)
  verify(numericSurfaceInventory.total > 0
    && numericSurfaceInventory.surfaces['Cost Breakdown subheader'] > 0
    && numericSurfaceInventory.surfaces['Cost Element'] > 0
    && numericSurfaceInventory.surfaces['Work Center'] > 0
    && numericSurfaceInventory.surfaces['Bill of Material Candidate main'] > 0
    && numericSurfaceInventory.surfaces['Routing Candidate main'] > 0
    && numericSurfaceInventory.surfaces['Bill of Material detail: Reference'] > 0
    && numericSurfaceInventory.surfaces['Bill of Material detail: Current'] > 0
    && numericSurfaceInventory.surfaces['Bill of Material detail: Parameter Cost Effect'] > 0
    && numericSurfaceInventory.surfaces['Routing detail: Reference'] > 0
    && numericSurfaceInventory.surfaces['Routing detail: Current'] > 0
    && numericSurfaceInventory.surfaces['Routing detail: Parameter Cost Effect'] > 0
    && Object.values(numericSurfaceInventory.excluded).slice(0, 7).every(count => count === 0),
    'numeric source inventory covers every real surface and excludes chart, row number, status, filter controls, labels, and unavailable dashes', numericSurfaceInventory)
  await click('div[role="group"][aria-label="Cost element color legend"]')
  const afterOutsideClick = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(afterOutsideClick === 0, 'outside click closes all open Candidate details', { afterOutsideClick })
  for (const [type, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Bill of Material', multiOpenIds.bom[1]], ['Routing', multiOpenIds.routing[0]]]) {
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child button[aria-label^="Expand"]`)
  }
  const reopenedBeforeEscape = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(reopenedBeforeEscape >= 3, 'multiple BOM and Routing details can be reopened before Escape verification', { reopenedBeforeEscape })
  await pressKey('Escape')
  const afterEscape = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(afterEscape === 0, 'Escape closes all open Candidate details', { afterEscape })
  for (const [type, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Bill of Material', multiOpenIds.bom[1]], ['Routing', multiOpenIds.routing[0]]]) {
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child button[aria-label^="Expand"]`)
  }
  const reopenedForCloseOne = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(reopenedForCloseOne >= 3, 'multiple BOM and Routing details can be reopened before independent close verification', { reopenedForCloseOne })
  const closeOne = `tr[data-candidate-reorder-row=${JSON.stringify(multiOpenIds.bom[0])}] td:last-child button[aria-label^="Collapse"]`
  await click(closeOne)
  const afterCloseOne = await evaluate(`(()=>{const row=id=>[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(e=>e.getAttribute('data-candidate-reorder-row')===id);return {open:document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="true"]').length,first:row(${JSON.stringify(multiOpenIds.bom[0])})?.getAttribute('aria-expanded'),second:row(${JSON.stringify(multiOpenIds.bom[1])})?.getAttribute('aria-expanded'),routing:row(${JSON.stringify(multiOpenIds.routing[0])})?.getAttribute('aria-expanded')}})()`)
  verify(afterCloseOne.first === 'false' && afterCloseOne.second === 'true' && afterCloseOne.routing === 'true', 'closing one detail leaves the other BOM and Routing details open', afterCloseOne)

  const addedRow = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(e=>e.querySelector('td:nth-child(3)')?.innerText.trim()==='ADDED');if(!row)return null;const r=row.getBoundingClientRect();return {id:row.getAttribute('data-candidate-reorder-row'),x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  if (addedRow) {
    await mouse('mouseMoved', addedRow.x, addedRow.y); await mouse('mousePressed', addedRow.x, addedRow.y); await mouse('mouseReleased', addedRow.x, addedRow.y); await delay(180)
    const addedAfterClick = await evaluate(`(()=>{const r=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(addedRow.id)});const next=r?.nextElementSibling;return r?{expanded:r.getAttribute('aria-expanded'),details:!!(next&&!next.hasAttribute('data-candidate-reorder-row')&&next.querySelector('th[scope="row"]'))}:null})()`)
    verify(addedAfterClick?.expanded === null && !addedAfterClick.details, 'ordinary ADDED Candidate row click safely does not expand details', addedAfterClick)
  } else verify(false, 'fixture exposes an ADDED Candidate row for safe ordinary-row click')

  await evaluate(`(()=>{window.__cbdDragEvents=[];for(const type of ['dragstart','dragenter','dragover','drop','dragend']){for(const capture of [true,false])document.addEventListener(type,event=>window.__cbdDragEvents.push({type,phase:capture?'capture':'bubble',target:event.target?.tagName,draggable:event.target?.draggable,id:event.target?.closest?.('[data-candidate-reorder-row]')?.getAttribute('data-candidate-reorder-row')??null,x:event.clientX,y:event.clientY,defaultPrevented:event.defaultPrevented,text:event.dataTransfer?.getData('text/plain')??null}),capture)}})()`)
  const reorderSetup = await evaluate(`(()=>{
    const table=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Bill of Material Candidate findings'));
    const rows=[...table.querySelectorAll('tbody tr[data-candidate-reorder-row]')];
    const at=p=>{const e=document.elementFromPoint(p.x,p.y);return e?{tag:e.tagName,draggable:e.draggable,id:e.closest('[data-candidate-reorder-row]')?.getAttribute('data-candidate-reorder-row')??null,handle:e.closest('button[draggable="true"]')!==null}:null};
    const candidates=rows.filter(row=>row.getAttribute('aria-selected')==='false').map(row=>{const handle=row.querySelector('button[draggable="true"]');const r=handle?.getBoundingClientRect();const point=r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;const hit=point?at(point):null;return {row,handle,rect:r,point,hit}}).filter(entry=>entry.rect&&entry.rect.width>0&&entry.rect.height>0&&entry.point.x>=0&&entry.point.x<=innerWidth&&entry.point.y>=0&&entry.point.y<=innerHeight&&entry.hit?.handle&&entry.hit.id===entry.row.getAttribute('data-candidate-reorder-row'));
    const sourceEntry=candidates[0];if(!sourceEntry)return null;
    const sourceIndex=rows.indexOf(sourceEntry.row);
    const targetEntry=rows.filter(row=>row!==sourceEntry.row&&row.getAttribute('aria-selected')==='false').map(row=>{const r=row.getBoundingClientRect();const identity=row.querySelector('th[scope="row"]');const identityRect=identity?.getBoundingClientRect();const insertAfter=rows.indexOf(row)>sourceIndex;const point={x:identityRect.left+identityRect.width/2,y:insertAfter?r.bottom-2:r.top+2};return {row,rect:r,identity,identityRect,point,insertAfter,hit:at(point)}}).find(entry=>entry.identityRect?.width>0&&entry.rect.width>0&&entry.rect.height>0&&entry.point.x>=0&&entry.point.x<=innerWidth&&entry.point.y>=0&&entry.point.y<=innerHeight&&entry.hit?.id===entry.row.getAttribute('data-candidate-reorder-row'));
    if(!targetEntry)return null;
    const main=document.querySelector('main#main-content');
    const rowSummary=row=>({id:row.getAttribute('data-candidate-reorder-row'),label:row.querySelector('th[scope="row"]')?.innerText.trim()??null,status:row.querySelector('td:nth-child(3)')?.innerText.trim()??null});
    return {before:rows.map(row=>row.getAttribute('data-candidate-reorder-row')),source:sourceEntry.row.getAttribute('data-candidate-reorder-row'),target:targetEntry.row.getAttribute('data-candidate-reorder-row'),sourceRow:rowSummary(sourceEntry.row),targetRow:rowSummary(targetEntry.row),handle:{...sourceEntry.point,rect:{x:sourceEntry.rect.x,y:sourceEntry.rect.y,width:sourceEntry.rect.width,height:sourceEntry.rect.height},hit:sourceEntry.hit},targetPoint:{...targetEntry.point,afterTarget:targetEntry.insertAfter,targetCell:'identity',rect:{x:targetEntry.rect.x,y:targetEntry.rect.y,width:targetEntry.rect.width,height:targetEntry.rect.height},identityRect:{x:targetEntry.identityRect.x,y:targetEntry.identityRect.y,width:targetEntry.identityRect.width,height:targetEntry.identityRect.height},hit:targetEntry.hit},viewport:{width:innerWidth,height:innerHeight},mainScrollTop:main.scrollTop,header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null};
  })()`)
  if (!reorderSetup) {
    verify(false, 'actual BOM drag reorder has two unselected rows and a visible reorder handle')
  } else {
    await dragMouse('mouseMoved', reorderSetup.handle.x, reorderSetup.handle.y)
    await dragMouse('mousePressed', reorderSetup.handle.x, reorderSetup.handle.y, 1)
    await delay(100)
    await dragMouse('mouseMoved', reorderSetup.handle.x + 6, reorderSetup.handle.y + 3, 1)
    await delay(100)
    await dragMouse('mouseMoved', reorderSetup.targetPoint.x, reorderSetup.targetPoint.y, 1)
    await delay(450)
    const nativeDragEvents = await evaluate('window.__cbdDragEvents')
    let dragMechanism = 'native CDP mouse down/move/up'
    if (!nativeDragEvents.some(event=>event.type==='dragover'&&event.id===reorderSetup.target)) {
      const payload = { items: [
        { mimeType: 'text/plain', data: reorderSetup.source },
        { mimeType: 'application/x-costbreakdown-row-ids', data: JSON.stringify([reorderSetup.source]) }
      ], files: [], dragOperationsMask: 16 }
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        try {
          await send('Input.dispatchDragEvent', { type, x: reorderSetup.targetPoint.x, y: reorderSetup.targetPoint.y, data: payload })
        } catch (error) {
          const probeId = ++commandId
          const probe = await Promise.race([
            new Promise(resolveProbe => {
              pending.set(probeId, message => resolveProbe(message.error ? { error: message.error.message } : { value: message.result?.result?.value }))
              client.send(JSON.stringify({ id: probeId, method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } }))
            }),
            delay(2500).then(() => ({ timedOut: true }))
          ])
          pending.delete(probeId)
          throw new Error(`Input.dispatchDragEvent(${type}) failed at ${JSON.stringify(reorderSetup.targetPoint)}; Runtime.evaluate(1+1) after failure: ${JSON.stringify(probe)}; websocketState=${client.readyState}; cause=${error.message}`)
        }
        await delay(80)
      }
      dragMechanism = 'native mouse dragstart plus CDP dragEnter/dragOver/drop while drag state remained active'
    }
    await dragMouse('mouseReleased', reorderSetup.targetPoint.x, reorderSetup.targetPoint.y, 0)
    await moveAway()
    await delay(450)
    let reordered = await evaluate(`(()=>{const table=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Bill of Material Candidate findings'));const rows=[...table.querySelectorAll('tbody tr[data-candidate-reorder-row]')];const source=rows.find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(reorderSetup.source)});return {after:rows.map(row=>row.getAttribute('data-candidate-reorder-row')),header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,sourceSelected:source?.getAttribute('aria-selected')}})()`)
    const finalDragEvents = await evaluate('window.__cbdDragEvents')
    const sawReactDragStart = finalDragEvents.some(event => event.type === 'dragstart' && event.id === reorderSetup.source)
    const sawReactTargetDragOver = finalDragEvents.some(event => event.type === 'dragover' && event.id === reorderSetup.target && event.defaultPrevented)
    const sawReactTargetDrop = finalDragEvents.some(event => event.type === 'drop' && event.id === reorderSetup.target && event.defaultPrevented)
    verify(reordered.after.some((id, index) => id !== reorderSetup.before[index]) && reordered.header === reorderSetup.header && reordered.sourceSelected === 'false'
      && sawReactDragStart && sawReactTargetDragOver && sawReactTargetDrop,
      'actual Candidate drag-and-drop triggers React dragstart, target dragover and drop, reorders a row, and preserves Header and selection state', { mechanism: dragMechanism, reactEvents:{sawReactDragStart,sawReactTargetDragOver,sawReactTargetDrop}, before: reorderSetup.before, source: reorderSetup.source, sourceRow: reorderSetup.sourceRow, target: reorderSetup.target, targetRow: reorderSetup.targetRow, setup:{handle:reorderSetup.handle,targetPoint:reorderSetup.targetPoint,viewport:reorderSetup.viewport,mainScrollTop:reorderSetup.mainScrollTop},nativeDragEvents,finalDragEvents,after:reordered })
  }

  // Snapshot all responsive viewport states after restoring the main row.
  for (const width of [1440, 1024, 768, 390, 320]) {
    await setViewport(width, 900)
    const layout = await evaluate(`(()=>{
      const axisCells=row=>{let start=0;return [...(row?.children??[])].map(e=>{const span=e.colSpan||1;const r=e.getBoundingClientRect();const result={start,span,left:r.left,right:r.right,width:r.width,tag:e.tagName,text:e.innerText.trim(),numericLabel:e.querySelector('button[data-selected-number="true"]')?.getAttribute('aria-label')??null};start+=span;return result})};
      const candidates=['Bill of Material','Routing'].map(type=>{
        const header=document.querySelector('table[aria-label="'+type+' candidate findings column headers"]');
        const body=[...document.querySelectorAll('table')].find(table=>table.querySelector('caption')?.textContent.includes(type+' Candidate findings'));
        const wrapper=body?.parentElement;
        const headerRow=header?.querySelector('thead tr');
        const headCells=axisCells(headerRow);
        const main=body?.querySelector('tbody tr[data-candidate-reorder-row][aria-expanded="true"]');
        const mainCells=axisCells(main);
        const details=[];let next=main?.nextElementSibling;
        while(next&&!next.hasAttribute('data-candidate-reorder-row')){if(next.querySelector('th[scope="row"]'))details.push({label:next.querySelector('th[scope="row"]')?.innerText.trim(),cells:axisCells(next)});next=next.nextElementSibling}
        const sticky=header?.closest('[data-sticky-table-header]');const headerViewport=sticky?.querySelector('[data-sticky-table-header-viewport]');
        return {type,headerCount:headCells.length,headCells,mainCells,details,bodyWidth:wrapper?.clientWidth??null,bodyScrollWidth:wrapper?.scrollWidth??null,bodyScrollLeft:wrapper?.scrollLeft??null,bodyOverflowX:wrapper?getComputedStyle(wrapper).overflowX:null,stickyPosition:sticky?getComputedStyle(sticky).position:null,stickyTop:sticky?.getBoundingClientRect().top??null,headerViewportOverflow:headerViewport?getComputedStyle(headerViewport).overflowX:null,headerScrollLeft:headerViewport?.scrollLeft??null};
      });
      const cost=document.querySelector('section[aria-label="Cost Element"] table');
      const costHeader=cost?.querySelector('thead tr:first-child');const costRow=cost?.querySelector('tbody tr');const costFooter=cost?.querySelector('tfoot tr');
      const costHeaders=axisCells(costHeader),costCells=axisCells(costRow),costFooterCells=axisCells(costFooter);
      const wcTable=document.querySelector('section[aria-label="Work Center"] [role="table"]');
      const wcHeader=wcTable?.querySelector('[data-cbd-summary-header] [role="row"]');const wcBody=wcTable?.querySelector('[data-cbd-summary-body] [role="row"]');const wcFooter=wcTable?.querySelector('[data-cbd-summary-footer] [role="row"]');
      const wcHeaderCells=axisCells(wcHeader),wcBodyCells=axisCells(wcBody),wcFooterCells=axisCells(wcFooter);
      const wc=document.querySelector('[data-wc-scroll-body="true"]');
      const summaryScrollers=[...document.querySelectorAll('section[aria-label="Cost Element"],section[aria-label="Work Center"]')].map(section=>({name:section.getAttribute('aria-label'),client:section.clientWidth,scroll:section.scrollWidth,overflowX:getComputedStyle(section).overflowX}));
      const overview=document.querySelector('[data-cbd-overview-pair="true"]');
      const mainContent=document.querySelector('main#main-content');const candidateArea=document.querySelector('[aria-label="Candidate workspace"]');
      const wcStyle=wc?getComputedStyle(wc):null;const mainStyle=mainContent?getComputedStyle(mainContent):null;const candidateStyle=candidateArea?getComputedStyle(candidateArea):null;
      const wcRect=wc?.getBoundingClientRect();
      const verticalScrollers=[...document.querySelectorAll('main#main-content *')].filter(e=>{const s=getComputedStyle(e);return (s.overflowY==='auto'||s.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+2&&e!==wc}).map(e=>({tag:e.tagName,role:e.getAttribute('role'),label:e.getAttribute('aria-label'),className:String(e.className).slice(0,90),client:e.clientHeight,scroll:e.scrollHeight}));
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,overview:{columns:getComputedStyle(overview).gridTemplateColumns.split(' ').length,template:getComputedStyle(overview).gridTemplateColumns},candidates,cost:{header:costHeaders,cells:costCells,footer:costFooterCells,selectedGapButtons:cost?.querySelectorAll('[data-gap-slot="selected"][data-selected-number="true"]').length??0},workCenter:{header:wcHeaderCells,body:wcBodyCells,footer:wcFooterCells,client:wc?.clientHeight??null,scroll:wc?.scrollHeight??null,overflowY:wcStyle?.overflowY??null,rect:wcRect?{left:wcRect.left,top:wcRect.top,width:wcRect.width,height:wcRect.height}:null},summaryScrollers,main:{overflowY:mainStyle?.overflowY??null,client:mainContent?.clientHeight??null,scroll:mainContent?.scrollHeight??null,scrollTop:mainContent?.scrollTop??null},candidateArea:{overflowY:candidateStyle?.overflowY??null,client:candidateArea?.clientHeight??null,scroll:candidateArea?.scrollHeight??null},verticalScrollers};
    })()`)
    const alignCells=(cells,headers)=>cells.map(cell=>({start:cell.start,span:cell.span,delta:Math.abs(cell.width-headers.slice(cell.start,cell.start+cell.span).reduce((sum,header)=>sum+header.width,0))}))
    const candidateDeltas = layout?.candidates?.map(table => ({type:table.type,main:alignCells(table.mainCells,table.headCells),details:table.details.map(row=>({label:row.label,axes:alignCells(row.cells,table.headCells),numericAxes:row.cells.filter(cell=>cell.numericLabel).map(cell=>({label:cell.numericLabel,start:cell.start,span:cell.span,headerLabels:table.headCells.slice(cell.start,cell.start+cell.span).map(header=>header.text)}))}))})) ?? []
    const summaryDeltas={cost:layout?.cost?.header.map((cell,index)=>Math.abs(cell.width-layout.cost.cells[index]?.width))??[],costFooter:layout?.cost?.header.map((cell,index)=>Math.abs(cell.width-layout.cost.footer[index]?.width))??[],wcHeaderBody:layout?.workCenter?.header.map((cell,index)=>Math.abs(cell.width-layout.workCenter.body[index]?.width))??[],wcHeaderFooter:layout?.workCenter?.header.map((cell,index)=>Math.abs(cell.width-layout.workCenter.footer[index]?.width))??[]}
    const candidatesAligned=candidateDeltas.length===2&&candidateDeltas.every(table=>table.main.length===(table.type==='Routing'?12:10)&&table.main.every(cell=>cell.delta<=1.5)&&table.details.length===3&&table.details.every(row=>row.axes.length===table.main.length&&row.axes.every(cell=>cell.delta<=1.5)&&row.numericAxes.length>=(table.type==='Routing'?5:3)+(row.label==='Parameter Cost Effect'?1:0)&&row.numericAxes.every(cell=>cell.start>=3&&cell.start<table.main.length-3&&cell.headerLabels.length===cell.span)))
    const stickyAndScrollOwnership=layout?.candidates?.length===2&&layout.candidates.every(table=>table.stickyPosition==='sticky'&&table.headerViewportOverflow==='hidden'&&table.bodyOverflowX==='auto')
    const summaryColumnsExpected=width>=1024?2:1
    const summaryOverflowExpected=width<=520?layout?.summaryScrollers?.every(panel=>panel.scroll>panel.client&&panel.overflowX==='auto'):true
    const verticalOwnership=layout?.main.overflowY==='auto'&&layout.candidateArea.overflowY==='visible'&&layout.candidateArea.scroll<=layout.candidateArea.client+2&&layout.workCenter.overflowY==='auto'&&layout.verticalScrollers.length===0
    verify(Boolean(layout) && layout.documentWidth <= width + 1 && candidatesAligned && stickyAndScrollOwnership
      && summaryDeltas.cost.length===5&&summaryDeltas.cost.every(delta=>delta<=1.5)&&summaryDeltas.costFooter.length===5&&summaryDeltas.costFooter.every(delta=>delta<=1.5)
      && summaryDeltas.wcHeaderBody.length===5&&summaryDeltas.wcHeaderBody.every(delta=>delta<=1.5)&&summaryDeltas.wcHeaderFooter.length===5&&summaryDeltas.wcHeaderFooter.every(delta=>delta<=1.5)
      && layout.overview.columns===summaryColumnsExpected&&layout.cost.selectedGapButtons>0&&verticalOwnership&&summaryOverflowExpected
      && layout.candidates.every(table=>width>768||table.bodyScrollWidth>table.bodyWidth),
      `BOM and Routing header/main/Before/After/effect axes, selected Cost Element and Work Center axes, responsive grid, and scroll ownership align without page overflow at ${width}px`, { layout, candidateDeltas, summaryDeltas })
    await screenshot(`cbd-selected-value-${width}`)
  }

  await setViewport(390)
  for (const tableType of ['Bill of Material', 'Routing']) {
    const beforeScroll = await evaluate(`(()=>{const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(${JSON.stringify(`${tableType} Candidate findings`)}));const wrapper=table?.parentElement;const header=document.querySelector('table[aria-label="${tableType} candidate findings column headers"]')?.closest('[data-sticky-table-header]')?.querySelector('[data-sticky-table-header-viewport]');const rect=wrapper?.getBoundingClientRect();return wrapper&&header?{client:wrapper.clientWidth,scroll:wrapper.scrollWidth,left:wrapper.scrollLeft,headerLeft:header.scrollLeft,overflowX:getComputedStyle(wrapper).overflowX,x:rect.left+Math.min(rect.width/2,120),y:rect.top+40}:null})()`)
    verify(beforeScroll?.scroll > beforeScroll?.client && beforeScroll.overflowX === 'auto', `${tableType} owns its narrow horizontal overflow locally at 390px`, beforeScroll)
    await wheel(beforeScroll.x, beforeScroll.y, 480, 0)
    const afterScroll = await evaluate(`(()=>{const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(${JSON.stringify(`${tableType} Candidate findings`)}));const wrapper=table?.parentElement;const header=document.querySelector('table[aria-label="${tableType} candidate findings column headers"]')?.closest('[data-sticky-table-header]')?.querySelector('[data-sticky-table-header-viewport]');return wrapper&&header?{bodyLeft:wrapper.scrollLeft,headerLeft:header.scrollLeft}:null})()`)
    verify(afterScroll?.bodyLeft > 0 && Math.abs(afterScroll.bodyLeft - afterScroll.headerLeft) <= 1,
      `${tableType} actual horizontal wheel scroll is local and synchronizes its sticky column header`, { before: beforeScroll, after: afterScroll })
    await wheel(beforeScroll.x, beforeScroll.y, -2000, 0)
  }
  for (const panelName of ['Cost Element', 'Work Center']) {
    const panelScroll = await evaluate(`(()=>{const section=document.querySelector(${JSON.stringify(`section[aria-label="${panelName}"]`)});const r=section?.getBoundingClientRect();return section?{client:section.clientWidth,scroll:section.scrollWidth,left:section.scrollLeft,overflowX:getComputedStyle(section).overflowX,x:r.left+Math.min(r.width/2,120),y:r.top+40}:null})()`)
    verify(panelScroll?.scroll > panelScroll?.client && panelScroll.overflowX === 'auto', `${panelName} owns its 390px summary horizontal overflow locally`, panelScroll)
    await wheel(panelScroll.x, panelScroll.y, 280, 0)
    const scrolledPanel = await evaluate(`document.querySelector(${JSON.stringify(`section[aria-label="${panelName}"]`)})?.scrollLeft??0`)
    verify(scrolledPanel > 0, `${panelName} actual horizontal wheel input scrolls the summary panel instead of the page`, { panel: panelName, before: panelScroll.left, after: scrolledPanel })
    await wheel(panelScroll.x, panelScroll.y, -2000, 0)
  }

  await setViewport(1440, 900)
  const wcScrollBefore = await evaluate(`(()=>{const body=document.querySelector('[data-wc-scroll-body="true"]');const main=document.querySelector('main#main-content');const rect=body?.getBoundingClientRect();return body&&main?{bodyTop:body.scrollTop,bodyHeight:body.clientHeight,bodyScroll:body.scrollHeight,bodyOverflow:getComputedStyle(body).overflowY,mainTop:main.scrollTop,x:rect.left+rect.width/2,y:rect.top+Math.min(30,rect.height/2)}:null})()`)
  verify(wcScrollBefore?.bodyOverflow === 'auto' && wcScrollBefore.bodyScroll > wcScrollBefore.bodyHeight,
    'Work Center body has a dedicated internal vertical scroll range at desktop width', wcScrollBefore)
  await wheel(wcScrollBefore.x, wcScrollBefore.y, 0, 160)
  const wcScrollAfter = await evaluate(`(()=>({body:document.querySelector('[data-wc-scroll-body="true"]')?.scrollTop??0,main:document.querySelector('main#main-content')?.scrollTop??0}))()`)
  verify(wcScrollAfter.body > wcScrollBefore.bodyTop && wcScrollAfter.main === wcScrollBefore.mainTop,
    'real Work Center wheel input scrolls its body without scrolling Main', { before: wcScrollBefore, after: wcScrollAfter })
  await wheel(wcScrollBefore.x, wcScrollBefore.y, 0, -3000)

  const mainScrollBefore = await evaluate(`(()=>{const main=document.querySelector('main#main-content');const candidate=document.querySelector('[aria-label="Candidate workspace"]');const rect=main.getBoundingClientRect();return {top:main.scrollTop,scroll:main.scrollHeight,client:main.clientHeight,candidateTop:candidate.scrollTop,candidateOverflow:getComputedStyle(candidate).overflowY,x:rect.left+4,y:rect.top+Math.min(80,rect.height/3)}})()`)
  verify(mainScrollBefore.scroll > mainScrollBefore.client && mainScrollBefore.candidateOverflow === 'visible',
    'Main is the primary vertical scroller while Candidate workspace remains normal flow', mainScrollBefore)
  await wheel(mainScrollBefore.x, mainScrollBefore.y, 0, 420)
  const mainScrollAfter = await evaluate(`(()=>{
    const main=document.querySelector('main#main-content');const candidate=document.querySelector('[aria-label="Candidate workspace"]');const shell=document.querySelector('[data-cbd-sticky-shell="true"]');
    const shellRect=shell.getBoundingClientRect();const mainRect=main.getBoundingClientRect();const page=document.querySelector('[data-cbd-overview-pair="true"]')?.parentElement;
    const computedOffset=page?getComputedStyle(page).getPropertyValue('--cbd-table-header-top').trim():null;
    const box=e=>{const r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null};
    const headers=['Bill of Material','Routing'].map(type=>{
      const header=document.querySelector('table[aria-label="'+type+' candidate findings column headers"]')?.closest('[data-sticky-table-header]');
      const style=header?getComputedStyle(header):null;const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(type+' Candidate findings'));
      const wrapper=header?.parentElement;const bodyViewport=table?.parentElement;const rowRects=[...(table?.querySelectorAll('tbody tr[data-candidate-reorder-row]')??[])].map(box);const visibleRows=rowRects.filter(r=>r&&r.bottom>shellRect.bottom&&r.top<mainRect.bottom).length;
      const headerRect=box(header);const overlapTop=headerRect?Math.max(headerRect.top,shellRect.top):null;const overlapBottom=headerRect?Math.min(headerRect.bottom,shellRect.bottom):null;const overlapHeight=overlapTop!==null&&overlapBottom!==null?Math.max(0,overlapBottom-overlapTop):0;const overlapPoint=overlapHeight>0&&headerRect?{x:headerRect.left+Math.min(20,headerRect.width/2),y:overlapTop+overlapHeight/2}:null;const overlapHit=overlapPoint?document.elementFromPoint(overlapPoint.x,overlapPoint.y):null;
      const ancestry=[];for(let node=header;node;node=node.parentElement){const s=getComputedStyle(node);ancestry.push({tag:node.tagName,className:String(node.className).slice(0,100),position:s.position,top:s.top,overflowX:s.overflowX,overflowY:s.overflowY,rect:box(node)});if(node===main)break}
      return {type,position:style?.position??null,computedTop:style?.top??null,rectTop:headerRect?.top??null,headerRect,headerHeight:header?.getBoundingClientRect().height??null,wrapperRect:box(wrapper),bodyViewportRect:box(bodyViewport),bodyOverflow:{x:bodyViewport?getComputedStyle(bodyViewport).overflowX:null,y:bodyViewport?getComputedStyle(bodyViewport).overflowY:null},visibleBodyRows:visibleRows,firstBodyRow:rowRects[0]??null,lastBodyRow:rowRects.at(-1)??null,overlapHeight,overlapHitInsideShell:Boolean(overlapHit&&shell.contains(overlapHit)),overlapHitTag:overlapHit?.tagName??null,ancestry}
    });
    return {main:main.scrollTop,candidate:candidate.scrollTop,mainRectTop:mainRect.top,mainRect:box(main),shellRect:box(shell),computedOffset,headers}
  })()`)
  const mainOwnsVerticalScroll = mainScrollAfter.main > mainScrollBefore.top && mainScrollAfter.candidate === mainScrollBefore.candidateTop
  const noHeaderVisibleOverShell = mainScrollAfter.headers.every(header=>header.overlapHeight<=0||header.overlapHitInsideShell)
  verify(mainOwnsVerticalScroll && noHeaderVisibleOverShell,
    'real vertical wheel input scrolls Main, leaves Candidate workspace in normal flow, and the shell visually covers any inactive header overlap', { before: mainScrollBefore, after: mainScrollAfter, mainOwnsVerticalScroll, noHeaderVisibleOverShell })
  const readStickyTable = type => {
    const headerSelector = JSON.stringify(`table[aria-label="${type} candidate findings column headers"]`)
    const captionText = JSON.stringify(`${type} Candidate findings`)
    const typeValue = JSON.stringify(type)
    return evaluate(`(()=>{
      const main=document.querySelector('main#main-content');
      const shell=document.querySelector('[data-cbd-sticky-shell="true"]');
      const header=document.querySelector(${headerSelector})?.closest('[data-sticky-table-header]');
      const body=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(${captionText}));
      const wrapper=header?.parentElement;
      const box=e=>{const r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,height:r.height}:null};
      const shellRect=box(shell);const mainRect=box(main);
      const rows=[...(body?.querySelectorAll('tbody tr[data-candidate-reorder-row]')??[])].map(box);
      return {type:${typeValue},mainScrollTop:main?.scrollTop??null,mainRect,shellRect,wrapperRect:box(wrapper),headerRect:box(header),position:header?getComputedStyle(header).position:null,computedTop:header?getComputedStyle(header).top:null,visibleBodyRows:rows.filter(r=>r&&shellRect&&mainRect&&r.bottom>shellRect.bottom&&r.top<mainRect.bottom).length,firstBodyRow:rows[0]??null,lastBodyRow:rows.at(-1)??null}
    })()`)
  }
  for (const type of ['Bill of Material','Routing']) {
    const before=await readStickyTable(type)
    const wheelDelta=before.wrapperRect.top-before.shellRect.bottom
    await wheel(mainScrollBefore.x,mainScrollBefore.y,0,wheelDelta)
    const after=await readStickyTable(type)
    const headerBelowShell=after.position==='sticky'&&after.headerRect.top>=after.shellRect.bottom-2
    const headerFlushToShell=after.headerRect&&Math.abs(after.headerRect.top-after.shellRect.bottom)<=2
    verify(after.mainScrollTop!==before.mainScrollTop&&headerBelowShell&&headerFlushToShell&&after.visibleBodyRows>0,
      `${type} header aligns flush below the shell without obscuring its active candidate body rows`,{before,after,wheelDelta,headerBelowShell,headerFlushToShell,gapFromShellBottom:after.headerRect.top-after.shellRect.bottom})
  }
  await wheel(mainScrollBefore.x,mainScrollBefore.y,0,-3000)
  await setViewport(1440)

  // Switch actual dataset roles and verify pair-fingerprinted Candidate details
  // are rebuilt with the active roles instead of stale Reference / Current names.
  for (const [before, after] of [['Current', 'Custom'], ['Custom', 'Reference']]) {
    await setViewport(1440)
    await setPair(before, after)
    await waitFor(async () => (await findCandidateRows()).some(row => row.status === 'CHANGED' && row.expanded === 'false'), `${before} → ${after} rendered CHANGED Candidate row`)
    const renderedCandidates = await findCandidateRows()
    const selectedChangedRow = renderedCandidates.find(row => row.status === 'CHANGED' && row.expanded === 'false')
    const roleChangedRow = { ...selectedChangedRow, renderedRows: renderedCandidates.length, renderedStatuses: renderedCandidates.map(row => row.status) }
    verify(roleChangedRow.status === 'CHANGED' && roleChangedRow.id !== null && roleChangedRow.renderedRows > 0,
      `${before} → ${after} renders a CHANGED Candidate row for the role detail check`, roleChangedRow)
    const selector = `tr[data-candidate-reorder-row=${JSON.stringify(roleChangedRow.id)}] td:last-child button[aria-label^="Expand"]`
    const roleClickBefore = await evaluate(`(()=>{const selector=${JSON.stringify(selector)};const matches=[...document.querySelectorAll(selector)];const button=matches[0];const row=button?.closest('tr[data-candidate-reorder-row]');const rect=button?.getBoundingClientRect();const hit=rect?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;const main=document.querySelector('main#main-content');return {matchCount:matches.length,rowStatus:row?.querySelector('td:nth-child(3)')?.innerText.trim()??null,rowExpanded:row?.getAttribute('aria-expanded')??null,buttonLabel:button?.getAttribute('aria-label')??null,rect:rect?{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}:null,viewport:{width:innerWidth,height:innerHeight},hit:{tag:hit?.tagName??null,ariaLabel:hit?.getAttribute('aria-label')??null,text:hit?.textContent?.trim().slice(0,80)??null,insideButton:Boolean(button&&hit&&(hit===button||button.contains(hit)))},mainScrollTop:main?.scrollTop??null}})()`)
    verify(roleClickBefore.matchCount === 1 && roleClickBefore.rowStatus === 'CHANGED' && roleClickBefore.rowExpanded === 'false' && roleClickBefore.hit.insideButton,
      `${before} → ${after} chevron has a unique visible hit target on the collapsed CHANGED row`, roleClickBefore)
    await evaluate(`(()=>{window.__cbdRoleMatrixClickEvents=[];document.addEventListener('click',event=>{const row=event.target.closest('tr[data-candidate-reorder-row]');if(row?.getAttribute('data-candidate-reorder-row')===${JSON.stringify(roleChangedRow.id)})window.__cbdRoleMatrixClickEvents.push({target:event.target.tagName,targetLabel:event.target.getAttribute('aria-label'),button:Boolean(event.target.closest('button')),defaultPrevented:event.defaultPrevented})},true)})()`)
    await click(selector)
    const roleClickAfter = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(item=>item.getAttribute('data-candidate-reorder-row')===${JSON.stringify(roleChangedRow.id)});return {rowStatus:row?.querySelector('td:nth-child(3)')?.innerText.trim()??null,rowExpanded:row?.getAttribute('aria-expanded')??null,clickEvents:window.__cbdRoleMatrixClickEvents??[],details:row?.nextElementSibling?.querySelector('th[scope="row"]')?.innerText.trim()??null}})()`)
    verify(roleClickAfter.clickEvents.length > 0,
      `${before} → ${after} physical CDP input delivers a click to the CHANGED row control`, { before: roleClickBefore, after: roleClickAfter })
    verify(roleClickAfter.rowExpanded === 'true',
      `${before} → ${after} chevron click expands its CHANGED Candidate row`, { before: roleClickBefore, after: roleClickAfter })
    const detail = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(e=>e.getAttribute('data-candidate-reorder-row')===${JSON.stringify(roleChangedRow.id)});if(!row)return null;const headers=[];let next=row.nextElementSibling;while(next&&!next.hasAttribute('data-candidate-reorder-row')){const label=next.querySelector('th[scope="row"]')?.innerText.trim();if(label)headers.push(label);next=next.nextElementSibling}return {headers,mainExpanded:row.getAttribute('aria-expanded')}})()`)
    const expected = [before, after, 'Parameter Cost Effect']
    verify(detail?.mainExpanded === 'true' && detail.headers.slice(-3).join('|') === expected.join('|'),
      `${before} → ${after} uses active role names in its ordered three-row detail`, detail)
  }

  await setPair('Reference', 'Reference')
  const selfPair = await evaluate(`(()=>{const rows=[...document.querySelectorAll('tr[data-candidate-reorder-row]')];return {pair:document.querySelector('[aria-label^="Comparison datasets,"]')?.getAttribute('aria-label'),statuses:rows.map(row=>row.querySelector('td:nth-child(3)')?.innerText.trim()??''),header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null}})()`)
  const selfPairChanged = selfPair.statuses.filter(status => status !== 'UNCHANGED')
  verify(selfPair.pair === 'Comparison datasets, Before Reference, After Reference' && selfPairChanged.length === 0,
    'Reference → Reference self-pair is reachable and shows no synthetic CHANGED, ADDED, or REMOVED findings', { ...selfPair, nonUnchangedStatuses: selfPairChanged })

  await setPair('Reference', 'Current')
  const finalConsole = [...browserErrors]
  verify(finalConsole.length === 0, 'browser has no uncaught runtime exceptions, console errors, or warnings', finalConsole)
  process.stdout.write(`\nEvidence directory: ${evidenceDir}\n`)
  process.stdout.write(`Browser: ${baseUrl} in isolated Chrome; exercised Reference → Current, Current → Custom, Custom → Reference at 1440/1024/768/390/320px.\n`)
  process.stdout.write(`Checks: ${checks.filter(check => check.passed).length}/${checks.length} passed.\n`)
} catch (error) {
  process.stderr.write(`\nEvidence directory: ${evidenceDir}\n`)
  process.stderr.write(`${error.stack ?? error}\n`)
  process.stderr.write(`Chrome diagnostics: ${JSON.stringify({ exitCode: chrome.exitCode, signalCode: chrome.signalCode, websocketState: client?.readyState ?? null, stderr: chromeOutput.join('').slice(-6000) })}\n`)
  process.stderr.write(`Vite diagnostics: ${JSON.stringify({ exitCode: vite?.exitCode ?? null, signalCode: vite?.signalCode ?? null, output: viteOutput.join('').slice(-3000) })}\n`)
  process.exitCode = 1
} finally {
  try { client?.close() } catch {}
  await Promise.all([stopChild(chrome), stopChild(vite)])
  let profileRemoved = false
  for (let attempt = 0; attempt < 5 && !profileRemoved; attempt++) {
    try { await rm(profile, { recursive: true, force: true }); profileRemoved = true }
    catch (error) { if (attempt === 4) process.stderr.write(`Chrome profile cleanup warning: ${error.message}\n`); else await delay(100) }
  }
}
