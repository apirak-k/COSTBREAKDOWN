import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-master-selected-value-'))
const evidenceDir = await mkdtemp(join(tmpdir(), 'costbreakdown-master-selected-evidence-'))
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
    const point = await evaluate(`(()=>{const element=${visibleExpression(selector)};if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Visible browser target not found: ${selector}`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await delay(400)
    return point
  }
  const clickTextButton = async label => {
    const point = await evaluate(`(()=>{const element=[...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.innerText.trim() === ${JSON.stringify(label)});if(!element)return null;const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
    if (!point) throw new Error(`Button not found by visible text: ${label}`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(180)
  }
  const inputValue = selector => evaluate(`(${visibleExpression(selector)})?.value ?? null`)
  const textContent = selector => evaluate(`(${visibleExpression(selector)})?.textContent?.trim() ?? null`)
  const replaceInput = async (selector, text, modifiers = 4) => {
    await clickSelector(selector)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.insertText', { text })
    await delay(150)
    return inputValue(selector)
  }
  const typeHeaderValue = async text => {
    const selector = 'header [data-header-value] input[aria-label="Selected value"]'
    const value = await replaceInput(selector, text)
    return value
  }
  const pressKey = async (key, { shift = false } = {}) => {
    const modifiers = shift ? 8 : 0
    const code = key === ' ' ? 'Space' : key
    const virtualKey = key === 'Enter' ? 13 : key === ' ' ? 32 : undefined
    const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, text, unmodifiedText: text })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey })
    await delay(120)
  }
  const setViewport = async (width, height = 1600) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await delay(300)
  }
  const saveScreenshot = async name => {
    const captured = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(join(evidenceDir, `${name}.png`), Buffer.from(captured.result.data, 'base64'))
  }
  const geometry = async expression => evaluate(expression)
  const checks = []
  const verify = (condition, message, detail) => {
    checks.push({ passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) })
    const status = condition ? 'PASS' : 'FAIL'
    process.stdout.write(`${status} ${message}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}\n`)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false })
  await waitFor(async () => (await evaluate('document.title')).includes('COSTBREAKDOWN'), 'application')
  await waitFor(() => existsVisible('header [data-header-value] [data-selected-value-output]'), 'idle Header Value')
  verify(
    await textContent('header [data-header-value] [data-selected-value-output]') === '—'
      && await inputValue('header [data-header-value] input[aria-label="Selected value"]') === null
      && await evaluate('document.querySelectorAll("header [data-header-value] [data-numeric-stepper]").length === 0'),
    'Header Value starts empty when no numeric value is active'
  )
  await waitFor(async () => existsVisible('button') && await evaluate(`[...document.querySelectorAll('button')].some(button => button.getClientRects().length && button.innerText.trim() === 'Master Data')`), 'Master Data navigation')
  await clickTextButton('Master Data')
  await waitFor(() => existsVisible('section[aria-label="Working dataset controls"]'), 'Master Data workspace')
  const isReadOnly = await evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked') === 'false'`)
  if (isReadOnly) await clickSelector('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked') === 'true'`), 'Master Data Edit mode')
  await clickSelector('[role="group"][aria-label="Master Data table section"] button:last-child')
  await delay(250)

  const roleButton = role => `section[aria-label="Working dataset controls"] [role="group"][aria-label="Master Data workspace"] button[aria-label^=${JSON.stringify(`${role} —`)}]`
  const chooseRole = async role => {
    await clickSelector(roleButton(role))
    await waitFor(() => evaluate(`(${visibleExpression(roleButton(role))})?.getAttribute('aria-pressed') === 'true'`), `${role} dataset`)
    await delay(300)
  }
  const openSizing = async () => {
    await clickSelector('section[aria-label="Working dataset controls"] button[aria-label="Sizing"]')
    await waitFor(() => existsVisible('[role="dialog"][aria-labelledby="sizing-modal-title"]'), 'Dataset Sizing dialog')
  }
  const dialogInput = label => `[role="dialog"] input[aria-label=${JSON.stringify(label)}]`
  const setCounts = async ({ fractionalProbe = false, headerCountSelection = false } = {}) => {
    const bom = dialogInput('Bill of Materials')
    const wc = dialogInput('Work Centers')
    const routing = dialogInput('Routing')
    if (fractionalProbe) {
      const typed = await replaceInput(bom, '1.5')
      verify(typed === '', 'integer Dataset Sizing editor rejects a fractional count draft', { inputValue: typed })
    }
    for (const selector of [bom, wc, routing]) {
      await replaceInput(selector, '1')
      assert.equal(await inputValue(selector), '1', `Dataset Sizing count accepts integer 1 (${selector})`)
    }
    if (headerCountSelection) {
      await clickSelector(bom)
      const headerSelector = '[role="dialog"] [data-header-value] input[aria-label="Selected value"]'
      const selectedValue = await inputValue(headerSelector)
      assert.equal(selectedValue, '1', 'Header Value reflects the selected integer sizing draft')
      verify(await evaluate('![...document.querySelectorAll("[role=dialog] [data-header-value]")].some(value => value.textContent.includes("%"))'), 'integer sizing source has no percentage suffix')
      const fractionalHeaderDraft = await replaceInput(headerSelector, '1.5')
      verify(!fractionalHeaderDraft?.includes('.'), 'integer sizing Header editor rejects a fractional count draft', { inputValue: fractionalHeaderDraft })
      await clickSelector(bom)
      verify(await inputValue(bom) === '1', 'rejected Header fraction does not change the row-count source', { sourceValue: await inputValue(bom) })
      const acceptedHeaderDraft = await replaceInput(headerSelector, '2')
      await clickSelector(bom)
      assert.equal(await inputValue(bom), '2', 'Header accepts a whole integer sizing count and writes through to its source')
      assert.equal(await inputValue(headerSelector), '2', 'Header displays the accepted integer sizing source')
      verify(acceptedHeaderDraft === '2', 'Header integer editor retains the accepted whole count', { inputValue: acceptedHeaderDraft })
    }
  }
  const readSubgroupGeometry = async kind => {
    const root = kind === 'dialog'
      ? '[role="dialog"] section[aria-label="Dataset metadata"] > div.grid'
      : 'section[aria-label="Working dataset controls"] dl'
    return geometry(`(()=>{
      const root=document.querySelector(${JSON.stringify(root)}); if(!root)return null
      const wanted=['UOM','Selling Price (THB)','SG&A']
      const entries=wanted.map(label=>{
        const children=[...root.children]
        const item=children.find(child=>{
          const labelNode=child.querySelector(${JSON.stringify(kind === 'dialog' ? 'label' : 'dt')})
          return (labelNode?.textContent||'').replace(/\\s*:\\s*$/,'').trim()===label
        })
        if(!item)return {label,width:0}
        const rect=item.getBoundingClientRect()
        const labelNode=item.querySelector(${JSON.stringify(kind === 'dialog' ? 'label' : 'dt')})
        const editor=item.querySelector('input, [data-selected-number]')
        const labelRect=labelNode?.getBoundingClientRect()
        const editorRect=editor?.getBoundingClientRect()
        return {label,width:rect.width,left:rect.left,right:rect.right,labelRight:labelRect?.right??null,editorLeft:editorRect?.left??null,editorWidth:editorRect?.width??null}
      })
      const total=entries.reduce((sum,item)=>sum+item.width,0)
      return {entries,total,ratios:entries.map(item=>total?item.width/total:0)}
    })()`)
  }
  const verifyResponsiveUsability = async (kind, width) => {
    await setViewport(width, 1500)
    const root = kind === 'dialog'
      ? '[role="dialog"] section[aria-label="Dataset metadata"] > div.grid'
      : 'section[aria-label="Working dataset controls"] dl'
    const result = await geometry(`(()=>{
      const root=document.querySelector(${JSON.stringify(root)});if(!root)return null
      const wanted=['UOM','Selling Price (THB)','SG&A']
      const children=[...root.children]
      return {docWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,fields:wanted.map(label=>{
        const item=children.find(child=>(child.querySelector(${JSON.stringify(kind === 'dialog' ? 'label' : 'dt')})?.textContent||'').replace(/\\s*:\\s*$/,'').trim()===label)
        const editor=item?.querySelector('input,[data-selected-number]')
        const labelNode=item?.querySelector(${JSON.stringify(kind === 'dialog' ? 'label' : 'dt')})
        const a=item?.getBoundingClientRect(),b=editor?.getBoundingClientRect(),c=labelNode?.getBoundingClientRect()
        return {label,width:a?.width??0,inputWidth:b?.width??0,labelRight:c?.right??0,inputLeft:b?.left??0}
      })}
    })()`)
    const usable = result && result.docWidth <= result.viewport + 1 && result.fields.every(field => field.width > 0 && field.inputWidth >= 32 && field.inputLeft >= field.labelRight - 2)
    verify(usable, `${kind} metadata remains usable at ${width}px`, result)
  }
  const checkSizingHeaderAccess = async ({ role, productName, uom, sellingPrice, sgaPercent }) => {
    const dialogSelector = '[role="dialog"][aria-labelledby="sizing-modal-title"]'
    const headerSelector = `${dialogSelector} [data-header-value] input[aria-label="Selected value"]`
    await clickSelector(dialogInput('SG&A'))
    await pressKey('Tab')
    const afterTabLeavesSource = await evaluate(`(()=>({
      activeLabel:document.activeElement?.getAttribute('aria-label')??null,
      headerInput:!!document.querySelector(${JSON.stringify(headerSelector)}),
      output:document.querySelector(${JSON.stringify(`${dialogSelector} [data-selected-value-output]`)})?.textContent.trim()??null,
      spinner:document.querySelectorAll(${JSON.stringify(`${dialogSelector} [data-numeric-stepper]`)}).length
    }))()`)
    verify(!afterTabLeavesSource?.headerInput && afterTabLeavesSource.output === '—' && afterTabLeavesSource.spinner === 0,
      `${role} Dataset Sizing clears Header after Tab moves focus outside its selected source`, afterTabLeavesSource)

    await clickSelector(dialogInput('SG&A'))
    const beforeMouseClick = await geometry(`(()=>{const h=document.querySelector(${JSON.stringify(headerSelector)}),d=document.querySelector(${JSON.stringify(dialogSelector)});if(!h||!d)return null;const r=h.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);return {headerRect:{x:r.x,y:r.y,width:r.width,height:r.height},headerVisible:!!h.getClientRects().length,headerText:h.value,topElement:{tag:top?.tagName??null,role:top?.getAttribute('role')??null,label:top?.getAttribute('aria-label')??null},topIsHeader:top===h||h.contains(top),topWithinDialog:d.contains(top)}})()`)
    await saveScreenshot(`${role.toLowerCase()}-sizing-header-access`)
    await clickSelector(headerSelector)
    const afterMouseClick = await geometry(`(()=>({dialogOpen:!!document.querySelector(${JSON.stringify(dialogSelector)}),headerEditorPresent:!!document.querySelector(${JSON.stringify(headerSelector)}),headerFocused:document.activeElement===document.querySelector(${JSON.stringify(headerSelector)}),headerValue:document.querySelector(${JSON.stringify(headerSelector)})?.value??null,focusLabel:document.activeElement?.getAttribute('aria-label')??null}))()`)
    const mouseAccessible = Boolean(afterMouseClick?.dialogOpen && afterMouseClick?.headerFocused)
    verify(mouseAccessible, `${role} Dataset Sizing Header Value is mouse accessible while dialog is open`, {
      beforeClick: beforeMouseClick,
      afterClick: afterMouseClick
    })

    if (!afterMouseClick?.dialogOpen) {
      await openSizing()
      await replaceInput('[role="dialog"] #dataset-sizing-product-name', productName)
      await replaceInput('[role="dialog"] #dataset-sizing-uom', uom)
      await replaceInput(dialogInput('Selling Price (THB)'), sellingPrice)
      await replaceInput(dialogInput('SG&A'), sgaPercent)
      await clickSelector(dialogInput('SG&A'))
      assert.equal(await inputValue(headerSelector), sgaPercent, `${role} Dataset Sizing Header Value restores full SG&A value after the access probe`)
    } else if (mouseAccessible) {
      for (const [label, nextValue, expectedHeader, expectedEditor, expectedSuffix] of [
        ['Selling Price (THB)', '123.456789123', '123.45678912', '123.46', false],
        ['SG&A', '13.5792468', '13.5792468', '13.58', true]
      ]) {
        await clickSelector(dialogInput(label))
        await replaceInput(headerSelector, nextValue)
        const headerDraft = await inputValue(headerSelector)
        await clickSelector(dialogInput(label))
        const sourceEditorDisplay = await inputValue(dialogInput(label))
        const sourceHeaderValue = await inputValue(headerSelector)
        verify(headerDraft === nextValue && sourceHeaderValue === expectedHeader && sourceEditorDisplay === expectedEditor, `${role} Dataset Sizing Header edit writes through to its local ${label} source draft while applying Header presentation precision`, {
          headerDraft,
          sourceHeaderValue,
          sourceEditorDisplay,
          expectedHeader,
          expectedEditor,
          expected: nextValue
        })
        verify(await evaluate(`document.querySelector(${JSON.stringify(`${dialogSelector} [data-header-value]`)})?.textContent.includes("%")`) === expectedSuffix, `${role} Dataset Sizing Header ${label} retains the correct percentage units`, {
          expectedSuffix,
          headerText: await textContent(`${dialogSelector} [data-header-value]`)
        })
      }
    }
  }

  await chooseRole('Custom')
  await openSizing()
  const dialogRatios = await readSubgroupGeometry('dialog')
  verify(Boolean(dialogRatios && dialogRatios.entries.every(item => item.width > 0)), 'Dataset Sizing subgroup exposes UOM, Selling Price, SG&A outer fields', dialogRatios)
  setViewport(1440, 1800)
  await setCounts({ fractionalProbe: true, headerCountSelection: true })
  await clickTextButton('Apply Sizing')
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"][aria-labelledby="sizing-modal-title"]')`), 'Custom sizing count apply')
  await delay(250)
  verify(await evaluate('document.querySelectorAll("section[aria-label=\\"Bill of Materials rows\\"] tbody tr").length === 2'), 'count-only Header change applies the accepted BOM integer independently of metadata')

  await openSizing()
  const customMetadataRatio = await readSubgroupGeometry('dialog')
  verify(Boolean(customMetadataRatio && customMetadataRatio.ratios.every((ratio, index) => Math.abs(ratio - [0.2, 0.45, 0.35][index]) <= 0.04)), 'Custom Dataset Sizing subgroup outer widths follow 20/45/35', customMetadataRatio)
  await replaceInput('[role="dialog"] #dataset-sizing-product-name', 'Round Two Custom')
  await replaceInput('[role="dialog"] #dataset-sizing-uom', 'pc')
  await replaceInput(dialogInput('Selling Price (THB)'), '111.123456789')
  await clickSelector(dialogInput('Selling Price (THB)'))
  assert.equal(await inputValue('[role="dialog"] [data-header-value] input[aria-label="Selected value"]'), '111.12345679', 'Header Value caps Selling Price metadata presentation at eight decimals')
  await replaceInput(dialogInput('SG&A'), '12.3456789')
  await clickSelector(dialogInput('SG&A'))
  assert.equal(await inputValue('[role="dialog"] [data-header-value] input[aria-label="Selected value"]'), '12.3456789', 'Header Value exposes the full SG&A percentage draft')
  verify(await evaluate('document.querySelector("[role=dialog] [data-header-value]")?.textContent.includes("%")'), 'Header Value retains the percentage suffix for SG&A sizing drafts')
  await checkSizingHeaderAccess({ role: 'Custom', productName: 'Round Two Custom', uom: 'pc', sellingPrice: '111.123456789', sgaPercent: '12.3456789' })
  const customDialogRatio = await readSubgroupGeometry('dialog')
  verify(Boolean(customDialogRatio && customDialogRatio.ratios.every((ratio, index) => Math.abs(ratio - [0.2, 0.45, 0.35][index]) <= 0.04)), 'Dataset Sizing subgroup outer widths follow 20/45/35', customDialogRatio)
  await saveScreenshot('custom-sizing-desktop')
  for (const width of [768, 390, 320]) await verifyResponsiveUsability('dialog', width)
  setViewport(1440, 1800)
  await clickTextButton('Apply Sizing')
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"][aria-labelledby="sizing-modal-title"]')`), 'Custom sizing apply')
  await delay(250)
  await clickSelector('section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')
  verify(await inputValue('header [data-header-value] input[aria-label="Selected value"]') === '123.45678912'
    && await inputValue('section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]') === '123.46', 'applied Custom Selling Price keeps its source value while Header caps presentation and main editor stays compact', {
    actualHeader: await inputValue('header [data-header-value] input[aria-label="Selected value"]'),
    editorDisplay: await inputValue('section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]'),
    expected: '123.45678912'
  })
  await clickSelector('section[aria-label="Working dataset controls"] input[aria-label="SG&A"]')
  verify(await inputValue('header [data-header-value] input[aria-label="Selected value"]') === '13.5792468'
    && await inputValue('section[aria-label="Working dataset controls"] input[aria-label="SG&A"]') === '13.58', 'applied Custom SG&A keeps exact Header percentage source and compact main editor display', {
    actualHeader: await inputValue('header [data-header-value] input[aria-label="Selected value"]'),
    editorDisplay: await inputValue('section[aria-label="Working dataset controls"] input[aria-label="SG&A"]'),
    expected: '13.5792468',
    suffix: await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")')
  })

  const mainRatio = await readSubgroupGeometry('main')
  verify(Boolean(mainRatio && mainRatio.ratios.every((ratio, index) => Math.abs(ratio - [0.2, 0.45, 0.35][index]) <= 0.04)), 'main Master Data metadata subgroup outer widths follow 20/45/35', mainRatio)
  await saveScreenshot('master-data-desktop')
  for (const width of [1024, 768, 390, 320]) await verifyResponsiveUsability('main', width)
  setViewport(1440, 1800)

  await chooseRole('Current')
  await openSizing()
  const currentDialogRatio = await readSubgroupGeometry('dialog')
  verify(Boolean(currentDialogRatio && currentDialogRatio.ratios.every((ratio, index) => Math.abs(ratio - [0.2, 0.45, 0.35][index]) <= 0.04)), 'Current Dataset Sizing subgroup outer widths follow 20/45/35', currentDialogRatio)
  await setCounts()
  await replaceInput(dialogInput('Bill of Materials'), '2')
  await clickTextButton('Apply Sizing')
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"][aria-labelledby="sizing-modal-title"]')`), 'Current sizing count apply')
  await delay(250)

  await openSizing()
  const currentMetadataRatio = await readSubgroupGeometry('dialog')
  verify(Boolean(currentMetadataRatio && currentMetadataRatio.ratios.every((ratio, index) => Math.abs(ratio - [0.2, 0.45, 0.35][index]) <= 0.04)), 'Current Dataset Sizing metadata subgroup outer widths follow 20/45/35', currentMetadataRatio)
  await replaceInput('[role="dialog"] #dataset-sizing-product-name', 'Round Two Current')
  await replaceInput('[role="dialog"] #dataset-sizing-uom', 'kg')
  await replaceInput(dialogInput('Selling Price (THB)'), '22.222222222')
  await replaceInput(dialogInput('SG&A'), '8.7654321')
  await clickSelector(dialogInput('Selling Price (THB)'))
  const currentDialogSellingHeader = await inputValue('[role="dialog"] [data-header-value] input[aria-label="Selected value"]')
  verify(currentDialogSellingHeader === '22.22222222', 'Current Dataset Sizing Selling Price selection caps Header presentation', {
    actual: currentDialogSellingHeader,
    expected: '22.22222222',
    editorDisplay: await inputValue(dialogInput('Selling Price (THB)'))
  })
  await clickSelector(dialogInput('SG&A'))
  const currentDialogSgaHeader = await inputValue('[role="dialog"] [data-header-value] input[aria-label="Selected value"]')
  verify(currentDialogSgaHeader === '8.7654321', 'Current Dataset Sizing SG&A selection publishes its full draft', {
    actual: currentDialogSgaHeader,
    expected: '8.7654321',
    headerText: await textContent('[role="dialog"] [data-header-value]')
  })
  await clickTextButton('Apply Sizing')
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"][aria-labelledby="sizing-modal-title"]')`), 'Current sizing apply')
  await delay(250)

  const mainSellingPriceSelector = 'section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]'
  const mainSgaSelector = 'section[aria-label="Working dataset controls"] input[aria-label="SG&A"]'
  await clickSelector(mainSellingPriceSelector)
  const currentMainSellingHeader = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(currentMainSellingHeader === '22.22222222', 'applied Current Selling Price metadata caps Header presentation', {
    actual: currentMainSellingHeader,
    expected: '22.22222222',
    editorDisplay: await inputValue(mainSellingPriceSelector)
  })
  await clickSelector(mainSgaSelector)
  const currentMainSgaHeader = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(currentMainSgaHeader === '8.7654321', 'applied Current SG&A metadata keeps full Header source value', {
    actual: currentMainSgaHeader,
    expected: '8.7654321',
    editorDisplay: await inputValue(mainSgaSelector),
    suffix: await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")')
  })

  const visibleRole = async () => evaluate(`document.querySelector('[role="group"][aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label')`)
  assert.match(await visibleRole(), /^Current —/, 'Current dataset is active after sizing')
  const mainInput = field => `section[aria-label="Bill of Materials rows"] input[data-grid-field=${JSON.stringify(field)}]`
  const inputInSection = (section, field) => `section[aria-label=${JSON.stringify(section)}] input[data-grid-field=${JSON.stringify(field)}]`
  const enterField = async (selector, value) => {
    const actual = await replaceInput(selector, value, 4)
    assert.equal(actual, value, `Master Data editor accepts full numeric draft ${value}`)
    await delay(180)
    assert.equal(await evaluate(`document.activeElement === ${visibleExpression(selector)}`), true, `browser focus remains on the Master Data editor after input: ${selector}`)
  }
  await enterField(mainInput('price'), '123.456789123')
  await enterField('section[aria-label="Bill of Materials rows"] tbody tr:nth-child(2) input[data-grid-field="price"]', '321.987654321')
  await enterField(mainInput('consumption'), '3.1415926535')
  await enterField(mainInput('loss'), '1.23456789')
  await enterField(inputInSection('Work Centers rows', 'laborRate'), '234.567891')
  await enterField(inputInSection('Work Centers rows', 'burdenRate'), '8.125')
  await enterField(inputInSection('Routing rows', 'manning'), '2.3456789')
  await enterField(inputInSection('Routing rows', 'capacity'), '45.678901')
  await enterField(inputInSection('Routing rows', 'yield'), '88.7654321')

  const globalHeaderInput = 'header [data-header-value] input[aria-label="Selected value"]'
  const masterDataNavigation = 'header nav button[aria-current="page"]'
  await clickSelector(mainInput('price'))
  verify(await inputValue(globalHeaderInput) === '123.45678912', 'focused Master Data source activates its eight-decimal Header presentation', {
    source: await inputValue(mainInput('price')),
    header: await inputValue(globalHeaderInput)
  })
  await clickSelector(globalHeaderInput)
  const sourceToHeaderFocus = await evaluate(`({
    active: document.activeElement?.getAttribute('aria-label'),
    input: document.querySelector('header [data-header-value] input[aria-label="Selected value"]')?.value ?? null,
    spinner: document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length,
    sourceId: document.querySelector('section[aria-label="Bill of Materials rows"] input[data-grid-field="price"]')?.getAttribute('data-selected-value-source') ?? null,
    headerSourceId: document.querySelector('header [data-header-value] input[aria-label="Selected value"]')?.getAttribute('data-selected-value-source') ?? null
  })`)
  verify(sourceToHeaderFocus?.active === 'Selected value'
      && sourceToHeaderFocus.input === '123.45678912'
      && sourceToHeaderFocus.spinner === 1
      && sourceToHeaderFocus.sourceId !== null
      && sourceToHeaderFocus.sourceId === sourceToHeaderFocus.headerSourceId,
    'moving focus from source to Header editor keeps the same editable value active', sourceToHeaderFocus)
  await delay(200)
  const globalEditableStyle = await geometry(`(()=>{
    const root=document.querySelector('header [data-header-value]'),input=root?.querySelector('input[aria-label="Selected value"]'),stepper=root?.querySelector('[data-numeric-stepper] button')
    if(!root||!input||!stepper)return null
    const inputStyle=getComputedStyle(input),stepperStyle=getComputedStyle(stepper),headerStyle=getComputedStyle(input.closest('header'))
    return {background:inputStyle.backgroundColor,color:inputStyle.color,borderColor:inputStyle.borderTopColor,borderWidth:inputStyle.borderTopWidth,borderStyle:inputStyle.borderTopStyle,headerBackground:headerStyle.backgroundColor,stepperColor:stepperStyle.color}
  })()`)
  verify(Boolean(globalEditableStyle
      && globalEditableStyle.background === 'rgba(0, 0, 0, 0)'
      && globalEditableStyle.color === 'rgb(241, 245, 249)'
      && globalEditableStyle.borderColor === 'rgb(96, 165, 250)'
      && globalEditableStyle.borderWidth === '1px'
      && globalEditableStyle.borderStyle === 'solid'
      && globalEditableStyle.stepperColor === 'rgb(226, 232, 240)'),
    'focused global Header editor uses a dark integrated input, light text/arrows, and a clear focus border', globalEditableStyle)
  await saveScreenshot('header-editable-focused')
  await clickSelector(masterDataNavigation)
  const headerBlurState = await evaluate(`({
    input: !!document.querySelector('header [data-header-value] input[aria-label="Selected value"]'),
    output: document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim() ?? null,
    spinner: document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length
  })`)
  verify(!headerBlurState?.input && headerBlurState.output === '—' && headerBlurState.spinner === 0,
    'leaving both source and Header editor clears the editable selection', headerBlurState)
  await clickSelector(mainInput('price'))
  await clickSelector(masterDataNavigation)
  const sourceBlurState = await evaluate(`({
    input: !!document.querySelector('header [data-header-value] input[aria-label="Selected value"]'),
    output: document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim() ?? null
  })`)
  verify(!sourceBlurState?.input && sourceBlurState.output === '—',
    'leaving the source directly clears the editable selection', sourceBlurState)

  await clickSelector('section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]')
  const sellingPriceHeaderValue = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(sellingPriceHeaderValue === '22.22222222', 'main Selling Price metadata caps Header presentation at eight decimals', {
    actual: sellingPriceHeaderValue,
    source: await inputValue('section[aria-label="Working dataset controls"] input[aria-label="Selling Price (THB)"]'),
    headerText: await textContent('header [data-header-value]'),
    focusedLabel: await evaluate('document.activeElement?.getAttribute("aria-label")')
  })
  await clickSelector('section[aria-label="Working dataset controls"] input[aria-label="SG&A"]')
  const sgaHeaderValue = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(sgaHeaderValue === '8.7654321', 'main SG&A metadata publishes its full percentage to Header Value', {
    actual: sgaHeaderValue,
    source: await inputValue('section[aria-label="Working dataset controls"] input[aria-label="SG&A"]'),
    headerText: await textContent('header [data-header-value]'),
    focusedLabel: await evaluate('document.activeElement?.getAttribute("aria-label")')
  })
  verify(await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")'), 'main SG&A metadata publishes percentage units and suffix', {
    headerText: await textContent('header [data-header-value]')
  })

  const tableNumericFields = [
    { section: 'Bill of Materials', header: 'Bill of Materials', field: 'consumption', column: 'Usage', value: '3.1415926535', headerValue: '3.14159265', label: 'BOM Usage' },
    { section: 'Bill of Materials', header: 'Bill of Materials', field: 'price', column: 'Price', value: '123.456789123', headerValue: '123.45678912', label: 'BOM Price' },
    { section: 'Bill of Materials', header: 'Bill of Materials', field: 'loss', column: 'Loss', value: '1.23456789', headerValue: '1.23456789', label: 'BOM Loss', percentage: true },
    { section: 'Work Centers', header: 'Work Centers', field: 'laborRate', column: 'Labor Rate', value: '234.567891', headerValue: '234.567891', label: 'Work Center Labor Rate' },
    { section: 'Work Centers', header: 'Work Centers', field: 'burdenRate', column: 'Burden Rate', value: '8.125', headerValue: '8.125', label: 'Work Center Burden Rate' },
    { section: 'Routing', header: 'Routing', field: 'manning', column: 'Manning', value: '2.3456789', headerValue: '2.3456789', label: 'Routing Manning' },
    { section: 'Routing', header: 'Routing', field: 'capacity', column: 'Capacity', value: '45.678901', headerValue: '45.678901', label: 'Routing Capacity' },
    { section: 'Routing', header: 'Routing', field: 'yield', column: 'Yield', value: '88.7654321', headerValue: '88.7654321', label: 'Routing Yield', percentage: true }
  ]
  const editorAxes = {}
  const editorAxis = async spec => geometry(`(()=>{
    const h=[...document.querySelectorAll(${JSON.stringify(`[aria-label="${spec.header} column header controls"] th`)})].find(e=>e.textContent.trim()===${JSON.stringify(spec.column)})
    const i=document.querySelector(${JSON.stringify(`section[aria-label="${spec.section} rows"] tbody tr:first-child input[data-grid-field="${spec.field}"]`)});if(!h||!i)return null
    const hr=document.createRange();hr.selectNodeContents(h);const ht=h.getBoundingClientRect(),hv=hr.getBoundingClientRect(),ir=i.getBoundingClientRect(),td=i.closest('td')?.getBoundingClientRect(),cs=getComputedStyle(i)
    return {headerInset:ht.right-hv.right,headerTextAlign:getComputedStyle(h).textAlign,editorInset:td.right-(ir.right-parseFloat(cs.paddingRight)),editorTextAlign:cs.textAlign,inputPaddingRight:cs.paddingRight,stepperCount:i.closest('td')?.querySelectorAll('[data-numeric-stepper]').length??0,rect:{x:ir.x,width:ir.width,right:ir.right}}
  })()`)
  const displayAxis = async spec => geometry(`(()=>{
    const e=document.querySelector(${JSON.stringify(`section[aria-label="${spec.section} rows"] tbody tr:first-child [data-grid-field="${spec.field}"]`)});if(!e)return null
    const td=e.closest('td')?.getBoundingClientRect(),r=e.getBoundingClientRect(),cs=getComputedStyle(e)
    const span=e.querySelector('span'),spanRect=span?.getBoundingClientRect(),spanStyle=span?getComputedStyle(span):null
    const textRange=document.createRange();if(span)textRange.selectNodeContents(span);else textRange.selectNodeContents(e)
    const text=textRange.getBoundingClientRect()
    const children=[...e.querySelectorAll('span')].map(child=>{const sr=child.getBoundingClientRect(),ss=getComputedStyle(child),childTextRange=document.createRange();childTextRange.selectNodeContents(child);const str=childTextRange.getBoundingClientRect();return {className:child.className,display:ss.display,width:sr.width,paddingRight:ss.paddingRight,textAlign:ss.textAlign,rectRight:sr.right,textRight:str.right}})
    return {displayInset:td.right-text.right,displayTextAlign:spanStyle?.textAlign??cs.textAlign,display:cs.display,width:r.width,paddingRight:cs.paddingRight,buttonRect:{x:r.x,right:r.right,width:r.width},valueSpan:{className:span?.className??null,display:spanStyle?.display??null,width:spanRect?.width??0,paddingRight:spanStyle?.paddingRight??null,textAlign:spanStyle?.textAlign??null,rectRight:spanRect?.right??null},readOnlyTextRect:{x:text.x,right:text.right,width:text.width},cellRight:td.right,children}
  })()`)
  for (const spec of tableNumericFields) {
    const selector = `section[aria-label=${JSON.stringify(`${spec.section} rows`)}] tbody tr:first-child input[data-grid-field=${JSON.stringify(spec.field)}]`
    const beforeFocus = await editorAxis(spec)
    await clickSelector(selector)
    const actual = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
    verify(actual === spec.headerValue, `${spec.label} selection publishes its capped Header presentation`, { actual, expected: spec.headerValue, sourceDraft: spec.value })
    if (spec.percentage) verify(await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")'), `${spec.label} publishes percentage units and suffix`)
    const afterFocus = await editorAxis(spec)
    editorAxes[spec.field] = afterFocus
    verify(Boolean(beforeFocus && afterFocus && JSON.stringify(beforeFocus) === JSON.stringify(afterFocus)), `${spec.label} numeric text axis does not shift on focus`, { before: beforeFocus, after: afterFocus })
    verify(Boolean(afterFocus && afterFocus.headerTextAlign === 'right' && afterFocus.editorTextAlign === 'right'), `${spec.label} header and focused editor use right alignment`, afterFocus)
    verify(Boolean(afterFocus && afterFocus.stepperCount === 0 && Number.parseFloat(afterFocus.inputPaddingRight) <= 24), `${spec.label} body editor has no visible spinner or spinner-only gutter`, afterFocus)
  }

  const currentRowSelectedBefore = await evaluate(`document.querySelector('section[aria-label="Bill of Materials rows"] tr[data-master-data-row-id]')?.getAttribute('aria-selected')`)
  verify(currentRowSelectedBefore === 'false', 'editing spreadsheet numeric cells does not select the row')
  verify(await evaluate('document.querySelectorAll("main [data-numeric-stepper]").length') === 0, 'body numeric editors expose no visible stepper controls')

  const focusPriceRect = await geometry(`(()=>{const i=document.querySelector('section[aria-label="Bill of Materials rows"] input[data-grid-field="price"]');const r=i.getBoundingClientRect(),s=getComputedStyle(i);return {x:r.x,width:r.width,right:r.right,paddingRight:s.paddingRight,textAlign:s.textAlign}})()`)
  await clickSelector(mainInput('price'))
  await waitFor(() => existsVisible('header [data-header-value] input[aria-label="Selected value"]'), 'editable Selected Value Header')
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '123.45678912', 'Header shows the capped selected BOM Price presentation')
  const initialPriceAxis = await geometry(`(()=>{const h=[...document.querySelectorAll('[aria-label="Bill of Materials column header controls"] th')].find(e=>e.textContent.trim()==='Price');const i=document.querySelector('section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]');if(!h||!i)return null;const hr=document.createRange();hr.selectNodeContents(h);const hv=hr.getBoundingClientRect();const ir=i.getBoundingClientRect(),tr=i.closest('td')?.getBoundingClientRect(),ht=h.getBoundingClientRect();const cs=getComputedStyle(i);return {headerTextRight:hv.right,headerInset:ht.right-hv.right,headerTextAlign:getComputedStyle(h).textAlign,inputAxisRight:ir.right-parseFloat(cs.paddingRight),inputInset:tr.right-(ir.right-parseFloat(cs.paddingRight)),inputRectRight:ir.right,inputPaddingRight:cs.paddingRight,inputTextAlign:cs.textAlign,inputRect:{x:ir.x,width:ir.width,right:ir.right}}})()`)
  const focusPriceRectAfter = await geometry(`(()=>{const i=document.querySelector('section[aria-label="Bill of Materials rows"] input[data-grid-field="price"]');const r=i.getBoundingClientRect(),s=getComputedStyle(i);return {x:r.x,width:r.width,right:r.right,paddingRight:s.paddingRight,textAlign:s.textAlign}})()`)
  verify(JSON.stringify(focusPriceRect) === JSON.stringify(focusPriceRectAfter), 'BOM Price text axis does not shift on focus', { before: focusPriceRect, after: focusPriceRectAfter })
  verify(Boolean(initialPriceAxis && initialPriceAxis.headerTextAlign === 'right' && initialPriceAxis.inputTextAlign === 'right'), 'BOM Price header and input use right text alignment', initialPriceAxis)
  verify(Boolean(initialPriceAxis && Number.parseFloat(initialPriceAxis.inputPaddingRight) <= 24), 'body numeric input has no spinner-only right padding beyond its Blocker marker slot', initialPriceAxis)
  const headerEditAxis = await geometry(`(()=>{const group=document.querySelector('header [data-header-value]'),box=group?.querySelector('div.min-w-0.flex-1'),input=group?.querySelector('input[aria-label="Selected value"]');if(!group||!box||!input)return null;const br=box.getBoundingClientRect(),ir=input.getBoundingClientRect(),cs=getComputedStyle(input);return {rightInset:br.right-(ir.right-parseFloat(cs.paddingRight)),paddingRight:cs.paddingRight,textAlign:cs.textAlign,boxWidth:br.width}})()`)

  const originalPrice = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  await typeHeaderValue('42.123456789')
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '42.123456789', 'Header edit retains the complete JavaScript-number value')
  await clickSelector(mainInput('price'))
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '42.12345679', 'reselecting the edited source shows its capped Header presentation')
  await clickSelector('header button[aria-label="Undo"]')
  await clickSelector(mainInput('price'))
  await waitFor(async () => await inputValue('header [data-header-value] input[aria-label="Selected value"]') === originalPrice, 'Master Data Undo updates the selected Header source')
  await clickSelector('header button[aria-label="Redo"]')
  await clickSelector(mainInput('price'))
  await waitFor(async () => await inputValue('header [data-header-value] input[aria-label="Selected value"]') === '42.12345679', 'Master Data Redo updates the selected Header source presentation')
  verify(await evaluate('document.querySelectorAll("header [data-header-value] [data-numeric-stepper]").length') === 1, 'editable Header Value owns the only visible Selected Value spinner')

  await clickSelector(mainInput('price'))
  await pressKey('ArrowDown', { shift: true })
  const editPriceRange = await evaluate(`(()=>({
    activeRow: document.activeElement?.getAttribute('data-grid-row-id') ?? null,
    cells: [...document.querySelectorAll('section[aria-label="Bill of Materials rows"] tbody input[data-grid-field="price"]')].map(cell => ({
      row: cell.getAttribute('data-grid-row-id'),
      selected: cell.classList.contains('outline-blue-500'),
      value: cell.value
    }))
  }))()`)
  verify(Boolean(editPriceRange?.cells.length >= 2
      && editPriceRange.cells[0].selected
      && editPriceRange.cells[1].selected
      && editPriceRange.activeRow === editPriceRange.cells[1].row),
    'Master Data Edit grid keeps native keyboard focus and contiguous range selection across numeric cells', editPriceRange)
  const copiedPriceRange = await evaluate(`(()=>{
    let result=null
    window.addEventListener('copy',event=>{result={text:event.clipboardData?.getData('text/plain')??null,defaultPrevented:event.defaultPrevented}}, {once:true})
    const commandSucceeded=document.execCommand('copy')
    return {...(result??{}),commandSucceeded}
  })()`)
  verify(copiedPriceRange?.text === '42.12\n321.99' && copiedPriceRange.defaultPrevented && copiedPriceRange.commandSucceeded,
    'copy from the focused Master Data numeric range reaches the existing grid clipboard handler', copiedPriceRange)

  await clickSelector(inputInSection('Bill of Materials rows', 'loss'))
  const lossHeaderBefore = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(lossHeaderBefore === '1.23456789', 'BOM Loss Header source uses displayed percentage units', { value: lossHeaderBefore })
  verify(await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")'), 'percentage source displays its suffix in Header Value')
  await typeHeaderValue('5.67891234')
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '5.67891234', 'Header retains exact percentage editor units')
  await clickSelector(inputInSection('Bill of Materials rows', 'loss'))
  const convertedLossHeader = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  verify(convertedLossHeader === '5.67891234', 'Header percentage edit converts back to the same source units on cell reselection', {
    actual: convertedLossHeader,
    expected: '5.67891234',
    suffix: await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")')
  })
  await typeHeaderValue('20.000000000000004')
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '20.000000000000004', 'BOM Loss accepts percentage display units with floating-point conversion noise')
  await clickSelector(inputInSection('Bill of Materials rows', 'loss'))
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '20', 'reselecting BOM Loss uses the stored fraction converted back to clean percentage display units')
  verify(await evaluate('document.querySelector("header [data-header-value]")?.textContent.includes("%")'), 'BOM Loss keeps its percent unit after fraction storage and display conversion')

  await clickSelector(masterDataNavigation)
  await waitFor(() => textContent('header [data-header-value] [data-selected-value-output]').then(value => value === '—'), 'Edit mode has no anchored source before testing a Master Data hover preview')
  const lossEditInput = inputInSection('Bill of Materials rows', 'loss')
  const quickLossPoint = await evaluate(`(()=>{const element=${visibleExpression(lossEditInput)};const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...quickLossPoint })
  await delay(100)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'a quick pass over a Master Data editable value does not activate Header Preview')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(400)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'a cancelled Master Data dwell cannot Preview after its old deadline')
  await hoverSelector(lossEditInput)
  const lossEditPreview = await evaluate(`(()=>{const e=${visibleExpression(lossEditInput)};return {active:document.activeElement===e,header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,suffix:document.querySelector('header [data-header-value]')?.textContent.includes('%')??false,editor:!!document.querySelector('header [data-header-value] input[aria-label="Selected value"]'),spinner:document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length}})()`)
  verify(Boolean(lossEditPreview && !lossEditPreview.active
      && lossEditPreview.header === '20'
      && lossEditPreview.suffix
      && !lossEditPreview.editor
      && lossEditPreview.spinner === 0),
    'unfocused Master Data Edit Loss hover previews formatted 20 percent without focusing or exposing a writer', lossEditPreview)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(120)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—', 'pointer leave clears the unanchored Master Data Edit Loss preview')

  await clickSelector('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked') === 'false'`), 'Master Data View mode')
  await waitFor(() => existsVisible('section[aria-label="Bill of Materials rows"] [data-grid-cell="true"][data-grid-field="price"]'), 'native read-only BOM Price grid cell')
  for (const spec of tableNumericFields) {
    const display = await displayAxis(spec)
    const editor = editorAxes[spec.field]
    verify(Boolean(display && editor && Math.abs(editor.editorInset - display.displayInset) <= 2), `${spec.label} editor and read-only value use the same right edge including marker/suffix space`, { editorInset: editor?.editorInset, displayInset: display?.displayInset, delta: display && editor ? display.displayInset - editor.editorInset : null, readOnly: display })
    verify(Boolean(display && editor && Math.abs(editor.headerInset - display.displayInset) <= 2), `${spec.label} header and read-only value use the same right edge`, { headerInset: editor?.headerInset, displayInset: display?.displayInset, delta: display && editor ? display.displayInset - editor.headerInset : null, readOnly: display })
  }
  const firstViewPriceCell = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child [data-grid-cell="true"][data-grid-field="price"]'
  const secondViewPriceCell = 'section[aria-label="Bill of Materials rows"] tbody tr:nth-child(2) [data-grid-cell="true"][data-grid-field="price"]'
  const firstPriceRowId = await evaluate(`(${visibleExpression(firstViewPriceCell)})?.getAttribute('data-grid-row-id')`)
  const secondPriceRowId = await evaluate(`(${visibleExpression(secondViewPriceCell)})?.getAttribute('data-grid-row-id')`)
  await clickSelector(masterDataNavigation)
  await waitFor(() => textContent('header [data-header-value] [data-selected-value-output]').then(value => value === '—'), 'View mode starts without a focused Header source')
  const idleViewPrice = await geometry(`(()=>{const e=${visibleExpression(firstViewPriceCell)};if(!e)return null;const r=e.getBoundingClientRect();return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},selectedNumber:!!e.closest('[data-selected-number="true"]'),pressed:e.getAttribute('aria-pressed'),header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null}})()`)
  const hoverPoint = await hoverSelector(firstViewPriceCell)
  const hoveredViewPrice = await geometry(`(()=>{const e=${visibleExpression(firstViewPriceCell)};if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},selectedNumber:!!e.closest('[data-selected-number="true"]'),pressed:e.getAttribute('aria-pressed'),header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,border:s.borderTopColor,background:s.backgroundColor,outline:s.outlineStyle,outlineWidth:s.outlineWidth}})()`)
  verify(Boolean(idleViewPrice && hoveredViewPrice
      && !idleViewPrice.selectedNumber && !hoveredViewPrice.selectedNumber
      && idleViewPrice.pressed === null && hoveredViewPrice.pressed === null
      && idleViewPrice.header === '—' && hoveredViewPrice.header === '42.12345679'
      && JSON.stringify(idleViewPrice.rect) === JSON.stringify(hoveredViewPrice.rect)
      && hoveredViewPrice.border === 'rgb(226, 232, 240)'
      && hoveredViewPrice.background === 'rgb(248, 250, 252)'
      && hoveredViewPrice.outline === 'none'),
    'unanchored View hover previews the formatted value while preserving native gray geometry and no SelectedNumber state', { idle: idleViewPrice, hover: hoveredViewPrice, pointer: hoverPoint })
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(120)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'pointer leave clears an unanchored native View preview')
  await clickSelector(firstViewPriceCell)
  const focusedViewPrice = await geometry(`(()=>{const e=${visibleExpression(firstViewPriceCell)},s=getComputedStyle(${visibleExpression(firstViewPriceCell)});return {active:document.activeElement===e,header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,spinner:document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length,selectedNumber:!!e?.closest('[data-selected-number="true"]'),pressed:e?.getAttribute('aria-pressed')??null,outline:s.outlineColor,outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle}})()`)
  verify(Boolean(focusedViewPrice?.active
      && focusedViewPrice.header === '42.12345679'
      && focusedViewPrice.spinner === 0
      && !focusedViewPrice.selectedNumber
      && focusedViewPrice.pressed === null
      && focusedViewPrice.outline === 'rgb(29, 78, 216)'
      && focusedViewPrice.outlineWidth === '2px'),
    'native grid focus publishes the capped read-only Header value with one blue focus perimeter and no spinner', focusedViewPrice)
  const secondViewPricePoint = await evaluate(`(()=>{const element=${visibleExpression(secondViewPriceCell)};const rect=element.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...secondViewPricePoint })
  await delay(100)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '42.12345679',
    'a quick pass over native View B keeps focused native View A displayed')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(400)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '42.12345679',
    'leaving a cancelled native View B dwell preserves native View A')
  await hoverSelector(secondViewPriceCell)
  const focusedViewHover = await geometry(`(()=>{const a=${visibleExpression(firstViewPriceCell)},b=${visibleExpression(secondViewPriceCell)};return {activeA:document.activeElement===a,header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,spinner:document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length,selectedNumberA:!!a?.closest('[data-selected-number="true"]'),selectedNumberB:!!b?.closest('[data-selected-number="true"]'),pressedA:a?.getAttribute('aria-pressed')??null,pressedB:b?.getAttribute('aria-pressed')??null}})()`)
  verify(Boolean(focusedViewHover?.activeA
      && focusedViewHover.header === '321.98765432'
      && focusedViewHover.spinner === 0
      && !focusedViewHover.selectedNumberA && !focusedViewHover.selectedNumberB
      && focusedViewHover.pressedA === null && focusedViewHover.pressedB === null),
    'hovering native View B previews B read-only while A retains native focus', focusedViewHover)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(120)
  verify(await evaluate(`document.activeElement===${visibleExpression(firstViewPriceCell)}`)
      && await textContent('header [data-header-value] [data-selected-value-output]') === '42.12345679',
    'pointer leave restores A while keeping native grid focus')
  await pressKey('Enter')
  const afterEnterFocusRow = await evaluate(`document.activeElement?.getAttribute('data-grid-row-id')`)
  verify(afterEnterFocusRow === secondPriceRowId, 'View-mode Enter from a read-only numeric cell advances to the next row', { firstRow: firstPriceRowId, focusedRow: afterEnterFocusRow, nextRow: secondPriceRowId })
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '321.98765432', 'View Enter moves the Header source to the newly focused row')
  await pressKey('Enter', { shift: true })
  const afterShiftEnterFocusRow = await evaluate(`document.activeElement?.getAttribute('data-grid-row-id')`)
  verify(afterShiftEnterFocusRow === firstPriceRowId, 'View-mode Shift+Enter from a read-only numeric cell moves to the previous row', { focusedRow: afterShiftEnterFocusRow, previousRow: firstPriceRowId })
  const enterReadOnlyHeader = await textContent('header [data-header-value] [data-selected-value-output]')
  verify(enterReadOnlyHeader === '42.12345679', 'View Shift+Enter moves the Header source back to the first row', { header: enterReadOnlyHeader })
  const missingViewCell = 'section[aria-label="Bill of Materials rows"] tbody tr:nth-child(2) [data-grid-cell="true"][data-grid-field="consumption"]'
  await clickSelector(missingViewCell)
  const missingViewState = await geometry(`(()=>{const e=${visibleExpression(missingViewCell)},td=e?.closest('td'),header=[...document.querySelectorAll('[aria-label="Bill of Materials column header controls"] th')].find(item=>item.textContent.trim()==='Usage');if(!e||!td||!header)return null;const valueRange=document.createRange(),textNode=[...e.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());if(textNode)valueRange.selectNode(textNode);else valueRange.selectNodeContents(e);const text=valueRange.getBoundingClientRect(),r=e.getBoundingClientRect(),marker=e.querySelector('[aria-label="Missing required value"]'),markerRect=marker?.getBoundingClientRect(),headerRange=document.createRange();headerRange.selectNodeContents(header);const headerText=headerRange.getBoundingClientRect(),headerRect=header.getBoundingClientRect();return {active:document.activeElement===e,header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,invalid:e.getAttribute('aria-invalid'),markerCount:e.querySelectorAll('[aria-label="Missing required value"]').length,markerClearance:markerRect?markerRect.left-text.right:null,bodyInset:td.getBoundingClientRect().right-text.right,headerInset:headerRect.right-headerText.right,width:r.width,selectedNumber:!!e.closest('[data-selected-number="true"]'),pressed:e.getAttribute('aria-pressed')}})()`)
  verify(Boolean(missingViewState?.active
      && missingViewState.header === '—'
      && missingViewState.invalid === 'true'
      && missingViewState.markerCount === 1
      && missingViewState.markerClearance >= 8
      && Math.abs(missingViewState.bodyInset - missingViewState.headerInset) <= 2
      && missingViewState.width === 80
      && !missingViewState.selectedNumber
      && missingViewState.pressed === null),
    'unavailable blocker cell remains native grid focus, leaves Header empty, and keeps its star outside the stable numeric axis', missingViewState)
  const missingPercentCell = 'section[aria-label="Bill of Materials rows"] tbody tr:nth-child(2) [data-grid-cell="true"][data-grid-field="loss"]'
  await clickSelector(missingPercentCell)
  const missingPercentState = await geometry(`(()=>{
    const cell=${visibleExpression(missingPercentCell)},td=cell?.closest('td'),shell=cell?.parentElement
    const header=[...document.querySelectorAll('[aria-label="Bill of Materials column header controls"] th')].find(item=>item.textContent.trim()==='Loss')
    if(!cell||!td||!shell||!header)return null
    const range=document.createRange(),textNode=[...cell.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())
    if(textNode)range.selectNode(textNode);else range.selectNodeContents(cell)
    const text=range.getBoundingClientRect(),cellRect=cell.getBoundingClientRect(),marker=cell.querySelector('[aria-label="Missing required value"]')
    const markerRect=marker?.getBoundingClientRect(),suffix=shell.querySelector(':scope > span.w-3'),suffixRect=suffix?.getBoundingClientRect(),shellRect=shell.getBoundingClientRect()
    const headerRange=document.createRange();headerRange.selectNodeContents(header)
    const headerText=headerRange.getBoundingClientRect(),headerRect=header.getBoundingClientRect()
    return {active:document.activeElement===cell,headerValue:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,invalid:cell.getAttribute('aria-invalid'),markerCount:cell.querySelectorAll('[aria-label="Missing required value"]').length,markerClearance:markerRect?markerRect.left-text.right:null,cellWidth:cellRect.width,shellWidth:shellRect.width,suffixText:suffix?.textContent.trim()??null,suffixGap:suffixRect?suffixRect.left-cellRect.right:null,bodyInset:td.getBoundingClientRect().right-text.right,headerInset:headerRect.right-headerText.right}
  })()`)
  verify(Boolean(missingPercentState?.active
      && missingPercentState.headerValue === '—'
      && missingPercentState.invalid === 'true'
      && missingPercentState.markerCount === 1
      && missingPercentState.markerClearance >= 8
      && missingPercentState.cellWidth === 96
      && missingPercentState.shellWidth === 112
      && missingPercentState.suffixText === '%'
      && missingPercentState.suffixGap === 4
      && Math.abs(missingPercentState.bodyInset - missingPercentState.headerInset) <= 2),
    'missing percentage blocker keeps the marker and suffix separate without shifting its numeric axis', missingPercentState)
  await clickSelector(masterDataNavigation)
  await waitFor(() => textContent('header [data-header-value] [data-selected-value-output]').then(value => value === '—'), 'read-only percentage preview starts without a focused Header source')
  const lossViewCell = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child [data-grid-cell="true"][data-grid-field="loss"]'
  await hoverSelector(lossViewCell)
  const percentagePreviewState = await evaluate(`(()=>({active:document.activeElement===${visibleExpression(lossViewCell)},header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,suffix:document.querySelector('header [data-header-value]')?.textContent.includes('%')??false,spinner:document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length,selectedNumber:!!${visibleExpression(lossViewCell)}?.closest('[data-selected-number="true"]'),pressed:${visibleExpression(lossViewCell)}?.getAttribute('aria-pressed')??null}))()`)
  verify(Boolean(percentagePreviewState
      && !percentagePreviewState.active
      && percentagePreviewState.header === '20'
      && percentagePreviewState.suffix
      && percentagePreviewState.spinner === 0
      && !percentagePreviewState.selectedNumber
      && percentagePreviewState.pressed === null),
    'unfocused native View Loss hover previews the converted 20 percent as a read-only Header value', percentagePreviewState)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1438, y: 1798 })
  await delay(120)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—', 'pointer leave clears unanchored native View Loss percentage preview')
  await clickSelector(lossViewCell)
  const percentageViewState = await evaluate(`(()=>({active:document.activeElement===${visibleExpression(lossViewCell)},header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null,suffix:document.querySelector('header [data-header-value]')?.textContent.includes('%')??false,spinner:document.querySelectorAll('header [data-header-value] [data-numeric-stepper]').length}))()`)
  verify(Boolean(percentageViewState?.active
      && percentageViewState.header === '20'
      && percentageViewState.suffix
      && percentageViewState.spinner === 0),
    'focused read-only percentage value keeps the capped display units and suffix without a spinner', percentageViewState)
  await clickSelector(firstViewPriceCell)
  const displayBeforeClick = await geometry(`(()=>{const e=${visibleExpression(firstViewPriceCell)};if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e),tr=e.closest('td')?.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect();return {right:text.right,inset:tr.right-text.right,rectRight:r.right,display:s.display,width:r.width,paddingRight:s.paddingRight,textAlign:s.textAlign,outline:s.outlineColor,outlineWidth:s.outlineWidth,label:e.getAttribute('aria-label')}})()`)
  verify(await evaluate('document.querySelectorAll("header [data-header-value] [data-numeric-stepper]").length') === 0, 'read-only Header Value has no spinner')
  const readOnlyHeaderStyle = await geometry(`(()=>{
    const root=document.querySelector('header [data-header-value]'),output=root?.querySelector('[data-selected-value-output]')
    if(!root||!output)return null
    const style=getComputedStyle(output)
    return {background:style.backgroundColor,color:style.color,borderColor:style.borderTopColor,borderWidth:style.borderTopWidth,borderStyle:style.borderTopStyle,overflowX:style.overflowX,whiteSpace:style.whiteSpace}
  })()`)
  verify(Boolean(readOnlyHeaderStyle
      && readOnlyHeaderStyle.background === 'rgba(0, 0, 0, 0)'
      && readOnlyHeaderStyle.color === 'rgb(241, 245, 249)'
      && readOnlyHeaderStyle.borderWidth === '1px'
      && readOnlyHeaderStyle.borderColor === 'rgba(0, 0, 0, 0)'
      && readOnlyHeaderStyle.overflowX === 'auto'
      && readOnlyHeaderStyle.whiteSpace === 'nowrap'),
    'read-only Header is plain light text with only a transparent geometry-preserving boundary and safe internal overflow', readOnlyHeaderStyle)
  await saveScreenshot('header-readonly-selected')
  await clickSelector(masterDataNavigation)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'read-only focus-owned Header value clears when focus leaves the grid')
  const responsiveTableSpecs = tableNumericFields.map(spec => ({
    section: spec.section,
    header: spec.header,
    field: spec.field,
    column: spec.column,
    percentage: Boolean(spec.percentage),
    maxWidth: ['consumption', 'manning'].includes(spec.field) ? 80 : 96
  }))
  for (const width of [1440, 1024, 768, 390, 320]) {
    await setViewport(width, 1500)
    const layout = await geometry(`(()=>{
      const bounds=selector=>{const element=document.querySelector(selector);if(!element)return null;const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}}
      const value=bounds('header [data-header-value]'),undo=bounds('header button[aria-label="Undo"]'),redo=bounds('header button[aria-label="Redo"]'),info=bounds('header button[aria-label="Prepare Dataset"]')
      const output=document.querySelector('header [data-header-value] [data-selected-value-output]'),style=output?getComputedStyle(output):null
      return {value,undo,redo,info,viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,overflowX:style?.overflowX,whiteSpace:style?.whiteSpace}
    })()`)
    verify(Boolean(layout?.value && layout?.undo && layout?.redo && layout?.info
        && layout.value.width <= 192.5
        && layout.value.right <= layout.undo.left
        && layout.undo.right <= layout.redo.left
        && layout.redo.right <= layout.info.left
        && layout.info.right <= width + 0.5
        && layout.documentWidth <= width
        && layout.overflowX === 'auto'
        && layout.whiteSpace === 'nowrap'),
      `Header value and utility controls remain bounded and ordered at ${width}px`, layout)
    const tableGeometry = await geometry(`(()=>{
      const specs=${JSON.stringify(responsiveTableSpecs)}
      const measurements=specs.map(spec=>{
        const cell=document.querySelector('section[aria-label="'+spec.section+' rows"] tbody tr:first-child [data-grid-cell="true"][data-grid-field="'+spec.field+'"]')
        const heading=[...document.querySelectorAll('[aria-label="'+spec.header+' column header controls"] th')].find(item=>item.textContent.trim()===spec.column)
        if(!cell||!heading)return {...spec,missing:true}
        const range=document.createRange(),valueNode=[...cell.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim())
        if(valueNode)range.selectNode(valueNode);else range.selectNodeContents(cell)
        const text=range.getBoundingClientRect(),field=cell.getBoundingClientRect(),bodyCell=cell.closest('td').getBoundingClientRect()
        const headerRange=document.createRange();headerRange.selectNodeContents(heading)
        const headerText=headerRange.getBoundingClientRect(),headerRect=heading.getBoundingClientRect()
        const style=getComputedStyle(cell),shell=spec.percentage?cell.parentElement:null,suffix=shell?.querySelector(':scope > span.w-3'),suffixRect=suffix?.getBoundingClientRect(),shellRect=shell?.getBoundingClientRect()
        const marker=cell.querySelector('[aria-label="Missing required value"]'),markerRect=marker?.getBoundingClientRect()
        const section=cell.closest('section'),scroller=section?.querySelector('.overflow-x-auto')
        return {
          ...spec,
          width:field.width,
          height:field.height,
          bodyAxisInset:bodyCell.right-text.right,
          headerAxisInset:headerRect.right-headerText.right,
          axisDelta:bodyCell.right-text.right-(headerRect.right-headerText.right),
          paddingRight:style.paddingRight,
          focused:document.activeElement===cell,
          selectedNumber:!!cell.closest('[data-selected-number="true"]'),
          pressed:cell.getAttribute('aria-pressed'),
          shellWidth:shellRect?.width??null,
          suffixGap:suffixRect? suffixRect.left-field.right:null,
          markerClearance:markerRect?markerRect.left-text.right:null,
          scroller:{clientWidth:scroller?.clientWidth??0,scrollWidth:scroller?.scrollWidth??0},
          documentWidth:document.documentElement.scrollWidth
        }
      })
      return {measurements,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}
    })()`)
    const badTableGeometry = tableGeometry?.measurements?.filter(item => item.missing
      || item.width > item.maxWidth + 0.5
      || item.height !== 32
      || Math.abs(item.axisDelta) > 2
      || item.selectedNumber
      || item.pressed !== null
      || item.documentWidth > width + 1
      || item.scroller.scrollWidth < item.scroller.clientWidth
      || (item.percentage && (Math.abs(item.shellWidth - 112) > 0.5 || item.suffixGap < 3.5 || item.suffixGap > 4.5))
      || (item.markerClearance !== null && item.markerClearance < 8)) ?? []
    verify(Boolean(tableGeometry && badTableGeometry.length === 0
        && tableGeometry.documentWidth <= width + 1
        && (width > 1024 || tableGeometry.measurements.every(item => item.scroller.scrollWidth > item.scroller.clientWidth))),
      `BOM, Work Centers, and Routing keep compact aligned numeric axes at ${width}px`, tableGeometry)
    if (width === 1440 || width === 1024 || width === 768 || width === 390 || width === 320) await saveScreenshot(`master-data-view-${width}`)
  }
  await setViewport(1440, 1800)
  await clickSelector(firstViewPriceCell)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '42.12345679',
    'All view focuses the selected Master Data numeric grid source before search')
  const masterDataSearch = 'input[aria-label="Search Master Data"]'
  await replaceInput(masterDataSearch, 'Material 2')
  await waitFor(() => evaluate('document.querySelectorAll("section[aria-label=\\"Bill of Materials rows\\"] tbody tr[data-master-data-row-id]").length === 1'),
    'All view search filters the Master Data rows')
  const searchedGridState = await evaluate(`(()=>({
    rows:[...document.querySelectorAll('section[aria-label="Bill of Materials rows"] tbody tr[data-master-data-row-id]')].map(row=>row.querySelector('[data-grid-field="description"]')?.textContent.trim()),
    header:document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim()??null
  }))()`)
  verify(searchedGridState?.rows.length === 1 && searchedGridState.rows[0] === 'Material 2' && searchedGridState.header === '—',
    'All view search removes the hidden focused source and does not leave a stale Header value', searchedGridState)
  const searchedPriceCell = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child [data-grid-cell="true"][data-grid-field="price"]'
  await clickSelector(searchedPriceCell)
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '321.98765432',
    'a filtered native numeric grid cell still owns focus and publishes its capped Header presentation')
  await replaceInput(masterDataSearch, '')
  await waitFor(() => evaluate('document.querySelectorAll("section[aria-label=\\"Bill of Materials rows\\"] tbody tr[data-master-data-row-id]").length === 2'),
    'clearing All view search restores the original Master Data rows')
  const headerOutputStyle = await geometry(`(()=>{const e=document.querySelector('header [data-header-value] [data-selected-value-output]');const r=e.getBoundingClientRect(),s=getComputedStyle(e),range=document.createRange();range.selectNodeContents(e);return {right:range.getBoundingClientRect().right,rectRight:r.right,textAlign:s.textAlign,paddingRight:s.paddingRight}})()`)
  const rowStillUnselected = await evaluate(`document.querySelector('section[aria-label="Bill of Materials rows"] tr[data-master-data-row-id]')?.getAttribute('aria-selected')`)
  verify(rowStillUnselected === 'false', 'read-only spreadsheet value selection does not select its row')
  verify(Boolean(displayBeforeClick && displayBeforeClick.textAlign === 'right'), 'read-only BOM Price value uses right text alignment', displayBeforeClick)
  process.stdout.write(`INFO Header Value output geometry (diagnostic only, not a Round 2 table-axis gate): ${JSON.stringify(headerOutputStyle)}\n`)
  verify(Boolean(initialPriceAxis && displayBeforeClick && Math.abs(initialPriceAxis.inputInset - displayBeforeClick.inset) <= 2), 'BOM Price editor and read-only value share the same right edge including marker space', { inputInset: initialPriceAxis?.inputInset, readOnlyInset: displayBeforeClick?.inset, delta: initialPriceAxis && displayBeforeClick ? displayBeforeClick.inset - initialPriceAxis.inputInset : null })
  verify(Boolean(initialPriceAxis && Math.abs(initialPriceAxis.headerInset - initialPriceAxis.inputInset) <= 2), 'BOM Price header and body editor share the same right edge', { headerInset: initialPriceAxis?.headerInset, inputInset: initialPriceAxis?.inputInset, delta: initialPriceAxis ? initialPriceAxis.inputInset - initialPriceAxis.headerInset : null })
  const headerAxisOffsets = await geometry(`(()=>{const group=document.querySelector('header [data-header-value]');const box=group?.querySelector('div.min-w-0.flex-1');const output=group?.querySelector('[data-selected-value-output]');if(!group||!box||!output)return null;const br=box.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(output);const text=range.getBoundingClientRect();return {rightInset:br.right-text.right,textAlign:getComputedStyle(output).textAlign,boxWidth:br.width,textRight:text.right}})()`)
  process.stdout.write(`INFO Header Value edit/output axis comparison (diagnostic only, not a Round 2 table-axis gate): ${JSON.stringify({ headerAxisOffsets, headerEditAxis })}\n`)

  await clickSelector('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked') === 'true'`), 'Master Data Edit mode restored')
  const firstPriceInput = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]'
  const secondPriceInput = 'section[aria-label="Bill of Materials rows"] tbody tr:nth-child(2) input[data-grid-field="price"]'
  await clickSelector(firstPriceInput)
  const editFirstRow = await evaluate(`document.activeElement?.getAttribute('data-grid-row-id')`)
  await pressKey('Enter')
  const editEnterRow = await evaluate(`document.activeElement?.getAttribute('data-grid-row-id')`)
  verify(editEnterRow === secondPriceRowId, 'Edit-mode Enter from a numeric cell advances to the next row', { from: editFirstRow, focused: editEnterRow, expected: secondPriceRowId })
  await pressKey('Enter', { shift: true })
  const editShiftEnterRow = await evaluate(`document.activeElement?.getAttribute('data-grid-row-id')`)
  verify(editShiftEnterRow === firstPriceRowId, 'Edit-mode Shift+Enter from a numeric cell moves to the previous row', { focused: editShiftEnterRow, expected: firstPriceRowId })
  await chooseRole('Custom')
  await waitFor(() => evaluate(`!document.querySelector('header [data-header-value] input[aria-label="Selected value"]') && document.querySelector('header [data-header-value] [data-selected-value-output]')?.textContent.trim() === '—'`), 'dataset switch clears stale editable selection')
  verify(await evaluate('document.querySelectorAll("header [data-header-value] [data-numeric-stepper]").length') === 0, 'dataset switch removes the stale Header spinner')
  const customPrice = inputInSection('Bill of Materials rows', 'price')
  await clickSelector(customPrice)
  await typeHeaderValue('13.5792468')
  assert.equal(await inputValue('header [data-header-value] input[aria-label="Selected value"]'), '13.5792468', 'Custom dataset header edit updates its selected source')
  await chooseRole('Current')
  await waitFor(() => evaluate(`!document.querySelector('header [data-header-value] input[aria-label="Selected value"]')`), 'switching away removes Header editor for old source')
  const currentPriceView = inputInSection('Bill of Materials rows', 'price')
  await clickSelector(currentPriceView)
  await delay(500)
  const currentValueAfterCustomEdit = await inputValue('header [data-header-value] input[aria-label="Selected value"]')
  const currentSourceDiagnostic = await geometry(`(()=>({
    activeRole:document.querySelector('[role="group"][aria-label="Master Data workspace"] button[aria-pressed="true"]')?.getAttribute('aria-label'),
    mode:document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked'),
    selectedHeader:document.querySelector('header [data-header-value]')?.textContent.trim(),
    headerEditor:document.querySelector('header [data-header-value] input[aria-label="Selected value"]')?.value??null,
    sourceEditor:document.querySelector('section[aria-label="Bill of Materials rows"] tbody tr:first-child input[data-grid-field="price"]')?.value??null,
    focusedElement:document.activeElement?.outerHTML?.slice(0,500)??null
  }))()`)
  verify(currentValueAfterCustomEdit === '42.12345679', 'Current source is unchanged after Custom source edit', {
    actual: currentValueAfterCustomEdit,
    expected: '42.12345679',
    ...currentSourceDiagnostic
  })
  verify(currentValueAfterCustomEdit === '42.12345679', 'dataset source switching prevents stale Custom writes to Current', {
    actual: currentValueAfterCustomEdit,
    expected: '42.12345679',
    source: await inputValue(currentPriceView)
  })

  await chooseRole('Custom')
  await clickSelector('section[aria-label="Working dataset controls"] button[role="switch"]')
  await waitFor(() => evaluate(`document.querySelector('section[aria-label="Working dataset controls"] button[role="switch"]')?.getAttribute('aria-checked') === 'false'`), 'Custom read-only view')
  await clickSelector('header button[aria-label="Undo"]')
  await clickSelector('header button[aria-label="Redo"]')
  await chooseRole('Current')
  const currentPriceReadOnly = 'section[aria-label="Bill of Materials rows"] tbody tr:first-child [data-grid-cell="true"][data-grid-field="price"]'
  await clickSelector(currentPriceReadOnly)
  assert.equal(await textContent('header [data-header-value] [data-selected-value-output]'), '42.12345679', 'Custom history actions do not mutate Current source')
  await clickTextButton('Cost Breakdown')
  await waitFor(() => textContent('header [data-header-value] [data-selected-value-output]').then(value => value === '—'), 'page change clears the read-only Header selection')
  verify(await inputValue('header [data-header-value] input[aria-label="Selected value"]') === null
      && await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'page change clears the read-only Header selection without leaving stale value')
  await clickTextButton('Master Data')
  await waitFor(() => existsVisible('section[aria-label="Working dataset controls"]'), 'return to Master Data after Header page-scope check')
  verify(await textContent('header [data-header-value] [data-selected-value-output]') === '—',
    'returning to Master Data starts with no stale Header selection')
  const consoleMessages = [...browserErrors]
  verify(consoleMessages.length === 0, 'browser has no uncaught errors or console warnings', consoleMessages)

  await saveScreenshot('master-data-final-desktop')
  await setViewport(390, 1100)
  await saveScreenshot('master-data-final-narrow')
  const failed = checks.filter(result => !result.passed)
  process.stdout.write(`\nEvidence directory: ${evidenceDir}\n`)
  process.stdout.write(`Browser: ${baseUrl} in isolated headless Chrome, viewport 1440x1800 then responsive widths 1024/768/390/320\n`)
  process.stdout.write(`Checks: ${checks.length - failed.length} passed, ${failed.length} failed\n`)
  if (failed.length) {
    process.stderr.write(`Failures:\n${failed.map(result => `- ${result.message}${result.detail === undefined ? '' : `: ${JSON.stringify(result.detail)}`}`).join('\n')}\n`)
    process.exitCode = 1
  } else process.stdout.write('Master Data Selected Value browser verification PASS\n')
} catch (error) {
  process.stderr.write(`Browser verification error: ${error instanceof Error ? error.stack : String(error)}\n`)
  throw error
} finally {
  client?.close()
  await Promise.all([stopChild(chrome), stopChild(vite)])
  await delay(150)
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
}
