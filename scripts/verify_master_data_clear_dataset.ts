import assert from 'node:assert/strict'
import type { CostSnapshot, ProductSession, SnapshotPair } from '../src/core/types'
import { updateCurrentSnapshotFromLegacySession } from '../src/core/migrations/snapshot-to-session.ts'
import { clearMasterDataDatasetState } from '../src/state/clear-master-data-dataset.ts'
import { emptyProductMaster } from '../src/state/seed-data.ts'

function dataset(role: 'reference' | 'current'): CostSnapshot {
  const current = role === 'current'
  return {
    id: `dataset-${role}`,
    product: {
      productCode: current ? 'CUR-001' : 'REF-001',
      productDescription: current ? 'Current product' : 'Reference product',
      uom: 'PC',
      note: `${role} product note`,
      customer: '',
      effectiveDate: ''
    },
    effectiveDate: '',
    sourceRef: `fixture-${role}`,
    comparisonRole: role,
    status: 'draft',
    remark: `${role} remark`,
    sizing: { wcCount: current ? 5 : 2, bomCount: current ? 6 : 3, routingCount: current ? 7 : 4 },
    rates: [{
      id: `rate-${role}`,
      workCenterCode: `WC-${role}`,
      description: `${role} work center`,
      laborRate: 10,
      burdenRate: 5,
      effectiveDate: '',
      note: `${role} rate note`,
      confidence: {}
    }],
    bom: [{
      id: `bom-${role}`,
      itemCode: `MAT-${role}`,
      description: `${role} material`,
      consumption: 1,
      unit: 'PC',
      price: 2,
      loss: 0,
      note: `${role} BOM note`,
      confidence: {}
    }],
    routing: [{
      id: `routing-${role}`,
      operationCode: current ? '20' : '10',
      sequence: 10,
      processName: `${role} process`,
      workCenterId: `WC-${role}`,
      manning: 1,
      capacity: 100,
      yield: 1,
      note: `${role} routing note`,
      confidence: {}
    }]
  }
}

const pair: SnapshotPair = { reference: dataset('reference'), current: dataset('current') }
const savedMasterData = {
  reference: { snapshot: pair.reference, prepared: true, sizing: { ...pair.reference.sizing } },
  current: { snapshot: pair.current, prepared: true, sizing: { ...pair.current.sizing } }
}
const session = {
  id: 'clear-fixture',
  product: pair.current.product,
  rates: [],
  bom: [],
  routing: [],
  savedDrivers: [],
  candidateRcaRecords: {},
  status: 'draft',
  createdAt: '',
  updatedAt: '',
  preparedSnapshotRoles: { reference: true, current: true },
  lastSavedMasterData: savedMasterData,
  datasetSizing: {
    reference: { ...pair.reference.sizing },
    current: { ...pair.current.sizing }
  },
  snapshotPair: pair,
  snapshotPairMode: 'independent'
} as ProductSession

const clearedReference = clearMasterDataDatasetState(session, 'reference')
assert.equal(clearedReference.masterDataRevision, 1, 'Clearing Reference must invalidate saved RCA scenarios')
assert.strictEqual(clearedReference.lastSavedMasterData, savedMasterData, 'Clearing Reference must retain both Last Saved datasets')
assert.deepEqual(clearedReference.lastSavedMasterData?.reference?.snapshot, pair.reference)
assert.deepEqual(clearedReference.lastSavedMasterData?.current?.snapshot, pair.current)
assert.strictEqual(clearedReference.snapshotPair?.current, pair.current)
assert.equal(clearedReference.snapshotPair?.reference.product.productCode, emptyProductMaster.productCode)
assert.equal(clearedReference.snapshotPair?.reference.product.note, emptyProductMaster.note)
assert.equal(clearedReference.snapshotPair?.reference.remark, '')
assert.deepEqual(clearedReference.snapshotPair?.reference.rates, [])
assert.deepEqual(clearedReference.snapshotPair?.reference.bom, [])
assert.deepEqual(clearedReference.snapshotPair?.reference.routing, [])
assert.equal(clearedReference.snapshotPair?.reference.sizing, undefined)
assert.deepEqual(clearedReference.datasetSizing?.reference, {})
assert.deepEqual(clearedReference.datasetSizing?.current, pair.current.sizing)
assert.equal(clearedReference.preparedSnapshotRoles?.reference, false)
assert.equal(clearedReference.preparedSnapshotRoles?.current, true)
assert.equal(clearedReference.product.productCode, 'CUR-001')
assert.equal(clearedReference.snapshotPair?.current.product.note, 'current product note')
assert.equal(clearedReference.snapshotPair?.current.remark, 'current remark')
assert.equal(clearedReference.snapshotPair?.current.routing[0].note, 'current routing note')

const clearedCurrent = clearMasterDataDatasetState(session, 'current')
assert.equal(clearedCurrent.masterDataRevision, 1, 'Clearing Current must invalidate saved RCA scenarios')
assert.strictEqual(clearedCurrent.lastSavedMasterData, savedMasterData, 'Clearing Current must retain both Last Saved datasets')
assert.deepEqual(clearedCurrent.lastSavedMasterData?.reference?.snapshot, pair.reference)
assert.deepEqual(clearedCurrent.lastSavedMasterData?.current?.snapshot, pair.current)
assert.strictEqual(clearedCurrent.snapshotPair?.reference, pair.reference)
assert.equal(clearedCurrent.snapshotPair?.current.product.productCode, emptyProductMaster.productCode)
assert.equal(clearedCurrent.snapshotPair?.current.remark, '')
assert.deepEqual(clearedCurrent.snapshotPair?.current.rates, [])
assert.deepEqual(clearedCurrent.snapshotPair?.current.bom, [])
assert.deepEqual(clearedCurrent.snapshotPair?.current.routing, [])
assert.deepEqual(clearedCurrent.datasetSizing?.current, {})
assert.deepEqual(clearedCurrent.datasetSizing?.reference, pair.reference.sizing)
assert.equal(clearedCurrent.preparedSnapshotRoles?.current, false)
assert.equal(clearedCurrent.preparedSnapshotRoles?.reference, true)
assert.equal(clearedCurrent.product.productCode, '', 'legacy session Product must not repopulate the cleared Current side')
assert.equal(clearedCurrent.snapshotPair?.reference.product.productCode, 'REF-001')
assert.equal(clearedCurrent.snapshotPair?.reference.remark, 'reference remark')
assert.equal(clearedCurrent.snapshotPair?.reference.bom[0].note, 'reference BOM note')
assert.deepEqual(clearedCurrent.snapshotPair?.current.product, emptyProductMaster)

const hydratedCurrent = updateCurrentSnapshotFromLegacySession(clearedCurrent, clearedCurrent.snapshotPair!)
assert.equal(hydratedCurrent.product.productCode, '', 'legacy hydration must keep the cleared Current Product empty')
assert.equal(hydratedCurrent.remark, '', 'legacy hydration must preserve the cleared side Remark')
assert.deepEqual(hydratedCurrent.bom, [])

console.log('Master Data selected-side clear verification passed.')
