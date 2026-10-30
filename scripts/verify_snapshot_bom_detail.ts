import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
const { calculateSnapshotBOMDetail } = await vite.ssrLoadModule('/src/core/calculations/snapshot-bom-detail.ts')

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

const added = calculateSnapshotBOMDetail({
  current: { ...base, consumption: 1, price: 10, loss: 0 }
})
assert.equal(added.referenceCost, 0, 'an absent Reference record remains zero for an added BOM row')
assert.equal(added.currentCost, 10)
assert.equal(added.costGap, 10)

const removed = calculateSnapshotBOMDetail({
  reference: { ...base, consumption: 1, price: 10, loss: 0 }
})
assert.equal(removed.referenceCost, 10)
assert.equal(removed.currentCost, 0, 'an absent Current record remains zero for a removed BOM row')
assert.equal(removed.costGap, -10)

const missing = calculateSnapshotBOMDetail({
  current: { ...base, consumption: 1, price: null, loss: 0 }
})
assert.equal(missing.currentCost, null)
assert.equal(missing.costGap, null)

for (const invalid of [
  { consumption: -1, price: 10, loss: 0 },
  { consumption: 1, price: -10, loss: 0 },
  { consumption: 1, price: 10, loss: -0.01 },
  { consumption: 1, price: 10, loss: 1.01 }
]) {
  const invalidDetail = calculateSnapshotBOMDetail({
    current: { ...base, ...invalid }
  })
  assert.equal(invalidDetail.currentCost, null, `invalid BOM domain must be unavailable: ${JSON.stringify(invalid)}`)
  assert.equal(invalidDetail.costGap, null)
}

const validBoundary = calculateSnapshotBOMDetail({
  current: { ...base, consumption: 0, price: 0, loss: 1 }
})
assert.equal(validBoundary.currentCost, 0, 'zero Usage/Price and 100% Loss are valid domain boundaries')

console.log('Snapshot BOM detail verification passed.')
await vite.close()
