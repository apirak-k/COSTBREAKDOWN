import ExcelJS from 'exceljs'
import {
  CostSnapshot,
  DynamicTemplateOptions
} from '../../core'

const COLOR_DARK_NAVY = 'FF1E293B'
const COLOR_BORDER = 'FFE2E8F0'
const COLOR_WHITE = 'FFFFFFFF'
const COLOR_SOFT_YELLOW = 'FFFEF9C3'
const COLOR_SOFT_BLUE = 'FFE0F2FE'

const fontTitle = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } }
const fontHint = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } }

const fillHeader = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_DARK_NAVY } }
const fillInput = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_SOFT_YELLOW } }
const fillHint = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_SOFT_BLUE } }

const borderThin = {
  top: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  left: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  right: { style: 'thin' as const, color: { argb: COLOR_BORDER } }
}

function styleHeaderRow(row: ExcelJS.Row, columns: number): void {
  for (let column = 1; column <= columns; column += 1) {
    const cell = row.getCell(column)
    cell.fill = fillHeader
    cell.font = fontHeader
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = borderThin
  }
}

function styleInputRow(row: ExcelJS.Row, columns: number, numericColumns: number[] = []): void {
  for (let column = 1; column <= columns; column += 1) {
    const cell = row.getCell(column)
    cell.fill = fillInput
    cell.font = fontData
    cell.border = borderThin
    if (numericColumns.includes(column)) cell.numFmt = '#,##0.0000'
  }
}

