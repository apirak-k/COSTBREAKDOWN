import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectExactSectionTitles() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== INSPECTING SECTION TITLES IN USER EDITED FILE ===')

  // Sheet 1
  const ws1 = wb.getWorksheet('1_MASTER_RATES')
  console.log('Sheet 1 Main Title (A1):', ws1.getCell('A1').value)
  console.log('Sheet 1 Table 1 Title (A3):', ws1.getCell('A3').value)
  console.log('Sheet 1 Table 2 Title (A7):', ws1.getCell('A7').value)

  // Sheet 2
  const ws2 = wb.getWorksheet('2_BOM_BREAKDOWN')
  console.log('Sheet 2 Main Title (A1):', ws2.getCell('A1').value)
  console.log('Sheet 2 Table 1 Title (A3):', ws2.getCell('A3').value)
  console.log('Sheet 2 Table 2 Title (A22):', ws2.getCell('A22').value)

  // Sheet 3
  const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')
  console.log('Sheet 3 Main Title (A1):', ws3.getCell('A1').value)
  console.log('Sheet 3 Table 1 Title (A3):', ws3.getCell('A3').value)
  console.log('Sheet 3 Table 2 Title (A45):', ws3.getCell('A45').value)

  // Sheet 4
  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  console.log('Sheet 4 Main Title (A1):', ws4.getCell('A1').value)
  console.log('Sheet 4 Table 1 Title (A3):', ws4.getCell('A3').value)
  console.log('Sheet 4 Table 2 Title (A11):', ws4.getCell('A11').value)
}

inspectExactSectionTitles().catch(console.error)
