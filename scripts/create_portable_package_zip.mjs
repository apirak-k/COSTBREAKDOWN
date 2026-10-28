import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import JSZip from 'jszip'

const packageRoot = resolve(process.argv[2] ?? '')
const archivePath = resolve(process.argv[3] ?? '')
if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: node scripts/create_portable_package_zip.mjs <package-directory> <archive-path>')
}

const executablePatterns = [
  /^Linux\/(?:Start COSTBREAKDOWN|Stop COSTBREAKDOWN|Start COSTBREAKDOWN\.desktop|Stop COSTBREAKDOWN\.desktop)$/,
  /^Linux\/runtime\/costbreakdown-linux-(?:amd64|arm64)$/,
  /^macOS\/(?:Start|Stop) COSTBREAKDOWN\.app\/Contents\/MacOS\/(?:Start|Stop) COSTBREAKDOWN$/,
]

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path, files)
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const archive = new JSZip()
const packageName = basename(packageRoot)
for (const filePath of await walk(packageRoot)) {
  const localPath = relative(packageRoot, filePath).split(sep).join('/')
  const packagePath = `${packageName}/${localPath}`
  const info = await stat(filePath)
  const mode = executablePatterns.some(pattern => pattern.test(localPath)) ? 0o100755 : 0o100644
  archive.file(packagePath, await readFile(filePath), {
    date: info.mtime,
    binary: true,
    unixPermissions: mode,
  })
}

const content = await archive.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
  platform: 'UNIX',
})
await writeFile(archivePath, content)
console.log(`Created portable package ZIP: ${archivePath} (${content.length} bytes)`)
