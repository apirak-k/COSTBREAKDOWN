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

const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, sheet([
  ['Key', 'Value'],
  ['Snapshot ID', 'after-2026-09-21'],
  ['Effective Date', '2026-09-21'],
  ['Source Ref', 'after.xlsx'],
  ['Status', 'draft']
]), 'META')
XLSX.utils.book_append_sheet(workbook, sheet([
  ['Product Code', 'Product Description', 'UOM', 'Customer', 'Effective Date'],
  ['P-001', 'Test Product', 'PC', 'Test Customer', '2026-09-21']
]), 'PRODUCT')
XLSX.utils.book_append_sheet(workbook, sheet([
  ['ID', 'Work Center Code', 'Description', 'Labor Rate', 'Burden Rate', 'Effective Date', 'Source Ref', 'Confidence'],
  ['wc-1', 'WC-1', 'Cutting', 100, 50, '2026-09-21', 'rates.xlsx', 'Verified'],
  ['wc-2', 'WC-2', 'Assembly', 90, null, '2026-09-21', 'Assumption', '']
]), 'WORK_CENTER')
XLSX.utils.book_append_sheet(workbook, sheet([
  ['ID', 'Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Source Ref', 'Confidence'],
  ['bom-1', 'MAT-1', 'Material 1', 2, 'PC', 10, 0.1, 'bom.xlsx', 'Verified'],
  ['bom-2', 'MAT-2', 'Material 2', 2, 'PC', null, null, '', '']
]), 'BOM')
XLSX.utils.book_append_sheet(workbook, sheet([
  ['ID', 'Operation Code', 'Sequence', 'Process Name', 'Work Center ID', 'Manning', 'Capacity', 'Yield', 'Source Ref', 'Confidence'],
  ['routing-1', 'OP-10', 10, 'Cut', 'WC-1', 1, 100, 0.9, 'routing.xlsx', 'Verified']
]), 'ROUTING')

const result = parseSnapshotWorkbookData(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), 'current')

const workbookBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
const matchingProductResult = parseSnapshotWorkbookData(workbookBytes, 'current', 'P-001')
assert.equal(matchingProductResult.success, true)

const mismatchedProductResult = parseSnapshotWorkbookData(workbookBytes, 'current', 'P-999')
assert.equal(mismatchedProductResult.success, false)
assert.match(mismatchedProductResult.message, /Product Code mismatch/)

assert.equal(result.success, true)
assert.equal(result.format, 'canonical')
assert.equal(result.snapshot?.id, 'after-2026-09-21')
assert.equal(result.snapshot?.comparisonRole, 'current')
assert.equal(result.snapshot?.product.productCode, 'P-001')
assert.equal(result.snapshot?.rates.length, 2)
assert.equal(result.snapshot?.rates[1].burdenRate, null)
assert.equal(result.snapshot?.rates[1].confidence.burdenRate.status, 'missing')
assert.equal(result.snapshot?.rates[1].confidence.burdenRate.quality, 'missing')
assert.equal(result.snapshot?.rates[1].confidence.laborRate.status, 'estimated')
assert.equal(result.snapshot?.bom[1].price, null)
assert.equal(result.snapshot?.bom[1].confidence.price.status, 'missing')
assert.equal(result.snapshot?.routing[0].workCenterId, 'WC-1')
assert.ok(result.warnings.some(warning => warning.includes('burdenRate')))

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
    templateWorkbook.SheetNames.filter(name => ['META', 'PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING'].includes(name)),
    ['META', 'PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING']
  )
  const templateValues = templateWorkbook.SheetNames.flatMap(name => {
    const sheetValues = XLSX.utils.sheet_to_json(templateWorkbook.Sheets[name], { header: 1, defval: null }) as unknown[][]
    return sheetValues.flat().map(value => String(value ?? ''))
  })
  assert.equal(templateValues.includes('Base Price P0'), false)
  assert.equal(templateValues.includes('Active Price P1'), false)
  assert.equal(templateValues.includes('Base Cap (pc/hr)'), false)
  assert.equal(templateValues.includes('Active Cap (pc/hr)'), false)

  const roundTrip = parseSnapshotWorkbookData(templateBytes, 'reference', 'P-001')
  assert.equal(roundTrip.success, true)
  assert.equal(roundTrip.format, 'canonical')
  assert.equal(roundTrip.snapshot?.rates.length, 2)
  assert.equal(roundTrip.snapshot?.bom.length, 2)
  assert.equal(roundTrip.snapshot?.routing.length, 1)
}

const invalidWorkbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(invalidWorkbook, sheet([
  ['Key', 'Value'],
  ['Source Ref', 'invalid.xlsx']
]), 'META')
XLSX.utils.book_append_sheet(invalidWorkbook, sheet([
  ['Product Code', 'Product Description', 'UOM'],
  ['P-002', 'Invalid Product', 'PC']
]), 'PRODUCT')
XLSX.utils.book_append_sheet(invalidWorkbook, sheet([
  ['Work Center Code', 'Description', 'Labor Rate', 'Burden Rate'],
  ['WC-2', 'Assembly', 'not-a-number', 50]
]), 'WORK_CENTER')
XLSX.utils.book_append_sheet(invalidWorkbook, sheet([
  ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss'],
  ['MAT-2', 'Material 2', 1, 'PC', 10, 0]
]), 'BOM')
XLSX.utils.book_append_sheet(invalidWorkbook, sheet([
  ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield'],
  ['OP-20', 20, 'Unknown WC', 'WC-NOPE', 1, 100, 0.9]
]), 'ROUTING')

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

  assert.equal(legacyResult.success, true)
  assert.equal(legacyResult.format, 'legacy')
  assert.equal(legacyResult.snapshot?.comparisonRole, 'reference')
  assert.equal(legacyResult.snapshot?.product.productCode, 'LEGACY-001')
  assert.equal(legacyResult.snapshot?.bom[0].price, 10)
  assert.equal(legacyResult.snapshot?.routing[0].workCenterId, 'WC-1')
  assert.ok(legacyResult.warnings?.some(warning => warning.includes('legacy paired')))
}

verifyCanonicalTemplate()
  .then(() => verifyLegacyAdapter())
  .then(() => console.log('Snapshot import self-check: PASS'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
