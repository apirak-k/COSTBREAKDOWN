import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  resetSimulationParameters,
  simulationWorkingTargetKey,
  setSimulationEconomicInput,
  startSimulationFrom,
  toggleSimulationWorkingTarget
} from '../src/features/simulation/simulation-state.ts'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'

function snapshot(id: string, price: number, laborRate: number): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [{ id: `rate-${id}`, workCenterCode: 'WC-1', description: 'WC-1', laborRate, burdenRate: 5, effectiveDate: '', confidence: {} }],
    bom: [
      { id: `bom-${id}`, itemCode: 'MAT-1', description: 'Test material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} },
      { id: `bom-extra-${id}`, itemCode: 'MAT-2', description: 'Second material', consumption: 2, unit: 'PC', price: 3, loss: 0, confidence: {} }
    ],
    routing: [{
      id: `route-${id}`, processName: 'Assembly', workCenterId: 'WC-1', manning: 1,
      capacity: 10, yield: 1, confidence: {}
    }]
  }
}

function sources(referencePrice = 10, currentPrice = 12, customPrice = 14): Record<MasterDataRole, CostSnapshot> {
  return {
    reference: snapshot('reference', referencePrice, 10),
    current: snapshot('current', currentPrice, 20),
    custom: snapshot('custom', customPrice, 30)
  }
}

const initial = sources()
const referenceSim = startSimulationFrom('reference', initial, '2026-10-09T02:00:00.000Z')
assert.equal(referenceSim.sourceRole, 'reference')
assert.equal(referenceSim.snapshot?.id, 'reference')
assert.equal(referenceSim.snapshot?.rates[0]?.laborRate, 20, 'every cloned source uses Current Work Center rates')
assert.notStrictEqual(referenceSim.snapshot, initial.reference, 'SIM owns an isolated snapshot copy')
assert.notStrictEqual(referenceSim.snapshot?.bom[0], initial.reference.bom[0], 'SIM row edits cannot mutate the source row')
if (referenceSim.snapshot) referenceSim.snapshot.bom[0].price = 99
assert.equal(initial.reference.bom[0].price, 10, 'editing SIM leaves Reference Working unchanged')
assert.equal(reconcileSimulationState(referenceSim, initial), referenceSim, 'an unchanged Current basis preserves SIM')

const changedReferenceSources = sources(11)
assert.strictEqual(reconcileSimulationState(referenceSim, changedReferenceSources), referenceSim,
  'Reference changes alone do not invalidate the copied SIM')
const changedCustomSources = sources(10, 12, 99)
assert.strictEqual(reconcileSimulationState(referenceSim, changedCustomSources), referenceSim,
  'Custom changes alone do not invalidate the copied SIM')
const changedCurrent = reconcileSimulationState(referenceSim, sources(10, 13))
assert.equal(changedCurrent.snapshot, null, 'a Current baseline change invalidates the prior SIM')

let withEconomics = setSimulationEconomicInput(referenceSim, 'fixedActionCost', '100000')
withEconomics = setSimulationEconomicInput(withEconomics, 'variableActionCostPerPiece', '1.25')
withEconomics = setSimulationEconomicInput(withEconomics, 'batchSize', '100')
assert.equal(withEconomics.economicInputs.fixedActionCost, '100000')
assert.equal(referenceSim.economicInputs.fixedActionCost, '', 'economic edits do not mutate prior workspace state')
const changedCurrentWithEconomics = reconcileSimulationState(withEconomics, sources(10, 13))
assert.equal(changedCurrentWithEconomics.snapshot, null)
assert.equal(changedCurrentWithEconomics.economicInputs.fixedActionCost, '100000', 'Current reset preserves valid economic drafts')
assert.equal(changedCurrentWithEconomics.economicInputs.batchSize, '100')

