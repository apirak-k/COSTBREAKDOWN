import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import type { CostSnapshot } from '../src/core/types/snapshot.types.ts'
import { generateDynamicExcelTemplate } from '../src/services/excel/dynamic-excel-generator.ts'
import { parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser.ts'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export.ts'

async function verifyNeutralDatasetWorkbook(): Promise<void> {
const expectedSheets = ['META', 'PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING']
const workbook = XLSX.utils.book_new()
const addSheet = (name: string, rows: (string | number | null)[][]) => {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
}

addSheet('META', [
  ['MASTER DATA DATASET'],
  [],
  ['Remark'],
  ['Prepared from approved neutral schema']
])
addSheet('PRODUCT', [
  ['PRODUCT'],
  [],
  [],
  ['Product Code', 'Product Name', 'UOM', 'Note'],
  ['P-001', 'Fixture Product', 'PC', 'Product annotation']
])
addSheet('WORK_CENTER', [
  ['WORK_CENTER'],
  [],
  [],
  ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note'],
  ['WC-1', 'Cutting', 100, 50, 'Rate annotation']
])
addSheet('BOM', [
  ['BOM'],
  [],
  [],
  ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note'],
  ['MAT-1', 'Film', 2, 'SM', 10, 0.1, 'Material annotation']
])
addSheet('ROUTING', [
  ['ROUTING'],
  [],
  [],
  ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note'],
  ['10', 10, 'Cut', 'WC-1', 1, 100, 0.95, 'Operation annotation']
])

const inputBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
const imported = parseSnapshotWorkbookData(inputBytes, 'reference')
assert.equal(imported.success, true, imported.message)
assert.ok(imported.snapshot)
assert.equal(imported.snapshot.remark, 'Prepared from approved neutral schema')
assert.equal(imported.snapshot.product.productDescription, 'Fixture Product')
assert.equal(imported.snapshot.product.note, 'Product annotation')
assert.equal(imported.snapshot.rates[0].note, 'Rate annotation')
assert.equal(imported.snapshot.bom[0].note, 'Material annotation')
assert.equal(imported.snapshot.routing[0].note, 'Operation annotation')

const exportedBlob = await exportSnapshotToExcel(imported.snapshot)
const exportedWorkbook = XLSX.read(await exportedBlob.arrayBuffer(), { type: 'array' })
assert.deepEqual(exportedWorkbook.SheetNames, expectedSheets)

const headersFor = (sheetName: string, rowNumber: number) => {
  const rows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets[sheetName], {
    header: 1,
    range: rowNumber - 1,
    defval: null
  }) as unknown[][]
  return rows[0]?.map(value => String(value ?? ''))
}

assert.deepEqual(headersFor('META', 3), ['Remark'])
assert.deepEqual(headersFor('PRODUCT', 3), ['Product Code', 'Product Name', 'UOM', 'Note'])
assert.deepEqual(headersFor('WORK_CENTER', 3), ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note'])
assert.deepEqual(headersFor('BOM', 3), ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note'])
assert.deepEqual(headersFor('ROUTING', 3), ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note'])

const exportedValues = exportedWorkbook.SheetNames.flatMap(name => {
  const rows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
  return rows.flat().map(value => String(value ?? '').trim().toLowerCase())
})
for (const forbidden of ['id', 'confidence', 'source ref', 'snapshot id', 'effective date', 'customer / application', 'process code', 'reference', 'current']) {
  assert.equal(exportedValues.includes(forbidden), false, `neutral workbook must not expose ${forbidden}`)
}

const roundTrip = parseSnapshotWorkbookData(XLSX.write(exportedWorkbook, { type: 'array', bookType: 'xlsx' }), 'current')
assert.equal(roundTrip.success, true, roundTrip.message)
assert.equal(roundTrip.snapshot?.remark, imported.snapshot.remark)
assert.equal(roundTrip.snapshot?.product.productCode, imported.snapshot.product.productCode)
assert.equal(roundTrip.snapshot?.product.uom, imported.snapshot.product.uom)
assert.equal(roundTrip.snapshot?.product.note, imported.snapshot.product.note)
assert.deepEqual(
  {
    code: roundTrip.snapshot?.rates[0].workCenterCode,
    name: roundTrip.snapshot?.rates[0].description,
    labor: roundTrip.snapshot?.rates[0].laborRate,
    burden: roundTrip.snapshot?.rates[0].burdenRate
  },
  {
    code: imported.snapshot.rates[0].workCenterCode,
    name: imported.snapshot.rates[0].description,
    labor: imported.snapshot.rates[0].laborRate,
    burden: imported.snapshot.rates[0].burdenRate
  }
)
assert.equal(roundTrip.snapshot?.rates[0].note, imported.snapshot.rates[0].note)
assert.deepEqual(
  {
    code: roundTrip.snapshot?.bom[0].itemCode,
    description: roundTrip.snapshot?.bom[0].description,
    consumption: roundTrip.snapshot?.bom[0].consumption,
    unit: roundTrip.snapshot?.bom[0].unit,
    price: roundTrip.snapshot?.bom[0].price,
    loss: roundTrip.snapshot?.bom[0].loss
  },
  {
    code: imported.snapshot.bom[0].itemCode,
    description: imported.snapshot.bom[0].description,
    consumption: imported.snapshot.bom[0].consumption,
    unit: imported.snapshot.bom[0].unit,
    price: imported.snapshot.bom[0].price,
    loss: imported.snapshot.bom[0].loss
  }
)
assert.equal(roundTrip.snapshot?.bom[0].note, imported.snapshot.bom[0].note)
assert.deepEqual(
  {
    operationCode: roundTrip.snapshot?.routing[0].operationCode,
    sequence: roundTrip.snapshot?.routing[0].sequence,
    processName: roundTrip.snapshot?.routing[0].processName,
    workCenter: roundTrip.snapshot?.routing[0].workCenterId,
    manning: roundTrip.snapshot?.routing[0].manning,
    capacity: roundTrip.snapshot?.routing[0].capacity,
    yield: roundTrip.snapshot?.routing[0].yield
  },
  {
    operationCode: imported.snapshot.routing[0].operationCode,
    sequence: imported.snapshot.routing[0].sequence,
    processName: imported.snapshot.routing[0].processName,
    workCenter: imported.snapshot.routing[0].workCenterId,
    manning: imported.snapshot.routing[0].manning,
    capacity: imported.snapshot.routing[0].capacity,
    yield: imported.snapshot.routing[0].yield
  }
)
assert.equal(roundTrip.snapshot?.routing[0].note, imported.snapshot.routing[0].note)

const templateProduct = { ...imported.snapshot.product, note: 'Template Product Note' }
const templateSnapshot: CostSnapshot = { ...imported.snapshot, remark: 'Template Remark', product: templateProduct }
const template = await generateDynamicExcelTemplate({
  product: templateProduct,
  snapshot: templateSnapshot,
  wcCount: 0,
  bomCount: 0,
  routingCount: 0
})
const templateBytes = await template.arrayBuffer()
const templateWorkbook = XLSX.read(templateBytes, { type: 'array' })
assert.deepEqual(templateWorkbook.SheetNames, expectedSheets)
for (const sheetName of expectedSheets) {
  const legend = String(templateWorkbook.Sheets[sheetName].A2?.v ?? '')
  assert.match(legend, /yellow/i, `${sheetName} template must explain which cells are editable`)
  assert.match(legend, /unknown values blank/i, `${sheetName} template must explain how to leave unknown inputs`)
}
const styledTemplate = new ExcelJS.Workbook()
await styledTemplate.xlsx.load(Buffer.from(templateBytes))
assert.equal(styledTemplate.getWorksheet('WORK_CENTER')?.getCell('C5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('WORK_CENTER')?.getCell('D5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('C5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('E5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('F5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('B5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('E5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('F5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('G5').numFmt, '#,##0.0000')

const templateHeaders = (sheetName: string, headerRow: number) => {
  const rows = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[sheetName], {
    header: 1,
    range: headerRow - 1,
    defval: null
  }) as unknown[][]
  return rows[0]?.map(value => String(value ?? ''))
}
assert.deepEqual(templateHeaders('META', 3), ['Remark'])
assert.deepEqual(templateHeaders('PRODUCT', 4), ['Product Code', 'Product Name', 'UOM', 'Note'])
assert.equal(templateWorkbook.Sheets.PRODUCT['!autofilter']?.ref, 'A4:D5')
assert.deepEqual(templateHeaders('WORK_CENTER', 4), ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note'])
assert.deepEqual(templateHeaders('BOM', 4), ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note'])
assert.deepEqual(templateHeaders('ROUTING', 4), ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note'])

for (const sheetName of ['PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING']) {
  const range = XLSX.utils.decode_range(templateWorkbook.Sheets[sheetName]['!ref'] || 'A1:A1')
  assert.equal(range.e.r, 4, `${sheetName} template must contain exactly one row when sizing is clamped to the minimum`)
}
const templateRoundTrip = parseSnapshotWorkbookData(
  XLSX.write(templateWorkbook, { type: 'array', bookType: 'xlsx' }),
  'current'
)
assert.equal(templateRoundTrip.success, true, templateRoundTrip.message)
assert.equal(templateRoundTrip.snapshot?.remark, 'Template Remark')
assert.equal(templateRoundTrip.snapshot?.product.note, 'Template Product Note')

const templateValues = templateWorkbook.SheetNames.flatMap(name => {
  const rows = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
  return rows.flat().map(value => String(value ?? '').trim().toLowerCase())
})
for (const forbidden of ['id', 'confidence', 'source ref', 'snapshot id', 'effective date', 'customer / application', 'process code', 'reference', 'current', 'instructions']) {
  assert.equal(templateValues.includes(forbidden), false, `neutral template must not expose ${forbidden}`)
}

const configuredTemplate = await generateDynamicExcelTemplate({
  product: templateProduct,
  snapshot: templateSnapshot,
  wcCount: 2,
  bomCount: 3,
  routingCount: 4
})
const configuredWorkbookBytes = Buffer.from(await configuredTemplate.arrayBuffer())
const configuredExcelJs = new ExcelJS.Workbook()
await configuredExcelJs.xlsx.load(configuredWorkbookBytes)
const startingRows = (sheetName: string) => (configuredExcelJs.getWorksheet(sheetName)?.rowCount ?? 0) - 4
assert.equal(startingRows('WORK_CENTER'), 2)
assert.equal(startingRows('BOM'), 3)
assert.equal(startingRows('ROUTING'), 4)

console.log('Neutral dataset workbook verification passed.')
}

verifyNeutralDatasetWorkbook().catch(error => {
  console.error(error)
  process.exitCode = 1
})
