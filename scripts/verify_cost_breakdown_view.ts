import assert from 'node:assert/strict'
import { isVisibleInComparisonView } from '../src/features/cost-breakdown/components/comparison-view.ts'

const unchanged = {
  matchStatus: 'matched' as const,
  changeFlags: {},
  fieldDiffs: {},
  confidence: 'verified' as const
}

const modified = {
  ...unchanged,
  fieldDiffs: { price: { reference: 10, current: 12 } }
}

const allStatuses = ['UNCHANGED', 'CHANGED', 'ADDED', 'REMOVED'] as const
assert.equal(isVisibleInComparisonView(unchanged, allStatuses), true)
assert.equal(isVisibleInComparisonView(unchanged, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView(undefined, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView(undefined, allStatuses), true, 'All statuses must preserve findings that need identity review')
assert.equal(isVisibleInComparisonView(modified, ['CHANGED']), true)
assert.equal(isVisibleInComparisonView(modified, ['CHANGED', 'ADDED']), true)
assert.equal(isVisibleInComparisonView(modified, []), false)
assert.equal(isVisibleInComparisonView({ ...unchanged, matchStatus: 'added' }, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView({ ...unchanged, matchStatus: 'added' }, ['ADDED']), true)

console.log('Cost Breakdown view verification passed.')
