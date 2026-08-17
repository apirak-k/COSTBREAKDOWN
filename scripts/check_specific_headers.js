import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function checkSpecificHeaders() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  for (const ws of wb.worksheets) {
    console.log(`\n==============================================`)
    console.log(`SHEET: ${ws.name}`)
    console.log(`==============================================`)
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const values = row.values.slice(1)
      const hasContent = values.some(v => v !== null && v !== undefined && v !== '')
      if (hasContent) {
        // print if string or formula
        console.log(`R${r}:`, values.map(v => (v && typeof v === 'object' && v.formula) ? `[F]` : v))
      }
    }
  }
}

checkSpecificHeaders().catch(console.error)
