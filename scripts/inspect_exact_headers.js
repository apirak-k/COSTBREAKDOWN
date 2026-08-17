import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectExactHeadersAndData() {
  const p = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)

  wb.worksheets.forEach(ws => {
    console.log('\n============================================================')
    console.log(`SHEET: ${ws.name}`)
    console.log('============================================================')

    const colHeaders = []
    const colMaxDataLen = []

    // 1. Find Header Rows (rows that have styleHeaderRow with background fill or specific header text)
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      const firstCell = String(row.getCell(1).value || '')
      if (firstCell.startsWith('Sequence') || firstCell.startsWith('Item No') || firstCell.startsWith('Work Center') || firstCell.startsWith('Product Code') || firstCell.startsWith('Rank') || firstCell.startsWith('ID') || firstCell.startsWith('Cost Element')) {
        row.eachCell({ includeEmpty: false }, (cell, colNum) => {
          colHeaders[colNum] = String(cell.value || '')
        })
      } else if (!firstCell.includes('BREAKDOWN') && !firstCell.includes('SUMMARY') && !firstCell.includes('CALCULATION') && !firstCell.includes('INFO') && !firstCell.includes('DRIVERS') && !firstCell.includes('STANDARD VS')) {
        // Data row
        row.eachCell({ includeEmpty: false }, (cell, colNum) => {
          let str = ''
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object') {
              if (cell.value.result !== undefined && cell.value.result !== null) {
                str = String(cell.value.result)
              }
            } else {
              str = String(cell.value)
            }
          }
          if (!isNaN(Number(str)) && str.includes('.')) {
            str = Number(str).toFixed(4)
          }
          if (!colMaxDataLen[colNum] || str.length > colMaxDataLen[colNum]) {
            colMaxDataLen[colNum] = str.length
          }
        })
      }
    })

    if (ws.columns) {
      ws.columns.forEach((col, idx) => {
        const colNum = idx + 1
        const curWidth = col.width || 10
        const header = colHeaders[colNum] || `Col ${colNum}`
        const hLen = header.length
        const dLen = colMaxDataLen[colNum] || 0
        const maxLen = Math.max(hLen, dLen)
        const recWidth = Math.max(12, maxLen + 4)
        const isNarrow = curWidth < recWidth
        const status = isNarrow ? '⚠️ NARROW' : '✅ OK'
        console.log(`Col ${colNum.toString().padStart(2)} | Cur: ${curWidth.toString().padStart(3)} | Header: ${hLen.toString().padStart(2)} | Data: ${dLen.toString().padStart(2)} | Rec: ${recWidth.toString().padStart(3)} | ${status} | Header: "${header}"`)
      })
    }
  })
}

inspectExactHeadersAndData().catch(console.error)