const changedReferenceWithEconomics = reconcileSimulationState(withEconomics, changedReferenceSources)
assert.strictEqual(changedReferenceWithEconomics, withEconomics, 'Reference edits preserve SIM and economic draft')
const changedCustomWithEconomics = reconcileSimulationState(withEconomics, changedCustomSources)
assert.strictEqual(changedCustomWithEconomics, withEconomics, 'Custom edits preserve SIM and economic draft')

const { economicInputs: _removed, ...legacyState } = withEconomics
const upgradedLegacyState = reconcileSimulationState(legacyState as typeof withEconomics, initial)
assert.deepEqual(upgradedLegacyState.economicInputs, createEmptySimulationState().economicInputs,
  'older Simulation state gains the new blank economic draft')

const legacyEconomicState = {
  ...withEconomics,
  economicInputs: {
    actionCost: '1200', evaluationQuantity: '50', sellingPriceOverride: '90', sgaPercentOverride: '10', selectedFactors: ['bom.price']
  },
  selectedFactors: ['bom.price']
} as unknown as typeof withEconomics
const migratedLegacyState = reconcileSimulationState(legacyEconomicState, initial)
assert.equal(migratedLegacyState.economicInputs.fixedActionCost, '1200', 'legacy Action Cost maps to Fixed Action Cost')
assert.equal(migratedLegacyState.economicInputs.batchSize, '50', 'legacy Evaluation Quantity maps to Batch Size')
assert.equal(migratedLegacyState.economicInputs.sellingPriceOverride, '90')
assert.equal(migratedLegacyState.economicInputs.sgaPercentOverride, '10')
assert.equal('selectedFactors' in migratedLegacyState, false, 'legacy factor selection is discarded')

const invalidLegacyEconomicState = {
  ...legacyEconomicState,
  economicInputs: { ...legacyEconomicState.economicInputs, sgaPercentOverride: '101', batchSize: '0' }
} as typeof legacyEconomicState
const sanitizedLegacyState = reconcileSimulationState(invalidLegacyEconomicState, initial)
assert.equal(sanitizedLegacyState.economicInputs.sgaPercentOverride, '', 'invalid legacy SG&A is not admitted into active state')
assert.equal(sanitizedLegacyState.economicInputs.batchSize, '', 'zero legacy Batch Size is discarded')

const customSim = startSimulationFrom('custom', initial)
assert.equal(customSim.sourceRole, 'custom')
assert.equal(customSim.snapshot?.bom[0]?.price, 14)
assert.equal(customSim.snapshot?.rates[0]?.laborRate, 20)
const currentSim = startSimulationFrom('current', initial)
assert.equal(currentSim.snapshot?.bom[0]?.price, 12)
assert.deepEqual(currentSim.workingSelection, [], 'Current clone starts with no selected working rows')
assert.deepEqual(currentSim.resetBaselineSnapshot, currentSim.snapshot, 'Current clone captures the initial SIM parameters as its reset baseline')
assert.notStrictEqual(currentSim.resetBaselineSnapshot, currentSim.snapshot, 'the reset baseline is isolated from live SIM edits')
assert.notStrictEqual(currentSim.resetBaselineSnapshot?.bom[0], currentSim.snapshot?.bom[0])

const currentCalculation = calculateParameterSimulation(initial.current, currentSim.snapshot!)
assert.equal(currentCalculation.records.filter(row => row.kind === 'bom').length, 2)
assert.equal(currentCalculation.records.filter(row => row.kind === 'routing').length, 1)
const selectedCurrentSim = toggleSimulationWorkingTarget(currentSim, 'bom', currentSim.snapshot!.bom[0].id)
const bomSelectionKey = simulationWorkingTargetKey('bom', currentSim.snapshot!.bom[0].id)
assert.deepEqual(selectedCurrentSim.workingSelection, [bomSelectionKey], 'BOM selection uses a kind-qualified record key')
assert.strictEqual(selectedCurrentSim.snapshot, currentSim.snapshot, 'selecting a working row does not clone or edit the SIM snapshot')
assert.strictEqual(selectedCurrentSim.resetBaselineSnapshot, currentSim.resetBaselineSnapshot, 'selection does not alter the Reset baseline')
assert.equal(selectedCurrentSim.basisFingerprint, currentSim.basisFingerprint, 'selection does not change the Current source fingerprint')
assert.strictEqual(reconcileSimulationState(selectedCurrentSim, initial), selectedCurrentSim,
  'reconciliation keeps valid selection without invalidating or rewriting the source basis')
