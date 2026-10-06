import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculateScenarioEconomics } from '../src/core/calculations/scenario-economics'
import type { SnapshotCost } from '../src/core/types'
import {
  createScenarioDrafts,
  prepareScenarioEconomicsInputs,
  updateScenarioEconomicsInput
} from '../src/features/rca-simulation/scenario-draft'

function cost(material: number, labor: number, burden: number): SnapshotCost {
  return {
    snapshotId: 'test', material, labor, burden,
    total: material + labor + burden,
    status: 'complete', warnings: []
  }
}

const currentCost = cost(50, 30, 20)
const engineScenarioCost = cost(40, 30, 25)
const economics = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: 20_000,
  fixedInvestmentCategory: 'burden',
  variableAddedCostPerPiece: 0.5,
  variableAddedCostCategory: 'material',
  evaluationVolume: 10_000
})
assert.equal(economics.fixedCostEquivalentPerPiece, 2)
assert.equal(economics.variableAddedCostPerPiece, 0.5)
assert.equal(economics.scenarioCost.material, 40.5)
assert.equal(economics.scenarioCost.labor, 30)
assert.equal(economics.scenarioCost.burden, 27)
assert.equal(economics.scenarioCost.total, 97.5, 'categorized economics must be included exactly once in Standard Cost')
assert.equal(economics.grossImprovementPerPiece, 2.5)
assert.equal(economics.totalImprovement, 25_000, 'Total Improvement uses the already-composed Standard Cost without a second economics subtraction')

const fixedOnly = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: 50_000,
  fixedInvestmentCategory: 'burden',
  variableAddedCostPerPiece: null,
  variableAddedCostCategory: null,
  evaluationVolume: 10_000
})
assert.equal(fixedOnly.scenarioCost.burden, 30, 'fixed-only economics must be categorized')
assert.equal(fixedOnly.scenarioCost.total, 100)
assert.equal(fixedOnly.totalImprovement, 0)

const variableOnly = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: null,
  fixedInvestmentCategory: null,
  variableAddedCostPerPiece: 1.2,
  variableAddedCostCategory: 'labor',
  evaluationVolume: null
})
assert.equal(variableOnly.scenarioCost.labor, 31.2, 'variable-only economics must not require fixed investment or evaluation quantity')
assert.equal(variableOnly.scenarioCost.total, 96.2)
assert.ok(Math.abs((variableOnly.grossImprovementPerPiece ?? 0) - 3.8) < 1e-9)
assert.equal(variableOnly.totalImprovement, null, 'total improvement requires an evaluation quantity')

const missingCategory = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: 1_000,
  fixedInvestmentCategory: null,
  variableAddedCostPerPiece: null,
  variableAddedCostCategory: null,
  evaluationVolume: 100
})
assert.equal(missingCategory.scenarioCost.total, null, 'uncategorized economics must not yield a composed Standard Cost')
assert.equal(missingCategory.scenarioCost.status, 'missing')
assert.ok(missingCategory.warnings.some(warning => warning.includes('category')))

const invalidQuantity = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: 20_000,
  fixedInvestmentCategory: 'burden',
  variableAddedCostPerPiece: 0,
  variableAddedCostCategory: null,
  evaluationVolume: 0
})
assert.equal(invalidQuantity.fixedCostEquivalentPerPiece, null)
assert.equal(invalidQuantity.scenarioCost.total, null, 'fixed investment must not be fabricated when its equivalent is unavailable')
assert.ok(invalidQuantity.warnings.some(warning => warning.includes('greater than zero')))

const zeroFixed = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: 0,
  fixedInvestmentCategory: null,
  variableAddedCostPerPiece: 1.2,
  variableAddedCostCategory: 'labor',
  evaluationVolume: null
})
assert.equal(zeroFixed.fixedCostEquivalentPerPiece, 0, 'explicit zero fixed investment is valid without division')
assert.equal(zeroFixed.scenarioCost.total, 96.2)

