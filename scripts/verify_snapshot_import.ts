import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import {
  parseSnapshotExcelInputFile,
  parseSnapshotWorkbookData
} from '../src/services/excel/snapshot-parser'
import { generateDynamicExcelTemplate } from '../src/services/excel/dynamic-excel-generator'

function sheet(rows: (string | number | null)[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows)
}

function metaSheet(productName: string, uom: string, sellingPrice: number | null, sgaPercent: number | null, remark: string) {
  return sheet([
    ['META'], [],
    ['PRODUCT NAME', productName], ['UOM', uom], ['SELLING PRICE', sellingPrice],
    ['SG&A %', sgaPercent], ['DATASET REMARK', remark], [],
    ['MAT', 999999], ['LABOR', 999999], ['BURDEN', 999999],
    ['STANDARD COST', 999999], ['SG&A AMOUNT', 999999], ['OP', 999999]
  ])
}

function tableSheet(title: string, headers: string[], ...rows: (string | number | null)[][]) {
  return sheet([[title], [], headers, ...rows])
}

const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, metaSheet('Test Product', 'PC', 123.5, 8, 'Imported dataset'), 'META')
XLSX.utils.book_append_sheet(workbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note'],
  ['WC-1', 100, 50, 'Cutting'], ['WC-2', 90, null, 'Assembly']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(workbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  ['Material 1', 2, 'PC', 10, 0.1, ''], ['Material 2', 2, 'PC', null, null, '']), 'BOM')
XLSX.utils.book_append_sheet(workbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Cut', 'WC-1', 1, 100, 0.9, ''], ['Print', 'WC-2', 1, 80, 0.95, '']), 'ROUTING')

const result = parseSnapshotWorkbookData(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), 'current')

const workbookBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
assert.equal(result.success, true)
assert.equal(result.format, 'canonical')
assert.equal(result.snapshot?.comparisonRole, 'current')
assert.equal(result.snapshot?.product.productName, 'Test Product')
assert.equal(result.snapshot?.product.uom, 'PC')
assert.equal(result.snapshot?.product.sellingPrice, 123.5)
assert.equal(result.snapshot?.product.sgaPercent, 8)
assert.equal(result.snapshot?.remark, 'Imported dataset')
assert.equal(result.snapshot?.rates.length, 2)
assert.equal(result.snapshot?.rates[1].burdenRate, null)
assert.equal(result.snapshot?.rates[1].confidence.burdenRate.status, 'missing')
assert.equal(result.snapshot?.rates[1].confidence.burdenRate.quality, 'missing')
assert.equal(result.snapshot?.rates[1].confidence.laborRate.status, 'estimated')
assert.equal(result.snapshot?.bom[1].price, null)
assert.equal(result.snapshot?.bom[1].confidence.price.status, 'missing')
assert.equal(result.snapshot?.routing[0].workCenterId, 'WC-1')
assert.equal(result.snapshot?.routing[0].processName, 'Cut')
assert.equal(result.snapshot?.routing[1].id, 'Print')
assert.equal(result.snapshot?.routing[1].operationCode, undefined)
assert.ok(result.warnings.some(warning => warning.includes('Missing Burden at row 5')))

const customResult = parseSnapshotWorkbookData(workbookBytes, 'custom')
assert.equal(customResult.success, true, 'Custom accepts the canonical dataset workbook')
assert.equal(customResult.role, 'custom')
assert.equal(customResult.snapshot?.comparisonRole, undefined, 'Custom imports stay outside the CBD comparison pair')
assert.equal(customResult.snapshot?.product.productName, 'Test Product')

const incompleteIdentityWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(incompleteIdentityWorkbook, metaSheet('Incomplete Product', 'PC', null, null, ''), 'META')
XLSX.utils.book_append_sheet(incompleteIdentityWorkbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note'],
  ['', 120, 45, 'Needs a Work Center identity']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(incompleteIdentityWorkbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  ['', 2, 'PC', 10, 0.05, 'Needs a BOM identity']), 'BOM')
