import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-blue-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-blue-evidence-'))
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
  const fixtureServer = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
  const workbookPath = join(evidenceDir, 'synthetic-direct-edit.xlsx')
  try {
    const { createCompleteMasterDataMockPair } = await fixtureServer.ssrLoadModule('/src/features/master-data/fixtures/synthetic-review-data.ts')
    const { exportSnapshotToExcel } = await fixtureServer.ssrLoadModule('/src/services/excel/snapshot-export.ts')
    const blob = await exportSnapshotToExcel(createCompleteMasterDataMockPair().current)
    await writeFile(workbookPath, Buffer.from(await blob.arrayBuffer()))
  } finally { await fixtureServer.close() }
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
    const point = await evaluate(`(()=>{const element=[...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.innerText.trim() === ${JSON.stringify(label)});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
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
  let count = 0
  const check = (condition, message, details) => {
    assert.ok(condition, `${message}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`)
    count++
    process.stdout.write(`PASS ${message}\n`)
  }
  const blue = 'rgb(29, 78, 216)'
  const state = selector => evaluate(`(()=>{const e=${visibleExpression(selector)};return e?{value:e.value??e.textContent.trim(),color:getComputedStyle(e).color,pending:e.dataset.directEditPending??null,background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,rect:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}:null})()`)
  const expectBlue = async (selector, label) => { await delay(250); const s = await state(selector); check(s?.color === blue, label, s) }
  const expectNormal = async (selector, label) => { await delay(250); const s = await state(selector); check(!!s && s.color !== blue, label, s) }
  const expectDerivedNormal = async label => {
    await delay(250)
    const derived = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] [data-selected-number], [data-economic-outcome-value] [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute('aria-label'),color:getComputedStyle(e).color,pending:e.getAttribute('data-direct-edit-pending')})))()`)
    check(derived.length > 0 && derived.every(e => e.color !== blue && e.pending !== 'true'), label, derived)
  }
  const blur = async () => { await evaluate('document.activeElement?.blur()'); await delay(180) }
  const setViewport = async width => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1800, deviceScaleFactor: 1, mobile: false })
    await delay(160)
  }
  const verifyNavigationGeometry = async label => {
    const geometry = await evaluate(`(()=>{const nav=document.querySelector('header nav[aria-label="Main navigation"]');if(!nav)return null;return [...nav.querySelectorAll(':scope > button')].map(button=>{const rect=button.getBoundingClientRect();const underline=button.querySelector(':scope > span[aria-hidden="true"]');const underlineRect=underline?.getBoundingClientRect();return {label:button.innerText.trim(),width:rect.width,left:rect.left,center:rect.left+rect.width/2,active:button.getAttribute('aria-current')==='page',underline:underlineRect?{width:underlineRect.width,center:underlineRect.left+underlineRect.width/2}:null}})})()`)
    check(geometry?.length === 3, `${label}: all three navigation tabs are rendered`, geometry)
    const widths = geometry.map(item => item.width)
    check(Math.max(...widths) - Math.min(...widths) <= 1.25, `${label}: navigation tabs have equal rendered widths within 1.25px`, geometry)
    const active = geometry.find(item => item.active)
    check(Boolean(active?.underline) && Math.abs(active.underline.center - active.center) <= 1.25, `${label}: active underline is centered under its tab within 1.25px`, active)
  }
  const toolbar = 'section[aria-label="Working dataset controls"]'
  const field = (section, name) => `section[aria-label="${section} rows"] tbody tr:first-child input[data-grid-field="${name}"]`
  const price = field('Bill of Materials', 'price')
  const usage = field('Bill of Materials', 'consumption')
  const role = name => `${toolbar} [role="group"][aria-label="Master Data workspace"] button[aria-label^="${name} —"]`
  const save = () => clickSelector(`${toolbar} button[aria-label="Save"]`)
  const header = 'header [data-header-value] input[aria-label="Selected value"]'
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(() => existsVisible('#header-prepare-dataset-trigger'), 'app')
  await clickSelector('#header-prepare-dataset-trigger')
  await clickTextButton('Complete Mock')
  await clickTextButton('Master Data')
  await waitFor(() => existsVisible(toolbar), 'Master Data workspace')
  await verifyNavigationGeometry('1440px viewport')
  await setViewport(390)
  await verifyNavigationGeometry('390px viewport')
  await setViewport(1440)
  await clickSelector(role('Current'))
  if (await evaluate(`document.querySelector('${toolbar} button[role="switch"]')?.getAttribute('aria-checked')==='false'`)) await clickSelector(`${toolbar} button[role="switch"]`)
  await clickSelector('[role="group"][aria-label="Master Data table section"] button:last-child')
  await waitFor(() => existsVisible(price), 'BOM source')
  await save()
  await expectNormal(price, 'system mock data starts normal')
  const exact = '12.00000000000000001'
  await clickSelector(price)
  await delay(250)
  const beforeEditGeometry = await state(price)
  await evaluate(`(${visibleExpression(price)}).select()`)
  await send('Input.insertText', {text: exact})
  await delay(180)
  await expectBlue(price, 'direct BOM Price edit turns entire source blue')
  const editedGeometry = await state(price)
  check(JSON.stringify(beforeEditGeometry.rect) === JSON.stringify(editedGeometry.rect) && beforeEditGeometry.background === editedGeometry.background && beforeEditGeometry.border === editedGeometry.border, 'indicator changes text color without field geometry/background/border changes', {beforeEditGeometry,editedGeometry})
  await clickSelector(header)
  check(await inputValue(header) === exact, 'Header writer retains exact authoritative input', await state(header))
  const headerState = await state(header)
  check(headerState?.color === 'rgb(147, 197, 253)', 'Header naturally reflects the pending selected source on its dark surface', headerState)
  await blur()
  await expectBlue(price, 'Master Data source stays blue after blur until dataset Save')
  await clickSelector('header button[aria-label="Undo"]')
  await expectNormal(price, 'Undo removes direct edit indication')
  await save()
  await clickSelector('header button[aria-label="Redo"]')
  await expectBlue(price, 'Redo after saving undone baseline restores the still-unsaved direct edit indication')
  await replaceInput(usage, '3.125')
  await blur()
  await expectBlue(price, 'first source remains blue after second direct edit')
  await expectBlue(usage, 'second directly edited source is blue')
  await expectNormal(field('Bill of Materials', 'loss'), 'untouched Loss remains normal')
  const labor = field('Work Centers', 'laborRate')
  const manning = field('Routing', 'manning')
  const selling = `${toolbar} input[aria-label="Selling Price (THB)"]`
  await replaceInput(labor, '123.25')
  await blur()
  await expectBlue(labor, 'direct Work Center labor rate is blue')
  await replaceInput(manning, '4.125')
  await blur()
  await expectBlue(manning, 'direct Routing Manning is blue')
  await replaceInput(selling, '310.00000000000000001')
  await blur()
  await expectBlue(selling, 'direct numeric metadata is blue')
  await save()
  await expectNormal(labor, 'owning Save clears Work Center indicator')
  await expectNormal(manning, 'owning Save clears Routing indicator')
  await expectNormal(selling, 'owning Save clears metadata indicator')
  await expectNormal(price, 'Save clears Price indication')
  await expectNormal(usage, 'Save clears Usage indication')
  await clickSelector('header button[aria-label="Undo"]')
  await expectNormal(price, 'Undo after Save cannot revive retired blue provenance')
  await clickSelector('header button[aria-label="Redo"]')
  await expectNormal(usage, 'Redo after Save cannot revive retired blue provenance')
  await clickSelector(price)
  check(await inputValue(price) === exact, 'Save/refocus preserves exact decimal lexeme')
  await replaceInput(price, '14')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Reset"]`)
  await expectNormal(price, 'Reset removes stale direct indication')
  await clickSelector(price)
  check(await inputValue(price) === exact, 'Reset restores exact saved value')
  await replaceInput(price, '15')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Clone from"]`)
  await clickTextButton('Reference')
  await expectNormal(price, 'Clone replacement is normal rather than direct edited')
  check(await evaluate('document.querySelectorAll("main [data-direct-edit-pending=true]").length') === 0, 'Clone clears source provenance for replaced dataset')

  // Generate a canonical workbook with the public exporter, then use the real file-input/import UI.
  await replaceInput(price, '16')
  await blur()
  await clickSelector(`${toolbar} button[aria-label="Import"]`)
  await waitFor(() => existsVisible('[role="dialog"]'), 'Import dialog')
  const doc = await send('DOM.getDocument')
  const fileInput = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '[role="dialog"] input[type="file"]' })
  await send('DOM.setFileInputFiles', { nodeId: fileInput.result.nodeId, files: [workbookPath] })
  await waitFor(() => existsVisible('[aria-label="Workbook import summary"]'), 'canonical workbook parsed')
  await clickTextButton('Import')
  await waitFor(() => evaluate('!document.querySelector("[role=dialog]")'), 'Import applied')
  await expectNormal(price, 'canonical Import replacement never becomes direct blue')
  check(await evaluate('document.querySelectorAll("main [data-direct-edit-pending=true]").length') === 0, 'Import clears pending provenance on all replaced sources')

  await clickTextButton('Simulation')
  await waitFor(() => existsVisible('section[data-simulation-table="bom"]'), 'Simulation')
  await clickTextButton('Current')
  const simPrice = 'section[data-simulation-table="bom"] input[aria-label$="Price in Current"]'
  const simUsage = 'section[data-simulation-table="bom"] input[aria-label$="Usage in Current"]'
  await waitFor(() => existsVisible(simPrice), 'Simulation Price')
  await waitFor(() => existsVisible(simUsage), 'Simulation Usage')
  const result = 'button[data-selected-number][aria-label="Material After"]'
  await expectNormal(simPrice, 'Simulation committed source initially normal')

  const simBomRow = 'section[data-simulation-table="bom"] tbody tr[data-simulation-row-index="0"]'
  const simRoutingRow = 'section[data-simulation-table="routing"] tbody tr[data-simulation-row-index="0"]'
  const bomCostNumber = `${simBomRow} td:nth-last-child(2) button[data-selected-number]`
  await waitFor(() => existsVisible(bomCostNumber), 'read-only SelectedNumber inside the BOM main row')
  await clickSelector(bomCostNumber)
  check(await isPinned(bomCostNumber), 'clicking a BOM-row SelectedNumber pins that source')
  check(await rowExpanded(simBomRow) === 'false', 'clicking a BOM-row SelectedNumber does not expand the row')
  await clickSelector(result)
  check(await isPinned(result) && !await isPinned(bomCostNumber), 'clicking another SelectedNumber moves the Pin')
  const bomText = await nameCellTextPoint(simBomRow)
  check(Boolean(bomText?.text), 'BOM row text test target is rendered text rather than whitespace', bomText)
  await clickPoint(bomText)
  check(await isPinned(result) && await rowExpanded(simBomRow) === 'true', 'clicking BOM row text expands without dismissing Pin')
  await clickPoint(await nameCellTextPoint(simBomRow))
  check(await isPinned(result) && await rowExpanded(simBomRow) === 'false', 'clicking BOM row text collapses without dismissing Pin')
  await clickSelector(result)
  check(!await isPinned(result), 'clicking the same SelectedNumber toggles its Pin off')
  await clickSelector(result)
  const bomRowNumber = `${simBomRow} td:first-child button`
  await waitFor(() => existsVisible(bomRowNumber), 'BOM row # selection control')
  await clickSelector(bomRowNumber)
  check(await isPinned(result), 'BOM row # selection control preserves the existing Pin')
  check(await rowExpanded(simBomRow) === 'false' && await evaluate(`(${visibleExpression(bomRowNumber)})?.getAttribute('aria-pressed') === 'true'`), 'BOM row # control selects without expanding its main row')
  const bomBlank = await blankNameCellPoint(simBomRow)
  check(Boolean(bomBlank?.blank), 'BOM test target is genuinely unused whitespace in the row name cell', bomBlank)
  await clickPoint(bomBlank)
  check(await rowExpanded(simBomRow) === 'true', 'blank BOM row whitespace still expands the row')
  check(!await isPinned(result), 'clicking blank BOM row whitespace clears the existing Pin')
  await clickSelector(bomCostNumber)
  check(await isPinned(bomCostNumber), 'a BOM SelectedNumber can be pinned again before row collapse')
  await clickPoint(await blankNameCellPoint(simBomRow))
  check(!await isPinned(bomCostNumber), 'clicking blank BOM row whitespace also clears Pin while collapsing')
  check(await rowExpanded(simBomRow) === 'false', 'blank BOM row whitespace still collapses the row')

  await clickSelector(result)
  const routingCostNumber = `${simRoutingRow} td:nth-last-child(2) button[data-selected-number]`
  await waitFor(() => existsVisible(routingCostNumber), 'read-only SelectedNumber inside the Routing main row')
  await clickSelector(routingCostNumber)
  check(await isPinned(routingCostNumber), 'clicking a Routing-row SelectedNumber pins that source')
  check(await rowExpanded(simRoutingRow) === 'false', 'clicking a Routing-row SelectedNumber does not expand the row')
  const routingBlank = await blankNameCellPoint(simRoutingRow)
  check(Boolean(routingBlank?.blank), 'Routing test target is genuinely unused whitespace in the row name cell', routingBlank)
  await clickPoint(routingBlank)
  check(await rowExpanded(simRoutingRow) === 'true', 'blank Routing row whitespace still expands the row')
  check(!await isPinned(routingCostNumber), 'clicking blank Routing row whitespace clears the existing Pin')
  await clickSelector(routingCostNumber)
  check(await isPinned(routingCostNumber), 'a Routing SelectedNumber can be pinned again before row collapse')
  await clickPoint(await blankNameCellPoint(simRoutingRow))
  check(!await isPinned(routingCostNumber), 'clicking blank Routing row whitespace also clears Pin while collapsing')
  check(await rowExpanded(simRoutingRow) === 'false', 'blank Routing row whitespace still collapses the row')

  const verifyBlankDismissal = async (selector, label) => {
    check(await ensurePinned(result), `${label}: Result value is pinned before the click`)
    const point = await blankPointIn(selector)
    check(Boolean(point?.blank), `${label}: target is rendered blank space with no real control`, point)
    await clickPoint(point)
    check(!await isPinned(result), `${label}: blank click clears the Pin`, point)
  }
  check(await ensurePinned(result), 'outer-workspace dismissal test starts with a pinned Result value')
  const outerBlank = await outerWorkspaceBlankPoint()
  check(Boolean(outerBlank?.blank && outerBlank.outsideSimulationLayout), 'outer-workspace target is blank page-edge space outside the Simulation layout', outerBlank)
  await clickPoint(outerBlank)
  check(!await isPinned(result), 'blank outer workspace / page edge clears Pin', outerBlank)

  for (const [selector, label] of [
    ['section[aria-labelledby="simulation-result-title"]', 'Result panel'],
    ['[data-simulation-layout-column="inputs"]', 'Economic / Business panel'],
    ['figure[aria-labelledby="break-even-graph-title"]', 'Break-even graph container'],
    ['section[data-simulation-table="bom"]', 'BOM table container'],
    ['section[data-simulation-table="routing"]', 'Routing table container']
  ]) await verifyBlankDismissal(selector, label)

  check(await ensurePinned(result), 'panel-gap dismissal test starts with a pinned Result value')
  const panelGap = await resultGraphGapPoint()
  check(Boolean(panelGap?.blank), 'panel-gap target is geometrically between Result and Break-even panels', panelGap)
  await clickPoint(panelGap)
  check(!await isPinned(result), 'clicking the blank gap between Simulation panels clears Pin', panelGap)

  for (const [row, kind, label] of [[simBomRow, 'bom', 'BOM'], [simRoutingRow, 'routing', 'Routing']]) {
    if (await rowExpanded(row) !== 'true') await clickPoint(await blankNameCellPoint(row))
    const detail = `section[data-simulation-table="${kind}"] [data-simulation-row-detail="true"]`
    const effectValue = `${detail} button[data-selected-number]`
    await waitFor(() => existsVisible(effectValue), `${label} Parameter Cost Effect SelectedNumber`)
    check(await ensurePinned(result), `${label} detail control test starts with a pinned Result value`)
    await clickSelector(effectValue)
    check(await isPinned(effectValue) && !await isPinned(result) && await rowExpanded(row) === 'true', `${label} detail SelectedNumber moves Pin without collapsing the row`)
    const detailBlank = await blankPointIn(detail)
    check(Boolean(detailBlank?.blank), `${label} expanded detail target is blank whitespace`, detailBlank)
    await clickPoint(detailBlank)
    check(!await isPinned(effectValue) && await rowExpanded(row) === 'true', `${label} expanded-detail blank space clears Pin and keeps the row expanded`, detailBlank)
    await clickPoint(await blankNameCellPoint(row))
    check(await rowExpanded(row) === 'false', `${label} row can still collapse after expanded-detail dismissal`)
  }

  const focusedRow = await evaluate(`(()=>{const row=${visibleExpression(simBomRow)};row?.focus();return Boolean(row&&document.activeElement===row&&row.tabIndex===0)})()`)
  check(focusedRow, 'expandable BOM row remains keyboard focusable')
  const pressRowKey = async (key, code, keyCode) => {
    const event = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...event })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...event })
    await delay(120)
  }
  await pressRowKey('Enter', 'Enter', 13)
  check(await rowExpanded(simBomRow) === 'true', 'Enter still expands a focused BOM main row')
  await pressRowKey(' ', 'Space', 32)
  check(await rowExpanded(simBomRow) === 'false', 'Space still collapses a focused BOM main row')

  await setViewport(390)
  const mobileBomRow = 'section[data-simulation-table="bom"] article[data-simulation-row-index="0"]'
  const mobileRoutingRow = 'section[data-simulation-table="routing"] article[data-simulation-row-index="0"]'
  const mobileBomNumber = `${mobileBomRow} [data-selected-number]`
  const mobileRoutingNumber = `${mobileRoutingRow} [data-selected-number]`
  const mobileBomInput = `${mobileBomRow} input`
  const mobileBomRowNumber = `${mobileBomRow} button[aria-label*="BOM row 1:"]`
  await waitFor(() => existsVisible(mobileBomNumber) && existsVisible(mobileRoutingNumber), 'mobile BOM and Routing values')
  await clickSelector(mobileBomNumber)
  check(await isPinned(mobileBomNumber) && await rowExpanded(mobileBomRow) === 'false', 'mobile BOM SelectedNumber pins without expanding its row')
  await clickSelector(mobileBomRowNumber)
  check(await isPinned(mobileBomNumber) && await rowExpanded(mobileBomRow) === 'false', 'mobile BOM row # selection preserves Pin without expanding')
  await clickSelector(mobileBomInput)
  check(await isPinned(mobileBomNumber) && await rowExpanded(mobileBomRow) === 'false', 'mobile editable numeric input preserves Pin without expanding')
  const mobileBomBlank = await blankMobileRowPoint(mobileBomRow)
  check(Boolean(mobileBomBlank?.blank), 'mobile BOM test target is genuinely blank row padding', mobileBomBlank)
  await clickPoint(mobileBomBlank)
  check(await rowExpanded(mobileBomRow) === 'true' && !await isPinned(mobileBomNumber), 'mobile BOM blank whitespace clears Pin and expands in one click')
  await clickSelector(mobileBomNumber)
  await clickPoint(await blankMobileRowPoint(mobileBomRow))
  check(await rowExpanded(mobileBomRow) === 'false' && !await isPinned(mobileBomNumber), 'mobile BOM blank whitespace clears Pin and collapses in one click')

  await evaluate(`(${visibleExpression(mobileRoutingRow)})?.scrollIntoView({block:'center',inline:'nearest'})`)
  await delay(120)
  await clickSelector(mobileRoutingNumber)
  check(await isPinned(mobileRoutingNumber), 'mobile Routing SelectedNumber pins its source', {pinned: await isPinned(mobileRoutingNumber), expanded: await rowExpanded(mobileRoutingRow)})
  check(await rowExpanded(mobileRoutingRow) === 'false', 'mobile Routing SelectedNumber does not expand its row')
  const mobileRoutingBlank = await blankMobileRowPoint(mobileRoutingRow)
  check(Boolean(mobileRoutingBlank?.blank), 'mobile Routing test target is genuinely blank row padding', mobileRoutingBlank)
  await clickPoint(mobileRoutingBlank)
  check(await rowExpanded(mobileRoutingRow) === 'true' && !await isPinned(mobileRoutingNumber), 'mobile Routing blank whitespace clears Pin and expands in one click')
  await clickSelector(mobileRoutingNumber)
  await clickPoint(await blankMobileRowPoint(mobileRoutingRow))
  check(await rowExpanded(mobileRoutingRow) === 'false' && !await isPinned(mobileRoutingNumber), 'mobile Routing blank whitespace clears Pin and collapses in one click')

  const pinMobileBomValue = async () => {
    await evaluate(`(${visibleExpression(mobileBomRow)})?.scrollIntoView({block:'center',inline:'nearest'})`)
    await delay(120)
    return ensurePinned(mobileBomNumber)
  }
  check(await pinMobileBomValue(), 'mobile outer-workspace test starts with a pinned BOM value')
  const mobileOuterBlank = await outerWorkspaceBlankPoint()
  check(Boolean(mobileOuterBlank?.blank && mobileOuterBlank.outsideSimulationLayout), 'mobile outer-workspace target is blank page-edge space outside Simulation', mobileOuterBlank)
  await clickPoint(mobileOuterBlank)
  check(!await isPinned(mobileBomNumber), 'mobile blank outer workspace / page edge clears Pin', mobileOuterBlank)
  for (const [selector, label] of [
    ['section[aria-labelledby="simulation-result-title"]', 'Result panel'],
    ['[data-simulation-layout-column="inputs"]', 'Economic / Business panel'],
    ['figure[aria-labelledby="break-even-graph-title"]', 'Break-even graph container']
  ]) {
    check(await pinMobileBomValue(), `mobile ${label} test starts with a pinned BOM value`)
    const point = await blankPointIn(selector)
    check(Boolean(point?.blank), `mobile ${label} target is rendered blank space`, point)
    await clickPoint(point)
    check(!await isPinned(mobileBomNumber), `mobile ${label} blank click clears Pin`, point)
  }
  for (const [row, label, source] of [
    [mobileBomRow, 'BOM', mobileBomNumber],
    [mobileRoutingRow, 'Routing', mobileRoutingNumber]
  ]) {
    await evaluate(`(${visibleExpression(row)})?.scrollIntoView({block:'center',inline:'nearest'})`)
    await delay(120)
    if (await rowExpanded(row) !== 'true') await clickPoint(await blankMobileRowPoint(row))
    const detail = `${row} [data-simulation-row-detail="true"]`
    const effectValue = `${detail} button[data-selected-number]`
    await waitFor(() => existsVisible(effectValue), `mobile ${label} Parameter Cost Effect SelectedNumber`)
    check(await ensurePinned(source), `mobile ${label} detail test starts with a pinned row value`)
    await clickSelector(effectValue)
    check(await isPinned(effectValue) && !await isPinned(source) && await rowExpanded(row) === 'true', `mobile ${label} detail SelectedNumber moves Pin without collapsing the card`)
    const detailBlank = await blankPointIn(detail)
    check(Boolean(detailBlank?.blank), `mobile ${label} expanded detail target is blank whitespace`, detailBlank)
    await clickPoint(detailBlank)
    check(!await isPinned(effectValue) && await rowExpanded(row) === 'true', `mobile ${label} expanded-detail blank space clears Pin and keeps the card expanded`, detailBlank)
    await clickPoint(await blankMobileRowPoint(row))
    check(await rowExpanded(row) === 'false', `mobile ${label} card remains collapsible after detail dismissal`)
  }
  await setViewport(1440)

  const simPriceBefore = await inputValue(simPrice)
  const simUsageBefore = await inputValue(simUsage)
  await replaceInput(simPrice, exact)
  check(await rowExpanded(simBomRow) === 'false', 'editing a BOM numeric input does not expand its main row')
  await expectBlue(simPrice, 'Simulation Price direct edit is blue during the pending gesture')
  await clickSelector(header)
  check(await inputValue(header) === exact, 'Simulation Header uses the same exact source writer', await state(header))
  await expectNormal(result, 'calculated Simulation Material After keeps normal color during direct edit')
  const derived = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] [data-selected-number], [data-economic-outcome-value] [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute('aria-label'),color:getComputedStyle(e).color,pending:e.getAttribute('data-direct-edit-pending')})))()`)
  check(derived.length > 0 && derived.every(e => e.color !== 'rgb(29, 78, 216)' && e.pending !== 'true'), 'Simulation results and Economic outputs never inherit source blue', derived)
  await blur()
  await expectBlue(simPrice, 'Simulation Price stays blue after blur commits its history action')
  await clickSelector(simPrice)
  check(await inputValue(simPrice) === exact, 'Simulation commit retains exact text on refocus')
  const usageEdit = simUsageBefore === '3.13' ? '4.125987654321' : '3.125987654321'
  await replaceInput(simUsage, usageEdit)
  await blur()
  await expectBlue(simPrice, 'first Simulation source remains blue after an independent second edit')
  await expectBlue(simUsage, 'second independent Simulation source stays blue after blur')
  await expectNormal(result, 'calculated Simulation Material After stays normal after both direct edits')
  const derivedAfterSecondEdit = await evaluate(`(()=>[...document.querySelectorAll('[data-simulation-result-body] [data-selected-number], [data-economic-outcome-value] [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute('aria-label'),color:getComputedStyle(e).color,pending:e.getAttribute('data-direct-edit-pending')})))()`)
  check(derivedAfterSecondEdit.length > 0 && derivedAfterSecondEdit.every(e => e.color !== 'rgb(29, 78, 216)' && e.pending !== 'true'), 'derived Simulation results remain normal after multiple direct edits', derivedAfterSecondEdit)

  await clickSelector('header button[aria-label="Undo"]')
  check(await inputValue(simUsage) === simUsageBefore, 'first Undo reverses only the latest Usage action')
  await expectBlue(simPrice, 'Undo of Usage preserves the earlier Price provenance')
  await expectNormal(simUsage, 'Undo of Usage removes only Usage provenance')
  await clickSelector('header button[aria-label="Undo"]')
  check(await inputValue(simPrice) === simPriceBefore && await inputValue(simUsage) === simUsageBefore, 'second Undo restores the complete pre-edit parameter snapshot')
  await expectNormal(simPrice, 'Undo to the original parameter snapshot clears Price provenance')
  await expectNormal(simUsage, 'Undo to the original parameter snapshot clears Usage provenance')
  await clickSelector('header button[aria-label="Redo"]')
  await clickSelector(simPrice)
  check(await inputValue(simPrice) === exact && await inputValue(simUsage) === simUsageBefore, 'first Redo reapplies only the first chronological Price action with its exact editable value')
  await expectBlue(simPrice, 'Redo restores Price provenance with its edited value')
  await expectNormal(simUsage, 'first Redo leaves Usage at its pre-edit value')
  await clickSelector('header button[aria-label="Redo"]')
  await clickSelector(simPrice)
  const priceAfterSecondRedo = await inputValue(simPrice)
  await clickSelector(simUsage)
  check(priceAfterSecondRedo === exact && await inputValue(simUsage) === usageEdit, 'second Redo reapplies both sources in original order with their exact editable values')
  await expectBlue(simPrice, 'second Redo preserves the earlier Price provenance')
  await expectBlue(simUsage, 'second Redo restores Usage provenance with its edited value')

  const simManning = 'section[data-simulation-table="routing"] input[aria-label$="Manning in Current"]'
  await waitFor(() => existsVisible(simManning), 'Simulation Current Manning')
  await clickSelector(simManning)
  const simManningBefore = await inputValue(simManning)
  const simManningEdit = ['3.125', '3.25', '4.125'].find(candidate => Number(candidate) !== Number(simManningBefore))
  assert.ok(simManningEdit, `Could not choose a Manning edit different from ${simManningBefore}`)
  await expectNormal(simManning, 'Simulation Routing Manning starts normal before direct edit')
  await send('Input.insertText', { text: simManningEdit })
  await delay(150)
  check(await inputValue(simManning) === simManningEdit, 'Simulation Routing Manning accepts the distinct exact edit', {before: simManningBefore, edited: await inputValue(simManning)})
  await expectBlue(simManning, 'Simulation Routing Manning direct edit turns blue')
  await blur()
  await expectBlue(simManning, 'Simulation Routing Manning stays blue after blur')
  await clickSelector(simUsage)
  await expectBlue(simManning, 'Simulation Routing Manning stays blue after focus moves elsewhere')
  await expectDerivedNormal('calculated Simulation and Economic outputs stay normal during Routing Manning edit')
  await clickTextButton('Cost Breakdown')
  await waitFor(() => evaluate(`document.querySelector('header nav[aria-label="Main navigation"] button[aria-current="page"]')?.innerText.trim()==='Cost Breakdown'`), 'Cost Breakdown after Routing edit')
  await clickTextButton('Simulation')
  await waitFor(async () => (await evaluate(`document.querySelector('header nav[aria-label="Main navigation"] button[aria-current="page"]')?.innerText.trim()==='Simulation'`)) && existsVisible(simManning), 'Simulation after returning from Cost Breakdown')
  await expectBlue(simManning, 'Simulation Routing Manning stays blue after navigating away and back')
  await clickSelector(simManning)
  check(await inputValue(simManning) === simManningEdit, 'Simulation Routing Manning exact edit persists after navigating away and back', await state(simManning))
  await expectDerivedNormal('calculated Simulation and Economic outputs stay normal after returning to the edited Routing source')
  await clickSelector('header button[aria-label="Undo"]')
  await clickSelector(simManning)
  check(await inputValue(simManning) === simManningBefore, 'Simulation Routing Manning Undo restores the exact previous input', {before: simManningBefore, actual: await inputValue(simManning)})
  await expectNormal(simManning, 'Simulation Routing Manning Undo clears direct-edit blue')
  await clickSelector('header button[aria-label="Redo"]')
  await clickSelector(simManning)
  check(await inputValue(simManning) === simManningEdit, 'Simulation Routing Manning Redo restores the exact edited input', {expected: simManningEdit, actual: await inputValue(simManning)})
  await expectBlue(simManning, 'Simulation Routing Manning Redo restores direct-edit blue')

  const economic = 'input[aria-label="Fixed Action Cost"]'
  const economicBefore = await inputValue(economic)
  const economicEdit = '123.00000000000000001'
  await replaceInput(economic, economicEdit)
  await blur()
  await expectBlue(economic, 'Economic direct input stays blue after blur commits its history action')
  await clickSelector('header button[aria-label="Undo"]')
  check(await inputValue(economic) === economicBefore, 'Economic Undo restores its exact pre-edit editable value')
  await expectNormal(economic, 'Economic Undo removes its direct-edit provenance')
  await clickSelector('header button[aria-label="Redo"]')
  await clickSelector(economic)
  check(await inputValue(economic) === economicEdit, 'Economic Redo restores the exact edited value')
  await expectBlue(economic, 'Economic Redo restores direct-edit provenance')

  const resetEdit = '14.25'
  await replaceInput(simPrice, resetEdit)
  await blur()
  await expectBlue(simPrice, 'Simulation source is marked before Main Reset')
  await clickSelector('button[aria-label="Reset"]')
  check(await inputValue(simPrice) === simPriceBefore, 'Main Reset restores the source to its role baseline')
  await expectNormal(simPrice, 'Main Reset removes stale provenance from the reset source')
  await clickSelector('header button[aria-label="Undo"]')
  check(await inputValue(simPrice) === resetEdit, 'Undo of Main Reset restores the exact pre-reset edit')
  await expectBlue(simPrice, 'Undo of Main Reset restores its direct-edit provenance')
  await clickSelector('header button[aria-label="Redo"]')
  check(await inputValue(simPrice) === simPriceBefore, 'Redo of Main Reset reapplies the role baseline')
  await expectNormal(simPrice, 'Redo of Main Reset removes stale provenance again')

  const reconciledEdit = '24.125'
  await replaceInput(simPrice, reconciledEdit)
  await blur()
  await expectBlue(simPrice, 'direct source is marked before same-role Send reconciliation')
  await clickSelector('button[aria-label="Send to Master Data"]')
  await clickSelector(simPrice)
  check(await inputValue(simPrice) === reconciledEdit, 'same-role Send preserves the newly authoritative Working value')
  await expectNormal(simPrice, 'same-role Send reconciliation prunes stale direct-edit provenance')

  const selectSimulationRole = async roleName => {
    await clickSelector(`button[aria-label="Select ${roleName} as active dataset"]`)
    await delay(250)
  }
  await selectSimulationRole('Reference')
  const referencePrice = 'section[data-simulation-table="bom"] input[aria-label$="Price in Reference"]'
  const referenceEdit = '11.25'
  await waitFor(() => existsVisible(referencePrice), 'Simulation Reference Price')
  await replaceInput(referencePrice, referenceEdit)
  await blur()
  await expectBlue(referencePrice, 'Reference direct source stays blue after blur')
  await selectSimulationRole('Current')
  const secondRoleEdit = '13.75'
  await replaceInput(simPrice, secondRoleEdit)
  await blur()
  await expectBlue(simPrice, 'Current direct source stays blue after blur')
  await selectSimulationRole('Reference')
  await expectBlue(referencePrice, 'Reference direct source survives switching away and back')

  await hoverSelector('button[aria-label="Reset"]')
  await waitFor(() => evaluate('Boolean([...document.querySelectorAll("button")].find(button=>button.getClientRects().length&&button.innerText.trim()==="Reset all"))'), 'Reset all menu action')
  await clickTextButton('Reset all')
  await delay(300)
  const resetAllActiveRole = await evaluate(`document.querySelector('button[aria-pressed="true"][aria-label^="Select "]')?.getAttribute('aria-label')??null`)
  check(resetAllActiveRole === 'Select Custom as active dataset', 'Reset all restores the canonical Custom active role', resetAllActiveRole)
  await selectSimulationRole('Reference')
  await expectNormal(referencePrice, 'Reset all clears Reference source provenance')
  await selectSimulationRole('Current')
  await expectNormal(simPrice, 'Reset all leaves Current source without stale provenance')

  const simulationPriceFor = roleName => `section[data-simulation-table="bom"] input[aria-label$="Price in ${roleName}"]`
  const sendAllValues = {}
  const sendAllCandidates = ['11.25', '13.75', '17.25']
  for (const roleName of ['Reference', 'Current']) {
    await selectSimulationRole(roleName)
    const source = simulationPriceFor(roleName)
    await waitFor(() => existsVisible(source), `Simulation ${roleName} Price before Send All`)
    const before = await inputValue(source)
    sendAllValues[roleName] = sendAllCandidates.find(candidate => Number(candidate) !== Number(before))
    assert.ok(sendAllValues[roleName], `Could not choose a ${roleName} Price edit different from ${before}`)
    await replaceInput(source, sendAllValues[roleName])
    await blur()
    check(await inputValue(source) === sendAllValues[roleName], `Simulation ${roleName} Price accepts the distinct exact edit`, {before, edited: await inputValue(source)})
    await expectBlue(source, `Simulation ${roleName} direct Price edit is blue after blur before Send All`)
  }
  for (const roleName of ['Reference', 'Current']) {
    await selectSimulationRole(roleName)
    await expectBlue(simulationPriceFor(roleName), `Simulation ${roleName} Price provenance remains blue immediately before Send All`)
  }
  await expectDerivedNormal('calculated Simulation and Economic outputs remain normal before Send All')
  await hoverSelector('button[aria-label="Send to Master Data"]')
  await waitFor(() => existsVisible('[role="group"][aria-label="Send all-dataset action"] button'), 'Send All menu action')
  await clickTextButton('Send all datasets')
  await delay(400)
  for (const roleName of ['Reference', 'Current']) {
    await selectSimulationRole(roleName)
    await expectNormal(simulationPriceFor(roleName), `Send All basis reconciliation clears ${roleName} direct-edit provenance`)
  }
  await expectDerivedNormal('calculated Simulation and Economic outputs remain normal after Send All reconciliation')
  const batchSizeSlider = 'figure[aria-labelledby="break-even-graph-title"] g[role="slider"][aria-label="Batch Size"]'
  await replaceInput('input[aria-label="Batch Size"]', '100')
  await blur()
  await waitFor(() => existsVisible(batchSizeSlider), 'Break-even Batch Size slider')
  check(await ensurePinned(result), 'Break-even slider control test starts with a pinned Result value')
  const marker = await evaluate(`(()=>{const slider=${visibleExpression(batchSizeSlider)};if(!slider)return null;const rect=slider.getBoundingClientRect(),svg=slider.ownerSVGElement?.getBoundingClientRect();if(!svg)return null;const x=rect.left+rect.width/2;return{x,y:rect.top+rect.height/2,deltaX:x<svg.right-32?24:-24}})()`)
  const beforeDrag = await evaluate(`(${visibleExpression(batchSizeSlider)})?.getAttribute('aria-valuenow') ?? null`)
  await dragPoint(marker, marker?.deltaX)
  const afterDrag = await evaluate(`(${visibleExpression(batchSizeSlider)})?.getAttribute('aria-valuenow') ?? null`)
  check(beforeDrag !== null && afterDrag !== null && afterDrag !== beforeDrag, 'Break-even graph marker remains pointer-draggable', {beforeDrag,afterDrag,marker})
  check(await isPinned(result), 'dragging the real graph slider preserves the Result Pin')
  const beforeArrow = afterDrag
  await pressRowKey('ArrowRight', 'ArrowRight', 39)
  const afterArrow = await evaluate(`(${visibleExpression(batchSizeSlider)})?.getAttribute('aria-valuenow') ?? null`)
  check(afterArrow !== null && afterArrow !== beforeArrow, 'Break-even graph slider remains keyboard-operable')
  check(await isPinned(result), 'keyboard-operating the graph slider preserves the Result Pin')
  await clickTextButton('Master Data')
  await waitFor(() => existsVisible(toolbar), 'Master Data after Send All')
  for (const roleName of ['Reference', 'Current']) {
    await clickSelector(role(roleName))
    await waitFor(() => existsVisible(price), `Master Data ${roleName} Working Price after Send All`)
    await waitFor(async () => await inputValue(price) === sendAllValues[roleName], `Master Data ${roleName} Working Price receives the sent value`)
    check(await inputValue(price) === sendAllValues[roleName], `Send All writes the edited ${roleName} Price to its matching Master Data Working role`, {expected: sendAllValues[roleName], actual: await inputValue(price)})
    await expectNormal(price, `Send All ${roleName} Working Price is normal, not manually blue`)
  }

  await clickTextButton('Cost Breakdown')
  await delay(400)
  const cbd = await evaluate(`(()=>[...document.querySelectorAll('main [data-selected-number]')].filter(e=>e.getClientRects().length).map(e=>({color:getComputedStyle(e).color,pending:e.dataset.directEditPending})))()`)
  check(cbd.length > 0 && cbd.every(e=>e.color !== 'rgb(29, 78, 216)' && e.pending !== 'true'), 'Cost Breakdown read-only calculated values remain normal after edits', cbd)
  check(browserErrors.length === 0, 'no browser errors or warnings', browserErrors)
  process.stdout.write(`Direct-edit blue real-app browser verification PASS: ${count} assertions\n`)
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await delay(150)
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
  await rm(evidenceDir, { recursive: true, force: true })
}
