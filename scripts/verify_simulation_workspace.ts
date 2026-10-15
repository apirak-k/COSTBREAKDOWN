import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  setSimulationEconomicInput,
  startSimulationFrom
} from '../src/features/simulation/simulation-state.ts'

function snapshot(id: string, price: number, laborRate: number): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [{ id: `rate-${id}`, workCenterCode: 'WC-1', description: 'WC-1', laborRate, burdenRate: 5, effectiveDate: '', confidence: {} }],
    bom: [{ id: `bom-${id}`, itemCode: 'MAT-1', description: 'Test material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }],
    routing: []
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

const productStates = { p1: currentSim, p2: startSimulationFrom('reference', initial) }
assert.deepEqual(Object.keys(retainSimulationStatesForProducts(productStates, new Set(['p1']))), ['p1'],
  'deleted products do not retain active Simulation state')

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
