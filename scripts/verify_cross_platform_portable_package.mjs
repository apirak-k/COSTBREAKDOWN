import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import JSZip from 'jszip'

const packageRoot = resolve(process.argv[2] ?? 'release/COSTBREAKDOWN-portable')
const archivePath = resolve(process.argv[3] ?? join(dirname(packageRoot), 'COSTBREAKDOWN-portable.zip'))

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function assertFile(path, label) {
  assert.ok(await exists(path), `${label} exists at ${path}`)
}

function readUInt32BE(buffer, offset) {
  return buffer.readUInt32BE(offset)
}

async function listFiles(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(root, relative))
    else files.push(relative.split(sep).join('/'))
  }
  return files
}

await assertFile(join(packageRoot, 'README.md'), 'Package README')
await assertFile(join(packageRoot, 'USER_GUIDE.md'), 'User guide')
await assertFile(join(packageRoot, 'app', 'index.html'), 'Single shared app entry')
await assertFile(join(packageRoot, 'app', 'assets'), 'Single shared app assets directory')
await assertFile(join(packageRoot, 'docs', 'images', 'user-journey.svg'), 'User guide overview diagram')

const packageFiles = await listFiles(packageRoot)
const packageEntries = (await readdir(packageRoot)).sort()
assert.deepEqual(packageEntries, ['Linux', 'README.md', 'USER_GUIDE.md', 'Windows', 'app', 'docs', 'macOS'].sort(),
  'portable package exposes only its user guides, shared app, and three operating-system folders')
assert.ok(!packageFiles.includes('index.html'), 'app entry is not duplicated at package root')
assert.ok(packageFiles.filter(path => path.endsWith('/index.html')).every(path => path === 'app/index.html'),
  'the package contains exactly one application index')
assert.ok(packageFiles.filter(path => path.includes('/assets/')).every(path => path.startsWith('app/assets/')),
  'web assets exist only under app/assets')
assert.ok(packageFiles.some(path => path.startsWith('app/assets/') && path.endsWith('.css')),
  'the shared app includes its compiled CSS')
assert.ok(packageFiles.some(path => path.startsWith('app/assets/') && path.endsWith('.js')),
  'the shared app includes its compiled JavaScript and Excel modules')
assert.ok(packageFiles.some(path => path.startsWith('docs/images/')),
  'the package retains user guide screenshots and diagrams')

for (const path of [
  'Windows/Start COSTBREAKDOWN.exe',
  'Windows/Stop COSTBREAKDOWN.exe',
  'Windows/runtime/Serve-COSTBREAKDOWN.ps1',
  'macOS/Start COSTBREAKDOWN.app/Contents/Info.plist',
  'macOS/Stop COSTBREAKDOWN.app/Contents/Info.plist',
  'macOS/Start COSTBREAKDOWN.app/Contents/MacOS/Start COSTBREAKDOWN',
  'macOS/Stop COSTBREAKDOWN.app/Contents/MacOS/Stop COSTBREAKDOWN',
  'Linux/Start COSTBREAKDOWN.desktop',
  'Linux/Stop COSTBREAKDOWN.desktop',
  'Linux/runtime/start.sh',
  'Linux/runtime/stop.sh',
  'Linux/runtime/costbreakdown-linux-amd64',
  'Linux/runtime/costbreakdown-linux-arm64',
]) {
  assert.ok(packageFiles.includes(path), `required platform file exists: ${path}`)
}
assert.deepEqual((await readdir(join(packageRoot, 'Windows'))).sort(), ['Start COSTBREAKDOWN.exe', 'Stop COSTBREAKDOWN.exe', 'runtime'].sort(),
  'Windows root exposes only Start, Stop, and internal runtime')
assert.deepEqual((await readdir(join(packageRoot, 'Windows', 'runtime'))).sort(), ['Serve-COSTBREAKDOWN.ps1'],
  'Windows implementation helper stays under runtime')
assert.deepEqual((await readdir(join(packageRoot, 'Linux'))).sort(), ['Start COSTBREAKDOWN.desktop', 'Stop COSTBREAKDOWN.desktop', 'runtime'].sort(),
  'Linux root exposes only the two GUI launchers and internal runtime')
assert.deepEqual((await readdir(join(packageRoot, 'Linux', 'runtime'))).sort(), ['costbreakdown-linux-amd64', 'costbreakdown-linux-arm64', 'start.sh', 'stop.sh'].sort(),
  'Linux runtime contains both architectures and internal Start/Stop wrappers')
assert.deepEqual((await readdir(join(packageRoot, 'macOS'))).sort(), ['Start COSTBREAKDOWN.app', 'Stop COSTBREAKDOWN.app'].sort(),
  'macOS root exposes only the two app bundles')
assert.ok(!packageFiles.includes('Linux/Start COSTBREAKDOWN') && !packageFiles.includes('Linux/Stop COSTBREAKDOWN'),
  'Linux has no duplicate shell launchers beside the GUI launchers')