assert.strictEqual(toggleSimulationWorkingTarget(selectedCurrentSim, 'bom', 'not-in-sim'), selectedCurrentSim,
  'an unknown record cannot enter the working selection')
const selectedBOMAndRouting = toggleSimulationWorkingTarget(selectedCurrentSim, 'routing', currentSim.snapshot!.routing[0].id)
const routingSelectionKey = simulationWorkingTargetKey('routing', currentSim.snapshot!.routing[0].id)
assert.deepEqual(selectedBOMAndRouting.workingSelection, [bomSelectionKey, routingSelectionKey],
  'routing selection remains distinct from BOM selection for the same workspace')
const selectedCalculation = calculateParameterSimulation(initial.current, selectedBOMAndRouting.snapshot!)
assert.equal(selectedCalculation.records.length, 3, 'selecting one BOM and one RTG row does not filter the full calculation')
assert.deepEqual(selectedCalculation.records, currentCalculation.records, 'all BOM and RTG rows remain in the comparison after selection')
assert.deepEqual(selectedCalculation.simulationCost, currentCalculation.simulationCost,
  'working selection has no effect on calculated SIM cost')
const invalidSelection = reconcileSimulationState({
  ...selectedBOMAndRouting,
  workingSelection: [...selectedBOMAndRouting.workingSelection, 'bom:missing-record']
}, initial)
assert.deepEqual(invalidSelection.workingSelection, selectedBOMAndRouting.workingSelection,
  'source reconciliation prunes stale working-record keys while retaining valid ones')
assert.strictEqual(reconcileSimulationState(selectedBOMAndRouting, changedReferenceSources), selectedBOMAndRouting,
  'Reference changes preserve Current basis and local selection')
assert.strictEqual(reconcileSimulationState(selectedBOMAndRouting, changedCustomSources), selectedBOMAndRouting,
  'Custom changes preserve Current basis and local selection')
const currentInvalidatesSelection = reconcileSimulationState(selectedBOMAndRouting, sources(10, 13))
assert.equal(currentInvalidatesSelection.snapshot, null, 'a Current change invalidates the prior SIM even when rows are selected')
assert.deepEqual(currentInvalidatesSelection.workingSelection, [], 'Current invalidation clears stale working selection')

const editedCurrentSim = updateSimulationParameter(
  selectedBOMAndRouting,
  initial.current,
  currentSim.snapshot!.bom[0].id,
  'bom.price',
  7.5
)
assert.equal(editedCurrentSim.snapshot?.bom[0]?.price, 7.5, 'a direct parameter edit changes only the live SIM snapshot')
assert.equal(editedCurrentSim.resetBaselineSnapshot?.bom[0]?.price, 12, 'direct edits do not replace the reset baseline')
assert.deepEqual(editedCurrentSim.workingSelection, selectedBOMAndRouting.workingSelection,
  'direct parameter edits preserve the local working selection')
assert.equal(initial.current.bom[0].price, 12, 'direct parameter edits do not mutate the Current source')

const editedWithEconomicInputs = setSimulationEconomicInput(
  setSimulationEconomicInput(editedCurrentSim, 'fixedActionCost', '500'),
  'batchSize',
  '25'
)
const resetCurrentSim = resetSimulationParameters(editedWithEconomicInputs)
assert.deepEqual(resetCurrentSim.snapshot, currentSim.resetBaselineSnapshot, 'Reset restores every live parameter to the clone-time baseline')
assert.notStrictEqual(resetCurrentSim.snapshot, resetCurrentSim.resetBaselineSnapshot, 'reset returns a mutable SIM copy separate from the saved baseline')
assert.deepEqual(resetCurrentSim.economicInputs, editedWithEconomicInputs.economicInputs, 'Reset leaves Economic inputs unchanged')
assert.strictEqual(resetCurrentSim.resetBaselineSnapshot, editedWithEconomicInputs.resetBaselineSnapshot, 'Reset keeps the current clone baseline')
assert.deepEqual(resetCurrentSim.workingSelection, editedWithEconomicInputs.workingSelection,
  'Reset restores parameters but retains the local working selection')
