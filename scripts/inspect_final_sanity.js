import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectAll() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== FINAL SANITY AUDIT ===')
  wb.eachSheet((ws, id) => {
    console.log(`\nSheet [${id}]: ${ws.name} (RowCount: ${ws.rowCount}, ColumnCount: ${ws.columnCount})`)
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const row = ws.getRow(r)
      const vals = row.values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
      if (vals.length > 0) {
        console.log(`  Row ${r}:`, JSON.stringify(row.values.slice(1, 8)))
      }
    }
  })
}

inspectAll().catch(console.error)
