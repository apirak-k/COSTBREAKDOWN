import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectSheet4() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== INSPECTING SHEET 4 TOP 10 LEADERBOARD ===')
  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  for (let r = 12; r <= 23; r++) {
    const row = ws4.getRow(r)
    console.log(`Row ${r}:`, JSON.stringify(row.values.slice(1)))
  }

  console.log('\n=== INSPECTING _CALC_ENGINE FIRST 10 ROWS ===')
  const ws5 = wb.getWorksheet('_CALC_ENGINE')
  for (let r = 3; r <= 10; r++) {
    const row = ws5.getRow(r)
    console.log(`Row ${r}:`, JSON.stringify(row.values.slice(1)))
  }
}

inspectSheet4().catch(console.error)
