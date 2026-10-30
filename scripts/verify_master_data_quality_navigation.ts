import assert from 'node:assert/strict'
import { advanceQualityNavigationCursor, type QualityNavigationCursorState } from '../src/features/master-data/hooks/useQualityNavigationCursor.ts'

type Issue = { id: string; rowId: string; field: string }

function createNavigator<T extends Issue>(contextKey: string) {
  let cursor: QualityNavigationCursorState | null = null
  return (items: readonly T[]) => {
    const next = advanceQualityNavigationCursor(cursor, contextKey, items)
    cursor = next.cursor
    return next.item
  }
}

const bomBlockers: Issue[] = [
  { id: 'B1', rowId: 'row-1', field: 'consumption' },
  { id: 'B2', rowId: 'row-1', field: 'price' },
  { id: 'B3', rowId: 'row-1', field: 'loss' },
  { id: 'B4', rowId: 'row-2', field: 'consumption' },
  { id: 'B5', rowId: 'row-2', field: 'price' },
  { id: 'B6', rowId: 'row-2', field: 'loss' },
  { id: 'B7', rowId: 'row-3', field: 'consumption' },
  { id: 'B8', rowId: 'row-3', field: 'price' },
  { id: 'B9', rowId: 'row-3', field: 'loss' },
  { id: 'B10', rowId: 'row-4', field: 'price' }
]
const bomNext = createNavigator('product-1:current:bom')
assert.deepEqual(
  Array.from({ length: 11 }, () => bomNext(bomBlockers)?.id),
  ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B1'],
  'BOM visits ten field-level blockers across four rows before wrapping'
)
assert.deepEqual(bomBlockers.slice(0, 3).map(item => item.field), ['consumption', 'price', 'loss'],
  'multiple blockers in one row remain distinct field-level visits')

const rerenderNext = createNavigator('product-1:current:bom')
assert.equal(rerenderNext(bomBlockers)?.id, 'B1')
assert.equal(rerenderNext(bomBlockers.map(item => ({ ...item })))?.id, 'B2',
  'equivalent arrays with new object identities do not reset traversal')
assert.equal(rerenderNext(bomBlockers.map(item => ({ ...item })))?.id, 'B3',
  'View/Edit, search clearing, and focus changes leave the semantic navigation scope intact')

const resolveCurrentNext = createNavigator('product-1:current:bom')
assert.deepEqual(
  Array.from({ length: 4 }, () => resolveCurrentNext(bomBlockers)?.id),
  ['B1', 'B2', 'B3', 'B4']
)
const afterResolvingB4 = bomBlockers.filter(item => item.id !== 'B4')
assert.equal(resolveCurrentNext(afterResolvingB4)?.id, 'B5',
  'resolving the last visited blocker continues at the next remaining logical issue')
assert.equal(resolveCurrentNext(afterResolvingB4.filter(item => item.id !== 'B5'))?.id, 'B6',
  'the cursor skips multiple resolved issues while preserving forward traversal')

let contextCursor: QualityNavigationCursorState | null = null
const navigateInScope = (contextKey: string, items: readonly Issue[]) => {
  const next = advanceQualityNavigationCursor(contextCursor, contextKey, items)
  contextCursor = next.cursor
  return next.item
}
assert.equal(navigateInScope('product-1:current:bom', bomBlockers)?.id, 'B1')
assert.equal(navigateInScope('product-1:current:bom', bomBlockers)?.id, 'B2')
assert.equal(navigateInScope('product-1:reference:bom', [{ id: 'R1', rowId: 'row-r1', field: 'price' }])?.id, 'R1',
  'changing dataset role resets the cursor')
assert.equal(navigateInScope('product-1:current:bom', bomBlockers)?.id, 'B1',
  'returning to a previous role starts its new traversal at the first issue')
assert.equal(navigateInScope('product-2:current:bom', [{ id: 'D1', rowId: 'row-d1', field: 'price' }])?.id, 'D1',
  'changing product dataset resets the cursor')
assert.equal(navigateInScope('product-1:current:wc', [{ id: 'WC1', rowId: 'wc-1', field: 'laborRate' }])?.id, 'WC1',
  'changing table context resets the cursor')

const wcNext = createNavigator('product-1:current:wc')
const routingNext = createNavigator('product-1:current:routing')
assert.deepEqual([wcNext([{ id: 'WC1', rowId: 'wc-1', field: 'laborRate' }])?.id, wcNext([{ id: 'WC2', rowId: 'wc-2', field: 'burdenRate' }])?.id],
  ['WC1', 'WC2'], 'Work Center field issues use the shared stable cursor')
assert.equal(routingNext([{ id: 'RTG1', rowId: 'rtg-1', field: 'manning' }])?.id, 'RTG1',
  'Routing has an independent table-local cursor')
assert.equal(wcNext([]), undefined, 'an empty Work Center issue list is safe')
assert.equal(wcNext([{ id: 'WC3', rowId: 'wc-3', field: 'laborRate' }])?.id, 'WC3',
  'navigation restarts safely when issues return after an empty list')

const warningNext = createNavigator('product-1:current:bom')
const warnings: Issue[] = [{ id: 'W1', rowId: 'row-1', field: 'description' }, { id: 'W2', rowId: 'row-2', field: 'description' }]
assert.equal(warningNext(warnings)?.id, 'W1')
assert.equal(warningNext(warnings.map(item => ({ ...item })))?.id, 'W2',
  'Warning navigation receives the same stable-identity behavior')

console.log('Master Data Warning/Blocker navigation cursor verification passed')
