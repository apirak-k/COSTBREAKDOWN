import ExcelJS from 'exceljs'
import { DynamicTemplateOptions } from '../../core'

const COLOR_DARK_NAVY = 'FF1E293B'
const COLOR_BORDER = 'FFE2E8F0'
const COLOR_WHITE = 'FFFFFFFF'
const COLOR_SOFT_YELLOW = 'FFFEF9C3'

const fontTitle = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontSection = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } }

const fillHeader = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_DARK_NAVY } }
const fillInput = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_SOFT_YELLOW } }

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

function writeRemarkSheet(sheet: ExcelJS.Worksheet, remark: string | undefined): void {
  sheet.columns = [{ width: 88 }]
  sheet.getCell('A1').value = 'MASTER DATA DATASET TEMPLATE'
  sheet.getCell('A1').font = fontTitle
  sheet.getRow(3).values = ['Remark']
  styleHeaderRow(sheet.getRow(3), 1)
  sheet.getCell('A4').value = remark || ''
  styleInputRow(sheet.getRow(4), 1)
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeProductSheet(sheet: ExcelJS.Worksheet, product?: DynamicTemplateOptions['product']): void {
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 12 }, { width: 48 }]
  sheet.getCell('A1').value = 'PRODUCT'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:D1')
  sheet.getCell('A3').value = 'Exactly one Product row is allowed.'
  sheet.getCell('A3').font = fontSection
  const headers = ['Product Code', 'Product Name', 'UOM', 'Note']
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  sheet.getRow(5).values = [product?.productCode || '', product?.productDescription || '', product?.uom || '', product?.note || '']
  styleInputRow(sheet.getRow(5), headers.length)
  sheet.autoFilter = 'A4:D5'
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeWorkCenterSheet(
  sheet: ExcelJS.Worksheet,
  count: number
): void {
  const headers = ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note']
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 16 }, { width: 16 }, { width: 48 }]
  sheet.getCell('A1').value = 'WORK_CENTER'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:E1')
  sheet.getCell('A3').value = 'Work Center rates for this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', null, null, '']
    styleInputRow(row, headers.length, [3, 4])
  }
  sheet.autoFilter = `A4:E${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeBOMSheet(sheet: ExcelJS.Worksheet, count: number): void {
  const headers = ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note']
  sheet.columns = [{ width: 18 }, { width: 36 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'BOM'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:G1')
  sheet.getCell('A3').value = 'Material inputs for this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', '', null, '', null, null, '']
    styleInputRow(row, headers.length, [3, 5, 6])
  }
  sheet.autoFilter = `A4:G${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

function writeRoutingSheet(sheet: ExcelJS.Worksheet, count: number): void {
  const headers = ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note']
  sheet.columns = [{ width: 18 }, { width: 12 }, { width: 32 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'ROUTING'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:H1')
  sheet.getCell('A3').value = 'Routing inputs linked to WORK_CENTER in this Dataset'
  sheet.getCell('A3').font = fontSection
  sheet.getRow(4).values = headers
  styleHeaderRow(sheet.getRow(4), headers.length)
  for (let index = 0; index < count; index += 1) {
    const row = sheet.getRow(index + 5)
    row.values = ['', null, '', '', null, null, null, '']
    styleInputRow(row, headers.length, [2, 5, 6, 7])
  }
  sheet.autoFilter = `A4:H${count + 4}`
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
}

export async function generateDynamicExcelTemplate(options: DynamicTemplateOptions): Promise<Blob> {
  const { product, snapshot } = options
  const wcCount = Math.max(1, Math.floor(options.wcCount ?? snapshot?.rates.length ?? 4))
  const bomCount = Math.max(1, Math.floor(options.bomCount ?? snapshot?.bom.length ?? 16))
  const routingCount = Math.max(1, Math.floor(options.routingCount ?? snapshot?.routing.length ?? 10))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  writeRemarkSheet(workbook.addWorksheet('META', { views: [{ showGridLines: true }] }), snapshot?.remark)
  writeProductSheet(workbook.addWorksheet('PRODUCT', { views: [{ showGridLines: true }] }), product)
  writeWorkCenterSheet(workbook.addWorksheet('WORK_CENTER', { views: [{ showGridLines: true }] }), wcCount)
  writeBOMSheet(workbook.addWorksheet('BOM', { views: [{ showGridLines: true }] }), bomCount)
  writeRoutingSheet(workbook.addWorksheet('ROUTING', { views: [{ showGridLines: true }] }), routingCount)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
