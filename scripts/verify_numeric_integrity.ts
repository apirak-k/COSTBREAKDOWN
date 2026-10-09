import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as publicCore from '../src/core'
import {
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

const product = {
  productCode: 'NUMERIC-TEST',
  productDescription: 'Numeric Integrity Fixture',
  uom: 'pc',
  customer: 'Fixture',
  effectiveDate: '2026-10-07'
}

assert.equal('calculateCostBreakdown' in publicCore, false, 'legacy single-session cost engine must not be exported publicly')
assert.equal('calculateTopDrivers' in publicCore, false, 'legacy driver engine must not be exported publicly')
assert.equal('calculateBOMDetailedRows' in publicCore, false, 'legacy BOM variance breakdown must not be exported publicly')
assert.equal('calculateRoutingDetailedRows' in publicCore, false, 'legacy Routing cost breakdown must not be exported publicly')
assert.equal('compareWorkingDatasets' in publicCore, false, 'parallel two-dataset comparison must not be exported publicly')
assert.equal('buildDriverKey' in publicCore, false, 'legacy driver key helper must not be exported publicly')
assert.equal('getCostDriverImpact' in publicCore, false, 'legacy driver impact helper must not be exported publicly')
assert.equal(existsSync(resolve(process.cwd(), 'src/state/working-datasets.ts')), false, 'parallel Reference/Current workspace module must be retired')
assert.equal(existsSync(resolve(process.cwd(), 'src/core/types/dataset-standard.types.ts')), false, 'parallel dataset schema types must be retired')
assert.equal(existsSync(resolve(process.cwd(), 'src/core/calculations/detailed-breakdown.ts')), false, 'retired unsupported monetary attribution module must be removed')

const providerSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
assert.doesNotMatch(providerSource, /\bworkingDatasets\b/, 'Provider must not expose the disconnected two-dataset schema')
assert.doesNotMatch(providerSource, /\bupdateWorkingDataset\b/, 'Provider must not expose the disconnected dataset updater')
assert.doesNotMatch(providerSource, /\bcalculateCostBreakdown\b/, 'Provider must use the canonical snapshot calculation path')
assert.doesNotMatch(providerSource, /\bcalculateTopDrivers\b/, 'Provider must use the canonical Candidate pipeline')
assert.doesNotMatch(providerSource, /^\s*costBreakdown\s*:/m, 'Provider context must not expose a parallel cost result')
assert.doesNotMatch(providerSource, /^\s*topDrivers\s*:/m, 'Provider context must expose Candidates, not legacy cost drivers')

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

console.log('Numeric integrity verification passed')
