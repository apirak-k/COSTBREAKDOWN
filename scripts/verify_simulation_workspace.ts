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
import { calculateEconomicSimulation } from '../src/features/simulation/simulation-economics.ts'

function snapshot(id: string, price: number, laborRate: number): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '', sellingPrice: 250, sgaPercent: 0.08 },
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
assert.equal('resetBaselineEconomicInputs' in createEmptySimulationState(), false,
  'an empty Simulation state does not carry an Economic reset baseline')
const referenceSim = startSimulationFrom('reference', initial, '2026-10-09T02:00:00.000Z')
assert.equal('resetBaselineEconomicInputs' in referenceSim, false, 'a new clone stores no Economic reset baseline')
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
assert.deepEqual(upgradedLegacyState.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'older Simulation state gains blank assumptions and Current business defaults')

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
assert.equal(sanitizedLegacyState.economicInputs.sgaPercentOverride, String(initial.current.product.sgaPercent),
  'invalid legacy SG&A is replaced with the valid Current default')
assert.equal(sanitizedLegacyState.economicInputs.batchSize, '', 'zero legacy Batch Size is discarded')

const customSim = startSimulationFrom('custom', initial)
assert.equal('resetBaselineEconomicInputs' in customSim, false, 'a Custom clone stores no Economic reset baseline')
assert.equal(customSim.sourceRole, 'custom')
assert.equal(customSim.snapshot?.bom[0]?.price, 14)
assert.equal(customSim.snapshot?.rates[0]?.laborRate, 20)
const currentSim = startSimulationFrom('current', initial)
assert.equal('resetBaselineEconomicInputs' in currentSim, false, 'a Current clone stores no Economic reset baseline')
assert.equal(currentSim.snapshot?.bom[0]?.price, 12)
assert.deepEqual(currentSim.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'a new Simulation starts with Current Selling Price and SG&A and blank Simulation-only assumptions')
assert.deepEqual(currentSim.workingSelection, [], 'Current clone starts with no selected working rows')
assert.deepEqual(currentSim.resetBaselineSnapshot, currentSim.snapshot, 'Current clone captures the initial SIM parameters as its reset baseline')
assert.notStrictEqual(currentSim.resetBaselineSnapshot, currentSim.snapshot, 'the reset baseline is isolated from live SIM edits')
assert.notStrictEqual(currentSim.resetBaselineSnapshot?.bom[0], currentSim.snapshot?.bom[0])
const manuallyClearedInputs = (['fixedActionCost', 'variableActionCostPerPiece', 'batchSize', 'sellingPriceOverride', 'sgaPercentOverride'] as const)
  .reduce((state, field) => setSimulationEconomicInput(state, field, ''), currentSim)
const reconciledBlankInputs = reconcileSimulationState(manuallyClearedInputs, initial)
assert.deepEqual(reconciledBlankInputs.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '', sellingPriceOverride: '', sgaPercentOverride: ''
}, 'manually deleting any Economic/Business input keeps it blank through state reconciliation')
const staleBlankInputs = reconcileSimulationState(reconciledBlankInputs, sources(10, 13))
assert.deepEqual(staleBlankInputs.economicInputs, reconciledBlankInputs.economicInputs,
  'reinitializing a stale Simulation preserves intentionally blank Economic/Business inputs')
const restartedBlankInputs = startSimulationFrom('current', sources(10, 13), undefined, staleBlankInputs.economicInputs)
assert.deepEqual(restartedBlankInputs.economicInputs, reconciledBlankInputs.economicInputs,
  'starting a replacement SIM from an existing draft does not refill cleared inputs')
const resetAfterBlankInputs = resetSimulationParameters(reconciledBlankInputs, initial.current)
assert.deepEqual(resetAfterBlankInputs.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'Reset clears the three Simulation-only inputs and restores Current Selling Price and SG&A')

