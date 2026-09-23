import assert from 'node:assert/strict'
import { evaluateMasterDataHandoff } from '../src/core/calculations/master-data-handoff.ts'

const product = {
  productCode: 'P-001',
  productDescription: 'Demo',
  uom: 'PC',
  customer: 'Demo',
  effectiveDate: '2026-01-01'
}

const pair = {
  reference: {
    id: 'reference',
    product,
    effectiveDate: product.effectiveDate,
    sourceRef: 'reference.xlsx',
    comparisonRole: 'reference' as const,
    status: 'draft' as const,
    rates: [],
    bom: [],
    routing: []
  },
  current: {
    id: 'current',
    product,
    effectiveDate: product.effectiveDate,
    sourceRef: 'current.xlsx',
    comparisonRole: 'current' as const,
    status: 'draft' as const,
    rates: [],
    bom: [],
    routing: []
  }
}

const baseSession = {
  product,
  snapshotPair: pair,
  snapshotPairMode: 'independent' as const,
  preparedSnapshotRoles: { reference: true, current: true }
}

const ready = evaluateMasterDataHandoff(baseSession, pair)
assert.equal(ready.canCompare, true)
assert.equal(ready.productCode, product.productCode)

const noRolesPrepared = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: false, current: false }
}, pair)
assert.equal(noRolesPrepared.canCompare, false)
assert.equal(noRolesPrepared.referenceReady, false)
assert.equal(noRolesPrepared.currentReady, false)
assert.ok(noRolesPrepared.issues.includes('Reference dataset is not prepared yet.'))
assert.ok(noRolesPrepared.issues.includes('Current dataset is not prepared yet.'))

const referenceOnly = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: true, current: false }
}, pair)
assert.equal(referenceOnly.canCompare, false)
assert.equal(referenceOnly.referenceReady, true)
assert.equal(referenceOnly.currentReady, false)
assert.ok(referenceOnly.issues.includes('Current dataset is not prepared yet.'))

const currentOnly = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: false, current: true }
}, pair)
assert.equal(currentOnly.canCompare, false)
assert.equal(currentOnly.referenceReady, false)
assert.equal(currentOnly.currentReady, true)
assert.ok(currentOnly.issues.includes('Reference dataset is not prepared yet.'))

const bothRolesPrepared = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: true, current: true }
}, pair)
assert.equal(bothRolesPrepared.canCompare, true)
assert.equal(bothRolesPrepared.referenceReady, true)
assert.equal(bothRolesPrepared.currentReady, true)
assert.deepEqual(bothRolesPrepared.issues, [])

const mismatchedPair = {
  ...pair,
  current: { ...pair.current, product: { ...product, productCode: 'P-999' } }
}
const mismatch = evaluateMasterDataHandoff(baseSession, mismatchedPair)
assert.equal(mismatch.canCompare, false)
assert.ok(mismatch.issues.some(issue => issue.includes('Current Product Code does not match')))

const mismatchedReferencePair = {
  ...pair,
  reference: { ...pair.reference, product: { ...product, productCode: 'P-998' } }
}
const referenceMismatch = evaluateMasterDataHandoff(baseSession, mismatchedReferencePair)
assert.equal(referenceMismatch.canCompare, false)
assert.ok(referenceMismatch.issues.some(issue => issue.includes('Reference Product Code does not match')))

const bothProductsMismatch = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: 'P-999' } },
  current: { ...pair.current, product: { ...product, productCode: 'P-999' } }
})
assert.equal(bothProductsMismatch.canCompare, false)
assert.ok(bothProductsMismatch.issues.some(issue => issue.includes('Reference Product Code does not match')))
assert.ok(bothProductsMismatch.issues.some(issue => issue.includes('Current Product Code does not match')))

const missingHeaderProduct = evaluateMasterDataHandoff({
  ...baseSession,
  product: { ...product, productCode: '  ' }
}, pair)
assert.equal(missingHeaderProduct.canCompare, false)
assert.ok(missingHeaderProduct.issues.includes('Header Product Code is required.'))

const legacyDerived = evaluateMasterDataHandoff({
  product,
  snapshotPair: pair,
  snapshotPairMode: 'derived'
}, pair)
assert.equal(legacyDerived.canCompare, false)
assert.equal(legacyDerived.referenceReady, false)
assert.equal(legacyDerived.currentReady, false)

console.log('Master Data handoff verification passed.')
