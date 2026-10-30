import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

function getFiles(dir) {
  let res = []
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.gemini') continue
    const p = path.join(dir, item.name)
    if (item.isDirectory()) res = res.concat(getFiles(p))
    else res.push(p)
  }
  return res
}

const files = getFiles(rootDir)
files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

console.log('Top 15 most recently modified files in project:')
for (let i = 0; i < Math.min(files.length, 15); i++) {
  const f = files[i]
  const st = fs.statSync(f)
  console.log(`${st.mtime.toLocaleString('th-TH')} | ${path.relative(rootDir, f)}`)
}
