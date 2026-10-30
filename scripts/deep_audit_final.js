import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function auditModel(filePath, isTemplate) {
  const fileName = path.basename(filePath)
  console.log(`\n============================================================`)
  console.log(`DEEP AUDIT REPORT FOR: ${fileName}`)
  console.log(`============================================================`)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  let passed = 0
  let failed = 0

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`)
      passed++
    } else {
      console.error(`  [FAIL] ${msg}`)
      failed++
    }
  }

  // --- SHEET 1 ---
  const ws1 = wb.getWorksheet('1_MASTER_RATES')
  assert(ws1 !== undefined, 'Sheet 1 exists')
  assert(ws1.getCell('A1').value === 'PRODUCT INFO & WORK CENTER RATES', 'Sheet 1 Main Title is intact')
  assert(ws1.getCell('A7').value === 'WORK CENTER RATES', 'Sheet 1 Section Title is clean (no parentheses)')
  assert(ws1.getRow(8).getCell(1).value === 'Department', 'Sheet 1 Table 2 Header is Department')

  // --- SHEET 2 ---
  const ws2 = wb.getWorksheet('2_BOM_BREAKDOWN')
  assert(ws2 !== undefined, 'Sheet 2 exists')
  assert(ws2.getCell('A1').value === 'DIRECT MATERIAL COST BREAKDOWN (BOM)', 'Sheet 2 Main Title is intact')
  assert(ws2.getCell('A3').value === 'BOM INPUT DATA', 'Sheet 2 Section 1 Title is clean')
  assert(ws2.getCell('A22').value === 'BOM COST CALCULATION & VARIANCE', 'Sheet 2 Section 2 Title is clean')
  const r2Total = ws2.getRow(40)
  assert(r2Total.getCell(1).value === 'Total', 'Sheet 2 Row 40 Total Header verified (clean Total)')
  if (!isTemplate) {
    assert(r2Total.getCell(4).result > 0, `Sheet 2 Base Total Material Cost is calculated: ${r2Total.getCell(4).result.toFixed(4)} THB`)
  }

  // --- SHEET 3 ---
  const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')
  assert(ws3 !== undefined, 'Sheet 3 exists')
  assert(ws3.getCell('A1').value === 'CONVERSION PROCESS COST BREAKDOWN (ROUTING)', 'Sheet 3 Main Title is intact')
  assert(ws3.getCell('A3').value === 'ROUTING PROCESS INPUT', 'Sheet 3 Section 1 Title is clean')
  assert(ws3.getCell('A45').value === 'CONVERSION COST CALCULATION & VARIANCE', 'Sheet 3 Section 2 Title is clean')
  assert(ws3.getRow(4).getCell(2).value === 'Section', 'Sheet 3 Table 1 Col B Header is Section')
  assert(ws3.getRow(46).getCell(2).value === 'Section', 'Sheet 3 Table 2 Col B Header is Section')
  
  // Verify Category names have no leading numbers
  const catNames = new Set()
  for (let r = 5; r <= 43; r++) {
    catNames.add(ws3.getRow(r).getCell(2).value)
  }
  const hasNoNumbers = Array.from(catNames).every(name => !/^\d+\./.test(name))
  assert(hasNoNumbers, `Sheet 3 Section values contain zero leading numbers: [${Array.from(catNames).join(', ')}]`)

  const r3Total = ws3.getRow(86)
  assert(r3Total.getCell(1).value === 'Total', 'Sheet 3 Row 86 Total Header verified (clean Total)')
  if (!isTemplate) {
    assert(r3Total.getCell(8).result > 0, `Sheet 3 Base Labor is calculated: ${r3Total.getCell(8).result.toFixed(4)} THB`)
    assert(r3Total.getCell(11).result > 0, `Sheet 3 Base Burden is calculated: ${r3Total.getCell(11).result.toFixed(4)} THB`)
    assert(r3Total.getCell(14).result > 0, `Sheet 3 Base Process Total is calculated: ${r3Total.getCell(14).result.toFixed(4)} THB`)
  }

  // --- SHEET 5 ---
  const ws5 = wb.getWorksheet('_CALC_ENGINE')
  assert(ws5 !== undefined, 'Sheet 5 exists')
  assert(ws5.getRow(3).actualCellCount === 8, 'Sheet 5 Header has exactly 8 columns')
  assert(ws5.getRow(3).getCell(8).value === 'Tie-Breaker Score', 'Sheet 5 Col H is Tie-Breaker Score')
  assert(ws5.getRow(3).getCell(4).value === 'Level 4 RCA Parameter', 'Sheet 5 Col D is Level 4 RCA Parameter')

  // --- SHEET 4 ---
  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  assert(ws4 !== undefined, 'Sheet 4 exists')
  assert(ws4.getCell('A1').value === 'COST SUMMARY & VARIANCE COMPARISON', 'Sheet 4 Main Title is intact')
  assert(ws4.getCell('A3').value === 'REFERENCE STANDARD VS CURRENT STANDARD', 'Sheet 4 Section 1 Title is clean')
  assert(ws4.getCell('A11').value === 'TOP COST DRIVERS', 'Sheet 4 Section 2 Title is clean')
  
  const r4H = ws4.getRow(12)
  assert(r4H.getCell(9).value === 'Controllability', 'Sheet 4 Col I is Controllability')
  assert(r4H.getCell(10).value === 'Action Plan', 'Sheet 4 Col J is Action Plan (single word)')

  if (!isTemplate) {
    // Check Rank 1 and 2
    const row13 = ws4.getRow(13)
    const row14 = ws4.getRow(14)
    assert(row13.getCell(1).result === 1, 'Top 1 Rank is 1')
    assert(row13.getCell(3).result === 'DOTITE XA-3645', 'Top 1 Driver is DOTITE XA-3645')
    assert(row13.getCell(9).value === 'Uncontrollable', 'Top 1 Controllability is Uncontrollable')
    assert(typeof row13.getCell(10).value === 'string' && row13.getCell(10).value.includes('Purchasing'), 'Top 1 Action Plan is Purchasing action plan')

    assert(row14.getCell(1).result === 2, 'Top 2 Rank is 2')
    assert(row14.getCell(3).result === 'AI-Ins', 'Top 2 Driver is AI-Ins')
    assert(row14.getCell(9).value === 'Controllable', 'Top 2 Controllability is Controllable')
    assert(typeof row14.getCell(10).value === 'string' && (row14.getCell(10).value.includes('IE') || row14.getCell(10).value.includes('Production')), 'Top 2 Action Plan is IE / Production action plan')

    // Check Ranks 3 to 10 are completely blank
    for (let r = 15; r <= 22; r++) {
      const row = ws4.getRow(r)
      const rankVal = row.getCell(1).value
      const isClean = (typeof rankVal === 'object' && (!rankVal.result || rankVal.result === '')) || rankVal === '' || rankVal === null
      assert(isClean, `Rank ${r - 12} (Row ${r}) cleanly evaluates to BLANK ""`)
    }
  } else {
    // Blank template check
    for (let r = 13; r <= 22; r++) {
      const row = ws4.getRow(r)
      const rankVal = row.getCell(1).value
      const isClean = (typeof rankVal === 'object' && (!rankVal.result || rankVal.result === '')) || rankVal === '' || rankVal === null
      assert(isClean, `Blank Template Row ${r} cleanly evaluates to BLANK ""`)
    }
  }

  console.log(`\nAudit Result: ${passed} PASSED, ${failed} FAILED`)
  if (failed > 0) throw new Error(`[FAIL] ${fileName} failed ${failed} checks!`)
}

async function main() {
  const populatedPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_RGOM-024_v2.xlsx')
  const blankPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_BLANK_TEMPLATE_v2.xlsx')

  await auditModel(populatedPath, false)
  await auditModel(blankPath, true)
  console.log(`\n============================================================`)
  console.log(`[MASTER AUDIT PASSED 100%] BOTH MODELS ARE PRODUCTION READY!`)
  console.log(`============================================================\n`)
}

main().catch(console.error)
