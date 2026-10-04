import assert from 'node:assert/strict'
import {
  CostSnapshot,
  compareSnapshots,
  buildMaterialCandidates,
  buildProcessingCandidates,
  buildPrioritizationCandidates,
  filterPrioritizationCandidates
} from '../src/core'

console.log('--- Verifying Phase 3: Tasks 11, 12, 13 (Candidate Prioritization) ---')

// Reference Snapshot
const refSnapshot: CostSnapshot = {
  id: 'snap-ref',
  comparisonRole: 'reference',
  status: 'draft',
  sourceRef: 'Baseline Ref',
  product: { productCode: 'PROD-A', productDescription: 'Product A', uom: 'PC', customer: 'Acme', effectiveDate: '2026-09-24' },
  rates: [
    { id: 'wc-1', workCenterCode: 'WC-1', description: 'Center 1', laborRate: 100, burdenRate: 50, effectiveDate: '2026-09-24', confidence: {} },
    { id: 'wc-2', workCenterCode: 'WC-2', description: 'Center 2', laborRate: 80, burdenRate: 40, effectiveDate: '2026-09-24', confidence: {} }
  ],
  bom: [
    { id: 'mat-unchanged', itemCode: 'M-01', description: 'Mat 01', consumption: 1.0, unit: 'KG', price: 10, loss: 0, confidence: {} },
    { id: 'mat-changed-price', itemCode: 'M-02', description: 'Mat 02', consumption: 2.0, unit: 'KG', price: 20, loss: 0, confidence: {} },
    { id: 'mat-removed', itemCode: 'M-03', description: 'Mat 03', consumption: 1.0, unit: 'KG', price: 15, loss: 0, confidence: {} }
  ],
  routing: [
    { id: 'rt-ref-1', processName: 'Process A', operationCode: 'OP-10', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1.0, confidence: {} },
    { id: 'rt-ref-2', processName: 'Process B', operationCode: 'OP-20', sequence: 20, workCenterId: 'WC-2', manning: 1, capacity: 100, yield: 1.0, confidence: {} }
  ],
  warnings: []
}

