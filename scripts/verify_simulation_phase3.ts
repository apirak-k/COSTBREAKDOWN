import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import { calculateEconomicSimulation } from '../src/features/simulation/simulation-economics.ts'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import {
  captureSimulationEditableSnapshot,
  clearSimulationHistory,
  createSimulationHistory,
  recordSimulationHistory
} from '../src/features/simulation/simulation-history.ts'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  prepareSimulationSend,
  prepareSimulationSendAll,
  reconcileSimulationState,
  resetAllSimulationParameters,
  resetSimulationParameters,
  setSimulationActiveDataset,
  setSimulationComparison,
  setSimulationEconomicInput
} from '../src/features/simulation/simulation-state.ts'

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

function snapshot(role: MasterDataRole, index: number): CostSnapshot {
  return {
    id: `master-${role}`,
    product: {
      productCode: 'PRODUCT-1',
      productDescription: 'Phase 3 verifier',
      uom: 'PC',
      customer: '',
      effectiveDate: '',
      sellingPrice: 100 + index,
      sgaPercent: 8 + index
    },
    effectiveDate: '',
    sourceRef: `source-${role}`,
    status: 'active',
    rates: [{
      id: `rate-${role}`,
      workCenterCode: 'WC-1',
      description: role,
      laborRate: 10 * (index + 1),
      burdenRate: 5 * (index + 1),
      effectiveDate: '',
      confidence: {}
    }],
    bom: [{
      id: `bom-${role}`,
      itemCode: 'MAT-1',
      description: 'Shared material',
      consumption: index + 1,
      unit: 'PC',
      price: 10 * (index + 1),
      loss: 0,
      confidence: {}
    }],
    routing: [{
      id: `routing-${role}`,
      processName: 'Shared process',
      workCenterId: 'WC-1',
      manning: 1,
      capacity: 10,
      yield: 1,
      confidence: {}
    }]
  }
}

