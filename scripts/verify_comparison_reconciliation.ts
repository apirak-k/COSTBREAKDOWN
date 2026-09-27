import assert from 'node:assert/strict'
import {
  CostSnapshot,
  SnapshotPair,
  compareSnapshots,
  getCanonicalComparisonStatus
} from '../src/core'
import { isVisibleInComparisonView } from '../src/features/cost-breakdown/components/comparison-view.ts'

console.log('--- Verifying Phase 2: Tasks 6, 7, 8, 9, 10 ---')

// Reference Snapshot
const refSnapshot: CostSnapshot = {
  id: 'snap-ref',
  comparisonRole: 'reference',
  status: 'draft',
  sourceRef: 'Baseline Ref',
  product: { productCode: 'PROD-A', productDescription: 'Product A', uom: 'PC', customer: 'Acme', effectiveDate: '2026-09-24' },
  rates: [
    { id: 'wc-1', workCenterCode: 'WC-1', description: 'Center 1', laborRate: 100, burdenRate: 50, effectiveDate: '2026-09-24', confidence: {} },
    { id: 'wc-removed', workCenterCode: 'WC-REM', description: 'Center Rem', laborRate: 80, burdenRate: 40, effectiveDate: '2026-09-24', confidence: {} }
  ],
  bom: [
    { id: 'mat-unchanged', itemCode: 'M-01', description: 'Mat 01', consumption: 1.0, unit: 'KG', price: 10, loss: 0, confidence: {} },
    { id: 'mat-changed', itemCode: 'M-02', description: 'Mat 02', consumption: 2.0, unit: 'KG', price: 20, loss: 0, confidence: {} },
    { id: 'mat-removed', itemCode: 'M-03', description: 'Mat 03', consumption: 1.0, unit: 'KG', price: 15, loss: 0, confidence: {} }
  ],
  routing: [
    { id: 'rt-unchanged', operationCode: 'OP-10', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1.0, confidence: {} },
    { id: 'rt-changed', operationCode: 'OP-20', sequence: 20, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1.0, confidence: {} },
    { id: 'rt-removed', operationCode: 'OP-30', sequence: 30, workCenterId: 'WC-REM', manning: 1, capacity: 100, yield: 1.0, confidence: {} }
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
    { id: 'wc-added', workCenterCode: 'WC-ADD', description: 'Center Add', laborRate: 120, burdenRate: 60, effectiveDate: '2026-09-24', confidence: {} }
  ],
  bom: [
    { id: 'mat-unchanged', itemCode: 'M-01', description: 'Mat 01', consumption: 1.0, unit: 'KG', price: 10, loss: 0, confidence: {} }, // Unchanged
    { id: 'mat-changed', itemCode: 'M-02', description: 'Mat 02', consumption: 2.5, unit: 'KG', price: 22, loss: 0, confidence: {} }, // Changed
    { id: 'mat-added', itemCode: 'M-04', description: 'Mat 04', consumption: 0.5, unit: 'KG', price: 30, loss: 0, confidence: {} }    // Added
  ],
  routing: [
    { id: 'rt-unchanged', operationCode: 'OP-10', sequence: 10, workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 1.0, confidence: {} }, // Unchanged
    { id: 'rt-changed', operationCode: 'OP-20', sequence: 20, workCenterId: 'WC-1', manning: 2, capacity: 80, yield: 0.95, confidence: {} },   // Changed
    { id: 'rt-added', operationCode: 'OP-40', sequence: 40, workCenterId: 'WC-ADD', manning: 1, capacity: 200, yield: 1.0, confidence: {} }    // Added
  ],
  warnings: []
}

const comparison = compareSnapshots(refSnapshot, curSnapshot)

// 1. Task 6: Canonical Status Validation
console.log('1. Checking Canonical 4 Statuses...')
const bomStatuses = comparison.bomFindings.map(f => ({
  id: f.id,
  status: getCanonicalComparisonStatus(f)
}))

assert(bomStatuses.some(s => s.status === 'UNCHANGED'), 'Must have UNCHANGED BOM item')
assert(bomStatuses.some(s => s.status === 'CHANGED'), 'Must have CHANGED BOM item')
assert(bomStatuses.some(s => s.status === 'ADDED'), 'Must have ADDED BOM item')
assert(bomStatuses.some(s => s.status === 'REMOVED'), 'Must have REMOVED BOM item')

// 2. Task 7: Record-level effect with absent-side zero
console.log('2. Checking Record-Level effect with absent-side zero...')
const addedBom = comparison.bomFindings.find(f => f.matchStatus === 'added')
assert(addedBom, 'Added BOM finding exists')
assert(addedBom.costGap !== null && addedBom.costGap > 0, 'Added BOM record costGap must be positive (+Current)')
assert.equal(addedBom.costEffect?.reference.material, 0, 'Added BOM effect uses zero only for the absent Reference record')
assert.equal(addedBom.costEffect?.gap.material, addedBom.costGap, 'Comparison finding exposes its material record effect')

const removedBom = comparison.bomFindings.find(f => f.matchStatus === 'removed')
assert(removedBom, 'Removed BOM finding exists')
assert(removedBom.costGap !== null && removedBom.costGap < 0, 'Removed BOM record costGap must be negative (-Reference)')

