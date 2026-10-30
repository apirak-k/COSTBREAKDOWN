import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import net from 'node:net'

if (typeof WebSocket !== 'function') throw new Error('This verifier requires Node.js with built-in WebSocket support.')

function findChrome() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH]
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  for (const candidate of candidates.filter(Boolean)) if (existsSync(candidate)) return candidate
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
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-md-reorder-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-md-reorder-evidence-'))
const vite = spawn(process.execPath, [resolve(repository, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
  cwd: repository, stdio: ['ignore', 'pipe', 'pipe']
})
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1920,4000', 'about:blank']
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
  const visible = selector => `(()=>[...document.querySelectorAll(${JSON.stringify(selector)})].find(element => {
    const rect = element.getBoundingClientRect()
    return element.getClientRects().length > 0 && rect.width > 0 && rect.height > 0
  }))()`
  const clickSelector = async (selector, modifiers = 0) => {
    const point = await evaluate(`(()=>{const element=${visible(selector)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Visible browser target not found: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1, modifiers })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1, modifiers })
    await delay(120)
  }
  const clickTextButton = async label => {
    const selector = `button`
    const point = await evaluate(`(()=>{const element=[...document.querySelectorAll(${JSON.stringify(selector)})].find(item => item.getClientRects().length && item.innerText.trim() === ${JSON.stringify(label)});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Button not found by visible text: ${label}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
    await delay(150)
  }
  const beginDrag = async (section, sourceId, movingIds = [sourceId]) => {
    const started = await evaluate(`(()=>{
      const row=[...document.querySelector('section[aria-label="${section}"] tbody').querySelectorAll('tr[data-master-data-row-id]')].find(item=>item.dataset.masterDataRowId===${JSON.stringify(sourceId)})
      const grip=row?.querySelector('td:last-child button[draggable="true"]')
      return grip?.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))??false
    })()`)
    if (!started) throw new Error(`Could not start browser drag from ${section} row ${sourceId}`)
    await delay(120)
    return {
      items: [
        { mimeType: 'text/plain', data: sourceId },
        { mimeType: 'application/x-costbreakdown-row-ids', data: JSON.stringify(movingIds) }
      ],
      dragOperationsMask: 16
    }
  }
  const dragEnterOver = async (point, data) => {
    await send('Input.dispatchDragEvent', { type: 'dragEnter', ...point, data })
    await send('Input.dispatchDragEvent', { type: 'dragOver', ...point, data })
    await delay(80)
  }
  const finishSyntheticDrag = async (section, sourceId) => evaluate(`(()=>{
    const row=[...document.querySelector('section[aria-label="${section}"] tbody').querySelectorAll('tr[data-master-data-row-id]')].find(item=>item.dataset.masterDataRowId===${JSON.stringify(sourceId)})
    return row?.querySelector('td:last-child button[draggable="true"]')?.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))??false
  })()`)
  const rowStates = section => evaluate(`(()=>{
    const rows=[...document.querySelector('section[aria-label="${section}"] tbody').querySelectorAll('tr[data-master-data-row-id]')]
    return rows.map(row=>{
      const r=row.getBoundingClientRect(), grip=row.querySelector('td:last-child button[draggable="true"]'),g=grip?.getBoundingClientRect()
      return {id:row.dataset.masterDataRowId,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,shadow:getComputedStyle(row).boxShadow,inlineShadow:row.style.boxShadow,selected:row.getAttribute('aria-selected')==='true',gripColor:grip?getComputedStyle(grip).color:null,gripRect:g?{x:g.x,y:g.y,width:g.width,height:g.height}:null}
    })
  })()`)
  const selectionPoint = (section, id) => evaluate(`(()=>{const row=[...document.querySelector('section[aria-label="${section}"] tbody').querySelectorAll('tr[data-master-data-row-id]')].find(item=>item.dataset.masterDataRowId===${JSON.stringify(id)});const button=row?.querySelector('th[scope="row"] button[aria-pressed]');if(!button)return null;const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  const rowPoint = (section, id, fraction) => evaluate(`(()=>{const row=[...document.querySelector('section[aria-label="${section}"] tbody').querySelectorAll('tr[data-master-data-row-id]')].find(item=>item.dataset.masterDataRowId===${JSON.stringify(id)});if(!row)return null;const r=row.getBoundingClientRect();return{x:r.x+r.width/2,y:r.top+r.height*${fraction}}})()`)
  const move = point => send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
  const checks = []
  const verify = (condition, message, detail) => {
    checks.push({ passed: Boolean(condition), message, detail })
    process.stdout.write(`${condition ? 'PASS' : 'FAIL'} ${message}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}\n`)
  }
  const allShadowsClear = states => states.every(row => row.shadow === 'none')
  const expectedDropOrder = (ids, movingIds, targetId, position) => {
    const moving = ids.filter(id => movingIds.includes(id))
    const remainder = ids.filter(id => !movingIds.includes(id))
    const targetIndex = remainder.indexOf(targetId)
    remainder.splice(targetIndex + (position === 'after' ? 1 : 0), 0, ...moving)
    return remainder
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4000, deviceScaleFactor: 1, mobile: false })
  await waitFor(async () => (await evaluate('document.title')).includes('COSTBREAKDOWN'), 'application')
  await waitFor(async () => await evaluate(`[...document.querySelectorAll('button')].some(button => button.getClientRects().length && button.innerText.trim() === 'Master Data')`), 'Master Data navigation')
  await clickTextButton('Master Data')
  await waitFor(() => evaluate(`!!document.querySelector('section[aria-label="Working dataset controls"]')`), 'Master Data workspace')
  if (await evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked')==='false'`)) {
    await clickSelector('section[aria-label="Working dataset controls"] button[role="switch"]')
  }
  await waitFor(() => evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked')==='true'`), 'Master Data Edit mode')
  await clickSelector('button[aria-label="Prepare Dataset"]')
  await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some(button => button.getClientRects().length && button.innerText.trim() === 'Complete Mock')`), 'Complete Mock development action')
  await clickTextButton('Complete Mock')
  await delay(250)
  await clickSelector('button[aria-label="Prepare Dataset"]')
  await clickSelector('[role="group"][aria-label="Master Data table section"] button:last-child')

  const tables = [
    { name: 'BOM', section: 'Bill of Materials rows' },
    { name: 'Routing', section: 'Routing rows' },
    { name: 'Work Center', section: 'Work Centers rows' }
  ]
  await waitFor(async () => (await Promise.all(tables.map(table => rowStates(table.section)))).every(rows => rows.length >= 4), 'four source rows in each Master Data table')
  await delay(200)

  for (const table of tables) {
    const initial = await rowStates(table.section)
    const initialIds = initial.map(row => row.id)
    const sourceId = initialIds[0]
    const firstTargetId = initialIds[1]
    const finalTargetId = initialIds[2]
    const sourceGrip = initial[0].gripRect
    const idleColor = initial[0].gripColor
    verify(idleColor === 'rgb(148, 163, 184)', `${table.name}: idle reorder grip is light`, { color: idleColor })

    await move({ x: sourceGrip.x + sourceGrip.width / 2, y: sourceGrip.y + sourceGrip.height / 2 })
    await delay(80)
    const hoverColor = (await rowStates(table.section)).find(row => row.id === sourceId)?.gripColor
    verify(hoverColor === 'rgb(51, 65, 85)', `${table.name}: direct grip hover is dark`, { color: hoverColor })
    await move({ x: 5, y: 5 })
    await delay(80)

    const firstTop = await rowPoint(table.section, finalTargetId, 0.2)
    const singleDragData = await beginDrag(table.section, sourceId)
    await dragEnterOver(firstTop, singleDragData)

    let dragStates = await rowStates(table.section)
    const firstLine = dragStates.find(row => row.id === finalTargetId)
    const activeGripColor = dragStates.find(row => row.id === sourceId)?.gripColor
    verify(Boolean(firstLine && firstLine.shadow.includes('rgb(226, 232, 240)') && firstLine.shadow.includes('0px 2px') && !firstLine.shadow.includes('-2px')), `${table.name}: top-half drag shows a 2px normal-divider line at row top`, { shadow: firstLine?.shadow, inlineShadow: firstLine?.inlineShadow })
    verify(activeGripColor === 'rgb(51, 65, 85)', `${table.name}: active dragged grip remains dark`, { color: activeGripColor })
    verify(dragStates.find(row => row.id === finalTargetId)?.height === initial.find(row => row.id === finalTargetId)?.height, `${table.name}: top indicator does not change row height`)
    await writeFile(join(evidenceDir, `${table.name.toLowerCase().replaceAll(' ', '-')}-top.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).result.data, 'base64'))

    const intermediateBottom = await rowPoint(table.section, firstTargetId, 0.8)
    await dragEnterOver(intermediateBottom, singleDragData)
    dragStates = await rowStates(table.section)
    const intermediateLine = dragStates.find(row => row.id === firstTargetId)
    verify(dragStates.find(row => row.id === finalTargetId)?.shadow === 'none' && Boolean(intermediateLine?.shadow.includes('rgb(226, 232, 240)') && intermediateLine.shadow.includes('-2px')), `${table.name}: bottom-half preview follows the new target and position`, { previousTargetShadow: dragStates.find(row => row.id === finalTargetId)?.shadow, newTargetShadow: intermediateLine?.shadow })

    const finalBottom = await rowPoint(table.section, finalTargetId, 0.8)
    await dragEnterOver(finalBottom, singleDragData)
    dragStates = await rowStates(table.section)
    const bottomLine = dragStates.find(row => row.id === finalTargetId)
    verify(Boolean(bottomLine && bottomLine.shadow.includes('rgb(226, 232, 240)') && bottomLine.shadow.includes('-2px')), `${table.name}: bottom-half drag shows a 2px normal-divider line at row bottom`, { shadow: bottomLine?.shadow })
    await writeFile(join(evidenceDir, `${table.name.toLowerCase().replaceAll(' ', '-')}-bottom.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).result.data, 'base64'))

    const expectedOrder = expectedDropOrder(initialIds, [sourceId], finalTargetId, 'after')
    await send('Input.dispatchDragEvent', { type: 'drop', ...finalBottom, data: singleDragData })
    await finishSyntheticDrag(table.section, sourceId)
    await delay(250)
    let afterDrop = await rowStates(table.section)
    const actualOrder = afterDrop.map(row => row.id)
    verify(JSON.stringify(actualOrder) === JSON.stringify(expectedOrder), `${table.name}: dropped row order matches the previewed after position`, { expectedOrder, actualOrder })
    verify(allShadowsClear(afterDrop), `${table.name}: drop clears the indicator`)
    verify(afterDrop.find(row => row.id === sourceId)?.gripColor === idleColor, `${table.name}: dragged grip returns light after drop and pointer leave`, { color: afterDrop.find(row => row.id === sourceId)?.gripColor })

    const cancelSourceId = actualOrder[0]
    const cancelTargetId = actualOrder[2]
    const cancelTop = await rowPoint(table.section, cancelTargetId, 0.2)
    const cancelDragData = await beginDrag(table.section, cancelSourceId)
    await dragEnterOver(cancelTop, cancelDragData)
    verify((await rowStates(table.section)).find(row => row.id === cancelTargetId)?.shadow !== 'none', `${table.name}: cancel setup displays a valid target preview`)
    await dragEnterOver({ x: 5, y: 5 }, cancelDragData)
    verify(allShadowsClear(await rowStates(table.section)), `${table.name}: leaving valid target area clears the indicator`)
    await send('Input.dispatchDragEvent', { type: 'dragCancel', x: 5, y: 5, data: cancelDragData })
    await finishSyntheticDrag(table.section, cancelSourceId)
    await delay(180)
    afterDrop = await rowStates(table.section)
    verify(JSON.stringify(afterDrop.map(row => row.id)) === JSON.stringify(actualOrder) && allShadowsClear(afterDrop), `${table.name}: canceled drag ends without reordering or a lingering indicator`)

    const firstSelectionPoint = await selectionPoint(table.section, actualOrder[0])
    const secondSelectionPoint = await selectionPoint(table.section, actualOrder[1])
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...firstSelectionPoint })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...firstSelectionPoint, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...firstSelectionPoint, button: 'left', clickCount: 1 })
    await delay(80)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...secondSelectionPoint })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...secondSelectionPoint, button: 'left', clickCount: 1, modifiers: 4 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...secondSelectionPoint, button: 'left', clickCount: 1, modifiers: 4 })
    await delay(120)
    let selectedStates = await rowStates(table.section)
    const movingIds = actualOrder.slice(0, 2)
    verify(movingIds.every(id => selectedStates.find(row => row.id === id)?.selected), `${table.name}: two rows remain selected for group reorder`, { movingIds })
    await move({ x: 5, y: 5 })
    selectedStates = await rowStates(table.section)
    verify(movingIds.every(id => selectedStates.find(row => row.id === id)?.gripColor === idleColor), `${table.name}: selection alone does not darken reorder grips`)

    const groupTargetId = actualOrder[3]
    const groupTargetTop = await rowPoint(table.section, groupTargetId, 0.2)
    const groupDragData = await beginDrag(table.section, movingIds[0], movingIds)
    const movingTargetPoint = await rowPoint(table.section, movingIds[1], 0.5)
    await dragEnterOver(movingTargetPoint, groupDragData)
    verify(allShadowsClear(await rowStates(table.section)), `${table.name}: selected moving-group rows do not receive a drop indicator`)
    await dragEnterOver(groupTargetTop, groupDragData)
    let groupStates = await rowStates(table.section)
    verify(groupStates.find(row => row.id === groupTargetId)?.shadow.includes('rgb(226, 232, 240)') === true, `${table.name}: multi-row drag shows the valid normal-divider target line`)
    verify(movingIds.every(id => groupStates.find(row => row.id === id)?.gripColor === 'rgb(51, 65, 85)'), `${table.name}: all actively dragged group grips are dark`)
    const groupTargetBottom = await rowPoint(table.section, groupTargetId, 0.8)
    await dragEnterOver(groupTargetBottom, groupDragData)
    groupStates = await rowStates(table.section)
    verify(groupStates.find(row => row.id === groupTargetId)?.shadow.includes('rgb(226, 232, 240)') === true && groupStates.find(row => row.id === groupTargetId)?.shadow.includes('-2px') === true, `${table.name}: multi-row bottom preview is visible`)
    const expectedGroupOrder = expectedDropOrder(actualOrder, movingIds, groupTargetId, 'after')
    await send('Input.dispatchDragEvent', { type: 'drop', ...groupTargetBottom, data: groupDragData })
    await finishSyntheticDrag(table.section, movingIds[0])
    await delay(250)
    groupStates = await rowStates(table.section)
    const groupOrder = groupStates.map(row => row.id)
    verify(JSON.stringify(groupOrder) === JSON.stringify(expectedGroupOrder), `${table.name}: multi-row drop preserves source order and matches preview`, { expectedGroupOrder, groupOrder })
    verify(allShadowsClear(groupStates), `${table.name}: multi-row drop clears the indicator`)
    verify(movingIds.every(id => groupStates.find(row => row.id === id)?.gripColor === idleColor), `${table.name}: selected rows return to light grips after the active drag ends`)
  }

  verify(browserErrors.length === 0, 'Master Data reorder interactions produce no browser errors', browserErrors)
  process.stdout.write(`Evidence screenshots: ${evidenceDir}\n`)
  const failed = checks.filter(check => !check.passed)
  process.stdout.write(`\n${checks.length - failed.length}/${checks.length} PASS\n`)
  if (failed.length) {
    process.stderr.write(`Failures: ${JSON.stringify(failed, null, 2)}\n`)
    process.exitCode = 1
  }
} finally {
  try { client?.close() } catch {}
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await rm(profile, { recursive: true, force: true })
}
