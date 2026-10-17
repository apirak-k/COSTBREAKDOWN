import assert from 'node:assert/strict'
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

const focusedSingleCellPaste = prepareSpreadsheetBatch(rows, [
  { id: 'row-c', changes: { value: 'single value' } }
])
assert.deepEqual(focusedSingleCellPaste, [{ id: 'row-c', changes: { value: 'single value' } }],
  'single-cell paste updates only the focused row')

console.log('Master Data spreadsheet batch verification passed')
