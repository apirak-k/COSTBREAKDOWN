import ExcelJS from 'exceljs'
import { ProductMaster, WorkCenterRate } from './types'

// --- PALETTE TOKENS ---
const COLOR_DARK_NAVY = 'FF1E293B' // #1E293B Active Headers
const COLOR_BORDER = 'FFE2E8F0' // #E2E8F0 Gridlines
const COLOR_WHITE = 'FFFFFFFF' // Pure White
const COLOR_SOFT_YELLOW = 'FFFEF9C3' // #FEF9C3 Input Fill
const COLOR_TOTAL_ROW = 'FFF1F5F9' // #F1F5F9 Total Row

const fontTitle = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF0F172A' } }
const fontDataBold = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } }

const fillHeader = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_DARK_NAVY } }
const fillYellow = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_SOFT_YELLOW } }
const fillTotal = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_TOTAL_ROW } }

const borderThin = {
  top: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  left: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  right: { style: 'thin' as const, color: { argb: COLOR_BORDER } }
}

function styleHeaderRow(row: ExcelJS.Row, colsCount: number) {
  for (let c = 1; c <= colsCount; c++) {
    const cell = row.getCell(c)
    cell.fill = fillHeader
    cell.font = fontHeader
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border = borderThin
  }
}

export interface DynamicTemplateOptions {
  product: ProductMaster
  wcCount: number
  bomCount: number
  routingCount: number
  existingRates?: WorkCenterRate[]
}

