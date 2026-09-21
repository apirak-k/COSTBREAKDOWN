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

assert.deepEqual(getRoutingComparisonLabels(finding({})), ['Matched'])
assert.deepEqual(getRoutingComparisonLabels(finding({
  changeFlags: { reordered: true, movedWorkCenter: true, changedInputs: true }
})), ['Reordered', 'Moved WC', 'Changed Input'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'added' })), ['Added'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'removed' })), ['Removed'])
assert.deepEqual(getRoutingComparisonLabels(finding({ matchStatus: 'ambiguous' })), ['Review'])

console.log('Routing comparison view self-check: PASS')
