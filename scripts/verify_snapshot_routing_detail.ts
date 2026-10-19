import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
const { calculateSnapshotRoutingDetail } = await vite.ssrLoadModule('/src/core/calculations/snapshot-routing-detail.ts')

const base = {
  id: 'route-1',
  operationCode: 'OP-10',
  processName: 'Assembly',
  manning: 1,
  capacity: 10,
  yield: 1,
  sourceRef: 'fixture',
  confidence: {}
}

const result = calculateSnapshotRoutingDetail(
  {
    reference: { ...base, workCenterId: 'WC-REF' },
    current: { ...base, workCenterId: 'WC-CUR' }
  },
  [{ id: 'ref-rate', workCenterCode: 'WC-REF', description: 'Reference WC', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {} }],
  [{ id: 'cur-rate', workCenterCode: 'WC-CUR', description: 'Current WC', laborRate: 30, burdenRate: 40, effectiveDate: '2026-01-01', confidence: {} }]
)

assert.equal(result.referenceRuntime, 0.1)
assert.equal(result.currentRuntime, 0.1)
assert.equal(result.referenceTotal, 3)
assert.equal(result.currentTotal, 7)
assert.equal(result.totalGap, 4)

const added = calculateSnapshotRoutingDetail(
  { current: { ...base, workCenterId: 'WC-ADD' } },
  [],
  [{ id: 'add-rate', workCenterCode: 'WC-ADD', description: 'Added WC', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {} }]
)
assert.equal(added.referenceTotal, 0, 'an absent Reference record remains zero for an added Routing row')
assert.equal(added.currentTotal, 3)
assert.equal(added.totalGap, 3)

const removed = calculateSnapshotRoutingDetail(
  { reference: { ...base, workCenterId: 'WC-REMOVE' } },
  [{ id: 'remove-rate', workCenterCode: 'WC-REMOVE', description: 'Removed WC', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {} }],
  []
)
assert.equal(removed.referenceTotal, 3)
assert.equal(removed.currentTotal, 0, 'an absent Current record remains zero for a removed Routing row')
assert.equal(removed.totalGap, -3)

const missingRate = calculateSnapshotRoutingDetail(
  { current: { ...base, workCenterId: 'WC-MISSING' } },
  [],
  []
)
assert.equal(missingRate.currentRuntime, 0.1)
assert.equal(missingRate.currentTotal, null)
assert.equal(missingRate.totalGap, null)

const duplicateRate = calculateSnapshotRoutingDetail(
  { current: { ...base, workCenterId: 'WC-DUPLICATE' } },
  [],
  [
    { id: 'dup-1', workCenterCode: 'WC-DUPLICATE', description: 'Duplicate 1', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {} },
    { id: 'dup-2', workCenterCode: 'WC-DUPLICATE', description: 'Duplicate 2', laborRate: 30, burdenRate: 40, effectiveDate: '2026-01-01', confidence: {} }
  ]
)
assert.equal(duplicateRate.currentRuntime, 0.1)
assert.equal(duplicateRate.currentTotal, null)

for (const [stepOverrides, rateOverrides, field] of [
  [{ manning: -1 }, {}, 'manning'],
  [{ capacity: 0 }, {}, 'capacity'],
  [{ yield: 1.01 }, {}, 'yield'],
  [{}, { laborRate: -1 }, 'laborRate'],
  [{}, { burdenRate: -1 }, 'burdenRate']
] as const) {
  const invalidDetail = calculateSnapshotRoutingDetail(
    { current: { ...base, ...stepOverrides, workCenterId: 'WC-INVALID' } },
    [],
    [{ id: 'invalid-rate', workCenterCode: 'WC-INVALID', description: 'Invalid WC', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {}, ...rateOverrides }]
  )
  assert.equal(invalidDetail.currentTotal, null, `invalid ${field} must make the dependent detail unavailable`)
  assert.equal(invalidDetail.totalGap, null)
}

const validBoundary = calculateSnapshotRoutingDetail(
  { current: { ...base, manning: 0, capacity: 1, yield: 1, workCenterId: 'WC-ZERO' } },
  [],
  [{ id: 'zero-rate', workCenterCode: 'WC-ZERO', description: 'Zero WC', laborRate: 0, burdenRate: 0, effectiveDate: '2026-01-01', confidence: {} }]
)
assert.equal(validBoundary.currentTotal, 0, 'zero Manning/rates and maximum Yield are valid boundaries')

console.log('Snapshot routing detail verification passed.')
await vite.close()
