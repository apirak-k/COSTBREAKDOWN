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
  buildMasterDataBlockerItems,
  buildMasterDataWarningItems,
  areMasterDataDatasetsReady,
  countMasterDataWarningsByRole,
  countMasterDataQualityByRole,
  groupMasterDataBlockers,
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
const blockerItems = buildMasterDataBlockerItems({ reference: snapshot('reference'), current: normalizeMasterDataSnapshot(quality), custom: snapshot('custom') })
const warningCategories = warningItems.reduce<Record<string, number>>((totals, warning) => {
  totals[warning.category] = (totals[warning.category] ?? 0) + 1
  return totals
}, {})
assert.equal(warningCategories['generated-identity'], 1, 'generated identities are reviewable warning items')
assert.equal(warningCategories['auto-renamed-duplicate'], 1, 'automatic duplicate renames remain reviewable warning items')
assert.equal(warningItems.length, 2, 'footer warning total sums only non-blocking identity locations')
assert.deepEqual(Object.keys(warningCategories).sort(), ['auto-renamed-duplicate', 'generated-identity'].sort(),
  'Prepare Dataset exposes exactly two canonical warning categories')
assert.equal(blockerItems.length, 6, 'missing values and unresolved required Work Center references are separate blockers')
assert.deepEqual(countMasterDataQualityByRole(blockerItems), { reference: 0, current: 6, custom: 0 }, 'blocker counts remain separate by dataset')
assert.ok(blockerItems.some(item => item.rowId === 'blank-wc' && item.field === 'workCenterId' && item.category === 'missing-value'),
  'a blank required Work Center is reported as Missing required value')
assert.equal(blockerItems.filter(item => item.rowId === 'blank-wc' && item.field === 'workCenterId').length, 1,
  'blank Work Center creates only one Missing required value item')
assert.equal(warningItems.some(item => item.rowId === 'blank-wc' && item.field === 'workCenterId'), false,
  'blockers do not also appear in Warnings')
const warningsByRole = countMasterDataWarningsByRole(warningItems)
assert.deepEqual(warningsByRole, { reference: 0, current: 2, custom: 0 }, 'warning counts remain independent by dataset')
assert.equal(Object.values(warningsByRole).reduce((total, count) => total + count, 0), warningItems.length,
  'per-dataset warning counts sum without double-counting blockers')
const warningGroups = groupMasterDataWarnings(warningItems)
assert.deepEqual(warningGroups.map(group => group.category), MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(definition => definition.category),
  'Prepare Dataset warning groups follow the two non-blocking categories')
assert.deepEqual(groupMasterDataWarnings([]).map(group => group.items.length), [0, 0],
  'warning categories have no fake data locations when there are no warnings')
assert.equal(groupMasterDataWarnings(warningItems.filter(item => item.role === 'reference')).every(group => group.items.length === 0), true,
  'a dataset filter leaves warning categories empty for datasets without warnings')
assert.equal(groupMasterDataBlockers(blockerItems).length, 1, 'Blockers use a separate Missing required value category')
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
  { ...pair.current, product: { ...pair.reference.product, productName: 'Product A', uom: 'KG' } }
), 'same Product Name with a different UOM creates Product Mismatch')
assert.ok(isProductMismatch(
  { ...pair.reference, product: { ...pair.reference.product, productName: 'Product A', uom: 'PC' } },
  { ...pair.current, product: { ...pair.current.product, productName: 'Product B', uom: 'PC' } }
), 'different Product Names with the same UOM create Product Mismatch')
assert.equal(isProductMismatch(
  { ...pair.reference, product: { ...pair.reference.product, productName: 'Product A', uom: 'PC' } },
  { ...pair.current, product: { ...pair.current.product, productName: 'Product A', uom: 'PC' } }
), false, 'exact Product Name and UOM match')
assert.equal(isProductMismatch(
  { ...pair.reference, product: { ...pair.reference.product, productName: ' Demo ', uom: ' PC ' } },
  { ...pair.current, product: { ...pair.current.product, productName: 'demo', uom: 'pc' } }
), false, 'Product Name and UOM comparison trims and normalizes case')
assert.equal(isProductMismatch(
  { ...snapshot('blank-reference'), product: { ...snapshot('blank-reference').product, productName: '', productDescription: 'Reference description' } },
  { ...snapshot('blank-current'), product: { ...snapshot('blank-current').product, productName: '', productDescription: 'Current description' } }
), false, 'blank Product Names remain blank even when legacy descriptions differ')
assert.ok(!warningItems.some(item => item.category === 'product-mismatch'), 'Product Mismatch is not a warning category')
const productMismatchOnlyWarnings = buildMasterDataWarningItems({
  reference: { ...snapshot('product-reference'), product: { ...snapshot('product-reference').product, productName: 'Product A', uom: 'PC' } },
  current: { ...snapshot('product-current'), product: { ...snapshot('product-current').product, productName: 'Product B', uom: 'KG' } },
  custom: snapshot('product-custom')
})
assert.equal(productMismatchOnlyWarnings.length, 0, 'Product Name and UOM mismatch do not add warning items')

const readyHandoff = { datasetsPrepared: true, referenceReady: true, currentReady: true }
const customMissingBlockers = buildMasterDataBlockerItems({ reference: snapshot('ready-reference'), current: snapshot('ready-current'), custom: quality })
assert.equal(areMasterDataDatasetsReady(readyHandoff, customMissingBlockers), true,
  'Custom blockers do not affect Reference/Current readiness')
assert.equal(areMasterDataDatasetsReady(readyHandoff, blockerItems), false,
  'Reference or Current blockers make shared readiness incomplete')
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
