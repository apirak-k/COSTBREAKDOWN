import assert from 'node:assert/strict'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'

const profit = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, 95)
assert.equal(profit.sgaAmountPerPiece, 15, 'SG&A amount is Selling Price × SG&A percent')
assert.equal(profit.operatingProfitPerPiece, 40, 'OP subtracts Standard Cost and SG&A from Selling Price')

const loss = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 10 }, 95)
assert.equal(loss.operatingProfitPerPiece, -5, 'negative OP remains valid and visible')

const zero = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 5 }, 95)
assert.equal(zero.operatingProfitPerPiece, 0, 'zero OP remains a numeric zero')

const zeroSellingPrice = calculateScenarioBusinessMetrics({ sellingPrice: 0, sgaPercent: 0 }, 20)
assert.equal(zeroSellingPrice.sellingPrice, 0, 'zero Selling Price is a valid business-domain boundary')
assert.equal(zeroSellingPrice.sgaAmountPerPiece, 0, 'zero SG&A percent is a valid business-domain boundary')
assert.equal(zeroSellingPrice.operatingProfitPerPiece, -20, 'zero Selling Price still produces a valid negative OP result')

const missingPrice = calculateScenarioBusinessMetrics({ sellingPrice: null, sgaPercent: 10 }, 95)
assert.equal(missingPrice.sgaAmountPerPiece, null)
assert.equal(missingPrice.operatingProfitPerPiece, null)

const missingStandardCost = calculateScenarioBusinessMetrics({ sellingPrice: 150, sgaPercent: 10 }, null)
assert.equal(missingStandardCost.sgaAmountPerPiece, 15, 'SG&A is independent of Standard Cost availability')
assert.equal(missingStandardCost.operatingProfitPerPiece, null)

const overflow = calculateScenarioBusinessMetrics({ sellingPrice: Number.MAX_VALUE, sgaPercent: 100 }, Number.MAX_VALUE)
assert.equal(overflow.sgaAmountPerPiece, Number.MAX_VALUE, '100% SG&A remains inside the numeric domain')
assert.equal(overflow.operatingProfitPerPiece, -Number.MAX_VALUE, 'finite negative OP remains valid at the numeric boundary')

const highSga = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 100 }, 20)
assert.equal(highSga.sgaAmountPerPiece, 100, 'the 100% SG&A boundary remains valid')
assert.equal(highSga.operatingProfitPerPiece, -20)
const overSga = calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 101 }, 20)
assert.equal(overSga.sgaPercent, null, 'SG&A above 100% is rejected by the shared domain')
assert.equal(overSga.sgaAmountPerPiece, null)
assert.equal(overSga.operatingProfitPerPiece, null)

for (const invalidInputs of [
  { sellingPrice: -1, sgaPercent: 10 },
  { sellingPrice: 100, sgaPercent: -1 }
]) {
  const invalid = calculateScenarioBusinessMetrics(invalidInputs, 20)
  assert.equal(invalid.sellingPrice, invalidInputs.sellingPrice < 0 ? null : 100)
  assert.equal(invalid.sgaPercent, invalidInputs.sgaPercent < 0 ? null : 10)
  assert.equal(invalid.sgaAmountPerPiece, null)
  assert.equal(invalid.operatingProfitPerPiece, null)
}

console.log('Scenario business metrics verification passed')
