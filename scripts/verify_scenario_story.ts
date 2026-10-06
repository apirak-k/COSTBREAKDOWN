import assert from 'node:assert/strict'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'
import {
  createScenarioFinancialResult,
  createScenarioStory
} from '../src/core/calculations/scenario-story'
import type { SnapshotCost } from '../src/core/types'

function cost(material: number, labor: number, burden: number): SnapshotCost {
  return {
    snapshotId: 'test', material, labor, burden,
    total: material + labor + burden,
    status: 'complete', warnings: []
  }
}

const referenceCost = cost(10, 2, 3)
const currentCost = cost(12, 1, 3)
const simulatedCost = cost(11, 1, 2)
const reference = createScenarioFinancialResult(
  referenceCost,
  calculateScenarioBusinessMetrics({ sellingPrice: 25, sgaPercent: 8 }, referenceCost.total)
)
const current = createScenarioFinancialResult(
  currentCost,
  calculateScenarioBusinessMetrics({ sellingPrice: 25, sgaPercent: 10 }, currentCost.total)
)
const simulated = createScenarioFinancialResult(
  simulatedCost,
  calculateScenarioBusinessMetrics({ sellingPrice: 24, sgaPercent: 8 }, simulatedCost.total)
)

assert.deepEqual(Object.keys(reference), [
  'material', 'labor', 'burden', 'standardCost', 'sgaAmountPerPiece', 'operatingProfitPerPiece', 'sellingPrice'
])
const story = createScenarioStory(reference, current, simulated)
assert.deepEqual(Object.keys(story), ['reference', 'current', 'simulated', 'gap1', 'gap2'], 'the final story contains exactly two adjacent gaps')
assert.deepEqual(story.gap1, {
  material: 2, labor: -1, burden: 0, standardCost: 1,
  sgaAmountPerPiece: 0.5, operatingProfitPerPiece: -1.5, sellingPrice: 0
})
assert.equal(story.gap2.material, -1)
assert.equal(story.gap2.labor, 0)
assert.equal(story.gap2.burden, -1)
assert.equal(story.gap2.standardCost, -2)
assert.ok(Math.abs((story.gap2.sgaAmountPerPiece ?? 0) + 0.58) < 1e-9)
assert.ok(Math.abs((story.gap2.operatingProfitPerPiece ?? 0) - 1.58) < 1e-9)
assert.equal(story.gap2.sellingPrice, -1)
assert.ok(story.simulated.operatingProfitPerPiece > 0)
assert.equal(story.simulated.standardCost, story.simulated.material + story.simulated.labor + story.simulated.burden)

const unavailableStory = createScenarioStory(reference, current, { ...simulated, standardCost: null })
assert.equal(unavailableStory.gap2.standardCost, null, 'missing values remain unavailable in story gaps')

console.log('Scenario story verification passed')
