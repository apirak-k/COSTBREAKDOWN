import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function deepInspectAll() {
  const tplPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_BLANK_TEMPLATE_v2.xlsx')
  const rgomPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')

  console.log('=================================================================')
  console.log('COMPREHENSIVE AUDIT OF BOTH TEMPLATE AND POPULATED MODELS')
  console.log('=================================================================')

  for (const [name, filePath] of [['BLANK TEMPLATE', tplPath], ['RGOM-024 POPULATED', rgomPath]]) {
    console.log(`\n>>> AUDITING FILE: ${name} <<<`)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(filePath)

    // Check Sheet 1
    const ws1 = wb.getWorksheet('1_MASTER_RATES')
    console.log(`[Sheet 1: 1_MASTER_RATES] Views Gridlines: ${ws1.views[0]?.showGridLines}`)
    console.log(`  Product info row 5 fill: ${ws1.getRow(5).getCell(1).fill?.fgColor?.argb}`)
    console.log(`  Rates row 9-12 fill: ${ws1.getRow(9).getCell(1).fill?.fgColor?.argb}`)

    // Check Sheet 2
    const ws2 = wb.getWorksheet('2_BOM_BREAKDOWN')
    console.log(`[Sheet 2: 2_BOM_BREAKDOWN]`)
    console.log(`  Input Row 5 fill: ${ws2.getRow(5).getCell(1).fill?.fgColor?.argb}`)
    console.log(`  Calc Row 24 fill: ${ws2.getRow(24).getCell(1).fill?.fgColor?.argb || 'None (White)'}`)
    console.log(`  Total Row 40 fill: ${ws2.getRow(40).getCell(1).fill?.fgColor?.argb}`)

    // Check Sheet 3
    const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')
    console.log(`[Sheet 3: 3_ROUTING_BREAKDOWN]`)
    console.log(`  Input Row 5 fill: ${ws3.getRow(5).getCell(1).fill?.fgColor?.argb}`)
    console.log(`  Calc Row 47 fill: ${ws3.getRow(47).getCell(1).fill?.fgColor?.argb || 'None (White)'}`)
    console.log(`  Total Row 86 fill: ${ws3.getRow(86).getCell(1).fill?.fgColor?.argb}`)

    // Check Sheet 4
    const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
    console.log(`[Sheet 4: 4_SUMMARY_&_COMPARISON]`)
    for (let r = 13; r <= 15; r++) {
      const row = ws4.getRow(r)
      console.log(`  Row ${r}:`)
      console.log(`    Col A-H (Rank to %): Formula=${!!row.getCell(1).formula}, Fill=${row.getCell(1).fill?.fgColor?.argb || 'White'}`)
      console.log(`    Col I (Controllability): Formula=${row.getCell(9).formula || 'None'}, Value=${row.getCell(9).value}, Fill=${row.getCell(9).fill?.fgColor?.argb || 'White'}`)
      console.log(`    Col J (Action Plan): Formula=${row.getCell(10).formula || 'None'}, Value=${row.getCell(10).value}, Fill=${row.getCell(10).fill?.fgColor?.argb || 'White'}`)
    }

    // Check Sheet 5
    const ws5 = wb.getWorksheet('_CALC_ENGINE')
    console.log(`[Sheet 5: _CALC_ENGINE]`)
    console.log(`  Row count: ${ws5.rowCount}`)
    console.log(`  Row 4 Mat formula RCA: ${ws5.getRow(4).getCell(4).formula}`)
    console.log(`  Row 20 Routing formula RCA: ${ws5.getRow(20).getCell(4).formula}`)
  }
}

deepInspectAll().catch(console.error)
