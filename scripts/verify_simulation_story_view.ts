import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'
import { createScenarioFinancialResult, createScenarioStory } from '../src/core/calculations/scenario-story'
import type { SnapshotCost } from '../src/core/types'
import { SimulationStoryGraph } from '../src/features/simulation/SimulationStoryGraph.tsx'
import { SimulationPage } from '../src/features/simulation/SimulationPage.tsx'
import { setSimulationFactors, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'
import { updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'

function cost(snapshotId: string, material: number, labor: number, burden: number): SnapshotCost {
  return { snapshotId, material, labor, burden, total: material + labor + burden, status: 'complete', warnings: [] }
}

const referenceCost = cost('ref', 10, 2, 3)
const currentCost = cost('current', 12, 1, 3)
const simulationCost = cost('sim', 60, 20, 15)
const story = createScenarioStory(
  createScenarioFinancialResult(referenceCost, calculateScenarioBusinessMetrics({ sellingPrice: 25, sgaPercent: 8 }, referenceCost.total)),
  createScenarioFinancialResult(currentCost, calculateScenarioBusinessMetrics({ sellingPrice: 25, sgaPercent: 10 }, currentCost.total)),
  createScenarioFinancialResult(simulationCost, calculateScenarioBusinessMetrics({ sellingPrice: 100, sgaPercent: 10 }, simulationCost.total))
)
const markup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story }))
const visibleText = markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

assert.match(markup, /Reference → Current → Simulated/)
assert.match(markup, /Reference, Current, and Simulated stacked Standard Cost by MAT, LB, and BD, with Selling Price shown as a line\./)
assert.match(markup, /Gap 1/)
assert.match(markup, /Gap 2/)
for (const value of ['10.0000', '2.0000', '3.0000', '15.0000', '25.0000', '12.0000', '16.0000', '95.0000', '100.0000', '-5.0000']) {
  assert.ok(visibleText.includes(value), `story graph must expose ${value}`)
}
assert.ok(visibleText.includes('Operating loss'), 'negative OP remains visible as an operating loss')
assert.doesNotMatch(markup, /Scenario A|Scenario B|Choose the scenario|Trial/)

const product = (id: string, price: number, sellingPrice: number) => ({
  id,
  product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '', sellingPrice, sgaPercent: 10 },
  effectiveDate: '', sourceRef: id, status: 'draft' as const,
  rates: [{ id: `${id}-rate`, workCenterCode: 'WC-1', description: 'Process', laborRate: 10, burdenRate: 5, effectiveDate: '', confidence: {} }],
  bom: [{ id: `${id}-bom`, itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }],
  routing: [{ id: `${id}-route`, processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
})
const referenceSnapshot = product('reference', 10, 25)
const currentSnapshot = product('current', 12, 25)
const sources = { reference: referenceSnapshot, current: currentSnapshot, custom: product('custom', 12, 25) }
const simulationBasis = startSimulationFrom('current', sources)
const selectedState = setSimulationFactors(simulationBasis, ['bom.price'])
const simulationState = updateSimulationParameter(selectedState, currentSnapshot, 'current-bom', 'bom.price', 8)
const pageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: simulationState,
  referenceSnapshot,
  currentSnapshot,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
const pageText = pageMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
assert.ok(pageText.includes('Reference → Current → Simulated'), 'the active Simulation page renders the three-state story')
assert.ok(pageText.includes('Gap 1') && pageText.includes('Gap 2'), 'the story uses both adjacent finalized gaps')
assert.ok(pageText.includes('Parameter Saving / pc'))
assert.ok(pageText.includes('Reference') && pageText.includes('Current') && pageText.includes('Simulated'))
assert.doesNotMatch(pageMarkup, /Scenario A|Scenario B|Trial/)

console.log('Simulation story graph verification passed')
