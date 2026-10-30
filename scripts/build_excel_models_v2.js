import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- PALETTE TOKENS ---
const COLOR_DARK_NAVY = 'FF1E293B' // #1E293B Primary Accent & Active Headers
const COLOR_MUTED_GRAY = 'FF64748B' // #64748B Secondary Text
const COLOR_BORDER = 'FFE2E8F0' // #E2E8F0 Soft Table Gridlines
const COLOR_CARD_BG = 'FFF8FAFC' // #F8FAFC Card Surface
const COLOR_WHITE = 'FFFFFFFF' // Pure White
const COLOR_SOFT_YELLOW = 'FFFEF9C3' // #FEF9C3 Soft Pastel Input Fill (Yellow/Cream)
const COLOR_TOTAL_ROW = 'FFF1F5F9' // #F1F5F9 Grand Total Row Highlight
const COLOR_TOTAL_BORDER = 'FF334155' // #334155 Dark Double Underline
const COLOR_TOP1_HIGHLIGHT = 'FFFEE2E2' // Soft Red for Rank #1

// --- TYPOGRAPHY & STYLES ---
const fontTitle = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF0F172A' } }
const fontDataBold = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
const fontMuted = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR_MUTED_GRAY } }
const fontUncontrollable = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF991B1B' } }
const fontControllable = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } }

const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK_NAVY } }
const fillYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SOFT_YELLOW } }
const fillTotal = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_ROW } }
const fillTop1 = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOP1_HIGHLIGHT } }
const fillUncontrollable = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
const fillControllable = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }

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

// 1. RATES DATA (Source XXXX-024,025,026-01 Rows 17-20 - 100% Pure Factory Department Names)
const RATES_DATA = [
  { dept: 'Cutting', labor: 105.29, burden: 138.48, eff: '2025-03-31', ref: 'Cost declare 250331 row 17' },
  { dept: 'Printing-Digital RGOM', labor: 105.29, burden: 97.69, eff: '2025-03-31', ref: 'Cost declare 250331 row 18' },
  { dept: 'Assembly Digital RGOM', labor: 105.29, burden: 90.93, eff: '2025-03-31', ref: 'Cost declare 250331 row 19' },
  { dept: 'OQA-Digital', labor: 105.29, burden: 82.74, eff: '2025-03-31', ref: 'Cost declare 250331 row 20' }
]

