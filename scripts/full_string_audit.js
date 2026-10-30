import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fullStringAudit() {
  const modelPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const src1Path = path.join(__dirname, '..', 'Sources', '250331 Cost declare XXXX-024,025,026-01.xlsx')

  const wbModel = new ExcelJS.Workbook()
  await wbModel.xlsx.readFile(modelPath)

  const wbSrc1 = new ExcelJS.Workbook()
  await wbSrc1.xlsx.readFile(src1Path)

  console.log('============================================================')
  console.log('COMPREHENSIVE LITERAL STRING AUDIT: MODEL VS RAW SOURCES')
  console.log('============================================================')

  // 1. Sheet 1: Master Rates
  console.log('\n--- 1. AUDIT SHEET: 1_MASTER_RATES ---')
  const wsModel1 = wbModel.getWorksheet('1_MASTER_RATES')
  const wsSrc1_Rates = wbSrc1.getWorksheet('XXXX-024,025,026-01')
  const wsSrc1_BOM = wbSrc1.getWorksheet('BOM_XX-024')

  console.log('Product Info Model (Row 5):', wsModel1.getRow(5).values.slice(1, 6))
  console.log('Product Info Source:', {
    ProductName: wsSrc1_BOM.getCell('C5').value,
    ProductCode: wsSrc1_BOM.getCell('C4').value,
    Description: wsSrc1_BOM.getCell('C6').value,
    UOM: wsSrc1_BOM.getCell('E4').value
  })

  console.log('\nDepartment Rates Model (Rows 9-12):')
  for (let r = 9; r <= 12; r++) {
    console.log(` Row ${r}:`, wsModel1.getRow(r).values.slice(1, 6))
  }
  console.log('Department Rates Source (Rows 17-20 in XXXX-024,025,026-01):')
  for (let r = 17; r <= 20; r++) {
    console.log(` Row ${r}:`, wsSrc1_Rates.getRow(r).values.slice(1, 8))
  }

  // 2. Sheet 2: BOM Breakdown (16 Net Items)
  console.log('\n--- 2. AUDIT SHEET: 2_BOM_BREAKDOWN (16 ITEMS) ---')
  const wsModel2 = wbModel.getWorksheet('2_BOM_BREAKDOWN')
  console.log('Model BOM Descriptions (Rows 5-20):')
  for (let r = 5; r <= 20; r++) {
    console.log(` Row ${r.toString().padStart(2)}: Item ${wsModel2.getCell(`A${r}`).value.toString().padStart(2)} | Code: ${wsModel2.getCell(`B${r}`).value.padEnd(12)} | Qty: ${wsModel2.getCell(`D${r}`).value} ${wsModel2.getCell(`E${r}`).value} | Base: ${wsModel2.getCell(`F${r}`).value} | Loss: ${wsModel2.getCell(`H${r}`).value}`)
  }

  console.log('\nRaw Source 2.Material declare (Rows 111-126 in XXXX-024,025,026-01):')
  for (let r = 111; r <= 126; r++) {
    const row = wsSrc1_Rates.getRow(r)
    console.log(` Source Row ${r}: Code: ${String(row.getCell(1).value).trim().padEnd(12)} | Cons: ${row.getCell(5).value} ${row.getCell(6).value} | Price: ${row.getCell(7).value} | Loss: ${row.getCell(4).value}`)
  }

  // 3. Sheet 3: Routing Breakdown
  console.log('\n--- 3. AUDIT SHEET: 3_ROUTING_BREAKDOWN ---')
  const wsModel3 = wbModel.getWorksheet('3_ROUTING_BREAKDOWN')
  console.log('Model Routing (39 Steps):')
  for (let r = 5; r <= 43; r++) {
    const seq = wsModel3.getCell(`A${r}`).value
    const cat = wsModel3.getCell(`B${r}`).value
    const name = wsModel3.getCell(`C${r}`).value
    const dept = wsModel3.getCell(`D${r}`).value
    console.log(` Step ${seq.toString().padStart(2)} [${cat.padEnd(26)}] | Name: "${name.padEnd(36)}" | Dept: ${dept}`)
  }

  // 4. Sheet 4: Summary Table 1 & Table 2
  console.log('\n--- 4. AUDIT SHEET: 4_SUMMARY_&_COMPARISON ---')
  const wsModel4 = wbModel.getWorksheet('4_SUMMARY_&_COMPARISON')
  console.log('Table 1 Waterfall Summary:')
  for (let r = 5; r <= 8; r++) {
    console.log(` Row ${r}:`, wsModel4.getRow(r).values.slice(1, 7))
  }
  console.log('\nTable 2 Top 10 Drivers:')
  for (let r = 13; r <= 23; r++) {
    console.log(` Row ${r}: Rank ${wsModel4.getCell(`A${r}`).value} | Category: ${wsModel4.getCell(`B${r}`).value} | Driver: ${wsModel4.getCell(`C${r}`).value} | Cost Gap: ${wsModel4.getCell(`G${r}`).value}`)
  }
}

fullStringAudit().catch(console.error)
