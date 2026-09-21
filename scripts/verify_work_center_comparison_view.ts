import assert from 'node:assert/strict'
import type { ComparisonFinding } from '../src/core'
import { getWorkCenterComparisonLabel } from '../src/features/cost-breakdown/components/WorkCenterComparisonTable'

const finding = (overrides: Partial<ComparisonFinding>): ComparisonFinding => ({
  matchStatus: 'matched',
  changeFlags: {},
  fieldDiffs: {},
  confidence: 'verified',
  ...overrides
})

assert.equal(getWorkCenterComparisonLabel(finding({})), 'Matched')
assert.equal(getWorkCenterComparisonLabel(finding({ changeFlags: { changedRate: true } })), 'Changed Rate')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'added' })), 'Added')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'removed' })), 'Removed')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'ambiguous' })), 'Review')

console.log('Work Center comparison view self-check: PASS')
