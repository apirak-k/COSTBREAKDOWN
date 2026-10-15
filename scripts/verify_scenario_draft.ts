import assert from 'node:assert/strict'
import type { CostSnapshot } from '../src/core/types'
import { createEmptySimulationState, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'

const snapshot: CostSnapshot = {
  id: 'custom',
  product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' },
  effectiveDate: '', sourceRef: 'fixture', status: 'draft', rates: [], bom: [], routing: []
}
const sources = { reference: { ...snapshot, id: 'reference' }, current: { ...snapshot, id: 'current' }, custom: snapshot }
const empty = createEmptySimulationState()
assert.equal(empty.snapshot, null, 'Simulation starts without a Candidate or prepared scenario')
assert.equal(empty.sourceRole, null)

const state = startSimulationFrom('custom', sources, '2026-10-09T00:00:00.000Z')
assert.equal(state.sourceRole, 'custom')
assert.deepEqual(state.snapshot, snapshot)
assert.notStrictEqual(state.snapshot, snapshot, 'SIM begins as an isolated snapshot copy')
assert.equal('selectedFactors' in state, false, 'direct parameter editing does not retain a Factors selector')
assert.equal('scenarioDraftsByCandidate' in state, false, 'Simulation state is independent from RCA and A/B drafts')
assert.equal('selectedScenarioLetter' in state, false)
assert.equal('trialHandoffLetter' in state, false)

console.log('Independent Simulation workspace verification passed')
