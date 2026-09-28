import assert from 'node:assert/strict'
import { compareSnapshots } from '../src/core/calculations/snapshot-comparison.ts'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status.ts'
import type {
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core/types/snapshot.types.ts'

const product = {
  productCode: 'P-001',
  productDescription: 'Demo product',
  uom: 'PC',
  customer: 'Demo',
  effectiveDate: '2026-01-01'
}

const evidence = { status: 'verified' as const, quality: 'valid' as const }
const baseBOM: SnapshotBOMItem = {
  id: 'bom-1',
  itemCode: 'MAT-1',
  description: 'Material',
  consumption: 1,
  unit: 'PC',
  price: 10,
  loss: 0,
  sourceRef: 'source-ref',
  confidence: { consumption: evidence, price: evidence, loss: evidence }
}

const referenceBOM: SnapshotBOMItem = {
  ...baseBOM,
  additionalFields: {
    'Supplier Grade': 'A',
    'Optional Note': null,
    'Retained Configuration': {
      model: { revision: 3, verified: true },
      tags: ['blue', 'reusable']
    },
    Packaging: { format: 'box', dimensions: { width: 10, height: 20 } }
  }
}

const currentBOM: SnapshotBOMItem = {
  ...baseBOM,
  sourceRef: 'source-current',
  confidence: {
    consumption: { ...evidence, sourceRef: 'current-source' },
    price: { ...evidence, sourceRef: 'current-source' },
    loss: { ...evidence, sourceRef: 'current-source' }
  },
  additionalFields: {
    'Supplier Grade': 'B',
    'New Field': 'current-only',
    'Retained Configuration': {
      tags: ['blue', 'reusable'],
      model: { verified: true, revision: 3 }
    },
    Packaging: { format: 'carton', dimensions: { width: 10, height: 20 } }
  }
}

const plainReferenceBOM: SnapshotBOMItem = {
  ...baseBOM,
  id: 'bom-2',
  itemCode: 'MAT-2'
}
const plainCurrentBOM: SnapshotBOMItem = { ...plainReferenceBOM }

const referenceRouting: SnapshotRoutingStep = {
  id: 'routing-1',
  operationCode: 'OP-10',
  sequence: 10,
  processName: 'Cut',
  workCenterId: 'WC-1',
  manning: 1,
  capacity: 100,
  yield: 0.9,
  sourceRef: 'routing-reference',
  confidence: { sequence: evidence, manning: evidence, capacity: evidence, yield: evidence },
  additionalFields: { 'Operator Note': 'Confirm the guard is fitted' }
}
const currentRouting: SnapshotRoutingStep = {
  ...referenceRouting,
  sourceRef: 'routing-current'
}
delete currentRouting.additionalFields

const referenceRate: SnapshotWorkCenterRate = {
  id: 'rate-1',
  workCenterCode: 'WC-1',
  description: 'Cutting',
  laborRate: 50,
  burdenRate: 10,
  effectiveDate: '2026-01-01',
  sourceRef: 'rate-reference',
  confidence: { laborRate: evidence, burdenRate: evidence }
}
const currentRate: SnapshotWorkCenterRate = {
  ...referenceRate,
  sourceRef: 'rate-current',
  additionalFields: { 'Supplier Zone': 'zone-2' }
}

const snapshot = (
  id: string,
  role: 'reference' | 'current',
  bom: SnapshotBOMItem[],
  routing: SnapshotRoutingStep[],
  rates: SnapshotWorkCenterRate[],
  snapshotProduct = product
): CostSnapshot => ({
  id,
  product: snapshotProduct,
  effectiveDate: snapshotProduct.effectiveDate,
  sourceRef: id,
  comparisonRole: role,
  status: 'active',
  rates,
  routing,
  bom
})

const comparison = compareSnapshots(
  snapshot('ref', 'reference', [referenceBOM, plainReferenceBOM], [referenceRouting], [referenceRate]),
  snapshot('current', 'current', [currentBOM, plainCurrentBOM], [currentRouting], [currentRate])
)

const bomFinding = comparison.bomFindings.find(finding => finding.referenceId === 'bom-1')
assert.ok(bomFinding)
assert.equal(bomFinding.matchStatus, 'matched')
assert.deepEqual(bomFinding.fieldDiffs, {
  'additionalFields.Supplier Grade': { reference: 'A', current: 'B' },
  'additionalFields.Optional Note': { reference: null, current: undefined },
  'additionalFields.New Field': { reference: undefined, current: 'current-only' },
  'additionalFields.Packaging': {
    reference: { format: 'box', dimensions: { width: 10, height: 20 } },
    current: { format: 'carton', dimensions: { width: 10, height: 20 } }
  }
})
assert.equal(bomFinding.fieldDiffs.sourceRef, undefined, 'source identity is provenance, not a cost change')
assert.equal(bomFinding.fieldDiffs.confidence, undefined, 'evidence metadata is not a working-value change')
assert.equal(bomFinding.fieldDiffs.additionalFields, undefined, 'custom values are diffed by field')
assert.equal(bomFinding.reviewRequired, true, 'custom values must make review status visible')

const plainBOMFinding = comparison.bomFindings.find(finding => finding.referenceId === 'bom-2')
assert.ok(plainBOMFinding)
assert.notEqual(plainBOMFinding.reviewRequired, true, 'rows without custom values do not require custom-field review')

const routingFinding = comparison.routingFindings[0]
assert.deepEqual(routingFinding.fieldDiffs, {
  'additionalFields.Operator Note': {
    reference: 'Confirm the guard is fitted',
    current: undefined
  }
})
assert.equal(routingFinding.reviewRequired, true)

const workCenterFinding = comparison.workCenterFindings[0]
assert.deepEqual(workCenterFinding.fieldDiffs, {
  'additionalFields.Supplier Zone': { reference: undefined, current: 'zone-2' }
})
assert.equal(workCenterFinding.reviewRequired, true)
assert.equal(workCenterFinding.changeFlags.changedRate, false, 'custom fields are not rate changes')

assert.equal(comparison.totalGap, 0, 'custom and provenance changes do not change calculated cost')
assert.equal(comparison.referenceCost.total, comparison.currentCost.total)

const noteOnlyReference = { ...plainReferenceBOM, id: 'bom-note-only', note: 'Reference note', additionalFields: { Note: 'legacy Reference note' } }
const noteOnlyCurrent = { ...plainReferenceBOM, id: 'bom-note-only-current', note: 'Current note', additionalFields: { Note: 'legacy Current note' } }
const noteOnlyComparison = compareSnapshots(
  snapshot('note-reference', 'reference', [noteOnlyReference], [], []),
  snapshot('note-current', 'current', [noteOnlyCurrent], [], [])
)
assert.deepEqual(noteOnlyComparison.bomFindings[0].fieldDiffs, {}, 'Note is annotation only, including legacy additionalFields.Note')
assert.notEqual(noteOnlyComparison.bomFindings[0].reviewRequired, true, 'Note alone does not require business-field review')
assert.equal(getCanonicalComparisonStatus(noteOnlyComparison.bomFindings[0]), 'UNCHANGED', 'Note-only edits do not change canonical status')

const noteOnlyRoutingComparison = compareSnapshots(
  snapshot('routing-note-reference', 'reference', [], [{ ...referenceRouting, note: 'Reference annotation', additionalFields: undefined }], []),
  snapshot('routing-note-current', 'current', [], [{ ...currentRouting, note: 'Current annotation' }], [])
)
assert.deepEqual(noteOnlyRoutingComparison.routingFindings[0].fieldDiffs, {})
assert.equal(getCanonicalComparisonStatus(noteOnlyRoutingComparison.routingFindings[0]), 'UNCHANGED')

const noteOnlyRateComparison = compareSnapshots(
  snapshot('rate-note-reference', 'reference', [], [], [{ ...referenceRate, note: 'Reference annotation' }]),
  snapshot('rate-note-current', 'current', [], [], [{ ...currentRate, note: 'Current annotation', additionalFields: undefined }])
)
assert.deepEqual(noteOnlyRateComparison.workCenterFindings[0].fieldDiffs, {})
assert.equal(getCanonicalComparisonStatus(noteOnlyRateComparison.workCenterFindings[0]), 'UNCHANGED')

const noteOnlyProductComparison = compareSnapshots(
  snapshot('product-note-reference', 'reference', [], [], [], { ...product, note: 'Reference annotation' }),
  snapshot('product-note-current', 'current', [], [], [], { ...product, note: 'Current annotation' })
)
assert.deepEqual(noteOnlyProductComparison.productFieldDiffs, {})

console.log('Dynamic snapshot comparison verification passed.')
