import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CostSnapshot, SnapshotCost } from '../src/core/types'
import { EconomicSimulationPanel } from '../src/features/simulation/EconomicSimulationPanel'
import {
  calculateEconomicSimulation,
  createEconomicSimulationDraft,
  updateEconomicSimulationDraft
} from '../src/features/simulation/simulation-economics.ts'

const currentSnapshot = {
  product: { sellingPrice: 150, sgaPercent: 10 }
} as CostSnapshot
const simulationCost: SnapshotCost = {
  snapshotId: 'sim', material: 95, labor: 0, burden: 0, total: 95, status: 'complete', warnings: []
}
const draft = updateEconomicSimulationDraft(
  updateEconomicSimulationDraft(createEconomicSimulationDraft(), 'actionCost', '100000'),
  'evaluationQuantity',
  '100000'
)

const combined = calculateEconomicSimulation(currentSnapshot, simulationCost, 1.5, draft)
assert.equal(combined.requiredSavingPerPiece, 1)
assert.equal(combined.parameterSavingPerPiece, 1.5)
assert.equal(combined.economicMarginPerPiece, 0.5)
assert.equal(combined.business.sellingPrice, 150)
assert.equal(combined.business.sgaPercent, 10)
assert.equal(combined.business.sgaAmountPerPiece, 15)
assert.equal(combined.business.operatingProfitPerPiece, 40)
assert.equal(combined.simulationStandardCost, 95, 'Action Cost never changes Standard Cost')

const atBreakEven = calculateEconomicSimulation(currentSnapshot, simulationCost, 1, draft)
assert.equal(atBreakEven.economicMarginPerPiece, 0, 'exact break-even remains a valid numeric zero')
const zeroMarginMarkup = renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
  result: atBreakEven,
  draft,
  hasParameterSimulation: true,
  onUpdate() {}
}))
assert.match(zeroMarginMarkup, /0\.0000 <span[^>]*>THB\/pc<\/span>/,
  'the Economic Simulation panel visibly displays a zero Economic Margin')

const belowBreakEven = calculateEconomicSimulation(currentSnapshot, simulationCost, -0.5, draft)
assert.equal(belowBreakEven.economicMarginPerPiece, -1.5, 'negative margins remain numeric and visible')

const economicOnly = calculateEconomicSimulation(currentSnapshot, null, null, draft)
assert.equal(economicOnly.requiredSavingPerPiece, 1, 'economic-only mode does not require parameter edits')
assert.equal(economicOnly.economicMarginPerPiece, null, 'combined margin needs an available Parameter Saving')
assert.equal(economicOnly.business.sgaAmountPerPiece, 15)
assert.equal(economicOnly.business.operatingProfitPerPiece, null, 'OP remains unavailable without a SIM Standard Cost')

const overridden = updateEconomicSimulationDraft(
  updateEconomicSimulationDraft(draft, 'sellingPriceOverride', '100'),
  'sgaPercentOverride',
  '10'
)
const operatingLoss = calculateEconomicSimulation(currentSnapshot, simulationCost, null, overridden)
assert.equal(operatingLoss.business.operatingProfitPerPiece, -5, 'negative OP is a valid result')

const missingActionCost = updateEconomicSimulationDraft(draft, 'actionCost', '')
const missing = calculateEconomicSimulation(currentSnapshot, simulationCost, 1.5, missingActionCost)
assert.equal(missing.requiredSavingPerPiece, null)
assert.equal(missing.economicMarginPerPiece, null)

for (const quantity of ['0', '-1']) {
  const invalidQuantity = updateEconomicSimulationDraft(draft, 'evaluationQuantity', quantity)
  const result = calculateEconomicSimulation(currentSnapshot, simulationCost, 1.5, invalidQuantity)
  assert.equal(result.requiredSavingPerPiece, null)
  assert.equal(result.economicMarginPerPiece, null)
  assert.ok(result.warnings.some(warning => warning.includes('Evaluation Quantity')))
}

const invalidActionCost = updateEconomicSimulationDraft(draft, 'actionCost', 'Infinity')
const invalidAction = calculateEconomicSimulation(currentSnapshot, simulationCost, 1.5, invalidActionCost)
assert.equal(invalidAction.requiredSavingPerPiece, null)
assert.ok(invalidAction.warnings.some(warning => warning.includes('Action Cost') && warning.includes('finite')))

const invalidOverride = updateEconomicSimulationDraft(draft, 'sellingPriceOverride', 'Infinity')
const invalidCommercial = calculateEconomicSimulation(currentSnapshot, simulationCost, 1.5, invalidOverride)
assert.equal(invalidCommercial.business.sellingPrice, null, 'invalid override does not silently fall back to Current')
assert.equal(invalidCommercial.business.sgaPercent, 10, 'blank SG&A override uses Current')
assert.ok(invalidCommercial.warnings.some(warning => warning.includes('Selling Price')))

const overflow = updateEconomicSimulationDraft(
  updateEconomicSimulationDraft(draft, 'actionCost', '1e308'),
  'evaluationQuantity',
  '0.000001'
)
assert.equal(calculateEconomicSimulation(currentSnapshot, simulationCost, 1, overflow).requiredSavingPerPiece, null)

const invalidStandardCost = calculateEconomicSimulation(
  currentSnapshot,
  { ...simulationCost, total: Number.POSITIVE_INFINITY },
  1,
  draft
)
assert.equal(invalidStandardCost.simulationStandardCost, null)
assert.ok(invalidStandardCost.warnings.some(warning => warning.includes('SIM Standard Cost') && warning.includes('finite')))

const updatedDraft = updateEconomicSimulationDraft(draft, 'actionCost', '200000')
assert.equal(draft.actionCost, '100000', 'draft edits do not mutate the existing draft')
assert.equal(updatedDraft.actionCost, '200000')

console.log('Independent Simulation economics verification passed')
