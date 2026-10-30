import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

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
const nativeOnly = process.argv.includes('--native-only')
const vitePort = configuredBaseUrl ? null : await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-disclosure-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-disclosure-evidence-'))
// Pre-optimize the lazy import parser so opening Import cannot reload the test page.
const vite = configuredBaseUrl ? null : spawn(process.execPath, ['--input-type=module', '-e', `
  import {createServer} from 'vite';
  const server=await createServer({server:{host:'127.0.0.1',port:${vitePort},strictPort:true},optimizeDeps:{include:['xlsx']}});
  await server.listen();server.printUrls();
`], {cwd:repository,stdio:['ignore','pipe','pipe']})
const viteOutput = []
for (const stream of [vite?.stdout, vite?.stderr]) stream?.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1800', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
let client
const browserErrors = []

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
  const visibleExpression = selector => `(()=>[...document.querySelectorAll(${JSON.stringify(selector)})].find(element => {
    const rect = element.getBoundingClientRect()
    return element.getClientRects().length > 0 && rect.width > 0 && rect.height > 0
  }))()`
  const existsVisible = selector => evaluate(`Boolean(${visibleExpression(selector)})`)
  const clickSelector = async selector => {
    const point = await evaluate(`(()=>{const element=${visibleExpression(selector)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,w:rect.width,h:rect.height}})()`)
    if (!point || point.w <= 0 || point.h <= 0) throw new Error(`Visible browser target not found: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(120)
  }
  const hoverSelector = async selector => {
    const point = await evaluate(`(()=>{const element=${visibleExpression(selector)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2,w:rect.width,h:rect.height}})()`)
    if (!point || point.w <= 0 || point.h <= 0) throw new Error(`Visible browser target not found: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await delay(180)
  }
  const clickTextButton = async label => {
    const point = await evaluate(`(()=>{const element=[...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.innerText.trim() === ${JSON.stringify(label)});if(!element)return null;element.scrollIntoView({block:'center',inline:'nearest'});const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Button not found by visible text: ${label}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(180)
  }
  const clickPoint = async point => {
    if (!point) throw new Error('Blank workspace point was not found')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(120)
  }
  const inputValue = selector => evaluate(`(${visibleExpression(selector)})?.value ?? null`)
  const isPinned = selector => evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-pressed') === 'true'`)
  const ensurePinned = async selector => {
    if (!await isPinned(selector)) await clickSelector(selector)
    return isPinned(selector)
  }
  const rowExpanded = selector => evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-expanded') ?? null`)
  const blankNameCellPoint = selector => evaluate(`(()=>{const row=${visibleExpression(selector)};const cell=row?.querySelector('th[scope="row"]');if(!row||!cell)return null;const rect=cell.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(cell);const textRects=[...range.getClientRects()];const x=rect.right-6,y=rect.top+rect.height/2,hit=document.elementFromPoint(x,y),insideText=textRects.some(text=>x>=text.left&&x<=text.right&&y>=text.top&&y<=text.bottom);return{x,y,blank:!insideText&&hit===cell&&!hit.closest('button,input,select,textarea,a,[role="button"]'),hitTag:hit?.tagName??null,cellWidth:rect.width,textRects:textRects.map(text=>({left:text.left,right:text.right,top:text.top,bottom:text.bottom})),rowRight:rect.right}})()`)
  const nameCellTextPoint = selector => evaluate(`(()=>{const row=${visibleExpression(selector)};const cell=row?.querySelector('th[scope="row"]');if(!row||!cell)return null;const range=document.createRange();range.selectNodeContents(cell);const rect=[...range.getClientRects()].find(item=>item.width>0&&item.height>0);if(!rect)return null;const x=rect.left+rect.width/2,y=rect.top+rect.height/2,hit=document.elementFromPoint(x,y);return{x,y,text:hit===cell&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom,hitTag:hit?.tagName??null}})()`)
  const blankMobileRowPoint = selector => evaluate(`(()=>{const row=${visibleExpression(selector)};if(!row)return null;const rect=row.getBoundingClientRect(),x=rect.right-3,y=rect.top+5,hit=document.elementFromPoint(x,y);return{x,y,blank:hit===row&&!hit.closest('button,input,select,textarea,a,[role="button"]'),hitTag:hit?.tagName??null,rowRight:rect.right,topPaddingPoint:y-rect.top}})()`)
  const blankPointIn = selector => evaluate(`(()=>{
    const root=${visibleExpression(selector)};
    if(!root)return null;
    root.scrollIntoView({block:'center',inline:'nearest'});
    const surface=root.matches('tr[data-simulation-row-detail="true"]')
      ? root.querySelector('td[aria-hidden="true"]:last-child') ?? root
      : root;
    const rect=surface.getBoundingClientRect();
    const inset=.5;
    const candidates=[
      [rect.left+inset,rect.top+inset],[rect.right-inset,rect.top+inset],
      [rect.left+inset,rect.bottom-inset],[rect.right-inset,rect.bottom-inset],
      [rect.left+inset,rect.top+rect.height/2],[rect.right-inset,rect.top+rect.height/2],
      [rect.left+rect.width/2,rect.top+inset],[rect.left+rect.width/2,rect.bottom-inset]
    ];
    const textRects=[];
    const walker=document.createTreeWalker(surface,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(!node.textContent?.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      textRects.push(...range.getClientRects());
    }
    const interactive='button,input,select,textarea,label,summary,a[href],[role],[aria-expanded],[aria-haspopup],[tabindex]:not([tabindex="-1"]),[data-selected-number],[data-grid-cell="true"],[data-safe-workspace-interaction="true"],[contenteditable="true"],[draggable="true"]';
    for(const [x,y] of candidates){
      if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
      const hit=document.elementFromPoint(x,y);
      const action=hit?.closest(interactive);
      if(!hit||!(hit===surface||surface.contains(hit))||(action&&(action===root||root.contains(action))))continue;
      if(textRects.some(text=>x>=text.left&&x<=text.right&&y>=text.top&&y<=text.bottom))continue;
      return{x,y,blank:true,hitTag:hit.tagName,hitClass:typeof hit.className==='string'?hit.className:null,root:root.tagName,rootRect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}};
    }
    return{blank:false,root:root.tagName,rootRect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},textRectCount:textRects.length};
  })()`)
  const outerWorkspaceBlankPoint = () => evaluate(`(()=>{
    const main=document.querySelector('main');
    const layout=main?.querySelector('[data-simulation-layout-root]');
    if(!main)return null;
    main.scrollTop=0;
    const rect=main.getBoundingClientRect();
    const candidates=[[rect.left+8,rect.top+rect.height/2],[rect.right-8,rect.top+rect.height/2],[rect.left+8,rect.top+8],[rect.right-8,rect.top+8]];
    const interactive='button,input,select,textarea,label,summary,a[href],[role],[aria-expanded],[aria-haspopup],[tabindex]:not([tabindex="-1"]),[data-selected-number],[data-grid-cell="true"],[data-safe-workspace-interaction="true"],[contenteditable="true"],[draggable="true"]';
    for(const [x,y] of candidates){
      if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
      const hit=document.elementFromPoint(x,y);
      if(!hit||!(hit===main||main.contains(hit))||(layout&&(hit===layout||layout.contains(hit)))||hit.closest(interactive))continue;
      return{x,y,blank:true,hitTag:hit.tagName,mainRect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},outsideSimulationLayout:true};
    }
    return{blank:false,mainRect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},layoutRect:layout?(()=>{const r=layout.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})():null,candidates:candidates.map(([x,y])=>{const hit=document.elementFromPoint(x,y);return{x,y,hitTag:hit?.tagName??null,hitClass:typeof hit?.className==='string'?hit.className:null,withinMain:Boolean(hit&&(hit===main||main.contains(hit))),insideSimulationLayout:Boolean(hit&&layout&&(hit===layout||layout.contains(hit))),interactive:Boolean(hit?.closest(interactive))}})};
  })()`)
  const resultGraphGapPoint = () => evaluate(`(()=>{
    const result=document.querySelector('section[aria-labelledby="simulation-result-title"]');
    const graph=document.querySelector('figure[aria-labelledby="break-even-graph-title"]');
    if(!result||!graph)return null;
    const a=result.getBoundingClientRect(),b=graph.getBoundingClientRect();
    const left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),x=(left+right)/2,y=(a.bottom+b.top)/2,gap=b.top-a.bottom,hit=document.elementFromPoint(x,y);
    return{x,y,gap,blank:gap>0&&right>left&&x>=a.left&&x<=a.right&&x>=b.left&&x<=b.right&&!result.contains(hit)&&!graph.contains(hit)&&Boolean(hit)&&!hit.closest('button,input,select,textarea,label,summary,a[href],[role],[aria-expanded],[aria-haspopup],[tabindex]:not([tabindex="-1"]),[data-selected-number],[data-grid-cell="true"]'),hitTag:hit?.tagName??null};
  })()`)
  const dragPoint = async (point, deltaX) => {
    if (!point) throw new Error('Graph drag point was not found')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + deltaX, y: point.y, button: 'left', buttons: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + deltaX, y: point.y, button: 'left', clickCount: 1 })
    await delay(160)
  }
  const replaceInput = async (selector, text, modifiers = 4) => {
    await clickSelector(selector)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.insertText', { text })
    await delay(150)
    return inputValue(selector)
  }
  const pressRowKey = async (key,code,virtualKey) => {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey})
    await delay(150)
  }
  const checks = []
  const check = (condition, message, detail) => {
    checks.push({ passed: Boolean(condition), message, detail })
    console.log(`${condition ? 'PASS' : 'FAIL'} ${message}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`)
  }
  const setViewport = async width => {
    await send('Emulation.setDeviceMetricsOverride', {width,height:1800,deviceScaleFactor:1,mobile:false})
    await delay(180)
  }
  const row = (kind, mobile) => `section[data-simulation-table="${kind}"] ${mobile ? 'article' : 'tbody tr'}[data-simulation-row-index][aria-label*="${kind==='bom'?'MAT-A':'OP-10'};"]`
  const reveal = selector => evaluate(`(()=>{const e=${visibleExpression(selector)};e?.scrollIntoView({block:'center',inline:'nearest'});return !!e})()`)
  const toggle = async (selector, mobile) => {
    await reveal(selector)
    await clickPoint(mobile ? await blankMobileRowPoint(selector) : await nameCellTextPoint(selector))
  }
  const disclosure = selector => evaluate(`(()=>{const e=${visibleExpression(selector)},id=e?.getAttribute('aria-controls');return{expanded:e?.getAttribute('aria-expanded'),detail:!!(id&&document.getElementById(id)?.getClientRects().length),detailId:id}})()`)
  const expectOpen = async (selector, label) => {
    const s = await disclosure(selector)
    check(s.expanded === 'true' && s.detail, `${label}: actual disclosure is expanded and detail rendered`, s)
  }
  const expectClosed = async (selector, detailId, label) => {
    const s = await disclosure(selector)
    const oldDetailGone = await evaluate(`!document.getElementById(${JSON.stringify(detailId)})`)
    check(s.expanded === 'false' && !s.detail && oldDetailGone, `${label}: aria-expanded is false and detail is gone`, {s,oldDetailGone})
  }
  const open = async (selector, mobile, label) => {
    if (await rowExpanded(selector) !== 'true') await toggle(selector,mobile)
    await expectOpen(selector,label)
    return (await disclosure(selector)).detailId
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await setViewport(1440)
  await waitFor(()=>existsVisible('#header-prepare-dataset-trigger'),'application')
  await clickSelector('#header-prepare-dataset-trigger')
  await clickTextButton('Complete Mock')
  await clickTextButton('Simulation')
  await waitFor(()=>existsVisible('section[data-simulation-table="bom"]'),'Simulation')
  await clickTextButton('Current')
  await waitFor(()=>existsVisible('section[data-simulation-table="bom"] input[aria-label$="Price in Current"]'),'Current sources')
  const passive = [
    ['section[aria-labelledby="simulation-result-title"]','Result'],
    ['[data-simulation-layout-column="inputs"]','Business/Economic'],
    ['figure[aria-labelledby="break-even-graph-title"]','Break-even passive area'],
    ['section[data-simulation-table="bom"]','BOM container'],
    ['section[data-simulation-table="routing"]','Routing container']
  ]
  if(!nativeOnly){
  for (const mobile of [false,true]) {
    await setViewport(mobile?390:1440)
    for (const kind of ['bom','routing']) {
      const source = row(kind,mobile), label = `${mobile?'mobile':'desktop'} ${kind}`
      for (const [surface,name] of passive) {
        const id = await open(source,mobile,`${label} before ${name}`)
        const point = await blankPointIn(surface)
        check(Boolean(point?.blank),`${label} ${name} target has no action`,point)
        await clickPoint(point)
        await expectClosed(source,id,`${label} passive ${name}`)
        if(process.argv.includes('--reproduce-only')) {
          assert.ok(checks.every(c=>c.passed),'Actual disclosure passive-dismissal reproduction failed')
        }
      }
      for (const [getPoint,name] of [[outerWorkspaceBlankPoint,'page edge'],[resultGraphGapPoint,'panel gap']]) {
        const id = await open(source,mobile,`${label} before ${name}`)
        if(name==='panel gap') await reveal('section[aria-labelledby="simulation-result-title"]')
        const point = await getPoint()
        check(Boolean(point?.blank),`${label} ${name} is passive rendered whitespace`,point)
        await clickPoint(point)
        await expectClosed(source,id,`${label} passive ${name}`)
      }
      const id = await open(source,mobile,`${label} before detail whitespace`)
      const detail = `#${CSSescapeForSelector(id)}`
      const point = await blankPointIn(detail)
      check(Boolean(point?.blank),`${label} expanded detail target is passive whitespace`,point)
      await clickPoint(point)
      await expectClosed(source,id,`${label} passive expanded detail`)
      const escapeId = await open(source,mobile,`${label} before Escape`)
      await pressRowKey('Escape','Escape',27)
      await expectClosed(source,escapeId,`${label} Escape`)
      await open(source,mobile,`${label} row click`)
      await toggle(source,mobile)
      check(await rowExpanded(source)==='false',`${label} row click toggles closed`)
      await reveal(source)
      await evaluate(`(${visibleExpression(source)}).focus()`)
      await pressRowKey('Enter','Enter',13)
      await expectOpen(source,`${label} Enter toggles open`)
      await pressRowKey(' ','Space',32)
      check(await rowExpanded(source)==='false',`${label} Space toggles closed`)
    }
    const bom=row('bom',mobile),routing=row('routing',mobile)
    await open(bom,mobile,'multi-row BOM')
    await open(routing,mobile,'multi-row Routing')
    await expectOpen(bom,'opening Routing preserves separate BOM disclosure')
    await clickTextButton('Master Data')
    await clickTextButton('Simulation')
    await expectOpen(bom,`${mobile?'mobile':'desktop'} navigation retains BOM`)
    await expectOpen(routing,`${mobile?'mobile':'desktop'} navigation retains Routing`)
    await clickTextButton('Cost Breakdown')
    await clickTextButton('Simulation')
    await expectOpen(bom,`${mobile?'mobile':'desktop'} CBD navigation retains BOM`)
    await expectOpen(routing,`${mobile?'mobile':'desktop'} CBD navigation retains Routing`)
    const sourceNumber = `${bom} button[data-selected-number]`
    await reveal(sourceNumber)
    await clickSelector(sourceNumber)
    check(await isPinned(sourceNumber),'SelectedNumber action pins without being stolen')
    await expectOpen(bom,'SelectedNumber action preserves disclosure')
    const result='button[data-selected-number][aria-label="Material After"]'
    await reveal(result)
    await hoverSelector(result)
    check(await isPinned(sourceNumber),'Hover Preview preserves the existing source Pin')
    check(await evaluate(`Boolean(document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim())&&document.querySelector('header [data-header-value] [data-selected-value-output]').textContent.trim()!=='—'`),'hover publishes a Header Preview')
    await expectOpen(bom,'Hover Preview preserves disclosure')
    const numeric = `section[data-simulation-table="bom"] input[aria-label$="Price in Current"]`
    await reveal(numeric)
    await replaceInput(numeric,'13.123456789123456789')
    check(await inputValue(numeric)==='13.123456789123456789','NumericInput remains editable with authoritative exact text')
    await expectOpen(bom,'nested NumericInput never toggles disclosure')
    const inputEscapeId=(await disclosure(bom)).detailId
    const routingInputEscapeId=(await disclosure(routing)).detailId
    await pressRowKey('Escape','Escape',27)
    await expectClosed(bom,inputEscapeId,'first Escape from active numeric source collapses BOM disclosure')
    await expectClosed(routing,routingInputEscapeId,'first Escape from active numeric source collapses Routing disclosure')
    check(await evaluate(`document.activeElement!==${visibleExpression(numeric)}`),'Escape retains existing active-input blur behavior')
    await open(bom,mobile,'reopen after numeric Escape')
    const select = `${bom} button[aria-label^="Select BOM row"],${bom} button[aria-label^="Deselect BOM row"]`
    await reveal(select)
    const selectedBefore=await evaluate(`(${visibleExpression(select)}).getAttribute('aria-pressed')`)
    await clickSelector(select)
    check(await evaluate(`(${visibleExpression(select)}).getAttribute('aria-pressed')`)!==selectedBefore,'row # selection action works')
    await expectOpen(bom,'row # action preserves disclosure')
    const all = 'section[data-simulation-table="bom"] button[aria-label^="Select all eligible"],section[data-simulation-table="bom"] button[aria-label^="Clear eligible"]'
    if(!mobile){
      await reveal(all)
      await clickSelector(all)
      await expectOpen(bom,'Select All action preserves disclosure')
    }
    const search='section[data-simulation-table="bom"] input[aria-label^="Search BOM"]'
    await reveal(search)
    await clickSelector(search)
    await replaceInput(search,'MAT-A')
    check(await inputValue(search)==='MAT-A','Search owns typing and retains its query')
    await expectOpen(bom,'Search input focus/typing is an intentional action')
    await clickSelector('section[data-simulation-table="bom"] button[aria-label^="Clear Material search"]')
    check(await inputValue(search)==='','Search clear button performs its own action')
    await expectOpen(bom,'Search clear preserves disclosure')
    await clickTextButton('Current')
    await expectOpen(bom,'active-role selector button preserves disclosure')
    const labelPoint=await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Fixed Action Cost"]'),label=input?.closest('label');if(!label)return null;label.scrollIntoView({block:'center'});const walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent?.includes('Fixed Action Cost'))continue;const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,ownsInput:label.control===input,hitInput:hit===input}}return null})()`)
    check(Boolean(labelPoint?.ownsInput&&!labelPoint.hitInput),'Economic native label text owns its associated numeric input',labelPoint)
    await clickPoint(labelPoint)
    check(await evaluate(`document.activeElement?.getAttribute('aria-label')==='Fixed Action Cost'`),'native Economic label click focuses its numeric input')
    await expectOpen(bom,'Economic native label action preserves disclosure')
    await open(routing,mobile,'topmost popup Routing disclosure')
    const after='button[aria-label^="After dataset,"]'
    await reveal(after)
    await clickSelector(after)
    check(await evaluate('!!document.querySelector("[role=menu]")'),'dataset selector opens its own menu')
    await expectOpen(bom,'menu trigger preserves disclosure')
    await pressRowKey('Escape','Escape',27)
    check(await evaluate('!document.querySelector("[role=menu]")'),'first Escape dismisses the intentional topmost selector menu')
    await expectOpen(bom,'topmost menu Escape preserves underlying disclosure')
    await expectOpen(routing,'topmost menu Escape preserves Routing disclosure')
    const popupEscapeId=(await disclosure(bom)).detailId
    const popupRoutingId=(await disclosure(routing)).detailId
    await pressRowKey('Escape','Escape',27)
    await expectClosed(bom,popupEscapeId,'next Escape dismisses disclosure after topmost menu closes')
    await expectClosed(routing,popupRoutingId,'next Escape dismisses Routing after topmost menu closes')
  }
  await setViewport(1440)
  await replaceInput('input[aria-label="Batch Size"]','100')
  await evaluate('document.activeElement?.blur()')
  const bom=row('bom',false),routing=row('routing',false)
  await open(bom,false,'graph ownership BOM')
  await open(routing,false,'graph ownership Routing')
  const slider='figure[aria-labelledby="break-even-graph-title"] g[role="slider"][aria-label="Batch Size"]'
  await reveal(slider)
  const marker=await evaluate(`(()=>{const e=${visibleExpression(slider)},r=e.getBoundingClientRect(),svg=e.ownerSVGElement.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,deltaX:r.left<svg.right-32?24:-24}})()`)
  const before=await evaluate(`(${visibleExpression(slider)}).getAttribute('aria-valuenow')`)
  await dragPoint(marker,marker.deltaX)
  const dragged=await evaluate(`(${visibleExpression(slider)}).getAttribute('aria-valuenow')`)
  check(before!==dragged,'Break-even marker pointer drag owns its action')
  await expectOpen(bom,'graph pointer drag preserves BOM disclosure')
  await expectOpen(routing,'graph pointer drag preserves Routing disclosure')
  await pressRowKey('ArrowRight','ArrowRight',39)
  const keyed=await evaluate(`(${visibleExpression(slider)}).getAttribute('aria-valuenow')`)
  check(keyed!==dragged,'Break-even marker keyboard action changes its value')
  await expectOpen(bom,'graph keyboard preserves disclosure')
  }
  if(nativeOnly){
  const bom=row('bom',false)
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:650,deviceScaleFactor:1,mobile:false})
  await delay(180)
  await open(bom,false,'native scrollbar preservation')
  const scrollbar=await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="bom"]');const e=[...section.querySelectorAll('*')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+4);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e),gutter=e.offsetWidth-e.clientWidth-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth);return{x:r.right-parseFloat(s.borderRightWidth)-gutter/2,y:r.top+Math.min(12,e.clientHeight*e.clientHeight/e.scrollHeight/2),gutter,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}})()`)
  // Capture the painted scrollbar after resize/expansion before the native gesture.
  const nativeFrame=await send('Page.captureScreenshot',{format:'png'})
  await writeFile(join(evidenceDir,'native-scrollbar.png'),Buffer.from(nativeFrame.result.data,'base64'))
  console.log('Native scrollbar physical target:',JSON.stringify(scrollbar))
  if(scrollbar?.gutter>2){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:scrollbar.x,y:scrollbar.y})
    await delay(180)
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:scrollbar.x,y:scrollbar.y,button:'left',clickCount:1})
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:scrollbar.x,y:scrollbar.y+45,button:'left',buttons:1})
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:scrollbar.x,y:scrollbar.y+45,button:'left',clickCount:1})
    await delay(180)
    const afterScroll=await evaluate(`(()=>{const section=document.querySelector('section[data-simulation-table="bom"]');return [...section.querySelectorAll('*')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+4)?.scrollTop??null})()`)
    console.log('Native scrollbar scrollTop after gesture:',JSON.stringify(afterScroll))
    check(afterScroll!==null&&afterScroll!==scrollbar.scrollTop,'physical native scrollbar gesture changes actual scrollTop')
    await expectOpen(bom,'physical native scrollbar gutter drag preserves disclosure')
  }else console.log('[Unverified] Native scrollbar gutter unavailable in this browser/fixture',JSON.stringify(scrollbar))
  }else{
    // Native browser chrome needs an independent input session from prior graph gestures.
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--native-only'],{
      cwd:repository,env:{...process.env,COSTBREAKDOWN_BROWSER_BASE_URL:baseUrl},stdio:['ignore','pipe','pipe']
    })
    child.stdout.on('data',chunk=>process.stdout.write(chunk))
    child.stderr.on('data',chunk=>process.stderr.write(chunk))
    const exitCode=await new Promise((resolveExit,rejectExit)=>{child.once('error',rejectExit);child.once('exit',resolveExit)})
    check(exitCode===0,'fresh native-scrollbar browser subprocess passes its movement and disclosure assertions',{exitCode})
  }
  check(browserErrors.length===0,'no uncaught browser errors or warnings',browserErrors)
  const failures=checks.filter(c=>!c.passed)
  console.log(`Evidence directory: ${evidenceDir}`)
  console.log(`Simulation disclosure browser checks: ${checks.length-failures.length}/${checks.length} PASS; ${failures.length} FAIL`)
  if(failures.length)process.exitCode=1
} finally {
  client?.close()
  await Promise.all([stopChild(chrome),stopChild(vite)])
  await delay(150)
  await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200})
}
function CSSescapeForSelector(value){return value.replace(/([^a-zA-Z0-9_-])/g,'\\$1')}