for (const name of ['Start COSTBREAKDOWN', 'Stop COSTBREAKDOWN']) {
  const info = await readFile(join(packageRoot, 'macOS', `${name}.app`, 'Contents', 'Info.plist'), 'utf8')
  assert.match(info, /<key>CFBundleExecutable<\/key>\s*<string>[^<]+<\/string>/,
    `${name}.app declares a native executable`)
  assert.match(info, /<key>CFBundlePackageType<\/key>\s*<string>APPL<\/string>/,
    `${name}.app is an application bundle`)

  const executable = await readFile(join(packageRoot, 'macOS', `${name}.app`, 'Contents', 'MacOS', name))
  assert.equal(executable.readUInt32BE(0), 0xcafebabf, `${name}.app contains a 64-bit universal Mach-O`)
  const architectureCount = readUInt32BE(executable, 4)
  assert.equal(architectureCount, 2, `${name}.app supports Intel and Apple Silicon`)
  const architectures = new Set()
  for (let index = 0; index < architectureCount; index += 1) {
    const entryOffset = 8 + index * 32
    architectures.add(readUInt32BE(executable, entryOffset))
  }
  assert.deepEqual(architectures, new Set([0x01000007, 0x0100000c]),
    `${name}.app includes x86_64 and arm64 Mach-O slices`)
}

for (const name of ['Start COSTBREAKDOWN', 'Stop COSTBREAKDOWN']) {
  const desktopPath = join(packageRoot, 'Linux', `${name}.desktop`)
  const desktop = await readFile(desktopPath, 'utf8')
  assert.match(desktop, /^Terminal=false$/m, `${name} desktop launcher does not open a terminal`)
  assert.match(desktop, /^Exec=.*%k/m, `${name} desktop launcher resolves its location from the desktop entry`)
  assert.match(desktop, new RegExp(`Exec=.*runtime/${name.startsWith('Start') ? 'start' : 'stop'}\\.sh.*%k`),
    `${name} desktop launcher invokes the matching internal wrapper`)
  assert.match(desktop, /^Type=Application$/m, `${name} desktop entry is an application`)
}

const startScript = await readFile(join(packageRoot, 'Linux', 'runtime', 'start.sh'), 'utf8')
const stopScript = await readFile(join(packageRoot, 'Linux', 'runtime', 'stop.sh'), 'utf8')
assert.match(startScript, /^#!\/bin\/sh/m, 'Linux Start is a POSIX launcher')
assert.match(stopScript, /^#!\/bin\/sh/m, 'Linux Stop is a POSIX launcher')
assert.ok(startScript.startsWith('#!/bin/sh\n') && stopScript.startsWith('#!/bin/sh\n'),
  'Linux launcher shebangs begin at byte zero and use Unix line endings')
assert.doesNotMatch(startScript + stopScript, /\r\n/, 'Linux launchers use Unix line endings')
for (const [label, value] of [['Linux Start wrapper', startScript], ['Linux Stop wrapper', stopScript]]) {
  assert.doesNotMatch(value, /[A-Z]:\\|\/Users\/[^/]+|\/home\/[^/]+/,
    `${label} does not contain a machine-specific absolute path`)
}

for (const [path, machine] of [
  ['Linux/runtime/costbreakdown-linux-amd64', 62],
  ['Linux/runtime/costbreakdown-linux-arm64', 183],
]) {
  const binary = await readFile(join(packageRoot, path))
  assert.equal(binary.subarray(0, 4).toString('hex'), '7f454c46', `${path} is an ELF executable`)
  assert.equal(binary.readUInt16LE(18), machine, `${path} targets the expected Linux architecture`)
}

const archive = await JSZip.loadAsync(await readFile(archivePath))
const archiveFiles = Object.keys(archive.files).filter(path => !archive.files[path].dir).sort()
const archivePrefix = `${basename(packageRoot)}/`
assert.ok(archiveFiles.every(path => path.startsWith(archivePrefix)), 'ZIP stores files beneath one package folder')
assert.ok(archiveFiles.some(path => path.endsWith('/app/index.html')), 'ZIP includes the shared app')
assert.ok(archiveFiles.some(path => path.endsWith('/Windows/Start COSTBREAKDOWN.exe')), 'ZIP includes Windows launchers')
assert.ok(archiveFiles.some(path => path.endsWith('/macOS/Start COSTBREAKDOWN.app/Contents/Info.plist')),
  'ZIP includes macOS app bundles')
assert.ok(archiveFiles.some(path => path.endsWith('/Linux/Start COSTBREAKDOWN.desktop')),
  'ZIP includes Linux desktop launchers')
for (const path of archiveFiles.filter(path =>
  /\/(?:Linux\/(?:Start|Stop) COSTBREAKDOWN\.desktop|Linux\/runtime\/(?:start|stop)\.sh|Linux\/runtime\/costbreakdown-linux-(?:amd64|arm64)|macOS\/[^/]+\.app\/Contents\/MacOS\/[^/]+)$/.test(path))) {
  const permissions = archive.files[path].unixPermissions ?? 0
  const mode = typeof permissions === 'string'
    ? Number.parseInt(permissions, 8) & 0o777
    : permissions & 0o777
  assert.equal(mode & 0o111, 0o111, `${path} keeps executable permissions in the ZIP`)
}

for (const path of ['README.md', 'USER_GUIDE.md']) {
  const document = await readFile(join(packageRoot, path), 'utf8')
  const links = [...document.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1])
  for (const link of links.filter(value => !/^(?:https?:|data:)/.test(value))) {
    assert.ok(await exists(join(packageRoot, link)), `${path} image still resolves: ${link}`)
  }
}

function headingSlugs(markdown) {
  const counts = new Map()
  const slugs = new Set()
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = match[1]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    slugs.add(count ? `${base}-${count}` : base)
  }
  return slugs
}

