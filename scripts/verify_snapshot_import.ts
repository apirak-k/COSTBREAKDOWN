import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser'

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

assert.equal(result.success, true)
assert.equal(result.format, 'canonical')
assert.equal(result.snapshot?.id, 'after-2026-09-21')
assert.equal(result.snapshot?.comparisonRole, 'current')
assert.equal(result.snapshot?.product.productCode, 'P-001')
assert.equal(result.snapshot?.rates.length, 2)
assert.equal(result.snapshot?.rates[1].burdenRate, null)
assert.equal(result.snapshot?.rates[1].confidence.burdenRate.status, 'missing')
assert.equal(result.snapshot?.rates[1].confidence.laborRate.status, 'estimated')
assert.equal(result.snapshot?.bom[1].price, null)
assert.equal(result.snapshot?.bom[1].confidence.price.status, 'missing')
assert.equal(result.snapshot?.routing[0].workCenterId, 'WC-1')
assert.ok(result.warnings.some(warning => warning.includes('burdenRate')))

console.log('Snapshot import self-check: PASS')