export async function generateDynamicExcelTemplate(options: DynamicTemplateOptions): Promise<Blob> {
  const { product, wcCount, bomCount, routingCount, existingRates = [] } = options
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Cost Breakdown Analysis Platform'
  wb.created = new Date()

  const numWC = Math.max(1, wcCount)
  const numBOM = Math.max(1, bomCount)
  const numRT = Math.max(1, routingCount)

  // =========================================================================
  // SHEET 1: 1_MASTER_RATES
  // =========================================================================
  const ws1 = wb.addWorksheet('1_MASTER_RATES', { views: [{ showGridLines: true }] })
  ws1.columns = [{ width: 28 }, { width: 34 }, { width: 18 }, { width: 18 }, { width: 28 }]

  ws1.getCell('A1').value = '1. PRODUCT MASTER & WORK CENTER RATES'
  ws1.getCell('A1').font = fontTitle

  ws1.getCell('A3').value = 'SECTION A: PRODUCT MASTER'
  ws1.getCell('A3').font = fontSection

  const r4 = ws1.getRow(4)
  r4.values = ['Product Code', 'Product Description', 'UOM', 'Customer / Application', 'Effective Date']
  styleHeaderRow(r4, 5)

  const r5 = ws1.getRow(5)
  r5.getCell(1).value = product.productCode || 'PRODUCT-001'
  r5.getCell(2).value = product.productDescription || ''
  r5.getCell(3).value = product.uom || 'PC'
  r5.getCell(4).value = product.customer || ''
  r5.getCell(5).value = product.effectiveDate || new Date().toISOString().split('T')[0]
  for (let c = 1; c <= 5; c++) {
    const cell = r5.getCell(c)
    cell.fill = fillYellow
    cell.font = fontDataBold
    cell.border = borderThin
  }

  ws1.getCell('A7').value = `SECTION B: WORK CENTER RATES (${numWC} WORK CENTERS)`
  ws1.getCell('A7').font = fontSection

  const r8 = ws1.getRow(8)
  r8.values = ['Department (WC Name)', 'Line / Department Description', 'Labor Rate (THB/MHr)', 'Burden Rate (THB/MHr)', 'Source Reference']
  styleHeaderRow(r8, 5)

  const defaultDepts = ['Cutting', 'Printing-Digital RGOM', 'Assembly Digital RGOM', 'OQA-Digital']
  for (let i = 0; i < numWC; i++) {
    const rowNum = 9 + i
    const row = ws1.getRow(rowNum)
    const existing = existingRates[i]
    const deptName = existing?.wc || defaultDepts[i] || `WorkCenter_${i + 1}`

    row.getCell(1).value = deptName
    row.getCell(2).value = existing?.description || deptName
    row.getCell(3).value = existing ? existing.laborRate : 105.29
    row.getCell(4).value = existing ? existing.burdenRate : 95.00
    row.getCell(5).value = existing?.sourceRef || 'Cost Declare'

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = c === 1 ? fontDataBold : fontData
      cell.border = borderThin
      if (c === 3 || c === 4) cell.numFmt = '#,##0.00'
    }
  }

  // =========================================================================
  // SHEET 2: 2_BOM_BREAKDOWN
  // =========================================================================
  const ws2 = wb.addWorksheet('2_BOM_BREAKDOWN', { views: [{ showGridLines: true }] })
  ws2.columns = [
    { width: 8 }, { width: 16 }, { width: 34 }, { width: 14 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 13 }, { width: 13 }, { width: 22 }
  ]

  ws2.getCell('A1').value = '2. DIRECT MATERIAL BREAKDOWN (BOM)'
  ws2.getCell('A1').font = fontTitle

  ws2.getCell('A3').value = `TABLE 1: BOM INPUT PARAMETERS (${numBOM} ITEMS)`
  ws2.getCell('A3').font = fontSection

  const r4_2 = ws2.getRow(4)
  r4_2.values = ['No', 'Item Code', 'Material Description', 'Usage (Q)', 'Unit', 'Base Price P0', 'Active Price P1', 'Base Loss L0', 'Active Loss L1', 'Source Reference']
  styleHeaderRow(r4_2, 10)

  const inputStart = 5
  const inputEnd = 4 + numBOM

  for (let i = 0; i < numBOM; i++) {
    const rowNum = inputStart + i
    const row = ws2.getRow(rowNum)
    row.getCell(1).value = i + 1
    row.getCell(2).value = `RM-${String(i + 1).padStart(4, '0')}`
    row.getCell(3).value = `Material Item ${i + 1}`
    row.getCell(4).value = 0.01
    row.getCell(5).value = 'PC'
    row.getCell(6).value = 10.00
    row.getCell(7).value = 10.00
    row.getCell(8).value = 0.10
    row.getCell(9).value = 0.10
    row.getCell(10).value = 'Standard Price'

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      if (c === 4) cell.numFmt = '0.0000'
      if (c === 6 || c === 7) cell.numFmt = '#,##0.0000'
      if (c === 8 || c === 9) cell.numFmt = '0.0%'
    }
  }

  const calcStart = inputEnd + 4
  const calcEnd = calcStart + numBOM - 1

  ws2.getCell(`A${calcStart - 2}`).value = `TABLE 2: BOM CALCULATION ENGINE & LEVEL 3 VARIANCE`
  ws2.getCell(`A${calcStart - 2}`).font = fontSection

  const rCalcHeader = ws2.getRow(calcStart - 1)
  rCalcHeader.values = ['No', 'Item Code', 'Material Description', 'Base Cost P0', 'Active Cost P1', 'Total Variance', 'Price Var (MPV)', 'Loss Var (MLV)', '% Contrib', 'Traceability']
  styleHeaderRow(rCalcHeader, 10)

  for (let i = 0; i < numBOM; i++) {
    const calcRow = calcStart + i
    const inRow = inputStart + i
    const row = ws2.getRow(calcRow)

    row.getCell(1).value = { formula: `A${inRow}` }
    row.getCell(2).value = { formula: `B${inRow}` }
    row.getCell(3).value = { formula: `C${inRow}` }
    row.getCell(4).value = { formula: `D${inRow}*F${inRow}*(1+H${inRow})` } // Base = Q * P0 * (1 + L0)
    row.getCell(5).value = { formula: `D${inRow}*G${inRow}*(1+I${inRow})` } // Active = Q * P1 * (1 + L1)
    row.getCell(6).value = { formula: `E${calcRow}-D${calcRow}` } // Variance = Active - Base
    row.getCell(7).value = { formula: `(G${inRow}-F${inRow})*D${inRow}*(1+I${inRow})` } // MPV = (P1 - P0) * Q * (1 + L1)
    row.getCell(8).value = { formula: `(I${inRow}-H${inRow})*D${inRow}*F${inRow}` } // MLV = (L1 - L0) * Q * P0
    row.getCell(9).value = { formula: `IF(F$${calcEnd + 1}<>0, F${calcRow}/F$${calcEnd + 1}, 0)` }
    row.getCell(10).value = { formula: `J${inRow}` }

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
      if (c === 9) cell.numFmt = '0.00%'
    }
  }

  // BOM Total Row
  const bomTotalRow = ws2.getRow(calcEnd + 1)
  bomTotalRow.getCell(3).value = 'TOTAL DIRECT MATERIAL COST (C_M)'
  bomTotalRow.getCell(4).value = { formula: `SUM(D${calcStart}:D${calcEnd})` }
  bomTotalRow.getCell(5).value = { formula: `SUM(E${calcStart}:E${calcEnd})` }
  bomTotalRow.getCell(6).value = { formula: `SUM(F${calcStart}:F${calcEnd})` }
  bomTotalRow.getCell(7).value = { formula: `SUM(G${calcStart}:G${calcEnd})` }
  bomTotalRow.getCell(8).value = { formula: `SUM(H${calcStart}:H${calcEnd})` }
  for (let c = 1; c <= 10; c++) {
    const cell = bomTotalRow.getCell(c)
    cell.fill = fillTotal
    cell.font = fontDataBold
    cell.border = borderThin
    if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
  }

  // =========================================================================
  // SHEET 3: 3_ROUTING_BREAKDOWN
  // =========================================================================
  const ws3 = wb.addWorksheet('3_ROUTING_BREAKDOWN', { views: [{ showGridLines: true }] })
  ws3.columns = [
    { width: 8 }, { width: 32 }, { width: 24 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 22 }
  ]

  ws3.getCell('A1').value = '3. CONVERSION PROCESS ROUTING BREAKDOWN'
  ws3.getCell('A1').font = fontTitle

  ws3.getCell('A3').value = `TABLE 1: ROUTING PROCESS INPUT (${numRT} STEPS)`
  ws3.getCell('A3').font = fontSection

  const r4_3 = ws3.getRow(4)
  r4_3.values = ['Op Seq', 'Operation Description', 'Department (WC)', 'Manning', 'Base Cap (pc/hr)', 'Active Cap (pc/hr)', 'Base Yield', 'Active Yield', 'Source Reference']
  styleHeaderRow(r4_3, 9)

  const rtInStart = 5
  const rtInEnd = 4 + numRT
  const defaultWc = existingRates[0]?.wc || 'Cutting'

  for (let i = 0; i < numRT; i++) {
    const rowNum = rtInStart + i
    const row = ws3.getRow(rowNum)
    row.getCell(1).value = (i + 1) * 10
    row.getCell(2).value = `Process Operation ${i + 1}`
    row.getCell(3).value = defaultWc
    row.getCell(4).value = 1.0
    row.getCell(5).value = 1000
    row.getCell(6).value = 1000
    row.getCell(7).value = 0.98
    row.getCell(8).value = 0.98
    row.getCell(9).value = 'Standard Route'

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      if (c === 4) cell.numFmt = '0.0'
      if (c === 5 || c === 6) cell.numFmt = '#,##0'
      if (c === 7 || c === 8) cell.numFmt = '0.0%'
    }
  }

  const rtCalcStart = rtInEnd + 4
  const rtCalcEnd = rtCalcStart + numRT - 1

  ws3.getCell(`A${rtCalcStart - 2}`).value = 'TABLE 2: CONVERSION COST ENGINE (LABOR & BURDEN PER UNIT)'
  ws3.getCell(`A${rtCalcStart - 2}`).font = fontSection

  const rRtCalcHeader = ws3.getRow(rtCalcStart - 1)
  rRtCalcHeader.values = ['Op Seq', 'Operation Description', 'Department', 'Base Labor', 'Active Labor', 'Base Burden', 'Active Burden', 'Total Conv Base', 'Total Conv Active', 'Net Variance']
  styleHeaderRow(rRtCalcHeader, 10)

  const ratesRange = `'1_MASTER_RATES'!$A$9:$D$${8 + numWC}`

  for (let i = 0; i < numRT; i++) {
    const calcRow = rtCalcStart + i
    const inRow = rtInStart + i
    const row = ws3.getRow(calcRow)

    row.getCell(1).value = { formula: `A${inRow}` }
    row.getCell(2).value = { formula: `B${inRow}` }
    row.getCell(3).value = { formula: `C${inRow}` }
    // Base Labor = (Manning / (BaseCap * BaseYield)) * VLOOKUP(LaborRate)
    row.getCell(4).value = { formula: `(D${inRow}/(E${inRow}*G${inRow}))*VLOOKUP(C${inRow},${ratesRange},3,FALSE)` }
    // Active Labor = (Manning / (ActiveCap * ActiveYield)) * VLOOKUP(LaborRate)
    row.getCell(5).value = { formula: `(D${inRow}/(F${inRow}*H${inRow}))*VLOOKUP(C${inRow},${ratesRange},3,FALSE)` }
    // Base Burden = (Manning / (BaseCap * BaseYield)) * VLOOKUP(BurdenRate)
    row.getCell(6).value = { formula: `(D${inRow}/(E${inRow}*G${inRow}))*VLOOKUP(C${inRow},${ratesRange},4,FALSE)` }
    // Active Burden = (Manning / (ActiveCap * ActiveYield)) * VLOOKUP(BurdenRate)
    row.getCell(7).value = { formula: `(D${inRow}/(F${inRow}*H${inRow}))*VLOOKUP(C${inRow},${ratesRange},4,FALSE)` }
    // Total Base = Base Labor + Base Burden
    row.getCell(8).value = { formula: `D${calcRow}+F${calcRow}` }
    // Total Active = Active Labor + Active Burden
    row.getCell(9).value = { formula: `E${calcRow}+G${calcRow}` }
    // Net Variance = Total Active - Total Base
    row.getCell(10).value = { formula: `I${calcRow}-H${calcRow}` }

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      if (c >= 4 && c <= 10) cell.numFmt = '#,##0.0000'
    }
  }

  // Routing Total Row
  const rtTotalRow = ws3.getRow(rtCalcEnd + 1)
  rtTotalRow.getCell(2).value = 'TOTAL CONVERSION COST (C_L + C_B)'
  rtTotalRow.getCell(4).value = { formula: `SUM(D${rtCalcStart}:D${rtCalcEnd})` }
  rtTotalRow.getCell(5).value = { formula: `SUM(E${rtCalcStart}:E${rtCalcEnd})` }
  rtTotalRow.getCell(6).value = { formula: `SUM(F${rtCalcStart}:F${rtCalcEnd})` }
  rtTotalRow.getCell(7).value = { formula: `SUM(G${rtCalcStart}:G${rtCalcEnd})` }
  rtTotalRow.getCell(8).value = { formula: `SUM(H${rtCalcStart}:H${rtCalcEnd})` }
  rtTotalRow.getCell(9).value = { formula: `SUM(I${rtCalcStart}:I${rtCalcEnd})` }
  rtTotalRow.getCell(10).value = { formula: `SUM(J${rtCalcStart}:J${rtCalcEnd})` }
  for (let c = 1; c <= 10; c++) {
    const cell = rtTotalRow.getCell(c)
    cell.fill = fillTotal
    cell.font = fontDataBold
    cell.border = borderThin
    if (c >= 4 && c <= 10) cell.numFmt = '#,##0.0000'
  }

  // =========================================================================
  // SHEET 4: 4_SUMMARY_&_COMPARISON
  // =========================================================================
  const ws4 = wb.addWorksheet('4_SUMMARY_&_COMPARISON', { views: [{ showGridLines: true }] })
  ws4.columns = [
    { width: 8 }, { width: 22 }, { width: 34 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 12 }, { width: 16 }, { width: 36 }
  ]

  ws4.getCell('A1').value = '4. EXECUTIVE COST SUMMARY & TOP 10 DRIVERS'
  ws4.getCell('A1').font = fontTitle

  const rSumH = ws4.getRow(4)
  rSumH.values = ['Cost Element', 'Baseline Std Cost', 'Active Std Cost', 'Net Variance', '% Change']
  styleHeaderRow(rSumH, 5)

  // Direct Material Row
  const rSumMat = ws4.getRow(5)
  rSumMat.getCell(1).value = 'Direct Material (C_M)'
  rSumMat.getCell(2).value = { formula: `'2_BOM_BREAKDOWN'!D${calcEnd + 1}` }
  rSumMat.getCell(3).value = { formula: `'2_BOM_BREAKDOWN'!E${calcEnd + 1}` }
  rSumMat.getCell(4).value = { formula: `C5-B5` }
  rSumMat.getCell(5).value = { formula: `IF(B5<>0, D5/B5, 0)` }

  // Direct Labor Row
  const rSumLab = ws4.getRow(6)
  rSumLab.getCell(1).value = 'Direct Labor (C_L)'
  rSumLab.getCell(2).value = { formula: `'3_ROUTING_BREAKDOWN'!D${rtCalcEnd + 1}` }
  rSumLab.getCell(3).value = { formula: `'3_ROUTING_BREAKDOWN'!E${rtCalcEnd + 1}` }
  rSumLab.getCell(4).value = { formula: `C6-B6` }
  rSumLab.getCell(5).value = { formula: `IF(B6<>0, D6/B6, 0)` }

  // Burden Row
  const rSumBurd = ws4.getRow(7)
  rSumBurd.getCell(1).value = 'Manufacturing Burden (C_B)'
  rSumBurd.getCell(2).value = { formula: `'3_ROUTING_BREAKDOWN'!F${rtCalcEnd + 1}` }
  rSumBurd.getCell(3).value = { formula: `'3_ROUTING_BREAKDOWN'!G${rtCalcEnd + 1}` }
  rSumBurd.getCell(4).value = { formula: `C7-B7` }
  rSumBurd.getCell(5).value = { formula: `IF(B7<>0, D7/B7, 0)` }

  // Total Row
  const rSumTot = ws4.getRow(8)
  rSumTot.getCell(1).value = 'TOTAL STANDARD COST'
  rSumTot.getCell(2).value = { formula: `SUM(B5:B7)` }
  rSumTot.getCell(3).value = { formula: `SUM(C5:C7)` }
  rSumTot.getCell(4).value = { formula: `C8-B8` }
  rSumTot.getCell(5).value = { formula: `IF(B8<>0, D8/B8, 0)` }

  for (let r = 5; r <= 8; r++) {
    const row = ws4.getRow(r)
    const isTot = r === 8
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c)
      cell.fill = isTot ? fillTotal : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WHITE } }
      cell.font = isTot ? fontDataBold : fontData
      cell.border = borderThin
      if (c >= 2 && c <= 4) cell.numFmt = '#,##0.0000'
      if (c === 5) cell.numFmt = '0.00%'
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
