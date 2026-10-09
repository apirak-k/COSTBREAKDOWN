import assert from 'node:assert/strict'
import {
  CostSnapshot,
  buildMaterialCandidates,
  compareSnapshots,
  getCanonicalComparisonStatus
} from '../src/core'

const reference: CostSnapshot = {
  id: 'ref', status: 'draft', sourceRef: 'Reference',
  product: { productCode: 'P-1', productDescription: 'Product', uom: 'PC', customer: '', effectiveDate: '' },
  effectiveDate: '', rates: [], bom: [{
    id: 'removed-row', itemCode: 'MAT-REMOVED', description: 'Removed Material',
    consumption: 2, unit: 'PC', price: null, loss: 0,
    confidence: { price: { status: 'missing' } }
  }], routing: []
}
const current: CostSnapshot = {
  ...reference, id: 'cur', sourceRef: 'Current',
  bom: [{
    id: 'added-row', itemCode: 'MAT-ADDED', description: 'Added Material',
    consumption: 1, unit: 'PC', price: null, loss: 0,
    confidence: { price: { status: 'missing' } }
  }]
}
const comparison = compareSnapshots(reference, current)
const added = comparison.bomFindings.find(finding => finding.currentId === 'added-row')
const removed = comparison.bomFindings.find(finding => finding.referenceId === 'removed-row')
assert.ok(added)
assert.ok(removed)
assert.equal(added.matchStatus, 'added')
assert.equal(removed.matchStatus, 'removed')
assert.equal(added.confidence, 'missing')
assert.equal(removed.confidence, 'missing')
assert.equal(getCanonicalComparisonStatus(added), 'ADDED', 'an incomplete one-sided current record keeps ADDED status')
assert.equal(getCanonicalComparisonStatus(removed), 'REMOVED', 'an incomplete one-sided reference record keeps REMOVED status')
assert.equal(added.costEffect?.current.material, null, 'unavailable current cost remains null')
assert.equal(removed.costEffect?.reference.material, null, 'unavailable reference cost remains null')
const candidates = buildMaterialCandidates(comparison, reference, current)
assert.deepEqual(candidates.map(candidate => candidate.status).sort(), ['ADDED', 'REMOVED'])
assert.equal(candidates.find(candidate => candidate.status === 'ADDED')?.costGap, null)
assert.equal(candidates.find(candidate => candidate.status === 'REMOVED')?.costGap, null)
console.log('Unavailable Added/Removed status verification passed')

const incompleteReference: CostSnapshot = {
  ...reference,
  id: 'incomplete-ref',
  bom: [{
    id: 'matched-row', itemCode: 'MAT-MATCHED', description: 'Matched Material',
    consumption: 1, unit: 'PC', price: 5, loss: 0, confidence: {}
  }]
}
const incompleteCurrent: CostSnapshot = {
  ...incompleteReference,
  id: 'incomplete-cur',
  bom: [{
    id: 'matched-row', itemCode: 'MAT-MATCHED', description: 'Matched Material',
    consumption: 1, unit: 'PC', price: null, loss: 0,
    confidence: { price: { status: 'missing' } }
  }]
}
const incompleteComparison = compareSnapshots(incompleteReference, incompleteCurrent)
const incompleteChanged = incompleteComparison.bomFindings[0]
assert.equal(incompleteChanged.confidence, 'missing')
assert.equal(incompleteChanged.costEffect?.gap.material, null)
assert.equal(getCanonicalComparisonStatus(incompleteChanged), 'CHANGED', 'a changed record keeps CHANGED status when its cost Gap is unavailable')
const incompleteCandidate = buildMaterialCandidates(incompleteComparison, incompleteReference, incompleteCurrent)
assert.equal(incompleteCandidate.length, 1, 'an unavailable Gap does not remove a structurally CHANGED Candidate')
assert.equal(incompleteCandidate[0].status, 'CHANGED')
assert.equal(incompleteCandidate[0].costGap, null)
const unchangedMissing = compareSnapshots(incompleteCurrent, { ...incompleteCurrent, id: 'incomplete-current-copy' }).bomFindings[0]
assert.equal(unchangedMissing.confidence, 'missing')
assert.equal(getCanonicalComparisonStatus(unchangedMissing), 'UNCHANGED', 'missing cost alone does not create a Candidate status')
