import assert from 'node:assert/strict'
import { calculateSnapshotCost, compareSnapshots, type ProductSession } from '../src/core'
import { getCanonicalComparisonStatus } from '../src/core/calculations/comparison-status'
import { resetDevelopmentReviewFixtureSession } from '../src/state/development-review-fixture'
import {
  createSyntheticDataQualitySnapshotPair,
  createSyntheticReviewSnapshotPair
} from '../src/features/master-data/fixtures/synthetic-review-data'

const pair = createSyntheticReviewSnapshotPair()
const comparison = compareSnapshots(pair.reference, pair.current)
assert.deepEqual(pair.reference.sizing, { wcCount: 5, bomCount: 6, routingCount: 8 })
assert.deepEqual(pair.current.sizing, { wcCount: 5, bomCount: 6, routingCount: 8 })

function countStatuses(findings: typeof comparison.bomFindings) {
  const counts = { UNCHANGED: 0, CHANGED: 0, ADDED: 0, REMOVED: 0 }
  for (const finding of findings) {
    const status = getCanonicalComparisonStatus(finding)
    if (status) counts[status] += 1
  }
  return counts
}

assert.deepEqual(countStatuses(comparison.bomFindings), {
  UNCHANGED: 1, CHANGED: 3, ADDED: 1, REMOVED: 1
})
assert.deepEqual(countStatuses(comparison.routingFindings), {
  UNCHANGED: 1, CHANGED: 3, ADDED: 3, REMOVED: 3
})
assert.deepEqual(countStatuses(comparison.workCenterFindings), {
  UNCHANGED: 2, CHANGED: 1, ADDED: 1, REMOVED: 1
})
assert.ok(calculateSnapshotCost(pair.reference).total !== null)
assert.ok(calculateSnapshotCost(pair.current).total !== null)
assert.equal(comparison.reconciliation?.reconciled, true, 'complete mock inputs reconcile across cost components')

for (const [name, changedField] of [
  ['MAT-A', 'price'],
  ['MAT-USAGE', 'consumption'],
  ['MAT-LOSS', 'loss']
] as const) {
  const finding = comparison.bomFindings.find(item =>
    item.currentId && pair.current.bom.find(row => row.id === item.currentId)?.description === name
  )
  assert.ok(finding, `${name} is present as a comparison finding`)
  assert.ok(changedField in finding.fieldDiffs, `${name} exposes its changed input`)
  assert.ok(finding.costGap !== null && finding.costGap !== undefined, `${name} exposes a record-level cost gap`)
}

const changedCapacityYield = comparison.routingFindings.find(finding =>
  finding.currentId && pair.current.routing.find(row => row.id === finding.currentId)?.processName === 'OP-20'
)
assert.ok(changedCapacityYield)
assert.ok('capacity' in changedCapacityYield.fieldDiffs)
assert.ok('yield' in changedCapacityYield.fieldDiffs)

const changedManning = comparison.routingFindings.find(finding =>
  finding.currentId && pair.current.routing.find(row => row.id === finding.currentId)?.processName === 'OP-MANNING'
)
assert.ok(changedManning)
assert.ok('manning' in changedManning.fieldDiffs)

const changedWorkCenterRate = comparison.workCenterFindings.find(finding =>
  finding.currentId && pair.current.rates.find(row => row.id === finding.currentId)?.workCenterCode === 'WC-FAB'
)
assert.ok(changedWorkCenterRate)
assert.ok('laborRate' in changedWorkCenterRate.fieldDiffs)
assert.ok('burdenRate' in changedWorkCenterRate.fieldDiffs)

const rateAffectedProcess = comparison.routingFindings.find(finding =>
  finding.currentId && pair.current.routing.find(row => row.id === finding.currentId)?.processName === 'OP-10'
)
assert.ok(rateAffectedProcess)
assert.equal(getCanonicalComparisonStatus(rateAffectedProcess), 'CHANGED', 'WC rate-only cost movement keeps Process as the Candidate')
assert.equal(rateAffectedProcess.changeFlags.changedRate, true)

const referenceSharedProcesses = pair.reference.routing
  .filter(step => step.workCenterId === 'WC-SHARED')
  .map(step => step.processName)
