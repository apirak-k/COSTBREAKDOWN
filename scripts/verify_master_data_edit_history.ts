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
