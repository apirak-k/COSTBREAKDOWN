import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {
  calculateCostBreakdown,
  calculateRoutingDetailedRows,
  calculateSnapshotBOMDetail,
  calculateSnapshotCost,
  calculateSnapshotRoutingDetail,
  compareSnapshots,
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core'
import { safeAdd, safeDivide, safeMultiply } from '../src/core/utils/guards'
import { addCostCalculationSheet } from '../src/services/excel/cost-calculation-sheet'

const product = {
  productCode: 'NUMERIC-TEST',
  productDescription: 'Numeric Integrity Fixture',
  uom: 'pc',
  customer: 'Fixture',
  effectiveDate: '2026-10-07'
}

function bom(id: string, price: number, consumption = 1): SnapshotBOMItem {
  return { id, itemCode: id, description: id, consumption, unit: 'pc', price, loss: 0, confidence: {} }
}

function route(overrides: Partial<SnapshotRoutingStep> = {}): SnapshotRoutingStep {
  return {
    id: 'route-1', processName: 'Assembly', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1,
    confidence: {}, ...overrides
  }
}

function rate(overrides: Partial<SnapshotWorkCenterRate> = {}): SnapshotWorkCenterRate {
  return {
    id: 'rate-1', workCenterCode: 'WC-1', description: 'Assembly', laborRate: 0, burdenRate: 0,
    effectiveDate: '2026-10-07', confidence: {}, ...overrides
  }
}

function snapshot(options: {
  id: string
  bom?: SnapshotBOMItem[]
  routing?: SnapshotRoutingStep[]
  rates?: SnapshotWorkCenterRate[]
}): CostSnapshot {
  return {
    id: options.id, product, effectiveDate: '2026-10-07', sourceRef: options.id, status: 'active',
    bom: options.bom ?? [bom('mat-1', 0)],
    routing: options.routing ?? [route()],
    rates: options.rates ?? [rate()]
  }
}

assert.equal(safeDivide(0, 2), 0, 'valid zero numerator stays zero')
assert.equal(safeDivide(1, 1e-12), 1e12, 'small positive denominator is not rejected by an arbitrary threshold')
assert.equal(safeDivide(1, 0), null, 'zero denominator is unavailable')
assert.equal(safeDivide(Number.POSITIVE_INFINITY, 1), null, 'non-finite numerator is unavailable')
assert.equal(safeDivide(1, Number.MIN_VALUE), null, 'overflowing quotient is unavailable')
assert.equal(safeMultiply(Number.MAX_VALUE, 2), null, 'overflowing product is unavailable')
assert.equal(safeAdd(Number.MAX_VALUE, Number.MAX_VALUE), null, 'overflowing sum is unavailable')

const explicitZero = calculateSnapshotCost(snapshot({
  id: 'explicit-zero',
  bom: [bom('zero-mat', 8, 0)],
  routing: [route({ manning: 0 })],
  rates: [rate()]
}))
assert.equal(explicitZero.material, 0)
assert.equal(explicitZero.labor, 0)
assert.equal(explicitZero.burden, 0)
assert.equal(explicitZero.total, 0)
assert.equal(explicitZero.status, 'complete')

const tinyPositive = snapshot({
  id: 'tiny-positive',
  routing: [route({ capacity: 1e-12 })],
  rates: [rate({ laborRate: 1e-12 })]
})
const tinyCost = calculateSnapshotCost(tinyPositive)
assert.equal(tinyCost.labor, 1, 'a valid small denominator must keep its actual calculation')
const tinyDetail = calculateSnapshotRoutingDetail({ current: tinyPositive.routing[0] }, [], tinyPositive.rates)
assert.equal(tinyDetail.currentRuntime, 1e12)
assert.equal(tinyDetail.currentLaborCost, 1)
const legacyTinyDetail = calculateRoutingDetailedRows([{
  id: 'legacy-tiny-route', opSeq: 1, description: 'Tiny route', wc: 'WC-1', manning: 1,
  baseCap: 1e-12, activeCap: 1e-12, baseYield: 1, activeYield: 1, sourceRef: 'numeric-test'
}], [{
  id: 'legacy-tiny-rate', wc: 'WC-1', description: 'Tiny rate', laborRate: 1e-12, burdenRate: 0,
  effectiveDate: '2026-10-07', sourceRef: 'numeric-test'
}])
assert.equal(legacyTinyDetail.rows[0]?.baseRuntime, 1e12)
assert.equal(legacyTinyDetail.rows[0]?.baseLaborCost, 1)
assert.equal(calculateCostBreakdown([], [{
  id: 'legacy-tiny-route', opSeq: 1, description: 'Tiny route', wc: 'WC-1', manning: 1,
  baseCap: 1e-12, activeCap: 1e-12, baseYield: 1, activeYield: 1, sourceRef: 'numeric-test'
}], [{
  id: 'legacy-tiny-rate', wc: 'WC-1', description: 'Tiny rate', laborRate: 1e-12, burdenRate: 0,
  effectiveDate: '2026-10-07', sourceRef: 'numeric-test'
}]).laborBase, 1)

for (const invalidRoute of [
  route({ capacity: 0 }),
  route({ yield: 0 }),
  route({ capacity: Number.MIN_VALUE, yield: 0.5 }),
  route({ capacity: Number.MIN_VALUE })
]) {
  const result = calculateSnapshotCost(snapshot({ id: `invalid-${invalidRoute.capacity}-${invalidRoute.yield}`, routing: [invalidRoute] }))
  assert.equal(result.labor, null, 'invalid, underflowed, or overflowing routing factor must remain unavailable')
  assert.equal(result.burden, null)
  assert.equal(result.total, null)
  assert.equal(result.status, 'missing')
}

const invalidRate = calculateSnapshotCost(snapshot({ id: 'non-finite-rate', rates: [rate({ laborRate: Number.POSITIVE_INFINITY })] }))
assert.equal(invalidRate.labor, null)
assert.equal(invalidRate.total, null)

const invalidBom = calculateSnapshotCost(snapshot({ id: 'non-finite-bom', bom: [bom('invalid-mat', Number.POSITIVE_INFINITY)] }))
assert.equal(invalidBom.material, null)
assert.equal(invalidBom.total, null)
assert.ok(invalidBom.warnings.some(warning => warning.includes('invalid-mat')))

const productOverflow = calculateSnapshotCost(snapshot({ id: 'product-overflow', bom: [bom('large-mat', 2, Number.MAX_VALUE)] }))
assert.equal(productOverflow.material, null)
assert.equal(productOverflow.total, null)

const aggregateOverflow = calculateSnapshotCost(snapshot({
  id: 'aggregate-overflow',
  bom: [bom('large-mat-1', 9e307), bom('large-mat-2', 9e307)]
}))
assert.equal(aggregateOverflow.material, null, 'component aggregation overflow must invalidate its total')
assert.equal(aggregateOverflow.total, null)

const finalOverflow = calculateSnapshotCost(snapshot({
  id: 'final-overflow',
  bom: [bom('large-mat', 1e308)],
  routing: [route({ manning: 1e308 })],
  rates: [rate({ laborRate: 1 })]
}))
assert.equal(finalOverflow.material, 1e308)
assert.equal(finalOverflow.labor, 1e308)
assert.equal(finalOverflow.total, null, 'Standard Cost sum overflow must not propagate Infinity')
assert.equal(finalOverflow.status, 'missing')

const duplicateRateCost = calculateSnapshotCost(snapshot({
  id: 'duplicate-rate',
  rates: [rate(), rate({ id: 'rate-duplicate' })]
}))
assert.equal(duplicateRateCost.labor, null, 'duplicate WC identity must not select a rate')

const gapOverflow = calculateSnapshotBOMDetail({
  reference: bom('same-mat', Number.MAX_VALUE),
  current: bom('same-mat', -Number.MAX_VALUE)
})
assert.equal(gapOverflow.costGap, null, 'a non-finite comparison gap must remain unavailable')

const reference = snapshot({ id: 'reference-gap-overflow', bom: [bom('same-mat', Number.MAX_VALUE)] })
const current = snapshot({ id: 'current-gap-overflow', bom: [bom('same-mat', -Number.MAX_VALUE)] })
const comparison = compareSnapshots(reference, current)
assert.equal(comparison.totalGap, null)
assert.equal(comparison.reconciliation.reconciled, false)
assert.ok(comparison.reconciliation.issues.some(issue => issue.includes('unavailable values')))

const workbook = new ExcelJS.Workbook()
addCostCalculationSheet(workbook, {
  bomStartRow: 4, bomRowCount: 1, routingStartRow: 4, routingRowCount: 1, workCenterStartRow: 4, workCenterRowCount: 1
})
const sheet = workbook.getWorksheet('COST_CALCULATION')
const formulaAt = (cell: string) => (sheet?.getCell(cell).value as { formula?: string })?.formula ?? ''
assert.match(formulaAt('F14'), /IFERROR\(/, 'BOM row overflow must be unavailable in the workbook')
assert.match(formulaAt('F19'), /IFERROR\(/, 'Routing factor errors must be unavailable in the workbook')
assert.match(formulaAt('G19'), /IFERROR\(/, 'Routing cost errors must be unavailable in the workbook')
assert.match(formulaAt('C6'), /non-finite total/, 'BOM total overflow must be unavailable in the workbook')
assert.match(formulaAt('C9'), /IFERROR\(/, 'Standard Cost total overflow must be unavailable in the workbook')

console.log('Numeric integrity verification passed')
