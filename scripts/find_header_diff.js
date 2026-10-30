import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function findHeaderDifferences() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== DETAILED HEADER AUDIT IN USER EDITED FILE ===')

  for (const ws of wb.worksheets) {
    console.log(`\nWorksheet: ${ws.name}`)
    // Sheet 1
    if (ws.name === '1_MASTER_RATES') {
      console.log('  Row 4:', ws.getRow(4).values.slice(1))
      console.log('  Row 8:', ws.getRow(8).values.slice(1))
    }
    // Sheet 2
    if (ws.name === '2_BOM_BREAKDOWN') {
      console.log('  Row 4:', ws.getRow(4).values.slice(1))
      console.log('  Row 23:', ws.getRow(23).values.slice(1))
    }
    // Sheet 3
    if (ws.name === '3_ROUTING_BREAKDOWN') {
      console.log('  Row 4:', ws.getRow(4).values.slice(1))
      console.log('  Row 46:', ws.getRow(46).values.slice(1))
    }
    // Sheet 4
    if (ws.name === '4_SUMMARY_&_COMPARISON') {
      console.log('  Row 4:', ws.getRow(4).values.slice(1))
      console.log('  Row 12:', ws.getRow(12).values.slice(1))
    }
    // Sheet 5
    if (ws.name === '_CALC_ENGINE') {
      console.log('  Row 3:', ws.getRow(3).values.slice(1))
    }
  }
}

findHeaderDifferences().catch(console.error)
