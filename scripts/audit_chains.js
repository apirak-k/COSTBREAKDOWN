import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function auditChains() {
  const tplPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_BLANK_TEMPLATE_v2.xlsx')
  const rgomPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const testPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_TEST_SCENARIOS_v2.xlsx')

  console.log('=== AUDITING SYSTEM-WIDE INTERCONNECTED FAILURE CHAINS ===\n')

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(testPath)

  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  const wsEngine = wb.getWorksheet('_CALC_ENGINE')
  const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')

  console.log('--- 1. Check Top 10 Dynamic vs Static Rows ---')
  for (let r = 13; r <= 22; r++) {
    const row = ws4.getRow(r)
    console.log(`Row ${r}: Rank Formula=${row.getCell(1).formula} | Controllability Formula=${row.getCell(9).formula} | Action Plan Formula=${row.getCell(10).formula}`)
  }

  console.log('\n--- 2. Check % Contribution Formula when Net Variance is Negative/Zero ---')
  console.log(`Row 13 % Contrib Formula: ${ws4.getRow(13).getCell(8).formula}`)

  console.log('\n--- 3. Check VLOOKUP Range in Routing Breakdown ---')
  console.log(`Row 47 Labor Formula: ${ws3.getRow(47).getCell(8).formula}`)

  console.log('\n--- 4. Check Base/Active Parameter formatting in Sheet 4 ---')
  console.log(`Row 13 Col E format: ${ws4.getRow(13).getCell(5).numFmt} | Col F format: ${ws4.getRow(13).getCell(6).numFmt}`)
  console.log(`Row 15 Col E format: ${ws4.getRow(15).getCell(5).numFmt} | Col F format: ${ws4.getRow(15).getCell(6).numFmt}`)
}

auditChains().catch(console.error)
