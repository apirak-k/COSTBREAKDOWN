import assert from 'node:assert/strict'
import type { CostSnapshot } from '../src/core/types'
import { editableIdentityValue, preferIdentityEditorDraft } from '../src/features/master-data/table-validation.ts'
import { propagateWorkCenterRenames } from '../src/state/master-data-work-center-rename.ts'

const snapshot: CostSnapshot = {
  id: 'current',
  product: { productName: '', uom: '' },
  bom: [],
  rates: [
    { id: 'wc-a', workCenterCode: 'WC-A', description: 'Cutting', laborRate: 1, burdenRate: 1, confidence: {} },
    { id: 'wc-b', workCenterCode: 'WC-B', description: 'Drilling', laborRate: 1, burdenRate: 1, confidence: {} }
  ],
  routing: [
    { id: 'route-1', processName: 'Cut', workCenterId: 'WC-A', manning: 1, capacity: 1, yield: 1 },
    { id: 'route-2', processName: 'Drill', workCenterId: 'WC-B', manning: 1, capacity: 1, yield: 1 },
    { id: 'route-3', processName: 'Cut again', workCenterId: 'WC-A', manning: 1, capacity: 1, yield: 1 }
  ]
}

assert.equal(editableIdentityValue('Material 1', true), '', 'generated BOM identity remains an empty editor value')
assert.equal(editableIdentityValue('Work Center 1', true), '', 'generated Work Center identity remains an empty editor value')
assert.equal(editableIdentityValue('Process 1', true), '', 'generated Routing identity remains an empty editor value')
assert.equal(editableIdentityValue('WC-A', false), 'WC-A', 'explicit identity stays visible in its editor')
assert.equal(preferIdentityEditorDraft('', 'Work Center 1'), '', 'an empty focused edit stays empty while normalization keeps an effective generated identity')
assert.equal(preferIdentityEditorDraft('WC-DUPLICATE', 'WC-DUPLICATE(2)'), 'WC-DUPLICATE', 'the focused text draft is not replaced by automatic duplicate renaming mid-edit')

const after = propagateWorkCenterRenames(
  snapshot,
  {
    ...snapshot,
    rates: snapshot.rates.map(rate => rate.id === 'wc-a' ? { ...rate, workCenterCode: 'WC-B(1)' } : rate)
  },
  [{ id: 'wc-a', changes: { workCenterCode: 'WC-B' } }],
  new Map([['wc-a', new Set(['route-1', 'route-3'])]])
)
assert.deepEqual(after.routing.map(step => step.workCenterId), ['WC-B(1)', 'WC-B', 'WC-B(1)'],
  'renaming a Work Center updates only Routing rows linked to its identity')

const inferred = propagateWorkCenterRenames(
  snapshot,
  { ...snapshot, rates: snapshot.rates.map(rate => rate.id === 'wc-a' ? { ...rate, workCenterCode: 'WC-C' } : rate) },
  [{ id: 'wc-a', changes: { workCenterCode: 'WC-C' } }]
)
assert.deepEqual(inferred.routing.map(step => step.workCenterId), ['WC-C', 'WC-B', 'WC-C'],
  'paste/bulk updates infer and propagate the old Work Center identity')

console.log('✓ generated identity editors stay empty without losing their effective labels')
console.log('✓ Work Center renames propagate atomically to linked Routing references')
