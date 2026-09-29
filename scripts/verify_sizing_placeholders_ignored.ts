import assert from 'node:assert/strict'
import { CostSnapshot, compareSnapshots, calculateSnapshotCost, buildProcessingCandidates } from '../src/core'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status'

const base: CostSnapshot = {
  id: 'sizing-base',
  status: 'draft',
  sourceRef: 'sizing-fixture',
  product: {
    productCode: 'SIZING-001',
    productDescription: 'Sizing fixture',
    uom: 'PC',
    customer: 'Test',
    effectiveDate: '2026-01-01'
  },
  effectiveDate: '2026-01-01',
  rates: [{
    id: 'rate-wc-1', workCenterCode: 'WC-1', description: 'Center 1',
    laborRate: 10, burdenRate: 5, effectiveDate: '2026-01-01', confidence: {}
  }],
  bom: [{
    id: 'bom-mat-1', itemCode: 'MAT-1', description: 'Material 1',
    consumption: 2, unit: 'KG', price: 3, loss: 0, confidence: {}
  }],
  routing: [{
    id: 'route-op-10', operationCode: 'OP-10', processName: 'Assembly', sequence: 10,
    workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {}
  }]
}

const reference: CostSnapshot = { ...base, id: 'sizing-reference' }
const current: CostSnapshot = {
  ...base,
  id: 'sizing-current',
  rates: [...base.rates, {
    id: 'size-rate-1', isGeneratedSizingPlaceholder: true, workCenterCode: '',
    description: '', laborRate: null, burdenRate: null, effectiveDate: '', confidence: {}
  }],
  bom: [...base.bom, {
    id: 'size-bom-1', isGeneratedSizingPlaceholder: true, itemCode: '', description: '',
    consumption: null, unit: '', price: null, loss: null, confidence: {}
  }],
  routing: [...base.routing, {
    id: 'size-routing-1', isGeneratedSizingPlaceholder: true,
    operationCode: '', processName: '', sequence: undefined, workCenterId: 'WC-1',
    manning: null, capacity: null, yield: null, confidence: {}
  }]
}

const referenceCost = calculateSnapshotCost(reference)
const currentCost = calculateSnapshotCost(current)
assert.equal(referenceCost.status, 'complete')
assert.equal(currentCost.status, 'complete', 'untouched sizing slots must not make a populated dataset incomplete')
assert.equal(currentCost.total, referenceCost.total)
assert.deepEqual(currentCost.warnings, [])

const comparison = compareSnapshots(reference, current)
assert.equal(comparison.referenceCost.status, 'complete')
assert.equal(comparison.currentCost.status, 'complete')
assert.ok(!comparison.bomFindings.some(finding => finding.currentId === 'size-bom-1'))
assert.ok(!comparison.routingFindings.some(finding => finding.currentId === 'size-routing-1'))
assert.ok(!comparison.workCenterFindings.some(finding => finding.currentId === 'size-rate-1'))
assert.ok(!comparison.warnings.some(warning => warning.code === 'MISSING_BUSINESS_KEY'))
assert.deepEqual(buildProcessingCandidates(comparison), [])

const metadataReference: CostSnapshot = {
  ...base,
  id: 'metadata-reference',
  rates: base.rates.map(rate => ({ ...rate, id: 'rate-metadata-reference' })),
  bom: base.bom.map(item => ({ ...item, id: 'bom-metadata-reference' })),
  routing: base.routing.map(step => ({ ...step, id: 'routing-metadata-reference' }))
}
const metadataCurrent: CostSnapshot = {
  ...base,
  id: 'metadata-current',
  rates: base.rates.map(rate => ({ ...rate, id: 'rate-metadata-current', isGeneratedSizingPlaceholder: false })),
  bom: base.bom.map(item => ({ ...item, id: 'bom-metadata-current', isGeneratedSizingPlaceholder: false })),
  routing: base.routing.map(step => ({ ...step, id: 'routing-metadata-current', isGeneratedSizingPlaceholder: false }))
}
const metadataComparison = compareSnapshots(metadataReference, metadataCurrent)
const metadataBOMFinding = metadataComparison.bomFindings.find(finding => finding.currentId === 'bom-metadata-current')
assert.ok(metadataBOMFinding, 'equivalent BOM rows with different sizing metadata must match')
assert.deepEqual(metadataBOMFinding.fieldDiffs, {}, 'the internal sizing marker is not a business field')
assert.equal(getCanonicalComparisonStatus(metadataBOMFinding), 'UNCHANGED')
assert.equal(metadataBOMFinding.costGap, 0)

const metadataRoutingFinding = metadataComparison.routingFindings.find(finding => finding.currentId === 'routing-metadata-current')
assert.ok(metadataRoutingFinding, 'equivalent Routing rows with different sizing metadata must match')
assert.deepEqual(metadataRoutingFinding.fieldDiffs, {})
assert.equal(getCanonicalComparisonStatus(metadataRoutingFinding), 'UNCHANGED')

const metadataRateFinding = metadataComparison.workCenterFindings.find(finding => finding.currentId === 'rate-metadata-current')
assert.ok(metadataRateFinding, 'equivalent Work Center rows with different sizing metadata must match')
assert.deepEqual(metadataRateFinding.fieldDiffs, {})
assert.equal(getCanonicalComparisonStatus(metadataRateFinding), 'UNCHANGED')
assert.equal(metadataComparison.totalGap, 0)

const userBlankRow: CostSnapshot = {
  ...base,
  id: 'user-blank-row',
  bom: [...base.bom, {
    id: 'manual-bom-blank', itemCode: '', description: '', consumption: null,
    unit: '', price: null, loss: null, confidence: {}
  }]
}
assert.equal(calculateSnapshotCost(userBlankRow).status, 'missing', 'a non-placeholder blank row remains missing data')

console.log('Sizing placeholder verification passed.')
