import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
const {
  ALL_COMPARISON_STATUSES,
  getComparisonStatusControlLabel,
  isVisibleInComparisonView,
  toggleComparisonStatus
} = await vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts')

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

const allStatuses = ALL_COMPARISON_STATUSES
assert.equal(isVisibleInComparisonView(unchanged, allStatuses), true)
assert.equal(isVisibleInComparisonView(unchanged, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView(undefined, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView(undefined, allStatuses), true, 'All statuses must preserve findings that need identity review')
assert.equal(isVisibleInComparisonView(modified, ['CHANGED']), true)
assert.equal(isVisibleInComparisonView(modified, ['CHANGED', 'ADDED']), true)
assert.equal(isVisibleInComparisonView(modified, []), false)
assert.equal(isVisibleInComparisonView({ ...unchanged, matchStatus: 'added' }, ['CHANGED']), false)
assert.equal(isVisibleInComparisonView({ ...unchanged, matchStatus: 'added' }, ['ADDED']), true)
assert.equal(getComparisonStatusControlLabel(allStatuses), 'Status (All)')
assert.equal(getComparisonStatusControlLabel(['CHANGED']), 'Status (1)')
assert.equal(getComparisonStatusControlLabel(['CHANGED', 'REMOVED']), 'Status (2)')
assert.equal(getComparisonStatusControlLabel(['CHANGED', 'ADDED', 'REMOVED']), 'Status (3)')
assert.doesNotMatch(getComparisonStatusControlLabel(allStatuses), /\(4\)/, 'all four statuses display as All')
const oneStatus = ['CHANGED'] as const
assert.deepEqual(toggleComparisonStatus(oneStatus, 'CHANGED'), oneStatus,
  'attempting to clear the last selected status preserves the filter')
assert.deepEqual(toggleComparisonStatus(['CHANGED', 'ADDED'], 'ADDED'), ['CHANGED'],
  'removing one of multiple statuses leaves the others selected')
assert.deepEqual(toggleComparisonStatus(['CHANGED'], 'ADDED'), ['CHANGED', 'ADDED'],
  'another status can be added while the current selection remains active')

console.log('Cost Breakdown view verification passed.')
} finally {
  await vite.close()
}
