import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { stepNumericValue } from '../src/shared/ui/numeric-input-rules.ts'
import type { CostSnapshot, SnapshotCost } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

let panelModule: any
let economicsModule: any
let numericInputModule: any
try {
  ;[panelModule, economicsModule, numericInputModule] = await Promise.all([
    vite.ssrLoadModule('/src/features/simulation/EconomicSimulationPanel.tsx'),
    vite.ssrLoadModule('/src/features/simulation/simulation-economics.ts'),
    vite.ssrLoadModule('/src/shared/ui/NumericInput.tsx')
  ])
} finally {
  await vite.close()
}

const { EconomicBreakEvenGraphPanel, EconomicSimulationPanel } = panelModule
const { NumericInput } = numericInputModule
const { calculateEconomicSimulation, createEconomicSimulationDraft, updateEconomicSimulationDraft } = economicsModule
const assertClose = (actual: number | null, expected: number, label: string) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-12,
    `${label}: expected ${expected}, received ${String(actual)}`)
}
const currentSnapshot = { product: { sellingPrice: 250, sgaPercent: 8, uom: 'PC' } } as CostSnapshot
const simulationCost: SnapshotCost = {
  snapshotId: 'sim', material: 94, labor: 0, burden: 0, total: 94, status: 'complete', warnings: []
}
const withInputs = (fields: Record<string, string>) => Object.entries(fields).reduce(
  (draft, [field, value]) => updateEconomicSimulationDraft(draft, field as keyof typeof draft, value),
  createEconomicSimulationDraft()
)
const renderPanel = (result: ReturnType<typeof calculateEconomicSimulation>, draft = createEconomicSimulationDraft(currentSnapshot)) => [
  renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
    result,
    draft,
    afterSnapshot: currentSnapshot,
    unit: 'PC',
    onUpdate() {},
    onBeginEdit() {},
    onCommitEdit() {}
  })),
  renderToStaticMarkup(React.createElement(EconomicBreakEvenGraphPanel, {
    result,
    unit: 'PC',
    onBatchSizeChange() {},
    onBeginEdit() {},
    onCommitEdit() {}
  }))
].join('')

const worked = withInputs({ fixedActionCost: '10000', batchSize: '5000', variableActionCostPerPiece: '2' })
const baseResult = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, worked)
assert.equal(baseResult.fixedCostPerPiece, 2)
assert.equal(baseResult.requiredSavingPerPiece, 4)
assert.equal(baseResult.parameterSavingPerPiece, 6)
assert.equal(baseResult.economicMarginPerPiece, 2)
assert.equal(baseResult.preciseBreakEvenQuantity, 2500)
assert.equal(baseResult.breakEvenQuantity, 2500)
assert.equal(baseResult.breakEvenNotAchievable, false)

const preciseEconomicDraft = withInputs({
  fixedActionCost: '100.123456789',
  batchSize: '10',
  variableActionCostPerPiece: '2.345678901',
  sellingPriceOverride: '100.123456789',
  sgaPercentOverride: '8.123456789'
})
assert.equal(preciseEconomicDraft.fixedActionCost, '100.123456789', 'Economic draft retains the complete monetary input')
assert.equal(preciseEconomicDraft.variableActionCostPerPiece, '2.345678901', 'Variable Cost accepts high precision')
assert.equal(preciseEconomicDraft.sellingPriceOverride, '100.123456789', 'Business Selling Price accepts high precision')
assert.equal(preciseEconomicDraft.sgaPercentOverride, '8.123456789', 'Business SG&A accepts high precision within its domain')
const preciseEconomicResult = calculateEconomicSimulation(currentSnapshot, simulationCost, 6.123456789, preciseEconomicDraft)
assertClose(preciseEconomicResult.fixedCostPerPiece, 10.0123456789, 'fixed cost per piece uses full-precision Fixed Action Cost')
assertClose(preciseEconomicResult.requiredSavingPerPiece, 12.3580245799,
  'Required Saving uses the complete Fixed and Variable Cost inputs')
assert.equal(preciseEconomicResult.parameterSavingPerPiece, 6.123456789, 'Parameter Saving is not rounded to display precision')
assert.equal(preciseEconomicResult.business.sellingPrice, 100.123456789, 'Business calculation uses full-precision Selling Price')
assert.equal(preciseEconomicResult.business.sgaPercent, 8.123456789, 'Business calculation uses full-precision SG&A percent')

