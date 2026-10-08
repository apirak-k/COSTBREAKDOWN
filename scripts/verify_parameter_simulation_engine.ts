import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types'
import {
  calculateParameterSimulation,
  updateSimulationParameter
} from '../src/features/simulation/simulation-engine.ts'
import { setSimulationFactors, SIMULATION_FACTORS, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'

function bom(id: string, name: string, price: number | null, usage = 1): SnapshotBOMItem {
  return { id, itemCode: name, description: name, consumption: usage, unit: 'PC', price, loss: 0, confidence: {} }
}

function route(id: string, name: string, wc: string, manning: number): SnapshotRoutingStep {
  return { id, processName: name, workCenterId: wc, manning, capacity: 1, yield: 1, confidence: {} }
}

function rate(id: string, wc: string, laborRate: number, burdenRate: number): SnapshotWorkCenterRate {
  return { id, workCenterCode: wc, description: wc, laborRate, burdenRate, effectiveDate: '', confidence: {} }
}

function snapshot(id: string, bomRows: SnapshotBOMItem[], routes: SnapshotRoutingStep[]): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [rate(`${id}-wc1`, 'WC1', 10, 2), rate(`${id}-wc2`, 'WC2', 5, 1)],
    bom: bomRows,
    routing: routes
  }
}

const current = snapshot('Current', [
  bom('current-a', 'MAT-A', 10),
  bom('current-stable', 'MAT-STABLE', 3),
  bom('current-removed', 'MAT-REMOVED', 2)
], [
  route('current-assembly', 'Assembly', 'WC1', 1),
  route('current-inspect', 'Inspect', 'WC2', 1)
])
const custom = snapshot('Custom', [
  bom('custom-a', 'MAT-A', 12),
  bom('custom-stable', 'MAT-STABLE', 3),
  bom('custom-added', 'MAT-ADDED', 1, 2)
], [
  route('custom-assembly', 'Assembly', 'WC1', 2),
  route('custom-polish', 'Polish', 'WC2', 1)
])
const sources: Record<MasterDataRole, CostSnapshot> = { reference: current, current, custom }
const state = startSimulationFrom('custom', sources)
assert.ok(state.snapshot)
assert.deepEqual(SIMULATION_FACTORS, [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
], 'Only finalized BOM and Routing factors are selectable')
const result = calculateParameterSimulation(current, state.snapshot)
assert.equal(result.currentCost.total, 33)
assert.equal(result.simulationCost.total, 47)
assert.equal(result.parameterSavingPerPiece, -14, 'Negative parameter savings remain visible')

const row = (kind: 'bom' | 'routing', name: string) => result.records.find(record => record.kind === kind && record.name === name)
assert.equal(row('bom', 'MAT-A')?.status, 'CHANGED')
assert.equal(row('bom', 'MAT-STABLE')?.status, 'UNCHANGED')
assert.equal(row('bom', 'MAT-ADDED')?.status, 'ADDED')
assert.equal(row('bom', 'MAT-REMOVED')?.status, 'REMOVED')
assert.equal(row('bom', 'MAT-REMOVED')?.simulationRecordId, undefined, 'REMOVED has no SIM-side record')
assert.equal(row('routing', 'Assembly')?.status, 'CHANGED')
assert.equal(row('routing', 'Polish')?.status, 'ADDED')
assert.equal(row('routing', 'Inspect')?.status, 'REMOVED')

const blockedWithoutFactor = updateSimulationParameter(state, current, 'custom-a', 'bom.price', 5)
assert.strictEqual(blockedWithoutFactor, state, 'Parameters cannot change until their factor is selected')
const selected = setSimulationFactors(state, ['bom.price'])
const changedPrice = updateSimulationParameter(selected, current, 'custom-a', 'bom.price', 5)
assert.equal(changedPrice.snapshot?.bom.find(item => item.id === 'custom-a')?.price, 5)
assert.equal(calculateParameterSimulation(current, changedPrice.snapshot!).parameterSavingPerPiece, -7)
assert.strictEqual(updateSimulationParameter(selected, current, 'current-removed', 'bom.price', 1), selected, 'REMOVED rows cannot be edited')
assert.strictEqual(updateSimulationParameter(selected, current, 'custom-a', 'bom.price', Number.NaN), selected, 'Non-finite parameter values are rejected')

const changedConsumption = updateSimulationParameter(
  setSimulationFactors(state, ['bom.consumption']), current, 'custom-a', 'bom.consumption', 2
)
assert.equal(changedConsumption.snapshot?.bom.find(item => item.id === 'custom-a')?.consumption, 2)
const changedLoss = updateSimulationParameter(
  setSimulationFactors(state, ['bom.loss']), current, 'custom-a', 'bom.loss', 0.1
)
assert.equal(changedLoss.snapshot?.bom.find(item => item.id === 'custom-a')?.loss, 0.1)
const changedCapacity = updateSimulationParameter(
  setSimulationFactors(state, ['routing.capacity']), current, 'custom-assembly', 'routing.capacity', 2
)
assert.equal(changedCapacity.snapshot?.routing.find(step => step.id === 'custom-assembly')?.capacity, 2)
const changedYield = updateSimulationParameter(
  setSimulationFactors(state, ['routing.yield']), current, 'custom-assembly', 'routing.yield', 0.9
)
assert.equal(changedYield.snapshot?.routing.find(step => step.id === 'custom-assembly')?.yield, 0.9)

const selectedBoth = setSimulationFactors(changedPrice, ['bom.price', 'routing.manning'])
const changedRoute = updateSimulationParameter(selectedBoth, current, 'custom-assembly', 'routing.manning', 1)
assert.equal(changedRoute.snapshot?.routing.find(step => step.id === 'custom-assembly')?.manning, 1)
assert.equal(calculateParameterSimulation(current, changedRoute.snapshot!).parameterSavingPerPiece, 5, 'Changing Routing recalculates full-snapshot cost')
assert.deepEqual(state.snapshot, custom, 'Simulation calculations and edits leave Custom Working unchanged')

const incompleteCurrent = snapshot('Incomplete', [bom('bad-material', 'MAT-A', null)], [])
const incompleteResult = calculateParameterSimulation(incompleteCurrent, state.snapshot)
assert.equal(incompleteResult.currentCost.total, null)
assert.equal(incompleteResult.parameterSavingPerPiece, null, 'Missing cost inputs are unavailable, not zero')

const duplicateCurrent = snapshot('Duplicate', [bom('duplicate-a', 'MAT-A', 10), bom('duplicate-a2', 'MAT-A', 10)], [])
const ambiguousResult = calculateParameterSimulation(duplicateCurrent, state.snapshot)
assert.ok(ambiguousResult.records.some(record => record.identityIssue === 'ambiguous'))
assert.strictEqual(updateSimulationParameter(state, duplicateCurrent, 'custom-a', 'bom.price', 1), state, 'Ambiguous identity is not guessed')

console.log('Parameter Simulation engine verification passed')
