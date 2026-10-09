import assert from 'node:assert/strict'
import { buildPrioritizationCandidates, compareSnapshots, CostSnapshot, SnapshotBOMItem } from '../src/core'

const product = {
  productCode: 'CANDIDATE-POPULATION',
  productDescription: 'Candidate Population Fixture',
  uom: 'pc',
  customer: 'Fixture',
  effectiveDate: '2026-10-09'
}

function bom(index: number, price: number, unit = 'EA'): SnapshotBOMItem {
  return {
    id: `material-${index + 1}`,
    itemCode: `CODE-${index + 1}`,
    description: `Material ${index + 1}`,
    consumption: 1,
    unit,
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

const reference = snapshot('reference', Array.from({ length: 12 }, (_, index) => bom(index, 10)))
const current = snapshot('current', Array.from({ length: 12 }, (_, index) => {
  if (index === 10) return bom(index, 10, 'KG')
  if (index === 11) return bom(index, 8)
  return bom(index, 12 + index)
}))

const comparison = compareSnapshots(reference, current)
const candidates = buildPrioritizationCandidates(comparison, reference, current)

assert.equal(candidates.length, 12, 'all valid changed BOM Candidates remain available regardless of population size')
assert.ok(candidates.every(candidate => candidate.status === 'CHANGED'))
assert.equal(candidates[0]?.costGap, 11, 'default Candidate ordering uses signed Gap descending')
assert.equal(candidates.at(-1)?.costGap, -2, 'negative Gap remains visible at the end of signed ordering')

const neutral = candidates.find(candidate => candidate.candidateName === 'Material 11')
assert.ok(neutral, 'zero-gap CHANGED record remains a Candidate')
assert.equal(neutral.costGap, 0)

console.log('canonical Candidate population verification passed')