XLSX.utils.book_append_sheet(incompleteIdentityWorkbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Cutting', 'WC-1', 1, 100, 1, '']), 'ROUTING')
const incompleteIdentityResult = parseSnapshotWorkbookData(
  XLSX.write(incompleteIdentityWorkbook, { type: 'array', bookType: 'xlsx' }),
  'current'
)
assert.equal(incompleteIdentityResult.success, true, incompleteIdentityResult.message)
assert.equal(incompleteIdentityResult.snapshot?.rates.length, 1, 'a Work Center row with data but no key must be retained')
assert.equal(incompleteIdentityResult.snapshot?.rates[0].workCenterCode, 'Work Center 1', 'a blank Work Center key receives its effective generated identity')
assert.equal(incompleteIdentityResult.snapshot?.bom.length, 1, 'a BOM row with data but no key must be retained')
assert.equal(incompleteIdentityResult.snapshot?.bom[0].itemCode, '')
assert.equal(incompleteIdentityResult.snapshot?.bom[0].description, 'Material 1', 'a blank BOM identity receives its effective generated identity')

const duplicateRoutingWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(duplicateRoutingWorkbook, metaSheet('Duplicate Routing Test', 'PC', null, null, ''), 'META')
XLSX.utils.book_append_sheet(duplicateRoutingWorkbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note'],
  ['WC-1', 100, 50, 'Cutting']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(duplicateRoutingWorkbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']), 'BOM')
XLSX.utils.book_append_sheet(duplicateRoutingWorkbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Cutting', 'WC-1', 1, 100, 1, 'First route'],
  ['Cutting', 'WC-1', 1, 100, 1, 'Duplicate business identity']), 'ROUTING')
const duplicateRoutingResult = parseSnapshotWorkbookData(
  XLSX.write(duplicateRoutingWorkbook, { type: 'array', bookType: 'xlsx' }),
  'current'
)
assert.equal(duplicateRoutingResult.success, true, duplicateRoutingResult.message)
const duplicateRoutingRows = duplicateRoutingResult.snapshot?.routing ?? []
assert.equal(duplicateRoutingRows.length, 2)
assert.equal(duplicateRoutingRows[0].processName, 'Cutting')
assert.equal(duplicateRoutingRows[1].processName, 'Cutting(1)', 'an imported duplicate identity receives the next suffix')
assert.equal(duplicateRoutingRows[1].autoRenamedFrom, 'Cutting')
assert.notEqual(duplicateRoutingRows[0].id, duplicateRoutingRows[1].id, 'duplicate business keys still need distinct internal row IDs')
assert.equal(new Set(duplicateRoutingRows.map(row => row.id)).size, 2)

// Blank Product Name uses the finalized effective default without a warning.
const startingDataWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(startingDataWorkbook, metaSheet('', 'PC', null, null, 'Starting data with incomplete Product Name'), 'META')
XLSX.utils.book_append_sheet(startingDataWorkbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(startingDataWorkbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']), 'BOM')
XLSX.utils.book_append_sheet(startingDataWorkbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']), 'ROUTING')
const startingDataResult = parseSnapshotWorkbookData(
  XLSX.write(startingDataWorkbook, { type: 'array', bookType: 'xlsx' }),
  'reference'
)
assert.equal(startingDataResult.success, true, startingDataResult.message)
assert.equal(startingDataResult.format, 'canonical')
assert.equal(startingDataResult.snapshot?.product.productName, 'Product')
assert.equal(startingDataResult.snapshot?.product.uom, 'PC')
assert.equal(startingDataResult.warnings?.some(warning => warning.toLowerCase().includes('missing product name')), false)

const horizontalMetaWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(horizontalMetaWorkbook, sheet([
  ['MASTER DATA DATASET'], [],
  ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)', 'Dataset Remark'],
  ['Legacy Horizontal Meta', 'PC', 50, 4, 'Compatible prior META layout']
]), 'META')
XLSX.utils.book_append_sheet(horizontalMetaWorkbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']), 'BOM')
XLSX.utils.book_append_sheet(horizontalMetaWorkbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(horizontalMetaWorkbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']), 'ROUTING')
const horizontalMetaResult = parseSnapshotWorkbookData(
  XLSX.write(horizontalMetaWorkbook, { type: 'array', bookType: 'xlsx' }),
  'current'
)
assert.equal(horizontalMetaResult.success, true, horizontalMetaResult.message)
assert.equal(horizontalMetaResult.snapshot?.product.productName, 'Legacy Horizontal Meta')
assert.equal(horizontalMetaResult.snapshot?.product.sellingPrice, 50)
assert.equal(horizontalMetaResult.snapshot?.remark, 'Compatible prior META layout')

async function verifyCanonicalTemplate(): Promise<void> {
  assert.ok(result.snapshot)
  const template = await generateDynamicExcelTemplate({
    product: result.snapshot.product,
    snapshot: result.snapshot,
    wcCount: 2,
    bomCount: 2,
    routingCount: 1
  })
  const templateBytes = await template.arrayBuffer()
  const templateWorkbook = XLSX.read(templateBytes, { type: 'array' })
  assert.deepEqual(
    templateWorkbook.SheetNames,
    ['META', 'BOM', 'WORK_CENTER', 'ROUTING']
  )
  const templateValues = ['META', 'BOM', 'ROUTING', 'WORK_CENTER'].flatMap(name => {
    const sheetValues = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
    return sheetValues.flat().map(value => String(value ?? ''))
  })
  assert.equal(templateValues.includes('Base Price P0'), false)
  assert.equal(templateValues.includes('Active Price P1'), false)
  assert.equal(templateValues.includes('Base Cap (pc/hr)'), false)
  assert.equal(templateValues.includes('Active Cap (pc/hr)'), false)
  assert.equal(templateWorkbook.SheetNames.includes('ADDITIONAL_DATA'), false)
  assert.equal(templateValues.includes('Status'), false)
  assert.equal(templateValues.includes('Comparison Role'), false)
  assert.equal(templateValues.includes('draft'), false)

  const roundTrip = parseSnapshotWorkbookData(templateBytes, 'reference')
  assert.equal(roundTrip.success, true)
  assert.equal(roundTrip.format, 'canonical')
  assert.equal(roundTrip.snapshot?.rates.length, 2)
  assert.equal(roundTrip.snapshot?.bom.length, 2)
  assert.equal(roundTrip.snapshot?.routing.length, 1)
}

const invalidWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(invalidWorkbook, metaSheet('Invalid Product', 'PC', null, null, ''), 'META')
XLSX.utils.book_append_sheet(invalidWorkbook, tableSheet('WORK_CENTER', ['WC', 'Labor', 'Burden', 'Note'],
  ['WC-2', 'not-a-number', 50, 'Assembly']), 'WORK_CENTER')
XLSX.utils.book_append_sheet(invalidWorkbook, tableSheet('BOM', ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  ['Material 2', 1, 'PC', 10, 0, '']), 'BOM')
XLSX.utils.book_append_sheet(invalidWorkbook, tableSheet('ROUTING', ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Unknown WC', 'WC-NOPE', 1, 100, 0.9, '']), 'ROUTING')

const invalidResult = parseSnapshotWorkbookData(XLSX.write(invalidWorkbook, { type: 'array', bookType: 'xlsx' }), 'current')
assert.equal(invalidResult.success, true)
assert.equal(invalidResult.snapshot?.rates[0].laborRate, null)
assert.equal(invalidResult.snapshot?.rates[0].confidence.laborRate.quality, 'invalid')
assert.ok(invalidResult.warnings.some(warning => warning.includes('Unknown Work Center')))

const legacyWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(legacyWorkbook, sheet([
  ['PRODUCT MASTER'],
  ['No', 'Product Code', 'Product Description', 'UOM', 'Customer'],
  [1, 'LEGACY-001', 'Legacy Product', 'PC', 'Legacy Customer'],
  [],
  ['WORK CENTER RATES'],
  ['Department', 'Labor Rate', 'Burden Rate', 'Effective Date', 'Source Reference'],
  ['WC-1', 100, 50, '2026-09-21', 'legacy.xlsx']
]), '1_MASTER_RATES')
XLSX.utils.book_append_sheet(legacyWorkbook, sheet([
  ['BOM'],
  ['No', 'Material Code', 'Material Description', 'Usage', 'Unit', 'Base Price', 'Active Price', 'Base Loss', 'Active Loss', 'Source'],
  [1, 'MAT-1', 'Material 1', 2, 'PC', 10, 11, 0.1, 0.1, 'legacy.xlsx']
]), '2_BOM_BREAKDOWN')
XLSX.utils.book_append_sheet(legacyWorkbook, sheet([
  ['ROUTING'],
  ['Seq', 'Process', 'Operation Description', 'Department', 'Manning', 'Base Cap', 'Active Cap', 'Base Yield', 'Active Yield', 'Source'],
  [10, 'Process', 'Cut', 'WC-1', 1, 100, 100, 0.9, 0.9, 'legacy.xlsx']
]), '3_ROUTING_BREAKDOWN')

async function verifyLegacyAdapter(): Promise<void> {
  const legacyFile = new File([
    XLSX.write(legacyWorkbook, { type: 'array', bookType: 'xlsx' })
  ], 'legacy.xlsx')
  const legacyResult = await parseSnapshotExcelInputFile(legacyFile, 'reference')
  const customLegacyResult = await parseSnapshotExcelInputFile(legacyFile, 'custom')

  assert.equal(legacyResult.success, true)
  assert.equal(legacyResult.format, 'legacy')
  assert.equal(legacyResult.snapshot?.comparisonRole, 'reference')
  assert.equal(legacyResult.snapshot?.product.productCode, 'LEGACY-001')
  assert.equal(legacyResult.snapshot?.bom[0].price, 10)
  assert.equal(legacyResult.snapshot?.routing[0].workCenterId, 'WC-1')
  assert.ok(legacyResult.warnings?.some(warning => warning.includes('legacy paired')))
  assert.equal(customLegacyResult.success, true)
  assert.equal(customLegacyResult.role, 'custom')
  assert.equal(customLegacyResult.snapshot?.comparisonRole, undefined, 'Legacy Custom imports remain independent of CBD roles')
}

async function verifyCanonicalXlsUpload(): Promise<void> {
  const xlsFile = new File([
    XLSX.write(workbook, { type: 'array', bookType: 'biff8' })
  ], 'canonical.xls')
  const xlsResult = await parseSnapshotExcelInputFile(xlsFile, 'current', {
    allowLegacy: false
  })

  assert.equal(xlsResult.success, true)
  assert.equal(xlsResult.format, 'canonical')
  assert.equal(xlsResult.snapshot?.product.productName, 'Test Product')
}

verifyCanonicalTemplate()
  .then(() => verifyLegacyAdapter())
  .then(() => verifyCanonicalXlsUpload())
  .then(() => console.log('Snapshot import self-check: PASS'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
