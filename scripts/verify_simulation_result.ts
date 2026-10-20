import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const {
    createEmptySimulationState,
    getEffectiveSimulationDataset,
    resetAllSimulationParameters,
    setSimulationActiveDataset,
    setSimulationComparison,
    setSimulationEconomicInput
  } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

  const roles: MasterDataRole[] = ['reference', 'current', 'custom']
  const makeSnapshot = (id: string, materialPrice: number | null, sellingPrice: number | null = 250): CostSnapshot => ({
    id,
    product: {
      productCode: 'RESULT-1', productDescription: 'Result verification product', uom: 'KG',
      customer: '', effectiveDate: '', sellingPrice, sgaPercent: 8
    },
    effectiveDate: '', sourceRef: id, status: 'draft',
    rates: [{ id: 'rate-1', workCenterCode: 'WC-1', description: 'Zero-rate fixture', laborRate: 0, burdenRate: 0, effectiveDate: '', confidence: {} }],
    bom: [{
      id: 'material-1', itemCode: 'MAT-1', description: 'Verification material',
      consumption: 1, unit: 'KG', price: materialPrice, loss: 0, confidence: {}
    }],
    routing: [{ id: 'route-1', processName: 'Fixture route', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1, confidence: {} }]
  })
  const reference = makeSnapshot('reference', 78)
  const current = makeSnapshot('current', 78)
  const custom = makeSnapshot('custom', 78)
  const sources = { reference, current, custom }
  const empty = createEmptySimulationState(sources)
  assert.deepEqual(
    [empty.activeDataset, empty.comparisonBefore, empty.comparisonAfter],
    ['custom', 'current', 'custom'],
    'Simulation starts on Custom with Current → Custom Result comparison'
  )

  for (const before of roles) {
    for (const active of roles) {
      const selectedBefore = setSimulationComparison(empty, before, 'current')
      const selectedActive = setSimulationActiveDataset(selectedBefore, active)
      assert.equal(selectedActive.activeDataset, active, `${active} becomes the active dataset`)
      assert.equal(selectedActive.comparisonBefore, before, `changing Active preserves Before=${before}`)
      assert.equal(selectedActive.comparisonAfter, active, `changing Active synchronizes After=${active}`)
    }
  }
  assert.deepEqual(
    [setSimulationComparison(empty, 'current', 'reference').activeDataset,
      setSimulationComparison(empty, 'reference', 'custom').activeDataset],
    ['custom', 'custom'],
    'manually changing either Result selector leaves Active unchanged'
  )
  const manualPair = setSimulationComparison(empty, 'reference', 'current')
  const activeReselected = setSimulationActiveDataset(manualPair, 'custom')
  assert.deepEqual(
    [activeReselected.activeDataset, activeReselected.comparisonBefore, activeReselected.comparisonAfter],
    ['custom', 'reference', 'custom'],
    'selecting the already-active dataset again preserves Before and resynchronizes After'
  )

  let state = updateSimulationParameter(empty, sources, 'material-1', 'bom.price', 71, 'custom')
  state = setSimulationEconomicInput(state, 'sellingPriceOverride', '260', 'custom')
  state = setSimulationEconomicInput(state, 'sgaPercentOverride', '8', 'custom')
  const resetAll = resetAllSimulationParameters(
    setSimulationComparison(setSimulationActiveDataset(state, 'reference'), 'custom', 'reference'),
    sources
  )
  assert.deepEqual(
    [resetAll.activeDataset, resetAll.comparisonBefore, resetAll.comparisonAfter],
    ['custom', 'current', 'custom'],
    'Reset All restores Active Custom and Current → Custom from a non-default state'
  )

  const render = (workspace: typeof state, before: MasterDataRole, after: MasterDataRole) => {
    const effectiveDatasets = Object.fromEntries(roles.map(role => [
      role, getEffectiveSimulationDataset(sources, workspace, role)
    ])) as Record<MasterDataRole, ReturnType<typeof getEffectiveSimulationDataset>>
    const active = effectiveDatasets[workspace.activeDataset]
    return renderToStaticMarkup(React.createElement(SimulationPage, {
      state: active,
      workingSelection: active.workingSelection,
      analysisBeforeDataset: effectiveDatasets[before],
      analysisAfterDataset: effectiveDatasets[after],
      effectiveDatasets,
      onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
      onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onSetWorkingSelection() {},
      onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
    }))
  }
  const resultPanel = (markup: string) =>
    markup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
  const rowElement = (markup: string, label: string) => {
    const panel = resultPanel(markup)
    return [...panel.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row).find(row =>
      row.includes('scope="row"') && row.replace(/&amp;/g, '&').includes(`>${label}</th>`)
    ) ?? ''
  }
  const rowValues = (markup: string, label: string) => [...rowElement(markup, label).matchAll(/<td class="([^"]*)">([\s\S]*?)<\/td>/g)]
    .map(([, className, content]) => ({ className, text: content.replace(/<[^>]*>/g, '').trim() }))
  const headers = (panel: string) => [...panel.matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)]
    .map(([, content]) => content.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]*>/g, '').trim())

  const initial = render(state, 'reference', 'custom')
  const panel = resultPanel(initial)
  assert.ok(panel, 'Result panel renders')
  assert.match(panel, /<h2 id="simulation-result-title" class="sr-only">Result<\/h2>/,
    'Result keeps its accessible title without restoring a visible heading')
  assert.deepEqual(headers(panel), ['Cost / Unit', 'Before', 'After', 'Change', '%'],
    'Cost / Unit and comparison columns share one compact visible header row')
  assert.match(panel, /aria-label="Before dataset, Reference"/, 'Before accessible name includes its selected role')
  assert.match(panel, /aria-label="After dataset, Custom"/, 'After accessible name includes its selected role')
  assert.doesNotMatch(headers(panel).join(' '), /Reference|Current|Custom/,
    'selected role names are not repeated as visible table headers')
  assert.match(panel, /Business Outcome \/ Unit/, 'Business Outcome / Unit remains the divider before business rows')
  assert.deepEqual(rowValues(initial, 'Material').map(cell => cell.text), ['78.00', '71.00', '-7.00', '-8.97%'])
  assert.deepEqual(rowValues(initial, 'Standard Cost').map(cell => cell.text), ['78.00', '71.00', '-7.00', '-8.97%'])
  assert.deepEqual(rowValues(initial, 'Selling Price').map(cell => cell.text), ['250.00', '260.00', '+10.00', '+4.00%'])
  assert.deepEqual(rowValues(initial, 'SG&A').map(cell => cell.text), ['20.00', '20.80', '+0.80', '+4.00%'])
  assert.deepEqual(rowValues(initial, 'Operating Profit').map(cell => cell.text), ['152.00', '168.20', '+16.20', '+10.66%'])
  assert.match(rowValues(initial, 'Standard Cost')[2]?.className ?? '', /text-emerald-700/, 'a lower cost is favorable')
  assert.match(rowValues(initial, 'Operating Profit')[2]?.className ?? '', /text-emerald-700/, 'higher operating profit is favorable')

  const expectedCost: Record<MasterDataRole, number> = { reference: 78, current: 78, custom: 71 }
  const label: Record<MasterDataRole, string> = { reference: 'Reference', current: 'Current', custom: 'Custom' }
  const money = (value: number) => value.toFixed(2)
  const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
  for (const before of roles) {
    for (const after of roles) {
      const selected = setSimulationComparison(state, before, after)
      const markup = render(selected, before, after)
      const selectedPanel = resultPanel(markup)
      assert.deepEqual(headers(selectedPanel), ['Cost / Unit', 'Before', 'After', 'Change', '%'],
        `${label[before]} → ${label[after]} keeps compact visible headers`)
      assert.match(selectedPanel, new RegExp(`aria-label="Before dataset, ${label[before]}"`))
      assert.match(selectedPanel, new RegExp(`aria-label="After dataset, ${label[after]}"`))
      const delta = expectedCost[after] - expectedCost[before]
      const percent = expectedCost[before] === 0 ? '—' : `${signed(delta / expectedCost[before] * 100)}%`
      assert.deepEqual(rowValues(markup, 'Standard Cost').map(cell => cell.text), [
        money(expectedCost[before]), money(expectedCost[after]), signed(delta), percent
      ], `${label[before]} → ${label[after]} computes Change as After − Before`)
      assert.equal(selected.activeDataset, 'custom', 'changing the Result pair does not change activeDataset')
    }
  }

  const zero = makeSnapshot('zero', 0, 0)
  const zeroSources = { reference: zero, current: zero, custom: zero }
  const zeroState = createEmptySimulationState(zeroSources)
  const zeroChanged = updateSimulationParameter(zeroState, zeroSources, 'material-1', 'bom.price', 2, 'custom')
  const zeroMarkup = (() => {
    const effectiveDatasets = Object.fromEntries(roles.map(role => [
      role, getEffectiveSimulationDataset(zeroSources, zeroChanged, role)
    ])) as Record<MasterDataRole, ReturnType<typeof getEffectiveSimulationDataset>>
    const active = effectiveDatasets[zeroChanged.activeDataset]
    return renderToStaticMarkup(React.createElement(SimulationPage, {
      state: active, workingSelection: active.workingSelection,
      analysisBeforeDataset: effectiveDatasets.reference, analysisAfterDataset: effectiveDatasets.custom,
      effectiveDatasets,
      onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
      onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onSetWorkingSelection() {},
      onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
    }))
  })()
  assert.deepEqual(rowValues(zeroMarkup, 'Standard Cost').map(cell => cell.text), ['0.00', '2.00', '+2.00', '—'],
    'a zero Before value keeps its percentage unavailable')
  assert.match(rowValues(zeroMarkup, 'Standard Cost')[3]?.className ?? '', /text-slate-400/)
  assert.doesNotMatch(resultPanel(zeroMarkup), /NaN|Infinity/)

  const missingPrice = makeSnapshot('missing-price', 78, null)
  const missingSources = { reference: missingPrice, current: missingPrice, custom: missingPrice }
  const missingState = createEmptySimulationState(missingSources)
  const missingDatasets = Object.fromEntries(roles.map(role => [
    role, getEffectiveSimulationDataset(missingSources, missingState, role)
  ])) as Record<MasterDataRole, ReturnType<typeof getEffectiveSimulationDataset>>
  const missingActive = missingDatasets[missingState.activeDataset]
  const missingMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state: missingActive, workingSelection: missingActive.workingSelection,
    analysisBeforeDataset: missingDatasets.current, analysisAfterDataset: missingDatasets.custom,
    effectiveDatasets: missingDatasets,
    onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
    onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onSetWorkingSelection() {},
    onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
  }))
  assert.deepEqual(rowValues(missingMarkup, 'Selling Price').map(cell => cell.text), ['—', '—', '—', '—'])
  assert.deepEqual(rowValues(missingMarkup, 'SG&A').map(cell => cell.text), ['—', '—', '—', '—'])
  assert.deepEqual(rowValues(missingMarkup, 'Operating Profit').map(cell => cell.text), ['—', '—', '—', '—'])

  console.log('Simulation Result values, compact headers, all nine pairs, and unavailable-value verification passed')
} finally {
  await vite.close()
}
