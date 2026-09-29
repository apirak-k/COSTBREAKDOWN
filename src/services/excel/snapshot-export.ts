import type ExcelJS from 'exceljs'
import { CostSnapshot, ProductMaster } from '../../core'
import { excludeGeneratedSizingPlaceholders } from '../../core/utils/sizing'

const COLOR_DARK_NAVY = 'FF1E293B'
const COLOR_BORDER = 'FFE2E8F0'
const COLOR_WHITE = 'FFFFFFFF'

const fontTitle = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR_DARK_NAVY } }
const fontHeader = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } }
const fontData = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } }

const fillHeader = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_DARK_NAVY } }
const fillRow = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLOR_WHITE } }

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

function styleDataRow(row: ExcelJS.Row, columns: number, numericColumns: number[] = []): void {
  for (let column = 1; column <= columns; column += 1) {
    const cell = row.getCell(column)
    cell.fill = fillRow
    cell.font = fontData
    cell.border = borderThin
    if (numericColumns.includes(column)) cell.numFmt = '#,##0.0000'
  }
}

function writeRemarkSheet(sheet: ExcelJS.Worksheet, remark: string | undefined): void {
  sheet.columns = [{ width: 88 }]
  sheet.getCell('A1').value = 'MASTER DATA DATASET'
  sheet.getCell('A1').font = fontTitle
  sheet.getRow(3).values = ['Remark']
  styleHeaderRow(sheet.getRow(3), 1)
  sheet.getRow(4).values = [remark || '']
  styleDataRow(sheet.getRow(4), 1)
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeProductSheet(sheet: ExcelJS.Worksheet, product: ProductMaster): void {
  const headers = ['Product Code', 'Product Name', 'UOM', 'Note']
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 12 }, { width: 48 }]
  sheet.getCell('A1').value = 'PRODUCT'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:D1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)
  sheet.getRow(4).values = [product.productCode, product.productDescription, product.uom, product.note || '']
  styleDataRow(sheet.getRow(4), headers.length)
  sheet.autoFilter = 'A3:D4'
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeWorkCenterSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note']
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 16 }, { width: 16 }, { width: 48 }]
  sheet.getCell('A1').value = 'WORK_CENTER'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:E1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  excludeGeneratedSizingPlaceholders(snapshot.rates).forEach((rate, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [rate.workCenterCode, rate.description, rate.laborRate, rate.burdenRate, rate.note || '']
    styleDataRow(row, headers.length, [3, 4])
  })

  if (snapshot.rates.length > 0) sheet.autoFilter = `A3:E${snapshot.rates.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeBOMSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note']
  sheet.columns = [{ width: 18 }, { width: 36 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'BOM'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:G1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  excludeGeneratedSizingPlaceholders(snapshot.bom).forEach((item, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [item.itemCode, item.description, item.consumption, item.unit, item.price, item.loss, item.note || '']
    styleDataRow(row, headers.length, [3, 5, 6])
  })

  if (snapshot.bom.length > 0) sheet.autoFilter = `A3:G${snapshot.bom.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeRoutingSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note']
  sheet.columns = [{ width: 18 }, { width: 12 }, { width: 32 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'ROUTING'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:H1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  excludeGeneratedSizingPlaceholders(snapshot.routing).forEach((step, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [
      step.operationCode || '',
      step.sequence ?? null,
      step.processName,
      step.workCenterId || '',
      step.manning,
      step.capacity,
      step.yield,
      step.note || ''
    ]
    styleDataRow(row, headers.length, [2, 5, 6, 7])
  })

  if (snapshot.routing.length > 0) sheet.autoFilter = `A3:H${snapshot.routing.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

export async function exportSnapshotToExcel(snapshot: CostSnapshot): Promise<Blob> {
  const ExcelJS = (await import('exceljs/lib/exceljs.bare.js')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  writeRemarkSheet(workbook.addWorksheet('META', { views: [{ showGridLines: true }] }), snapshot.remark)
  writeProductSheet(workbook.addWorksheet('PRODUCT', { views: [{ showGridLines: true }] }), snapshot.product)
  writeWorkCenterSheet(workbook.addWorksheet('WORK_CENTER', { views: [{ showGridLines: true }] }), snapshot)
  writeBOMSheet(workbook.addWorksheet('BOM', { views: [{ showGridLines: true }] }), snapshot)
  writeRoutingSheet(workbook.addWorksheet('ROUTING', { views: [{ showGridLines: true }] }), snapshot)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
