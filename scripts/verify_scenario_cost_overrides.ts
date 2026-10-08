import assert from 'node:assert/strict'
import type { CostSnapshot } from '../src/core/types'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import { setSimulationFactors, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'

const current: CostSnapshot = {
  id: 'current',
  product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' },
  effectiveDate: '', sourceRef: 'fixture', status: 'draft',
  rates: [{ id: 'rate-1', workCenterCode: 'WC-1', description: 'WC', laborRate: 10, burdenRate: 5, effectiveDate: '', confidence: {} }],
  bom: [{ id: 'bom-1', itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price: 10, loss: 0, confidence: {} }],
  routing: [{ id: 'route-1', processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
}
const state = startSimulationFrom('current', { reference: current, current, custom: current })
const before = JSON.stringify(state.snapshot?.rates)
const result = calculateParameterSimulation(current, state.snapshot!)
assert.equal(result.simulationCost.total, result.currentCost.total)
assert.equal(JSON.stringify(state.snapshot?.rates), before)

const selected = setSimulationFactors(state, ['routing.capacity'])
const edited = updateSimulationParameter(selected, current, 'route-1', 'routing.capacity', 20)
assert.equal(edited.snapshot?.routing[0]?.capacity, 20)
assert.equal(edited.snapshot?.rates[0]?.laborRate, 10)
assert.equal(edited.snapshot?.rates[0]?.burdenRate, 5)
assert.notEqual(calculateParameterSimulation(current, edited.snapshot!).simulationCost.total, result.simulationCost.total,
  'the shared full-snapshot calculation responds to an allowed Routing factor')

console.log('Current-to-SIM parameter calculation verification passed; Work Center rates remain unchanged')
