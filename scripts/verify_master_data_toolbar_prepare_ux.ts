import assert from 'node:assert/strict'
import type { CostSnapshot, SnapshotPair } from '../src/core/types'
import {
  getDatasetSaveState,
  isProductMismatch,
  normalizeMasterDataSnapshot
} from '../src/core/utils/master-data-effective'
import { buildMasterDataWarningItems } from '../src/features/master-data/prepare-dataset'
import { getPopulatedRowsRemovedBySizing } from '../src/state/dataset-sizing'

function snapshot(id: string): CostSnapshot {
  return {
    id,
    status: 'draft',
    sourceRef: 'test',
    effectiveDate: '',
    product: { productName: '', uom: '', productCode: '', productDescription: '', customer: '', effectiveDate: '' },
    rates: [],
    bom: [],
    routing: []
  }
}

const working = snapshot('dataset')
working.bom = [
  { id: 'steel', itemCode: '', description: 'Steel', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} },
  { id: 'blank-one', itemCode: '', description: '', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} },
  { id: 'plastic', itemCode: '', description: 'Plastic', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} },
  { id: 'blank-two', itemCode: '', description: '', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} }
]
working.rates = [
  { id: 'wc-blank', workCenterCode: '', description: '', laborRate: 1, burdenRate: 1, effectiveDate: '', confidence: {} }
]
working.routing = [
  { id: 'route-blank', processName: '', workCenterId: 'MISSING-WC', manning: 1, capacity: 0, yield: 1, confidence: {} }
]

const effective = normalizeMasterDataSnapshot(working)
assert.equal(effective.product.productName, '', 'blank Product Name remains blank')
assert.equal(effective.product.uom, '', 'blank UOM remains blank')
assert.deepEqual(effective.bom.map(row => row.description), ['Steel', 'Material 1', 'Plastic', 'Material 2'],
  'generated BOM identities count generated entries, not physical rows')
assert.equal(effective.rates[0].workCenterCode, 'Work Center 1')
assert.equal(effective.routing[0].processName, 'Process 1')
const retainedMarkers = normalizeMasterDataSnapshot(effective)
assert.equal(retainedMarkers.bom[1].isGeneratedBusinessIdentity, true, 'generated identity marker survives normal display normalization')
assert.equal(retainedMarkers.product.productName, '')
const editedGeneratedIdentity = structuredClone(effective)
editedGeneratedIdentity.bom[1].description = 'Custom Material'
const explicitIdentity = normalizeMasterDataSnapshot(editedGeneratedIdentity, effective)
assert.equal(explicitIdentity.bom[1].description, 'Custom Material', 'editing a generated identity materializes the user-entered identity')
assert.equal(explicitIdentity.bom[1].isGeneratedBusinessIdentity, false)
assert.equal(normalizeMasterDataSnapshot({
  ...snapshot('different-descriptions'),
  product: { ...snapshot('different-descriptions').product, productDescription: 'Another label' }
}).product.productName, '', 'legacy Product Description does not fabricate a Product Name')

const duplicateInput = snapshot('duplicates')
duplicateInput.bom = [
  { id: 'first', itemCode: '', description: 'mat0.3a', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} },
  { id: 'suffix', itemCode: '', description: 'mat0.3a(1)', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} },
  { id: 'edited', itemCode: '', description: 'old-name', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} }
]
const nextInput = structuredClone(duplicateInput)
nextInput.bom[2].description = 'mat0.3a'
const renamed = normalizeMasterDataSnapshot(nextInput, duplicateInput)
assert.equal(renamed.bom[2].description, 'mat0.3a(2)', 'edited duplicates use the next free suffix')
assert.equal(renamed.bom[2].autoRenamedFrom, 'mat0.3a', 'the rename retains its warning source')
assert.equal(normalizeMasterDataSnapshot(renamed).bom[2].autoRenamedFrom, 'mat0.3a', 'duplicate warning marker survives display normalization')
const pastedDuplicates = snapshot('pasted-duplicates')
pastedDuplicates.bom = [
  { id: 'paste-one', itemCode: '', description: 'mat0.3a', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} },
  { id: 'paste-two', itemCode: '', description: 'mat0.3a', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} }
]
assert.deepEqual(normalizeMasterDataSnapshot(pastedDuplicates).bom.map(row => row.description), ['mat0.3a', 'mat0.3a(1)'],
  'bulk and pasted rows receive deterministic suffixes when normalized together')

