import assert from 'node:assert/strict'
import { compareSnapshots } from '../src/core/calculations/snapshot-comparison.ts'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status.ts'
import type { CostSnapshot, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types/snapshot.types.ts'

const product = {
  productCode: 'TEST-001',
  productDescription: 'Synthetic routing fixture',
  uom: 'PC',
  customer: '',
  effectiveDate: ''
}

function routingStep(
  id: string,
  legacyOperationCode: string | undefined,
  overrides: Partial<SnapshotRoutingStep> = {}
): SnapshotRoutingStep {
  return {
    id,
    operationCode: legacyOperationCode,
    processCode: 'LEGACY-PROCESS',
    sequence: 10,
    processName: 'Assembly',
    workCenterId: 'WC-1',
    manning: 1,
    capacity: 100,
    yield: 1,
    sourceRef: 'synthetic-fixture',
    confidence: {},
    ...overrides
  }
}

function snapshot(
  id: string,
  routing: SnapshotRoutingStep[],
  rates: SnapshotWorkCenterRate[] = []
): CostSnapshot {
  return {
    id,
    product,
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates,
    bom: [],
    routing
  }
}

const changedCode = compareSnapshots(
  snapshot('reference', [routingStep('ref-op-10', '10')]),
  snapshot('current', [routingStep('current-op-20', '20')])
)
assert.deepEqual(
  changedCode.routingFindings.map(({ matchStatus, referenceId, currentId }) => ({ matchStatus, referenceId, currentId })),
  [
    { matchStatus: 'matched', referenceId: 'ref-op-10', currentId: 'current-op-20' }
  ],
  'different legacy Operation Codes must still match by the same approved Process identity'
)
assert.deepEqual(changedCode.routingFindings.map(getCanonicalComparisonStatus), ['UNCHANGED'])

const sameCodeDifferentProcess = compareSnapshots(
  snapshot('reference', [routingStep('ref-op-10', '10', { processName: 'Cutting' })]),
  snapshot('current', [routingStep('current-op-10', '10', { processName: 'Packaging' })])
)
assert.deepEqual(
  sameCodeDifferentProcess.routingFindings.map(finding => finding.matchStatus),
  ['removed', 'added'],
  'different Process names remain separate findings even if a legacy Operation Code matches'
)
assert.deepEqual(sameCodeDifferentProcess.routingFindings.map(getCanonicalComparisonStatus), ['REMOVED', 'ADDED'])

// The current Master Data schema uses Process as Routing identity; legacy
// Process Code, Operation Code, and Sequence do not define canonical status.
const legacyProcessCodeChanged = compareSnapshots(
  snapshot('reference', [routingStep('ref-legacy-process', '10', { processCode: 'LEGACY-A' })]),
  snapshot('current', [routingStep('current-legacy-process', '10', { processCode: 'LEGACY-B' })])
)
assert.equal(legacyProcessCodeChanged.routingFindings.length, 1, 'a legacy Process Code edit must preserve the Process match')
assert.equal(legacyProcessCodeChanged.routingFindings[0].matchStatus, 'matched')
assert.equal(
  getCanonicalComparisonStatus(legacyProcessCodeChanged.routingFindings[0]),
  'UNCHANGED',
  'legacy Process Code is outside the neutral business schema and must not produce canonical CHANGED'
)
assert.deepEqual(
  legacyProcessCodeChanged.routingFindings[0].fieldDiffs,
  {},
  'legacy Process Code must not appear among canonical Routing field differences'
)

function workCenterRate(id: string, effectiveDate: string): SnapshotWorkCenterRate {
  return {
    id,
    workCenterCode: 'WC-1',
    description: 'Assembly Center',
    laborRate: 100,
    burdenRate: 50,
    effectiveDate,
    sourceRef: 'synthetic-fixture',
    confidence: {}
  }
}

// Effective Date is excluded from the current neutral dataset schema.
const effectiveDateOnlyChanged = compareSnapshots(
  snapshot('reference', [], [workCenterRate('ref-rate', '2026-01-01')]),
  snapshot('current', [], [workCenterRate('current-rate', '2026-02-01')])
)
assert.equal(effectiveDateOnlyChanged.workCenterFindings.length, 1, 'equal Work Center Code must match across legacy Effective Date edits')
assert.equal(effectiveDateOnlyChanged.workCenterFindings[0].matchStatus, 'matched')
assert.deepEqual(
  effectiveDateOnlyChanged.workCenterFindings[0].fieldDiffs,
  {},
  'legacy Effective Date must not appear among canonical Work Center field differences'
)
assert.equal(
  getCanonicalComparisonStatus(effectiveDateOnlyChanged.workCenterFindings[0]),
  'UNCHANGED',
  'legacy Effective Date alone must not produce canonical CHANGED'
)

const missingProcess = compareSnapshots(
  snapshot('reference', [routingStep('ref-no-process', undefined, { processName: '' })]),
  snapshot('current', [routingStep('current-no-process', undefined, { processName: '' })])
)
assert.deepEqual(missingProcess.routingFindings.map(finding => finding.matchStatus), ['unmatched', 'unmatched'])
assert.deepEqual(missingProcess.routingFindings.map(getCanonicalComparisonStatus), [null, null])
assert.ok(missingProcess.warnings.some(warning => warning.code === 'MISSING_BUSINESS_KEY'))

const duplicateProcess = compareSnapshots(
  snapshot('reference', [routingStep('ref-1', '10'), routingStep('ref-2', '20')]),
  snapshot('current', [routingStep('current-1', '30')])
)
assert.ok(duplicateProcess.routingFindings.every(finding => finding.matchStatus === 'ambiguous'))
assert.deepEqual(duplicateProcess.routingFindings.map(getCanonicalComparisonStatus), [null, null, null])
assert.ok(duplicateProcess.warnings.some(warning => warning.code === 'AMBIGUOUS_KEY'))

const sequenceChanged = compareSnapshots(
  snapshot('reference', [routingStep('ref-sequence', '10', { sequence: 10 })]),
  snapshot('current', [routingStep('current-sequence', '10', { sequence: 20 })])
)
assert.equal(sequenceChanged.routingFindings[0].matchStatus, 'matched')
assert.equal(getCanonicalComparisonStatus(sequenceChanged.routingFindings[0]), 'UNCHANGED')
assert.deepEqual(sequenceChanged.routingFindings[0].fieldDiffs, {})

console.log('Routing Process identity verification passed.')
