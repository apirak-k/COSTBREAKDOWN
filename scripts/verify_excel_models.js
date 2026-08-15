import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function verifyExcelModels() {
  console.log('--- RUNNING RIGOROUS AUDIT & VERIFICATION ON GENERATED EXCEL WORKBOOKS ---')

  const files = [
    { name: 'CostModel_RGOM-024.xlsx', isTemplate: false },
    { name: 'CostModel_BLANK_TEMPLATE.xlsx', isTemplate: true }
  ]

  let overallPass = true

  for (const file of files) {
    const filePath = path.resolve(__dirname, '..', file.name)
    console.log(`\n========================================================`)
    console.log(`AUDITING FILE: ${file.name}`)
    console.log(`========================================================`)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(filePath)

    // 1. Check sheets exist
    const expectedSheets = ['1_INPUT_DATA', '2_COST_BREAKDOWN', '3_EXECUTIVE_SUMMARY', '4_WHAT_IF_SIMULATOR']
    const actualSheets = wb.worksheets.map(s => s.name)
    console.log(`Worksheets detected: ${JSON.stringify(actualSheets)}`)

    for (const exp of expectedSheets) {
      if (!actualSheets.includes(exp)) {
        console.error(`[FAIL] Missing required sheet: ${exp}`)
        overallPass = false
      } else {
        console.log(`[PASS] Found sheet: ${exp}`)
      }
    }

    // 2. Check Sheet 1 (1_INPUT_DATA)
    const ws1 = wb.getWorksheet('1_INPUT_DATA')
    console.log(`\n--- Sheet 1 (1_INPUT_DATA) Checks ---`)
    console.log(`Total Rows: ${ws1.rowCount}`)

    // Check Pure Input Rule for Blank Template
    if (file.isTemplate) {
      let yellowCellCount = 0
      let nonEmptyYellowCells = 0

      ws1.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          const fill = cell.fill
          if (fill && fill.fgColor && fill.fgColor.argb === 'FFFEF9C3') {
            yellowCellCount++
            if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
              console.error(`[FAIL] Template has non-empty yellow cell at Row ${rowNumber}, Col ${colNumber}: value=${cell.value}`)
              nonEmptyYellowCells++
              overallPass = false
            }
          }
        })
      })

      if (nonEmptyYellowCells === 0) {
        console.log(`[PASS] Pure Input Rule: All ${yellowCellCount} yellow input cells in Sheet 1 are 100% BLANK/EMPTY.`)
      }
    } else {
      console.log(`[INFO] Product Code: ${ws1.getRow(6).getCell(1).value} | Name: ${ws1.getRow(6).getCell(2).value} | Base Qty: ${ws1.getRow(6).getCell(3).value}`)
      console.log(`[INFO] Rates: WC1=${ws1.getRow(10).getCell(1).value} (Labor=${ws1.getRow(10).getCell(3).value}, Burden=${ws1.getRow(10).getCell(4).value})`)
      console.log(`[INFO] BOM Item 1: ${ws1.getRow(17).getCell(2).value} (P0=${ws1.getRow(17).getCell(6).value}, P1=${ws1.getRow(17).getCell(7).value})`)
      console.log(`[INFO] Routing Op 40: ${ws1.getRow(33).getCell(2).value} (YieldBase=${ws1.getRow(33).getCell(9).value}, YieldActive=${ws1.getRow(33).getCell(10).value})`)
    }

    // 3. Check Sheet 2 Formulas & Shielding
    const ws2 = wb.getWorksheet('2_COST_BREAKDOWN')
    console.log(`\n--- Sheet 2 (2_COST_BREAKDOWN) Checks ---`)
    let unshieldedFormulas = 0
    let totalFormulas = 0

    ws2.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.formula) {
          totalFormulas++
          const rawFormula = cell.formula.startsWith('=') ? cell.formula.substring(1) : cell.formula
          if (!rawFormula.startsWith('IFERROR(') && !rawFormula.startsWith('IF(')) {
            console.warn(`[WARN] Formula not shielded with IFERROR or IF at Row ${rowNumber}, Col ${colNumber}: =${rawFormula}`)
            unshieldedFormulas++
          }
        }
      })
    })

    console.log(`Total formulas scanned in Sheet 2: ${totalFormulas}`)
    console.log(`Unshielded formulas count: ${unshieldedFormulas}`)
    if (unshieldedFormulas === 0) {
      console.log(`[PASS] 100% Formula Shielding verified in Sheet 2 (${totalFormulas} formulas).`)
    } else {
      overallPass = false
    }

    // 4. Check Sheet 3
    const ws3 = wb.getWorksheet('3_EXECUTIVE_SUMMARY')
    console.log(`\n--- Sheet 3 (3_EXECUTIVE_SUMMARY) Checks ---`)
    let s3Formulas = 0
    let s3Unshielded = 0
    ws3.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.formula) {
          s3Formulas++
          const rawFormula = cell.formula.startsWith('=') ? cell.formula.substring(1) : cell.formula
          if (!rawFormula.startsWith('IFERROR(') && !rawFormula.startsWith('IF(')) {
            console.warn(`[WARN] Sheet 3 formula not shielded at Row ${rowNumber}, Col ${colNumber}: =${rawFormula}`)
            s3Unshielded++
          }
        }
      })
    })
    console.log(`Total formulas scanned in Sheet 3: ${s3Formulas} (Unshielded: ${s3Unshielded})`)
    if (s3Unshielded === 0) {
      console.log(`[PASS] 100% Formula Shielding verified in Sheet 3.`)
    } else {
      overallPass = false
    }

    // 5. Check Sheet 4
    const ws4 = wb.getWorksheet('4_WHAT_IF_SIMULATOR')
    console.log(`\n--- Sheet 4 (4_WHAT_IF_SIMULATOR) Checks ---`)
    let s4Formulas = 0
    let s4Unshielded = 0
    ws4.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.formula) {
          s4Formulas++
          const rawFormula = cell.formula.startsWith('=') ? cell.formula.substring(1) : cell.formula
          if (!rawFormula.startsWith('IFERROR(') && !rawFormula.startsWith('IF(')) {
            console.warn(`[WARN] Sheet 4 formula not shielded at Row ${rowNumber}, Col ${colNumber}: =${rawFormula}`)
            s4Unshielded++
          }
        }
      })
    })
    console.log(`Total formulas scanned in Sheet 4: ${s4Formulas} (Unshielded: ${s4Unshielded})`)
    if (s4Unshielded === 0) {
      console.log(`[PASS] 100% Formula Shielding verified in Sheet 4.`)
    } else {
      overallPass = false
    }
  }

  console.log(`\n========================================================`)
  if (overallPass) {
    console.log(`>>> ALL VERIFICATION CHECKS PASSED WITH ZERO ERRORS (100% AUDIT PROOF) <<<`)
  } else {
    console.error(`>>> AUDIT FAILED - PLEASE REVIEW LOGS ABOVE <<<`)
    process.exit(1)
  }
}

verifyExcelModels().catch(err => {
  console.error('Audit Error:', err)
  process.exit(1)
})
