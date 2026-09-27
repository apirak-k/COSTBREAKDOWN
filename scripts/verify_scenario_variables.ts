import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculateScenarioEconomics } from '../src/core/calculations/scenario-economics'
import {
  createScenarioDrafts,
  prepareScenarioEconomicsInputs,
  updateScenarioEconomicsInput
} from '../src/features/rca-simulation/scenario-draft'

const economics = calculateScenarioEconomics(100, 95, {
  fixedInvestment: 20_000,
  variableAddedCostPerPiece: 0.5,
  evaluationVolume: 10_000
})
assert.equal(economics.grossSavingPerPiece, 5)
assert.equal(economics.fixedCostEquivalentPerPiece, 2)
assert.equal(economics.netBenefitPerPiece, 2.5)
assert.equal(economics.totalGrossSaving, 50_000)
assert.equal(economics.totalVariableAddedCost, 5_000)
assert.equal(economics.totalNetBenefit, 25_000)

const incomplete = calculateScenarioEconomics(null, 95, {
  fixedInvestment: null,
  variableAddedCostPerPiece: null,
  evaluationVolume: null
})
assert.equal(incomplete.grossSavingPerPiece, null, 'missing Standard Cost must not be treated as zero')
assert.equal(incomplete.netBenefitPerPiece, null, 'missing economics assumptions must stay unresolved')

const zeroVolume = calculateScenarioEconomics(100, 95, {
  fixedInvestment: 20_000,
  variableAddedCostPerPiece: 0.5,
  evaluationVolume: 0
})
assert.equal(zeroVolume.fixedCostEquivalentPerPiece, null)
assert.ok(zeroVolume.warnings.some(warning => warning.includes('greater than zero')))

const drafts = createScenarioDrafts()
const changed = updateScenarioEconomicsInput(drafts, 'A', 'fixedInvestment', '20000')
const changedAgain = updateScenarioEconomicsInput(changed, 'A', 'variableAddedCostPerPiece', '0.5')
const withVolume = updateScenarioEconomicsInput(changedAgain, 'A', 'evaluationVolume', '10000')
const prepared = prepareScenarioEconomicsInputs(withVolume)
assert.deepEqual(prepared.inputsByLetter.A, {
  fixedInvestment: 20_000,
  variableAddedCostPerPiece: 0.5,
  evaluationVolume: 10_000
})
assert.deepEqual(prepared.inputsByLetter.B, {
  fixedInvestment: null,
  variableAddedCostPerPiece: null,
  evaluationVolume: null
}, 'economics assumptions must remain isolated by scenario')
assert.deepEqual(prepared.warningsByLetter.A, [])

const invalidDrafts = updateScenarioEconomicsInput(withVolume, 'C', 'variableAddedCostPerPiece', 'Infinity')
const invalidPrepared = prepareScenarioEconomicsInputs(invalidDrafts)
assert.equal(invalidPrepared.inputsByLetter.C.variableAddedCostPerPiece, null)
assert.match(invalidPrepared.warningsByLetter.C[0] ?? '', /finite number/)

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
const cardSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/ScenarioCard.tsx'), 'utf8')
const standardCostSource = readFileSync(resolve(process.cwd(), 'src/core/calculations/scenario-cost.ts'), 'utf8')
assert.match(pageSource, /calculateScenarioEconomics/)
assert.ok([
  'grossSavingPerPiece',
  'fixedCostEquivalentPerPiece',
  'netBenefitPerPiece',
  'totalGrossSaving',
  'totalVariableAddedCost',
  'totalNetBenefit'
].every(key => cardSource.includes(key)), 'the UI must display every metric returned by the economics calculation')
assert.doesNotMatch(standardCostSource, /fixedInvestment|variableAddedCostPerPiece|evaluationVolume/)

console.log('Scenario economics verification passed')
