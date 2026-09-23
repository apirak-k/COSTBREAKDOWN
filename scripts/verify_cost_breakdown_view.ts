import assert from 'node:assert/strict'
import { findingNeedsReview, isVisibleInComparisonView } from '../src/features/cost-breakdown/components/comparison-view.ts'

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

const missing = {
  ...unchanged,
  confidence: 'missing' as const
}

assert.equal(findingNeedsReview(unchanged), false)
assert.equal(findingNeedsReview(modified), true)
assert.equal(findingNeedsReview(missing), true)
assert.equal(isVisibleInComparisonView(unchanged, 'all'), true)
assert.equal(isVisibleInComparisonView(unchanged, 'changed'), false)
assert.equal(isVisibleInComparisonView(undefined, 'changed'), true)
assert.equal(isVisibleInComparisonView(modified, 'changed'), true)

console.log('Cost Breakdown view verification passed.')
