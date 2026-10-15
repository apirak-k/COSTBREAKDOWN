import assert from 'node:assert/strict'
import {
  createCandidateReorderHistory,
  recordCandidateReorder,
  redoCandidateReorder,
  resetCandidateReorderHistory,
  reorderCandidateRowKeys,
  undoCandidateReorder
} from '../src/features/cost-breakdown/candidate-reorder-history.ts'

const initial = createCandidateReorderHistory()
assert.deepEqual(reorderCandidateRowKeys(['A', 'B', 'C', 'D'], 'B', 'A', false), ['B', 'A', 'C', 'D'])
assert.deepEqual(reorderCandidateRowKeys(['A', 'B', 'C', 'D'], 'B', 'D', true), ['A', 'C', 'D', 'B'])
assert.deepEqual(
  reorderCandidateRowKeys(['A', 'B', 'C', 'D'], 'C', 'A', false, ['B', 'C']),
  ['B', 'C', 'A', 'D'],
  'selected rows move as one group while preserving their visible relative order'
)
assert.deepEqual(
  reorderCandidateRowKeys(['A', 'B', 'C', 'D'], 'C', 'B', false, ['B', 'C']),
  ['A', 'B', 'C', 'D'],
  'dropping a selected group on one of its members does not reorder it'
)

const bomFirst = recordCandidateReorder(initial, 'bom', ['D', 'A', 'B', 'C'])
const routingSecond = recordCandidateReorder(bomFirst, 'routing', ['R2', 'R1'])
const bomThird = recordCandidateReorder(routingSecond, 'bom', ['D', 'C', 'A', 'B'])
assert.equal(bomThird.undo.length, 3, 'each completed BOM or Routing reorder creates one chronological history entry')

const undoThird = undoCandidateReorder(bomThird)
assert.deepEqual(undoThird.manualOrders, routingSecond.manualOrders, 'Undo reverses the latest BOM action first')
const undoSecond = undoCandidateReorder(undoThird)
assert.deepEqual(undoSecond.manualOrders, bomFirst.manualOrders, 'the next Undo reverses the preceding Routing action')
const undoFirst = undoCandidateReorder(undoSecond)
assert.deepEqual(undoFirst.manualOrders, initial.manualOrders, 'the third Undo restores the initial BOM and Routing orders')

const redoFirst = redoCandidateReorder(undoFirst)
const redoSecond = redoCandidateReorder(redoFirst)
const redoThird = redoCandidateReorder(redoSecond)
assert.deepEqual(redoThird.manualOrders, bomThird.manualOrders, 'Redo replays the shared cross-table history chronologically')

const undone = undoCandidateReorder(bomThird)
const branched = recordCandidateReorder(undone, 'routing', ['R1', 'R2'])
assert.equal(branched.redo.length, 0, 'a new reorder after Undo clears the Redo branch')
assert.deepEqual(resetCandidateReorderHistory(), initial, 'Sort or Reapply Sort can reset both table orders and all history')

console.log('CBD Candidate reorder history verification passed.')