// Current Snapshot
const curSnapshot: CostSnapshot = {
  id: 'snap-cur',
  comparisonRole: 'current',
  status: 'draft',
  sourceRef: 'Current Target',
  product: { productCode: 'PROD-A', productDescription: 'Product A', uom: 'PC', customer: 'Acme', effectiveDate: '2026-09-24' },
  rates: [
    { id: 'wc-1', workCenterCode: 'WC-1', description: 'Center 1', laborRate: 100, burdenRate: 50, effectiveDate: '2026-09-24', confidence: {} },
    { id: 'wc-2', workCenterCode: 'WC-2', description: 'Center 2', laborRate: 80, burdenRate: 40, effectiveDate: '2026-09-24', confidence: {} }
  ],
  bom: [
    { id: 'mat-unchanged', itemCode: 'M-01', description: 'Mat 01', consumption: 1.0, unit: 'KG', price: 10, loss: 0, confidence: {} }, // Unchanged
    { id: 'mat-changed-price', itemCode: 'M-02', description: 'Mat 02', consumption: 2.0, unit: 'KG', price: 25, loss: 0, confidence: {} }, // Price changed (+10)
    { id: 'mat-added', itemCode: 'M-04', description: 'Mat 04', consumption: 1.0, unit: 'KG', price: 30, loss: 0, confidence: {} } // Added (+30)
  ],
  routing: [
    // WC-1 has two routing steps in current instead of one (1-to-many change without 1:1 ID match)
    { id: 'rt-cur-1a', processName: 'Process A', operationCode: 'OP-10A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1.0, confidence: {} },
    { id: 'rt-cur-1b', processName: 'Process A2', operationCode: 'OP-10B', sequence: 15, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1.0, confidence: {} }
    // WC-2 is removed in current
  ],
  warnings: []
}

const comparison = compareSnapshots(refSnapshot, curSnapshot)

// 1. Task 11: Material Candidates
console.log('1. Checking Material Candidates...')
const matCandidates = buildMaterialCandidates(comparison, refSnapshot, curSnapshot)
assert(matCandidates.length >= 3, 'Must have at least 3 candidates (changed price, added, removed)')
assert(!matCandidates.some(c => c.candidateKey.includes('M-01')), 'Unchanged material M-01 must not become a candidate')

const addedMat = matCandidates.find(c => c.status === 'ADDED')
assert(addedMat, 'Added material candidate exists')
assert.equal(addedMat.referenceCost, 0, 'Added material reference cost must be 0')
assert.equal(addedMat.costGap, 30, 'Added material gap must be +Current cost')

const removedMat = matCandidates.find(c => c.status === 'REMOVED')
assert(removedMat, 'Removed material candidate exists')
assert.equal(removedMat.currentCost, 0, 'Removed material current cost must be 0')
assert.equal(removedMat.costGap, -15, 'Removed material gap must be -Reference cost')

// 2. Task 12: Processing Candidates aggregated by Work Center
console.log('2. Checking Processing Candidates aggregated by Work Center...')
const procCandidates = buildProcessingCandidates(comparison)
assert(procCandidates.length >= 1, 'Processing candidates generated')

const wc2 = procCandidates.find(c => c.candidateKey === 'wc:wc-2')
assert(wc2, 'WC-2 candidate exists')
assert.equal(wc2.status, 'REMOVED', 'WC-2 is REMOVED when not present in current routing')
assert.equal(wc2.currentCost, 0, 'WC-2 current cost must be 0')
const wc1 = procCandidates.find(c => c.candidateKey === 'wc:wc-1')
assert(wc1, 'WC-1 candidate exists when routing structure changes')
assert.equal(wc1.status, 'CHANGED', 'A routing structure change remains CHANGED even when its Work Center Gap is zero')
assert.equal(wc1.costGap, 0, 'The split routing fixture has zero net Work Center Gap')

// 3. Task 13: Consolidated candidates, default controllable=true, sorted descending by Gap
console.log('3. Checking Consolidated candidates, default controllable, and ranking...')
const allCandidates = buildPrioritizationCandidates(comparison, refSnapshot, curSnapshot)

// All candidates default to controllable: true
assert(allCandidates.every(c => c.controllable === true), 'All candidates must default to controllable: true')

// Sorted descending by Gap (+Gap -> -Gap)
for (let i = 0; i < allCandidates.length - 1; i++) {
  assert(allCandidates[i].costGap >= allCandidates[i + 1].costGap, 'Candidates must be sorted descending by costGap')
  assert.equal(allCandidates[i].rank, i + 1, 'Rank must be sequential 1-based')
}

// Filtering by status
const changedOnly = filterPrioritizationCandidates(allCandidates, ['CHANGED'])
const addedOnly = filterPrioritizationCandidates(allCandidates, ['ADDED'])
const removedOnly = filterPrioritizationCandidates(allCandidates, ['REMOVED'])
const changedAndAdded = filterPrioritizationCandidates(allCandidates, ['CHANGED', 'ADDED'])
const none = filterPrioritizationCandidates(allCandidates, [])

assert(changedOnly.every(c => c.status === 'CHANGED'), 'Changed filter only contains CHANGED')
assert(addedOnly.every(c => c.status === 'ADDED'), 'Added filter only contains ADDED')
assert(removedOnly.every(c => c.status === 'REMOVED'), 'Removed filter only contains REMOVED')
assert(changedAndAdded.every(c => c.status === 'CHANGED' || c.status === 'ADDED'), 'Combined status filter contains selected statuses only')
assert.equal(changedAndAdded.length, changedOnly.length + addedOnly.length, 'Combined status filter is the union of selected statuses')
assert.equal(none.length, 0, 'An empty status filter returns no candidates')

// BOM Name is the business identity; changing it creates one Removed and one Added finding.
const descriptiveReference: CostSnapshot = {
  ...refSnapshot,
  id: 'descriptive-reference',
  rates: [],
  routing: [],
  bom: [{ id: 'description-mat', itemCode: 'M-DESC', description: 'Old description', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} }]
}
const descriptiveCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'descriptive-current',
  rates: [],
  routing: [],
  bom: [{ id: 'description-mat-current', itemCode: 'M-DESC', description: 'New description', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} }]
}
const descriptiveComparison = compareSnapshots(descriptiveReference, descriptiveCurrent)
const descriptiveCandidates = buildMaterialCandidates(descriptiveComparison, descriptiveReference, descriptiveCurrent)
assert.deepEqual(
  descriptiveComparison.bomFindings.map(finding => finding.matchStatus),
  ['removed', 'added'],
  'Changing BOM Name does not get matched through the removed legacy Item Code'
)
assert.deepEqual(
  descriptiveCandidates.map(candidate => candidate.status).sort(),
  ['ADDED', 'REMOVED'],
  'Renamed BOM identities remain visible as Removed and Added candidate findings'
)
assert.equal(descriptiveComparison.elementGaps.material, 0, 'Equal-cost removed and added names reconcile to a zero material Gap')