const smallerBatch = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, { ...worked, batchSize: '2000' })
assert.equal(smallerBatch.requiredSavingPerPiece, 7)
assert.equal(smallerBatch.economicMarginPerPiece, -1)
assert.equal(smallerBatch.breakEvenQuantity, 2500, 'Batch Size does not alter Break-even Quantity')
assert.equal(smallerBatch.parameterSavingPerPiece, 6)

const higherFixedCost = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, { ...worked, fixedActionCost: '20000' })
assert.equal(higherFixedCost.breakEvenQuantity, 5000, 'Fixed Action Cost changes Break-even Quantity')
const higherVariableCost = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, {
  ...worked, fixedActionCost: '20000', variableActionCostPerPiece: '3'
})
assert.equal(higherVariableCost.preciseBreakEvenQuantity, 20000 / 3)
assert.equal(higherVariableCost.breakEvenQuantity, 6667, 'fractional production threshold rounds up')
const higherSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, 10, {
  ...worked, fixedActionCost: '20000', variableActionCostPerPiece: '3'
})
assert.equal(higherSaving.preciseBreakEvenQuantity, 20000 / 7)
assert.equal(higherSaving.breakEvenQuantity, 2858, 'Parameter Saving changes Break-even Quantity')

const noSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, 2, worked)
assert.equal(noSaving.breakEvenQuantity, null)
assert.equal(noSaving.preciseBreakEvenQuantity, null)
assert.equal(noSaving.breakEvenNotAchievable, true, 'non-positive net saving is explicitly not achievable')
const negativeNetSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, -1, worked)
assert.equal(negativeNetSaving.breakEvenNotAchievable, true)
for (const value of [noSaving.breakEvenQuantity, noSaving.preciseBreakEvenQuantity, negativeNetSaving.breakEvenQuantity]) {
  assert.ok(value === null || Number.isFinite(value), 'Break-even never exposes NaN or Infinity')
}

const missingBatch = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, { ...worked, batchSize: '' })
assert.equal(missingBatch.requiredSavingPerPiece, null)
assert.equal(missingBatch.economicMarginPerPiece, null)
assert.equal(missingBatch.breakEvenQuantity, 2500, 'Break-even does not depend on Batch Size')
const missingSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, null, worked)
assert.equal(missingSaving.requiredSavingPerPiece, 4)
assert.equal(missingSaving.economicMarginPerPiece, null)
assert.equal(missingSaving.breakEvenQuantity, null)
const zeroActionCost = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, { ...worked, fixedActionCost: '0' })
assert.equal(zeroActionCost.breakEvenQuantity, 0, 'zero fixed action cost has a valid zero break-even quantity')

const business = calculateEconomicSimulation(currentSnapshot, simulationCost, null, withInputs({}))
assert.equal(business.business.sellingPrice, 250, 'blank Selling Price override falls back to Current')
assert.equal(business.business.sgaPercent, 8, 'blank SG&A override falls back to Current')
assert.equal(business.sgaPerPiece, 20)
assert.equal(business.operatingProfitPerPiece, 136)
const overrideBusiness = calculateEconomicSimulation(currentSnapshot, simulationCost, null, withInputs({
  sellingPriceOverride: '260', sgaPercentOverride: '8'
}))
assert.equal(overrideBusiness.sgaPerPiece, 20.8)
assert.equal(overrideBusiness.operatingProfitPerPiece, 145.2)
const negativeProfit = calculateEconomicSimulation(currentSnapshot, simulationCost, null, withInputs({
  sellingPriceOverride: '80', sgaPercentOverride: '10'
}))
assert.equal(negativeProfit.operatingProfitPerPiece, -22, 'negative Operating Profit remains valid')
const unavailableBusiness = calculateEconomicSimulation({ product: { sellingPrice: null, sgaPercent: null } } as CostSnapshot,
  simulationCost, null, createEconomicSimulationDraft())
assert.equal(unavailableBusiness.sgaPerPiece, null)
assert.equal(unavailableBusiness.operatingProfitPerPiece, null)