// 2. BOM DATA: 16 Consolidated Net Material Items from Tab 1 Section '2.Material declare' (Rows 111-126)
const BOM_DATA = [
  { itemNo: 1, code: 'RMMAA2590', desc: 'CT75B/LUMIRROR 25T60 (0.525M x 500M/RL)', q: 0.027125, uom: 'SM', p0: 70.13217342857142, p1: 70.13217342857142, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 111' },
  { itemNo: 2, code: 'RMMBA1020', desc: 'DOTITE XA-3645', q: 0.212500, uom: 'GM', p0: 31.6956068, p1: 60.1000000, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 112 & Price List row 122' },
  { itemNo: 3, code: 'RMMBA760', desc: 'XC-3018 (1KG/CN)', q: 0.069400, uom: 'GM', p0: 1.7292561, p1: 1.7292561, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 113' },
  { itemNo: 4, code: 'RMMBA920', desc: 'PAF-27F', q: 0.074700, uom: 'GM', p0: 29.8917150, p1: 29.8917150, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 114' },
  { itemNo: 5, code: 'RMMCD01B', desc: 'P-THINNER', q: 0.002000, uom: 'GM', p0: 0.3092375, p1: 0.3092375, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 115' },
  { itemNo: 6, code: 'RMMCD140', desc: 'SOLVENT PAF-100', q: 0.003100, uom: 'GM', p0: 0.8395770, p1: 0.8395770, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 116' },
  { itemNo: 7, code: 'RMMCD200', desc: 'PTF-300 DILUENT', q: 0.055500, uom: 'GM', p0: 1.2136380, p1: 1.2136380, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 117 (Op 110+170)' },
  { itemNo: 8, code: 'RMMCD260', desc: 'DOTITE SC-0030', q: 0.003400, uom: 'GM', p0: 0.3141853, p1: 0.3141853, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 118' },
  { itemNo: 9, code: 'RMMBB630', desc: 'PTF-3201N', q: 1.152500, uom: 'GM', p0: 1.1949450, p1: 1.1949450, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 119 (Op 90+110+170)' },
  { itemNo: 10, code: 'RMMBB480', desc: 'PTF-3101N', q: 0.025000, uom: 'GM', p0: 1.0793700, p1: 1.0793700, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 120' },
  { itemNo: 11, code: 'RMMLAA2650', desc: 'TF100 100um', q: 0.001422, uom: 'SM', p0: 14.8357143, p1: 14.8357143, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 121' },
  { itemNo: 12, code: 'RMMLAA2630', desc: 'PET75-Y210(10)K (0.5Mx500M)', q: 0.025416666666666664, uom: 'SM', p0: 44.2200000, p1: 44.2200000, loss0: 0.30, loss1: 0.30, ref: 'Cost declare row 122' },
  { itemNo: 13, code: 'RMMLEE225', desc: 'BLANK LABEL B423 (9x8 mm)', q: 1.000000, uom: 'PC', p0: 0.1200000, p1: 0.1200000, loss0: 0.10, loss1: 0.10, ref: 'Cost declare row 123' },
  { itemNo: 14, code: 'RMMLAA2640', desc: 'PET White 75 Uncoated', q: 0.020625, uom: 'SM', p0: 43.2150000, p1: 43.2150000, loss0: 0.10, loss1: 0.10, ref: 'Cost declare row 124' },
  { itemNo: 15, code: 'RMMLRA340', desc: 'MAKE UP-A188-4X0.8L  (STAMPING INK)', q: 0.014035, uom: 'GM', p0: 2.437171875, p1: 2.437171875, loss0: 0.10, loss1: 0.10, ref: 'Cost declare row 125' },
  { itemNo: 16, code: 'RMMLRA360', desc: 'INK-MB175-4X0.8L INKJET 2D BARCODE  (NON-BOI)', q: 0.001780, uom: 'GM', p0: 9.80653125, p1: 9.80653125, loss0: 0.10, loss1: 0.10, ref: 'Cost declare row 126' }
]

// 3. EXACT 39-STEP ROUTING DATA (Source XXXX-024,025,026-01 Rows 28-81 - Department Names 100% Factory Match)
const ROUTING_STEPS = [
  // PRINTING Line (22 steps)
  { seq: 1, cat: 'PRINTING Line', name: 'Cutting', dept: 'Cutting', m: 1.0, cap0: 6180, cap1: 6180, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 28' },
  { seq: 2, cat: 'PRINTING Line', name: 'Annealing', dept: 'Cutting', m: 1.0, cap0: 2520, cap1: 2520, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 29' },
  { seq: 3, cat: 'PRINTING Line', name: 'Re-anneal#1', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 2340, cap1: 2340, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 30' },
  { seq: 4, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 31' },
  { seq: 5, cat: 'PRINTING Line', name: 'Printing-BAg', dept: 'Printing-Digital RGOM', m: 4.0, cap0: 1884, cap1: 1884, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 32' },
  { seq: 6, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 33' },
  { seq: 7, cat: 'PRINTING Line', name: 'Printing-BC', dept: 'Printing-Digital RGOM', m: 4.0, cap0: 1944, cap1: 1944, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 34' },
  { seq: 8, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 35' },
  { seq: 9, cat: 'PRINTING Line', name: 'Printing-BUR1', dept: 'Printing-Digital RGOM', m: 3.0, cap0: 1836, cap1: 1836, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 36' },
  { seq: 10, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 37' },
  { seq: 11, cat: 'PRINTING Line', name: 'Printing-BUR2', dept: 'Printing-Digital RGOM', m: 3.0, cap0: 2004, cap1: 2004, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 38' },
  { seq: 12, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 39' },
  { seq: 13, cat: 'PRINTING Line', name: 'Re-anneal#2', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 3420, cap1: 3420, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 40' },
  { seq: 14, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 41' },
  { seq: 15, cat: 'PRINTING Line', name: 'Printing-BAg.J', dept: 'Printing-Digital RGOM', m: 8.0, cap0: 1572, cap1: 1572, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 42' },
  { seq: 16, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 43' },
  { seq: 17, cat: 'PRINTING Line', name: 'Printing-BOR', dept: 'Printing-Digital RGOM', m: 2.0, cap0: 2040, cap1: 2040, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 44' },
  { seq: 18, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 45' },
  { seq: 19, cat: 'PRINTING Line', name: 'Re-anneal#3', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 3420, cap1: 3420, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 46' },
  { seq: 20, cat: 'PRINTING Line', name: 'Cleaning M/C(Back side)', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 6900, cap1: 6900, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 47' },
  { seq: 21, cat: 'PRINTING Line', name: 'Laminate Carrier film', dept: 'Printing-Digital RGOM', m: 8.0, cap0: 2640, cap1: 2640, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 48' },
  { seq: 22, cat: 'PRINTING Line', name: 'Re-anneal#4', dept: 'Printing-Digital RGOM', m: 1.0, cap0: 5040, cap1: 5040, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 49' },

  // Material Prep & Cutting (5 steps)
  { seq: 23, cat: 'Material Prep & Cutting', name: 'PET support: Cutting', dept: 'Cutting', m: 1.0, cap0: 14400, cap1: 14400, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 52' },
  { seq: 24, cat: 'Material Prep & Cutting', name: 'Packing sheet: Cutting', dept: 'Cutting', m: 1.0, cap0: 11200, cap1: 11200, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 54' },
  { seq: 25, cat: 'Material Prep & Cutting', name: 'Packing sheet: Half cut', dept: 'Assembly Digital RGOM', m: 0.5, cap0: 4800, cap1: 4800, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 55' },
  { seq: 26, cat: 'Material Prep & Cutting', name: 'Packing sheet: Blanking', dept: 'Assembly Digital RGOM', m: 1.0, cap0: 1894, cap1: 1894, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 56' },
  { seq: 27, cat: 'Material Prep & Cutting', name: 'Carrier Film: Cutting', dept: 'Cutting', m: 1.0, cap0: 8400, cap1: 8400, y0: 0.064506, y1: 0.064506, ref: 'Cost declare Row 58' },

  // Digital Assembly Line (9 steps)
  { seq: 28, cat: 'Digital Assembly Line', name: 'AI-Ins', dept: 'Assembly Digital RGOM', m: 4.0, cap0: 600, cap1: 600, y0: 0.74, y1: 0.60, ref: 'Cost declare Row 60 [Simulated Demo: Yield 60%]' },
  { seq: 29, cat: 'Digital Assembly Line', name: 'P-ins', dept: 'Assembly Digital RGOM', m: 2.0, cap0: 600, cap1: 600, y0: 0.84, y1: 0.84, ref: 'Cost declare Row 61' },
  { seq: 30, cat: 'Digital Assembly Line', name: 'VDO-ins I', dept: 'Assembly Digital RGOM', m: 4.0, cap0: 600, cap1: 600, y0: 0.84, y1: 0.84, ref: 'Cost declare Row 62' },
  { seq: 31, cat: 'Digital Assembly Line', name: 'Outline Blanking', dept: 'Assembly Digital RGOM', m: 1.0, cap0: 600, cap1: 600, y0: 0.84, y1: 0.84, ref: 'Cost declare Row 63' },
  { seq: 32, cat: 'Digital Assembly Line', name: 'Blanking-ins', dept: 'Assembly Digital RGOM', m: 1.0, cap0: 600, cap1: 600, y0: 0.90, y1: 0.90, ref: 'Cost declare Row 64' },
  { seq: 33, cat: 'Digital Assembly Line', name: 'E-ins I (Insulation)', dept: 'Assembly Digital RGOM', m: 2.0, cap0: 600, cap1: 600, y0: 0.90, y1: 0.90, ref: 'Cost declare Row 65' },
  { seq: 34, cat: 'Digital Assembly Line', name: 'E-ins II (Capacitive)', dept: 'Assembly Digital RGOM', m: 4.0, cap0: 600, cap1: 600, y0: 0.90, y1: 0.90, ref: 'Cost declare Row 66' },
  { seq: 35, cat: 'Digital Assembly Line', name: 'VDO-ins II (SN code & C peel off)', dept: 'Assembly Digital RGOM', m: 1.0, cap0: 600, cap1: 600, y0: 0.90, y1: 0.90, ref: 'Cost declare Row 67' },
  { seq: 36, cat: 'Digital Assembly Line', name: 'V-Ins', dept: 'Assembly Digital RGOM', m: 2.0, cap0: 600, cap1: 600, y0: 0.90, y1: 0.90, ref: 'Cost declare Row 68' },

  // Supporting Line (2 steps)
  { seq: 37, cat: 'Supporting Line', name: 'Support (Film puncher)', dept: 'Assembly Digital RGOM', m: 1.0, cap0: 480, cap1: 480, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 72' },
  { seq: 38, cat: 'Supporting Line', name: 'Support (Half cut)', dept: 'Assembly Digital RGOM', m: 0.5, cap0: 4800, cap1: 4800, y0: 1.00, y1: 1.00, ref: 'Cost declare Row 73' },

  // QA & Packing Line (1 step)
  { seq: 39, cat: 'QA & Packing Line', name: 'QA & Packing (VDO-Ins 1/2, QA Ins, Packing carton, Leader)', dept: 'OQA-Digital', m: 5.0, cap0: 560, cap1: 560, y0: 0.9975, y1: 0.9975, ref: 'Cost declare Rows 74-79' }
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
  
  ws1.mergeCells('A1:E1')
  const r1Title = ws1.getCell('A1')
  r1Title.value = 'PRODUCT INFO & WORK CENTER RATES'
  r1Title.font = fontTitle
  r1Title.alignment = { vertical: 'middle', horizontal: 'left' }

  ws1.mergeCells('A3:E3')
  const r3SecA = ws1.getCell('A3')
  r3SecA.value = 'PRODUCT INFO'
  r3SecA.font = fontSection
  r3SecA.alignment = { vertical: 'middle', horizontal: 'left' }

  const rProdH = ws1.addRow(['Product Name', 'Product Code', 'Description', 'UOM', 'Source Reference'])
  styleHeaderRow(rProdH, 5)
  rProdH.getCell(4).note = 'Unit of Measure'

  const prodRow = ws1.addRow(
    isTemplate
      ? [null, null, null, null, null]
      : ['RGOM-024-01', 'FMAO5RG024#1', 'MEMBRANE SWITCH', 'PC', 'Cost declare 250331']
  )
  for (let c = 1; c <= 5; c++) {
    const cell = prodRow.getCell(c)
    cell.fill = fillYellow
    cell.font = fontData
    cell.border = borderThin
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }

  ws1.addRow([]) // Row 6 blank

  ws1.mergeCells('A7:E7')
  const r7SecB = ws1.getCell('A7')
  r7SecB.value = 'WORK CENTER RATES'
  r7SecB.font = fontSection
  r7SecB.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRatesH = ws1.addRow([
    'Department',
    'Labor Rate (THB/MHr)',
    'Burden Rate (THB/MHr)',
    'Effective Date',
    'Source Reference'
  ])
  styleHeaderRow(rRatesH, 5)
  rRatesH.getCell(4).note = 'Effective start date of standard labor and burden rates (YYYY-MM-DD)'

  RATES_DATA.forEach((item) => {
    const row = ws1.addRow(
      isTemplate
        ? [null, null, null, null, null]
        : [item.dept, item.labor, item.burden, item.eff, item.ref]
    )
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c)
      cell.fill = fillYellow
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 2 || c === 3) cell.numFmt = '#,##0.00'
    }
  })

  ws1.columns = [
    { width: 32 }, // Department
    { width: 24 }, // Labor Rate
    { width: 24 }, // Burden Rate
    { width: 20 }, // Effective Date
    { width: 32 }  // Source Reference
  ]

  // =========================================================================
  // SHEET 2: 2_BOM_BREAKDOWN (16 NET MATERIAL ITEMS)
  // =========================================================================
  const ws2 = wb.addWorksheet('2_BOM_BREAKDOWN', { views: [{ showGridLines: true }] })
  
  ws2.mergeCells('A1:J1')
  const r1BomTitle = ws2.getCell('A1')
  r1BomTitle.value = 'DIRECT MATERIAL COST BREAKDOWN (BOM)'
  r1BomTitle.font = fontTitle
  r1BomTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  ws2.mergeCells('A3:J3')
  const r3BomSec1 = ws2.getCell('A3')
  r3BomSec1.value = 'BOM INPUT DATA'
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
    'Base Loss (%)',
    'Active Loss (%)',
    'Source Reference'
  ])
  styleHeaderRow(rBomInputH, 10)

  rBomInputH.getCell(5).note = 'Unit of Measure'

  let sumBaseMat = 0
  let sumActiveMat = 0
  let sumMPV = 0
  let sumMLV = 0
  let sumTotalMatVar = 0

  for (let i = 0; i < BOM_DATA.length; i++) {
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

      if (c === 4) cell.numFmt = '0.000000'
      else if (c === 6 || c === 7) cell.numFmt = '#,##0.0000'
      else if (c === 8 || c === 9) cell.numFmt = '0.00%'
    }
  }

  ws2.addRow([]) // Row 21 blank

  ws2.mergeCells('A22:H22')
  const r22BomSec2 = ws2.getCell('A22')
  r22BomSec2.value = 'BOM COST CALCULATION & VARIANCE'
  r22BomSec2.font = fontSection
  r22BomSec2.alignment = { vertical: 'middle', horizontal: 'left' }

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

  for (let i = 0; i < BOM_DATA.length; i++) {
    const inRow = 5 + i
    const outRow = 24 + i
    const item = BOM_DATA[i]

    const bCost = (item.q * item.p0) / (1 - item.loss0)
    const aCost = (item.q * item.p1) / (1 - item.loss1)
    const mpv = ((item.q * item.p1) / (1 - item.loss0)) - bCost
    const mlv = aCost - ((item.q * item.p1) / (1 - item.loss0))
    const totalVar = aCost - bCost

    sumBaseMat += bCost
    sumActiveMat += aCost
    sumMPV += mpv
    sumMLV += mlv
    sumTotalMatVar += totalVar

    const baseCostFormula = `IFERROR(IF(OR(D${inRow}="", F${inRow}="", H${inRow}="", H${inRow}>=1), "", (D${inRow}*F${inRow})/(1-H${inRow})), "")`
    const activeCostFormula = `IFERROR(IF(OR(D${inRow}="", G${inRow}="", I${inRow}="", I${inRow}>=1), "", (D${inRow}*G${inRow})/(1-I${inRow})), "")`
    const mpvFormula = `IFERROR(IF(OR(D${inRow}="", F${inRow}="", G${inRow}="", H${inRow}="", H${inRow}>=1, D${outRow}=""), "", ((D${inRow}*G${inRow})/(1-H${inRow}))-D${outRow}), "")`
    const mlvFormula = `IFERROR(IF(OR(D${inRow}="", G${inRow}="", H${inRow}="", I${inRow}="", H${inRow}>=1, I${inRow}>=1, E${outRow}=""), "", E${outRow}-((D${inRow}*G${inRow})/(1-H${inRow}))), "")`
    const totalVarFormula = `IFERROR(IF(OR(D${outRow}="", E${outRow}=""), "", E${outRow}-D${outRow}), "")`

    const row = ws2.addRow([
      { formula: `IFERROR(IF(A${inRow}="","",A${inRow}),"")`, result: isTemplate ? null : item.itemNo },
      { formula: `IFERROR(IF(B${inRow}="","",B${inRow}),"")`, result: isTemplate ? null : item.code },
      { formula: `IFERROR(IF(C${inRow}="","",C${inRow}),"")`, result: isTemplate ? null : item.desc },
      isTemplate ? { formula: baseCostFormula } : { formula: baseCostFormula, result: bCost },
      isTemplate ? { formula: activeCostFormula } : { formula: activeCostFormula, result: aCost },
      isTemplate ? { formula: mpvFormula } : { formula: mpvFormula, result: mpv },
      isTemplate ? { formula: mlvFormula } : { formula: mlvFormula, result: mlv },
      isTemplate ? { formula: totalVarFormula } : { formula: totalVarFormula, result: totalVar }
    ])

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c >= 4 && c <= 8) cell.numFmt = '#,##0.0000'
    }
  }

  // Row 40: Grand Total Row
  const fSumBaseMat = `IFERROR(IF(SUM(D24:D39)=0, "", SUM(D24:D39)), "")`
  const fSumActiveMat = `IFERROR(IF(SUM(E24:E39)=0, "", SUM(E24:E39)), "")`
  const fSumMPV = `IFERROR(IF(SUM(F24:F39)=0, "", SUM(F24:F39)), "")`
  const fSumMLV = `IFERROR(IF(SUM(G24:G39)=0, "", SUM(G24:G39)), "")`
  const fSumTotalMatVar = `IFERROR(IF(SUM(H24:H39)=0, "", SUM(H24:H39)), "")`

  const bomTotalRow = ws2.addRow([
    'Total', '', '',
    isTemplate ? { formula: fSumBaseMat } : { formula: fSumBaseMat, result: sumBaseMat },
    isTemplate ? { formula: fSumActiveMat } : { formula: fSumActiveMat, result: sumActiveMat },
    isTemplate ? { formula: fSumMPV } : { formula: fSumMPV, result: sumMPV },
    isTemplate ? { formula: fSumMLV } : { formula: fSumMLV, result: sumMLV },
    isTemplate ? { formula: fSumTotalMatVar } : { formula: fSumTotalMatVar, result: sumTotalMatVar }
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
    { width: 12 }, // Item No
    { width: 20 }, // Material Code
    { width: 44 }, // Material Description
    { width: 22 }, // Base Cost
    { width: 22 }, // Active Cost
    { width: 20 }, // Price Var
    { width: 20 }, // Loss Var
    { width: 22 }  // Total Mat Var
  ]

  // =========================================================================
  // SHEET 3: 3_ROUTING_BREAKDOWN (39 STEPS - PURE FACTORY DEPARTMENT MATCH)
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
    'Section',
    'Process Name',
    'Department',
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
      isTemplate ? null : step.dept,
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

  // Data Validation Dropdown for Department in Routing Input (D5:D43) - Dynamic link to Master Rates
  ws3.dataValidations.add('D5:D43', {
    type: 'list',
    allowBlank: true,
    formulae: ["'1_MASTER_RATES'!$A$9:$A$12"]
  })

  ws3.addRow([]) // Row 44 Blank row

  const calcSectionRow = ws3.addRow([]) // Row 45 Section Row
  const rCalcSecNum = calcSectionRow.number
  ws3.mergeCells(`A${rCalcSecNum}:P${rCalcSecNum}`)
  const rCalcSecCell = ws3.getCell(`A${rCalcSecNum}`)
  rCalcSecCell.value = 'CONVERSION COST CALCULATION & VARIANCE'
  rCalcSecCell.font = fontSection
  rCalcSecCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const rRtCalcH = ws3.addRow([ // Row 46 Table Header
    'Sequence',
    'Section',
    'Process Name',
    'Department',
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

  const deptRatesMap = {
    'Cutting': { labor: 105.29, burden: 138.48 },
    'Printing-Digital RGOM': { labor: 105.29, burden: 97.69 },
    'Assembly Digital RGOM': { labor: 105.29, burden: 90.93 },
    'OQA-Digital': { labor: 105.29, burden: 82.74 }
  }

  let sumBaseLaborAll = 0
  let sumActiveLaborAll = 0
  let sumBaseBurdenAll = 0
  let sumActiveBurdenAll = 0

  for (let i = 0; i < ROUTING_STEPS.length; i++) {
    const step = ROUTING_STEPS[i]
    const rIn = 5 + i
    const rOut = 47 + i

    const bRt = step.m / (step.cap0 * step.y0)
    const aRt = step.m / (step.cap1 * step.y1)
    const dRt = aRt - bRt
    const rate = deptRatesMap[step.dept] || { labor: 105.29, burden: 90.93 }
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

    const baseLaborFormula = `IFERROR(IF(OR(C${rIn}="", E${rOut}=""), "", E${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:E$12,2,FALSE),0)), "")`
    const activeLaborFormula = `IFERROR(IF(OR(C${rIn}="", F${rOut}=""), "", F${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:E$12,2,FALSE),0)), "")`
    const deltaLaborFormula = `IFERROR(IF(OR(C${rIn}="", H${rOut}="", I${rOut}=""), "", I${rOut}-H${rOut}), "")`

    const baseBurdenFormula = `IFERROR(IF(OR(C${rIn}="", E${rOut}=""), "", E${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:E$12,3,FALSE),0)), "")`
    const activeBurdenFormula = `IFERROR(IF(OR(C${rIn}="", F${rOut}=""), "", F${rOut}*IFERROR(VLOOKUP(D${rIn},'1_MASTER_RATES'!A$9:E$12,3,FALSE),0)), "")`
    const deltaBurdenFormula = `IFERROR(IF(OR(C${rIn}="", K${rOut}="", L${rOut}=""), "", L${rOut}-K${rOut}), "")`

    const baseProcessCostFormula = `IFERROR(IF(C${rIn}="","", H${rOut}+K${rOut}), "")`
    const activeProcessCostFormula = `IFERROR(IF(C${rIn}="","", I${rOut}+L${rOut}), "")`
    const processDeltaFormula = `IFERROR(IF(C${rIn}="","", O${rOut}-N${rOut}), "")`

    const row = ws3.addRow([
      { formula: `IFERROR(IF(A${rIn}="","",A${rIn}),"")`, result: isTemplate ? null : step.seq },
      { formula: `IFERROR(IF(B${rIn}="","",B${rIn}),"")`, result: isTemplate ? null : step.cat },
      { formula: `IFERROR(IF(C${rIn}="","",C${rIn}),"")`, result: isTemplate ? null : step.name },
      { formula: `IFERROR(IF(D${rIn}="","",D${rIn}),"")`, result: isTemplate ? null : step.dept },
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

  // Row 86: Flat Grand Total Row
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
    'Total', '', '', '', '', '', '',
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
    { width: 14 }, // Sequence
    { width: 32 }, // Section / Category
    { width: 64 }, // Process Name
    { width: 28 }, // Department
    { width: 24 }, // Base Runtime (MHr)
    { width: 24 }, // Active Runtime (MHr)
    { width: 22 }, // Δ Runtime (MHr)
    { width: 22 }, // Base Labor (THB)
    { width: 22 }, // Active Labor (THB)
    { width: 20 }, // Δ Labor (THB)
    { width: 22 }, // Base Burden (THB)
    { width: 22 }, // Active Burden (THB)
    { width: 20 }, // Δ Burden (THB)
    { width: 26 }, // Base Process Cost (THB)
    { width: 28 }, // Active Process Cost (THB)
    { width: 24 }  // Total Process Δ (THB)
  ]

  // =========================================================================
  // SHEET 5: _CALC_ENGINE (55 DYNAMIC CANDIDATES: 16 MAT + 39 ROUTING)
  const wsEngine = wb.addWorksheet('_CALC_ENGINE', { views: [{ showGridLines: true }] })
  wsEngine.mergeCells('A1:H1')
  const r1EngTitle = wsEngine.getCell('A1')
  r1EngTitle.value = 'DYNAMIC COST DRIVER RANKING & EVALUATION ENGINE'
  r1EngTitle.font = fontTitle
  r1EngTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  wsEngine.addRow([]) // Row 2 Blank

  const rEngH = wsEngine.addRow([ // Row 3 Table Header
    'ID',
    'Level 2 Category',
    'Level 3 Driver Name',
    'Level 4 RCA Parameter',
    'Base Parameter',
    'Active Parameter',
    'Cost Gap (THB / Unit)',
    'Tie-Breaker Score'
  ])
  styleHeaderRow(rEngH, 8)

  // 16 Material Candidates (Rows 4 to 19 in _CALC_ENGINE)
  for (let i = 0; i < BOM_DATA.length; i++) {
    const inR = 5 + i
    const calcR = 24 + i
    const rEng = 4 + i

    const catF = `IFERROR(IF('2_BOM_BREAKDOWN'!C${inR}="","","Direct Material"),"")`
    const driverF = `IFERROR(IF('2_BOM_BREAKDOWN'!C${inR}="","",'2_BOM_BREAKDOWN'!C${inR}),"")`
    const rcaF = `IFERROR(IF(OR('2_BOM_BREAKDOWN'!C${inR}="",""),"",IF('2_BOM_BREAKDOWN'!G${inR}>'2_BOM_BREAKDOWN'!F${inR},"Unit Price Inflation ("&TEXT('2_BOM_BREAKDOWN'!F${inR},"#,##0.00")&" ➔ "&TEXT('2_BOM_BREAKDOWN'!G${inR},"#,##0.00")&" THB)",IF('2_BOM_BREAKDOWN'!G${inR}<'2_BOM_BREAKDOWN'!F${inR},"Unit Price Reduction ("&TEXT('2_BOM_BREAKDOWN'!F${inR},"#,##0.00")&" ➔ "&TEXT('2_BOM_BREAKDOWN'!G${inR},"#,##0.00")&" THB)",IF('2_BOM_BREAKDOWN'!I${inR}>'2_BOM_BREAKDOWN'!H${inR},"Loss % Increase ("&TEXT('2_BOM_BREAKDOWN'!H${inR},"0.0%")&" ➔ "&TEXT('2_BOM_BREAKDOWN'!I${inR},"0.0%")&")",IF('2_BOM_BREAKDOWN'!I${inR}<'2_BOM_BREAKDOWN'!H${inR},"Loss % Reduction ("&TEXT('2_BOM_BREAKDOWN'!H${inR},"0.0%")&" ➔ "&TEXT('2_BOM_BREAKDOWN'!I${inR},"0.0%")&")",""))))),"")`
    const baseF = `IFERROR(IF(OR('2_BOM_BREAKDOWN'!C${inR}="",""),"",IF('2_BOM_BREAKDOWN'!G${inR}<>'2_BOM_BREAKDOWN'!F${inR},'2_BOM_BREAKDOWN'!F${inR},IF('2_BOM_BREAKDOWN'!I${inR}<>'2_BOM_BREAKDOWN'!H${inR},'2_BOM_BREAKDOWN'!H${inR},""))),"")`
    const activeF = `IFERROR(IF(OR('2_BOM_BREAKDOWN'!C${inR}="",""),"",IF('2_BOM_BREAKDOWN'!G${inR}<>'2_BOM_BREAKDOWN'!F${inR},'2_BOM_BREAKDOWN'!G${inR},IF('2_BOM_BREAKDOWN'!I${inR}<>'2_BOM_BREAKDOWN'!H${inR},'2_BOM_BREAKDOWN'!I${inR},""))),"")`
    const gapF = `IFERROR(IF(OR('2_BOM_BREAKDOWN'!C${inR}="",'2_BOM_BREAKDOWN'!H${calcR}=""),"",'2_BOM_BREAKDOWN'!H${calcR}),"")`
    const scoreF = `IFERROR(IF(OR(G${rEng}="",G${rEng}<=0), "", G${rEng}+(55-A${rEng})*0.00000001), "")`

    const row = wsEngine.addRow([
      i + 1,
      { formula: catF },
      { formula: driverF },
      { formula: rcaF },
      { formula: baseF },
      { formula: activeF },
      { formula: gapF },
      { formula: scoreF }
    ])

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 5 || c === 6) cell.numFmt = '#,##0.00'
      else if (c === 7) {
        cell.numFmt = '#,##0.0000'
        cell.font = fontDataBold
      } else if (c === 8) cell.numFmt = '0.00000000'
    }
  }

  // 39 Routing Candidates (Rows 20 to 58 in _CALC_ENGINE)
  for (let k = 0; k < ROUTING_STEPS.length; k++) {
    const inR = 5 + k
    const calcR = 47 + k
    const rEng = 20 + k // Starts at Row 20!

    const catF = `IFERROR(IF('3_ROUTING_BREAKDOWN'!B${inR}="","",'3_ROUTING_BREAKDOWN'!B${inR}),"")`
    const driverF = `IFERROR(IF('3_ROUTING_BREAKDOWN'!C${inR}="","",'3_ROUTING_BREAKDOWN'!C${inR}),"")`
    const rcaF = `IFERROR(IF(OR('3_ROUTING_BREAKDOWN'!C${inR}="",""),"",IF('3_ROUTING_BREAKDOWN'!I${inR}<'3_ROUTING_BREAKDOWN'!H${inR},"Yield Drop ("&TEXT('3_ROUTING_BREAKDOWN'!H${inR},"0.0%")&" ➔ "&TEXT('3_ROUTING_BREAKDOWN'!I${inR},"0.0%")&")",IF('3_ROUTING_BREAKDOWN'!I${inR}>'3_ROUTING_BREAKDOWN'!H${inR},"Yield Improvement ("&TEXT('3_ROUTING_BREAKDOWN'!H${inR},"0.0%")&" ➔ "&TEXT('3_ROUTING_BREAKDOWN'!I${inR},"0.0%")&")",IF('3_ROUTING_BREAKDOWN'!G${inR}<'3_ROUTING_BREAKDOWN'!F${inR},"Capacity Drop ("&TEXT('3_ROUTING_BREAKDOWN'!F${inR},"#,##0")&" ➔ "&TEXT('3_ROUTING_BREAKDOWN'!G${inR},"#,##0")&" Unit/hr)",IF('3_ROUTING_BREAKDOWN'!G${inR}>'3_ROUTING_BREAKDOWN'!F${inR},"Capacity Improvement ("&TEXT('3_ROUTING_BREAKDOWN'!F${inR},"#,##0")&" ➔ "&TEXT('3_ROUTING_BREAKDOWN'!G${inR},"#,##0")&" Unit/hr)",""))))),"")`
    const baseF = `IFERROR(IF(OR('3_ROUTING_BREAKDOWN'!C${inR}="",""),"",IF('3_ROUTING_BREAKDOWN'!I${inR}<>'3_ROUTING_BREAKDOWN'!H${inR},'3_ROUTING_BREAKDOWN'!H${inR},IF('3_ROUTING_BREAKDOWN'!G${inR}<>'3_ROUTING_BREAKDOWN'!F${inR},'3_ROUTING_BREAKDOWN'!F${inR},""))),"")`
    const activeF = `IFERROR(IF(OR('3_ROUTING_BREAKDOWN'!C${inR}="",""),"",IF('3_ROUTING_BREAKDOWN'!I${inR}<>'3_ROUTING_BREAKDOWN'!H${inR},'3_ROUTING_BREAKDOWN'!I${inR},IF('3_ROUTING_BREAKDOWN'!G${inR}<>'3_ROUTING_BREAKDOWN'!F${inR},'3_ROUTING_BREAKDOWN'!G${inR},""))),"")`
    const gapF = `IFERROR(IF(OR('3_ROUTING_BREAKDOWN'!C${inR}="",'3_ROUTING_BREAKDOWN'!P${calcR}=""),"",'3_ROUTING_BREAKDOWN'!P${calcR}),"")`
    const scoreF = `IFERROR(IF(OR(G${rEng}="",G${rEng}<=0), "", G${rEng}+(55-A${rEng})*0.00000001), "")`

    const row = wsEngine.addRow([
      17 + k,
      { formula: catF },
      { formula: driverF },
      { formula: rcaF },
      { formula: baseF },
      { formula: activeF },
      { formula: gapF },
      { formula: scoreF }
    ])

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c)
      cell.font = fontData
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (c === 5 || c === 6) cell.numFmt = '#,##0.00'
      else if (c === 7) {
        cell.numFmt = '#,##0.0000'
        cell.font = fontDataBold
      } else if (c === 8) cell.numFmt = '0.00000000'
    }
  }

  wsEngine.columns = [
    { width: 10 }, // ID
    { width: 28 }, // Level 2 Category
    { width: 56 }, // Level 3 Driver Name
    { width: 52 }, // Level 4 RCA Parameter
    { width: 20 }, // Base Parameter
    { width: 20 }, // Active Parameter
    { width: 26 }, // Cost Gap (THB / Unit)
    { width: 24 }  // Tie-Breaker Score
  ]

  // =========================================================================
  // SHEET 4: 4_SUMMARY_&_COMPARISON (STREAMLINED 10-COLUMN EXECUTIVE DASHBOARD)
  // =========================================================================
  const ws4 = wb.addWorksheet('4_SUMMARY_&_COMPARISON', { views: [{ showGridLines: true }] })
  
  ws4.mergeCells('A1:F1')
  const r1SumTitle = ws4.getCell('A1')
  r1SumTitle.value = 'COST SUMMARY & VARIANCE COMPARISON'
  r1SumTitle.font = fontTitle
  r1SumTitle.alignment = { vertical: 'middle', horizontal: 'left' }

  ws4.mergeCells('A3:F3')
  const r3SumSec1 = ws4.getCell('A3')
  r3SumSec1.value = 'REFERENCE STANDARD VS CURRENT STANDARD'
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
    { name: 'Material', bFormula: "'2_BOM_BREAKDOWN'!D40", aFormula: "'2_BOM_BREAKDOWN'!E40", bVal: sumBaseMat, aVal: sumActiveMat, lvl: 'Level 1' },
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
  r11SumSec2.value = 'TOP COST DRIVERS'
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
    'Action Plan'
  ])
  styleHeaderRow(rRankH, 10)

  rRankH.getCell(7).note = 'Cost variance generated by this driver'
  rRankH.getCell(8).note = 'Contribution to overall cost variance'
  rRankH.getCell(9).note = 'Controllable (Manufacturing) vs Uncontrollable (Purchasing Market)'

  for (let r = 1; r <= 10; r++) {
    const rIdx = 12 + r
    const rankNum = r

    const fScore = `LARGE(_CALC_ENGINE!H$4:H$58, ${rankNum})`
    const fMatchRow = `MATCH(${fScore}, _CALC_ENGINE!H$4:H$58, 0)`

    const fRank = `IFERROR(IF(${fScore}<=0, "", ${rankNum}), "")`
    const fCategory = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!B$4:B$58, ${fMatchRow})), "")`
    const fDriver = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!C$4:C$58, ${fMatchRow})), "")`
    const fRCA = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!D$4:D$58, ${fMatchRow})), "")`
    const fBaseP = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!E$4:E$58, ${fMatchRow})), "")`
    const fActP = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!F$4:F$58, ${fMatchRow})), "")`
    const fGap = `IFERROR(IF(${fScore}<=0, "", INDEX(_CALC_ENGINE!G$4:G$58, ${fMatchRow})), "")`
    const fPct = `IFERROR(IF(OR(${fScore}<=0, $D$8<=0, G${rIdx}=""), "", G${rIdx}/$D$8), "")`

    let ctrlVal = null
    let actionVal = null
    if (!isTemplate) {
      if (rankNum === 1) {
        ctrlVal = 'Uncontrollable'
        actionVal = 'Purchasing: Negotiate 6-Month Blanket Order volume rebate'
      } else if (rankNum === 2) {
        ctrlVal = 'Controllable'
        actionVal = 'IE / Production: Install Auto-Dispensing Alignment Jig'
      }
    }

    const row = ws4.addRow([
      { formula: fRank, result: (rankNum <= 2 && !isTemplate) ? rankNum : null },
      { formula: fCategory },
      { formula: fDriver },
      { formula: fRCA },
      { formula: fBaseP },
      { formula: fActP },
      { formula: fGap },
      { formula: fPct },
      ctrlVal,
      actionVal
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
      else if (c === 9) {
        cell.fill = fillYellow
      } else if (c === 10) {
        cell.fill = fillYellow
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      }
    }
  }

  // Data Validation Dropdown for Controllability Column (I13:I22)
  ws4.dataValidations.add('I13:I22', {
    type: 'list',
    allowBlank: true,
    formulae: ['"Controllable,Uncontrollable"']
  })

  ws4.columns = [
    { width: 12 }, // Rank
    { width: 28 }, // Level 2 Category
    { width: 64 }, // Level 3 Cost Driver
    { width: 52 }, // Level 4 RCA Parameter
    { width: 18 }, // Base Parameter
    { width: 18 }, // Active Parameter
    { width: 24 }, // Cost Gap (THB/Unit)
    { width: 18 }, // % Contribution
    { width: 20 }, // Controllability
    { width: 32 }  // Action Plan
  ]

  // =========================================================================
  // SAVE WORKBOOK
  // =========================================================================
  const outputDir = path.join(__dirname, '..', 'excel_models', 'v2_modular')
  const fileName = isTemplate ? 'CostModel_BLANK_TEMPLATE_v2.xlsx' : 'CostModel_RGOM-024_v2.xlsx'
  const filePath = path.join(outputDir, fileName)

  await wb.xlsx.writeFile(filePath)
  console.log(`[SUCCESS] Built ${isTemplate ? 'BLANK TEMPLATE' : 'POPULATED MODEL'} at: ${filePath}`)
}

async function main() {
  console.log('Building Excel Models V2 (Pure Literal Factory Source)...')
  await buildWorkbook(false) // Populated Reference Model
  await buildWorkbook(true)  // Pure Blank Template
  console.log('Build completed successfully!')
}

main().catch(console.error)
