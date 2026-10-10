import assert from 'node:assert/strict'
import { calculateSnapshotCost, compareSnapshots } from '../src/core'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status'
import { normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective'
import { buildMasterDataWarningItems, MASTER_DATA_WARNING_CATEGORY_DEFINITIONS } from '../src/features/master-data/prepare-dataset'
import {
  createSyntheticDataQualitySnapshotPair,
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

const qualityPair = createSyntheticDataQualitySnapshotPair()
const qualityComparison = compareSnapshots(qualityPair.reference, qualityPair.current)
assert.ok(qualityComparison.referenceCost.total !== null, 'quality fixture has a complete Reference snapshot')
assert.equal(qualityComparison.currentCost.total, null, 'missing inputs keep Current unavailable rather than zero')
assert.ok(qualityComparison.currentCost.warnings.length > 0, 'missing inputs are explained by calculation warnings')
assert.ok(qualityComparison.productFieldDiffs.productName, 'different Product Names remain visible as a mismatch')
assert.ok(qualityComparison.processingFindings.some(finding => finding.workCenterCode === 'WC-MISSING' && finding.costGap === null),
  'an unpriced Work Center stays unavailable')

const loadedPair = {
  reference: normalizeMasterDataSnapshot(qualityPair.reference),
  current: normalizeMasterDataSnapshot(qualityPair.current)
}
assert.equal(new Set(loadedPair.current.bom.map(row => row.description.toLocaleLowerCase())).size, loadedPair.current.bom.length,
  'the single Working-state mock resolves duplicate effective BOM identities')
assert.ok(loadedPair.current.bom.some(row => row.autoRenamedFrom), 'the mock records duplicate auto-renames for warning review')
const mockWarnings = buildMasterDataWarningItems({ ...loadedPair, custom: normalizeMasterDataSnapshot(qualityPair.current) })
assert.ok(mockWarnings.some(item => item.category === 'auto-renamed-duplicate'), 'the mock exposes automatic renames as warning items')
assert.ok(mockWarnings.some(item => item.category === 'missing-value'), 'the mock exposes missing values as warning items')
assert.deepEqual(MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(definition => definition.category), [
  'generated-identity', 'missing-value', 'auto-renamed-duplicate'
], 'Prepare Dataset exposes exactly three warning categories')
assert.ok(mockWarnings.every(item => MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.some(definition => definition.category === item.category)),
  'mock warnings use only canonical visible categories')

console.log('Synthetic fixtures cover comparison states, data quality, effective identities, and ordinary mock warnings.')