for (const [field, value] of [
  ['fixedActionCost', '-1'], ['variableActionCostPerPiece', '-1'], ['batchSize', '0'], ['batchSize', '-1'],
  ['batchSize', '1.5'], ['sellingPriceOverride', '-1'], ['sellingPriceOverride', 'Infinity'],
  ['sgaPercentOverride', '-1'], ['sgaPercentOverride', '100.01'], ['fixedActionCost', 'NaN']
] as const) {
  const original = worked
  assert.strictEqual(updateEconomicSimulationDraft(original, field, value), original, `${field} rejects ${value}`)
}
for (const batchSize of ['0', '-1', '1.5', 'Infinity', 'NaN']) {
  const invalid = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, { ...worked, batchSize })
  assert.equal(invalid.batchSize, null)
  assert.equal(invalid.requiredSavingPerPiece, null)
  assert.ok(invalid.warnings.some((warning: string) => warning.includes('Batch Size')))
}

const panelMarkup = renderPanel(baseResult, worked)
for (const text of [
  '>Business</h2>', '>Economic</h2>', '>Outcome</h3>', 'Fixed Action Cost', 'Batch Size', 'Variable Action Cost', 'Variable Action Cost / Unit',
  'Parameter Saving / Unit', 'Required Saving / Unit', 'Economic Margin / Unit',
  'Break-even Quantity', '(2,500 PC)', 'Selling Price', 'SG&amp;A %',
  'THB/PC', 'QTY (PC)'
]) assert.ok(panelMarkup.includes(text), `finalized Economic/Business UI includes ${text}`)
const inputsCardTag = panelMarkup.match(/<div data-safe-workspace-interaction="true" data-simulation-layout-column="inputs"[^>]*>/)?.[0] ?? ''
assert.match(inputsCardTag, /class="[^"]*border border-slate-300[^\"]*bg-white/,
  'Business and Economic sections share one bordered outer card')
assert.match(inputsCardTag, /class="[^"]*divide-y divide-slate-200/,
  'Business and Economic sections share one outer card with subtle internal dividers')
const inputsSectionTags = [...panelMarkup.matchAll(/<section\b[^>]*aria-labelledby="simulation-(?:business-inputs|economic-inputs|economic-outputs)-title"[^>]*>/g)].map(([tag]) => tag)
assert.equal(inputsSectionTags.length, 2, 'the combined card has only Business and Economic main sections')
assert.ok(inputsSectionTags.every(tag => !/class="[^"]*\bborder\b/.test(tag)),
  'Business and Economic sections no longer have separate outer borders')
assert.match(panelMarkup, /grid-rows-\[minmax\(min-content,\.95fr\)_minmax\(0,2\.45fr\)\]/,
  'the Business section keeps enough height for the SG&A editor and breathing room before the main divider')
const economicInputsPanel = panelMarkup.match(/<section[^>]*aria-labelledby="simulation-economic-inputs-title"[\s\S]*?<\/section>/)?.[0] ?? ''
const economicInputIndexes = ['Variable Action Cost', 'Fixed Action Cost', 'Batch Size'].map(label => economicInputsPanel.indexOf(label))
assert.ok(economicInputIndexes.every((index, position) => index >= 0 && (position === 0 || index > economicInputIndexes[position - 1])),
  'Economic inputs render vertically in Variable Action Cost, Fixed Action Cost, Batch Size order')
assert.ok(economicInputsPanel.includes('grid min-w-0 grid-cols-1'), 'Economic inputs use a vertical single-column layout')
assert.ok(economicInputsPanel.includes('>Variable Action Cost<span class="ml-1 font-normal text-slate-500">THB/PC</span>'),
  'Variable Action Cost is shown without / Unit and keeps its THB/UOM beside the label')
assert.match(economicInputsPanel, /aria-label="Variable Action Cost \/ Unit"/,
  'the input keeps the full accessible meaning of Variable Action Cost per unit')
const businessPanel = panelMarkup.match(/<section[^>]*aria-labelledby="simulation-business-inputs-title"[\s\S]*?<\/section>/)?.[0] ?? ''
assert.ok(businessPanel, 'Business Inputs has its own panel')
const businessInputIndexes = ['Selling Price', 'SG&amp;A %'].map(label => businessPanel.indexOf(label))
assert.ok(businessInputIndexes.every((index, position) => index >= 0 && (position === 0 || index > businessInputIndexes[position - 1])),
  'Business inputs render vertically in Selling Price, SG&A order')
