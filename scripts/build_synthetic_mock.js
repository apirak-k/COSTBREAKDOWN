import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- PALETTE TOKENS ---
const COLOR_DARK_NAVY = 'FF1E293B' // #1E293B Primary Accent
const COLOR_MUTED_GRAY = 'FF64748B' // #64748B Secondary Text
const COLOR_BORDER = 'FFE2E8F0' // #E2E8F0 Gridlines
const COLOR_WHITE = 'FFFFFFFF' // Pure White
const COLOR_SOFT_YELLOW = 'FFFEF9C3' // #FEF9C3 Soft Pastel Input Fill
const COLOR_TOTAL_ROW = 'FFF1F5F9' // #F1F5F9 Grand Total Row
const COLOR_TOP1_HIGHLIGHT = 'FFFEE2E2' // Soft Red for Rank #1

// --- TYPOGRAPHY & STYLES ---
const fontTitle = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF0F172A' } }
const fontDataBold = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
const fontMuted = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR_MUTED_GRAY } }

const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK_NAVY } }
const fillYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SOFT_YELLOW } }
const fillTotal = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_ROW } }
const fillTop1 = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOP1_HIGHLIGHT } }

const borderThin = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } }
}

const borderTotal = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'double', color: { argb: COLOR_DARK_NAVY } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } }
}

// 1. SYNTHETIC MOCK RATES (Generic Manufacturing Plant)
const MOCK_RATES = [
  { dept: 'WC-FABRICATION', desc: 'Raw Material Prep & Stamping', labor: 110.00, burden: 140.00, eff: '2026-01-01', ref: 'Ref-Std-Rate-2026' },
  { dept: 'WC-PRINTING', desc: 'Precision Cleanroom Screen Printing', labor: 105.00, burden: 100.00, eff: '2026-01-01', ref: 'Ref-Std-Rate-2026' },
  { dept: 'WC-ASSEMBLY', desc: 'Automated SMT & Module Assembly', labor: 105.00, burden: 90.00, eff: '2026-01-01', ref: 'Ref-Std-Rate-2026' },
  { dept: 'WC-QA-PACK', desc: 'Final Automated QA Inspection & Packaging', labor: 100.00, burden: 80.00, eff: '2026-01-01', ref: 'Ref-Std-Rate-2026' }
]

// 2. SYNTHETIC MOCK BOM (10 Items covering Price Rise, Loss Spike, Price Drop, Stable)
const MOCK_BOM = [
  { itemNo: 1, code: 'MAT-FILM-01', desc: 'PET Optical Substrate Film (0.5m x 500m)', q: 0.0250, uom: 'SM', p0: 50.00, p1: 50.00, loss0: 0.15, loss1: 0.25, ref: 'Loss Spike (+10%)' },
  { itemNo: 2, code: 'MAT-PASTE-02', desc: 'Conductive Silver Paste Type-A', q: 0.2000, uom: 'GM', p0: 30.00, p1: 55.00, loss0: 0.20, loss1: 0.20, ref: 'Commodity Inflation (+25 THB/g)' },
  { itemNo: 3, code: 'MAT-INK-03', desc: 'Dielectric Carbon Conductive Ink', q: 0.0800, uom: 'GM', p0: 15.00, p1: 12.00, loss0: 0.10, loss1: 0.10, ref: 'Vendor Discount (-3 THB/g)' },
  { itemNo: 4, code: 'MAT-TAPE-04', desc: 'Double-Sided Acrylic Spacer Tape', q: 0.0150, uom: 'SM', p0: 80.00, p1: 80.00, loss0: 0.10, loss1: 0.10, ref: 'Standard Contract' },
  { itemNo: 5, code: 'MAT-LABEL-05', desc: 'QR Code Serialized Polyimide Label', q: 1.0000, uom: 'PC', p0: 0.15, p1: 0.25, loss0: 0.05, loss1: 0.05, ref: 'Minor Price Increase' },
  { itemNo: 6, code: 'MAT-SOLVENT-06', desc: 'Industrial Degreaser & Thinner', q: 0.0500, uom: 'GM', p0: 2.00, p1: 2.00, loss0: 0.10, loss1: 0.10, ref: 'Standard Chemical' },
  { itemNo: 7, code: 'MAT-CONN-07', desc: 'FPC Flexible Tail Header Connector', q: 1.0000, uom: 'PC', p0: 5.00, p1: 5.80, loss0: 0.02, loss1: 0.02, ref: 'Supplier Price Update' },
  { itemNo: 8, code: 'MAT-RESIN-08', desc: 'UV Curable Hardcoat Protection Resin', q: 0.1000, uom: 'GM', p0: 8.00, p1: 8.00, loss0: 0.15, loss1: 0.15, ref: 'Standard Chemical' },
  { itemNo: 9, code: 'MAT-LINER-09', desc: 'PE Protective Masking Film Liner', q: 0.0300, uom: 'SM', p0: 12.00, p1: 12.00, loss0: 0.10, loss1: 0.18, ref: 'Handling Scrap' },
  { itemNo: 10, code: 'MAT-PACK-10', desc: 'Anti-Static Tray & Outer Shipping Carton', q: 0.0500, uom: 'SET', p0: 20.00, p1: 20.00, loss0: 0.00, loss1: 0.00, ref: 'Standard Packaging' }
]

