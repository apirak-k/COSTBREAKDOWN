import assert from 'node:assert/strict'
import { calculateSnapshotCost, compareSnapshots } from '../src/core'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status'
import { createSyntheticReviewSnapshotPair } from '../src/features/master-data/fixtures/synthetic-review-data'

const pair = createSyntheticReviewSnapshotPair()
const comparison = compareSnapshots(pair.reference, pair.current)

function countStatuses(findings: typeof comparison.bomFindings) {
  const counts = { UNCHANGED: 0, CHANGED: 0, ADDED: 0, REMOVED: 0 }
  for (const finding of findings) {
    const status = getCanonicalComparisonStatus(finding)
    if (status) counts[status] += 1
  }
  return counts
}

assert.deepEqual(countStatuses(comparison.bomFindings), {
  UNCHANGED: 1, CHANGED: 1, ADDED: 1, REMOVED: 1
})
assert.deepEqual(countStatuses(comparison.routingFindings), {
  UNCHANGED: 1, CHANGED: 1, ADDED: 1, REMOVED: 1
})
assert.deepEqual(countStatuses(comparison.workCenterFindings), {
  UNCHANGED: 1, CHANGED: 1, ADDED: 0, REMOVED: 0
})
assert.ok(calculateSnapshotCost(pair.reference).total !== null)
assert.ok(calculateSnapshotCost(pair.current).total !== null)

console.log('Synthetic review fixture covers unchanged, changed, added, removed, and rate-change comparisons.')
