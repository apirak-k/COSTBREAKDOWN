import assert from 'node:assert/strict'
import type { CostSnapshot, ProductSession } from '../src/core/types'
import {
  getMasterDataSnapshot,
  initializeCustomMasterData,
  setMasterDataSnapshot
} from '../src/state/master-data-datasets.ts'

function snapshot(id: string): CostSnapshot {
  return {
    id,
    product: { productCode: id, productDescription: '', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [],
    bom: [],
    routing: []
  }
}

const reference = snapshot('reference')
const current = snapshot('current')
const legacySession: ProductSession = {
  id: 'session-custom-verification',
  product: current.product,
  rates: [],
  bom: [],
  routing: [],
  savedDrivers: [],
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  snapshotPair: { reference, current },
  snapshotPairMode: 'independent',
  datasetSizing: { reference: { bomCount: 1 }, current: { bomCount: 2 } }
}

const initialized = initializeCustomMasterData(legacySession)
const custom = getMasterDataSnapshot(initialized, initialized.snapshotPair!, 'custom')
assert.ok(custom, 'An older saved session receives a Custom workspace during migration')
assert.notStrictEqual(custom, reference, 'Custom must never alias Reference')
assert.notStrictEqual(custom, current, 'Custom must never alias Current')
assert.equal(custom.product.productCode, '', 'A legacy session starts Custom as a blank workspace')
assert.equal(initialized.datasetSizing?.reference?.bomCount, 1)
assert.equal(initialized.datasetSizing?.current?.bomCount, 2)
assert.deepEqual(initialized.customDatasetSizing, {}, 'Custom sizing is initialized independently')

const editedCustom = { ...custom, product: { ...custom.product, productCode: 'CUSTOM-001' } }
const updated = setMasterDataSnapshot(initialized, initialized.snapshotPair!, 'custom', editedCustom)
assert.strictEqual(updated.snapshotPair?.reference, reference, 'Custom edits preserve the Reference snapshot')
assert.strictEqual(updated.snapshotPair?.current, current, 'Custom edits preserve the Current snapshot')
assert.equal(updated.customMasterData?.product.productCode, 'CUSTOM-001')

console.log('Custom Master Data isolation and migration verification passed')
