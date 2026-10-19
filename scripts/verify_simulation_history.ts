import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { createCompleteMasterDataMockPair } = await vite.ssrLoadModule('/src/features/master-data/fixtures/synthetic-review-data.ts')
  const { calculateParameterSimulation, updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const {
    createEmptySimulationState,
    getEffectiveSimulationDataset,
    resetSimulationParameters,
    setSimulationActiveDataset,
    setSimulationComparison,
    setSimulationEconomicInput,
    toggleSimulationWorkingTarget
  } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const {
    applySimulationEditableSnapshot,
    captureSimulationEditableSnapshot,
    clearSimulationHistory,
    createSimulationHistory,
    isSimulationEditableSnapshotEqual,
    recordSimulationHistory,
    redoSimulationHistory,
    undoSimulationHistory
  } = await vite.ssrLoadModule('/src/features/simulation/simulation-history.ts')

  const sourcePair = createCompleteMasterDataMockPair()
  const sources = { ...sourcePair, custom: { ...sourcePair.current, id: 'synthetic-custom' } }
  const base = createEmptySimulationState(sources)
  const view = (state, role = 'current') => getEffectiveSimulationDataset(sources, state, role)
  assert.equal(base.schemaVersion, 2)
  assert.equal(base.activeDataset, 'current')
  assert.deepEqual(view(base).economicInputs, {
    fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '',
    sellingPriceOverride: String(sources.current.product.sellingPrice),
    sgaPercentOverride: String(sources.current.product.sgaPercent)
  }, 'Current Economic and Business drafts start from Current Working defaults')
  assert.ok(view(base).snapshot.bom.length && view(base).snapshot.routing.length, 'fixture has populated BOM and Routing rows')
  const firstBom = view(base).snapshot.bom[0]
  const firstRouting = view(base).snapshot.routing[0]
  const currentBasis = view(base).basisFingerprint
  const emptyHistory = createSimulationHistory(currentBasis)
  const baseValues = captureSimulationEditableSnapshot(sources, base, 'current')

  const unchanged = recordSimulationHistory(emptyHistory, baseValues, baseValues)
  assert.equal(unchanged.undo.length, 0, 'a no-op edit does not create a history entry')

  const usageChanged = updateSimulationParameter(base, sources, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.1, 'current')
  const usageValues = captureSimulationEditableSnapshot(sources, usageChanged, 'current')
  const usageHistory = recordSimulationHistory(emptyHistory, baseValues, usageValues)
  assert.equal(usageHistory.undo.length, 1, 'one committed Usage edit creates one entry')
  const undoUsage = undoSimulationHistory(usageHistory, usageValues)
  assert.ok(undoUsage.snapshot, 'Undo returns the previous editable values')
  assert.equal(undoUsage.history.undo.length, 0)
  assert.equal(undoUsage.history.redo.length, 1)
  assert.ok(isSimulationEditableSnapshotEqual(undoUsage.snapshot, baseValues))
  const redoUsage = redoSimulationHistory(undoUsage.history, undoUsage.snapshot)
  assert.ok(redoUsage.snapshot, 'Redo returns the edited values')
  assert.ok(isSimulationEditableSnapshotEqual(redoUsage.snapshot, usageValues))

  const typedEconomics = setSimulationEconomicInput(usageChanged, 'batchSize', '100', 'current')
  const businessChanged = setSimulationEconomicInput(typedEconomics, 'sellingPriceOverride', '275', 'current')
  const historyAfterBatch = recordSimulationHistory(usageHistory, usageValues,
    captureSimulationEditableSnapshot(sources, typedEconomics, 'current'))
  const historyAfterPrice = recordSimulationHistory(historyAfterBatch,
    captureSimulationEditableSnapshot(sources, typedEconomics, 'current'),
    captureSimulationEditableSnapshot(sources, businessChanged, 'current'))
  assert.equal(historyAfterPrice.undo.length, 3, 'separate committed edits preserve chronological order')
  const undoPrice = undoSimulationHistory(historyAfterPrice,
    captureSimulationEditableSnapshot(sources, businessChanged, 'current'))
  assert.equal(undoPrice.snapshot?.economicInputs.sellingPriceOverride,
    view(usageChanged).economicInputs.sellingPriceOverride)
  const undoBatch = undoSimulationHistory(undoPrice.history, undoPrice.snapshot!)
  assert.equal(undoBatch.snapshot?.economicInputs.batchSize, view(base).economicInputs.batchSize)

  const branched = recordSimulationHistory(undoPrice.history, undoPrice.snapshot!, baseValues)
  assert.equal(branched.redo.length, 0, 'a new edit after Undo clears Redo')

  const timelineStates = [base]
  let timeline = base
  timeline = updateSimulationParameter(timeline, sources, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.15, 'current')
  timelineStates.push(timeline)
  timeline = updateSimulationParameter(timeline, sources, firstRouting.id, 'routing.yield', (firstRouting.yield ?? 1) - 0.02, 'current')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'fixedActionCost', '350', 'current')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'variableActionCostPerPiece', '2.5', 'current')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'batchSize', '30', 'current')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'sellingPriceOverride', '275', 'current')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'sgaPercentOverride', '12', 'current')
  timelineStates.push(timeline)
  let orderedHistory = createSimulationHistory(currentBasis)
  for (let index = 0; index < timelineStates.length - 1; index++) {
    orderedHistory = recordSimulationHistory(
      orderedHistory,
      captureSimulationEditableSnapshot(sources, timelineStates[index], 'current'),
      captureSimulationEditableSnapshot(sources, timelineStates[index + 1], 'current')
    )
  }
  assert.equal(orderedHistory.undo.length, 7, 'BOM, Routing, Economic, and Business edits share one role timeline')
  let orderedValues = captureSimulationEditableSnapshot(sources, timelineStates[7], 'current')
  for (let index = 6; index >= 0; index--) {
    const operation = undoSimulationHistory(orderedHistory, orderedValues)
    assert.ok(operation.snapshot, `Undo ${7 - index} restores the previous chronological edit`)
    orderedHistory = operation.history
    orderedValues = operation.snapshot!
    assert.ok(isSimulationEditableSnapshotEqual(orderedValues,
      captureSimulationEditableSnapshot(sources, timelineStates[index], 'current')))
  }
  for (let index = 1; index <= 7; index++) {
    const operation = redoSimulationHistory(orderedHistory, orderedValues)
    assert.ok(operation.snapshot, `Redo ${index} reapplies the next chronological edit`)
    orderedHistory = operation.history
    orderedValues = operation.snapshot!
    assert.ok(isSimulationEditableSnapshotEqual(orderedValues,
      captureSimulationEditableSnapshot(sources, timelineStates[index], 'current')))
  }

  let mixed = updateSimulationParameter(base, sources, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.2, 'current')
  mixed = updateSimulationParameter(mixed, sources, firstRouting.id, 'routing.yield', Math.max(0.01, (firstRouting.yield ?? 1) - 0.01), 'current')
  mixed = setSimulationEconomicInput(mixed, 'batchSize', '120', 'current')
  mixed = setSimulationEconomicInput(mixed, 'fixedActionCost', '350', 'current')
  mixed = setSimulationEconomicInput(mixed, 'variableActionCostPerPiece', '3.5', 'current')
  mixed = setSimulationEconomicInput(mixed, 'sellingPriceOverride', '275', 'current')
  mixed = setSimulationEconomicInput(mixed, 'sgaPercentOverride', '12', 'current')
  const beforeReset = captureSimulationEditableSnapshot(sources, mixed, 'current')
  const reset = resetSimulationParameters(mixed, sources)
  const afterReset = captureSimulationEditableSnapshot(sources, reset, 'current')
  assert.deepEqual(afterReset.bom, baseValues.bom, 'Reset restores the complete Current BOM editable snapshot')
  assert.deepEqual(afterReset.routing, baseValues.routing, 'Reset restores the complete Current Routing editable snapshot')
  assert.deepEqual(afterReset.economicInputs, beforeReset.economicInputs,
    'parameter Reset preserves the active dataset economic assumptions')
  assert.deepEqual(view(reset).parameterOverrides, {}, 'Reset clears only the active role parameter overrides')
  const resetHistory = recordSimulationHistory(createSimulationHistory(currentBasis), beforeReset, afterReset)
  assert.equal(resetHistory.undo.length, 1, 'Reset of parameter overrides creates one history transaction')
  const undoReset = undoSimulationHistory(resetHistory, afterReset)
  assert.ok(undoReset.snapshot && isSimulationEditableSnapshotEqual(undoReset.snapshot, beforeReset),
    'one Undo restores all pre-Reset BOM, Routing, and Economic edits')
  const redoReset = redoSimulationHistory(undoReset.history, undoReset.snapshot!)
  assert.ok(redoReset.snapshot && isSimulationEditableSnapshotEqual(redoReset.snapshot, afterReset), 'Redo reapplies Reset')
  const noOpResetHistory = recordSimulationHistory(resetHistory, afterReset,
    captureSimulationEditableSnapshot(sources, resetSimulationParameters(reset, sources), 'current'))
  assert.equal(noOpResetHistory.undo.length, resetHistory.undo.length, 'a no-op Reset creates no new entry')
  const clonedHistory = clearSimulationHistory(undoReset.history, 'new-product-basis')
  assert.equal(clonedHistory.undo.length, 0, 'a changed role basis starts a clean history')
  assert.equal(clonedHistory.redo.length, 0)
  assert.equal(clonedHistory.basisFingerprint, 'new-product-basis')

  const selected = toggleSimulationWorkingTarget(base, sources, 'bom', firstBom.id, 'current')
  const selectedValues = captureSimulationEditableSnapshot(sources, selected, 'current')
  assert.ok(isSimulationEditableSnapshotEqual(selectedValues, baseValues), 'row selection is excluded from history')
  assert.equal(recordSimulationHistory(emptyHistory, baseValues, selectedValues).undo.length, 0, 'selection alone creates no entry')
  const selectedEdit = updateSimulationParameter(selected, sources, firstBom.id, 'bom.price', (firstBom.price ?? 0) + 3, 'current')
  const selectedEditValues = captureSimulationEditableSnapshot(sources, selectedEdit, 'current')
  const selectedHistory = recordSimulationHistory(createSimulationHistory(currentBasis), selectedValues, selectedEditValues)
  const selectedUndo = undoSimulationHistory(selectedHistory, selectedEditValues)
  const stateAfterUndo = applySimulationEditableSnapshot(sources, selectedEdit, selectedUndo.snapshot!, 'current')
  assert.ok(stateAfterUndo, 'snapshot application resolves the row by stable ID in the selected role')
  assert.deepEqual(view(stateAfterUndo).workingSelection, view(selectedEdit).workingSelection, 'Undo does not rewind row selection')
  assert.deepEqual(view(stateAfterUndo).snapshot.rates, view(selectedEdit).snapshot.rates,
    'Undo retains Current Working rates instead of a cloned SIM rate set')
  assert.ok(isSimulationEditableSnapshotEqual(captureSimulationEditableSnapshot(sources, stateAfterUndo, 'current'), selectedValues))
  assert.notEqual(
    calculateParameterSimulation(sources.current, view(stateAfterUndo).snapshot).afterCost.total,
    calculateParameterSimulation(sources.current, view(selectedEdit).snapshot).afterCost.total,
    'derived cost recalculates from the restored editable values'
  )

  const invalidCapacity = updateSimulationParameter(base, sources, firstRouting.id, 'routing.capacity', 0, 'current')
  assert.equal(invalidCapacity, base, 'rejected capacity values do not enter authoritative state')
  assert.equal(recordSimulationHistory(emptyHistory, baseValues,
    captureSimulationEditableSnapshot(sources, invalidCapacity, 'current')).undo.length, 0)
  const invalidYield = updateSimulationParameter(base, sources, firstRouting.id, 'routing.yield', 0, 'current')
  assert.equal(invalidYield, base, 'rejected yield values do not enter authoritative state')
  const staleUndo = undoSimulationHistory(usageHistory, baseValues)
  assert.equal(staleUndo.snapshot, null, 'Undo refuses to apply against an unexpected current value')
  assert.equal(staleUndo.history.undo.length, usageHistory.undo.length)

  const referenceBase = createEmptySimulationState(sources)
  const currentEdit = updateSimulationParameter(base, sources, firstBom.id, 'bom.price', (firstBom.price ?? 0) + 5, 'current')
  const withTwoRoleEdits = updateSimulationParameter(currentEdit, sources, sources.reference.bom[0].id,
    'bom.price', (sources.reference.bom[0].price ?? 0) + 7, 'reference')
  const referenceBefore = captureSimulationEditableSnapshot(sources, referenceBase, 'reference')
  const referenceAfter = captureSimulationEditableSnapshot(sources, withTwoRoleEdits, 'reference')
  const referenceHistory = recordSimulationHistory(
    createSimulationHistory(view(referenceBase, 'reference').basisFingerprint), referenceBefore, referenceAfter
  )
  const referenceUndo = undoSimulationHistory(referenceHistory, referenceAfter)
  const restoredReference = applySimulationEditableSnapshot(sources, withTwoRoleEdits, referenceUndo.snapshot!, 'reference')
  assert.ok(restoredReference)
  assert.ok(isSimulationEditableSnapshotEqual(captureSimulationEditableSnapshot(sources, restoredReference, 'reference'), referenceBefore),
    'Reference Undo restores Reference only')
  assert.equal(view(restoredReference, 'current').snapshot.bom[0].price,
    view(withTwoRoleEdits, 'current').snapshot.bom[0].price, 'Reference history cannot cross-edit Current overrides')
  assert.equal(view(restoredReference, 'reference').snapshot.bom[0].price,
    sources.reference.bom[0].price, 'Reference override is cleared by its own history operation')

  const splitContext = setSimulationComparison(
    setSimulationActiveDataset(base, 'current'), 'reference', 'custom'
  )
  const splitCurrentEdit = updateSimulationParameter(splitContext, sources, firstBom.id,
    'bom.price', (firstBom.price ?? 0) + 9, 'current')
  const splitCustomEdit = setSimulationEconomicInput(splitCurrentEdit, 'sellingPriceOverride', '444', 'custom')
  const activeMoved = setSimulationActiveDataset(splitCustomEdit, 'reference')
  assert.equal(activeMoved.comparisonAfter, 'custom', 'activeDataset changes do not reinterpret the analysis context')
  assert.equal(view(activeMoved, 'custom').economicInputs.sellingPriceOverride, '444',
    'After Custom economic state remains intact when activeDataset changes')

  const currentSplitBefore = captureSimulationEditableSnapshot(sources, splitContext, 'current')
  const currentSplitAfter = captureSimulationEditableSnapshot(sources, splitCurrentEdit, 'current')
  const customSplitBefore = captureSimulationEditableSnapshot(sources, splitCurrentEdit, 'custom')
  const customSplitAfter = captureSimulationEditableSnapshot(sources, splitCustomEdit, 'custom')
  const currentSplitHistory = recordSimulationHistory(
    createSimulationHistory(view(base, 'current').basisFingerprint), currentSplitBefore, currentSplitAfter
  )
  const customSplitHistory = recordSimulationHistory(
    createSimulationHistory(view(base, 'custom').basisFingerprint), customSplitBefore, customSplitAfter
  )
  const undoCustomEconomic = undoSimulationHistory(customSplitHistory, customSplitAfter)
  assert.ok(undoCustomEconomic.snapshot, 'Undo targets the role that owns the After Economic edit')
  const afterEconomicUndo = applySimulationEditableSnapshot(sources, splitCustomEdit, undoCustomEconomic.snapshot!, 'custom')
  assert.ok(afterEconomicUndo)
  assert.equal(view(afterEconomicUndo, 'current').snapshot.bom[0].price, view(splitCurrentEdit, 'current').snapshot.bom[0].price,
    'undoing Custom Economics leaves Current parameter edits untouched')
  const undoCurrentParameter = undoSimulationHistory(currentSplitHistory, currentSplitAfter)
  assert.ok(undoCurrentParameter.snapshot, 'Current parameter edit retains its own history')
  const afterParameterUndo = applySimulationEditableSnapshot(sources, afterEconomicUndo, undoCurrentParameter.snapshot!, 'current')
  assert.ok(afterParameterUndo)
  assert.equal(view(afterParameterUndo, 'current').snapshot.bom[0].price, view(base, 'current').snapshot.bom[0].price,
    'Current parameter Undo restores the active editor role')
  assert.equal(view(afterParameterUndo, 'custom').economicInputs.sellingPriceOverride,
    view(base, 'custom').economicInputs.sellingPriceOverride,
    'Current parameter Undo does not mutate Custom Economic history')

  const differentProductHistory = createSimulationHistory('another-product')
  assert.equal(differentProductHistory.undo.length, 0, 'a second product has an independent empty history')
  assert.equal(clearSimulationHistory(usageHistory, 'new-current-basis').undo.length, 0,
    'a changed Master dataset basis clears old role history')

  console.log('PASS: Simulation history covers chronology, Reset, branching, stable IDs, product and role scope, independent After economics, rates, selection, validation, and recalculation.')
} finally {
  await vite.close()
}
