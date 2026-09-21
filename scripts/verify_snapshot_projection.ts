import assert from 'node:assert/strict'
import {
  projectSnapshotPairToLegacySession,
  updateCurrentSnapshotFromLegacySession
} from '../src/core/migrations/snapshot-to-session'
import type { SnapshotPair } from '../src/core'

const product = {
  productCode: 'P-001',
  productDescription: 'Product',
  uom: 'PC',
  customer: 'Customer',
  effectiveDate: '2026-09-21'
}

const evidence = { status: 'verified' as const }
const pair: SnapshotPair = {
  reference: {
    id: 'ref',
    product,
    effectiveDate: '2026-09-01',
    sourceRef: 'before.xlsx',
    status: 'active',
    rates: [{
      id: 'wc-1', workCenterCode: 'WC-1', description: 'Cutting', laborRate: 100, burdenRate: 50,
      effectiveDate: '2026-09-01', sourceRef: 'before.xlsx', confidence: { laborRate: evidence, burdenRate: evidence }
    }],
    bom: [{
      id: 'bom-old', itemCode: 'MAT-OLD', description: 'Old material', consumption: 1, unit: 'PC', price: 10, loss: 0.1,
      sourceRef: 'before.xlsx', confidence: { consumption: evidence, price: evidence, loss: evidence }
    }],
    routing: [{
      id: 'route-1', operationCode: 'OP-10', sequence: 10, processName: 'Cut', workCenterId: 'WC-1',
      manning: 1, capacity: 100, yield: 0.9, sourceRef: 'before.xlsx', confidence: { manning: evidence, capacity: evidence, yield: evidence }
    }]
  },
  current: {
    id: 'current',
    product,
    effectiveDate: '2026-09-21',
    sourceRef: 'after.xlsx',
    status: 'draft',
    rates: [{
      id: 'wc-1', workCenterCode: 'WC-1', description: 'Cutting', laborRate: 120, burdenRate: 55,
      effectiveDate: '2026-09-21', sourceRef: 'after.xlsx', confidence: { laborRate: evidence, burdenRate: evidence }
    }],
    bom: [{
      id: 'bom-new', itemCode: 'MAT-NEW', description: 'New material', consumption: 2, unit: 'PC', price: 20, loss: 0.2,
      sourceRef: 'after.xlsx', confidence: { consumption: evidence, price: evidence, loss: evidence }
    }],
    routing: [{
      id: 'route-1', operationCode: 'OP-10', sequence: 20, processName: 'Cut', workCenterId: 'WC-1',
      manning: 2, capacity: 80, yield: 0.85, sourceRef: 'after.xlsx', confidence: { manning: evidence, capacity: evidence, yield: evidence }
    }]
  }
}

const projection = projectSnapshotPairToLegacySession(pair)

assert.equal(projection.product.productCode, 'P-001')
assert.equal(projection.rates[0].laborRate, 120)
assert.equal(projection.bom.find(item => item.itemCode === 'MAT-OLD')?.basePrice, 10)
assert.equal(projection.bom.find(item => item.itemCode === 'MAT-OLD')?.activePrice, 0)
assert.equal(projection.bom.find(item => item.itemCode === 'MAT-NEW')?.basePrice, 0)
assert.equal(projection.bom.find(item => item.itemCode === 'MAT-NEW')?.activePrice, 20)
assert.equal(projection.routing[0].baseCap, 100)
assert.equal(projection.routing[0].activeCap, 80)
assert.equal(projection.routing[0].opSeq, 20)

const editedSession = {
  id: 'session',
  ...projection,
  savedDrivers: [],
  status: 'draft' as const,
  createdAt: '2026-09-21T00:00:00.000Z',
  updatedAt: '2026-09-21T00:00:00.000Z',
  snapshotPair: pair,
  snapshotPairMode: 'independent' as const
}
const currentAfterProjection = updateCurrentSnapshotFromLegacySession(editedSession, pair)
assert.deepEqual(currentAfterProjection.bom.map(item => item.itemCode), ['MAT-NEW'])
assert.equal(currentAfterProjection.bom[0].price, 20)

const collisionPair: SnapshotPair = {
  reference: {
    ...pair.reference,
    bom: [
      { ...pair.reference.bom[0], id: 'shared-row', itemCode: 'MAT-REF' },
      ...pair.reference.bom.slice(1)
    ],
    routing: [
      ...pair.reference.routing,
      { ...pair.reference.routing[0], id: 'shared-route', operationCode: 'OP-REF-ONLY', sequence: 30 }
    ]
  },
  current: {
    ...pair.current,
    bom: [
      { ...pair.current.bom[0], id: 'shared-row', itemCode: 'MAT-CURRENT' },
      ...pair.current.bom.slice(1)
    ],
    routing: [
      ...pair.current.routing,
      { ...pair.current.routing[0], id: 'shared-route', operationCode: 'OP-CURRENT-ONLY', sequence: 40 }
    ]
  }
}

const collisionProjection = projectSnapshotPairToLegacySession(collisionPair)
assert.equal(new Set(collisionProjection.bom.map(item => item.id)).size, collisionProjection.bom.length)
assert.equal(new Set(collisionProjection.routing.map(item => item.id)).size, collisionProjection.routing.length)

console.log('Snapshot projection self-check: PASS')
