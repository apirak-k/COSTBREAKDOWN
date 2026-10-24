import assert from 'node:assert/strict'
import type { CostSnapshot, ProductSession } from '../src/core/types'
import { applySimulationSnapshotsToMasterData } from '../src/state/simulation-send-to-master-data'
import { cloneMasterDataDatasetState, createEmptyCustomMasterData } from '../src/state/master-data-datasets'
import { applyMasterDataEditHistoryEntry, clearSavedDirectEditHistory, createMasterDataPairWorkingEditEntry } from '../src/state/master-data-edit-history'
import { clearMasterDataDirectEdits, directEditKey, directEditToken, pruneMasterDataDirectEdits, recordMasterDataDirectEdits } from '../src/state/master-data-direct-edits'

const initial: CostSnapshot = {
  id: 'synthetic-blue', status: 'draft', sourceRef: 'synthetic regression', effectiveDate: '',
  product: { productCode: '', productName: 'Synthetic', productDescription: '', customer: '', uom: 'PC', effectiveDate: '' },
  bom: [{ id: 'b', itemCode: 'B', description: 'Synthetic', consumption: 1, unit: 'PC', price: 10, loss: 0, confidence: {} }],
  rates: [], routing: []
}
const session = {
  id: 'synthetic-blue', customMasterData: createEmptyCustomMasterData('synthetic-blue'), product: initial.product, bom: [], rates: [], routing: [], savedDrivers: [],
  candidateRcaRecords: {}, status: 'draft', createdAt: '', updatedAt: '',
  snapshotPair: { reference: structuredClone(initial), current: structuredClone(initial) }
} as ProductSession
const source = { section: 'bom', recordId: 'b', field: 'price' }
const key = directEditKey(source)
const after = structuredClone(initial)
after.bom[0].exactDecimalInputs = { price: '10.00000000000000001' }
let edited = recordMasterDataDirectEdits(session, 'current', initial, after, [source])
assert.deepEqual(edited.masterDataDirectEdits?.current?.[key], { before: '10', after: '10.00000000000000001' }, 'Sub-Number exact-only edits retain provenance')
assert.equal(edited.masterDataDirectEdits?.reference, undefined, 'Other roles stay isolated')
const second = structuredClone(after)
second.bom[0].price = 12
second.bom[0].exactDecimalInputs.price = '12'
edited = recordMasterDataDirectEdits(edited, 'current', after, second, [source])
assert.equal(edited.masterDataDirectEdits?.current?.[key].before, '10', 'Repeated direct edits preserve original baseline')
const returned = recordMasterDataDirectEdits(edited, 'current', second, initial, [source])
assert.deepEqual(returned.masterDataDirectEdits?.current, {}, 'Returning directly to original value clears pending provenance')
assert.deepEqual(recordMasterDataDirectEdits(session, 'current', initial, initial, [source]).masterDataDirectEdits?.current, {}, 'No-op edits do not become pending')
const unrelated = { section: 'product', recordId: '', field: 'sellingPrice' }
const multi = structuredClone(second)
multi.product.sellingPrice = 20
const multiple = recordMasterDataDirectEdits(edited, 'current', second, multi, [unrelated])
assert.equal(Object.keys(multiple.masterDataDirectEdits?.current ?? {}).length, 2, 'Multiple independent direct sources are retained')
assert.equal(directEditToken(multi, source), '12', 'Numeric token preserves exact intent')
const removed = structuredClone(multi)
removed.bom = []
const pruned = pruneMasterDataDirectEdits(multiple, 'current', removed)
assert.equal(pruned.masterDataDirectEdits?.current?.[key], undefined, 'Removed rows cannot leave stale blue provenance')
assert.ok(pruned.masterDataDirectEdits?.current?.[directEditKey(unrelated)], 'Unchanged pending source survives pruning')
const saved = clearMasterDataDirectEdits(multiple, ['current'])
assert.equal(saved.masterDataDirectEdits?.current, undefined, 'Owning Save/reset/system replacement clears pending role')
assert.equal(session.masterDataDirectEdits, undefined, 'Existing sessions without provenance remain compatible')
assert.equal(initial.bom[0].price, 10, 'Provenance changes never mutate the value snapshot')
// Exercise the actual existing compound history adapter with provenance attached.
const applied = { ...multiple, snapshotPair: { ...session.snapshotPair!, current: multi } }
const entry = createMasterDataPairWorkingEditEntry(session, applied)
const undo = applyMasterDataEditHistoryEntry(applied, entry, 'undo')!
assert.ok(undo, 'Real history applies Undo')
assert.equal(undo.masterDataDirectEdits?.current, undefined, 'Undo removes restored source provenance')
const redo = applyMasterDataEditHistoryEntry(undo, entry, 'redo')!
assert.ok(redo, 'Real history applies Redo')
assert.deepEqual(redo.masterDataDirectEdits?.current, multiple.masterDataDirectEdits?.current, 'Redo restores both unsaved direct sources')
const retired = clearSavedDirectEditHistory({ undo: [entry], redo: [] }, ['current'], applied)
assert.equal(retired.undo.length, 1, 'Save retires provenance without changing history grouping')
assert.deepEqual(retired.undo[0].beforePair, entry.beforePair, 'Save preserves actual business history snapshots')
const undoSaved = applyMasterDataEditHistoryEntry(clearMasterDataDirectEdits(applied, ['current']), retired.undo[0], 'undo')!
const redoSaved = applyMasterDataEditHistoryEntry(undoSaved, retired.undo[0], 'redo')!
assert.deepEqual(Object.keys(redoSaved.masterDataDirectEdits?.current ?? {}), [], 'Undo/Redo after Save cannot revive retired blue indication')
const systemCloned = cloneMasterDataDatasetState(applied, 'reference', 'current')
assert.equal(systemCloned.masterDataDirectEdits?.current, undefined, 'Real Clone path clears destination direct provenance')
assert.equal(systemCloned.snapshotPair?.current.bom[0].price, 10, 'Clone retains its existing source-value behavior')
const sent = applySimulationSnapshotsToMasterData(applied, { current: second })
assert.ok(sent, 'Real Simulation Send helper accepts the synthetic snapshot')
assert.equal(sent.session.masterDataDirectEdits?.current, undefined, 'Simulation Send replacement is not a direct manual edit')
const otherSessionEntry = { ...entry, sessionId: 'other-product' }
const scoped = clearSavedDirectEditHistory({ undo: [entry, otherSessionEntry], redo: [] }, ['current'], applied)
assert.equal(scoped.undo[1], otherSessionEntry, 'Saving active product does not retire another product direct-edit history')
const saveUndone = clearSavedDirectEditHistory({ undo: [], redo: [entry] }, ['current'], undo)
assert.deepEqual(saveUndone.redo[0].afterDirectEdits?.current, multiple.masterDataDirectEdits?.current, 'Saving undone baseline keeps redo edits that were never saved')
const redoAfterSavingBaseline = applyMasterDataEditHistoryEntry(clearMasterDataDirectEdits(undo, ['current']), saveUndone.redo[0], 'redo')!
assert.deepEqual(redoAfterSavingBaseline.masterDataDirectEdits?.current, multiple.masterDataDirectEdits?.current, 'Undo→Save original→Redo restores unsaved blue sources')
console.log('Master Data direct-edit provenance regression PASS (26 assertions)')