const zeroEvaluationQuantity = calculateScenarioEconomics(currentCost, engineScenarioCost, {
  fixedInvestment: null,
  fixedInvestmentCategory: null,
  variableAddedCostPerPiece: null,
  variableAddedCostCategory: null,
  evaluationVolume: 0
})
assert.equal(zeroEvaluationQuantity.totalImprovement, 0, 'zero evaluation quantity remains a numeric zero when no fixed conversion is required')

const incomplete = calculateScenarioEconomics(
  { ...currentCost, total: null, status: 'missing' },
  engineScenarioCost,
  {
    fixedInvestment: null,
    fixedInvestmentCategory: null,
    variableAddedCostPerPiece: null,
    variableAddedCostCategory: null,
    evaluationVolume: null
  }
)
assert.equal(incomplete.grossImprovementPerPiece, null, 'missing Standard Cost must not be treated as zero')
assert.equal(incomplete.totalImprovement, null)

const drafts = createScenarioDrafts()
const changed = updateScenarioEconomicsInput(drafts, 'A', 'fixedInvestment', '20000')
const withFixedCategory = updateScenarioEconomicsInput(changed, 'A', 'fixedInvestmentCategory', 'burden')
const changedAgain = updateScenarioEconomicsInput(withFixedCategory, 'A', 'variableAddedCostPerPiece', '0.5')
const withVariableCategory = updateScenarioEconomicsInput(changedAgain, 'A', 'variableAddedCostCategory', 'material')
const withQuantity = updateScenarioEconomicsInput(withVariableCategory, 'A', 'evaluationVolume', '10000')
const prepared = prepareScenarioEconomicsInputs(withQuantity)
assert.deepEqual(prepared.inputsByLetter.A, {
  fixedInvestment: 20_000,
  fixedInvestmentCategory: 'burden',
  variableAddedCostPerPiece: 0.5,
  variableAddedCostCategory: 'material',
  evaluationVolume: 10_000
})
assert.deepEqual(prepared.inputsByLetter.B, {
  fixedInvestment: null,
  fixedInvestmentCategory: null,
  variableAddedCostPerPiece: null,
  variableAddedCostCategory: null,
  evaluationVolume: null
}, 'economics assumptions must remain isolated by scenario')
assert.deepEqual(prepared.warningsByLetter.A, [])

const invalidDrafts = updateScenarioEconomicsInput(withQuantity, 'B', 'variableAddedCostPerPiece', 'Infinity')
const invalidPrepared = prepareScenarioEconomicsInputs(invalidDrafts)
assert.equal(invalidPrepared.inputsByLetter.B.variableAddedCostPerPiece, null)
assert.match(invalidPrepared.warningsByLetter.B[0] ?? '', /finite number/)
const invalidScenarioEconomics = calculateScenarioEconomics(
  currentCost,
  engineScenarioCost,
  invalidPrepared.inputsByLetter.B,
  new Set(invalidPrepared.invalidFieldsByLetter.B)
)
assert.equal(invalidScenarioEconomics.scenarioCost.total, null, 'invalid economics input must not silently fall back to engine-only cost')

const invalidCategoryDraft = updateScenarioEconomicsInput(withQuantity, 'B', 'variableAddedCostCategory', 'other')
const invalidCategoryPrepared = prepareScenarioEconomicsInputs(invalidCategoryDraft)
assert.equal(invalidCategoryPrepared.inputsByLetter.B.variableAddedCostCategory, null)
assert.match(invalidCategoryPrepared.warningsByLetter.B[0] ?? '', /category/)

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
const cardSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/ScenarioCard.tsx'), 'utf8')
const standardCostSource = readFileSync(resolve(process.cwd(), 'src/core/calculations/scenario-cost.ts'), 'utf8')
assert.match(pageSource, /calculateScenarioEconomics/)
assert.ok([
  'grossImprovementPerPiece',
  'fixedCostEquivalentPerPiece',
  'totalImprovement'
].every(key => cardSource.includes(key)), 'the UI must display finalized economics results')
assert.match(cardSource, /Do not repeat costs already represented by BOM, Routing, or Work Center rate changes/)
assert.doesNotMatch(standardCostSource, /fixedInvestment|variableAddedCostPerPiece|evaluationVolume/)

console.log('Scenario economics verification passed')
