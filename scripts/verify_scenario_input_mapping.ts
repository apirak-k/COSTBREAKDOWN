import assert from 'node:assert/strict'
import { SIMULATION_FACTORS } from '../src/features/simulation/simulation-state.ts'

assert.deepEqual(SIMULATION_FACTORS, [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
])
assert.ok(SIMULATION_FACTORS.every(factor => factor.startsWith('bom.') || factor.startsWith('routing.')))
assert.equal(SIMULATION_FACTORS.some(factor => factor.includes('rate') || factor.includes('workCenter')), false,
  'there are no Work Center rate simulation fields')

console.log('Finalized Simulation factor mapping verification passed')
