import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types'
import { calculateMultiplicativeCostAttribution } from '../src/core/calculations/multiplicative-cost-attribution.ts'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  reconcileSimulationState,
  SIMULATION_PARAMETERS
} from '../src/features/simulation/simulation-state.ts'

const assertClose = (actual: number | null | undefined, expected: number, label: string) =>
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < 1e-9,
    `${label}: expected ${expected}, received ${String(actual)}`)

function bom(id: string, name: string, price: number | null, usage = 1, loss = 0): SnapshotBOMItem {
  return { id, itemCode: name, description: name, consumption: usage, unit: 'PC', price, loss, confidence: {} }
}

function route(id: string, name: string, wc: string, manning: number, capacity = 100, yieldRate = 1): SnapshotRoutingStep {
  return { id, processName: name, workCenterId: wc, manning, capacity, yield: yieldRate, confidence: {} }
}

function rate(id: string, wc: string, laborRate: number, burdenRate: number): SnapshotWorkCenterRate {
  return { id, workCenterCode: wc, description: wc, laborRate, burdenRate, effectiveDate: '', confidence: {} }
}

function snapshot(
  id: string,
  bomRows: SnapshotBOMItem[],
  routes: SnapshotRoutingStep[],
  rates = [rate(`${id}-wc1`, 'WC1', 100, 50), rate(`${id}-wc2`, 'WC2', 10, 5)]
): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: id, status: 'draft', rates, bom: bomRows, routing: routes
  }
}

const current = snapshot('Current', [bom('current-steel', 'Steel', 10, 2, 0.05)], [
  route('current-cut', 'Cut', 'WC1', 1), route('current-form', 'Form', 'WC2', 1)
])
const reference = snapshot('Reference', [bom('ref-steel', 'Steel', 10, 2, 0.05)], [
  route('ref-cut', 'Cut', 'WC1', 1), route('ref-form', 'Form', 'WC2', 1)
], [rate('reference-wc1', 'WC1', 200, 80), rate('reference-wc2', 'WC2', 20, 8)])
const custom = snapshot('Custom', [bom('custom-steel', 'Steel', 10, 2, 0.05)], [
  route('custom-cut', 'Cut', 'WC1', 1), route('custom-form', 'Form', 'WC2', 1)
], [rate('custom-wc1', 'WC1', 300, 120), rate('custom-wc2', 'WC2', 30, 12)])
const sources: Record<MasterDataRole, CostSnapshot> = { reference, current, custom }
const state = createEmptySimulationState(sources)
const currentSnapshot = getEffectiveSimulationDataset(sources, state, 'current').snapshot

assert.deepEqual(SIMULATION_PARAMETERS, [
  'bom.price', 'bom.consumption', 'bom.loss', 'routing.manning', 'routing.capacity', 'routing.yield'
], 'only direct BOM and Routing parameters are represented')
assert.deepEqual(currentSnapshot.rates, current.rates, 'Current uses Current Work Center rates')

const unchanged = calculateParameterSimulation(current, currentSnapshot)
assertClose(unchanged.beforeCost.total, 22.65, 'Before Standard Cost')
assertClose(unchanged.afterCost.total, 22.65, 'After Standard Cost')
assert.equal(unchanged.parameterSavingPerPiece, 0, 'parameter saving is zero when no values change')

const changedPrice = updateSimulationParameter(state, sources, 'current-steel', 'bom.price', 12, 'current')
const changedCurrentSnapshot = getEffectiveSimulationDataset(sources, changedPrice, 'current').snapshot
assert.equal(changedCurrentSnapshot.bom[0]?.price, 12)
const priceResult = calculateParameterSimulation(current, changedCurrentSnapshot)
assert.equal(priceResult.beforeCost.material, 21)
assertClose(priceResult.afterCost.material, 25.2, 'After Material Cost')
assertClose(priceResult.parameterSavingPerPiece, -4.2, 'Parameter Saving uses Before - After')

const precisePriceEdit = updateSimulationParameter(state, sources, 'current-steel', 'bom.price', 12.3456789, 'current')
const precisePriceSnapshot = getEffectiveSimulationDataset(sources, precisePriceEdit, 'current').snapshot
assert.equal(precisePriceSnapshot.bom[0]?.price, 12.3456789, 'Simulation stores the complete typed Price value')
assertClose(calculateParameterSimulation(current, precisePriceSnapshot).afterCost.material, 25.92592569,
  'Simulation calculation uses high-precision Price instead of its two-decimal display')
