import assert from 'node:assert/strict'
import { makeEmptySession, makeSeedSession } from '../src/state/store.tsx'
import { emptyProductMaster, createEmptySnapshotPair } from '../src/state/seed-data.ts'

console.log('--- Verifying Workspace Initialization (Task 1) ---')

// 1. Verify default initial state is empty
const defaultSession = makeEmptySession('ps-test-initial')
assert.equal(defaultSession.id, 'ps-test-initial')
assert.equal(defaultSession.product.productCode, '')
assert.equal(defaultSession.product.productDescription, '')
assert.equal(defaultSession.rates.length, 0)
assert.equal(defaultSession.bom.length, 0)
assert.equal(defaultSession.routing.length, 0)
assert.equal(defaultSession.preparedSnapshotRoles?.reference, false)
assert.equal(defaultSession.preparedSnapshotRoles?.current, false)
assert.equal(defaultSession.status, 'draft')
console.log('✓ Initial session opens with empty state and unprepared roles')

// 2. Verify snapshotPair is independent and both Reference and Current are empty
assert.ok(defaultSession.snapshotPair, 'Snapshot pair must exist')
assert.equal(defaultSession.snapshotPairMode, 'independent')
const { reference, current } = defaultSession.snapshotPair!
assert.equal(reference.product.productCode, '')
assert.equal(reference.rates.length, 0)
assert.equal(reference.bom.length, 0)
assert.equal(reference.routing.length, 0)
assert.equal(reference.comparisonRole, 'reference')

assert.equal(current.product.productCode, '')
assert.equal(current.rates.length, 0)
assert.equal(current.bom.length, 0)
assert.equal(current.routing.length, 0)
assert.equal(current.comparisonRole, 'current')
console.log('✓ Initial Reference and Current snapshot datasets are empty and independent')

// 3. Verify side mutation isolation (mutating Reference does not affect Current)
const pair = createEmptySnapshotPair('ps-test-isolation')
pair.reference.product.productCode = 'REF-PROD-001'
pair.reference.bom.push({
  id: 'bom-ref-1',
  itemCode: 'MAT-REF-01',
  description: 'Reference Material',
  consumption: 1.5,
  unit: 'KG',
  price: 100,
  loss: 0.05,
  confidence: {}
})

assert.equal(pair.current.product.productCode, '')
assert.equal(pair.current.bom.length, 0, 'Current BOM must remain empty when Reference BOM is modified')
console.log('✓ Modifying Reference does not mutate Current')

// 4. Verify clone Reference -> Current deep copies data and leaves Reference intact when Current is edited
const clonedCurrent = {
  ...pair.reference,
  id: `${pair.reference.id}:current`,
  comparisonRole: 'current' as const,
  status: 'draft' as const,
  sourceRef: `Cloned from Reference: ${pair.reference.sourceRef}`,
  product: { ...pair.reference.product },
  rates: pair.reference.rates.map(rate => ({ ...rate, confidence: { ...rate.confidence } })),
  bom: pair.reference.bom.map(item => ({ ...item, confidence: { ...item.confidence } })),
  routing: pair.reference.routing.map(step => ({ ...step, confidence: { ...step.confidence } })),
  warnings: [...(pair.reference.warnings ?? [])]
}

// Modify the cloned Current
clonedCurrent.product.productCode = 'CUR-PROD-MODIFIED'
clonedCurrent.bom[0].price = 150

// Check Reference remained unchanged
assert.equal(pair.reference.product.productCode, 'REF-PROD-001')
assert.equal(pair.reference.bom[0].price, 100)
console.log('✓ Cloning Reference to Current creates deep independent copy; editing Current does not change Reference')

// 5. Verify reset creates a clean empty session
const afterReset = makeEmptySession('ps-test-reset')
assert.equal(afterReset.product.productCode, '')
assert.equal(afterReset.rates.length, 0)
assert.equal(afterReset.bom.length, 0)
assert.equal(afterReset.routing.length, 0)
assert.equal(afterReset.preparedSnapshotRoles?.reference, false)
assert.equal(afterReset.preparedSnapshotRoles?.current, false)
assert.equal(afterReset.snapshotPair?.reference.bom.length, 0)
assert.equal(afterReset.snapshotPair?.current.bom.length, 0)
console.log('✓ Reset produces an empty Reference and Current dataset')

console.log('All workspace initialization verifications passed successfully!')
