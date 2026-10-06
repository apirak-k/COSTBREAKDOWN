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

const changedPriceMat = matCandidates.find(c => c.candidateName === 'Mat 02')
assert(changedPriceMat, 'Changed material candidate exists')
assert.equal(changedPriceMat.factor, 'Record cost', 'A changed input label must not imply its own THB allocation of the whole material-record Gap')

// 2. Process/Routing Candidates remain separate from Work Center rate context.
console.log('2. Checking Process/Routing Candidates...')
const procCandidates = buildProcessingCandidates(comparison, refSnapshot, curSnapshot)
assert.deepEqual(
  procCandidates.map(candidate => candidate.candidateKey).sort(),
  ['process:process a', 'process:process a2', 'process:process b'],
  'Each Process remains its own Candidate rather than being grouped under a Work Center'
)
assert(procCandidates.every(candidate => candidate.sourceType === 'process'), 'Processing Candidates use Process identity')

const processA = procCandidates.find(candidate => candidate.candidateKey === 'process:process a')
const processA2 = procCandidates.find(candidate => candidate.candidateKey === 'process:process a2')
const processB = procCandidates.find(candidate => candidate.candidateKey === 'process:process b')
assert(processA && processA2 && processB, 'Changed, added, and removed Process candidates are retained')
assert.equal(processA.status, 'CHANGED')
assert.equal(processA.costGap, -0.75)
assert.equal(processA2.status, 'ADDED')
assert.equal(processA2.referenceCost, 0)
assert.equal(processA2.currentCost, 0.75)
assert.equal(processB.status, 'REMOVED')
assert.equal(processB.currentCost, 0)

const rankedProcessA = buildPrioritizationCandidates(comparison, refSnapshot, curSnapshot)
  .find(candidate => candidate.candidateKey === 'process:process a')
assert(rankedProcessA?.processBreakdown, 'A Process candidate exposes only its own Process detail')
assert.deepEqual(
  rankedProcessA.processBreakdown.reference.map(process => process.processName),
  ['Process A']
)
assert.deepEqual(
  rankedProcessA.processBreakdown.current.map(process => process.processName),
  ['Process A']
)
assert.equal(rankedProcessA.processBreakdown.reference[0]?.totalCost, 1.5)
assert.equal(rankedProcessA.processBreakdown.current[0]?.totalCost, 0.75)

const processA2Details = buildPrioritizationCandidates(comparison, refSnapshot, curSnapshot)
  .find(candidate => candidate.candidateKey === 'process:process a2')?.processBreakdown
assert.deepEqual(processA2Details?.reference, [])
assert.deepEqual(processA2Details?.current.map(process => process.processName), ['Process A2'])


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
assert(descriptiveCandidates.every(candidate => !candidate.candidateName.includes('M-DESC')),
  'Candidate identity uses the approved BOM Name rather than legacy Item Code')
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
).find(candidate => candidate.candidateName.includes('Missing loss'))
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
assert.equal(incompleteFactorCandidates.length, 1, 'Multiple changed inputs stay under one material-level candidate')
const incompleteFactorCandidate = incompleteFactorCandidates[0]
assert.equal(incompleteFactorCandidate.currentCost, null, 'Missing material input keeps Current cost unavailable')
assert.equal(incompleteFactorCandidate.costGap, null, 'Missing material input keeps Gap unavailable')
assert.deepEqual(
  incompleteFactorCandidate.changeDetails?.map(detail => detail.field).sort(),
  ['Price', 'Usage'],
  'All changed factor inputs remain visible without assigning them individual THB gaps'
)

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
assert.equal(multiFactorCandidates.length, 1, 'A material remains one monetary/ranking candidate when several fields change')
const multiFactorCandidate = multiFactorCandidates[0]
assert.equal(multiFactorCandidate.referenceCost, 11)
assert.ok(Math.abs((multiFactorCandidate.currentCost ?? 0) - 28.8) < 1e-10)
assert.ok(Math.abs((multiFactorCandidate.costGap ?? 0) - 17.8) < 1e-10)
assert.deepEqual(
  multiFactorCandidate.changeDetails?.map(detail => detail.field).sort(),
  ['Loss', 'Price', 'Usage'],
  'Price, Loss, and Usage changes remain individually visible as input details'
)
const multiFactorMaterialGap = multiFactorComparison.bomFindings[0]?.costEffect?.gap.material
assert(multiFactorMaterialGap !== null && multiFactorMaterialGap !== undefined)
assert.ok(Math.abs((multiFactorCandidate.costGap ?? 0) - multiFactorMaterialGap) < 1e-10,
  'The material candidate Gap uses the comparison layer result without per-factor THB attribution')

