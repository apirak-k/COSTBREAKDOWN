import assert from 'node:assert/strict'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'

const profit = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, 95)
assert.equal(profit.sgaAmountPerPiece, 15, 'SG&A amount is Selling Price × SG&A percent')
assert.equal(profit.operatingProfitPerPiece, 40, 'OP subtracts Standard Cost and SG&A from Selling Price')

const loss = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 10 }, 95)
assert.equal(loss.operatingProfitPerPiece, -5, 'negative OP remains valid and visible')

const zero = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 5 }, 95)
assert.equal(zero.operatingProfitPerPiece, 0, 'zero OP remains a numeric zero')

const missingPrice = calculateScenarioBusinessMetrics({ sellingPrice: null, sgaPercent: 10 }, 95)
assert.equal(missingPrice.sgaAmountPerPiece, null)
assert.equal(missingPrice.operatingProfitPerPiece, null)

const missingStandardCost = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, null)
assert.equal(missingStandardCost.sgaAmountPerPiece, 15, 'SG&A is independent of Standard Cost availability')
assert.equal(missingStandardCost.operatingProfitPerPiece, null)

const overflow = calculateScenarioBusinessMetrics({ sellingPrice: Number.MAX_VALUE, sgaPercent: 200 }, 1)
assert.equal(overflow.sgaAmountPerPiece, null, 'non-finite formula results stay unavailable')
assert.equal(overflow.operatingProfitPerPiece, null)

console.log('Scenario business metrics verification passed')
