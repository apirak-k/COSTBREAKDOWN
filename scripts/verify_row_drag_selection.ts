import assert from 'node:assert/strict'
import { applyRowDragSelection } from '../src/shared/selection/row-drag-selection.ts'

const currentSelection = new Set(['kept-before', 'already-selected', 'kept-after'])
const selectionBeforeAdd = new Set(currentSelection)
const addedSelection = applyRowDragSelection(
  currentSelection,
  ['already-selected', 'dragged-in', 'dragged-in'],
  true
)

assert.deepEqual(addedSelection, new Set(['kept-before', 'already-selected', 'kept-after', 'dragged-in']),
  'selecting a drag path adds each traversed row and preserves existing selections')
assert.deepEqual(currentSelection, selectionBeforeAdd,
  'selecting a drag path does not mutate the source Set')

const selectionBeforeRemove = new Set(['kept-before', 'dragged-a', 'dragged-b', 'kept-after'])
const originalSelectionBeforeRemove = new Set(selectionBeforeRemove)
const removedSelection = applyRowDragSelection(
  selectionBeforeRemove,
  ['dragged-a', 'dragged-b', 'dragged-a'],
  false
)

assert.deepEqual(removedSelection, new Set(['kept-before', 'kept-after']),
  'deselecting a drag path removes each traversed row and preserves selections outside it')
assert.deepEqual(selectionBeforeRemove, originalSelectionBeforeRemove,
  'deselecting a drag path does not mutate the source Set')

assert.deepEqual(applyRowDragSelection(currentSelection, [], true), currentSelection,
  'an empty drag path leaves the selection unchanged')

console.log('Row drag selection self-check: PASS')