const preciseUsageEdit = updateSimulationParameter(state, sources, 'current-steel', 'bom.consumption', 1.23456789, 'current')
const preciseUsageSnapshot = getEffectiveSimulationDataset(sources, preciseUsageEdit, 'current').snapshot
assert.equal(preciseUsageSnapshot.bom[0]?.consumption, 1.23456789, 'Simulation stores the complete typed Usage value')
assertClose(calculateParameterSimulation(current, preciseUsageSnapshot).afterCost.material, 12.962962845,
  'Simulation calculation uses high-precision Usage instead of its two-decimal display')
const tinyCapacityEdit = updateSimulationParameter(state, sources, 'current-cut', 'routing.capacity', 0.0000001, 'current')
const tinyCapacitySnapshot = getEffectiveSimulationDataset(sources, tinyCapacityEdit, 'current').snapshot
assert.equal(tinyCapacitySnapshot.routing[0]?.capacity, 0.0000001, 'Capacity accepts and stores any positive representable value')
assert.equal(calculateParameterSimulation(current, tinyCapacitySnapshot).afterCost.labor, 1_000_000_000.1,
  'Capacity calculation uses the actual positive value')
const preciseYieldEdit = updateSimulationParameter(state, sources, 'current-cut', 'routing.yield', 0.99123456789, 'current')
const preciseYieldSnapshot = getEffectiveSimulationDataset(sources, preciseYieldEdit, 'current').snapshot
assert.equal(preciseYieldSnapshot.routing[0]?.yield, 0.99123456789, 'Yield accepts high precision while retaining its stored fractional domain')
assertClose(calculateParameterSimulation(current, preciseYieldSnapshot).afterCost.labor, 100 / (100 * 0.99123456789) + 0.1,
  'Yield calculation uses the stored high-precision fraction')

const priceAttribution = calculateMultiplicativeCostAttribution(21, 25.2, [
  { key: 'price', baseline: 10, target: 12 },
  { key: 'usage', baseline: 2, target: 2 },
  { key: 'loss', baseline: 1.05, target: 1.05 }
])
assertClose(priceAttribution.effects?.price, 4.2, 'Price attribution')
assertClose(priceAttribution.effects?.usage, 0, 'Usage attribution')
assertClose(priceAttribution.effects?.loss, 0, 'Loss attribution')
assertClose(priceAttribution.totalEffect, 4.2, 'Total BOM effect')
assert.ok(Math.abs(Object.values(priceAttribution.effects ?? {}).reduce((sum, value) => sum + value, 0) - 4.2) < 1e-9,
  'BOM attribution reconciles to After Material Cost - Before Material Cost')

const zeroMaterialAttribution = calculateMultiplicativeCostAttribution(25.2, 0, [
  { key: 'price', baseline: 12, target: 12 },
  { key: 'usage', baseline: 2, target: 0 },
  { key: 'loss', baseline: 1.05, target: 2 }
])
assertClose(zeroMaterialAttribution.effects?.price, 0, 'zero-boundary Price effect')
assertClose(zeroMaterialAttribution.effects?.usage, -36.6, 'zero-boundary Usage effect')
assertClose(zeroMaterialAttribution.effects?.loss, 11.4, 'zero-boundary Loss effect')
assertClose(zeroMaterialAttribution.totalEffect, -25.2, 'zero-boundary Material Cost total effect')
assert.ok(Math.abs(Object.values(zeroMaterialAttribution.effects ?? {}).reduce((sum, value) => sum + value, 0) + 25.2) < 1e-9,
  'zero-boundary effects reconcile to After Material Cost - Before Material Cost')

const changedManning = updateSimulationParameter(state, sources, 'current-cut', 'routing.manning', 0.8, 'current')
const changedRoutingSnapshot = getEffectiveSimulationDataset(sources, changedManning, 'current').snapshot
const routeResult = calculateParameterSimulation(current, changedRoutingSnapshot)
assertClose(routeResult.beforeCost.labor, 1.1, 'Before Labor')
assertClose(routeResult.beforeCost.burden, 0.55, 'Before Burden')
assertClose(routeResult.afterCost.labor, 0.9, 'After Labor')
assertClose(routeResult.afterCost.burden, 0.45, 'After Burden')
assertClose(routeResult.beforeCost.total! - routeResult.afterCost.total!, 0.3, 'Routing Manning effect')
const routingAttribution = calculateMultiplicativeCostAttribution(1.5, 1.2, [
  { key: 'manning', baseline: 1, target: 0.8 },
  { key: 'capacity', baseline: 1 / 100, target: 1 / 100 },
  { key: 'yield', baseline: 1, target: 1 }
])
assert.ok(Math.abs(routingAttribution.totalEffect! + 0.3) < 1e-9)
assert.ok(Math.abs(Object.values(routingAttribution.effects ?? {}).reduce((sum, value) => sum + value, 0) + 0.3) < 1e-9,
  'Routing parameter attribution reconciles to After Conversion Cost - Before Conversion Cost')

