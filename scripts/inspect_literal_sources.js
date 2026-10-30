import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspect() {
  const f1 = path.join(__dirname, '..', 'Sources', '250331 Cost declare XXXX-024,025,026-01.xlsx')
  const wb1 = new ExcelJS.Workbook()
  await wb1.xlsx.readFile(f1)

  console.log('============================================================')
  console.log('FILE 1: 250331 Cost declare XXXX-024,025,026-01.xlsx')
  console.log('============================================================')
  wb1.worksheets.forEach(ws => {
    console.log(`\n--- EXACT SHEET NAME: "${ws.name}" (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ---`)
    for (let r = 1; r <= 35; r++) {
      const row = ws.getRow(r).values
      if (row && row.length > 1) {
        const clean = row.slice(1).map(v => (v !== null && v !== undefined) ? String(v).substring(0, 25) : '')
        if (clean.some(x => x !== '')) {
          console.log(` Row ${r.toString().padStart(2)}: ${JSON.stringify(clean.slice(0, 8))}`)
        }
      }
    }
  })

  const f2 = path.join(__dirname, '..', 'Sources', 'Copy of PRICE LIST 07-26_.xlsx')
  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.readFile(f2)

  console.log('\n============================================================')
  console.log('FILE 2: Copy of PRICE LIST 07-26_.xlsx')
  console.log('============================================================')
  wb2.worksheets.forEach(ws => {
    console.log(`\n--- EXACT SHEET NAME: "${ws.name}" (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ---`)
    for (let r = 1; r <= 25; r++) {
      const row = ws.getRow(r).values
      if (row && row.length > 1) {
        const clean = row.slice(1).map(v => (v !== null && v !== undefined) ? String(v).substring(0, 25) : '')
        if (clean.some(x => x !== '')) {
          console.log(` Row ${r.toString().padStart(2)}: ${JSON.stringify(clean.slice(0, 8))}`)
        }
      }
    }
  })
}

inspect().catch(console.error)
