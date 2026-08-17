import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function diffUserXlsx() {
  const userFilePath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const userWb = new ExcelJS.Workbook()
  await userWb.xlsx.readFile(userFilePath)

  console.log('=== FULL DUMP OF USER-EDITED EXCEL FILE ===')
  for (const ws of userWb.worksheets) {
    console.log(`\n============================================================`)
    console.log(`SHEET: ${ws.name}`)
    console.log(`============================================================`)
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const nonNull = row.values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
      if (nonNull.length > 0) {
        const text = row.values.slice(1).map(v => {
          if (v === null || v === undefined) return ''
          if (typeof v === 'object') {
            if (v.formula) return `[Formula: ${v.formula}]`
            if (v.text) return `[RichText: ${v.text}]`
            return JSON.stringify(v)
          }
          return String(v)
        })
        console.log(`Row ${r}: ${JSON.stringify(text)}`)
      }
    }
  }
}

diffUserXlsx().catch(console.error)