const sameNameReference: CostSnapshot = {
  ...refSnapshot,
  rates: [],
  routing: [],
  bom: [{ id: 'name-key-ref', itemCode: 'LEGACY-REF', description: 'Approved BOM Name', consumption: 1, unit: 'KG', price: 10, loss: 0, confidence: {} }]
}
const sameNameCurrent: CostSnapshot = {
  ...curSnapshot,
  rates: [],
  routing: [],
  bom: [{ id: 'name-key-current', itemCode: 'LEGACY-CURRENT', description: 'Approved BOM Name', consumption: 1, unit: 'KG', price: 12, loss: 0, confidence: {} }]
}
const sameNameCandidates = buildMaterialCandidates(
  compareSnapshots(sameNameReference, sameNameCurrent),
  sameNameReference,
  sameNameCurrent
)
assert.equal(sameNameCandidates.length, 1, 'Equal BOM Names produce one changed material candidate despite legacy Item Code changes')
assert.equal(sameNameCandidates[0]?.candidateKey, 'mat:approved bom name')
assert.equal(sameNameCandidates[0]?.candidateName, 'Approved BOM Name')

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
const missingRouteComparison = compareSnapshots(missingRouteReference, missingRouteCurrent)
const missingRouteCandidate = buildProcessingCandidates(
  missingRouteComparison,
  missingRouteReference,
  missingRouteCurrent
).find(candidate => candidate.candidateKey === 'process:route one')
assert(missingRouteCandidate, 'Changed processing candidate remains visible when an input is missing')
assert.equal(missingRouteCandidate.currentCost, null, 'Missing routing input keeps Current cost unavailable')
assert.equal(missingRouteCandidate.costGap, null, 'Missing routing input keeps Gap unavailable')

// Reordering complete routes does not create a Process candidate.
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
assert.deepEqual(buildProcessingCandidates(
  compareSnapshots(reorderedReference, reorderedCurrent),
  reorderedReference,
  reorderedCurrent
), [], 'Route row order alone must not create a Process candidate')

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
  sameLegacyProcessComparison,
  legacyProcessReference,
  legacyProcessCurrent
)
const changedLegacyProcessCandidates = buildProcessingCandidates(
  changedLegacyProcessComparison,
  legacyProcessReference,
  changedLegacyProcessCurrent
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

// Process-level changes are prepared by the Comparison layer and consumed as findings.
assert(Array.isArray(comparison.processingFindings), 'Comparison retains Work Center aggregation findings for Cost Breakdown')

// A Work Center rate-only change is a processing candidate even when Routing fields do not change.
const changedRateCurrent: CostSnapshot = {
  ...refSnapshot,
  id: 'changed-rate-current',
  rates: refSnapshot.rates.map(rate => rate.workCenterCode === 'WC-1'
    ? { ...rate, laborRate: (rate.laborRate ?? 0) + 10 }
    : rate)
}
const changedRateComparison = compareSnapshots(refSnapshot, changedRateCurrent)
const changedRateCandidate = buildProcessingCandidates(
  changedRateComparison,
  refSnapshot,
  changedRateCurrent
).find(candidate => candidate.candidateKey === 'process:process a')
assert(changedRateCandidate, 'A rate-only change marks the affected Process as a candidate')
assert.equal(changedRateCandidate.status, 'CHANGED')
assert.ok(
  changedRateCandidate.changeDetails?.some(detail => detail.field === 'WC-1 Labor Rate'),
  'The Work Center rate remains explanatory context on the Process candidate'
)

const sharedRateReference: CostSnapshot = {
  ...refSnapshot,
  id: 'shared-rate-reference',
  bom: [],
  rates: [refSnapshot.rates[0]],
  routing: [
    refSnapshot.routing[0],
    { ...refSnapshot.routing[0], id: 'rt-ref-3', processName: 'Process C', operationCode: 'OP-30' }
  ]
}
const sharedRateCurrent: CostSnapshot = {
  ...sharedRateReference,
  id: 'shared-rate-current',
  rates: sharedRateReference.rates.map(rate => ({ ...rate, laborRate: (rate.laborRate ?? 0) + 10 }))
}
const sharedRateCandidates = buildProcessingCandidates(
  compareSnapshots(sharedRateReference, sharedRateCurrent),
  sharedRateReference,
  sharedRateCurrent
)
assert.deepEqual(
  sharedRateCandidates.map(candidate => candidate.candidateKey).sort(),
  ['process:process a', 'process:process c'],
  'One changed Work Center rate marks every affected Process without creating a Work Center candidate'
)
assert(sharedRateCandidates.every(candidate => candidate.status === 'CHANGED'))
assert(sharedRateCandidates.every(candidate => candidate.sourceType === 'process'))

// A Process remains one candidate when it moves between Work Centers.
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
const movedCandidates = buildProcessingCandidates(
  compareSnapshots(movedReference, movedCurrent),
  movedReference,
  movedCurrent
)
assert.equal(movedCandidates.length, 1, 'A Work Center move must not split one Process into two candidates')
assert.equal(movedCandidates[0].candidateKey, 'process:move process')
assert.equal(movedCandidates[0].status, 'CHANGED')

console.log('All Phase 3 candidate prioritization checks passed successfully!')
