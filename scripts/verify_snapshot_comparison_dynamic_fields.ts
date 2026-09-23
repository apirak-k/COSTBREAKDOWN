import assert from 'node:assert/strict'
import { compareSnapshots } from '../src/core/calculations/snapshot-comparison.ts'
import type { CostSnapshot, SnapshotBOMItem } from '../src/core/types/snapshot.types.ts'

const product = {
  productCode: 'P-001',
  productDescription: 'Demo product',
  uom: 'PC',
  customer: 'Demo',
  effectiveDate: '2026-01-01'
}

const evidence = { status: 'verified' as const, quality: 'valid' as const }
const baseBOM: SnapshotBOMItem = {
  id: 'bom-1',
  itemCode: 'MAT-1',
  description: 'Material',
  consumption: 1,
  unit: 'PC',
  price: 10,
  loss: 0,
  sourceRef: 'source-ref',
  confidence: { consumption: evidence, price: evidence, loss: evidence }
}

const currentBOM = {
  ...baseBOM,
  sourceRef: 'source-current',
  customSupportedField: 'changed'
} as SnapshotBOMItem & { customSupportedField: string }

const snapshot = (id: string, role: 'reference' | 'current', bom: SnapshotBOMItem[]): CostSnapshot => ({
  id,
  product,
  effectiveDate: product.effectiveDate,
  sourceRef: id,
  comparisonRole: role,
  status: 'active',
  rates: [],
  routing: [],
  bom
})

const comparison = compareSnapshots(
  snapshot('ref', 'reference', [baseBOM]),
  snapshot('current', 'current', [currentBOM])
)
const finding = comparison.bomFindings[0]

assert.equal(finding.matchStatus, 'matched')
assert.deepEqual(finding.fieldDiffs.customSupportedField, { reference: undefined, current: 'changed' })
assert.equal(finding.fieldDiffs.sourceRef, undefined, 'source identity is provenance, not a cost change')
assert.equal(finding.fieldDiffs.confidence, undefined, 'evidence metadata is not a working-value change')

console.log('Dynamic snapshot comparison verification passed.')
