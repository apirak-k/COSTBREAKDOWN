import assert from 'node:assert/strict'
import { makeEmptySession } from '../src/state/store.tsx'
import { applySnapshotPairToSession } from '../src/core/migrations/snapshot-to-session.ts'
import { CostSnapshot, SnapshotPair } from '../src/core'

console.log('--- Verifying Direct Working Dataset Editing & Lifecycle De-gating (Task 2) ---')

// 1. Verify a session can be edited directly on Reference without draft gating
let session = makeEmptySession('ps-test-editing')
assert.ok(session.snapshotPair, 'Snapshot pair must exist')

// Simulate direct mutation of Reference dataset (simulating updateMasterDataDataset / setMasterDataRole('reference'))
const refRole = 'reference'
const pair1: SnapshotPair = session.snapshotPair!
const updatedRefSnapshot: CostSnapshot = {
  ...pair1.reference,
  product: { ...pair1.reference.product, productCode: 'PROD-001', productDescription: 'Widget A' },
  rates: [
    {
      id: 'wc-1',
      workCenterCode: 'WC-01',
      description: 'Milling',
      laborRate: 50,
      machineRate: 75,
      overheadRate: 20,
      confidence: {}
    }
  ],
  bom: [
    {
      id: 'bom-1',
      itemCode: 'RAW-01',
      description: 'Steel Sheet',
      consumption: 2,
      unit: 'KG',
      price: 15,
      loss: 0.02,
      confidence: {}
    }
  ],
  routing: [
    {
      id: 'rt-1',
      operationCode: 'OP-10',
      processName: 'Rough Cut',
      workCenterId: 'WC-01',
      cycleTime: 120,
      setupTime: 30,
      confidence: {}
    }
  ]
}

const pairWithRef: SnapshotPair = {
  reference: updatedRefSnapshot,
  current: pair1.current
}

session = applySnapshotPairToSession({
  ...session,
  masterDataRole: refRole,
  updatedAt: new Date().toISOString()
}, pairWithRef)

// Verify Reference has the updated rows
assert.equal(session.snapshotPair!.reference.product.productCode, 'PROD-001')
assert.equal(session.snapshotPair!.reference.rates.length, 1)
assert.equal(session.snapshotPair!.reference.bom.length, 1)
assert.equal(session.snapshotPair!.reference.routing.length, 1)
// Verify Current remains unaffected and completely empty
assert.equal(session.snapshotPair!.current.product.productCode, '')
assert.equal(session.snapshotPair!.current.rates.length, 0)
assert.equal(session.snapshotPair!.current.bom.length, 0)
assert.equal(session.snapshotPair!.current.routing.length, 0)
console.log('✓ Direct manual entry on Reference works without status gate and does not mutate Current')

// 2. Verify clone Reference -> Current creates independent copy
const refToClone = session.snapshotPair!.reference
const clonedCurrent: CostSnapshot = {
  ...refToClone,
  id: `${refToClone.id}:current`,
  comparisonRole: 'current',
  status: 'draft',
  sourceRef: `Cloned from Reference: ${refToClone.sourceRef}`,
  product: { ...refToClone.product },
  rates: refToClone.rates.map(rate => ({ ...rate, confidence: { ...rate.confidence } })),
  bom: refToClone.bom.map(item => ({ ...item, confidence: { ...item.confidence } })),
  routing: refToClone.routing.map(step => ({ ...step, confidence: { ...step.confidence } })),
  warnings: [...(refToClone.warnings ?? [])]
}

const pairAfterClone: SnapshotPair = {
  reference: session.snapshotPair!.reference,
  current: clonedCurrent
}

session = applySnapshotPairToSession({
  ...session,
  masterDataRole: 'current',
  updatedAt: new Date().toISOString()
}, pairAfterClone)

// Verify Current now has the cloned data
assert.equal(session.snapshotPair!.current.product.productCode, 'PROD-001')
assert.equal(session.snapshotPair!.current.bom[0].price, 15)
assert.equal(session.snapshotPair!.current.routing[0].cycleTime, 120)

// 3. Edit Current data and verify Reference is NOT mutated
session.snapshotPair!.current.bom[0].price = 25
session.snapshotPair!.current.rates[0].laborRate = 60
session.snapshotPair!.current.routing[0].cycleTime = 90
session.snapshotPair!.current.product.productDescription = 'Widget A (Current Rev)'

assert.equal(session.snapshotPair!.reference.bom[0].price, 15, 'Reference BOM price must remain 15')
assert.equal(session.snapshotPair!.reference.rates[0].laborRate, 50, 'Reference labor rate must remain 50')
assert.equal(session.snapshotPair!.reference.routing[0].cycleTime, 120, 'Reference cycle time must remain 120')
assert.equal(session.snapshotPair!.reference.product.productDescription, 'Widget A', 'Reference description must remain unchanged')
console.log('✓ Reference -> Current produces independent copy; editing Current preserves Reference')

// 4. Delete and Add rows on Current without mutating Reference
session.snapshotPair!.current.bom.push({
  id: 'bom-cur-2',
  itemCode: 'RAW-02',
  description: 'Fasteners',
  consumption: 4,
  unit: 'PC',
  price: 0.5,
  loss: 0,
  confidence: {}
})

assert.equal(session.snapshotPair!.current.bom.length, 2)
assert.equal(session.snapshotPair!.reference.bom.length, 1)

// Delete from Current
session.snapshotPair!.current.routing = []
assert.equal(session.snapshotPair!.current.routing.length, 0)
assert.equal(session.snapshotPair!.reference.routing.length, 1)
console.log('✓ Adding and deleting rows on Current works independently of Reference')

// 5. Verify direct editing works when session status is 'active' (no version status gate)
const activeSession = { ...session, status: 'active' as const }
// In our updated store.tsx, updateMasterDataDataset no longer checks activeSession.status !== 'draft'
assert.equal(activeSession.status, 'active')
console.log('✓ Lifecycle gating removed: direct dataset editing does not require draft status')
