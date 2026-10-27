import assert from 'node:assert/strict'
import { prepareSpreadsheetBatch } from '../src/features/master-data/hooks/useSpreadsheetEditing'
import { parsePercentage } from '../src/features/master-data/table-validation'
import { normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective'
import type { CostSnapshot } from '../src/core/types'

interface TestRow {
  id: string
  value: string
  price?: number | null
  loss?: number | null
  consumption?: number | null
  note?: string
  isGeneratedSizingPlaceholder?: boolean
  exactDecimalInputs?: Partial<Record<'price' | 'loss' | 'consumption', string>>
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

const criticalDecimal = '123456789012345.123456789'
const decimalRows: TestRow[] = [{
  id: 'decimal-row',
  value: 'old',
  exactDecimalInputs: { price: '9.500', loss: '1.250' }
}]
const exactPaste = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { price: Number(criticalDecimal) }, exactDecimalUpdates: { price: criticalDecimal } },
  { id: 'decimal-row', changes: { consumption: Number('0.00000123456789'), note: 'same batch' }, exactDecimalUpdates: { consumption: '0.00000123456789' } }
])
assert.deepEqual(exactPaste[0].changes, {
  price: Number(criticalDecimal),
  consumption: Number('0.00000123456789'),
  note: 'same batch',
  exactDecimalInputs: { price: criticalDecimal, loss: '1.250', consumption: '0.00000123456789' }
}, 'exact decimal sidecars merge with row edits and preserve other fields')
const exactCut = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { price: null }, exactDecimalUpdates: { price: null } }
])
assert.deepEqual(exactCut[0].changes.exactDecimalInputs, { loss: '1.250' },
  'cutting a numeric field removes only that field exact sidecar')
const clearLastExact = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { price: null, loss: null }, exactDecimalUpdates: { price: null, loss: null } }
])
assert.equal(clearLastExact[0].changes.exactDecimalInputs, undefined,
  'empty rows do not retain an empty exact decimal sidecar')
const validPercentagePaste = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { loss: 0.123456789 }, exactDecimalUpdates: { loss: '12.3456789' } }
])
assert.equal(validPercentagePaste[0].changes.exactDecimalInputs?.loss, '12.3456789',
  'percentage inputs keep exact text while validating against their stored fractional value')
const invalidDecimalPaste = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { price: -1 }, exactDecimalUpdates: { price: '-1' } }
])
assert.equal(invalidDecimalPaste[0].changes.exactDecimalInputs, undefined,
  'a rejected numeric paste cannot persist a mismatched exact sidecar')
const invalidPercentagePaste = prepareSpreadsheetBatch(decimalRows, [
  { id: 'decimal-row', changes: { loss: 1.2 }, exactDecimalUpdates: { loss: '120' } }
])
assert.equal(invalidPercentagePaste[0].changes.exactDecimalInputs, undefined,
  'a rejected percentage paste cannot persist a mismatched exact sidecar')

const percentageTextFromGrid = '0.29'
const percentageGridValue = parsePercentage(percentageTextFromGrid)
assert.equal(percentageGridValue, 0.0029,
  'copied percentage-point grid text parses back to the stored fractional value')
const percentageSnapshot = {
  id: 'percentage-paste',
  comparisonRole: 'custom' as const,
  status: 'draft' as const,
  sourceRef: 'fixture',
  effectiveDate: '',
  product: {
    productCode: 'P', productDescription: 'Product', uom: 'PC', customer: '', effectiveDate: '',
    sellingPrice: null, sgaPercent: null
  },
  rates: [],
  bom: [{
    id: 'percentage-row', itemCode: 'LOSS', description: 'Loss', consumption: 1,
    unit: 'PC', price: 1, loss: 0.1, exactDecimalInputs: { loss: '10' }, confidence: {}
  }],
  routing: [],
  warnings: []
} satisfies CostSnapshot
const percentageGridPaste = prepareSpreadsheetBatch(percentageSnapshot.bom, [{
  id: 'percentage-row',
  changes: { loss: percentageGridValue },
  exactDecimalUpdates: { loss: percentageTextFromGrid }
}])
const normalizedPercentagePaste = normalizeMasterDataSnapshot({
  ...percentageSnapshot,
  bom: [{ ...percentageSnapshot.bom[0], ...percentageGridPaste[0].changes }]
}, percentageSnapshot)
assert.equal(normalizedPercentagePaste.bom[0].loss, 0.0029,
  'Master Data normalization retains the pasted percentage as a fraction')
assert.equal(normalizedPercentagePaste.bom[0].exactDecimalInputs?.loss, '0.29',
  'Master Data normalization retains the pasted percentage-point sidecar')

console.log('Master Data spreadsheet batch verification passed')
