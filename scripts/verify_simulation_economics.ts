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

const { EconomicSimulationPanel } = panelModule
const { NumericInput } = numericInputModule
const { calculateEconomicSimulation, createEconomicSimulationDraft, updateEconomicSimulationDraft } = economicsModule
const currentSnapshot = { product: { sellingPrice: 250, sgaPercent: 8, uom: 'PC' } } as CostSnapshot
const simulationCost: SnapshotCost = {
  snapshotId: 'sim', material: 94, labor: 0, burden: 0, total: 94, status: 'complete', warnings: []
}
const withInputs = (fields: Record<string, string>) => Object.entries(fields).reduce(
  (draft, [field, value]) => updateEconomicSimulationDraft(draft, field as keyof typeof draft, value),
  createEconomicSimulationDraft()
)
const renderPanel = (result: ReturnType<typeof calculateEconomicSimulation>, draft = createEconomicSimulationDraft(currentSnapshot)) => renderToStaticMarkup(
  React.createElement(EconomicSimulationPanel, {
    result,
    draft,
    currentSnapshot,
    unit: 'PC',
    onUpdate() {}
  })
)

const worked = withInputs({ fixedActionCost: '10000', batchSize: '5000', variableActionCostPerPiece: '2' })
const baseResult = calculateEconomicSimulation(currentSnapshot, simulationCost, 6, worked)
assert.equal(baseResult.fixedCostPerPiece, 2)
assert.equal(baseResult.requiredSavingPerPiece, 4)
assert.equal(baseResult.parameterSavingPerPiece, 6)
assert.equal(baseResult.economicMarginPerPiece, 2)
assert.equal(baseResult.preciseBreakEvenQuantity, 2500)
assert.equal(baseResult.breakEvenQuantity, 2500)
assert.equal(baseResult.breakEvenNotAchievable, false)

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
  'Economic', 'Business', 'Fixed Action Cost', 'Batch Size', 'Variable Action Cost / Unit',
  'Parameter Saving / Unit', 'Required Saving / Unit', 'Economic Margin / Unit',
  'Break-even Quantity', 'Break-even Graph', 'Selling Price', 'SG&amp;A %', 'SIM Standard Cost',
  'SG&amp;A / Unit', 'Operating Profit / Unit', 'THB/PC', 'Quantity (PC)'
]) assert.ok(panelMarkup.includes(text), `finalized Economic/Business UI includes ${text}`)
assert.match(panelMarkup, /role="slider"[^>]*aria-label="Batch Size"[^>]*aria-orientation="horizontal"[^>]*aria-valuemin="1"/,
  'Batch marker is an accessible horizontal integer slider')
assert.match(panelMarkup, /aria-valuenow="5000"/)
assert.doesNotMatch(panelMarkup, /Calculation Details|Above Break-even|Below Break-even|Fixed Cost \/ pc|OP \/ pc/)

const unavailableMarkup = renderPanel(noSaving, worked)
assert.match(unavailableMarkup, /Not achievable/)
assert.doesNotMatch(unavailableMarkup, /NaN|Infinity/)
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

const panelTree = EconomicSimulationPanel({
  result: calculateEconomicSimulation(currentSnapshot, simulationCost, null, initialDraft),
  draft: initialDraft,
  currentSnapshot,
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
