import assert from 'node:assert/strict'
import type { CostSnapshot, SnapshotPair } from '../src/core/types'
import {
  getDatasetSaveState,
  isProductMismatch,
  normalizeMasterDataSnapshot
} from '../src/core/utils/master-data-effective'
import {
  filterInvalidMasterDataNumericChanges,
  getMasterDataSnapshotValidationErrors,
  isMasterDataSnapshotChangeValid
} from '../src/core/utils/master-data-validation'
import {
  buildMasterDataWarningItems,
  areMasterDataDatasetsReady,
  countMasterDataWarningsByRole,
  groupMasterDataWarnings,
  MASTER_DATA_WARNING_CATEGORY_DEFINITIONS
} from '../src/features/master-data/prepare-dataset'
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
  { id: 'bad', itemCode: '', description: 'Bad', consumption: -1, unit: 'PC', price: 1, loss: 0, confidence: {} },
  { id: 'renamed', itemCode: '', description: 'mat0.3a(1)', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {}, autoRenamedFrom: 'mat0.3a' }
]
quality.rates = [{ id: 'rate', workCenterCode: 'WC-1', description: '', laborRate: null, burdenRate: 0, effectiveDate: '', confidence: {} }]
quality.routing = [
  { id: 'route', processName: 'Cut', workCenterId: 'NO-WC', manning: 1, capacity: 0, yield: 1, confidence: {} },
  { id: 'blank-wc', processName: 'Drilling', workCenterId: '', manning: 1, capacity: 100, yield: 1, confidence: {} }
]
const warningItems = buildMasterDataWarningItems({ reference: snapshot('reference'), current: normalizeMasterDataSnapshot(quality), custom: snapshot('custom') })
const warningCategories = warningItems.reduce<Record<string, number>>((totals, warning) => {
  totals[warning.category] = (totals[warning.category] ?? 0) + 1
  return totals
}, {})
assert.equal(warningCategories['generated-identity'], 1, 'generated identities are reviewable warning items')
assert.equal(warningCategories['missing-value'], 5, 'missing required values count by affected field, including a blank Routing Work Center')
assert.equal(warningCategories['auto-renamed-duplicate'], 1, 'automatic duplicate renames remain reviewable warning items')
assert.equal(warningItems.length, 7, 'footer warning total sums affected warning locations, not category count')
assert.deepEqual(Object.keys(warningCategories).sort(), ['auto-renamed-duplicate', 'generated-identity', 'missing-value'].sort(),
  'Prepare Dataset exposes exactly the three canonical warning categories')
assert.ok(warningItems.some(item => item.rowId === 'blank-wc' && item.field === 'workCenterId' && item.category === 'missing-value'),
  'a blank required Work Center is reported as Missing required value')
assert.equal(warningItems.filter(item => item.rowId === 'blank-wc' && item.field === 'workCenterId').length, 1,
  'blank Work Center creates only one Missing required value item')
const warningsByRole = countMasterDataWarningsByRole(warningItems)
assert.deepEqual(warningsByRole, { reference: 0, current: 7, custom: 0 }, 'dataset counts remain independent')
assert.equal(Object.values(warningsByRole).reduce((total, count) => total + count, 0), warningItems.length,
  'the per-dataset counts sum to the total without extra warning rows')
const warningGroups = groupMasterDataWarnings(warningItems)
assert.deepEqual(warningGroups.map(group => group.category), MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(definition => definition.category),
  'Prepare Dataset keeps all warning category rows present, including zero-count rows')
assert.deepEqual(groupMasterDataWarnings([]).map(group => group.items.length), [0, 0, 0],
  'all three warning categories remain present with zero items when there are no warnings')
assert.equal(groupMasterDataWarnings(warningItems.filter(item => item.role === 'reference')).every(group => group.items.length === 0), true,
  'a dataset filter leaves stable zero-count categories for datasets without warnings')
assert.ok(warningItems.every(item => item.role !== 'custom' || item.table !== 'product'))

assert.equal(getDatasetSaveState(effective, undefined), 'Draft')
assert.equal(getDatasetSaveState(effective, structuredClone(effective)), 'Saved')
assert.equal(getDatasetSaveState(effective, { ...structuredClone(effective), remark: 'changed' }), 'Draft')

const pair: SnapshotPair = {
  reference: effective,
  current: { ...normalizeMasterDataSnapshot(quality), product: { ...quality.product, productName: 'Different product' } }
}
assert.ok(isProductMismatch(pair.reference, pair.current), 'Product Mismatch is derivable as comparison status outside warning items')
assert.ok(isProductMismatch(
  pair.reference,
  { ...pair.current, product: { ...pair.current.product, productName: '', uom: 'KG' } }
), 'UOM differences create Product Mismatch when Product Names match')
assert.equal(isProductMismatch(
  { ...pair.reference, product: { ...pair.reference.product, productName: ' Demo ', uom: ' PC ' } },
  { ...pair.current, product: { ...pair.current.product, productName: 'demo', uom: 'pc' } }
), false, 'Product Name and UOM comparison trims and normalizes case')
assert.equal(isProductMismatch(
  { ...snapshot('blank-reference'), product: { ...snapshot('blank-reference').product, productName: '', productDescription: 'Reference description' } },
  { ...snapshot('blank-current'), product: { ...snapshot('blank-current').product, productName: '', productDescription: 'Current description' } }
), false, 'blank Product Names remain blank even when legacy descriptions differ')
assert.ok(!warningItems.some(item => item.category === 'product-mismatch'), 'Product Mismatch is not a warning category')

