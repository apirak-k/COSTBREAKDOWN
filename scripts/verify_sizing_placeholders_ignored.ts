import assert from 'node:assert/strict'
import {
  CostSnapshot,
  buildProcessingCandidates,
  calculateSnapshotCost,
  compareSnapshots,
  getCanonicalComparisonStatus
} from '../src/core'
import { blankIdentityOrdinals } from '../src/features/master-data/table-validation.ts'

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

const current: CostSnapshot = {
  ...base,
  id: 'sizing-current',
  rates: [...base.rates, {
    id: 'size-rate-1', isGeneratedSizingPlaceholder: true, workCenterCode: '',
    description: '', laborRate: null, burdenRate: null, effectiveDate: '', confidence: {
      laborRate: { status: 'missing' }, burdenRate: { status: 'missing' }
    }
  }],
  bom: [...base.bom, {
    id: 'size-bom-1', isGeneratedSizingPlaceholder: true, itemCode: '', description: '',
    consumption: null, unit: 'PC', price: null, loss: null, confidence: {
      consumption: { status: 'missing' }, price: { status: 'missing' }, loss: { status: 'missing' }
    }
  }],
  routing: [...base.routing, {
    id: 'size-routing-1', isGeneratedSizingPlaceholder: true,
    operationCode: '', processName: '', sequence: undefined, workCenterId: undefined,
    manning: null, capacity: null, yield: null, confidence: {
      manning: { status: 'missing' }, capacity: { status: 'missing' }, yield: { status: 'missing' }
    }
  }]
}

const currentCost = calculateSnapshotCost(current)
assert.equal(currentCost.status, 'missing', 'blank Sizing rows make the dataset incomplete')
assert.equal(currentCost.material, null, 'blank BOM inputs never become zero')
assert.equal(currentCost.labor, null, 'blank Routing inputs never become zero')
assert.equal(currentCost.burden, null, 'blank Routing inputs never become zero')
assert.equal(currentCost.total, null, 'an incomplete dataset has no Standard Cost')

const comparison = compareSnapshots(base, current)
assert.equal(comparison.referenceCost.status, 'complete')
assert.equal(comparison.currentCost.status, 'missing')
assert.equal(comparison.totalGap, null, 'incomplete datasets have no comparable total gap')
for (const [findings, id] of [
  [comparison.bomFindings, 'size-bom-1'],
  [comparison.routingFindings, 'size-routing-1'],
  [comparison.workCenterFindings, 'size-rate-1']
] as const) {
  const finding = findings.find(row => row.currentId === id)
  assert.ok(finding, `Sizing row ${id} must remain visible in comparison validation`)
  assert.equal(finding.confidence, 'missing')
  assert.equal(getCanonicalComparisonStatus(finding), null, 'MISSING rows are not selectable as complete comparisons')
}
assert.ok(comparison.warnings.some(warning => warning.code === 'MISSING_BUSINESS_KEY'))
assert.deepEqual(buildProcessingCandidates(comparison, base, current), [], 'MISSING Routing rows cannot create candidates')

const incompleteNamed: CostSnapshot = {
  ...base,
  id: 'incomplete-named',
  bom: [{
    ...base.bom[0],
    price: null,
    confidence: { price: { status: 'missing' } }
  }]
}
const incompleteComparison = compareSnapshots(base, incompleteNamed)
const incompleteFinding = incompleteComparison.bomFindings.find(row => row.currentId === 'bom-mat-1')
assert.ok(incompleteFinding)
assert.equal(incompleteFinding.matchStatus, 'matched')
assert.equal(incompleteFinding.confidence, 'missing')
assert.equal(getCanonicalComparisonStatus(incompleteFinding), null)
assert.equal(incompleteFinding.costEffect?.gap.total, null)
assert.equal(incompleteComparison.currentCost.total, null)

const missingIdentity: CostSnapshot = {
  ...base,
  id: 'missing-identity',
  bom: [...base.bom, {
    id: 'bom-placeholder-1', itemCode: '', description: '', consumption: 1,
    unit: 'KG', price: 3, loss: 0, confidence: {}
  }]
}
assert.equal(calculateSnapshotCost(missingIdentity).status, 'missing', 'a blank required identity keeps a dataset MISSING')
assert.equal(calculateSnapshotCost(missingIdentity).total, null)
const missingIdentityFinding = compareSnapshots(base, missingIdentity).bomFindings.find(row => row.currentId === 'bom-placeholder-1')
assert.equal(missingIdentityFinding?.confidence, 'missing')
assert.equal(getCanonicalComparisonStatus(missingIdentityFinding), null)

const mixedRows = [
  { id: 'real-1', name: 'Material A' },
  { id: 'placeholder-1', name: '' },
  { id: 'real-2', name: 'Material B' },
  { id: 'placeholder-2', name: '' },
  { id: 'placeholder-3', name: '' }
]
assert.deepEqual(
  [...blankIdentityOrdinals(mixedRows, row => row.name)],
  [['placeholder-1', 1], ['placeholder-2', 2], ['placeholder-3', 3]],
  'blank identity labels count blank rows only, not UI row positions'
)

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
const metadataFinding = metadataComparison.bomFindings.find(row => row.currentId === 'bom-metadata-current')
assert.ok(metadataFinding)
assert.deepEqual(metadataFinding.fieldDiffs, {}, 'the internal sizing marker is not a business field')
assert.equal(getCanonicalComparisonStatus(metadataFinding), 'UNCHANGED')

console.log('Sizing row completeness verification passed.')
