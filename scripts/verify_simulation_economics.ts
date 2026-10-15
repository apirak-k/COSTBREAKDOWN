import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot, SnapshotCost } from '../src/core/types'

const loadSimulationModules = async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true, entries: [] }
  })
  try {
    return await Promise.all([
      vite.ssrLoadModule('/src/features/simulation/EconomicSimulationPanel.tsx'),
      vite.ssrLoadModule('/src/features/simulation/simulation-economics.ts')
    ])
  } finally {
    await vite.close()
  }
}

const [panelModule, economicsModule] = await loadSimulationModules()
const { EconomicSimulationPanel } = panelModule
const { calculateEconomicSimulation, createEconomicSimulationDraft, updateEconomicSimulationDraft } = economicsModule

const currentSnapshot = {
  product: { sellingPrice: 120, sgaPercent: 10 }
} as CostSnapshot
const simulationCost: SnapshotCost = {
  snapshotId: 'sim', material: 90, labor: 0, burden: 0, total: 90, status: 'complete', warnings: []
}
const atCurrent = (fields: Record<string, string>) => Object.entries(fields).reduce(
  (draft, [field, value]) => updateEconomicSimulationDraft(draft, field as keyof typeof draft, value),
  createEconomicSimulationDraft()
)

const marginDraft = atCurrent({ fixedActionCost: '1000', variableActionCostPerPiece: '1', batchSize: '100' })
const margin = calculateEconomicSimulation(currentSnapshot, simulationCost, 10, marginDraft)
assert.equal(margin.fixedCostPerPiece, 10, 'Fixed Cost / pc = Fixed Action Cost / Batch Size')
assert.equal(margin.requiredSavingPerPiece, 11, 'Required Saving / pc includes fixed and variable cost')
assert.equal(margin.parameterSavingPerPiece, 10, 'Parameter Saving remains Current SC - SIM SC')
assert.equal(margin.economicMarginPerPiece, -1, 'negative Economic Margin is valid')
assert.equal(margin.simulationStandardCost, 90, 'economic inputs never change Standard Cost')

const positiveOPDraft = atCurrent({ sellingPriceOverride: '120', sgaPercentOverride: '10' })
const positiveOP = calculateEconomicSimulation(currentSnapshot, simulationCost, null, positiveOPDraft)
assert.equal(positiveOP.sgaPerPiece, 12, 'SG&A / pc = Selling Price × SG&A rate')
assert.equal(positiveOP.operatingProfitPerPiece, 18, 'OP / pc = Selling Price - SIM SC - SG&A / pc')

const negativeOPDraft = atCurrent({ sellingPriceOverride: '80', sgaPercentOverride: '10' })
const negativeOP = calculateEconomicSimulation(currentSnapshot, simulationCost, null, negativeOPDraft)
assert.equal(negativeOP.sgaPerPiece, 8)
assert.equal(negativeOP.operatingProfitPerPiece, -18, 'negative OP remains a valid visible output')

const fallbackDraft = atCurrent({ fixedActionCost: '0', variableActionCostPerPiece: '0', batchSize: '1' })
const fallback = calculateEconomicSimulation(currentSnapshot, simulationCost, 0, fallbackDraft)
assert.equal(fallback.business.sellingPrice, 120, 'blank Selling Price override uses Current')
assert.equal(fallback.business.sgaPercent, 10, 'blank SG&A override uses Current')
assert.equal(fallback.economicMarginPerPiece, 0, 'zero Parameter Saving and zero Required Saving yield a valid 0% result')

const panelMarkup = renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
  result: positiveOP,
  draft: positiveOPDraft,
  currentSnapshot,
  onUpdate() {}
}))
assert.match(panelMarkup, /inputMode="numeric"[^>]*aria-valuemin="1"/,
  'Batch Size UI boundary rejects zero and retains whole-piece input')
assert.match(panelMarkup, /aria-valuemin="0" aria-valuemax="100"/,
  'SG&A UI boundary caps the percentage at 100')

const formulaTooltips = [
  'Fixed Action Cost ÷ Batch Size',
  'Fixed Cost / pc + Variable Action Cost / pc',
  'Current Standard Cost − SIM Standard Cost',
  'Parameter Saving / pc − Required Saving / pc',
  'Selling Price × SG&A %',
  'Selling Price − SIM Standard Cost − SG&A / pc'
]
const panelSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/EconomicSimulationPanel.tsx'), 'utf8')
assert.doesNotMatch(panelMarkup, /Calculation notes/, 'Calculation Notes are absent from the Economic panel')
for (const formula of formulaTooltips) {
  assert.ok(panelSource.includes(formula), `Economic output retains its exact Tooltip label: ${formula}`)
}
assert.match(panelSource, /<Tooltip label=\{formula\}/, 'each exact formula string is wired to the shared accessible Tooltip')

const positiveSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, 10, marginDraft)
const negativeSaving = calculateEconomicSimulation(currentSnapshot, simulationCost, -10, marginDraft)
const renderPanel = (result: ReturnType<typeof calculateEconomicSimulation>) => renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
  result,
  draft: marginDraft,
  currentSnapshot,
  onUpdate() {}
}))
const positiveSavingMarkup = renderPanel(positiveSaving)
const negativeSavingMarkup = renderPanel(negativeSaving)
const parameterSavingValueClass = (markup: string): string => {
  const labelIndex = markup.indexOf('>Parameter Saving / pc</span>')
  const outputEnd = labelIndex < 0 ? -1 : markup.indexOf('</div>', labelIndex)
  return outputEnd < 0 ? '' : markup.slice(labelIndex, outputEnd)
}
assert.match(parameterSavingValueClass(positiveSavingMarkup), /text-emerald-800/,
  'positive Parameter Saving uses a favorable green sign color')
assert.match(parameterSavingValueClass(negativeSavingMarkup), /text-rose-800/,
  'negative Parameter Saving uses an unfavorable red sign color')
const fallbackPanelMarkup = renderToStaticMarkup(React.createElement(EconomicSimulationPanel, {
  result: fallback,
  draft: fallbackDraft,
  currentSnapshot,
  onUpdate() {}
}))
assert.match(fallbackPanelMarkup, /value="120\.00"/, 'blank Selling Price override displays the actual Current fallback value')
assert.match(fallbackPanelMarkup, /value="10\.00"/, 'blank SG&A override displays the actual Current percentage')

for (const [field, value] of [
  ['fixedActionCost', '-1'],
  ['variableActionCostPerPiece', '-1'],
  ['batchSize', '0'],
  ['batchSize', '-1'],
  ['batchSize', '1.5'],
  ['sellingPriceOverride', '-1'],
  ['sellingPriceOverride', 'Infinity'],
  ['sellingPriceOverride', 'NaN'],
  ['sgaPercentOverride', '-1'],
  ['sgaPercentOverride', '100.01'],
  ['sgaPercentOverride', '120'],
  ['fixedActionCost', 'Infinity'],
  ['variableActionCostPerPiece', 'NaN']
] as const) {
  const unchanged = updateEconomicSimulationDraft(marginDraft, field, value)
  assert.strictEqual(unchanged, marginDraft, `${field} rejects ${value} without replacing the last valid draft`)
}

for (const batchSize of ['0', '-1', '1.5', 'Infinity', 'NaN']) {
  const invalid = calculateEconomicSimulation(currentSnapshot, simulationCost, 10, {
    ...marginDraft,
    batchSize
  })
  assert.equal(invalid.batchSize, null, `invalid Batch Size ${batchSize} is unavailable`)
  assert.equal(invalid.fixedCostPerPiece, null)
  assert.equal(invalid.requiredSavingPerPiece, null)
  assert.equal(invalid.economicMarginPerPiece, null)
  assert.ok(invalid.warnings.some(warning => warning.includes('Batch Size')))
}

for (const sga of ['-5', '101', '120', 'Infinity', 'NaN']) {
  const invalid = calculateEconomicSimulation(currentSnapshot, simulationCost, null, {
    ...positiveOPDraft,
    sgaPercentOverride: sga
  })
  assert.equal(invalid.business.sgaPercent, null, `invalid SG&A ${sga} is not silently replaced by Current`)
  assert.equal(invalid.business.sgaAmountPerPiece, null)
  assert.equal(invalid.business.operatingProfitPerPiece, null)
  assert.ok(invalid.warnings.some(warning => warning.includes('SG&A')))
}

for (const invalid of [
  { ...marginDraft, fixedActionCost: '-1' },
  { ...marginDraft, variableActionCostPerPiece: 'Infinity' },
  { ...marginDraft, batchSize: '0' }
]) {
  const calculated = calculateEconomicSimulation(currentSnapshot, simulationCost, 10, invalid)
  assert.equal(calculated.requiredSavingPerPiece, null, 'invalid stored values are rejected again at calculation boundary')
}

const unavailableCurrentSga = calculateEconomicSimulation({ product: { sellingPrice: 120, sgaPercent: 101 } } as CostSnapshot,
  simulationCost, null, createEconomicSimulationDraft())
assert.equal(unavailableCurrentSga.business.sgaPercent, null, 'invalid Current SG&A remains unavailable')

const updatedDraft = updateEconomicSimulationDraft(marginDraft, 'fixedActionCost', '2000')
assert.equal(marginDraft.fixedActionCost, '1000', 'draft edits do not mutate existing state')
assert.equal(updatedDraft.fixedActionCost, '2000')

console.log('Current Simulation economics verification passed')
