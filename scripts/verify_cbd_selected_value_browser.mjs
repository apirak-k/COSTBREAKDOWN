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
      if (response.result.exceptionDetails) {
        const details = response.result.exceptionDetails
        const description = details.exception?.description ?? details.text
        const snippet = expression.replace(/\s+/g, ' ').slice(0, 600)
        throw new Error(`Runtime.evaluate failed: ${description}; expression=${snippet}`)
      }
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
    const code = key === 'Enter' ? 'Enter' : key === 'Tab' ? 'Tab' : key === 'a' ? 'KeyA' : key === ' ' ? 'Space' : key
    const vk = key === 'Enter' ? 13 : key === 'Tab' ? 9 : key === 'a' ? 65 : key === ' ' ? 32 : undefined
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined })
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
  const selectedNumberVisual = selector => evaluate(`(()=>{
    const button=${visibleExpression(selector)};if(!button)return null;
    const content=button.firstElementChild??button;const range=document.createRange();range.selectNodeContents(content);const textRect=range.getBoundingClientRect();
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    const buttonStyle=getComputedStyle(button);const contentStyle=getComputedStyle(content);
    return {text:button.innerText.trim(),button:box(button),content:box(content),textBounds:{x:textRect.x,y:textRect.y,width:textRect.width,height:textRect.height},contentBackground:contentStyle.backgroundColor,buttonBackground:buttonStyle.backgroundColor,boxShadow:buttonStyle.boxShadow,outline:buttonStyle.outline,outlineStyle:buttonStyle.outlineStyle,outlineWidth:buttonStyle.outlineWidth,focusVisible:button.matches(':focus-visible')};
  })()`)
  const cellWhitespacePoint = selector => evaluate(`(()=>{
    const source=${visibleExpression(selector)};const cell=source?.matches('td')?source:source?.closest('td');if(!cell)return null;
    const rect=cell.getBoundingClientRect();const blocked='button,a,input,select,textarea,[role="button"],[role="menuitem"],svg';
    const ys=[rect.top+rect.height/2,rect.top+2,rect.bottom-2];
    for(const y of ys)for(let x=Math.ceil(rect.left+1);x<rect.right-1;x+=1){
      const target=document.elementFromPoint(x,y);
      if(target&&target.closest('td')===cell&&!target.closest(blocked))return {x,y,cell:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},target:{tag:target.tagName,text:target.textContent.trim().slice(0,32)}};
    }
    return null;
  })()`)
  const clickPoint = async point => {
    if (!point) throw new Error('No visible whitespace point was available inside the requested cell')
    await mouse('mouseMoved', point.x, point.y)
    await mouse('mousePressed', point.x, point.y)
    await mouse('mouseReleased', point.x, point.y)
    await delay(160)
  }
  const contentHugsNumber = visual => Boolean(visual
    && visual.textBounds.width > 0
    && visual.button.width <= visual.textBounds.width + 2
    && visual.content.width <= visual.textBounds.width + 2)
  const hasPointerBlueRing = visual => Boolean(visual
    && (visual.focusVisible
      || /(?:29,\s*78,\s*216|59,\s*130,\s*246|37,\s*99,\s*235)/.test(visual.boxShadow)
      || (visual.outlineStyle !== 'none' && Number.parseFloat(visual.outlineWidth) > 0)))
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

  // Master Data metadata uses no-focus SelectedNumber callers for Selling Price
  // and SG&A. Exercise those active callers before leaving the workspace.
  const selectedHeaderValue = () => evaluate('document.querySelector("header [data-header-value] [data-selected-value-output]")?.textContent.trim()??null')
  const metadataSwitch = 'section[aria-label="Working dataset controls"] button[role="switch"]'
  const sellingInput = 'input[aria-label="Selling Price (THB)"]'
  const sgaInput = 'input[aria-label="SG&A"]'
  const sellingNumber = 'button[data-selected-number="true"][aria-label^="Selling Price (THB):"]'
  const sgaNumber = 'button[data-selected-number="true"][aria-label^="SG&A:"]'
  await click(metadataSwitch)
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "true"'), 'Master Data metadata Edit mode for short value fixtures')
  const shortSelling = await replaceInput(sellingInput, '12.34')
  const shortSga = await replaceInput(sgaInput, '7.2')
  if (shortSelling !== '12.34' || shortSga !== '7.2') throw new Error(`Master Data metadata editors did not retain the short fixture values: ${JSON.stringify({ shortSelling, shortSga })}`)
  await click(metadataSwitch)
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "false"'), 'Master Data metadata View mode')
  await waitFor(() => existsVisible(sellingNumber) && existsVisible(sgaNumber), 'Master Data Selling Price and SG&A SelectedNumber callers')
  await waitFor(() => selectedHeaderValue().then(value => value === '—'), 'Master Data metadata sources start with an empty Selected Value Header')

  const metadataHeaderBefore = await selectedHeaderValue()
  const shortSellingRaw = await rawNumericValue(sellingNumber)
  const shortSellingVisual = await selectedNumberVisual(sellingNumber)
  verify(Number.isFinite(shortSellingRaw) && Math.abs(shortSellingRaw - 12.34) < 1e-8
    && contentHugsNumber(shortSellingVisual)
    && shortSellingVisual.contentBackground === 'rgba(0, 0, 0, 0)',
    'Master Data Selling Price short value renders as a content-hugging number with a transparent idle background', { raw: shortSellingRaw, visual: shortSellingVisual })
  await hover(sellingNumber, 180)
  const shortSellingFastHeader = await selectedHeaderValue()
  const shortSellingHoverVisual = await selectedNumberVisual(sellingNumber)
  verify(shortSellingFastHeader === metadataHeaderBefore && contentHugsNumber(shortSellingHoverVisual)
    && shortSellingHoverVisual.contentBackground === 'rgb(233, 238, 244)'
    && !hasPointerBlueRing(shortSellingHoverVisual),
    'Master Data Selling Price direct hover uses shared #E9EEF4 without changing Header before 350 ms or showing a pointer blue ring', { before: metadataHeaderBefore, after: shortSellingFastHeader, visual: shortSellingHoverVisual })
  await moveAway()
  await hover(sellingNumber, 430)
  const shortSellingPreview = await selectedHeaderValue()
  const shortSellingPreviewVisual = await selectedNumberVisual(sellingNumber)
  verify(Math.abs(parseHeaderNumeric(shortSellingPreview) - shortSellingRaw) < 1e-7
    && contentHugsNumber(shortSellingPreviewVisual)
    && !hasPointerBlueRing(shortSellingPreviewVisual),
    'Master Data Selling Price dwell over 350 ms previews its raw value while the rendered background hugs its number', { raw: shortSellingRaw, preview: shortSellingPreview, visual: shortSellingPreviewVisual })
  await moveAway()
  verify(await selectedHeaderValue() === metadataHeaderBefore, 'leaving Master Data Selling Price preview restores the earlier Header state', { before: metadataHeaderBefore, after: await selectedHeaderValue() })
  await click(sellingNumber)
  const shortSellingPin = await selectedHeaderValue()
  const shortSellingPinnedVisual = await selectedNumberVisual(sellingNumber)
  verify(Math.abs(parseHeaderNumeric(shortSellingPin) - shortSellingRaw) < 1e-7
    && await evaluate(`(${visibleExpression(sellingNumber)})?.getAttribute('aria-pressed')==='true'`)
    && contentHugsNumber(shortSellingPinnedVisual)
    && shortSellingPinnedVisual.contentBackground === 'rgb(219, 234, 254)'
    && !hasPointerBlueRing(shortSellingPinnedVisual),
    'clicking Master Data Selling Price pins it with a content-sized background and no pointer blue ring', { raw: shortSellingRaw, pin: shortSellingPin, visual: shortSellingPinnedVisual })
  await click('button[aria-label="Sizing"]')
  await waitFor(() => existsVisible('[role="dialog"]'), 'Master Data Sizing dialog opened by its actual control')
  verify(await selectedHeaderValue() === shortSellingPin, 'clicking the real Master Data Sizing control preserves the metadata pin', { pin: shortSellingPin, after: await selectedHeaderValue() })
  await pressKey('Escape')
  await waitFor(() => evaluate('!document.querySelector("[role=\\"dialog\\"]")'), 'Master Data Sizing dialog closed by Escape')

  const sgaRaw = await rawNumericValue(sgaNumber)
  const sgaVisual = await selectedNumberVisual(sgaNumber)
  verify(Number.isFinite(sgaRaw) && Math.abs(sgaRaw - 7.2) < 1e-8 && contentHugsNumber(sgaVisual),
    'Master Data SG&A metadata is an active content-hugging SelectedNumber source', { raw: sgaRaw, visual: sgaVisual })
  await hover(sgaNumber, 180)
  const sgaFastHeader = await selectedHeaderValue()
  verify(sgaFastHeader === shortSellingPin, 'Master Data SG&A hover under 350 ms leaves the Selling Price pin active', { pin: shortSellingPin, after: sgaFastHeader })
  await moveAway()
  await hover(sgaNumber, 430)
  const sgaPreview = await selectedHeaderValue()
  const sgaPreviewVisual = await selectedNumberVisual(sgaNumber)
  verify(Math.abs(parseHeaderNumeric(sgaPreview) - sgaRaw) < 1e-7 && contentHugsNumber(sgaPreviewVisual)
    && !hasPointerBlueRing(sgaPreviewVisual),
    'Master Data SG&A dwell over 350 ms previews its raw value with no pointer blue ring', { raw: sgaRaw, preview: sgaPreview, visual: sgaPreviewVisual })
  await moveAway()
  verify(await selectedHeaderValue() === shortSellingPin, 'leaving Master Data SG&A preview restores the Selling Price pin', { pin: shortSellingPin, after: await selectedHeaderValue() })
  await click(sgaNumber)
  const sgaPin = await selectedHeaderValue()
  verify(Math.abs(parseHeaderNumeric(sgaPin) - sgaRaw) < 1e-7
    && await evaluate(`(${visibleExpression(sgaNumber)})?.getAttribute('aria-pressed')==='true'`),
    'clicking Master Data SG&A moves the pin from Selling Price to SG&A', { sellingPricePin: shortSellingPin, sgaPin })
  await click(sgaNumber)
  verify(await selectedHeaderValue() === '—'
    && await evaluate(`(${visibleExpression(sgaNumber)})?.getAttribute('aria-pressed')==='false'`),
    'clicking the same Master Data SG&A value again unpins it', { after: await selectedHeaderValue() })
  await click(sellingNumber)
  verify(await selectedHeaderValue() !== '—', 'Master Data Selling Price can be pinned again after SG&A unpins')
  await click(sellingNumber)
  verify(await selectedHeaderValue() === '—', 'clicking the same Master Data Selling Price value again unpins it', { after: await selectedHeaderValue() })

  await click(metadataSwitch)
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "true"'), 'Master Data metadata Edit mode for long value fixture')
  const longSelling = await replaceInput(sellingInput, '123456789.123456')
  if (longSelling !== '123456789.123456') throw new Error(`Master Data Selling Price editor did not retain the long value: ${longSelling}`)
  await click(metadataSwitch)
  await waitFor(() => evaluate('document.querySelector("section[aria-label=\\"Working dataset controls\\"] button[role=\\"switch\\"]")?.getAttribute("aria-checked") === "false"'), 'Master Data metadata View mode with long value')
  await waitFor(() => selectedHeaderValue().then(value => value === '—'), 'long Master Data metadata view begins without a stale editor focus')
  await waitFor(() => existsVisible(sellingNumber), 'long Master Data Selling Price SelectedNumber source')
  const longSellingRaw = await rawNumericValue(sellingNumber)
  const longSellingVisual = await selectedNumberVisual(sellingNumber)
  verify(Number.isFinite(longSellingRaw) && Math.abs(longSellingRaw - 123456789.123456) < 1e-6
    && longSellingVisual.text === '123456789.12'
    && contentHugsNumber(longSellingVisual)
    && longSellingVisual.button.width > shortSellingVisual.button.width,
    'Master Data Selling Price long value remains content-sized and grows only with its rendered number', { raw: longSellingRaw, shortWidth: shortSellingVisual.button.width, visual: longSellingVisual })
  await hover(sellingNumber, 430)
  const longSellingPreview = await selectedHeaderValue()
  const longSellingHoverVisual = await selectedNumberVisual(sellingNumber)
  verify(Math.abs(parseHeaderNumeric(longSellingPreview) - longSellingRaw) < 1e-7
    && contentHugsNumber(longSellingHoverVisual)
    && !hasPointerBlueRing(longSellingHoverVisual),
    'long Master Data Selling Price hover preview keeps its number-sized background and has no pointer blue ring', { raw: longSellingRaw, preview: longSellingPreview, visual: longSellingHoverVisual })
  await moveAway()
  await click(sellingNumber)
  const longSellingPin = await selectedHeaderValue()
  const longSellingPinnedVisual = await selectedNumberVisual(sellingNumber)
  verify(Math.abs(parseHeaderNumeric(longSellingPin) - longSellingRaw) < 1e-7
    && contentHugsNumber(longSellingPinnedVisual)
    && !hasPointerBlueRing(longSellingPinnedVisual),
    'long Master Data Selling Price click pins the raw value without a pointer blue ring', { raw: longSellingRaw, pin: longSellingPin, visual: longSellingPinnedVisual })
  await click(sellingNumber)
  verify(await selectedHeaderValue() === '—', 'long Master Data Selling Price can be unpinned by clicking it again')
  // Source inventory (`rg -n "SelectedNumber|data-selected-number" src/features/simulation`)
  // found no active Simulation callers, so the browser fixture does not invent one.

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
  const readCandidateGroupVisual = (type, id) => evaluate(`(()=>{
    const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(${JSON.stringify(`${type} Candidate findings`)}))
    const main=[...(table?.querySelectorAll('tbody tr[data-candidate-reorder-row]')??[])].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(id)})
    const detailRows=[];let next=main?.nextElementSibling
    while(next&&!next.hasAttribute('data-candidate-reorder-row')){if(next.querySelector('th[scope="row"]'))detailRows.push(next);next=next.nextElementSibling}
    const rowStyle=row=>{if(!row)return null;const style=getComputedStyle(row),rect=row.getBoundingClientRect();return{background:style.backgroundColor,borderTop:style.borderTopWidth,borderBottom:style.borderBottomWidth,width:rect.width,backgroundImage:style.backgroundImage,backgroundSize:style.backgroundSize,backgroundPosition:style.backgroundPosition,backgroundRepeat:style.backgroundRepeat,cells:[...row.children].map(cell=>{const style=getComputedStyle(cell);return{top:style.borderTopWidth,bottom:style.borderBottomWidth}})}}
    const point=element=>{const rect=element?.getBoundingClientRect();return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null}
    return main?{expanded:main.getAttribute('aria-expanded'),selected:main.getAttribute('aria-selected'),main:rowStyle(main),mainPoint:point(main.querySelector('th[scope="row"]')),details:detailRows.map(row=>({...rowStyle(row),label:row.querySelector('th[scope="row"]')?.innerText.trim()??null,point:point(row.querySelector('th[scope="row"]'))}))}:null
  })()`)
  const verifyExpandedCandidateGroupVisual = async (type, id) => {
    await moveAway()
    const group = await readCandidateGroupVisual(type, id)
    const mainPoint = group?.mainPoint
    const detailPoint = group?.details?.[0]?.point
    if (mainPoint) { await mouse('mouseMoved', mainPoint.x, mainPoint.y); await delay(180) }
    const mainHover = await readCandidateGroupVisual(type, id)
    if (detailPoint) { await mouse('mouseMoved', detailPoint.x, detailPoint.y); await delay(180) }
    const detailHover = await readCandidateGroupVisual(type, id)
    const firstDetailHasNoInset = group?.details?.[0]?.cells?.every(cell => cell.top === '0px')
      && group.details[0].backgroundImage === 'none'
    const insetRows = group?.details?.slice(1) ?? []
    const insetGeometry = insetRows.length === 2 && insetRows.every(row =>
      row.cells.every(cell => cell.top === '0px')
      && row.backgroundImage !== 'none'
      && row.backgroundSize === '92% 1px'
      && ['50% 0%', 'center top'].includes(row.backgroundPosition)
      && row.backgroundRepeat === 'no-repeat'
      && row.width > 0)
    const insetGutters = insetRows.map(row => ({ left: row.width * 0.04, right: row.width * 0.04, historicalLeft: row.width * 0.04 }))
    const inset = firstDetailHasNoInset && insetGeometry && insetGutters.every(gutter =>
      Math.abs(gutter.left - gutter.right) <= 0.25
      && Math.abs(gutter.left - gutter.historicalLeft) <= 0.25)
    const fullEnd = group?.details?.at(-1)?.cells?.every(cell => cell.bottom === '1px')
    const mainSelectionStyle = group?.selected === 'true'
      ? group.main.background !== 'rgb(255, 255, 255)'
      : group?.selected === 'false' && group.main.background === 'rgb(255, 255, 255)'
    const mainHoverWorks = group?.selected === 'true'
      ? mainHover?.main?.background !== group.main.background && mainHover?.main?.background !== 'rgb(255, 255, 255)'
      : mainHover?.main?.background === 'rgb(248, 250, 252)'
    verify(Boolean(group?.expanded === 'true' && mainSelectionStyle && group.main.borderBottom === '1px'
      && group.details.every(row => row.background === 'rgb(255, 255, 255)')
      && inset && fullEnd
      && mainHoverWorks && mainHover?.selected === group.selected
      && detailHover?.main?.background === group.main.background && detailHover?.selected === group.selected
      && detailHover?.details?.every(row => row.background === 'rgb(255, 255, 255)')),
      `${type} expanded Candidate renders FULL main/detail boundaries, symmetric historical-size detail insets, white no-hover details, and main-row hover`,
      { group, mainHover: mainHover?.main?.background, detailHover: { main: detailHover?.main?.background, details: detailHover?.details?.map(row => row.background) }, firstDetailHasNoInset, insetGeometry, insetGutters, inset, fullEnd })
  }
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
  let colorPair = ['Reference', 'Current']
  let colorPairGap = await rawNumericValue(subheaderNumber)
  if (Math.abs(colorPairGap) < 0.00005) {
    colorPair = ['Current', 'Custom']
    await setPair(...colorPair)
    colorPairGap = await rawNumericValue(subheaderNumber)
  }
  if (!Number.isFinite(colorPairGap) || Math.abs(colorPairGap) < 0.00005) throw new Error(`The CBD fixture has no non-neutral Standard Cost Gap for a sign-color browser check: ${colorPairGap}`)
  const readSubheaderForeground = () => evaluate(`(()=>{const button=${visibleExpression(subheaderNumber)};return button?getComputedStyle(button).color:null})()`)
  const positivePair = colorPairGap > 0 ? colorPair : [...colorPair].reverse()
  await setPair(...positivePair)
  const positiveGap = await rawNumericValue(subheaderNumber)
  const positiveForeground = await readSubheaderForeground()
  verify(positiveGap > 0.00005 && positiveForeground === 'rgb(225, 29, 72)',
    'positive Standard Cost Gap keeps the historical rose/red foreground on its SelectedNumber', { gap: positiveGap, foreground: positiveForeground })
  await setPair(...[...positivePair].reverse())
  const negativeGap = await rawNumericValue(subheaderNumber)
  const negativeForeground = await readSubheaderForeground()
  verify(negativeGap < -0.00005 && negativeForeground === 'rgb(5, 150, 105)',
    'negative Standard Cost Gap keeps the historical emerald/green foreground on its SelectedNumber', { gap: negativeGap, foreground: negativeForeground })
  await setPair('Reference', 'Reference')
  const neutralGap = await rawNumericValue(subheaderNumber)
  const neutralForeground = await readSubheaderForeground()
  verify(Math.abs(neutralGap) < 0.00005 && neutralForeground === 'rgb(148, 163, 184)',
    'zero Standard Cost Gap keeps the historical neutral foreground on its SelectedNumber', { gap: neutralGap, foreground: neutralForeground })
  await setPair('Reference', 'Current')
  const subheaderBefore = await headerValue()
  const subheaderRectIdle = await measureRect(subheaderNumber)
  const subheaderVisualIdle = await selectedNumberVisual(subheaderNumber)
  verify(contentHugsNumber(subheaderVisualIdle) && subheaderVisualIdle.contentBackground === 'rgba(0, 0, 0, 0)',
    'Cost Breakdown Standard Cost Gap idle background hugs its rendered number', subheaderVisualIdle)
  await hover(subheaderNumber, 180)
  const fastHeader = await headerValue()
  const subheaderRectFast = await measureRect(subheaderNumber)
  const subheaderVisualFast = await selectedNumberVisual(subheaderNumber)
  verify(fastHeader === subheaderBefore && contentHugsNumber(subheaderVisualFast)
    && subheaderVisualFast.contentBackground === 'rgb(233, 238, 244)' && !hasPointerBlueRing(subheaderVisualFast),
    'Cost Breakdown subheader direct hover uses shared #E9EEF4 without previewing before 350 ms or showing a pointer blue ring', { before: subheaderBefore, after: fastHeader, visual: subheaderVisualFast })
  await moveAway()
  await hover(subheaderNumber, 430)
  const subheaderPreview = await headerValue()
  const subheaderRectPreview = await measureRect(subheaderNumber)
  const subheaderVisualPreview = await selectedNumberVisual(subheaderNumber)
  const chartAfterSubheaderPreview = await chartSnapshot()
  verify(subheaderPreview !== '—' && subheaderPreview !== subheaderBefore && contentHugsNumber(subheaderVisualPreview)
    && !hasPointerBlueRing(subheaderVisualPreview), 'subheader dwell over 350 ms previews the raw Standard Cost Gap with no pointer blue ring', { value: subheaderPreview, visual: subheaderVisualPreview })
  const rawSubheader = await rawNumericValue(subheaderNumber)
  const subheaderSourceEvidence = await evaluate(`(()=>{const b=${visibleExpression(subheaderNumber)};return b?{display:b.innerText.trim(),aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed')}:null})()`)
  verify(Number.isFinite(rawSubheader) && Math.abs(rawSubheader - Number(subheaderPreview.replaceAll(',', ''))) < 1e-7,
    'Header preview represents the raw React value from the subheader SelectedNumber source', { raw: rawSubheader, preview: subheaderPreview, source: subheaderSourceEvidence })
  await moveAway()
  verify(await headerValue() === '—', 'leaving an unpinned subheader preview restores the empty Header state', { value: await headerValue() })
  await click(subheaderNumber)
  const pinnedSubheader = await headerValue()
  const subheaderRectPinned = await measureRect(subheaderNumber)
  const subheaderVisualPinned = await selectedNumberVisual(subheaderNumber)
  const chartAfterSubheaderPin = await chartSnapshot()
  verify(pinnedSubheader !== '—' && await evaluate(`(${visibleExpression(subheaderNumber)})?.getAttribute('aria-pressed')==='true'`),
    'click pins the subheader SelectedNumber value', { value: pinnedSubheader })
  verify(contentHugsNumber(subheaderVisualPinned) && subheaderVisualPinned.contentBackground === 'rgb(219, 234, 254)' && !hasPointerBlueRing(subheaderVisualPinned),
    'subheader pin background hugs its number and does not show a pointer blue ring', subheaderVisualPinned)
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
    const visualIdle = await selectedNumberVisual(selector)
    const source = await evaluate(`(()=>{const e=${visibleExpression(selector)};return e?{label:e.getAttribute('aria-label'),text:e.innerText.trim(),title:e.getAttribute('title')}:null})()`)
    const previousPin = await headerValue()
    await hover(selector, 430)
    const preview = await headerValue()
    const rectPreview = await measureRect(selector)
    const visualPreview = await selectedNumberVisual(selector)
    const raw = await rawNumericValue(selector)
    verify(Number.isFinite(raw) && Math.abs(parseHeaderNumeric(preview) - raw) < 1e-7,
      `${panel} ${category} source previews its raw numeric value in Header`, { source, raw, preview })
    verify(contentHugsNumber(visualIdle) && contentHugsNumber(visualPreview) && !hasPointerBlueRing(visualPreview),
      `${panel} ${category} normal and hover backgrounds hug the rendered number without a pointer blue ring`, { idle: visualIdle, preview: visualPreview })
    await moveAway()
    verify(await headerValue() === previousPin, `${panel} ${category} hover leaves the prior pin intact`, { previousPin, restored: await headerValue() })
    await click(selector)
    const pinned = await headerValue()
    const rectPinned = await measureRect(selector)
    const visualPinned = await selectedNumberVisual(selector)
    const pressed = await evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-pressed')==='true'`)
    verify(pressed && Number.isFinite(raw) && Math.abs(parseHeaderNumeric(pinned) - raw) < 1e-7,
      `${panel} ${category} source can be pinned from the real UI`, { source, raw, pinned, pressed })
    verify(contentHugsNumber(visualPinned) && !hasPointerBlueRing(visualPinned),
      `${panel} ${category} pin background hugs the number and does not show a pointer blue ring`, visualPinned)
    verify([rectPreview, rectPinned].every(rect=>rect&&rect.width===rectIdle?.width&&rect.height===rectIdle?.height),
      `${panel} ${category} hover and pin rings do not change source dimensions`, { idle: rectIdle, preview: rectPreview, pinned: rectPinned })
    await click(selector)
    verify(await headerValue() === '—' && await evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-pressed')==='false'`),
      `${panel} ${category} source unpins when the same value is clicked again`, { after: await headerValue() })
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
  const detailsCell = `${firstRow} td:last-child`
  await moveAway()
  await screenshot('cbd-candidates-collapsed')
  const collapsedGroupIds = await evaluate(`(()=>Object.fromEntries(['Bill of Material','Routing'].map(type=>{
    const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(type+' Candidate findings'))
    const row=[...(table?.querySelectorAll('tbody tr[data-candidate-reorder-row][aria-expanded="false"]')??[])].find(item=>item.querySelector('td:nth-child(3)')?.innerText.trim()==='CHANGED'&&item.getAttribute('aria-selected')==='false')
    return [type,row?.getAttribute('data-candidate-reorder-row')??null]
  })))()`)
  verify(Boolean(collapsedGroupIds['Bill of Material'] && collapsedGroupIds.Routing), 'collapsed Candidate fixture has unselected CHANGED BOM and Routing records', collapsedGroupIds)
  for (const type of ['Bill of Material','Routing']) {
    const collapsed = await readCandidateGroupVisual(type, collapsedGroupIds[type])
    const point = collapsed?.mainPoint
    if (point) { await mouse('mouseMoved', point.x, point.y); await delay(180) }
    const hovered = await readCandidateGroupVisual(type, collapsedGroupIds[type])
    verify(Boolean(collapsed?.expanded==='false' && collapsed.selected==='false'
      && collapsed.main?.background==='rgb(255, 255, 255)' && collapsed.main.borderBottom==='1px'
      && hovered?.main?.background==='rgb(248, 250, 252)'),
      `collapsed ${type} Candidate has a full-width group boundary and main-row-only neutral hover`, { collapsed, hovered: hovered?.main })
    await moveAway()
  }
  const candidateInitial = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded'),number:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-label')??null}:null})()`)
  const rowAffordance = await evaluate(`(()=>{const row=${visibleExpression(firstRow)};const cell=row?.querySelector('td:last-child');return row&&cell?{rowTabIndex:row.getAttribute('tabindex'),rowLabel:row.getAttribute('aria-label'),cellButtons:cell.querySelectorAll('button').length,cellFocusable:cell.querySelectorAll('a,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])').length,cellHasTitle:cell.hasAttribute('title'),cellTitles:[...cell.querySelectorAll('[title]')].map(e=>e.getAttribute('title')),cellAriaHidden:cell.querySelector('span[aria-hidden="true"]')!==null,cellSvgCount:cell.querySelectorAll('svg').length}:null})()`)
  verify(rowAffordance?.rowTabIndex === '0' && rowAffordance.cellButtons === 0 && rowAffordance.cellFocusable === 0
    && !rowAffordance.cellHasTitle && rowAffordance.cellTitles.length === 0 && rowAffordance.cellSvgCount > 0 && rowAffordance.cellAriaHidden,
    'CHANGED Candidate chevron is visual only with no button, focus target, title, or independent accessibility entry', rowAffordance)
  const rowNameSelector = `${firstRow} th[scope="row"]`
  await click(rowNameSelector)
  const clickedRowExpanded = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
  verify(clickedRowExpanded === 'true', 'clicking the CHANGED Candidate row expands its details', { expanded: clickedRowExpanded })
  await click(rowNameSelector)
  verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')==='false'`), 'clicking the CHANGED Candidate row again collapses its details')
  const rowFocused = await evaluate(`(()=>{const row=${visibleExpression(firstRow)};row?.focus();return row===document.activeElement})()`)
  verify(rowFocused, 'CHANGED Candidate row itself is keyboard focusable for detail expansion')
  await pressKey('Enter')
  const enterExpanded = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
  await pressKey('Enter')
  const enterCollapsed = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
  verify(enterExpanded === 'true' && enterCollapsed === 'false', 'Enter expands and collapses the focused CHANGED Candidate row', { expanded: enterExpanded, collapsed: enterCollapsed })
  await pressKey(' ')
  const spaceExpanded = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
  await pressKey(' ')
  const spaceCollapsed = await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')??null`)
  verify(spaceExpanded === 'true' && spaceCollapsed === 'false', 'Space expands and collapses the focused CHANGED Candidate row', { expanded: spaceExpanded, collapsed: spaceCollapsed })
  await evaluate(`(${visibleExpression(firstRow)})?.focus()`)
  await pressKey('Tab')
  await pressKey('Tab')
  const candidateKeyboardVisual = await selectedNumberVisual(candidateNumber)
  verify(await evaluate(`document.activeElement===${visibleExpression(candidateNumber)}`)
    && candidateKeyboardVisual?.focusVisible && candidateKeyboardVisual.boxShadow !== 'none',
    'Tab focus keeps the Candidate SelectedNumber keyboard focus ring visible', candidateKeyboardVisual)
  await evaluate('document.activeElement?.blur()')
  await click(candidateSelectorButton)
  const hashOnly = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded')}:null})()`)
  verify(hashOnly?.selected === 'true' && hashOnly.expanded === 'false' && await headerValue() === '—',
    '# row selector selects independently and does not publish a numeric Header value', { row: hashOnly, header: await headerValue() })
  await click(candidateSelectorButton)
  verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-selected')==='false'`), '# row selector can clear its own selection without activating a Header value')
  const nonChangedRows = await evaluate(`(()=>['ADDED','REMOVED','UNCHANGED'].map(status=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(item=>item.querySelector('td:nth-child(3)')?.innerText.trim()===status);return row?{id:row.getAttribute('data-candidate-reorder-row'),status}:null}).filter(Boolean))()`)
  verify(nonChangedRows.map(row => row.status).join('|') === 'ADDED|REMOVED|UNCHANGED',
    'fixture exposes ADDED, REMOVED, and UNCHANGED Candidate rows for the CHANGED-only expansion check', nonChangedRows)
  for (const nonChanged of nonChangedRows) {
    const candidateLabelSelector = `tr[data-candidate-reorder-row=${JSON.stringify(nonChanged.id)}] th[scope="row"]`
    await click(candidateLabelSelector)
    const rowAfterLabel = await evaluate(`(()=>{const r=${visibleExpression(`tr[data-candidate-reorder-row=${JSON.stringify(nonChanged.id)}]`)};return r?{status:r.querySelector('td:nth-child(3)')?.innerText.trim(),expanded:r.getAttribute('aria-expanded')}:null})()`)
    verify(rowAfterLabel?.status === nonChanged.status && rowAfterLabel.expanded === null && await headerValue() === '—',
      `clicking a ${nonChanged.status} Candidate row label does not expand the row or change Header`, { before: nonChanged, after: rowAfterLabel, header: await headerValue() })
  }
  const controlExclusions = await evaluate(`(()=>({hashHasSelectedNumber:!!document.querySelector('tr[data-candidate-reorder-row] td:first-child button[data-selected-number]'),filterHasSelectedNumber:!!document.querySelector('[aria-label="Finding type filter"] [data-selected-number]'),dashButtons:[...document.querySelectorAll('button[data-selected-number="true"]')].filter(e=>e.innerText.trim()==='—').length,dashSpans:[...document.querySelectorAll('span')].filter(e=>e.innerText.trim()==='—'&&e.closest('[data-selected-number="true"]')).length,filterCount:[...document.querySelectorAll('[aria-label="Finding type filter"] button')].map(e=>e.innerText.trim())}))()`)
  verify(!controlExclusions.hashHasSelectedNumber && !controlExclusions.filterHasSelectedNumber && controlExclusions.dashButtons === 0 && controlExclusions.dashSpans === 0,
    'row numbers, filter counts, and unavailable em dashes stay outside SelectedNumber sources', controlExclusions)
  if (await existsVisible(candidateNumber)) {
    const candidateRectIdle = await measureRect(candidateNumber)
    const candidateVisualIdle = await selectedNumberVisual(candidateNumber)
    await click(candidateNumber)
    const candidateRectPinned = await measureRect(candidateNumber)
    const candidateVisualPinned = await selectedNumberVisual(candidateNumber)
    const candidateAfterValue = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded'),pinned:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-pressed')}:null})()`)
    verify(candidateAfterValue?.selected === candidateInitial.selected && candidateAfterValue?.expanded === 'false' && candidateAfterValue?.pinned === 'true',
      'clicking a Candidate numeric value pins it without selecting or expanding its row', { before: candidateInitial, after: candidateAfterValue })
    verify(contentHugsNumber(candidateVisualIdle) && contentHugsNumber(candidateVisualPinned)
      && candidateVisualPinned.contentBackground === 'rgb(219, 234, 254)' && !hasPointerBlueRing(candidateVisualPinned),
      'Candidate number background hugs its rendered text in normal and pinned states without a pointer blue ring', { idle: candidateVisualIdle, pinned: candidateVisualPinned })
    const firstCandidatePin = await headerValue()
    verify(candidateRectIdle?.width === candidateRectPinned?.width && candidateRectIdle?.height === candidateRectPinned?.height,
      'Candidate selected ring does not change source layout height or width', { idle: candidateRectIdle, pinned: candidateRectPinned })
    await click(candidateNumber)
    const candidateUnpinnedHeader = await headerValue()
    const candidateUnpinnedState = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{selected:r.getAttribute('aria-selected'),expanded:r.getAttribute('aria-expanded'),pressed:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-pressed')}:null})()`)
    verify(candidateUnpinnedHeader === '—' && candidateUnpinnedState?.pressed === 'false'
      && candidateUnpinnedState?.selected === candidateInitial.selected && candidateUnpinnedState?.expanded === 'false',
      'clicking the same Candidate value unpins only and neither expands nor selects the row', { header: candidateUnpinnedHeader, row: candidateUnpinnedState })
    await moveAway()
    const rowWhitespaceForHover = await cellWhitespacePoint(candidateNumber)
    if (!rowWhitespaceForHover) throw new Error('Candidate numeric cell has no visible whitespace for independent row-hover verification')
    await mouse('mouseMoved', rowWhitespaceForHover.x, rowWhitespaceForHover.y)
    await delay(100)
    const rowWhitespaceHover = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};const values=[...r.querySelectorAll('[data-selected-number="true"]')];return {rowHovered:r.matches(':hover'),rowBackground:getComputedStyle(r).backgroundColor,numberBackgrounds:values.map(value=>getComputedStyle(value.firstElementChild).backgroundColor)}})()`)
    verify(rowWhitespaceHover?.rowHovered && rowWhitespaceHover.rowBackground === 'rgb(248, 250, 252)'
      && rowWhitespaceHover.numberBackgrounds.length > 0
      && rowWhitespaceHover.numberBackgrounds.every(background => background === 'rgba(0, 0, 0, 0)'),
      'hovering Candidate row whitespace keeps every SelectedNumber transparent', rowWhitespaceHover)
    const candidateNumberPoint = await center(candidateNumber)
    await mouse('mouseMoved', candidateNumberPoint.x, candidateNumberPoint.y)
    await delay(100)
    const directCandidateHover = await selectedNumberVisual(candidateNumber)
    const directCandidateHoverState = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};const direct=${visibleExpression(candidateNumber)};const values=[...r.querySelectorAll('[data-selected-number="true"]')];return {rowHovered:r.matches(':hover'),rowBackground:getComputedStyle(r).backgroundColor,numberBackgrounds:values.map(value=>({direct:value===direct,background:getComputedStyle(value.firstElementChild).backgroundColor}))}})()`)
    verify(directCandidateHoverState?.rowHovered && directCandidateHoverState.rowBackground === 'rgb(248, 250, 252)'
      && directCandidateHover?.contentBackground === 'rgb(233, 238, 244)'
      && directCandidateHoverState.numberBackgrounds.filter(value => !value.direct).every(value => value.background === 'rgba(0, 0, 0, 0)'),
      'direct Candidate number hover alone uses shared #E9EEF4 while row hover remains active', { visual: directCandidateHover, state: directCandidateHoverState })
    await mouse('mouseMoved', rowWhitespaceForHover.x, rowWhitespaceForHover.y)
    await delay(100)
    const numberLeaveState = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};const values=[...r.querySelectorAll('[data-selected-number="true"]')];return {rowHovered:r.matches(':hover'),rowBackground:getComputedStyle(r).backgroundColor,numberBackgrounds:values.map(value=>getComputedStyle(value.firstElementChild).backgroundColor)}})()`)
    verify(numberLeaveState?.rowHovered && numberLeaveState.rowBackground === 'rgb(248, 250, 252)'
      && numberLeaveState.numberBackgrounds.every(background => background === 'rgba(0, 0, 0, 0)'),
      'leaving Candidate number for row whitespace clears Number Hover but keeps Row Hover', numberLeaveState)
    await moveAway()
    await click(candidateNumber)
    const candidatePinA = await headerValue()
    verify(candidatePinA === firstCandidatePin && await evaluate(`(${visibleExpression(candidateNumber)})?.getAttribute('aria-pressed')==='true'`),
      'Candidate value A can be pinned again after same-value unpin', { pin: candidatePinA })
    const toggleThroughWhitespace = async (selector, label) => {
      const openPoint = await cellWhitespacePoint(selector)
      if (!openPoint) throw new Error(`No visible whitespace around the ${label} control`)
      await clickPoint(openPoint)
      const opened = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{expanded:r.getAttribute('aria-expanded'),selected:r.getAttribute('aria-selected'),pinned:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-pressed')}:null})()`)
      verify(opened?.expanded === 'true' && opened.selected === candidateInitial.selected && opened.pinned === 'true'
        && await headerValue() === candidatePinA,
        `CHANGED Candidate ${label} cell whitespace expands and preserves the active Pin`, { opened, pin: await headerValue() })
      const closePoint = await cellWhitespacePoint(selector)
      if (!closePoint) throw new Error(`No visible whitespace around the ${label} control after expansion`)
      await clickPoint(closePoint)
      const closed = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};return r?{expanded:r.getAttribute('aria-expanded'),selected:r.getAttribute('aria-selected'),pinned:r.querySelector('[data-selected-number="true"]')?.getAttribute('aria-pressed')}:null})()`)
      verify(closed?.expanded === 'false' && closed.selected === candidateInitial.selected && closed.pinned === 'true'
        && await headerValue() === candidatePinA,
        `CHANGED Candidate ${label} cell whitespace collapses and preserves the active Pin`, { closed, pin: await headerValue() })
    }
    await toggleThroughWhitespace(`${firstRow} td:last-child`, 'ordinary row')
    await toggleThroughWhitespace(candidateNumber, 'numeric')
    await toggleThroughWhitespace(candidateSelectorButton, '# selector')
    await toggleThroughWhitespace(`${firstRow} button[draggable="true"]`, 'reorder')
    const candidateB = await evaluate(`(()=>{const rows=[...document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="false"]')];const row=rows.find(e=>e.getAttribute('data-candidate-reorder-row')!==${JSON.stringify(firstChanged.rowId)});const button=row?.querySelector('[data-selected-number="true"]');if(!row||!button)return null;const r=button.getBoundingClientRect();return {id:row.getAttribute('data-candidate-reorder-row'),label:button.getAttribute('aria-label'),x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()`)
    if (candidateB) {
      await mouse('mouseMoved', candidateB.x, candidateB.y); await delay(430)
      const hoverB = await headerValue()
      const visualBHover = await selectedNumberVisual(`tr[data-candidate-reorder-row=${JSON.stringify(candidateB.id)}] button[data-selected-number="true"]`)
      verify(hoverB !== candidatePinA, 'Candidate value B preview temporarily replaces pinned Candidate value A', { valueA: candidatePinA, valueB: hoverB, candidateB: candidateB.label })
      verify(contentHugsNumber(visualBHover) && !hasPointerBlueRing(visualBHover),
        'Candidate value B hover background hugs its rendered text and has no pointer blue ring', visualBHover)
      await moveAway()
      verify(await headerValue() === candidatePinA, 'leaving Candidate value B restores pinned Candidate value A', { restored: await headerValue(), valueA: candidatePinA })
    const candidateRectB = await evaluate(`(()=>{const r=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(candidateB.id)});const e=r?.querySelector('[data-selected-number="true"]');if(!e)return null;const b=e.getBoundingClientRect();return {width:b.width,height:b.height}})()`)
      verify(candidateRectB?.width === candidateB.width && candidateRectB?.height === candidateB.height,
        'Candidate value B hover ring does not change its layout dimensions', { before: { width: candidateB.width, height: candidateB.height }, after: candidateRectB })
      const candidateBSelector = `tr[data-candidate-reorder-row=${JSON.stringify(candidateB.id)}] button[data-selected-number="true"]`
      await click(candidateBSelector)
      const candidatePinB = await headerValue()
      verify(candidatePinB !== candidatePinA
        && await evaluate(`(${visibleExpression(candidateBSelector)})?.getAttribute('aria-pressed')==='true'`)
        && await evaluate(`(${visibleExpression(candidateNumber)})?.getAttribute('aria-pressed')==='false'`),
        'clicking Candidate value B moves the pin from Candidate value A', { pinA: candidatePinA, pinB: candidatePinB })
      await click(candidateBSelector)
      verify(await headerValue() === '—', 'clicking Candidate value B again unpins the moved pin', { after: await headerValue() })
      await click(candidateNumber)
      verify(await headerValue() === candidatePinA, 'Candidate value A is repinned for control and click-away checks', { pin: await headerValue() })
    } else {
      verify(false, 'Reference → Current exposes a second CHANGED Candidate source for B preview')
    }
    await clickButtonContains('div[aria-label="Finding type filter"] button', 'All')
    verify(await headerValue() === candidatePinA, 'clicking the real Candidate filter control preserves the active numeric pin', { pin: candidatePinA, after: await headerValue() })
    const blankPoint = await evaluate(`(()=>{
      const root=document.querySelector('main#main-content')??document.body;const r=root.getBoundingClientRect();
      const forbidden='a,button,input,select,textarea,[role="button"],[role="menuitem"],[role="dialog"],[role="slider"],[role="tooltip"],[role="spinbutton"],[role="switch"],[role="tab"],[aria-expanded],[aria-haspopup],[data-selected-number],[data-grid-cell="true"],[data-candidate-reorder-row],[role="group"][aria-label="Finding type filter"],[role="group"][aria-label="Filter by comparison status"]';
      const xs=[r.left+2,r.left+Math.min(12,r.width/100),r.right-3,r.left+r.width*.98,r.left+r.width*.5];const ys=[r.top+4,r.top+24,r.top+r.height*.9,r.bottom-4,r.top+r.height*.5];
      for(const y of ys)for(const x of xs){if(x<0||x>=innerWidth||y<0||y>=innerHeight)continue;const target=document.elementFromPoint(x,y);if(target&&root.contains(target)&&!target.closest(forbidden)&&!target.closest('table,section[aria-label="Cost Element"],section[aria-label="Work Center"]'))return {x,y,target:{tag:target.tagName,role:target.getAttribute('role'),label:target.getAttribute('aria-label'),text:target.textContent.trim().slice(0,60)}}}
      return null;
    })()`)
    if (!blankPoint) throw new Error('No visible blank page area was available for the click-away acceptance check')
    await mouse('mouseMoved', blankPoint.x, blankPoint.y); await mouse('mousePressed', blankPoint.x, blankPoint.y); await mouse('mouseReleased', blankPoint.x, blankPoint.y); await delay(180)
    verify(await headerValue() === '—' && await evaluate(`(${visibleExpression(candidateNumber)})?.getAttribute('aria-pressed')==='false'`),
      'clicking a real blank page area clears the Candidate pin', { blankPoint, after: await headerValue() })
    await click(candidateNumber)
    verify(await headerValue() === candidatePinA, 'Candidate pin can be restored after blank-area click-away', { pin: await headerValue() })
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
    await click(detailsCell)
    const expanded = await evaluate(`(()=>{const r=${visibleExpression(firstRow)};if(!r)return null;const rows=[];let next=r.nextElementSibling;while(next&&!next.hasAttribute('data-candidate-reorder-row')){const label=next.querySelector('th[scope="row"]')?.innerText.trim();if(label)rows.push(label);next=next.nextElementSibling}return {expanded:r.getAttribute('aria-expanded'),ariaControls:r.getAttribute('aria-controls'),detailHeaders:rows}})()`)
    const detailOrder = expanded?.detailHeaders
    verify(expanded?.expanded === 'true' && detailOrder?.join('|') === 'Reference|Current|Parameter Cost Effect',
      'visual chevron cell click bubbles to the CHANGED Candidate row and opens three ordered Reference, Current, and Parameter Cost Effect detail rows', expanded)
    await screenshot('cbd-candidate-bom-expanded')
    await verifyExpandedCandidateGroupVisual('Bill of Material', firstChanged.rowId)
    await click(detailsCell)
    verify(await evaluate(`(${visibleExpression(firstRow)})?.getAttribute('aria-expanded')==='false'`), 'visual chevron cell click bubbles to the row and closes its Candidate details')
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
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child`)
  }
  const multiOpenState = await evaluate(`(()=>[...document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="true"]')].map(r=>({id:r.getAttribute('data-candidate-reorder-row'),label:r.getAttribute('aria-label')})))()`)
  verify(multiOpenState.length >= 3, 'multiple BOM and Routing details can remain open together', multiOpenState)
  await screenshot('cbd-candidate-bom-routing-expanded')
  await verifyExpandedCandidateGroupVisual('Bill of Material', multiOpenIds.bom[0])
  await verifyExpandedCandidateGroupVisual('Routing', multiOpenIds.routing[0])
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
        reorder:document.querySelectorAll('tr[data-candidate-reorder-row] td button[draggable="true"][data-selected-number],tr[data-candidate-reorder-row] td button[draggable="true"] [data-selected-number]').length,
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
    && Object.values(numericSurfaceInventory.excluded).slice(0, 8).every(count => count === 0),
    'numeric source inventory covers every real surface and excludes chart, # row selector, status, filter controls, reorder handle, labels, and unavailable dashes', numericSurfaceInventory)
  await click('div[role="group"][aria-label="Cost element color legend"]')
  const afterOutsideClick = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(afterOutsideClick === 0, 'outside click closes all open Candidate details', { afterOutsideClick })
  for (const [type, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Bill of Material', multiOpenIds.bom[1]], ['Routing', multiOpenIds.routing[0]]]) {
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child`)
  }
  const reopenedBeforeEscape = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(reopenedBeforeEscape >= 3, 'multiple BOM and Routing details can be reopened before Escape verification', { reopenedBeforeEscape })
  await pressKey('Escape')
  const afterEscape = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(afterEscape === 0, 'Escape closes all open Candidate details', { afterEscape })
  for (const [type, id] of [['Bill of Material', multiOpenIds.bom[0]], ['Bill of Material', multiOpenIds.bom[1]], ['Routing', multiOpenIds.routing[0]]]) {
    await click(`tr[data-candidate-reorder-row=${JSON.stringify(id)}] td:last-child`)
  }
  const reopenedForCloseOne = await evaluate('document.querySelectorAll("tr[data-candidate-reorder-row][aria-expanded=\\"true\\"]").length')
  verify(reopenedForCloseOne >= 3, 'multiple BOM and Routing details can be reopened before independent close verification', { reopenedForCloseOne })
  const closeOne = `tr[data-candidate-reorder-row=${JSON.stringify(multiOpenIds.bom[0])}] td:last-child`
  await click(closeOne)
  const afterCloseOne = await evaluate(`(()=>{const row=id=>[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(e=>e.getAttribute('data-candidate-reorder-row')===id);return {open:document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="true"]').length,first:row(${JSON.stringify(multiOpenIds.bom[0])})?.getAttribute('aria-expanded'),second:row(${JSON.stringify(multiOpenIds.bom[1])})?.getAttribute('aria-expanded'),routing:row(${JSON.stringify(multiOpenIds.routing[0])})?.getAttribute('aria-expanded')}})()`)
  verify(afterCloseOne.first === 'false' && afterCloseOne.second === 'true' && afterCloseOne.routing === 'true', 'closing one detail leaves the other BOM and Routing details open', afterCloseOne)

  await evaluate(`(()=>{window.__cbdDragEvents=[];for(const type of ['dragstart','dragenter','dragover','drop','dragend']){for(const capture of [true,false])document.addEventListener(type,event=>window.__cbdDragEvents.push({type,phase:capture?'capture':'bubble',target:event.target?.tagName,draggable:event.target?.draggable,id:event.target?.closest?.('[data-candidate-reorder-row]')?.getAttribute('data-candidate-reorder-row')??null,x:event.clientX,y:event.clientY,defaultPrevented:event.defaultPrevented,text:event.dataTransfer?.getData('text/plain')??null}),capture)}})()`)
  const reorderPinTarget = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="false"]')].find(item=>item.querySelector('td:nth-child(3)')?.innerText.trim()==='CHANGED');const button=row?.querySelector('button[data-selected-number="true"]');if(!row||!button)return null;const r=button.getBoundingClientRect();return {id:row.getAttribute('data-candidate-reorder-row'),x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  if (!reorderPinTarget) throw new Error('No CHANGED Candidate SelectedNumber was available to pin during the reorder preservation check')
  const reorderPinSelector = `tr[data-candidate-reorder-row=${JSON.stringify(reorderPinTarget.id)}] button[data-selected-number="true"]`
  await click(reorderPinSelector)
  const reorderPinHeader = await headerValue()
  verify(reorderPinHeader !== '—' && await evaluate(`(${visibleExpression(reorderPinSelector)})?.getAttribute('aria-pressed')==='true'`),
    'Candidate numeric Pin is active before actual reorder input', { id: reorderPinTarget.id, header: reorderPinHeader })
  const reorderSetup = await evaluate(`(()=>{
    const table=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Bill of Material Candidate findings'));
    const rows=[...table.querySelectorAll('tbody tr[data-candidate-reorder-row]')];
    const at=p=>{const e=document.elementFromPoint(p.x,p.y);return e?{tag:e.tagName,draggable:e.draggable,id:e.closest('[data-candidate-reorder-row]')?.getAttribute('data-candidate-reorder-row')??null,handle:e.closest('button[draggable="true"]')!==null}:null};
    const candidates=rows.filter(row=>row.querySelector('td:nth-child(3)')?.innerText.trim()==='CHANGED'&&row.getAttribute('aria-expanded')==='false'&&row.getAttribute('aria-selected')==='false').map(row=>{const handle=row.querySelector('button[draggable="true"]');const r=handle?.getBoundingClientRect();const point=r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;const hit=point?at(point):null;return {row,handle,rect:r,point,hit}}).filter(entry=>entry.rect&&entry.rect.width>0&&entry.rect.height>0&&entry.point.x>=0&&entry.point.x<=innerWidth&&entry.point.y>=0&&entry.point.y<=innerHeight&&entry.hit?.handle&&entry.hit.id===entry.row.getAttribute('data-candidate-reorder-row'));
    const sourceEntry=candidates[0];if(!sourceEntry)return null;
    const sourceIndex=rows.indexOf(sourceEntry.row);
    const targetEntry=rows.filter(row=>row!==sourceEntry.row&&row.getAttribute('aria-selected')==='false').map(row=>{const r=row.getBoundingClientRect();const identity=row.querySelector('th[scope="row"]');const identityRect=identity?.getBoundingClientRect();const insertAfter=rows.indexOf(row)>sourceIndex;const point={x:identityRect.left+identityRect.width/2,y:insertAfter?r.bottom-2:r.top+2};return {row,rect:r,identity,identityRect,point,insertAfter,hit:at(point)}}).find(entry=>entry.identityRect?.width>0&&entry.rect.width>0&&entry.rect.height>0&&entry.point.x>=0&&entry.point.x<=innerWidth&&entry.point.y>=0&&entry.point.y<=innerHeight&&entry.hit?.id===entry.row.getAttribute('data-candidate-reorder-row'));
    if(!targetEntry)return null;
    const main=document.querySelector('main#main-content');
    const rowSummary=row=>({id:row.getAttribute('data-candidate-reorder-row'),label:row.querySelector('th[scope="row"]')?.innerText.trim()??null,status:row.querySelector('td:nth-child(3)')?.innerText.trim()??null,expanded:row.getAttribute('aria-expanded')});
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
    let reordered = await evaluate(`(()=>{const table=[...document.querySelectorAll('table')].find(t=>t.querySelector('caption')?.textContent.includes('Bill of Material Candidate findings'));const rows=[...table.querySelectorAll('tbody tr[data-candidate-reorder-row]')];const source=rows.find(row=>row.getAttribute('data-candidate-reorder-row')===${JSON.stringify(reorderSetup.source)});return {after:rows.map(row=>row.getAttribute('data-candidate-reorder-row')),header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,sourceSelected:source?.getAttribute('aria-selected'),sourceExpanded:source?.getAttribute('aria-expanded')}})()`)
    const finalDragEvents = await evaluate('window.__cbdDragEvents')
    const sawReactDragStart = finalDragEvents.some(event => event.type === 'dragstart' && event.id === reorderSetup.source)
    const sawReactTargetDragOver = finalDragEvents.some(event => event.type === 'dragover' && event.id === reorderSetup.target && event.defaultPrevented)
    const sawReactTargetDrop = finalDragEvents.some(event => event.type === 'drop' && event.id === reorderSetup.target && event.defaultPrevented)
    verify(reordered.after.some((id, index) => id !== reorderSetup.before[index]) && reorderSetup.header === reorderPinHeader
      && reordered.header === reorderPinHeader && reordered.sourceSelected === 'false'
      && reorderSetup.sourceRow.status === 'CHANGED' && reorderSetup.sourceRow.expanded === 'false'
      && reordered.sourceExpanded === 'false'
      && sawReactDragStart && sawReactTargetDragOver && sawReactTargetDrop,
      'actual Candidate drag-and-drop triggers React dragstart, target dragover and drop, reorders a row, and preserves active Pin and selection state', { pin: reorderPinHeader, mechanism: dragMechanism, reactEvents:{sawReactDragStart,sawReactTargetDragOver,sawReactTargetDrop}, before: reorderSetup.before, source: reorderSetup.source, sourceRow: reorderSetup.sourceRow, target: reorderSetup.target, targetRow: reorderSetup.targetRow, setup:{handle:reorderSetup.handle,targetPoint:reorderSetup.targetPoint,viewport:reorderSetup.viewport,mainScrollTop:reorderSetup.mainScrollTop},nativeDragEvents,finalDragEvents,after:reordered })
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
      const candidateNumberGeometry=['Bill of Material','Routing'].flatMap(type=>{const table=[...document.querySelectorAll('table')].find(item=>item.querySelector('caption')?.textContent.includes(type+' Candidate findings'));return [...(table?.querySelectorAll('button[data-selected-number="true"]')??[])].map(button=>{const cell=button.closest('td');const content=button.firstElementChild??button;const range=document.createRange();range.selectNodeContents(content);const text=range.getBoundingClientRect();const b=button.getBoundingClientRect();const c=cell?.getBoundingClientRect();return {type,text:button.innerText.trim(),buttonWidth:b.width,textWidth:text.width,insideCell:Boolean(c&&text.left>=c.left-2&&text.right<=c.right+2),hugsText:text.width>0&&b.width<=text.width+2}})});
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
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,overview:{columns:getComputedStyle(overview).gridTemplateColumns.split(' ').length,template:getComputedStyle(overview).gridTemplateColumns},candidates,candidateNumberGeometry,cost:{header:costHeaders,cells:costCells,footer:costFooterCells,selectedGapButtons:cost?.querySelectorAll('[data-gap-slot="selected"][data-selected-number="true"]').length??0},workCenter:{header:wcHeaderCells,body:wcBodyCells,footer:wcFooterCells,client:wc?.clientHeight??null,scroll:wc?.scrollHeight??null,overflowY:wcStyle?.overflowY??null,rect:wcRect?{left:wcRect.left,top:wcRect.top,width:wcRect.width,height:wcRect.height}:null},summaryScrollers,main:{overflowY:mainStyle?.overflowY??null,client:mainContent?.clientHeight??null,scroll:mainContent?.scrollHeight??null,scrollTop:mainContent?.scrollTop??null},candidateArea:{overflowY:candidateStyle?.overflowY??null,client:candidateArea?.clientHeight??null,scroll:candidateArea?.scrollHeight??null},verticalScrollers};
    })()`)
    const alignCells=(cells,headers)=>cells.map(cell=>({start:cell.start,span:cell.span,delta:Math.abs(cell.width-headers.slice(cell.start,cell.start+cell.span).reduce((sum,header)=>sum+header.width,0))}))
    const candidateDeltas = layout?.candidates?.map(table => ({type:table.type,main:alignCells(table.mainCells,table.headCells),details:table.details.map(row=>({label:row.label,axes:alignCells(row.cells,table.headCells),numericAxes:row.cells.filter(cell=>cell.numericLabel).map(cell=>({label:cell.numericLabel,start:cell.start,span:cell.span,headerLabels:table.headCells.slice(cell.start,cell.start+cell.span).map(header=>header.text)}))}))})) ?? []
    const summaryDeltas={cost:layout?.cost?.header.map((cell,index)=>Math.abs(cell.width-layout.cost.cells[index]?.width))??[],costFooter:layout?.cost?.header.map((cell,index)=>Math.abs(cell.width-layout.cost.footer[index]?.width))??[],wcHeaderBody:layout?.workCenter?.header.map((cell,index)=>Math.abs(cell.width-layout.workCenter.body[index]?.width))??[],wcHeaderFooter:layout?.workCenter?.header.map((cell,index)=>Math.abs(cell.width-layout.workCenter.footer[index]?.width))??[]}
    const candidatesAligned=candidateDeltas.length===2&&candidateDeltas.every(table=>table.main.length===(table.type==='Routing'?12:10)&&table.main.every(cell=>cell.delta<=1.5)&&table.details.length===3&&table.details.every(row=>row.axes.length===table.main.length&&row.axes.every(cell=>cell.delta<=1.5)&&row.numericAxes.length>=(table.type==='Routing'?5:3)+(row.label==='Parameter Cost Effect'?1:0)&&row.numericAxes.every(cell=>cell.start>=3&&cell.start<table.main.length-3&&cell.headerLabels.length===cell.span)))
    const stickyAndScrollOwnership=layout?.candidates?.length===2&&layout.candidates.every(table=>table.stickyPosition==='sticky'&&table.headerViewportOverflow==='hidden'&&table.bodyOverflowX==='auto')
    const summaryColumnsExpected=width>=1024?2:1
    const candidateNumbersAligned=layout?.candidateNumberGeometry?.length>0&&layout.candidateNumberGeometry.every(number=>number.hugsText&&number.insideCell)
    const summaryOverflowExpected=width<=520?layout?.summaryScrollers?.every(panel=>panel.scroll>panel.client&&panel.overflowX==='auto'):true
    const verticalOwnership=layout?.main.overflowY==='auto'&&layout.candidateArea.overflowY==='visible'&&layout.candidateArea.scroll<=layout.candidateArea.client+2&&layout.workCenter.overflowY==='auto'&&layout.verticalScrollers.length===0
    verify(Boolean(layout) && layout.documentWidth <= width + 1 && candidatesAligned && stickyAndScrollOwnership
      && summaryDeltas.cost.length===5&&summaryDeltas.cost.every(delta=>delta<=1.5)&&summaryDeltas.costFooter.length===5&&summaryDeltas.costFooter.every(delta=>delta<=1.5)
      && summaryDeltas.wcHeaderBody.length===5&&summaryDeltas.wcHeaderBody.every(delta=>delta<=1.5)&&summaryDeltas.wcHeaderFooter.length===5&&summaryDeltas.wcHeaderFooter.every(delta=>delta<=1.5)
      && layout.overview.columns===summaryColumnsExpected&&layout.cost.selectedGapButtons>0&&verticalOwnership&&summaryOverflowExpected&&candidateNumbersAligned
      && layout.candidates.every(table=>width>768||table.bodyScrollWidth>table.bodyWidth),
      `BOM and Routing header/main/Before/After/effect axes, SelectedNumber text, selected Cost Element and Work Center axes, responsive grid, and scroll ownership align without page overflow at ${width}px`, { layout, candidateDeltas, summaryDeltas, candidateNumbersAligned })
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
    const selector = `tr[data-candidate-reorder-row=${JSON.stringify(roleChangedRow.id)}] td:last-child`
    const roleClickBefore = await evaluate(`(()=>{const selector=${JSON.stringify(selector)};const cells=[...document.querySelectorAll(selector)];const cell=cells[0];const row=cell?.closest('tr[data-candidate-reorder-row]');const rect=cell?.getBoundingClientRect();const hit=rect?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;const main=document.querySelector('main#main-content');return {matchCount:cells.length,rowStatus:row?.querySelector('td:nth-child(3)')?.innerText.trim()??null,rowExpanded:row?.getAttribute('aria-expanded')??null,rowTabIndex:row?.getAttribute('tabindex')??null,cellButtons:cell?.querySelectorAll('button').length??null,cellFocusables:cell?.querySelectorAll('a,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])').length??null,cellHasTitle:cell?.hasAttribute('title')??null,cellTitles:cell?[...cell.querySelectorAll('[title]')].map(e=>e.getAttribute('title')):null,cellAriaHidden:cell?.querySelector('span[aria-hidden="true"]')!==null,cellSvgCount:cell?.querySelectorAll('svg').length??null,rect:rect?{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}:null,viewport:{width:innerWidth,height:innerHeight},hit:{tag:hit?.tagName??null,ariaLabel:hit?.getAttribute('aria-label')??null,text:hit?.textContent?.trim().slice(0,80)??null,insideCell:Boolean(cell&&hit&&(hit===cell||cell.contains(hit))),insideButton:Boolean(hit?.closest('button'))},mainScrollTop:main?.scrollTop??null}})()`)
    verify(roleClickBefore.matchCount === 1 && roleClickBefore.rowStatus === 'CHANGED' && roleClickBefore.rowExpanded === 'false'
      && roleClickBefore.rowTabIndex === '0' && roleClickBefore.cellButtons === 0 && roleClickBefore.cellFocusables === 0
      && !roleClickBefore.cellHasTitle && roleClickBefore.cellTitles.length === 0 && roleClickBefore.cellAriaHidden && roleClickBefore.cellSvgCount > 0
      && roleClickBefore.hit.insideCell && !roleClickBefore.hit.insideButton,
      `${before} → ${after} visual chevron cell is not an independent button/focus target/title and belongs to the focused row`, roleClickBefore)
    await evaluate(`(()=>{window.__cbdRoleMatrixClickEvents=[];document.addEventListener('click',event=>{const row=event.target.closest('tr[data-candidate-reorder-row]');if(row?.getAttribute('data-candidate-reorder-row')===${JSON.stringify(roleChangedRow.id)})window.__cbdRoleMatrixClickEvents.push({target:event.target.tagName,targetLabel:event.target.getAttribute('aria-label'),button:Boolean(event.target.closest('button')),defaultPrevented:event.defaultPrevented})},true)})()`)
    await click(selector)
    const roleClickAfter = await evaluate(`(()=>{const row=[...document.querySelectorAll('tr[data-candidate-reorder-row]')].find(item=>item.getAttribute('data-candidate-reorder-row')===${JSON.stringify(roleChangedRow.id)});return {rowStatus:row?.querySelector('td:nth-child(3)')?.innerText.trim()??null,rowExpanded:row?.getAttribute('aria-expanded')??null,clickEvents:window.__cbdRoleMatrixClickEvents??[],details:row?.nextElementSibling?.querySelector('th[scope="row"]')?.innerText.trim()??null}})()`)
    verify(roleClickAfter.clickEvents.length > 0,
      `${before} → ${after} physical CDP input delivers a click to the CHANGED row control`, { before: roleClickBefore, after: roleClickAfter })
    verify(roleClickAfter.rowExpanded === 'true',
      `${before} → ${after} visual chevron cell click expands its CHANGED Candidate row`, { before: roleClickBefore, after: roleClickAfter })
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
  process.stdout.write('Active no-focus callers covered: Master Data Selling Price and SG&A; source inventory found no SelectedNumber callers in Simulation.\n')
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