// 3. Task 8: Reconciliation
console.log('3. Checking Reconciliation (Total = Material + Labor + Burden)...')
assert(comparison.reconciliation, 'Comparison must include reconciliation metadata')
assert.equal(comparison.reconciliation.reconciled, true, 'Reconciliation must hold')
assert.equal(comparison.reconciliation.discrepancy, 0, 'Discrepancy must be 0')
for (const branch of ['material', 'labor', 'burden'] as const) {
  const rowGap = comparison.reconciliation.recordEffectGaps[branch]
  const branchGap = comparison.elementGaps[branch]
  assert(rowGap !== null && branchGap !== null && Math.abs(rowGap - branchGap) < 0.0001, `${branch} row effects must reconcile to the branch gap`)
  const discrepancy = comparison.reconciliation.recordEffectDiscrepancies[branch]
  assert(discrepancy !== null && discrepancy < 0.0001, `${branch} row-to-branch difference must be within tolerance`)
}
console.log('Reconciliation summary:', comparison.reconciliation)

// 4. Task 9 & 10: Filtering
console.log('4. Checking Status Filtering in comparison-view...')
const allFindings = [...comparison.bomFindings, ...comparison.routingFindings, ...comparison.workCenterFindings]

const filteredAll = allFindings.filter(f => isVisibleInComparisonView(f, 'all'))
const filteredChanged = allFindings.filter(f => isVisibleInComparisonView(f, 'changed'))
const filteredAdded = allFindings.filter(f => isVisibleInComparisonView(f, 'added'))
const filteredRemoved = allFindings.filter(f => isVisibleInComparisonView(f, 'removed'))
const filteredUnchanged = allFindings.filter(f => isVisibleInComparisonView(f, 'unchanged'))

assert.equal(filteredAll.length, allFindings.length, 'All must include every finding')
assert(filteredAdded.length > 0 && filteredAdded.every(f => getCanonicalComparisonStatus(f) === 'ADDED'), 'Added filter only has ADDED')
assert(filteredRemoved.length > 0 && filteredRemoved.every(f => getCanonicalComparisonStatus(f) === 'REMOVED'), 'Removed filter only has REMOVED')
assert(filteredUnchanged.length > 0 && filteredUnchanged.every(f => getCanonicalComparisonStatus(f) === 'UNCHANGED'), 'Unchanged filter only has UNCHANGED')

// 5. Unstable or missing keys must not be guessed from IDs, names, or row order.
console.log('5. Checking missing business keys remain separate from comparison statuses...')
const missingKeyReference: CostSnapshot = {
  ...refSnapshot,
  id: 'missing-key-reference',
  bom: [...refSnapshot.bom, {
    id: 'shared-bom-id', itemCode: '', description: 'No stable BOM key', consumption: 1,
    unit: 'KG', price: 10, loss: 0, confidence: {}
  }],
  rates: [...refSnapshot.rates, {
    id: 'shared-rate-id', workCenterCode: '', description: 'No stable Work Center key',
    laborRate: 10, burdenRate: 5, effectiveDate: '2026-09-24', confidence: {}
  }],
  routing: [...refSnapshot.routing, {
    id: 'shared-routing-id', processName: 'Same display name', workCenterId: 'WC-1',
    manning: 1, capacity: 100, yield: 1, confidence: {}
  }]
}
const missingKeyCurrent: CostSnapshot = {
  ...curSnapshot,
  id: 'missing-key-current',
  bom: [...curSnapshot.bom, {
    id: 'shared-bom-id', itemCode: '', description: 'No stable BOM key', consumption: 1,
    unit: 'KG', price: 10, loss: 0, confidence: {}
  }],
  rates: [...curSnapshot.rates, {
    id: 'shared-rate-id', workCenterCode: '', description: 'No stable Work Center key',
    laborRate: 10, burdenRate: 5, effectiveDate: '2026-09-24', confidence: {}
  }],
  routing: [...curSnapshot.routing, {
    id: 'shared-routing-id', processName: 'Same display name', workCenterId: 'WC-1',
    manning: 1, capacity: 100, yield: 1, confidence: {}
  }]
}
const missingKeyComparison = compareSnapshots(missingKeyReference, missingKeyCurrent)

for (const [section, findings, sharedId] of [
  ['BOM', missingKeyComparison.bomFindings, 'shared-bom-id'],
  ['Work Center', missingKeyComparison.workCenterFindings, 'shared-rate-id'],
  ['Routing', missingKeyComparison.routingFindings, 'shared-routing-id']
] as const) {
  const unmatched = findings.filter(finding => finding.referenceId === sharedId || finding.currentId === sharedId)
  assert.equal(unmatched.length, 2, `${section} rows without business keys must remain two unmatched findings`)
  assert(unmatched.every(finding => finding.matchStatus === 'unmatched'), `${section} missing-key rows must be unmatched`)
  assert(unmatched.every(finding => getCanonicalComparisonStatus(finding) === null), `${section} unmatched rows have no comparison status`)
  assert(unmatched.every(finding => finding.costGap === null), `${section} unmatched rows must not invent absent-side cost effects`)
}
assert(missingKeyComparison.warnings.some(warning => warning.code === 'MISSING_BUSINESS_KEY'), 'Missing business keys must be reported as validation warnings')
assert(!isVisibleInComparisonView(missingKeyComparison.bomFindings.find(finding => finding.currentId === 'shared-bom-id'), 'changed'), 'Unmatched rows must not be misfiled under Changed')
assert.equal(missingKeyComparison.reconciliation?.reconciled, false, 'Unattributed record effects must not be reported as reconciled')
assert(missingKeyComparison.reconciliation?.issues.length, 'Unavailable row-to-branch checks must report an issue')

console.log('All Phase 2 checks passed successfully!')
