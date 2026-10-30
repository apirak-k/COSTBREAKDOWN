import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function findProductName() {
  const p = path.join(__dirname, '..', 'Sources', '250331 Cost declare XXXX-024,025,026-01.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)

  wb.worksheets.forEach(ws => {
    ws.eachRow((row, r) => {
      row.eachCell((cell, c) => {
        const val = String(cell.value || '')
        if (val.includes('024') || val.includes('RGOM') || val.includes('RG-024') || val.toLowerCase().includes('switch') || val.toLowerCase().includes('panel') || val.toLowerCase().includes('membrane')) {
          console.log(`Sheet: "${ws.name}" | Cell [${r},${c}] | Value: "${val}"`)
        }
      })
    })
  })
}

findProductName().catch(console.error)
