import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'

// Exercise the real AppLayout and all three table callers in an isolated browser.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function unusedPort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}
function findChrome() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH].filter(Boolean)
  if (process.platform === 'win32') candidates.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim() } catch {}
  }
  throw new Error('Chrome was not found. Set CHROME_BIN.')
}
function stopChild(child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolve() })
    child.kill('SIGTERM')
  })
}
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-issue-navigation-profile-'))
const evidence = await mkdtemp(join(tmpdir(), 'costbreakdown-issue-navigation-evidence-'))
const vite = spawn(process.execPath, ['--input-type=module', '-e', `
  import { createServer } from 'vite';
  const server = await createServer({server:{host:'127.0.0.1',port:${vitePort},strictPort:true,hmr:false}});
  await server.listen();
`], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank']
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: 'ignore' })
let client
let checks = 0
const failures = []
const browserErrors = []
async function waitFor(check, label, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await check()) return
    if (vite.exitCode !== null || chrome.exitCode !== null) break
    await delay(50)
  }
  throw new Error(`${label} timed out. Vite: ${viteOutput.join('').slice(-2000)}`)
}
function check(condition, label, detail) {
  checks += 1
  if (!condition) { failures.push(label); console.error(`FAIL ${label}: ${JSON.stringify(detail)}`) }
}
try {
  const baseUrl = `http://127.0.0.1:${vitePort}/`
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => { try { return (await fetch(baseUrl)).ok } catch { return false } }, 'Vite')
  await waitFor(async () => { try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false } }, 'Chrome')
  const target = await (await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })).json()
  client = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { client.addEventListener('open', resolve, { once: true }); client.addEventListener('error', reject, { once: true }) })
  let commandId = 0
  const pending = new Map()
  client.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      browserErrors.push(message.params.args.map(argument => argument.value ?? argument.description).join(' '))
    }
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)) }, 15000)
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(message.error.message)) : resolve(message) })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails))
    return response.result.result.value
  }
  const click = async selector => {
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)}+'; buttons='+JSON.stringify([...document.querySelectorAll('#prepare-dataset-panel button')].map(b=>({label:b.getAttribute('aria-label'),text:b.textContent.trim()}))));if(e.disabled)throw Error('Disabled '+${JSON.stringify(selector)});e.click()})()`)
    await delay(80)
  }
  const clickText = async (text, root = 'body') => {
    await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(root + ' button')})].find(e=>e.getClientRects().length&&e.textContent.trim().startsWith(${JSON.stringify(text)}));if(!e)throw Error('Missing button '+${JSON.stringify(text)});e.click()})()`)
    await delay(80)
  }
  const screenshot = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `${name}.png`), Buffer.from(result.result.data, 'base64'))
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false })
  await waitFor(() => evaluate('!!document.querySelector("#main-content")'), 'app shell')

  // Only synthetic fixture data is inserted into this disposable profile.
  await evaluate(`(async()=>{
    const {makeEmptySession}=await import('/src/state/store.tsx');
    const {createCompleteMasterDataMockPair}=await import('/src/features/master-data/fixtures/synthetic-review-data.ts');
    const {replaceDevelopmentMockWorkingState}=await import('/src/state/development-mock-data.ts');
    const pair=createCompleteMasterDataMockPair();
    for(const role of ['reference','current']) {
      const s=pair[role], sample={bom:s.bom[0],rates:s.rates[0],routing:s.routing[0]};
      s.bom=Array.from({length:40},(_,i)=>({...sample.bom,id:role+'-bom-'+(i+1),description:'SYN-MAT-'+(i+1),isGeneratedBusinessIdentity:false,autoRenamedFrom:undefined,price:5,consumption:1,loss:0.01}));
      s.rates=Array.from({length:40},(_,i)=>({...sample.rates,id:role+'-wc-'+(i+1),workCenterCode:'SYN-WC-'+(i+1),isGeneratedBusinessIdentity:false,autoRenamedFrom:undefined,laborRate:10,burdenRate:20}));
      s.routing=Array.from({length:40},(_,i)=>({...sample.routing,id:role+'-routing-'+(i+1),processName:'SYN-PROC-'+(i+1),workCenterId:'SYN-WC-1',isGeneratedBusinessIdentity:false,autoRenamedFrom:undefined,manning:1,capacity:100,yield:0.99}));
      s.sizing={bomCount:40,wcCount:40,routingCount:40};
    }
    for(const i of [1,19,39]) { pair.reference.bom[i].description=''; pair.reference.bom[i].price=null; }
    pair.reference.rates[39].workCenterCode=''; pair.reference.rates[39].laborRate=null;
    pair.reference.routing[39].processName=''; pair.reference.routing[39].manning=null;
    const session=replaceDevelopmentMockWorkingState(makeEmptySession('ps-navigation-test'),pair);
    if(!session)throw Error('Synthetic navigation fixture rejected');
    sessionStorage.setItem('costbreakdown_sessions',JSON.stringify([session]));
    sessionStorage.setItem('costbreakdown_active_id',JSON.stringify(session.id));
    sessionStorage.setItem('costbreakdown_active_tab',JSON.stringify('master'));
  })()`)
  await send('Page.reload')
  await waitFor(() => evaluate('document.querySelectorAll("[data-master-data-row-id]").length===120'), 'synthetic row fixture')
  const layoutState = (rowId, field) => evaluate(`(()=>{
    const main=document.getElementById('main-content'),row=document.querySelector('[data-master-data-row-id="'+${JSON.stringify(rowId)}+'"]');
    const target=row?.querySelector('[data-grid-field="'+${JSON.stringify(field)}+'"]');
    const shell=main.parentElement,footer=document.querySelector('footer[aria-label="Dataset and comparison status"]');
    const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
    const sticky=row?.closest('section')?.querySelector('[data-sticky-table-header]');
    return {mainScroll:main.scrollTop,mainMax:main.scrollHeight-main.clientHeight,main:rect(main),shellScroll:shell.scrollTop,
      windowY:window.scrollY,documentScroll:document.documentElement.scrollTop,bodyScroll:document.body.scrollTop,
      footer:rect(footer),viewport:innerHeight,row:row?rect(row):null,target:target?rect(target):null,
      selected:row?.getAttribute('aria-selected'),focusRow:document.activeElement?.getAttribute('data-grid-row-id'),
      focusField:document.activeElement?.getAttribute('data-grid-field'),sticky:sticky?rect(sticky):null,
      headerBottom:document.querySelector('[aria-label="Working dataset controls"]')?.getBoundingClientRect().bottom,
      role:document.querySelector('[aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label'),
      edit:document.querySelector('[aria-label="Working dataset controls"] [role="switch"]')?.getAttribute('aria-checked'),
      table:[...document.querySelectorAll('[aria-label="Master Data table section"] button')].find(e=>e.getAttribute('aria-pressed')==='true')?.textContent.trim(),
      search:document.querySelector('input[aria-label="Search Master Data"]')?.value};
  })()`)
  const verify = async (name, table, row, field, expectedView) => {
    await waitFor(() => evaluate(`document.activeElement?.getAttribute('data-grid-row-id')===${JSON.stringify(`reference-${table}-${row}`)}&&document.activeElement?.getAttribute('data-grid-field')===${JSON.stringify(field)}`), `${name} focus`)
    await delay(750) // Wait for the navigation's smooth scroll to finish before geometry assertions.
    const state = await layoutState(`reference-${table}-${row}`, field)
    console.log(`${name}: ${JSON.stringify(state)}`)
    check(state.selected === 'true', `${name}: source row selected`, state)
    check(state.focusRow === `reference-${table}-${row}` && state.focusField === field, `${name}: correct field focused`, state)
    check(state.role?.startsWith('Reference') && state.edit === 'true' && state.table === expectedView && state.search === '', `${name}: role/edit/table/search navigation preserved`, state)
    check(state.mainScroll >= 0 && state.mainScroll <= state.mainMax + 1 && (row < 10 || state.mainScroll > 0), `${name}: main content scrolls within bounds`, state)
    check(state.shellScroll === 0 && state.windowY === 0 && state.documentScroll === 0 && state.bodyScroll === 0, `${name}: outer ancestors stay stationary`, state)
    check(Math.abs(state.footer.bottom-state.viewport) <= 1 && state.footer.top < state.viewport, `${name}: footer remains at viewport bottom`, state)
    check(state.target.top >= Math.max(state.main.top,state.headerBottom,state.sticky?.bottom ?? 0)-1 && state.target.bottom <= Math.min(state.main.bottom,state.footer.top)+1, `${name}: target visible below sticky headers`, state)
    await screenshot(name)
    // Each independent navigation starts from the normal outer layout position.
    await evaluate('window.scrollTo(0,0);document.body.scrollTop=0;document.getElementById("main-content").parentElement.scrollTop=0')
    return state
  }
  const prepareJump = async (kind, tableLabel, row, fieldLabel) => {
    await click('#header-prepare-dataset-trigger')
    await clickText(kind === 'warning' ? 'Generated identity' : 'Missing required value', `#prepare-dataset-panel ul[aria-label="${kind === 'warning' ? 'Warning' : 'Blocker'} categories"]`)
    await click(`#prepare-dataset-panel button[aria-label="Reference · ${tableLabel} · Row ${row} · ${fieldLabel}"]`)
  }
  // Begin on a different role, page, table and mode with a filtering search.
  await click('[aria-label="Working dataset controls"] [role="switch"]')
  await evaluate(`(()=>{const e=document.querySelector('input[aria-label="Search Master Data"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'no matching fixture');e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  const start = await layoutState('current-bom-1', 'description')
  check(start.role?.startsWith('Current') && start.edit === 'false' && start.search === 'no matching fixture', 'Prepare Dataset fixture starts in another role/View with a filtering search', start)
  await clickText('Simulation', 'header nav[aria-label="Main navigation"]')
  await prepareJump('warning', 'Bill of Materials', 40, 'Material')
  await verify('bom-bottom-warning', 'bom', 40, 'description', 'BOM')
  await prepareJump('blocker', 'Bill of Materials', 2, 'Price')
  await verify('bom-top-blocker', 'bom', 2, 'price', 'BOM')
  await prepareJump('warning', 'Bill of Materials', 20, 'Material')
  await verify('bom-middle-warning', 'bom', 20, 'description', 'BOM')
  await prepareJump('blocker', 'Bill of Materials', 20, 'Price')
  await verify('bom-middle-blocker', 'bom', 20, 'price', 'BOM')
  await prepareJump('blocker', 'Bill of Materials', 40, 'Price')
  await verify('bom-bottom-blocker', 'bom', 40, 'price', 'BOM')
  await prepareJump('warning', 'Work Centers', 40, 'Work Center')
  await verify('wc-bottom-warning', 'wc', 40, 'workCenterCode', 'WC')
  await prepareJump('blocker', 'Routing', 40, 'Manning')
  await verify('routing-bottom-blocker', 'routing', 40, 'manning', 'RTG')
  // All-table view must stay All when using table-local issue navigators.
  await clickText('All', '[aria-label="Master Data table section"]')
  await click('section[aria-label="Bill of Materials rows"] button[aria-label^="Jump to next warning"]')
  await verify('all-bom-next-warning', 'bom', 2, 'description', 'All')
  await click('section[aria-label="Bill of Materials rows"] button[aria-label^="Jump to next warning"]')
  await verify('all-bom-repeated-warning', 'bom', 20, 'description', 'All')
  await click('section[aria-label="Work Centers rows"] button[aria-label^="Jump to next blocker"]')
  await verify('all-wc-next-blocker', 'wc', 40, 'laborRate', 'All')
  await click('section[aria-label="Routing rows"] button[aria-label^="Jump to next warning"]')
  await verify('all-routing-next-warning', 'routing', 40, 'processName', 'All')
  // Existing horizontal overflow remains local; navigation must reveal its target.
  await clickText('BOM', '[aria-label="Master Data table section"]')
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 768, deviceScaleFactor: 1, mobile: false })
  await delay(100)
  await evaluate(`(()=>{const table=document.querySelector('section[aria-label="Bill of Materials rows"] table[aria-label]')??document.querySelector('section[aria-label="Bill of Materials rows"] table');const section=table.closest('section');const bodyTable=section.querySelector('tbody [data-master-data-row-id]')?.closest('table');bodyTable.parentElement.scrollLeft=bodyTable.parentElement.scrollWidth;document.getElementById('main-content').scrollTop=0})()`)
  const clipped = await layoutState('reference-bom-40', 'description')
  check(clipped.target.left < clipped.main.left, 'horizontal fixture starts with target outside table viewport', clipped)
  await prepareJump('warning', 'Bill of Materials', 40, 'Material')
  const horizontal = await verify('bom-horizontal-warning', 'bom', 40, 'description', 'BOM')
  check(horizontal.target.left >= horizontal.main.left-1 && horizontal.target.right <= horizontal.main.right+1, 'horizontal target revealed inside table viewport', horizontal)
  check(browserErrors.length === 0, 'no browser errors or warnings', browserErrors)
  console.log(`Issue navigation browser verification ${failures.length ? 'FAIL' : 'PASS'}: ${checks-failures.length}/${checks} checks; ${failures.length} failures. Evidence: ${evidence}`)
  assert.equal(failures.length, 0, failures.join('\n'))
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
}
