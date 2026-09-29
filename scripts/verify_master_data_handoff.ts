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
assert.equal(mismatch.warnings?.filter(warning => warning.includes('Product mismatch')).length, 1)
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

const missingCodesSameNamePair = {
  reference: { ...pair.reference, product: { ...product, productCode: '' } },
  current: { ...pair.current, product: { ...product, productCode: '' } }
}
const missingCodesSameName = evaluateMasterDataHandoff(baseSession, missingCodesSameNamePair)
assert.deepEqual(missingCodesSameName.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.equal(missingCodesSameName.datasetsPrepared, true)
assert.deepEqual(missingCodesSameName.issues, [])

const missingCodesDifferentNamesPair = {
  reference: { ...pair.reference, product: { ...product, productCode: '', productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: '', productDescription: 'Current product' } }
}
const missingCodesDifferentNames = evaluateMasterDataHandoff(baseSession, missingCodesDifferentNamesPair)
assert.equal(missingCodesDifferentNames.datasetsPrepared, true)
assert.deepEqual(missingCodesDifferentNames.issues, [])
assert.ok(missingCodesDifferentNames.warnings?.some(warning => warning.includes('Product mismatch: Reference is "Reference product" while Current is "Current product"')))

const missingCodeSameName = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: '' } },
  current: pair.current
})
assert.equal(missingCodeSameName.datasetsPrepared, true)
assert.deepEqual(missingCodeSameName.issues, [])
assert.deepEqual(missingCodeSameName.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.ok(missingCodeSameName.warnings?.includes('Reference Product Code is not specified.'))

const missingCodeDifferentNames = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: '', productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: 'P-001', productDescription: 'Current product' } }
})
assert.equal(missingCodeDifferentNames.datasetsPrepared, true)
assert.deepEqual(missingCodeDifferentNames.issues, [])
assert.ok(missingCodeDifferentNames.warnings?.some(warning => warning.includes('Product mismatch: Reference is "Reference product" while Current is "Current product"')))
assert.ok(missingCodeDifferentNames.warnings?.includes('Reference Product Code is not specified.'))

const currentMissingCodeSameName = evaluateMasterDataHandoff(baseSession, {
  reference: pair.reference,
  current: { ...pair.current, product: { ...product, productCode: '' } }
})
assert.equal(currentMissingCodeSameName.datasetsPrepared, true)
assert.deepEqual(currentMissingCodeSameName.issues, [])
assert.deepEqual(currentMissingCodeSameName.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.ok(currentMissingCodeSameName.warnings?.includes('Current Product Code is not specified.'))

const currentMissingCodeDifferentNames = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: '', productDescription: 'Current product' } }
})
assert.equal(currentMissingCodeDifferentNames.datasetsPrepared, true)
assert.deepEqual(currentMissingCodeDifferentNames.issues, [])
assert.ok(currentMissingCodeDifferentNames.warnings?.some(warning => warning.includes('Product mismatch: Reference is "Reference product" while Current is "Current product"')))
assert.ok(currentMissingCodeDifferentNames.warnings?.includes('Current Product Code is not specified.'))

const sameCodeDifferentName = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productDescription: 'Current product' } }
})
assert.deepEqual(sameCodeDifferentName.warnings?.filter(warning => warning.includes('Product mismatch')), [], 'matching Product Codes are primary even if Product Names differ')

const bothCodesDifferentNamesDiffer = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: 'REF-1', productDescription: 'Reference product' } },
  current: { ...pair.current, product: { ...product, productCode: 'CUR-1', productDescription: 'Current product' } }
})
assert.equal(bothCodesDifferentNamesDiffer.datasetsPrepared, true)
assert.deepEqual(bothCodesDifferentNamesDiffer.issues, [])
assert.deepEqual(
  bothCodesDifferentNamesDiffer.warnings?.filter(warning => warning.includes('Product mismatch')),
  ['Product mismatch: Reference is "REF-1" while Current is "CUR-1".'],
  'when both Product Codes exist, use only the primary Code comparison'
)

const oneNameMissing = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productDescription: '' } },
  current: { ...pair.current, product }
})
assert.deepEqual(oneNameMissing.warnings?.filter(warning => warning.includes('Product mismatch')), [])

const missingCodeAndName = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: '', productDescription: '' } },
  current: pair.current
})
assert.equal(missingCodeAndName.datasetsPrepared, true)
assert.deepEqual(missingCodeAndName.issues, [])
assert.deepEqual(missingCodeAndName.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.deepEqual(missingCodeAndName.warnings, ['Reference Product Code is not specified.'])

const noIdentifiers = evaluateMasterDataHandoff(baseSession, {
  reference: { ...pair.reference, product: { ...product, productCode: '', productDescription: '' } },
  current: { ...pair.current, product: { ...product, productCode: '', productDescription: '' } }
})
assert.deepEqual(noIdentifiers.warnings?.filter(warning => warning.includes('Product mismatch')), [])
assert.deepEqual(noIdentifiers.warnings, [
  'Reference Product Code is not specified.',
  'Current Product Code is not specified.'
])

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
