import { cbdCorrectionGeometry } from './round4a-correction-geometry.mjs'
import { numericColumnGeometry, numericCenterlineFailures } from './numeric-browser-geometry.mjs'
import assertBase from 'node:assert/strict'
let assertionCount = 0
const assert = new Proxy(assertBase, {
  get(target, key) {
    const member = target[key]
    if (typeof member !== 'function') return member
    return (...args) => {
      const result = member(...args)
      assertionCount += 1
      return result
    }
  }
})
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const vitePort = configuredBaseUrl ? null : await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-numeric-browser-'))
const vite = configuredBaseUrl ? null : spawn(process.execPath, [
  viteCliPath, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'
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
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}\nBrowser errors:\n${browserErrors?.join('\n') ?? ''}`)
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
    const point = await evaluate(`(()=>{const element=${visibleInputExpression(aria)};if(!element)return null;element.scrollIntoView({block:'center',inline:'nearest'});const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
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
    const point = await evaluate(`(()=>{const button=${expression};if(!button)return null;button.scrollIntoView({block:'nearest',inline:'nearest'});const rect=button.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,w:rect.width,h:rect.height}})()`)
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
    await clickInput(source)
    assert.equal(await inputValue(source), '12.3456789', `${source} refocus restores authoritative precision in the real caller`)
    await evaluate('document.activeElement.setSelectionRange(4, 4)')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
    await delay(100)
    assert.equal(await inputValue(source), '12.3556789', `${source} keeps the full focused draft after a hundredths step`)
    await clickInput(next)
    assert.equal(await inputValue(source), '12.36', `${source} only formats the stepped value after blur`)
    await clickInput(source)
    assert.equal(await inputValue(source), '12.3556789', `${source} refocus confirms the caller retained the authoritative stepped value`)
    await typeInto(source, '12.3456789')
    await clickInput(next)
    return { typed, blurred: committedDisplay, preciseStepAndRefocus: '12.3556789' }
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(async () => (await evaluate('document.title')).includes('COSTBREAKDOWN'), 'application')
  await waitFor(async () => Boolean(await evaluate("[...document.querySelectorAll('button')].some(button => button.innerText.trim() === 'Master Data')")), 'application navigation')

  const artifacts = await mkdtemp(join(tmpdir(), 'costbreakdown-selected-value-evidence-'))
  const screenshot = async name => {
    const captured = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(artifacts, `${name}.png`), Buffer.from(captured.result.data, 'base64'))
  }
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

  // Actual Master Data callers: one static numeric set in Edit and View.
  const fitResults = []
  const auditNumericColumns = async (area, requireHeader = true) => {
    await blurNumeric()
    const metrics = await evaluate(`(${numericColumnGeometry.toString()})()`)
    const applicable = requireHeader ? metrics.filter(metric => metric.hasTable || metric.header !== null) : metrics
    assert.ok(applicable.length >= 6, area + ' exposes the applicable numeric-column inventory')
    const failures = numericCenterlineFailures(applicable, { requireHeader })
    assert.deepEqual(failures, [], area + ' actual Header/frame/decimal centers and compact fits agree')
    fitResults.push({ area, inventory: applicable })
  }

  // Observe the painted compact state after React has processed native Blur.
  const blurNumeric = () => evaluate('new Promise(resolve=>{document.activeElement?.blur();requestAnimationFrame(()=>requestAnimationFrame(resolve))})')
  // Measure the rendered input text using its actual font, alignment, padding,
  // and native scroll offset. Canvas is test instrumentation only, never layout.
  const inputMetrics = aria => evaluate(`(()=>{
    const e=${visibleInputExpression(aria)},r=e.getBoundingClientRect(),s=getComputedStyle(e)
    const canvas=document.createElement('canvas').getContext('2d')
    canvas.font=[s.fontStyle,s.fontWeight,s.fontSize,s.fontFamily].join(' ')
    const mirror=document.createElement('span')
    mirror.textContent=e.value
    Object.assign(mirror.style,{position:'fixed',left:'-10000px',top:'0',whiteSpace:'pre',fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,letterSpacing:s.letterSpacing,fontVariantNumeric:s.fontVariantNumeric,fontFeatureSettings:s.fontFeatureSettings})
    document.body.append(mirror)
    const textWidth=mirror.getBoundingClientRect().width
    let pointOffset=null
    if(e.value.includes('.')){const range=document.createRange(),point=e.value.indexOf('.');range.setStart(mirror.firstChild,point);range.setEnd(mirror.firstChild,point+1);pointOffset=range.getBoundingClientRect().left-mirror.getBoundingClientRect().left}
    mirror.remove()
    const left=r.left+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft)
    const right=r.right-parseFloat(s.borderRightWidth)-parseFloat(s.paddingRight)
    const start=(s.textAlign==='left'||s.textAlign==='start'?left:s.textAlign==='center'?(left+right-textWidth)/2:right-textWidth)-e.scrollLeft
    const point=e.value.indexOf('.')
    const cell=e.closest('td'),table=cell?.closest('table')
    const columnIndex=cell?[...cell.parentElement.children].slice(0,cell.cellIndex).reduce((sum,c)=>sum+c.colSpan,0):-1
    let header=null
    for(let owner=table;owner&&!header;owner=owner.parentElement){
      const row=[...owner.querySelectorAll('thead:not(.sr-only) tr')].find(row=>row.getClientRects().length&&row.children.length>columnIndex)
      if(row)header=row.children[columnIndex]
    }
    const textBoxes=[]
    if(header){
      const walker=document.createTreeWalker(header,NodeFilter.SHOW_TEXT)
      while(walker.nextNode()){
        const node=walker.currentNode
        if(!node.textContent.trim()||node.parentElement.closest('svg,[aria-hidden="true"]'))continue
        const range=document.createRange();range.selectNodeContents(node)
        textBoxes.push(...range.getClientRects())
      }
    }
    const headerCenter=textBoxes.length?(Math.min(...textBoxes.map(b=>b.left))+Math.max(...textBoxes.map(b=>b.right)))/2:null

    const simulationGroup=e.closest('[data-simulation-input-wrapper]')
    let suffix=(simulationGroup??e.parentElement).querySelector('[data-numeric-suffix]')
    for(let ancestor=e.parentElement;!suffix&&ancestor;ancestor=ancestor.parentElement) {
      suffix=[...ancestor.children].find(child=>child.tagName==='SPAN'&&child.textContent.trim()==='%')
      if(ancestor.matches('td,label,section,main'))break
    }
    const group=suffix?.parentElement??e.parentElement,suffixRect=suffix?.getBoundingClientRect()
    return {
      focused:document.activeElement===e,fit:e.dataset.numericFit,font:s.fontFamily,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollLeft:e.scrollLeft,reserveEnd:Number(e.dataset.numericReserveEnd||0),headerCenter,regionCenter:(r.left+r.right)/2,text:e.value,x:r.x,width:r.width,height:r.height,right:r.right,textAlign:s.textAlign,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,
      decimal:point<0?null:start+pointOffset,
      tokenRight:start+textWidth,
      visibleTokenRight:Math.min(start+textWidth,r.right-parseFloat(s.borderRightWidth)),
      fits:textWidth<=right-left+0.5,suffix:!!suffix,suffixLeft:suffixRect?.left,
      suffixRight:suffixRect?.right,groupRight:group.getBoundingClientRect().right
    }
  })()`)

  const ordinaryAxes = new Map()
  const assertFocusAnchor = async (aria, value) => {
    await typeInto(aria, value)
    await blurNumeric()
    const blurred = await inputMetrics(aria)
    const evidenceName = `anchor-${aria.replace(/[^a-z0-9]/gi, '_')}-${value}`
    await screenshot(evidenceName + '-blur')
    await clickInput(aria)
    const focused = await inputMetrics(aria)
    await screenshot(evidenceName + '-focus')
    const expected = value.includes('.') ? value.padEnd(value.indexOf('.') + 3, '0') : value + '.00'
    assert.equal(focused.text, expected, aria + ' focused committed decimal minimum 2dp preserves precision')
    if (!focused.fits) assert.ok(focused.scrollWidth > focused.clientWidth, aria + ' long authoritative Focus draft scrolls within the native input')
    if (!blurred.text.includes('E')) {
      assert.ok(Math.abs(blurred.decimal - blurred.regionCenter) <= 0.6, aria + ' compact blurred decimal retains its frame center')
      const previousAxis = ordinaryAxes.get(aria)
      if (previousAxis !== undefined) assert.ok(Math.abs(previousAxis - blurred.decimal) <= 0.6, aria + ' integer growth shares the column decimal axis')
      ordinaryAxes.set(aria, blurred.decimal)
    }
    if (focused.fits && blurred.decimal !== null && focused.decimal !== null) {
      assert.ok(Math.abs(focused.decimal - blurred.decimal) <= 0.6, aria + ' fitting authoritative draft preserves the compact decimal anchor on focus')
    }
    assert.deepEqual([focused.x, focused.width, focused.height], [blurred.x, blurred.width, blurred.height], aria + ' Focus keeps outer rectangle fixed')
    if (value === '110') {
      await evaluate('document.activeElement.select()')
      let expectedDraft = ''
      for (const character of ['1', '1', '0']) {
        await send('Input.insertText', { text: character })
        await delay(40)
        expectedDraft += character
        assert.equal(await inputValue(aria), expectedDraft, aria + ' active manual typing is not padded')
      }
    }
    await blurNumeric()
    fitResults.push({ area: 'Focus/Blur anchor', aria, value, blurred, focused })
  }

  const assertPercentageSpacing = async aria => {
    const original = await inputValue(aria)
    let suffixX
    for (const value of ['100', '98', '97', '90', '84', '15', '12', '8', '5', '4', '2', '1', '0.0045', '0.000000001']) {
      await typeInto(aria, value)
      await blurNumeric()
      const blurred = await inputMetrics(aria)
      if (['100','98','97','90','84','15','12','8','5','4','2','1'].includes(value)) assert.equal(blurred.text, Number(value).toFixed(2), `${aria} real ordinary percentage ${value} must not become scientific: ${JSON.stringify(blurred)}`)
      await clickInput(aria)
      const focused = await inputMetrics(aria)
      if(value === '8' && aria === masterPercentAria) {
        const header = await evaluate(`document.querySelector('header input[aria-label="Selected value"]')?.value ?? document.querySelector('[data-selected-value-output]')?.textContent.trim()`)
        if(header!==undefined)assert.equal(header,'8.00',aria+' real percentage Header retains normal2dp')
      }
      for (const metric of [blurred, focused]) {
        assert.ok(metric.suffix, aria + ' percentage has dedicated suffix')
        assert.ok(metric.suffixLeft - metric.visibleTokenRight >= 3, aria + ' visible text has breathing room before percent')
        assert.ok(metric.suffixLeft - metric.right >= 3, aria + ' focus frame stays clear of percent')
        assert.ok(metric.suffixRight <= metric.groupRight + 0.5, aria + ' suffix remains inside owning group')
        suffixX ??= metric.suffixLeft
        assert.ok(Math.abs(metric.suffixLeft - suffixX) < 0.6, aria + ' precision and focus never move percent')
      }
      if (value === '5') await screenshot(`percentage-${aria.replace(/[^a-z0-9]/gi, '_')}-focus`)
      fitResults.push({ area: 'Percentage spacing', aria, value, blurred, focused })
    }
    await typeInto(aria, original)
    await blurNumeric()
  }
  const masterLabels = await evaluate(`['consumption','price','manning','capacity','laborRate','burdenRate'].map(field=>[...document.querySelectorAll('input[data-grid-field]')].find(e=>e.dataset.gridField===field&&e.getClientRects().length)?.getAttribute('aria-label')).filter(Boolean)`)
  assert.equal(masterLabels.length, 6, 'all six non-percentage Master Data field sets are present')
  for(const aria of masterLabels){
    const geometry=await inputMetrics(aria)
    assert.ok(Math.abs(geometry.headerCenter-geometry.regionCenter)<=1,`${aria} rendered Header text center equals fixed numeric region center: ${JSON.stringify(geometry)}`)
    if(!geometry.text.includes('E'))assert.ok(Math.abs(geometry.decimal-geometry.regionCenter)<=0.6,`${aria} actual decimal X equals fixed numeric region center: ${JSON.stringify(geometry)}`)
  }

  const assertFitBasedPresentation = async aria => {
    const original = await inputValue(aria)
    let frame
    let fittingOrdinary = 0
    let scientificFallback = 0
    for (const value of ['1', '35', '100', '1000', '10000', '100000', '1000000', '10000000', '100000000', '1000000000', '100000000000000000000', '0.0045']) {
      await typeInto(aria, value)
      await blurNumeric()
      const metric = await inputMetrics(aria)
      const expected = await evaluate(`(()=>{
        const e=${visibleInputExpression(aria)},s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d')
        c.font=[s.fontStyle,s.fontWeight,s.fontSize,s.fontFamily].join(' ')
        const value=Number(${JSON.stringify(value)}),ordinary=value!==0&&Number(value.toFixed(2))===0?value.toFixed(4):value.toFixed(2)
        const whole=ordinary.split('.')[0],fraction=ordinary.includes('.')?ordinary.slice(ordinary.indexOf('.')):'',reserve=Number(e.dataset.numericReserveEnd||0),half=e.getBoundingClientRect().width/2-Number(e.dataset.numericFitInset||0)
        const fits=c.measureText(whole).width<=half&&c.measureText(fraction).width<=half-reserve
        return {fits,text:fits?ordinary:value.toExponential(2).toUpperCase()}
      })()`)
      assert.equal(metric.text, expected.text, `${aria} ordinary-first fallback follows actual rendered half-region fit for ${value}: ${JSON.stringify({ metric, expected })}`)
      assert.ok(metric.fits, `${aria} complete compact token fits the fixed numeric region`)
      if (expected.fits) {
        fittingOrdinary += 1
        assert.ok(Math.abs(metric.decimal - metric.regionCenter) <= 0.6, `${aria} fitting ordinary decimal uses the frame center`)
      } else scientificFallback += 1
      frame ??= [metric.x, metric.width, metric.height]
      assert.deepEqual([metric.x, metric.width, metric.height], frame, `${aria} fit decisions never move outer geometry`)
      fitResults.push({ area: 'Measured ordinary capacity', aria, value, expected, metric })
    }
    assert.ok(fittingOrdinary > 0 && scientificFallback > 0, `${aria} exercises both real fitting ordinary capacity and non-fitting scientific fallback (ordinary=${fittingOrdinary}, scientific=${scientificFallback})`)
    await typeInto(aria, original)
    await blurNumeric()
  }
  for (const aria of masterLabels) await assertFitBasedPresentation(aria)
  const masterAria = masterLabels.find(label=>/Labor/i.test(label))??masterLabels[4]
  const masterOriginal = await inputValue(masterAria)
  for(const value of ['1','35','100','1000','0.0045','110','110.5','12.345678','98','55']) {
    await assertFocusAnchor(masterAria,value)
    if(['98','55'].includes(value)){await clickInput(masterAria);assert.equal(await evaluate(`document.querySelector('header input[aria-label="Selected value"]')?.value`),value+'.00','actual Master Data source Header retains normal2dp');await blurNumeric()}
  }
  for (const [value,display] of [['12.3456789','12.35'],['0.0045','0.0045'],['0.000000001','1.00E-9'],['1234567890','1234567890.00']]) {
    await typeInto(masterAria,value); await blurNumeric()
    const edit = await inputMetrics(masterAria)
    assert.equal(edit.text, display)
    const source = await evaluate(`(${visibleInputExpression(masterAria)}).getAttribute('data-selected-value-source')`)
    await clickButton(`document.querySelector('button[role="switch"]')`)
    const view = await evaluate(`(()=>{const source=[...document.querySelectorAll('[data-selected-value-source]')].find(e=>e.getAttribute('data-selected-value-source')===${JSON.stringify(source)}&&e.getClientRects().length),token=source?.querySelector('[data-numeric-token]'),region=source?.querySelector('[data-numeric-region]'),r=source?.getBoundingClientRect(),range=document.createRange();if(token?.firstChild)range.selectNodeContents(token.firstChild);const b=range.getBoundingClientRect(),style=region?getComputedStyle(region):null,canvas=document.createElement('canvas').getContext('2d');if(style)canvas.font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' ');const numeric=Number(${JSON.stringify(value)});let ordinary=numeric.toFixed(2);if(numeric!==0&&Number(ordinary)===0)ordinary=numeric.toFixed(4);const scientific=/[eE]/.test(ordinary)||ordinary.replace(/^-/,'').split('.')[0].length>8||(numeric!==0&&Number(ordinary)===0),whole=ordinary.split('.')[0],fraction=ordinary.includes('.')?ordinary.slice(ordinary.indexOf('.')):'',half=(region?.getBoundingClientRect().width??0)/2-Number(region?.dataset.numericFitInset??0),reserve=Number(region?.dataset.numericReserveEnd??0),fits=!scientific&&canvas.measureText(whole).width<=half&&canvas.measureText(fraction).width<=half-reserve,expected=scientific||!fits?numeric.toExponential(2).toUpperCase():ordinary,metric=(${numericColumnGeometry.toString()})(source??document)[0];return{text:token?.textContent,width:r?.width,tokenRight:b.right,source:!!source,expected,metric}})()`)
    assert.equal(view.text,view.expected, 'Master Data View uses ordinary notation when its own fixed region fits and scientific only when it does not')
    assert.ok(view.metric && view.metric.tokenFits && Math.abs(view.metric.headerCenter-view.metric.center)<=1, `Master Data View keeps its token inside the shared header/region centerline ${JSON.stringify(view)}`)
    if (['12.35','0.0045','1.00E-9'].includes(display)) await screenshot(`numeric-fit-master-view-${display.replace(/[^a-z0-9]/gi,'_')}`)
    if (!/[eE]/.test(view.text) && !/[eE]/.test(edit.text)) assert.ok(Math.abs(view.tokenRight-edit.tokenRight)<=1, `Master Data View/Edit ordinary presentations share the decimal anchor ${JSON.stringify({value,edit,view})}`)
    assert.ok(Math.abs(view.width-edit.width)<=1, `Master Data View/Edit use the same fixed shell (${view.width}/${edit.width})`)
    await clickButton(`document.querySelector('button[role="switch"]')`)
    await clickInput(masterAria)
    assert.equal(await inputValue(masterAria),value.includes('.')?value:value+'.00', 'switching View/Edit preserves authoritative digits with minimum 2dp')
    fitResults.push({area:'Master Data Edit/View',value,edit,view})
  }
  await typeInto(masterAria,masterOriginal); await blurNumeric()
  for (const width of [1440,1024,768,390,320]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1800,deviceScaleFactor:1,mobile:false})
    await delay(100)
    for (const aria of masterLabels) assert.equal((await inputMetrics(aria)).width,136,`${aria} static width remains consistent at ${width}px`)
    await auditNumericColumns(`Master Data Edit ${width}px`)
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `Master Data ${width}px has no page overflow`)
    if ([1440,390].includes(width)) await screenshot(`numeric-fit-master-${width}`)
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1800,deviceScaleFactor:1,mobile:false})
  const masterPercentAria = await evaluate(`([...document.querySelectorAll('input[data-grid-field="loss"]')].find(e=>e.getClientRects().length))?.getAttribute('aria-label')`)
  assert.ok(masterPercentAria, 'real Master Data percentage editor is present')
  await assertPercentageSpacing(masterPercentAria)

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


  for(const value of ['1','35','100','1000','0.0045','110','110.5','12.345678']) await assertFocusAnchor(simulationInput,value)
  const numericFitLabels = [simulationInput,'Selling Price','Variable Action Cost / Unit','Fixed Action Cost']
  await assertFitBasedPresentation(simulationInput)
  for (const aria of numericFitLabels) {
    const original = await inputValue(aria)
    let ordinary
    let staticFrame
    for (const [value,display] of [['12.30','12.30'],['0.0045','0.0045'],['0.000000001','1.00E-9']]) {
      await typeInto(aria,value); await blurNumeric()
      const metric = await inputMetrics(aria)
      assert.equal(metric.text,display, `${aria} display-fit ${value}`)
      assert.ok(metric.fits, `${aria} complete presentation fits its slot`)
      if (aria===simulationInput && ['0.0045','1.00E-9'].includes(display)) await screenshot(`numeric-fit-fixed-simulation-${display.replace(/[^a-z0-9]/gi,'_')}`)
      if(value==='12.30') ordinary=metric
      if(value==='0.0045') assert.ok(Math.abs(ordinary.decimal-metric.decimal)<0.6,`${aria} 2dp/4dp share decimal anchor`)
      if(display.includes('E')) assert.ok(metric.fits,`${aria} scientific fallback token fits independently of the ordinary decimal anchor`)
      assert.equal(metric.width,ordinary.width,`${aria} static slot does not follow value length`)
      if(aria===simulationInput) {
        const frame = await evaluate(`(()=>{const e=${visibleInputExpression(aria)},f=e.closest('td').querySelector('[data-simulation-input-frame]'),r=f.getBoundingClientRect();return {x:r.x,width:r.width}})()`)
        staticFrame ??= frame
        assert.deepEqual(frame,staticFrame, 'Simulation overlay is fixed across ordinary/tiny/scientific values')
        await clickInput(aria)
        assert.equal(await inputValue(aria),value.includes('.')?value.padEnd(value.indexOf('.')+3,'0'):value+'.00', 'Simulation Focus restores authoritative full value')
        const focused = await inputMetrics(aria)
        assert.equal(focused.x,metric.x);assert.equal(focused.width,metric.width)
        await blurNumeric()
      }
      fitResults.push({area:'Simulation/Business/Economic',aria,value,...metric})
    }
    await typeInto(aria,original);await blurNumeric()
  }

  const batchOriginal=await inputValue('Batch Size')
  await typeInto('Batch Size','123456789');await blurNumeric()
  assert.equal(await inputValue('Batch Size'),'1.23E+8','semantic integer quantity uses scientific fallback without adding .00')
  await clickInput('Batch Size')
  assert.equal(await inputValue('Batch Size'),'123456789','integer edit hydrates full authoritative quantity')
  await evaluate('document.activeElement.select()');await send('Input.insertText',{text:'3.5'})
  assert.equal(await inputValue('Batch Size'),'123456789','real Batch Size still rejects fractional drafts')
  await typeInto('Batch Size',batchOriginal);await blurNumeric()
  const sgaAria=await evaluate(`([...document.querySelectorAll('input')].find(e=>e.getClientRects().length&&/SG&A/.test(e.getAttribute('aria-label')||'')))?.getAttribute('aria-label')`)
  assert.ok(sgaAria,'real Business SG&A editor is available')
  const sgaOriginal=await inputValue(sgaAria)
  await typeInto(sgaAria,'100');await blurNumeric()
  assert.equal(await inputValue(sgaAria),'100.00')
  const sgaMetrics = await inputMetrics(sgaAria)
  const sellingPriceMetrics = await inputMetrics('Selling Price')
  assert.equal(sgaMetrics.suffix, false, 'SG&A has no duplicate % suffix')
  assert.equal(sgaMetrics.width, sellingPriceMetrics.width, 'SG&A matches frame width of sibling economic inputs')
  await clickInput(sgaAria);await evaluate('document.activeElement.select()');await send('Input.insertText',{text:'101'})
  assert.equal(await inputValue(sgaAria),'100.00','SG&A maximum remains 100 percent')
  await typeInto(sgaAria,sgaOriginal);await blurNumeric()
  const percentAria=await evaluate(`([...document.querySelectorAll('input')].find(e=>e.getClientRects().length&&/Loss in Current$/.test(e.getAttribute('aria-label')||'')))?.getAttribute('aria-label')`)
  const yieldAria = await evaluate(`([...document.querySelectorAll('input')].find(e=>e.getClientRects().length&&/Yield in Current$/.test(e.getAttribute('aria-label')||'')))?.getAttribute('aria-label')`)
  assert.ok(percentAria && yieldAria, 'real Loss and Yield percentage editors are present')
  for (const aria of [percentAria, yieldAria]) await assertPercentageSpacing(aria)

  for(const width of [1440,1366,1280,1024,768,390,320]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1800,deviceScaleFactor:1,mobile:false})
    await delay(100)
    for (const aria of [percentAria,yieldAria]) {
      const before = await inputValue(aria)
      for(const value of [1,2,5,84,90,97,98]) {
        await typeInto(aria,String(value));await blurNumeric()
        const metric = await inputMetrics(aria)
        assert.equal(metric.text,value.toFixed(2),`${aria} actual ordinary percentage remains ordinary at ${width}px: ${JSON.stringify(metric)}`)
        if(width>=768)assert.ok(Math.abs(metric.headerCenter-metric.regionCenter)<=1, `${aria} header/frame center remains aligned at ${width}px`)
      }
      await typeInto(aria,before);await blurNumeric()
    }
    if(width===1280){
      const costHeaders=await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-table] thead:not(.sr-only) [data-numeric-column-header]')].filter(e=>/^(Material Cost|Conversion Cost)$/.test(e.textContent)).map(e=>{const r=document.createRange();r.selectNodeContents(e);return {text:e.textContent,lines:r.getClientRects().length}}))()`)
      assert.equal(costHeaders.length,2,'1280 retains both complete calculated-cost headers')
      assert.ok(costHeaders.every(header=>header.lines===1),'1280 full calculated-cost headers remain on one readable line')
      await clickInput(simulationInput)
      const authoritativePrice=await inputValue(simulationInput)
      await blurNumeric()
      const wasExpanded=await evaluate(`(()=>{const row=document.querySelector('[data-simulation-table="bom"] tr[data-simulation-row-index="0"]');const expanded=row.getAttribute('aria-expanded')==='true';if(!expanded)row.click();return expanded})()`)
      await typeInto(simulationInput,'1'+'0'.repeat(300));await blurNumeric()
      const total=await evaluate(`(()=>{const cell=[...document.querySelectorAll('[data-simulation-table="bom"] td[aria-label^="Total "]')].find(e=>e.getAttribute('aria-label').includes('E+300')),region=cell?.querySelector('[data-numeric-region]'),token=region?.querySelector('[data-numeric-token]'),annotation=region?.querySelector('[data-numeric-inline-annotation]');if(!token||!annotation)return null;const r=region.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(token);const t=range.getBoundingClientRect();range.selectNodeContents(annotation);const a=range.getBoundingClientRect();return {text:token.textContent,floor:region.dataset.numericFitFloor,left:r.left,right:r.right,tokenLeft:t.left,tokenRight:t.right,annotationLeft:a.left,annotationRight:a.right,annotationBottom:a.bottom,tokenBottom:t.bottom}})()`)
      assert.ok(total&&total.text.includes('E+300'), 'actual1280 expanded Parameter Cost Effect exercises signed three-digit scientific Total')
      assert.equal(total.floor,'adequate','actual expanded Total preserves full supported scientific floor')
      assert.ok(total.tokenLeft>=total.left-0.6&&total.tokenRight<=total.right+0.6,`expanded Total complete scientific token stays inside numeric region: ${JSON.stringify(total)}`)
      assert.ok(total.annotationRight<total.tokenLeft&&Math.abs(total.annotationBottom-total.tokenBottom)<=1,`expanded Total annotation and scientific value share one baseline without positioning: ${JSON.stringify(total)}`)
      await screenshot('numeric-expanded-total-scientific-1280')
      await typeInto(simulationInput,authoritativePrice);await blurNumeric()
      if(!wasExpanded)await evaluate(`document.querySelector('[data-simulation-table="bom"] tr[data-simulation-row-index="0"]').click()`)
    }
    for(const aria of ['Selling Price','Variable Action Cost / Unit']) {
      await typeInto(aria,'12345678.9');await blurNumeric()
      assert.ok((await inputMetrics(aria)).fits,`${aria} fits baseline eight digits at ${width}px`)
    }
    const resultFit=await evaluate(`(()=>[...document.querySelectorAll('[aria-labelledby="simulation-result-title"] td [data-numeric-presentation]')].map(e=>{const cell=e.closest('td'),c=cell.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return{text:e.textContent,cellWidth:c.width,textWidth:b.width,fits:b.left>=c.left-0.5&&b.right<=c.right+0.5}}))()`)
    assert.ok(resultFit.length>0&&resultFit.every(item=>item.fits), `Result read-only tokens stay in their own cells at ${width}px: ${JSON.stringify(resultFit.filter(item=>!item.fits))}`)
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Simulation/Business/Economic ${width}px has no page overflow`)
    if ([1440,390].includes(width)) await screenshot(`numeric-fit-simulation-economic-${width}`)
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1800,deviceScaleFactor:1,mobile:false})
  await auditNumericColumns('Simulation numeric sets')
  results.numericDisplayFit=fitResults

  await send('Page.navigate', { url: new URL('/scripts/fixtures/numeric-column-browser.html', baseUrl).href })
  await waitFor(async () => Boolean(await evaluate(`!!document.querySelector('[aria-label="Measured numeric column fixture"]')`)), 'measured numeric column fixture')
  await delay(200)
  const extremeColumns = await evaluate(`(${numericColumnGeometry.toString()})(document.querySelector('main'))`).then(metrics=>metrics.filter(metric=>metric.table?.includes('px measured numeric regions')))
  assert.equal(extremeColumns.length, 66, 'all three fixed widths render actual editable/read-only ordinary and extreme scientific values')
  assert.deepEqual(numericCenterlineFailures(extremeColumns), [], 'actual signed scientific tokens and ordinary decimals fit all supported minimum fixed regions')
  assert.ok(extremeColumns.some(metric => metric.text === '-1.00E+300'), 'negative three-digit scientific exponent renders in the actual shared components')
  assert.ok(extremeColumns.some(metric => metric.text === '4.94E-324'), 'smallest finite authoritative number renders its supported scientific token')
  assert.ok(extremeColumns.some(metric => metric.text === '1.80E+308'), 'largest finite authoritative number renders its supported scientific token')
  const suffixAccessibility = await evaluate(`(()=>[...document.querySelectorAll('[data-suffix-pair-value]')].map(row=>({readOnly:row.children[1].querySelector('[data-numeric-suffix]').getAttribute('aria-hidden'),editor:row.children[3].querySelector('[data-numeric-suffix]').getAttribute('aria-hidden')})))()`)
  assert.ok(suffixAccessibility.length === 6 && suffixAccessibility.every(pair => pair.readOnly === null && pair.editor === 'true'), 'shared suffix slots preserve accessible read-only percentages and decorative editor suffixes')
  const suffixPairs = await evaluate(`(()=>[...document.querySelectorAll('[data-suffix-pair-value]')].map(row=>({value:row.dataset.suffixPairValue,regions:[...row.querySelectorAll('[data-numeric-region]')].map(e=>({width:e.getBoundingClientRect().width,text:e.value??e.querySelector('[data-numeric-token]')?.textContent,notation:e.dataset.numericFit}))})))()`)
  for(const pair of suffixPairs){
    for(const [plain,percent] of [[0,1],[2,3]]){
      assert.ok(Math.abs(pair.regions[plain].width-pair.regions[percent].width)<0.1, `same numeric region is independent from suffix gutter for ${pair.value}`)
      assert.equal(pair.regions[plain].text,pair.regions[percent].text, `suffix cannot change fit notation for ${pair.value}`)
    }
  }
  assert.deepEqual(numericCenterlineFailures(await evaluate(`(${numericColumnGeometry.toString()})(document.querySelector('[data-suffix-pairs]'))`)), [], 'equivalent suffix/plain real shared regions retain all header/decimal/token geometry')
  const scientificSummary = await evaluate(`(${cbdCorrectionGeometry.toString()})()`)
  assert.equal(scientificSummary.totals.length,2,'actual Cost Element and Work Center scientific Total fixtures render')
  assert.ok(scientificSummary.totals.every(t=>t.separate && t.label.right+4<=t.token.left && t.token.right<=t.numeric.right+1), `scientific Total labels and tokens stay separate: ${JSON.stringify(scientificSummary)}`)
  await screenshot('numeric-centerline-scientific-extremes')
  const longLabel = 'Measured -1e+300 at 77'
  const longBefore = await inputMetrics(longLabel)
  await evaluate(`(()=>${visibleInputExpression(longLabel)}.focus())()`)
  const longFocused = await inputMetrics(longLabel)
  assert.equal(Number(longFocused.text), -1e300, 'long native edit exposes the complete authoritative scientific source as decimal digits')
  assert.ok(longFocused.scrollWidth > longFocused.clientWidth, 'long focused draft uses native internal horizontal overflow')
  assert.equal(longFocused.scrollLeft, 0, 'initial focus does not move the long authoritative value to an arbitrary horizontal scroll position')
  assert.deepEqual([longFocused.x,longFocused.width,longFocused.height], [longBefore.x,longBefore.width,longBefore.height], 'extreme authoritative edit preserves the fixed native outer frame')
  await evaluate('document.activeElement.setSelectionRange(0,0)')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 })
  const longNavigated = await inputMetrics(longLabel)
  assert.equal(await evaluate('document.activeElement.selectionStart'), longFocused.text.length, 'End reaches digits hidden outside the fixed frame')
  assert.ok(longNavigated.scrollLeft > 0, 'native caret navigation scrolls the fixed input only when the user moves to hidden digits')
  await blurNumeric()
  await evaluate(`(()=>${visibleInputExpression(longLabel)}.focus())()`)
  const longRefocused = await inputMetrics(longLabel)
  assert.equal(longRefocused.scrollLeft, 0, 'blur/refocus restarts the long editor at its stable initial view')
  assert.deepEqual([longRefocused.x,longRefocused.width,longRefocused.height], [longBefore.x,longBefore.width,longBefore.height], 'blur/refocus preserves the fixed native outer frame')
  await blurNumeric()
  results.scientificFloor = extremeColumns

  await send('Page.navigate', { url: new URL('/scripts/fixtures/selected-value-browser.html', baseUrl).href })
  await waitFor(async () => Boolean(await evaluate('!!document.querySelector(\'[aria-label="Selected value foundation fixture"]\')')), 'shared foundation fixture')
  const buttonByText = text => clickButton(`([...document.querySelectorAll('button')].find(button => button.innerText.trim() === ${JSON.stringify(text)}))`)
  const byAria = label => `document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']')`
  const model = name => evaluate(`document.querySelector('[data-testid="${name}-model"]')?.textContent`)
  const headerText = () => evaluate(`document.querySelector('header input[aria-label="Selected value"]')?.value ?? document.querySelector('[data-selected-value-output]')?.textContent.trim()`)
  const headerSteppers = () => evaluate('document.querySelectorAll("header [data-numeric-stepper]").length')
  const key = async (name, code = name) => {
    const virtualKey = { Enter: 13, ' ': 32, ArrowUp: 38, ArrowDown: 40, Backspace: 8, Tab: 9 }[name]
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
  await insertValue('Foundation decimal', '12.3456789')
  assert.equal(await model('decimal'), '12.3456789', 'regression starts from the authoritative precise value')
  await buttonByText('Blur focused source')
  assert.equal(await inputValue('Foundation decimal'), '12.35', 'unfocused compact presentation remains rounded')
  await clickInput('Foundation decimal')
  assert.equal(await inputValue('Foundation decimal'), '12.3456789', 'focus restores full authoritative digits from a rounded compact display')
  await caret(10)
  await send('Input.insertText', { text: '5' })
  await delay(100)
  assert.equal(await model('decimal'), '12.34567895', 'continuing the full draft retains all authoritative digits')
  await buttonByText('Blur focused source')
  assert.equal(await inputValue('Foundation decimal'), '12.35', 'edited value returns to the unchanged compact presentation')
  assert.equal(await model('decimal'), '12.34567895', 'blur does not round the authoritative edited value')
  await clickInput('Foundation decimal')
  assert.equal(await inputValue('Foundation decimal'), '12.34567895', 'refocus restores the updated full value')
  await buttonByText('External update')
  assert.equal(await inputValue('Foundation decimal'), '98.7654321', 'external updates synchronize a pristine focused full draft')
  for (const fullDraft of ['0.00001234', '0.000000000123456789']) {
    await insertValue('Foundation decimal', fullDraft)
    await buttonByText('Blur focused source')
    await clickInput('Foundation decimal')
    assert.equal(await inputValue('Foundation decimal'), fullDraft, 'small/scientific presentation restores the authoritative decimal draft')
  }
  await buttonByText('Reset decimal')
  await clickInput('Foundation decimal')
  assert.equal(await headerText(), '12.34567891', 'unfocused Header retains its eight-decimal presentation')
  await clickInput('Selected value')
  assert.equal(await inputValue('Selected value'), '12.3456789123', 'Header focus restores full authoritative digits from its shortened display')
  await caret(13)
  await send('Input.insertText', { text: '5' })
  await delay(100)
  assert.equal(await model('decimal'), '12.34567891235', 'Header continuation preserves the full authoritative precision')
  await clickInput('Foundation decimal')
  assert.equal(await headerText(), '12.34567891', 'Header blur restores its existing presentation')
  await clickInput('Selected value')
  assert.equal(await inputValue('Selected value'), '12.34567891235', 'Header refocus restores its updated full value')
  await buttonByText('Reset decimal')
  await buttonByText('Blur focused source')

  for (const entry of ['keyboard', 'spinner', 'wheel']) {
    const header = entry === 'spinner'
    const aria = header ? 'Selected value' : 'Foundation decimal'
    const initial = header ? '12.3456789123' : '12.3456789'
    const stepped = header ? '12.3556789123' : '12.3556789'
    await insertValue('Foundation decimal', initial)
    await clickInput(aria)
    await caret(4)
    if (entry === 'keyboard') {
      await key('ArrowUp')
      assert.equal(await model('decimal'), stepped, 'precise ArrowUp updates the authoritative value')
      assert.equal(await inputValue(aria), stepped, 'precise ArrowUp retains all focused draft digits')
      await key('ArrowDown')
      assert.equal(await model('decimal'), initial, 'precise ArrowDown restores the authoritative value')
      assert.equal(await inputValue(aria), initial, 'precise ArrowDown retains all focused draft digits')
      await key('ArrowUp')
    } else if (header) {
      await clickButton(byAria('Increase Selected value'))
    } else {
      await wheelOver(aria)
    }
    assert.equal(await model('decimal'), stepped, `${entry} preserves the authoritative stepped precision`)
    assert.equal(await inputValue(aria), stepped, `${entry} keeps the full visible focused draft`)
    assert.equal(await evaluate('document.activeElement?.getAttribute("aria-label")'), aria, `${entry} retains editor focus`)
    assert.equal(await evaluate('document.activeElement.selectionStart'), 4, `${entry} preserves the hundredths caret place`)
    await caret(stepped.length)
    await send('Input.insertText', { text: '5' })
    await delay(100)
    assert.equal(await model('decimal'), `${stepped}5`, `${entry} manual continuation loses no hidden digits`)
    assert.equal(await inputValue(aria), `${stepped}5`, `${entry} manual continuation retains the full draft`)
    await clickInput(header ? 'Foundation decimal' : 'Foundation integer')
    assert.equal(await inputValue(aria), header ? '12.35567891' : '12.36', `${entry} blur restores existing presentation`)
    assert.equal(await model('decimal'), `${stepped}5`, `${entry} blur preserves the authoritative value`)
    await clickInput(aria)
    assert.equal(await inputValue(aria), `${stepped}5`, `${entry} refocus restores full edited precision`)
  }
  await buttonByText('Reset decimal')
  await buttonByText('Blur focused source')

  assert.equal(await headerText(), '—', 'Header Value is always present with an empty-selection dash')
  assert.match(await evaluate('document.querySelector("[data-header-value]").textContent'), /Value/)
  assert.equal(await headerSteppers(), 0, 'no selection exposes no spinner')
  await screenshot('header-default-1440')

  const numberStyle = aria => evaluate(`(()=>{const element=${byAria(aria)};const treatment=element.firstElementChild??element;const style=getComputedStyle(element);const treatmentStyle=getComputedStyle(treatment);const rect=element.getBoundingClientRect();const treatmentRect=treatment.getBoundingClientRect();return {cursor:style.cursor,background:treatmentStyle.backgroundColor,boxShadow:style.boxShadow,focusVisible:element.matches(':focus-visible'),border:style.borderWidth,outline:style.outlineStyle,padding:style.padding,margin:style.margin,width:rect.width,height:rect.height,x:rect.x,y:rect.y,treatmentWidth:treatmentRect.width,treatmentHeight:treatmentRect.height}})()`)
  const movePointer = async point => send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
  const outsideNumberPoint = await evaluate('({x:innerWidth-2,y:innerHeight-2})')
  const numberPoint = async aria => evaluate(`(()=>{const rect=${byAria(aria)}.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
  const headerZoneGeometry = () => evaluate(`(()=>{
    const value=document.querySelector('header [data-header-value]')
    const zone=value?.querySelector('[data-header-numeric-zone]')
    const percent=zone?.querySelector('[data-header-percent-slot]')
    const spinner=zone?.querySelector('[data-header-spinner-slot]')
    const input=zone?.querySelector('input[aria-label="Selected value"]')
    const output=zone?.querySelector('[data-selected-value-output]')
    const control=input??output
    if(!value||!zone||!percent||!spinner||!control)return null
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}
    const zoneRect=zone.getBoundingClientRect(),style=getComputedStyle(control),spinnerStyle=getComputedStyle(spinner)
    const paddingRight=Number.parseFloat(style.paddingRight)||0,borderRight=Number.parseFloat(style.borderRightWidth)||0
    return {
      value:rect(value),zone:rect(zone),numericAxisRight:Math.round((zoneRect.right-paddingRight-borderRight)*1000)/1000,
      percent:rect(percent),percentText:percent.textContent.trim(),spinner:rect(spinner),spinnerVisibility:spinnerStyle.visibility,spinnerOpacity:spinnerStyle.opacity,
      input:Boolean(input),inputFocused:document.activeElement===input,inputBorderColor:input?getComputedStyle(input).borderTopColor:null,
      inputBoxShadow:input?getComputedStyle(input).boxShadow:null,outputText:output?.textContent.trim()??null,
      overflow:document.documentElement.scrollWidth>innerWidth
    }
  })()`)
  const noAnchorFastPassPoint = await numberPoint('Select precise result')
  await movePointer(noAnchorFastPassPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'a quick source pass does not immediately preview without an anchor')
  await movePointer(outsideNumberPoint)
  await delay(400)
  assert.equal(await headerText(), '—', 'a cancelled quick pass never previews after its old dwell deadline')
  await movePointer(noAnchorFastPassPoint)
  await delay(400)
  assert.equal(await headerText(), '12.34567891', 'remaining over a source for the 350ms dwell activates preview')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), '—', 'pointer leave promptly clears a dwell-activated preview')

  await clickInput('Foundation read-only focus')
  const focusedReadOnlyA = await headerText()
  const focusedReadOnlyBPoint = await numberPoint('Foundation read-only peer')
  await movePointer(focusedReadOnlyBPoint)
  await delay(100)
  assert.equal(await headerText(), focusedReadOnlyA, 'a fast pass over read-only B leaves focused A displayed')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), focusedReadOnlyA, 'leaving a cancelled B dwell keeps focused A')
  await movePointer(focusedReadOnlyBPoint)
  await delay(400)
  assert.equal(await headerText(), '65.43210988', 'read-only B previews over focused A only after dwell')
  assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), 'focused-readonly-source', 'dwell preview leaves read-only A as the actual native focus')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), focusedReadOnlyA, 'leaving read-only B restores focused A promptly')
  await buttonByText('Blur focused source')

  const idleNumber = await numberStyle('Select precise result')
  assert.equal(idleNumber.cursor, 'pointer')
  const readOnlyFocusPoint = await numberPoint('Foundation read-only focus')
  const readOnlyFocusGeometry = async () => evaluate(`(()=>{const element=${byAria('Foundation read-only focus')};const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,active:document.activeElement===element}})()`)
  const readOnlyFocusBeforeHover = await readOnlyFocusGeometry()
  await movePointer(readOnlyFocusPoint)
  await delay(400)
  if (await headerText() !== '43.12345679') {
    await waitFor(async () => (await headerText()) === '43.12345679', 'unfocused native read-only hover preview after its dwell', 1200)
  }
  assert.equal(await headerText(), '43.12345679', 'unfocused native read-only hover previews a rounded Header value')
  assert.equal(await headerSteppers(), 0, 'native read-only hover remains non-editable')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'native read-only hover does not expose a Header writer')
  const readOnlyFocusHoverState = await readOnlyFocusGeometry()
  assert.equal(readOnlyFocusHoverState.active, false, 'hover preview does not create native focus')
  assert.deepEqual(readOnlyFocusHoverState, readOnlyFocusBeforeHover, 'native read-only hover leaves its geometry unchanged')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'leaving an unanchored native read-only preview restores an empty Header')

  const focusedEditablePeerPoint = await numberPoint('Foundation editable peer')
  await movePointer(focusedEditablePeerPoint)
  await delay(400)
  assert.equal(await headerText(), '76.54321099', 'unfocused editable hover previews through the shared Header formatter')
  assert.equal(await headerSteppers(), 0, 'editable hover remains a non-owning read-only preview')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'unfocused editable hover never exposes its writer in Header')
  assert.equal(await model('decimal-peer'), '76.543210987', 'previewing an editable source does not write to it')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'leaving an unanchored editable preview restores an empty Header')

  for (let tabCount = 0; tabCount < 80 && !(await evaluate(`${byAria('Select precise result')} === document.activeElement`)); tabCount++) await key('Tab')
  const keyboardFocusedNumber = await numberStyle('Select precise result')
  assert.equal(keyboardFocusedNumber.focusVisible, true, 'keyboard navigation exposes the accessible focus indicator')
  assert.notEqual(keyboardFocusedNumber.boxShadow, idleNumber.boxShadow, 'keyboard focus retains a visible ring')
  assert.equal(await evaluate(`${byAria('Select precise result')}.getAttribute('aria-pressed')`), 'false', 'keyboard focus alone does not pin the value')
  await key('Tab')
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Select tiny result', 'Tab moves focus without activating a SelectedNumber')
  const hoverPoint = await numberPoint('Select precise result')
  await movePointer(hoverPoint)
  await delay(400)
  assert.equal(await headerText(), '12.34567891', 'idle read-only hover previews up to eight decimals in Header')
  const hoveredNumber = await numberStyle('Select precise result')
  assert.equal(hoveredNumber.boxShadow, idleNumber.boxShadow, 'pointer hover adds no outline or ring')
  assert.notEqual(hoveredNumber.background, idleNumber.background, 'unpinned hover applies a light selection background to the rendered value')
  assert.equal(hoveredNumber.treatmentWidth, idleNumber.treatmentWidth, 'hover background hugs the rendered number without changing its width')
  assert.equal(keyboardFocusedNumber.background, idleNumber.background, 'keyboard focus does not use the pinned fill')
  assert.equal(await evaluate(`${byAria('Select precise result')}.getAttribute('aria-pressed')`), 'false', 'hover preview does not pin the value')
  for (const geometry of ['width', 'height', 'x', 'y', 'padding', 'margin']) assert.equal(hoveredNumber[geometry], idleNumber[geometry], `number hover preserves ${geometry}`)
  await screenshot('selected-number-hover-1440')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'mouse leave clears an unpinned preview')
  await clickButton(byAria('Select precise result'))
  assert.equal(await headerText(), '12.34567891', 'read-only Header caps presentation at eight decimals')
  assert.equal(await headerSteppers(), 0, 'read-only selection has no spinner')
  assert.equal(await evaluate('document.querySelector(\'[data-testid="row-clicks"]\').textContent'), '0', 'numeric selection never expands its containing row')
  await movePointer(outsideNumberPoint)
  await delay(100)
  const selectedNumber = await numberStyle('Select precise result')
  assert.notEqual(selectedNumber.background, idleNumber.background, 'selected background persists after pointer leaves')
  assert.notEqual(selectedNumber.background, hoveredNumber.background, 'pinned background is visually stronger than hover')
  assert.equal(selectedNumber.boxShadow, hoveredNumber.boxShadow, 'pinned treatment does not add an outline or ring')
  assert.equal(await headerText(), '12.34567891', 'pinned value persists after pointer leaves')
  for (const geometry of ['width', 'height', 'x', 'y', 'padding', 'margin']) assert.equal(selectedNumber[geometry], idleNumber[geometry], `number selection preserves ${geometry}`)
  assert.equal(selectedNumber.border, '0px')
  assert.equal(selectedNumber.outline, 'none')
  const tinyPoint = await numberPoint('Select tiny result')
  await movePointer(tinyPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'a fast pass over B does not displace pinned A')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), '12.34567891', 'leaving a cancelled B dwell keeps pinned A')
  await movePointer(tinyPoint)
  await delay(400)
  assert.equal(await headerText(), '0.00456789', 'hover preview temporarily replaces pinned A with B')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'leaving preview B restores pinned A')
  await clickButton(byAria('Select tiny result'))
  assert.equal(await headerText(), '0.00456789')
  assert.equal(await evaluate('document.querySelectorAll("button[aria-pressed=\\\"true\\\"][data-selected-number]").length'), 1, 'one selected number replaces the previous selection')
  assert.equal(await evaluate(`${byAria('Select tiny result')}.getAttribute('aria-pressed')`), 'true', 'click pins the previewed number')
  assert.equal(await evaluate(`${byAria('Select precise result')}.getAttribute('aria-pressed')`), 'false', 'pinning B moves the pin from A')
  await movePointer(outsideNumberPoint)
  await delay(100)
  await evaluate(`${byAria('Select precise result')}.focus()`)
  await key('Enter')
  assert.equal(await headerText(), '12.34567891', 'read-only selection supports Enter')
  await evaluate(`${byAria('Select tiny result')}.focus()`)
  await key(' ', 'Space')
  assert.equal(await headerText(), '0.00456789', 'read-only selection supports Space')

  const headerPrecisionCases = [
    ['Select floating noise', '20.00'],
    ['Select rounded noise', '20.37'],
    ['Select trimmed half', '20.50'],
    ['Select eight-decimal cap', '20.12345679'],
    ['Select trimmed precision', '27.3456789'],
    ['Select small nonzero', '0.00003'],
    ['Select tiny scientific', '1.00e-9'],
    ['Select minimum number', '4.94e-324'],
    ['Select whole number', '27.00']
  ]
  for (const [label, expected] of headerPrecisionCases) {
    await buttonByText('Clear selected value')
    await clickButton(byAria(label))
    assert.equal(await headerText(), expected, `${label} uses the capped, trimmed Header presentation`)
    assert.equal(await headerSteppers(), 0, `${label} remains a read-only Header value`)
  }
  await buttonByText('Clear selected value')
  const percentageNoisePoint = await numberPoint('Select percentage noise')
  await movePointer(percentageNoisePoint)
  await delay(400)
  assert.equal(await headerText(), '20.00', 'percentage float noise is normalized in an actual browser hover preview')
  assert.match(await evaluate('document.querySelector("[data-header-value]").textContent'), /%/, 'percentage hover preview keeps its percent suffix')
  assert.equal(await headerSteppers(), 0, 'percentage preview remains read-only')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'leaving percentage preview clears an unanchored Header')
  await clickButton(byAria('Select percentage noise'))
  assert.equal(await headerText(), '20.00', 'percentage floating-point noise is removed in Header presentation')
  assert.match(await evaluate('document.querySelector("[data-header-value]").textContent'), /%/, 'Header keeps the percentage suffix after noise cleanup')
  await buttonByText('Clear selected value')
  await clickButton(byAria('Select tiny result'))
  assert.equal(await headerText(), '0.00456789', 'pinning the fallback source restores its eight-decimal presentation')

  await buttonByText('Clear selected value')
  const raceA = await numberPoint('Select precise result')
  await movePointer(raceA)
  await delay(150)
  await movePointer(outsideNumberPoint)
  await delay(80)
  const raceB = await numberPoint('Select tiny result')
  await movePointer(raceB)
  await delay(160)
  assert.equal(await headerText(), '—', 'an old A dwell cannot fire after B becomes the active dwell target')
  await delay(240)
  assert.equal(await headerText(), '0.00456789', 'the current B target previews after its own full dwell')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), '—', 'leaving B clears only its activated preview')

  const toggleReadOnlyButton = `([...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Toggle read-only values'))`
  await evaluate(`${toggleReadOnlyButton}.focus()`)
  const unmountPoint = await numberPoint('Select tiny result')
  await movePointer(unmountPoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'an unmount test starts with an unactivated dwell')
  await key('Enter')
  await delay(400)
  assert.equal(await headerText(), '—', 'unmounting the hovered source cancels its pending dwell')
  await key('Enter')
  await movePointer(outsideNumberPoint)

  await evaluate(`([...document.querySelectorAll('header nav button')].find(button => button.innerText.trim() === 'Master Data')).focus()`)
  const scopePoint = await numberPoint('Select precise result')
  await movePointer(scopePoint)
  await delay(100)
  assert.equal(await headerText(), '—', 'scope test starts with an unactivated dwell')
  await key('Enter')
  await delay(400)
  assert.equal(await headerText(), '—', 'changing page scope cancels its pending dwell without pointer leave')
  await clickButton(byAria('Select tiny result'))
  assert.equal(await headerText(), '0.00456789', 'read-only pin remains available after the scope-change check')

  await screenshot('header-readonly-1440')

  const sourceValueBeforeFocus = await model('decimal')
  await clickInput('Foundation decimal')
  assert.equal(await headerText(), '12.34567891', 'editable source focus presents at most eight decimal places in Header')
  assert.equal(await headerSteppers(), 1, 'editable Header owns the only visible spinner')
  assert.equal(await model('decimal'), sourceValueBeforeFocus, 'focusing the source leaves its authoritative value unchanged')
  const sourceId = await evaluate('document.activeElement.getAttribute("data-selected-value-source")')
  await movePointer(outsideNumberPoint)
  const sameSourcePoint = await numberPoint('Foundation decimal')
  await movePointer(sameSourcePoint)
  await delay(100)
  const sameSourceHover = await evaluate(`({active:document.activeElement?.getAttribute("data-selected-value-source"),headerInput:document.querySelector('header input[aria-label="Selected value"]')?.value??null,headerSource:document.querySelector('header input[aria-label="Selected value"]')?.getAttribute('data-selected-value-source')??null,spinners:document.querySelectorAll('header [data-numeric-stepper]').length})`)
  assert.equal(sameSourceHover.active, sourceId, 'same-source hover leaves the native editable focus anchored')
  assert.equal(sameSourceHover.headerInput, '12.34567891', 'same-source hover does not demote Header editability or reveal more than eight decimals')
  assert.equal(sameSourceHover.headerSource, sourceId, 'same-source hover retains the focused source writer')
  assert.equal(sameSourceHover.spinners, 1, 'same-source hover preserves Header spinner without flicker')
  await clickInput('Selected value')
  assert.equal(await evaluate('document.activeElement.getAttribute("data-selected-value-source")'), sourceId, 'source → Header transfer keeps the same source identity')
  assert.equal(await headerText(), '12.3456789123', 'focused Header edits the authoritative full value')
  await clickInput('Foundation decimal')
  assert.equal(await evaluate('document.activeElement.getAttribute("data-selected-value-source")'), sourceId, 'source A owns native focus before its peer is previewed')
  const editablePeerPoint = await numberPoint('Foundation editable peer')
  await movePointer(editablePeerPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'a fast pass over editable B keeps editable focused A')
  assert.equal(await headerSteppers(), 1, 'editable A retains its non-owning Header editor during a fast pass')
  await movePointer(outsideNumberPoint)
  await delay(80)
  assert.equal(await headerText(), '12.34567891', 'leaving a cancelled editable B dwell restores editable A')
  await movePointer(editablePeerPoint)
  await delay(400)
  assert.equal(await headerText(), '76.54321099', 'editable source B temporarily previews over focused editable source A')
  assert.equal(await headerSteppers(), 0, 'editable source B preview is read-only while A owns Header edits')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'hovering editable B does not expose A\'s writer as B\'s editor')
  assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), sourceId, 'A remains the actual anchored focus while B is hovered')
  assert.equal(await model('decimal-peer'), '76.543210987', 'hovering editable B does not mutate B or take A\'s writer')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'leaving editable B restores focused editable A')
  assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), sourceId, 'source A retains native DOM focus after peer preview clears')
  assert.equal(await headerSteppers(), 1, 'restored editable A regains its spinner')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')?.getAttribute("data-selected-value-source")'), sourceId, 'restored Header writer still belongs to A')
  await clickInput('Selected value')
  const focusedHeaderPeerPoint = await numberPoint('Foundation editable peer')
  await movePointer(focusedHeaderPeerPoint)
  await delay(400)
  assert.equal(await headerText(), '76.54321099', 'editable B also previews read-only while Header A owns DOM focus')
  assert.equal(await headerSteppers(), 0, 'Header A editor unmounts while B is the visible read-only preview')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'Header A writer is not exposed as B\'s editor')
  assert.equal(await model('decimal-peer'), '76.543210987', 'Header-focus preview does not mutate editable B')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'clearing B preview restores the Header value for A')
  assert.equal(await headerSteppers(), 1, 'clearing B preview restores Header editability for A')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')?.getAttribute("data-selected-value-source")'), sourceId, 'clearing B preview restores A as the Header writer')
  await insertValue('Selected value', '33.222333444')
  assert.equal(await inputValue('Selected value'), '33.222333444', 'restored Header remains editable for focused A')
  assert.equal(await model('decimal'), '33.222333444', 'Header edit after preview writes to anchored source A')
  assert.equal(await model('decimal-peer'), '76.543210987', 'Header edit after preview cannot write to source B')
  await buttonByText('Reset decimal')
  await clickInput('Foundation decimal')
  await clickInput('Selected value')
  await movePointer(hoverPoint)
  await delay(400)
  assert.equal(await headerText(), '12.34567891', 'read-only source B temporarily previews over focused editable source A')
  assert.equal(await headerSteppers(), 0, 'read-only preview does not inherit the focused editable source spinner')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'read-only preview remains a non-owning display')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '12.34567891', 'leaving read-only source B restores editable source A')
  assert.equal(await headerSteppers(), 1, 'editable source A spinner returns after preview')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')?.getAttribute("data-selected-value-source")'), sourceId, 'read-only preview never replaces source A writer identity')
  await clickInput('Foundation decimal')
  assert.equal(await evaluate('document.activeElement.getAttribute("data-selected-value-source")'), sourceId, 'Header → source transfer keeps the same source identity')
  await movePointer(outsideNumberPoint)
  await clickButton('([...document.querySelectorAll("button")].find(button => button.innerText.trim() === "Blur focused source"))')
  assert.equal(await headerText(), '0.00456789', 'leaving source and Header reveals the pinned fallback')
  assert.equal(await headerSteppers(), 0, 'pinned fallback is read-only')
  assert.equal(await model('decimal'), sourceValueBeforeFocus, 'blurring the focused editor leaves the full authoritative value unchanged')
  await buttonByText('Clear selected value')
  await clickInput('Foundation read-only focus')
  assert.equal(await headerText(), '43.12345679', 'existing-focus read-only source publishes its capped Header value')
  assert.equal(await evaluate('document.querySelector(\'header input[aria-label="Selected value"]\')'), null, 'read-only focus source does not create an editable Header')
  assert.equal(await headerSteppers(), 0, 'read-only focus source has no Header spinner')
  assert.equal(await evaluate('document.activeElement.closest("[data-selected-number]")'), null, 'existing-focus read-only source needs no SelectedNumber wrapper')
  const readOnlyPeerPoint = await numberPoint('Foundation read-only peer')
  await movePointer(readOnlyPeerPoint)
  await delay(400)
  assert.equal(await headerText(), '65.43210988', 'focused read-only source A yields temporary Header preview to read-only source B')
  assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), 'focused-readonly-source', 'read-only preview keeps A focused underneath')
  assert.equal(await headerSteppers(), 0, 'read-only preview over a read-only anchor has no spinner')
  await movePointer(outsideNumberPoint)
  await delay(100)
  assert.equal(await headerText(), '43.12345679', 'leaving read-only B restores focused read-only A')
  assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), 'focused-readonly-source', 'read-only A retains native focus after hover ends')
  await buttonByText('Blur focused source')
  assert.equal(await headerText(), '—', 'blur clears the focus-owned read-only Header value')
  await clickButton(byAria('Select precise result'))
  assert.equal(await headerText(), '12.34567891')
  await buttonByText('Toggle read-only values')
  assert.equal(await headerText(), '—', 'unmounting a pinned read-only source clears it')
  await buttonByText('Toggle read-only values')
  await clickButton(byAria('Select precise result'))
  await clickButton('([...document.querySelectorAll("button")].find(button => button.innerText.trim() === "Cost Breakdown"))')
  assert.equal(await headerText(), '—', 'changing page scope clears a pinned source')
  await clickButton('([...document.querySelectorAll("button")].find(button => button.innerText.trim() === "Master Data"))')

  await clickInput('Foundation decimal')
  assert.equal(await evaluate('document.querySelectorAll("main [data-numeric-stepper]").length'), 0, 'ordinary focused inputs never have visible inline spinners')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).cursor'), 'text', 'editable fields retain their text cursor')
  assert.equal(await typeInto('Foundation decimal', '12.3456789'), '12.3456789')
  assert.equal(await model('decimal'), '12.3456789', 'body editor writes the complete decimal value before blur')
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
  await buttonByText('Clear selected value')
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
  assert.equal(await inputValue('Foundation positive'), '3.00E-5', 'tiny nonzero values never look like zero')
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
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}
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
    const output=value.querySelector('[data-selected-value-output]'),outputStyle=output?getComputedStyle(output):null
    return {header:rect(header),value:rect(value),utilities:[...header.querySelectorAll('button[aria-label="Undo"],button[aria-label="Redo"],#header-prepare-dataset-trigger')].map(rect),overflow:document.documentElement.scrollWidth>innerWidth,whiteSpace:getComputedStyle(value).whiteSpace,brandTextContained:visibleBrandRight<=rect(value).x+0.5,output:output?{scrollWidth:output.scrollWidth,clientWidth:output.clientWidth,overflowX:outputStyle.overflowX,text:output.textContent.trim()}:null}
  })()`)
  const geometryResults = []
  const stableZoneGeometry = zones => ({
    value: zones.value,
    zone: zones.zone,
    numericAxisRight: zones.numericAxisRight,
    percent: zones.percent,
    spinner: zones.spinner
  })
  for (const width of [1440, 1024, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    await buttonByText('Clear selected value')
    await delay(120)
    const initial = await headerGeometry()
    const emptyZones = await headerZoneGeometry()
    assert.ok(emptyZones, `Header reserves all three zones with no selection at ${width}px`)
    assert.equal(emptyZones.input, false, `empty Header is a read-only display at ${width}px`)
    assert.equal(emptyZones.spinnerVisibility, 'hidden', `empty Header spinner slot is non-interactive at ${width}px`)
    await clickButton(byAria('Select typical Header value'))
    const typical = await headerGeometry()
    const readOnlyZones = await headerZoneGeometry()
    assert.equal(await headerText(), '-123.12345678', `typical negative Header value uses the capped presentation at ${width}px`)
    assert.deepEqual(typical.utilities, initial.utilities, `typical Header precision does not move utilities at ${width}px`)
    assert.equal(typical.header.height, initial.header.height, `typical Header precision keeps Header height at ${width}px`)
    assert.equal(typical.overflow, false, `typical Header precision does not create page overflow at ${width}px`)
    assert.equal(typical.brandTextContained, true, `brand text remains separated from typical Header precision at ${width}px`)
    assert.ok(typical.value.width > 0 && typical.value.right <= typical.utilities[0].x + 0.5, `typical Header value remains bounded before utilities at ${width}px`)
    assert.equal(typical.output?.overflowX, 'auto', `long formatted text is safely scrollable within Header at ${width}px`)
    assert.equal(typical.output?.text, '-123.12345678')
    assert.deepEqual(stableZoneGeometry(readOnlyZones), stableZoneGeometry(emptyZones), `read-only numeric Header keeps numeric/%/spinner slots fixed at ${width}px`)
    assert.equal(readOnlyZones.overflow, false, `read-only numeric Header does not overflow the page at ${width}px`)
    if (width >= 768) assert.ok(typical.output.clientWidth >= typical.output.scrollWidth, `typical 8-decimal Header value fits without horizontal scrolling at ${width}px`)
    for (const utility of typical.utilities) assert.ok(utility.x >= 0 && utility.x + utility.width <= width + 1, `utility controls remain inside viewport with typical Header value at ${width}px`)
    await clickButton(byAria('Select percentage noise'))
    const percentageZones = await headerZoneGeometry()
    assert.equal(percentageZones.percentText, '%', `read-only percentage uses its reserved percent slot at ${width}px`)
    assert.deepEqual(stableZoneGeometry(percentageZones), stableZoneGeometry(emptyZones), `percentage source keeps numeric axis and spinner fixed at ${width}px`)
    assert.equal(percentageZones.overflow, false, `read-only percentage does not overflow the page at ${width}px`)

    await clickInput('Foundation decimal')
    await movePointer({ x: width - 2, y: 998 })
    const editableIdleZones = await headerZoneGeometry()
    assert.equal(editableIdleZones.input, true, `editable anchor keeps a Header editor at ${width}px`)
    assert.equal(editableIdleZones.inputBorderColor, 'rgba(0, 0, 0, 0)', `editable Header is calm away from direct Header hover at ${width}px`)
    assert.equal(editableIdleZones.spinnerVisibility, 'hidden', `editable Header reserves but hides its idle spinner at ${width}px`)
    assert.deepEqual(stableZoneGeometry(editableIdleZones), stableZoneGeometry(emptyZones), `editable Header keeps numeric/%/spinner slots fixed at ${width}px`)
    assert.equal(editableIdleZones.overflow, false, `editable Header does not overflow the page at ${width}px`)

    const headerInputPoint = await evaluate(`(()=>{const r=document.querySelector('header [data-header-value] input[aria-label="Selected value"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    await movePointer(headerInputPoint)
    await delay(60)
    const editableHoverZones = await headerZoneGeometry()
    assert.notEqual(editableHoverZones.inputBorderColor, 'rgba(0, 0, 0, 0)', `direct Header hover reveals an editable frame at ${width}px`)
    assert.equal(editableHoverZones.spinnerVisibility, 'visible', `direct Header hover reveals its reserved spinner at ${width}px`)
    assert.deepEqual(stableZoneGeometry(editableHoverZones), stableZoneGeometry(emptyZones), `direct Header hover does not move its reserved zones at ${width}px`)
    await clickInput('Selected value')
    assert.equal(await evaluate('document.activeElement?.getAttribute("aria-label")'), 'Selected value', `Header value receives direct pointer focus at ${width}px`)
    await delay(200)
    const editableFocusedZones = await headerZoneGeometry()
    assert.equal(editableFocusedZones.inputFocused, true, `Header editor receives actual focus at ${width}px`)
    assert.notEqual(editableFocusedZones.inputBorderColor, 'rgba(0, 0, 0, 0)', `focused Header editor has a clear border at ${width}px`)
    assert.notEqual(editableFocusedZones.inputBoxShadow, 'none', `focused Header editor has a visible focus ring at ${width}px`)
    assert.equal(editableFocusedZones.spinnerVisibility, 'visible', `focused Header editor keeps its spinner visible at ${width}px`)
    assert.deepEqual(stableZoneGeometry(editableFocusedZones), stableZoneGeometry(emptyZones), `Header focus treatment does not move its reserved zones at ${width}px`)
    await evaluate('document.activeElement.blur()')

    await clickInput('Foundation percentage')
    await movePointer({ x: width - 2, y: 998 })
    const editablePercentZones = await headerZoneGeometry()
    assert.equal(editablePercentZones.percentText, '%', `editable percentage uses the reserved percent slot at ${width}px`)
    assert.equal(editablePercentZones.spinnerVisibility, 'hidden', `editable percentage keeps its idle spinner hidden at ${width}px`)
    assert.deepEqual(stableZoneGeometry(editablePercentZones), stableZoneGeometry(emptyZones), `editable percentage keeps the numeric axis and spinner fixed at ${width}px`)
    assert.equal(editablePercentZones.overflow, false, `editable percentage does not overflow the page at ${width}px`)

    await clickInput('Foundation decimal')
    await movePointer({ x: width - 2, y: 998 })
    const editableAnchorZones = await headerZoneGeometry()
    const editableAnchorId = await evaluate('document.activeElement?.getAttribute("data-selected-value-source")')
    const peerPoint = await numberPoint('Foundation editable peer')
    await movePointer(peerPoint)
    await delay(100)
    assert.equal(await headerText(), '12.34567891', `fast body hover leaves editable A displayed at ${width}px`)
    const fastPassZones = await headerZoneGeometry()
    assert.equal(fastPassZones.input, true, `fast body hover does not flash Header into read-only at ${width}px`)
    assert.equal(fastPassZones.inputBorderColor, 'rgba(0, 0, 0, 0)', `body hover does not reveal an idle Header frame at ${width}px`)
    assert.deepEqual(stableZoneGeometry(fastPassZones), stableZoneGeometry(editableAnchorZones), `fast body hover does not move Header geometry at ${width}px`)
    await delay(300)
    const previewZones = await headerZoneGeometry()
    assert.equal(await headerText(), '76.54321099', `editable B previews read-only after dwell at ${width}px`)
    assert.equal(previewZones.input, false, `read-only Preview exposes no Header writer at ${width}px`)
    assert.equal(previewZones.spinnerVisibility, 'hidden', `read-only Preview keeps its reserved spinner hidden at ${width}px`)
    assert.equal(await evaluate('document.activeElement?.getAttribute("data-selected-value-source")'), editableAnchorId, `editable A remains the actual focus owner during Preview at ${width}px`)
    assert.deepEqual(stableZoneGeometry(previewZones), stableZoneGeometry(emptyZones), `Preview over editable A preserves all Header slots at ${width}px`)
    assert.equal(previewZones.overflow, false, `read-only Preview does not overflow the page at ${width}px`)
    await movePointer({ x: width - 2, y: 998 })
    await delay(80)
    const restoredEditableZones = await headerZoneGeometry()
    assert.equal(await headerText(), '12.34567891', `leaving Preview restores editable A at ${width}px`)
    assert.deepEqual(stableZoneGeometry(restoredEditableZones), stableZoneGeometry(emptyZones), `restored editable anchor keeps all Header slots fixed at ${width}px`)

    await buttonByText('Clear selected value')
    await delay(120)
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
    geometryResults.push({ width, headerHeight: editable.header.height, valueWidth: editable.value.width, numericAxisRight: emptyZones.numericAxisRight, percentSlot: emptyZones.percent, spinnerSlot: emptyZones.spinner, typicalText: typical.output?.text, typicalOutputWidth: typical.output?.clientWidth, typicalTextScrollWidth: typical.output?.scrollWidth, stableUtilities: true })
  }
  assert.deepEqual(browserErrors, [], 'actual app and shared fixture produce no browser exceptions, errors, or warnings')
  results.sharedFoundation = {
    formattingAndSelection: 'PASS',
    selectedNumberVisual: {
      idleBackground: idleNumber.background,
      hoverBackground: hoveredNumber.background,
      hoverHasPointerFrame: hoveredNumber.boxShadow !== idleNumber.boxShadow,
      keyboardFocusBackground: keyboardFocusedNumber.background,
      keyboardFocusFrameChanged: keyboardFocusedNumber.boxShadow !== idleNumber.boxShadow,
      pinnedBackground: selectedNumber.background,
      pinBackgroundStrongerThanHover: selectedNumber.background !== hoveredNumber.background,
      contentHuggingWidth: hoveredNumber.treatmentWidth
    },
    editingAndStepping: 'PASS',
    preciseKeyboardSpinnerWheelDrafts: 'PASS',
    clipboardPaste: 'PASS',
    sourceLifecycle: 'PASS',
    geometry: geometryResults,
    screenshots: artifacts
  }
  console.log(JSON.stringify({ result: 'PASS', browser: 'isolated Chrome', viewport: '1440x1800', value: '12.3456789', results }, null, 2))
  console.log(`Numeric browser assertions: ${assertionCount}/${assertionCount} PASS`)
} finally {
  client?.close()
  await stopChild(chrome)
  chrome.stderr.destroy()
  await stopChild(vite)
  vite?.stdout.destroy()
  vite?.stderr.destroy()
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
