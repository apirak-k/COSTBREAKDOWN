import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import type { CostSnapshot } from '../src/core/types/snapshot.types.ts'
import { generateDynamicExcelTemplate } from '../src/services/excel/dynamic-excel-generator.ts'
import { parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser.ts'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export.ts'

async function verifyNeutralDatasetWorkbook(): Promise<void> {
const dataSheets = ['META', 'BOM', 'ROUTING', 'WORK_CENTER']
const expectedSheets = [...dataSheets, 'COST_CALCULATION']
const workbook = XLSX.utils.book_new()
const addSheet = (name: string, rows: (string | number | null)[][]) => {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
}

addSheet('META', [
  ['MASTER DATA DATASET'],
  [],
  ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)', 'Dataset Remark'],
  ['Fixture Product', 'PC', 123.5, 8, 'Prepared from approved neutral schema']
])
addSheet('WORK_CENTER', [
  ['WORK_CENTER'],
  [],
  [],
  ['WC', 'Labor', 'Burden', 'Note'],
  ['WC-1', 100, 50, 'Rate annotation']
])
addSheet('BOM', [
  ['BOM'],
  [],
  [],
  ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  ['Film', 2, 'SM', 10, 0.1, 'Material annotation']
])
addSheet('ROUTING', [
  ['ROUTING'],
  [],
  [],
  ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Cut', 'WC-1', 1, 100, 0.95, 'Operation annotation']
])

const inputBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
const imported = parseSnapshotWorkbookData(inputBytes, 'reference')
assert.equal(imported.success, true, imported.message)
assert.ok(imported.snapshot)
assert.equal(imported.snapshot.remark, 'Prepared from approved neutral schema')
assert.equal(imported.snapshot.product.productName, 'Fixture Product')
assert.equal(imported.snapshot.product.uom, 'PC')
assert.equal(imported.snapshot.product.sellingPrice, 123.5)
assert.equal(imported.snapshot.product.sgaPercent, 8)
assert.equal(imported.snapshot.rates[0].note, 'Rate annotation')
assert.equal(imported.snapshot.bom[0].note, 'Material annotation')
assert.equal(imported.snapshot.routing[0].note, 'Operation annotation')

const legacyWorkbook = XLSX.utils.book_new()
const addLegacySheet = (name: string, rows: (string | number | null)[][]) => {
  XLSX.utils.book_append_sheet(legacyWorkbook, XLSX.utils.aoa_to_sheet(rows), name)
}
addLegacySheet('META', [['MASTER DATA DATASET'], [], ['Remark'], ['Legacy workbook remains importable']])
addLegacySheet('PRODUCT', [
  ['PRODUCT'], [], [],
  ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)'],
  ['Legacy Product', 'PC', 50, 4]
])
addLegacySheet('BOM', [['BOM'], [], [], ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'], ['Legacy material', 1, 'PC', 5, 0, '']])
addLegacySheet('ROUTING', [['ROUTING'], [], [], ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'], ['Legacy process', 'WC-1', 1, 100, 1, '']])
addLegacySheet('WORK_CENTER', [['WORK_CENTER'], [], [], ['WC', 'Labor', 'Burden', 'Note'], ['WC-1', 10, 5, '']])
const legacyImport = parseSnapshotWorkbookData(XLSX.write(legacyWorkbook, { type: 'array', bookType: 'xlsx' }), 'reference')
assert.equal(legacyImport.success, true, legacyImport.message)
assert.equal(legacyImport.snapshot?.product.productName, 'Legacy Product')
assert.equal(legacyImport.snapshot?.remark, 'Legacy workbook remains importable')

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

assert.deepEqual(headersFor('META', 3), ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)', 'Dataset Remark'])
assert.deepEqual(headersFor('WORK_CENTER', 3), ['WC', 'Labor', 'Burden', 'Note'])
assert.deepEqual(headersFor('BOM', 3), ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
assert.deepEqual(headersFor('ROUTING', 3), ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])

const exportedValues = exportedWorkbook.SheetNames.flatMap(name => {
  const rows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
  return rows.flat().map(value => String(value ?? '').trim().toLowerCase())
})
for (const forbidden of ['id', 'confidence', 'source ref', 'snapshot id', 'effective date', 'customer / application', 'product code', 'process code', 'reference', 'current']) {
  assert.equal(exportedValues.includes(forbidden), false, `neutral workbook must not expose ${forbidden}`)
}

const roundTrip = parseSnapshotWorkbookData(XLSX.write(exportedWorkbook, { type: 'array', bookType: 'xlsx' }), 'current')
assert.equal(roundTrip.success, true, roundTrip.message)
assert.equal(roundTrip.snapshot?.rates.length, imported.snapshot.rates.length)
assert.equal(roundTrip.snapshot?.bom.length, imported.snapshot.bom.length)
assert.equal(roundTrip.snapshot?.routing.length, imported.snapshot.routing.length)
assert.equal(roundTrip.snapshot?.remark, imported.snapshot.remark)
assert.equal(roundTrip.snapshot?.product.productName, imported.snapshot.product.productName)
assert.equal(roundTrip.snapshot?.product.uom, imported.snapshot.product.uom)
assert.equal(roundTrip.snapshot?.product.sellingPrice, imported.snapshot.product.sellingPrice)
assert.equal(roundTrip.snapshot?.product.sgaPercent, imported.snapshot.product.sgaPercent)
assert.deepEqual(
  {
    code: roundTrip.snapshot?.rates[0].workCenterCode,
    labor: roundTrip.snapshot?.rates[0].laborRate,
    burden: roundTrip.snapshot?.rates[0].burdenRate
  },
  {
    code: imported.snapshot.rates[0].workCenterCode,
    labor: imported.snapshot.rates[0].laborRate,
    burden: imported.snapshot.rates[0].burdenRate
  }
)
assert.equal(roundTrip.snapshot?.rates[0].note, imported.snapshot.rates[0].note)
assert.deepEqual(
  {
    name: roundTrip.snapshot?.bom[0].description,
    consumption: roundTrip.snapshot?.bom[0].consumption,
    unit: roundTrip.snapshot?.bom[0].unit,
    price: roundTrip.snapshot?.bom[0].price,
    loss: roundTrip.snapshot?.bom[0].loss
  },
  {
    name: imported.snapshot.bom[0].description,
    consumption: imported.snapshot.bom[0].consumption,
    unit: imported.snapshot.bom[0].unit,
    price: imported.snapshot.bom[0].price,
    loss: imported.snapshot.bom[0].loss
  }
)
assert.equal(roundTrip.snapshot?.bom[0].note, imported.snapshot.bom[0].note)
assert.deepEqual(
  {
    processName: roundTrip.snapshot?.routing[0].processName,
    workCenter: roundTrip.snapshot?.routing[0].workCenterId,
    manning: roundTrip.snapshot?.routing[0].manning,
    capacity: roundTrip.snapshot?.routing[0].capacity,
    yield: roundTrip.snapshot?.routing[0].yield
  },
  {
    processName: imported.snapshot.routing[0].processName,
    workCenter: imported.snapshot.routing[0].workCenterId,
    manning: imported.snapshot.routing[0].manning,
    capacity: imported.snapshot.routing[0].capacity,
    yield: imported.snapshot.routing[0].yield
  }
)
assert.equal(roundTrip.snapshot?.routing[0].note, imported.snapshot.routing[0].note)

const exportedFormulaWorkbook = new ExcelJS.Workbook()
await exportedFormulaWorkbook.xlsx.load(Buffer.from(await exportedBlob.arrayBuffer()))
const calculationSheet = exportedFormulaWorkbook.getWorksheet('COST_CALCULATION')
const formulaAt = (address: string) => (calculationSheet?.getCell(address).value as { formula?: string })?.formula ?? ''
assert.match(formulaAt('B6'), /SUM\(F14:F14\)/, 'Material summary must sum linked BOM formulas')
assert.match(formulaAt('B7'), /SUM\(G19:G19\)/, 'Labor summary must sum linked Routing formulas')
assert.match(formulaAt('B9'), /SUM\(B6:B8\)/, 'Total Standard Cost must be a formula')
assert.match(formulaAt('F14'), /BOM!B4\*BOM!D4\*\(1\+BOM!E4\)/, 'Material formula must link Usage, Price, and Loss')
assert.match(formulaAt('G19'), /ROUTING!C4\/\(ROUTING!D4\*ROUTING!E4\)/, 'Labor formula must link Manning, Capacity, and Yield')
assert.match(formulaAt('G19'), /COUNTIF\(/, 'Work Center matching must reject missing or duplicate rate keys')

const templateProduct = { ...imported.snapshot.product, productName: 'Template Product' }
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
for (const sheetName of dataSheets) {
  const legend = String(templateWorkbook.Sheets[sheetName].A2?.v ?? '')
  assert.match(legend, /yellow/i, `${sheetName} template must explain which cells are editable`)
  assert.match(legend, /unknown values blank/i, `${sheetName} template must explain how to leave unknown inputs`)
}
assert.match(String(templateWorkbook.Sheets.WORK_CENTER.A2?.v ?? ''), /gray row 3.*example.*not imported/i)
const styledTemplate = new ExcelJS.Workbook()
await styledTemplate.xlsx.load(Buffer.from(templateBytes))
const workCenterExample = styledTemplate.getWorksheet('WORK_CENTER')
assert.deepEqual(workCenterExample?.getRow(3).values.slice(1), [
  'WC-EXAMPLE',
  125.5,
  31.25,
  'Example only; not imported'
])
assert.equal(workCenterExample?.getCell('A3').fill.fgColor?.argb, 'FFF1F5F9')
for (const [sheetName, address] of [
  ['META', 'A4'],
  ['WORK_CENTER', 'A5'],
  ['BOM', 'A5'],
  ['ROUTING', 'A5']
] as const) {
  assert.equal(
    styledTemplate.getWorksheet(sheetName)?.getCell(address).fill.fgColor?.argb,
    'FFFEF9C3',
    `${sheetName}.${address} must remain a yellow editable input cell`
  )
}
for (const sheetName of ['WORK_CENTER', 'BOM', 'ROUTING'] as const) {
  const inputRow = styledTemplate.getWorksheet(sheetName)?.getRow(5)
  for (let column = 1; column <= (inputRow?.cellCount ?? 0); column += 1) {
    const value = inputRow?.getCell(column).value
    assert.ok(value === null || value === undefined || value === '', `${sheetName} input row must start blank`)
  }
}
assert.equal(styledTemplate.getWorksheet('WORK_CENTER')?.getCell('B5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('WORK_CENTER')?.getCell('C5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('B5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('D5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('BOM')?.getCell('E5').numFmt, '0.00%')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('C5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('D5').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('ROUTING')?.getCell('E5').numFmt, '0.00%')
assert.equal(styledTemplate.getWorksheet('META')?.getCell('C4').numFmt, '#,##0.0000')
assert.equal(styledTemplate.getWorksheet('META')?.getCell('D4').numFmt, '0.00"%"')

const templateHeaders = (sheetName: string, headerRow: number) => {
  const rows = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[sheetName], {
    header: 1,
    range: headerRow - 1,
    defval: null
  }) as unknown[][]
  return rows[0]?.map(value => String(value ?? ''))
}
assert.deepEqual(templateHeaders('META', 3), ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)', 'Dataset Remark'])
assert.equal(templateWorkbook.Sheets.META['!autofilter']?.ref, 'A3:E4')
assert.deepEqual(templateHeaders('WORK_CENTER', 4), ['WC', 'Labor', 'Burden', 'Note'])
assert.deepEqual(templateHeaders('BOM', 4), ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
assert.deepEqual(templateHeaders('ROUTING', 4), ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])

for (const sheetName of ['META', 'WORK_CENTER', 'BOM', 'ROUTING']) {
  const range = XLSX.utils.decode_range(templateWorkbook.Sheets[sheetName]['!ref'] || 'A1:A1')
  assert.equal(range.e.r, sheetName === 'META' ? 3 : 4, `${sheetName} template must contain exactly one row when sizing is clamped to the minimum`)
}

const templateCalculationSheet = styledTemplate.getWorksheet('COST_CALCULATION')
assert.equal((templateCalculationSheet?.getCell('B9').value as { formula?: string })?.formula?.includes('SUM(B6:B8)'), true)
assert.equal((templateCalculationSheet?.getCell('F14').value as { formula?: string })?.formula?.includes('BOM!B5'), true)
assert.equal((templateCalculationSheet?.getCell('G19').value as { formula?: string })?.formula?.includes('ROUTING!C5'), true)
const templateRoundTrip = parseSnapshotWorkbookData(
  XLSX.write(templateWorkbook, { type: 'array', bookType: 'xlsx' }),
  'current'
)
assert.equal(templateRoundTrip.success, true, templateRoundTrip.message)
assert.equal(templateRoundTrip.snapshot?.remark, 'Template Remark')
assert.equal(templateRoundTrip.snapshot?.product.productName, 'Template Product')
assert.equal(templateRoundTrip.snapshot?.rates.length, 0)
assert.equal(templateRoundTrip.snapshot?.bom.length, 0)
assert.equal(templateRoundTrip.snapshot?.routing.length, 0)

const templateValues = dataSheets.flatMap(name => {
  const rows = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
  return rows.flat().map(value => String(value ?? '').trim().toLowerCase())
})
for (const forbidden of [
  'id', 'confidence', 'source ref', 'snapshot id', 'effective date', 'customer / application',
  'product code', 'work center code', 'work center name', 'labor rate', 'burden rate',
  'item code', 'description', 'operation code', 'sequence', 'process code', 'capacity',
  'reference', 'current', 'instructions'
]) {
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
