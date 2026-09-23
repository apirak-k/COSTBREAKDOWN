import assert from 'node:assert/strict'
import { calculateSnapshotCost } from '../src/core/calculations/snapshot-cost.ts'

const product = {
  productCode: 'QUALITY-001',
  productDescription: 'Quality fixture',
  uom: 'PC',
  customer: 'Test',
  effectiveDate: '2026-01-01'
}

const snapshot = {
  id: 'quality-fixture',
  product,
  effectiveDate: product.effectiveDate,
  sourceRef: 'quality-fixture',
  status: 'draft' as const,
  rates: [],
  bom: [{
    id: 'bom-1',
    itemCode: 'MAT-1',
    description: 'Material',
    consumption: 1,
    unit: 'PC',
    price: null,
    loss: 0,
    sourceRef: 'quality-fixture',
    confidence: {}
  }],
  routing: []
}

const missing = calculateSnapshotCost(snapshot)
assert.equal(missing.material, null)
assert.equal(missing.total, null)
assert.equal(missing.status, 'missing')
assert.ok(missing.warnings.some(warning => warning.includes('BOM bom-1 price')))

const zeroSnapshot = {
  ...snapshot,
  id: 'zero-fixture',
  bom: [{ ...snapshot.bom[0], price: 0 }]
}
const explicitZero = calculateSnapshotCost(zeroSnapshot)
assert.equal(explicitZero.material, 0)
assert.equal(explicitZero.total, 0)
assert.equal(explicitZero.warnings.length, 0)

const duplicateRate = calculateSnapshotCost({
  ...zeroSnapshot,
  id: 'duplicate-rate-fixture',
  rates: [
    { id: 'wc-1', workCenterCode: 'WC-1', description: 'Duplicate 1', laborRate: 10, burdenRate: 20, effectiveDate: '2026-01-01', confidence: {} },
    { id: 'wc-2', workCenterCode: 'WC-1', description: 'Duplicate 2', laborRate: 30, burdenRate: 40, effectiveDate: '2026-01-01', confidence: {} }
  ],
  routing: [{
    id: 'route-1',
    operationCode: 'OP-10',
    processName: 'Assembly',
    workCenterId: 'WC-1',
    manning: 1,
    capacity: 1,
    yield: 1,
    confidence: {}
  }]
})
assert.equal(duplicateRate.labor, null)
assert.equal(duplicateRate.burden, null)
assert.ok(duplicateRate.warnings.some(warning => warning.includes('Ambiguous duplicate Work Center rate')))

console.log('Snapshot quality verification passed.')
