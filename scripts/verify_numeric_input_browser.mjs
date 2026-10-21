import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
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

  const browserErrors = []
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

  await send('Page.navigate', { url: new URL('/scripts/fixtures/selected-value-browser.html', baseUrl).href })
  await waitFor(async () => Boolean(await evaluate('!!document.querySelector(\'[aria-label="Selected value foundation fixture"]\')')), 'shared foundation fixture')
  const buttonByText = text => clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === ${JSON.stringify(text)}))`)
  const byAria = label => `document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']')`
  const model = name => evaluate(`document.querySelector('[data-testid="${name}-model"]')?.textContent`)
  const headerText = () => evaluate(`document.querySelector('header input[aria-label="Selected value"]')?.value ?? document.querySelector('[data-selected-value-output]')?.textContent.trim()`)
  const headerSteppers = () => evaluate('document.querySelectorAll("header [data-numeric-stepper]").length')
  const key = async (name, code = name) => {
    const virtualKey = { Enter: 13, ' ': 32, ArrowUp: 38, ArrowDown: 40, Backspace: 8 }[name]
    const text = name === 'Enter' ? '\r' : name === ' ' ? ' ' : undefined
    const physicalKey = { key: name, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...physicalKey, text, unmodifiedText: text })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...physicalKey })
    await delay(70)
  }
  const caret = async index => evaluate(`document.activeElement.setSelectionRange(${index},${index})`)
  const insertValue = async (aria, text) => {
    await clickInput(aria)
    await evaluate('document.activeElement.select()')
    await send('Input.insertText', { text })
    await delay(100)
  }
  const wheelOver = async aria => {
    const point = await evaluate(`(()=>{const rect=${visibleInputExpression(aria)}.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: 0, deltaY: 100 })
    await delay(160)
  }
  const artifacts = await mkdtemp(join(tmpdir(), 'costbreakdown-selected-value-evidence-'))
  const screenshot = async name => {
    const captured = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(artifacts, `${name}.png`), Buffer.from(captured.result.data, 'base64'))
  }
  assert.equal(await headerText(), '—', 'Header Value is always present with an empty-selection dash')
  assert.match(await evaluate('document.querySelector("[data-header-value]").textContent'), /Value/)
  assert.equal(await headerSteppers(), 0, 'no selection exposes no spinner')
  await screenshot('header-default-1440')

  const numberStyle = () => evaluate(`(()=>{const element=${byAria('Select precise result')};const style=getComputedStyle(element);const rect=element.getBoundingClientRect();return {cursor:style.cursor,background:style.backgroundColor,border:style.borderWidth,outline:style.outlineStyle,padding:style.padding,margin:style.margin,width:rect.width,height:rect.height,x:rect.x,y:rect.y}})()`)
  const idleNumber = await numberStyle()
  assert.equal(idleNumber.cursor, 'pointer')
  const hoverPoint = await evaluate(`(()=>{const rect=${byAria('Select precise result')}.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hoverPoint })
  await delay(100)
  assert.notEqual((await numberStyle()).background, idleNumber.background, 'number hover supplies a light-blue affordance')
  await clickButton(byAria('Select precise result'))
  assert.equal(await headerText(), '12.3456789123', 'read-only Header uses the exact model value')
  assert.equal(await headerSteppers(), 0, 'read-only selection has no spinner')
  assert.equal(await evaluate('document.querySelector(\'[data-testid="row-clicks"]\').textContent'), '0', 'numeric selection never expands its containing row')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 200 })
  await delay(100)
  const selectedNumber = await numberStyle()
  assert.notEqual(selectedNumber.background, idleNumber.background, 'selected background persists after pointer leaves')
  for (const geometry of ['width', 'height', 'x', 'y', 'padding', 'margin']) assert.equal(selectedNumber[geometry], idleNumber[geometry], `number selection preserves ${geometry}`)
  assert.equal(selectedNumber.border, '0px')
  assert.equal(selectedNumber.outline, 'none')
  await clickButton(byAria('Select tiny result'))
  assert.equal(await headerText(), '0.00456789123')
  assert.equal(await evaluate('document.querySelectorAll("button[aria-pressed=\\\"true\\\"][data-selected-number]").length'), 1, 'one selected number replaces the previous selection')
  await evaluate(`${byAria('Select precise result')}.focus()`)
  await key('Enter')
  assert.equal(await headerText(), '12.3456789123', 'read-only selection supports Enter')
  await evaluate(`${byAria('Select tiny result')}.focus()`)
  await key(' ', 'Space')
  assert.equal(await headerText(), '0.00456789123', 'read-only selection supports Space')
  await screenshot('header-readonly-1440')

  await clickInput('Foundation decimal')
  assert.equal(await headerText(), '12.3456789123', 'editable source selection exposes its full value in Header')
  assert.equal(await headerSteppers(), 1, 'editable Header owns the only visible spinner')
  assert.equal(await evaluate('document.querySelectorAll("main [data-numeric-stepper]").length'), 0, 'ordinary focused inputs never have visible inline spinners')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).cursor'), 'text', 'editable fields retain their text cursor')
  assert.equal(await typeInto('Foundation decimal', '12.3456789'), '12.3456789')
  await clickInput('Foundation integer')
  assert.equal(await model('decimal'), '12.3456789', 'blur never rounds authoritative state')
  assert.equal(await inputValue('Foundation decimal'), '12.35', 'body uses compact presentation after blur')
  await insertValue('Foundation decimal', '123.45')
  await caret(2)
  await key('ArrowUp')
  assert.equal(await model('decimal'), '124.45', 'ordinary ArrowUp uses the caret unit place')
  await key('ArrowDown')
  assert.equal(await model('decimal'), '123.45')
  await caret(5)
  await key('ArrowUp')
  assert.equal(await model('decimal'), '123.46', 'ordinary ArrowUp uses the caret hundredth place')
  await key('ArrowDown')
  assert.equal(await model('decimal'), '123.45')
  await wheelOver('Foundation decimal')
  assert.equal(await model('decimal'), '123.46', 'focused wheel preserves the existing caret-place direction')
  await buttonByText('Clear selected value')
  const beforeUnfocusedWheel = await model('decimal')
  await wheelOver('Foundation decimal')
  assert.equal(await model('decimal'), beforeUnfocusedWheel, 'wheel over an unfocused editor changes no value')

  await clickInput('Foundation decimal')
  await evaluate('document.activeElement.select()')
  await send('Browser.grantPermissions', { origin: new URL(baseUrl).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  await evaluate('navigator.clipboard.writeText("12.3456789")')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'v', code: 'KeyV', modifiers: process.platform === 'darwin' ? 4 : 2, commands: ['paste'] })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'v', code: 'KeyV' })
  await delay(100)
  assert.equal(await inputValue('Foundation decimal'), '12.3456789', 'real clipboard paste retains all fractional digits')
  assert.equal(await model('decimal'), '12.3456789')
  await insertValue('Selected value', '123.45')
  assert.equal(await model('decimal'), '123.45', 'Header edits write the actual source state')
  await caret(5)
  await clickButton('document.querySelector(\'header button[aria-label="Increase Selected value"]\')')
  assert.equal(await model('decimal'), '123.46', 'Header spinner uses the same active hundredth place')
  await clickButton('document.querySelector(\'header button[aria-label="Decrease Selected value"]\')')
  assert.equal(await model('decimal'), '123.45')
  await caret(2)
  const spinnerPoint = await evaluate('(()=>{const r=document.querySelector(\'header button[aria-label="Increase Selected value"]\').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...spinnerPoint, button: 'left', clickCount: 1 })
  await delay(680)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...spinnerPoint, button: 'left', clickCount: 1 })
  const afterHold = await model('decimal')
  assert.ok(Number(afterHold) > 124.45, 'Header spinner repeats while held')
  await delay(250)
  assert.equal(await model('decimal'), afterHold, 'Header spinner stops after pointer release')
  await buttonByText('External update')
  assert.equal(await evaluate('document.activeElement?.getAttribute("aria-label")'), 'Selected value')
  assert.equal(await headerText(), '98.7654321', 'external source updates replace even a focused Header draft')
  await buttonByText('Change writer')
  await insertValue('Selected value', '98.76543212')
  assert.equal(await evaluate('document.querySelector(\'[data-testid="last-writer"]\').textContent'), '2', 'selected writer calls the latest source callback')
  await insertValue('Selected value', '98.7654321')
  await buttonByText('Capture writer')
  await clickButton(byAria('Select precise result'))
  await buttonByText('Invoke captured writer')
  assert.equal(await model('decimal'), '98.7654321', 'a replaced selection cannot write through a retained callback')
  await clickInput('Foundation decimal')
  await buttonByText('Capture writer')
  await buttonByText('Toggle readonly')
  await buttonByText('Invoke captured writer')
  assert.equal(await model('decimal'), '98.7654321', 'a source becoming read-only revokes the prior writer')
  assert.equal(await headerText(), '98.7654321')
  assert.equal(await headerSteppers(), 0, 'source becoming read-only immediately removes Header editing')
  await buttonByText('Toggle readonly')
  await clickInput('Foundation decimal')
  await buttonByText('Capture writer')
  await buttonByText('Change source identity')
  await buttonByText('Invoke captured writer')
  assert.equal(await model('decimal'), '98.7654321', 'identity change revokes the prior writer')
  assert.equal(await headerText(), '—', 'switching source identity invalidates the previous callback')
  await clickInput('Foundation decimal')
  await buttonByText('Capture writer')
  await buttonByText('Toggle source')
  await buttonByText('Invoke captured writer')
  assert.equal(await model('decimal'), '98.7654321', 'unmounted source cannot be written through a retained callback')
  assert.equal(await headerText(), '—', 'unmounting the selected source clears stale write access')
  await buttonByText('Toggle source')

  await insertValue('Foundation integer', '3.5')
  assert.equal(await model('integer'), '3', 'semantic integer input rejects fractional entry')
  await insertValue('Selected value', '201')
  assert.equal(await model('integer'), '3', 'Header respects source maximum')
  await insertValue('Selected value', '0')
  assert.equal(await model('integer'), '3', 'Header respects source minimum')
  await insertValue('Selected value', '25')
  await caret(0)
  await key('ArrowUp')
  assert.equal(await model('integer'), '35', 'Header keeps integer caret stepping')
  await insertValue('Foundation percentage', '12.3456789')
  assert.equal(await headerText(), '12.3456789')
  assert.match(await evaluate('document.querySelector("[data-header-value]").textContent'), /%/, 'Header preserves percentage semantics')
  await insertValue('Selected value', '101')
  assert.equal(await model('percentage'), '12.3456789', 'Header retains the percentage source domain')
  await insertValue('Foundation positive', '0.00003')
  await buttonByText('Clear selected value')
  assert.equal(await inputValue('Foundation positive'), '3.00e-5', 'tiny nonzero values never look like zero')
  await clickInput('Foundation positive')
  assert.equal(await inputValue('Foundation positive'), '0.00003', 'scientific compact display expands to a safe full editable draft')
  assert.equal(await headerText(), '0.00003')
  await clickInput('Selected value')
  await caret(0)
  await key('ArrowDown')
  assert.equal(await model('positive'), '0.00003', 'strict-positive stop-at-minimum behavior is retained in Header')
  await clickInput('Foundation decimal')
  await evaluate('document.activeElement.select()')
  await key('Backspace')
  assert.equal(await model('decimal'), 'null', 'blank remains null rather than zero')
  assert.equal(await headerText(), '')
  await buttonByText('Reset decimal')
  await clickInput('Foundation decimal')
  await buttonByText('Capture writer')
  await buttonByText('Cost Breakdown')
  await buttonByText('Invoke captured writer')
  assert.equal(await headerText(), '—', 'page navigation clears temporary selection without changing source data')
  assert.equal(await model('decimal'), '12.3456789123')

  const headerGeometry = () => evaluate(`(()=>{
    const header=document.querySelector('header'), value=header.querySelector('[data-header-value]')
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}
    const brand=header.querySelector('[aria-label^="Product context:"]').parentElement.parentElement
    const walker=document.createTreeWalker(brand,NodeFilter.SHOW_TEXT)
    let text, visibleBrandRight=0
    while(text=walker.nextNode()) {
      const range=document.createRange();range.selectNodeContents(text)
      const bounds=range.getBoundingClientRect();let left=bounds.left,right=bounds.right
      for(let parent=text.parentElement;parent && parent!==header;parent=parent.parentElement) {
        if(getComputedStyle(parent).overflowX!=='visible') {
          const clip=parent.getBoundingClientRect();left=Math.max(left,clip.left);right=Math.min(right,clip.right)
        }
      }
      if(right>left) visibleBrandRight=Math.max(visibleBrandRight,right)
    }
    return {header:rect(header),value:rect(value),utilities:[...header.querySelectorAll('button[aria-label="Undo"],button[aria-label="Redo"],#header-prepare-dataset-trigger')].map(rect),overflow:document.documentElement.scrollWidth>innerWidth,whiteSpace:getComputedStyle(value).whiteSpace,brandTextContained:visibleBrandRight<=rect(value).x+0.5}
  })()`)
  const geometryResults = []
  for (const width of [1440, 1024, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    await buttonByText('Clear selected value')
    await delay(120)
    const initial = await headerGeometry()
    await buttonByText('Select longest value')
    const readonly = await headerGeometry()
    assert.equal(Number(await headerText()), Number.MAX_VALUE, 'long read-only Header retains exact finite-number value')
    assert.deepEqual(readonly.utilities, initial.utilities, `long read-only value does not move utilities at ${width}px`)
    assert.equal(readonly.header.height, initial.header.height, 'long read-only value keeps Header height')
    await buttonByText('Edit longest value')
    const editable = await headerGeometry()
    assert.equal(Number(await headerText()), Number.MAX_VALUE, 'long editable Header retains exact finite-number value')
    assert.deepEqual(editable.utilities, initial.utilities, `long editable value does not move utilities at ${width}px`)
    assert.equal(editable.header.height, initial.header.height, 'long editable value keeps Header height')
    assert.equal(editable.whiteSpace, 'nowrap')
    assert.equal(editable.overflow, false, `Header does not create page overflow at ${width}px`)
    assert.equal(editable.brandTextContained, true, `brand and product text cannot paint over Header Value at ${width}px`)
    assert.ok(editable.value.width > 0, 'Value remains present on narrow screens')
    for (const utility of editable.utilities) assert.ok(utility.x >= 0 && utility.x + utility.width <= width + 1, 'utility controls remain inside the viewport')
    await screenshot(`header-long-editable-${width}`)
    geometryResults.push({ width, headerHeight: editable.header.height, valueWidth: editable.value.width, stableUtilities: true })
  }
  assert.deepEqual(browserErrors, [], 'actual app and shared fixture produce no browser exceptions, errors, or warnings')
  results.sharedFoundation = { formattingAndSelection: 'PASS', editingAndStepping: 'PASS', clipboardPaste: 'PASS', sourceLifecycle: 'PASS', geometry: geometryResults, screenshots: artifacts }
  console.log(JSON.stringify({ result: 'PASS', browser: 'isolated Chrome', viewport: '1440x1800', value: '12.3456789', results }, null, 2))
} finally {
  client?.close()
  await stopChild(chrome)
  await stopChild(vite)
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
