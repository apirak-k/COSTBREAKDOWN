import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function printAllHeaders() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  for (const ws of wb.worksheets) {
    console.log(`\n=== SHEET: ${ws.name} ===`)
    for (let r = 1; r <= Math.min(ws.rowCount, 50); r++) {
      const row = ws.getRow(r)
      const values = row.values.slice(1)
      // If row has text strings
      if (values.some(v => typeof v === 'string')) {
        console.log(`  Row ${r}:`, JSON.stringify(values))
      }
    }
  }
}

printAllHeaders().catch(console.error)
