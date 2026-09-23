import assert from 'node:assert/strict'
import { calculateSnapshotRoutingDetail } from '../src/core/calculations/snapshot-routing-detail.ts'

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

const missingRate = calculateSnapshotRoutingDetail(
  { current: { ...base, workCenterId: 'WC-MISSING' } },
  [],
  []
)
assert.equal(missingRate.currentRuntime, 0.1)
assert.equal(missingRate.currentTotal, null)
assert.equal(missingRate.totalGap, null)

console.log('Snapshot routing detail verification passed.')
