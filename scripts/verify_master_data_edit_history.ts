import assert from 'node:assert/strict'
import type { CostSnapshot, ComparisonRole } from '../src/core/types'
import type { ProductSession } from '../src/core'
import {
  createMasterDataEditHistory,
  createMasterDataPairWorkingEditEntry,
  recordMasterDataEdit,
  undoMasterDataEdit,
  redoMasterDataEdit,
  applyMasterDataEditHistoryEntry
} from '../src/state/master-data-edit-history'
import { clearAllMasterDataWorkingState } from '../src/state/clear-master-data-dataset'
import { normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective'
import { resizeMasterDataSnapshotForSizing } from '../src/state/dataset-sizing'

function snapshot(id: string): CostSnapshot {
  return {
    id,
    product: { productCode: '', productDescription: '', productName: 'Product', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: 'history-verifier',
    status: 'draft',
    rates: [],
    bom: [],
    routing: []
  }
}

function edit(sessionId: string, role: ComparisonRole, beforeId: string, afterId: string) {
  return {
    sessionId,
    role,
    before: snapshot(beforeId),
    after: snapshot(afterId),
    beforePrepared: { reference: false, current: false },
    afterPrepared: { reference: role === 'reference', current: role === 'current' }
  }
}

let history = createMasterDataEditHistory()
history = recordMasterDataEdit(history, edit('session-a', 'reference', 'ref-before', 'ref-after'))
history = recordMasterDataEdit(history, edit('session-a', 'current', 'cur-before', 'cur-after'))

assert.equal(history.undo.length, 2, 'Edits from both Master Data sides share one page-level undo stack')
const undone = undoMasterDataEdit(history)
assert.equal(undone.entry?.role, 'current', 'Undo returns the latest edit even when it came from another table or side')
assert.equal(undone.history.undo.length, 1)
assert.equal(undone.history.redo.length, 1)

const redone = redoMasterDataEdit(undone.history)
assert.equal(redone.entry?.role, 'current', 'Redo reapplies the most recently undone page-level edit')
assert.equal(redone.history.undo.length, 2)
assert.equal(redone.history.redo.length, 0)

const branched = recordMasterDataEdit(undone.history, edit('session-a', 'reference', 'ref-after', 'ref-next'))
assert.equal(branched.undo.length, 2)
assert.equal(branched.redo.length, 0, 'A new edit after Undo clears the Redo branch')

const typingBefore: CostSnapshot = {
  ...snapshot('typing-before'),
  bom: [{ id: 'typing-row', itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price: 10, loss: 0,
    exactDecimalInputs: { price: '10' }, confidence: {} }]
}
const typedOnce: CostSnapshot = {
  ...typingBefore,
  id: 'typing-once',
  bom: [{ ...typingBefore.bom[0], description: 'Cut', price: 123.4, exactDecimalInputs: { price: '123.4' } }]
}
const typedFinally: CostSnapshot = {
  ...typingBefore,
  id: 'typing-final',
  bom: [{ ...typingBefore.bom[0], description: 'Cutting', price: 123.456789, exactDecimalInputs: { price: '123.456789' } }]
}
const transactionEdit = (before: CostSnapshot, after: CostSnapshot, key: string, role: ComparisonRole = 'current') => ({
  ...edit('session-a', role, before.id, after.id),
  before,
  after,
  coalescingKey: key
} as Parameters<typeof recordMasterDataEdit>[1])
let typingHistory = createMasterDataEditHistory()
typingHistory = recordMasterDataEdit(typingHistory, transactionEdit(typingBefore, typedOnce, 'focus-session-1'))
typingHistory = recordMasterDataEdit(typingHistory, transactionEdit(typedOnce, typedFinally, 'focus-session-1'))
assert.equal(typingHistory.undo.length, 1, 'Per-character changes in one focused field session form one Undo action')
assert.equal(typingHistory.undo[0].before.bom[0].description, 'Material', 'Coalescing retains the first before-value')
assert.equal(typingHistory.undo[0].after.bom[0].description, 'Cutting', 'Coalescing retains the final after-value')
assert.equal(typingHistory.undo[0].after.bom[0].exactDecimalInputs?.price, '123.456789',
  'Coalescing preserves the final exact-decimal sidecar')
typingHistory = recordMasterDataEdit(typingHistory, transactionEdit(typedFinally, { ...typedFinally, id: 'typed-note', bom: [
  { ...typedFinally.bom[0], note: 'Main process' }
] }, 'focus-session-2'))
assert.equal(typingHistory.undo.length, 2, 'A separate focus session remains a separate history action')
typingHistory = recordMasterDataEdit(typingHistory, edit('session-a', 'current', 'typed-note', 'after-bulk'))
assert.equal(typingHistory.undo.length, 3, 'A bulk/structural action remains separate from a focused typing session')
const typingUndo = undoMasterDataEdit(typingHistory)
assert.equal(typingUndo.entry?.after.id, 'after-bulk', 'Undo applies a later structural action first')
const fieldUndo = undoMasterDataEdit(typingUndo.history)
assert.equal(fieldUndo.entry?.after.bom[0].note, 'Main process', 'Undo then restores the prior independent field edit')
const valueUndo = undoMasterDataEdit(fieldUndo.history)
assert.equal(valueUndo.entry?.after.bom[0].description, 'Cutting', 'Undo finally restores the coalesced field edit')
assert.equal(valueUndo.entry?.after.bom[0].exactDecimalInputs?.price, '123.456789',
  'The coalesced Undo entry retains its exact decimal after-state')

let capped = createMasterDataEditHistory()
for (let index = 0; index < 105; index += 1) {
  capped = recordMasterDataEdit(capped, edit('session-a', 'current', `before-${index}`, `after-${index}`))
}
assert.equal(capped.undo.length, 100, 'History stays within its in-memory safety cap')
assert.equal(capped.undo[0].before.id, 'before-5', 'The oldest entries are discarded first')

const beforeReference = snapshot('reference-before')
const beforeCurrent = snapshot('current-before')
const afterCurrent = snapshot('current-after')
const lastSavedCurrent = snapshot('current-last-saved')
const session: ProductSession = {
  id: 'session-a',
  product: { ...beforeCurrent.product },
  rates: [],
  bom: [],
  routing: [],
  savedDrivers: [],
  candidateRcaRecords: {},
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  snapshotPair: { reference: beforeReference, current: afterCurrent },
  snapshotPairMode: 'independent',
  preparedSnapshotRoles: { reference: true, current: true },
  datasetSizing: { reference: { bomCount: 1 }, current: { bomCount: 2 } },
  lastSavedMasterData: {
    current: { snapshot: lastSavedCurrent, prepared: false, sizing: { bomCount: 3 } }
  }
}
const sessionEntry = {
  ...edit('session-a', 'current', beforeCurrent.id, afterCurrent.id),
  before: beforeCurrent,
  after: afterCurrent,
  beforePrepared: { reference: true, current: false },
  afterPrepared: { reference: true, current: true },
  beforeSizing: { reference: { bomCount: 1 }, current: { bomCount: 1 } },
  afterSizing: { reference: { bomCount: 1 }, current: { bomCount: 2 } }
}
const undoneSession = applyMasterDataEditHistoryEntry(session, sessionEntry, 'undo')
assert.ok(undoneSession, 'Undo applies when the current Working snapshot matches the history entry')
assert.equal(undoneSession.snapshotPair?.current.id, beforeCurrent.id, 'Undo restores only the edited side')
assert.equal(undoneSession.snapshotPair?.reference.id, beforeReference.id, 'Undo leaves the other dataset side unchanged')
assert.equal(undoneSession.preparedSnapshotRoles?.current, false, 'Undo restores side readiness from before the edit')
assert.equal(undoneSession.datasetSizing?.current.bomCount, 1, 'Undo restores the Working sizing state')
assert.equal(undoneSession.lastSavedMasterData?.current?.snapshot.id, lastSavedCurrent.id, 'Undo never rewrites Last Saved')

const redoneSession = applyMasterDataEditHistoryEntry(undoneSession, sessionEntry, 'redo')
assert.ok(redoneSession, 'Redo reapplies an entry when the current Working snapshot matches its before state')
assert.equal(redoneSession.snapshotPair?.current.id, afterCurrent.id, 'Redo restores the edited snapshot')
assert.equal(redoneSession.datasetSizing?.current.bomCount, 2, 'Redo restores the after sizing state')

function populatedSnapshot(id: string, name: string): CostSnapshot {
  return {
    ...snapshot(id),
    sourceRef: `${id}-source`,
    sizing: { bomCount: 1, wcCount: 1, routingCount: 1 },
    rates: [{ id: `${id}-rate`, workCenterCode: 'WC-1', description: 'Cutting', laborRate: 100, burdenRate: 50, effectiveDate: '', confidence: {} }],
    bom: [{
      id: `${id}-bom`, itemCode: 'MAT-1', description: name, consumption: 2, unit: 'PC', price: 10, loss: 0.05,
      exactDecimalInputs: { consumption: '2.00000000000000001', price: '10.00000000000000001', loss: '5.00000000000000001' },
      confidence: {}
    }],
    routing: [{
      id: `${id}-route`, operationCode: 'OP-10', processName: 'Cut', workCenterId: 'WC-1', manning: 1, capacity: 100, yield: 0.9,
      exactDecimalInputs: { manning: '1.00000000000000001', capacity: '100.00000000000000001', yield: '90.00000000000000001' },
      confidence: {}
    }]
  }
}

// Sizing shares the same Working history entry/apply path as other Master Data edits.
for (const role of ['reference', 'current', 'custom'] as const) {
  const seed = populatedSnapshot(`sizing-${role}`, `${role} retained material`)
  const before: CostSnapshot = normalizeMasterDataSnapshot({
    ...seed,
    sizing: { bomCount: 3, wcCount: 3, routingCount: 3 },
    bom: [1, 2, 3].map(index => ({ ...seed.bom[0], id: `${role}-bom-${index}`, itemCode: `MAT-${index}`,
      description: `${role} material ${index}`, unit: index === 3 ? 'custom lot / batch' : 'KG',
      consumption: index, price: 12.345678901234567, note: `BOM note ${index}`,
      exactDecimalInputs: { consumption: `${index}.00000000000000001`, price: '12.34567890123456789', loss: '5.00000000000000001' } })),
    rates: [1, 2, 3].map(index => ({ ...seed.rates[0], id: `${role}-rate-${index}`, workCenterCode: `WC-${index}`,
      description: `${role} Work Center ${index}`, laborRate: 100 + index, note: `WC note ${index}`,
      exactDecimalInputs: { laborRate: `${100 + index}.00000000000000001`, burdenRate: '50.00000000000000001' } })),
    routing: [1, 2, 3].map(index => ({ ...seed.routing[0], id: `${role}-route-${index}`, operationCode: `OP-${index}`,
      processName: `${role} process ${index}`, sequence: index * 10, manning: index, note: `Routing note ${index}`,
      exactDecimalInputs: { manning: `${index}.00000000000000001`, capacity: '100.00000000000000001', yield: '90.00000000000000001' } }))
  })
  const afterSizing = { bomCount: 2, wcCount: 2, routingCount: 2 }
  const after = normalizeMasterDataSnapshot(resizeMasterDataSnapshotForSizing(before, afterSizing, {
    bom: () => { throw new Error('A Sizing reduction must not generate BOM rows') },
    rate: () => { throw new Error('A Sizing reduction must not generate Work Centers') },
    routing: () => { throw new Error('A Sizing reduction must not generate Routing rows') }
  }), before)
  for (const table of ['bom', 'rates', 'routing'] as const) {
    assert.equal(after[table].length, 2, `${role} Sizing decreases ${table} from 3 to 2`)
    assert.deepEqual(after[table], before[table].slice(0, 2), `${role} Sizing preserves retained ${table} rows`)
  }
  assert.deepEqual(after.sizing, afterSizing, `${role} snapshot Sizing follows row counts`)
  const beforeSession: ProductSession = {
    ...session,
    snapshotPair: { reference: role === 'reference' ? before : beforeReference, current: role === 'current' ? before : beforeCurrent },
    customMasterData: role === 'custom' ? before : populatedSnapshot('unaffected-custom', 'Unchanged Custom'),
    datasetSizing: { reference: role === 'reference' ? before.sizing! : {}, current: role === 'current' ? before.sizing! : {} },
    customDatasetSizing: role === 'custom' ? before.sizing : {},
    customLastSavedMasterData: { snapshot: populatedSnapshot('saved-custom-sizing', 'Saved Custom'), prepared: true, sizing: { bomCount: 1 } }
  }
  const afterSession: ProductSession = role === 'custom'
    ? { ...beforeSession, customMasterData: after, customDatasetSizing: afterSizing }
    : { ...beforeSession, snapshotPair: { ...beforeSession.snapshotPair!, [role]: after },
      datasetSizing: { ...beforeSession.datasetSizing!, [role]: afterSizing } }
  const sizingEntry = {
    ...edit(beforeSession.id, role === 'custom' ? 'current' : role, before.id, after.id),
    role,
    before,
    after,
    beforePrepared: { ...beforeSession.preparedSnapshotRoles! },
    afterPrepared: { ...afterSession.preparedSnapshotRoles! },
    beforeSizing: beforeSession.datasetSizing,
    afterSizing: afterSession.datasetSizing,
    beforeCustomSizing: beforeSession.customDatasetSizing,
    afterCustomSizing: afterSession.customDatasetSizing
  }
  const sizingHistory = recordMasterDataEdit(createMasterDataEditHistory(), sizingEntry)
  const undoSizing = undoMasterDataEdit(sizingHistory)
  assert.ok(undoSizing.entry, `${role} Sizing records one real Master Data history entry`)
  const restored = applyMasterDataEditHistoryEntry(afterSession, undoSizing.entry, 'undo')
  assert.ok(restored, `${role} Sizing Undo applies through ordinary history restoration`)
  const restoredSnapshot = role === 'custom' ? restored.customMasterData : restored.snapshotPair?.[role]
  assert.deepEqual(restoredSnapshot, before, `${role} Sizing Undo restores all rows, IDs/order, text/Unit/numbers and exact sidecars`)
  assert.deepEqual(role === 'custom' ? restored.customDatasetSizing : restored.datasetSizing?.[role], before.sizing,
    `${role} Sizing Undo restores all three configured counts to 3`)
  const redoSizing = redoMasterDataEdit(undoSizing.history)
  assert.ok(redoSizing.entry)
  const reapplied = applyMasterDataEditHistoryEntry(restored, redoSizing.entry, 'redo')
  assert.ok(reapplied, `${role} Sizing Redo applies through ordinary history restoration`)
  assert.deepEqual(role === 'custom' ? reapplied.customMasterData : reapplied.snapshotPair?.[role], after,
    `${role} Sizing Redo restores the complete two-row state`)
  assert.deepEqual(role === 'custom' ? reapplied.customDatasetSizing : reapplied.datasetSizing?.[role], afterSizing,
    `${role} Sizing Redo restores all three configured counts to 2`)
  for (const state of [afterSession, restored, reapplied]) {
    assert.deepEqual(state.lastSavedMasterData, beforeSession.lastSavedMasterData, `${role} resize/Undo/Redo never changes Last Saved`)
    assert.deepEqual(state.customLastSavedMasterData, beforeSession.customLastSavedMasterData, `${role} resize/Undo/Redo preserves Custom Last Saved`)
  }
}
console.log('Sizing 3 → 2 → Undo → Redo restores BOM/Work Center/Routing data and exact sidecars for all roles: PASS')

const beforeClearAll: ProductSession = {
  ...session,
  snapshotPair: {
    reference: populatedSnapshot('all-ref', 'Reference material'),
    current: populatedSnapshot('all-current', 'Current material')
  },
  customMasterData: populatedSnapshot('all-custom', 'Custom material'),
  preparedSnapshotRoles: { reference: true, current: true },
  datasetSizing: { reference: { bomCount: 1, wcCount: 1, routingCount: 1 }, current: { bomCount: 1, wcCount: 1, routingCount: 1 } },
  customDatasetSizing: { bomCount: 1, wcCount: 1, routingCount: 1 },
  lastSavedMasterData: {
    reference: { snapshot: populatedSnapshot('saved-ref', 'Saved Reference'), prepared: true, sizing: { bomCount: 1 } },
    current: { snapshot: populatedSnapshot('saved-current', 'Saved Current'), prepared: true, sizing: { bomCount: 1 } }
  },
  customLastSavedMasterData: { snapshot: populatedSnapshot('saved-custom', 'Saved Custom'), prepared: true, sizing: { bomCount: 1 } },
  initialMasterDataBaseline: {
    reference: { snapshot: populatedSnapshot('initial-ref', 'Initial Reference'), prepared: false, sizing: { bomCount: 1 } },
    current: { snapshot: populatedSnapshot('initial-current', 'Initial Current'), prepared: false, sizing: { bomCount: 1 } },
    custom: { snapshot: populatedSnapshot('initial-custom', 'Initial Custom'), prepared: false, sizing: { bomCount: 1 } }
  }
}
const afterClearAll = clearAllMasterDataWorkingState(beforeClearAll)
const clearAllEntry = createMasterDataPairWorkingEditEntry(beforeClearAll, afterClearAll)
assert.ok(afterClearAll.snapshotPair?.reference.bom[0]?.description === ''
  && normalizeMasterDataSnapshot(afterClearAll.snapshotPair.reference).bom[0]?.description === 'Material 1',
'Clear All keeps raw blank business identity while normalization derives its UI label')
const oldNormalizedEntry = {
  ...clearAllEntry,
  afterPair: {
    reference: normalizeMasterDataSnapshot(afterClearAll.snapshotPair!.reference),
    current: normalizeMasterDataSnapshot(afterClearAll.snapshotPair!.current)
  }
}
assert.equal(applyMasterDataEditHistoryEntry(afterClearAll, oldNormalizedEntry, 'undo'), undefined,
  'regression fixture reproduces Undo rejection when history stores normalized snapshots against raw Cleared Working state')
const clearAllUndo = applyMasterDataEditHistoryEntry(afterClearAll, clearAllEntry, 'undo')
assert.ok(clearAllUndo, 'one real Clear All history entry restores every dataset')
assert.deepEqual(clearAllUndo.snapshotPair, beforeClearAll.snapshotPair, 'Undo restores Reference and Current snapshots exactly')
assert.deepEqual(clearAllUndo.customMasterData, beforeClearAll.customMasterData, 'Undo restores Custom exactly')
assert.deepEqual(clearAllUndo.datasetSizing, beforeClearAll.datasetSizing, 'Undo restores Reference / Current sizing')
assert.deepEqual(clearAllUndo.customDatasetSizing, beforeClearAll.customDatasetSizing, 'Undo restores Custom sizing')
assert.deepEqual(clearAllUndo.lastSavedMasterData, beforeClearAll.lastSavedMasterData, 'Undo preserves Last Saved')
assert.deepEqual(clearAllUndo.customLastSavedMasterData, beforeClearAll.customLastSavedMasterData, 'Undo preserves Custom Last Saved')
assert.equal(clearAllUndo.snapshotPair?.reference.bom[0]?.exactDecimalInputs?.price, '10.00000000000000001',
  'Undo restores exact decimal input sidecars')
assert.deepEqual(clearAllUndo.snapshotPair?.reference.bom.map(row => row.id), beforeClearAll.snapshotPair?.reference.bom.map(row => row.id),
  'Undo preserves row IDs and row ordering')
const clearAllRedo = applyMasterDataEditHistoryEntry(clearAllUndo, clearAllEntry, 'redo')
assert.ok(clearAllRedo, 'one Redo reapplies the same real Clear All action')
for (const [role, working, expectedId] of [
  ['Reference', clearAllRedo.snapshotPair?.reference, 'all-ref-bom'],
  ['Current', clearAllRedo.snapshotPair?.current, 'all-current-bom'],
  ['Custom', clearAllRedo.customMasterData, 'all-custom-bom']
] as const) {
  assert.equal(working?.bom[0]?.description, '', `${role} Redo retains the raw blank identity`)
  assert.equal(working?.bom[0]?.id, expectedId, `${role} Redo preserves the original row ID`)
  assert.equal(working?.bom[0]?.exactDecimalInputs, undefined, `${role} Redo clears numeric sidecars with the values`)
}
assert.deepEqual(clearAllRedo.lastSavedMasterData, beforeClearAll.lastSavedMasterData, 'Redo leaves Last Saved unchanged')

const preciseBefore = {
  ...snapshot('precise-before'),
  bom: [{
    id: 'precise-item', itemCode: 'MAT-1', description: 'Precise material', consumption: 1,
    price: Number('12.34567890123456789'), loss: 0, unit: 'PC',
    isGeneratedBusinessIdentity: false,
    exactDecimalInputs: { consumption: '1', price: '12.34567890123456789', loss: '0' }, confidence: {}
  }]
}
const preciseAfter = {
  ...preciseBefore,
  id: 'precise-after',
  bom: [{ ...preciseBefore.bom[0], exactDecimalInputs: { ...preciseBefore.bom[0].exactDecimalInputs, price: '12.34567890123456790' } }]
}
const preciseEntry = {
  ...edit('session-a', 'current', preciseBefore.id, preciseAfter.id),
  before: preciseBefore,
  after: preciseAfter
}
const preciseSession = {
  ...session,
  snapshotPair: { reference: beforeReference, current: preciseAfter }
}
const preciseUndo = applyMasterDataEditHistoryEntry(preciseSession, preciseEntry, 'undo')
assert.equal(preciseUndo?.snapshotPair?.current.bom[0].exactDecimalInputs?.price, '12.34567890123456789',
  'Undo restores exact decimal text even when its calculation Number cannot represent the final digit')
const preciseRedo = preciseUndo && applyMasterDataEditHistoryEntry(preciseUndo, preciseEntry, 'redo')
assert.equal(preciseRedo?.snapshotPair?.current.bom[0].exactDecimalInputs?.price, '12.34567890123456790',
  'Redo reapplies exact decimal text even when the calculation Number is unchanged')

const staleSession = {
  ...session,
  snapshotPair: { reference: beforeReference, current: snapshot('unexpected') }
}
assert.equal(applyMasterDataEditHistoryEntry(staleSession, sessionEntry, 'undo'), undefined, 'Stale history never overwrites a newer Working snapshot')

const mockAfterPair = { reference: snapshot('mock-reference'), current: snapshot('mock-current') }
const mockEntry = {
  ...edit('session-a', 'current', afterCurrent.id, mockAfterPair.current.id),
  beforePair: { reference: beforeReference, current: afterCurrent },
  afterPair: mockAfterPair,
  beforePrepared: { reference: true, current: true },
  afterPrepared: { reference: true, current: true },
  beforeSizing: { reference: { bomCount: 1 }, current: { bomCount: 2 } },
  afterSizing: { reference: { bomCount: 4 }, current: { bomCount: 5 } }
}
const mockSession = { ...session, snapshotPair: mockAfterPair }
const undoMock = applyMasterDataEditHistoryEntry(mockSession, mockEntry, 'undo')
assert.ok(undoMock, 'Undo applies the mock pair as one ordinary history entry')
assert.deepEqual(undoMock.snapshotPair, mockEntry.beforePair, 'Undo restores both mock-loaded Working snapshots together')
assert.equal(undoMock.lastSavedMasterData?.current?.snapshot.id, lastSavedCurrent.id, 'mock Undo leaves Last Saved untouched')
const redoMock = applyMasterDataEditHistoryEntry(undoMock, mockEntry, 'redo')
assert.ok(redoMock, 'Redo reapplies the mock pair after Undo')
assert.deepEqual(redoMock.snapshotPair, mockAfterPair, 'Redo restores the mock Working pair')
assert.equal(redoMock.lastSavedMasterData?.current?.snapshot.id, lastSavedCurrent.id, 'mock Redo leaves Last Saved untouched')

console.log('Master Data page-level edit history verification passed')
