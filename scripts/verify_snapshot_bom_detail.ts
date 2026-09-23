import assert from 'node:assert/strict'
import { calculateSnapshotBOMDetail } from '../src/core/calculations/snapshot-bom-detail.ts'

function assertClose(actual: number | null, expected: number): void {
  assert.ok(actual !== null)
  assert.ok(Math.abs(actual - expected) < 0.0000001, `${actual} is not close to ${expected}`)
}

const base = {
  id: 'bom-1',
  itemCode: 'MAT-1',
  description: 'Material',
  unit: 'PC',
  sourceRef: 'fixture',
  confidence: {}
}

const complete = calculateSnapshotBOMDetail({
  reference: { ...base, consumption: 1, price: 10, loss: 0.1 },
  current: { ...base, consumption: 1, price: 12, loss: 0.1 }
})
assert.equal(complete.referenceCost, 11)
assertClose(complete.currentCost, 13.2)
assertClose(complete.costGap, 2.2)

const missing = calculateSnapshotBOMDetail({
  current: { ...base, consumption: 1, price: null, loss: 0 }
})
assert.equal(missing.currentCost, null)
assert.equal(missing.costGap, null)

console.log('Snapshot BOM detail verification passed.')
