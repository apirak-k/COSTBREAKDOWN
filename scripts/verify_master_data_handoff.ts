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

const productCodeOnlyMismatch = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  current: { ...pair.current, product: { ...product, productCode: 'P-999' } }
})
assert.equal(productCodeOnlyMismatch.datasetsPrepared, true)
assert.deepEqual(productCodeOnlyMismatch.issues, [])
assert.deepEqual(
  productCodeOnlyMismatch.warnings?.filter(warning => warning.includes('Product mismatch')),
  [],
  'Product Code differences alone do not trigger the Product Name mismatch warning'
)

const productNameMismatch = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  current: { ...pair.current, product: { ...product, productCode: 'P-001', productDescription: 'Different Demo' } }
})
assert.equal(productNameMismatch.datasetsPrepared, true)
assert.deepEqual(productNameMismatch.issues, [])
assert.deepEqual(
  productNameMismatch.warnings?.filter(warning => warning.includes('Product mismatch')),
  ['Product mismatch: Reference is "Demo" while Current is "Different Demo".']
)

const differentNamesSameCode = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  reference: { ...pair.reference, product: { ...product, productCode: 'SAME', productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: 'SAME', productDescription: 'Current product' } }
})
assert.deepEqual(
  differentNamesSameCode.warnings?.filter(warning => warning.includes('Product mismatch')),
  ['Product mismatch: Reference is "Reference product" while Current is "Current product".'],
  'Product Name differences trigger a warning even when Product Codes match'
)

const oneNameMissing = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productDescription: '' } },
  current: pair.current
})
assert.deepEqual(oneNameMissing.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.ok(oneNameMissing.warnings?.includes('Reference Product Name is not specified.'))

const noProductNames = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productDescription: '' } },
  current: { ...pair.current, product: { ...product, productDescription: '' } }
})
assert.deepEqual(noProductNames.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.deepEqual(noProductNames.warnings, [
  'Reference Product Name is not specified.',
  'Current Product Name is not specified.'
])

const legacyDerived = evaluateMasterDataHandoff({
  product,
  snapshotPair: pair,
  snapshotPairMode: 'derived'
}, pair)
assert.equal(legacyDerived.datasetsPrepared, false)
assert.equal(legacyDerived.referenceReady, false)
assert.equal(legacyDerived.currentReady, false)

console.log('Master Data handoff verification passed.')
