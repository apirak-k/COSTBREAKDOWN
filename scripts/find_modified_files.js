import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.gemini') continue
    if (entry.isDirectory()) {
      scanDir(fullPath)
    } else {
      const stat = fs.statSync(fullPath)
      const rel = path.relative(rootDir, fullPath)
      console.log(`${stat.mtime.toISOString()} | ${stat.size.toString().padStart(8)} bytes | ${rel}`)
    }
  }
}

console.log('=== WORKSPACE FILE MODIFICATION TIMES ===')
scanDir(rootDir)
