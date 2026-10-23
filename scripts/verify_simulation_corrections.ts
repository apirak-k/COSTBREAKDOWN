import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
try {
  const workspace = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const engine = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const history = await vite.ssrLoadModule('/src/features/simulation/simulation-history.ts')
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { SelectedValueProvider } = await vite.ssrLoadModule('/src/shared/ui/selected-value.tsx')
  const snapshot = {
    id: 'current', product: { productCode: 'P', productDescription: 'Correction fixture', uom: 'SET', customer: '', effectiveDate: '', sellingPrice: 250, sgaPercent: 8 },
    effectiveDate: '', sourceRef: 'fixture', status: 'draft',
    rates: [{ id: 'wc', workCenterCode: 'WC', description: '', laborRate: 100, burdenRate: 50, effectiveDate: '', confidence: {} }],
    bom: Array.from({ length: 10 }, (_, index) => index + 1).map(n => ({ id: `b${n}`, itemCode: `MAT-${n}`, description: `MAT-${n}`, consumption: 2, unit: 'SET', price: 10, loss: 0.05, confidence: {} })),
    routing: Array.from({ length: 10 }, (_, index) => index + 1).map(n => ({ id: `r${n}`, processName: `OP-${n}`, workCenterId: 'WC', manning: 1, capacity: 100, yield: 1, confidence: {} }))
  }
  const sources = { current: snapshot, reference: structuredClone(snapshot), custom: structuredClone(snapshot) }
  sources.custom.bom[0].price = 7
  let state = workspace.createEmptySimulationState(sources)
  const dataset = (role = 'custom') => workspace.getEffectiveSimulationDataset(sources, state, role)
  const status = (kind: string, id: string) => workspace.simulationParameterStatus(kind, id, dataset().snapshot, dataset().baselineSnapshot)
  assert.deepEqual([state.activeDataset, state.comparisonBefore, state.comparisonAfter], ['custom', 'current', 'custom'])
  assert.equal(status('bom', 'b1'), 'UNCHANGED', 'each role status compares against that role’s own Master Working baseline')
  for (const [kind, id] of [['bom', 'b3'], ['routing', 'r2']]) {
    state = workspace.toggleSimulationWorkingTarget(state, sources, kind, id)
    assert.ok(dataset().workingSelection.includes(`${kind}:${id}`))
    state = workspace.toggleSimulationWorkingTarget(state, sources, kind, id)
    assert.ok(!dataset().workingSelection.includes(`${kind}:${id}`), 'repeat activation targets the same stable record')
  }
  const before = history.captureSimulationEditableSnapshot(sources, state)
  state = engine.updateSimulationParameter(state, sources, 'b1', 'bom.price', 8)
  assert.equal(status('bom', 'b1'), 'CHANGED')
  state = history.applySimulationEditableSnapshot(sources, state, before)
  assert.equal(status('bom', 'b1'), 'UNCHANGED', 'Undo restores baseline status')
  state = engine.updateSimulationParameter(state, sources, 'r1', 'routing.manning', 2)
  assert.equal(status('routing', 'r1'), 'CHANGED')
  for (const value of [0, -1, Infinity, NaN]) {
    const retained = engine.updateSimulationParameter(state, sources, 'r1', 'routing.capacity', value)
    assert.strictEqual(retained, state, 'invalid drafts never become authoritative')
  }
  state = workspace.resetSimulationParameters(state, sources)
  assert.equal(status('routing', 'r1'), 'UNCHANGED')
  for (const [kind, id, parameter, value] of [
    ['bom', 'b1', 'bom.price', 8], ['bom', 'b1', 'bom.consumption', 3], ['bom', 'b1', 'bom.loss', 0.1],
    ['routing', 'r1', 'routing.manning', 2], ['routing', 'r1', 'routing.capacity', 120], ['routing', 'r1', 'routing.yield', 0.9]
  ] as const) {
    state = engine.updateSimulationParameter(state, sources, id, parameter, value)
    assert.equal(status(kind, id), 'CHANGED', `${parameter} is a status-bearing editable parameter`)
    state = workspace.resetSimulationParameters(state, sources)
    assert.equal(status(kind, id), 'UNCHANGED')
  }
  const bomIds = dataset().snapshot.bom.map((record: { id: string }) => record.id)
  const routingIds = dataset().snapshot.routing.map((record: { id: string }) => record.id)
  const originalSnapshotOrder = dataset().snapshot.bom.map((record: { id: string }) => record.id)
  const originalCalculatedCost = engine.calculateParameterSimulation(dataset().baselineSnapshot, dataset().snapshot).afterCost
  state = workspace.setSimulationWorkingSelection(state, sources, [
    ...bomIds.map((id: string) => `bom:${id}`),
    ...routingIds.map((id: string) => `routing:${id}`)
  ])
  assert.equal(dataset().workingSelection.length, 20, 'one bulk state transition selects all 10 eligible BOM and 10 eligible Routing rows')
  assert.ok(bomIds.every((id: string) => dataset().workingSelection.includes(`bom:${id}`)))
  assert.ok(routingIds.every((id: string) => dataset().workingSelection.includes(`routing:${id}`)))
  assert.deepEqual(dataset().snapshot.bom.map((record: { id: string }) => record.id), originalSnapshotOrder,
    'selected-first presentation does not mutate effective dataset order')
  assert.deepEqual(engine.calculateParameterSimulation(dataset().baselineSnapshot, dataset().snapshot).afterCost, originalCalculatedCost,
    'working selection does not change the full calculation result')
  state = workspace.setSimulationWorkingSelection(state, sources, dataset().workingSelection.filter((key: string) => !key.startsWith('bom:')))
  assert.equal(dataset().workingSelection.length, 10, 'clearing the BOM scope preserves selected Routing rows')
  assert.ok(dataset().workingSelection.every((key: string) => key.startsWith('routing:')))
  state = workspace.setSimulationWorkingSelection(state, sources, [])
  assert.equal(dataset().workingSelection.length, 0, 'bulk deselection clears the remaining applicable selection in one transition')
  state = workspace.toggleSimulationWorkingTarget(state, sources, 'bom', 'b3')
  const effectiveDatasets = Object.fromEntries(['reference', 'current', 'custom'].map(role => [
    role, workspace.getEffectiveSimulationDataset(sources, state, role)
  ]))
  const active = effectiveDatasets[state.activeDataset]
  const markup = renderToStaticMarkup(React.createElement(SelectedValueProvider, { scopeKey: 'simulation-corrections-verifier' }, React.createElement(SimulationPage, {
    productId: 'simulation-corrections-fixture',
    state: active,
    workingSelection: active.workingSelection,
    analysisBeforeDataset: effectiveDatasets.current,
    analysisAfterDataset: effectiveDatasets.custom,
    effectiveDatasets,
    onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
    onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onSetWorkingSelection() {},
    onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
  })))
  assert.match(markup, /role="checkbox" aria-checked="mixed"/)
  assert.match(markup, /role="checkbox" aria-checked="false"/)
  assert.ok(markup.indexOf('Deselect BOM row 3: MAT-3') < markup.indexOf('Select BOM row 1: MAT-1'),
    'selected-first preserves the displayed number and record')
  assert.match(markup, /font-sans text-\[10px\] font-bold text-slate-500[^>]*>UNCHANGED/)
  assert.match(markup, /THB\/SET/)
  assert.match(markup, /style="touch-action:pan-y"/)
  assert.match(markup, /aria-label="Simulation comparison ruler"[^>]*class="[^"]*touch-none/)
  assert.match(markup, /Cost \/ Unit[\s\S]*Before[\s\S]*After[\s\S]*Change/)
  assert.doesNotMatch(markup, /Current → SIM|Reset all datasets|SIM cloned|SIM sent|SIM reset|Send blocked|Added in SIM|Removed from SIM/)
  console.log('PASS: Simulation role-local status, atomic ten-row selection, stable selected-first view, invalid edit rejection, Undo/Reset, dynamic UOM, and continuous-scroll viewport contract')
} finally {
  await vite.close()
}
