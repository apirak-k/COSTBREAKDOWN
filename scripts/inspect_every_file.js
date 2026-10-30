import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

function getAllXlsx(dir) {
  let list = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.gemini') continue
    const full = path.join(dir, item.name)
    if (item.isDirectory()) list = list.concat(getAllXlsx(full))
    else if (item.name.endsWith('.xlsx') && !item.name.startsWith('~$')) list.push(full)
  }
  return list
}

async function inspectEveryFile() {
  const files = getAllXlsx(rootDir)
  for (const f of files) {
    const rel = path.relative(rootDir, f)
    console.log(`\n================================================================`)
    console.log(`FILE: ${rel}`)
    console.log(`================================================================`)
    const wb = new ExcelJS.Workbook()
    try {
      await wb.xlsx.readFile(f)
      for (const ws of wb.worksheets) {
        console.log(`\n--- Sheet: ${ws.name} ---`)
        ws.eachRow((row, r) => {
          const vals = row.values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
          // check if row contains header-like strings (e.g. Price, Labor, Cost, etc.)
          const str = vals.map(v => typeof v === 'object' && v.formula ? `[F]` : String(v)).join(' | ')
          if (str.includes('Price') || str.includes('Labor') || str.includes('Runtime') || str.includes('Cost Element') || str.includes('Rank') || str.includes('BOM') || str.includes('ROUTING') || str.includes('Variance')) {
            console.log(`  R${r}: ${str}`)
          }
        })
      }
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }
}

inspectEveryFile().catch(console.error)
