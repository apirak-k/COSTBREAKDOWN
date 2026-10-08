import assert from 'node:assert/strict'
import { SIMULATION_PARAMETERS } from '../src/features/simulation/simulation-state.ts'

assert.deepEqual(SIMULATION_PARAMETERS, [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
])
assert.ok(SIMULATION_PARAMETERS.every(parameter => parameter.startsWith('bom.') || parameter.startsWith('routing.')))
assert.equal(SIMULATION_PARAMETERS.some(parameter => parameter.includes('rate') || parameter.includes('workCenter')), false,
  'there are no Work Center rate simulation fields')

console.log('Finalized Simulation parameter mapping verification passed')
