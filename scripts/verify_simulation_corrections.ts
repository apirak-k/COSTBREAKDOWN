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
  let state = workspace.startSimulationFrom('custom', sources)
  const status = (kind: string, id: string) => workspace.simulationParameterStatus(kind, id, state.snapshot, state.resetBaselineSnapshot)
  assert.equal(status('bom', 'b1'), 'UNCHANGED', 'clone differs from Current but is unchanged against its own baseline')
  for (const [kind, id] of [['bom', 'b3'], ['routing', 'r2']]) {
    state = workspace.toggleSimulationWorkingTarget(state, snapshot, kind, id)
    assert.ok(state.workingSelection.includes(`${kind}:${id}`))
    state = workspace.toggleSimulationWorkingTarget(state, snapshot, kind, id)
    assert.ok(!state.workingSelection.includes(`${kind}:${id}`), 'repeat activation targets the same stable record')
  }
  const before = history.captureSimulationEditableSnapshot(snapshot, state)
  state = engine.updateSimulationParameter(state, snapshot, 'b1', 'bom.price', 8)
  assert.equal(status('bom', 'b1'), 'CHANGED')
  state = history.applySimulationEditableSnapshot(snapshot, state, before)
  assert.equal(status('bom', 'b1'), 'UNCHANGED', 'Undo restores baseline status')
  state = engine.updateSimulationParameter(state, snapshot, 'r1', 'routing.manning', 2)
  assert.equal(status('routing', 'r1'), 'CHANGED')
  for (const value of [0, -1, Infinity, NaN]) {
    const retained = engine.updateSimulationParameter(state, snapshot, 'r1', 'routing.capacity', value)
    assert.strictEqual(retained, state, 'invalid drafts never become authoritative')
  }
  state = workspace.resetSimulationParameters(state)
  assert.equal(status('routing', 'r1'), 'UNCHANGED')
  for (const [kind, id, parameter, value] of [
    ['bom', 'b1', 'bom.price', 8], ['bom', 'b1', 'bom.consumption', 3], ['bom', 'b1', 'bom.loss', 0.1],
    ['routing', 'r1', 'routing.manning', 2], ['routing', 'r1', 'routing.capacity', 120], ['routing', 'r1', 'routing.yield', 0.9]
  ] as const) {
    state = engine.updateSimulationParameter(state, snapshot, id, parameter, value)
    assert.equal(status(kind, id), 'CHANGED', `${parameter} is a status-bearing editable parameter`)
    state = workspace.resetSimulationParameters(state)
    assert.equal(status(kind, id), 'UNCHANGED')
  }
  for (const kind of ['bom', 'routing'] as const) {
    const ids = state.snapshot[kind].map((record: { id: string }) => record.id)
    for (const id of ids) state = workspace.toggleSimulationWorkingTarget(state, snapshot, kind, id)
    assert.ok(ids.every((id: string) => state.workingSelection.includes(`${kind}:${id}`)))
    for (const id of ids) state = workspace.toggleSimulationWorkingTarget(state, snapshot, kind, id)
    assert.equal(state.workingSelection.length, 0)
  }
  const markup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state, workingSelection: ['bom:b3'], currentSnapshot: snapshot, referenceSnapshot: snapshot,
    onCloneSource() {}, onSendTo() { return true }, onReset() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
  }))
  assert.match(markup, /role="checkbox" aria-checked="mixed"/)
  assert.match(markup, /role="checkbox" aria-checked="false"/)
  assert.ok(markup.indexOf('Deselect BOM row 3: MAT-3') < markup.indexOf('Select BOM row 1: MAT-1'), 'selected-first preserves the displayed number and record')
  assert.match(markup, /font-sans text-\[10px\] font-bold text-slate-500[^>]*>UNCHANGED/)
  assert.doesNotMatch(markup, /SIM cloned|SIM sent|SIM reset|Send blocked|Added in SIM|Removed from SIM/)
  assert.match(markup, /THB\/SET/)
  assert.match(markup, /style="touch-action:pan-y"/)
  assert.match(markup, /aria-label="Simulation comparison ruler"[^>]*class="[^"]*touch-none/)
  console.log('PASS: Simulation baseline status, stable selection, mixed header, invalid edit rejection, Undo/Reset, dynamic UOM, and feedback contract')
} finally {
  await vite.close()
}
