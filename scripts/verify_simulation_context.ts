import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  reconcileSimulationState,
  retainSimulationStatesForProducts
} from '../src/features/simulation/simulation-state.ts'
import { updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'

function snapshot(role: MasterDataRole, price: number, laborRate: number): CostSnapshot {
  return {
    id: role,
    product: { productCode: `P-${role}`, productDescription: role, uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: role, status: 'draft',
    rates: [{ id: `rate-${role}`, workCenterCode: 'WC-1', description: role, laborRate, burdenRate: laborRate / 2, effectiveDate: '', confidence: {} }],
    bom: [{ id: `bom-${role}`, itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }],
    routing: [{ id: `route-${role}`, processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
  }
}

const sources = {
  reference: snapshot('reference', 10, 100),
  current: snapshot('current', 20, 200),
  custom: snapshot('custom', 30, 300)
}
const state = updateSimulationParameter(
  createEmptySimulationState(sources), sources, sources.custom.bom[0].id, 'bom.price', 75, 'custom'
)
assert.equal(state.schemaVersion, 2)
assert.equal(getEffectiveSimulationDataset(sources, state, 'custom').snapshot.bom[0].price, 75)
assert.deepEqual(getEffectiveSimulationDataset(sources, state, 'custom').snapshot.rates, sources.custom.rates,
  'Custom Simulation keeps Custom Work Center rates')

const changedCurrentSources = { ...sources, current: { ...sources.current, sourceRef: 'changed-current' } }
const reconciled = reconcileSimulationState(state, changedCurrentSources)
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'current').snapshot.bom[0].price, 20,
  'a changed Current Master basis resets only Current overrides')
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'custom').snapshot.bom[0].price, 75,
  'a changed Current Master basis preserves Custom overrides')
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'reference').snapshot.bom[0].price, 10,
  'a changed Current Master basis preserves Reference')

const products = { p1: reconciled, p2: createEmptySimulationState(changedCurrentSources) }
const retained = retainSimulationStatesForProducts(products, new Set(['p1']))
assert.deepEqual(Object.keys(retained), ['p1'], 'deleted products do not retain Simulation state')
assert.strictEqual(retained.p1, reconciled, 'a retained product keeps its independent role-keyed state')

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(app, /simulationStatesByProduct\[activeProductId\]/, 'Simulation state is scoped by active product')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/, 'Simulation is reachable as its own module')
assert.match(app, /masterDataSnapshots\.reference/, 'Simulation context receives Reference Working data')
assert.match(app, /getActiveSimulationDataset\(masterDataSnapshots, simulationState\)/,
  'the active view is derived from the role-keyed Simulation state and latest Working sources')
assert.doesNotMatch(app, /rca-simulation|selectedCandidateKey|trialHandoffLetter|selectedScenarioLetter/,
  'Simulation routing does not depend on legacy RCA, Trial, or A/B state')

console.log('PASS: Independent Simulation context, role-scoped reconciliation, and product retention')
