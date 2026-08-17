import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

async function scanAllExcelHeaders() {
  function findXlsx(dir) {
    let results = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.gemini') continue
      if (e.isDirectory()) results = results.concat(findXlsx(p))
      else if (e.name.endsWith('.xlsx') && !e.name.startsWith('~$')) results.push(p)
    }
    return results
  }

  const files = findXlsx(rootDir)
  for (const f of files) {
    const rel = path.relative(rootDir, f)
    console.log(`\n============================================================`)
    console.log(`FILE: ${rel}`)
    try {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.readFile(f)
      for (const ws of wb.worksheets) {
        console.log(` Sheet: ${ws.name}`)
        for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
          const vals = ws.getRow(r).values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
          if (vals.length > 0 && typeof vals[0] === 'string' && (vals[0].includes('(') || vals[0].includes('Base') || vals[0].includes('Item') || vals[0].includes('Seq') || vals[0].includes('Cost'))) {
            console.log(`   R${r}: ${JSON.stringify(vals)}`)
          }
        }
      }
    } catch (err) {
      console.log(`   Error reading: ${err.message}`)
    }
  }
}

scanAllExcelHeaders().catch(console.error)
