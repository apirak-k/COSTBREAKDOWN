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
      const columns=labels.map(label=>{const index=headerCells.findIndex(cell=>cell.innerText.trim()===label||cell.innerText.includes(label));const cell=row?.children[index];const input=cell?.querySelector('input');const valueAxis=input?(()=>{const r=input.getBoundingClientRect(),s=getComputedStyle(input);return r.right-(parseFloat(s.borderRightWidth)||0)-(parseFloat(s.paddingRight)||0)})():axis(cell?.querySelector('span')??cell);return{label,index,headerAxis:axis(headerCells[index]?.querySelector('span')??headerCells[index]),valueAxis,text:input?.value??cell?.textContent.trim()??null,hasInput:!!input,aria:input?.getAttribute('aria-label')??null}})
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
    }
  }

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
        if(input){const r=input.getBoundingClientRect(),s=getComputedStyle(input);return r.right-(parseFloat(s.borderRightWidth)||0)-(parseFloat(s.paddingRight)||0)}
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
    const relevant=[...svg.querySelectorAll('[data-y-axis-unit],[data-axis-tick],[data-ruler-value],[data-graph-visible-net-value],[data-graph-standard-cost-value],[data-graph-series="sellingPrice"]')].map(e=>({label:e.getAttribute('aria-label')??e.textContent.trim(),box:textBounds(e)}))
    const box=svg.getBoundingClientRect(),card=figure.getBoundingClientRect(),plotLeft=Number(axis?.getAttribute('x1')),plotRight=Number(ruler?.getAttribute('x2')),plotTop=Number(axis?.getAttribute('y1')),plotBottom=Number(axis?.getAttribute('y2'))
    const clipped=[...relevant,...gapLabels.map(label=>({label:label.label,box:label.box})),...categories.map(category=>({label:category.label,box:category.box}))]
      .filter(item=>item.box.x < -1 || item.box.y < -1 || item.box.right > vb[2]+1 || item.box.bottom > vb[3]+1)
    return {viewBox:vb,figure:{left:card.left,right:card.right,top:card.top,bottom:card.bottom,width:card.width,height:card.height},svg:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height},plot:{left:plotLeft,right:plotRight,top:plotTop,bottom:plotBottom,widthRatio:(plotRight-plotLeft)/vb[2],heightRatio:(plotBottom-plotTop)/vb[3],leftInsetRatio:plotLeft/vb[2],rightInsetRatio:(vb[2]-plotRight)/vb[2],topInsetRatio:plotTop/vb[3]},tickCount:ticks.length,yAxisUnit:svg.querySelector('[data-y-axis-unit]')?.textContent.trim()??null,categories,gapLabels,ruler:{line:Boolean(ruler),value:svg.querySelector('[data-ruler-value]')?.textContent.trim()??null},sellingPricePointCount:svg.querySelectorAll('[data-graph-series="sellingPrice"]').length,sellingPriceLineCount:[...svg.querySelectorAll('[data-graph-tooltip]')].filter(e=>e.getAttribute('aria-label')?.includes('Selling Price')&&e.tagName.toLowerCase()==='g').length,tooltipHost:{width:host.getBoundingClientRect().width,height:host.getBoundingClientRect().height},relevantCount:relevant.length,clipped}
  })()`)
  const storyBaseline = { widthRatio: 0.844, heightRatio: 0.705, leftInsetRatio: 0.107, topInsetRatio: 0.114 }
  check('Cost Structure plot improves on baseline bounds while preserving label/ruler gutters',
    Boolean(storyMetrics && storyMetrics.plot.widthRatio >= storyBaseline.widthRatio + 0.01 && storyMetrics.plot.heightRatio >= storyBaseline.heightRatio + 0.02 && storyMetrics.plot.leftInsetRatio <= storyBaseline.leftInsetRatio - 0.005 && storyMetrics.plot.topInsetRatio <= storyBaseline.topInsetRatio - 0.005 && storyMetrics.plot.rightInsetRatio <= 0.05), { baseline: storyBaseline, current: storyMetrics })
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

  const responsive = []
  for (const width of [1440, 1024, 768, 390, 320]) {
    await setViewport(width)
    await evaluate('(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});for(const element of document.querySelectorAll("*"))if(element.scrollTop)element.scrollTop=0})()')
    await delay(160)
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
    check(`Responsive ${width}px layout has no horizontal overflow/clipping and retains intact Simulation presentation`,
      Boolean(metrics && !metrics.horizontalOverflow && metrics.mobileCardsIntact && metrics.simulationTitleVisible && metrics.showAll?.inside && metrics.showAll?.distinct && metrics.showAll.separated && metrics.showAll.rightInset <= 20 && (width < 720 || metrics.showAll.topRight) && metrics.costStructureBounds?.inside && metrics.costStructureBounds.cardWithinViewport && metrics.costStructureBounds.labelsWithinViewBox && metrics.breakEvenBounds?.inside && metrics.breakEvenBounds.cardWithinViewport && metrics.breakEvenBounds.labelsWithinViewBox), metrics)
    check(`Responsive ${width}px Break-even retains its quantity marker, Batch slider, and QTY axis label`,Boolean(metrics.breakEvenEvidence?.markerCount>=1&&metrics.breakEvenEvidence.batchSlider&&metrics.breakEvenEvidence.qtyLabel),metrics.breakEvenEvidence)
    await screenshot(`simulation-${width}`)
    await evaluate('document.querySelector("figure[aria-labelledby=\\"break-even-graph-title\\"]")?.scrollIntoView({block:"center",inline:"nearest"})')
    await delay(120)
    await screenshot(`simulation-break-even-${width}`)
  }

  check('Browser page produced no console errors or uncaught exceptions', browserErrors.length === 0, browserErrors)
  process.stdout.write(`Evidence screenshots: ${evidenceDir}\n`)
  process.stdout.write(`Browser URL: ${baseUrl}\n`)
  const failed = results.filter(result => !result.passed)
  process.stdout.write(`Round 4A browser checks: ${results.length - failed.length}/${results.length} PASS; exit=${failed.length ? 1 : 0}\n`)
  if (failed.length) process.exitCode = 1
} finally {
  if (client && client.readyState < WebSocket.CLOSING) client.close()
  await stopChild(chrome)
  await stopChild(vite)
  await rm(profile, { recursive: true, force: true })
}
