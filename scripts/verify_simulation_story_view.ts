import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business'
import { createScenarioFinancialResult, createScenarioStory } from '../src/core/calculations/scenario-story'
import type { SnapshotCost } from '../src/core/types'
import { SimulationStoryGraph } from '../src/features/simulation/SimulationStoryGraph.tsx'
import { SimulationPage } from '../src/features/simulation/SimulationPage.tsx'
import { createRcaCaseRecord, createRcaSimulationHandoffContext } from '../src/state/rca-cases.ts'
import {
  createEmptySimulationState,
  setSimulationEconomicInput,
  setSimulationFactors,
  simulationFactorId,
  startSimulationFrom
} from '../src/features/simulation/simulation-state.ts'
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
  bom: [
    { id: `${id}-bom`, itemCode: 'MAT-1', description: 'Material X', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} },
    { id: `${id}-bom-y`, itemCode: 'MAT-2', description: 'Material Y', consumption: 2, unit: 'PC', price: 3, loss: 0.02, confidence: {} }
  ],
  routing: [
    { id: `${id}-route`, processName: 'Process A', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} },
    { id: `${id}-route-b`, processName: 'Process B', workCenterId: 'WC-1', manning: 2, capacity: 20, yield: 0.95, confidence: {} }
  ]
})
const referenceSnapshot = product('reference', 10, 25)
const currentSnapshot = product('current', 12, 25)
const sources = { reference: referenceSnapshot, current: currentSnapshot, custom: product('custom', 12, 25) }
const simulationBasis = startSimulationFrom('current', sources)
const selectedState = setSimulationFactors(simulationBasis, [
  simulationFactorId('bom', 'current-bom'),
  simulationFactorId('routing', 'current-route')
])
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
for (const label of [
  'Select Material factor Material X',
  'Select Material factor Material Y',
  'Select Process factor Process A',
  'Select Process factor Process B',
  'Material X price SIM value',
  'Material X usage SIM value',
  'Material X loss SIM value',
  'Process A manning SIM value',
  'Process A capacity SIM value',
  'Process A yield SIM value'
]) {
  assert.ok(pageMarkup.includes(`aria-label="${label}"`), `selected record exposes its applicable controls: ${label}`)
}
for (const label of [
  'Material Y price SIM value',
  'Material Y usage SIM value',
  'Material Y loss SIM value',
  'Process B manning SIM value',
  'Process B capacity SIM value',
  'Process B yield SIM value'
]) {
  assert.ok(!pageMarkup.includes(`aria-label="${label}"`), `unselected record has no visible edit control: ${label}`)
}
assert.doesNotMatch(pageMarkup, /BOM · Price|BOM · Usage|BOM · Loss|Routing · Manning|Routing · Capacity|Routing · Yield/)
assert.doesNotMatch(pageMarkup, /Scenario A|Scenario B|Trial/)

let economicOnlyState = createEmptySimulationState()
economicOnlyState = setSimulationEconomicInput(economicOnlyState, 'actionCost', '100000')
economicOnlyState = setSimulationEconomicInput(economicOnlyState, 'evaluationQuantity', '100000')
const economicOnlyMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: economicOnlyState,
  referenceSnapshot,
  currentSnapshot,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
const economicOnlyText = economicOnlyMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
assert.ok(economicOnlyText.includes('Economic Simulation'), 'Economic Simulation is available before Parameter SIM starts')
assert.ok(economicOnlyText.includes('Action Cost') && economicOnlyText.includes('Evaluation Quantity'))
assert.ok(economicOnlyText.includes('Required Saving / pc') && economicOnlyText.includes('1.0000'), 'economic-only page calculates Action Cost divided by Evaluation Quantity')
assert.ok(economicOnlyText.includes('Start SIM From Current'), 'economic-only inputs do not require starting a Parameter SIM')
assert.ok(!economicOnlyText.includes('Economic Margin / pc'), 'economic-only mode does not show combined-mode margin')
assert.doesNotMatch(economicOnlyMarkup, /simulation-result-title|simulation-story-title/, 'economic-only mode does not fabricate Parameter results')
assert.ok(economicOnlyText.indexOf('Start SIM From Reference') < economicOnlyText.indexOf('Start SIM From Current'),
  'standalone Simulation keeps its existing source order')