// 3. SYNTHETIC MOCK ROUTING (15 Steps covering Yield Drop, Cap Drop, Multi-Manning)
const MOCK_ROUTING = [
  { opSeq: 10, name: 'Raw Sheet Precision Cutting', dept: 'WC-FABRICATION', manning: 1.0, cap0: 5000, cap1: 5000, y0: 1.00, y1: 1.00, ref: 'Standard Process' },
  { opSeq: 20, name: 'Thermal Pre-Shrink Annealing', dept: 'WC-FABRICATION', manning: 1.0, cap0: 2000, cap1: 2000, y0: 1.00, y1: 1.00, ref: 'Standard Process' },
  { opSeq: 30, name: 'Cleanroom Sheet Dust Removal', dept: 'WC-PRINTING', manning: 0.5, cap0: 6000, cap1: 6000, y0: 1.00, y1: 1.00, ref: 'Standard Process' },
  { opSeq: 40, name: 'Silver Conductor Circuit Printing', dept: 'WC-PRINTING', manning: 2.0, cap0: 1500, cap1: 1000, y0: 1.00, y1: 1.00, ref: 'Machine Speed Drop (-33%)' },
  { opSeq: 50, name: 'IR Oven Tunnel Curing #1', dept: 'WC-PRINTING', manning: 1.0, cap0: 3000, cap1: 3000, y0: 1.00, y1: 1.00, ref: 'Standard Process' },
  { opSeq: 60, name: 'Carbon Resistor Jumper Printing', dept: 'WC-PRINTING', manning: 2.0, cap0: 1800, cap1: 1800, y0: 0.98, y1: 0.98, ref: 'Standard Process' },
  { opSeq: 70, name: 'Dielectric Insulation Overcoat', dept: 'WC-PRINTING', manning: 2.0, cap0: 1600, cap1: 1600, y0: 0.98, y1: 0.98, ref: 'Standard Process' },
  { opSeq: 80, name: 'Multi-Layer Membrane Lamination', dept: 'WC-ASSEMBLY', manning: 2.0, cap0: 2000, cap1: 2000, y0: 0.99, y1: 0.99, ref: 'Standard Process' },
  { opSeq: 90, name: 'High-Speed Perimeter Die Punching', dept: 'WC-ASSEMBLY', manning: 1.0, cap0: 4000, cap1: 4000, y0: 0.98, y1: 0.98, ref: 'Standard Process' },
  { opSeq: 100, name: 'Auto Optical Defect Inspection (AOI)', dept: 'WC-ASSEMBLY', manning: 2.0, cap0: 800, cap1: 800, y0: 0.90, y1: 0.70, ref: 'Severe Yield Drop (90% -> 70%)' },
  { opSeq: 110, name: 'SMT Component Pick & Place', dept: 'WC-ASSEMBLY', manning: 1.0, cap0: 1200, cap1: 900, y0: 0.95, y1: 0.95, ref: 'Feeder Jam Bottleneck' },
  { opSeq: 120, name: 'Hot-Bar Soldering & UV Curing', dept: 'WC-ASSEMBLY', manning: 2.0, cap0: 1000, cap1: 1000, y0: 0.96, y1: 0.96, ref: 'Standard Process' },
  { opSeq: 130, name: 'Functional Electrical Continuity Test', dept: 'WC-QA-PACK', manning: 1.0, cap0: 600, cap1: 600, y0: 0.98, y1: 0.88, ref: 'Contact Defect Yield Drop' },
  { opSeq: 140, name: 'Visual Cosmetic Inspection', dept: 'WC-QA-PACK', manning: 2.0, cap0: 800, cap1: 800, y0: 0.99, y1: 0.99, ref: 'Standard Process' },
  { opSeq: 150, name: 'Final Barcode Scan & Master Packaging', dept: 'WC-QA-PACK', manning: 2.0, cap0: 600, cap1: 600, y0: 1.00, y1: 1.00, ref: 'Standard Process' }
]

