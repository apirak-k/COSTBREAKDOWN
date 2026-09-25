import ExcelJS from 'exceljs'
import { WorkingDataset, DatasetMetadata } from '../../core/types/dataset-standard.types'

export interface MultiTabTemplateOptions {
  metadata?: Partial<DatasetMetadata>
  wcCount?: number
  routingCount?: number
  bomCount?: number
  dataset?: WorkingDataset
}

const FONT_NAME = 'Arial'

const COLOR_HEADER_BG = 'FF1E293B' // Slate 800
const COLOR_HEADER_TEXT = 'FFFFFFFF' // White
const COLOR_INPUT_BG = 'FFE0F2FE' // Soft Blue
const COLOR_CALC_BG = 'FFF1F5F9' // Soft Slate/Gray
const COLOR_SECTION_BG = 'FF334155' // Slate 700
const COLOR_BORDER = 'CBD5E1' // Slate 300

const borderThin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } }
}

export async function generateMultiTabDatasetExcel(options: MultiTabTemplateOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown System'

  const wcCount = options.dataset?.wc.length || options.wcCount || 5
  const routingCount = options.dataset?.routing.length || options.routingCount || 8
  const bomCount = options.dataset?.bom.length || options.bomCount || 12

  const wcEndRow = 5 + wcCount - 1
  const routingEndRow = 5 + routingCount - 1
  const bomEndRow = 5 + bomCount - 1

  // 1. SUMMARY_META TAB
  const metaSheet = workbook.addWorksheet('SUMMARY_META', { views: [{ showGridLines: true }] })
  metaSheet.columns = [{ width: 22 }, { width: 45 }]

  // Title
  metaSheet.mergeCells('A1:B1')
  const titleCell = metaSheet.getCell('A1')
  titleCell.value = 'DATASET METADATA & COST SUMMARY'
  titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  metaSheet.getRow(1).height = 30

  // Metadata Header
  metaSheet.mergeCells('A3:B3')
  const mHead = metaSheet.getCell('A3')
  mHead.value = '1. METADATA'
  mHead.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  mHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }

  const metaFields = [
    ['Product Code', options.dataset?.metadata.productCode || options.metadata?.productCode || ''],
    ['Product Name', options.dataset?.metadata.productName || options.metadata?.productName || ''],
    ['UOM', options.dataset?.metadata.uom || options.metadata?.uom || 'PC'],
    ['Remark', options.dataset?.metadata.remark || options.metadata?.remark || '']
  ]

  metaFields.forEach(([label, val], idx) => {
    const r = idx + 4
    metaSheet.getCell(`A${r}`).value = label
    metaSheet.getCell(`A${r}`).font = { name: FONT_NAME, size: 10, bold: true }
    metaSheet.getCell(`A${r}`).border = borderThin

    metaSheet.getCell(`B${r}`).value = val
    metaSheet.getCell(`B${r}`).font = { name: FONT_NAME, size: 10 }
    metaSheet.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
    metaSheet.getCell(`B${r}`).border = borderThin
  })

  // Cost Summary Header
  metaSheet.mergeCells('A9:B9')
  const sHead = metaSheet.getCell('A9')
  sHead.value = '2. COST SUMMARY (CALCULATED)'
  sHead.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  sHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }

  const summaryRows = [
    ['Material Cost / pc', `=BOM!H${bomEndRow + 1}`],
    ['Labor Cost / pc', `=ROUTING!F${routingEndRow + 1}`],
    ['Burden Cost / pc', `=ROUTING!G${routingEndRow + 1}`]
  ]

  summaryRows.forEach(([label, formula], idx) => {
    const r = idx + 10
    metaSheet.getCell(`A${r}`).value = label
    metaSheet.getCell(`A${r}`).font = { name: FONT_NAME, size: 10, bold: true }
    metaSheet.getCell(`A${r}`).border = borderThin

    metaSheet.getCell(`B${r}`).value = { formula }
    metaSheet.getCell(`B${r}`).font = { name: FONT_NAME, size: 10, bold: true }
    metaSheet.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    metaSheet.getCell(`B${r}`).border = borderThin
    metaSheet.getCell(`B${r}`).numFmt = '#,##0.0000'
  })

  // Standard Cost Total
  metaSheet.getCell('A13').value = 'Standard Cost / pc'
  metaSheet.getCell('A13').font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  metaSheet.getCell('A13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  metaSheet.getCell('A13').border = borderThin

  metaSheet.getCell('B13').value = { formula: '=SUM(B10:B12)' }
  metaSheet.getCell('B13').font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  metaSheet.getCell('B13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  metaSheet.getCell('B13').border = borderThin
  metaSheet.getCell('B13').numFmt = '#,##0.0000'


  // 2. WORK_CENTER TAB
  const wcSheet = workbook.addWorksheet('WORK_CENTER', { views: [{ showGridLines: true }] })
  wcSheet.columns = [{ width: 25 }, { width: 20 }, { width: 20 }, { width: 30 }]

  wcSheet.mergeCells('A1:D1')
  const wcTitle = wcSheet.getCell('A1')
  wcTitle.value = 'WORK CENTER RATES'
  wcTitle.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  wcTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }

  const wcHeaders = ['Process', 'Labor Rate (THB/hr)', 'Burden Rate (THB/hr)', 'Source Reference']
  const wcCols = ['A', 'B', 'C', 'D']
  wcHeaders.forEach((th, i) => {
    const cell = wcSheet.getCell(`${wcCols[i]}4`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center' }
    cell.border = borderThin
  })

  const wcItems = options.dataset?.wc || []
  for (let i = 0; i < wcCount; i++) {
    const item = wcItems[i] || {}
    const r = i + 5
    wcSheet.getCell(`A${r}`).value = item.process || ''
    wcSheet.getCell(`B${r}`).value = item.labor ?? null
    wcSheet.getCell(`C${r}`).value = item.burden ?? null
    wcSheet.getCell(`D${r}`).value = item.sourceReference || ''

    wcSheet.getCell(`B${r}`).numFmt = '#,##0.00'
    wcSheet.getCell(`C${r}`).numFmt = '#,##0.00'

    wcCols.forEach(col => {
      const cell = wcSheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })
  }


  // 3. ROUTING TAB
  const routingSheet = workbook.addWorksheet('ROUTING', { views: [{ showGridLines: true }] })
  routingSheet.columns = [
    { width: 22 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 24 },
    { width: 16 }, { width: 16 }, { width: 18 }
  ]

  routingSheet.mergeCells('A1:H1')
  const rTitle = routingSheet.getCell('A1')
  rTitle.value = 'ROUTING & PROCESS COST'
  rTitle.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }

  const rHeaders = [
    'Process', 'Cap (pcs/hr)', 'Number (Manning)', 'Yield (%)', 'Source Ref',
    'Labor Cost/pc', 'Burden Cost/pc', 'Process Cost/pc'
  ]
  const rCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  rHeaders.forEach((th, i) => {
    const cell = routingSheet.getCell(`${rCols[i]}4`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center' }
    cell.border = borderThin
  })

  const routingItems = options.dataset?.routing || []
  for (let i = 0; i < routingCount; i++) {
    const item = routingItems[i] || {}
    const r = i + 5
    routingSheet.getCell(`A${r}`).value = item.process || ''
    routingSheet.getCell(`B${r}`).value = item.capacity ?? null
    routingSheet.getCell(`C${r}`).value = item.number ?? null
    routingSheet.getCell(`D${r}`).value = item.yieldRatio ?? null
    routingSheet.getCell(`E${r}`).value = item.sourceReference || ''

    routingSheet.getCell(`B${r}`).numFmt = '#,##0'
    routingSheet.getCell(`C${r}`).numFmt = '#,##0.00'
    routingSheet.getCell(`D${r}`).numFmt = '0.00%'

    ;['A', 'B', 'C', 'D', 'E'].forEach(col => {
      const cell = routingSheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })

    // Formula lookup from WORK_CENTER sheet
    routingSheet.getCell(`F${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), B${r}=0, D${r}=0), 0, (IFERROR(INDEX(WORK_CENTER!$B$5:$B$${wcEndRow}, MATCH(A${r}, WORK_CENTER!$A$5:$A$${wcEndRow}, 0)), 0) * C${r}) / (B${r} * D${r}))`
    }
    routingSheet.getCell(`G${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), B${r}=0, D${r}=0), 0, (IFERROR(INDEX(WORK_CENTER!$C$5:$C$${wcEndRow}, MATCH(A${r}, WORK_CENTER!$A$5:$A$${wcEndRow}, 0)), 0) * C${r}) / (B${r} * D${r}))`
    }
    routingSheet.getCell(`H${r}`).value = {
      formula: `=F${r}+G${r}`
    }

    ;['F', 'G', 'H'].forEach(col => {
      const cell = routingSheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10, bold: col === 'H' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
      cell.border = borderThin
      cell.numFmt = '#,##0.0000'
    })
  }

  // Routing Total Row
  const rTotRow = routingEndRow + 1
  routingSheet.getCell(`A${rTotRow}`).value = 'Total Process Cost'
  routingSheet.getCell(`F${rTotRow}`).value = { formula: `=SUM(F5:F${routingEndRow})` }
  routingSheet.getCell(`G${rTotRow}`).value = { formula: `=SUM(G5:G${routingEndRow})` }
  routingSheet.getCell(`H${rTotRow}`).value = { formula: `=SUM(H5:H${routingEndRow})` }

  rCols.forEach(col => {
    const cell = routingSheet.getCell(`${col}${rTotRow}`)
    cell.font = { name: FONT_NAME, size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    cell.border = borderThin
    if (['F', 'G', 'H'].includes(col)) cell.numFmt = '#,##0.0000'
  })


  // 4. BOM TAB
  const bomSheet = workbook.addWorksheet('BOM', { views: [{ showGridLines: true }] })
  bomSheet.columns = [
    { width: 18 }, { width: 30 }, { width: 12 }, { width: 16 }, { width: 10 },
    { width: 16 }, { width: 24 }, { width: 18 }
  ]

  bomSheet.mergeCells('A1:H1')
  const bTitle = bomSheet.getCell('A1')
  bTitle.value = 'BILL OF MATERIALS (BOM)'
  bTitle.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  bTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }

  const bHeaders = [
    'Code', 'Mat. Name', '%Loss', 'Consumption', 'Unit', 'Price (THB)', 'Source Ref', 'Mat. Cost/pc'
  ]
  bHeaders.forEach((th, i) => {
    const cell = bomSheet.getCell(`${rCols[i]}4`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center' }
    cell.border = borderThin
  })

  const bomItems = options.dataset?.bom || []
  for (let i = 0; i < bomCount; i++) {
    const item = bomItems[i] || {}
    const r = i + 5
    bomSheet.getCell(`A${r}`).value = item.code || ''
    bomSheet.getCell(`B${r}`).value = item.materialName || ''
    bomSheet.getCell(`C${r}`).value = item.lossRatio ?? null
    bomSheet.getCell(`D${r}`).value = item.consumption ?? null
    bomSheet.getCell(`E${r}`).value = item.unit || ''
    bomSheet.getCell(`F${r}`).value = item.price ?? null
    bomSheet.getCell(`G${r}`).value = item.sourceReference || ''

    bomSheet.getCell(`C${r}`).numFmt = '0.00%'
    bomSheet.getCell(`D${r}`).numFmt = '#,##0.0000'
    bomSheet.getCell(`F${r}`).numFmt = '#,##0.00'

    ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      const cell = bomSheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })

    bomSheet.getCell(`H${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), D${r}=0), 0, D${r} * F${r} * (1 + C${r}))`
    }
    bomSheet.getCell(`H${r}`).font = { name: FONT_NAME, size: 10, bold: true }
    bomSheet.getCell(`H${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    bomSheet.getCell(`H${r}`).border = borderThin
    bomSheet.getCell(`H${r}`).numFmt = '#,##0.0000'
  }

  // BOM Total Row
  const bTotRow = bomEndRow + 1
  bomSheet.getCell(`A${bTotRow}`).value = 'Total Material Cost'
  bomSheet.getCell(`H${bTotRow}`).value = { formula: `=SUM(H5:H${bomEndRow})` }

  rCols.forEach(col => {
    const cell = bomSheet.getCell(`${col}${bTotRow}`)
    cell.font = { name: FONT_NAME, size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    cell.border = borderThin
    if (col === 'H') cell.numFmt = '#,##0.0000'
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
