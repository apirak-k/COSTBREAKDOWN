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
    resetSimulationParameters,
    setSimulationEconomicInput,
    startSimulationFrom,
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

  const sources = createCompleteMasterDataMockPair()
  const cloneEconomicInputs = {
    fixedActionCost: '100', variableActionCostPerPiece: '2', batchSize: '50',
    sellingPriceOverride: '240', sgaPercentOverride: '8'
  }
  const base = startSimulationFrom('current', sources, '2026-10-16T00:00:00.000Z', cloneEconomicInputs)
  assert.deepEqual(base.economicInputs, cloneEconomicInputs, 'Clone preserves the current Economic and Business draft')
  assert.equal('resetBaselineEconomicInputs' in base, false, 'Clone stores no Economic reset baseline')
  assert.ok(base.snapshot?.bom.length && base.snapshot.routing.length, 'fixture has populated BOM and Routing rows')
  const firstBom = base.snapshot.bom[0]
  const firstRouting = base.snapshot.routing[0]
  const emptyHistory = createSimulationHistory(base.basisFingerprint)
  const baseValues = captureSimulationEditableSnapshot(sources.current, base)

  const unchanged = recordSimulationHistory(emptyHistory, baseValues, baseValues)
  assert.equal(unchanged.undo.length, 0, 'a no-op edit does not create a history entry')

  const usageChanged = updateSimulationParameter(base, sources.current, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.1)
  const usageValues = captureSimulationEditableSnapshot(sources.current, usageChanged)
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

  const typedEconomics = setSimulationEconomicInput(usageChanged, 'batchSize', '100')
  const businessChanged = setSimulationEconomicInput(typedEconomics, 'sellingPriceOverride', '275')
  const historyAfterBatch = recordSimulationHistory(usageHistory, usageValues, captureSimulationEditableSnapshot(sources.current, typedEconomics))
  const historyAfterPrice = recordSimulationHistory(historyAfterBatch,
    captureSimulationEditableSnapshot(sources.current, typedEconomics),
    captureSimulationEditableSnapshot(sources.current, businessChanged))
  assert.equal(historyAfterPrice.undo.length, 3, 'separate committed edits preserve chronological order')
  const undoPrice = undoSimulationHistory(historyAfterPrice, captureSimulationEditableSnapshot(sources.current, businessChanged))
  assert.equal(undoPrice.snapshot?.economicInputs.sellingPriceOverride, usageChanged.economicInputs.sellingPriceOverride)
  const undoBatch = undoSimulationHistory(undoPrice.history, undoPrice.snapshot!)
  assert.equal(undoBatch.snapshot?.economicInputs.batchSize, base.economicInputs.batchSize)

  const branched = recordSimulationHistory(undoPrice.history, undoPrice.snapshot!, baseValues)
  assert.equal(branched.redo.length, 0, 'a new edit after Undo clears Redo')

  const timelineStates = [base]
  let timeline = base
  timeline = updateSimulationParameter(timeline, sources.current, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.15)
  timelineStates.push(timeline)
  timeline = updateSimulationParameter(timeline, sources.current, firstRouting.id, 'routing.yield', (firstRouting.yield ?? 1) - 0.02)
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'fixedActionCost', '350')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'variableActionCostPerPiece', '2.5')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'batchSize', '30')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'sellingPriceOverride', '275')
  timelineStates.push(timeline)
  timeline = setSimulationEconomicInput(timeline, 'sgaPercentOverride', '12')
  timelineStates.push(timeline)
  let orderedHistory = createSimulationHistory(base.basisFingerprint)
  for (let index = 0; index < timelineStates.length - 1; index++) {
    orderedHistory = recordSimulationHistory(
      orderedHistory,
      captureSimulationEditableSnapshot(sources.current, timelineStates[index]),
      captureSimulationEditableSnapshot(sources.current, timelineStates[index + 1])
    )
  }
  assert.equal(orderedHistory.undo.length, 7, 'BOM, RTG, Economic, and Business edits share one timeline')
  let orderedValues = captureSimulationEditableSnapshot(sources.current, timelineStates[7])
  for (let index = 6; index >= 0; index--) {
    const operation = undoSimulationHistory(orderedHistory, orderedValues)
    assert.ok(operation.snapshot, `Undo ${7 - index} restores the previous chronological edit`)
    orderedHistory = operation.history
    orderedValues = operation.snapshot!
    assert.ok(isSimulationEditableSnapshotEqual(orderedValues, captureSimulationEditableSnapshot(sources.current, timelineStates[index])))
  }
  for (let index = 1; index <= 7; index++) {
    const operation = redoSimulationHistory(orderedHistory, orderedValues)
    assert.ok(operation.snapshot, `Redo ${index} reapplies the next chronological edit`)
    orderedHistory = operation.history
    orderedValues = operation.snapshot!
    assert.ok(isSimulationEditableSnapshotEqual(orderedValues, captureSimulationEditableSnapshot(sources.current, timelineStates[index])))
  }

  let mixed = setSimulationEconomicInput(
    updateSimulationParameter(
      updateSimulationParameter(base, sources.current, firstBom.id, 'bom.consumption', (firstBom.consumption ?? 0) + 0.2),
      sources.current,
      firstRouting.id,
      'routing.yield',
      Math.max(0.01, (firstRouting.yield ?? 1) - 0.01)
    ),
    'batchSize',
    '120'
  )
  mixed = setSimulationEconomicInput(mixed, 'fixedActionCost', '350')
  mixed = setSimulationEconomicInput(mixed, 'variableActionCostPerPiece', '3.5')
  mixed = setSimulationEconomicInput(mixed, 'sellingPriceOverride', '275')
  mixed = setSimulationEconomicInput(mixed, 'sgaPercentOverride', '12')
  const beforeReset = captureSimulationEditableSnapshot(sources.current, mixed)
  const reset = resetSimulationParameters(mixed)
  const afterReset = captureSimulationEditableSnapshot(sources.current, reset)
  assert.deepEqual(afterReset.bom, baseValues.bom, 'Reset restores the complete BOM editable snapshot')
  assert.deepEqual(afterReset.routing, baseValues.routing, 'Reset restores the complete Routing editable snapshot')
  assert.deepEqual(afterReset.economicInputs, {
    fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '', sellingPriceOverride: '', sgaPercentOverride: ''
  }, 'Reset clears every Economic and Business draft rather than restoring clone-time inputs')
  assert.equal('resetBaselineEconomicInputs' in reset, false, 'Reset state has no obsolete Economic baseline field')
  const resetHistory = recordSimulationHistory(createSimulationHistory(base.basisFingerprint), beforeReset, afterReset)
  assert.equal(resetHistory.undo.length, 1, 'the combined parameter and five-field draft Reset creates one history transaction')
  const undoReset = undoSimulationHistory(resetHistory, afterReset)
  assert.ok(undoReset.snapshot && isSimulationEditableSnapshotEqual(undoReset.snapshot, beforeReset),
    'one Undo restores all pre-Reset BOM, Routing, and Economic edits')
  assert.deepEqual(undoReset.snapshot?.economicInputs, beforeReset.economicInputs,
    'one Undo restores each of the five pre-Reset drafts')
  const redoReset = redoSimulationHistory(undoReset.history, undoReset.snapshot!)
  assert.ok(redoReset.snapshot && isSimulationEditableSnapshotEqual(redoReset.snapshot, afterReset),
    'Redo reapplies all BOM/RTG baseline values and the five blank drafts')
  assert.deepEqual(redoReset.snapshot?.economicInputs, afterReset.economicInputs,
    'Redo keeps every Economic and Business draft blank')
  const noOpResetHistory = recordSimulationHistory(resetHistory, afterReset, captureSimulationEditableSnapshot(sources.current, resetSimulationParameters(reset)))
  assert.equal(noOpResetHistory.undo.length, resetHistory.undo.length, 'a no-op Reset creates no new entry')
  const clonedHistory = clearSimulationHistory(undoReset.history, 'new-clone-basis')
  assert.equal(clonedHistory.undo.length, 0, 'Clone starts a clean history')
  assert.equal(clonedHistory.redo.length, 0)
  assert.equal(clonedHistory.basisFingerprint, 'new-clone-basis')

  const selected = toggleSimulationWorkingTarget(base, sources.current, 'bom', firstBom.id)
  const selectedValues = captureSimulationEditableSnapshot(sources.current, selected)
  assert.ok(isSimulationEditableSnapshotEqual(selectedValues, baseValues), 'row selection is excluded from history')
  assert.equal(recordSimulationHistory(emptyHistory, baseValues, selectedValues).undo.length, 0, 'selection alone creates no entry')
  const selectedEdit = updateSimulationParameter(selected, sources.current, firstBom.id, 'bom.price', (firstBom.price ?? 0) + 3)
  const selectedEditValues = captureSimulationEditableSnapshot(sources.current, selectedEdit)
  const selectedHistory = recordSimulationHistory(createSimulationHistory(base.basisFingerprint), selectedValues, selectedEditValues)
  const selectedUndo = undoSimulationHistory(selectedHistory, selectedEditValues)
  const stateAfterUndo = applySimulationEditableSnapshot(sources.current, selectedEdit, selectedUndo.snapshot!)
  assert.ok(stateAfterUndo, 'snapshot application resolves the row by stable ID')
  assert.deepEqual(stateAfterUndo.workingSelection, selectedEdit.workingSelection, 'Undo does not rewind row selection')
  assert.deepEqual(stateAfterUndo.snapshot?.rates, selectedEdit.snapshot?.rates, 'Undo keeps the live Current rate context')
  assert.ok(isSimulationEditableSnapshotEqual(captureSimulationEditableSnapshot(sources.current, stateAfterUndo), selectedValues))
  assert.notEqual(
    calculateParameterSimulation(sources.current, stateAfterUndo.snapshot!).simulationCost.total,
    calculateParameterSimulation(sources.current, selectedEdit.snapshot!).simulationCost.total,
    'derived cost recalculates from the restored editable values'
  )

  const invalidCapacity = updateSimulationParameter(base, sources.current, firstRouting.id, 'routing.capacity', 0)
  assert.equal(invalidCapacity, base, 'rejected capacity values do not enter authoritative state')
  assert.equal(recordSimulationHistory(emptyHistory, baseValues, captureSimulationEditableSnapshot(sources.current, invalidCapacity)).undo.length, 0)
  const invalidYield = updateSimulationParameter(base, sources.current, firstRouting.id, 'routing.yield', 0)
  assert.equal(invalidYield, base, 'rejected yield values do not enter authoritative state')

  const staleUndo = undoSimulationHistory(usageHistory, baseValues)
  assert.equal(staleUndo.snapshot, null, 'Undo refuses to apply against an unexpected current value')
  assert.equal(staleUndo.history.undo.length, usageHistory.undo.length)

  const differentProductHistory = createSimulationHistory('another-product')
  assert.equal(differentProductHistory.undo.length, 0, 'a second product has an independent empty history')
  assert.equal(clearSimulationHistory(usageHistory, 'new-current-basis').undo.length, 0, 'Current basis changes clear old history')

  console.log('PASS: Simulation history groups editable values, Reset, branching, cloning, stable IDs, product scope, Current rates, selection, validation, and derived recalculation.')
} finally {
  await vite.close()
}