const currentCalculation = calculateParameterSimulation(initial.current, currentSim.snapshot!)
assert.equal(currentCalculation.records.filter(row => row.kind === 'bom').length, 2)
assert.equal(currentCalculation.records.filter(row => row.kind === 'routing').length, 1)
const selectedCurrentSim = toggleSimulationWorkingTarget(currentSim, initial.current, 'bom', currentSim.snapshot!.bom[0].id)
const bomSelectionKey = simulationWorkingTargetKey('bom', currentSim.snapshot!.bom[0].id)
assert.deepEqual(selectedCurrentSim.workingSelection, [bomSelectionKey], 'BOM selection uses a kind-qualified record key')
assert.strictEqual(selectedCurrentSim.snapshot, currentSim.snapshot, 'selecting a working row does not clone or edit the SIM snapshot')
assert.strictEqual(selectedCurrentSim.resetBaselineSnapshot, currentSim.resetBaselineSnapshot, 'selection does not alter the Reset baseline')
assert.equal(selectedCurrentSim.basisFingerprint, currentSim.basisFingerprint, 'selection does not change the Current source fingerprint')
assert.strictEqual(reconcileSimulationState(selectedCurrentSim, initial), selectedCurrentSim,
  'reconciliation keeps valid selection without invalidating or rewriting the source basis')
assert.strictEqual(toggleSimulationWorkingTarget(selectedCurrentSim, initial.current, 'bom', 'not-in-sim'), selectedCurrentSim,
  'an unknown record cannot enter the working selection')
const originalBOMOrder = currentSim.snapshot!.bom.map(record => record.id)
assert.deepEqual(selectedCurrentSim.snapshot?.bom.map(record => record.id), originalBOMOrder,
  'work selection never mutates the source snapshot order')
const selectedBOMAndRouting = toggleSimulationWorkingTarget(selectedCurrentSim, initial.current, 'routing', currentSim.snapshot!.routing[0].id)
const routingSelectionKey = simulationWorkingTargetKey('routing', currentSim.snapshot!.routing[0].id)
assert.deepEqual(selectedBOMAndRouting.workingSelection, [bomSelectionKey, routingSelectionKey],
  'routing selection remains distinct from BOM selection for the same workspace')

const ambiguousCurrent = {
  ...initial.current,
  bom: [
    { ...initial.current.bom[0], description: 'DUPLICATE' },
    { ...initial.current.bom[1], description: 'DUPLICATE' }
  ]
}
const ambiguousSources = { ...initial, current: ambiguousCurrent }
const ambiguousSIM = startSimulationFrom('current', ambiguousSources)
const ambiguousRows = calculateParameterSimulation(ambiguousCurrent, ambiguousSIM.snapshot!).records
const ambiguousRow = ambiguousRows.find(row => row.kind === 'bom' && row.identityIssue === 'ambiguous' && row.simulationRecordId)
assert.ok(ambiguousRow?.simulationRecordId, 'duplicate business identity is reported as protected and ambiguous')
assert.strictEqual(toggleSimulationWorkingTarget(ambiguousSIM, ambiguousCurrent, 'bom', ambiguousRow!.simulationRecordId!), ambiguousSIM,
  'an ambiguous row is rejected by the state-level work-selection guard')
const staleProtectedSelection = reconcileSimulationState({
  ...ambiguousSIM,
  workingSelection: [simulationWorkingTargetKey('bom', ambiguousRow!.simulationRecordId!)]
}, ambiguousSources)
assert.deepEqual(staleProtectedSelection.workingSelection, [], 'reconciliation prunes a protected target from stored selection')