assert.ok(businessPanel.includes('grid grid-cols-1'), 'Business inputs use a vertical single-column layout')
assert.doesNotMatch(businessPanel, /SIM Standard Cost|Operating Profit|<span>SG&amp;A<\/span>/,
  'Business Inputs no longer repeats the outputs available in Result')
assert.match(businessPanel, /aria-label="Selling Price"/, 'Business Selling Price input remains available')
assert.match(businessPanel, /aria-label="SG&amp;A %"/, 'Business SG&A % input remains available')
assert.match(panelMarkup, /<figure data-safe-workspace-interaction="true" aria-labelledby="break-even-graph-title"/,
  'Break-even chart interactions remain protected from workspace outside-dismiss handling')
assert.match(panelMarkup, /role="slider"[^>]*aria-label="Batch Size"[^>]*aria-orientation="horizontal"[^>]*aria-valuemin="1"/,
  'Batch marker is an accessible horizontal integer slider')
assert.match(panelMarkup, /aria-valuenow="5000"/)
assert.match(panelMarkup, /role="img" aria-label="Cumulative Parameter Saving:/,
  'the Saving graph line keeps its accessible description without a popup')
assert.match(panelMarkup, /role="img" aria-label="Total Action Cost:/,
  'the Action Cost graph line keeps its accessible description without a popup')
assert.match(panelMarkup, /role="img" aria-label="Break-even Quantity:/,
  'the break-even point keeps its accessible description without a popup')
assert.match(economicInputsPanel, /aria-label="Break-even Quantity"[^>]*title="Fixed Action Cost ÷ \(Parameter Saving \/ Unit − Variable Action Cost \/ Unit\)"/,
  'Economic Outcome exposes the shared calculated Break-even Quantity with its formula context')
assert.doesNotMatch(panelMarkup, />Business Inputs<|>Economic Inputs<|>Economic Outputs<|>Quantity \(/,
  'obsolete visible headings and axis naming are absent')
const outcome = economicInputsPanel.slice(economicInputsPanel.indexOf('<div role="group" aria-labelledby="simulation-economic-outcome-title"'))
assert.match(outcome, /class="[^"]*border-t border-slate-200/,
  'Outcome has a subtle divider inside the padded Economic section')
assert.equal((outcome.match(/THB\/PC/g) ?? []).length, 1, 'Outcome shows its shared unit exactly once')
assert.equal((outcome.match(/role="group" aria-label=/g) ?? []).length, 5, 'Outcome has three saving/margin rows, canonical Operating Profit, and Break-even quantity')
for (const [label, value] of [['Parameter Saving', '6.00'], ['Required Saving', '4.00'], ['Economic Margin', '2.00']]) {
  assert.match(outcome, new RegExp(`aria-label="${label} / Unit"[^>]*title="[^"]+">`), `${label} preserves its accessible name and formula tooltip`)
  assert.ok(outcome.includes(`>${label}</span>`), `${label} uses the short visible label`)
  assert.match(outcome, new RegExp(`>${value.replace('.', '\\.')}</span>`), `${label} value has no repeated unit`)
}
assert.match(outcome, /aria-label="Break-even Quantity"[^>]*title="[^"]+"[\s\S]*?>Break-even Quantity<\/span>[\s\S]*?>2500 PC<\/span>/,
  'Outcome shows the same whole quantity as the graph heading with the product UOM')
for (const result of [business, overrideBusiness, negativeProfit, unavailableBusiness]) {
  const markup = renderPanel(result, worked)
  const op = markup.match(/<div role="group" aria-label="Operating Profit \/ Unit"[\s\S]*?<\/div>/)?.[0] ?? ''
  assert.ok(op.includes('>Operating Profit</span>'), 'Outcome retains the full Operating Profit label')
  const expected = result.operatingProfitPerPiece === null ? '—' : result.operatingProfitPerPiece.toFixed(2)
  assert.ok(op.includes(`>${expected}</span>`), 'Outcome displays the canonical profit including negative/unavailable results')
}
const breakEvenOutcome = outcome.match(/<div role="group" aria-label="Break-even Quantity"[\s\S]*?<\/div>/)?.[0] ?? ''
assert.match(breakEvenOutcome, /mt-1 border-t border-slate-200 pt-1/,
  'Break-even Quantity is separated from the monetary per-unit outputs by a subtle divider')
