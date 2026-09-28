import ExcelJS from 'exceljs'
import { CostSnapshot, ProductMaster } from '../../core'

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

type AdditionalFieldRecord = { additionalFields?: Record<string, unknown> }
type ExcelScalar = string | number | boolean | Date | null

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-/]+/g, '')
}

function additionalHeaders(rows: AdditionalFieldRecord[], canonicalHeaders: string[]): string[] {
  const seen = new Set(canonicalHeaders.map(normalizedHeader))
  const headers: string[] = []
  rows.forEach(row => {
    Object.keys(row.additionalFields ?? {}).forEach(header => {
      const normalized = normalizedHeader(header)
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      headers.push(header)
    })
  })
  return headers
}

function scalarValue(value: unknown, header: string): ExcelScalar {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value
  throw new Error(`Cannot export non-scalar additional field "${header}".`)
}

function additionalValues(row: AdditionalFieldRecord, headers: string[]): ExcelScalar[] {
  return headers.map(header => scalarValue(row.additionalFields?.[header], header))
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

function writeKeyValueSheet(sheet: ExcelJS.Worksheet, values: Array<[string, unknown]>): void {
  sheet.columns = [{ width: 24 }, { width: 56 }]
  sheet.getCell('A1').value = 'MASTER DATA DATASET'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:B1')
  sheet.getRow(3).values = ['Key', 'Value']
  styleHeaderRow(sheet.getRow(3), 2)
  values.forEach(([key, value], index) => {
    const row = sheet.getRow(index + 4)
    row.values = [key, scalarValue(value, key)]
    styleDataRow(row, 2)
    row.getCell(1).font = { ...fontData, bold: true }
  })
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeProductSheet(sheet: ExcelJS.Worksheet, product: ProductMaster): void {
  const headers = ['Product Code', 'Product Description', 'UOM', 'Customer / Application', 'Effective Date']
  const extraHeaders = additionalHeaders([product], headers)
  sheet.columns = [
    { width: 22 }, { width: 34 }, { width: 12 }, { width: 28 }, { width: 18 },
    ...extraHeaders.map(() => ({ width: 24 }))
  ]
  sheet.getCell('A1').value = 'PRODUCT'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:E1')
  const outputHeaders = [...headers, ...extraHeaders]
  sheet.getRow(3).values = outputHeaders
  styleHeaderRow(sheet.getRow(3), outputHeaders.length)
  sheet.getRow(4).values = [
    product.productCode,
    product.productDescription,
    product.uom,
    product.customer,
    product.effectiveDate,
    ...additionalValues(product, extraHeaders)
  ]
  styleDataRow(sheet.getRow(4), outputHeaders.length)
  sheet.autoFilter = `A3:${sheet.getColumn(outputHeaders.length).letter}4`
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeWorkCenterSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['ID', 'Work Center Code', 'Description', 'Labor Rate', 'Burden Rate', 'Effective Date', 'Source Ref', 'Confidence']
  const extraHeaders = additionalHeaders(snapshot.rates, headers)
  sheet.columns = [
    { width: 18 }, { width: 22 }, { width: 34 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 28 }, { width: 16 },
    ...extraHeaders.map(() => ({ width: 24 }))
  ]
  sheet.getCell('A1').value = 'WORK_CENTER'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:H1')
  const outputHeaders = [...headers, ...extraHeaders]
  sheet.getRow(3).values = outputHeaders
  styleHeaderRow(sheet.getRow(3), outputHeaders.length)

  snapshot.rates.forEach((rate, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [
      rate.id,
      rate.workCenterCode,
      rate.description,
      rate.laborRate,
      rate.burdenRate,
      rate.effectiveDate,
      rate.sourceRef || '',
      '',
      ...additionalValues(rate, extraHeaders)
    ]
    styleDataRow(row, outputHeaders.length, [4, 5])
  })

  if (snapshot.rates.length > 0) {
    sheet.autoFilter = `A3:${sheet.getColumn(outputHeaders.length).letter}${snapshot.rates.length + 3}`
  }
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeBOMSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['ID', 'Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Source Ref', 'Confidence']
  const extraHeaders = additionalHeaders(snapshot.bom, headers)
  sheet.columns = [
    { width: 18 }, { width: 18 }, { width: 36 }, { width: 16 }, { width: 12 },
    { width: 16 }, { width: 14 }, { width: 28 }, { width: 16 },
    ...extraHeaders.map(() => ({ width: 24 }))
  ]
  sheet.getCell('A1').value = 'BOM'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:I1')
  const outputHeaders = [...headers, ...extraHeaders]
  sheet.getRow(3).values = outputHeaders
  styleHeaderRow(sheet.getRow(3), outputHeaders.length)

  snapshot.bom.forEach((item, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [
      item.id,
      item.itemCode,
      item.description,
      item.consumption,
      item.unit,
      item.price,
      item.loss,
      item.sourceRef || '',
      '',
      ...additionalValues(item, extraHeaders)
    ]
    styleDataRow(row, outputHeaders.length, [4, 6, 7])
  })

  if (snapshot.bom.length > 0) {
    sheet.autoFilter = `A3:${sheet.getColumn(outputHeaders.length).letter}${snapshot.bom.length + 3}`
  }
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

function writeRoutingSheet(sheet: ExcelJS.Worksheet, snapshot: CostSnapshot): void {
  const headers = ['ID', 'Operation Code', 'Sequence', 'Process Code', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Source Ref', 'Confidence']
  const extraHeaders = additionalHeaders(snapshot.routing, headers)
  sheet.columns = [
    { width: 18 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 32 },
    { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 28 }, { width: 16 },
    ...extraHeaders.map(() => ({ width: 24 }))
  ]
  sheet.getCell('A1').value = 'ROUTING'
  sheet.getCell('A1').font = fontTitle
  sheet.mergeCells('A1:K1')
  const outputHeaders = [...headers, ...extraHeaders]
  sheet.getRow(3).values = outputHeaders
  styleHeaderRow(sheet.getRow(3), outputHeaders.length)

  snapshot.routing.forEach((step, index) => {
    const row = sheet.getRow(index + 4)
    row.values = [
      step.id,
      step.operationCode || '',
      step.sequence ?? null,
      step.processCode || '',
      step.processName,
      step.workCenterId || '',
      step.manning,
      step.capacity,
      step.yield,
      step.sourceRef || '',
      '',
      ...additionalValues(step, extraHeaders)
    ]
    styleDataRow(row, outputHeaders.length, [3, 7, 8, 9])
  })

  if (snapshot.routing.length > 0) {
    sheet.autoFilter = `A3:${sheet.getColumn(outputHeaders.length).letter}${snapshot.routing.length + 3}`
  }
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

export async function exportSnapshotToExcel(snapshot: CostSnapshot, product?: ProductMaster): Promise<Blob> {
  const effectiveProduct = product || snapshot.product
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  const metaKeys = new Set([
    'format version', 'template version', 'version',
    'product code', 'productcode', 'code',
    'product description', 'productdescription', 'description', 'name',
    'uom', 'unit', 'customer', 'customer application',
    'source ref', 'sourceref', 'source',
    'effective date', 'effectivedate',
    'snapshot id', 'snapshotid', 'id', 'comparison role',
    'status', 'dataset status'
  ].map(normalizedHeader))
  const additionalMeta = Object.entries(snapshot.additionalFields ?? {})
    .filter(([key]) => !metaKeys.has(normalizedHeader(key)))
  writeKeyValueSheet(workbook.addWorksheet('META', { views: [{ showGridLines: true }] }), [
    ['Format Version', 'master-data-v1'],
    ['Snapshot ID', snapshot.id],
    ['Effective Date', snapshot.effectiveDate || effectiveProduct.effectiveDate || ''],
    ['Source Ref', snapshot.sourceRef || 'Working Dataset Export'],
    ...additionalMeta
  ])

  writeProductSheet(workbook.addWorksheet('PRODUCT', { views: [{ showGridLines: true }] }), effectiveProduct)
  writeWorkCenterSheet(workbook.addWorksheet('WORK_CENTER', { views: [{ showGridLines: true }] }), snapshot)
  writeBOMSheet(workbook.addWorksheet('BOM', { views: [{ showGridLines: true }] }), snapshot)
  writeRoutingSheet(workbook.addWorksheet('ROUTING', { views: [{ showGridLines: true }] }), snapshot)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