assert.equal(initial.current.bom[0].price, 12, 'reset never writes parameter values back to Current')
assert.strictEqual(resetSimulationParameters(currentSim), currentSim, 'Reset is an identity operation when no parameters changed')

const reclonedAfterEdit = startSimulationFrom('custom', initial, '2026-10-09T02:05:00.000Z', editedWithEconomicInputs.economicInputs)
assert.equal(reclonedAfterEdit.snapshot?.bom[0]?.price, 14, 're-cloning replaces the edited SIM values with the selected source')
assert.deepEqual(reclonedAfterEdit.resetBaselineSnapshot, reclonedAfterEdit.snapshot, 're-clone captures a new reset baseline')
assert.notDeepEqual(reclonedAfterEdit.resetBaselineSnapshot, currentSim.resetBaselineSnapshot, 're-clone replaces the prior baseline')
assert.deepEqual(reclonedAfterEdit.economicInputs, editedWithEconomicInputs.economicInputs, 're-cloning keeps Economic inputs')
assert.deepEqual(reclonedAfterEdit.workingSelection, [], 're-cloning clears the previous source selection')
assert.equal(reclonedAfterEdit.snapshot?.rates[0]?.laborRate, 20, 're-clone still uses the current Work Center rates')

const { resetBaselineSnapshot: _legacyBaseline, ...legacyWithoutBaseline } = editedWithEconomicInputs
const migratedBaselineState = reconcileSimulationState(legacyWithoutBaseline as typeof editedWithEconomicInputs, initial)
assert.deepEqual(migratedBaselineState.snapshot, editedWithEconomicInputs.snapshot, 'legacy SIM parameters are preserved during baseline migration')
assert.deepEqual(migratedBaselineState.resetBaselineSnapshot, editedWithEconomicInputs.snapshot,
  'a legacy workspace without a baseline adopts its existing SIM snapshot as the reset baseline')
assert.notStrictEqual(migratedBaselineState.resetBaselineSnapshot, migratedBaselineState.snapshot,
  'migrated baseline is copied so later direct edits cannot mutate it')
assert.strictEqual(resetSimulationParameters(migratedBaselineState), migratedBaselineState,
  'Reset after legacy migration preserves parameters when the adopted baseline is already current')
assert.equal(initial.custom.bom[0].price, 14, 'Current and Custom source snapshots remain unchanged after editing, resetting, and re-cloning')
const { workingSelection: _legacySelection, ...legacyStateWithoutSelection } = selectedBOMAndRouting
const migratedSelectionState = reconcileSimulationState(legacyStateWithoutSelection as typeof selectedBOMAndRouting, initial)
assert.deepEqual(migratedSelectionState.workingSelection, [], 'legacy workspaces without selection migrate to an empty selection')

for (const [field, invalid] of [
  ['fixedActionCost', '-1'],
  ['variableActionCostPerPiece', 'Infinity'],
  ['batchSize', '0'],
  ['batchSize', '1.5'],
  ['sellingPriceOverride', 'NaN'],
  ['sgaPercentOverride', '101']
] as const) {
  const state = setSimulationEconomicInput(currentSim, field, invalid)
  assert.strictEqual(state, currentSim, `${field} rejects ${invalid} at the state boundary`)
}