const baseGraphHeader = panelMarkup.match(/<figcaption id="break-even-graph-title"[\s\S]*?<\/figcaption>/)?.[0] ?? ''
assert.match(baseGraphHeader, /<span>Break-even<\/span>[\s\S]*?<span class="text-\[9px\] font-normal text-slate-500">\(2,500 PC\)<\/span>/,
  'graph heading keeps Break-even primary and renders subdued parenthetical quantity context')
assert.match(panelMarkup, /viewBox="0 0 560 112" preserveAspectRatio="xMidYMid meet"/,
  'Break-even graph starts from its measured responsive coordinate system and preserves aspect ratio')
assert.match(panelMarkup, /<text x="544" y="109" text-anchor="end"[^>]*>QTY \(PC\)<\/text>/,
  'QTY is anchored at the responsive right axis end below the tick row')
assert.match(panelMarkup, /<line x1="52" x2="544" y1="12" y2="12" stroke="#e2e8f0"/,
  'Break-even plot uses the expanded internal plot bounds')
const fractionalMarkup = renderPanel(higherVariableCost, worked)
assert.ok(fractionalMarkup.includes('(6,667 PC)'), 'heading uses the whole displayed threshold')
const fractionalPoint = fractionalMarkup.match(/aria-label="Break-even Quantity:[^"]*" cx="([^"]+)"/)
assert.ok(fractionalPoint, 'precise intersection remains accessible')
const expectedPointX = 52 + (higherVariableCost.preciseBreakEvenQuantity / (higherVariableCost.preciseBreakEvenQuantity * 1.12)) * (544 - 52)
assert.equal(Number(fractionalPoint[1]), expectedPointX, 'intersection geometry uses precise quantity rather than rounded threshold')
const customUnitMarkup = renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
  result: baseResult, draft: worked, afterSnapshot: currentSnapshot, unit: 'KG', onUpdate() {}, onBeginEdit() {}, onCommitEdit() {}
}))
assert.match(customUnitMarkup, /<span>THB\/KG<\/span>/, 'Outcome uses the resolved dynamic product UOM')
assert.match(customUnitMarkup, /aria-label="Break-even Quantity"[^>]*>[\s\S]*?>2500 KG<\/span>/,
  'Economic Outcome quantity uses the resolved dynamic product UOM')
for (const [unit, resolvedUnit] of [['KG', 'KG'], ['   ', 'Unit']]) {
  const graph = renderToStaticMarkup(React.createElement(EconomicBreakEvenGraphPanel, {
    result: baseResult, unit, onBatchSizeChange() {}, onBeginEdit() {}, onCommitEdit() {}
  }))
  assert.ok(graph.includes(`(2,500 ${resolvedUnit})`), 'graph heading uses the resolved UOM or Unit fallback')
  assert.ok(graph.includes(`>QTY (${resolvedUnit})</text>`), 'QTY uses the resolved UOM or Unit fallback')
}

const graphMarkup = panelMarkup.slice(panelMarkup.indexOf('<figure'))
assert.doesNotMatch(graphMarkup, /<title>|\stitle=/, 'Break-even graph has no native popup tooltip')
assert.doesNotMatch(panelMarkup, /data-break-even-tooltip|activeTooltip|absolute z-20/,
  'the Break-even graph renders no floating popup tooltip system')
assert.doesNotMatch(panelMarkup, /Calculation Details|Above Break-even|Below Break-even|Fixed Cost \/ pc|OP \/ pc/)

const unavailableMarkup = renderPanel(noSaving, worked)
assert.match(unavailableMarkup, /<span>Break-even<\/span>[\s\S]*?<span class="text-\[9px\] font-normal text-slate-500">\(Not achieved\)<\/span>/)
assert.match(unavailableMarkup, /aria-label="Break-even Quantity"[^>]*>[\s\S]*?>Not achieved<\/span>/,
  'Economic Outcome and graph heading both report a non-achievable quantity')
