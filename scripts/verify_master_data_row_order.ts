import assert from 'node:assert/strict'
import { compareSnapshots, type CostSnapshot, type SnapshotBOMItem } from '../src/core'
import { moveSnapshotRows } from '../src/state/master-data-row-order.ts'

const row = (id: string, description: string, price: number): SnapshotBOMItem => ({
  id, itemCode: id, description, consumption: 1, unit: 'PC', price, loss: 0, confidence: {}
})
const rows = [row('a', 'A', 1), row('b', 'B', 2), row('c', 'C', 3), row('d', 'D', 4)]
const moved = moveSnapshotRows(rows, ['d', 'b'], 'c', 'before')
assert.deepEqual(moved.map(item => item.id), ['a', 'b', 'd', 'c'],
  'selected rows move together in their original source order')
assert.deepEqual(rows.map(item => item.id), ['a', 'b', 'c', 'd'], 'reordering does not mutate the Working snapshot')
assert.strictEqual(moveSnapshotRows(rows, ['a'], 'a', 'after'), rows, 'a row cannot be moved relative to itself')
assert.strictEqual(moveSnapshotRows(rows, ['missing'], 'a', 'after'), rows, 'unknown moving rows are ignored')

const product = { productCode: 'ORDER', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' }
const snapshot = (id: string, bom: SnapshotBOMItem[]): CostSnapshot => ({
  id, product, effectiveDate: '', sourceRef: id, status: 'draft', rates: [], bom, routing: []
})
const comparisonBefore = compareSnapshots(snapshot('before', rows), snapshot('current', rows))
const comparisonAfter = compareSnapshots(snapshot('after', moved), snapshot('current', rows))
assert.deepEqual(comparisonAfter.bomFindings.map(finding => [finding.matchStatus, finding.referenceId, finding.currentId]).sort(),
  comparisonBefore.bomFindings.map(finding => [finding.matchStatus, finding.referenceId, finding.currentId]).sort(),
  'row order is not a business identity and cannot change comparison status or cost')
assert.equal(comparisonAfter.totalGap, comparisonBefore.totalGap)

console.log('Master Data row-order verification passed')