const invalidLegacyRole = reconcileSimulationState({
  ...currentSim,
  sourceRole: 'trial' as unknown as MasterDataRole,
  selectedFactors: ['bom.price']
}, initial)
assert.deepEqual(invalidLegacyRole, createEmptySimulationState(),
  'an incompatible legacy Trial/source state is sanitized instead of reinterpreted as a valid SIM')
const incompleteStoredSimulation = reconcileSimulationState({ ...currentSim, snapshot: null }, initial)
assert.deepEqual(incompleteStoredSimulation, createEmptySimulationState(), 'a legacy SIM missing its isolated snapshot is discarded')
const noFingerprintSimulation = reconcileSimulationState({ ...currentSim, basisFingerprint: null }, initial)
assert.deepEqual(noFingerprintSimulation, createEmptySimulationState(), 'a legacy SIM with no Current basis is discarded')

const productStates = { p1: selectedBOMAndRouting, p2: startSimulationFrom('reference', initial) }
assert.deepEqual(productStates.p2.workingSelection, [], 'each product has an independent local working selection')
const retainedProductStates = retainSimulationStatesForProducts(productStates, new Set(['p1']))
assert.deepEqual(Object.keys(retainedProductStates), ['p1'],
  'deleted products do not retain active Simulation state')
assert.strictEqual(retainedProductStates.p1, selectedBOMAndRouting, 'a retained product keeps its own selected rows')

const storeSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const routerSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(storeSource, /normalizeActiveTab\(loadFromSession<unknown>\(STORAGE_KEYS\.ACTIVE_TAB, 'master'\)\)/)
assert.match(routerSource, /activeTab === 'simulation' && !reconciledSimulationState\.snapshot[\s\S]*?startSimulationFrom\('current'/,
  'entering Simulation automatically initializes an absent or stale SIM from Current')
assert.match(routerSource, /simulationStatesByProduct\[activeProductId\]/, 'workspace state is scoped to active product')
assert.match(routerSource, /activeTab === 'simulation'[\s\S]*?<SimulationPage/)
assert.doesNotMatch(storeSource + routerSource, /RCA_SIMULATION_STATES|trialHandoffLetter|selectedScenarioLetter/,
  'legacy Trial/A-B Simulation state is not loaded by active application routing')

const sendStart = storeSource.indexOf('const sendSimulationSnapshotToMasterData =')
const sendEnd = storeSource.indexOf('const updateMasterDataDatasetSizing =', sendStart)
const sendBody = storeSource.slice(sendStart, sendEnd)
assert.ok(sendStart >= 0 && sendEnd > sendStart, 'Simulation Send to has a bounded store implementation')
assert.match(sendBody, /cloneCostSnapshot\(snapshot\)/, 'Send to copies the whole SIM snapshot')
assert.match(sendBody, /rates\.length[\s\S]*bom\.length[\s\S]*routing\.length/, 'Send to reconciles all destination sizing counts')
assert.match(sendBody, /isMasterDataSnapshotChangeValid\(currentDataset, nextDataset\)/,
  'Send to rejects an invalid destination Working snapshot')
assert.match(sendBody, /role === 'custom'[\s\S]*?setMasterDataSnapshot\(session, pair, role, nextDataset\)/,
  'Custom receives the snapshot through only its Working dataset path')
assert.match(sendBody, /const nextPair = \{ \.\.\.pair, \[role\]: nextDataset \}/,
  'Reference and Current sends replace only the selected snapshot-pair member')
assert.match(sendBody, /commitMasterDataWorkingSession\(session, updated, role\)/,
  'Send to participates in the Master Data Working history lifecycle')
assert.doesNotMatch(sendBody, /lastSavedMasterData|lastSavedSnapshot|\.lastSaved\s*=/,
  'Send to never directly mutates Last Saved data')
assert.match(routerSource, /onSendTo=\{\(role: MasterDataRole, snapshot: CostSnapshot\) => sendSimulationSnapshotToMasterData\(role, snapshot\)\}/,
  'Simulation page routes each explicit destination to the store Send to operation')

console.log('Current-baseline Simulation workspace verification passed')
