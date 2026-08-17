import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectSheet4Rows() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  console.log('=== SHEET 4 ROWS 12 to 23 ===')
  for (let r = 12; r <= 23; r++) {
    const row = ws4.getRow(r)
    const vals = []
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
        vals.push(`[F: ${cell.value.formula}]`)
      } else {
        vals.push(cell.value)
      }
    }
    console.log(`Row ${r}:`, JSON.stringify(vals))
  }
}

inspectSheet4Rows().catch(console.error)
