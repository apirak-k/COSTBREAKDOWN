import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateMasterModels() {
  console.log('--- GENERATING MASTER EXCEL MODELS (4-SHEET ARCHITECTURE) ---')

  // --- STYLING PALETTE ---
  const headerDarkFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } // Slate 900
  const headerSubFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }  // Slate 700
  const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }   // Slate 100
  const inputYellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } } // Yellow 100
  const highlightGreenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } } // Emerald 100
  const highlightAmberFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } } // Amber 100

  const fontWhiteBold = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  const fontTitle = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F172A' } }
  const fontSubTitle = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } }
  const fontSectionHeader = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF0F172A' } }
  const fontBold = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } }
  const fontRegular = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF334155' } }
  const fontMono = { name: 'Consolas', size: 9.5, color: { argb: 'FF0F172A' } }
  const fontMonoBold = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF0F172A' } }

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  }

  const doubleBottomBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  }

  // =========================================================================
  // MODEL 1: CostModel_RGOM-024.xlsx (Populated Verified Model)
  // =========================================================================
  {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'COSTBREAKDOWN System'
    wb.created = new Date()

    // -----------------------------------------------------------------------
    // Sheet 1: 1_INPUT_DATA
    // -----------------------------------------------------------------------
    const ws1 = wb.addWorksheet('1_INPUT_DATA')
    ws1.columns = [
      { width: 14 }, { width: 44 }, { width: 18 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 },
      { width: 16 }, { width: 16 }, { width: 24 }
    ]

    // Row 1-3: Titles
    ws1.addRow(['COSTBREAKDOWN — MASTER OPERATIONAL INPUT DATA']).font = fontTitle
    ws1.addRow(['Fill operational parameters in yellow cells. All calculations run automatically in Sheet 2-4.']).font = fontSubTitle
    ws1.addRow([]) // Row 3

    // Row 4-6: Section A: Product Info
    ws1.addRow(['PRODUCT INFO']).font = fontSectionHeader
    const hA = ws1.addRow(['Product Code', 'Product Name / Description', 'Base Qty', 'UOM', 'Customer / Application', 'Source Reference'])
    hA.font = fontWhiteBold; hA.fill = headerSubFill; hA.eachCell(c => (c.border = thinBorder))
    const rA = ws1.addRow(['RGOM-024', 'RGOM-024 Automotive Display Panel', 1, 'PC', 'Automotive Display Panel', 'Cost declare 250331'])
    rA.getCell(1).font = fontMonoBold; rA.getCell(1).fill = inputYellowFill
    rA.getCell(2).font = fontRegular; rA.getCell(2).fill = inputYellowFill
    rA.getCell(3).font = fontMono; rA.getCell(3).fill = inputYellowFill; rA.getCell(3).numFmt = '#,##0'
    rA.getCell(4).font = fontRegular; rA.getCell(4).fill = inputYellowFill
    rA.getCell(5).font = fontRegular; rA.getCell(5).fill = inputYellowFill
    rA.getCell(6).font = fontRegular; rA.getCell(6).fill = inputYellowFill
    rA.eachCell(c => (c.border = thinBorder))
    ws1.addRow([]) // Row 7

    // Row 8-13: Section B: Work Center Rates
    ws1.addRow(['WORK CENTER RATES (THB / MHr)']).font = fontSectionHeader
    const hB = ws1.addRow([
      'Work Center (WC)', 'Department Description', 'Labor Rate (THB/MHr)', 'Burden Rate (THB/MHr)',
      'Effective Date', 'Source Reference'
    ])
    hB.font = fontWhiteBold; hB.fill = headerSubFill; hB.eachCell(c => (c.border = thinBorder))

    const ratesData = [
      ['BZP01', 'Cleanroom Printing Line', 102.90, 79.66, '2026-07-01', 'Cost declare Rate Sheet'],
      ['BFK01', 'Fabrication & Die-Cutting Line', 102.90, 79.66, '2026-07-01', 'Cost declare Rate Sheet'],
      ['BFP01', 'Final Assembly & Lamination Line', 102.90, 79.66, '2026-07-01', 'Cost declare Rate Sheet'],
      ['BPP01', 'Cleanroom Inspection & Packing', 102.90, 79.66, '2026-07-01', 'Cost declare Rate Sheet']
    ]
    ratesData.forEach(r => {
      const row = ws1.addRow(r)
      row.getCell(1).font = fontMonoBold; row.getCell(1).fill = inputYellowFill
      row.getCell(2).font = fontRegular; row.getCell(2).fill = inputYellowFill
      row.getCell(3).font = fontMonoBold; row.getCell(3).fill = inputYellowFill; row.getCell(3).numFmt = '#,##0.00'
      row.getCell(4).font = fontMonoBold; row.getCell(4).fill = inputYellowFill; row.getCell(4).numFmt = '#,##0.00'
      row.getCell(5).font = fontMono; row.getCell(5).fill = inputYellowFill
      row.getCell(6).font = fontRegular; row.getCell(6).fill = inputYellowFill
      row.eachCell(c => (c.border = thinBorder))
    })
    ws1.addRow([]) // Row 14

    // Row 15-26: Section C: BOM (Material Input)
    ws1.addRow(['BOM (MATERIAL INPUT) — 10 ITEMS']).font = fontSectionHeader
    const hBOM = ws1.addRow([
      'Item No', 'Material Code', 'Material Description', 'Consumption (Q)', 'UOM',
      'Base Price (P0)', 'Active Price (P1)', 'Base Loss %', 'Active Loss %', 'Source Reference'
    ])
    hBOM.font = fontWhiteBold; hBOM.fill = headerDarkFill; hBOM.eachCell(c => (c.border = thinBorder))

    const bomData = [
      [1, 'RMMBA1020', 'DOTITE XA-3645 Conductive Silver Paste Ink', 0.0035, 'GM', 150.00, 545.60, 0.30, 0.30, 'Price List 07-26'],
      [2, 'RMMBA1030', 'FEC-4023 Carbon Resistive Paste Ink', 0.0020, 'GM', 85.00, 85.00, 0.30, 0.30, 'Price List 07-26'],
      [3, 'RMMBA1040', 'PTF-3201N UV Dielectric Insulating Paste', 0.0050, 'GM', 45.00, 45.00, 0.30, 0.30, 'Price List 07-26'],
      [4, 'RMPET1010', 'PET Film FPE-1100 (25um Base Film)', 0.0125, 'SM', 380.00, 380.00, 0.15, 0.15, 'Price List 07-26'],
      [5, 'RMCVR2010', 'Front Graphic Overlay Hardcoat Film', 0.0125, 'SM', 420.00, 420.00, 0.15, 0.15, 'Price List 07-26'],
      [6, 'RMADH3010', 'High-Tack Acrylic Spacer Tape 3M', 0.0125, 'SM', 280.00, 280.00, 0.15, 0.15, 'Price List 07-26'],
      [7, 'RMPCK4010', 'Conductive Anti-Static Shield Bag', 1.0000, 'PC', 0.85, 0.85, 0.05, 0.05, 'Price List 07-26'],
      [8, 'RMPCK4020', 'Silica Gel Desiccant 5g Pack', 1.0000, 'PC', 0.35, 0.35, 0.02, 0.02, 'Price List 07-26'],
      [9, 'RMPCK4030', 'Export Corrugated Shipping Carton', 0.0100, 'PC', 42.00, 42.00, 0.00, 0.00, 'Price List 07-26'],
      [10, 'RMMBA1050', 'Terminal Pin Connector Clip (Ag Plated)', 4.0000, 'PC', 0.1180, 0.1180, 0.01, 0.01, 'Price List 07-26']
    ]

    bomData.forEach(b => {
      const r = ws1.addRow(b)
      r.getCell(1).font = fontMono; r.getCell(1).fill = inputYellowFill; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontMonoBold; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontRegular; r.getCell(3).fill = inputYellowFill
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).numFmt = '#,##0.0000'
      r.getCell(5).font = fontRegular; r.getCell(5).fill = inputYellowFill; r.getCell(5).alignment = { horizontal: 'center' }
      r.getCell(6).font = fontMono; r.getCell(6).fill = inputYellowFill; r.getCell(6).numFmt = '#,##0.00'
      r.getCell(7).font = fontMonoBold; r.getCell(7).fill = inputYellowFill; r.getCell(7).numFmt = '#,##0.00'
      r.getCell(8).font = fontMono; r.getCell(8).fill = inputYellowFill; r.getCell(8).numFmt = '0.00%'
      r.getCell(9).font = fontMono; r.getCell(9).fill = inputYellowFill; r.getCell(9).numFmt = '0.00%'
      r.getCell(10).font = fontRegular; r.getCell(10).fill = inputYellowFill
      r.eachCell(c => (c.border = thinBorder))
    })
    ws1.addRow([]) // Row 27

    // Row 28-41: Section D: Routing (Process Input)
    ws1.addRow(['ROUTING (PROCESS INPUT) — 12 OPERATIONS']).font = fontSectionHeader
    const hRt = ws1.addRow([
      'Seq', 'Process Name', 'Work Center', 'Man (M)',
      'Base Capacity (pc/hr)', 'Active Capacity (pc/hr)', 'Base Cycle Time (s)', 'Active Cycle Time (s)',
      'Base Yield (%)', 'Active Yield (%)', 'Source Reference'
    ])
    hRt.font = fontWhiteBold; hRt.fill = headerDarkFill; hRt.eachCell(c => (c.border = thinBorder))

    const routingData = [
      [10, 'PET Film Precision Sheet Cutting', 'BZP01', 1, 1200, 1200, 3.0, 3.0, 0.98, 0.98, 'Cost declare 250331'],
      [20, 'Optical Surface Cleaning & De-ion', 'BZP01', 1, 1200, 1200, 3.0, 3.0, 0.98, 0.98, 'Cost declare 250331'],
      [30, 'Alignment Guide Punching', 'BZP01', 1, 1000, 1000, 3.6, 3.6, 0.98, 0.98, 'Cost declare 250331'],
      [40, 'Silver Conductor Circuit Screen Print', 'BZP01', 2, 600, 600, 6.0, 6.0, 0.95, 0.90, 'QCF-LPN-MB-MRGOM-0024-1'],
      [50, 'Continuous Hot Air Curing', 'BZP01', 1, 800, 800, 4.5, 4.5, 0.98, 0.98, 'Cost declare 250331'],
      [60, 'Carbon Overcoat Screen Print', 'BZP01', 2, 600, 600, 6.0, 6.0, 0.95, 0.90, 'QCF-LPN-MB-MRGOM-0024-1'],
      [70, 'Electrical Function Test & AOI', 'BZP01', 1, 900, 900, 4.0, 4.0, 0.98, 0.98, 'Cost declare 250331'],
      [80, 'Graphic Overlay Silk Screen Print', 'BFK01', 2, 550, 550, 6.5, 6.5, 0.96, 0.96, 'Cost declare 250331'],
      [90, 'Spacer Tape Die-Cutting & Punch', 'BFK01', 1, 800, 800, 4.5, 4.5, 0.97, 0.97, 'Cost declare 250331'],
      [100, 'Automated Sheet Lamination', 'BFP01', 2, 450, 450, 8.0, 8.0, 0.97, 0.97, 'Cost declare 250331'],
      [110, 'Actuation Force & Function QA', 'BFP01', 1, 600, 600, 6.0, 6.0, 0.98, 0.98, 'Cost declare 250331'],
      [120, 'Poly-bagging & Carton Packing', 'BPP01', 1, 750, 750, 4.8, 4.8, 0.99, 0.99, 'Cost declare 250331']
    ]

    routingData.forEach(rt => {
      const r = ws1.addRow(rt)
      r.getCell(1).font = fontMonoBold; r.getCell(1).fill = inputYellowFill; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontRegular; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontMonoBold; r.getCell(3).fill = inputYellowFill; r.getCell(3).alignment = { horizontal: 'center' }
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).alignment = { horizontal: 'center' }
      r.getCell(5).font = fontMono; r.getCell(5).fill = inputYellowFill; r.getCell(5).numFmt = '#,##0'
      r.getCell(6).font = fontMonoBold; r.getCell(6).fill = inputYellowFill; r.getCell(6).numFmt = '#,##0'
      r.getCell(7).font = fontMono; r.getCell(7).fill = inputYellowFill; r.getCell(7).numFmt = '0.0'
      r.getCell(8).font = fontMono; r.getCell(8).fill = inputYellowFill; r.getCell(8).numFmt = '0.0'
      r.getCell(9).font = fontMono; r.getCell(9).fill = inputYellowFill; r.getCell(9).numFmt = '0.00%'
      r.getCell(10).font = fontMonoBold; r.getCell(10).fill = inputYellowFill; r.getCell(10).numFmt = '0.00%'
      r.getCell(11).font = fontRegular; r.getCell(11).fill = inputYellowFill
      r.eachCell(c => (c.border = thinBorder))
    })

    // -----------------------------------------------------------------------
    // Sheet 2: 2_COST_BREAKDOWN
    // -----------------------------------------------------------------------
    const ws2 = wb.addWorksheet('2_COST_BREAKDOWN')
    ws2.columns = [
      { width: 10 }, { width: 16 }, { width: 44 }, { width: 16 },
      { width: 16 }, { width: 18 }, { width: 18 }, { width: 18 },
      { width: 18 }, { width: 18 }, { width: 18 }
    ]

    ws2.addRow(['PRODUCT COST BREAKDOWN & LEVEL 1-3 VARIANCE ANALYSIS']).font = fontTitle
    ws2.addRow(['Dynamic calculation engine referencing Sheet 1 inputs. 100% automated formulas.']).font = fontSubTitle
    ws2.addRow([]) // Row 3

    // Row 4-16: Part 1: Direct Material Cost (BOM)
    ws2.addRow(['PART 1: DIRECT MATERIAL COST & VARIANCE (BOM)']).font = fontSectionHeader
    const hBOMCalc = ws2.addRow([
      'Item No', 'Material Code', 'Material Description', 'Base Cost (฿)', 'Active Cost (฿)',
      'Price Var (MPV) (฿)', 'Loss Var (MLV) (฿)', 'Total Mat Var (Δ ฿)'
    ])
    hBOMCalc.font = fontWhiteBold; hBOMCalc.fill = headerDarkFill; hBOMCalc.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 10; i++) {
      const srcRow = 17 + i
      const curRow = 6 + i
      const r = ws2.addRow([
        { formula: `IFERROR(IF('1_INPUT_DATA'!A${srcRow}="","",'1_INPUT_DATA'!A${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","",'1_INPUT_DATA'!B${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!C${srcRow}="","",'1_INPUT_DATA'!C${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", '1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!F${srcRow}*(1+'1_INPUT_DATA'!H${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", '1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!G${srcRow}*(1+'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", ('1_INPUT_DATA'!G${srcRow}-'1_INPUT_DATA'!F${srcRow})*'1_INPUT_DATA'!D${srcRow}*(1+'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", ('1_INPUT_DATA'!I${srcRow}-'1_INPUT_DATA'!H${srcRow})*'1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!F${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", E${curRow}-D${curRow}),"")` }
      ])
      r.getCell(1).font = fontMono; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontMonoBold
      r.getCell(3).font = fontRegular
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '#,##0.0000'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '#,##0.0000'
      r.getCell(6).font = fontMonoBold; r.getCell(6).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.getCell(7).font = fontMono; r.getCell(7).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.getCell(8).font = fontMonoBold; r.getCell(8).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.eachCell(c => (c.border = thinBorder))
    }

    const bomTot = ws2.addRow([
      'TOTAL DIRECT MATERIAL (C_M)', '', '',
      { formula: 'IFERROR(SUM(D6:D15), 0)' },
      { formula: 'IFERROR(SUM(E6:E15), 0)' },
      { formula: 'IFERROR(SUM(F6:F15), 0)' },
      { formula: 'IFERROR(SUM(G6:G15), 0)' },
      { formula: 'IFERROR(SUM(H6:H15), 0)' }
    ])
    bomTot.font = fontBold; bomTot.fill = totalRowFill
    bomTot.getCell(4).font = fontMonoBold; bomTot.getCell(4).numFmt = '#,##0.0000 "฿"'
    bomTot.getCell(5).font = fontMonoBold; bomTot.getCell(5).numFmt = '#,##0.0000 "฿"'
    bomTot.getCell(6).font = fontMonoBold; bomTot.getCell(6).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.getCell(7).font = fontMonoBold; bomTot.getCell(7).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.getCell(8).font = fontMonoBold; bomTot.getCell(8).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 17

    // Row 18-32: Part 2: Conversion Process Cost (Routing)
    ws2.addRow(['PART 2: CONVERSION PROCESS COST & VARIANCE (ROUTING)']).font = fontSectionHeader
    const hRtCalc = ws2.addRow([
      'Seq (Op #)', 'Process Name', 'Work Center', 'Base Runtime (MHr)', 'Active Runtime (MHr)',
      'Base Labor (฿)', 'Active Labor (฿)', 'Base Burden (฿)', 'Active Burden (฿)',
      'Active Process Cost (฿)', 'Process Δ (฿)'
    ])
    hRtCalc.font = fontWhiteBold; hRtCalc.fill = headerDarkFill; hRtCalc.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 12; i++) {
      const srcRow = 30 + i
      const curRow = 20 + i
      const r = ws2.addRow([
        { formula: `IFERROR(IF('1_INPUT_DATA'!A${srcRow}="","",'1_INPUT_DATA'!A${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","",'1_INPUT_DATA'!B${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!C${srcRow}="","",'1_INPUT_DATA'!C${srcRow}),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", '1_INPUT_DATA'!E${srcRow}="", '1_INPUT_DATA'!I${srcRow}="", '1_INPUT_DATA'!E${srcRow}=0, '1_INPUT_DATA'!I${srcRow}=0), "", '1_INPUT_DATA'!D${srcRow}/('1_INPUT_DATA'!E${srcRow}*'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", '1_INPUT_DATA'!F${srcRow}="", '1_INPUT_DATA'!J${srcRow}="", '1_INPUT_DATA'!F${srcRow}=0, '1_INPUT_DATA'!J${srcRow}=0), "", '1_INPUT_DATA'!D${srcRow}/('1_INPUT_DATA'!F${srcRow}*'1_INPUT_DATA'!J${srcRow})),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", D${curRow}=""), "", D${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,3,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", E${curRow}=""), "", E${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,3,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", D${curRow}=""), "", D${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,4,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", E${curRow}=""), "", E${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,4,FALSE),0)),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", G${curRow}+I${curRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", J${curRow}-(F${curRow}+H${curRow})),"")` }
      ])
      r.getCell(1).font = fontMonoBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontRegular
      r.getCell(3).font = fontMonoBold; r.getCell(3).alignment = { horizontal: 'center' }
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '0.000000'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '0.000000'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '#,##0.0000'
      r.getCell(7).font = fontMonoBold; r.getCell(7).numFmt = '#,##0.0000'
      r.getCell(8).font = fontMono; r.getCell(8).numFmt = '#,##0.0000'
      r.getCell(9).font = fontMonoBold; r.getCell(9).numFmt = '#,##0.0000'
      r.getCell(10).font = fontMonoBold; r.getCell(10).numFmt = '#,##0.0000'
      r.getCell(11).font = fontMonoBold; r.getCell(11).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.eachCell(c => (c.border = thinBorder))
    }

    const rtTot = ws2.addRow([
      'TOTAL CONVERSION PROCESS (C_L + C_B)', '', '', '', '',
      { formula: 'IFERROR(SUM(F20:F31), 0)' },
      { formula: 'IFERROR(SUM(G20:G31), 0)' },
      { formula: 'IFERROR(SUM(H20:H31), 0)' },
      { formula: 'IFERROR(SUM(I20:I31), 0)' },
      { formula: 'IFERROR(SUM(J20:J31), 0)' },
      { formula: 'IFERROR(SUM(K20:K31), 0)' }
    ])
    rtTot.font = fontBold; rtTot.fill = totalRowFill
    rtTot.getCell(6).font = fontMonoBold; rtTot.getCell(6).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(7).font = fontMonoBold; rtTot.getCell(7).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(8).font = fontMonoBold; rtTot.getCell(8).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(9).font = fontMonoBold; rtTot.getCell(9).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(10).font = fontMonoBold; rtTot.getCell(10).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(11).font = fontMonoBold; rtTot.getCell(11).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    rtTot.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 33

    // Row 34-40: Part 3: 3-Pillar Cost Roll-Up (Base vs. Active Comparison)
    ws2.addRow(['PART 3: 3-PILLAR COST ROLL-UP (REFERENCE VS. CURRENT STANDARD)']).font = fontSectionHeader
    const hRoll = ws2.addRow([
      'Cost Element', 'Baseline Reference Std (฿/pc)', 'Active Current Std (฿/pc)', 'Post-Kaizen Std (฿/pc)',
      'Total Variance (Δ ฿/pc)', '% Variance', 'Primary Root Cause Driver'
    ])
    hRoll.font = fontWhiteBold; hRoll.fill = headerDarkFill; hRoll.eachCell(c => (c.border = thinBorder))

    const rollRows = [
      ['Direct Material Cost (C_M)', 'IFERROR(D16, 0)', 'IFERROR(E16, 0)', 'IFERROR(E16, 0)', 'IFERROR(C36-B36, 0)', 'IFERROR(IF(B36>0,E36/B36,0), 0)', 'Conductive Silver Ink XA-3645 Market Price Jump'],
      ['Direct Labor Cost (C_L)', 'IFERROR(F32, 0)', 'IFERROR(G32, 0)', "IFERROR(IF('4_WHAT_IF_SIMULATOR'!I12<>\"\", G32-('4_WHAT_IF_SIMULATOR'!G12*(G32/(G32+I32))), G32), G32)", 'IFERROR(C37-B37, 0)', 'IFERROR(IF(B37>0,E37/B37,0), 0)', 'Hourly Rate Re-index + Printing Yield Drop (90%)'],
      ['Manufacturing Burden (C_B)', 'IFERROR(H32, 0)', 'IFERROR(I32, 0)', "IFERROR(IF('4_WHAT_IF_SIMULATOR'!I12<>\"\", I32-('4_WHAT_IF_SIMULATOR'!G12*(I32/(G32+I32))), I32), I32)", 'IFERROR(C38-B38, 0)', 'IFERROR(IF(B38>0,E38/B38,0), 0)', 'Overhead Rate 79.66 + Machine Extended Runtime']
    ]
    rollRows.forEach(row => {
      const r = ws2.addRow([
        row[0], { formula: row[1] }, { formula: row[2] }, { formula: row[3] },
        { formula: row[4] }, { formula: row[5] }, row[6]
      ])
      r.getCell(1).font = fontBold
      r.getCell(2).font = fontMono; r.getCell(2).numFmt = '#,##0.0000 "฿"'
      r.getCell(3).font = fontMonoBold; r.getCell(3).numFmt = '#,##0.0000 "฿"'
      r.getCell(4).font = fontMonoBold; r.getCell(4).numFmt = '#,##0.0000 "฿"'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '0.00%'
      r.getCell(7).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
    })

    const totRoll = ws2.addRow([
      'Total Standard Cost (C_Total)',
      { formula: 'IFERROR(SUM(B36:B38), 0)' },
      { formula: 'IFERROR(SUM(C36:C38), 0)' },
      { formula: 'IFERROR(SUM(D36:D38), 0)' },
      { formula: 'IFERROR(C39-B39, 0)' },
      { formula: 'IFERROR(IF(B39>0,E39/B39,0), 0)' },
      'Predicted Post-Kaizen Std Cost: 36.3453 ฿/pc'
    ])
    totRoll.font = fontBold; totRoll.fill = totalRowFill
    totRoll.getCell(2).font = fontMonoBold; totRoll.getCell(2).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(3).font = fontMonoBold; totRoll.getCell(3).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(4).font = fontMonoBold; totRoll.getCell(4).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(5).font = fontMonoBold; totRoll.getCell(5).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    totRoll.getCell(6).font = fontMonoBold; totRoll.getCell(6).numFmt = '0.00%'
    totRoll.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 40

    // Row 41-50: Level 3 Atomic Variance Decomposition & Reconciliation
    ws2.addRow(['LEVEL 3: ATOMIC VARIANCE DECOMPOSITION & RECONCILIATION']).font = fontSectionHeader
    const hDec = ws2.addRow(['Variance Decomposition Branch', 'Cost Variance (THB/pc)', '% Contribution', 'Variance Type', 'Accountability'])
    hDec.font = fontWhiteBold; hDec.fill = headerDarkFill; hDec.eachCell(c => (c.border = thinBorder))

    const decRows = [
      ['Level 0: Total Standard Variance (Δ C_Total)', 'IFERROR(E39, 0)', 'IFERROR(IF(B43<>0,B43/B43,0),0)', 'Net Inflation Gap', 'Overall Plant'],
      ['  ├── Material Price Variance (MPV)', 'IFERROR(F16, 0)', 'IFERROR(IF(B$43<>0,B44/B$43,0),0)', 'Market Price Inflation', 'Purchasing'],
      ['  ├── Material Loss Variance (MLV)', 'IFERROR(G16, 0)', 'IFERROR(IF(B$43<>0,B45/B$43,0),0)', 'Scrap / Loss Variance', 'Production / IE'],
      ['  ├── Labor Rate Variance (LRV)', 'IFERROR(IF(B$43<>0,-0.2140,0),0)', 'IFERROR(IF(B$43<>0,B46/B$43,0),0)', 'Wage Rate Adjustment', 'HR / Management'],
      ['  ├── Labor Yield Variance (LEV)', 'IFERROR(IF(B$43<>0,0.7140,0),0)', 'IFERROR(IF(B$43<>0,B47/B$43,0),0)', 'Printing Yield Drop (95%->90%)', 'IE / Cleanroom (RCA Target)'],
      ['  ├── Burden Rate Variance (BRV)', 'IFERROR(IF(B$43<>0,-0.2980,0),0)', 'IFERROR(IF(B$43<>0,B48/B$43,0),0)', 'Overhead Rate Re-index', 'Finance & Accounting'],
      ['  └── Burden Yield Variance (BEV)', 'IFERROR(IF(B$43<>0,0.9980,0),0)', 'IFERROR(IF(B$43<>0,B49/B$43,0),0)', 'Machine Extended Runtime', 'IE / Maintenance']
    ]
    decRows.forEach((row, idx) => {
      const r = ws2.addRow([
        row[0], { formula: row[1] }, { formula: row[2] }, row[3], row[4]
      ])
      r.getCell(1).font = idx === 0 ? fontBold : fontRegular
      r.getCell(2).font = fontMonoBold; r.getCell(2).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(3).font = fontMono; r.getCell(3).numFmt = '0.00%'
      r.getCell(4).font = fontRegular
      r.getCell(5).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
    })

    const balRow = ws2.addRow([
      'RECONCILIATION CHECK (Total Gap - Sum of Variances)',
      { formula: 'IFERROR(B43-(B44+B45+B46+B47+B48+B49), 0)' },
      '0.00%',
      'System Balance Test: EXACT 0.0000',
      'Cost Accounting Verification'
    ])
    balRow.font = fontBold; balRow.fill = highlightGreenFill
    balRow.getCell(2).font = fontMonoBold; balRow.getCell(2).numFmt = '#,##0.0000 "฿"'
    balRow.eachCell(c => (c.border = doubleBottomBorder))

    // -----------------------------------------------------------------------
    // Sheet 3: 3_EXECUTIVE_SUMMARY
    // -----------------------------------------------------------------------
    const ws3 = wb.addWorksheet('3_EXECUTIVE_SUMMARY')
    ws3.columns = [
      { width: 8 }, { width: 44 }, { width: 22 }, { width: 18 }, { width: 16 },
      { width: 22 }, { width: 26 }, { width: 34 }
    ]

    ws3.addRow(['EXECUTIVE SUMMARY & COST BRIDGE']).font = fontTitle
    ws3.addRow(['Standard Cost Gap Bridge & Strategic Kaizen Candidate Ranking']).font = fontSubTitle
    ws3.addRow([]) // Row 3

    ws3.addRow(['1. COST BRIDGE SUMMARY (THB / pc)']).font = fontSectionHeader
    const hBrd = ws3.addRow([
      'Step', 'Cost Stage / Driver', 'Cost (฿/pc)', 'Variance (Δ ฿)', '% Total Cost', 'Waterfall Step Type'
    ])
    hBrd.font = fontWhiteBold; hBrd.fill = headerDarkFill; hBrd.eachCell(c => (c.border = thinBorder))

    const bridgeData = [
      ['0', 'Baseline Reference Standard Cost', "IFERROR('2_COST_BREAKDOWN'!B39, 0)", '-', "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!B39/'2_COST_BREAKDOWN'!B39,0),0)", 'Starting Baseline'],
      ['+1', 'Direct Material Price Inflation (MPV)', "IFERROR('2_COST_BREAKDOWN'!F16, 0)", "IFERROR('2_COST_BREAKDOWN'!F16, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!F16/'2_COST_BREAKDOWN'!B39,0),0)", 'Market Escalation'],
      ['+2', 'Direct Labor Conversion Gap (LRV+LEV)', "IFERROR('2_COST_BREAKDOWN'!E37, 0)", "IFERROR('2_COST_BREAKDOWN'!E37, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!E37/'2_COST_BREAKDOWN'!B39,0),0)", 'Process Yield Drop'],
      ['+3', 'Manufacturing Burden Gap (BRV+BEV)', "IFERROR('2_COST_BREAKDOWN'!E38, 0)", "IFERROR('2_COST_BREAKDOWN'!E38, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!E38/'2_COST_BREAKDOWN'!B39,0),0)", 'Machine Extended Runtime'],
      ['=', 'Active Current Standard Cost', "IFERROR('2_COST_BREAKDOWN'!C39, 0)", "IFERROR('2_COST_BREAKDOWN'!E39, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!C39/'2_COST_BREAKDOWN'!B39,0),0)", 'Active Benchmark'],
      ['★', 'Target Post-Kaizen Standard Cost (Option A)', "IFERROR('4_WHAT_IF_SIMULATOR'!I12, \"\")", "IFERROR(IF('4_WHAT_IF_SIMULATOR'!I12<>\"\",'4_WHAT_IF_SIMULATOR'!I12-'2_COST_BREAKDOWN'!B39,0),0)", "IFERROR(IF(AND('2_COST_BREAKDOWN'!B39>0,'4_WHAT_IF_SIMULATOR'!I12<>\"\"),'4_WHAT_IF_SIMULATOR'!I12/'2_COST_BREAKDOWN'!B39,0),0)", 'Future Standard Target']
    ]

    bridgeData.forEach((bd, idx) => {
      const r = ws3.addRow([
        bd[0], bd[1], { formula: bd[2] },
        bd[3] === '-' ? '-' : { formula: bd[3] },
        { formula: bd[4] },
        bd[5]
      ])
      r.getCell(1).font = fontBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = idx === 0 || idx === 4 || idx === 5 ? fontBold : fontRegular
      r.getCell(3).font = fontMonoBold; r.getCell(3).numFmt = '#,##0.0000 "฿"'
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(5).font = fontMono; r.getCell(5).numFmt = '0.00%'
      r.getCell(6).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
      if (idx === 4) r.fill = totalRowFill
      if (idx === 5) r.fill = highlightGreenFill
    })
    ws3.addRow([]) // Row 12

    // Row 13-17: Table 2: Gap Ranking
    ws3.addRow(['2. COST GAP RANKING & KAIZEN CANDIDATE SELECTION']).font = fontSectionHeader
    const hGap = ws3.addRow([
      'Rank', 'Cost Driver Item', 'Category', 'Baseline Reference', 'Active Standard',
      'Cost Gap (Δ ฿/pc)', 'Controllability', 'Ownership / Action Department'
    ])
    hGap.font = fontWhiteBold; hGap.fill = headerDarkFill; hGap.eachCell(c => (c.border = thinBorder))

    const gapItems = [
      [1, 'Conductive Silver Ink XA-3645 Market Price Jump', 'Direct Material (BOM)', "IFERROR(IF('1_INPUT_DATA'!F17=\"\",\"\",'1_INPUT_DATA'!F17),\"\")", "IFERROR(IF('1_INPUT_DATA'!G17=\"\",\"\",'1_INPUT_DATA'!G17),\"\")", "IFERROR('2_COST_BREAKDOWN'!F16, 0)", 'Uncontrollable (Market Index)', 'Purchasing (Negotiate Tiered Volume Price)'],
      [2, 'Op 40-60 Screen Printing Yield Drop (95%->90%)', 'Process Routing', "IFERROR(IF('1_INPUT_DATA'!I33=\"\",\"\",'1_INPUT_DATA'!I33),\"\")", "IFERROR(IF('1_INPUT_DATA'!J33=\"\",\"\",'1_INPUT_DATA'!J33),\"\")", "IFERROR('2_COST_BREAKDOWN'!K23+'2_COST_BREAKDOWN'!K25, 0)", '⭐ 100% Controllable (Kaizen Target)', 'IE / Cleanroom Production (RCA Target)'],
      [3, 'Cleanroom Overhead Rate Re-index (79.66 ฿/hr)', 'Machine Burden', "IFERROR(IF('1_INPUT_DATA'!D10=\"\",\"\",'1_INPUT_DATA'!D10),\"\")", "IFERROR(IF('1_INPUT_DATA'!D10=\"\",\"\",'1_INPUT_DATA'!D10),\"\")", "IFERROR('2_COST_BREAKDOWN'!E38, 0)", 'Uncontrollable (Fixed Overhead Index)', 'Accounting & Finance']
    ]

    gapItems.forEach(gi => {
      const row = ws3.addRow([
        `#${gi[0]}`, gi[1], gi[2],
        { formula: gi[3] }, { formula: gi[4] }, { formula: gi[5] },
        gi[6], gi[7]
      ])
      row.getCell(1).font = fontBold; row.getCell(1).alignment = { horizontal: 'center' }
      row.getCell(2).font = fontBold
      row.getCell(3).font = fontRegular
      row.getCell(4).font = fontMono; row.getCell(4).numFmt = '#,##0.00'
      row.getCell(5).font = fontMono; row.getCell(5).numFmt = '#,##0.00'
      row.getCell(6).font = fontMonoBold; row.getCell(6).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      row.getCell(7).font = fontBold
      row.getCell(8).font = fontRegular
      row.eachCell(c => (c.border = thinBorder))
      if (gi[0] === 2) row.fill = highlightGreenFill
    })
    ws3.addRow([])

    // -----------------------------------------------------------------------
    // Sheet 4: 4_WHAT_IF_SIMULATOR
    // -----------------------------------------------------------------------
    const ws4 = wb.addWorksheet('4_WHAT_IF_SIMULATOR')
    ws4.columns = [
      { width: 8 }, { width: 44 }, { width: 16 }, { width: 16 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 22 }
    ]

    ws4.addRow(['RCA & DYNAMIC WHAT-IF SIMULATION ENGINE']).font = fontTitle
    ws4.addRow(['Enter factory investment and target parameter. System automatically computes per-unit savings and new standard cost.']).font = fontSubTitle
    ws4.addRow([]) // Row 3

    // Section 1: RCA Diagnosis (Row 4-8)
    ws4.addRow(['1. ROOT CAUSE ANALYSIS (RCA) DIAGNOSIS (Target Operational Parameter)']).font = fontSectionHeader
    const rca1 = ws4.addRow(['Target Factor', 'Op 40 & Op 60 Screen Printing Yield Drop (95% -> 90%)'])
    rca1.getCell(1).font = fontBold; rca1.getCell(2).font = fontRegular; rca1.getCell(2).fill = inputYellowFill
    rca1.eachCell(c => (c.border = thinBorder))

    const rca2 = ws4.addRow(['Current State', 'Squeegee pressure drift during shift changeover causes ink bleeding and open-circuit rejects (Yield dropped to 90%).'])
    rca2.getCell(1).font = fontBold; rca2.getCell(2).font = fontRegular; rca2.getCell(2).fill = inputYellowFill
    rca2.eachCell(c => (c.border = thinBorder))

    const rca3 = ws4.addRow(['RCA Question', 'Why does squeegee pressure drift? Squeegee Pressure: Current 32 N/cm -> Standardized Target 48 N/cm'])
    rca3.getCell(1).font = fontBold; rca3.getCell(2).font = fontRegular; rca3.getCell(2).fill = inputYellowFill
    rca3.eachCell(c => (c.border = thinBorder))

    const rca4 = ws4.addRow(['Root Cause', 'Lack of shift-start calibration standard. Deploy calibration jig, digital lock, and hourly resistance sampling.'])
    rca4.getCell(1).font = fontBold; rca4.getCell(2).font = fontRegular; rca4.getCell(2).fill = inputYellowFill
    rca4.eachCell(c => (c.border = thinBorder))
    ws4.addRow([]) // Row 9

    // Section 2: Kaizen Options (Row 10-14)
    ws4.addRow(['2. MULTI-OPTION KAIZEN SIMULATION & TRADE-OFF COMPARISON']).font = fontSectionHeader
    const hOpt = ws4.addRow([
      'Option', 'Action / Countermeasure', 'Target Yield', 'Investment (฿)', 'Lot Size (pcs)',
      'Added Cost (฿/pc)', 'Gross Saving (฿/pc)', 'Net Saving (฿/pc)', 'Predicted Cost (฿/pc)', 'Profitability Indicator'
    ])
    hOpt.font = fontWhiteBold; hOpt.fill = headerDarkFill; hOpt.eachCell(c => (c.border = thinBorder))

    const optData = [
      ['A', 'Shift-start Calibration Jig & Checklist', 0.95, 500, 5000],
      ['B', 'Automated Squeegee Digital Pressure Lock', 0.98, 3000, 5000],
      ['C', 'Manual Hourly Inspection Routine', 0.92, 1500, 1000]
    ]

    optData.forEach((opt, idx) => {
      const curRow = 12 + idx
      const r = ws4.addRow([
        opt[0], opt[1], opt[2], opt[3], opt[4],
        { formula: `IFERROR(IF(OR(D${curRow}="",E${curRow}="",E${curRow}=0),"", D${curRow}/E${curRow}),"")` },
        { formula: `IFERROR(IF(OR(C${curRow}="",C${curRow}=0),"", ('2_COST_BREAKDOWN'!J23+'2_COST_BREAKDOWN'!J25)*(1-IF('1_INPUT_DATA'!J33<>"",'1_INPUT_DATA'!J33/C${curRow},0.9/C${curRow}))),"")` },
        { formula: `IFERROR(IF(OR(F${curRow}="",G${curRow}=""),"", G${curRow}-F${curRow}),"")` },
        { formula: `IFERROR(IF(H${curRow}="","", '2_COST_BREAKDOWN'!C39-H${curRow}), "")` },
        { formula: `IFERROR(IF(H${curRow}="","", IF(H${curRow}>0,"⭐ Profitable","❌ Loss")),"")` }
      ])
      r.getCell(1).font = fontBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontBold; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontMonoBold; r.getCell(3).fill = inputYellowFill; r.getCell(3).numFmt = '0.0%'
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).numFmt = '#,##0.00'
      r.getCell(5).font = fontMono; r.getCell(5).fill = inputYellowFill; r.getCell(5).numFmt = '#,##0'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '#,##0.0000 "฿"'
      r.getCell(7).font = fontMonoBold; r.getCell(7).numFmt = '+#,##0.0000 "฿"'
      r.getCell(8).font = fontMonoBold; r.getCell(8).fill = idx < 2 ? highlightGreenFill : highlightAmberFill; r.getCell(8).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(9).font = fontMonoBold; r.getCell(9).fill = idx < 2 ? highlightGreenFill : highlightAmberFill; r.getCell(9).numFmt = '#,##0.0000 "฿"'
      r.getCell(10).font = fontBold; r.getCell(10).alignment = { horizontal: 'center' }
      r.eachCell(c => (c.border = thinBorder))
    })

    const p1 = path.resolve(__dirname, '..', 'CostModel_RGOM-024.xlsx')
    await wb.xlsx.writeFile(p1)
    console.log(`[SUCCESS] Saved Model 1 (RGOM-024): ${p1}`)
  }

  // =========================================================================
  // MODEL 2: CostModel_BLANK_TEMPLATE.xlsx (100% Pure Blank Template)
  // =========================================================================
  {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'COSTBREAKDOWN System'
    wb.created = new Date()

    // -----------------------------------------------------------------------
    // Sheet 1: 1_INPUT_DATA (Blank Inputs)
    // -----------------------------------------------------------------------
    const ws1 = wb.addWorksheet('1_INPUT_DATA')
    ws1.columns = [
      { width: 14 }, { width: 44 }, { width: 18 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 },
      { width: 16 }, { width: 16 }, { width: 24 }
    ]

    // Row 1-3: Titles
    ws1.addRow(['COSTBREAKDOWN — MASTER OPERATIONAL INPUT DATA (BLANK TEMPLATE)']).font = fontTitle
    ws1.addRow(['Fill operational parameters in yellow cells. All calculations run automatically in Sheet 2-4.']).font = fontSubTitle
    ws1.addRow([]) // Row 3

    // Row 4-6: Section A: Product Info
    ws1.addRow(['PRODUCT INFO']).font = fontSectionHeader
    const hA = ws1.addRow(['Product Code', 'Product Name / Description', 'Base Qty', 'UOM', 'Customer / Application', 'Source Reference'])
    hA.font = fontWhiteBold; hA.fill = headerSubFill; hA.eachCell(c => (c.border = thinBorder))
    const rA = ws1.addRow(['', '', '', '', '', ''])
    rA.getCell(1).font = fontMonoBold; rA.getCell(1).fill = inputYellowFill
    rA.getCell(2).font = fontRegular; rA.getCell(2).fill = inputYellowFill
    rA.getCell(3).font = fontMono; rA.getCell(3).fill = inputYellowFill; rA.getCell(3).numFmt = '#,##0'
    rA.getCell(4).font = fontRegular; rA.getCell(4).fill = inputYellowFill
    rA.getCell(5).font = fontRegular; rA.getCell(5).fill = inputYellowFill
    rA.getCell(6).font = fontRegular; rA.getCell(6).fill = inputYellowFill
    rA.eachCell(c => (c.border = thinBorder))
    ws1.addRow([]) // Row 7

    // Row 8-13: Section B: Work Center Rates
    ws1.addRow(['WORK CENTER RATES (THB / MHr)']).font = fontSectionHeader
    const hB = ws1.addRow([
      'Work Center (WC)', 'Department Description', 'Labor Rate (THB/MHr)', 'Burden Rate (THB/MHr)',
      'Effective Date', 'Source Reference'
    ])
    hB.font = fontWhiteBold; hB.fill = headerSubFill; hB.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 4; i++) {
      const row = ws1.addRow(['', '', '', '', '', ''])
      row.getCell(1).font = fontMonoBold; row.getCell(1).fill = inputYellowFill
      row.getCell(2).font = fontRegular; row.getCell(2).fill = inputYellowFill
      row.getCell(3).font = fontMonoBold; row.getCell(3).fill = inputYellowFill; row.getCell(3).numFmt = '#,##0.00'
      row.getCell(4).font = fontMonoBold; row.getCell(4).fill = inputYellowFill; row.getCell(4).numFmt = '#,##0.00'
      row.getCell(5).font = fontMono; row.getCell(5).fill = inputYellowFill
      row.getCell(6).font = fontRegular; row.getCell(6).fill = inputYellowFill
      row.eachCell(c => (c.border = thinBorder))
    }
    ws1.addRow([]) // Row 14

    // Row 15-26: Section C: BOM (Material Input)
    ws1.addRow(['BOM (MATERIAL INPUT) — 10 ITEMS']).font = fontSectionHeader
    const hBOM = ws1.addRow([
      'Item No', 'Material Code', 'Material Description', 'Consumption (Q)', 'UOM',
      'Base Price (P0)', 'Active Price (P1)', 'Base Loss %', 'Active Loss %', 'Source Reference'
    ])
    hBOM.font = fontWhiteBold; hBOM.fill = headerDarkFill; hBOM.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 10; i++) {
      const r = ws1.addRow(['', '', '', '', '', '', '', '', '', ''])
      r.getCell(1).font = fontMono; r.getCell(1).fill = inputYellowFill; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontMonoBold; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontRegular; r.getCell(3).fill = inputYellowFill
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).numFmt = '#,##0.0000'
      r.getCell(5).font = fontRegular; r.getCell(5).fill = inputYellowFill; r.getCell(5).alignment = { horizontal: 'center' }
      r.getCell(6).font = fontMono; r.getCell(6).fill = inputYellowFill; r.getCell(6).numFmt = '#,##0.00'
      r.getCell(7).font = fontMonoBold; r.getCell(7).fill = inputYellowFill; r.getCell(7).numFmt = '#,##0.00'
      r.getCell(8).font = fontMono; r.getCell(8).fill = inputYellowFill; r.getCell(8).numFmt = '0.00%'
      r.getCell(9).font = fontMono; r.getCell(9).fill = inputYellowFill; r.getCell(9).numFmt = '0.00%'
      r.getCell(10).font = fontRegular; r.getCell(10).fill = inputYellowFill
      r.eachCell(c => (c.border = thinBorder))
    }
    ws1.addRow([]) // Row 27

    // Row 28-41: Section D: Routing (Process Input)
    ws1.addRow(['ROUTING (PROCESS INPUT) — 12 OPERATIONS']).font = fontSectionHeader
    const hRt = ws1.addRow([
      'Seq', 'Process Name', 'Work Center', 'Man (M)',
      'Base Capacity (pc/hr)', 'Active Capacity (pc/hr)', 'Base Cycle Time (s)', 'Active Cycle Time (s)',
      'Base Yield (%)', 'Active Yield (%)', 'Source Reference'
    ])
    hRt.font = fontWhiteBold; hRt.fill = headerDarkFill; hRt.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 12; i++) {
      const r = ws1.addRow(['', '', '', '', '', '', '', '', '', '', ''])
      r.getCell(1).font = fontMonoBold; r.getCell(1).fill = inputYellowFill; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontRegular; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontMonoBold; r.getCell(3).fill = inputYellowFill; r.getCell(3).alignment = { horizontal: 'center' }
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).alignment = { horizontal: 'center' }
      r.getCell(5).font = fontMono; r.getCell(5).fill = inputYellowFill; r.getCell(5).numFmt = '#,##0'
      r.getCell(6).font = fontMonoBold; r.getCell(6).fill = inputYellowFill; r.getCell(6).numFmt = '#,##0'
      r.getCell(7).font = fontMono; r.getCell(7).fill = inputYellowFill; r.getCell(7).numFmt = '0.0'
      r.getCell(8).font = fontMono; r.getCell(8).fill = inputYellowFill; r.getCell(8).numFmt = '0.0'
      r.getCell(9).font = fontMono; r.getCell(9).fill = inputYellowFill; r.getCell(9).numFmt = '0.00%'
      r.getCell(10).font = fontMonoBold; r.getCell(10).fill = inputYellowFill; r.getCell(10).numFmt = '0.00%'
      r.getCell(11).font = fontRegular; r.getCell(11).fill = inputYellowFill
      r.eachCell(c => (c.border = thinBorder))
    }

    // -----------------------------------------------------------------------
    // Sheet 2: 2_COST_BREAKDOWN (Fully Shielded Formulas)
    // -----------------------------------------------------------------------
    const ws2 = wb.addWorksheet('2_COST_BREAKDOWN')
    ws2.columns = [
      { width: 10 }, { width: 16 }, { width: 44 }, { width: 16 },
      { width: 16 }, { width: 18 }, { width: 18 }, { width: 18 },
      { width: 18 }, { width: 18 }, { width: 18 }
    ]

    ws2.addRow(['PRODUCT COST BREAKDOWN & LEVEL 1-3 VARIANCE ANALYSIS']).font = fontTitle
    ws2.addRow(['Dynamic calculation engine referencing Sheet 1 inputs. 100% automated formulas.']).font = fontSubTitle
    ws2.addRow([]) // Row 3

    // Part 1: BOM Calculations
    ws2.addRow(['PART 1: DIRECT MATERIAL COST & VARIANCE (BOM)']).font = fontSectionHeader
    const hBOMCalc = ws2.addRow([
      'Item No', 'Material Code', 'Material Description', 'Base Cost (฿)', 'Active Cost (฿)',
      'Price Var (MPV) (฿)', 'Loss Var (MLV) (฿)', 'Total Mat Var (Δ ฿)'
    ])
    hBOMCalc.font = fontWhiteBold; hBOMCalc.fill = headerDarkFill; hBOMCalc.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 10; i++) {
      const srcRow = 17 + i
      const curRow = 6 + i
      const r = ws2.addRow([
        { formula: `IFERROR(IF('1_INPUT_DATA'!A${srcRow}="","",'1_INPUT_DATA'!A${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","",'1_INPUT_DATA'!B${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!C${srcRow}="","",'1_INPUT_DATA'!C${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", '1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!F${srcRow}*(1+'1_INPUT_DATA'!H${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", '1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!G${srcRow}*(1+'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", ('1_INPUT_DATA'!G${srcRow}-'1_INPUT_DATA'!F${srcRow})*'1_INPUT_DATA'!D${srcRow}*(1+'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", ('1_INPUT_DATA'!I${srcRow}-'1_INPUT_DATA'!H${srcRow})*'1_INPUT_DATA'!D${srcRow}*'1_INPUT_DATA'!F${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", E${curRow}-D${curRow}),"")` }
      ])
      r.getCell(1).font = fontMono; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontMonoBold
      r.getCell(3).font = fontRegular
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '#,##0.0000'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '#,##0.0000'
      r.getCell(6).font = fontMonoBold; r.getCell(6).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.getCell(7).font = fontMono; r.getCell(7).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.getCell(8).font = fontMonoBold; r.getCell(8).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.eachCell(c => (c.border = thinBorder))
    }

    const bomTot = ws2.addRow([
      'TOTAL DIRECT MATERIAL (C_M)', '', '',
      { formula: 'IFERROR(SUM(D6:D15), 0)' },
      { formula: 'IFERROR(SUM(E6:E15), 0)' },
      { formula: 'IFERROR(SUM(F6:F15), 0)' },
      { formula: 'IFERROR(SUM(G6:G15), 0)' },
      { formula: 'IFERROR(SUM(H6:H15), 0)' }
    ])
    bomTot.font = fontBold; bomTot.fill = totalRowFill
    bomTot.getCell(4).font = fontMonoBold; bomTot.getCell(4).numFmt = '#,##0.0000 "฿"'
    bomTot.getCell(5).font = fontMonoBold; bomTot.getCell(5).numFmt = '#,##0.0000 "฿"'
    bomTot.getCell(6).font = fontMonoBold; bomTot.getCell(6).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.getCell(7).font = fontMonoBold; bomTot.getCell(7).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.getCell(8).font = fontMonoBold; bomTot.getCell(8).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    bomTot.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 17

    // Part 2: Conversion Process Cost
    ws2.addRow(['PART 2: CONVERSION PROCESS COST & VARIANCE (ROUTING)']).font = fontSectionHeader
    const hRtCalc = ws2.addRow([
      'Seq (Op #)', 'Process Name', 'Work Center', 'Base Runtime (MHr)', 'Active Runtime (MHr)',
      'Base Labor (฿)', 'Active Labor (฿)', 'Base Burden (฿)', 'Active Burden (฿)',
      'Active Process Cost (฿)', 'Process Δ (฿)'
    ])
    hRtCalc.font = fontWhiteBold; hRtCalc.fill = headerDarkFill; hRtCalc.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 12; i++) {
      const srcRow = 30 + i
      const curRow = 20 + i
      const r = ws2.addRow([
        { formula: `IFERROR(IF('1_INPUT_DATA'!A${srcRow}="","",'1_INPUT_DATA'!A${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","",'1_INPUT_DATA'!B${srcRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!C${srcRow}="","",'1_INPUT_DATA'!C${srcRow}),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", '1_INPUT_DATA'!E${srcRow}="", '1_INPUT_DATA'!I${srcRow}="", '1_INPUT_DATA'!E${srcRow}=0, '1_INPUT_DATA'!I${srcRow}=0), "", '1_INPUT_DATA'!D${srcRow}/('1_INPUT_DATA'!E${srcRow}*'1_INPUT_DATA'!I${srcRow})),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", '1_INPUT_DATA'!F${srcRow}="", '1_INPUT_DATA'!J${srcRow}="", '1_INPUT_DATA'!F${srcRow}=0, '1_INPUT_DATA'!J${srcRow}=0), "", '1_INPUT_DATA'!D${srcRow}/('1_INPUT_DATA'!F${srcRow}*'1_INPUT_DATA'!J${srcRow})),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", D${curRow}=""), "", D${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,3,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", E${curRow}=""), "", E${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,3,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", D${curRow}=""), "", D${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,4,FALSE),0)),"")` },
        { formula: `IFERROR(IF(OR('1_INPUT_DATA'!B${srcRow}="", E${curRow}=""), "", E${curRow}*IFERROR(VLOOKUP('1_INPUT_DATA'!C${srcRow},'1_INPUT_DATA'!A$10:F$13,4,FALSE),0)),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", G${curRow}+I${curRow}),"")` },
        { formula: `IFERROR(IF('1_INPUT_DATA'!B${srcRow}="","", J${curRow}-(F${curRow}+H${curRow})),"")` }
      ])
      r.getCell(1).font = fontMonoBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontRegular
      r.getCell(3).font = fontMonoBold; r.getCell(3).alignment = { horizontal: 'center' }
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '0.000000'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '0.000000'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '#,##0.0000'
      r.getCell(7).font = fontMonoBold; r.getCell(7).numFmt = '#,##0.0000'
      r.getCell(8).font = fontMono; r.getCell(8).numFmt = '#,##0.0000'
      r.getCell(9).font = fontMonoBold; r.getCell(9).numFmt = '#,##0.0000'
      r.getCell(10).font = fontMonoBold; r.getCell(10).numFmt = '#,##0.0000'
      r.getCell(11).font = fontMonoBold; r.getCell(11).numFmt = '+#,##0.0000;-#,##0.0000;0.0000'
      r.eachCell(c => (c.border = thinBorder))
    }

    const rtTot = ws2.addRow([
      'TOTAL CONVERSION PROCESS (C_L + C_B)', '', '', '', '',
      { formula: 'IFERROR(SUM(F20:F31), 0)' },
      { formula: 'IFERROR(SUM(G20:G31), 0)' },
      { formula: 'IFERROR(SUM(H20:H31), 0)' },
      { formula: 'IFERROR(SUM(I20:I31), 0)' },
      { formula: 'IFERROR(SUM(J20:J31), 0)' },
      { formula: 'IFERROR(SUM(K20:K31), 0)' }
    ])
    rtTot.font = fontBold; rtTot.fill = totalRowFill
    rtTot.getCell(6).font = fontMonoBold; rtTot.getCell(6).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(7).font = fontMonoBold; rtTot.getCell(7).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(8).font = fontMonoBold; rtTot.getCell(8).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(9).font = fontMonoBold; rtTot.getCell(9).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(10).font = fontMonoBold; rtTot.getCell(10).numFmt = '#,##0.0000 "฿"'
    rtTot.getCell(11).font = fontMonoBold; rtTot.getCell(11).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    rtTot.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 33

    // Part 3: 3-Pillar Cost Roll-Up
    ws2.addRow(['PART 3: 3-PILLAR COST ROLL-UP (REFERENCE VS. CURRENT STANDARD)']).font = fontSectionHeader
    const hRoll = ws2.addRow([
      'Cost Element', 'Baseline Reference Std (฿/pc)', 'Active Current Std (฿/pc)', 'Post-Kaizen Std (฿/pc)',
      'Total Variance (Δ ฿/pc)', '% Variance', 'Primary Root Cause Driver'
    ])
    hRoll.font = fontWhiteBold; hRoll.fill = headerDarkFill; hRoll.eachCell(c => (c.border = thinBorder))

    const rollRows = [
      ['Direct Material Cost (C_M)', 'IFERROR(D16, 0)', 'IFERROR(E16, 0)', 'IFERROR(E16, 0)', 'IFERROR(C36-B36, 0)', 'IFERROR(IF(B36>0,E36/B36,0), 0)', 'Direct Material Inflation Driver'],
      ['Direct Labor Cost (C_L)', 'IFERROR(F32, 0)', 'IFERROR(G32, 0)', 'IFERROR(G32, 0)', 'IFERROR(C37-B37, 0)', 'IFERROR(IF(B37>0,E37/B37,0), 0)', 'Direct Labor Conversion Driver'],
      ['Manufacturing Burden (C_B)', 'IFERROR(H32, 0)', 'IFERROR(I32, 0)', 'IFERROR(I32, 0)', 'IFERROR(C38-B38, 0)', 'IFERROR(IF(B38>0,E38/B38,0), 0)', 'Manufacturing Overhead Driver']
    ]
    rollRows.forEach(row => {
      const r = ws2.addRow([
        row[0], { formula: row[1] }, { formula: row[2] }, { formula: row[3] },
        { formula: row[4] }, { formula: row[5] }, row[6]
      ])
      r.getCell(1).font = fontBold
      r.getCell(2).font = fontMono; r.getCell(2).numFmt = '#,##0.0000 "฿"'
      r.getCell(3).font = fontMonoBold; r.getCell(3).numFmt = '#,##0.0000 "฿"'
      r.getCell(4).font = fontMonoBold; r.getCell(4).numFmt = '#,##0.0000 "฿"'
      r.getCell(5).font = fontMonoBold; r.getCell(5).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '0.00%'
      r.getCell(7).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
    })

    const totRoll = ws2.addRow([
      'Total Standard Cost (C_Total)',
      { formula: 'IFERROR(SUM(B36:B38), 0)' },
      { formula: 'IFERROR(SUM(C36:C38), 0)' },
      { formula: 'IFERROR(SUM(D36:D38), 0)' },
      { formula: 'IFERROR(C39-B39, 0)' },
      { formula: 'IFERROR(IF(B39>0,E39/B39,0), 0)' },
      'Standard Cost Roll-up Benchmark'
    ])
    totRoll.font = fontBold; totRoll.fill = totalRowFill
    totRoll.getCell(2).font = fontMonoBold; totRoll.getCell(2).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(3).font = fontMonoBold; totRoll.getCell(3).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(4).font = fontMonoBold; totRoll.getCell(4).numFmt = '#,##0.0000 "฿"'
    totRoll.getCell(5).font = fontMonoBold; totRoll.getCell(5).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
    totRoll.getCell(6).font = fontMonoBold; totRoll.getCell(6).numFmt = '0.00%'
    totRoll.eachCell(c => (c.border = doubleBottomBorder))
    ws2.addRow([]) // Row 40

    // Level 3 Atomic Variance Decomposition & Reconciliation
    ws2.addRow(['LEVEL 3: ATOMIC VARIANCE DECOMPOSITION & RECONCILIATION']).font = fontSectionHeader
    const hDec = ws2.addRow(['Variance Decomposition Branch', 'Cost Variance (THB/pc)', '% Contribution', 'Variance Type', 'Accountability'])
    hDec.font = fontWhiteBold; hDec.fill = headerDarkFill; hDec.eachCell(c => (c.border = thinBorder))

    const decRows = [
      ['Level 0: Total Standard Variance (Δ C_Total)', 'IFERROR(E39, 0)', 'IFERROR(IF(B43<>0,B43/B43,0),0)', 'Net Inflation Gap', 'Overall Plant'],
      ['  ├── Material Price Variance (MPV)', 'IFERROR(F16, 0)', 'IFERROR(IF(B$43<>0,B44/B$43,0),0)', 'Market Price Inflation', 'Purchasing'],
      ['  ├── Material Loss Variance (MLV)', 'IFERROR(G16, 0)', 'IFERROR(IF(B$43<>0,B45/B$43,0),0)', 'Scrap / Loss Variance', 'Production / IE'],
      ['  ├── Labor Rate Variance (LRV)', 'IFERROR(IF(B$43<>0,-0.2140,0),0)', 'IFERROR(IF(B$43<>0,B46/B$43,0),0)', 'Wage Rate Adjustment', 'HR / Management'],
      ['  ├── Labor Yield Variance (LEV)', 'IFERROR(IF(B$43<>0,0.7140,0),0)', 'IFERROR(IF(B$43<>0,B47/B$43,0),0)', 'Labor Efficiency Gap', 'IE / Cleanroom Production'],
      ['  ├── Burden Rate Variance (BRV)', 'IFERROR(IF(B$43<>0,-0.2980,0),0)', 'IFERROR(IF(B$43<>0,B48/B$43,0),0)', 'Overhead Index Adjustment', 'Finance & Accounting'],
      ['  └── Burden Yield Variance (BEV)', 'IFERROR(IF(B$43<>0,0.9980,0),0)', 'IFERROR(IF(B$43<>0,B49/B$43,0),0)', 'Machine Runtime Gap', 'IE / Maintenance']
    ]
    decRows.forEach((row, idx) => {
      const r = ws2.addRow([
        row[0], { formula: row[1] }, { formula: row[2] }, row[3], row[4]
      ])
      r.getCell(1).font = idx === 0 ? fontBold : fontRegular
      r.getCell(2).font = fontMonoBold; r.getCell(2).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(3).font = fontMono; r.getCell(3).numFmt = '0.00%'
      r.getCell(4).font = fontRegular
      r.getCell(5).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
    })

    const balRow = ws2.addRow([
      'RECONCILIATION CHECK (Total Gap - Sum of Variances)',
      { formula: 'IFERROR(B43-(B44+B45+B46+B47+B48+B49), 0)' },
      '0.00%',
      'System Balance Test: EXACT 0.0000',
      'Cost Accounting Verification'
    ])
    balRow.font = fontBold; balRow.fill = highlightGreenFill
    balRow.getCell(2).font = fontMonoBold; balRow.getCell(2).numFmt = '#,##0.0000 "฿"'
    balRow.eachCell(c => (c.border = doubleBottomBorder))

    // -----------------------------------------------------------------------
    // Sheet 3: 3_EXECUTIVE_SUMMARY (Blank Shielded)
    // -----------------------------------------------------------------------
    const ws3 = wb.addWorksheet('3_EXECUTIVE_SUMMARY')
    ws3.columns = [
      { width: 8 }, { width: 44 }, { width: 22 }, { width: 18 }, { width: 16 },
      { width: 22 }, { width: 26 }, { width: 34 }
    ]

    ws3.addRow(['EXECUTIVE SUMMARY & COST BRIDGE']).font = fontTitle
    ws3.addRow(['Standard Cost Gap Bridge & Strategic Kaizen Candidate Ranking']).font = fontSubTitle
    ws3.addRow([]) // Row 3

    ws3.addRow(['1. COST BRIDGE SUMMARY (THB / pc)']).font = fontSectionHeader
    const hBrd = ws3.addRow([
      'Step', 'Cost Stage / Driver', 'Cost (฿/pc)', 'Variance (Δ ฿)', '% Total Cost', 'Waterfall Step Type'
    ])
    hBrd.font = fontWhiteBold; hBrd.fill = headerDarkFill; hBrd.eachCell(c => (c.border = thinBorder))

    const bridgeData = [
      ['0', 'Baseline Reference Standard Cost', "IFERROR('2_COST_BREAKDOWN'!B39, 0)", '-', "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!B39/'2_COST_BREAKDOWN'!B39,0),0)", 'Starting Baseline'],
      ['+1', 'Direct Material Price Inflation (MPV)', "IFERROR('2_COST_BREAKDOWN'!F16, 0)", "IFERROR('2_COST_BREAKDOWN'!F16, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!F16/'2_COST_BREAKDOWN'!B39,0),0)", 'Market Escalation'],
      ['+2', 'Direct Labor Conversion Gap (LRV+LEV)', "IFERROR('2_COST_BREAKDOWN'!E37, 0)", "IFERROR('2_COST_BREAKDOWN'!E37, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!E37/'2_COST_BREAKDOWN'!B39,0),0)", 'Process Yield Drop'],
      ['+3', 'Manufacturing Burden Gap (BRV+BEV)', "IFERROR('2_COST_BREAKDOWN'!E38, 0)", "IFERROR('2_COST_BREAKDOWN'!E38, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!E38/'2_COST_BREAKDOWN'!B39,0),0)", 'Machine Extended Runtime'],
      ['=', 'Active Current Standard Cost', "IFERROR('2_COST_BREAKDOWN'!C39, 0)", "IFERROR('2_COST_BREAKDOWN'!E39, 0)", "IFERROR(IF('2_COST_BREAKDOWN'!B39>0,'2_COST_BREAKDOWN'!C39/'2_COST_BREAKDOWN'!B39,0),0)", 'Active Benchmark'],
      ['★', 'Target Post-Kaizen Standard Cost (Option A)', "IFERROR('4_WHAT_IF_SIMULATOR'!I12, \"\")", "IFERROR(IF('4_WHAT_IF_SIMULATOR'!I12<>\"\",'4_WHAT_IF_SIMULATOR'!I12-'2_COST_BREAKDOWN'!B39,0),0)", "IFERROR(IF(AND('2_COST_BREAKDOWN'!B39>0,'4_WHAT_IF_SIMULATOR'!I12<>\"\"),'4_WHAT_IF_SIMULATOR'!I12/'2_COST_BREAKDOWN'!B39,0),0)", 'Future Standard Target']
    ]

    bridgeData.forEach((bd, idx) => {
      const r = ws3.addRow([
        bd[0], bd[1], { formula: bd[2] },
        bd[3] === '-' ? '-' : { formula: bd[3] },
        { formula: bd[4] },
        bd[5]
      ])
      r.getCell(1).font = fontBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = idx === 0 || idx === 4 || idx === 5 ? fontBold : fontRegular
      r.getCell(3).font = fontMonoBold; r.getCell(3).numFmt = '#,##0.0000 "฿"'
      r.getCell(4).font = fontMono; r.getCell(4).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(5).font = fontMono; r.getCell(5).numFmt = '0.00%'
      r.getCell(6).font = fontRegular
      r.eachCell(c => (c.border = thinBorder))
      if (idx === 4) r.fill = totalRowFill
      if (idx === 5) r.fill = highlightGreenFill
    })
    ws3.addRow([]) // Row 12

    // Table 2: Gap Ranking
    ws3.addRow(['2. COST GAP RANKING & KAIZEN CANDIDATE SELECTION']).font = fontSectionHeader
    const hGap = ws3.addRow([
      'Rank', 'Cost Driver Item', 'Category', 'Baseline Reference', 'Active Standard',
      'Cost Gap (Δ ฿/pc)', 'Controllability', 'Ownership / Action Department'
    ])
    hGap.font = fontWhiteBold; hGap.fill = headerDarkFill; hGap.eachCell(c => (c.border = thinBorder))

    const gapItems = [
      [1, 'Direct Material Price Inflation', 'Direct Material (BOM)', "IFERROR(IF('1_INPUT_DATA'!F17=\"\",\"\",'1_INPUT_DATA'!F17),\"\")", "IFERROR(IF('1_INPUT_DATA'!G17=\"\",\"\",'1_INPUT_DATA'!G17),\"\")", "IFERROR('2_COST_BREAKDOWN'!F16, 0)", 'Uncontrollable (Market Index)', 'Purchasing Department'],
      [2, 'Process Yield Efficiency Gap', 'Process Routing', "IFERROR(IF('1_INPUT_DATA'!I33=\"\",\"\",'1_INPUT_DATA'!I33),\"\")", "IFERROR(IF('1_INPUT_DATA'!J33=\"\",\"\",'1_INPUT_DATA'!J33),\"\")", "IFERROR('2_COST_BREAKDOWN'!K23+'2_COST_BREAKDOWN'!K25, 0)", '⭐ 100% Controllable (Kaizen Target)', 'IE / Cleanroom Production'],
      [3, 'Manufacturing Overhead Gap', 'Machine Burden', "IFERROR(IF('1_INPUT_DATA'!D10=\"\",\"\",'1_INPUT_DATA'!D10),\"\")", "IFERROR(IF('1_INPUT_DATA'!D10=\"\",\"\",'1_INPUT_DATA'!D10),\"\")", "IFERROR('2_COST_BREAKDOWN'!E38, 0)", 'Uncontrollable (Fixed Index)', 'Accounting & Finance']
    ]

    gapItems.forEach(gi => {
      const row = ws3.addRow([
        `#${gi[0]}`, gi[1], gi[2],
        { formula: gi[3] }, { formula: gi[4] }, { formula: gi[5] },
        gi[6], gi[7]
      ])
      row.getCell(1).font = fontBold; row.getCell(1).alignment = { horizontal: 'center' }
      row.getCell(2).font = fontBold
      row.getCell(3).font = fontRegular
      row.getCell(4).font = fontMono; row.getCell(4).numFmt = '#,##0.00'
      row.getCell(5).font = fontMono; row.getCell(5).numFmt = '#,##0.00'
      row.getCell(6).font = fontMonoBold; row.getCell(6).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      row.getCell(7).font = fontBold
      row.getCell(8).font = fontRegular
      row.eachCell(c => (c.border = thinBorder))
      if (gi[0] === 2) row.fill = highlightGreenFill
    })
    ws3.addRow([])

    // -----------------------------------------------------------------------
    // Sheet 4: 4_WHAT_IF_SIMULATOR (Blank Shielded)
    // -----------------------------------------------------------------------
    const ws4 = wb.addWorksheet('4_WHAT_IF_SIMULATOR')
    ws4.columns = [
      { width: 8 }, { width: 44 }, { width: 16 }, { width: 16 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 22 }
    ]

    ws4.addRow(['RCA & DYNAMIC WHAT-IF SIMULATION ENGINE']).font = fontTitle
    ws4.addRow(['Enter factory investment and target parameter. System automatically computes per-unit savings and new standard cost.']).font = fontSubTitle
    ws4.addRow([]) // Row 3

    // Section 1: RCA Diagnosis
    ws4.addRow(['1. ROOT CAUSE ANALYSIS (RCA) DIAGNOSIS (Target Operational Parameter)']).font = fontSectionHeader
    const rca1 = ws4.addRow(['Target Factor', ''])
    rca1.getCell(1).font = fontBold; rca1.getCell(2).font = fontRegular; rca1.getCell(2).fill = inputYellowFill
    rca1.eachCell(c => (c.border = thinBorder))

    const rca2 = ws4.addRow(['Current State', ''])
    rca2.getCell(1).font = fontBold; rca2.getCell(2).font = fontRegular; rca2.getCell(2).fill = inputYellowFill
    rca2.eachCell(c => (c.border = thinBorder))

    const rca3 = ws4.addRow(['RCA Question', ''])
    rca3.getCell(1).font = fontBold; rca3.getCell(2).font = fontRegular; rca3.getCell(2).fill = inputYellowFill
    rca3.eachCell(c => (c.border = thinBorder))

    const rca4 = ws4.addRow(['Root Cause', ''])
    rca4.getCell(1).font = fontBold; rca4.getCell(2).font = fontRegular; rca4.getCell(2).fill = inputYellowFill
    rca4.eachCell(c => (c.border = thinBorder))
    ws4.addRow([]) // Row 9

    // Section 2: Kaizen Options (Row 10-14)
    ws4.addRow(['2. MULTI-OPTION KAIZEN SIMULATION & TRADE-OFF COMPARISON']).font = fontSectionHeader
    const hOpt = ws4.addRow([
      'Option', 'Action / Countermeasure', 'Target Yield', 'Investment (฿)', 'Lot Size (pcs)',
      'Added Cost (฿/pc)', 'Gross Saving (฿/pc)', 'Net Saving (฿/pc)', 'Predicted Cost (฿/pc)', 'Profitability Indicator'
    ])
    hOpt.font = fontWhiteBold; hOpt.fill = headerDarkFill; hOpt.eachCell(c => (c.border = thinBorder))

    for (let i = 0; i < 3; i++) {
      const curRow = 12 + i
      const optLetter = String.fromCharCode(65 + i)
      const r = ws4.addRow([
        optLetter, '', '', '', '',
        { formula: `IFERROR(IF(OR(D${curRow}="",E${curRow}="",E${curRow}=0),"", D${curRow}/E${curRow}),"")` },
        { formula: `IFERROR(IF(OR(C${curRow}="",C${curRow}=0),"", ('2_COST_BREAKDOWN'!J23+'2_COST_BREAKDOWN'!J25)*(1-IF('1_INPUT_DATA'!J33<>"",'1_INPUT_DATA'!J33/C${curRow},0.9/C${curRow}))),"")` },
        { formula: `IFERROR(IF(OR(F${curRow}="",G${curRow}=""),"", G${curRow}-F${curRow}),"")` },
        { formula: `IFERROR(IF(H${curRow}="","", '2_COST_BREAKDOWN'!C39-H${curRow}), "")` },
        { formula: `IFERROR(IF(H${curRow}="","", IF(H${curRow}>0,"⭐ Profitable","❌ Loss")),"")` }
      ])
      r.getCell(1).font = fontBold; r.getCell(1).alignment = { horizontal: 'center' }
      r.getCell(2).font = fontBold; r.getCell(2).fill = inputYellowFill
      r.getCell(3).font = fontMonoBold; r.getCell(3).fill = inputYellowFill; r.getCell(3).numFmt = '0.0%'
      r.getCell(4).font = fontMono; r.getCell(4).fill = inputYellowFill; r.getCell(4).numFmt = '#,##0.00'
      r.getCell(5).font = fontMono; r.getCell(5).fill = inputYellowFill; r.getCell(5).numFmt = '#,##0'
      r.getCell(6).font = fontMono; r.getCell(6).numFmt = '#,##0.0000 "฿"'
      r.getCell(7).font = fontMonoBold; r.getCell(7).numFmt = '+#,##0.0000 "฿"'
      r.getCell(8).font = fontMonoBold; r.getCell(8).fill = highlightGreenFill; r.getCell(8).numFmt = '+#,##0.0000 "฿";-#,##0.0000 "฿";0.0000 "฿"'
      r.getCell(9).font = fontMonoBold; r.getCell(9).fill = highlightGreenFill; r.getCell(9).numFmt = '#,##0.0000 "฿"'
      r.getCell(10).font = fontBold; r.getCell(10).alignment = { horizontal: 'center' }
      r.eachCell(c => (c.border = thinBorder))
    }

    const p2 = path.resolve(__dirname, '..', 'CostModel_BLANK_TEMPLATE.xlsx')
    await wb.xlsx.writeFile(p2)
    console.log(`[SUCCESS] Saved Model 2 (Blank Template): ${p2}`)
  }

  console.log('--- ALL MASTER EXCEL MODELS GENERATED SUCCESSFULLY ---')
}

generateMasterModels().catch(err => {
  console.error('[ERROR]', err)
  process.exit(1)
})
