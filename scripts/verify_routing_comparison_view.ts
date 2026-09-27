import assert from 'node:assert/strict'
import type { ComparisonFinding } from '../src/core'
import { getRoutingComparisonLabels } from '../src/features/cost-breakdown/components/RoutingDetailedTable'

const finding = (overrides: Partial<ComparisonFinding>): ComparisonFinding => ({
  matchStatus: 'matched',
  changeFlags: {},
  fieldDiffs: {},
  confidence: 'verified',
  ...overrides
})

assert.deepEqual(getRoutingComparisonLabels(finding({})), ['UNCHANGED'])
assert.deepEqual(getRoutingComparisonLabels(finding({
  changeFlags: { reordered: true, movedWorkCenter: true, changedInputs: true }
})), ['CHANGED'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'added' })), ['ADDED'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'removed' })), ['REMOVED'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'ambiguous' })), [])

console.log('Routing comparison view self-check: PASS')
