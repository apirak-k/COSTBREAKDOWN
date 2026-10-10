import assert from 'node:assert/strict'
import { evaluateMasterDataHandoff } from '../src/core/calculations/master-data-handoff.ts'

const product = {
  productName: 'Demo',
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
assert.equal(productCodeOnlyMismatch.productMismatch, false)
assert.deepEqual(productCodeOnlyMismatch.issues, [])
assert.deepEqual(productCodeOnlyMismatch.warnings, [], 'Product Code differences alone do not create data warnings')

const productUomMismatch = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  current: { ...pair.current, product: { ...product, uom: 'KG' } }
})
assert.equal(productUomMismatch.productMismatch, true, 'UOM differences create Product Mismatch even when Product Name matches')

const normalizedProductMatch = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  reference: { ...pair.reference, product: { ...product, productName: ' Demo ', uom: ' PC ' } },
  current: { ...pair.current, product: { ...product, productName: 'demo', uom: 'pc' } }
})
assert.equal(normalizedProductMatch.productMismatch, false, 'Product Name and UOM comparison trims and normalizes case')

const productNameMismatch = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  current: { ...pair.current, product: { ...product, productCode: 'P-001', productName: 'Different Demo', productDescription: 'Different Demo' } }
})
assert.equal(productNameMismatch.datasetsPrepared, true)
assert.equal(productNameMismatch.productMismatch, true)
assert.deepEqual(productNameMismatch.issues, [])
assert.deepEqual(productNameMismatch.warnings, [], 'Product Mismatch is reported as status, not warning')

const differentNamesSameCode = evaluateMasterDataHandoff(baseSession, {
  ...pair,
  reference: { ...pair.reference, product: { ...product, productCode: 'SAME', productName: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: 'SAME', productName: 'Current product' } }
})
assert.equal(differentNamesSameCode.productMismatch, true, 'Product Name differences remain visible with matching Product Codes')
assert.deepEqual(differentNamesSameCode.warnings, [])

const oneNameMissing = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productName: '', productDescription: '' } },
  current: pair.current
})
assert.equal(oneNameMissing.productMismatch, true, 'a blank Product Name differs from a nonblank effective name')
assert.deepEqual(oneNameMissing.warnings, [], 'blank Product Name is metadata and is not a required-data warning')

const noProductNames = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productName: '', productDescription: 'Reference description' } },
  current: { ...pair.current, product: { ...product, productName: '', productDescription: 'Current description' } }
})
assert.equal(noProductNames.productMismatch, false, 'two blank Product Names match')
assert.deepEqual(noProductNames.warnings, [])

const legacyDerived = evaluateMasterDataHandoff({
  product,
  snapshotPair: pair,
  snapshotPairMode: 'derived'
}, pair)
assert.equal(legacyDerived.datasetsPrepared, false)
assert.equal(legacyDerived.referenceReady, false)
assert.equal(legacyDerived.currentReady, false)

console.log('Master Data handoff verification passed.')
