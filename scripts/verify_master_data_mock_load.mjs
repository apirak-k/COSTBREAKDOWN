import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const [{ createCompleteMasterDataMockPair, createIncompleteMasterDataMockPair }, { replaceDevelopmentMockWorkingState }, { buildMasterDataWarningItems, countMasterDataWarningsByRole, areMasterDataDatasetsReady }, { normalizeMasterDataSnapshot }, { calculateSnapshotCost, evaluateMasterDataHandoff }, { applyMasterDataEditHistoryEntry }, { createEmptyCustomMasterData }] = await Promise.all([
    vite.ssrLoadModule('/src/features/master-data/fixtures/synthetic-review-data.ts'),
    vite.ssrLoadModule('/src/state/development-mock-data.ts'),
    vite.ssrLoadModule('/src/features/master-data/prepare-dataset.ts'),
    vite.ssrLoadModule('/src/core/utils/master-data-effective.ts'),
    vite.ssrLoadModule('/src/core/index.ts'),
    vite.ssrLoadModule('/src/state/master-data-edit-history.ts'),
    vite.ssrLoadModule('/src/state/master-data-datasets.ts')
  ])

  const completePair = createCompleteMasterDataMockPair()
  const incompletePair = createIncompleteMasterDataMockPair()
  const staleCustom = {
    id: 'runtime-mock-load:custom',
    status: 'draft',
    sourceRef: 'old sizing placeholders',
    effectiveDate: '2026-01-01',
    product: { ...completePair.current.product },
    rates: [],
    bom: Array.from({ length: 13 }, (_, index) => ({
      id: `stale-placeholder-${index + 1}`,
      itemCode: '',
      description: '',
      consumption: null,
      unit: 'PC',
      price: null,
      loss: null,
      confidence: {}
    })),
    routing: [],
    sizing: { wcCount: 0, bomCount: 16, routingCount: 0 }
  }
  const source = {
    id: 'runtime-mock-load',
    product: { ...completePair.current.product },
    rates: [],
    bom: [],
    routing: [],
    savedDrivers: [],
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    snapshotPair: completePair,
    snapshotPairMode: 'independent',
    preparedSnapshotRoles: { reference: true, current: true },
    datasetSizing: { reference: { bomCount: 16 }, current: { bomCount: 16 } },
    customMasterData: staleCustom,
    customDatasetSizing: { bomCount: 16 },
    lastSavedMasterData: {
      reference: { snapshot: completePair.reference, prepared: true, sizing: completePair.reference.sizing },
      current: { snapshot: completePair.current, prepared: true, sizing: completePair.current.sizing }
    },
    customLastSavedMasterData: { snapshot: staleCustom, sizing: { bomCount: 16 }, prepared: false }
  }

  const incompleteLoaded = replaceDevelopmentMockWorkingState(source, incompletePair, '2026-10-10T00:00:00.000Z')
  assert.ok(incompleteLoaded, 'Incomplete Mock replaces the existing Working state')
  assert.equal(incompleteLoaded.customMasterData.bom.length, 0, 'stale Custom Working placeholders are removed by mock replacement')
  assert.deepEqual(incompleteLoaded.customDatasetSizing, {}, 'Custom sizing placeholders are cleared with its Working data')
  assert.equal(incompleteLoaded.customLastSavedMasterData, source.customLastSavedMasterData, 'Custom Last Saved remains untouched')
  assert.equal(incompleteLoaded.lastSavedMasterData, source.lastSavedMasterData, 'Reference and Current Last Saved datasets remain untouched')
  assert.equal(incompleteLoaded.datasetSizing.reference.bomCount, incompletePair.reference.sizing.bomCount, 'Reference sizing is initialized from the fixture')
  assert.equal(incompleteLoaded.datasetSizing.current.bomCount, incompletePair.current.sizing.bomCount, 'Current sizing is initialized from the fixture')

  const warningsFor = session => buildMasterDataWarningItems({
    reference: normalizeMasterDataSnapshot(session.snapshotPair.reference),
    current: normalizeMasterDataSnapshot(session.snapshotPair.current),
    custom: normalizeMasterDataSnapshot(session.customMasterData)
  })
  const incompleteWarnings = warningsFor(incompleteLoaded)
  const counts = incompleteWarnings.reduce((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + 1
    return result
  }, {})
  assert.deepEqual(counts, {
    'generated-identity': 3,
    'missing-value': 9,
    'auto-renamed-duplicate': 3
  }, 'post-load Incomplete Mock counts are 3 generated, 9 missing, and 3 duplicate')
  assert.equal(incompleteWarnings.length, 15, 'post-load Incomplete Mock warning total is exactly 15')
  assert.deepEqual(countMasterDataWarningsByRole(incompleteWarnings), { reference: 3, current: 12, custom: 0 })
  assert.equal(evaluateMasterDataHandoff(incompleteLoaded, incompleteLoaded.snapshotPair).productMismatch, true, 'Product Mismatch remains outside warning totals')

  const staleSizingOnlySource = {
    ...source,
    snapshotPair: incompletePair,
    customMasterData: createEmptyCustomMasterData(source.id),
    customDatasetSizing: { bomCount: 13 }
  }
  const sizingOnlyLoaded = replaceDevelopmentMockWorkingState(staleSizingOnlySource, incompletePair, '2026-10-10T00:00:00.500Z')
  assert.ok(sizingOnlyLoaded, 'mock replacement clears stale Custom sizing even when its Working snapshot is already blank')
  assert.deepEqual(sizingOnlyLoaded.customDatasetSizing, {}, 'sizing-only stale placeholders are removed')
  assert.equal(warningsFor(sizingOnlyLoaded).length, 15, 'sizing-only replacement retains the exact Incomplete Mock warning count')

  const historyEntry = {
    sessionId: source.id,
    role: 'current',
    before: source.snapshotPair.current,
    after: incompleteLoaded.snapshotPair.current,
    beforePrepared: source.preparedSnapshotRoles,
    afterPrepared: incompleteLoaded.preparedSnapshotRoles,
    beforeSizing: source.datasetSizing,
    afterSizing: incompleteLoaded.datasetSizing,
    beforePair: source.snapshotPair,
    afterPair: incompleteLoaded.snapshotPair,
    beforeCustom: source.customMasterData,
    afterCustom: incompleteLoaded.customMasterData,
    beforeCustomSizing: source.customDatasetSizing,
    afterCustomSizing: incompleteLoaded.customDatasetSizing
  }
  const undone = applyMasterDataEditHistoryEntry(incompleteLoaded, historyEntry, 'undo')
  assert.equal(undone.customMasterData.bom.length, 13, 'one Undo restores the prior Custom Working data with the paired mock action')
  assert.deepEqual(undone.customDatasetSizing, { bomCount: 16 }, 'Undo restores the previous Custom sizing')
  assert.equal(undone.lastSavedMasterData, source.lastSavedMasterData, 'Undo preserves every Last Saved dataset')
  const redone = applyMasterDataEditHistoryEntry(undone, historyEntry, 'redo')
  assert.equal(redone.customMasterData.bom.length, 0, 'Redo reapplies the mock replacement as one history action')

  const completeLoaded = replaceDevelopmentMockWorkingState(source, completePair, '2026-10-10T00:00:01.000Z')
  assert.ok(completeLoaded, 'Complete Mock replaces a Working state that contains stale Custom placeholders')
  assert.equal(completeLoaded.customMasterData.bom.length, 0, 'Complete Mock also removes stale Custom Working placeholders')
  assert.equal(completeLoaded.customLastSavedMasterData, source.customLastSavedMasterData, 'Complete Mock preserves Custom Last Saved')
  assert.equal(completeLoaded.lastSavedMasterData, source.lastSavedMasterData, 'Complete Mock preserves Reference and Current Last Saved')
  const completeWarnings = warningsFor(completeLoaded)
  const completeHandoff = evaluateMasterDataHandoff(completeLoaded, completeLoaded.snapshotPair)
  assert.equal(completeWarnings.length, 0, 'post-load Complete Mock has zero warnings')
  assert.deepEqual(countMasterDataWarningsByRole(completeWarnings), { reference: 0, current: 0, custom: 0 })
  assert.equal(areMasterDataDatasetsReady(completeHandoff, completeWarnings), true, 'post-load Complete Mock is Ready')
  assert.equal(completeHandoff.productMismatch, false, 'post-load Complete Mock has Product Match')
  assert.notEqual(calculateSnapshotCost(completeLoaded.snapshotPair.reference).total, null, 'Complete Mock Reference cost is calculable')
  assert.notEqual(calculateSnapshotCost(completeLoaded.snapshotPair.current).total, null, 'Complete Mock Current cost is calculable')

  await vite.ssrLoadModule('/scripts/verify_master_data_toolbar_prepare_ux.ts')
  await vite.ssrLoadModule('/scripts/verify_synthetic_review_fixture.ts')
  console.log('Post-load mock Working state is deterministic: Complete = 0 warnings; Incomplete = 3 / 9 / 3 = 15; history restores Custom Working data.')
} finally {
  await vite.close()
}
