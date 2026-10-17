import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types'
import { calculateMultiplicativeCostAttribution } from '../src/core/calculations/multiplicative-cost-attribution.ts'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import { reconcileSimulationState, SIMULATION_PARAMETERS, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'

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
])
const custom = snapshot('Custom', [bom('custom-steel', 'Steel', 10, 2, 0.05)], [
  route('custom-cut', 'Cut', 'WC1', 1), route('custom-form', 'Form', 'WC2', 1)
])
const sources: Record<MasterDataRole, CostSnapshot> = { reference, current, custom }
const state = startSimulationFrom('current', sources)
assert.deepEqual(SIMULATION_PARAMETERS, [
  'bom.price', 'bom.consumption', 'bom.loss', 'routing.manning', 'routing.capacity', 'routing.yield'
], 'only direct BOM and Routing parameters are represented')
assert.equal(state.snapshot?.rates[0]?.laborRate, 100)

const unchanged = calculateParameterSimulation(current, state.snapshot!)
assertClose(unchanged.currentCost.total, 22.65, 'Current Standard Cost')
assertClose(unchanged.simulationCost.total, 22.65, 'SIM Standard Cost')
assert.equal(unchanged.parameterSavingPerPiece, 0, 'Current → SIM saving is zero when no values change')
assertClose(unchanged.simulationCost.total! - unchanged.currentCost.total!, 0, 'Result Change is SIM - Current')

const changedPrice = updateSimulationParameter(state, current, 'current-steel', 'bom.price', 12)
assert.equal(changedPrice.snapshot?.bom[0]?.price, 12)
const priceResult = calculateParameterSimulation(current, changedPrice.snapshot!)
assert.equal(priceResult.currentCost.material, 21)
assertClose(priceResult.simulationCost.material, 25.2, 'SIM Material Cost')
assertClose(priceResult.simulationCost.material! - priceResult.currentCost.material!, 4.2, 'BOM Price change')
assertClose(priceResult.parameterSavingPerPiece, -4.2, 'Parameter Saving uses Current - SIM, the inverse of Result Change')
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
  'BOM price attribution reconciles to SIM Material Cost - Current Material Cost')

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
  'zero-boundary parameter effects reconcile to SIM Material Cost - Current Material Cost')

const changedManning = updateSimulationParameter(state, current, 'current-cut', 'routing.manning', 0.8)
const routeResult = calculateParameterSimulation(current, changedManning.snapshot!)
assertClose(routeResult.currentCost.labor, 1.1, 'Current Labor')
assertClose(routeResult.currentCost.burden, 0.55, 'Current Burden')
assertClose(routeResult.simulationCost.labor, 0.9, 'SIM Labor')
assertClose(routeResult.simulationCost.burden, 0.45, 'SIM Burden')
assertClose(routeResult.currentCost.total! - routeResult.simulationCost.total!, 0.3, 'Routing Manning effect')
const routingAttribution = calculateMultiplicativeCostAttribution(1.5, 1.2, [
  { key: 'manning', baseline: 1, target: 0.8 },
  { key: 'capacity', baseline: 1 / 100, target: 1 / 100 },
  { key: 'yield', baseline: 1 / 1, target: 1 / 1 }
])
assert.ok(Math.abs(routingAttribution.totalEffect! + 0.3) < 1e-9)
assert.ok(Math.abs(Object.values(routingAttribution.effects ?? {}).reduce((sum, value) => sum + value, 0) + 0.3) < 1e-9,
  'Routing parameter attribution reconciles to SIM Conversion Cost - Current Conversion Cost')

for (const [parameter, invalid] of [
  ['bom.price', -1], ['bom.price', Infinity], ['bom.price', NaN],
  ['bom.consumption', -0.1], ['bom.loss', -0.01], ['bom.loss', 1.0001],
  ['routing.manning', -1], ['routing.manning', Infinity],
  ['routing.capacity', 0], ['routing.capacity', -1],
  ['routing.yield', 0], ['routing.yield', 1.0001]
] as const) {
  const recordId = parameter.startsWith('bom.') ? 'current-steel' : 'current-cut'
  assert.strictEqual(updateSimulationParameter(state, current, recordId, parameter, invalid), state,
    `${parameter} rejects ${String(invalid)} at the calculation/state boundary`)
}
assert.strictEqual(updateSimulationParameter(state, current, 'current-cut', 'routing.capacity', 0), state,
  'Capacity zero is rejected')
const cleared = updateSimulationParameter(state, current, 'current-steel', 'bom.price', null)
assert.equal(cleared.snapshot?.bom[0]?.price, null, 'blank remains unavailable and is never replaced with zero')
assert.equal(calculateParameterSimulation(current, cleared.snapshot!).simulationCost.total, null,
  'missing required inputs make the cost unavailable')

const structuralCustom = snapshot('Custom-structure', [
  bom('custom-steel', 'Steel', 10, 2, 0.05)
], [
  route('custom-cut', 'Cut', 'WC1', 1),
  route('custom-polish', 'Polish', 'WC2', 1)
], [rate('custom-rate', 'WC1', 999, 999), rate('custom-rate-2', 'WC2', 888, 888)])
const structuralSim = startSimulationFrom('custom', { ...sources, custom: structuralCustom })
assert.equal(structuralSim.snapshot?.rates[0]?.laborRate, 100, 'Custom clone rates are replaced with Current rates')
assert.equal(structuralSim.snapshot?.routing.length, 2, 'Custom clone preserves its chosen structure')
const structuralResult = calculateParameterSimulation(current, structuralSim.snapshot!)
const row = (name: string) => structuralResult.records.find(record => record.kind === 'routing' && record.name === name)
assert.equal(row('Cut')?.status, 'UNCHANGED')
assert.equal(row('Polish')?.status, 'ADDED')
assert.ok(structuralResult.records.some(record => record.kind === 'routing' && record.name === 'Form' && record.status === 'REMOVED'))
assert.equal(row('Polish')?.identityIssue, null)
assert.ok(structuralResult.records.some(record => record.kind === 'routing' && record.name === 'Cut'),
  'identity matching remains business-key based rather than depending on array position')

const removedCustom = snapshot('Custom-without-form', [], [route('custom-cut', 'Cut', 'WC1', 1)])
const removedSim = startSimulationFrom('custom', { ...sources, custom: removedCustom })
const removedResult = calculateParameterSimulation(current, removedSim.snapshot!)
assert.ok(removedResult.records.some(record => record.kind === 'routing' && record.name === 'Form' && record.status === 'REMOVED'
  && record.simulationRecordId === undefined), 'a Current-only route is visible as REMOVED and has no editable SIM record')

const duplicateCurrent = snapshot('Duplicate', [bom('dup-a', 'Steel', 10), bom('dup-b', 'Steel', 10)], [])
const duplicateResult = calculateParameterSimulation(duplicateCurrent, structuralSim.snapshot!)
assert.ok(duplicateResult.records.some(record => record.identityIssue === 'ambiguous'))
assert.strictEqual(updateSimulationParameter(structuralSim, duplicateCurrent, 'custom-steel', 'bom.price', 1), structuralSim,
  'ambiguous identity is protected and never guessed')

const migrated = reconcileSimulationState({
  ...state,
  selectedFactors: ['bom.price']
} as typeof state, sources)
assert.equal('selectedFactors' in migrated, false, 'legacy selectedFactors are removed safely')
assert.equal('selectedFactors' in state, false, 'new state has no Factors to Simulate selector state')

console.log('Parameter Simulation engine, validation, structural status, and cost-effect verification passed')
