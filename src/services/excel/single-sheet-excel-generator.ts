import ExcelJS from 'exceljs'
import { WorkingDataset, DatasetMetadata } from '../../core/types/dataset-standard.types'


export interface SingleSheetTemplateOptions {
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

export async function generateSingleSheetDatasetExcel(options: SingleSheetTemplateOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown System'
  const sheet = workbook.addWorksheet('Dataset', { views: [{ showGridLines: true }] })

  sheet.columns = [
    { width: 20 }, // A
    { width: 28 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 16 }, // E
    { width: 16 }, // F
    { width: 16 }, // G
    { width: 18 }  // H
  ]

  let currentRow = 1

  // Title
  sheet.mergeCells(`A${currentRow}:H${currentRow}`)
  const titleCell = sheet.getCell(`A${currentRow}`)
  titleCell.value = 'COST BREAKDOWN WORKING DATASET'
  titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(currentRow).height = 30
  currentRow += 2

  // 1. METADATA SECTION
  sheet.mergeCells(`A${currentRow}:H${currentRow}`)
  const metaHeader = sheet.getCell(`A${currentRow}`)
  metaHeader.value = '1. METADATA'
  metaHeader.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  metaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }
  currentRow++

  const metaFields = [
    ['Product Code', options.dataset?.metadata.productCode || options.metadata?.productCode || ''],
    ['Product Name', options.dataset?.metadata.productName || options.metadata?.productName || ''],
    ['UOM', options.dataset?.metadata.uom || options.metadata?.uom || 'PC'],
    ['Remark', options.dataset?.metadata.remark || options.metadata?.remark || '']
  ]

  metaFields.forEach(([label, val]) => {

    sheet.getCell(`A${currentRow}`).value = label
    sheet.getCell(`A${currentRow}`).font = { name: FONT_NAME, size: 10, bold: true }
    sheet.getCell(`A${currentRow}`).border = borderThin

    sheet.mergeCells(`B${currentRow}:H${currentRow}`)
    const valCell = sheet.getCell(`B${currentRow}`)
    valCell.value = val
    valCell.font = { name: FONT_NAME, size: 10 }
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
    valCell.border = borderThin
    currentRow++
  })

  currentRow += 2


