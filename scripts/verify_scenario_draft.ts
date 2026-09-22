import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { updateScenarioDraft } from '../src/features/rca-simulation/scenario-draft'
import { simulateWhatIfScenarios } from '../src/core/calculations'

const scenarios = [
  { letter: 'A' as const, label: 'Lower price', targetValue: '12', investment: '', lotSize: '5000' },
  { letter: 'B' as const, label: '', targetValue: '', investment: '', lotSize: '5000' }
]
const original = JSON.parse(JSON.stringify(scenarios))
const updated = updateScenarioDraft(scenarios, 0, 'targetValue', '10')

assert.equal(scenarios[0].targetValue, original[0].targetValue, 'draft update must not mutate the previous scenario array')
assert.equal(updated[0].targetValue, '10')
assert.equal(updated[1].targetValue, '')
assert.notEqual(updated, scenarios)

const bomItem = {
  id: 'bom-1',
  lineNo: 1,
  materialCode: 'MAT-1',
  description: 'Material A',
  quantity: 1,
  uom: 'pc',
  consumption: 1,
  basePrice: 10,
  activePrice: 12,
  baseLoss: 0,
  activeLoss: 0,
  sourceRef: 'scenario-fixture'
}
const beforeSimulation = JSON.parse(JSON.stringify(bomItem))
const result = simulateWhatIfScenarios({
  driver: {
    driverKey: 'bom:bom-1',
    sourceType: 'bom',
    sourceId: 'bom-1',
    impact: 'unfavorable',
    id: 1,
    category: 'Direct Material',
    driverName: 'Material A',
    rcaParameter: 'Unit Price Inflation',
    baseParameter: 10,
    activeParameter: 12,
    costGap: 2,
    tieBreakerScore: 2,
    rank: 1,
    pctContribution: 100,
    controllability: 'Controllable',
    actionPlan: ''
  },
  bomItem,
  routingStep: null,
  rates: [],
  totalActiveCost: 12,
  scenarios: [updated[0]]
})

assert.equal(result[0]?.valid, true)
assert.deepEqual(bomItem, beforeSimulation, 'simulation must not mutate its source BOM item')

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
assert.equal(pageSource.includes('updateBOMItem'), false, 'Simulation must not call the official BOM mutation action')
assert.equal(pageSource.includes('updateRoutingStep'), false, 'Simulation must not call the official routing mutation action')

console.log('Scenario draft immutability verification passed')