const addedSource = {
  ...initial.custom,
  bom: [...initial.custom.bom, { ...initial.custom.bom[0], id: 'bom-added', itemCode: 'MAT-ADDED', description: 'Added material' }]
}
const addedSIM = startSimulationFrom('custom', { ...initial, custom: addedSource })
const addedRow = calculateParameterSimulation(initial.current, addedSIM.snapshot!).records.find(row => row.status === 'ADDED')
assert.ok(addedRow?.simulationRecordId, 'a structurally added source row is represented in SIM')
const selectedAddedSIM = toggleSimulationWorkingTarget(addedSIM, initial.current, 'bom', addedRow!.simulationRecordId!)
assert.equal(selectedAddedSIM.workingSelection.length, 1, 'a valid ADDED row with a SIM record remains selectable')

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
const resetCurrentSim = resetSimulationParameters(editedWithEconomicInputs, initial.current)
assert.deepEqual(resetCurrentSim.snapshot, currentSim.resetBaselineSnapshot, 'Reset restores every live parameter to the clone-time baseline')
assert.notStrictEqual(resetCurrentSim.snapshot, resetCurrentSim.resetBaselineSnapshot, 'reset returns a mutable SIM copy separate from the saved baseline')
assert.deepEqual(resetCurrentSim.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'Reset clears the three Simulation-only assumptions and restores Current business values')
assert.equal('resetBaselineEconomicInputs' in resetCurrentSim, false, 'Reset state has no Economic reset baseline field')
assert.strictEqual(resetCurrentSim.resetBaselineSnapshot, editedWithEconomicInputs.resetBaselineSnapshot, 'Reset keeps the current clone baseline')
assert.deepEqual(resetCurrentSim.workingSelection, editedWithEconomicInputs.workingSelection,
  'Reset restores BOM and Routing parameters and retains the local working selection')
assert.equal(initial.current.bom[0].price, 12, 'reset never writes parameter values back to Current')
assert.strictEqual(resetSimulationParameters(currentSim, initial.current), currentSim, 'Reset is an identity operation when no parameters or Economic inputs changed')

const cloneEconomicInputs = {
  fixedActionCost: '500',
  variableActionCostPerPiece: '1.25',
  batchSize: '25',
  sellingPriceOverride: '280',
  sgaPercentOverride: '10'
}
let resetContract = startSimulationFrom('custom', initial, '2026-10-09T02:03:00.000Z', cloneEconomicInputs)
assert.notEqual(initial.custom.rates[0]?.laborRate, initial.current.rates[0]?.laborRate,
  'the reset fixture has non-Current Custom rates to detect a locked-rate regression')
assert.deepEqual(resetContract.resetBaselineSnapshot?.rates, initial.current.rates,
  'a Custom clone starts with locked Current rates')
resetContract = toggleSimulationWorkingTarget(resetContract, initial.current, 'bom', resetContract.snapshot!.bom[0].id)
resetContract = toggleSimulationWorkingTarget(resetContract, initial.current, 'routing', resetContract.snapshot!.routing[0].id)
for (const [recordId, parameter, value] of [
  [resetContract.snapshot!.bom[0].id, 'bom.price', 8],
  [resetContract.snapshot!.bom[0].id, 'bom.consumption', 1.5],
  [resetContract.snapshot!.bom[0].id, 'bom.loss', 0.1],
  [resetContract.snapshot!.routing[0].id, 'routing.manning', 2],
  [resetContract.snapshot!.routing[0].id, 'routing.capacity', 12],
  [resetContract.snapshot!.routing[0].id, 'routing.yield', 0.9]
] as const) {
  resetContract = updateSimulationParameter(resetContract, initial.current, recordId, parameter, value)
}
for (const [field, value] of [
  ['fixedActionCost', '750'],
  ['variableActionCostPerPiece', '2.5'],
  ['batchSize', '50'],
  ['sellingPriceOverride', '300'],
  ['sgaPercentOverride', '12']
] as const) {
  resetContract = setSimulationEconomicInput(resetContract, field, value)
}
const resetContractSelection = [...resetContract.workingSelection]
const resetContractState = resetSimulationParameters(resetContract, initial.current)
assert.deepEqual(resetContractState.snapshot, resetContractState.resetBaselineSnapshot,
  'Reset restores every editable BOM and Routing parameter to the clone-time snapshot')
assert.deepEqual(resetContractState.snapshot?.rates, initial.current.rates,
  'Reset retains the locked Current Work Center rates')
