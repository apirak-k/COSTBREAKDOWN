import { numericColumnGeometry, numericCenterlineFailures } from './numeric-browser-geometry.mjs'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
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
const finalCorrectionsOnly = process.argv.includes('--final-corrections-only')
const selectedValueOnly = process.argv.includes('--selected-value-only')
const numericLayoutOnly = process.argv.includes('--numeric-layout-only')
const rulerOnly = process.argv.includes('--ruler-only')
const visibleTotalsOnly = process.argv.includes('--visible-totals-only')
const configuredBaseUrl = process.env.COSTBREAKDOWN_BROWSER_BASE_URL
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const vitePort = configuredBaseUrl ? null : await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-simulation-round4a-chrome-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-simulation-round4a-evidence-'))
const vite = configuredBaseUrl ? null : spawn(process.execPath, [
  viteCliPath, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'
], { cwd: repository, stdio: ['ignore', 'pipe', 'pipe'] })
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
let client
const browserErrors = []
const browserErrorDetails = []
const results = []

function record(passed, name, details) {
  results.push({ passed, name, details })
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}${details === undefined ? '' : ` — ${JSON.stringify(details)}`}\n`)
}

function check(name, condition, details) {
  record(Boolean(condition), name, details)
}

function stopChild(child) {
  return new Promise(resolveStop => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolveStop()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolveStop() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolveStop() })
    child.kill('SIGTERM')
  })
}

async function waitFor(checkReady, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkReady()) return
    if ((vite && vite.exitCode !== null) || chrome.exitCode !== null) break
    await delay(100)
  }
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}\nChrome output:\n${chromeOutput.join('').slice(-3000)}`)
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
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
      browserErrorDetails.push({ type: 'exception', details: message.params.exceptionDetails })
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      browserErrors.push(message.params.args.map(argument => argument.value ?? argument.description).join(' '))
      browserErrorDetails.push({ type: 'console.error', args: message.params.args, stackTrace: message.params.stackTrace })
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
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description ?? response.result.exceptionDetails.text)
    return response.result.result.value
  }
  const clickAt = async point => {
    if (!point) throw new Error('No visible element was available for browser click.')
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(180)
  }
  const clickSelector = async selector => clickAt(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`))
  const moveTo = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length)return null;e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!point) throw new Error(`No visible hover target: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    return point
  }
  const clickButtonText = async label => clickAt(await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.innerText.trim()===${JSON.stringify(label)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`))
  const clickRole = async label => clickAt(await evaluate(`(()=>{const e=[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.getClientRects().length&&b.innerText.trim()===${JSON.stringify(label)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`))
  const clickComparisonOption = async (side, label) => clickAt(await evaluate(`(()=>{const e=[...document.querySelectorAll('[role="menu"][aria-label=${JSON.stringify(`${side} dataset choices`)}] button[role="menuitem"]')].find(b=>b.innerText.trim()===${JSON.stringify(label)});if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`))
  const waitVisible = async (selector, label) => waitFor(() => evaluate(`Boolean([...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>e.getClientRects().length&&e.getBoundingClientRect().width>0))`), label)
  const typeIntoInput = async (ariaLabel, value) => {
    process.stdout.write(`Browser input: locating ${ariaLabel} = ${value}\n`)
    const point = await evaluate(`(()=>{const e=[...document.querySelectorAll('input')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&x.getClientRects().length);if(!e)return null;e.scrollIntoView({block:'center',inline:'nearest'});e.focus();e.select();const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!point) { process.stdout.write(`Browser input: missing ${ariaLabel}\n`); return null }
    await clickAt(point)
    await evaluate('document.activeElement?.select()')
    await send('Input.insertText', { text: value })
    await delay(220)
    const actual = await evaluate(`(()=>[...document.querySelectorAll('input')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&x.getClientRects().length)?.value??null)()`)
    process.stdout.write(`Browser input: ${ariaLabel} observed ${JSON.stringify(actual)}\n`)
    return actual
  }
  const setViewport = async (width, height = 900) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await delay(350)
  }
  const screenshot = async name => {
    const captured = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(evidenceDir, `${name}.png`), Buffer.from(captured.result.data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  if (visibleTotalsOnly) {
    await send('Page.navigate', { url: new URL('/scripts/fixtures/simulation-visible-totals.html', baseUrl).href })
    await waitVisible('[data-graph-visible-total-value]', 'visible stack totals fixture')
    const visibleState = () => evaluate(`(()=>{
      const svg=document.querySelector('svg[aria-labelledby="simulation-story-title"]'),vb=svg.viewBox.baseVal
      const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y
      const labels=[...svg.querySelectorAll('[data-graph-visible-total-value]')].map(e=>{
        const b=e.getBBox(),state=e.getAttribute('data-graph-visible-total-value'),sc=svg.querySelector('[data-graph-standard-cost-value="'+state+'"]')
        const bars=[...svg.querySelectorAll('[data-graph-state="'+state+'"] rect[data-graph-part]')]
        return {state,side:e.getAttribute('data-graph-visible-total-side'),text:e.textContent,tooltip:e.getAttribute('aria-label'),position:e.getAttribute('data-graph-visible-total-position'),fill:e.getAttribute('fill'),inside:b.x>=0&&b.y>=0&&b.x+b.width<=vb.width+0.5&&b.y+b.height<=vb.height+0.5,outside:!bars.some(bar=>overlap(b,bar.getBBox())),obscuresStandardCost:sc?overlap(b,sc.getBBox()):false,obscuresRuler:overlap(b,svg.querySelector('[data-ruler-value]').getBBox())}
      })
      return {labels,standardCosts:[...svg.querySelectorAll('[data-graph-standard-cost-value]')].map(e=>e.textContent),oldNet:!!svg.querySelector('[data-graph-visible-net-value]')||svg.querySelector('desc').textContent.includes('Visible Net'),overflow:document.documentElement.scrollWidth>innerWidth+1}
    })()`)
    const inspectVisible = async name => {
      const state = await visibleState()
      check(name+' labels are neutral, outside their stacks, unclipped, and clear of Standard Cost', !state.oldNet && !state.overflow && state.labels.every(label=>label.fill==='#334155'&&label.inside&&label.outside&&!label.obscuresStandardCost&&!label.obscuresRuler), state)
      return state
    }
    for (const width of [1440, 1024, 768, 390, 320]) {
      await setViewport(width)
      await clickButtonText('Positive only')
      let state = await inspectVisible(`${width}px positive only`)
      check(`${width}px +300 renders even when equal to Standard Cost; no zero negative label`, state.labels.length===3&&state.labels.every(label=>label.side==='positive'&&label.text==='+300.00')&&state.standardCosts.every(value=>value==='300.00'), state.labels)
      await screenshot(`visible-totals-${width}-positive`)
      await clickButtonText('Mixed sign')
      state = await inspectVisible(`${width}px mixed sign`)
      check(`${width}px mixed stack displays +300 and -50 independently`, state.labels.length===6&&state.labels.filter(label=>label.side==='positive').every(label=>label.text==='+300.00')&&state.labels.filter(label=>label.side==='negative').every(label=>label.text==='-50.00'), state.labels)
      await screenshot(`visible-totals-${width}-mixed`)
      if (width===1440) {
        for (const [side, expected] of [['positive','Current Visible +'],['negative','Current Visible −']]) {
          const point=await evaluate(`(()=>{const e=document.querySelector('[data-graph-visible-total-value="current"][data-graph-visible-total-side="${side}"]');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()`)
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point})
          await delay(400)
          const tooltip=await evaluate(`document.querySelector('[data-graph-tooltip-host] > div[aria-hidden="true"]')?.textContent`)
          check(`${side} label exposes a real pointer tooltip with dynamic UOM`, tooltip===expected, {tooltip,expected})
        }
      }
      await clickSelector('button[aria-label="Profit −"]')
      state = await inspectVisible(`${width}px hidden negative Profit`)
      check(`${width}px hiding Profit − removes its stack total and keeps +300`,state.labels.length===3&&state.labels.every(label=>label.text==='+300.00'),state.labels)
      await clickSelector('button[aria-label="Profit −"]')
      await clickSelector('button[aria-label="Labor"]')
      state = await inspectVisible(`${width}px positive filter / Selling Price collision`)
      check(`${width}px filtering Labor recomputes +240 and genuine Selling Price crowding activates the existing side fallback`,state.labels.filter(label=>label.side==='positive').every(label=>label.text==='+240.00'&&label.position==='side')&&state.labels.filter(label=>label.side==='negative').every(label=>label.text==='-50.00'&&label.position==='below'),state.labels)
      if (width===320) {
        const points=await evaluate(`(()=>{const svg=document.querySelector('svg[aria-labelledby="simulation-story-title"]'),slider=svg.querySelector('[role="slider"]'),line=svg.querySelector('[data-ruler-line]'),axis=svg.querySelector('[data-y-axis]');const min=Number(slider.getAttribute('aria-valuemin')),max=Number(slider.getAttribute('aria-valuemax'));const point=y=>{const p=svg.createSVGPoint();p.x=(Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2;p.y=y;const r=p.matrixTransform(svg.getScreenCTM());return{x:r.x,y:r.y}};return{start:point(Number(line.getAttribute('y1'))),end:point(Number(axis.getAttribute('y1'))+(max-240)/(max-min)*(Number(axis.getAttribute('y2'))-Number(axis.getAttribute('y1'))))}})()`)
        await send('Input.dispatchMouseEvent',{type:'mousePressed',...points.start,button:'left',clickCount:1})
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...points.end,button:'left',buttons:1})
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',...points.end,button:'left',clickCount:1})
        await delay(100)
        await inspectVisible('320px Ruler dragged to the visible positive boundary')
      }
      await screenshot(`visible-totals-${width}-collision`)
      await clickSelector('button[aria-label="Selling Price"]')
      state = await inspectVisible(`${width}px hidden Selling Price`)
      check(`${width}px hidden Selling Price restores normal positive placement without changing negative totals`,state.labels.filter(label=>label.side==='positive').every(label=>label.position==='above')&&state.labels.filter(label=>label.side==='negative').every(label=>label.text==='-50.00'),state.labels)
      await clickButtonText('Separated')
      await clickSelector('button[aria-label="Profit +"]')
      state = await inspectVisible(`${width}px separated Selling Price`)
      check(`${width}px higher but separated Selling Price does not trigger side fallback`,state.labels.length===3&&state.labels.every(label=>label.text==='+300.00'&&label.position==='above'),state.labels)
    }
    await setViewport(1440)
    await clickButtonText('Show all')
    await clickButtonText('Mixed sign')
    const fixtureHeader=()=>evaluate(`(()=>{const input=document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]'),output=document.querySelector('[data-header-numeric-zone] [data-selected-value-output]');return input?{kind:'input',value:input.value,source:input.getAttribute('data-selected-value-source')}:output?{kind:'output',value:output.textContent.trim(),source:output.title}:null})()`)
    const fixtureGraphState=selector=>evaluate(`(()=>{const text=document.querySelector(${JSON.stringify(selector)});if(!text)return null;const id=text.getAttribute('data-selected-value-source'),background=[...document.querySelectorAll('[data-selected-number-background]')].find(item=>item.getAttribute('data-selected-number-background')===id),glyph=text.getBBox(),box=background?.getBBox();return{text:text.textContent.trim(),aria:text.getAttribute('aria-label'),pressed:text.getAttribute('aria-pressed'),id,fill:getComputedStyle(text).fill,glyph:{x:glyph.x,y:glyph.y,width:glyph.width,height:glyph.height},background:box?{x:box.x,y:box.y,width:box.width,height:box.height,pointerEvents:background.getAttribute('pointer-events')}:null}})()`)
    const fixtureTargets=[
      ['Visible +','svg text[data-graph-visible-total-side="positive"]'],
      ['Visible −','svg text[data-graph-visible-total-side="negative"]'],
      ['GAP 1 total','svg text[data-graph-total="gap1"]'],
      ['GAP 2 total','svg text[data-graph-total="gap2"]']
    ]
    const fixtureSelections=[]
    for(const [label,selector] of fixtureTargets){
      const before=await fixtureGraphState(selector)
      const preview=await (async()=>{await moveTo(selector);await delay(400);return fixtureHeader()})()
      await clickSelector(selector)
      const pinned=await fixtureGraphState(selector)
      await clickSelector(selector)
      const unpinned=await fixtureGraphState(selector)
      fixtureSelections.push({label,before,preview:await preview,pinned,unpinned})
    }
    check('Visible +/− and both numeric GAP totals retain shared Header preview/pin/unpin and tight SVG backgrounds',fixtureSelections.length===4&&fixtureSelections.every(item=>item.before?.id&&item.before.pressed==='false'&&item.preview?.kind==='output'&&item.preview.value!=='—'&&item.pinned?.pressed==='true'&&item.unpinned?.pressed==='false'&&item.pinned.background?.pointerEvents==='none'&&Math.abs(item.pinned.background.x-item.pinned.glyph.x+2)<0.1&&Math.abs(item.pinned.background.y-item.pinned.glyph.y+1)<0.5&&Math.abs(item.pinned.background.width-item.pinned.glyph.width-4)<0.1&&Math.abs(item.pinned.background.height-item.pinned.glyph.height-2)<0.5),fixtureSelections)
    const fixtureTooltips=[]
    for(const [label,selector,expected] of [
      ['Visible +','svg text[data-graph-visible-total-side="positive"]',null],
      ['Visible −','svg text[data-graph-visible-total-side="negative"]',null],
      ['GAP 1 total','svg text[data-graph-total="gap1"]','Current − Reference'],
      ['GAP 2 total','svg text[data-graph-total="gap2"]','Custom − Current']
    ]){
      await moveTo(selector)
      await delay(400)
      const tooltip=await evaluate(`document.querySelector('[data-graph-tooltip-host] > div[aria-hidden="true"]')?.textContent??null`)
      const aria=await evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-label')??null`)
      fixtureTooltips.push({label,tooltip,aria,expected:expected??aria?.split(' ').slice(0,3).join(' ')})
    }
    const fixtureLabels=await evaluate(`(()=>[...document.querySelectorAll('svg text')].filter(text=>/^GAP [12]$/.test(text.textContent.trim())).map(text=>({text:text.textContent.trim(),target:!!text.hasAttribute('data-graph-tooltip'),label:text.getAttribute('aria-label'),selected:!!text.hasAttribute('data-selected-value-source')})))()`)
    check('SVG graph context tooltips omit visible amounts, preserve both GAP explanations, and leave GAP category text tooltip-free',fixtureTooltips.length===4&&fixtureTooltips.every(item=>item.tooltip===item.expected&&!/[+-]?\d[\d,]*(?:\.\d+)?/.test(item.tooltip))&&fixtureLabels.length===2&&fixtureLabels.every(item=>!item.target&&!item.label&&!item.selected),{fixtureTooltips,fixtureLabels})
    await clickButtonText('Mixed sign')
    const axisBefore=await evaluate(`(()=>({values:[...document.querySelectorAll('svg text[data-axis-tick]')].map(e=>e.textContent.trim()),min:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemin'),max:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemax')}))()`)
    const axisSelector='svg text[data-axis-tick="1"]'
    const previewAxis=await (async()=>{await moveTo(axisSelector);await delay(400);return fixtureHeader()})()
    await evaluate(`([...document.querySelectorAll('button')].find(button=>button.innerText.trim()==='Positive only'))?.click()`)
    await delay(120)
    const axisAfter=await evaluate(`(()=>({values:[...document.querySelectorAll('svg text[data-axis-tick]')].map(e=>e.textContent.trim()),min:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemin'),max:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemax')}))()`)
    const clearedPreview=await fixtureHeader()
    await clickButtonText('Mixed sign')
    const negativeSelector='svg text[data-graph-visible-total-side="negative"]'
    await moveTo(negativeSelector)
    await delay(400)
    const negativeBefore=await fixtureHeader()
    await clickSelector(negativeSelector)
    await evaluate(`([...document.querySelectorAll('button')].find(button=>button.innerText.trim()==='Positive only'))?.click()`)
    await delay(120)
    const clearedPin=await fixtureHeader()
    const negativeAfter=await evaluate(`document.querySelector('svg text[data-graph-visible-total-side="negative"]')??null`)
    await clickButtonText('Mixed sign')
    const freshSelection=await (async()=>{await moveTo(negativeSelector);await delay(400);return fixtureHeader()})()
    check('Changing graph data clears preview/pin sources without transferring them to new ticks and allows re-selection',Boolean(previewAxis?.kind==='output'&&axisBefore.values.join('|')!==axisAfter.values.join('|')&&clearedPreview?.value==='—'&&negativeBefore?.value==='-50.00'&&clearedPin?.value==='—'&&!negativeAfter&&freshSelection?.value==='-50.00'),{previewAxis,axisBefore,axisAfter,clearedPreview,negativeBefore,clearedPin,negativeRemoved:!negativeAfter,freshSelection})
  } else {
  await waitFor(() => evaluate('document.title'), 'application page')
  await waitVisible('button', 'application navigation')
  check('Browser is running the COSTBREAKDOWN application', /COSTBREAKDOWN/i.test(await evaluate('document.title')), { title: await evaluate('document.title'), url: await evaluate('location.href') })

  // Seed the actual app with its bundled development data so every simulation graph has values.
  await clickSelector('#header-prepare-dataset-trigger')
  await waitVisible('[role="group"][aria-label="Development mock datasets"]', 'development dataset controls')
  await clickButtonText('Complete Mock')
  await waitFor(() => evaluate(`[...document.querySelectorAll('[aria-label^="Current dataset:"]')].some(e=>/[1-9] BOM items/.test(e.getAttribute('aria-label')||''))`), 'Complete Mock Current fixture')
  await clickButtonText('Simulation')
  await waitVisible('section[data-simulation-table="bom"]', 'BOM Simulation table')
  await waitVisible('figure[aria-labelledby="simulation-story-title"]', 'Cost Structure graph card')
  await clickRole('Current')
  try {
    await waitFor(() => evaluate(`Boolean([...document.querySelectorAll('input')].some(e=>e.getClientRects().length&&/Price in (SIM|Custom|Current)$/.test(e.getAttribute('aria-label')||'')))`), 'Simulation numeric row input')
  } catch (error) {
    const simulationState = await evaluate(`(()=>({
      title:document.title,url:location.href,
      headings:[...document.querySelectorAll('h1,h2,h3,[role="heading"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim()),
      buttons:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).slice(0,35).map(e=>({label:e.getAttribute('aria-label'),text:e.innerText.trim(),pressed:e.getAttribute('aria-pressed')})),
      rows:{bom:document.querySelectorAll('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index]').length,routing:document.querySelectorAll('section[data-simulation-table="routing"] tbody tr[data-simulation-row-index]').length},
      inputs:[...document.querySelectorAll('input')].map(e=>({label:e.getAttribute('aria-label'),visible:Boolean(e.getClientRects().length),disabled:e.disabled})),
      visibleStatus:[...document.querySelectorAll('[role="status"], [role="alert"]')].filter(e=>e.getClientRects().length).map(e=>e.textContent.trim()),
      body:document.body.innerText.slice(0,1400)
    }))()`)
    throw new Error(`${error.message}\nSimulation state after selecting Current: ${JSON.stringify(simulationState)}\nBrowser errors so far: ${JSON.stringify(browserErrors)}`)
  }
  await waitFor(() => evaluate(`Boolean(document.querySelector('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index]')&&document.querySelector('section[data-simulation-table="routing"] tbody tr[data-simulation-row-index]'))`), 'Simulation BOM and Routing data rows')
  await clickSelector('button[aria-label="Before dataset, Current"]')
  await clickComparisonOption('Before', 'Reference')
  await waitVisible('button[aria-label="Before dataset, Reference"]', 'Reference comparison baseline')
  await delay(800)
  await screenshot('simulation-seeded-1440-before-expansion')

  if (selectedValueOnly) {
    const visibleHeader = () => evaluate(`(()=>{const input=document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]');if(input)return{kind:'input',value:input.value,source:input.getAttribute('data-selected-value-source')};const output=document.querySelector('[data-header-numeric-zone] [data-selected-value-output]');return output?{kind:'output',value:output.textContent.trim(),title:output.title}:null})()`)
    const hoverSelectedNumber = async (selector, dwell = 420) => {
      await moveTo(selector)
      await delay(dwell)
      return visibleHeader()
    }
    const materialBefore = 'button[data-selected-number][aria-label="Material Before"]'
    const materialAfter = 'button[data-selected-number][aria-label="Material After"]'
    const materialChange = 'button[data-selected-number][aria-label="Material Change"]'
    const materialLabel = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] th[scope="row"]')].find(cell=>cell.textContent.trim()==='Material')?.textContent.trim()??null)()`)
    const initialCellHover = await evaluate(`(()=>{const cell=[...document.querySelectorAll('[data-simulation-result-body] th[scope="row"]')].find(item=>item.textContent.trim()==='Material');if(!cell)return null;cell.scrollIntoView({block:'center',inline:'nearest'});const r=cell.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (initialCellHover) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...initialCellHover })
    await delay(450)
    const rowHoverHeader = await visibleHeader()
    check('Result row hover alone does not preview a numeric value', Boolean(materialLabel === 'Material' && (!rowHoverHeader || rowHoverHeader.value === '—')), { rowHoverHeader, initialCellHover })

    const beforePreview = await hoverSelectedNumber(materialBefore)
    const beforePreviewValue = await evaluate(`document.querySelector(${JSON.stringify(materialBefore)})?.textContent.trim()??null`)
    check('Finite Result Before direct hover previews through the shared Header dwell', Boolean(beforePreview?.kind === 'output' && beforePreview.value !== '—' && beforePreviewValue), { beforePreview, beforePreviewValue })
    await clickSelector(materialBefore)
    const beforePinned = await evaluate(`document.querySelector(${JSON.stringify(materialBefore)})?.getAttribute('aria-pressed')`)
    const afterPreview = await hoverSelectedNumber(materialAfter)
    const afterPreviewValue = await evaluate(`document.querySelector(${JSON.stringify(materialAfter)})?.textContent.trim()??null`)
    check('Finite Result After direct hover previews while preserving the prior Before pin', Boolean(beforePinned === 'true' && afterPreview?.kind === 'output' && afterPreview.value !== '—' && afterPreviewValue), { beforePinned, afterPreview, afterPreviewValue })
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1437, y: 897 })
    await delay(140)
    const restoredPin = await visibleHeader()
    check('Leaving Preview restores the existing Result Before pin', Boolean(restoredPin?.kind === 'output' && restoredPin.value === beforePreview?.value && await evaluate(`document.querySelector(${JSON.stringify(materialBefore)})?.getAttribute('aria-pressed')`) === 'true'), { before: beforePreview?.value, restoredPin })
    await clickSelector(materialBefore)
    check('Activating the same Result value again removes its pin', await evaluate(`document.querySelector(${JSON.stringify(materialBefore)})?.getAttribute('aria-pressed')`) === 'false')
    await clickSelector(materialAfter)
    await clickSelector(materialChange)
    check('Result Change pin transfers directly between numeric sources', Boolean(
      await evaluate(`document.querySelector(${JSON.stringify(materialAfter)})?.getAttribute('aria-pressed')`) === 'false'
      && await evaluate(`document.querySelector(${JSON.stringify(materialChange)})?.getAttribute('aria-pressed')`) === 'true'
    ))
    await clickSelector(materialChange)
    const resultPresentation=[]
    for(const [label,selector] of [
      ['Material Change','button[aria-label="Material Change"]'],
      ['Material percent change','button[aria-label="Material percent change"]']
    ]){
      const read=()=>evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)}),cell=button?.closest('td'),suffix=cell?.querySelector('[data-numeric-suffix]');return button&&cell?{text:button.textContent.trim(),color:getComputedStyle(button).color,parentColor:getComputedStyle(cell).color,fontWeight:getComputedStyle(button).fontWeight,suffix:suffix?.textContent.trim()??null,pressed:button.getAttribute('aria-pressed')}:null})()`)
      const idle=await read()
      await hoverSelectedNumber(selector)
      const preview=await read()
      await clickSelector(selector)
      const pinned=await read()
      await clickSelector(selector)
      const unpinned=await read()
      resultPresentation.push({label,idle,preview,pinned,unpinned})
    }
    check('Result Change and percent preserve their source foreground, sign, suffix, and weight through Selected Value states',resultPresentation.length===2&&resultPresentation.every(item=>item.idle&&item.preview&&item.pinned&&item.unpinned&&item.idle.color===item.idle.parentColor&&item.preview.color===item.preview.parentColor&&item.pinned.color===item.pinned.parentColor&&item.unpinned.color===item.unpinned.parentColor&&item.idle.color===item.preview.color&&item.idle.fontWeight===item.preview.fontWeight&&item.pinned.pressed==='true'&&item.unpinned.pressed==='false'&&(item.label==='Material percent change'?item.idle.suffix==='%':true)),resultPresentation)
    const unavailableResultCells = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] td')].filter(cell=>cell.textContent.trim()==='—').map(cell=>({text:cell.textContent.trim(),selectable:!!cell.querySelector('button[data-selected-number]')})))()`)
    check('Unavailable Result em-dash values have no SelectedNumber target', unavailableResultCells.every(cell => !cell.selectable), unavailableResultCells)

    const economicOutcomePresentation=[]
    for(const label of ['Parameter Saving','Required Saving','Economic Margin','Operating Profit']){
      const selector=`section[aria-labelledby="simulation-economic-inputs-title"] [data-economic-outcome-value="${label}"] [data-selected-number]`
      const available=await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)})?.getClientRects().length)`)
      if(!available){economicOutcomePresentation.push({label,unavailable:true,text:await evaluate(`document.querySelector('section[aria-labelledby="simulation-economic-inputs-title"] [data-economic-outcome-value="${label}"]')?.textContent.trim()??null`)});continue}
      const read=()=>evaluate(`(()=>{const value=document.querySelector(${JSON.stringify(selector)}),wrapper=value?.parentElement,raw=value?.textContent.trim().replaceAll(',','')??'',number=Number(raw),rgb=(getComputedStyle(value??document.body).color.match(/[\\d.]+/g)??[]).slice(0,3).map(Number),linear=rgb.map(channel=>{const c=channel/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4}),luminance=0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2],contrast=(1.05)/(luminance+0.05);return value?{text:raw,number,color:getComputedStyle(value).color,parentColor:getComputedStyle(wrapper).color,className:wrapper.className,pressed:value.getAttribute('aria-pressed'),contrast}:null})()`)
      const idle=await read()
      const preview=await hoverSelectedNumber(selector)
      const hovered=await read()
      await clickSelector(selector)
      const pinned=await read()
      await clickSelector(selector)
      const unpinned=await read()
      economicOutcomePresentation.push({label,idle,preview,hovered,pinned,unpinned})
    }
    const availableEconomicOutcomes=economicOutcomePresentation.filter(item=>!item.unavailable)
    check('Economic outcome colors follow favorable/unfavorable/neutral semantics and remain readable through Preview and Pin',economicOutcomePresentation.length===4&&availableEconomicOutcomes.length>=2&&economicOutcomePresentation.every(item=>item.unavailable?item.text==='—':item.idle&&item.preview?.kind==='output'&&item.idle.color===item.idle.parentColor&&item.hovered.color===item.idle.color&&item.pinned.color===item.idle.color&&item.unpinned.color===item.idle.color&&item.pinned.pressed==='true'&&item.unpinned.pressed==='false'&&item.idle.contrast>=4.5&&(item.label==='Required Saving'?item.idle.className.includes('slate'):item.idle.number>0?item.idle.className.includes('emerald'):item.idle.number<0?item.idle.className.includes('rose'):item.idle.number===0?item.idle.className.includes('slate'):false)),economicOutcomePresentation)

    const variableBodySelector = 'input[aria-label="Variable Action Cost / Unit"]'
    const replaceInput = async (ariaLabel, value) => typeIntoInput(ariaLabel, value)
    const focusInput = async ariaLabel => {
      await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(item=>item.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&item.getClientRects().length);if(!input)return false;input.focus();return true})()`)
      await delay(180)
      return evaluate(`([...document.querySelectorAll('input')].find(item=>item.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&item.getClientRects().length)?.value??null)`)
    }
    const variableInitial = await replaceInput('Variable Action Cost / Unit', '12.3456789')
    const variableSource = await evaluate(`document.querySelector(${JSON.stringify(variableBodySelector)})?.getAttribute('data-selected-value-source')??null`)
    const headerSource = await evaluate(`document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]')?.getAttribute('data-selected-value-source')??null`)
    check('Economic body focus publishes the selected After-role source to the Header', Boolean(variableInitial === '12.3456789' && variableSource?.includes(':economic:current:') && headerSource === variableSource), { variableInitial, variableSource, headerSource })

    for (const [ariaLabel, field] of [
      ['Variable Action Cost / Unit', 'variableActionCostPerPiece'],
      ['Fixed Action Cost', 'fixedActionCost'],
      ['Batch Size', 'batchSize'],
      ['Selling Price', 'sellingPriceOverride'],
      ['SG&A %', 'sgaPercentOverride']
    ]) {
      const editableValue = await focusInput(ariaLabel)
      const bodySource = await evaluate(`([...document.querySelectorAll('input')].find(item=>item.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&item.getClientRects().length)?.getAttribute('data-selected-value-source')??null)`)
      const selectedHeaderSource = await evaluate(`document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]')?.getAttribute('data-selected-value-source')??null`)
      check(`${ariaLabel} native focus owns its matching After-role Header writer`, Boolean(editableValue !== null
        && bodySource?.includes(`:economic:current:`) && bodySource?.endsWith(`:input:${field}`)
        && selectedHeaderSource === bodySource), { ariaLabel, field, bodySource, selectedHeaderSource, editableValue })
    }
    await focusInput('Variable Action Cost / Unit')

    const previewWhileFocused = await hoverSelectedNumber(materialBefore)
    check('Hover Preview temporarily replaces the Header display without transferring the focused writer', Boolean(previewWhileFocused?.kind === 'output'))
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1437, y: 897 })
    await delay(140)
    const writerRestored = await visibleHeader()
    check('Clearing Preview restores the same focused editable source', Boolean(writerRestored?.kind === 'input' && writerRestored.source === variableSource))

    const exactAccepted = '123456789012345.123456789'
    const exactBodyValue = await replaceInput('Variable Action Cost / Unit', exactAccepted)
    const headerRestoresBodyValue = await focusInput('Selected value')
    check('Economic Header restores the exact high-magnitude decimal entered in the body', Boolean(exactBodyValue === exactAccepted && headerRestoresBodyValue === exactAccepted), { exactBodyValue, headerRestoresBodyValue })
    const exactHeaderExpected = '987654321098765.987654321'
    const exactHeaderValue = await replaceInput('Selected value', exactHeaderExpected)
    const bodyRestored = await focusInput('Variable Action Cost / Unit')
    check('Economic Header writer preserves every accepted digit when refocusing the body input', Boolean(exactHeaderValue === exactHeaderExpected && bodyRestored === exactHeaderExpected), { exactHeaderValue, bodyRestored })
    const undoButton = 'button[aria-label="Undo"]'
    await clickSelector(undoButton)
    const afterUndo = await focusInput('Variable Action Cost / Unit')
    check('Simulation toolbar Undo records Header edits through the source history path', afterUndo === exactAccepted, { afterUndo })
    await clickSelector('button[aria-label="Redo"]')
    const afterRedo = await focusInput('Variable Action Cost / Unit')
    check('Simulation toolbar Redo reapplies the exact Header edit', afterRedo === exactHeaderExpected, { afterRedo })
    const invalidMinimum = await replaceInput('Variable Action Cost / Unit', '-1')
    check('Economic Variable Action Cost keeps its zero minimum', invalidMinimum === exactHeaderExpected, { invalidMinimum })
    await replaceInput('Variable Action Cost / Unit', '0')
    await replaceInput('Fixed Action Cost', '100')
    await replaceInput('Selling Price', '200')

    const sgaBeforeInvalid = await focusInput('SG&A %')
    const invalidSgaMaximum = await replaceInput('SG&A %', '101')
    check('Business SG&A input rejects values above 100%', invalidSgaMaximum === sgaBeforeInvalid, { sgaBeforeInvalid, invalidSgaMaximum })
    const validSga = await replaceInput('SG&A %', '20.5')
    check('Business SG&A accepts a valid decimal within its domain', validSga === '20.5', { validSga })
    const batchBeforeInvalid = await focusInput('Batch Size')
    const invalidBatchDraft = await replaceInput('Batch Size', '12.5')
    check('Economic Batch Size remains integer-only', invalidBatchDraft === batchBeforeInvalid, { batchBeforeInvalid, invalidBatchDraft })
    const validBatch = await replaceInput('Batch Size', '25')
    const batchMarker = '[role="slider"][aria-label="Batch Size"]'
    const markerAfterBodyEdit = await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.getAttribute('aria-valuenow')??null`)
    check('Economic Batch Size body input and graph marker share the same underlying value', Boolean(validBatch === '25' && markerAfterBodyEdit === '25'), { validBatch, markerAfterBodyEdit })
    const batchBodySource = await evaluate(`document.querySelector('input[aria-label="Batch Size"]')?.getAttribute('data-selected-value-source')??null`)
    const batchHeaderEdit = await replaceInput('Selected value', '27')
    const markerAfterHeaderEdit = await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.getAttribute('aria-valuenow')??null`)
    check('Header editing of Batch Size updates the connected graph marker', Boolean(batchHeaderEdit === '27' && markerAfterHeaderEdit === '27' && batchBodySource?.includes(':economic:current:')), { batchHeaderEdit, markerAfterHeaderEdit, batchBodySource })

    await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.focus()`)
    await delay(180)
    const markerHeaderSource = await evaluate(`document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]')?.getAttribute('data-selected-value-source')??null`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp' })
    await delay(220)
    const markerAfterKeyboard = await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.getAttribute('aria-valuenow')??null`)
    const batchBodyAfterKeyboard = await focusInput('Batch Size')
    check('Native graph marker keeps keyboard editing connected to the Body input and Header source', Boolean(markerHeaderSource?.includes(':break-even:batch-size-marker') && markerAfterKeyboard === '28' && batchBodyAfterKeyboard === '28'), { markerHeaderSource, markerAfterKeyboard, batchBodyAfterKeyboard })

    await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.focus()`)
    await delay(120)
    const dragPoints = await evaluate(`(()=>{
      const svg=document.querySelector('figure[aria-labelledby="break-even-graph-title"] svg'),marker=svg?.querySelector('[role="slider"][aria-label="Batch Size"]'),line=marker?.querySelector('line[stroke="transparent"]')
      if(!svg||!marker||!line)return null
      const x=Number(line.getAttribute('x1')),y=(Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2
      const project=(px,py)=>{const point=svg.createSVGPoint();point.x=px;point.y=py;const r=point.matrixTransform(svg.getScreenCTM());return{x:r.x,y:r.y}}
      return{start:project(x,y),end:project(x+60,y)}
    })()`)
    if (dragPoints) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...dragPoints.start })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...dragPoints.start, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...dragPoints.end, button: 'left', buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...dragPoints.end, button: 'left', clickCount: 1 })
      await delay(220)
    }
    const markerAfterDrag = await evaluate(`document.querySelector(${JSON.stringify(batchMarker)})?.getAttribute('aria-valuenow')??null`)
    const bodyAfterDrag = await focusInput('Batch Size')
    check('Break-even Batch Size marker remains draggable and writes the same value to the Economic input', Boolean(dragPoints && markerAfterDrag && markerAfterDrag !== '28' && bodyAfterDrag === markerAfterDrag), { dragPoints, markerAfterDrag, bodyAfterDrag })

    const finiteOutputs = await evaluate(`(()=>[...document.querySelectorAll('div[aria-label="Economic and Business"] [role="group"][aria-label]')].filter(group=>['Parameter Saving / Unit','Required Saving / Unit','Economic Margin / Unit','Operating Profit / Unit'].includes(group.getAttribute('aria-label'))).map(group=>({label:group.getAttribute('aria-label'),button:!!group.querySelector('button[data-selected-number]'),value:group.textContent.trim()})))()`)
    check('Finite Economic outcomes use shared SelectedNumber inspection behavior', Boolean(finiteOutputs.length === 4 && finiteOutputs.every(output => output.button)), finiteOutputs)
    const breakEvenOutput = await evaluate(`(()=>{const group=document.querySelector('[role="group"][aria-label="Break-even Quantity"]');return group?{button:!!group.querySelector('button[data-selected-number]'),text:group.textContent.trim()}:null})()`)
    check('Break-even Quantity selects only a finite safe integer and keeps Not achieved unavailable', Boolean(breakEvenOutput && (breakEvenOutput.button
      ? /^\d+(?:,\d{3})*(?:\s|$)/.test(breakEvenOutput.text)
      : /Not achieved|—/.test(breakEvenOutput.text))), breakEvenOutput)
    if (finiteOutputs[1]?.button) {
      const requiredSaving = '[role="group"][aria-label="Required Saving / Unit"] button[data-selected-number]'
      const outcomePreview = await hoverSelectedNumber(requiredSaving)
      check('Economic Outcome direct hover previews with the shared delay', Boolean(outcomePreview?.kind === 'output' && outcomePreview.value !== '—'), { outcomePreview })
      await clickSelector(requiredSaving)
      check('Economic Outcome pins through the shared SelectedNumber control', await evaluate(`document.querySelector(${JSON.stringify(requiredSaving)})?.getAttribute('aria-pressed')`) === 'true')
      await clickSelector(requiredSaving)
    }

    const outcomePresentation = async ariaLabel => evaluate(`(()=>{
      const group=document.querySelector('[role="group"][aria-label='+${JSON.stringify(JSON.stringify(ariaLabel))}+']'),wrapper=group?.querySelector('[data-economic-outcome-value]'),button=wrapper?.querySelector('button[data-selected-number]')
      if(!wrapper||!button)return null
      const range=document.createRange();range.selectNodeContents(button.firstElementChild??button)
      const text=range.getBoundingClientRect(),buttonBox=button.getBoundingClientRect(),background=button.firstElementChild?.getBoundingClientRect(),semantic=getComputedStyle(wrapper),control=getComputedStyle(button)
      return {label:wrapper.getAttribute('data-economic-outcome-value'),text:button.textContent.trim(),semanticColor:semantic.color,controlColor:control.color,fontFamily:semantic.fontFamily,fontSize:semantic.fontSize,fontWeight:semantic.fontWeight,textAlign:semantic.textAlign,buttonBox:{left:buttonBox.left,right:buttonBox.right,top:buttonBox.top,bottom:buttonBox.bottom},textBox:{left:text.left,right:text.right,top:text.top,bottom:text.bottom},backgroundBox:background?{left:background.left,right:background.right,top:background.top,bottom:background.bottom}:null,pinned:button.getAttribute('aria-pressed')}
    })()`)
    for (const ariaLabel of ['Parameter Saving / Unit','Economic Margin / Unit','Operating Profit / Unit']) {
      const selector=`[role="group"][aria-label=${JSON.stringify(ariaLabel)}] [data-economic-outcome-value] button[data-selected-number]`
      const idle=await outcomePresentation(ariaLabel)
      await hoverSelectedNumber(selector)
      const preview=await outcomePresentation(ariaLabel)
      const previewHeader=await visibleHeader()
      await clickSelector(selector)
      const pinned=await outcomePresentation(ariaLabel)
      const pinnedHeaderStyle=await evaluate(`getComputedStyle(document.querySelector('[data-header-numeric-zone] [data-selected-value-output]')).color`)
      await clickSelector(selector)
      const unpinned=await outcomePresentation(ariaLabel)
      check(`${ariaLabel} preserves its inherited semantic color, sign, typography, and content-hug treatment through hover/pin/unpin`, Boolean(idle&&preview&&pinned&&unpinned
        && idle.semanticColor===idle.controlColor&&preview.semanticColor===preview.controlColor&&pinned.semanticColor===pinned.controlColor&&unpinned.semanticColor===unpinned.controlColor
        && idle.semanticColor===preview.semanticColor&&idle.semanticColor===pinned.semanticColor&&idle.semanticColor===unpinned.semanticColor
        && idle.fontFamily===preview.fontFamily&&idle.fontSize===preview.fontSize&&idle.fontWeight===preview.fontWeight&&idle.textAlign===preview.textAlign
        && Math.abs(idle.buttonBox.left-idle.textBox.left)<=1&&Math.abs(idle.buttonBox.right-idle.textBox.right)<=1
        && Math.abs(preview.backgroundBox.left-preview.textBox.left)<=1&&Math.abs(preview.backgroundBox.right-preview.textBox.right)<=1
        && Math.abs(pinned.backgroundBox.left-pinned.textBox.left)<=1&&Math.abs(pinned.backgroundBox.right-pinned.textBox.right)<=1
        && pinned.pinned==='true'&&unpinned.pinned==='false'&&previewHeader?.kind==='output'&&pinnedHeaderStyle==='rgb(241, 245, 249)'),
        {idle,preview,pinned,unpinned,previewHeader,pinnedHeaderStyle})
    }

    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    await delay(100)
    const sgaHeaderState=async()=>evaluate(`(()=>{
      const body=[...document.querySelectorAll('input')].find(input=>input.getClientRects().length&&input.getAttribute('aria-label')==='SG&A %'),header=document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]'),slot=document.querySelector('[data-header-percent-slot]')
      return {bodyValue:body?.value??null,bodySource:body?.getAttribute('data-selected-value-source')??null,headerSource:header?.getAttribute('data-selected-value-source')??null,percentageSlot:slot?.textContent.trim()??null,headerText:header?.value??null}
    })()`)
    await focusInput('SG&A %')
    const sgaHeader=await sgaHeaderState()
    check('SG&A publishes its existing 0–100 percentage semantic to Header Value without unit conversion',Boolean(sgaHeader.bodyValue==='20.5'&&sgaHeader.bodySource===sgaHeader.headerSource&&sgaHeader.percentageSlot==='%'),sgaHeader)
    await evaluate('document.activeElement?.blur()')
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    const sgaPreview=await hoverSelectedNumber('input[aria-label="SG&A %"]')
    const sgaPreviewSlot=await evaluate(`(()=>({value:document.querySelector('[data-header-numeric-zone] [data-selected-value-output]')?.textContent.trim()??null,percent:document.querySelector('[data-header-percent-slot]')?.textContent.trim()??null}))()`)
    check('SG&A preview uses the shared 2-decimal Header percentage presentation',Boolean(sgaPreview?.kind==='output'&&sgaPreviewSlot.value==='20.50'&&sgaPreviewSlot.percent==='%'),{sgaPreview,sgaPreviewSlot})

    const parameterSourceState=async ariaLabel=>evaluate(`(()=>{
      const input=[...document.querySelectorAll('input')].find(item=>item.getClientRects().length&&item.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}),header=document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]'),slot=document.querySelector('[data-header-percent-slot]'),wrapper=input?.closest('[data-simulation-input-wrapper]')
      return {input:input?.value??null,source:input?.getAttribute('data-selected-value-source')??null,headerSource:header?.getAttribute('data-selected-value-source')??null,active:document.activeElement===input,percentageSlot:slot?.textContent.trim()??null,duplicateSelectedNumber:Boolean(wrapper?.querySelector('button[data-selected-number]'))}
    })()`)
    for (const [ariaLabel,field] of [
      ['MAT-A Loss in Current','bom.loss'],
      ['OP-10 Yield in Current','routing.yield']
    ]) {
      await clickSelector(`input[aria-label=${JSON.stringify(ariaLabel)}]`)
      const state=await parameterSourceState(ariaLabel)
      check(`${ariaLabel} remains the sole native focus target and publishes percentage semantics`,Boolean(state.input!==null&&state.source?.includes(`:${field}`)&&state.source===state.headerSource&&state.active&&state.percentageSlot==='%'&&!state.duplicateSelectedNumber),state)
      const previous=state.input
      const invalid=await typeIntoInput(ariaLabel,'101')
      check(`${ariaLabel} keeps its existing 0–100 validation`,invalid===previous,{before:previous,invalid})
    }

    const bomPriceLabel='MAT-A Price in Current'
    const bomPriceInitial=await focusInput(bomPriceLabel)
    const bomPriceSource=await parameterSourceState(bomPriceLabel)
    const bomPriceBodyEdit=await replaceInput(bomPriceLabel,'12.3456789')
    const bomPriceHeaderEdit=await replaceInput('Selected value','23.987654321')
    const bomPriceBodyRestored=await focusInput(bomPriceLabel)
    check('Editable BOM Price keeps its native focus source and exact two-way Header writer',Boolean(bomPriceInitial!==null&&bomPriceSource.active&&bomPriceSource.source===bomPriceSource.headerSource&&!bomPriceSource.duplicateSelectedNumber&&bomPriceBodyEdit==='12.3456789'&&bomPriceHeaderEdit==='23.987654321'&&bomPriceBodyRestored==='23.987654321'),{bomPriceInitial,bomPriceSource,bomPriceBodyEdit,bomPriceHeaderEdit,bomPriceBodyRestored})
    await clickSelector('button[aria-label="Undo"]')
    const bomPriceUndo=await focusInput(bomPriceLabel)
    await clickSelector('button[aria-label="Redo"]')
    const bomPriceRedo=await focusInput(bomPriceLabel)
    check('Editable BOM Price Header changes retain Simulation history Undo/Redo',bomPriceUndo==='12.3456789'&&bomPriceRedo==='23.987654321',{bomPriceUndo,bomPriceRedo})
    const invalidBomPrice=await replaceInput(bomPriceLabel,'-1')
    check('Editable BOM Price retains its zero minimum',invalidBomPrice==='23.987654321',{invalidBomPrice})

    const routingCapacityLabel='OP-10 Capacity in Current'
    await focusInput(routingCapacityLabel)
    const capacitySource=await parameterSourceState(routingCapacityLabel)
    const capacityOriginal=capacitySource.input
    await replaceInput(routingCapacityLabel,'0')
    await evaluate('document.activeElement?.blur()')
    await delay(180)
    const invalidCapacity=await evaluate(`([...document.querySelectorAll('input')].find(item=>item.getClientRects().length&&item.getAttribute('aria-label')===${JSON.stringify(routingCapacityLabel)})?.value??null)`)
    check('Editable Routing Capacity keeps native focus, Header ownership, and its positive minimum',Boolean(capacitySource.source===capacitySource.headerSource&&capacitySource.active&&invalidCapacity===capacityOriginal),{capacitySource,invalidCapacity})

    const firstMaterialCost='section[data-simulation-table="bom"] button[data-selected-number][aria-label$="Material Cost"]'
    const materialCostPreview=await hoverSelectedNumber(firstMaterialCost)
    const materialCostSelection=await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(firstMaterialCost)});return button?{text:button.textContent.trim(),pinned:button.getAttribute('aria-pressed'),source:button.getAttribute('data-selected-value-source'),color:getComputedStyle(button).color,background:getComputedStyle(button.firstElementChild).backgroundColor,headerKind:document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]')?'input':'output'}:null})()`)
    check('Calculated BOM Material Cost previews read-only through the shared Header',Boolean(materialCostPreview?.kind==='output'&&materialCostSelection?.headerKind==='output'&&materialCostSelection.pinned==='false'&&materialCostSelection.text),{materialCostPreview,materialCostSelection})
    await clickSelector(firstMaterialCost)
    const materialCostPinned=await evaluate(`document.querySelector(${JSON.stringify(firstMaterialCost)})?.getAttribute('aria-pressed')`)
    await clickSelector(firstMaterialCost)
    const materialCostUnpinned=await evaluate(`document.querySelector(${JSON.stringify(firstMaterialCost)})?.getAttribute('aria-pressed')`)
    check('Calculated BOM Material Cost pins and unpins without creating an editor',materialCostPinned==='true'&&materialCostUnpinned==='false'&&!await evaluate(`Boolean(document.querySelector(${JSON.stringify(firstMaterialCost)}).closest('td')?.querySelector('input'))`),{materialCostPinned,materialCostUnpinned})

    await evaluate(`document.querySelector('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index]')?.click()`)
    await delay(100)
    const effectResults=[]
    for(const [label,selector] of [
      ['Parameter Cost Effect','section[data-simulation-table="bom"] tr[id^="bom-effect-"] button[data-selected-number][aria-label$="Parameter Cost Effect"]'],
      ['Total Parameter Cost Effect','section[data-simulation-table="bom"] tr[id^="bom-effect-"] button[data-selected-number][aria-label$="Total Parameter Cost Effect"]']
    ]){
      const read=()=>evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)}),cell=button?.closest('td'),wrapper=button?.parentElement;return button?{text:button.textContent.trim(),color:getComputedStyle(button).color,parentColor:getComputedStyle(wrapper).color,pressed:button.getAttribute('aria-pressed'),totalAnnotation:cell?.querySelector('[data-numeric-inline-annotation]')?.textContent.trim()??null,hasInput:Boolean(cell?.querySelector('input'))}:null})()`)
      const idle=await read()
      const preview=await hoverSelectedNumber(selector)
      const previewState=await read()
      await clickSelector(selector)
      const pinned=await read()
      await clickSelector(selector)
      const unpinned=await read()
      effectResults.push({label,idle,preview,previewState,pinned,unpinned})
    }
    check('BOM individual and Total effects remain read-only, preserve semantic colors/Total annotation, and support preview/pin/unpin',effectResults.length===2&&effectResults.every(item=>item.idle&&item.preview?.kind==='output'&&item.previewState.color===item.previewState.parentColor&&item.idle.color===item.idle.parentColor&&item.pinned.pressed==='true'&&item.unpinned.pressed==='false'&&!item.idle.hasInput&&(item.label==='Total Parameter Cost Effect'?item.idle.totalAnnotation==='Total':true)),effectResults)

    await setViewport(390)
    const routingCardHeading='section[data-simulation-table="routing"] article[aria-expanded="false"] h3'
    const routingCardNeedsExpansion=await evaluate(`(()=>{const heading=document.querySelector(${JSON.stringify(routingCardHeading)});if(!heading)return false;heading.scrollIntoView({block:'center'});return !heading.closest('article')?.querySelector('button[data-selected-number][aria-label$="Total Parameter Cost Effect"]')})()`)
    if(routingCardNeedsExpansion)await clickSelector(routingCardHeading)
    const mobileCalculated=await evaluate(`(()=>{
      const visible=section=>[...section.querySelectorAll('button[data-selected-number]')].filter(button=>button.getClientRects().length&&button.getBoundingClientRect().width>0)
      return ['bom','routing'].map(kind=>{const section=document.querySelector('section[data-simulation-table="'+kind+'"]'),buttons=visible(section),cost=buttons.find(button=>/Material Cost|Conversion Cost/.test(button.getAttribute('aria-label')??'')),effect=buttons.find(button=>(button.getAttribute('aria-label')??'').endsWith('Total Parameter Cost Effect'));return{kind,count:buttons.length,cost:cost?.getAttribute('aria-label')??null,readOnly:!cost?.closest('dd')?.querySelector('input'),effect:effect?.getAttribute('aria-label')??null,effectReadOnly:!effect?.closest('dd')?.querySelector('input')}})
    })()`)
    check('Mobile BOM/Routing card paths keep calculated read-only values selectable',mobileCalculated.length===2&&mobileCalculated.every(result=>result.count>0&&result.cost&&result.readOnly&&result.effect&&result.effectReadOnly),mobileCalculated)
    const mobileTotalEffect='section[data-simulation-table="bom"] article button[data-selected-number][aria-label$="Total Parameter Cost Effect"]'
    const mobileEffectPreview=await hoverSelectedNumber(mobileTotalEffect)
    await clickSelector(mobileTotalEffect)
    const mobileEffectPinned=await evaluate(`document.querySelector(${JSON.stringify(mobileTotalEffect)})?.getAttribute('aria-pressed')`)
    await clickSelector(mobileTotalEffect)
    check('Mobile Total Parameter Cost Effect supports shared read-only preview and pin lifecycle',mobileEffectPreview?.kind==='output'&&mobileEffectPinned==='true'&&await evaluate(`document.querySelector(${JSON.stringify(mobileTotalEffect)})?.getAttribute('aria-pressed')`)==='false',{mobileEffectPreview,mobileEffectPinned})
    await setViewport(1440)

    const footerChecks=[]
    for(const ariaLabel of ['Reference Standard Cost','Current Standard Cost','Net Gap']){
      const selector=`footer button[data-selected-number][aria-label=${JSON.stringify(ariaLabel)}]`
      const before=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e?{text:e.textContent.trim(),color:getComputedStyle(e).color,parentColor:getComputedStyle(e.parentElement).color,background:getComputedStyle(e.firstElementChild).backgroundColor}:null})()`)
      const preview=await hoverSelectedNumber(selector)
      const during=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e?{text:e.textContent.trim(),color:getComputedStyle(e).color,parentColor:getComputedStyle(e.parentElement).color,background:getComputedStyle(e.firstElementChild).backgroundColor,pinned:e.getAttribute('aria-pressed')}:null})()`)
      await clickSelector(selector)
      const pinned=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e?{pressed:e.getAttribute('aria-pressed'),color:getComputedStyle(e).color,parentColor:getComputedStyle(e.parentElement).color,background:getComputedStyle(e.firstElementChild).backgroundColor}:null})()`)
      await clickSelector(selector)
      footerChecks.push({ariaLabel,before,preview,during,pinned,unpinned:await evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-pressed')`),headerStyle:await evaluate(`getComputedStyle(document.querySelector('[data-header-numeric-zone] [data-selected-value-output]')).color`)})
    }
    check('Footer REF STD, CUR STD, and NET GAP preserve parent foreground semantics through preview/pin and remain read-only',footerChecks.length===3&&footerChecks.every(item=>item.before&&item.preview?.kind==='output'&&item.during.color===item.during.parentColor&&item.pinned.pressed==='true'&&item.pinned.color===item.pinned.parentColor&&item.unpinned==='false'&&item.headerStyle==='rgb(241, 245, 249)'),footerChecks)

    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    await replaceInput('Selling Price','0')
    await evaluate('document.activeElement?.blur()')
    await delay(260)
    const graphTooltip=()=>evaluate(`document.querySelector('[data-graph-tooltip-host] > div[aria-hidden="true"]')?.textContent??null`)
    const svgSelectionState=selector=>evaluate(`(()=>{
      const text=document.querySelector(${JSON.stringify(selector)});if(!text)return null
      const id=text.getAttribute('data-selected-value-source'),background=[...document.querySelectorAll('[data-selected-number-background]')].find(item=>item.getAttribute('data-selected-number-background')===id),glyph=text.getBBox(),box=background?.getBBox(),style=getComputedStyle(text)
      return {text:text.textContent.trim(),aria:text.getAttribute('aria-label'),selected:text.getAttribute('aria-pressed'),id,fill:style.fill,fontSize:style.fontSize,fontWeight:style.fontWeight,focused:text.matches(':focus-visible'),tooltipTarget:text.getAttribute('data-graph-tooltip'),glyph:{x:glyph.x,y:glyph.y,width:glyph.width,height:glyph.height},background:box?{x:box.x,y:box.y,width:box.width,height:box.height,pointerEvents:background.getAttribute('pointer-events'),stroke:background.getAttribute('stroke'),fill:background.getAttribute('fill')}:null,sourceTag:text.tagName,role:text.getAttribute('role')}
    })()`)
    const graphSelectors=[
      ['Standard Cost','svg text[data-graph-standard-cost-value="reference"]'],
      ['Visible +','svg text[data-graph-visible-total-side="positive"]'],
      ['Visible −','svg text[data-graph-visible-total-side="negative"]'],
      ['GAP total','svg text[data-graph-total="gap1"]'],
      ['GAP 2 total','svg text[data-graph-total="gap2"]'],
      ['Y-axis tick','svg text[data-axis-tick="1"]']
    ]
    const graphSurfaceResults=[]
    for(const [label,selector] of graphSelectors){
      const selectorState=await evaluate(`(()=>{const all=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.getClientRects().length);return all[0]?{count:all.length,label:all[0].getAttribute('aria-label'),value:all[0].textContent.trim()}:null})()`)
      if(!selectorState){graphSurfaceResults.push({label,missing:true});continue}
      const preview=await hoverSelectedNumber(selector)
      const hovered=await svgSelectionState(selector)
      const header=await visibleHeader()
      const previewTooltip=await graphTooltip()
      await clickSelector(selector)
      const pinned=await svgSelectionState(selector)
      const pinnedHeader=await visibleHeader()
      await clickSelector(selector)
      const unpinned=await svgSelectionState(selector)
      const svgColorAfter=await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fill`)
      graphSurfaceResults.push({label,selectorState,preview,hovered,header,previewTooltip,pinned,pinnedHeader,unpinned,svgColorAfter})
    }
    const graphSurfacePass=item=>item.label==='GAP 2 total'&&item.missing?true:item.preview?.kind==='output'&&item.hovered?.sourceTag==='text'&&item.hovered?.role==='button'&&item.hovered?.id&&item.hovered.fill===item.svgColorAfter&&item.hovered.background?.stroke==='none'&&item.pinned?.selected==='true'&&item.unpinned?.selected==='false'&&item.pinned.background?.pointerEvents==='none'&&item.pinned.background?.fill==='#dbeafe'&&item.pinned.background?.stroke==='none'&&Math.abs(item.pinned.background.x-item.pinned.glyph.x+2)<0.1&&Math.abs(item.pinned.background.y-item.pinned.glyph.y+1)<0.1&&Math.abs(item.pinned.background.width-item.pinned.glyph.width-4)<0.1&&Math.abs(item.pinned.background.height-item.pinned.glyph.height-2)<0.1&&item.header?.kind==='output'&&item.pinnedHeader?.kind==='output'
    check('Visible graph Standard Cost, Visible +/−, available GAP totals, and Y-axis ticks preserve semantic color and use tight mouse-pin backgrounds without a focus ring',graphSurfaceResults.length===6&&graphSurfaceResults.every(graphSurfacePass),graphSurfaceResults)

    const keyboardFocusTarget='svg text[data-graph-total="gap1"]'
    const keyboardFocusSetup=await evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(keyboardFocusTarget)}),focusable=[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(e=>e.tabIndex>=0&&!e.disabled&&e.getClientRects().length&&!e.closest('[aria-hidden="true"]')),index=focusable.indexOf(target),previous=focusable[index-1];if(!target||index<1||!previous)return null;previous.focus();return{targetIndex:index,previous:previous.getAttribute('aria-label')??previous.textContent.trim()}})()`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9})
    const keyboardFocused=await svgSelectionState(keyboardFocusTarget)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32})
    await delay(80)
    const keyboardSpacePinned=await svgSelectionState(keyboardFocusTarget)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13})
    await delay(80)
    const keyboardEnterUnpinned=await svgSelectionState(keyboardFocusTarget)
    check('Selected SVG values retain a visible keyboard focus ring and Space/Enter toggle Pin',Boolean(keyboardFocusSetup&&keyboardFocused?.focused&&keyboardFocused.background?.stroke==='#1d4ed8'&&keyboardFocused.selected==='false'&&keyboardSpacePinned?.focused&&keyboardSpacePinned.selected==='true'&&keyboardSpacePinned.background?.fill==='#dbeafe'&&keyboardSpacePinned.background?.stroke==='#1d4ed8'&&keyboardEnterUnpinned?.focused&&keyboardEnterUnpinned.selected==='false'&&keyboardEnterUnpinned.background?.stroke==='#1d4ed8'),{keyboardFocusSetup,keyboardFocused,keyboardSpacePinned,keyboardEnterUnpinned})

    const tooltipContentResults=[]
    for(const [label,selector,expected] of [
      ['Reference Standard Cost','svg text[data-graph-standard-cost-value="reference"]','Reference Standard Cost'],
      ['Visible +','svg text[data-graph-visible-total-side="positive"]',null],
      ['Visible −','svg text[data-graph-visible-total-side="negative"]',null],
      ['GAP 1 total','svg text[data-graph-total="gap1"]','Current − Reference'],
      ['GAP 2 total','svg text[data-graph-total="gap2"]','Custom − Current']
    ]){
      const target=await evaluate(`(()=>document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-label')??null)()`)
      if(!target){tooltipContentResults.push({label,missing:true});continue}
      await moveTo(selector)
      await delay(400)
      const tooltip=await graphTooltip()
      const aria=await evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-label')??null`)
      const expectedTooltip=expected??aria?.split(' ').slice(0,3).join(' ')
      tooltipContentResults.push({label,tooltip,aria,expected:expectedTooltip,repeatsNumber:Boolean(tooltip&&/[+-]?\d[\d,]*(?:\.\d+)?/.test(tooltip)),matches:tooltip===expectedTooltip})
    }
    const gapLabelsWithoutTooltip=await evaluate(`(()=>[...document.querySelectorAll('svg text')].filter(text=>/^GAP [12]$/.test(text.textContent.trim())).map(text=>({text:text.textContent.trim(),self:text.hasAttribute('data-graph-tooltip'),label:text.getAttribute('aria-label'),ancestorTarget:text.closest('[data-graph-tooltip]')?.getAttribute('data-graph-tooltip')??null,source:!!text.hasAttribute('data-selected-value-source')})) )()`)
    check('Graph numeric tooltips use context-only Standard Cost/Visible/GAP wording and GAP text labels have no tooltip',tooltipContentResults.length===5&&tooltipContentResults.every(item=>item.label==='GAP 2 total'&&item.missing||!item.missing&&item.matches&&!item.repeatsNumber)&&gapLabelsWithoutTooltip.length===2&&gapLabelsWithoutTooltip.every(item=>!item.self&&!item.label&&!item.ancestorTarget&&item.source===false),{tooltipContentResults,gapLabelsWithoutTooltip})

    const gapLabelBehavior=[]
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    await delay(80)
    for(const gap of ['gap1','gap2']){
      const selector=`svg text[data-graph-gap-label="${gap}"]`
      const before={header:await visibleHeader(),activeRole:await evaluate(`document.querySelector('svg foreignObject button[aria-pressed="true"]')?.getAttribute('aria-label')??null`),pinned:await evaluate(`document.querySelectorAll('svg [data-selected-number][aria-pressed="true"]').length`)}
      const label=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e?{text:e.textContent.trim(),cursor:getComputedStyle(e).cursor,tabIndex:e.getAttribute('tabindex'),role:e.getAttribute('role'),source:e.hasAttribute('data-selected-value-source'),tooltip:e.hasAttribute('data-graph-tooltip'),aria:e.getAttribute('aria-label'),ancestorTooltip:e.closest('[data-graph-tooltip]')?.getAttribute('data-graph-tooltip')??null}:null})()`)
      await clickSelector(selector)
      await delay(400)
      const after={header:await visibleHeader(),activeRole:await evaluate(`document.querySelector('svg foreignObject button[aria-pressed="true"]')?.getAttribute('aria-label')??null`),pinned:await evaluate(`document.querySelectorAll('svg [data-selected-number][aria-pressed="true"]').length`),tooltip:await graphTooltip()}
      gapLabelBehavior.push({gap,before,label,after})
    }
    check('GAP 1/2 category text stays default-cursor, non-focusable, tooltip-free, and has no click/Header/Pin behavior',gapLabelBehavior.length===2&&gapLabelBehavior.every(item=>item.label?.text===item.gap.replace('gap','GAP ')&&item.label.cursor==='default'&&item.label.tabIndex===null&&item.label.role===null&&!item.label.source&&!item.label.tooltip&&!item.label.aria&&!item.label.ancestorTooltip&&item.before.header?.value===item.after.header?.value&&item.before.header?.source===item.after.header?.source&&item.before.activeRole===item.after.activeRole&&item.before.pinned===item.after.pinned&&!item.after.tooltip),gapLabelBehavior)

    await moveTo('svg text[data-graph-standard-cost-value="reference"]')
    await delay(220)
    const quickTooltip=await graphTooltip()
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    await delay(180)
    const cancelledTooltip=await graphTooltip()
    await moveTo('svg text[data-graph-standard-cost-value="reference"]')
    await delay(390)
    const settledTooltip=await graphTooltip()
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    const immediateHide=await graphTooltip()
    const rulerHover=await evaluate(`(()=>{const e=document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]'),b=e?.getBoundingClientRect();return b?{x:b.left+b.width/2,y:b.top+b.height/2}:null})()`)
    if(rulerHover)await send('Input.dispatchMouseEvent',{type:'mouseMoved',...rulerHover})
    await delay(400)
    const rulerTooltip=await graphTooltip()
    const rulerPreviewHeader=await visibleHeader()
    await evaluate(`document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.focus()`)
    const rulerFocus=await evaluate(`(()=>{const slider=document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]'),header=document.querySelector('[data-header-numeric-zone] input[aria-label="Selected value"]');return{source:slider?.getAttribute('data-selected-value-source')??null,header:header?.getAttribute('data-selected-value-source')??null,headerEditable:Boolean(header),value:slider?.getAttribute('aria-valuenow')??null}})()`)
    check('Graph tooltip uses cancellable 350 ms dwell, hides immediately on leave, leaves the ruler tooltip-free, and ruler focus retains its native Header writer',Boolean(!quickTooltip&&!cancelledTooltip&&settledTooltip==='Reference Standard Cost'&&!immediateHide&&!rulerTooltip&&rulerPreviewHeader?.kind==='output'&&rulerFocus.source===rulerFocus.header&&rulerFocus.headerEditable),{quickTooltip,cancelledTooltip,settledTooltip,immediateHide,rulerTooltip,rulerPreviewHeader,rulerFocus})

    const graphicalOnly=await evaluate(`(()=>{const e=document.querySelector('svg [data-graph-state="reference"] rect[data-graph-part="material"]'),r=e?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
    if(graphicalOnly){await send('Input.dispatchMouseEvent',{type:'mouseMoved',...graphicalOnly});await delay(400)}
    const segmentTooltip=await graphTooltip()
    check('Graphical-only Material segment retains its numeric tooltip value and unit',Boolean(graphicalOnly&&segmentTooltip?.includes('Reference Material:')&&/\d[\d,]*(?:\.\d+)? THB\//.test(segmentTooltip)),{graphicalOnly,segmentTooltip})

    const layoutEvidence=await evaluate(`(()=>{
      const root=document.querySelector('[data-simulation-layout-root]'),upper=root?.querySelector('[data-simulation-upper-workspace]'),graph=upper?.querySelector('[data-simulation-upper-graph]'),right=upper?.querySelector('[data-simulation-upper-right]'),result=right?.querySelector('[data-simulation-layout-column="result-and-break-even"]'),economics=right?.children[1],lower=root?.children[1],bom=document.querySelector('section[data-simulation-table="bom"]'),routing=document.querySelector('section[data-simulation-table="routing"]'),svg=graph?.querySelector('svg'),texts=[...svg?.querySelectorAll('[data-graph-standard-cost-value],[data-graph-visible-total-value],[data-graph-total],[data-axis-tick]')??[]],boxes=texts.map(e=>{const r=e.getBBox();return{label:e.getAttribute('aria-label')??e.textContent.trim(),x:r.x,y:r.y,right:r.x+r.width,bottom:r.y+r.height}}),overlaps=[]
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(boxes[i].x<boxes[j].right&&boxes[i].right>boxes[j].x&&boxes[i].y<boxes[j].bottom&&boxes[i].bottom>boxes[j].y)overlaps.push([boxes[i].label,boxes[j].label])
      const barWidths=[...svg.querySelectorAll('rect[data-graph-part]')].map(e=>Number(e.getAttribute('width'))),centers=[...svg.querySelectorAll('foreignObject button[aria-label^="Select "]')].map(e=>{const r=e.getBoundingClientRect(),s=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return (r.left+r.width/2-s.left)/s.width*vb.width}).concat([...svg.querySelectorAll('text')].filter(e=>/^GAP [12]$/.test(e.textContent.trim())).map(e=>{const b=e.getBBox();return b.x+b.width/2})).sort((a,b)=>a-b)
      const rect=e=>{const r=e?.getBoundingClientRect();return r?{width:r.width,left:r.left,right:r.right}:null}
      const upperBox=rect(upper),graphBox=rect(graph),rightBox=rect(right),bomBox=rect(bom),routingBox=rect(routing)
      return {upper:upperBox,graph:graphBox,right:rightBox,result:rect(result),economics:rect(economics),bom:bomBox,routing:routingBox,upperTrackDifference:Math.abs((graphBox?.width??0)-(rightBox?.width??0)),lowerTrackDifference:Math.abs((bomBox?.width??0)-(routingBox?.width??0)),upperDivider:(graphBox?.right+rightBox?.left)/2,lowerDivider:(bomBox?.right+routingBox?.left)/2,splitAlignment:Math.abs((graphBox?.right+rightBox?.left)/2-(bomBox?.right+routingBox?.left)/2),rightResultShare:result?.getBoundingClientRect().width/((result?.getBoundingClientRect().width??0)+(economics?.getBoundingClientRect().width??0)),barWidths:[...new Set(barWidths)],centers,centerGaps:centers.slice(1).map((x,i)=>x-centers[i]),viewBox:svg?.getAttribute('viewBox'),overlaps,selectedTargets:texts.length,graphFont:[...svg.querySelectorAll('[data-graph-standard-cost-value],[data-graph-visible-total-value]')].map(e=>getComputedStyle(e).fontSize)}
    })()`)
    check('Story Graph and the complete right upper workspace use equal desktop tracks aligned with BOM/Routing while retaining readable graph geometry',Boolean(layoutEvidence&&layoutEvidence.upperTrackDifference<=0.5&&layoutEvidence.lowerTrackDifference<=0.5&&layoutEvidence.splitAlignment<=1&&layoutEvidence.rightResultShare>=0.55&&layoutEvidence.rightResultShare<=0.75&&layoutEvidence.barWidths.includes(54)&&layoutEvidence.barWidths.includes(50)&&layoutEvidence.centers.length===5&&layoutEvidence.centerGaps.every(gap=>gap<=110)&&layoutEvidence.overlaps.length===0&&layoutEvidence.graphFont.every(size=>parseFloat(size)>=9)),layoutEvidence)

    await evaluate('document.activeElement?.blur()')
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1437,y:10})
    await delay(50)
    const graphScale=()=>evaluate(`(()=>({values:[...document.querySelectorAll('svg text[data-axis-tick]')].map(e=>e.textContent.trim()),max:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemax'),min:document.querySelector('svg [role="slider"][aria-label="Simulation comparison ruler"]')?.getAttribute('aria-valuemin')}))()`)
    const oldTickSelector='svg text[data-axis-tick="1"]'
    const scaleBeforePreview=await graphScale()
    const oldPreview=await hoverSelectedNumber(oldTickSelector)
    await evaluate(`([...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] ul[aria-label="Simulation graph legend"] button[aria-pressed="true"]')]).forEach(button=>button.click())`)
    await delay(500)
    const scaleAfterPreview=await graphScale()
    const stalePreview=await visibleHeader()
    await evaluate(`([...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] button')]).find(button=>button.innerText.trim()==='Show all')?.click()`)
    await delay(180)
    const scaleBeforePin=await graphScale()
    const oldTick=await evaluate(`(()=>{const tick=document.querySelector('svg text[data-axis-tick="1"]');return tick?{value:tick.textContent.trim(),id:tick.getAttribute('data-selected-value-source')}:null})()`)
    await clickSelector(oldTickSelector)
    const oldTickPinned=await evaluate(`document.querySelector(${JSON.stringify(oldTickSelector)})?.getAttribute('aria-pressed')`)
    await evaluate(`([...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] ul[aria-label="Simulation graph legend"] button[aria-pressed="true"]')]).forEach(button=>button.click())`)
    await delay(500)
    const scaleAfterPin=await graphScale()
    const stalePin=await visibleHeader()
    const noOldPin=await evaluate(`![...document.querySelectorAll('svg text[data-axis-tick]')].some(e=>e.getAttribute('aria-pressed')==='true')`)
    await evaluate(`([...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] button')]).find(button=>button.innerText.trim()==='Show all')?.click()`)
    await delay(180)
    const reselectedTick=await hoverSelectedNumber(oldTickSelector)
    check('Dynamic graph scale clears stale Preview and Pin sources without transferring selection, then allows re-selection',Boolean(oldPreview?.kind==='output'&&oldPreview.value!=='—'&&scaleBeforePreview.values.join('|')!==scaleAfterPreview.values.join('|')&&stalePreview?.value==='—'&&oldTick&&oldTickPinned==='true'&&scaleBeforePin.values.join('|')!==scaleAfterPin.values.join('|')&&stalePin?.value==='—'&&noOldPin&&reselectedTick?.kind==='output'&&reselectedTick.value!=='—'),{oldPreview,scaleBeforePreview,scaleAfterPreview,stalePreview,oldTick,oldTickPinned,scaleBeforePin,scaleAfterPin,stalePin,noOldPin,reselectedTick})

    const afterTrigger = await evaluate(`([...document.querySelectorAll('button[aria-label^="After dataset,"]')].find(button=>button.getClientRects().length)?.getAttribute('aria-label'))`)
    await clickSelector(`button[aria-label=${JSON.stringify(afterTrigger)}]`)
    await clickComparisonOption('After', 'Custom')
    await waitVisible('button[aria-label="After dataset, Custom"]', 'Custom After comparison role')
    const unavailableCustomCells = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] td')].filter(cell=>cell.textContent.trim()==='—').map(cell=>({label:cell.closest('tr')?.querySelector('th[scope="row"]')?.textContent.trim()??null,selectable:!!cell.querySelector('button[data-selected-number]')})))()`)
    check('Unavailable Custom Result values remain non-selectable', unavailableCustomCells.length > 0 && unavailableCustomCells.every(cell => !cell.selectable), unavailableCustomCells)
    await screenshot('simulation-round4b-selected-value')
  } else {
  let routingReferenceYieldBaseline = null
  if (!finalCorrectionsOnly) {
    await clickRole('Reference')
    routingReferenceYieldBaseline = await evaluate(`(()=>{
      const section=document.querySelector('section[data-simulation-table="routing"]')
      const input=[...(section?.querySelectorAll('input[data-numeric-editor]')??[])].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith('Yield in Reference'))
      const slot=input?.closest('[data-simulation-input-wrapper="true"]')
      const suffix=slot?.children[1]
      return {value:input?.value??null,suffix:suffix?.textContent.trim()??null,suffixVisibility:suffix?getComputedStyle(suffix).visibility:null}
    })()`)
    await clickRole('Current')
  }

  if (finalCorrectionsOnly) {
    for (const kind of ['bom','routing']) {
      const section=`section[data-simulation-table="${kind}"]`
      const header=`${section} button[role="checkbox"]`
      const row=`${section} tbody tr[data-simulation-row-index] td:first-child button[aria-pressed]`
      const selectionGeometry=()=>evaluate(`(()=>{
        const section=document.querySelector(${JSON.stringify(section)}),header=section.querySelector('button[role="checkbox"]');
        const rows=[...section.querySelectorAll('tbody tr[data-simulation-row-index] td:first-child button[aria-pressed]')];
        const box=e=>{const b=e.getBoundingClientRect(),style=getComputedStyle(e);return {width:b.width,height:b.height,center:b.left+b.width/2,radius:style.borderRadius}};
        return {checked:header.getAttribute('aria-checked'),selected:rows.filter(e=>e.getAttribute('aria-pressed')==='true').length,total:rows.length,header:box(header),rows:rows.map(box)};
      })()`)
      for (const state of ['none','mixed','all']) {
        if(state==='mixed') await clickSelector(row)
        if(state==='all') await clickSelector(header)
        const geometry=await selectionGeometry()
        const expected=state==='none'?'false':state==='mixed'?'mixed':'true'
        check(`Simulation ${kind} selection ${state} retains matching 28px header/row squares and semantics`,geometry.checked===expected&&geometry.total>1&&geometry.selected===(state==='none'?0:state==='mixed'?1:geometry.total)&&[geometry.header,...geometry.rows].every(b=>Math.abs(b.width-28)<0.5&&Math.abs(b.height-28)<0.5&&b.radius===geometry.header.radius&&Math.abs(b.center-geometry.header.center)<1),geometry)
        const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(header)}).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point})
        const hovered=await selectionGeometry()
        check(`Simulation ${kind} selection ${state} hover keeps square geometry`,JSON.stringify(hovered)===JSON.stringify(geometry),hovered)
      }
      await clickSelector(header)
      const restored=await selectionGeometry()
      check(`Simulation ${kind} Select-All restores none after all`,restored.checked==='false'&&restored.selected===0,restored)
    }
    const outcomeState = () => evaluate(`(()=>{
      const outcome=document.querySelector('[aria-labelledby="simulation-economic-outcome-title"]');
      const rows=[...outcome.querySelectorAll('[role="group"]')];
      const op=rows.find(e=>e.getAttribute('aria-label')==='Operating Profit / Unit');
      const table=document.querySelector('[data-simulation-result-body] table');
      const value=label=>{const row=[...table.querySelectorAll('tbody tr')].find(e=>e.querySelector('th')?.textContent===label);return Number(row?.querySelectorAll('td')[1]?.textContent.replaceAll(',','').trim())};
      return {labels:rows.map(e=>e.querySelector('span')?.textContent),op:op?.querySelector('[data-numeric-token]')?.textContent, color:op?.lastElementChild.className,unit:outcome.firstElementChild.textContent,expected:value('Selling Price')-value('Standard Cost')-value('SG&A')};
    })()`)
    await typeIntoInput('SG&A %', '10')
    for (const sellingPrice of ['10000', '0']) {
      await typeIntoInput('Selling Price', sellingPrice)
      await evaluate('document.activeElement?.blur()')
      await delay(250)
      const state=await outcomeState()
      const actual=Number(state.op?.replaceAll(',','').trim())
      check(`Outcome Operating Profit uses canonical dynamic signed economics at Selling Price ${sellingPrice}`,Number.isFinite(actual)&&Math.abs(actual-state.expected)<0.03&&(sellingPrice==='0'?actual<0&&state.color.includes('rose'):actual>0&&state.color.includes('emerald')),state)
      check('Outcome hierarchy retains full Operating Profit label between Margin and Break-even Quantity with shared UOM',state.labels.join('|')==='Parameter Saving|Required Saving|Economic Margin|Operating Profit|Break-even Quantity'&&state.unit.includes('THB/'),state)
    }
    for (const width of [1440,1024,768,390,320]) {
      await setViewport(width)
      await evaluate('document.querySelector("[data-simulation-result-body]").scrollIntoView({block:"center",inline:"nearest"})')
      const state=await evaluate(`(()=>{
        const body=document.querySelector('[data-simulation-result-body]'),table=body.querySelector('table'),r=body.getBoundingClientRect();
        const numeric=[...table.querySelectorAll('td')].map(cell=>{const b=cell.getBoundingClientRect();const tokens=[...cell.querySelectorAll('[data-numeric-token]')].map(e=>{const range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect();return {left:t.left,right:t.right}});return {left:b.left,right:b.right,tokens}});
        const header=[...table.querySelectorAll('thead th')].map(e=>e.textContent.trim());
        return {width:body.clientWidth,scroll:body.scrollWidth,table:table.getBoundingClientRect().width,viewport:innerWidth,inside:r.left>=0&&r.right<=innerWidth+1,numeric,header,suffixFonts:[...table.querySelectorAll('td [data-numeric-suffix]')].map(e=>({suffix:getComputedStyle(e).fontSize,numeric:getComputedStyle(e.parentElement.querySelector('[data-numeric-region]')).fontSize})),reflow:getComputedStyle(table.querySelector('tbody tr')).display==='grid'};
      })()`)
      check(`Result ${width}px fits card without horizontal scroll and retains four numeric headings`,state.scroll<=state.width+1&&state.table<=state.width+1&&state.inside&&state.header.length===5&&state.header[3]==='Change'&&state.header[4]==='%',state)
      check(`Result ${width}px numeric tokens stay inside individual columns without overlap`,state.numeric.length===32&&state.suffixFonts.length===8&&state.suffixFonts.every(f=>f.suffix===f.numeric)&&state.numeric.every(c=>c.tokens.every(t=>t.left>=c.left-1&&t.right<=c.right+1)),state.numeric)
      check(`Result ${width}px intentionally reflows labels only below the mobile viewport breakpoint`,state.reflow===(width<768),{viewportWidth:width,bodyWidth:state.width,reflow:state.reflow})
      const axes=await evaluate(`(${numericColumnGeometry.toString()})(document.querySelector('[data-simulation-result-body]'))`)
      const resultAxisDetails=await evaluate(`(()=>{
        const body=document.querySelector('[data-simulation-result-body]')
        const bodyWidth=body?.getBoundingClientRect().width??null
        const regions=[...(body?.querySelectorAll('[data-numeric-region="true"]')??[])].filter(region=>{
          const box=region.getBoundingClientRect()
          return box.width>12&&box.height>5&&!region.closest('.sr-only,[hidden]')
        })
        return regions.map(region=>{
          const regionBox=region.getBoundingClientRect()
          const cell=region.closest('td,th,[role=cell],[role=rowheader]')
          const columnBox=cell?.getBoundingClientRect()
          const token=region.querySelector('[data-numeric-token]')??region
          const range=document.createRange();range.selectNodeContents(token)
          const tokenBoxes=[...range.getClientRects()]
          const tokenWidth=tokenBoxes.length?Math.max(...tokenBoxes.map(box=>box.right))-Math.min(...tokenBoxes.map(box=>box.left)):null
          const header=cell?.closest('table')?.querySelector('thead tr:not(.sr-only)')?.children[cell.cellIndex]?.textContent.trim()??null
          return {bodyWidth,header,columnWidth:columnBox?.width??null,regionWidth:regionBox.width,tokenWidth,text:token.textContent.trim()}
        })
      })()`)
      axes.forEach((metric,index)=>{metric.resultLayout=resultAxisDetails[index]??null})
      const axisFailures=numericCenterlineFailures(axes)
      check(`Result ${width}px headers, numeric regions and ordinary decimals retain common centers`,axes.length===32&&axisFailures.length===0,{count:axes.length,failures:axisFailures})
      if (width===320) {
        await typeIntoInput('Selling Price', '1'+'0'.repeat(300))
        await evaluate('document.activeElement?.blur()')
        await delay(250)
        const extremes=await evaluate(`(${numericColumnGeometry.toString()})(document.querySelector('[data-simulation-result-body]'))`)
        const failures=numericCenterlineFailures(extremes)
        check('Result 320px extreme finite monetary/scientific values retain fit and alignment',extremes.length===32&&extremes.some(e=>e.scientific)&&failures.length===0,{count:extremes.length,failures})
        await evaluate('document.querySelector("[data-simulation-result-body]").scrollIntoView({block:"center",inline:"nearest"})')
      }
      await screenshot(`final-corrections-result-${width}`)
    }
  } else {
  if (!numericLayoutOnly) {
  const originalSellingPrice = await evaluate(`document.querySelector('input[aria-label="Selling Price"]').value`)
  // Exercise the real ruler at ordinary and wider monetary ranges without changing graph logic.
  const rulerState = () => evaluate(`(()=>{
    const svg=document.querySelector('svg[aria-labelledby="simulation-story-title"]'),text=svg.querySelector('[data-ruler-value]'),line=svg.querySelector('[data-ruler-line]'),slider=svg.querySelector('[role="slider"][aria-label="Simulation comparison ruler"]')
    const box=text.getBBox(),vb=svg.viewBox.baseVal,axis=svg.querySelector('[data-y-axis]')
    const anchors=[...svg.querySelectorAll('foreignObject')].map(e=>Number(e.getAttribute('x'))+Number(e.getAttribute('width'))/2)
    const gaps=[...svg.querySelectorAll('text')].filter(e=>/^GAP [12]$/.test(e.textContent.trim())).map(e=>Number(e.getAttribute('x')))
    const overlaps=[...svg.querySelectorAll('[data-graph-visible-total-value],[data-graph-standard-cost-value],[data-axis-tick],[data-y-axis-unit]')].filter(e=>{const b=e.getBBox();return box.x<b.x+b.width&&box.x+box.width>b.x&&box.y<b.y+b.height&&box.y+box.height>b.y}).map(e=>e.textContent)
    return {value:Number(slider.getAttribute('aria-valuenow')),min:Number(slider.getAttribute('aria-valuemin')),max:Number(slider.getAttribute('aria-valuemax')),label:text.textContent,textLength:text.getAttribute('textLength'),lengthAdjust:text.getAttribute('lengthAdjust'),fontSize:getComputedStyle(text).fontSize,anchor:text.getAttribute('text-anchor'),x:box.x,right:box.x+box.width,width:box.width,viewWidth:vb.width,plotLeft:Number(axis.getAttribute('x1')),plotRight:Number(line.getAttribute('x2')),labelX:Number(text.getAttribute('x')),anchors:[...anchors,...gaps].sort((a,b)=>a-b),overlaps,overflow:document.documentElement.scrollWidth>innerWidth+1}
  })()`)
  const rulerKey = async key => {
    await evaluate(`document.querySelector('[role="slider"][aria-label="Simulation comparison ruler"]').focus()`)
    await send('Input.dispatchKeyEvent', {type:'keyDown',key})
    await send('Input.dispatchKeyEvent', {type:'keyUp',key})
    await delay(80)
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await setViewport(width)
    for (const sellingPrice of ['300', '12345.67']) {
      await typeIntoInput('Selling Price', sellingPrice)
      await evaluate(`document.querySelector('figure[aria-labelledby="simulation-story-title"]').scrollIntoView({block:"center"})`)
      await rulerKey('End')
      const high = await rulerState()
      check(`${width}px Ruler ${high.label} uses natural glyphs in a real dedicated gutter`, high.textLength === null && high.lengthAdjust === null && high.fontSize === (width < 640 ? '16px' : '9px') && high.anchor === 'start' && high.labelX === high.plotRight + 6 && high.right <= high.viewWidth - 2 && high.overlaps.length === 0 && !high.overflow, high)
      check(`${width}px plot rebalances margins without compressing category spacing`, high.plotLeft === 74-19 && high.plotRight === 784-19 && high.plotRight-high.plotLeft === 710 && high.anchors.length === 5 && high.anchors.slice(1).every((x,i)=>x-high.anchors[i]===140), {left:high.plotLeft,right:high.plotRight,anchors:high.anchors})
      await screenshot(`simulation-ruler-${width}-${sellingPrice}`)
      await rulerKey('Home')
      const low = await rulerState()
      await rulerKey('ArrowUp')
      const arrow = await rulerState()
      await rulerKey('PageUp')
      const page = await rulerState()
      check(`${width}px Ruler Home/End/Arrow/Page controls retain their range`, high.value === high.max && low.value === low.min && arrow.value > low.value && page.value > arrow.value && page.value <= high.max, {min:low.value,max:high.value,arrow:arrow.value,page:page.value})
      const points = await evaluate(`(()=>{const svg=document.querySelector('svg[aria-labelledby="simulation-story-title"]'),line=svg.querySelector('[data-ruler-line]'),axis=svg.querySelector('[data-y-axis]');const point=y=>{const p=svg.createSVGPoint();p.x=(Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2;p.y=y;const r=p.matrixTransform(svg.getScreenCTM());return{x:r.x,y:r.y}};return{start:point(Number(line.getAttribute('y1'))),end:point((Number(axis.getAttribute('y1'))+Number(axis.getAttribute('y2')))/2)}})()`)
      await send('Input.dispatchMouseEvent', {type:'mousePressed',...points.start,button:'left',clickCount:1})
      await send('Input.dispatchMouseEvent', {type:'mouseMoved',...points.end,button:'left',buttons:1})
      await send('Input.dispatchMouseEvent', {type:'mouseReleased',...points.end,button:'left',clickCount:1})
      await delay(100)
      const dragged = await rulerState()
      check(`${width}px Ruler still drags vertically within its unchanged range`, dragged.value !== page.value && dragged.value >= dragged.min && dragged.value <= dragged.max && dragged.right <= dragged.viewWidth-2, {before:page.value,after:dragged.value,label:dragged.label})
    }
  }

  await setViewport(1440)
  await typeIntoInput('Selling Price', originalSellingPrice)

  }

  if (!rulerOnly) {
  if (!numericLayoutOnly) {
  // Reference is also an editable Simulation dataset in this product. Verify
  // that its live input labels/values align, then restore Current for the
  // marker fixture. Calculated costs and effect totals are the read-only cells.
  await clickRole('Reference')
  await waitFor(() => evaluate(`Boolean([...document.querySelectorAll('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index] input')].some(e=>e.getClientRects().length&&/Price in Reference$/.test(e.getAttribute('aria-label')||'')))`), 'editable Reference Simulation cells')
  const referenceTableMetrics = await evaluate(`(()=>{
    const result={}
    for(const kind of ['bom','routing']){
      const section=document.querySelector('section[data-simulation-table="'+kind+'"]'),header=section?.querySelector('table[role="presentation"]'),bodyTable=section?.querySelector('div[data-simulation-table-body] table'),row=bodyTable?.querySelector('tbody tr[data-simulation-row-index]')
      const labels=kind==='bom'?['Price','Usage','Loss','Material Cost']:['Manning','Capacity','Yield','Conversion Cost']
      const geometry=(${numericColumnGeometry.toString()})(row)
      const columns=geometry.map((metric,offset)=>{const cell=row.children[offset+3],input=cell?.querySelector('input');return {label:labels[offset],metric,text:input?.value??cell?.textContent.trim()??null,hasInput:!!input,aria:input?.getAttribute('aria-label')??null}})
      result[kind]={visible:!!section&&section.getClientRects().length>0,columns}
    }
    return result
  })()`)
  for(const kind of ['bom','routing']){
    const data=referenceTableMetrics[kind]
    check(`${kind.toUpperCase()} Reference role keeps parameter inputs editable and calculated cost read-only`,Boolean(data?.visible&&data.columns.slice(0,3).every(column=>column.hasInput&&column.aria?.endsWith('in Reference')&&column.text)&&!data.columns[3]?.hasInput&&data.columns[3]?.text),data)
    check(`${kind.toUpperCase()} Reference role exposes all four numeric columns`,data?.columns.length===4,data)
    for(const column of data?.columns??[]){const failures=numericCenterlineFailures([column.metric]);check(`${kind.toUpperCase()} Reference ${column.label} header text, numeric region and decimal share a centerline`,failures.length===0,{metric:column.metric,failures})}

  }
  await clickRole('Current')
  await waitFor(() => evaluate(`Boolean(document.querySelector('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index] input')?.getClientRects().length)`), 'editable Current Simulation cells')
  await delay(250)

  await screenshot('simulation-expandable-rows-collapsed')
  const collapsedGroups = await evaluate(`(()=>Object.fromEntries(['bom','routing'].map(kind=>{
    const row=document.querySelector('section[data-simulation-table="'+kind+'"] tbody tr[data-simulation-row-index]')
    return [kind,{expanded:row?.getAttribute('aria-expanded'),background:row?getComputedStyle(row).backgroundColor:null,bottomBorders:[...(row?.children??[])].map(cell=>getComputedStyle(cell).borderBottomWidth)}]
  })))()`)
  check('collapsed BOM and Routing main rows are white and end with a full-width group boundary',
    ['bom','routing'].every(kind=>collapsedGroups[kind]?.expanded==='false'
      && collapsedGroups[kind].background==='rgb(255, 255, 255)'
      && collapsedGroups[kind].bottomBorders.length===8
      && collapsedGroups[kind].bottomBorders.every(width=>width==='1px')), collapsedGroups)

  // Expand one real desktop BOM row and one Routing row with physical browser clicks.
  for (const kind of ['bom', 'routing']) {
    const rowSelector = `section[data-simulation-table="${kind}"] table:not([role="presentation"]) tbody tr[data-simulation-row-index]`
    const rowReady = await evaluate(`Boolean(document.querySelector(${JSON.stringify(rowSelector)})?.getClientRects().length)`)
    check(`${kind.toUpperCase()} desktop data row is present`, rowReady)
    if (rowReady) {
      const targetPoint = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(`${rowSelector} th[scope="row"]`)});if(!e)return null;e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
      await clickAt(targetPoint)
      await delay(200)
      const expanded = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(rowSelector)});return row?.getAttribute('aria-expanded')==='true'})()`)
      check(`${kind.toUpperCase()} Parameter Cost Effect expands in browser`, expanded)
      await screenshot(`simulation-expandable-${kind}-expanded`)
    }
  }

  for (const kind of ['bom', 'routing']) {
    const group = await evaluate(`(()=>{
      const section=document.querySelector('section[data-simulation-table="${kind}"]')
      const main=section?.querySelector('tbody tr[data-simulation-row-index]')
      const detail=main?.nextElementSibling?.matches('tr[id^="${kind}-effect-"]')?main.nextElementSibling:null
      const styles=row=>{if(!row)return null;const style=getComputedStyle(row);return{background:style.backgroundColor,borderTop:style.borderTopWidth,borderBottom:style.borderBottomWidth,backgroundImage:style.backgroundImage,cells:[...row.children].map(cell=>{const style=getComputedStyle(cell);return{top:style.borderTopWidth,bottom:style.borderBottomWidth}})}}
      const mainLabel=main?.querySelector('th[scope="row"]'),detailLabel=detail?.querySelector('th[scope="row"]')
      const point=element=>{const r=element?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null}
      return{expanded:main?.getAttribute('aria-expanded'),selected:main?.getAttribute('aria-selected'),main:styles(main),detail:styles(detail),mainPoint:point(mainLabel),detailPoint:point(detailLabel)}
    })()`)
    const sectionSelector = `section[data-simulation-table="${kind}"]`
    const mainPoint = group?.mainPoint
    const detailPoint = group?.detailPoint
    if (mainPoint) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mainPoint.x, y: mainPoint.y }); await delay(180) }
    const mainHover = await evaluate(`(()=>{const r=document.querySelector('${sectionSelector} tbody tr[data-simulation-row-index]');return r?getComputedStyle(r).backgroundColor:null})()`)
    if (detailPoint) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: detailPoint.x, y: detailPoint.y }); await delay(180) }
    const detailHover = await evaluate(`(()=>{const r=document.querySelector('${sectionSelector} tbody tr[data-simulation-row-index]')?.nextElementSibling;return r?getComputedStyle(r).backgroundColor:null})()`)
    const noInset = group?.detail?.cells?.every(cell=>cell.top==='0px')
      && group?.detail?.backgroundImage === 'none'
    const fullEnd = group?.detail?.cells?.length===7
      && group.detail.cells.every(cell=>cell.bottom==='1px')
    const fullStart = group?.main?.cells?.every(cell=>cell.bottom==='1px')
    check(`${kind.toUpperCase()} expanded group keeps FULL boundaries above and below a white no-inset detail row, with main-row-only hover`,
      Boolean(group?.expanded==='true' && group.selected==='false'
        && group.main?.background==='rgb(255, 255, 255)' && fullStart
        && group.detail?.background==='rgb(255, 255, 255)' && noInset && fullEnd
        && mainHover==='rgb(248, 250, 252)' && detailHover==='rgb(255, 255, 255)'),
      { ...group, mainHover, detailHover, fullStart, noInset, fullEnd })
  }
  for (const kind of ['bom', 'routing']) {
    const sectionSelector = `section[data-simulation-table="${kind}"]`
    const rowSelector = `${sectionSelector} tbody tr[data-simulation-row-index]`
    const bodySelector = `${sectionSelector} [data-simulation-table-body]`
    const initial = await evaluate(`(()=>{
      const body=document.querySelector(${JSON.stringify(bodySelector)}),row=document.querySelector(${JSON.stringify(rowSelector)})
      body?.scrollIntoView({block:'center',inline:'nearest'})
      if(body)body.scrollTop=0
      const r=body?.getBoundingClientRect()
      return body&&r?{expanded:row?.getAttribute('aria-expanded'),scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,overflowY:getComputedStyle(body).overflowY,scrollTop:body.scrollTop,left:r.left,right:r.right,top:r.top,bottom:r.bottom,clientWidth:body.clientWidth,width:r.width,contained:r.top>=0&&r.bottom<=innerHeight+1}:null
    })()`)
    const overflow = initial?.scrollHeight > initial?.clientHeight + 2
    check(`${kind.toUpperCase()} expanded disclosure stays contained and scrolls only when its content exceeds the natural body height`,
      initial?.expanded === 'true' && initial?.overflowY === 'auto' && initial?.scrollHeight >= initial?.clientHeight
        && initial?.contained && (!overflow || initial?.scrollHeight > initial?.clientHeight + 2), initial)
    if (!overflow) continue

    const wheelPoint = { x: initial.left + Math.min(40, initial.clientWidth / 2), y: (initial.top + initial.bottom) / 2 }
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...wheelPoint, deltaX: 0, deltaY: 180 })
    await delay(180)
    const afterWheel = await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)}),row=document.querySelector(${JSON.stringify(rowSelector)});return{scrollTop:body?.scrollTop,expanded:row?.getAttribute('aria-expanded')}})()`)
    check(`${kind.toUpperCase()} wheel scrolling keeps its expanded disclosure open`,
      afterWheel?.scrollTop > 0 && afterWheel.expanded === 'true', afterWheel)

    await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)});if(body)body.scrollTop=0})()`)
    await delay(120)
    const thumb = await evaluate(`(()=>{
      const body=document.querySelector(${JSON.stringify(bodySelector)}),r=body?.getBoundingClientRect()
      if(!body||!r)return null
      const track=body.clientHeight,thumbHeight=Math.max(18,track*track/body.scrollHeight),gutter=r.width-body.clientWidth
      return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollTop:body.scrollTop,scrollHeight:body.scrollHeight,clientHeight:track,gutter,thumbHeight,x:r.left+body.clientWidth+gutter/2,y:r.top+thumbHeight/2}
    })()`)
    if (thumb && thumb.gutter > 3) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: thumb.x, y: thumb.y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: thumb.x, y: thumb.y, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: thumb.x, y: Math.max(thumb.y + 8, thumb.bottom - thumb.thumbHeight / 2 - 2), button: 'left', buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: thumb.x, y: Math.max(thumb.y + 8, thumb.bottom - thumb.thumbHeight / 2 - 2), button: 'left', clickCount: 1 })
      await delay(180)
    }
    const afterScrollbar = await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)}),row=document.querySelector(${JSON.stringify(rowSelector)});return{scrollTop:body?.scrollTop,expanded:row?.getAttribute('aria-expanded')}})()`)
    check(`${kind.toUpperCase()} native scrollbar dragging keeps its expanded disclosure open`,
      Boolean(thumb?.gutter > 3 && afterScrollbar?.scrollTop > 0 && afterScrollbar.expanded === 'true'), { thumb, afterScrollbar })

    await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)});if(body)body.scrollTop=0})()`)
    await delay(180)
    const rangeSelector = `${sectionSelector} footer span[aria-live="polite"]`
    const visibleRange = () => evaluate(`document.querySelector(${JSON.stringify(rangeSelector)})?.textContent.trim()??null`)
    const rangeBeforeNext = await visibleRange()
    const nextButton = `button[aria-label="Next ${kind === 'bom' ? 'BOM' : 'Routing'} row"]`
    const nextState = await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(nextButton)}),body=document.querySelector(${JSON.stringify(bodySelector)});return{disabled:b?.disabled,scrollTop:body?.scrollTop}})()`)
    if (nextState?.disabled === false) await clickSelector(nextButton)
    if (nextState?.disabled === false) await waitFor(async () => (await visibleRange()) !== rangeBeforeNext, `${kind.toUpperCase()} Next visible range update`, 1500)
    const afterNext = await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)}),row=document.querySelector(${JSON.stringify(rowSelector)}),range=document.querySelector(${JSON.stringify(rangeSelector)});return{scrollTop:body?.scrollTop,expanded:row?.getAttribute('aria-expanded'),range:range?.textContent.trim()??null}})()`)
    check(`${kind.toUpperCase()} footer Next navigation preserves the expanded disclosure`,
      nextState?.disabled === false && afterNext?.scrollTop > 0 && afterNext.range !== rangeBeforeNext && afterNext.expanded === 'true', { rangeBeforeNext, nextState, afterNext })
    const previousButton = `button[aria-label="Previous ${kind === 'bom' ? 'BOM' : 'Routing'} row"]`
    const previousState = await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(previousButton)});return{disabled:b?.disabled}})()`)
    if (previousState?.disabled === false) await clickSelector(previousButton)
    const afterPrevious = await evaluate(`(()=>{const body=document.querySelector(${JSON.stringify(bodySelector)}),row=document.querySelector(${JSON.stringify(rowSelector)}),range=document.querySelector(${JSON.stringify(rangeSelector)});return{scrollTop:body?.scrollTop,expanded:row?.getAttribute('aria-expanded'),range:range?.textContent.trim()??null}})()`)
    check(`${kind.toUpperCase()} footer Previous navigation preserves the expanded disclosure`,
      previousState?.disabled === false && afterPrevious.expanded === 'true', { rangeBeforeNext, previousState, afterNext, afterPrevious })

    const secondRow = await evaluate(`(()=>{
      const rows=[...document.querySelectorAll(${JSON.stringify(`${sectionSelector} tbody tr[data-simulation-row-index][aria-expanded="false"]`)})]
      return rows.find(row=>row.getAttribute('aria-label')?.includes('activate to expand Parameter Cost Effect'))?.getAttribute('aria-label')??null
    })()`)
    if (secondRow) {
      const secondPoint = await evaluate(`(()=>{const row=[...document.querySelectorAll(${JSON.stringify(`${sectionSelector} tbody tr[data-simulation-row-index][aria-expanded="false"]`)})].find(row=>row.getAttribute('aria-label')===${JSON.stringify(secondRow)});row?.scrollIntoView({block:'center',inline:'nearest'});const r=row?.querySelector('th[scope="row"]')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
      await clickAt(secondPoint)
      const bothOpen = await evaluate(`(()=>[...document.querySelectorAll(${JSON.stringify(`${sectionSelector} tbody tr[data-simulation-row-index]`)})].filter(row=>row.getAttribute('aria-expanded')==='true').length)()`)
      check(`${kind.toUpperCase()} permits multiple parameter effect disclosures to remain open`, bothOpen >= 2, { secondRow, bothOpen })
      await clickAt(secondPoint)
      const firstStillOpen = await evaluate(`document.querySelector(${JSON.stringify(rowSelector)})?.getAttribute('aria-expanded')==='true'`)
      check(`${kind.toUpperCase()} explicitly closing one disclosure leaves the other open`, firstStillOpen, { secondRow })
    } else {
      check(`${kind.toUpperCase()} fixture has a second eligible row for multi-disclosure verification`, false, { secondRow })
    }

    const firstPoint = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(rowSelector)});row?.scrollIntoView({block:'center',inline:'nearest'});const r=row?.querySelector('th[scope="row"]')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
    await clickAt(firstPoint)
    const closed = await evaluate(`document.querySelector(${JSON.stringify(rowSelector)})?.getAttribute('aria-expanded')==='false'`)
    check(`${kind.toUpperCase()} explicit disclosure toggle still collapses the row`, closed)
    await clickAt(firstPoint)
    const reopened = await evaluate(`document.querySelector(${JSON.stringify(rowSelector)})?.getAttribute('aria-expanded')==='true'`)
    check(`${kind.toUpperCase()} explicit disclosure toggle reopens the row`, reopened)
  }
  await setViewport(390, 900)
  await evaluate('(()=>{const main=document.querySelector("#main-content");if(main)main.scrollTop=0})()')
  await delay(120)
  await evaluate('(()=>{const main=document.querySelector("#main-content");if(main)main.scrollTop=main.scrollHeight})()')
  await delay(180)
  const mobileViewportScroll = await evaluate(`(()=>{
    const main=document.querySelector('#main-content')
    const expanded=['bom','routing'].map(kind=>({kind,expanded:document.querySelector('section[data-simulation-table="'+kind+'"] tbody tr[data-simulation-row-index]')?.getAttribute('aria-expanded')}))
    return{clientHeight:main?.clientHeight,scrollHeight:main?.scrollHeight,scrollTop:main?.scrollTop,expanded}
  })()`)
  check('Scrollable mobile Simulation viewport scrolling preserves expanded BOM and Routing disclosures',
    Boolean(mobileViewportScroll?.scrollHeight > mobileViewportScroll?.clientHeight + 1
      && mobileViewportScroll?.scrollTop > 0 && mobileViewportScroll.expanded.every(row => row.expanded === 'true')),
    mobileViewportScroll)
  await setViewport(1024, 900)
  const resizedExpandedRows = await evaluate(`(()=>['bom','routing'].map(kind=>({kind,expanded:document.querySelector('section[data-simulation-table="'+kind+'"] tbody tr[data-simulation-row-index]')?.getAttribute('aria-expanded')})))()`)
  check('Expanded BOM and Routing disclosures survive the tablet viewport change', resizedExpandedRows.every(row => row.expanded === 'true'), resizedExpandedRows)
  await setViewport(1440, 900)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 })
  await delay(80)

  const desktopTableMetrics = await evaluate(`(()=>{
    const visible=e=>e&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'
    const result={}
    for(const kind of ['bom','routing']){
      const section=document.querySelector('section[data-simulation-table="'+kind+'"]')
      const header=section?.querySelector('table[role="presentation"]')
      const bodyTable=section?.querySelector('div[data-simulation-table-body] table')
      const headerCells=[...(header?.querySelectorAll('thead th')??[])]
      const row=bodyTable?.querySelector('tbody tr[data-simulation-row-index]')
      const expanded=section?.querySelector('tbody tr[id^="'+kind+'-effect-"]')
      const numericLabels=kind==='bom'?['Price','Usage','Loss','Material Cost']:['Manning','Capacity','Yield','Conversion Cost']
      const readOnlyRow=[...(bodyTable?.querySelectorAll('tbody tr[data-simulation-row-index]')??[])].find(candidate=>candidate!==row&&!candidate.querySelector('input'))
      const geometry=target=>target?(${numericColumnGeometry.toString()})(target):null
      result[kind]={visible:visible(section),labels:numericLabels,body:geometry(row),readOnly:geometry(readOnlyRow),effect:geometry(expanded),editableCount:row?.querySelectorAll('input').length??0,calculatedReadOnly:!!row?.children[6]&&!row.children[6].querySelector('input'),effectReadOnly:!!expanded&&!expanded.querySelector('input'),totalText:expanded?.children[5]?.textContent.trim()??null}

    }
    return result
  })()`)
  for (const kind of ['bom', 'routing']) {
    const data=desktopTableMetrics[kind]
    check(`${kind.toUpperCase()} table exposes all four header, editable-row, and expanded-effect numeric regions`,Boolean(data?.visible&&data.body?.length===4&&data.effect?.length===4&&data.editableCount===3),data)
    if(!data?.body||!data.effect) continue
    for(let offset=0;offset<4;offset++){
      const metrics=[data.body[offset],data.effect[offset]].filter(Boolean)
      const failures=numericCenterlineFailures(metrics)
      check(`${kind.toUpperCase()} ${data.labels[offset]} header text, value, effect and decimal retain shared centers`,metrics.length===2&&failures.length===0&&Math.abs(metrics[0].center-metrics[1].center)<=1,{metrics,failures})
    }
    check(`${kind.toUpperCase()} calculated-cost numeric value remains read-only on its header centerline`,data.calculatedReadOnly&&numericCenterlineFailures([data.body[3]]).length===0,data.body[3])
    if(data.readOnly){
      const failures=numericCenterlineFailures(data.readOnly)
      check(`${kind.toUpperCase()} read-only row retains all four numeric header/decimal centerlines`,data.readOnly.length===4&&failures.length===0,{metrics:data.readOnly,failures})
    }
    check(`${kind.toUpperCase()} expanded Total is read-only and aligned in calculated-cost region`,data.effectReadOnly&&data.totalText?.includes('Total')&&numericCenterlineFailures([data.effect[3]]).length===0,{text:data.totalText,metric:data.effect[3]})
  }

  const showAllMetrics = await evaluate(`(()=>{
    const card=document.querySelector('figure[aria-labelledby="simulation-story-title"]')
    const button=[...(card?.querySelectorAll('button')??[])].find(e=>e.innerText.trim()==='Show all')
    const legend=card?.querySelector('ul[aria-label="Simulation graph legend"]')
    if(!card||!button||!legend)return null
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
    const c=rect(card),b=rect(button),l=rect(legend)
    return {inside:card.contains(button),isLegendItem:legend.contains(button),card:c,button:b,legend:l,rightInset:c.right-b.right,gap:b.left-l.right,verticalCenterDelta:Math.abs((b.top+b.bottom-l.top-l.bottom)/2)}
  })()`)
  check('Cost Structure Show all is a distinct card-level action at the card top-right',
    Boolean(showAllMetrics?.inside && !showAllMetrics?.isLegendItem && showAllMetrics.rightInset <= 20 && showAllMetrics.gap >= 8 && showAllMetrics.verticalCenterDelta <= 10), showAllMetrics)
  const showAllInitiallyDisabled = await evaluate(`(()=>[...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] button')].find(e=>e.innerText.trim()==='Show all')?.disabled)()`)
  await clickSelector('figure[aria-labelledby="simulation-story-title"] button[aria-label="Material"]')
  const showAllEnabledAfterFilter = await evaluate(`(()=>{const card=document.querySelector('figure[aria-labelledby="simulation-story-title"]');return [...(card?.querySelectorAll('button')??[])].find(e=>e.innerText.trim()==='Show all')?.disabled===false})()`)
  await clickButtonText('Show all')
  const allLegendRestored = await evaluate(`(()=>[...document.querySelectorAll('figure[aria-labelledby="simulation-story-title"] ul[aria-label="Simulation graph legend"] button')].every(e=>e.getAttribute('aria-pressed')==='true'))()`)
  check('Cost Structure Show all preserves native disabled state and restores all Legend items after filtering',
    showAllInitiallyDisabled === true && showAllEnabledAfterFilter && allLegendRestored,
    { initiallyDisabled: showAllInitiallyDisabled, enabledAfterFiltering: showAllEnabledAfterFilter, allItemsRestored: allLegendRestored })

  const rowMetrics = await evaluate(`(()=>{
    const section=document.querySelector('section[aria-labelledby="simulation-result-title"]')
    return [...(section?.querySelectorAll('tbody tr')??[])].filter(row=>row.querySelector('th[scope="row"]')).map(row=>({label:row.querySelector('th')?.innerText.trim(),height:row.getBoundingClientRect().height,top:row.getBoundingClientRect().top,bottom:row.getBoundingClientRect().bottom}))
  })()`)
  check('Result panel has modestly spaced rows while retaining all original rows',
    rowMetrics.length >= 8 && rowMetrics.every(row => row.height >= 13), { rows: rowMetrics, minimumHeight: rowMetrics.length ? Math.min(...rowMetrics.map(row => row.height)) : null })

  // Provide valid test values through visible inputs so Batch Size and Break-even
  // markers are present in the rendered graph, including at narrow viewport widths.
  const simulationPriceLabel = await evaluate(`([...document.querySelectorAll('input')].find(e=>e.getClientRects().length&&/Price in (SIM|Custom|Current)$/.test(e.getAttribute('aria-label')||'')))?.getAttribute('aria-label')??null`)
  const markerFixture = []
  process.stdout.write('Preparing valid fixture values for Break-even markers.\n')
  if (simulationPriceLabel) markerFixture.push({ label: simulationPriceLabel, expected: '0', actual: await typeIntoInput(simulationPriceLabel, '0') })
  for (const [label, value] of [['Variable Action Cost / Unit', '0'], ['Fixed Action Cost', '100'], ['Batch Size', '100']]) {
    markerFixture.push({ label, expected: value, actual: await typeIntoInput(label, value) })
  }
  check('Visible Simulation, Business, and Economic inputs accept the valid fixture values used for graph markers',
    markerFixture.length === 4 && markerFixture.every(item => item.actual === item.expected), markerFixture)
  await evaluate('window.scrollTo({top:0,left:0,behavior:"instant"})')
  await delay(400)
  const breakEvenMarkerEvidence = await evaluate(`(()=>{const svg=document.querySelector('figure[aria-labelledby="break-even-graph-title"] svg');return{batchSlider:!!svg?.querySelector('[role="slider"][aria-label="Batch Size"]'),batchText:[...(svg?.querySelectorAll('text')??[])].some(e=>e.textContent.trim()==='Batch'),breakEvenMarkers:svg?.querySelectorAll('circle[aria-label^="Break-even Quantity:"]').length??0,parameterSaving:document.querySelector('[role="group"][aria-label="Parameter Saving / Unit"]')?.innerText.trim()??null,breakEvenHeading:document.querySelector('#break-even-graph-title')?.innerText.trim()??null}})()`)
  check('Break-even graph renders its Break-even quantity marker, Batch Size slider, and QTY label',
    Boolean(breakEvenMarkerEvidence.batchSlider && breakEvenMarkerEvidence.batchText && breakEvenMarkerEvidence.breakEvenMarkers >= 1), breakEvenMarkerEvidence)

  const breakEvenMetrics = await evaluate(`(()=>{
    const figure=document.querySelector('figure[aria-labelledby="break-even-graph-title"]'),svg=figure?.querySelector('svg')
    if(!figure||!svg)return null
    const viewBox=(svg.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number),lines=[...svg.querySelectorAll('line')]
    const horizontal=lines.filter(e=>Number(e.getAttribute('x2'))>Number(e.getAttribute('x1'))&&Math.abs(Number(e.getAttribute('y2'))-Number(e.getAttribute('y1')))<0.01).map(e=>({x1:Number(e.getAttribute('x1')),x2:Number(e.getAttribute('x2')),y1:Number(e.getAttribute('y1')),y2:Number(e.getAttribute('y2')),stroke:e.getAttribute('stroke')}))
    const plotLines=horizontal.filter(e=>e.stroke==='#e2e8f0'||e.stroke==='#64748b')
    const box=svg.getBoundingClientRect(),f=figure.getBoundingClientRect(),preserveAspectRatio=svg.getAttribute('preserveAspectRatio'),scaleX=box.width/viewBox[2],scaleY=box.height/viewBox[3]
    const yValues=plotLines.map(e=>e.y1),left=plotLines.length?Math.min(...plotLines.map(e=>e.x1)):null,right=plotLines.length?Math.max(...plotLines.map(e=>e.x2)):null,top=yValues.length?Math.min(...yValues):null,bottom=yValues.length?Math.max(...yValues):null
    const labels=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent.trim(),box:(()=>{const r=e.getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}})()}))
    const clippedLabels=labels.filter(label=>label.box.x < -1||label.box.y < -1||label.box.right > viewBox[2]+1||label.box.bottom > viewBox[3]+1)
    return {figure:{width:f.width,height:f.height},svg:{width:box.width,height:box.height,viewBox,preserveAspectRatio,scaleX,scaleY,coordinatesMatchRenderedBox:Math.abs(box.width-viewBox[2])<=1&&Math.abs(box.height-viewBox[3])<=1,uniformScale:Math.abs(scaleX-scaleY)<=0.005},plot:{left,right,top,bottom,widthRatio:(right-left)/viewBox[2],heightRatio:(bottom-top)/viewBox[3],leftInsetRatio:left/viewBox[2],bottomInsetRatio:(viewBox[3]-bottom)/viewBox[3]},lines:plotLines,labels,clippedLabels,markerCount:svg.querySelectorAll('[role="slider"][aria-label="Batch Size"]').length,breakEvenMarkerCount:svg.querySelectorAll('circle[aria-label^="Break-even Quantity:"]').length}
  })()`)
  check('Break-even graph sizes its coordinate system to the rendered box with uniform scaling and keeps labels/markers',
    Boolean(breakEvenMetrics && breakEvenMetrics.svg.coordinatesMatchRenderedBox && breakEvenMetrics.svg.uniformScale
      && breakEvenMetrics.svg.preserveAspectRatio === 'xMidYMid meet'
      && breakEvenMetrics.plot.widthRatio > 0.7 && breakEvenMetrics.plot.heightRatio > 0.5
      && breakEvenMetrics.markerCount === 1 && breakEvenMetrics.breakEvenMarkerCount >= 1
      && breakEvenMetrics.labels.some(label => label.text.includes('QTY')) && breakEvenMetrics.clippedLabels.length === 0), breakEvenMetrics)

  const batchSliderState = () => evaluate(`(()=>{const slider=document.querySelector('figure[aria-labelledby="break-even-graph-title"] [role="slider"][aria-label="Batch Size"]'),input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')==='Batch Size'&&e.getClientRects().length);return slider?{value:Number(slider.getAttribute('aria-valuenow')),max:Number(slider.getAttribute('aria-valuemax')),focused:document.activeElement===slider,inputValue:input?.value??null}:null})()`)
  const batchSliderBefore = await batchSliderState()
  await evaluate(`document.querySelector('figure[aria-labelledby="break-even-graph-title"] [role="slider"][aria-label="Batch Size"]')?.focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' })
  await delay(120)
  const batchSliderAfterKey = await batchSliderState()
  check('Break-even Batch Size slider remains keyboard accessible and updates its authoritative input',
    Boolean(batchSliderBefore && batchSliderAfterKey && batchSliderAfterKey.focused
      && batchSliderAfterKey.value === batchSliderBefore.value + 1
      && Number(batchSliderAfterKey.inputValue) === batchSliderAfterKey.value),
    { before: batchSliderBefore, after: batchSliderAfterKey })

  if (batchSliderBefore) {
    await typeIntoInput('Batch Size', String(batchSliderBefore.value))
    const dragPoints = await evaluate(`(()=>{const slider=document.querySelector('figure[aria-labelledby="break-even-graph-title"] [role="slider"][aria-label="Batch Size"]'),svg=slider?.ownerSVGElement,line=slider?.querySelector('line[stroke="transparent"]');if(!slider||!svg||!line)return null;const start=svg.createSVGPoint();start.x=Number(line.getAttribute('x1'));start.y=(Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2;const end=svg.createSVGPoint();end.x=start.x+(Number(slider.getAttribute('aria-valuemax'))/20);end.y=start.y;const matrix=svg.getScreenCTM();const a=start.matrixTransform(matrix),b=end.matrixTransform(matrix);return{start:{x:a.x,y:a.y},end:{x:b.x,y:b.y}}})()`)
    if (dragPoints) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...dragPoints.start })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...dragPoints.start, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...dragPoints.end, button: 'left', buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...dragPoints.end, button: 'left', clickCount: 1 })
      await delay(140)
    }
    const batchSliderAfterDrag = await batchSliderState()
    check('Break-even Batch Size slider preserves pointer dragging through its resized SVG coordinates',
      Boolean(dragPoints && batchSliderAfterDrag && batchSliderAfterDrag.value > batchSliderBefore.value
        && Number(batchSliderAfterDrag.inputValue) === batchSliderAfterDrag.value),
      { before: batchSliderBefore, after: batchSliderAfterDrag, dragPoints })
    await typeIntoInput('Batch Size', String(batchSliderBefore.value))
  }

  const storyMetrics = await evaluate(`(()=>{
    const figure=document.querySelector('figure[aria-labelledby="simulation-story-title"]'),svg=figure?.querySelector('svg[aria-labelledby="simulation-story-title"]'),host=figure?.querySelector('[data-graph-tooltip-host]')
    if(!figure||!svg||!host)return null
    const vb=(svg.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number)
    const ruler=svg.querySelector('[data-ruler-line]'),axis=svg.querySelector('[data-y-axis]'),ticks=[...svg.querySelectorAll('[data-axis-tick]')]
    const textBounds=element=>{const b=element.getBBox();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}}
    const categories=[...svg.querySelectorAll('foreignObject button[aria-label^="Select "]')].map(e=>({label:e.getAttribute('aria-label'),box:(()=>{const r=e.getBoundingClientRect();const s=svg.getBoundingClientRect();return{x:(r.left-s.left)/s.width*vb[2],y:(r.top-s.top)/s.height*vb[3],right:(r.right-s.left)/s.width*vb[2],bottom:(r.bottom-s.top)/s.height*vb[3]}})()}))
    const gapLabels=[...svg.querySelectorAll('text')].filter(e=>/^GAP [12]$/.test(e.textContent.trim())).map(e=>({label:e.textContent.trim(),box:textBounds(e)}))
    const relevant=[...svg.querySelectorAll('[data-y-axis-unit],[data-axis-tick],[data-ruler-value],[data-graph-visible-total-value],[data-graph-standard-cost-value],[data-graph-series="sellingPrice"]')].map(e=>({label:e.getAttribute('aria-label')??e.textContent.trim(),box:textBounds(e)}))
    const box=svg.getBoundingClientRect(),card=figure.getBoundingClientRect(),plotLeft=Number(axis?.getAttribute('x1')),plotRight=Number(ruler?.getAttribute('x2')),plotTop=Number(axis?.getAttribute('y1')),plotBottom=Number(axis?.getAttribute('y2'))
    const clipped=[...relevant,...gapLabels.map(label=>({label:label.label,box:label.box})),...categories.map(category=>({label:category.label,box:category.box}))]
      .filter(item=>item.box.x < -1 || item.box.y < -1 || item.box.right > vb[2]+1 || item.box.bottom > vb[3]+1)
    return {viewBox:vb,figure:{left:card.left,right:card.right,top:card.top,bottom:card.bottom,width:card.width,height:card.height},svg:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height},plot:{left:plotLeft,right:plotRight,top:plotTop,bottom:plotBottom,widthRatio:(plotRight-plotLeft)/vb[2],heightRatio:(plotBottom-plotTop)/vb[3],leftInsetRatio:plotLeft/vb[2],rightInsetRatio:(vb[2]-plotRight)/vb[2],topInsetRatio:plotTop/vb[3]},tickCount:ticks.length,yAxisUnit:svg.querySelector('[data-y-axis-unit]')?.textContent.trim()??null,categories,gapLabels,ruler:{line:Boolean(ruler),value:svg.querySelector('[data-ruler-value]')?.textContent.trim()??null},sellingPricePointCount:svg.querySelectorAll('[data-graph-series="sellingPrice"]').length,sellingPriceLineCount:[...svg.querySelectorAll('[data-graph-tooltip]')].filter(e=>e.getAttribute('aria-label')?.includes('Selling Price')&&e.tagName.toLowerCase()==='g').length,tooltipHost:{width:host.getBoundingClientRect().width,height:host.getBoundingClientRect().height},relevantCount:relevant.length,clipped}
  })()`)
  const storyBaseline = { widthRatio: 0.844, heightRatio: 0.705, leftInsetRatio: 0.107, topInsetRatio: 0.114 }
  check('Cost Structure plot improves on baseline bounds while preserving label/ruler gutters',
    Boolean(storyMetrics && storyMetrics.plot.widthRatio >= storyBaseline.widthRatio + 0.01 && storyMetrics.plot.heightRatio >= storyBaseline.heightRatio + 0.02 && storyMetrics.plot.leftInsetRatio <= storyBaseline.leftInsetRatio - 0.005 && storyMetrics.plot.topInsetRatio <= storyBaseline.topInsetRatio - 0.005 && Math.abs(storyMetrics.plot.leftInsetRatio - storyMetrics.plot.rightInsetRatio) < 0.001), { baseline: storyBaseline, current: storyMetrics })
  check('Cost Structure retains Y-axis/categories/ruler/Selling Price and all relevant labels inside graph bounds',
    Boolean(storyMetrics && storyMetrics.tickCount >= 4 && storyMetrics.yAxisUnit && storyMetrics.categories.length === 3 && storyMetrics.gapLabels.length === 2 && storyMetrics.ruler.line && storyMetrics.ruler.value && storyMetrics.sellingPricePointCount >= 2 && storyMetrics.clipped.length === 0),
    storyMetrics && { tickCount: storyMetrics.tickCount, yAxisUnit: storyMetrics.yAxisUnit, categories: storyMetrics.categories, gapLabels: storyMetrics.gapLabels, ruler: storyMetrics.ruler, sellingPricePointCount: storyMetrics.sellingPricePointCount, clipped: storyMetrics.clipped })

  const standardCostStyleEvidence = await evaluate(`(()=>['reference','current'].map(role=>{
    const line=document.querySelector('line[data-graph-standard-cost="'+role+'"]'),outline=line?.parentElement?.querySelector('rect'),label=document.querySelector('text[data-graph-standard-cost-value="'+role+'"]')
    if(!line||!outline||!label)return{role,missing:true}
    return{role,lineStroke:getComputedStyle(line).stroke,lineStrokeWidth:getComputedStyle(line).strokeWidth,outlineStroke:getComputedStyle(outline).stroke,outlineStrokeWidth:getComputedStyle(outline).strokeWidth,labelFill:getComputedStyle(label).fill}
  }))()`)
  const referenceStandardCostStyle = standardCostStyleEvidence.find(style => style.role === 'reference')
  check('Rendered Standard Cost styling is consistent between Reference and Current, with no Current-only override',
    standardCostStyleEvidence.length === 2 && standardCostStyleEvidence.every(style => !style.missing
      && style.lineStroke === referenceStandardCostStyle?.lineStroke
      && style.lineStrokeWidth === referenceStandardCostStyle?.lineStrokeWidth
      && style.outlineStroke === referenceStandardCostStyle?.outlineStroke
      && style.outlineStrokeWidth === referenceStandardCostStyle?.outlineStrokeWidth
      && style.labelFill === referenceStandardCostStyle?.labelFill
      && style.lineStroke === 'rgb(51, 65, 85)'), standardCostStyleEvidence)

  // Hover a real Selling Price SVG point with CDP mouse input and verify the rendered tooltip stays in the host.
  await evaluate('document.querySelector("figure[aria-labelledby=\\"simulation-story-title\\"]")?.scrollIntoView({block:"center",inline:"nearest"})')
  const sellingPricePoint = await evaluate(`(()=>{const e=document.querySelector('[data-graph-series="sellingPrice"] circle');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  let tooltipMetrics = null
  if (sellingPricePoint) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sellingPricePoint.x, y: sellingPricePoint.y })
    await waitFor(() => evaluate(`Boolean([...document.querySelectorAll('[data-graph-tooltip-host] > div[aria-hidden="true"]')].find(e=>e.innerText.includes('Selling Price')))`), 'Selling Price tooltip')
    tooltipMetrics = await evaluate(`(()=>{const host=document.querySelector('[data-graph-tooltip-host]'),tip=[...(host?.querySelectorAll(':scope > div[aria-hidden="true"]')??[])].find(e=>e.innerText.includes('Selling Price'));if(!host||!tip)return null;const h=host.getBoundingClientRect(),t=tip.getBoundingClientRect();return{text:tip.innerText,host:{left:h.left,right:h.right,top:h.top,bottom:h.bottom},tip:{left:t.left,right:t.right,top:t.top,bottom:t.bottom},inside:t.left>=h.left-1&&t.right<=h.right+1&&t.top>=h.top-1&&t.bottom<=h.bottom+1}})()`)
  }
  check('Selling Price tooltip appears from real graph hover and stays within its card host', Boolean(tooltipMetrics?.inside), tooltipMetrics)

  }

  const frameValueFixtures = [
    { kind: 'bom', label: 'Price', ariaLabel: 'MAT-A Price in Current', value: '4.00' },
    { kind: 'bom', label: 'Usage', ariaLabel: 'MAT-A Usage in Current', value: '8.00' },
    { kind: 'bom', label: 'Loss', ariaLabel: 'MAT-A Loss in Current', value: '15.00' },
    { kind: 'routing', label: 'Manning', ariaLabel: 'OP-10 Manning in Current', value: '4.00' },
    { kind: 'routing', label: 'Capacity', ariaLabel: 'OP-10 Capacity in Current', value: '8.00' },
    { kind: 'routing', label: 'Yield', ariaLabel: 'OP-10 Yield in Current', value: '15.00' }
  ]
  const authoritativeDraft = async ariaLabel => {
    await evaluate(`(()=>{const e=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)});e?.focus()})()`)
    await delay(100)
    return evaluate(`(()=>[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)})?.value??null)()`)
  }
  const frameOriginalValues = []
  const frameValueResults = []
  for (const fixture of frameValueFixtures) {
    const original = await authoritativeDraft(fixture.ariaLabel)
    frameOriginalValues.push({ fixture, original })
    const actual = await typeIntoInput(fixture.ariaLabel, fixture.value)
    frameValueResults.push({ field: fixture.ariaLabel, expected: fixture.value, actual })
  }
  check('Simulation parameter editors accept representative 4.00, 8.00, and 15.00 values in Chrome',
    frameValueResults.every(result => result.actual === result.expected), frameValueResults)

  const readInputFrame = async (kind, label) => evaluate(`(()=>{
    const section=document.querySelector('section[data-simulation-table="${kind}"]')
    const input=[...(section?.querySelectorAll('input[data-numeric-editor]')??[])].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith(${JSON.stringify(`${label} in Current`)}))
    if(!input)return null
    const r=input.getBoundingClientRect(),s=getComputedStyle(input),cell=input.closest('td'),frame=cell?.querySelector('[data-simulation-input-frame="true"]'),f=frame?.getBoundingClientRect(),fs=frame?getComputedStyle(frame):null
    const borderRight=parseFloat(s.borderRightWidth)||0,paddingRight=parseFloat(s.paddingRight)||0,rightInset=borderRight+paddingRight,header=section.querySelector('table[role="presentation"] thead tr')?.children[cell?.cellIndex??-1],range=document.createRange()
    if(header)range.selectNodeContents(header)
    const headerBoxes=header?[...range.getClientRects()]:[],cellRect=cell?.getBoundingClientRect(),headerRect=header?.getBoundingClientRect()
    return{column:cellRect?{left:cellRect.left,right:cellRect.right,width:cellRect.width,headerLeft:headerRect?.left,headerRight:headerRect?.right}:null,kind:${JSON.stringify(kind)},label:${JSON.stringify(label)},value:input.value,focused:document.activeElement===input,mobile:Boolean(input.closest('article')),input:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,textRight:r.right-rightInset,paddingRight:s.paddingRight,rightInset,borderRight,background:s.backgroundColor,outlineStyle:s.outlineStyle},headerRight:headerBoxes.length?Math.max(...headerBoxes.map(box=>box.right)):null,frame:f?{left:f.left,right:f.right,top:f.top,bottom:f.bottom,width:f.width,height:f.height,centerX:(f.left+f.right)/2,offsetLeft:f.left-r.left,offsetRight:f.right-r.right,border:fs.borderLeftColor,background:fs.backgroundColor,hovered:frame.getAttribute('data-simulation-input-frame-hovered')==='true',outlineStyle:fs.outlineStyle,outlineWidth:fs.outlineWidth,outlineColor:fs.outlineColor,outlineOffset:fs.outlineOffset,borderRadius:fs.borderTopLeftRadius}:null,cardFrameCount:input.closest('article')?.querySelectorAll('[data-simulation-input-frame="true"]').length??0}
  })()`)

  const sameFrameRect = (left, right) => Boolean(left && right && ['left', 'right', 'top', 'bottom', 'width', 'height'].every(edge => Math.abs(left[edge] - right[edge]) <= 0.25))
  const sameColumnRect = (left, right) => Boolean(left && right && ['left', 'right', 'width', 'headerLeft', 'headerRight'].every(edge => Math.abs(left[edge] - right[edge]) <= 0.25))

  await setViewport(1440)
  const precisePriceFixture = frameValueFixtures[0]
  const originalPriceFrame = await readInputFrame('bom', 'Price')
  const precisePriceDraft = await typeIntoInput(precisePriceFixture.ariaLabel, '12.3456789')
  const preciseFocusedFrame = await readInputFrame('bom', 'Price')
  await evaluate('document.activeElement?.blur()')
  await delay(180)
  const preciseBlurredValue = await evaluate(`([...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(precisePriceFixture.ariaLabel)})?.value??null)`)
  const preciseRefocusedValue = await authoritativeDraft(precisePriceFixture.ariaLabel)
  const preciseRefocusedFrame = await readInputFrame('bom', 'Price')
  check('Simulation Price preserves 12.3456789 through edit, blur, and focus in its fixed frame',
    precisePriceDraft === '12.3456789' && preciseBlurredValue === '12.35' && preciseRefocusedValue === '12.3456789'
      && sameFrameRect(originalPriceFrame?.frame, preciseFocusedFrame?.frame)
      && sameFrameRect(originalPriceFrame?.frame, preciseRefocusedFrame?.frame),
    { draft: precisePriceDraft, blurred: preciseBlurredValue, refocused: preciseRefocusedValue, frames: [originalPriceFrame?.frame, preciseFocusedFrame?.frame, preciseRefocusedFrame?.frame] })
  await evaluate('document.activeElement?.blur()')

  const tinyPriceDraft = await typeIntoInput(precisePriceFixture.ariaLabel, '0.0000000000005')
  const tinyFocusedFrame = await readInputFrame('bom', 'Price')
  await evaluate('document.activeElement?.blur()')
  await delay(180)
  const tinyBlurredValue = await evaluate(`([...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(precisePriceFixture.ariaLabel)})?.value??null)`)
  const tinyRefocusedValue = await authoritativeDraft(precisePriceFixture.ariaLabel)
  const tinyRefocusedFrame = await readInputFrame('bom', 'Price')
  check('Simulation Price preserves 5e-13 as authoritative data through edit, blur, and focus',
    tinyPriceDraft === '0.0000000000005' && tinyBlurredValue === '5.00E-13' && tinyRefocusedValue === '0.0000000000005'
      && sameFrameRect(originalPriceFrame?.frame, tinyFocusedFrame?.frame)
      && sameFrameRect(originalPriceFrame?.frame, tinyRefocusedFrame?.frame),
    { draft: tinyPriceDraft, blurred: tinyBlurredValue, refocused: tinyRefocusedValue, frames: [originalPriceFrame?.frame, tinyFocusedFrame?.frame, tinyRefocusedFrame?.frame] })
  await typeIntoInput(precisePriceFixture.ariaLabel, precisePriceFixture.value)
  await evaluate('document.activeElement?.blur()')
  await delay(180)

  const longValueFixtures = frameValueFixtures.map(fixture => ({
    fixture,
    value: fixture.label === 'Loss' || fixture.label === 'Yield' ? '99.123456789' : '123456789012345.123456'
  }))
  const longValueResults = []
  for (const { fixture, value } of longValueFixtures) {
    const original = await authoritativeDraft(fixture.ariaLabel)
    const before = await readInputFrame(fixture.kind, fixture.label)
    const actualDraft = await typeIntoInput(fixture.ariaLabel, value)
    const focused = await readInputFrame(fixture.kind, fixture.label)
    await evaluate('document.activeElement?.blur()')
    await delay(120)
    const blurred = await readInputFrame(fixture.kind, fixture.label)
    longValueResults.push({
      field: fixture.ariaLabel,
      expected: value,
      actualDraft,
      focused: focused?.focused,
      blurred: blurred?.focused,
      fixedFrame: sameFrameRect(before?.frame, focused?.frame) && sameFrameRect(before?.frame, blurred?.frame),
      fixedColumn: sameColumnRect(before?.column, focused?.column) && sameColumnRect(before?.column, blurred?.column),
      original
    })
    await typeIntoInput(fixture.ariaLabel, original)
    await evaluate('document.activeElement?.blur()')
    await delay(100)
  }
  check('Price/Usage/Loss and Manning/Capacity/Yield tracks stay balanced through long-value focus and blur',
    longValueResults.length === 6 && longValueResults.every(result => result.actualDraft === result.expected
      && result.focused && !result.blurred && result.fixedFrame && result.fixedColumn && result.original !== null), longValueResults)

  if (!finalCorrectionsOnly) {
    await clickRole('Reference')
    const routingReferenceYieldCurrent = await evaluate(`(()=>{
      const section=document.querySelector('section[data-simulation-table="routing"]')
      const input=[...(section?.querySelectorAll('input[data-numeric-editor]')??[])].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith('Yield in Reference'))
      const slot=input?.closest('[data-simulation-input-wrapper="true"]'),suffix=slot?.children[1]
      return {value:input?.value??null,suffix:suffix?.textContent.trim()??null,suffixVisibility:suffix?getComputedStyle(suffix).visibility:null}
    })()`)
    check('Routing Reference Yield value and percent suffix remain unchanged through Current input edits',
      Boolean(routingReferenceYieldBaseline && JSON.stringify(routingReferenceYieldCurrent) === JSON.stringify(routingReferenceYieldBaseline)),
      { before: routingReferenceYieldBaseline, after: routingReferenceYieldCurrent })
    await clickRole('Current')
  }

  for (const width of [1440, 1024, 768]) {
    const label = ({ 1440: 'Price', 1024: 'Usage', 768: 'Loss' })[width]
    const fixture = frameValueFixtures.find(item => item.kind === 'bom' && item.label === label)
    await setViewport(width)
    const point = await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')===${JSON.stringify(fixture.ariaLabel)});if(!input)return null;input.scrollIntoView({block:'center',inline:'nearest'});const r=input.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await delay(180)
    let hover = await readInputFrame('bom', label)
    const hoverPoint = hover?.frame ? { x: (hover.frame.left + hover.frame.right) / 2, y: (hover.frame.top + hover.frame.bottom) / 2 } : null
    if (hoverPoint) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverPoint.x, y: hoverPoint.y }); await delay(120) }
    hover = await readInputFrame('bom', label)
    check(`${width}px Chrome evidence is using the intended ${fixture.value} draft inside the visible frame`, hover?.value === fixture.value && hover?.frame?.hovered === true, hover)
    if (!numericLayoutOnly || (width===1440 && label==='Price')) await screenshot(`simulation-input-frame-${width}-${label.toLowerCase()}-hover`)
    if (hoverPoint) await clickAt(hoverPoint)
    await delay(180)
    const focused = await readInputFrame('bom', label)
    check(`${width}px ${fixture.value} Focus uses the exact same frame rectangle as Hover`,
      Boolean(focused?.focused && sameFrameRect(hover?.frame, focused?.frame)
        && focused.frame?.background === 'rgb(255, 255, 255)'
        && focused.frame?.outlineStyle === 'solid' && focused.frame?.outlineWidth === '2px'
        && focused.frame?.outlineColor === 'rgb(29, 78, 216)' && focused.frame?.outlineOffset === '-2px'
        && focused.frame?.borderRadius === '2px' && focused.input?.outlineStyle === 'none'),
      { hover: hover?.frame, focused: focused?.frame, input: focused?.input })
    if (!numericLayoutOnly || (width===1440 && label==='Price')) await screenshot(`simulation-input-frame-${width}-${label.toLowerCase()}-focus`)
    if (width === 1440) {
      await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(fixture.ariaLabel)});input?.closest('tr')?.focus()})()`)
      for (let index = 0; index < 2; index += 1) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' })
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' })
      }
      await delay(120)
      const keyboardFocused = await readInputFrame('bom', label)
      check('1440px keyboard Tab focus keeps the established blue 2px inset outline',
        Boolean(keyboardFocused?.focused && keyboardFocused.frame?.outlineStyle === 'solid'
          && keyboardFocused.frame?.outlineWidth === '2px'
          && keyboardFocused.frame?.outlineColor === 'rgb(29, 78, 216)'
          && keyboardFocused.frame?.outlineOffset === '-2px'
          && keyboardFocused.frame?.borderRadius === '2px'), keyboardFocused)
      if (!numericLayoutOnly) await screenshot(`simulation-input-frame-${width}-${label.toLowerCase()}-keyboard-focus`)
    }
    await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(fixture.ariaLabel)});input?.blur()})()`)
    await delay(180)
  }

  await setViewport(1440)
  for (const { fixture, original } of frameOriginalValues) {
    if (original !== null) await typeIntoInput(fixture.ariaLabel, original)
  }
  await evaluate('document.activeElement?.blur()')
  await delay(180)
  const restoredFrameValues = []
  for (const { fixture, original } of frameOriginalValues) {
    restoredFrameValues.push({ original, actual: await authoritativeDraft(fixture.ariaLabel) })
  }
  await evaluate('document.activeElement?.blur()')
  check('Temporary visual fixtures are restored before existing Simulation regression checks',
    restoredFrameValues.every(result => result.original !== null && result.actual === result.original), restoredFrameValues)

  const responsive = []
  for (const width of [1440, 1024, 768, 390, 320]) {
    await setViewport(width)
    await evaluate('(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});for(const element of document.querySelectorAll("*"))if(element.scrollTop)element.scrollTop=0})()')
    await delay(160)
    const frameMetrics = []
    for (const [kind, label] of [['bom', 'Price'], ['bom', 'Usage'], ['bom', 'Loss'], ['routing', 'Manning'], ['routing', 'Capacity'], ['routing', 'Yield']]) {
      const point = await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="${kind}"]');const input=[...(section?.querySelectorAll('input[data-numeric-editor]')??[])].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith(${JSON.stringify(`${label} in Current`)}));if(!input)return null;input.scrollIntoView({block:'center',inline:'nearest'});const r=input.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
      if (!point) { frameMetrics.push({ kind, label, missing: true }); continue }
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
      await delay(180)
      let hover = await readInputFrame(kind, label)
      const framePoint = hover?.frame ? { x: (hover.frame.left + hover.frame.right) / 2, y: (hover.frame.top + hover.frame.bottom) / 2 } : null
      if (framePoint) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: framePoint.x, y: framePoint.y }); await delay(120) }
      hover = await readInputFrame(kind, label)
      check(`${width}px ${kind.toUpperCase()} ${label} keeps the fixed 32px editor and its column anchor`,
        Boolean(hover && hover.input.width > 50 && Math.abs(hover.input.height - 32) <= 0.25
          && (width < 768 || (hover.input.left-hover.column.left>=5.5 && hover.column.right-hover.input.right>=5.5 && Math.abs(hover.column.left-hover.column.headerLeft)<1 && Math.abs(hover.column.right-hover.column.headerRight)<1))), hover)
      if (width < 768) {
        check(`${width}px ${kind.toUpperCase()} ${label} keeps the existing mobile editor with no desktop frame overlay`,
          Boolean(hover?.mobile && hover.cardFrameCount === 0 && hover.frame === null), hover)
        frameMetrics.push(hover)
        continue
      }

      const hoverGeometry = Boolean(hover?.frame
        && Math.abs(hover.frame.offsetLeft) <= 0.25
        && Math.abs(hover.frame.offsetRight) <= 0.25
        && Math.abs(hover.frame.width - hover.input.width) <= 0.25
        && Math.abs(hover.frame.height - hover.input.height) <= 0.25
        && Math.abs(hover.frame.top - hover.input.top) <= 0.25
        && Math.abs(hover.frame.bottom - hover.input.bottom) <= 0.25
        && hover.frame.border === 'rgb(226, 232, 240)'
        && hover.frame.background === 'rgb(248, 250, 252)'
        && hover.frame.hovered === true
        && hover.input.background === 'rgba(0, 0, 0, 0)')
      check(`${width}px ${kind.toUpperCase()} ${label} native input occupies the visible frame without resizing`, hoverGeometry, hover)

      if (framePoint) await clickAt(framePoint)
      await delay(180)
      const focused = await readInputFrame(kind, label)
      if (width === 1440 && ['Manning', 'Loss'].includes(label)) await screenshot(`numeric-layout-${kind}-${label.toLowerCase()}-focus-1440`)

      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 })
      await delay(180)
      const focusOnly = await readInputFrame(kind, label)
      if (framePoint) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: framePoint.x, y: framePoint.y })
      await delay(180)
      const focusAndHover = await readInputFrame(kind, label)
      await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getAttribute('aria-label')?.endsWith(${JSON.stringify(`${label} in Current`)}));input?.blur()})()`)
      await delay(180)
      const hoverAgain = await readInputFrame(kind, label)
      const focusGeometry = Boolean(focused?.focused
        && focused?.frame?.outlineStyle === 'solid'
        && focused?.frame?.outlineWidth === '2px'
        && focused?.frame?.outlineColor === 'rgb(29, 78, 216)'
        && focused?.frame?.outlineOffset === '-2px'
        && focused?.frame?.borderRadius === '2px'
        && focused?.frame?.background === 'rgb(255, 255, 255)'
        && focused?.input?.outlineStyle === 'none'
        && focusOnly?.frame?.outlineStyle === 'solid'
        && focusOnly?.frame?.outlineWidth === '2px'
        && focusOnly?.frame?.outlineColor === 'rgb(29, 78, 216)'
        && focusOnly?.frame?.outlineOffset === '-2px'
        && focusOnly?.focused
        && sameFrameRect(hover?.frame, focused?.frame)
        && sameFrameRect(hover?.frame, focusOnly?.frame)
        && sameFrameRect(hover?.frame, focusAndHover?.frame)
        && sameFrameRect(hover?.frame, hoverAgain?.frame)
        && focusAndHover?.frame?.outlineWidth === '2px'
        && focusAndHover?.frame?.outlineColor === 'rgb(29, 78, 216)'
        && hoverAgain?.frame?.border === 'rgb(226, 232, 240)'
        && hoverAgain?.frame?.hovered === true)
      check(`${width}px ${kind.toUpperCase()} ${label} keeps one identical frame through Hover → Focus → Hover`, focusGeometry,
        { hover: hover?.frame, focused: focused?.frame, focusOnly: focusOnly?.frame, focusAndHover: focusAndHover?.frame, hoverAgain: hoverAgain?.frame, focusInput: focused?.input })

      if (hoverAgain?.frame) {
        const bounds = hoverAgain.frame
        const points = [
          { name: 'inside left', x: bounds.left + 1, expected: true },
          { name: 'inside center', x: (bounds.left + bounds.right) / 2, expected: true },
          { name: 'inside right', x: bounds.right - 1, expected: true },
          { name: 'outside left', x: bounds.left - 1, expected: false },
          { name: 'outside right', x: bounds.right + 1, expected: false }
        ]
        const hitResults = []
        for (const probe of points) {
          const blurState = await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith(${JSON.stringify(`${label} in Current`)}));input?.blur();return{targetFound:Boolean(input),targetStillFocused:document.activeElement===input,activeLabel:document.activeElement?.getAttribute?.('aria-label')??null}})()`)
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: probe.x, y: (bounds.top + bounds.bottom) / 2 })
          await delay(80)
          const hoverState = await readInputFrame(kind, label)
          await clickAt({ x: probe.x, y: (bounds.top + bounds.bottom) / 2 })
          const clickState = await readInputFrame(kind, label)
          hitResults.push({
            point: probe.name,
            expectedHover: probe.expected,
            actualHover: hoverState?.frame?.hovered === true,
            expectedInputFocus: probe.expected,
            actualInputFocus: clickState?.focused === true,
            blurReady: blurState?.targetFound === true && blurState.targetStillFocused === false,
            valueUnchanged: Number(clickState?.value) === Number(hoverState?.value)
          })
          if (width === 1440 && kind === 'bom' && label === 'Price' && probe.name === 'inside left') {
            await screenshot('simulation-input-frame-1440-price-inside-left-click')
          }
          await evaluate(`(()=>{const input=[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')?.endsWith(${JSON.stringify(`${label} in Current`)}));input?.blur()})()`)
        }
        check(`${width}px ${kind.toUpperCase()} ${label} hover, focus/edit, and outside-click rejection follow the five rendered frame probes`,
          hitResults.every(result => result.actualHover === result.expectedHover
            && result.actualInputFocus === result.expectedInputFocus
            && result.blurReady && result.valueUnchanged), hitResults)
      }
      frameMetrics.push({ kind, label, ...hover, focus: focused?.frame })
    }

    if (width >= 768) {
      for (const kind of ['bom','routing']) {
        const rowSelector=`section[data-simulation-table="${kind}"] tbody tr[data-simulation-row-index]`
        const expanded=await evaluate(`document.querySelector(${JSON.stringify(rowSelector)})?.getAttribute('aria-expanded')==='true'`)
        if(!expanded) {
          const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(rowSelector+' th[scope="row"]')});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
          await clickAt(point)
        }
        const axes=await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="${kind}"]'),headers=[...section.querySelectorAll('table[role="presentation"] thead th')],main=section.querySelector('tbody tr[data-simulation-row-index]'),detail=main.nextElementSibling;return [3,4,5,6].map((column,index)=>{const cell=main.children[column],effect=detail?.children[index+2],h=headers[column]?.getBoundingClientRect(),m=cell.getBoundingClientRect(),d=effect?.getBoundingClientRect(),number=effect?.querySelector('[data-numeric-region]'),n=number?.getBoundingClientRect(),mainRegion=cell.querySelector('[data-numeric-region]')?.getBoundingClientRect();return{column,mainRight:m.right,headerRight:h?.right,effectRight:d?.right,effectNumberRight:n?.right,effectCenter:n?(n.left+n.right)/2:null,mainCenter:mainRegion?(mainRegion.left+mainRegion.right)/2:null,effectPadding:effect?parseFloat(getComputedStyle(effect).paddingRight):null,parameterBoundary:cell.querySelector('input')?.getBoundingClientRect().right-(column===5?5:17),calculatedReadOnly:column!==6||!cell.querySelector('input')}})})()`)
        check(`${width}px ${kind.toUpperCase()} expanded effects and calculated costs retain matching column anchors`,
          axes.every(axis=>Math.abs(axis.mainRight-axis.headerRight)<1&&Math.abs(axis.mainRight-axis.effectRight)<1&&axis.calculatedReadOnly&&Math.abs(axis.effectCenter-axis.mainCenter)<1), axes)
        if (width === 1440 && kind === 'bom') {
          const suffixMetrics = await evaluate(`(()=>{
            const section=document.querySelector('section[data-simulation-table="bom"]')
            const main=section?.querySelector('tbody tr[data-simulation-row-index]'),detail=main?.nextElementSibling
            const mainSlot=main?.children[5]?.querySelector('[data-simulation-input-wrapper="true"]')
            const effectSlot=detail?.children[4]?.querySelector('[data-numeric-slot="true"]')
            const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,center:(r.left+r.right)/2}}
            const mainNumber=mainSlot?.querySelector('input[data-numeric-region]'),mainSuffix=mainSlot?.children[1]
            const effectNumber=effectSlot?.querySelector('[data-numeric-region]'),effectSuffix=effectSlot?.children[1]
            return {expanded:main?.getAttribute('aria-expanded'),mainSuffix:mainSuffix?.textContent.trim()??null,mainSuffixVisibility:mainSuffix?getComputedStyle(mainSuffix).visibility:null,effectSuffix:effectSuffix?.textContent.trim()??null,effectSuffixVisibility:effectSuffix?getComputedStyle(effectSuffix).visibility:null,mainNumber:rect(mainNumber),mainSuffixBox:rect(mainSuffix),effectNumber:rect(effectNumber),effectSuffixBox:rect(effectSuffix),mainGap:mainNumber&&mainSuffix?mainSuffix.getBoundingClientRect().left-mainNumber.getBoundingClientRect().right:null,effectGap:effectNumber&&effectSuffix?effectSuffix.getBoundingClientRect().left-effectNumber.getBoundingClientRect().right:null}
          })()`)
          check('BOM Loss percent slots keep equal suffix spacing and numeric anchors in the main and expanded rows',
            Boolean(suffixMetrics?.expanded==='true'
              && suffixMetrics.mainSuffix==='%' && suffixMetrics.mainSuffixVisibility!=='hidden'
              && suffixMetrics.effectSuffix==='%' && suffixMetrics.effectSuffixVisibility==='hidden'
              && Math.abs(suffixMetrics.mainGap-suffixMetrics.effectGap)<=1
              && Math.abs(suffixMetrics.mainSuffixBox.width-suffixMetrics.effectSuffixBox.width)<=1
              && Math.abs(suffixMetrics.mainNumber.center-suffixMetrics.effectNumber.center)<=1), suffixMetrics)
        }
        if (width===1440) await screenshot(`numeric-layout-${width}-${kind}-expanded`)
      }
    }
    if (width >= 768) {
      for(const kind of ['bom','routing']) {
        // Keep both statuses in the real fixture while checking their visible
        // text gutters, then restore the authoritative value immediately.
        const changedFixture = width === 1440 ? await evaluate(`(()=>{
          const e=document.querySelector('section[data-simulation-table="${kind}"] tbody tr[data-simulation-row-index] input')
          return e?{aria:e.getAttribute('aria-label'),original:e.value}:null
        })()`) : null
        if (changedFixture) {
          await typeIntoInput(changedFixture.aria, String(Number(changedFixture.original) + 1))
          await evaluate('document.activeElement?.blur()')
        }
        const gutters=await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="${kind}"]');return [...section.querySelectorAll('tbody tr[data-simulation-row-index]')].map(row=>{const status=row.children[2],input=row.children[3]?.querySelector('input'),frame=row.children[3]?.querySelector('[data-simulation-input-frame]');if(!status||!input||!frame)return null;const range=document.createRange();range.selectNodeContents(status);const text=range.getBoundingClientRect(),f=frame.getBoundingClientRect(),columns=[3,4,5].map(index=>{const cell=row.children[index],input=cell.querySelector('input'),r=input?.getBoundingClientRect(),c=cell.getBoundingClientRect();return {left:r?r.left-c.left:null,right:r?c.right-r.right:null,width:r?.width}});return {status:status.textContent.trim(),gutter:f.left-text.right,containerGutter:f.left-status.getBoundingClientRect().right,columns}}).filter(Boolean)})()`)
        check(`${width}px ${kind.toUpperCase()} real Status text has a comfortable numeric-frame gutter`,gutters.some(row=>row.status==='UNCHANGED')&&(!changedFixture||gutters.some(row=>row.status==='CHANGED'))&&gutters.every(row=>row.gutter>=8&&row.containerGutter>=5.5&&row.columns.every(column=>column.left>=5.5&&column.right>=5.5)),gutters)
        if (changedFixture) {
          await typeIntoInput(changedFixture.aria, changedFixture.original)
          await evaluate('document.activeElement?.blur()')
        }
      }
    }
    if (width >= 768) {
      const containment = await evaluate(`(()=>{
        const result = document.querySelector('section[aria-labelledby="simulation-result-title"]');
        const breakEven = document.querySelector('figure[aria-labelledby="break-even-graph-title"]');
        if (!result || !breakEven) return null;
        const rBox = result.getBoundingClientRect();
        const bBox = breakEven.getBoundingClientRect();
        return {
          resultBottom: rBox.bottom,
          breakEvenTop: bBox.top,
          overlaps: rBox.bottom > bBox.top + 0.5,
          resultScrollable: result.scrollHeight > result.clientHeight + 1,
          resultClientHeight: result.clientHeight,
          resultScrollHeight: result.scrollHeight
        };
      })()`);
      check(`${width}px Simulation Result panel is fully contained above Break-even without overlap or scrollbars`,
        Boolean(containment && !containment.overlaps && !containment.resultScrollable), containment);
      const oneLineRows = await evaluate(`(()=>{
        const section=document.querySelector('section[aria-labelledby="simulation-result-title"]')
        return [...(section?.querySelectorAll('tbody tr')??[])].filter(row=>row.querySelector('th[scope="row"]')).map(row=>({
          label:row.querySelector('th[scope="row"]')?.textContent.trim(),
          cells:[...row.children].map(cell=>{
            const range=document.createRange();range.selectNodeContents(cell)
            const tops=[...range.getClientRects()].map(rect=>rect.top).sort((a,b)=>a-b)
            const lineTops=tops.reduce((lines,top)=>{if(!lines.length||top-lines.at(-1)>2)lines.push(top);return lines},[])
            return {tag:cell.tagName,text:cell.textContent.trim(),lineTops:lineTops.map(top=>Math.round(top*2)/2)}
          })
        }))
      })()`)
      check(`${width}px Simulation Result metrics each remain on one visual row`,
        oneLineRows.length >= 8 && oneLineRows.every(row => row.cells.length >= 3 && row.cells.every(cell => cell.lineTops.length <= 1)), oneLineRows)
    }
    if (width === 1440) {
      const totalPriceLabel = 'MAT-A Price in Current'
      const originalTotalPrice = await authoritativeDraft(totalPriceLabel)
      const originalTotalPriceNumber = Number(originalTotalPrice)
      const positiveTotalPriceTarget = Math.max(100, originalTotalPriceNumber * 10 + 1).toFixed(2)
      const positiveTotalPriceDraft = await typeIntoInput(totalPriceLabel, positiveTotalPriceTarget)
      await evaluate('document.activeElement?.blur()')
      await delay(160)
      const totalLabelCheck = await evaluate(`(()=>{
        const effectRow = document.querySelector('tr[id^="bom-effect-"], tr[id^="routing-effect-"]');
        if (!effectRow) return { effectRowExists: false };
        const totalCell = effectRow.querySelector('td[aria-label^="Total"]');
        if (!totalCell) return { effectRowExists: true, totalCellExists: false };
        const totalSpan = totalCell.querySelector('span.text-slate-600');
        const numberSpan = totalCell.querySelector('[data-numeric-region]');
        const numericToken = numberSpan?.querySelector('[data-numeric-token]');
        const numericText = numericToken?.textContent.trim() ?? '';
        const lineTops = element => {
          if (!element) return [];
          const range = document.createRange(); range.selectNodeContents(element);
          const tops = [...range.getClientRects()].map(rect => rect.top).sort((a, b) => a - b);
          return tops.reduce((lines, top) => { if (!lines.length || top - lines.at(-1) > 2) lines.push(top); return lines; }, []).map(top => Math.round(top * 2) / 2);
        };
        return {
          effectRowExists: true,
          totalCellExists: true,
          hasNeutralTotal: !!totalSpan && totalSpan.textContent.trim() === 'Total',
          hasNumber: !!numberSpan,
          cellText: totalCell.textContent.trim(),
          numericText,
          positiveValue: numericText.startsWith('+') && Number(numericText.replace(/,/g, '')) > 0,
          labelColor: totalSpan ? getComputedStyle(totalSpan).color : null,
          totalLineTops: lineTops(totalSpan),
          numberLineTops: lineTops(numberSpan),
          scrollWidth: totalCell.scrollWidth,
          clientWidth: totalCell.clientWidth
        };
      })()`);
      check('1440px expanded Simulation renders a real BOM or Routing effect row for Total',
        Boolean(totalLabelCheck?.effectRowExists), totalLabelCheck);
      check('1440px expanded Simulation effect row renders a Total cell',
        Boolean(totalLabelCheck?.totalCellExists), totalLabelCheck);
      check('1440px Parameter Cost Effect Total label is neutral and separate from numeric delta',
        Boolean(totalLabelCheck?.hasNeutralTotal && totalLabelCheck.hasNumber), totalLabelCheck);
      check('1440px expanded Total and positive value stay on one visual line',
        Boolean(positiveTotalPriceDraft === positiveTotalPriceTarget && totalLabelCheck?.positiveValue
          && totalLabelCheck.totalLineTops.length === 1 && totalLabelCheck.numberLineTops.length === 1
          && Math.abs(totalLabelCheck.totalLineTops[0] - totalLabelCheck.numberLineTops[0]) <= 1
          && totalLabelCheck.scrollWidth <= totalLabelCheck.clientWidth + 1), totalLabelCheck);
      if (originalTotalPrice !== null) {
        await typeIntoInput(totalPriceLabel, originalTotalPrice)
        await evaluate('document.activeElement?.blur()')
        await delay(100)
      }
      const ordinaryCheck = await evaluate(`(()=>{
        const inputs = [...document.querySelectorAll('section[data-simulation-table] tbody input')];
        return inputs.map(input => ({
          aria: input.getAttribute('aria-label'),
          value: input.value,
          scientific: input.value.includes('E')
        })).filter(i => i.scientific);
      })()`);
      check('1440px Simulation table initial values have no premature scientific fallback',
        ordinaryCheck.length === 0, ordinaryCheck);
      const outcomeShade = await evaluate(`(()=>{
        const names=['Parameter Saving','Economic Margin','Operating Profit'];
        return names.map(name=>{const element=document.querySelector('section[aria-labelledby="simulation-economic-inputs-title"] [data-economic-outcome-value="'+name+'"]'),raw=element?.textContent.trim().replaceAll(',','')??'',value=Number(raw),color=getComputedStyle(element??document.body).color,rgb=(color.match(/[\\d.]+/g)??[]).slice(0,3).map(Number),linear=rgb.map(channel=>{const c=channel/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4}),luminance=0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];return{name,value,color,className:element?.className??'',contrast:1.05/(luminance+0.05)}});
      })()`);
      check('1440px Simulation outcomes use readable semantic green/red and neutral zero',
        outcomeShade.length===3&&outcomeShade.every(item=>Number.isFinite(item.value)&&item.contrast>=4.5&&(item.value>0?item.className.includes('emerald'):item.value<0?item.className.includes('rose'):item.className.includes('slate'))), outcomeShade);
    }
    if (width >= 768) {
      const balancedFields = frameMetrics.filter(metric => metric?.frame)
      check(`${width}px all six desktop fields use static frames independent of text length`,
        balancedFields.length === 6 && balancedFields.every(metric => Math.abs(metric.frame.offsetLeft) <= 0.25 && Math.abs(metric.frame.offsetRight) <= 0.25),
        balancedFields.map(metric => ({ field: `${metric.kind} ${metric.label}`, text: metric.value, width: metric.input.width, frame: metric.frame })))
    }
    await evaluate('(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});for(const element of document.querySelectorAll("*"))if(element.scrollTop)element.scrollTop=0})()')
    await delay(120)
    const metrics = await evaluate(`(()=>{
      const root=document.documentElement,body=document.body
      const sections=['bom','routing'].map(kind=>{const section=document.querySelector('section[data-simulation-table="'+kind+'"]');const cards=[...(section?.querySelectorAll('div[class~="md:hidden"] article')??[])].filter(e=>getComputedStyle(e).display!=='none'&&e.getClientRects().length);const desktop=section?.querySelector('div[class~="md:flex"]');return{kind,visible:!!section&&section.getClientRects().length>0,visibleCardCount:cards.length,desktopTableVisible:!!desktop&&getComputedStyle(desktop).display!=='none',horizontalCardOverflow:cards.some(card=>card.scrollWidth>card.clientWidth+1)}})
      const graph=document.querySelector('figure[aria-labelledby="simulation-story-title"]'),show=[...(graph?.querySelectorAll('button')??[])].find(e=>e.innerText.trim()==='Show all'),legend=graph?.querySelector('ul[aria-label="Simulation graph legend"]')
      const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
      const g=graph?rect(graph):null,s=show?rect(show):null,l=legend?rect(legend):null
      const legendItems=[...(legend?.querySelectorAll(':scope > li')??[])].filter(item=>item.getClientRects().length&&getComputedStyle(item).display!=='none').map(rect)
      const lastLegendItem=legendItems.at(-1)
      const separated=Boolean(s&&legend&&!legend.contains(show)&&!legendItems.some(item=>s.left<item.right&&s.right>item.left&&s.top<item.bottom&&s.bottom>item.top))
      const storySvg=graph?.querySelector('svg'),breakEvenFigure=document.querySelector('figure[aria-labelledby="break-even-graph-title"]'),breakSvg=breakEvenFigure?.querySelector('svg')
      const graphBounds=svg=>{if(!svg)return null;const rectSvg=rect(svg),figure=svg.closest('figure'),cardRect=rect(figure),vb=(svg.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number),preserveAspectRatio=svg.getAttribute('preserveAspectRatio'),scaleX=rectSvg.width/vb[2],scaleY=rectSvg.height/vb[3],visualBox=e=>{const b=e.getBoundingClientRect();return{x:(b.left-rectSvg.left)/rectSvg.width*vb[2],y:(b.top-rectSvg.top)/rectSvg.height*vb[3],right:(b.right-rectSvg.left)/rectSvg.width*vb[2],bottom:(b.bottom-rectSvg.top)/rectSvg.height*vb[3]}},labels=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent.trim(),box:visualBox(e)})),foreign=[...svg.querySelectorAll('foreignObject')].map(e=>({label:e.querySelector('button')?.getAttribute('aria-label')??'foreignObject',box:visualBox(e)})),clipped=[...labels,...foreign].filter(item=>item.box.x < -1||item.box.y < -1||item.box.right > vb[2]+1||item.box.bottom > vb[3]+1);return{svg:rectSvg,viewBox:vb,preserveAspectRatio,scaleX,scaleY,coordinatesMatchRenderedBox:Math.abs(rectSvg.width-vb[2])<=1&&Math.abs(rectSvg.height-vb[3])<=1,uniformScale:Math.abs(scaleX-scaleY)<=0.005,inside:rectSvg.left>=cardRect.left-1&&rectSvg.right<=cardRect.right+1,cardWithinViewport:cardRect.left>=-1&&cardRect.right<=innerWidth+1,labelsWithinViewBox:clipped.length===0,clippedLabels:clipped}}
      const breakEvenEvidence=breakSvg?{markerCount:breakSvg.querySelectorAll('circle[aria-label^="Break-even Quantity:"]').length,batchSlider:!!breakSvg.querySelector('[role="slider"][aria-label="Batch Size"]'),qtyLabel:[...breakSvg.querySelectorAll('text')].some(e=>e.textContent.includes('QTY'))}:null
      return{width:innerWidth,docScrollWidth:root.scrollWidth,bodyScrollWidth:body.scrollWidth,horizontalOverflow:root.scrollWidth>innerWidth+1,sections,simulationTitleVisible:[...document.querySelectorAll('h2')].some(e=>e.innerText.trim()==='Cost Structure'&&e.getClientRects().length>0),mobileCardsExpected:innerWidth<768,mobileCardsIntact:innerWidth>=768?sections.every(section=>section.desktopTableVisible):sections.every(section=>section.visibleCardCount>0&&!section.horizontalCardOverflow),showAll:show&&g&&s&&l?{inside:graph.contains(show),distinct:!legend.contains(show),separated,rightInset:g.right-s.right,topInset:s.top-g.top,topRight:(g.right-s.right<=20&&s.bottom<=(storySvg?.getBoundingClientRect().top??Infinity)+1),gapFromLastLegendItem:lastLegendItem?s.left-lastLegendItem.right:null,card:g,button:s,legend:l}:null,costStructureBounds:graphBounds(storySvg),breakEvenBounds:graphBounds(breakSvg),breakEvenEvidence}
    })()`)
    const centerlines = await evaluate(`(${numericColumnGeometry.toString()})()`)
    const centerlineFailures = numericCenterlineFailures(centerlines.filter(metric => metric.hasTable || metric.header !== null))
    check(`Simulation rendered numeric Header/frame/decimal centerlines agree at ${width}px`,
      centerlines.length >= 6 && centerlineFailures.length === 0, { centerlines, failures: centerlineFailures })
    responsive.push(metrics)
    if (!numericLayoutOnly) {
    check(`Responsive ${width}px layout has no horizontal overflow/clipping and retains intact Simulation presentation`,
      Boolean(metrics && !metrics.horizontalOverflow && metrics.mobileCardsIntact && metrics.simulationTitleVisible && metrics.showAll?.inside && metrics.showAll?.distinct && metrics.showAll.separated && metrics.showAll.rightInset <= 20 && (width < 720 || metrics.showAll.topRight) && metrics.costStructureBounds?.inside && metrics.costStructureBounds.cardWithinViewport && metrics.costStructureBounds.labelsWithinViewBox && metrics.breakEvenBounds?.inside && metrics.breakEvenBounds.cardWithinViewport && metrics.breakEvenBounds.labelsWithinViewBox), metrics)
    check(`Responsive ${width}px Break-even uses a fitted viewBox, uniform scale, and contains its labels`,
      Boolean(metrics.breakEvenBounds?.coordinatesMatchRenderedBox && metrics.breakEvenBounds.uniformScale
        && metrics.breakEvenBounds.preserveAspectRatio === 'xMidYMid meet' && metrics.breakEvenBounds.labelsWithinViewBox), metrics.breakEvenBounds)
    check(`Responsive ${width}px Break-even retains its quantity marker, Batch slider, and QTY axis label`,Boolean(metrics.breakEvenEvidence?.markerCount>=1&&metrics.breakEvenEvidence.batchSlider&&metrics.breakEvenEvidence.qtyLabel),metrics.breakEvenEvidence)
    } else {
      check(`Numeric layout ${width}px has no page overflow and keeps tables/mobile cards intact`,
        Boolean(metrics && !metrics.horizontalOverflow && metrics.mobileCardsIntact), metrics.sections)
    }
    if (!numericLayoutOnly || [1440,768,390].includes(width)) await screenshot(`simulation-${width}`)
    if (!numericLayoutOnly) await evaluate('document.querySelector("figure[aria-labelledby=\\"break-even-graph-title\\"]")?.scrollIntoView({block:"center",inline:"nearest"})')
    await delay(120)
    if (!numericLayoutOnly) await screenshot(`simulation-break-even-${width}`)
  }

  if (!numericLayoutOnly) {
    const wideBreakEven = responsive.find(metrics => metrics.width === 1440)?.breakEvenBounds
    const narrowBreakEven = responsive.find(metrics => metrics.width === 320)?.breakEvenBounds
    check('Break-even internal coordinates resize with the rendered graph across wide and narrow viewports',
      Boolean(wideBreakEven && narrowBreakEven && Math.abs(wideBreakEven.viewBox[0] - narrowBreakEven.viewBox[0]) === 0
        && Math.abs(wideBreakEven.viewBox[2] - narrowBreakEven.viewBox[2]) > 25
        && Math.abs(wideBreakEven.viewBox[3] - narrowBreakEven.viewBox[3]) > 0.5
        && wideBreakEven.coordinatesMatchRenderedBox && narrowBreakEven.coordinatesMatchRenderedBox),
      { wide: wideBreakEven, narrow: narrowBreakEven })
  }

  }

  }

  }

  await setViewport(1440, 900)
  const simulationInputStyle = async ariaLabel => {
    const point = await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length);if(!input)return null;input.scrollIntoView({block:'center',inline:'nearest'});const r=input.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!point) return null
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    await delay(240)
    const hovered = await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length),target=input?.closest('td')?.querySelector('[data-simulation-input-frame="true"]')??input;if(!input||!target)return null;const r=input.getBoundingClientRect(),s=getComputedStyle(target);return{rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},border:s.borderLeftColor,background:s.backgroundColor,borderWidth:s.borderLeftWidth,borderStyle:s.borderLeftStyle,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,radius:s.borderTopLeftRadius}})()`)
    await clickAt(point)
    const focused = await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length),target=input?.closest('td')?.querySelector('[data-simulation-input-frame="true"]')??input;if(!input||!target)return null;const r=input.getBoundingClientRect(),s=getComputedStyle(target);return{active:document.activeElement===input,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},border:s.borderLeftColor,background:s.backgroundColor,borderWidth:s.borderLeftWidth,borderStyle:s.borderLeftStyle,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,radius:s.borderTopLeftRadius}})()`)
    await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length);input?.blur()})()`)
    await delay(240)
    const blurredHover = await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length),target=input?.closest('td')?.querySelector('[data-simulation-input-frame="true"]')??input;if(!input||!target)return null;const r=input.getBoundingClientRect(),s=getComputedStyle(target);return{rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},border:s.borderLeftColor,background:s.backgroundColor,borderWidth:s.borderLeftWidth,borderStyle:s.borderLeftStyle,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,radius:s.borderTopLeftRadius}})()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 })
    await delay(240)
    const idle = await evaluate(`(()=>{const input=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(ariaLabel)}&&e.getClientRects().length),target=input?.closest('td')?.querySelector('[data-simulation-input-frame="true"]')??input;if(!input||!target)return null;const r=input.getBoundingClientRect(),s=getComputedStyle(target);return{hovered:input.matches(':hover'),focused:document.activeElement===input,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},border:s.borderLeftColor,background:s.backgroundColor,borderWidth:s.borderLeftWidth,borderStyle:s.borderLeftStyle,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,radius:s.borderTopLeftRadius}})()`)
    return { hovered, focused, blurredHover, idle }
  }
  const referenceInputLabel = await evaluate(`([...document.querySelectorAll('section[data-simulation-table="bom"] input[data-numeric-editor]')].find(input=>input.getAttribute('aria-label')?.endsWith('Price in Current')))?.getAttribute('aria-label')??null`)
  const referenceInputStyle = referenceInputLabel ? await simulationInputStyle(referenceInputLabel) : null
  const inputStyleResults = []
  for (const ariaLabel of ['Selling Price', 'SG&A %', 'Variable Action Cost / Unit', 'Fixed Action Cost', 'Batch Size']) {
    inputStyleResults.push({ ariaLabel, ...(await simulationInputStyle(ariaLabel) ?? { missing: true }) })
  }
  const styleMatches = metric => Boolean(metric?.hovered && metric?.focused?.active && metric?.blurredHover
    && metric.idle && !metric.idle.hovered && !metric.idle.focused
    && ['left', 'right', 'top', 'bottom', 'width', 'height'].every(edge => Math.abs(metric.hovered.rect[edge] - metric.focused.rect[edge]) <= 0.25
      && Math.abs(metric.hovered.rect[edge] - metric.blurredHover.rect[edge]) <= 0.25 && Math.abs(metric.hovered.rect[edge] - metric.idle.rect[edge]) <= 0.25)
    && metric.hovered.border === 'rgb(226, 232, 240)' && metric.hovered.background === 'rgb(248, 250, 252)'
    && metric.focused.border === 'rgba(0, 0, 0, 0)' && metric.focused.background === 'rgb(255, 255, 255)'
    && metric.focused.outlineStyle === 'solid' && metric.focused.outlineWidth === '2px'
    && metric.focused.outlineColor === 'rgb(29, 78, 216)' && metric.focused.outlineOffset === '-2px'
    && metric.focused.radius === '2px'
    && metric.blurredHover.border === 'rgb(226, 232, 240)' && metric.blurredHover.background === 'rgb(248, 250, 252)'
    && metric.blurredHover.outlineStyle === 'none'
    && metric.idle.borderWidth === '1px' && metric.idle.borderStyle === 'solid')
  check('Simulation Parameter reference keeps hover and focus on its fixed input frame',
    styleMatches(referenceInputStyle), referenceInputStyle)
  check('Business and Economic inputs have a true neutral idle frame and preserve hover/focus treatment and geometry',
    inputStyleResults.length === 5 && inputStyleResults.every(metric => styleMatches(metric)
      && metric.idle.border === 'rgb(226, 232, 240)' && metric.idle.background === 'rgb(255, 255, 255)'
      && metric.idle.outlineStyle === 'none' && metric.idle.borderWidth === '1px' && metric.idle.borderStyle === 'solid'),
    { reference: referenceInputStyle, fields: inputStyleResults })

  const heightLayouts = []
  for (const height of [900, 720]) {
    await setViewport(1440, height)
    await evaluate('(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});for(const body of document.querySelectorAll("[data-simulation-table-body]"))body.scrollTop=0})()')
    await delay(180)
    const layout = await evaluate(`(()=>{
      const root=document.querySelector('[data-simulation-layout-root]'),upper=root?.children[0],lower=root?.children[1]
      const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
      const result=document.querySelector('section[aria-labelledby="simulation-result-title"]'),breakEven=document.querySelector('figure[aria-labelledby="break-even-graph-title"]')
      const inputPanel=document.querySelector('[data-simulation-layout-column="inputs"]'),inputPanelBox=box(inputPanel)
      const inputs=[...(inputPanel?.querySelectorAll('input')??[])].filter(input=>input.getClientRects().length).map(input=>{const b=box(input);return{aria:input.getAttribute('aria-label'),...b,inside:!!inputPanelBox&&b.left>=inputPanelBox.left-1&&b.right<=inputPanelBox.right+1&&b.top>=inputPanelBox.top-1&&b.bottom<=inputPanelBox.bottom+1}})
      const tableBodies=[...document.querySelectorAll('[data-simulation-table-body]')].map(body=>({clientHeight:body.clientHeight,scrollHeight:body.scrollHeight,overflowY:getComputedStyle(body).overflowY,inside:body.getBoundingClientRect().top>=0&&body.getBoundingClientRect().bottom<=innerHeight+1}))
      const rootBox=box(root),upperBox=box(upper),lowerBox=box(lower),resultBox=box(result),breakEvenBox=box(breakEven)
      const rootStyle=root?getComputedStyle(root):null
      const rowGap=rootStyle?parseFloat(rootStyle.rowGap)||0:0
      const rowsFillRoot=!!rootBox&&!!upperBox&&!!lowerBox&&Math.abs(upperBox.height+lowerBox.height+rowGap-rootBox.height)<=2
      return{viewport:{width:innerWidth,height:innerHeight},display:rootStyle?.display??null,gridTemplateRows:rootStyle?.gridTemplateRows??null,documentWidth:document.documentElement.scrollWidth,root:rootBox,upper:upperBox,lower:lowerBox,rowGap,rowsFillRoot,result:resultBox,breakEven:breakEvenBox,inputs,inputCount:inputs.length,tableBodies,overlap:!!resultBox&&!!breakEvenBox&&resultBox.bottom>breakEvenBox.top+1,rowsOrdered:!!upperBox&&!!lowerBox&&upperBox.bottom<=lowerBox.top+1,breakEvenContained:!!rootBox&&!!breakEvenBox&&breakEvenBox.top>=rootBox.top-1&&breakEvenBox.bottom<=rootBox.bottom+1}
    })()`)
    check(`Simulation ${height}px uses natural auto-fit rows with full viewport containment`,
      Boolean(layout && layout.display === 'grid' && layout.gridTemplateRows && layout.documentWidth <= 1441
        && layout.root.top >= 0 && layout.root.bottom <= height + 1 && layout.upper.top >= layout.root.top - 1
        && layout.lower.bottom <= layout.root.bottom + 1 && layout.rowsFillRoot && layout.rowsOrdered
        && layout.breakEvenContained && !layout.overlap && layout.breakEven.height >= 100), layout)
    check(`Simulation ${height}px retains readable Business/Economic inputs and internally scrollable table bodies`,
      Boolean(layout?.inputCount === 5 && layout.inputs.every(input => input.inside && input.height >= 20)
        && layout.tableBodies.length === 2 && layout.tableBodies.every(body => body.clientHeight >= 35 && body.overflowY === 'auto' && body.inside)),
      { inputs: layout?.inputs, tableBodies: layout?.tableBodies })
    if (height === 900) await screenshot('simulation-layout-1440x900')
    if (height === 720) await screenshot('simulation-layout-1440x720')
    heightLayouts.push(layout)
  }
  check('Simulation natural upper content stays stable while tables absorb the available-height change',
    Boolean(heightLayouts.length === 2
      && Math.abs(heightLayouts[0]?.upper.height - heightLayouts[1]?.upper.height) <= 6
      && heightLayouts[0]?.lower.height - heightLayouts[1]?.lower.height >= 150
      && heightLayouts[1]?.tableBodies.every((body, index) => body.clientHeight < heightLayouts[0]?.tableBodies[index]?.clientHeight)),
    heightLayouts.map(layout => ({ height: layout.viewport.height, upperHeight: layout.upper.height, lowerHeight: layout.lower.height, bodyHeights: layout.tableBodies.map(body => body.clientHeight) })))
  if (finalCorrectionsOnly) {
    for (const kind of ['bom', 'routing']) {
      const rowSelector = `section[data-simulation-table="${kind}"] tbody tr[data-simulation-row-index]`
      const rowState = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(rowSelector)});return row?.getAttribute('aria-expanded')})()`)
      if (rowState !== 'true') {
        const point = await evaluate(`(()=>{const row=document.querySelector(${JSON.stringify(rowSelector)});row?.scrollIntoView({block:'center',inline:'nearest'});const r=row?.querySelector('th[scope="row"]')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
        await clickAt(point)
      }
    }
  }
  if (!selectedValueOnly) {
  await setViewport(1024, 768)
  await evaluate('(()=>window.scrollTo({top:0,left:0,behavior:"instant"}))()')
  const tabletLayout = await evaluate(`(()=>({
    viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
    sections:['bom','routing'].map(kind=>{const section=document.querySelector('section[data-simulation-table="'+kind+'"]'),r=section?.getBoundingClientRect();return{kind,visible:!!r&&r.width>0&&r.height>0,left:r?.left,right:r?.right,expanded:section?.querySelector('tbody tr[data-simulation-row-index]')?.getAttribute('aria-expanded')}})
  }))()`)
  check('Simulation 1024x768 keeps both tables visible in the page layout without horizontal overflow',
    tabletLayout.documentWidth <= 1025 && tabletLayout.sections.length === 2 && tabletLayout.sections.every(section => section.visible && section.left >= 0 && section.right <= 1025 && section.expanded === 'true'), tabletLayout)
  }
  await setViewport(1440, 900)
  }

  check('Browser page produced no console errors or uncaught exceptions', browserErrors.length === 0, browserErrorDetails)
  process.stdout.write(`Evidence screenshots: ${evidenceDir}\n`)
  process.stdout.write(`Browser URL: ${baseUrl}\n`)
  const failed = results.filter(result => !result.passed)
  process.stdout.write(`${selectedValueOnly ? 'Round 4B Selected Value' : finalCorrectionsOnly ? 'Final corrections' : numericLayoutOnly ? 'Numeric layout' : visibleTotalsOnly ? 'Visible totals' : rulerOnly ? 'Ruler' : 'Round 4A'} browser checks: ${results.length - failed.length}/${results.length} PASS; exit=${failed.length ? 1 : 0}\n`)
  if (failed.length) process.exitCode = 1
} finally {
  if (client && client.readyState < WebSocket.CLOSING) client.close()
  await stopChild(chrome)
  // Chrome's crash reporter can retain stderr after Chrome exits.
  chrome.stderr.destroy()
  await stopChild(vite)
  vite?.stdout.destroy()
  vite?.stderr.destroy()
  await rm(profile, { recursive: true, force: true })
}
