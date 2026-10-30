import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspect() {
  const filePath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_TEST_SCENARIOS_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  console.log('=== INSPECTING TEST SCENARIO WORKBOOK ===')

  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  console.log('\n--- SHEET 4: 4_SUMMARY_&_COMPARISON (Executive Summary) ---')
  for (let r = 4; r <= 8; r++) {
    const row = ws4.getRow(r)
    const vals = []
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      vals.push(cell.formula ? `[F: ${cell.formula}]` : cell.value)
    }
    console.log(`Row ${r}:`, vals.join(' | '))
  }

  console.log('\n--- SHEET 4: TOP COST DRIVERS TABLE (Rows 12-22) ---')
  for (let r = 12; r <= 22; r++) {
    const row = ws4.getRow(r)
    const vals = []
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      vals.push(cell.formula ? `[F: ${cell.formula}]` : cell.value)
    }
    console.log(`Row ${r}:`, vals.join(' | '))
  }

  console.log('\n--- SHEET 5: _CALC_ENGINE (Top 15 Candidate Rows) ---')
  const ws5 = wb.getWorksheet('_CALC_ENGINE')
  for (let r = 3; r <= 18; r++) {
    const row = ws5.getRow(r)
    const vals = []
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c)
      vals.push(cell.formula ? `[F: ${cell.formula}]` : cell.value)
    }
    console.log(`Row ${r}:`, vals.join(' | '))
  }
}

inspect().catch(console.error)
