/**
 * build_excel_models_v2.js
 * Generates 100% Pure, Source-Accurate V2 Modular Excel Models
 *
 * Professional Clean Architecture:
 * - Direct Material (Sheet 2): Flat 10-item BOM Table, pristine zero-hiding total row
 * - Process Conversion (Sheet 3): Flat 39-step Continuous Routing Table (Subtotals removed!),
 *     Calculation rows at Rows 47 to 85, Grand Total row at Row 86
 * - Summary & Top Cost Drivers (Sheet 4): Clean 10 columns only (Columns A to J),
 *     100% dynamic automated ranking, pristine zero-hiding summary
 * - Hidden Calculation Engine (Sheet 5: '_CALC_ENGINE'):
 *     Dedicated hidden worksheet evaluating all 49 atomic nodes across Material & Process
 *     Supplies dynamic LARGE() & INDEX/MATCH formulas to Sheet 4
 * - Standard Unit: 'Unit' across all headers and tooltips
 * - 100% Format Parity between Populated Model and Blank Master Template
 */

import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors & Styling
const COLOR_DARK_NAVY = '0F172A' // Slate 900
const COLOR_HEADER_FILL = '1E293B' // Slate 800
const COLOR_HEADER_TEXT = 'FFFFFF'
const COLOR_INPUT_YELLOW = 'FEF9C3' // Pale Yellow for editable inputs
const COLOR_TOTAL_BG = 'F8FAFC' // Slate 50
const COLOR_BORDER = 'CBD5E1' // Slate 300

const fontTitle = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR_HEADER_TEXT } }
const fontData = { name: 'Calibri', size: 9.5 }
const fontDataBold = { name: 'Calibri', size: 9.5, bold: true }

const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_FILL } }
const fillYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_YELLOW } }
const fillTotal = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } }

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

// 1. RATES DATA (Source XXXX-024,025,026-01 Rows 17-20)
const RATES_DATA = [
  { wc: 'WC-CUT', desc: 'Cutting Line', labor: 105.29, burden: 138.48, eff: '2025-03-31', ref: 'Cost declare 250331 row 17' },
  { wc: 'WC-PRT', desc: 'Printing Line', labor: 105.29, burden: 97.69, eff: '2025-03-31', ref: 'Cost declare 250331 row 18' },
  { wc: 'WC-ASY', desc: 'Assembly Line', labor: 105.29, burden: 90.93, eff: '2025-03-31', ref: 'Cost declare 250331 row 19' },
  { wc: 'WC-QAP', desc: 'QA & Packing Line', labor: 105.29, burden: 82.74, eff: '2025-03-31', ref: 'Cost declare 250331 row 20' }
]

// 2. BOM DATA (Price List 07-26 & BOM_XX-024)
const BOM_DATA = [
  { itemNo: 1, code: 'RMMBA1020', desc: 'DOTITE XA-3645 Conductive Silver Paste Ink', q: 0.0035, uom: 'GM', p0: 150.00, p1: 545.60, loss0: 0.30, loss1: 0.30, ref: 'Cost declare 250331' },
  { itemNo: 2, code: 'RMMBA1030', desc: 'FEC-4023 Carbon Resistive Paste Ink', q: 0.0020, uom: 'GM', p0: 85.00, p1: 85.00, loss0: 0.30, loss1: 0.30, ref: 'Cost declare 250331' },
  { itemNo: 3, code: 'RMMBA1040', desc: 'PTF-3201N UV Dielectric Insulating Paste', q: 0.0050, uom: 'GM', p0: 45.00, p1: 45.00, loss0: 0.30, loss1: 0.30, ref: 'Cost declare 250331' },
  { itemNo: 4, code: 'RMPET1010', desc: 'PET Film FPE-1100 (25um Base Film)', q: 0.0125, uom: 'SM', p0: 380.00, p1: 380.00, loss0: 0.15, loss1: 0.15, ref: 'Cost declare 250331' },
  { itemNo: 5, code: 'RMCVR2010', desc: 'Front Graphic Overlay Hardcoat Film', q: 0.0125, uom: 'SM', p0: 420.00, p1: 420.00, loss0: 0.15, loss1: 0.15, ref: 'Cost declare 250331' },
  { itemNo: 6, code: 'RMADH3010', desc: 'High-Tack Acrylic Spacer Tape 3M', q: 0.0125, uom: 'SM', p0: 280.00, p1: 280.00, loss0: 0.15, loss1: 0.15, ref: 'Cost declare 250331' },
  { itemNo: 7, code: 'RMPCK4010', desc: 'Conductive Anti-Static Shield Bag', q: 1.0000, uom: 'PC', p0: 0.85, p1: 0.85, loss0: 0.05, loss1: 0.05, ref: 'Cost declare 250331' },
  { itemNo: 8, code: 'RMPCK4020', desc: 'Silica Gel Desiccant 5g Pack', q: 1.0000, uom: 'PC', p0: 0.35, p1: 0.35, loss0: 0.02, loss1: 0.02, ref: 'Cost declare 250331' },
  { itemNo: 9, code: 'RMPCK4030', desc: 'Export Corrugated Shipping Carton', q: 0.0100, uom: 'PC', p0: 42.00, p1: 42.00, loss0: 0.00, loss1: 0.00, ref: 'Cost declare 250331' },
  { itemNo: 10, code: 'RMMBA1050', desc: 'Terminal Pin Connector Clip (Ag Plated)', q: 4.0000, uom: 'PC', p0: 0.12, p1: 0.12, loss0: 0.01, loss1: 0.01, ref: 'Cost declare 250331' }
]