let localDocumentationReferences = 0
for (const path of ['README.md', 'USER_GUIDE.md']) {
  const document = await readFile(join(packageRoot, path), 'utf8')
  const currentHeadings = headingSlugs(document)
  for (const match of document.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const destination = match[1].trim().split(/\s+/)[0].replace(/^<|>$/g, '')
    if (/^(?:https?:|mailto:|data:)/i.test(destination)) continue
    const hash = destination.indexOf('#')
    const targetPath = decodeURIComponent(hash < 0 ? destination : destination.slice(0, hash))
    const fragment = hash < 0 ? '' : decodeURIComponent(destination.slice(hash + 1))
    if (targetPath) {
      const target = resolve(packageRoot, targetPath)
      assert.ok(target.startsWith(`${packageRoot}${sep}`), `${path} link stays inside the package: ${destination}`)
      await readFile(target)
      if (extname(target).toLowerCase() === '.md' && fragment) {
        assert.ok(headingSlugs(await readFile(target, 'utf8')).has(fragment), `${path} Markdown anchor resolves: ${destination}`)
      }
    } else if (fragment) {
      assert.ok(currentHeadings.has(fragment), `${path} anchor resolves: ${destination}`)
    }
    localDocumentationReferences++
  }
}
assert.ok(localDocumentationReferences > 0, 'user documentation contains checked local links or images')
console.log(`PASS documentation links and images (${localDocumentationReferences} local references checked)`)

const runtimeFiles = [
  'Windows/runtime/Serve-COSTBREAKDOWN.ps1',
  'Linux/runtime/start.sh',
  'Linux/runtime/stop.sh',
  'Linux/Start COSTBREAKDOWN.desktop',
  'Linux/Stop COSTBREAKDOWN.desktop',
]
const runtimeText = (await Promise.all(runtimeFiles.map(path => readFile(join(packageRoot, path), 'utf8')))).join('\n')
assert.doesNotMatch(runtimeText, /E:\\COSTBREAKDOWN|C:\\Users\\Boom/i,
  'runtime helpers contain no repository-specific paths')
assert.doesNotMatch(runtimeText, /https?:\/\/(?!127\.0\.0\.1|localhost)[^\s"']+/,
  'runtime helpers do not reference external endpoints')
assert.match(await readFile(join(packageRoot, 'Windows', 'runtime', 'Serve-COSTBREAKDOWN.ps1'), 'utf8'), /Join-Path \$appRoot/,
  'Windows server serves from the shared app directory')
assert.match(startScript, /costbreakdown-linux-\$architecture.*--start/,
  'Linux launcher selects the matching bundled runtime')
assert.match(stopScript, /costbreakdown-linux-\$architecture.*--stop/,
  'Linux Stop wrapper selects the matching bundled runtime')

const zipTextFiles = [
  'README.md',
  'USER_GUIDE.md',
  'Windows/runtime/Serve-COSTBREAKDOWN.ps1',
  'Linux/runtime/start.sh',
  'Linux/runtime/stop.sh',
  'Linux/Start COSTBREAKDOWN.desktop',
  'Linux/Stop COSTBREAKDOWN.desktop',
]
assert.ok(zipTextFiles.every(path => packageFiles.includes(path)), 'package contains user docs and all platform instructions')
assert.deepEqual(archiveFiles.map(path => path.slice(path.indexOf('/') + 1)).sort(), packageFiles.slice().sort(),
  'ZIP contains exactly the files in the verified package folder')
assert.equal(await readFile(join(packageRoot, 'README.md'), 'utf8'), await readFile(resolve('README.md'), 'utf8'),
  'package README matches the finalized project README')
assert.equal(await readFile(join(packageRoot, 'USER_GUIDE.md'), 'utf8'), await readFile(resolve('USER_GUIDE.md'), 'utf8'),
  'package user guide matches the finalized project guide')

console.log(`PASS cross-platform package layout and archive (${packageFiles.length} files, one shared app)`)
