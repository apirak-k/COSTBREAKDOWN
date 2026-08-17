import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function checkWidths() {
  const p = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)

  wb.worksheets.forEach(ws => {
    console.log('\n========================================')
    console.log('SHEET:', ws.name)
    console.log('========================================')

    // Find all merged ranges to ignore top-left cells of multi-column merges
    const mergedTopLefts = new Set()
    if (ws._merges) {
      for (const m of Object.keys(ws._merges)) {
        const range = ws._merges[m]
        const startCol = range.left || range.s?.c + 1
        const endCol = range.right || range.e?.c + 1
        const startRow = range.top || range.s?.r + 1
        if (endCol > startCol) {
          mergedTopLefts.add(`${startRow}:${startCol}`)
        }
      }
    }

    const colMaxLen = {}
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        if (mergedTopLefts.has(`${rowNum}:${colNum}`)) return

        let valStr = ''
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object') {
            if (cell.value.result !== undefined && cell.value.result !== null) {
              valStr = String(cell.value.result)
            } else if (cell.value.formula) {
              valStr = ''
            }
          } else {
            valStr = String(cell.value)
          }
        }
        
        // If it's a number formatted as float, limit representation to realistic display length (e.g. 10-12 chars)
        if (!isNaN(Number(valStr)) && valStr.includes('.')) {
          valStr = Number(valStr).toFixed(4)
        }

        const len = valStr.length
        if (!colMaxLen[colNum] || len > colMaxLen[colNum].maxLen) {
          colMaxLen[colNum] = { maxLen: len, sample: valStr, rowNum }
        }
      })
    })

    if (ws.columns) {
      ws.columns.forEach((col, idx) => {
        const colNum = idx + 1
        const width = col.width || 10
        const info = colMaxLen[colNum] || { maxLen: 0, sample: '' }
        // Comfortably readable requires width >= maxLen + 3
        const isNarrow = width < info.maxLen + 3
        const status = isNarrow ? '⚠️ TOO NARROW' : '✅ OK'
        const recWidth = Math.max(width, info.maxLen + 4)
        console.log(`Col ${colNum.toString().padStart(2)} | Current: ${width.toString().padStart(3)} | MaxLen: ${info.maxLen.toString().padStart(2)} | Rec: ${recWidth.toString().padStart(3)} | ${status} | Sample: "${info.sample.substring(0, 40)}"`)
      })
    }
  })
}

checkWidths().catch(console.error)
