import assert from 'node:assert/strict'
import type { CostComparison } from '../src/core'
import { summarizeSnapshotComparison } from '../src/features/cost-breakdown/components/SnapshotComparisonCard'

const comparison = {
  referenceCost: { status: 'complete' },
  currentCost: { status: 'estimated' },
  bomFindings: [{ confidence: 'verified' }],
  routingFindings: [{ confidence: 'estimated' }],
  workCenterFindings: [{ confidence: 'missing' }],
  warnings: [{ code: 'MISSING_RATE', message: 'Missing rate' }]
} as CostComparison

const summary = summarizeSnapshotComparison(comparison)

assert.equal(summary.quality, 'Missing')
assert.equal(summary.missingCount, 1)
assert.equal(summary.estimatedCount, 1)
assert.equal(summary.warningCount, 1)

console.log('snapshot comparison view self-check: PASS')