const customMissingWarnings = buildMasterDataWarningItems({
  reference: snapshot('ready-reference'),
  current: snapshot('ready-current'),
  custom: quality
})
const readyHandoff = { datasetsPrepared: true, referenceReady: true, currentReady: true }
assert.equal(areMasterDataDatasetsReady(readyHandoff, customMissingWarnings), true,
  'Custom missing values do not affect Reference/Current readiness')
assert.equal(areMasterDataDatasetsReady(readyHandoff, warningItems), false,
  'Reference or Current missing required values make shared readiness incomplete')
assert.equal(areMasterDataDatasetsReady({ ...readyHandoff, currentReady: false }, []), false,
  'shared readiness requires both existing dataset readiness states')

const validationBase = snapshot('validation-base')
validationBase.rates = [{ id: 'wc-valid', workCenterCode: 'WC-1', description: '', laborRate: 1, burdenRate: 1, effectiveDate: '', confidence: {} }]
validationBase.bom = [{ id: 'bom-valid', itemCode: '', description: 'Material', consumption: 1, unit: 'PC', price: 1, loss: 0, confidence: {} }]
validationBase.routing = [{ id: 'routing-valid', processName: 'Cut', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1, confidence: {} }]
const invalidNumericChange = structuredClone(validationBase)
invalidNumericChange.bom[0].consumption = -1
assert.equal(isMasterDataSnapshotChangeValid(validationBase, invalidNumericChange), false,
  'normal Working updates reject newly introduced negative numbers')
assert.deepEqual(filterInvalidMasterDataNumericChanges({ consumption: Number.NaN, note: 'keep this edit' }), { note: 'keep this edit' },
  'a mixed multi-cell paste can retain valid fields while dropping an invalid numeric cell')
const invalidCapacityChange = structuredClone(validationBase)
invalidCapacityChange.routing[0].capacity = 0
assert.equal(isMasterDataSnapshotChangeValid(validationBase, invalidCapacityChange), false,
  'normal Working updates reject non-positive Capacity')
const invalidYieldChange = structuredClone(validationBase)
invalidYieldChange.routing[0].yield = 1.01
assert.equal(isMasterDataSnapshotChangeValid(validationBase, invalidYieldChange), false,
  'normal Working updates reject Yield outside the existing range')
const unknownWorkCenterChange = structuredClone(validationBase)
unknownWorkCenterChange.routing[0].workCenterId = 'MISSING-WC'
assert.equal(isMasterDataSnapshotChangeValid(validationBase, unknownWorkCenterChange), false,
  'normal Working updates reject newly introduced unavailable Work Center references')
const renamedReferencedWorkCenter = structuredClone(validationBase)
renamedReferencedWorkCenter.rates[0].workCenterCode = 'WC-2'
assert.equal(isMasterDataSnapshotChangeValid(validationBase, renamedReferencedWorkCenter), false,
  'renaming a referenced Work Center cannot strand a nonblank Routing reference')
const deletedReferencedWorkCenter = structuredClone(validationBase)
deletedReferencedWorkCenter.rates = []
assert.equal(isMasterDataSnapshotChangeValid(validationBase, deletedReferencedWorkCenter), false,
  'deleting or sizing away a referenced Work Center cannot strand a nonblank Routing reference')
const blankWorkCenterChange = structuredClone(validationBase)
blankWorkCenterChange.routing[0].workCenterId = ''
assert.equal(isMasterDataSnapshotChangeValid(validationBase, blankWorkCenterChange), true,
  'blank Routing Work Center remains allowed and can be reported as Missing required value')
assert.ok(getMasterDataSnapshotValidationErrors(invalidYieldChange).some(error => error.includes('yield')),
  'import validation rejects invalid values before they become Working data')
assert.ok(getMasterDataSnapshotValidationErrors(unknownWorkCenterChange).some(error => error.includes('Unknown Work Center')),
  'import validation rejects unavailable nonblank Routing Work Center references')
const legacyInvalid = structuredClone(invalidNumericChange)
assert.equal(isMasterDataSnapshotChangeValid(legacyInvalid, { ...structuredClone(legacyInvalid), remark: 'review' }), true,
  'unrelated edits do not freeze a legacy snapshot that already contains invalid data')
const legacyUnknownReference = structuredClone(unknownWorkCenterChange)
assert.equal(isMasterDataSnapshotChangeValid(legacyUnknownReference, { ...structuredClone(legacyUnknownReference), remark: 'review' }), true,
  'unrelated edits do not freeze a legacy snapshot with a pre-existing unavailable Work Center')

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
