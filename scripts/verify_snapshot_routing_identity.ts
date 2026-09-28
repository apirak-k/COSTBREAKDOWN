import assert from 'node:assert/strict'
import { compareSnapshots } from '../src/core/calculations/snapshot-comparison.ts'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status.ts'
import type { CostSnapshot, SnapshotRoutingStep } from '../src/core/types/snapshot.types.ts'

const product = {
  productCode: 'TEST-001',
  productDescription: 'Synthetic routing fixture',
  uom: 'PC',
  customer: '',
  effectiveDate: ''
}

function routingStep(
  id: string,
  operationCode: string | undefined,
  overrides: Partial<SnapshotRoutingStep> = {}
): SnapshotRoutingStep {
  return {
    id,
    operationCode,
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

function snapshot(id: string, routing: SnapshotRoutingStep[]): CostSnapshot {
  return {
    id,
    product,
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [],
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
    { matchStatus: 'removed', referenceId: 'ref-op-10', currentId: undefined },
    { matchStatus: 'added', referenceId: undefined, currentId: 'current-op-20' }
  ],
  'different Operation Codes must remain separate Removed/Added records even when Process Code matches'
)
assert.ok(!changedCode.routingFindings.some(finding => String(finding.matchStatus) === 'replace'))
assert.deepEqual(changedCode.routingFindings.map(getCanonicalComparisonStatus), ['REMOVED', 'ADDED'])

const sameCodeDifferentProcess = compareSnapshots(
  snapshot('reference', [routingStep('ref-op-10', '10', { processName: 'Cutting' })]),
  snapshot('current', [routingStep('current-op-10', '10', { processName: 'Packaging' })])
)
assert.equal(sameCodeDifferentProcess.routingFindings.length, 1, 'equal Operation Codes match despite changed Process Name')
assert.equal(sameCodeDifferentProcess.routingFindings[0].matchStatus, 'matched')
assert.equal(getCanonicalComparisonStatus(sameCodeDifferentProcess.routingFindings[0]), 'CHANGED')

const missingCode = compareSnapshots(
  snapshot('reference', [routingStep('ref-no-op-code', undefined)]),
  snapshot('current', [routingStep('current-no-op-code', undefined)])
)
assert.deepEqual(missingCode.routingFindings.map(finding => finding.matchStatus), ['unmatched', 'unmatched'])
assert.deepEqual(missingCode.routingFindings.map(getCanonicalComparisonStatus), [null, null])
assert.ok(missingCode.warnings.some(warning => warning.code === 'MISSING_BUSINESS_KEY'))

const duplicateCode = compareSnapshots(
  snapshot('reference', [routingStep('ref-1', '10'), routingStep('ref-2', '10')]),
  snapshot('current', [routingStep('current-1', '10')])
)
assert.ok(duplicateCode.routingFindings.every(finding => finding.matchStatus === 'ambiguous'))
assert.deepEqual(duplicateCode.routingFindings.map(getCanonicalComparisonStatus), [null, null, null])
assert.ok(duplicateCode.warnings.some(warning => warning.code === 'AMBIGUOUS_KEY'))

const sequenceChanged = compareSnapshots(
  snapshot('reference', [routingStep('ref-sequence', '10', { sequence: 10 })]),
  snapshot('current', [routingStep('current-sequence', '10', { sequence: 20 })])
)
assert.equal(sequenceChanged.routingFindings[0].matchStatus, 'matched')
assert.equal(getCanonicalComparisonStatus(sequenceChanged.routingFindings[0]), 'CHANGED')
assert.equal(sequenceChanged.routingFindings[0].changeFlags.reordered, true)
assert.deepEqual(sequenceChanged.routingFindings[0].fieldDiffs.sequence, { reference: 10, current: 20 })

console.log('Routing Operation Code identity verification passed.')