// 4. Missing values on present records stay unavailable in Candidate findings.
console.log('4. Checking missing candidate inputs are not converted to zero...')
const missingMaterialReference: CostSnapshot = {
  ...refSnapshot,
  id: 'missing-material-reference',
  bom: [{ id: 'mat-missing', itemCode: 'MAT-MISSING', description: 'Missing loss', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} }]
}
const missingMaterialCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'missing-material-current',
  bom: [{ id: 'mat-missing', itemCode: 'MAT-MISSING', description: 'Missing loss', consumption: 1, unit: 'KG', price: 12, loss: null, confidence: {} }]
}
const missingMaterialCandidate = buildMaterialCandidates(
  compareSnapshots(missingMaterialReference, missingMaterialCurrent),
  missingMaterialReference,
  missingMaterialCurrent
).find(candidate => candidate.candidateName.includes('MAT-MISSING'))
assert(missingMaterialCandidate, 'Changed material with incomplete cost inputs remains visible')
assert.equal(missingMaterialCandidate.currentCost, null, 'Missing material input keeps Current cost unavailable')
assert.equal(missingMaterialCandidate.costGap, null, 'Missing material input keeps Gap unavailable')

const incompleteFactorsReference: CostSnapshot = {
  ...refSnapshot,
  id: 'incomplete-factors-reference',
  rates: [],
  routing: [],
  bom: [{ id: 'mat-incomplete-factors-ref', itemCode: 'MAT-MULTI', description: 'Multiple changed factors', consumption: 1, unit: 'KG', price: 10, loss: null, confidence: {} }]
}
const incompleteFactorsCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'incomplete-factors-current',
  rates: [],
  routing: [],
  bom: [{ id: 'mat-incomplete-factors-cur', itemCode: 'MAT-MULTI', description: 'Multiple changed factors', consumption: 2, unit: 'KG', price: 12, loss: null, confidence: {} }]
}
const incompleteFactorCandidates = buildMaterialCandidates(
  compareSnapshots(incompleteFactorsReference, incompleteFactorsCurrent),
  incompleteFactorsReference,
  incompleteFactorsCurrent
)
assert.equal(incompleteFactorCandidates.length, 2, 'Each changed material factor remains a candidate when attribution inputs are missing')
const incompletePriceCandidate = incompleteFactorCandidates.find(candidate => candidate.factor === 'Price')
const incompleteUsageCandidate = incompleteFactorCandidates.find(candidate => candidate.factor === 'Usage')
assert(incompletePriceCandidate, 'Price change remains a candidate when Loss is unavailable')
assert.equal(incompletePriceCandidate.referenceParam, 10)
assert.equal(incompletePriceCandidate.currentParam, 12)
assert.equal(incompletePriceCandidate.costGap, null, 'Price attribution gap stays unavailable when Loss is missing')
assert(incompleteUsageCandidate, 'Usage change remains a candidate when Loss is unavailable')
assert.equal(incompleteUsageCandidate.referenceParam, 1)
assert.equal(incompleteUsageCandidate.currentParam, 2)
assert.equal(incompleteUsageCandidate.costGap, null, 'Usage attribution gap stays unavailable when Loss is missing')

