import type ExcelJS from 'exceljs'
import { CostSnapshot, ProductMaster } from '../../core'
import { excludeGeneratedSizingPlaceholders } from '../../core/utils/sizing'
import { loadExcelJS } from './exceljs-runtime'

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

function styleDataRow(row: ExcelJS.Row, columns: number, numericColumns: number[] = [], fractionPercentColumns: number[] = []): void {
  for (let column = 1; column <= columns; column += 1) {
    const cell = row.getCell(column)
    cell.fill = fillRow
    cell.font = fontData
    cell.border = borderThin
    if (numericColumns.includes(column)) cell.numFmt = '#,##0.0000'
    if (fractionPercentColumns.includes(column)) cell.numFmt = '0.00%'
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
  const headers = ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)']
  sheet.columns = [{ width: 34 }, { width: 12 }, { width: 18 }, { width: 28 }]
  sheet.getCell('A1').value = 'PRODUCT'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:D1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)
  sheet.getRow(4).values = [product.productName || product.productDescription, product.uom, product.sellingPrice ?? null, product.sgaPercent ?? null]
  styleDataRow(sheet.getRow(4), headers.length, [3])
  sheet.getCell('D4').numFmt = '0.00"%"'
  sheet.autoFilter = 'A3:D4'
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeWorkCenterSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['WC', 'Labor', 'Burden', 'Note']
  const rates = excludeGeneratedSizingPlaceholders(snapshot.rates)
  sheet.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 48 }]
  sheet.getCell('A1').value = 'WORK_CENTER'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:D1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  rates.forEach((rate, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note || '']
    styleDataRow(row, headers.length, [2, 3])
  })

  if (rates.length > 0) sheet.autoFilter = `A3:D${rates.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeBOMSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']
  const items = excludeGeneratedSizingPlaceholders(snapshot.bom)
  sheet.columns = [{ width: 36 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'BOM'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:F1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  items.forEach((item, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [item.description || item.itemCode, item.consumption, item.unit, item.price, item.loss, item.note || '']
    styleDataRow(row, headers.length, [2, 4], [5])
  })

  if (items.length > 0) sheet.autoFilter = `A3:F${items.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeRoutingSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']
  const steps = excludeGeneratedSizingPlaceholders(snapshot.routing)
  sheet.columns = [{ width: 32 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 48 }]
  sheet.getCell('A1').value = 'ROUTING'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:F1')
  sheet.getRow(3).values = headers
  styleHeaderRow(sheet.getRow(3), headers.length)

  steps.forEach((step, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [
      step.processName,
      step.workCenterId || '',
      step.manning,
      step.capacity,
      step.yield,
      step.note || ''
    ]
    styleDataRow(row, headers.length, [3, 4], [5])
  })

  if (steps.length > 0) sheet.autoFilter = `A3:F${steps.length + 3}`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

export async function exportSnapshotToExcel(snapshot: CostSnapshot): Promise<Blob> {
  const ExcelJS = await loadExcelJS()
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
