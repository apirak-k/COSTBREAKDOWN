import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function deepInspect() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('--- EXAMINING EVERY HEADER ROW IN ALL SHEETS ---')
  wb.eachSheet((ws, id) => {
    console.log(`\nSheet [${id}]: ${ws.name}`)
    // check rows 1 to 50
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const nonNull = row.values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
      if (nonNull.length > 0) {
        const isHeader = nonNull.every(v => typeof v === 'string' || typeof v === 'number')
        if (isHeader) {
          console.log(`  Row ${r}:`, JSON.stringify(row.values.slice(1)))
        }
      }
    }
  })
}

deepInspect().catch(console.error)