for (const [parameter, invalid] of [
  ['bom.price', -1], ['bom.price', Infinity], ['bom.price', NaN],
  ['bom.consumption', -0.1], ['bom.loss', -0.01], ['bom.loss', 1.0001],
  ['routing.manning', -1], ['routing.manning', Infinity],
  ['routing.capacity', 0], ['routing.capacity', -1],
  ['routing.yield', 0], ['routing.yield', 1.0001]
] as const) {
  const recordId = parameter.startsWith('bom.') ? 'current-steel' : 'current-cut'
  assert.strictEqual(updateSimulationParameter(state, sources, recordId, parameter, invalid, 'current'), state,
    `${parameter} rejects ${String(invalid)} at the calculation/state boundary`)
}
assert.strictEqual(updateSimulationParameter(state, sources, 'current-cut', 'routing.capacity', 0, 'current'), state,
  'Capacity zero is rejected')
const cleared = updateSimulationParameter(state, sources, 'current-steel', 'bom.price', null, 'current')
const clearedSnapshot = getEffectiveSimulationDataset(sources, cleared, 'current').snapshot
assert.equal(clearedSnapshot.bom[0]?.price, null, 'blank remains unavailable and is never replaced with zero')
assert.equal(calculateParameterSimulation(current, clearedSnapshot).afterCost.total, null,
  'missing required inputs make the cost unavailable')

const structuralCustom = snapshot('Custom-structure', [
  bom('custom-steel', 'Steel', 10, 2, 0.05)
], [
  route('custom-cut', 'Cut', 'WC1', 1),
  route('custom-polish', 'Polish', 'WC2', 1)
], [rate('custom-rate', 'WC1', 999, 999), rate('custom-rate-2', 'WC2', 888, 888)])
const structuralSources = { ...sources, custom: structuralCustom }
const structuralState = createEmptySimulationState(structuralSources)
const structuralEffective = getEffectiveSimulationDataset(structuralSources, structuralState, 'custom').snapshot
assert.equal(structuralEffective.rates[0]?.laborRate, 999, 'Custom keeps its own Work Center rates')
assert.equal(structuralEffective.routing.length, 2, 'effective Custom preserves its Master structure')
const structuralResult = calculateParameterSimulation(current, structuralEffective)
const row = (name: string) => structuralResult.records.find(record => record.kind === 'routing' && record.name === name)
assert.equal(row('Cut')?.status, 'CHANGED', 'the Work Center rate difference is visible in the generic comparison')
assert.equal(row('Polish')?.status, 'ADDED')
assert.ok(structuralResult.records.some(record => record.kind === 'routing' && record.name === 'Form' && record.status === 'REMOVED'))
assert.equal(row('Polish')?.identityIssue, null)
assert.ok(structuralResult.records.some(record => record.kind === 'routing' && record.name === 'Cut'),
  'identity matching remains business-key based rather than depending on array position')

const removedCustom = snapshot('Custom-without-form', [], [route('custom-cut', 'Cut', 'WC1', 1)])
const removedSources = { ...sources, custom: removedCustom }
const removedEffective = getEffectiveSimulationDataset(removedSources, createEmptySimulationState(removedSources), 'custom').snapshot
const removedResult = calculateParameterSimulation(current, removedEffective)
assert.ok(removedResult.records.some(record => record.kind === 'routing' && record.name === 'Form' && record.status === 'REMOVED'
  && record.afterRecordId === undefined), 'a Before-only route is visible as REMOVED and has no editable After record')

const duplicateCurrent = snapshot('Duplicate', [bom('dup-a', 'Steel', 10), bom('dup-b', 'Steel', 10)], [])
const duplicateSources = { ...sources, custom: duplicateCurrent }
const duplicateState = createEmptySimulationState(duplicateSources)
const duplicateResult = calculateParameterSimulation(current, duplicateCurrent)
assert.ok(duplicateResult.records.some(record => record.identityIssue === 'ambiguous'))
assert.strictEqual(updateSimulationParameter(duplicateState, duplicateSources, 'dup-a', 'bom.price', 1, 'custom'), duplicateState,
  'ambiguous business identity is protected and never guessed')

const migrated = reconcileSimulationState({ ...state, selectedFactors: ['bom.price'] }, sources)
assert.equal('selectedFactors' in migrated, false, 'legacy selectedFactors are discarded safely')
assert.equal('selectedFactors' in state, false, 'new state has no Factors to Simulate selector state')

console.log('PASS: Parameter Simulation calculations, validation, structure, role rates, and cost effects')
