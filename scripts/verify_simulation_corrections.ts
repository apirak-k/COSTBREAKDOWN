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
  const snapshot = {
    id: 'current', product: { productCode: 'P', productDescription: 'Correction fixture', uom: 'SET', customer: '', effectiveDate: '', sellingPrice: 250, sgaPercent: 8 },
    effectiveDate: '', sourceRef: 'fixture', status: 'draft',
    rates: [{ id: 'wc', workCenterCode: 'WC', description: '', laborRate: 100, burdenRate: 50, effectiveDate: '', confidence: {} }],
    bom: [1, 2, 3].map(n => ({ id: `b${n}`, itemCode: `MAT-${n}`, description: `MAT-${n}`, consumption: 2, unit: 'SET', price: 10, loss: 0.05, confidence: {} })),
    routing: [1, 2, 3].map(n => ({ id: `r${n}`, processName: `OP-${n}`, workCenterId: 'WC', manning: 1, capacity: 100, yield: 1, confidence: {} }))
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
  for (const kind of ['bom', 'routing'] as const) {
    const records = kind === 'bom' ? dataset().snapshot.bom : dataset().snapshot.routing
    const ids = records.map((record: { id: string }) => record.id)
    for (const id of ids) state = workspace.toggleSimulationWorkingTarget(state, sources, kind, id)
    assert.ok(ids.every((id: string) => dataset().workingSelection.includes(`${kind}:${id}`)))
    for (const id of ids) state = workspace.toggleSimulationWorkingTarget(state, sources, kind, id)
    assert.equal(dataset().workingSelection.length, 0)
  }
  state = workspace.toggleSimulationWorkingTarget(state, sources, 'bom', 'b3')
  const effectiveDatasets = Object.fromEntries(['reference', 'current', 'custom'].map(role => [
    role, workspace.getEffectiveSimulationDataset(sources, state, role)
  ]))
  const active = effectiveDatasets[state.activeDataset]
  const markup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state: active,
    workingSelection: active.workingSelection,
    analysisBeforeDataset: effectiveDatasets.current,
    analysisAfterDataset: effectiveDatasets.custom,
    effectiveDatasets,
    onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
    onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {},
    onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
  }))
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
  console.log('PASS: Simulation role-local status, stable selection, invalid edit rejection, Undo/Reset, dynamic UOM, and current page contract')
} finally {
  await vite.close()
}
