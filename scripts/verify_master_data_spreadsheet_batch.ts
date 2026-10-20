import assert from 'node:assert/strict'
import { filterInvalidMasterDataNumericChanges } from '../src/core/utils/master-data-validation'
import { prepareSpreadsheetBatch } from '../src/features/master-data/hooks/useSpreadsheetEditing'

interface TestRow {
  id: string
  value: string
  note?: string
  isGeneratedSizingPlaceholder?: boolean
}

const rows: TestRow[] = [
  { id: 'row-a', value: '', isGeneratedSizingPlaceholder: true },
  { id: 'row-b', value: 'old-b' },
  { id: 'row-c', value: 'old-c' },
  { id: 'row-d', value: 'old-d' }
]
const batch = prepareSpreadsheetBatch(rows, [
  { id: 'row-a', changes: { value: 'new-a' } },
  { id: 'row-a', changes: { note: 'pasted note' } },
  { id: 'row-b', changes: { value: 'new-b' } },
  { id: 'missing-row', changes: { value: 'ignored' } }
])

assert.equal(batch.length, 2, 'A multi-row edit emits one update for each existing selected row')
assert.deepEqual(batch.find(update => update.id === 'row-a')?.changes, {
  value: 'new-a',
  note: 'pasted note',
  isGeneratedSizingPlaceholder: false
}, 'Pasted cells for one row are combined and editing a generated slot marks it as user-edited')
assert.deepEqual(batch.find(update => update.id === 'row-b')?.changes, { value: 'new-b' })
assert.equal(rows[0].isGeneratedSizingPlaceholder, true, 'Preparing an edit does not mutate the source row')

const focusedColumnPaste = prepareSpreadsheetBatch(rows, [
  { id: 'row-b', changes: { value: '10.50' } },
  { id: 'row-c', changes: { value: '12.00' } },
  { id: 'row-d', changes: { value: '8.75' } }
])
assert.deepEqual(focusedColumnPaste, [
  { id: 'row-b', changes: { value: '10.50' } },
  { id: 'row-c', changes: { value: '12.00' } },
  { id: 'row-d', changes: { value: '8.75' } }
], 'focused-cell vertical paste applies each line to its consecutive existing row in one column')
assert.equal(rows.length, 4, 'a multi-row paste updates Working rows without changing table structure')

const highPrecisionBlockPaste = prepareSpreadsheetBatch(rows, [
  { id: 'row-b', changes: { value: '12.3456789', note: 'first cell' } },
  { id: 'row-c', changes: { value: '0.000000123' } },
  { id: 'row-d', changes: { value: '99.123456789' } }
])
assert.deepEqual(highPrecisionBlockPaste.map(update => update.changes.value), [
  '12.3456789', '0.000000123', '99.123456789'
], 'single-column block paste keeps each higher-precision numeric string intact')
const filteredPrecisePaste = filterInvalidMasterDataNumericChanges({
  price: 12.3456789,
  consumption: 1.23456789,
  loss: 0.01234567,
  capacity: 0.0000001,
  yield: 0.99123456789,
  note: 'kept'
})
assert.deepEqual(filteredPrecisePaste, {
  price: 12.3456789,
  consumption: 1.23456789,
  loss: 0.01234567,
  capacity: 0.0000001,
  yield: 0.99123456789,
  note: 'kept'
}, 'the shared paste validator preserves precise values and only filters known numeric fields by domain')
assert.deepEqual(filterInvalidMasterDataNumericChanges({ price: -1, capacity: 0, yield: 1.01 }), {},
  'spreadsheet paste still rejects negative Price, zero Capacity, and Yield above 100%')

const focusedSingleCellPaste = prepareSpreadsheetBatch(rows, [
  { id: 'row-c', changes: { value: 'single value' } }
])
assert.deepEqual(focusedSingleCellPaste, [{ id: 'row-c', changes: { value: 'single value' } }],
  'single-cell paste updates only the focused row')

console.log('Master Data spreadsheet batch verification passed')