const currentSharedProcesses = pair.current.routing
  .filter(step => step.workCenterId === 'WC-SHARED')
  .map(step => step.processName)
assert.equal(referenceSharedProcesses.some(name => currentSharedProcesses.includes(name)), false)
const sharedProcessing = comparison.processingFindings.find(finding => finding.workCenterCode === 'WC-SHARED')
assert.ok(sharedProcessing, 'processing is still compared at Work Center when process identities do not match')
assert.equal(sharedProcessing.costGap !== null, true)
assert.equal(sharedProcessing.changeFlags.changedInputs, true)

const qualityPair = createSyntheticDataQualitySnapshotPair()
const qualityComparison = compareSnapshots(qualityPair.reference, qualityPair.current)
assert.ok(qualityComparison.referenceCost.total !== null, 'quality fixture has a complete Reference snapshot')
assert.equal(qualityComparison.currentCost.total, null, 'missing inputs keep Current unavailable rather than zero')
assert.ok(qualityComparison.currentCost.warnings.length > 0, 'missing inputs are explained by warnings')
assert.ok(qualityComparison.productFieldDiffs.productName, 'different Product Names remain visible as a mismatch')
assert.ok(qualityComparison.bomFindings.some(finding => finding.matchStatus === 'ambiguous'), 'duplicate BOM identities are flagged as ambiguous')
assert.ok(qualityComparison.processingFindings.some(finding => finding.workCenterCode === 'WC-MISSING' && finding.costGap === null), 'an unpriced Work Center stays unavailable')

const savedFixtureSession: ProductSession = {
  id: 'ps-dev-review-fixture',
  product: { ...pair.reference.product },
  rates: [],
  bom: [],
  routing: [],
  savedDrivers: [],
  selectedDriverKeys: ['bom:stale'],
  rcaRecords: {},
  candidateRcaRecords: {
    stale: { candidateKey: 'stale', rootCause: 'Old note', action: 'Old action', updatedAt: '2026-01-01' }
  },
  rcaCases: {
    'old-case': { id: 'old-case', candidateKeys: ['bom:stale'], rootCause: 'Old case cause', action: 'Old case action', updatedAt: '2026-01-01' }
  },
  activeRcaCaseId: 'old-case',
  candidateControllability: { stale: false },
  status: 'active',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  snapshotPair: pair,
  snapshotPairMode: 'independent',
  preparedSnapshotRoles: { reference: false, current: false },
  datasetSizing: { reference: { wcCount: 1 }, current: { wcCount: 1 } },
  lastSavedMasterData: {
    reference: { snapshot: pair.reference, prepared: true },
    current: { snapshot: pair.current, prepared: true }
  },
  masterDataRevision: 10
}
const resetFixtureSession = resetDevelopmentReviewFixtureSession(savedFixtureSession, qualityPair, '2026-10-06T00:00:00.000Z')
assert.deepEqual(resetFixtureSession.lastSavedMasterData, {}, 'reloading a review fixture removes stale Last Saved copies')
assert.deepEqual(resetFixtureSession.candidateRcaRecords, {}, 'reloading a review fixture removes stale RCA notes')
assert.deepEqual(resetFixtureSession.rcaCases, {}, 'reloading a review fixture removes stale RCA Cases')
assert.equal(resetFixtureSession.activeRcaCaseId, undefined, 'reloading a review fixture clears the active RCA Case')
assert.deepEqual(resetFixtureSession.candidateControllability, {}, 'reloading a review fixture resets candidate annotations')
assert.deepEqual(resetFixtureSession.selectedDriverKeys, [])
assert.deepEqual(resetFixtureSession.preparedSnapshotRoles, { reference: true, current: true })
assert.deepEqual(resetFixtureSession.datasetSizing, qualityPair.reference.sizing && qualityPair.current.sizing
  ? { reference: qualityPair.reference.sizing, current: qualityPair.current.sizing }
  : undefined)
assert.equal(resetFixtureSession.masterDataRevision, 11, 'each fixture load invalidates stale page simulation state')

console.log('Synthetic review fixtures cover comparison states, changed inputs, Work Center aggregation, unavailable/data-quality states, and clean session resets.')