assert.deepEqual(resetContractState.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'Reset clears Simulation-only assumptions and restores Current business values')
assert.equal('resetBaselineEconomicInputs' in resetContractState, false, 'Reset state has no obsolete Economic baseline field')
assert.deepEqual(resetContractState.workingSelection, resetContractSelection,
  'Reset preserves the local working selection')
assert.equal(initial.current.rates[0]?.laborRate, 20, 'Reset never writes locked rates back to Current')
assert.equal(initial.current.bom[0]?.price, 12, 'Reset never writes BOM values back to Current')
assert.equal(initial.current.product.sellingPrice, 250, 'Reset never writes Selling Price back to Current')
assert.equal(initial.current.product.sgaPercent, 0.08, 'Reset never writes SG&A % back to Current')
const resetContractCalculation = calculateParameterSimulation(initial.current, resetContractState.snapshot!)
const resetContractEconomics = calculateEconomicSimulation(
  initial.current,
  resetContractCalculation.simulationCost,
  resetContractCalculation.parameterSavingPerPiece,
  resetContractState.economicInputs
)
assert.equal(resetContractEconomics.business.sellingPrice, initial.current.product.sellingPrice,
  'Reset restores the Current Selling Price in the active Business calculation')
assert.equal(resetContractEconomics.business.sgaPercent, initial.current.product.sgaPercent,
  'Reset restores the Current SG&A percentage in the active Business calculation')
assert.strictEqual(resetSimulationParameters(resetContractState, initial.current), resetContractState,
  'a second Reset is an identity operation once parameters and Current business values are restored')

const changedEconomicInputs = setSimulationEconomicInput(
  setSimulationEconomicInput(editedWithEconomicInputs, 'sellingPriceOverride', '280'),
  'sgaPercentOverride',
  '10'
)
const reclonedAfterEdit = startSimulationFrom('custom', initial, '2026-10-09T02:05:00.000Z', changedEconomicInputs.economicInputs)
assert.equal(reclonedAfterEdit.snapshot?.bom[0]?.price, 14, 're-cloning replaces the edited SIM values with the selected source')
assert.deepEqual(reclonedAfterEdit.resetBaselineSnapshot, reclonedAfterEdit.snapshot, 're-clone captures a new reset baseline')
assert.notDeepEqual(reclonedAfterEdit.resetBaselineSnapshot, currentSim.resetBaselineSnapshot, 're-clone replaces the prior baseline')
assert.deepEqual(reclonedAfterEdit.economicInputs, changedEconomicInputs.economicInputs, 're-cloning keeps Economic inputs as the new starting draft')
assert.equal('resetBaselineEconomicInputs' in reclonedAfterEdit, false, 're-cloning does not create an Economic reset baseline')
const postRecloneEconomicEdit = setSimulationEconomicInput(
  setSimulationEconomicInput(reclonedAfterEdit, 'sellingPriceOverride', '290'),
  'sgaPercentOverride',
  '12'
)
const resetReclone = resetSimulationParameters(postRecloneEconomicEdit, initial.current)
assert.deepEqual(resetReclone.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'Reset after re-cloning clears Simulation-only assumptions and restores Current business values')
assert.equal('resetBaselineEconomicInputs' in resetReclone, false, 're-clone Reset keeps the obsolete field absent')
assert.deepEqual(resetReclone.snapshot, reclonedAfterEdit.resetBaselineSnapshot,
  'Reset after re-cloning still restores the replacement BOM and Routing parameter baseline')
assert.deepEqual(reclonedAfterEdit.workingSelection, [], 're-cloning clears the previous source selection')
assert.equal(reclonedAfterEdit.snapshot?.rates[0]?.laborRate, 20, 're-clone still uses the current Work Center rates')

const { resetBaselineSnapshot: _legacyBaseline, ...legacyWithoutBaseline } = editedWithEconomicInputs
const migratedBaselineState = reconcileSimulationState(legacyWithoutBaseline as typeof editedWithEconomicInputs, initial)
assert.deepEqual(migratedBaselineState.snapshot, editedWithEconomicInputs.snapshot, 'legacy SIM parameters are preserved during baseline migration')
assert.deepEqual(migratedBaselineState.resetBaselineSnapshot, editedWithEconomicInputs.snapshot,
  'a legacy workspace without a baseline adopts its existing SIM snapshot as the reset baseline')