// 3. EXACT 39-STEP ROUTING DATA (Source XXXX-024,025,026-01 Rows 28-81 & Before&After)
const ROUTING_STEPS = [
  // 1. PRINTING Line (22 steps)
  { seq: 1, cat: '1. PRINTING Line', name: 'Cutting', wc: 'WC-CUT', m: 1.0, cap0: 6180, cap1: 6180, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 28' },
  { seq: 2, cat: '1. PRINTING Line', name: 'Annealing', wc: 'WC-CUT', m: 1.0, cap0: 2520, cap1: 2520, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 29' },
  { seq: 3, cat: '1. PRINTING Line', name: 'Re-anneal#1', wc: 'WC-PRT', m: 1.0, cap0: 2340, cap1: 2340, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 30' },
  { seq: 4, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 31' },
  { seq: 5, cat: '1. PRINTING Line', name: 'Printing-BAg', wc: 'WC-PRT', m: 4.0, cap0: 1884, cap1: 1884, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 32' },
  { seq: 6, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 33' },
  { seq: 7, cat: '1. PRINTING Line', name: 'Printing-BC', wc: 'WC-PRT', m: 4.0, cap0: 1944, cap1: 1944, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 34' },
  { seq: 8, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 35' },
  { seq: 9, cat: '1. PRINTING Line', name: 'Printing-BUR1', wc: 'WC-PRT', m: 3.0, cap0: 1836, cap1: 1836, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 36' },
  { seq: 10, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 37' },
  { seq: 11, cat: '1. PRINTING Line', name: 'Printing-BUR2', wc: 'WC-PRT', m: 3.0, cap0: 2004, cap1: 2004, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 38' },
  { seq: 12, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 39' },
  { seq: 13, cat: '1. PRINTING Line', name: 'Re-anneal#2', wc: 'WC-PRT', m: 1.0, cap0: 3420, cap1: 3420, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 40' },
  { seq: 14, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 41' },
  { seq: 15, cat: '1. PRINTING Line', name: 'Printing-BAg.J', wc: 'WC-PRT', m: 8.0, cap0: 1572, cap1: 1572, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 42' },
  { seq: 16, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 43' },
  { seq: 17, cat: '1. PRINTING Line', name: 'Printing-BOR', wc: 'WC-PRT', m: 2.0, cap0: 2040, cap1: 2040, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 44' },
  { seq: 18, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 45' },
  { seq: 19, cat: '1. PRINTING Line', name: 'Re-anneal#3', wc: 'WC-PRT', m: 1.0, cap0: 3420, cap1: 3420, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 46' },
  { seq: 20, cat: '1. PRINTING Line', name: 'Cleaning M/C(Back side)', wc: 'WC-PRT', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 47' },
  { seq: 21, cat: '1. PRINTING Line', name: 'Laminate Carrier film', wc: 'WC-PRT', m: 8.0, cap0: 2640, cap1: 2640, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 48' },
  { seq: 22, cat: '1. PRINTING Line', name: 'Re-anneal#4', wc: 'WC-PRT', m: 1.0, cap0: 5040, cap1: 5040, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 49' },

  // 2. Material Prep & Cutting (5 steps)
  { seq: 23, cat: '2. Material Prep & Cutting', name: 'PET support: Cutting', wc: 'WC-CUT', m: 1.0, cap0: 14400, cap1: 14400, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 52' },
  { seq: 24, cat: '2. Material Prep & Cutting', name: 'Packing sheet: Cutting', wc: 'WC-CUT', m: 1.0, cap0: 11200, cap1: 11200, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 54' },
  { seq: 25, cat: '2. Material Prep & Cutting', name: 'Packing sheet: Half cut', wc: 'WC-ASY', m: 0.5, cap0: 4800, cap1: 4800, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 55' },
  { seq: 26, cat: '2. Material Prep & Cutting', name: 'Packing sheet: Blanking', wc: 'WC-ASY', m: 1.0, cap0: 1894, cap1: 1894, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 56' },
  { seq: 27, cat: '2. Material Prep & Cutting', name: 'Carrier Film: Cutting', wc: 'WC-CUT', m: 1.0, cap0: 8400, cap1: 8400, y0: 0.064506, y1: 0.064506, ref: 'Cost declare Row 58' },

  // 3. Digital Assembly Line (9 steps)
  { seq: 28, cat: '3. Digital Assembly Line', name: 'AI-Ins', wc: 'WC-ASY', m: 4.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.74, ref: 'Cost declare Row 60' },
  { seq: 29, cat: '3. Digital Assembly Line', name: 'P-ins', wc: 'WC-ASY', m: 2.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.84, ref: 'Cost declare Row 61' },
  { seq: 30, cat: '3. Digital Assembly Line', name: 'VDO-ins I', wc: 'WC-ASY', m: 4.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.84, ref: 'Cost declare Row 62' },
  { seq: 31, cat: '3. Digital Assembly Line', name: 'Outline Blanking', wc: 'WC-ASY', m: 1.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.84, ref: 'Cost declare Row 63' },
  { seq: 32, cat: '3. Digital Assembly Line', name: 'Blanking-ins', wc: 'WC-ASY', m: 1.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.90, ref: 'Cost declare Row 64' },
  { seq: 33, cat: '3. Digital Assembly Line', name: 'E-ins I (Insulation)', wc: 'WC-ASY', m: 2.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.90, ref: 'Cost declare Row 65' },
  { seq: 34, cat: '3. Digital Assembly Line', name: 'E-ins II (Capacitive)', wc: 'WC-ASY', m: 4.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.90, ref: 'Cost declare Row 66' },
  { seq: 35, cat: '3. Digital Assembly Line', name: 'VDO-ins II (SN code & C peel off)', wc: 'WC-ASY', m: 1.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.90, ref: 'Cost declare Row 67' },
  { seq: 36, cat: '3. Digital Assembly Line', name: 'V-Ins', wc: 'WC-ASY', m: 2.0, cap0: 600, cap1: 600, y0: 1.00, y1: 0.90, ref: 'Cost declare Row 68' },

  // 4. Supporting Line (2 steps)
  { seq: 37, cat: '4. Supporting Line', name: 'Support (Film puncher)', wc: 'WC-ASY', m: 1.0, cap0: 480, cap1: 480, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 72' },
  { seq: 38, cat: '4. Supporting Line', name: 'Support (Half cut)', wc: 'WC-ASY', m: 0.5, cap0: 4800, cap1: 4800, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 73' },

  // 5. QA & Packing Line (1 step)
  { seq: 39, cat: '5. QA & Packing Line', name: 'QA & Packing (VDO-Ins 1/2, QA Ins, Packing carton, Leader)', wc: 'WC-QAP', m: 5.0, cap0: 560, cap1: 560, y0: 0.9975, y1: 0.9975, ref: 'Cost declare Rows 74-79' }
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

async function buildWorkbook(isTemplate = false) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Product Cost Engineering System'
  wb.created = new Date()

  // =========================================================================
  // SHEET 1: 1_MASTER_RATES
  // =========================================================================
  const ws1 = wb.addWorksheet('1_MASTER_RATES', { views: [{ showGridLines: true }] })
  
  ws1.mergeCells('A1:F1')
  const r1Title = ws1.getCell('A1')
  r1Title.value = 'PRODUCT INFO & WORK CENTER RATES'
  r1Title.font = fontTitle
  r1Title.alignment = { vertical: 'middle', horizontal: 'left' }

  ws1.mergeCells('A3:D3')
  const r3SecA = ws1.getCell('A3')
  r3SecA.value = 'PRODUCT INFO'
  r3SecA.font = fontSection
  r3SecA.alignment = { vertical: 'middle', horizontal: 'left' }

  const rProdH = ws1.addRow(['Product Code', 'Product Name / Description', 'UOM', 'Source Reference'])
  styleHeaderRow(rProdH, 4)
  rProdH.getCell(3).note = 'Unit of Measure'

  const prodRow = ws1.addRow(
    isTemplate
      ? [null, null, null, null]
      : ['RGOM-024', 'RGOM-024 Membrane Switch Panel', 'PC', 'Cost declare 250331']
  )
  for (let c = 1; c <= 4; c++) {
    const cell = prodRow.getCell(c)
    cell.fill = fillYellow
    cell.font = fontData
    cell.border = borderThin
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }

  ws1.addRow([]) // Row 6 blank

  ws1.mergeCells('A7:F7')
  const r7SecB = ws1.getCell('A7')
  r7SecB.value = 'WORK CENTER RATES (THB / MHr)'
  r7SecB.font = fontSection
  r7SecB.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRatesH = ws1.addRow([
    'Work Center (WC)',
    'Department Description',
    'Labor Rate (THB/MHr)',
    'Burden Rate (THB/MHr)',
    'Effective Date',
    'Source Reference'
  ])
  styleHeaderRow(rRatesH, 6)

  RATES_DATA.forEach((item) => {
    const row = ws1.addRow(
      isTemplate
        ? [null, null, null, null, null, null]
        : [item.wc, item.desc, item.labor, item.burden, item.eff, item.ref]
    )
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 3 || c === 4) cell.numFmt = '#,##0.00'
    }
  })

  ws1.columns = [
    { width: 20 },
    { width: 34 },
    { width: 24 },
    { width: 24 },
    { width: 18 },
    { width: 30 }
  ]

  // =========================================================================
  // SHEET 2: 2_BOM_BREAKDOWN
  // =========================================================================
  const ws2 = wb.addWorksheet('2_BOM_BREAKDOWN', { views: [{ showGridLines: true }] })
  
  ws2.mergeCells('A1:J1')
  const r1BomTitle = ws2.getCell('A1')
  r1BomTitle.value = 'DIRECT MATERIAL COST BREAKDOWN (BOM)'
  r1BomTitle.font = fontTitle
  r1BomTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  ws2.mergeCells('A3:J3')
  const r3BomSec1 = ws2.getCell('A3')
  r3BomSec1.value = 'BOM MATERIAL INPUT'
  r3BomSec1.font = fontSection
  r3BomSec1.alignment = { vertical: 'middle', horizontal: 'left' }

  const rBomInputH = ws2.addRow([
    'Item No',
    'Material Code',
    'Material Description',
    'Consumption',
    'UOM',
    'Base Price (THB)',
    'Active Price (THB)',
    'Base Loss %',
    'Active Loss %',
    'Source Reference'
  ])
  styleHeaderRow(rBomInputH, 10)
  rBomInputH.getCell(5).note = 'Unit of Measure'

  let sumBaseMat = 0
  let sumActiveMat = 0
  let sumMPV = 0
  let sumMLV = 0
  let sumTotalMatVar = 0

  for (let i = 0; i < 10; i++) {
    const item = BOM_DATA[i]
    const row = ws2.addRow([
      isTemplate ? null : item.itemNo,
      isTemplate ? null : item.code,
      isTemplate ? null : item.desc,
      isTemplate ? null : item.q,
      isTemplate ? null : item.uom,
      isTemplate ? null : item.p0,
      isTemplate ? null : item.p1,
      isTemplate ? null : item.loss0,
      isTemplate ? null : item.loss1,
      isTemplate ? null : item.ref
    ])

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }

      if (c === 4) cell.numFmt = '0.0000'
      else if (c === 6 || c === 7) cell.numFmt = '#,##0.00'
      else if (c === 8 || c === 9) cell.numFmt = '0.00%'
    }
  }

  ws2.addRow([]) // Row 15 blank

  ws2.mergeCells('A16:H16')
  const r16BomSec2 = ws2.getCell('A16')
  r16BomSec2.value = 'BOM COST CALCULATION & VARIANCE (THB / Unit)'
  r16BomSec2.font = fontSection
  r16BomSec2.alignment = { vertical: 'middle', horizontal: 'left' }

  const rBomCalcH = ws2.addRow([
    'Item No',
    'Material Code',
    'Material Description',
    'Base Cost (THB)',
    'Active Cost (THB)',
    'Price Var (THB)',
    'Loss Var (THB)',
    'Total Mat Var (Δ THB)'
  ])
  styleHeaderRow(rBomCalcH, 8)

  rBomCalcH.getCell(4).note = 'Consumption * Base Price * (1 + Base Loss%)'
  rBomCalcH.getCell(5).note = 'Consumption * Active Price * (1 + Active Loss%)'
  rBomCalcH.getCell(6).note = '(Active Price - Base Price) * Consumption * (1 + Active Loss%)'
  rBomCalcH.getCell(7).note = '(Active Loss% - Base Loss%) * Consumption * Base Price'
  rBomCalcH.getCell(8).note = 'Active Cost - Base Cost = Price Var + Loss Var'

  for (let i = 0; i < 10; i++) {
    const rIn = 5 + i
    const rOut = 18 + i
    const item = BOM_DATA[i]

    const bCost = item.q * item.p0 * (1 + item.loss0)
    const aCost = item.q * item.p1 * (1 + item.loss1)
    const mpv = (item.p1 - item.p0) * item.q * (1 + item.loss1)
    const mlv = (item.loss1 - item.loss0) * item.q * item.p0
    const tVar = aCost - bCost

    sumBaseMat += bCost
    sumActiveMat += aCost
    sumMPV += mpv
    sumMLV += mlv
    sumTotalMatVar += tVar

    const baseCostFormula = `IFERROR(IF(OR(C${rIn}="", D${rIn}="", F${rIn}=""), "", D${rIn}*F${rIn}*(1+IF(H${rIn}="",0,H${rIn}))), "")`
    const activeCostFormula = `IFERROR(IF(OR(C${rIn}="", D${rIn}="", G${rIn}=""), "", D${rIn}*G${rIn}*(1+IF(I${rIn}="",0,I${rIn}))), "")`
    const mpvFormula = `IFERROR(IF(OR(C${rIn}="", D${rIn}="", F${rIn}="", G${rIn}=""), "", (G${rIn}-F${rIn})*D${rIn}*(1+IF(I${rIn}="",0,I${rIn}))), "")`
    const mlvFormula = `IFERROR(IF(OR(C${rIn}="", D${rIn}="", F${rIn}=""), "", (IF(I${rIn}="",0,I${rIn})-IF(H${rIn}="",0,H${rIn}))*D${rIn}*F${rIn}), "")`
    const totalMatVarFormula = `IFERROR(IF(OR(C${rIn}="", D${rOut}="", E${rOut}=""), "", E${rOut}-D${rOut}), "")`

    const row = ws2.addRow([
      { formula: `IFERROR(IF(A${rIn}="","",A${rIn}),"")`, result: isTemplate ? null : item.itemNo },
      { formula: `IFERROR(IF(B${rIn}="","",B${rIn}),"")`, result: isTemplate ? null : item.code },
      { formula: `IFERROR(IF(C${rIn}="","",C${rIn}),"")`, result: isTemplate ? null : item.desc },
      isTemplate ? { formula: baseCostFormula } : { formula: baseCostFormula, result: bCost },
      isTemplate ? { formula: activeCostFormula } : { formula: activeCostFormula, result: aCost },
      isTemplate ? { formula: mpvFormula } : { formula: mpvFormula, result: mpv },
      isTemplate ? { formula: mlvFormula } : { formula: mlvFormula, result: mlv },
      isTemplate ? { formula: totalMatVarFormula } : { formula: totalMatVarFormula, result: tVar }
    ])

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
    }
  }

  // Pristine zero-hiding total row
  const fSumD = `IFERROR(IF(SUM(D18:D27)=0, "", SUM(D18:D27)), "")`
  const fSumE = `IFERROR(IF(SUM(E18:E27)=0, "", SUM(E18:E27)), "")`
  const fSumF = `IFERROR(IF(SUM(F18:F27)=0, "", SUM(F18:F27)), "")`
  const fSumG = `IFERROR(IF(SUM(G18:G27)=0, "", SUM(G18:G27)), "")`
  const fSumH = `IFERROR(IF(SUM(H18:H27)=0, "", SUM(H18:H27)), "")`

  const bomTotalRow = ws2.addRow([
    'Total', '', '',
    isTemplate ? { formula: fSumD } : { formula: fSumD, result: sumBaseMat },
    isTemplate ? { formula: fSumE } : { formula: fSumE, result: sumActiveMat },
    isTemplate ? { formula: fSumF } : { formula: fSumF, result: sumMPV },
    isTemplate ? { formula: fSumG } : { formula: fSumG, result: sumMLV },
    isTemplate ? { formula: fSumH } : { formula: fSumH, result: sumTotalMatVar }
  ])

  for (let c = 1; c <= 8; c++) {
    const cell = bomTotalRow.getCell(c)
    cell.font = fontDataBold
    cell.fill = fillTotal
    cell.border = borderTotal
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
  }

  ws2.columns = [
    { width: 10 }, { width: 18 }, { width: 42 }, { width: 18 },
    { width: 18 }, { width: 24 }, { width: 24 }, { width: 24 },
    { width: 16 }, { width: 26 }
  ]

  // =========================================================================
  // SHEET 3: 3_ROUTING_BREAKDOWN (FLAT CONTINUOUS 39-STEP TABLE - ROWS 47 TO 85, TOTAL AT 86)
  // =========================================================================
  const ws3 = wb.addWorksheet('3_ROUTING_BREAKDOWN', { views: [{ showGridLines: true }] })
  
  ws3.mergeCells('A1:J1')
  const r1RtTitle = ws3.getCell('A1')
  r1RtTitle.value = 'CONVERSION PROCESS COST BREAKDOWN (ROUTING)'
  r1RtTitle.font = fontTitle
  r1RtTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  ws3.mergeCells('A3:J3')
  const r3RtSec1 = ws3.getCell('A3')
  r3RtSec1.value = 'ROUTING PROCESS INPUT'
  r3RtSec1.font = fontSection
  r3RtSec1.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRtInputH = ws3.addRow([
    'Sequence',
    'Section / Department',
    'Process Name',
    'Work Center',
    'MHr',
    'Base Cap (Unit/hr)',
    'Active Cap (Unit/hr)',
    'Base Yield (%)',
    'Active Yield (%)',
    'Source Reference'
  ])
  styleHeaderRow(rRtInputH, 10)
  rRtInputH.getCell(5).note = 'Machine and Man working hour'

  for (let i = 0; i < ROUTING_STEPS.length; i++) {
    const step = ROUTING_STEPS[i]
    const row = ws3.addRow([
      isTemplate ? null : step.seq,
      isTemplate ? null : step.cat,
      isTemplate ? null : step.name,
      isTemplate ? null : step.wc,
      isTemplate ? null : step.m,
      isTemplate ? null : step.cap0,
      isTemplate ? null : step.cap1,
      isTemplate ? null : step.y0,
      isTemplate ? null : step.y1,
      isTemplate ? null : step.ref
    ])

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }

      if (c === 5) cell.numFmt = '0.0'
      else if (c === 6 || c === 7) cell.numFmt = '#,##0'
      else if (c === 8 || c === 9) cell.numFmt = '0.00%'
    }
  }

  ws3.addRow([]) // Row 44 Blank row

  const calcSectionRow = ws3.addRow([]) // Row 45 Section Row
  const rCalcSecNum = calcSectionRow.number
  ws3.mergeCells(`A${rCalcSecNum}:P${rCalcSecNum}`)
  const rCalcSecCell = ws3.getCell(`A${rCalcSecNum}`)
  rCalcSecCell.value = 'CONVERSION COST CALCULATION & VARIANCE (THB / Unit)'
  rCalcSecCell.font = fontSection
  rCalcSecCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRtCalcH = ws3.addRow([ // Row 46 Table Header
    'Sequence',
    'Section / Department',
    'Process Name',
    'Work Center',
    'Base Runtime (MHr)',
    'Active Runtime (MHr)',
    'Δ Runtime (MHr)',
    'Base Labor (THB)',
    'Active Labor (THB)',
    'Δ Labor (THB)',
    'Base Burden (THB)',
    'Active Burden (THB)',
    'Δ Burden (THB)',
    'Base Process Cost (THB)',
    'Active Process Cost (THB)',
    'Total Process Δ (THB)'
  ])
  styleHeaderRow(rRtCalcH, 16)

  rRtCalcH.getCell(5).note = 'MHr / (Base Capacity * Base Yield%)'
  rRtCalcH.getCell(6).note = 'MHr / (Active Capacity * Active Yield%)'
  rRtCalcH.getCell(7).note = 'Active Runtime - Base Runtime'
  rRtCalcH.getCell(8).note = 'Base Runtime * Labor Rate'
  rRtCalcH.getCell(9).note = 'Active Runtime * Labor Rate'
  rRtCalcH.getCell(10).note = 'Active Labor - Base Labor'
  rRtCalcH.getCell(11).note = 'Base Runtime * Burden Rate'
  rRtCalcH.getCell(12).note = 'Active Runtime * Burden Rate'
  rRtCalcH.getCell(13).note = 'Active Burden - Base Burden'
  rRtCalcH.getCell(14).note = 'Base Labor + Base Burden'
  rRtCalcH.getCell(15).note = 'Active Labor + Active Burden'
  rRtCalcH.getCell(16).note = 'Active Process Cost - Base Process Cost = Δ Labor + Δ Burden'

  const ratesMap = {
    'WC-CUT': { labor: 105.29, burden: 138.48 },
    'WC-PRT': { labor: 105.29, burden: 97.69 },
    'WC-ASY': { labor: 105.29, burden: 90.93 },
    'WC-QAP': { labor: 105.29, burden: 82.74 }
  }

  let sumBaseLaborAll = 0
  let sumActiveLaborAll = 0
  let sumBaseBurdenAll = 0
  let sumActiveBurdenAll = 0

  for (let i = 0; i < ROUTING_STEPS.length; i++) {
    const step = ROUTING_STEPS[i]
    const rIn = 5 + i
    const rOut = 47 + i // Exact row number in calculation table!

    const bRt = step.m / (step.cap0 * step.y0)
    const aRt = step.m / (step.cap1 * step.y1)
    const dRt = aRt - bRt
    const rate = ratesMap[step.wc] || { labor: 105.29, burden: 90.93 }
    const bLab = bRt * rate.labor
    const aLab = aRt * rate.labor
    const dLab = aLab - bLab
    const bBurd = bRt * rate.burden
    const aBurd = aRt * rate.burden
    const dBurd = aBurd - bBurd
    const bProc = bLab + bBurd
    const aProc = aLab + aBurd
    const pDelta = aProc - bProc

    sumBaseLaborAll += bLab
    sumActiveLaborAll += aLab
    sumBaseBurdenAll += bBurd
    sumActiveBurdenAll += aBurd

    const baseRuntimeFormula = `IFERROR(IF(OR(C${rIn}="", F${rIn}="", H${rIn}="", F${rIn}=0, H${rIn}=0), "", E${rIn}/(F${rIn}*H${rIn})), "")`
    const activeRuntimeFormula = `IFERROR(IF(OR(C${rIn}="", G${rIn}="", I${rIn}="", G${rIn}=0, I${rIn}=0), "", E${rIn}/(G${rIn}*I${rIn})), "")`
    const deltaRuntimeFormula = `IFERROR(IF(OR(C${rIn}="", E${rOut}="", F${rOut}=""), "", F${rOut}-E${rOut}), "")`

    const baseLaborFormula = `IFERROR(IF(OR(C${rIn}="", E${rOut}=""), "", E${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:F$12,3,FALSE),0)), "")`
    const activeLaborFormula = `IFERROR(IF(OR(C${rIn}="", F${rOut}=""), "", F${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:F$12,3,FALSE),0)), "")`
    const deltaLaborFormula = `IFERROR(IF(OR(C${rIn}="", H${rOut}="", I${rOut}=""), "", I${rOut}-H${rOut}), "")`

    const baseBurdenFormula = `IFERROR(IF(OR(C${rIn}="", E${rOut}=""), "", E${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:F$12,4,FALSE),0)), "")`
    const activeBurdenFormula = `IFERROR(IF(OR(C${rIn}="", F${rOut}=""), "", F${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:F$12,4,FALSE),0)), "")`
    const deltaBurdenFormula = `IFERROR(IF(OR(C${rIn}="", K${rOut}="", L${rOut}=""), "", L${rOut}-K${rOut}), "")`

    const baseProcessCostFormula = `IFERROR(IF(C${rIn}="","", H${rOut}+K${rOut}), "")`
    const activeProcessCostFormula = `IFERROR(IF(C${rIn}="","", I${rOut}+L${rOut}), "")`
    const processDeltaFormula = `IFERROR(IF(C${rIn}="","", O${rOut}-N${rOut}), "")`

    const row = ws3.addRow([
      { formula: `IFERROR(IF(A${rIn}="","",A${rIn}),"")`, result: isTemplate ? null : step.seq },
      { formula: `IFERROR(IF(B${rIn}="","",B${rIn}),"")`, result: isTemplate ? null : step.cat },
      { formula: `IFERROR(IF(C${rIn}="","",C${rIn}),"")`, result: isTemplate ? null : step.name },
      { formula: `IFERROR(IF(D${rIn}="","",D${rIn}),"")`, result: isTemplate ? null : step.wc },
      isTemplate ? { formula: baseRuntimeFormula } : { formula: baseRuntimeFormula, result: bRt },
      isTemplate ? { formula: activeRuntimeFormula } : { formula: activeRuntimeFormula, result: aRt },
      isTemplate ? { formula: deltaRuntimeFormula } : { formula: deltaRuntimeFormula, result: dRt },
      isTemplate ? { formula: baseLaborFormula } : { formula: baseLaborFormula, result: bLab },
      isTemplate ? { formula: activeLaborFormula } : { formula: activeLaborFormula, result: aLab },
      isTemplate ? { formula: deltaLaborFormula } : { formula: deltaLaborFormula, result: dLab },
      isTemplate ? { formula: baseBurdenFormula } : { formula: baseBurdenFormula, result: bBurd },
      isTemplate ? { formula: activeBurdenFormula } : { formula: activeBurdenFormula, result: aBurd },
      isTemplate ? { formula: deltaBurdenFormula } : { formula: deltaBurdenFormula, result: dBurd },
      isTemplate ? { formula: baseProcessCostFormula } : { formula: baseProcessCostFormula, result: bProc },
      isTemplate ? { formula: activeProcessCostFormula } : { formula: activeProcessCostFormula, result: aProc },
      isTemplate ? { formula: processDeltaFormula } : { formula: processDeltaFormula, result: pDelta }
    ])

    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c >= 5 && c <= 7) cell.numFmt = '0.000000'
      else if (c >= 8 && c <= 16) cell.numFmt = '#,##0.0000'
    }
  }

  // Pristine Flat Grand Total Row at Row 86
  const fSumHLab = `IFERROR(IF(SUM(H47:H85)=0, "", SUM(H47:H85)), "")`
  const fSumILab = `IFERROR(IF(SUM(I47:I85)=0, "", SUM(I47:I85)), "")`
  const fSumJLab = `IFERROR(IF(SUM(J47:J85)=0, "", SUM(J47:J85)), "")`
  const fSumKBurd = `IFERROR(IF(SUM(K47:K85)=0, "", SUM(K47:K85)), "")`
  const fSumLBurd = `IFERROR(IF(SUM(L47:L85)=0, "", SUM(L47:L85)), "")`
  const fSumMBurd = `IFERROR(IF(SUM(M47:M85)=0, "", SUM(M47:M85)), "")`
  const fSumNProc = `IFERROR(IF(SUM(N47:N85)=0, "", SUM(N47:N85)), "")`
  const fSumOProc = `IFERROR(IF(SUM(O47:O85)=0, "", SUM(O47:O85)), "")`
  const fSumPDelta = `IFERROR(IF(SUM(P47:P85)=0, "", SUM(P47:P85)), "")`

  const grandTotalRow = ws3.addRow([
    'Total', 'Total Processing Cost', '', '', '', '', '',
    isTemplate ? { formula: fSumHLab } : { formula: fSumHLab, result: sumBaseLaborAll },
    isTemplate ? { formula: fSumILab } : { formula: fSumILab, result: sumActiveLaborAll },
    isTemplate ? { formula: fSumJLab } : { formula: fSumJLab, result: sumActiveLaborAll - sumBaseLaborAll },
    isTemplate ? { formula: fSumKBurd } : { formula: fSumKBurd, result: sumBaseBurdenAll },
    isTemplate ? { formula: fSumLBurd } : { formula: fSumLBurd, result: sumActiveBurdenAll },
    isTemplate ? { formula: fSumMBurd } : { formula: fSumMBurd, result: sumActiveBurdenAll - sumBaseBurdenAll },
    isTemplate ? { formula: fSumNProc } : { formula: fSumNProc, result: sumBaseLaborAll + sumBaseBurdenAll },
    isTemplate ? { formula: fSumOProc } : { formula: fSumOProc, result: sumActiveLaborAll + sumActiveBurdenAll },
    isTemplate ? { formula: fSumPDelta } : { formula: fSumPDelta, result: (sumActiveLaborAll + sumActiveBurdenAll) - (sumBaseLaborAll + sumBaseBurdenAll) }
  ])

  for (let c = 1; c <= 16; c++) {
    const cell = grandTotalRow.getCell(c)
    cell.font = fontDataBold
    cell.fill = fillTotal
    cell.border = borderTotal
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    if (c >= 8 && c <= 16) cell.numFmt = '#,##0.0000'
  }

  ws3.columns = [
    { width: 10 }, { width: 26 }, { width: 44 }, { width: 16 },
    { width: 20 }, { width: 20 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 16 },
    { width: 18 }, { width: 18 }, { width: 16 },
    { width: 22 }, { width: 22 }, { width: 20 }
  ]

  // =========================================================================
  // SHEET 5: _CALC_ENGINE (HIDDEN DEDICATED CALCULATION ENGINE)
  // =========================================================================
  const wsEngine = wb.addWorksheet('_CALC_ENGINE', { state: 'hidden' })
  
  const rEngH = wsEngine.addRow([
    'ID', 'Stream', 'Category', 'Driver Name', 'RCA Parameter',
    'Base Parameter', 'Active Parameter', 'Cost Gap (THB)', 'Score'
  ])
  styleHeaderRow(rEngH, 9)

  // 10 Material Candidates
  for (let i = 0; i < 10; i++) {
    const inR = 5 + i
    const calcR = 18 + i
    const rEng = 2 + i

    const catF = `"Direct Material"`
    const driverF = `IFERROR('2_BOM_BREAKDOWN'!C${inR},"")`
    const rcaF = `IFERROR(IF('2_BOM_BREAKDOWN'!G${inR}>'2_BOM_BREAKDOWN'!F${inR},"Unit Price Inflation ($"&TEXT('2_BOM_BREAKDOWN'!F${inR},"#,##0.00")&" ➔ $"&TEXT('2_BOM_BREAKDOWN'!G${inR},"#,##0.00")&")",IF('2_BOM_BREAKDOWN'!I${inR}>'2_BOM_BREAKDOWN'!H${inR},"Loss % Increase","Material Variance")),"")`
    const baseF = `IFERROR('2_BOM_BREAKDOWN'!F${inR},"")`
    const activeF = `IFERROR('2_BOM_BREAKDOWN'!G${inR},"")`
    const gapF = `IFERROR('2_BOM_BREAKDOWN'!H${calcR},0)`
    const scoreF = `IFERROR(H${rEng}+(49-A${rEng})*0.00000001, 0)`

    wsEngine.addRow([
      i + 1, 'Material',
      { formula: catF },
      { formula: driverF },
      { formula: rcaF },
      { formula: baseF },
      { formula: activeF },
      { formula: gapF },
      { formula: scoreF }
    ])
  }

  // 39 Routing Candidates
  for (let k = 0; k < ROUTING_STEPS.length; k++) {
    const inR = 5 + k
    const calcR = 47 + k
    const rEng = 12 + k

    const catF = `IFERROR('3_ROUTING_BREAKDOWN'!B${inR},"")`
    const driverF = `IFERROR('3_ROUTING_BREAKDOWN'!C${inR},"")`
    const rcaF = `IFERROR(IF('3_ROUTING_BREAKDOWN'!I${inR}<'3_ROUTING_BREAKDOWN'!H${inR},"Yield Drop ("&TEXT('3_ROUTING_BREAKDOWN'!H${inR},"0.0%")&" ➔ "&TEXT('3_ROUTING_BREAKDOWN'!I${inR},"0.0%")&")",IF('3_ROUTING_BREAKDOWN'!G${inR}<'3_ROUTING_BREAKDOWN'!F${inR},"Capacity Drop","Process Variance")),"")`
    const baseF = `IFERROR(IF('3_ROUTING_BREAKDOWN'!I${inR}<'3_ROUTING_BREAKDOWN'!H${inR},'3_ROUTING_BREAKDOWN'!H${inR},'3_ROUTING_BREAKDOWN'!F${inR}),"")`
    const activeF = `IFERROR(IF('3_ROUTING_BREAKDOWN'!I${inR}<'3_ROUTING_BREAKDOWN'!H${inR},'3_ROUTING_BREAKDOWN'!I${inR},'3_ROUTING_BREAKDOWN'!G${inR}),"")`
    const gapF = `IFERROR('3_ROUTING_BREAKDOWN'!P${calcR},0)`
    const scoreF = `IFERROR(H${rEng}+(49-A${rEng})*0.00000001, 0)`

    wsEngine.addRow([
      11 + k, 'Process',
      { formula: catF },
      { formula: driverF },
      { formula: rcaF },
      { formula: baseF },
      { formula: activeF },
      { formula: gapF },
      { formula: scoreF }
    ])
  }

  // =========================================================================
  // SHEET 4: 4_SUMMARY_&_COMPARISON (CLEAN 10 COLUMNS A TO J ONLY!)
  // =========================================================================
  const ws4 = wb.addWorksheet('4_SUMMARY_&_COMPARISON', { views: [{ showGridLines: true }] })
  
  ws4.mergeCells('A1:F1')
  const r1SumTitle = ws4.getCell('A1')
  r1SumTitle.value = 'COST SUMMARY & VARIANCE COMPARISON'
  r1SumTitle.font = fontTitle
  r1SumTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  ws4.mergeCells('A3:F3')
  const r3SumSec1 = ws4.getCell('A3')
  r3SumSec1.value = 'REFERENCE STANDARD VS CURRENT STANDARD (THB / Unit)'
  r3SumSec1.font = fontSection
  r3SumSec1.alignment = { vertical: 'middle', horizontal: 'left' }

  const rSumH = ws4.addRow([
    'Cost Element',
    'Baseline Ref Std (THB)',
    'Active Current Std (THB)',
    'Variance (Δ THB)',
    '% Variance',
    'Level Reference'
  ])
  styleHeaderRow(rSumH, 6)

  rSumH.getCell(4).note = 'Active Current Std - Baseline Ref Std'
  rSumH.getCell(5).note = '(Variance / Baseline Ref Std) * 100%'

  const sumTotalBase = sumBaseMat + sumBaseLaborAll + sumBaseBurdenAll
  const sumTotalActive = sumActiveMat + sumActiveLaborAll + sumActiveBurdenAll
  const sumTotalVar = sumTotalActive - sumTotalBase

  const elements = [
    { name: 'Material', bFormula: "'2_BOM_BREAKDOWN'!D28", aFormula: "'2_BOM_BREAKDOWN'!E28", bVal: sumBaseMat, aVal: sumActiveMat, lvl: 'Level 1' },
    { name: 'Labor', bFormula: `'3_ROUTING_BREAKDOWN'!H86`, aFormula: `'3_ROUTING_BREAKDOWN'!I86`, bVal: sumBaseLaborAll, aVal: sumActiveLaborAll, lvl: 'Level 1' },
    { name: 'Burden', bFormula: `'3_ROUTING_BREAKDOWN'!K86`, aFormula: `'3_ROUTING_BREAKDOWN'!L86`, bVal: sumBaseBurdenAll, aVal: sumActiveBurdenAll, lvl: 'Level 1' }
  ]

  elements.forEach((elem, idx) => {
    const rIdx = 5 + idx
    const diff = elem.aVal - elem.bVal
    const pct = elem.bVal > 0 ? diff / elem.bVal : 0

    const row = ws4.addRow([
      elem.name,
      isTemplate ? { formula: `IFERROR(IF(${elem.bFormula}="","",${elem.bFormula}), "")` } : { formula: `IFERROR(${elem.bFormula}, 0)`, result: elem.bVal },
      isTemplate ? { formula: `IFERROR(IF(${elem.aFormula}="","",${elem.aFormula}), "")` } : { formula: `IFERROR(${elem.aFormula}, 0)`, result: elem.aVal },
      isTemplate ? { formula: `IFERROR(IF(OR(B${rIdx}="",C${rIdx}=""),"",C${rIdx}-B${rIdx}), "")` } : { formula: `IFERROR(C${rIdx}-B${rIdx}, 0)`, result: diff },
      isTemplate ? { formula: `IFERROR(IF(OR(B${rIdx}="",D${rIdx}="",B${rIdx}<=0), "", D${rIdx}/B${rIdx}), "")` } : { formula: `IFERROR(IF(B${rIdx}>0, D${rIdx}/B${rIdx}, 0), 0)`, result: pct },
      elem.lvl
    ])

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 1) cell.font = fontDataBold
      else if (c >= 2 && c <= 4) cell.numFmt = '#,##0.0000'
      else if (c === 5) cell.numFmt = '0.00%'
    }
  })

  const totalPct = sumTotalBase > 0 ? sumTotalVar / sumTotalBase : 0
  const totalRow = ws4.addRow([
    'Std Total',
    isTemplate ? { formula: 'IFERROR(IF(SUM(B5:B7)=0,"",SUM(B5:B7)), "")' } : { formula: 'IFERROR(SUM(B5:B7), 0)', result: sumTotalBase },
    isTemplate ? { formula: 'IFERROR(IF(SUM(C5:C7)=0,"",SUM(C5:C7)), "")' } : { formula: 'IFERROR(SUM(C5:C7), 0)', result: sumTotalActive },
    isTemplate ? { formula: 'IFERROR(IF(OR(B8="",C8=""),"",C8-B8), "")' } : { formula: 'IFERROR(C8-B8, 0)', result: sumTotalVar },
    isTemplate ? { formula: 'IFERROR(IF(OR(B8="",D8="",B8<=0), "", D8/B8), "")' } : { formula: 'IFERROR(IF(B8>0, D8/B8, 0), 0)', result: totalPct },
    'Level 0'
  ])

  for (let c = 1; c <= 6; c++) {
    const cell = totalRow.getCell(c)
    cell.font = fontDataBold
    cell.fill = fillTotal
    cell.border = borderTotal
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    if (c >= 2 && c <= 4) cell.numFmt = '#,##0.0000'
    else if (c === 5) cell.numFmt = '0.00%'
  }

  ws4.addRow([]) // Row 9 blank
  ws4.addRow([]) // Row 10 blank

  ws4.mergeCells('A11:J11')
  const r11SumSec2 = ws4.getCell('A11')
  r11SumSec2.value = 'TOP COST DRIVERS (LEVEL 2 ➔ LEVEL 3 ➔ LEVEL 4 RCA)'
  r11SumSec2.font = fontSection
  r11SumSec2.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRankH = ws4.addRow([
    'Rank',
    'Level 2 Category',
    'Level 3 Cost Driver (Item / Station)',
    'Level 4 RCA Parameter Changed',
    'Base Parameter',
    'Active Parameter',
    'Cost Gap (THB/Unit)',
    '% Contribution',
    'Controllability',
    'Remark'
  ])
  styleHeaderRow(rRankH, 10)

  rRankH.getCell(8).note = '(Cost Gap of Driver / Total Std Variance) * 100%'
  rRankH.getCell(9).note = 'Default: Controllable (Internal Action). Automatically becomes Uncontrollable when Remark is specified.'
  rRankH.getCell(10).note = 'Leave blank for normal internal action, or specify reason if uncontrollable (external constraint).'

  // Table 2: 10 Dynamic Ranking Rows linked to _CALC_ENGINE
  for (let r = 0; r < 10; r++) {
    const rIdx = 13 + r
    const rankNum = r + 1
    const rankLabel = `#${rankNum}`

    // 100% Dynamic Formulas linking to _CALC_ENGINE!
    const fRankGap = `IFERROR(IF(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum})>0.000001, INDEX(_CALC_ENGINE!$H$2:$H$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0)), ""), "")`
    const fRankCat = `IFERROR(IF(G${rIdx}="","", INDEX(_CALC_ENGINE!$C$2:$C$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0))), "")`
    const fRankDriver = `IFERROR(IF(G${rIdx}="","", INDEX(_CALC_ENGINE!$D$2:$D$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0))), "")`
    const fRankRca = `IFERROR(IF(G${rIdx}="","", INDEX(_CALC_ENGINE!$E$2:$E$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0))), "")`
    const fRankBase = `IFERROR(IF(G${rIdx}="","", INDEX(_CALC_ENGINE!$F$2:$F$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0))), "")`
    const fRankActive = `IFERROR(IF(G${rIdx}="","", INDEX(_CALC_ENGINE!$G$2:$G$50, MATCH(LARGE(_CALC_ENGINE!$I$2:$I$50, ${rankNum}), _CALC_ENGINE!$I$2:$I$50, 0))), "")`
    const fRankContrib = `IFERROR(IF(OR(G${rIdx}="", $D$8<=0), "", G${rIdx}/$D$8), "")`
    const fRankCtrl = `IFERROR(IF(G${rIdx}="","", IF(J${rIdx}="","Controllable","Uncontrollable")), "")`

    const populatedRemark = (!isTemplate && r === 0) ? 'Customer Approved Drawing Spec' : null

    const row = ws4.addRow([
      rankLabel,
      { formula: fRankCat },
      { formula: fRankDriver },
      { formula: fRankRca },
      { formula: fRankBase },
      { formula: fRankActive },
      { formula: fRankGap },
      { formula: fRankContrib },
      { formula: fRankCtrl },
      populatedRemark
    ])

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 1) cell.font = fontDataBold
      else if (c === 5 || c === 6) cell.numFmt = '#,##0.00'
      else if (c === 7) {
        cell.numFmt = '#,##0.0000'
        cell.font = fontDataBold
      } else if (c === 8) cell.numFmt = '0.00%'
      else if (c === 9) cell.font = fontDataBold
      else if (c === 10) cell.fill = fillYellow
    }
  }

  // Generous column widths to prevent truncation 100%
  ws4.columns = [
    { width: 12 },  // Rank
    { width: 32 },  // Level 2 Category
    { width: 52 },  // Level 3 Driver
    { width: 44 },  // Level 4 RCA
    { width: 18 },  // Base Parameter
    { width: 18 },  // Active Parameter
    { width: 22 },  // Cost Gap
    { width: 16 },  // % Contribution
    { width: 18 },  // Controllability
    { width: 48 }   // Remark
  ]

  return wb
}

async function main() {
  console.log('--- GENERATING 100% PURE SOURCE-ACCURATE V2 MODULAR EXCEL MODELS ---')

  const outDir = path.join(__dirname, '..', 'excel_models', 'v2_modular')
  const populatedPath = path.join(outDir, 'CostModel_RGOM-024_v2.xlsx')
  const templatePath = path.join(outDir, 'CostModel_BLANK_TEMPLATE_v2.xlsx')

  // 1. Populated Model (RGOM-024)
  const wbPopulated = await buildWorkbook(false)
  await wbPopulated.xlsx.writeFile(populatedPath)
  console.log(`[SUCCESS] Saved V2 Populated Model: ${populatedPath}`)

  // 2. Blank Master Template
  const wbTemplate = await buildWorkbook(true)
  await wbTemplate.xlsx.writeFile(templatePath)
  console.log(`[SUCCESS] Saved V2 Blank Template: ${templatePath}`)

  console.log('--- V2 MODULAR MODELS GENERATED SUCCESSFULLY ---')
}

main().catch(err => {
  console.error('Error generating V2 models:', err)
  process.exit(1)
})
