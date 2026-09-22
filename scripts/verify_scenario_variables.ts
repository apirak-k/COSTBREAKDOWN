import assert from 'node:assert/strict'
import {
  scenarioVariableDefinitions,
  simulateWhatIfScenarios
} from '../src/core/calculations'

const keys = scenarioVariableDefinitions.map(definition => definition.key)
assert.equal(new Set(keys).size, keys.length, 'scenario variable keys must be stable and unique')
assert.equal(
  scenarioVariableDefinitions.find(item => item.key === 'grossSaving')?.formula,
  'Active driver cost minus scenario driver cost'
)

const driver = {
  driverKey: 'bom:bom-1',
  sourceType: 'bom' as const,
  sourceId: 'bom-1',
  impact: 'unfavorable' as const,
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
  controllability: 'Controllable' as const,
  actionPlan: ''
}
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
  sourceRef: 'scenario-variable-fixture'
}

const valid = simulateWhatIfScenarios({
  driver,
  bomItem,
  routingStep: null,
  rates: [],
  totalActiveCost: 12,
  scenarios: [{
    letter: 'A',
    label: 'Scenario with extra variable',
    targetValue: '10',
    investment: '',
    lotSize: '5000',
    additionalVariables: [{
      key: 'packaging',
      label: 'Packaging add-on',
      valueType: 'amount',
      unit: 'THB/pc',
      value: 0.2,
      origin: 'override'
    }]
  }]
})[0]

assert.equal(valid?.scenarioValues.find(item => item.key === 'activeTotalCost')?.origin, 'source')
assert.equal(valid?.scenarioValues.find(item => item.key === 'targetValue')?.origin, 'override')
assert.equal(valid?.scenarioValues.find(item => item.key === 'grossSaving')?.origin, 'calculated')
assert.equal(valid?.scenarioValues.find(item => item.key === 'packaging')?.label, 'Packaging add-on')

const invalid = simulateWhatIfScenarios({
  driver,
  bomItem,
  routingStep: null,
  rates: [],
  totalActiveCost: 12,
  scenarios: [{ letter: 'A', label: '', targetValue: '', investment: '', lotSize: '5000' }]
})[0]
assert.equal(invalid?.valid, false)
assert.equal(invalid?.scenarioValues.find(item => item.key === 'targetValue')?.value, null)
assert.equal(invalid?.scenarioValues.find(item => item.key === 'predictedTotal')?.value, null)

console.log('Scenario variable provenance verification passed')
