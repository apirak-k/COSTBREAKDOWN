import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot } from '../src/core/types'
import {
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  startSimulationFrom,
  type SimulationSources
} from '../src/features/simulation/simulation-state.ts'

function snapshot(id: string): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: id, status: 'draft', rates: [], bom: [], routing: []
  }
}

const sources: SimulationSources = {
  reference: snapshot('reference'),
  current: snapshot('current'),
  custom: snapshot('custom')
}
const state = startSimulationFrom('custom', sources, '2026-10-09T00:00:00.000Z')
assert.notStrictEqual(state.snapshot, sources.custom)
assert.strictEqual(reconcileSimulationState(state, sources), state, 'an unchanged source and Current basis preserve SIM state')

const next: SimulationSources = { ...sources, current: { ...sources.current, sourceRef: 'changed-current' } }
const reset = reconcileSimulationState(state, next)
assert.equal(reset.snapshot, null, 'changing Current invalidates the temporary SIM basis')

const products = { p1: state, p2: startSimulationFrom('reference', sources) }
assert.deepEqual(Object.keys(retainSimulationStatesForProducts(products, new Set(['p1']))), ['p1'])

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(app, /simulationStatesByProduct\[activeProductId\]/, 'SIM state is scoped by product')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/, 'Simulation is reachable as its own module')
assert.match(app, /masterDataSnapshots\.reference/, 'the story input includes Reference')
assert.doesNotMatch(app, /rca-simulation|selectedCandidateKey|trialHandoffLetter|selectedScenarioLetter/,
  'Simulation routing does not depend on RCA, Trial, or an A/B choice')

console.log('Independent Simulation context verification passed')