assert.doesNotMatch(unavailableMarkup, /NaN|Infinity/)
const unavailableSavingMarkup = renderPanel(missingSaving, worked)
assert.ok(unavailableSavingMarkup.includes('(—)'), 'missing quantity stays unavailable in the graph heading')
assert.match(unavailableSavingMarkup, /aria-label="Break-even Quantity"[^>]*>[\s\S]*?>—<\/span>/,
  'missing quantity stays unavailable in Outcome')
assert.ok(renderPanel(zeroActionCost, worked).includes('(0 PC)'), 'zero quantity remains a valid displayed result')
const initialDraft = createEconomicSimulationDraft(currentSnapshot)
assert.deepEqual(initialDraft, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: '250', sgaPercentOverride: '8'
}, 'initial defaults use Current business values and leave Simulation-only assumptions blank')
const initialMarkup = renderPanel(calculateEconomicSimulation(currentSnapshot, simulationCost, null, initialDraft), initialDraft)
const renderedInput = (label: string) => initialMarkup.match(new RegExp(`<input\\b(?=[^>]*aria-label="${label}")[^>]*>`))?.[0] ?? ''
for (const [label, value] of [
  ['Fixed Action Cost', ''], ['Batch Size', ''], ['Variable Action Cost / Unit', ''],
  ['Selling Price', '250.00'], ['SG&amp;A %', '8.00']
]) {
  const input = renderedInput(label)
  assert.ok(input, `${label} input is rendered`)
  assert.ok(input.includes(`value="${value}"`), `${label} displays its expected initial value`)
  assert.doesNotMatch(input, /placeholder="Current"/, `${label} does not use a Current placeholder`)
}
assert.doesNotMatch(initialMarkup, /placeholder="Current"/, 'business defaults are visible values rather than placeholder text')
const blankBusinessDraft = { ...initialDraft, sellingPriceOverride: '', sgaPercentOverride: '' }
const blankBusinessMarkup = renderPanel(calculateEconomicSimulation(currentSnapshot, simulationCost, null, blankBusinessDraft), blankBusinessDraft)
for (const [label, value] of [['Selling Price', '250.00'], ['SG&amp;A %', '8.00']]) {
  const input = blankBusinessMarkup.match(new RegExp(`<input\\b(?=[^>]*aria-label="${label}")[^>]*>`))?.[0] ?? ''
  assert.ok(input.includes(`value="${value}"`), `${label} blank semantics continue displaying the Current value`)
}

const panelTree = EconomicSimulationPanel({
  result: calculateEconomicSimulation(currentSnapshot, simulationCost, null, initialDraft),
  draft: initialDraft,
  afterSnapshot: currentSnapshot,
  unit: 'PC',
  onUpdate() {},
  onBeginEdit() {},
  onCommitEdit() {}
})
function collectNumericInputs(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(collectNumericInputs)
  if (!React.isValidElement(node)) return []
  const current = node.type === NumericInput ? [node.props] : []
  return [...current, ...collectNumericInputs(node.props.children)]
}
const economicInputProps = new Map(collectNumericInputs(panelTree).map(props => [props['aria-label'], props]))
const stepCases = [
  ['Fixed Action Cost', 2, [2, 1, 0, null]],
  ['Variable Action Cost / Unit', 2, [2, 1, 0, null]],
  ['Batch Size', 3, [3, 2, 1, null]],
  ['Selling Price', 2, [2, 1, 0, null]],
  ['SG&A %', 2, [2, 1, 0, null]]
] as const
for (const [label, start, expected] of stepCases) {
  const input = economicInputProps.get(label)
  assert.ok(input, `${label} uses a Simulation numeric input`)
  assert.equal(input.stopAtMinimum, undefined, `${label} does not stop at its minimum`)
  assert.equal(input.min, label === 'Batch Size' ? 1 : 0, `${label} retains its valid minimum`)
  assert.equal(Boolean(input.integer), label === 'Batch Size', `${label} retains its integer rule`)
  const sequence: Array<number | null> = [start]
  let value: number | null = start
  while (value !== null && sequence.length < expected.length) {
    value = stepNumericValue(value, -1, 1, {
      min: input.min,
      max: input.max,
      integer: input.integer,
      precision: input.precision
    })
    sequence.push(value)
  }
  assert.deepEqual(sequence, expected, `${label} decrements from its valid minimum to blank`)
}

console.log('Simulation Economic, Break-even, and Business verification passed')