const currentSnapshot = snapshot('current', 1)
currentSnapshot.bom.push({
  id: 'bom-current-only',
  itemCode: 'MAT-CURRENT-ONLY',
  description: 'Current-only material',
  consumption: 1,
  unit: 'PC',
  price: 7,
  loss: 0,
  confidence: {}
})
const sources: Record<MasterDataRole, CostSnapshot> = {
  reference: snapshot('reference', 0),
  current: currentSnapshot,
  custom: snapshot('custom', 2)
}
const close = (actual: number | null | undefined, expected: number, message: string) =>
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, received ${String(actual)}`)
const view = (state: ReturnType<typeof createEmptySimulationState>, role: MasterDataRole) =>
  getEffectiveSimulationDataset(sources, state, role)

let state = createEmptySimulationState(sources)
assert.deepEqual(
  [state.activeDataset, state.comparisonBefore, state.comparisonAfter],
  ['custom', 'current', 'custom'],
  'fresh Simulation opens on Custom with Current → Custom comparison'
)
assert.deepEqual(Object.keys(state.datasets).sort(), [...roles].sort(), 'persistent Simulation state has only the three Master Data roles')
for (const role of roles) {
  state = setSimulationActiveDataset(state, role)
  assert.equal(state.activeDataset, role, `${role} can own the parameter editor`)
}

state = setSimulationComparison(setSimulationActiveDataset(state, 'current'), 'reference', 'custom')
state = updateSimulationParameter(state, sources, 'bom-reference', 'bom.price', 11, 'reference')
state = updateSimulationParameter(state, sources, 'routing-current', 'routing.capacity', 5)
state = updateSimulationParameter(state, sources, 'bom-custom', 'bom.consumption', 2, 'custom')
assert.equal(state.activeDataset, 'current')
assert.deepEqual([state.comparisonBefore, state.comparisonAfter], ['reference', 'custom'],
  'parameter edits do not move the independent comparison pair')
assert.equal(view(state, 'reference').snapshot.bom[0].price, 11)
assert.equal(view(state, 'current').snapshot.routing[0].capacity, 5)
assert.equal(view(state, 'custom').snapshot.bom[0].consumption, 2)
assert.equal(view(state, 'reference').snapshot.bom[0].consumption, sources.reference.bom[0].consumption,
  'Reference override stays role-local')
assert.equal(view(state, 'current').snapshot.bom[0].price, sources.current.bom[0].price,
  'Current override stays role-local')
assert.equal(view(state, 'custom').snapshot.routing[0].capacity, sources.custom.routing[0].capacity,
  'Custom override stays role-local')
assert.deepEqual(view(state, 'reference').snapshot.rates, sources.reference.rates)
assert.deepEqual(view(state, 'current').snapshot.rates, sources.current.rates)
assert.deepEqual(view(state, 'custom').snapshot.rates, sources.custom.rates)

const { SimulationPage } = await import('../src/features/simulation/SimulationPage.tsx')
const referenceEditor = setSimulationActiveDataset(createEmptySimulationState(sources), 'reference')
const referenceEditorView = view(referenceEditor, 'reference')
const tableMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
  state: referenceEditorView,
  workingSelection: referenceEditorView.workingSelection,
  analysisBeforeDataset: view(referenceEditor, 'reference'),
  analysisAfterDataset: view(referenceEditor, 'current'),
  effectiveDatasets: Object.fromEntries(roles.map(role => [role, view(referenceEditor, role)])),
  onSelectActiveDataset() {},
  onChangeComparison() {},
  onSend() {},
  onSendAll() {},
  onReset() {},
  onResetAll() {},
  onUpdateParameter() {},
  onToggleWorkingTarget() {},
  onSetWorkingSelection() {},
  onUpdateEconomicInput() {},
  onBeginEdit() {},
  onCommitEdit() {}
}))
const referenceBomTable = tableMarkup.match(/<section data-simulation-table="bom"[\s\S]*?<\/section>/)?.[0] ?? ''
assert.ok(referenceBomTable, 'Reference active dataset renders its BOM editor')
assert.doesNotMatch(referenceBomTable, /Current-only material/,
  'active Reference table rows do not inherit Current-only structure')
assert.match(referenceBomTable, /Shared material[\s\S]*?UNCHANGED/,
  'active Reference parameter status compares against the selected Reference baseline')

const simulationPageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
assert.match(simulationPageSource, /calculateParameterSimulation\(state\.baselineSnapshot, simulationSnapshot\)/,
  'active parameter rows and Cost Effect rows are calculated from the selected role baseline')
assert.match(simulationPageSource, /bomAttribution\(row, baselineSnapshot, simulationSnapshot\)/,
  'BOM Cost Effect attribution receives the selected role baseline')
assert.match(simulationPageSource, /routingAttribution\(row, baselineSnapshot, simulationSnapshot\)/,
  'Routing Cost Effect attribution receives the selected role baseline and its Work Center rates')
assert.match(simulationPageSource,
  /calculateSnapshotRoutingDetail\(\s*\{ reference: baselineRecord, current: simRecord \},\s*baselineSnapshot\.rates,\s*simulationSnapshot\.rates/,
  'Routing Cost Effect calculation uses the selected role rates on its baseline side')

const result = calculateParameterSimulation(view(state, 'reference').snapshot, view(state, 'custom').snapshot)
close(result.beforeCost.material, 11, 'Result Before uses effective Reference')
close(result.afterCost.material, 60, 'Result After uses effective Custom')
close(result.beforeCost.labor, 1, 'Reference calculation uses Reference labor rates')
close(result.afterCost.labor, 3, 'Custom calculation uses Custom labor rates')
close(result.beforeCost.total, 12.5, 'effective Reference total')
close(result.afterCost.total, 64.5, 'effective Custom total')
close(result.afterCost.total! - result.beforeCost.total!, 52, 'Result gap direction is After minus Before')
const activeMoved = setSimulationActiveDataset(state, 'reference')
assert.deepEqual([activeMoved.comparisonBefore, activeMoved.comparisonAfter], ['reference', 'reference'],
  'changing activeDataset preserves Result Before and synchronizes Result After')
const activeMovedResult = calculateParameterSimulation(
  view(activeMoved, activeMoved.comparisonBefore).snapshot,
  view(activeMoved, activeMoved.comparisonAfter).snapshot
)
assert.deepEqual(activeMovedResult.beforeCost, result.beforeCost,
  'changing activeDataset preserves the effective Result Before values')
assert.deepEqual(activeMovedResult.afterCost, result.beforeCost,
  'selecting Reference makes Result After use the effective Reference values')
for (const before of roles) {
  for (const after of roles) {
    const compared = setSimulationComparison(activeMoved, before, after)
    assert.deepEqual([compared.comparisonBefore, compared.comparisonAfter], [before, after],
      `${before} → ${after} remains a valid comparison pair`)
    assert.equal(compared.activeDataset, 'reference',
      `changing comparison roles to ${before} → ${after} leaves activeDataset unchanged`)
    if (before === after) {
      const selfResult = calculateParameterSimulation(view(compared, before).snapshot, view(compared, after).snapshot)
      close(selfResult.afterCost.total! - selfResult.beforeCost.total!, 0,
        `${before} self-comparison gap is zero`)
    }
  }
}

const customBeforeEconomicEdit = captureSimulationEditableSnapshot(sources, state, 'custom')
state = setSimulationEconomicInput(state, 'sellingPriceOverride', '777', 'custom')
state = setSimulationEconomicInput(state, 'sgaPercentOverride', '17', 'custom')
state = setSimulationEconomicInput(state, 'batchSize', '50', 'custom')
const customAfterEconomicEdit = captureSimulationEditableSnapshot(sources, state, 'custom')
const customHistory = recordSimulationHistory(
  createSimulationHistory(view(state, 'custom').basisFingerprint), customBeforeEconomicEdit, customAfterEconomicEdit
)
const currentHistory = recordSimulationHistory(
  createSimulationHistory(view(state, 'current').basisFingerprint),
  captureSimulationEditableSnapshot(sources, createEmptySimulationState(sources), 'current'),
  captureSimulationEditableSnapshot(sources, state, 'current')
)
assert.equal(customHistory.undo.length, 1, 'After-role economic edits belong to Custom history')
assert.equal(currentHistory.undo.length, 1, 'active Current parameter edit belongs to Current history')
assert.equal(state.activeDataset, 'current', 'economic edits do not change parameter editor ownership')
const customEconomics = calculateEconomicSimulation(
  view(state, 'custom').snapshot,
  result.afterCost,
  result.parameterSavingPerPiece,
  view(state, 'custom').economicInputs
)
assert.equal(customEconomics.business.sellingPrice, 777, 'Economic evaluation reads the After role draft')
assert.equal(customEconomics.business.sgaPercent, 17, 'SG&A evaluation reads the After role draft')
close(customEconomics.business.operatingProfitPerPiece, 777 - 64.5 - 777 * 0.17,
  'Economic evaluation uses effective After cost and Selling Price')

state = setSimulationEconomicInput(state, 'fixedActionCost', '10000', 'current')
state = setSimulationEconomicInput(state, 'variableActionCostPerPiece', '2.50', 'current')
state = setSimulationEconomicInput(state, 'batchSize', '500', 'current')
state = setSimulationEconomicInput(state, 'sellingPriceOverride', '135', 'current')
state = setSimulationEconomicInput(state, 'sgaPercentOverride', '10', 'current')
const beforeReset = [state.comparisonBefore, state.comparisonAfter]
const currentDefaultDraft = view(createEmptySimulationState(sources), 'current').economicInputs
const resetActive = resetSimulationParameters(state, sources)
assert.equal(resetActive.activeDataset, 'current', 'active Reset leaves activeDataset unchanged')
assert.deepEqual([resetActive.comparisonBefore, resetActive.comparisonAfter], beforeReset,
  'active Reset does not move the comparison pair')
assert.equal(view(resetActive, 'current').snapshot.routing[0].capacity, sources.current.routing[0].capacity,
  'Reset clears the active Current parameter override')
assert.equal(view(resetActive, 'reference').snapshot.bom[0].price, 11,
  'Reset preserves the unrelated Reference override')
assert.equal(view(resetActive, 'custom').snapshot.bom[0].consumption, 2,
  'Reset preserves the unrelated Custom override')
assert.deepEqual(view(resetActive, 'current').economicInputs, currentDefaultDraft,
  'Reset clears Current fixed/variable/batch inputs and restores its Master-backed Selling Price and SG&A')
assert.equal(view(resetActive, 'current').economicInputs.fixedActionCost, '')
assert.equal(view(resetActive, 'current').economicInputs.variableActionCostPerPiece, '')
assert.equal(view(resetActive, 'current').economicInputs.batchSize, '')
assert.deepEqual(view(resetActive, 'custom').economicInputs, view(state, 'custom').economicInputs,
  'Reset leaves the other roles\' economic drafts untouched')

const resetAll = resetAllSimulationParameters(state, sources)
for (const role of roles) {
  assert.deepEqual(view(resetAll, role).snapshot, sources[role], `Reset All clears only ${role} parameter overrides`)
  assert.deepEqual(view(resetAll, role).economicInputs, view(createEmptySimulationState(sources), role).economicInputs,
    `Reset All restores ${role} Master-backed economics and clears Simulation-only inputs`)
}
assert.deepEqual([resetAll.activeDataset, resetAll.comparisonBefore, resetAll.comparisonAfter], ['custom', 'current', 'custom'],
  'Reset All restores the canonical Custom / Current → Custom context')

const changedCurrent = {
  ...sources,
  current: { ...sources.current, bom: [{ ...sources.current.bom[0], price: 25 }] }
}
const rebased = reconcileSimulationState(state, changedCurrent)
assert.equal(getEffectiveSimulationDataset(changedCurrent, rebased, 'current').snapshot.routing[0].capacity,
  changedCurrent.current.routing[0].capacity, 'Master Current change rebases Current overrides')
assert.equal(getEffectiveSimulationDataset(changedCurrent, rebased, 'reference').snapshot.bom[0].price, 11,
  'Master Current rebase preserves Reference override')
assert.equal(getEffectiveSimulationDataset(changedCurrent, rebased, 'custom').snapshot.bom[0].consumption, 2,
  'Master Current rebase preserves Custom override')
const currentRebasedHistory = clearSimulationHistory(
  currentHistory,
  getEffectiveSimulationDataset(changedCurrent, rebased, 'current').basisFingerprint
)
const customHistoryBasisAfterRebase = getEffectiveSimulationDataset(changedCurrent, rebased, 'custom').basisFingerprint
const customRetainedHistory = customHistory.basisFingerprint === customHistoryBasisAfterRebase
  ? customHistory
  : clearSimulationHistory(customHistory, customHistoryBasisAfterRebase)
assert.equal(currentRebasedHistory.undo.length, 0, 'a changed role basis invalidates only its dependent history')
assert.strictEqual(customRetainedHistory, customHistory, 'unrelated Custom history remains valid after Current rebase')

for (const role of roles) {
  const selected = setSimulationActiveDataset(state, role)
  const payload = prepareSimulationSend(selected, sources)
  assert.equal(payload.role, role, `Send maps ${role} to its same-role Master Working dataset`)
  assert.deepEqual(payload.snapshot.rates, sources[role].rates, `Send ${role} carries its own rates`)
}
const sendAll = prepareSimulationSendAll(state, sources)
assert.deepEqual(Object.keys(sendAll).sort(), [...roles].sort(), 'Send All contains exactly Reference, Current, and Custom')
for (const role of roles) {
  assert.deepEqual(sendAll[role].rates, sources[role].rates, `Send All maps ${role} to its same-role Working data`)
}

console.log('PASS: Phase 3 Simulation state, economics, role-local history, Reset, rebase, and same-role Send preparation')