assert.notStrictEqual(migratedBaselineState.resetBaselineSnapshot, migratedBaselineState.snapshot,
  'migrated baseline is copied so later direct edits cannot mutate it')
const resetMigratedBaseline = resetSimulationParameters(migratedBaselineState, initial.current)
assert.deepEqual(resetMigratedBaseline.snapshot, migratedBaselineState.snapshot,
  'Reset after legacy migration keeps parameters when the adopted baseline is already current')
assert.deepEqual(resetMigratedBaseline.economicInputs, {
  fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
  sellingPriceOverride: String(initial.current.product.sellingPrice),
  sgaPercentOverride: String(initial.current.product.sgaPercent)
}, 'Reset after legacy migration clears assumptions and restores Current business values')

const obsoleteEconomicBaselineState = {
  ...resetContract,
  resetBaselineEconomicInputs: {
    fixedActionCost: '999999', variableActionCostPerPiece: '99', batchSize: '999',
    sellingPriceOverride: '999', sgaPercentOverride: '99'
  }
}
const migratedObsoleteEconomicBaseline = reconcileSimulationState(obsoleteEconomicBaselineState, initial)
assert.deepEqual(migratedObsoleteEconomicBaseline.economicInputs, resetContract.economicInputs,
  'legacy migration preserves current Economic inputs instead of restoring obsolete baseline values')
assert.deepEqual(migratedObsoleteEconomicBaseline.snapshot, resetContract.snapshot,
  'legacy migration preserves current Simulation parameters')
assert.deepEqual(migratedObsoleteEconomicBaseline.resetBaselineSnapshot, resetContract.resetBaselineSnapshot,
  'legacy migration preserves the BOM and Routing reset baseline')
assert.deepEqual(migratedObsoleteEconomicBaseline.workingSelection, resetContract.workingSelection,
  'legacy migration preserves local working selection')
assert.equal(migratedObsoleteEconomicBaseline.sourceRole, resetContract.sourceRole,
  'legacy migration preserves source role metadata')
assert.equal(migratedObsoleteEconomicBaseline.basisFingerprint, resetContract.basisFingerprint,
  'legacy migration preserves the Current basis fingerprint')
assert.equal(migratedObsoleteEconomicBaseline.startedAt, resetContract.startedAt,
  'legacy migration preserves clone timestamp metadata')
assert.equal('resetBaselineEconomicInputs' in migratedObsoleteEconomicBaseline, false,
  'legacy migration removes the obsolete Economic baseline field')
assert.strictEqual(reconcileSimulationState(migratedObsoleteEconomicBaseline, initial), migratedObsoleteEconomicBaseline,
  'reconciling the migrated state again is referentially stable')
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
assert.equal(invalidLegacyRole.snapshot, null,
  'an incompatible legacy Trial/source state is sanitized instead of reinterpreted as a valid SIM')
assert.deepEqual(invalidLegacyRole.economicInputs, currentSim.economicInputs,
  'sanitizing a legacy role retains the Current business defaults')
const incompleteStoredSimulation = reconcileSimulationState({ ...currentSim, snapshot: null }, initial)
assert.equal(incompleteStoredSimulation.snapshot, null, 'a legacy SIM missing its isolated snapshot is discarded')
assert.deepEqual(incompleteStoredSimulation.economicInputs, currentSim.economicInputs,
  'discarding an incomplete SIM preserves valid Current business defaults')
const noFingerprintSimulation = reconcileSimulationState({ ...currentSim, basisFingerprint: null }, initial)
assert.equal(noFingerprintSimulation.snapshot, null, 'a legacy SIM with no Current basis is discarded')
assert.deepEqual(noFingerprintSimulation.economicInputs, currentSim.economicInputs,
  'discarding a SIM without a Current basis preserves valid Current business defaults')

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
