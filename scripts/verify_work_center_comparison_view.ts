import assert from 'node:assert/strict'
import { createServer } from 'vite'
import type { ComparisonFinding } from '../src/core'

const finding = (overrides: Partial<ComparisonFinding>): ComparisonFinding => ({
  matchStatus: 'matched',
  changeFlags: {},
  fieldDiffs: {},
  confidence: 'verified',
  ...overrides
})

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
try {
  const { getWorkCenterComparisonLabel } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx')
  assert.equal(getWorkCenterComparisonLabel(finding({})), 'UNCHANGED')
  assert.equal(getWorkCenterComparisonLabel(finding({ changeFlags: { changedRate: true } })), 'CHANGED')
  assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'added' })), 'ADDED')
  assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'removed' })), 'REMOVED')
  assert.equal(getWorkCenterComparisonLabel(finding({ matchStatus: 'ambiguous' })), null)
} finally {
  await vite.close()
}

console.log('Work Center comparison view self-check: PASS')
