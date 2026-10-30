import assert from 'node:assert/strict'
import { createServer } from 'vite'
import type { CostSnapshot, ProductSession, SnapshotPair } from '../src/core/types'
import {
  applyMasterDataEditHistoryEntry,
  createMasterDataEditHistory,
  createMasterDataPairWorkingEditEntry,
  recordMasterDataEdit,
  redoMasterDataEdit,
  undoMasterDataEdit
} from '../src/state/master-data-edit-history'
import { applySimulationSnapshotsToMasterData } from '../src/state/simulation-send-to-master-data'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { createCompleteMasterDataMockPair } = await vite.ssrLoadModule('/src/features/master-data/fixtures/synthetic-review-data.ts')
  const {
    createEmptySimulationState,
    prepareSimulationSendAll
  } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

  const pair = createCompleteMasterDataMockPair() as SnapshotPair
  pair.reference = {
    ...pair.reference,
    product: { ...pair.reference.product, productName: 'Reference Working Product', sellingPrice: 310, exactDecimalInputs: { sellingPrice: '310.00000000000000001' } }
  }
  pair.current = {
    ...pair.current,
    product: { ...pair.current.product, productName: 'Current Working Product', sellingPrice: 320, exactDecimalInputs: { sellingPrice: '320.00000000000000001' } }
  }
  const { comparisonRole: _comparisonRole, ...customSource } = structuredClone(pair.current)
  const custom = {
    ...customSource,
    id: 'send-all-session:custom',
    product: { ...pair.current.product, productName: 'Custom Working Product', sellingPrice: 330, exactDecimalInputs: { sellingPrice: '330.00000000000000001' } },
    sizing: { wcCount: pair.current.rates.length + 1, bomCount: pair.current.bom.length + 2, routingCount: pair.current.routing.length + 3 }
  } as CostSnapshot
  const sources = { ...pair, custom }
  const now = '2026-10-24T00:00:00.000Z'
  const snapshot = (role: 'reference' | 'current' | 'custom') => role === 'custom' ? custom : pair[role]
  const initialBaselines = {
    reference: { snapshot: structuredClone(pair.reference), prepared: true, sizing: { ...pair.reference.sizing } },
    current: { snapshot: structuredClone(pair.current), prepared: true, sizing: { ...pair.current.sizing } },
    custom: { snapshot: structuredClone(custom), prepared: true, sizing: { ...custom.sizing } }
  }
  const session: ProductSession = {
    id: 'send-all-session',
    product: { ...pair.current.product },
    rates: [],
    bom: [],
    routing: [],
    savedDrivers: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    snapshotPair: structuredClone(pair),
    snapshotPairMode: 'independent',
    preparedSnapshotRoles: { reference: true, current: true },
    datasetSizing: {
      reference: { ...pair.reference.sizing },
      current: { ...pair.current.sizing }
    },
    customMasterData: structuredClone(custom),
    customDatasetSizing: { ...custom.sizing },
    lastSavedMasterData: {
      reference: { snapshot: structuredClone(pair.reference), prepared: true, sizing: { ...pair.reference.sizing } },
      current: { snapshot: structuredClone(pair.current), prepared: true, sizing: { ...pair.current.sizing } }
    },
    customLastSavedMasterData: { snapshot: structuredClone(custom), prepared: true, sizing: { ...custom.sizing } },
    initialMasterDataBaseline: initialBaselines
  }
  const savedBefore = structuredClone({
    lastSavedMasterData: session.lastSavedMasterData,
    customLastSavedMasterData: session.customLastSavedMasterData,
    initialMasterDataBaseline: session.initialMasterDataBaseline
  })
  let simulation = createEmptySimulationState(sources)

  const refItem = snapshot('reference').bom[0]
  const currentItem = snapshot('current').bom[0]
  const customRoute = snapshot('custom').routing[0]
  simulation = updateSimulationParameter(simulation, sources, refItem.id, 'bom.price', Number('12.34567890123456789'), 'reference', '12.34567890123456789')
  simulation = updateSimulationParameter(simulation, sources, currentItem.id, 'bom.consumption', Number('2.00000000000000001'), 'current', '2.00000000000000001')
  simulation = updateSimulationParameter(simulation, sources, customRoute.id, 'routing.manning', Number('1.00000000000000001'), 'custom', '1.00000000000000001')
  const sentSnapshots = prepareSimulationSendAll(simulation, sources) as Record<'reference' | 'current' | 'custom', CostSnapshot>
  assert.deepEqual(Object.keys(sentSnapshots), ['reference', 'current', 'custom'], 'Send All prepares all three roles in stable role order')
  assert.equal(sentSnapshots.reference.bom[0].exactDecimalInputs?.price, '12.34567890123456789')
  assert.equal(sentSnapshots.current.bom[0].exactDecimalInputs?.consumption, '2.00000000000000001')
  assert.equal(sentSnapshots.custom.routing[0].exactDecimalInputs?.manning, '1.00000000000000001')
  assert.deepEqual(
    Object.fromEntries((['reference', 'current', 'custom'] as const).map(role => [role, sentSnapshots[role].product.productName])),
    { reference: 'Reference Working Product', current: 'Current Working Product', custom: 'Custom Working Product' },
    'Send All prepares each role with its own product-level Working values'
  )

  const sendResult = applySimulationSnapshotsToMasterData(session, sentSnapshots, '2026-10-24T00:01:00.000Z')
  assert.ok(sendResult, 'valid three-role Simulation snapshots apply as one Master Data transaction')
  assert.deepEqual(sendResult.roles, ['reference', 'current', 'custom'])
  const sent = sendResult.session
  assert.deepEqual(sent.lastSavedMasterData, savedBefore.lastSavedMasterData, 'Send All leaves Reference and Current Last Saved untouched')
  assert.deepEqual(sent.customLastSavedMasterData, savedBefore.customLastSavedMasterData, 'Send All leaves Custom Last Saved untouched')
  assert.deepEqual(sent.initialMasterDataBaseline, savedBefore.initialMasterDataBaseline, 'Send All leaves reset baselines untouched')
  for (const role of ['reference', 'current', 'custom'] as const) {
    const actual = role === 'custom' ? sent.customMasterData! : sent.snapshotPair![role]
    const expected = sentSnapshots[role]
    assert.equal(actual.product.exactDecimalInputs?.sellingPrice, expected.product.exactDecimalInputs?.sellingPrice, `${role} product exact decimal maps to the same destination role`)
    assert.equal(actual.product.productName, expected.product.productName, `${role} product identity maps to the same destination role`)
    assert.deepEqual(actual.bom.map(row => row.id), expected.bom.map(row => row.id), `${role} BOM row IDs/order are preserved`)
    assert.deepEqual(actual.rates.map(row => row.id), expected.rates.map(row => row.id), `${role} Work Center row IDs/order are preserved`)
    assert.deepEqual(actual.routing.map(row => row.id), expected.routing.map(row => row.id), `${role} Routing row IDs/order are preserved`)
    assert.deepEqual(actual.sizing, {
      ...(expected.sizing ?? {}),
      wcCount: expected.rates.length,
      bomCount: expected.bom.length,
      routingCount: expected.routing.length
    }, `${role} sizing follows the sent role's actual table row counts`)
    assert.deepEqual(actual.rates, expected.rates, `${role} Work Center rates remain intact`)
  }

  const history = recordMasterDataEdit(createMasterDataEditHistory(), createMasterDataPairWorkingEditEntry(session, sent))
  assert.equal(history.undo.length, 1, 'Send All records one compound Master Data history entry')
  const undoStep = undoMasterDataEdit(history)
  assert.ok(undoStep.entry)
  const undone = applyMasterDataEditHistoryEntry(sent, undoStep.entry!, 'undo')
  assert.ok(undone, 'one Master Data Undo accepts the complete sent post-state')
  assert.deepEqual(undone.snapshotPair, session.snapshotPair, 'one Undo restores Reference and Current exactly, including row order and exact decimals')
  assert.deepEqual(undone.customMasterData, session.customMasterData, 'one Undo restores Custom exactly')
  assert.deepEqual(undone.datasetSizing, session.datasetSizing, 'one Undo restores both comparison role sizing states')
  assert.deepEqual(undone.customDatasetSizing, session.customDatasetSizing, 'one Undo restores Custom sizing')
  assert.deepEqual(undone.lastSavedMasterData, savedBefore.lastSavedMasterData, 'one Undo leaves comparison Last Saved untouched')
  assert.deepEqual(undone.customLastSavedMasterData, savedBefore.customLastSavedMasterData, 'one Undo leaves Custom Last Saved untouched')

  const redoStep = redoMasterDataEdit(undoStep.history)
  assert.ok(redoStep.entry)
  const redone = applyMasterDataEditHistoryEntry(undone, redoStep.entry!, 'redo')
  assert.ok(redone, 'one Master Data Redo accepts the complete restored pre-state')
  assert.deepEqual(redone.snapshotPair, sent.snapshotPair, 'one Redo reapplies Reference and Current atomically')
  assert.deepEqual(redone.customMasterData, sent.customMasterData, 'one Redo reapplies Custom atomically')
  assert.deepEqual(redone.datasetSizing, sent.datasetSizing)
  assert.deepEqual(redone.customDatasetSizing, sent.customDatasetSizing)
  assert.deepEqual(redone.lastSavedMasterData, savedBefore.lastSavedMasterData, 'Redo leaves comparison Last Saved untouched')
  assert.deepEqual(redone.customLastSavedMasterData, savedBefore.customLastSavedMasterData, 'Redo leaves Custom Last Saved untouched')
  assert.deepEqual(snapshot('reference').rates, pair.reference.rates, 'fixture remains the original role source')
  console.log('Simulation Send All → Master Data Undo/Redo verification: PASS')
} finally {
  await vite.close()
}
