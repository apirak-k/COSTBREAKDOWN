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
const changedOnly = filterPrioritizationCandidates(allCandidates, 'CHANGED')
const addedOnly = filterPrioritizationCandidates(allCandidates, 'ADDED')
const removedOnly = filterPrioritizationCandidates(allCandidates, 'REMOVED')

assert(changedOnly.every(c => c.status === 'CHANGED'), 'Changed filter only contains CHANGED')
assert(addedOnly.every(c => c.status === 'ADDED'), 'Added filter only contains ADDED')
assert(removedOnly.every(c => c.status === 'REMOVED'), 'Removed filter only contains REMOVED')

console.log('All Phase 3 candidate prioritization checks passed successfully!')
