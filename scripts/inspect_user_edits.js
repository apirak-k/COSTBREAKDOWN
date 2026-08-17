import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectUserEdits() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== INSPECTING USER EDITS IN CostModel_RGOM-024_v2.xlsx ===')
  for (const ws of wb.worksheets) {
    console.log(`\n--- WORKSHEET: ${ws.name} ---`)
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const row = ws.getRow(r)
      const values = row.values.slice(1)
      if (values.some(v => v !== null && v !== undefined && v !== '')) {
        console.log(`Row ${r}:`, JSON.stringify(values))
      }
    }
    // Also check if row 22-24 or 44-46 have headers
    if (ws.name === '2_BOM_BREAKDOWN') {
      console.log(`Row 22:`, JSON.stringify(ws.getRow(22).values.slice(1)))
      console.log(`Row 23:`, JSON.stringify(ws.getRow(23).values.slice(1)))
    }
    if (ws.name === '3_ROUTING_BREAKDOWN') {
      console.log(`Row 45:`, JSON.stringify(ws.getRow(45).values.slice(1)))
      console.log(`Row 46:`, JSON.stringify(ws.getRow(46).values.slice(1)))
    }
  }
}

inspectUserEdits().catch(console.error)