function styleHeaderRow(row, colsCount) {
  for (let c = 1; c <= colsCount; c++) {
    const cell = row.getCell(c)
    cell.fill = fillHeader
    cell.font = fontHeader
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border = borderThin
  }
}

export async function buildSyntheticMockWorkbook() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Synthetic Benchmark Generator'
  wb.created = new Date()

  // -------------------------------------------------------------
  // 1_MASTER_RATES
  // -------------------------------------------------------------
  const ws1 = wb.addWorksheet('1_MASTER_RATES', { views: [{ showGridLines: true }] })
  ws1.columns = [{ width: 28 }, { width: 38 }, { width: 18 }, { width: 18 }, { width: 28 }]

  ws1.getCell('A1').value = '1. PRODUCT MASTER & WORK CENTER RATES (SYNTHETIC MOCK)'
  ws1.getCell('A1').font = fontTitle

  ws1.getCell('A3').value = 'SECTION A: PRODUCT MASTER'
  ws1.getCell('A3').font = fontSection

  const r4_1 = ws1.getRow(4)
  r4_1.values = ['Product Code', 'Product Description', 'UOM', 'Customer / Application', 'Effective Date']
  styleHeaderRow(r4_1, 5)

  const r5_1 = ws1.getRow(5)
  r5_1.values = ['MOCK-DEMO-001', 'SYNTHETIC SAMPLE ASSEMBLY (DEMO & TEST SUITE)', 'PC', 'BENCHMARK TEST', '2026-01-01']
  for (let c = 1; c <= 5; c++) {
    const cell = r5_1.getCell(c)
    cell.fill = fillYellow
    cell.font = fontDataBold
    cell.border = borderThin
  }

  ws1.getCell('A7').value = 'SECTION B: WORK CENTER RATES (4 DEPARTMENTS)'
  ws1.getCell('A7').font = fontSection

  const r8_1 = ws1.getRow(8)
  r8_1.values = ['Department (WC Name)', 'Line / Department Description', 'Labor Rate (THB/MHr)', 'Burden Rate (THB/MHr)', 'Source Reference']
  styleHeaderRow(r8_1, 5)

  for (let i = 0; i < MOCK_RATES.length; i++) {
    const r = ws1.getRow(9 + i)
    const d = MOCK_RATES[i]
    r.values = [d.dept, d.desc, d.labor, d.burden, d.ref]
    for (let c = 1; c <= 5; c++) {
      const cell = r.getCell(c)
      cell.fill = fillYellow
      cell.font = c === 1 ? fontDataBold : fontData
      cell.border = borderThin
      if (c === 3 || c === 4) cell.numFmt = '#,##0.00'
    }
  }

  // -------------------------------------------------------------
  // 2_BOM_BREAKDOWN
  // -------------------------------------------------------------
  const ws2 = wb.addWorksheet('2_BOM_BREAKDOWN', { views: [{ showGridLines: true }] })
  ws2.columns = [
    { width: 8 }, { width: 16 }, { width: 36 }, { width: 14 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 13 }, { width: 13 }, { width: 28 }
  ]

  ws2.getCell('A1').value = '2. DIRECT MATERIAL BREAKDOWN (BOM)'
  ws2.getCell('A1').font = fontTitle

  ws2.getCell('A3').value = `TABLE 1: BOM INPUT PARAMETERS (${MOCK_BOM.length} ITEMS)`
  ws2.getCell('A3').font = fontSection

  const r4_2 = ws2.getRow(4)
  r4_2.values = ['No', 'Item Code', 'Material Description', 'Usage (Q)', 'Unit', 'Base Price P0', 'Active Price P1', 'Base Loss L0', 'Active Loss L1', 'Source Reference']
  styleHeaderRow(r4_2, 10)

  const inBomStart = 5
  const inBomEnd = inBomStart + MOCK_BOM.length - 1

  for (let i = 0; i < MOCK_BOM.length; i++) {
    const r = ws2.getRow(inBomStart + i)
    const b = MOCK_BOM[i]
    r.values = [b.itemNo, b.code, b.desc, b.q, b.uom, b.p0, b.p1, b.loss0, b.loss1, b.ref]
    for (let c = 1; c <= 10; c++) {
      const cell = r.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      if (c === 4) cell.numFmt = '0.0000'
      if (c === 6 || c === 7) cell.numFmt = '#,##0.0000'
      if (c === 8 || c === 9) cell.numFmt = '0.0%'
    }
  }

  const calcBomStart = inBomEnd + 4
  const calcBomEnd = calcBomStart + MOCK_BOM.length - 1

  ws2.getCell(`A${calcBomStart - 2}`).value = 'TABLE 2: BOM CALCULATION ENGINE & LEVEL 3 VARIANCE'
  ws2.getCell(`A${calcBomStart - 2}`).font = fontSection

  const rCalcBomH = ws2.getRow(calcBomStart - 1)
  rCalcBomH.values = ['No', 'Item Code', 'Material Description', 'Base Cost P0', 'Active Cost P1', 'Total Variance', 'Price Var (MPV)', 'Loss Var (MLV)', '% Contrib', 'Traceability']
  styleHeaderRow(rCalcBomH, 10)

  for (let i = 0; i < MOCK_BOM.length; i++) {
    const calcRow = calcBomStart + i
    const inRow = inBomStart + i
    const r = ws2.getRow(calcRow)

    r.getCell(1).value = { formula: `A${inRow}` }
    r.getCell(2).value = { formula: `B${inRow}` }
    r.getCell(3).value = { formula: `C${inRow}` }
    r.getCell(4).value = { formula: `D${inRow}*F${inRow}*(1+H${inRow})` }
    r.getCell(5).value = { formula: `D${inRow}*G${inRow}*(1+I${inRow})` }
    r.getCell(6).value = { formula: `E${calcRow}-D${calcRow}` }
    r.getCell(7).value = { formula: `(G${inRow}-F${inRow})*D${inRow}*(1+I${inRow})` }
    r.getCell(8).value = { formula: `(I${inRow}-H${inRow})*D${inRow}*F${inRow}` }
    r.getCell(9).value = { formula: `IF(F$${calcBomEnd + 1}<>0, F${calcRow}/F$${calcBomEnd + 1}, 0)` }
    r.getCell(10).value = { formula: `J${inRow}` }

    for (let c = 1; c <= 10; c++) {
      const cell = r.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
      if (c === 9) cell.numFmt = '0.00%'
    }
  }

  // BOM Grand Total Row
  const rBomTot = ws2.getRow(calcBomEnd + 1)
  rBomTot.getCell(3).value = 'TOTAL DIRECT MATERIAL COST (C_M)'
  rBomTot.getCell(4).value = { formula: `SUM(D${calcBomStart}:D${calcBomEnd})` }
  rBomTot.getCell(5).value = { formula: `SUM(E${calcBomStart}:E${calcBomEnd})` }
  rBomTot.getCell(6).value = { formula: `SUM(F${calcBomStart}:F${calcBomEnd})` }
  rBomTot.getCell(7).value = { formula: `SUM(G${calcBomStart}:G${calcBomEnd})` }
  rBomTot.getCell(8).value = { formula: `SUM(H${calcBomStart}:H${calcBomEnd})` }
  for (let c = 1; c <= 10; c++) {
    const cell = rBomTot.getCell(c)
    cell.fill = fillTotal
    cell.font = fontDataBold
    cell.border = borderTotal
    if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
  }

  // -------------------------------------------------------------
  // 3_ROUTING_BREAKDOWN
  // -------------------------------------------------------------
  const ws3 = wb.addWorksheet('3_ROUTING_BREAKDOWN', { views: [{ showGridLines: true }] })
  ws3.columns = [
    { width: 8 }, { width: 38 }, { width: 22 }, { width: 10 },
    { width: 16 }, { width: 16 }, { width: 13 }, { width: 13 }, { width: 28 }
  ]

  ws3.getCell('A1').value = '3. CONVERSION PROCESS ROUTING BREAKDOWN'
  ws3.getCell('A1').font = fontTitle

  ws3.getCell('A3').value = `TABLE 1: ROUTING PROCESS INPUT (${MOCK_ROUTING.length} STEPS)`
  ws3.getCell('A3').font = fontSection

  const r4_3 = ws3.getRow(4)
  r4_3.values = ['Op Seq', 'Operation Description', 'Department (WC)', 'Manning', 'Base Cap (pc/hr)', 'Active Cap (pc/hr)', 'Base Yield', 'Active Yield', 'Source Reference']
  styleHeaderRow(r4_3, 9)

  const inRtStart = 5
  const inRtEnd = inRtStart + MOCK_ROUTING.length - 1

  for (let i = 0; i < MOCK_ROUTING.length; i++) {
    const r = ws3.getRow(inRtStart + i)
    const rt = MOCK_ROUTING[i]
    r.values = [rt.opSeq, rt.name, rt.dept, rt.manning, rt.cap0, rt.cap1, rt.y0, rt.y1, rt.ref]
    for (let c = 1; c <= 9; c++) {
      const cell = r.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      if (c === 4) cell.numFmt = '0.0'
      if (c === 5 || c === 6) cell.numFmt = '#,##0'
      if (c === 7 || c === 8) cell.numFmt = '0.0%'
    }
  }

  const calcRtStart = inRtEnd + 4
  const calcRtEnd = calcRtStart + MOCK_ROUTING.length - 1

  ws3.getCell(`A${calcRtStart - 2}`).value = 'TABLE 2: CONVERSION COST ENGINE (LABOR & BURDEN PER UNIT)'
  ws3.getCell(`A${calcRtStart - 2}`).font = fontSection

  const rCalcRtH = ws3.getRow(calcRtStart - 1)
  rCalcRtH.values = ['Op Seq', 'Operation Description', 'Department', 'Base Labor', 'Active Labor', 'Base Burden', 'Active Burden', 'Total Conv Base', 'Total Conv Active', 'Net Variance']
  styleHeaderRow(rCalcRtH, 10)

  const ratesRange = `'1_MASTER_RATES'!$A$9:$D$12`

  for (let i = 0; i < MOCK_ROUTING.length; i++) {
    const calcRow = calcRtStart + i
    const inRow = inRtStart + i
    const r = ws3.getRow(calcRow)

    r.getCell(1).value = { formula: `A${inRow}` }
    r.getCell(2).value = { formula: `B${inRow}` }
    r.getCell(3).value = { formula: `C${inRow}` }
    r.getCell(4).value = { formula: `(D${inRow}/(E${inRow}*G${inRow}))*VLOOKUP(C${inRow},${ratesRange},3,FALSE)` }
    r.getCell(5).value = { formula: `(D${inRow}/(F${inRow}*H${inRow}))*VLOOKUP(C${inRow},${ratesRange},3,FALSE)` }
    r.getCell(6).value = { formula: `(D${inRow}/(E${inRow}*G${inRow}))*VLOOKUP(C${inRow},${ratesRange},4,FALSE)` }
    r.getCell(7).value = { formula: `(D${inRow}/(F${inRow}*H${inRow}))*VLOOKUP(C${inRow},${ratesRange},4,FALSE)` }
    r.getCell(8).value = { formula: `D${calcRow}+F${calcRow}` }
    r.getCell(9).value = { formula: `E${calcRow}+G${calcRow}` }
    r.getCell(10).value = { formula: `I${calcRow}-H${calcRow}` }

    for (let c = 1; c <= 10; c++) {
      const cell = r.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      if (c >= 4 && c <= 10) cell.numFmt = '#,##0.0000'
    }
  }

  // Routing Grand Total Row
  const rRtTot = ws3.getRow(calcRtEnd + 1)
  rRtTot.getCell(2).value = 'TOTAL CONVERSION COST (C_L + C_B)'
  rRtTot.getCell(4).value = { formula: `SUM(D${calcRtStart}:D${calcRtEnd})` }
  rRtTot.getCell(5).value = { formula: `SUM(E${calcRtStart}:E${calcRtEnd})` }
  rRtTot.getCell(6).value = { formula: `SUM(F${calcRtStart}:F${calcRtEnd})` }
  rRtTot.getCell(7).value = { formula: `SUM(G${calcRtStart}:G${calcRtEnd})` }
  rRtTot.getCell(8).value = { formula: `SUM(H${calcRtStart}:H${calcRtEnd})` }
  rRtTot.getCell(9).value = { formula: `SUM(I${calcRtStart}:I${calcRtEnd})` }
  rRtTot.getCell(10).value = { formula: `SUM(J${calcRtStart}:J${calcRtEnd})` }
  for (let c = 1; c <= 10; c++) {
    const cell = rRtTot.getCell(c)
    cell.fill = fillTotal
    cell.font = fontDataBold
    cell.border = borderTotal
    if (c >= 4 && c <= 10) cell.numFmt = '#,##0.0000'
  }

  // -------------------------------------------------------------
  // 4_SUMMARY_&_COMPARISON
  // -------------------------------------------------------------
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
  rSumMat.getCell(2).value = { formula: `'2_BOM_BREAKDOWN'!D${calcBomEnd + 1}` }
  rSumMat.getCell(3).value = { formula: `'2_BOM_BREAKDOWN'!E${calcBomEnd + 1}` }
  rSumMat.getCell(4).value = { formula: `C5-B5` }
  rSumMat.getCell(5).value = { formula: `IF(B5<>0, D5/B5, 0)` }

  // Direct Labor Row
  const rSumLab = ws4.getRow(6)
  rSumLab.getCell(1).value = 'Direct Labor (C_L)'
  rSumLab.getCell(2).value = { formula: `'3_ROUTING_BREAKDOWN'!D${calcRtEnd + 1}` }
  rSumLab.getCell(3).value = { formula: `'3_ROUTING_BREAKDOWN'!E${calcRtEnd + 1}` }
  rSumLab.getCell(4).value = { formula: `C6-B6` }
  rSumLab.getCell(5).value = { formula: `IF(B6<>0, D6/B6, 0)` }

  // Burden Row
  const rSumBurd = ws4.getRow(7)
  rSumBurd.getCell(1).value = 'Manufacturing Burden (C_B)'
  rSumBurd.getCell(2).value = { formula: `'3_ROUTING_BREAKDOWN'!F${calcRtEnd + 1}` }
  rSumBurd.getCell(3).value = { formula: `'3_ROUTING_BREAKDOWN'!G${calcRtEnd + 1}` }
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
      cell.border = isTot ? borderTotal : borderThin
      if (c >= 2 && c <= 4) cell.numFmt = '#,##0.0000'
      if (c === 5) cell.numFmt = '0.00%'
    }
  }

  // Save files
  const outDir = path.resolve(__dirname, '../excel_models/v2_modular')
  const pubDir = path.resolve(__dirname, '../public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true })

  const file1 = path.join(outDir, 'CostModel_SYNTHETIC_MOCK_v2.xlsx')
  const file2 = path.join(pubDir, 'CostModel_SYNTHETIC_MOCK_v2.xlsx')

  await wb.xlsx.writeFile(file1)
  await wb.xlsx.writeFile(file2)
  console.log(`Successfully generated Synthetic Mock Excel files:\n  - ${file1}\n  - ${file2}`)
}

buildSyntheticMockWorkbook().catch(console.error)
