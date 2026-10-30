import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function inspectFullConsistency() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(modelPath)

  console.log('=== FULL CONSISTENCY SCAN ACROSS ALL 5 WORKSHEETS ===\n')

  wb.eachSheet((ws, id) => {
    console.log(`================================================================`)
    console.log(`SHEET [${id}]: ${ws.name}`)
    console.log(`================================================================`)

    ws.eachRow((row, r) => {
      const vals = row.values.slice(1).filter(v => v !== null && v !== undefined && v !== '')
      if (vals.length > 0) {
        // Look for titles (merged rows or row 1/3/7/11/22/45)
        const firstVal = typeof vals[0] === 'string' ? vals[0] : ''
        if (firstVal.includes('BREAKDOWN') || firstVal.includes('RATES') || firstVal.includes('INPUT') || firstVal.includes('CALCULATION') || firstVal.includes('SUMMARY') || firstVal.includes('DRIVERS') || firstVal.includes('ENGINE')) {
          console.log(`[TITLE/SECTION] Row ${r}: ${firstVal}`)
        }
        // Look for table header rows
        if (firstVal === 'Product Name' || firstVal === 'Department' || firstVal === 'Item No' || firstVal === 'Sequence' || firstVal === 'Cost Element' || firstVal === 'Rank' || firstVal === 'ID') {
          console.log(`[TABLE HEADER]  Row ${r}:`, JSON.stringify(vals.map(v => typeof v === 'string' ? v : '')))
        }
      }
    })
  })

  // Inspect unique Section values in Sheet 3
  const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')
  const sections = new Set()
  for (let r = 5; r <= 43; r++) {
    sections.add(ws3.getCell(`B${r}`).value)
  }
  console.log('\n[Sheet 3 Current Section Values in Column B]:')
  console.log(Array.from(sections))
}

inspectFullConsistency().catch(console.error)
