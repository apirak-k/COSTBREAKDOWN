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
  snapshotPair: pair,
  snapshotPairMode: 'independent' as const,
  preparedSnapshotRoles: { reference: true, current: true }
}

const ready = evaluateMasterDataHandoff(baseSession, pair)
assert.equal(ready.datasetsPrepared, true)

const noRolesPrepared = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: false, current: false }
}, pair)
assert.equal(noRolesPrepared.datasetsPrepared, false)
assert.equal(noRolesPrepared.referenceReady, false)
assert.equal(noRolesPrepared.currentReady, false)
assert.ok(noRolesPrepared.issues.includes('Reference dataset is not prepared yet.'))
assert.ok(noRolesPrepared.issues.includes('Current dataset is not prepared yet.'))

const referenceOnly = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: true, current: false }
}, pair)
assert.equal(referenceOnly.datasetsPrepared, false)
assert.equal(referenceOnly.referenceReady, true)
assert.equal(referenceOnly.currentReady, false)
assert.ok(referenceOnly.issues.includes('Current dataset is not prepared yet.'))

const currentOnly = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: false, current: true }
}, pair)
assert.equal(currentOnly.datasetsPrepared, false)
assert.equal(currentOnly.referenceReady, false)
assert.equal(currentOnly.currentReady, true)
assert.ok(currentOnly.issues.includes('Reference dataset is not prepared yet.'))

const bothRolesPrepared = evaluateMasterDataHandoff({
  ...baseSession,
  preparedSnapshotRoles: { reference: true, current: true }
}, pair)
assert.equal(bothRolesPrepared.datasetsPrepared, true)
assert.equal(bothRolesPrepared.referenceReady, true)
assert.equal(bothRolesPrepared.currentReady, true)
assert.deepEqual(bothRolesPrepared.issues, [])

const mismatchedPair = {
  ...pair,
  current: { ...pair.current, product: { ...product, productCode: 'P-999' } }
}
const mismatch = evaluateMasterDataHandoff(baseSession, mismatchedPair)
assert.equal(mismatch.datasetsPrepared, true)
assert.deepEqual(mismatch.issues, [])
assert.ok(mismatch.warnings?.some(warning => warning.includes('Product mismatch: Reference is "P-001" while Current is "P-999"')))
assert.equal(mismatch.warnings?.some(warning => warning.includes('Header Product')), false)

const mismatchedReferencePair = {
  ...pair,
  reference: { ...pair.reference, product: { ...product, productCode: 'P-998' } }
}
const referenceMismatch = evaluateMasterDataHandoff(baseSession, mismatchedReferencePair)
assert.equal(referenceMismatch.datasetsPrepared, true)
assert.deepEqual(referenceMismatch.issues, [])
assert.ok(referenceMismatch.warnings?.some(warning => warning.includes('Product mismatch: Reference is "P-998" while Current is "P-001"')))

const bothProductsMismatch = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: 'P-999' } },
  current: { ...pair.current, product: { ...product, productCode: 'P-999' } }
})
assert.equal(bothProductsMismatch.datasetsPrepared, true)
assert.deepEqual(bothProductsMismatch.issues, [])
assert.equal(bothProductsMismatch.warnings?.some(warning => warning.includes('Product mismatch')), false)

const missingHeaderProduct = evaluateMasterDataHandoff({
  ...baseSession
}, pair)
assert.equal(missingHeaderProduct.datasetsPrepared, true)
assert.deepEqual(missingHeaderProduct.issues, [])

const legacyDerived = evaluateMasterDataHandoff({
  product,
  snapshotPair: pair,
  snapshotPairMode: 'derived'
}, pair)
assert.equal(legacyDerived.datasetsPrepared, false)
assert.equal(legacyDerived.referenceReady, false)
assert.equal(legacyDerived.currentReady, false)

console.log('Master Data handoff verification passed.')
