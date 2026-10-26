import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const repository = process.cwd()
const fixtureUrlPath = '/scripts/fixtures/cbd-numeric-integrity-browser.html'
const vitePort = await unusedPort()
const debugPort = await unusedPort()
const profile = await mkdtemp(join(tmpdir(), 'costbreakdown-cbd-numeric-integrity-'))
const viteCliPath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')))
const vite = spawn(process.execPath, [viteCliPath, '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
  cwd: repository,
  stdio: ['ignore', 'pipe', 'pipe']
})
const viteOutput = []
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => viteOutput.push(String(chunk)))
const chromeArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1600,1200', 'about:blank'
]
if (process.platform === 'linux') chromeArgs.unshift('--no-sandbox')
const chrome = spawn(findChrome(), chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
const chromeOutput = []
chrome.stderr.on('data', chunk => chromeOutput.push(String(chunk)))
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

async function waitFor(check, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    if (vite.exitCode !== null || chrome.exitCode !== null) break
    await delay(100)
  }
  throw new Error(`${label} did not become ready. Vite output:\n${viteOutput.join('').slice(-3000)}\nChrome output:\n${chromeOutput.join('').slice(-3000)}`)
}

try {
  const baseUrl = `http://127.0.0.1:${vitePort}${fixtureUrlPath}`
  await waitFor(async () => { try { return (await fetch(baseUrl)).ok } catch { return false } }, 'Vite fixture')
  const debugUrl = `http://127.0.0.1:${debugPort}`
  await waitFor(async () => { try { return (await fetch(`${debugUrl}/json/version`)).ok } catch { return false } }, 'Chrome DevTools')
  const targetResponse = await fetch(`${debugUrl}/json/new?${baseUrl}`, { method: 'PUT' })
  if (!targetResponse.ok) throw new Error(`Chrome could not open the fixture page: ${targetResponse.status}`)
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome DevTools command timed out: ${method}`)) }, 30000)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message)
    })
    client.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description ?? response.result.exceptionDetails.text)
    return response.result.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: baseUrl })
  await waitFor(async () => evaluate(`document.querySelectorAll('tbody tr[data-candidate-reorder-row]').length >= 6`), 'rendered comparison rows')

  const rows = await evaluate(`(()=>[...document.querySelectorAll('tbody tr[data-candidate-reorder-row]')].map(row=>({
    label:row.querySelector('th[scope="row"]')?.innerText.trim()??'',
    status:row.querySelector('td:nth-child(3)')?.innerText.trim()??'',
    cells:[...row.querySelectorAll('td')].map(cell=>({text:cell.innerText.trim(),label:cell.getAttribute('aria-label'),className:cell.className})),
    numericText:[...row.querySelectorAll('[data-numeric-token="true"]')].map(token=>token.innerText.trim())
  })))()`)
  const find = label => {
    const row = rows.find(candidate => candidate.label === label)
    assert.ok(row, `rendered ${label} Candidate row is present`)
    return row
  }

  const same = find('Annealing same')
  assert.equal(same.status, 'UNCHANGED', 'identical exact Routing inputs and resolved rates render UNCHANGED')
  assert.deepEqual(same.numericText.slice(0, 5), ['0.00', '0.00', '0.00', '0.00', '0.00'],
    'identical Routing parameter deltas render neutral exact zeros')
  assert.equal(same.cells[7].text, '0.00', 'identical Routing total Gap renders the approved zero')
  assert.match(same.cells[7].className, /text-slate-400/, 'exact-zero Gap uses neutral color')
  assert.equal(same.cells[8].text.replace(/\s+/g, ''), '0.00%', 'an exact-zero Gap never becomes negative zero in percent presentation')

  const capacity = find('Annealing capacity')
  assert.equal(capacity.status, 'CHANGED', 'actual Capacity change renders CHANGED')
  assert.ok(capacity.cells[7].label?.includes('Gap -'), 'higher Capacity keeps the negative cost-effect direction')
  assert.match(capacity.cells[7].className, /text-emerald-600/, 'Capacity cost decrease uses favorable Gap color')

  const rate = find('Annealing rate')
  assert.equal(rate.status, 'CHANGED', 'actual resolved Work Center Burden Rate change renders CHANGED')
  assert.equal(rate.numericText[4], '+1.52', 'Candidate table shows the exact Burden Rate delta')
  assert.ok(rate.cells[7].label?.includes('Gap +'), 'higher Burden Rate keeps the positive cost-effect direction')
  assert.match(rate.cells[7].className, /text-rose-600/, 'Burden cost increase uses adverse Gap color')

  const tiny = find('Annealing tiny rate')
  assert.equal(tiny.status, 'CHANGED', 'exact rate change remains CHANGED when Number projections are equal')
  assert.equal(tiny.numericText[4], '+0.00', 'exact positive rate delta retains its sign at display precision')
  assert.ok(tiny.cells[7].label?.includes('Gap +0.00'), 'tiny exact positive cost Gap uses ordinary zero presentation')
  assert.match(tiny.cells[7].className, /text-rose-600/, 'tiny real positive Gap keeps semantic increase color')
  assert.ok(tiny.numericText.every(value => !/[0-9]E[+-]?\d+/i.test(value)), 'Candidate numeric display contains no scientific residue')

  const moved = find('Annealing moved')
  assert.equal(moved.status, 'CHANGED', 'Work Center move remains a real business change')
  assert.equal(moved.cells[7].text, '0.00', 'equal effective rates across a Work Center move retain zero Gap')
  assert.match(moved.cells[7].className, /text-slate-400/, 'zero Gap stays neutral despite CHANGED status')

  const unchangedBOM = find('BOM unchanged')
  assert.equal(unchangedBOM.status, 'UNCHANGED', 'equivalent BOM inputs remain UNCHANGED in the rendered Candidate table')
  assert.equal(browserErrors.length, 0, 'browser rendering has no uncaught errors, warnings, or console errors')
  process.stdout.write(JSON.stringify({ browser: baseUrl, checks: 23, rows }, null, 2) + '\n')
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.stderr.write(`Chrome diagnostics: ${JSON.stringify({ exitCode: chrome.exitCode, signalCode: chrome.signalCode, websocketState: client?.readyState ?? null, stderr: chromeOutput.join('').slice(-6000) })}\n`)
  process.stderr.write(`Vite diagnostics: ${JSON.stringify({ exitCode: vite.exitCode, signalCode: vite.signalCode, output: viteOutput.join('').slice(-3000) })}\n`)
  process.exitCode = 1
} finally {
  try { client?.close() } catch {}
  await Promise.all([stopChild(chrome), stopChild(vite)])
  let profileRemoved = false
  for (let attempt = 0; attempt < 5 && !profileRemoved; attempt++) {
    try { await rm(profile, { recursive: true, force: true }); profileRemoved = true }
    catch (error) { if (attempt === 4) process.stderr.write(`Chrome profile cleanup warning: ${error.message}\n`); else await delay(100) }
  }
}
