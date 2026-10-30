import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectExactUserChanges() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== EXACT INSPECTION OF CostModel_RGOM-024_v2.xlsx (USER EDITED) ===')

  for (const ws of wb.worksheets) {
    console.log(`\n============================================================`)
    console.log(`SHEET: ${ws.name}`)
    console.log(`============================================================`)

    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const values = row.values
      // Check if this row is a header or title or has text
      if (values && values.length > 1) {
        const textValues = values.slice(1).map(v => {
          if (v === null || v === undefined) return ''
          if (typeof v === 'object' && v.formula) return `[F: ${v.formula}]`
          return String(v)
        })
        if (textValues.some(t => t !== '')) {
          console.log(`Row ${r.toString().padStart(2)}: ${JSON.stringify(textValues)}`)
        }
      }
    }
  }
}

inspectExactUserChanges().catch(console.error)
