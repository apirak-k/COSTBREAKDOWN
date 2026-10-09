import assert from 'node:assert/strict'
import type { CostSnapshot, ComparisonRole } from '../src/core/types'
import type { ProductSession } from '../src/core'
import {
  createMasterDataEditHistory,
  recordMasterDataEdit,
  undoMasterDataEdit,
  redoMasterDataEdit,
  applyMasterDataEditHistoryEntry
} from '../src/state/master-data-edit-history'

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
