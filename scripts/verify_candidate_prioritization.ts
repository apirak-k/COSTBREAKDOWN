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
    { id: 'rt-ref-1', operationCode: 'OP-10', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1.0, confidence: {} },
    { id: 'rt-ref-2', operationCode: 'OP-20', sequence: 20, workCenterId: 'WC-2', manning: 1, capacity: 100, yield: 1.0, confidence: {} }
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
    { id: 'rt-cur-1a', operationCode: 'OP-10A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1.0, confidence: {} },
    { id: 'rt-cur-1b', operationCode: 'OP-10B', sequence: 15, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1.0, confidence: {} }
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
const procCandidates = buildProcessingCandidates(comparison, refSnapshot, curSnapshot)
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

// A non-cost material field change remains a visible zero-gap finding with its field values.
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
const descriptiveCandidate = buildMaterialCandidates(
  compareSnapshots(descriptiveReference, descriptiveCurrent),
  descriptiveReference,
  descriptiveCurrent
).find(candidate => candidate.candidateName.includes('M-DESC'))
assert(descriptiveCandidate, 'A descriptive material change remains a Candidate finding')
assert.equal(descriptiveCandidate.status, 'CHANGED')
assert.equal(descriptiveCandidate.costGap, 0)
assert.deepEqual(descriptiveCandidate.changeDetails, [
  { field: 'description', reference: 'Old description', current: 'New description' }
], 'Candidate findings preserve the changed field and its Reference/Current values')

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

const missingRouteReference: CostSnapshot = {
  ...refSnapshot,
  id: 'missing-route-reference',
  bom: [],
  routing: [{ id: 'route-one', operationCode: 'OP-ONE', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} }]
}
const missingRouteCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'missing-route-current',
  bom: [],
  routing: [{ id: 'route-one', operationCode: 'OP-ONE', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: null, yield: 1, confidence: {} }]
}
const missingRouteCandidate = buildProcessingCandidates(
  compareSnapshots(missingRouteReference, missingRouteCurrent),
  missingRouteReference,
  missingRouteCurrent
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
    { id: 'route-a-ref', operationCode: 'OP-A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} },
    { id: 'route-b-ref', operationCode: 'OP-B', sequence: 20, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1, confidence: {} }
  ]
}
const reorderedCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'reordered-current',
  bom: [],
  routing: [
    { id: 'route-b-current', operationCode: 'OP-B', sequence: 20, workCenterId: 'WC-1', manning: 1, capacity: 200, yield: 1, confidence: {} },
    { id: 'route-a-current', operationCode: 'OP-A', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1, confidence: {} }
  ]
}
assert.equal(buildProcessingCandidates(
  compareSnapshots(reorderedReference, reorderedCurrent),
  reorderedReference,
  reorderedCurrent
).some(candidate => candidate.candidateKey === 'wc:wc-1'), false, 'Route row order alone must not create a Work Center candidate')

// MASTER_DATA_FLOW_SPEC.md §5.2 has no Process Code in the neutral ROUTING
// schema. A legacy Process Code edit must not change aggregate equivalence or
// create/rerank a processing candidate when all business routing inputs match.
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

console.log('All Phase 3 candidate prioritization checks passed successfully!')