const multiFactorReference: CostSnapshot = {
  ...refSnapshot,
  id: 'multi-factor-reference',
  rates: [],
  routing: [],
  bom: [{ id: 'mat-multi-factor-ref', itemCode: 'MAT-FACTORS', description: 'Multiple factors', consumption: 1, unit: 'KG', price: 10, loss: 0.1, confidence: {} }]
}
const multiFactorCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'multi-factor-current',
  rates: [],
  routing: [],
  bom: [{ id: 'mat-multi-factor-cur', itemCode: 'MAT-FACTORS', description: 'Multiple factors', consumption: 2, unit: 'KG', price: 12, loss: 0.2, confidence: {} }]
}
const multiFactorComparison = compareSnapshots(multiFactorReference, multiFactorCurrent)
const multiFactorCandidates = buildMaterialCandidates(multiFactorComparison, multiFactorReference, multiFactorCurrent)
assert.equal(multiFactorCandidates.length, 3, 'Price, Loss, and Usage changes remain separate factor findings')
const multiPriceCandidate = multiFactorCandidates.find(candidate => candidate.factor === 'Price')
const multiLossCandidate = multiFactorCandidates.find(candidate => candidate.factor === 'Loss %')
const multiUsageCandidate = multiFactorCandidates.find(candidate => candidate.factor === 'Usage')
assert(multiPriceCandidate && multiLossCandidate && multiUsageCandidate, 'Each changed factor has a candidate')
assert.equal(multiPriceCandidate.referenceCost, 24)
assert(multiPriceCandidate.currentCost !== null)
assert.ok(Math.abs(multiPriceCandidate.currentCost - 28.8) < 1e-10)
assert.equal(multiLossCandidate.referenceCost, 22)
assert.equal(multiLossCandidate.currentCost, 24)
assert.equal(multiUsageCandidate.referenceCost, 11)
assert.equal(multiUsageCandidate.currentCost, 22)
for (const candidate of multiFactorCandidates) {
  assert(candidate.referenceCost !== null && candidate.currentCost !== null && candidate.costGap !== null)
  assert.ok(Math.abs(candidate.currentCost - candidate.referenceCost - candidate.costGap) < 1e-10,
    `${candidate.factor} Gap must equal Current cost minus Reference cost`)
}
const multiFactorMaterialGap = multiFactorComparison.bomFindings[0]?.costEffect?.gap.material
const summedFactorGap = multiFactorCandidates.reduce((sum, candidate) => sum + (candidate.costGap ?? 0), 0)
assert(multiFactorMaterialGap !== null && multiFactorMaterialGap !== undefined)
assert.ok(Math.abs(summedFactorGap - multiFactorMaterialGap) < 1e-10,
  'Separate factor Gap values must sum to the Comparison material gap')

const missingRouteReference: CostSnapshot = {
  ...refSnapshot,
  id: 'missing-route-reference',
  bom: [],
  routing: [{ id: 'route-one', processName: 'Route One', operationCode: 'OP-ONE', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} }]
}
const missingRouteCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'missing-route-current',
  bom: [],
  routing: [{ id: 'route-one', processName: 'Route One', operationCode: 'OP-ONE', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: null, yield: 1, confidence: {} }]
}
const missingRouteCandidate = buildProcessingCandidates(
  compareSnapshots(missingRouteReference, missingRouteCurrent)
).find(candidate => candidate.candidateKey === 'wc:wc-1')
assert(missingRouteCandidate, 'Changed processing candidate remains visible when an input is missing')
assert.equal(missingRouteCandidate.currentCost, null, 'Missing routing input keeps Current cost unavailable')
assert.equal(missingRouteCandidate.costGap, null, 'Missing routing input keeps Gap unavailable')

// Reordering complete routes does not create an aggregate Work Center candidate.
const reorderedReference: CostSnapshot = {
  ...refSnapshot,
  id: 'reordered-reference',
  bom: [],
  routing: [
    { id: 'route-a-ref', processName: 'Route A', operationCode: 'OP-A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} },
    { id: 'route-b-ref', processName: 'Route B', operationCode: 'OP-B', sequence: 20, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1, confidence: {} }
  ]
}
const reorderedCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'reordered-current',
  bom: [],
  routing: [
    { id: 'route-b-current', processName: 'Route B', operationCode: 'OP-B', sequence: 20, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1, confidence: {} },
    { id: 'route-a-current', processName: 'Route A', operationCode: 'OP-A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} }
  ]
}
assert.equal(buildProcessingCandidates(
  compareSnapshots(reorderedReference, reorderedCurrent)
).some(candidate => candidate.candidateKey === 'wc:wc-1'), false, 'Route row order alone must not create a Work Center candidate')

// A legacy Process Code edit must not change aggregate equivalence or create /
// rerank a processing candidate when approved routing inputs match.
const legacyProcessReference: CostSnapshot = {
  ...refSnapshot,
  id: 'legacy-process-reference',
  bom: [{
    id: 'legacy-process-material',
    itemCode: 'MAT-RANK',
    description: 'Stable ranking fixture',
    consumption: 1,
    unit: 'KG',
    price: 10,
    loss: 0,
    confidence: {}
  }],
  routing: [{
    id: 'legacy-process-ref-route',
    processName: 'Stable Process',
    operationCode: 'OP-10',
    processCode: 'LEGACY-A',
    sequence: 10,
    workCenterId: 'WC-1',
    manning: 1,
    capacity: 100,
    yield: 1,
    confidence: {}
  }]
}
const legacyProcessCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'legacy-process-current',
  bom: [{
    id: 'legacy-process-material-current',
    itemCode: 'MAT-RANK',
    description: 'Stable ranking fixture',
    consumption: 1,
    unit: 'KG',
    price: 11,
    loss: 0,
    confidence: {}
  }],
  routing: [{
    ...legacyProcessReference.routing[0],
    id: 'legacy-process-current-route'
  }]
}
const changedLegacyProcessCurrent: CostSnapshot = {
  ...legacyProcessCurrent,
  id: 'legacy-process-changed-current',
  routing: [{ ...legacyProcessCurrent.routing[0], processCode: 'LEGACY-B' }]
}

