import assert from 'node:assert/strict'
import { calculateSnapshotCost, compareSnapshots } from '../src/core'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status'
import { isProductMismatch, normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective'
import { buildMasterDataWarningItems, countMasterDataWarningsByRole, MASTER_DATA_WARNING_CATEGORY_DEFINITIONS } from '../src/features/master-data/prepare-dataset'
import {
  createCompleteMasterDataMockPair,
  createIncompleteMasterDataMockPair,
  createSyntheticReviewSnapshotPair
} from '../src/features/master-data/fixtures/synthetic-review-data'

const reviewPair = createSyntheticReviewSnapshotPair()
const comparison = compareSnapshots(reviewPair.reference, reviewPair.current)
assert.deepEqual(reviewPair.reference.sizing, { wcCount: 5, bomCount: 6, routingCount: 8 })
assert.deepEqual(reviewPair.current.sizing, { wcCount: 5, bomCount: 6, routingCount: 8 })

function countStatuses(findings: typeof comparison.bomFindings) {
  const counts = { UNCHANGED: 0, CHANGED: 0, ADDED: 0, REMOVED: 0 }
  for (const finding of findings) {
    const status = getCanonicalComparisonStatus(finding)
    if (status) counts[status] += 1
  }
  return counts
}

assert.deepEqual(countStatuses(comparison.bomFindings), { UNCHANGED: 1, CHANGED: 3, ADDED: 1, REMOVED: 1 })
assert.deepEqual(countStatuses(comparison.routingFindings), { UNCHANGED: 1, CHANGED: 3, ADDED: 3, REMOVED: 3 })
assert.deepEqual(countStatuses(comparison.workCenterFindings), { UNCHANGED: 2, CHANGED: 1, ADDED: 1, REMOVED: 1 })
assert.ok(calculateSnapshotCost(reviewPair.reference).total !== null)
assert.ok(calculateSnapshotCost(reviewPair.current).total !== null)
assert.equal(comparison.reconciliation?.reconciled, true, 'complete sample inputs reconcile across cost components')

for (const [name, changedField] of [['MAT-A', 'price'], ['MAT-USAGE', 'consumption'], ['MAT-LOSS', 'loss']] as const) {
  const finding = comparison.bomFindings.find(item =>
    item.currentId && reviewPair.current.bom.find(row => row.id === item.currentId)?.description === name
  )
  assert.ok(finding, `${name} is present as a comparison finding`)
  assert.ok(changedField in finding.fieldDiffs, `${name} exposes its changed input`)
  assert.ok(finding.costGap !== null && finding.costGap !== undefined, `${name} exposes a record-level cost gap`)
}

const completePair = createCompleteMasterDataMockPair()
assert.ok(calculateSnapshotCost(completePair.reference).total !== null, 'Complete Mock Reference has a calculable Standard Cost')
assert.ok(calculateSnapshotCost(completePair.current).total !== null, 'Complete Mock Current has a calculable Standard Cost')
assert.equal(isProductMismatch(completePair.reference, completePair.current), false, 'Complete Mock Product Name and UOM match')
const completeWarnings = buildMasterDataWarningItems({
  reference: normalizeMasterDataSnapshot(completePair.reference),
  current: normalizeMasterDataSnapshot(completePair.current),
  custom: normalizeMasterDataSnapshot(completePair.current)
})
assert.equal(completeWarnings.length, 0, 'Complete Mock has no warning locations')

const qualityPair = createIncompleteMasterDataMockPair()
const qualityComparison = compareSnapshots(qualityPair.reference, qualityPair.current)
assert.equal(qualityComparison.referenceCost.total, null, 'missing Reference inputs remain unavailable rather than zero')
assert.equal(qualityComparison.currentCost.total, null, 'missing inputs keep Current unavailable rather than zero')
assert.ok(qualityComparison.currentCost.warnings.length > 0, 'missing inputs are explained by calculation warnings')
assert.ok(qualityComparison.productFieldDiffs.productName, 'different Product Names remain visible as a mismatch')
assert.ok(isProductMismatch(qualityPair.reference, qualityPair.current), 'Incomplete Mock mismatches both Product Name and UOM')

const loadedPair = {
  reference: normalizeMasterDataSnapshot(qualityPair.reference),
  current: normalizeMasterDataSnapshot(qualityPair.current)
}
assert.equal(new Set(loadedPair.current.bom.map(row => row.description.toLocaleLowerCase())).size, loadedPair.current.bom.length,
  'the single Working-state mock resolves duplicate effective BOM identities')
assert.ok(loadedPair.current.bom.some(row => row.autoRenamedFrom), 'the mock records duplicate auto-renames for warning review')
assert.deepEqual(loadedPair.current.bom.map(row => row.description), ['Material 1', 'MAT-DUPLICATE', 'MAT-DUPLICATE(1)'],
  'generated identity numbering is stable and duplicate BOM suffixes are deterministic')
assert.equal(loadedPair.current.rates.filter(row => row.autoRenamedFrom).length, 1, 'Work Center duplicate is auto-renamed once')
assert.equal(loadedPair.current.routing.filter(row => row.autoRenamedFrom).length, 1, 'Routing duplicate is auto-renamed once')
const mockWarnings = buildMasterDataWarningItems({ ...loadedPair, custom: normalizeMasterDataSnapshot(completePair.current) })
const warningCounts = mockWarnings.reduce<Record<string, number>>((counts, item) => {
  counts[item.category] = (counts[item.category] ?? 0) + 1
  return counts
}, {})
assert.deepEqual(warningCounts, {
  'generated-identity': 3,
  'missing-value': 9,
  'auto-renamed-duplicate': 3
}, 'Incomplete Mock covers exactly three generated identities, nine missing values, and three duplicates')
assert.equal(mockWarnings.length, 15, 'Product Mismatch is excluded from the 15 warning items')
assert.deepEqual(countMasterDataWarningsByRole(mockWarnings), { reference: 3, current: 12, custom: 0 },
  'Incomplete Mock warning counts are deterministic by dataset')
assert.deepEqual(MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(definition => definition.category), [
  'generated-identity', 'missing-value', 'auto-renamed-duplicate'
], 'Prepare Dataset exposes exactly three warning categories')
assert.ok(mockWarnings.every(item => MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.some(definition => definition.category === item.category)),
  'mock warnings use only canonical visible categories')

console.log('Complete and Incomplete Mock fixtures cover calculable states, exact warning counts, Product Mismatch, and generated identities.')
