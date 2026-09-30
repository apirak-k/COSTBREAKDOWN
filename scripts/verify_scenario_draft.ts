import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculateScenarioCosts } from '../src/core/calculations/scenario-cost'
import type { CostSnapshot } from '../src/core/types'
import {
  createScenarioDrafts,
  prepareScenarioDrafts,
  updateScenarioInputValue,
  updateScenarioLabel
} from '../src/features/rca-simulation/scenario-draft'
import type { ScenarioInputDefinition } from '../src/features/rca-simulation/scenario-inputs'

const inputDefinitions: ScenarioInputDefinition[] = [
  {
    key: 'price', sourceType: 'bom', sourceId: 'bom-1', field: 'price',
    label: 'Material — Price', unit: 'THB/kg', currentValue: 10, displayScale: 1
  },
  {
    key: 'loss', sourceType: 'bom', sourceId: 'bom-1', field: 'loss',
    label: 'Material — Loss', unit: '%', currentValue: 0.1, displayScale: 100
  },
  {
    key: 'consumption', sourceType: 'bom', sourceId: 'bom-1', field: 'consumption',
    label: 'Material — Consumption', unit: 'kg/pc', currentValue: 2, displayScale: 1
  }
]

const originalDrafts = createScenarioDrafts()
const originalSnapshot = JSON.stringify(originalDrafts)
const withPrice = updateScenarioInputValue(originalDrafts, 'A', 'price', '8')
const withValues = updateScenarioInputValue(withPrice, 'A', 'loss', '20')
const withAllValues = updateScenarioInputValue(withValues, 'A', 'consumption', '3')
const labeled = updateScenarioLabel(withAllValues, 'A', 'Lower material cost')
const withScenarioB = updateScenarioInputValue(labeled, 'B', 'price', '7')
const withInvalidC = updateScenarioInputValue(withScenarioB, 'C', 'price', 'not-a-number')

assert.notEqual(withPrice, originalDrafts, 'an edit must return a new draft list')
assert.equal(JSON.stringify(originalDrafts), originalSnapshot, 'an edit must not mutate the previous draft list')
assert.equal(originalDrafts[0]?.inputValues.price, undefined)
assert.equal(labeled[0]?.label, 'Lower material cost')
assert.equal(labeled[1]?.inputValues.price, undefined, 'Scenario A edits must not leak into B')

const prepared = prepareScenarioDrafts(withInvalidC, inputDefinitions)
const draftA = prepared.drafts.find(draft => draft.letter === 'A')
const draftB = prepared.drafts.find(draft => draft.letter === 'B')
const draftC = prepared.drafts.find(draft => draft.letter === 'C')
assert.ok(draftA && draftB && draftC)
assert.equal(draftA.label, 'Lower material cost')
assert.deepEqual(draftA.overrides.bom?.['bom-1'], { price: 8, loss: 0.2, consumption: 3 })
assert.deepEqual(draftB.overrides.bom?.['bom-1'], { price: 7 }, 'Scenario B must contain only its own edits')
assert.equal(draftC.overrides.bom, undefined, 'invalid values must not enter numeric overrides')
assert.deepEqual(prepared.inputWarningsByLetter.A, [])
assert.deepEqual(prepared.inputWarningsByLetter.B, [])
assert.match(prepared.inputWarningsByLetter.C[0] ?? '', /finite number/)

const blankValue = updateScenarioInputValue(withInvalidC, 'B', 'price', '')
assert.equal(blankValue[1]?.inputValues.price, undefined, 'blank input means use the Current value')

const currentSnapshot: CostSnapshot = {
  id: 'scenario-draft-current',
  product: { productCode: 'TEST-001', productDescription: 'Synthetic', uom: 'PC', customer: 'Synthetic', effectiveDate: '2026-09-27' },
  effectiveDate: '2026-09-27',
  sourceRef: 'scenario-draft-fixture',
  status: 'active',
  rates: [{
    id: 'rate-1', workCenterCode: 'WC-01', description: 'Synthetic',
    laborRate: 10, burdenRate: 5, effectiveDate: '2026-09-27', confidence: {}
  }],
  bom: [{
    id: 'bom-1', itemCode: 'MAT-01', description: 'Material',
    consumption: 2, unit: 'kg', price: 10, loss: 0.1, confidence: {}
  }],
  routing: [{
    id: 'routing-1', processName: 'Operation', workCenterId: 'WC-01',
    manning: 1, capacity: 100, yield: 1, confidence: {}
  }]
}
const snapshotBeforeCalculation = JSON.stringify(currentSnapshot)
const results = calculateScenarioCosts(currentSnapshot, prepared.drafts)
const resultA = results.find(result => result.letter === 'A')
const resultB = results.find(result => result.letter === 'B')
const resultC = results.find(result => result.letter === 'C')
assert.ok(resultA && resultB && resultC)
assert.equal(resultA.currentCost.material, 22, 'Current uses its original BOM inputs')
assert.ok(Math.abs((resultA.scenarioCost.material ?? 0) - 28.8) < 1e-9, 'display-percent input converts to a fraction and applies with consumption')
assert.ok(Math.abs((resultB.scenarioCost.material ?? 0) - 15.4) < 1e-9, 'Scenario B recalculates from Current with only its own price')
assert.equal(resultC.scenarioCost.material, resultC.currentCost.material, 'invalid Scenario C input is ignored')
assert.equal(JSON.stringify(currentSnapshot), snapshotBeforeCalculation, 'scenario calculation must not mutate Current')

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
assert.match(pageSource, /state\.scenarioDraftsByCandidate\[selectedCandidate\.candidateKey\]/)
assert.match(pageSource, /calculateScenarioCosts\(currentSnapshot,\s*preparedDrafts\.drafts\)/)
assert.doesNotMatch(pageSource, /simulateWhatIfScenarios/)

console.log('Scenario draft verification passed')
