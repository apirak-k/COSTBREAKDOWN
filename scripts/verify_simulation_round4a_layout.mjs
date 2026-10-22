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
const numericLayoutOnly = process.argv.includes('--numeric-layout-only')
const rulerOnly = process.argv.includes('--ruler-only')
const visibleTotalsOnly = process.argv.includes('--visible-totals-only')
const configuredBaseUrl = process.env.COSTBREAKDOWN_BROWSER_BASE_URL
const vitePort = configuredBaseUrl ? null : await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-simulation-round4a-chrome-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-simulation-round4a-evidence-'))
const vite = configuredBaseUrl ? null : spawn(process.execPath, [
  resolve(repository, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'
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
      browserErrors.push(message.params.exceptionDetails.text)
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
  const setViewport = async width => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
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
        for (const [side, expected] of [['positive','Current Visible + · +300.00 THB/KG'],['negative','Current Visible − · -50.00 THB/KG']]) {
          const point=await evaluate(`(()=>{const e=document.querySelector('[data-graph-visible-total-value="current"][data-graph-visible-total-side="${side}"]');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()`)
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point})
          await delay(100)
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
  await waitFor(() => evaluate(`Boolean([...document.querySelectorAll('input')].some(e=>e.getClientRects().length&&/Price in (SIM|Custom|Current)$/.test(e.getAttribute('aria-label')||'')))`), 'Simulation numeric row input')
  await waitFor(() => evaluate(`Boolean(document.querySelector('section[data-simulation-table="bom"] tbody tr[data-simulation-row-index]')&&document.querySelector('section[data-simulation-table="routing"] tbody tr[data-simulation-row-index]'))`), 'Simulation BOM and Routing data rows')
  await clickSelector('button[aria-label="Before dataset, Current"]')
  await clickComparisonOption('Before', 'Reference')
  await waitVisible('button[aria-label="Before dataset, Reference"]', 'Reference comparison baseline')
  await delay(800)
  await screenshot('simulation-seeded-1440-before-expansion')

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
      const axis=element=>{if(!element)return null;const range=document.createRange();range.selectNodeContents(element);const boxes=[...range.getClientRects()];return boxes.length?Math.max(...boxes.map(box=>box.right)):null}
      const headerCells=[...(header?.querySelectorAll('thead th')??[])]
      const columns=labels.map(label=>{const index=headerCells.findIndex(cell=>cell.innerText.trim()===label||cell.innerText.includes(label));const cell=row?.children[index];const input=cell?.querySelector('input');const valueAxis=input?(()=>{const r=input.getBoundingClientRect(),s=getComputedStyle(input);return r.right-(parseFloat(s.borderRightWidth)||0)})():axis(cell?.querySelector('span')??cell);return{label,index,headerAxis:axis(headerCells[index]?.querySelector('span')??headerCells[index]),valueAxis,text:input?.value??cell?.textContent.trim()??null,hasInput:!!input,aria:input?.getAttribute('aria-label')??null}})
      result[kind]={visible:!!section&&section.getClientRects().length>0,columns}
    }
    return result
  })()`)
  for(const kind of ['bom','routing']){
    const data=referenceTableMetrics[kind]
    check(`${kind.toUpperCase()} Reference role keeps parameter inputs editable and calculated cost read-only`,Boolean(data?.visible&&data.columns.slice(0,3).every(column=>column.hasInput&&column.aria?.endsWith('in Reference')&&column.text)&&!data.columns[3]?.hasInput&&data.columns[3]?.text),data)
    for(const column of data?.columns??[])check(`${kind.toUpperCase()} Reference ${column.label} value shares its header axis`,Number.isFinite(column.headerAxis)&&Number.isFinite(column.valueAxis)&&Math.abs(column.headerAxis-column.valueAxis)<=3,{header:column.headerAxis,value:column.valueAxis,delta:Number.isFinite(column.headerAxis)&&Number.isFinite(column.valueAxis)?Math.abs(column.headerAxis-column.valueAxis):null,text:column.text,aria:column.aria})
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
      const axisText=element=>{
        if(!element)return null
        const range=document.createRange();range.selectNodeContents(element)
        const boxes=[...range.getClientRects()]
        return boxes.length?boxes.reduce((best,box)=>box.right>best.right?box:best,boxes[0]).right:null
      }
      const cellAxis=(cell,allowInput)=>{
        if(!cell)return null
        const input=allowInput?cell.querySelector('input'):null
        if(input){const r=input.getBoundingClientRect(),s=getComputedStyle(input);return r.right-(parseFloat(s.borderRightWidth)||0)}
        const candidate=cell.querySelector('span')??cell
        return axisText(candidate)
      }
      const headerTextAxis=cell=>axisText(cell?.querySelector('span')??cell)
      const numericLabels=kind==='bom'?['Price','Usage','Loss','Material Cost']:['Manning','Capacity','Yield','Conversion Cost']
      const headerIndexes=numericLabels.map(label=>headerCells.findIndex(cell=>cell.innerText.trim()===label||cell.innerText.includes(label)))
      const displayRow=[...(bodyTable?.querySelectorAll('tbody tr[data-simulation-row-index]')??[])].find(candidate=>candidate!==row&&![...candidate.querySelectorAll('input')].length)
      result[kind]={
        visible:visible(section),
        headerLabels:headerIndexes.map(index=>({label:numericLabels[headerIndexes.indexOf(index)],index,axis:headerTextAxis(headerCells[index]),cellRight:headerCells[index]?.getBoundingClientRect().right??null,cellPaddingRight:headerCells[index]?getComputedStyle(headerCells[index]).paddingRight:null})),
        body:row?Array.from({length:4},(_,offset)=>{const cell=row.children[offset+3];return {index:offset+3,axis:cellAxis(cell,true),cellRight:cell?.getBoundingClientRect().right??null,tag:cell?.querySelector('input')?'input':'text',aria:cell?.querySelector('input')?.getAttribute('aria-label')??null}}):null,
        readOnly:displayRow?Array.from({length:4},(_,offset)=>{const cell=displayRow.children[offset+3];return {index:offset+3,axis:cellAxis(cell,false),cellRight:cell?.getBoundingClientRect().right??null}}):null,
        effect:expanded?[2,3,4,5].map((index)=>{const cell=expanded.children[index];const amount=cell?.querySelector(':scope > span > span:last-child')??cell?.querySelector('span')??cell;return {index,axis:axisText(amount),cellRight:cell?.getBoundingClientRect().right??null,cellPaddingRight:cell?getComputedStyle(cell).paddingRight:null,text:amount?.textContent.trim()??null,readOnly:!cell?.querySelector('input')}}):null,
        rowCount:bodyTable?.querySelectorAll('tbody tr[data-simulation-row-index]').length??0,
        tableCount:section?.querySelectorAll('table').length??0,
        tableText:bodyTable?.innerText.trim().slice(0,160)??null,
        sectionText:section?.innerText.trim().slice(0,260)??null,
        bodyDisplay:bodyTable?getComputedStyle(bodyTable).display:null,
        articles:section?.querySelectorAll('article').length??0
      }
    }
    return result
  })()`)
  for (const kind of ['bom', 'routing']) {
    const data = desktopTableMetrics[kind]
    check(`${kind.toUpperCase()} table exposes the header, editable row, and expanded-effect numeric geometry`, Boolean(data?.visible && data?.body && data?.effect), data)
    if (!data?.headerLabels || !data.body || !data.effect) continue
    for (let offset = 0; offset < 4; offset += 1) {
      const headerAxis = data.headerLabels[offset]?.axis
      const bodyAxis = data.body[offset]?.axis
      const effectAxis = data.effect[offset]?.axis
      check(`${kind.toUpperCase()} ${data.headerLabels[offset]?.label ?? `numeric ${offset + 1}`} header/value/effect share a right data axis`,
        Number.isFinite(headerAxis) && Number.isFinite(bodyAxis) && Number.isFinite(effectAxis) && Math.max(headerAxis, bodyAxis, effectAxis) - Math.min(headerAxis, bodyAxis, effectAxis) <= 3,
        { header: headerAxis, row: bodyAxis, effect: effectAxis, delta: [headerAxis, bodyAxis, effectAxis].every(Number.isFinite) ? Math.max(headerAxis, bodyAxis, effectAxis) - Math.min(headerAxis, bodyAxis, effectAxis) : null })
      if (offset === 3) check(`${kind.toUpperCase()} calculated-cost numeric value remains read-only text on the shared axis`,data.body[offset]?.tag==='text'&&!data.body[offset]?.aria&&data.body[offset]?.axis===data.headerLabels[offset]?.axis,{header:data.headerLabels[offset],calculatedCost:data.body[offset]})
    }
    if (data.readOnly?.some(value => Number.isFinite(value.axis))) {
      for (let offset = 0; offset < 4; offset += 1) {
        const axes = [data.headerLabels[offset]?.axis, data.readOnly[offset]?.axis, data.effect[offset]?.axis].filter(Number.isFinite)
        check(`${kind.toUpperCase()} ${data.headerLabels[offset]?.label ?? `numeric ${offset + 1}`} read-only/effect/header share an axis`,
          axes.length >= 3 && Math.max(...axes) - Math.min(...axes) <= 3,
          { header: data.headerLabels[offset]?.axis, readOnly: data.readOnly[offset]?.axis, effect: data.effect[offset]?.axis })
      }
    }
    check(`${kind.toUpperCase()} expanded Total is read-only text on the calculated-cost column axis`,
      Boolean(data.effect[3]?.text && data.effect[3].readOnly && data.effect[3].axis), data.effect[3])
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
    const box=svg.getBoundingClientRect(),f=figure.getBoundingClientRect()
    const yValues=plotLines.map(e=>e.y1),left=plotLines.length?Math.min(...plotLines.map(e=>e.x1)):null,right=plotLines.length?Math.max(...plotLines.map(e=>e.x2)):null,top=yValues.length?Math.min(...yValues):null,bottom=yValues.length?Math.max(...yValues):null
    const labels=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent.trim(),box:(()=>{const r=e.getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}})()}))
    return {figure:{width:f.width,height:f.height},svg:{width:box.width,height:box.height,viewBox},plot:{left,right,top,bottom,widthRatio:(right-left)/viewBox[2],heightRatio:(bottom-top)/viewBox[3],leftInsetRatio:left/viewBox[2],bottomInsetRatio:(viewBox[3]-bottom)/viewBox[3]},lines:plotLines,labels,markerCount:svg.querySelectorAll('[role="slider"][aria-label="Batch Size"]').length,breakEvenMarkerCount:svg.querySelectorAll('circle[aria-label^="Break-even Quantity:"]').length}
  })()`)
  const breakEvenBaseline = { widthRatio: 0.864, heightRatio: 0.651, leftInsetRatio: 0.10, bottomInsetRatio: 0.263 }
  check('Break-even plot improves on baseline bounds and keeps axis labels/markers',
    Boolean(breakEvenMetrics && breakEvenMetrics.plot.widthRatio >= breakEvenBaseline.widthRatio + 0.01 && breakEvenMetrics.plot.heightRatio >= breakEvenBaseline.heightRatio + 0.025 && breakEvenMetrics.plot.leftInsetRatio <= breakEvenBaseline.leftInsetRatio && breakEvenMetrics.plot.bottomInsetRatio <= breakEvenBaseline.bottomInsetRatio - 0.02 && breakEvenMetrics.markerCount === 1 && breakEvenMetrics.breakEvenMarkerCount >= 1 && breakEvenMetrics.labels.some(label => label.text.includes('QTY'))), { baseline: breakEvenBaseline, current: breakEvenMetrics })

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
  const frameOriginalValues = []
  const frameValueResults = []
  for (const fixture of frameValueFixtures) {
    const original = await evaluate(`(()=>[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')===${JSON.stringify(fixture.ariaLabel)})?.value??null)()`)
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
  const restoredFrameValues = await evaluate(`(${JSON.stringify(frameOriginalValues.map(({ fixture, original }) => ({ ariaLabel: fixture.ariaLabel, original }))) }).map(({ariaLabel,original})=>({ariaLabel,original,actual:[...document.querySelectorAll('input[data-numeric-editor]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label')===ariaLabel)?.value??null}))`)
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
        const axes=await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="${kind}"]'),headers=[...section.querySelectorAll('table[role="presentation"] thead th')],main=section.querySelector('tbody tr[data-simulation-row-index]'),detail=main.nextElementSibling;return [3,4,5,6].map((column,index)=>{const cell=main.children[column],effect=detail?.children[index+2],h=headers[column]?.getBoundingClientRect(),m=cell.getBoundingClientRect(),d=effect?.getBoundingClientRect(),number=effect?.querySelector('[data-numeric-presentation]'),n=number?.getBoundingClientRect();return{column,mainRight:m.right,headerRight:h?.right,effectRight:d?.right,effectNumberRight:n?.right,effectPadding:effect?parseFloat(getComputedStyle(effect).paddingRight):null,parameterBoundary:cell.querySelector('input')?.getBoundingClientRect().right-(column===5?5:17),calculatedReadOnly:column!==6||!cell.querySelector('input')}})})()`)
        check(`${width}px ${kind.toUpperCase()} expanded effects and calculated costs retain matching column anchors`,
          axes.every(axis=>Math.abs(axis.mainRight-axis.headerRight)<1&&Math.abs(axis.mainRight-axis.effectRight)<1&&axis.calculatedReadOnly&&Math.abs(axis.effectNumberRight-(axis.column===6?axis.effectRight-axis.effectPadding:axis.parameterBoundary))<1), axes)
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
      const graphBounds=svg=>{if(!svg)return null;const rectSvg=rect(svg),figure=svg.closest('figure'),cardRect=rect(figure),vb=(svg.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number),visualBox=e=>{const b=e.getBoundingClientRect();return{x:(b.left-rectSvg.left)/rectSvg.width*vb[2],y:(b.top-rectSvg.top)/rectSvg.height*vb[3],right:(b.right-rectSvg.left)/rectSvg.width*vb[2],bottom:(b.bottom-rectSvg.top)/rectSvg.height*vb[3]}},labels=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent.trim(),box:visualBox(e)})),foreign=[...svg.querySelectorAll('foreignObject')].map(e=>({label:e.querySelector('button')?.getAttribute('aria-label')??'foreignObject',box:visualBox(e)})),clipped=[...labels,...foreign].filter(item=>item.box.x < -1||item.box.y < -1||item.box.right > vb[2]+1||item.box.bottom > vb[3]+1);return{svg:rectSvg,card:cardRect,inside:rectSvg.left>=cardRect.left-1&&rectSvg.right<=cardRect.right+1,cardWithinViewport:cardRect.left>=-1&&cardRect.right<=innerWidth+1,labelsWithinViewBox:clipped.length===0,clippedLabels:clipped}}
      const breakEvenEvidence=breakSvg?{markerCount:breakSvg.querySelectorAll('circle[aria-label^="Break-even Quantity:"]').length,batchSlider:!!breakSvg.querySelector('[role="slider"][aria-label="Batch Size"]'),qtyLabel:[...breakSvg.querySelectorAll('text')].some(e=>e.textContent.includes('QTY'))}:null
      return{width:innerWidth,docScrollWidth:root.scrollWidth,bodyScrollWidth:body.scrollWidth,horizontalOverflow:root.scrollWidth>innerWidth+1,sections,simulationTitleVisible:[...document.querySelectorAll('h2')].some(e=>e.innerText.trim()==='Cost Structure'&&e.getClientRects().length>0),mobileCardsExpected:innerWidth<768,mobileCardsIntact:innerWidth>=768?sections.every(section=>section.desktopTableVisible):sections.every(section=>section.visibleCardCount>0&&!section.horizontalCardOverflow),showAll:show&&g&&s&&l?{inside:graph.contains(show),distinct:!legend.contains(show),separated,rightInset:g.right-s.right,topInset:s.top-g.top,topRight:(g.right-s.right<=20&&s.bottom<=(storySvg?.getBoundingClientRect().top??Infinity)+1),gapFromLastLegendItem:lastLegendItem?s.left-lastLegendItem.right:null,card:g,button:s,legend:l}:null,costStructureBounds:graphBounds(storySvg),breakEvenBounds:graphBounds(breakSvg),breakEvenEvidence}
    })()`)
    responsive.push(metrics)
    if (!numericLayoutOnly) {
    check(`Responsive ${width}px layout has no horizontal overflow/clipping and retains intact Simulation presentation`,
      Boolean(metrics && !metrics.horizontalOverflow && metrics.mobileCardsIntact && metrics.simulationTitleVisible && metrics.showAll?.inside && metrics.showAll?.distinct && metrics.showAll.separated && metrics.showAll.rightInset <= 20 && (width < 720 || metrics.showAll.topRight) && metrics.costStructureBounds?.inside && metrics.costStructureBounds.cardWithinViewport && metrics.costStructureBounds.labelsWithinViewBox && metrics.breakEvenBounds?.inside && metrics.breakEvenBounds.cardWithinViewport && metrics.breakEvenBounds.labelsWithinViewBox), metrics)
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

  }

  }

  check('Browser page produced no console errors or uncaught exceptions', browserErrors.length === 0, browserErrorDetails)
  process.stdout.write(`Evidence screenshots: ${evidenceDir}\n`)
  process.stdout.write(`Browser URL: ${baseUrl}\n`)
  const failed = results.filter(result => !result.passed)
  process.stdout.write(`${numericLayoutOnly ? 'Numeric layout' : visibleTotalsOnly ? 'Visible totals' : rulerOnly ? 'Ruler' : 'Round 4A'} browser checks: ${results.length - failed.length}/${results.length} PASS; exit=${failed.length ? 1 : 0}\n`)
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