function writeKeyValueSheet(sheet: ExcelJS.Worksheet, values: Array<[string, string]>): void {
  sheet.columns = [{ width: 24 }, { width: 56 }]
  sheet.getCell('A1').value = 'MASTER DATA DATASET TEMPLATE'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:B1')
  sheet.getRow(3).values = ['Key', 'Value']
  styleHeaderRow(sheet.getRow(3), 2)
  values.forEach(([key, value], index) => {
    const row = sheet.getRow(index + 4)
    row.values = [key, value]
    styleInputRow(row, 2)
    row.getCell(1).font = { ...fontData, bold: true }
  })
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function sourceFor(snapshot: CostSnapshot | undefined, fallback: string | undefined): string {
  return snapshot?.sourceRef || fallback || ''
}



function writeInstructions(sheet: ExcelJS.Worksheet): void {
  sheet.columns = [{ width: 22 }, { width: 92 }]
  sheet.getCell('A1').value = 'HOW TO USE THIS MASTER DATA TEMPLATE'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:B1')
  const rows: Array<[string, string]> = [
    ['Scope', 'One workbook represents one Dataset (Reference or Current). Select the target side in the web page before importing.'],
    ['Product', 'Keep exactly one data row in PRODUCT. Product Code and description belong to this Dataset.'],
    ['Rows', 'Add or remove data rows as needed. Blank rows are ignored; do not create Base/Active columns.'],
    ['Missing data', 'Leave unknown values blank. Do not replace unknown values with 0; the web app records Missing/Invalid and shows a warning.'],
    ['Source', 'Enter the source file, system, or document in Source Ref so each value remains traceable.'],
    ['Routing link', 'Every Routing Work Center Code should match a Work Center Code in WORK_CENTER.'],
    ['Workflow', 'Import populates the selected dataset directly. You can edit, add rows, or compare immediately.']
  ]
  rows.forEach(([label, text], index) => {
    const row = sheet.getRow(index + 3)
    row.values = [label, text]
    row.getCell(1).font = { ...fontData, bold: true }
    row.getCell(2).font = fontHint
    for (let column = 1; column <= 2; column += 1) {
      row.getCell(column).fill = fillHint
      row.getCell(column).border = borderThin
      row.getCell(column).alignment = { vertical: 'top', wrapText: true }
    }
    row.height = 32
  })
  sheet.views = [{ state: 'frozen', ySplit: 2 }]
}

function writeProductSheet(sheet: ExcelJS.Worksheet, product?: DynamicTemplateOptions['product']): void {
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 12 }, { width: 28 }, { width: 18 }]
  sheet.getCell('A1').value = 'PRODUCT'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:E1')
  sheet.getCell('A3').value = 'Exactly one Product row is allowed.'
  sheet.getCell('A3').font = fontSection
  const headers = ['Product Code', 'Product Description', 'UOM', 'Customer / Application', 'Effective Date']
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  sheet.getRow(5).values = [product?.productCode || '', product?.productDescription || '', product?.uom || '', product?.customer || '', product?.effectiveDate || '']
  styleInputRow(sheet.getRow(5), headers.length)
  sheet.autoFilter = 'A4:E5'
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeWorkCenterSheet(
  sheet: ExcelJS.Worksheet,
  count: number
): void {
  const headers = ['ID', 'Work Center Code', 'Description', 'Labor Rate', 'Burden Rate', 'Effective Date', 'Source Ref', 'Confidence']
  sheet.columns = [
    { width: 18 }, { width: 22 }, { width: 34 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 28 }, { width: 16 }
  ]
  sheet.getCell('A1').value = 'WORK_CENTER'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:H1')
  sheet.getCell('A3').value = 'Work Center rates for this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', '', null, null, '', '', '']
    styleInputRow(row, headers.length, [4, 5])
  }
  sheet.autoFilter = `A4:H${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeBOMSheet(sheet: ExcelJS.Worksheet, count: number): void {
  const headers = ['ID', 'Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Source Ref', 'Confidence']
  sheet.columns = [
    { width: 18 }, { width: 18 }, { width: 36 }, { width: 16 }, { width: 12 },
    { width: 16 }, { width: 14 }, { width: 28 }, { width: 16 }
  ]
  sheet.getCell('A1').value = 'BOM'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:I1')
  sheet.getCell('A3').value = 'Material inputs for this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', '', null, '', null, null, '', '']
    styleInputRow(row, headers.length, [4, 6, 7])
  }
  sheet.autoFilter = `A4:I${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeRoutingSheet(sheet: ExcelJS.Worksheet, count: number): void {
  const headers = ['ID', 'Operation Code', 'Sequence', 'Process Code', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Source Ref', 'Confidence']
  sheet.columns = [
    { width: 18 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 32 },
    { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 28 }, { width: 16 }
  ]
  sheet.getCell('A1').value = 'ROUTING'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:K1')
  sheet.getCell('A3').value = 'Routing inputs linked to WORK_CENTER in this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', null, '', '', '', null, null, null, '', '']
    styleInputRow(row, headers.length, [3, 7, 8, 9])
  }
  sheet.autoFilter = `A4:K${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeAdditionalDataSheet(sheet: ExcelJS.Worksheet): void {
  const headers = ['Key', 'Value', 'Source Ref', 'Notes']
  sheet.columns = [{ width: 26 }, { width: 42 }, { width: 28 }, { width: 54 }]
  sheet.getCell('A1').value = 'ADDITIONAL_DATA'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:D1')
  sheet.getCell('A3').value = 'Optional non-calculation fields; keep extra costing logic in Simulation/Calculation pages.'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < 5; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', '', '']
    styleInputRow(row, headers.length)
  }
  sheet.autoFilter = 'A4:D9'
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

export async function generateDynamicExcelTemplate(options: DynamicTemplateOptions): Promise<Blob> {
  const { product, snapshot } = options
  const wcCount = Math.max(1, options.wcCount ?? snapshot?.rates.length ?? 4)
  const bomCount = Math.max(1, options.bomCount ?? snapshot?.bom.length ?? 16)
  const routingCount = Math.max(1, options.routingCount ?? snapshot?.routing.length ?? 10)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  writeInstructions(workbook.addWorksheet('INSTRUCTIONS', { views: [{ showGridLines: true }] }))
  writeKeyValueSheet(workbook.addWorksheet('META', { views: [{ showGridLines: true }] }), [
    ['Format Version', 'master-data-v1'],
    ['Snapshot ID', snapshot?.id || `${product?.productCode || 'PRODUCT'}-dataset`],
    ['Status', 'draft'],
    ['Effective Date', snapshot?.effectiveDate || product?.effectiveDate || ''],
    ['Source Ref', sourceFor(snapshot, '')],
    ['Notes', '']
  ])
  writeProductSheet(workbook.addWorksheet('PRODUCT', { views: [{ showGridLines: true }] }), product)
  writeWorkCenterSheet(workbook.addWorksheet('WORK_CENTER', { views: [{ showGridLines: true }] }), wcCount)
  writeBOMSheet(workbook.addWorksheet('BOM', { views: [{ showGridLines: true }] }), bomCount)
  writeRoutingSheet(workbook.addWorksheet('ROUTING', { views: [{ showGridLines: true }] }), routingCount)
  writeAdditionalDataSheet(workbook.addWorksheet('ADDITIONAL_DATA', { views: [{ showGridLines: true }] }))

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