const sameLegacyProcessComparison = compareSnapshots(legacyProcessReference, legacyProcessCurrent)
const changedLegacyProcessComparison = compareSnapshots(legacyProcessReference, changedLegacyProcessCurrent)
const sameLegacyProcessRanking = buildPrioritizationCandidates(
  sameLegacyProcessComparison,
  legacyProcessReference,
  legacyProcessCurrent
)
assert(sameLegacyProcessRanking.length > 0, 'The rank comparison includes a separate real material candidate')
const sameLegacyProcessCandidates = buildProcessingCandidates(
  sameLegacyProcessComparison
)
const changedLegacyProcessCandidates = buildProcessingCandidates(
  changedLegacyProcessComparison
)
assert.deepEqual(
  changedLegacyProcessCandidates,
  sameLegacyProcessCandidates,
  'Process Code-only edits must not change processing candidate equivalence, status, or rank'
)
assert.deepEqual(
  sameLegacyProcessRanking,
  buildPrioritizationCandidates(changedLegacyProcessComparison, legacyProcessReference, changedLegacyProcessCurrent),
  'Process Code-only edits must not change consolidated candidate ordering or ranks'
)

// Processing Candidates are prepared by the Comparison layer and consumed as findings.
assert(Array.isArray(comparison.processingFindings), 'Comparison exposes Work Center processing findings')

// A Work Center rate-only change is a processing candidate even when Routing fields do not change.
const changedRateCurrent: CostSnapshot = {
  ...refSnapshot,
  id: 'changed-rate-current',
  rates: refSnapshot.rates.map(rate => rate.workCenterCode === 'WC-1'
    ? { ...rate, laborRate: (rate.laborRate ?? 0) + 10 }
    : rate)
}
const changedRateCandidate = buildProcessingCandidates(
  compareSnapshots(refSnapshot, changedRateCurrent)
).find(candidate => candidate.candidateKey === 'wc:wc-1')
assert(changedRateCandidate, 'Rate-only changes produce a Work Center processing candidate')
assert.equal(changedRateCandidate.status, 'CHANGED')

// Candidate aggregation follows each side's Work Center when an operation moves.
const movedReference: CostSnapshot = {
  ...refSnapshot,
  id: 'moved-reference',
  bom: [],
  routing: [
    { id: 'move-route-a', processName: 'Move Process', operationCode: 'OP-MOVE', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} }
  ]
}
const movedCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'moved-current',
  bom: [],
  routing: [
    { id: 'move-route-b', processName: 'Move Process', operationCode: 'OP-MOVE', sequence: 10, workCenterId: 'WC-2', manning: 1, capacity: 100, yield: 1, confidence: {} }
  ]
}
const movedCandidates = buildProcessingCandidates(compareSnapshots(movedReference, movedCurrent))
const movedOutCandidate = movedCandidates.find(candidate => candidate.candidateKey === 'wc:wc-1')
const movedInCandidate = movedCandidates.find(candidate => candidate.candidateKey === 'wc:wc-2')
assert(movedOutCandidate, 'Work Center losing a moved operation remains visible')
assert(movedInCandidate, 'Work Center gaining a moved operation remains visible')
assert.equal(movedOutCandidate.status, 'REMOVED')
assert.equal(movedInCandidate.status, 'ADDED')

console.log('All Phase 3 candidate prioritization checks passed successfully!')
