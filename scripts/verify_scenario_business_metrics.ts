import assert from 'node:assert/strict'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'
import {
  createScenarioDrafts,
  prepareScenarioBusinessInputs,
  updateScenarioBusinessInput
} from '../src/features/rca-simulation/scenario-draft'

const profit = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, 95)
assert.equal(profit.sellingPrice, 150)
assert.equal(profit.sgaPercent, 10)
assert.equal(profit.sgaAmountPerPiece, 15)
assert.equal(profit.operatingProfitPerPiece, 40)

const loss = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 10 }, 95)
assert.equal(loss.sgaAmountPerPiece, 10)
assert.equal(loss.operatingProfitPerPiece, -5, 'negative OP remains visible as a loss')

const zero = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 5 }, 95)
assert.equal(zero.operatingProfitPerPiece, 0, 'zero OP remains a numeric zero')

const missing = calculateScenarioBusinessMetrics({ sellingPrice: null, sgaPercent: 10 }, 95)
assert.equal(missing.sgaAmountPerPiece, null)
assert.equal(missing.operatingProfitPerPiece, null)
assert.ok(missing.warnings.some(warning => warning.includes('Selling Price')))

const noStandardCost = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, null)
assert.equal(noStandardCost.sgaAmountPerPiece, 15, 'SG&A is calculable independently of Standard Cost')
assert.equal(noStandardCost.operatingProfitPerPiece, null)

const current = { sellingPrice: 150, sgaPercent: 10 }
const drafts = createScenarioDrafts()
assert.deepEqual(prepareScenarioBusinessInputs(drafts, current).inputsByLetter.A, current)

const changedPrice = updateScenarioBusinessInput(drafts, 'A', 'sellingPrice', '120')
const changedSga = updateScenarioBusinessInput(changedPrice, 'A', 'sgaPercent', '8')
const preparedOverride = prepareScenarioBusinessInputs(changedSga, current)
assert.deepEqual(preparedOverride.inputsByLetter.A, { sellingPrice: 120, sgaPercent: 8 })
assert.deepEqual(preparedOverride.inputsByLetter.B, current, 'scenario business inputs must remain independent')

const clearedPrice = updateScenarioBusinessInput(changedSga, 'A', 'sellingPrice', '')
const clearedBoth = updateScenarioBusinessInput(clearedPrice, 'A', 'sgaPercent', '')
assert.deepEqual(
  prepareScenarioBusinessInputs(clearedBoth, current).inputsByLetter.A,
  current,
  'clearing an override returns to Current'
)

const invalidDrafts = updateScenarioBusinessInput(drafts, 'A', 'sellingPrice', 'Infinity')
const invalidPrepared = prepareScenarioBusinessInputs(invalidDrafts, current)
assert.equal(invalidPrepared.inputsByLetter.A.sellingPrice, null, 'invalid override must not silently fall back to Current')
assert.equal(invalidPrepared.inputsByLetter.A.sgaPercent, 10)
assert.match(invalidPrepared.warningsByLetter.A[0] ?? '', /finite number/)

console.log('Scenario business metrics verification passed')