assert.ok(!economicOnlyText.includes('RCA Case context'), 'standalone Simulation does not require an RCA Case')

const rcaCase = createRcaCaseRecord('handoff-case-1', ['process:Process A'], {
  rootCause: 'Shared cycle-time issue', action: 'Review upstream and downstream processes'
})
const rcaContext = createRcaSimulationHandoffContext(rcaCase, rcaCase)
const rcaStartMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: createEmptySimulationState(),
  referenceSnapshot,
  currentSnapshot,
  rcaContext,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
const rcaStartText = rcaStartMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
assert.ok(rcaStartText.includes('handoff-case-1') && rcaStartText.includes('process:Process A'),
  'RCA Case and Candidate context is carried into Simulation')
assert.ok(rcaStartText.includes('Shared cycle-time issue') && rcaStartText.includes('Review upstream and downstream processes'))
assert.ok(rcaStartText.indexOf('Start SIM From Current') < rcaStartText.indexOf('Start SIM From Reference'),
  'Current is the natural first source on an RCA handoff')
assert.ok(rcaStartText.includes('Start SIM From Custom'), 'RCA handoff leaves Custom available')

const rcaParameterMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: simulationBasis,
  referenceSnapshot,
  currentSnapshot,
  rcaContext,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
for (const label of [
  'Select Material factor Material X',
  'Select Material factor Material Y',
  'Select Process factor Process A',
  'Select Process factor Process B'
]) {
  assert.ok(rcaParameterMarkup.includes(`aria-label="${label}"`), `RCA context leaves this Factor selectable: ${label}`)
}
assert.equal((rcaParameterMarkup.match(/type="checkbox"/g) ?? []).length, 4,
  'RCA Candidates are not a hard scope; all Material and Process records remain available')
assert.doesNotMatch(rcaParameterMarkup, /Material X price SIM value|Process A manning SIM value/,
  'candidate context does not preselect Factors or require identity mapping')
const additionalFactorState = setSimulationFactors(simulationBasis, [
  simulationFactorId('bom', 'current-bom-y'),
  simulationFactorId('routing', 'current-route-b')
])
const additionalFactorMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: additionalFactorState,
  referenceSnapshot,
  currentSnapshot,
  rcaContext,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
assert.ok(additionalFactorMarkup.includes('Material Y price SIM value') && additionalFactorMarkup.includes('Process B manning SIM value'),
  'additional Material and Process Factors remain editable with RCA context present')
assert.ok(!additionalFactorMarkup.includes('Process A manning SIM value'),
  'selecting additional Factors does not force the RCA Candidate into Simulation')

const combinedBasis = startSimulationFrom('current', sources, undefined, economicOnlyState.economicInputs)
assert.equal(combinedBasis.economicInputs.actionCost, '100000', 'starting Parameter SIM preserves independent Economic inputs')
assert.equal(combinedBasis.economicInputs.evaluationQuantity, '100000')
const combinedMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: combinedBasis,
  referenceSnapshot,
  currentSnapshot,
  onStartFrom() {},
  onReset() {},
  onSelectFactors() {},
  onUpdateParameter() {},
  onUpdateEconomicInput() {}
}))
const combinedText = combinedMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
assert.ok(combinedText.includes('Parameter Saving / pc'), 'combined mode adds the Parameter Saving output')
assert.ok(combinedText.includes('Economic Margin / pc') && combinedText.includes('-1.0000'), 'combined mode compares Parameter Saving with Required Saving')

console.log('Simulation story graph verification passed')