  // 2. WORK CENTER (WC) SECTION
  sheet.mergeCells(`A${currentRow}:H${currentRow}`)
  const wcHeader = sheet.getCell(`A${currentRow}`)
  wcHeader.value = '2. WORK CENTER (WC)'
  wcHeader.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  wcHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }
  currentRow++

  const wcTableHeaders = ['Process', 'Labor Rate (THB/hr)', 'Burden Rate (THB/hr)', 'Source Reference']
  const wcColWidths = ['A', 'B', 'C', 'D']

  wcTableHeaders.forEach((th, i) => {
    const cell = sheet.getCell(`${wcColWidths[i]}${currentRow}`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borderThin
  })
  currentRow++

  const wcStartRow = currentRow
  const wcRowsCount = options.dataset?.wc.length || options.wcCount || 5
  const wcItems = options.dataset?.wc || []

  for (let i = 0; i < wcRowsCount; i++) {
    const item = wcItems[i] || {}
    sheet.getCell(`A${currentRow}`).value = item.process || ''
    sheet.getCell(`B${currentRow}`).value = item.labor ?? null
    sheet.getCell(`C${currentRow}`).value = item.burden ?? null
    sheet.getCell(`D${currentRow}`).value = item.sourceReference || ''

    sheet.getCell(`B${currentRow}`).numFmt = '#,##0.00'
    sheet.getCell(`C${currentRow}`).numFmt = '#,##0.00'

    ;['A', 'B', 'C', 'D'].forEach(col => {
      const cell = sheet.getCell(`${col}${currentRow}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })
    currentRow++
  }
  const wcEndRow = currentRow - 1

  currentRow += 2

  // 3. ROUTING SECTION
  sheet.mergeCells(`A${currentRow}:H${currentRow}`)
  const routingHeader = sheet.getCell(`A${currentRow}`)
  routingHeader.value = '3. ROUTING & PROCESS COST'
  routingHeader.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  routingHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }
  currentRow++

  const routingHeaders = [
    'Process', 'Cap (pcs/hr)', 'Number (Manning)', 'Yield (%)', 'Source Ref',
    'Labor Cost/pc', 'Burden Cost/pc', 'Process Cost/pc'
  ]
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  routingHeaders.forEach((th, i) => {
    const cell = sheet.getCell(`${cols[i]}${currentRow}`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borderThin
  })
  currentRow++

  const routingStartRow = currentRow
  const routingRowsCount = options.dataset?.routing.length || options.routingCount || 8
  const routingItems = options.dataset?.routing || []

  for (let i = 0; i < routingRowsCount; i++) {
    const item = routingItems[i] || {}
    const r = currentRow

    sheet.getCell(`A${r}`).value = item.process || ''
    sheet.getCell(`B${r}`).value = item.capacity ?? null
    sheet.getCell(`C${r}`).value = item.number ?? null
    sheet.getCell(`D${r}`).value = item.yieldRatio ?? null
    sheet.getCell(`E${r}`).value = item.sourceReference || ''

    sheet.getCell(`B${r}`).numFmt = '#,##0'
    sheet.getCell(`C${r}`).numFmt = '#,##0.00'
    sheet.getCell(`D${r}`).numFmt = '0.00%'

    ;['A', 'B', 'C', 'D', 'E'].forEach(col => {
      const cell = sheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })

    // Calculated columns
    // Labor Cost/pc = (IFERROR(INDEX(WC_Labor, MATCH(Process, WC_Process, 0)), 0) * Number) / (Cap * Yield)
    sheet.getCell(`F${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), B${r}=0, D${r}=0), 0, (IFERROR(INDEX($B$${wcStartRow}:$B$${wcEndRow}, MATCH(A${r}, $A$${wcStartRow}:$A$${wcEndRow}, 0)), 0) * C${r}) / (B${r} * D${r}))`
    }
    // Burden Cost/pc
    sheet.getCell(`G${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), B${r}=0, D${r}=0), 0, (IFERROR(INDEX($C$${wcStartRow}:$C$${wcEndRow}, MATCH(A${r}, $A$${wcStartRow}:$A$${wcEndRow}, 0)), 0) * C${r}) / (B${r} * D${r}))`
    }
    // Process Cost/pc = Labor Cost + Burden Cost
    sheet.getCell(`H${r}`).value = {
      formula: `=F${r}+G${r}`
    }

    ;['F', 'G', 'H'].forEach(col => {
      const cell = sheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10, bold: col === 'H' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
      cell.border = borderThin
      cell.numFmt = '#,##0.0000'
    })

    currentRow++
  }
  const routingEndRow = currentRow - 1

  // Total Routing Row
  sheet.getCell(`A${currentRow}`).value = 'Total Processing Cost'
  sheet.getCell(`A${currentRow}`).font = { name: FONT_NAME, size: 10, bold: true }
  sheet.getCell(`F${currentRow}`).value = { formula: `=SUM(F${routingStartRow}:F${routingEndRow})` }
  sheet.getCell(`G${currentRow}`).value = { formula: `=SUM(G${routingStartRow}:G${routingEndRow})` }
  sheet.getCell(`H${currentRow}`).value = { formula: `=SUM(H${routingStartRow}:H${routingEndRow})` }

  const routingTotalLaborRef = `F${currentRow}`
  const routingTotalBurdenRef = `G${currentRow}`


  ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
    const cell = sheet.getCell(`${col}${currentRow}`)
    cell.font = { name: FONT_NAME, size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    cell.border = borderThin
    if (['F', 'G', 'H'].includes(col)) cell.numFmt = '#,##0.0000'
  })

  currentRow += 3

  // 4. BOM SECTION
  sheet.mergeCells(`A${currentRow}:H${currentRow}`)
  const bomHeader = sheet.getCell(`A${currentRow}`)
  bomHeader.value = '4. BILL OF MATERIALS (BOM)'
  bomHeader.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  bomHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }
  currentRow++

  const bomHeaders = [
    'Code', 'Mat. Name', '%Loss', 'Consumption', 'Unit', 'Price (THB)', 'Source Ref', 'Mat. Cost/pc'
  ]
  bomHeaders.forEach((th, i) => {
    const cell = sheet.getCell(`${cols[i]}${currentRow}`)
    cell.value = th
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borderThin
  })
  currentRow++

  const bomStartRow = currentRow
  const bomRowsCount = options.dataset?.bom.length || options.bomCount || 12
  const bomItems = options.dataset?.bom || []

  for (let i = 0; i < bomRowsCount; i++) {
    const item = bomItems[i] || {}
    const r = currentRow

    sheet.getCell(`A${r}`).value = item.code || ''
    sheet.getCell(`B${r}`).value = item.materialName || ''
    sheet.getCell(`C${r}`).value = item.lossRatio ?? null
    sheet.getCell(`D${r}`).value = item.consumption ?? null
    sheet.getCell(`E${r}`).value = item.unit || ''
    sheet.getCell(`F${r}`).value = item.price ?? null
    sheet.getCell(`G${r}`).value = item.sourceReference || ''

    sheet.getCell(`C${r}`).numFmt = '0.00%'
    sheet.getCell(`D${r}`).numFmt = '#,##0.0000'
    sheet.getCell(`F${r}`).numFmt = '#,##0.00'

    ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      const cell = sheet.getCell(`${col}${r}`)
      cell.font = { name: FONT_NAME, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } }
      cell.border = borderThin
    })

    // Mat. Cost/pc = Consumption * Price * (1 + %Loss)
    sheet.getCell(`H${r}`).value = {
      formula: `=IF(OR(ISBLANK(A${r}), D${r}=0), 0, D${r} * F${r} * (1 + C${r}))`
    }
    sheet.getCell(`H${r}`).font = { name: FONT_NAME, size: 10, bold: true }
    sheet.getCell(`H${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    sheet.getCell(`H${r}`).border = borderThin
    sheet.getCell(`H${r}`).numFmt = '#,##0.0000'

    currentRow++
  }
  const bomEndRow = currentRow - 1

  // Total BOM Row
  sheet.getCell(`A${currentRow}`).value = 'Total Material Cost'
  sheet.getCell(`H${currentRow}`).value = { formula: `=SUM(H${bomStartRow}:H${bomEndRow})` }
  const bomTotalMatRef = `H${currentRow}`

  ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
    const cell = sheet.getCell(`${col}${currentRow}`)
    cell.font = { name: FONT_NAME, size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    cell.border = borderThin
    if (col === 'H') cell.numFmt = '#,##0.0000'
  })

  currentRow += 3

  // 5. COST SUMMARY SECTION
  sheet.mergeCells(`A${currentRow}:D${currentRow}`)
  const summaryHeader = sheet.getCell(`A${currentRow}`)
  summaryHeader.value = '5. COST SUMMARY'
  summaryHeader.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_BG } }
  currentRow++

  const summaryItems = [
    ['Material Cost / pc', `=${bomTotalMatRef}`],
    ['Labor Cost / pc', `=${routingTotalLaborRef}`],
    ['Burden Cost / pc', `=${routingTotalBurdenRef}`],
  ]

  summaryItems.forEach(([label, formula]) => {
    sheet.getCell(`A${currentRow}`).value = label
    sheet.getCell(`A${currentRow}`).font = { name: FONT_NAME, size: 10, bold: true }
    sheet.getCell(`A${currentRow}`).border = borderThin

    sheet.mergeCells(`B${currentRow}:D${currentRow}`)
    const valCell = sheet.getCell(`B${currentRow}`)
    valCell.value = { formula }
    valCell.font = { name: FONT_NAME, size: 10, bold: true }
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } }
    valCell.border = borderThin
    valCell.numFmt = '#,##0.0000'
    currentRow++
  })

  // Standard Cost Total Row
  const totalRow = currentRow
  sheet.getCell(`A${totalRow}`).value = 'Standard Cost / pc'
  sheet.getCell(`A${totalRow}`).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  sheet.getCell(`A${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  sheet.getCell(`A${totalRow}`).border = borderThin

  sheet.mergeCells(`B${totalRow}:D${totalRow}`)
  const stdCostCell = sheet.getCell(`B${totalRow}`)
  stdCostCell.value = { formula: `=SUM(B${totalRow - 3}:B${totalRow - 1})` }
  stdCostCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_HEADER_TEXT } }
  stdCostCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
  stdCostCell.border = borderThin
  stdCostCell.numFmt = '#,##0.0000'

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
