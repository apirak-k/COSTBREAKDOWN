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

assert.equal(getWorkCenterComparisonLabel(finding({})), 'UNCHANGED')
assert.equal(getWorkCenterComparisonLabel(finding({ changeFlags: { changedRate: true } })), 'CHANGED')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'added' })), 'ADDED')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'removed' })), 'REMOVED')
assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'ambiguous' })), null)

console.log('Work Center comparison view self-check: PASS')
