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
  const { getBOMComparisonLabel } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx')
  assert.equal(getBOMComparisonLabel(finding({})), 'UNCHANGED')
  assert.equal(getBOMComparisonLabel(finding({ fieldDiffs: { price: { reference: 1, current: 2 } } })), 'CHANGED')
  assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'added' })), 'ADDED')
  assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'removed' })), 'REMOVED')
  assert.equal(getBOMComparisonLabel(finding({ matchStatus: 'ambiguous' })), null)
} finally {
  await vite.close()
}

console.log('BOM comparison view self-check: PASS')