const quality = snapshot('quality')
quality.bom = [
  { id: 'generated', itemCode: '', description: '', consumption: null, unit: 'PC', price: null, loss: null, confidence: {} },
  { id: 'bad', itemCode: '', description: 'Bad', consumption: -1, unit: 'PC', price: 1, loss: 0, confidence: {} }
]
quality.rates = [{ id: 'rate', workCenterCode: 'WC-1', description: '', laborRate: null, burdenRate: 0, effectiveDate: '', confidence: {} }]
quality.routing = [{ id: 'route', processName: 'Cut', workCenterId: 'NO-WC', manning: 1, capacity: 0, yield: 1, confidence: {} }]
const warningItems = buildMasterDataWarningItems({ reference: snapshot('reference'), current: normalizeMasterDataSnapshot(quality), custom: snapshot('custom') })
const warningCategories = warningItems.reduce<Record<string, number>>((totals, warning) => {
  totals[warning.category] = (totals[warning.category] ?? 0) + 1
  return totals
}, {})
assert.equal(warningCategories['generated-identity'], 1, 'generated identities are reviewable warning items')
assert.equal(warningCategories['missing-value'], 4, 'missing required numeric values count by affected field')
assert.equal(warningCategories['invalid-value'], 2, 'invalid negative and non-positive required inputs are counted')
assert.equal(warningCategories['unresolved-work-center'], 1, 'unavailable Work Center references are counted')
assert.equal(warningItems.length, 8, 'footer warning total sums affected warning locations, not category count')
assert.ok(warningItems.every(item => item.role !== 'custom' || item.table !== 'product'))

assert.equal(getDatasetSaveState(effective, undefined), 'Draft')
assert.equal(getDatasetSaveState(effective, structuredClone(effective)), 'Saved')
assert.equal(getDatasetSaveState(effective, { ...structuredClone(effective), remark: 'changed' }), 'Draft')

const pair: SnapshotPair = {
  reference: effective,
  current: { ...normalizeMasterDataSnapshot(quality), product: { ...quality.product, productName: 'Different product' } }
}
assert.ok(isProductMismatch(pair.reference, pair.current), 'Product Mismatch is derivable as comparison status outside warning items')
assert.equal(isProductMismatch(
  { ...snapshot('blank-reference'), product: { ...snapshot('blank-reference').product, productName: '', productDescription: 'Reference description' } },
  { ...snapshot('blank-current'), product: { ...snapshot('blank-current').product, productName: '', productDescription: 'Current description' } }
), false, 'blank Product Names remain blank even when legacy descriptions differ')
assert.ok(!warningItems.some(item => item.category === 'product-mismatch'), 'Product Mismatch is not a warning category')

const truncation = snapshot('truncation')
truncation.bom = [
  { id: 'blank-tail', itemCode: '', description: '', consumption: null, unit: 'PC', price: null, loss: null, confidence: {}, isGeneratedSizingPlaceholder: true },
  { id: 'used-tail', itemCode: '', description: 'Used material', consumption: 1, unit: 'PC', price: 3, loss: 0, confidence: {} }
]
assert.deepEqual(getPopulatedRowsRemovedBySizing(truncation, { bomCount: 1 }), ['Used material'],
  'only populated rows removed by truncation require confirmation')
assert.deepEqual(getPopulatedRowsRemovedBySizing(truncation, { bomCount: 2 }), [],
  'sizing that does not remove rows does not require confirmation')

console.log('Master Data toolbar and Prepare Dataset behavior verification passed')
