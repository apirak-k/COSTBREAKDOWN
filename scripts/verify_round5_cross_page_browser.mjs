import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
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
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const repository = process.cwd()
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-round5-'))
const vite = spawn(process.execPath, ['--input-type=module', '-e', `
  import {createServer} from 'vite';
  const server=await createServer({server:{host:'127.0.0.1',port:${vitePort},strictPort:true},optimizeDeps:{include:['buffer','process','exceljs/lib/exceljs.bare.js','xlsx']}});
  await server.listen();server.printUrls();
`], { cwd: repository, stdio: ['ignore', 'pipe', 'pipe'] })
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1600', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
let client
const browserErrors = []

function stopChild(child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve()
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 2500)
    child.once('exit', () => { clearTimeout(timer); resolve() })
    child.kill('SIGTERM')
  })
}

async function waitFor(check, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    if (vite.exitCode !== null || chrome.exitCode !== null) break
    await delay(100)
  }
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}`)
}

try {
  const baseUrl = `http://127.0.0.1:${vitePort}/`
  await waitFor(async () => { try { return (await fetch(baseUrl)).ok } catch { return false } }, 'Vite')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => { try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false } }, 'Chrome DevTools')
  const targetResponse = await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the application root: ${targetResponse.status}`)
  const target = await targetResponse.json()
  client = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    client.addEventListener('open', resolve, { once: true })
    client.addEventListener('error', reject, { once: true })
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome DevTools command timed out: ${method}`)) }, 10000)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
    return response.result.result.value
  }
  const visibleExpression = selector => `(()=>[...document.querySelectorAll(${JSON.stringify(selector)})].find(element=>{
    const rect=element.getBoundingClientRect();return element.getClientRects().length>0&&rect.width>0&&rect.height>0
  }))()`
  const existsVisible = selector => evaluate(`Boolean(${visibleExpression(selector)})`)
  const clickPoint = async point => {
    if (!point) throw new Error('Visible browser target not found')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(140)
  }
  const clickSelector = async selector => {
    const point = await evaluate(`(()=>{const element=${visibleExpression(selector)};if(!element)return null;element.scrollIntoView({block:'center',inline:'nearest'});const rect=element.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`)
    if (!point) throw new Error(`Visible browser target not found: ${selector}`)
    await clickPoint(point)
  }
  const clickButtonText = async (label, within = 'body') => {
    const point = await evaluate(`(()=>{const root=${visibleExpression(within)};const element=[...document.querySelectorAll(${JSON.stringify(`${within} button`)})].find(item=>{const text=item.innerText.trim();return item.getClientRects().length&&(text===${JSON.stringify(label)}||text.startsWith(${JSON.stringify(label)}))});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`)
    if (!point) {
      const visibleButtons = await evaluate(`[...document.querySelectorAll(${JSON.stringify(`${within} button`)})].filter(item=>item.getClientRects().length).map(item=>item.innerText.trim())`)
      throw new Error(`Visible button not found: ${label} within ${within}; found ${JSON.stringify(visibleButtons)}`)
    }
    await clickPoint(point)
  }
  const clickLabelText = async (rootSelector, labelText) => {
    const point = await evaluate(`(()=>{const root=${visibleExpression(rootSelector)};if(!root)return null;const element=[...root.querySelectorAll('label')].find(item=>item.getClientRects().length&&item.innerText.trim()===${JSON.stringify(labelText)});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`)
    if (!point) throw new Error(`Visible label not found: ${labelText}`)
    await clickPoint(point)
  }
  const inputValue = selector => evaluate(`(${visibleExpression(selector)})?.value??null`)
  const replaceInput = async (selector, text) => {
    await clickSelector(selector)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.insertText', { text })
    await delay(180)
    return inputValue(selector)
  }
  const fillSearch = (selector, text) => replaceInput(selector, text)
  const clickRowName = async rowSelector => {
    const point = await evaluate(`(()=>{const row=${visibleExpression(rowSelector)};if(!row)return null;row.scrollIntoView({block:'center',inline:'nearest'});const cell=row.querySelector('th[scope="row"]');if(!cell)return null;const range=document.createRange();range.selectNodeContents(cell);const rect=[...range.getClientRects()].find(item=>item.width>0&&item.height>0);return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null})()`)
    await clickPoint(point)
  }
  const dragSelectors = async (sourceSelector, targetSelector) => {
    return evaluate(`(()=>{const source=${visibleExpression(sourceSelector)},target=${visibleExpression(targetSelector)};if(!source||!target)return null;source.scrollIntoView({block:'center',inline:'nearest'});target.scrollIntoView({block:'center',inline:'nearest'});const rect=target.getBoundingClientRect(),clientX=rect.left+rect.width/2,clientY=rect.top+rect.height*.75;const dataTransfer=new DataTransfer();const started=source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer}));const over=target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer,clientX,clientY}));const dropped=target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer,clientX,clientY}));source.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer,clientX,clientY}));return {started,over,dropped,preventedDrop:dataTransfer.dropEffect==='move'}})()`)
  }
  const activePage = () => evaluate(`document.querySelector('header nav[aria-label="Main navigation"] button[aria-current="page"]')?.innerText.trim()??null`)
  const headerHistory = () => evaluate(`(()=>({undo:!document.querySelector('header button[aria-label="Undo"]')?.disabled,redo:!document.querySelector('header button[aria-label="Redo"]')?.disabled}))()`)
  const assertHeaderHistory = async (undo, redo, label) => {
    const actual = await headerHistory()
    check(actual.undo === undo && actual.redo === redo, `${label}: Header Undo/Redo availability is ${undo ? 'enabled' : 'disabled'}/${redo ? 'enabled' : 'disabled'}`, actual)
  }
  const headerState = () => evaluate(`(()=>{const input=document.querySelector('header [data-header-value] input[aria-label="Selected value"]');const output=document.querySelector('header [data-header-value] [data-selected-value-output]');return {inputSource:input?.getAttribute('data-selected-value-source')??null,value:output?.textContent.trim()??null}})()`)
  const assertHeaderCleared = async (direction) => {
    const state = await headerState()
    check(state.inputSource === null && state.value === '—', `${direction}: prior page Selected Value has no writer or stale Header value`, state)
  }
  let count = 0
  const failures = []
  const check = (condition, message, details) => {
    count++
    if (condition) process.stdout.write(`PASS ${message}\n`)
    else {
      failures.push({ message, details })
      process.stdout.write(`FAIL ${message}${details === undefined ? '' : `: ${JSON.stringify(details)}`}\n`)
    }
  }
  const route = async (label, expected) => {
    await clickButtonText(expected, 'header nav[aria-label="Main navigation"]')
    await waitFor(async () => await activePage() === expected, `${label} active route`)
    check(await activePage() === expected, `${label}: active destination is ${expected}`)
    await assertHeaderCleared(label)
  }
  const ownerAfterFocus = async selector => {
    await clickSelector(selector)
    const headerInput = 'header [data-header-value] input[aria-label="Selected value"]'
    await waitFor(() => existsVisible(headerInput), 'active page Selected Value writer')
    return evaluate(`(()=>({source:(${visibleExpression(selector)})?.getAttribute('data-selected-value-source')??null,header:(${visibleExpression(headerInput)})?.getAttribute('data-selected-value-source')??null}))()`)
  }
  const roleButton = role => `section[aria-label="Working dataset controls"] [role="group"][aria-label="Master Data workspace"] button[aria-label^=${JSON.stringify(`${role} —`)}]`
  const setMasterRole = role => clickSelector(roleButton(role))
  const setCBDRole = async (side, currentRole, nextRole) => {
    await clickSelector(`button[aria-label=${JSON.stringify(`${side} dataset, ${currentRole}`)}]`)
    await waitFor(() => existsVisible(`[role="menu"][aria-label=${JSON.stringify(`${side} dataset choices`)}]`), `${side} dataset menu`)
    const point = await evaluate(`(()=>{const menu=${visibleExpression(`[role="menu"][aria-label="${side} dataset choices"]`)};const item=[...(menu?.querySelectorAll('[role="menuitem"]')??[])].find(button=>button.innerText.trim()===${JSON.stringify(nextRole)});if(!item)return null;const rect=item.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`)
    await clickPoint(point)
  }
  const assertMasterState = async (role, edit, table, search) => {
    const state = await evaluate(`(()=>({role:document.querySelector('[role="group"][aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label')??null,edit:document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked')??null,table:[...document.querySelectorAll('[role="group"][aria-label="Master Data table section"] button')].find(button=>button.getAttribute('aria-pressed')==='true')?.innerText.trim()??null,search:document.querySelector('input[aria-label="Search Master Data"]')?.value??null}))()`)
    check(state.role?.startsWith(`${role} —`) && state.edit === String(edit) && state.table === table && state.search === search,
      `Master Data retains ${role}/${edit ? 'Edit' : 'View'}/${table}/search=${search}`, state)
  }
  const cbdOrder = () => evaluate(`[...document.querySelectorAll('table tbody tr[data-candidate-reorder-row]')].filter(row=>row.getClientRects().length).map(row=>row.getAttribute('data-candidate-reorder-row'))`)
  const cbdSummary = () => evaluate(`(()=>{const pair=document.querySelector('[role="group"][aria-label^="Comparison datasets,"]');const type=document.querySelector('[role="group"][aria-label="Finding type filter"] button[aria-pressed="true"]');const overview=document.querySelector('[data-cbd-sticky-shell] button[aria-label="Collapse"],[data-cbd-sticky-shell] button[aria-label="Expand"]');const rows=[...document.querySelectorAll('table tbody tr[data-candidate-reorder-row]')].filter(row=>row.getClientRects().length);return {pair:pair?.getAttribute('aria-label')??null,type:type?.innerText.trim()??null,overview:overview?.getAttribute('aria-expanded')??null,selected:rows.filter(row=>row.getAttribute('aria-selected')==='true').length,expanded:rows.filter(row=>row.getAttribute('aria-expanded')==='true').length,order:rows.map(row=>row.getAttribute('data-candidate-reorder-row'))}})()`)
  const readCBDStatus = async () => {
    await clickSelector('button[aria-label="Status"]')
    await waitFor(() => existsVisible('[role="dialog"][aria-label="Status options"]'), 'Status options for current Cost Breakdown state')
    const status = await evaluate(`[...document.querySelectorAll('[role="dialog"][aria-label="Status options"] input[type="checkbox"]')].map(input=>({label:input.closest('label')?.innerText.trim(),checked:input.checked}))`)
    await clickSelector('button[aria-label="Status"]')
    return status
  }
  const setSimulationPair = async (side, currentRole, nextRole) => setCBDRole(side, currentRole, nextRole)
  const simulationSummary = () => evaluate(`(()=>{const bom=document.querySelector('section[data-simulation-table="bom"]');const routing=document.querySelector('section[data-simulation-table="routing"]');const rowState=(section)=>{const row=[...(section?.querySelectorAll('tbody tr[data-simulation-row-index]')??[])].find(item=>item.getClientRects().length);return row?{name:row.querySelector('th[scope="row"]')?.innerText.trim()??null,expanded:row.getAttribute('aria-expanded'),selected:row.querySelector('button[aria-label^="Deselect "]')!==null}:null};return {activeCustom:document.querySelector('button[aria-label="Select Custom as active dataset"]')?.getAttribute('aria-pressed')??null,pair:document.querySelector('[role="group"][aria-label^="Result comparison,"]')?.getAttribute('aria-label')??null,hiddenCBDPair:document.querySelector('[role="group"][aria-label^="Comparison datasets,"]')?.getAttribute('aria-label')??null,hiddenCBDSelected:document.querySelector('[data-gap-header-slot="selected"]')?.getAttribute('aria-hidden')??null,bomSearch:bom?.querySelector('input[aria-label^="Search BOM"]')?.value??null,routingSearch:routing?.querySelector('input[aria-label^="Search RTG"]')?.value??null,bom:rowState(bom),routing:rowState(routing)}})()`)
  const assertSimulationState = async () => {
    const state = await simulationSummary()
    check(state.activeCustom === 'true'
      && state.pair === 'Result comparison, Before Reference, After Current'
      && state.hiddenCBDPair === 'Comparison datasets, Before Reference, After Custom'
      && state.hiddenCBDSelected === 'false'
      && state.bomSearch === 'MAT-A' && state.routingSearch === 'OP-10'
      && state.bom?.expanded === 'true' && state.bom?.selected === true
      && state.routing?.expanded === 'true' && state.routing?.selected === true,
    'Simulation retains active Custom, comparison pair, independent searches, row selections, and disclosures', state)
  }
  const refresh = async expectedPage => {
    await send('Page.reload', { ignoreCache: true })
    await waitFor(async () => await activePage() === expectedPage, `refresh restores active ${expectedPage}`)
    await waitFor(() => existsVisible('header nav[aria-label="Main navigation"]'), `refreshed ${expectedPage} page shell`)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await waitFor(() => existsVisible('header nav[aria-label="Main navigation"]'), 'application navigation')
  await waitFor(() => existsVisible('#header-prepare-dataset-trigger'), 'Prepare Dataset trigger')
  await clickSelector('#header-prepare-dataset-trigger')
  await clickButtonText('Complete Mock')
  await waitFor(() => existsVisible('section[aria-label="Working dataset controls"]'), 'Master Data workspace')
  await delay(350)

  // Create a complete synthetic Custom role so all pages have three meaningful sources.
  await setMasterRole('Custom')
  await clickSelector('section[aria-label="Working dataset controls"] button[aria-label="Clone from"]')
  await waitFor(() => existsVisible('[role="menu"][aria-label="Clone source"]'), 'Clone source menu')
  await clickButtonText('Current', '[role="menu"][aria-label="Clone source"]')
  await waitFor(() => existsVisible('section[aria-label="Bill of Materials rows"] tbody tr:first-child'), 'cloned Custom BOM')
  await setMasterRole('Current')
  check(await inputValue('section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]') !== null,
    'Complete Mock plus UI Clone seeds synthetic Current, Reference, and Custom data')

  // Seed Master Data local state and prove its focused writer is page-scoped.
  await setMasterRole('Reference')
  const masterSwitch = 'section[aria-label="Working dataset controls"] button[role="switch"]'
  if (await evaluate(`(${visibleExpression(masterSwitch)})?.getAttribute('aria-checked') === 'false'`)) await clickSelector(masterSwitch)
  await clickButtonText('BOM', '[role="group"][aria-label="Master Data table section"]')
  await fillSearch('input[aria-label="Search Master Data"]', 'MAT-A')
  await waitFor(() => existsVisible('section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]'), 'Reference BOM editor')
  const mdPrice = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]'
  const masterSearch = 'input[aria-label="Search Master Data"]'
  await replaceInput(mdPrice, '13.125')
  await fillSearch(masterSearch, 'MAT-A')
  await replaceInput(mdPrice, '13.25')
  await fillSearch(masterSearch, 'MAT-A')
  await assertHeaderHistory(true, false, 'Master Data edit creates its own Undo entry')
  await clickSelector('header button[aria-label="Undo"]')
  await waitFor(async () => { const state = await headerHistory(); return state.undo && state.redo }, 'Master Data local Undo/Redo history')
  await assertHeaderHistory(true, true, 'Master Data retains both Undo and Redo after one local Undo')
  const mdOwner = await ownerAfterFocus(mdPrice)
  check(mdOwner.source !== null && mdOwner.source === mdOwner.header, 'Master Data focused source owns its Selected Value writer', mdOwner)
  await assertMasterState('Reference', true, 'BOM', 'MAT-A')

  // 1. Master Data -> Cost Breakdown.
  await route('Master Data → Cost Breakdown', 'Cost Breakdown')
  await assertHeaderHistory(false, false, 'Cost Breakdown does not inherit Master Data Undo/Redo')
  let initialCBDOrder = await cbdOrder()
  check(initialCBDOrder.length > 0, 'Cost Breakdown default Reference → Current findings are rendered for the sort baseline', initialCBDOrder.slice(0, 6))
  await setCBDRole('After', 'Current', 'Custom')
  await clickButtonText('BOM', '[role="group"][aria-label="Finding type filter"]')
  await clickSelector('button[aria-label="Status"]')
  await waitFor(() => existsVisible('[role="dialog"][aria-label="Status options"]'), 'Status options')
  for (const label of ['Added', 'Removed', 'Unchanged']) await clickLabelText('[role="dialog"][aria-label="Status options"]', label)
  await clickSelector('button[aria-label="Status"]')
  await clickSelector('button[aria-label="Sort"]')
  await waitFor(() => existsVisible('[role="group"][aria-label="Sort findings"]'), 'Sort findings options')
  await clickButtonText('Gap Low → High', '[role="group"][aria-label="Sort findings"]')
  await clickSelector('[data-cbd-sticky-shell] button[aria-label="Collapse"]')
  const configuredCBDStatus = await readCBDStatus()
  check(configuredCBDStatus.length === 4 && configuredCBDStatus.find(item=>item.label==='Changed')?.checked === true
    && configuredCBDStatus.filter(item=>item.label!=='Changed').every(item=>item.checked === false),
  'Cost Breakdown status filter is restricted to Changed before navigation', configuredCBDStatus)
  const cbdFirstChanged = await evaluate(`(()=>[...document.querySelectorAll('table tbody tr[data-candidate-reorder-row][aria-expanded="false"]')].find(row=>row.getClientRects().length)?.getAttribute('data-candidate-reorder-row')??null)()`)
  check(Boolean(cbdFirstChanged), 'CBD Changed findings are available for local state setup', cbdFirstChanged)
  if (!cbdFirstChanged) throw new Error('No changed CBD candidate was available in the synthetic Reference → Custom comparison')
  const cbdRowSelector = `tr[data-candidate-reorder-row=${JSON.stringify(cbdFirstChanged)}]`
  const cbdSelect = `table tbody ${cbdRowSelector} button[aria-label^="Select "]`
  const orderBeforeReorder = await cbdOrder()
  check(orderBeforeReorder.length > 1, 'CBD has multiple Changed candidates for manual reordering', orderBeforeReorder)
  let orderAfterReorder = orderBeforeReorder
  let cbdReorderObserved = false
  if (orderBeforeReorder.length > 1) {
    const dragSource = `tr[data-candidate-reorder-row=${JSON.stringify(orderBeforeReorder[0])}] button[aria-label^="Drag BOM finding"]`
    const dragTarget = `tr[data-candidate-reorder-row=${JSON.stringify(orderBeforeReorder[1])}]`
    await dragSelectors(dragSource, dragTarget)
    try {
      await waitFor(async () => JSON.stringify(await cbdOrder()) !== JSON.stringify(orderBeforeReorder), 'CBD candidate order after a real browser drag', 3000)
      cbdReorderObserved = true
    } catch (error) {
      process.stdout.write(`DIAGNOSTIC CBD drag did not change order: ${error.message}\n`)
    }
    orderAfterReorder = await cbdOrder()
    check(cbdReorderObserved, 'real browser drag creates a CBD manual-order history entry', { before: orderBeforeReorder, after: orderAfterReorder })
    if (cbdReorderObserved) {
      const sourceRow = `tr[data-candidate-reorder-row=${JSON.stringify(orderBeforeReorder[0])}]`
      await clickRowName(sourceRow)
      if (await evaluate(`(${visibleExpression(sourceRow)})?.getAttribute('aria-expanded')==='true'`)) await clickRowName(sourceRow)
    }
  }
  if (cbdReorderObserved) {
    await assertHeaderHistory(true, false, 'CBD reorder owns Header Undo and does not inherit Master Data Redo')
    await clickSelector('header button[aria-label="Undo"]')
    await waitFor(async () => JSON.stringify(await cbdOrder()) === JSON.stringify(orderBeforeReorder), 'CBD Header Undo restores candidate order')
    await assertHeaderHistory(false, true, 'CBD Header Undo creates only CBD Redo availability')
    await clickSelector('header button[aria-label="Redo"]')
    await waitFor(async () => JSON.stringify(await cbdOrder()) === JSON.stringify(orderAfterReorder), 'CBD Header Redo reapplies candidate order')
    await assertHeaderHistory(true, false, 'CBD Header Redo restores only CBD Undo availability')
  }
  await clickSelector(cbdSelect)
  const cbdGap = 'header[aria-label="Cost Breakdown subheader"] [data-selected-number]'
  await clickSelector(cbdGap)
  const cbdHeader = await headerState()
  check(cbdHeader.inputSource === null && cbdHeader.value !== '—', 'Cost Breakdown read-only finding pins its own Selected Value without creating a writer', cbdHeader)
  await clickRowName(cbdRowSelector)
  await waitFor(() => evaluate(`(${visibleExpression(cbdRowSelector)})?.getAttribute('aria-expanded')==='true'`), 'selected expanded CBD finding')
  const configuredCBD = await cbdSummary()
  check(configuredCBD.pair === 'Comparison datasets, Before Reference, After Custom'
    && configuredCBD.type?.startsWith('BOM') && configuredCBD.overview === 'false'
    && configuredCBD.selected > 0 && configuredCBD.expanded > 0
    && configuredCBDStatus.length === 4 && configuredCBDStatus.find(item=>item.label==='Changed')?.checked === true
    && configuredCBDStatus.filter(item=>item.label!=='Changed').every(item=>item.checked === false)
    && await evaluate('document.querySelector(`[data-gap-header-slot="selected"]`)?.getAttribute("aria-hidden") === "false"'),
  'Cost Breakdown local pair, type, status, sort, selected comparison, disclosure, and collapsed overview are set', configuredCBD)

  // 2. Cost Breakdown -> Simulation.
  await route('Cost Breakdown → Simulation', 'Simulation')
  await assertHeaderHistory(false, false, 'Simulation does not inherit CBD reorder history')
  await waitFor(() => existsVisible('section[data-simulation-table="bom"]'), 'Simulation BOM table')
  await clickSelector('button[aria-label="Select Custom as active dataset"]')
  const customPrice = 'section[data-simulation-table="bom"] input[aria-label$="Price in Custom"]'
  await waitFor(() => existsVisible(customPrice), 'Simulation Custom parameter editor')
  const simPriceValue = await replaceInput(customPrice, '18.125')
  check(simPriceValue === '18.125', 'Simulation Custom Working parameter accepts a synthetic exact value', simPriceValue)
  await setSimulationPair('Before', 'Current', 'Reference')
  await setSimulationPair('After', 'Custom', 'Current')
  const simBomSearch = 'section[data-simulation-table="bom"] input[aria-label^="Search BOM"]'
  const simRtgSearch = 'section[data-simulation-table="routing"] input[aria-label^="Search RTG"]'
  await fillSearch(simBomSearch, 'MAT-A')
  await fillSearch(simRtgSearch, 'OP-10')
  for (const [kind, rowSelector, selectPrefix] of [
    ['bom', 'section[data-simulation-table="bom"] tbody tr[data-simulation-row-index]', 'Select BOM row'],
    ['routing', 'section[data-simulation-table="routing"] tbody tr[data-simulation-row-index]', 'Select RTG row']
  ]) {
    const row = await evaluate(`(()=>[...document.querySelectorAll(${JSON.stringify(rowSelector)})].find(item=>item.getClientRects().length)?.getAttribute('data-simulation-row-index')??null)()`)
    if (row === null) throw new Error(`No visible Simulation ${kind} row after synthetic search`)
    const selector = `${rowSelector}[data-simulation-row-index="${row}"]`
    await clickSelector(`section[data-simulation-table="${kind}"] button[aria-label^="${selectPrefix}"]`)
    await clickRowName(selector)
    await waitFor(() => evaluate(`(${visibleExpression(selector)})?.getAttribute('aria-expanded')==='true'`), `expanded Simulation ${kind} row`)
  }
  const simOwner = await ownerAfterFocus(customPrice)
  check(simOwner.source !== null && simOwner.source === simOwner.header, 'Simulation Custom focused source owns its Selected Value writer', simOwner)
  await assertHeaderHistory(true, false, 'Simulation parameter edit creates its own Header Undo entry')
  await assertSimulationState()

  // 3. Simulation -> Master Data.
  await route('Simulation → Master Data', 'Master Data')
  await assertMasterState('Reference', true, 'BOM', 'MAT-A')
  await assertHeaderHistory(true, true, 'returning to Master Data restores its independent Undo/Redo availability')
  const mdOwnerReturn = await ownerAfterFocus(mdPrice)
  check(mdOwnerReturn.source === mdOwnerReturn.header, 'returning to Master Data restores ownership to its visible source', mdOwnerReturn)

  // 4. Master Data -> Simulation.
  await route('Master Data → Simulation', 'Simulation')
  await assertHeaderHistory(true, false, 'returning to Simulation restores its independent Undo availability')
  await assertSimulationState()

  // 5. Simulation -> Cost Breakdown.
  await route('Simulation → Cost Breakdown', 'Cost Breakdown')
  if (cbdReorderObserved) await assertHeaderHistory(true, false, 'returning to CBD restores its independent reorder Undo availability')
  const retainedCBD = await cbdSummary()
  check(retainedCBD.pair === 'Comparison datasets, Before Reference, After Custom'
    && retainedCBD.type?.startsWith('BOM') && retainedCBD.overview === 'false'
    && retainedCBD.selected > 0 && retainedCBD.expanded > 0
    && await evaluate('document.querySelector(`[data-gap-header-slot="selected"]`)?.getAttribute("aria-hidden") === "false"'),
  'returning to Cost Breakdown retains its pair, filters, order, selection, disclosure, and overview state', retainedCBD)
  await check(JSON.stringify(retainedCBD.order) === JSON.stringify(configuredCBD.order), 'Cost Breakdown candidate order remains page-local across navigation', { before: configuredCBD.order, after: retainedCBD.order })
  const retainedCBDStatus = await readCBDStatus()
  check(JSON.stringify(retainedCBDStatus) === JSON.stringify(configuredCBDStatus), 'Cost Breakdown status filter remains page-local across navigation', { before: configuredCBDStatus, after: retainedCBDStatus })

  // 6. Cost Breakdown -> Master Data.
  await route('Cost Breakdown → Master Data', 'Master Data')
  await assertHeaderHistory(true, true, 'returning to Master Data retains only its own history availability')
  await assertMasterState('Reference', true, 'BOM', 'MAT-A')
  await clickSelector('header button[aria-label="Redo"]')
  await waitFor(async () => { const state = await headerHistory(); return state.undo && !state.redo }, 'Master Data Redo restores its active history position')
  await assertHeaderHistory(true, false, 'Master Data Header Redo acts on Master Data history')

  // Actual Master Data refresh: route persists, view state returns to defaults, Working data survives.
  await setMasterRole('Current')
  await fillSearch('input[aria-label="Search Master Data"]', '')
  const currentPrice = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]'
  const persistedMasterValue = await replaceInput(currentPrice, '421.375')
  check(persistedMasterValue === '421.375', 'Master Data Working source is edited before refresh', persistedMasterValue)
  await setMasterRole('Reference')
  await fillSearch('input[aria-label="Search Master Data"]', 'OP-10')
  await clickButtonText('RTG', '[role="group"][aria-label="Master Data table section"]')
  if (await evaluate(`(${visibleExpression(masterSwitch)})?.getAttribute('aria-checked')==='false'`)) await clickSelector(masterSwitch)
  // Keep the canonical master preference non-default before refresh.
  await clickSelector(masterSwitch)
  const preRefreshMD = await evaluate(`(()=>({role:document.querySelector('[role="group"][aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label'),edit:document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked'),view:document.querySelector('[role="group"][aria-label="Master Data table section"] button[aria-pressed="true"]')?.innerText.trim(),search:document.querySelector('input[aria-label="Search Master Data"]')?.value}))()`)
  check(preRefreshMD.role?.startsWith('Reference —') && preRefreshMD.edit === 'false' && preRefreshMD.view === 'RTG' && preRefreshMD.search === 'OP-10', 'Master Data has non-default page state before actual refresh', preRefreshMD)
  await refresh('Master Data')
  const postRefreshMD = await evaluate(`(()=>({role:document.querySelector('[role="group"][aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label'),edit:document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked'),view:document.querySelector('[role="group"][aria-label="Master Data table section"] button[aria-pressed="true"]')?.innerText.trim(),search:document.querySelector('input[aria-label="Search Master Data"]')?.value,value:document.querySelector('section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]')?.value}))()`)
  check(postRefreshMD.value === '421.38', 'Master Data refresh renders the compact rounded display for its preserved Working value', postRefreshMD.value)
  await clickSelector(currentPrice)
  const persistedMasterValueAfterFocus = await inputValue(currentPrice)
  check(await activePage() === 'Master Data' && postRefreshMD.role?.startsWith('Current —') && postRefreshMD.edit === 'true'
    && postRefreshMD.view === 'All' && postRefreshMD.search === '' && persistedMasterValueAfterFocus === '421.375',
  'Master Data refresh preserves active page and exact Working value while restoring Current/Edit/All/search defaults',
  { ...postRefreshMD, exactValueAfterFocus: persistedMasterValueAfterFocus })

  // Capture canonical CBD ordering, create temporary local state, and refresh CBD in place.
  await route('Master Data after refresh → Cost Breakdown', 'Cost Breakdown')
  const canonicalCBDOrder = await cbdOrder()
  const canonicalCBD = await cbdSummary()
  const canonicalCBDStatus = await readCBDStatus()
  check(canonicalCBD.pair === 'Comparison datasets, Before Reference, After Current'
    && canonicalCBD.type?.startsWith('All') && canonicalCBD.overview === 'true'
    && canonicalCBDStatus.length === 4 && canonicalCBDStatus.every(status => status.checked),
  'Cost Breakdown initializes to canonical pair, all findings/statuses, and expanded overview', canonicalCBD)
  await setCBDRole('After', 'Current', 'Custom')
  await clickButtonText('BOM', '[role="group"][aria-label="Finding type filter"]')
  await clickSelector('button[aria-label="Status"]')
  await waitFor(() => existsVisible('[role="dialog"][aria-label="Status options"]'), 'CBD status options before refresh')
  for (const label of ['Added', 'Removed', 'Unchanged']) await clickLabelText('[role="dialog"][aria-label="Status options"]', label)
  await clickSelector('button[aria-label="Status"]')
  const refreshCBDStatus = await readCBDStatus()
  check(refreshCBDStatus.length === 4 && refreshCBDStatus.find(item=>item.label==='Changed')?.checked === true
    && refreshCBDStatus.filter(item=>item.label!=='Changed').every(item=>item.checked === false),
  'CBD refresh fixture has a non-default status selection before reload', refreshCBDStatus)
  await clickSelector('button[aria-label="Sort"]')
  await waitFor(() => existsVisible('[role="group"][aria-label="Sort findings"]'), 'CBD sort options before refresh')
  await clickButtonText('Gap Low → High', '[role="group"][aria-label="Sort findings"]')
  await clickSelector('[data-cbd-sticky-shell] button[aria-label="Collapse"]')
  const refreshCBDRow = await evaluate(`(()=>[...document.querySelectorAll('table tbody tr[data-candidate-reorder-row][aria-expanded="false"]')].find(row=>row.getClientRects().length)?.getAttribute('data-candidate-reorder-row')??null)()`)
  if (!refreshCBDRow) throw new Error('No Changed CBD candidate available before refresh')
  const refreshCBDRowSelector = `tr[data-candidate-reorder-row=${JSON.stringify(refreshCBDRow)}]`
  await clickSelector(`table tbody ${refreshCBDRowSelector} button[aria-label^="Select "]`)
  await clickRowName(refreshCBDRowSelector)
  await waitFor(() => evaluate(`(${visibleExpression(refreshCBDRowSelector)})?.getAttribute('aria-expanded')==='true'`), 'selected expanded CBD row before refresh')
  await refresh('Cost Breakdown')
  const postRefreshCBD = await cbdSummary()
  const postRefreshCBDStatus = await readCBDStatus()
  check(postRefreshCBD.pair === 'Comparison datasets, Before Reference, After Current'
    && postRefreshCBD.type?.startsWith('All') && postRefreshCBD.overview === 'true'
    && postRefreshCBDStatus.length === 4 && postRefreshCBDStatus.every(status => status.checked)
    && postRefreshCBD.selected === 0 && postRefreshCBD.expanded === 0
    && JSON.stringify(postRefreshCBD.order) === JSON.stringify(canonicalCBDOrder),
  'Cost Breakdown refresh restores canonical view/sort and clears transient selection/disclosure without resetting data', postRefreshCBD)

  // Simulation refresh resets temporary context while retaining Working parameters.
  await route('Cost Breakdown after refresh → Simulation', 'Simulation')
  await waitFor(() => existsVisible('section[data-simulation-table="bom"]'), 'Simulation after refresh')
  const simCustomPrice = 'section[data-simulation-table="bom"] input[aria-label$="Price in Custom"]'
  await waitFor(() => existsVisible(simCustomPrice), 'default Simulation Custom source')
  const persistedSimulationValue = await replaceInput(simCustomPrice, '18.125')
  check(persistedSimulationValue === '18.125', 'Simulation Custom Working parameter is set before refresh', persistedSimulationValue)
  await setSimulationPair('Before', 'Current', 'Reference')
  await setSimulationPair('After', 'Custom', 'Current')
  await fillSearch('section[data-simulation-table="bom"] input[aria-label^="Search BOM"]', 'MAT-A')
  await fillSearch('section[data-simulation-table="routing"] input[aria-label^="Search RTG"]', 'OP-10')
  for (const [kind, prefix] of [['bom', 'Select BOM row'], ['routing', 'Select RTG row']]) {
    const section = `section[data-simulation-table="${kind}"]`
    const row = `${section} tbody tr[data-simulation-row-index]`
    await clickSelector(`${section} button[aria-label^="${prefix}"]`)
    await clickRowName(row)
    await waitFor(() => evaluate(`(${visibleExpression(row)})?.getAttribute('aria-expanded')==='true'`), `${kind} state before Simulation refresh`)
  }
  await refresh('Simulation')
  const postRefreshSimulation = await simulationSummary()
  const simulationDisplayAfterRefresh = await inputValue(simCustomPrice)
  check(simulationDisplayAfterRefresh === '18.13', 'Simulation refresh renders the compact rounded display for its preserved Working value', simulationDisplayAfterRefresh)
  await clickSelector(simCustomPrice)
  const simulationValueAfterRefresh = await evaluate(`(()=>{const input=${visibleExpression(simCustomPrice)};return {value:input?.value??null,focused:document.activeElement===input,activeTag:document.activeElement?.tagName??null}})()`)
  check(postRefreshSimulation.activeCustom === 'true'
    && postRefreshSimulation.pair === 'Result comparison, Before Current, After Custom'
    && postRefreshSimulation.bomSearch === '' && postRefreshSimulation.routingSearch === ''
    && postRefreshSimulation.bom?.expanded === 'false' && postRefreshSimulation.bom?.selected === false
    && postRefreshSimulation.routing?.expanded === 'false' && postRefreshSimulation.routing?.selected === false
    && simulationValueAfterRefresh.value === '18.125' && simulationValueAfterRefresh.focused,
  'Simulation refresh preserves active page and Custom Working value while restoring Custom/Current→Custom and clearing temporary UI state',
  { ...postRefreshSimulation, compactDisplay: simulationDisplayAfterRefresh, focusedEditor: simulationValueAfterRefresh })

  check(browserErrors.length === 0, 'no browser errors or warnings', browserErrors)
  if (failures.length) {
    process.stdout.write(`Round 5 cross-page real-browser verification FAIL: ${failures.length}/${count} assertions failed; six navigation directions and three page refresh contracts executed\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`Round 5 cross-page real-browser verification PASS: ${count} assertions; six navigation directions and three page refresh contracts\n`)
  }
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await delay(100)
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
}
