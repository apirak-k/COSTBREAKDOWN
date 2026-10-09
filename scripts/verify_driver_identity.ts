import assert from 'node:assert/strict'
import { buildPrioritizationCandidates, compareSnapshots, CostSnapshot, SnapshotBOMItem } from '../src/core'

const product = {
  productCode: 'CANDIDATE-IDENTITY',
  productDescription: 'Candidate Identity Fixture',
  uom: 'pc',
  customer: 'Fixture',
  effectiveDate: '2026-10-09'
}

function bom(id: string, name: string, price: number): SnapshotBOMItem {
  return {
    id,
    itemCode: `CODE-${id}`,
    description: name,
    consumption: 1,
    unit: 'EA',
    price,
    loss: 0,
    confidence: {}
  }
}

function snapshot(id: string, rows: SnapshotBOMItem[]): CostSnapshot {
  return {
    id,
    product,
    effectiveDate: product.effectiveDate,
    sourceRef: id,
    status: 'active',
    rates: [],
    bom: rows,
    routing: []
  }
}

const reference = snapshot('reference', [
  bom('reference-a', 'Material A', 10),
  bom('reference-b', 'Material B', 10)
])
const currentRows = [
  bom('current-b', 'Material B', 30),
  bom('current-a', 'Material A', 20)
]
const current = snapshot('current', currentRows)
const reorderedCurrent = snapshot('current-reordered', [...currentRows].reverse())

function candidatesFor(currentSnapshot: CostSnapshot) {
  const comparison = compareSnapshots(reference, currentSnapshot)
  return buildPrioritizationCandidates(comparison, reference, currentSnapshot, {
    'mat:material b': false
  })
}

const ordered = candidatesFor(current)
const reordered = candidatesFor(reorderedCurrent)
const orderedB = ordered.find(candidate => candidate.candidateKey === 'mat:material b')
const reorderedB = reordered.find(candidate => candidate.candidateKey === 'mat:material b')
const orderedA = ordered.find(candidate => candidate.candidateKey === 'mat:material a')

assert.ok(orderedB, 'Material name identity must produce its canonical Candidate')
assert.ok(reorderedB, 'Candidate identity must survive source row reordering')
assert.equal(orderedB.candidateKey, reorderedB.candidateKey)
assert.equal(orderedB.sourceId, 'current-b')
assert.equal(reorderedB.sourceId, 'current-b')
assert.equal(orderedB.controllable, false, 'controllability follows the canonical Candidate key')
assert.equal(orderedA?.controllable, true, 'unconfigured Candidate controllability defaults to true')

console.log('canonical Candidate identity verification passed')
