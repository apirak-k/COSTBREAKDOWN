import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createScenarioDrafts, updateScenarioDraft } from '../src/features/rca-simulation/scenario-draft'

const draftsByDriver = {
  'bom:bom-1': updateScenarioDraft(createScenarioDrafts(), 0, 'targetValue', '10'),
  'routing:rt-1': updateScenarioDraft(createScenarioDrafts(), 0, 'targetValue', '80')
}

assert.equal(draftsByDriver['bom:bom-1'][0].targetValue, '10')
assert.equal(draftsByDriver['routing:rt-1'][0].targetValue, '80')
assert.equal(draftsByDriver['bom:bom-1'][1].targetValue, '')

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
assert.equal(pageSource.includes('first controllable'), false, 'Simulation must not silently choose the first controllable driver')
assert.equal(pageSource.includes('selectedDriverKeys'), true, 'Simulation must consume the persisted Ranking selection')
assert.equal(pageSource.includes('scenarioDraftsByDriver'), true, 'Simulation must retain drafts per selected driver')

console.log('Simulation context verification passed')
