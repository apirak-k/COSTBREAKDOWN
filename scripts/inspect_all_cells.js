import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectAllCells() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  for (const ws of wb.worksheets) {
    console.log(`\n======================================================`)
    console.log(`SHEET: ${ws.name}`)
    console.log(`======================================================`)
    ws.eachRow((row, rowNumber) => {
      const values = row.values.slice(1)
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '')
      if (nonNull.length > 0) {
        // print headers or non-standard rows
        const str = values.map(v => {
          if (v === null || v === undefined) return ''
          if (typeof v === 'object' && v.formula) return `[F: ${v.formula}]`
          return String(v)
        }).join(' | ')
        console.log(`R${rowNumber.toString().padStart(2)}: ${str}`)
      }
    })
  }
}

inspectAllCells().catch(console.error)
