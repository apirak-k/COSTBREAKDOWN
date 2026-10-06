import assert from 'node:assert/strict'
import type { CostSnapshot, ComparisonRole } from '../src/core/types'
import {
  createMasterDataEditHistory,
  recordMasterDataEdit,
  undoMasterDataEdit,
  redoMasterDataEdit
} from '../src/state/master-data-edit-history'

function snapshot(id: string): CostSnapshot {
  return {
    id,
    product: { productCode: '', productDescription: '', productName: '', uom: '', customer: '', effectiveDate: '' },
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

console.log('Master Data page-level edit history verification passed')
