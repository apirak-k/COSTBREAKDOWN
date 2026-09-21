import assert from 'node:assert/strict'
import type { ComparisonFinding } from '../src/core'
import { getBOMComparisonLabel } from '../src/features/cost-breakdown/components/BOMDetailedTable'

const finding = (overrides: Partial<ComparisonFinding>): ComparisonFinding => ({
  matchStatus: 'matched',
  changeFlags: {},
  fieldDiffs: {},
  confidence: 'verified',
  ...overrides
})

assert.equal(getBOMComparisonLabel(finding({})), 'Matched')
assert.equal(getBOMComparisonLabel(finding({ fieldDiffs: { price: { reference: 1, current: 2 } } })), 'Changed')
assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'added' })), 'Added')
assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'removed' })), 'Removed')
assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'ambiguous' })), 'Review')

console.log('BOM comparison view self-check: PASS')
