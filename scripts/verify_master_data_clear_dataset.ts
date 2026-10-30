import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole, ProductSession, SnapshotPair } from '../src/core/types'
import { updateCurrentSnapshotFromLegacySession } from '../src/core/migrations/snapshot-to-session.ts'
import { clearMasterDataDatasetState } from '../src/state/clear-master-data-dataset.ts'
import { getMasterDataResetBaseline } from '../src/state/master-data-datasets.ts'
import { emptyProductMaster } from '../src/state/seed-data.ts'

function dataset(role: MasterDataRole): CostSnapshot {
  const current = role === 'current'
  const prefix = role.toUpperCase()
  const bom = Array.from({ length: 3 }, (_, index) => ({
    id: `bom-${role}-${index + 1}`,
    itemCode: `MAT-${prefix}-${index + 1}`,
    description: `${role} material ${index + 1}`,
    consumption: index + 1,
    unit: 'PC',
    price: index + 2,
    loss: index / 100,
    note: `${role} BOM note ${index + 1}`,
    sourceRef: `fixture-${role}`,
    confidence: {}
  }))
  const rates = Array.from({ length: 3 }, (_, index) => ({
    id: `rate-${role}-${index + 1}`,
    workCenterCode: `WC-${prefix}-${index + 1}`,
    description: `${role} work center ${index + 1}`,
    laborRate: index + 10,
    burdenRate: index + 5,
    effectiveDate: '2026-01-01',
    note: `${role} rate note ${index + 1}`,
    sourceRef: `fixture-${role}`,
    confidence: {}
  }))
  const routing = Array.from({ length: 3 }, (_, index) => ({
    id: `routing-${role}-${index + 1}`,
    operationCode: `${(index + 1) * 10}`,
    sequence: (index + 1) * 10,
    processName: `${role} process ${index + 1}`,
    workCenterId: `WC-${prefix}-${index + 1}`,
    manning: index + 1,
    capacity: 100 + index,
    yield: 1,
    note: `${role} routing note ${index + 1}`,
    sourceRef: `fixture-${role}`,
    confidence: {}
  }))
  return {
    id: `dataset-${role}`,
    product: {
      productCode: current ? 'CUR-001' : role === 'reference' ? 'REF-001' : 'CUSTOM-001',
      productDescription: current ? 'Current product' : `${role} product`,
      uom: 'PC',
      note: `${role} product note`,
      customer: '',
      effectiveDate: ''
    },
    effectiveDate: '',
    sourceRef: `fixture-${role}`,
    ...(role === 'custom' ? {} : { comparisonRole: role }),
    status: 'draft',
    remark: `${role} remark`,
    sizing: { wcCount: 3, bomCount: 3, routingCount: 3 },
    rates,
    bom,
    routing
  }
}

function assertClearedRows<T extends { id: string }>(before: T[], after: T[], fields: (keyof T)[]) {
  assert.equal(after.length, before.length, 'Clear keeps the existing number of rows')
  assert.deepEqual(after.map(row => row.id), before.map(row => row.id), 'Clear preserves row identities and order')
  for (const row of after) {
    for (const field of fields) assert.ok(row[field] === '' || row[field] === null || row[field] === undefined, `Clear empties ${String(field)}`)
  }
}

const pair: SnapshotPair = { reference: dataset('reference'), current: dataset('current') }
const customSnapshot = dataset('custom')
const savedMasterData = {
  reference: { snapshot: pair.reference, prepared: true, sizing: { ...pair.reference.sizing } },
  current: { snapshot: pair.current, prepared: true, sizing: { ...pair.current.sizing } }
}
const customSavedMasterData = { snapshot: customSnapshot, prepared: true, sizing: { ...customSnapshot.sizing } }
const initialMasterDataBaseline = {
  reference: { snapshot: pair.reference, prepared: true, sizing: { ...pair.reference.sizing } },
  current: { snapshot: pair.current, prepared: true, sizing: { ...pair.current.sizing } },
  custom: { snapshot: customSnapshot, prepared: true, sizing: { ...customSnapshot.sizing } }
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
  customMasterData: customSnapshot,
  customLastSavedMasterData: customSavedMasterData,
  customDatasetSizing: { ...customSnapshot.sizing },
  initialMasterDataBaseline,
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
assertClearedRows(pair.reference.rates, clearedReference.snapshotPair!.reference.rates, ['workCenterCode', 'description', 'laborRate', 'burdenRate', 'effectiveDate', 'note'])
assertClearedRows(pair.reference.bom, clearedReference.snapshotPair!.reference.bom, ['itemCode', 'description', 'consumption', 'unit', 'price', 'loss', 'note'])
assertClearedRows(pair.reference.routing, clearedReference.snapshotPair!.reference.routing, ['processName', 'workCenterId', 'manning', 'capacity', 'yield', 'note'])
assert.deepEqual(clearedReference.snapshotPair?.reference.routing.map(step => step.sequence), pair.reference.routing.map(step => step.sequence), 'Clear does not reindex Routing rows')
assert.deepEqual(clearedReference.snapshotPair?.reference.sizing, pair.reference.sizing, 'Clear preserves snapshot Sizing')
assert.deepEqual(clearedReference.datasetSizing?.reference, pair.reference.sizing, 'Clear preserves configured row counts')
assert.deepEqual(clearedReference.datasetSizing?.current, pair.current.sizing)
assert.equal(clearedReference.preparedSnapshotRoles?.reference, false)
assert.equal(clearedReference.preparedSnapshotRoles?.current, true)
assert.equal(clearedReference.product.productCode, 'CUR-001')
assert.equal(clearedReference.snapshotPair?.current.product.note, 'current product note')
assert.equal(clearedReference.snapshotPair?.current.remark, 'current remark')
assert.equal(clearedReference.snapshotPair?.current.routing[0].note, 'current routing note 1')

const clearedCurrent = clearMasterDataDatasetState(session, 'current')
assert.equal(clearedCurrent.masterDataRevision, 1, 'Clearing Current must invalidate saved RCA scenarios')
assert.strictEqual(clearedCurrent.lastSavedMasterData, savedMasterData, 'Clearing Current must retain both Last Saved datasets')
assert.deepEqual(clearedCurrent.lastSavedMasterData?.reference?.snapshot, pair.reference)
assert.deepEqual(clearedCurrent.lastSavedMasterData?.current?.snapshot, pair.current)
assert.strictEqual(clearedCurrent.snapshotPair?.reference, pair.reference)
assert.equal(clearedCurrent.snapshotPair?.current.product.productCode, emptyProductMaster.productCode)
assert.equal(clearedCurrent.snapshotPair?.current.remark, '')
assertClearedRows(pair.current.rates, clearedCurrent.snapshotPair!.current.rates, ['workCenterCode', 'description', 'laborRate', 'burdenRate', 'effectiveDate', 'note'])
assertClearedRows(pair.current.bom, clearedCurrent.snapshotPair!.current.bom, ['itemCode', 'description', 'consumption', 'unit', 'price', 'loss', 'note'])
assertClearedRows(pair.current.routing, clearedCurrent.snapshotPair!.current.routing, ['processName', 'workCenterId', 'manning', 'capacity', 'yield', 'note'])
assert.deepEqual(clearedCurrent.snapshotPair?.current.routing.map(step => step.sequence), pair.current.routing.map(step => step.sequence), 'Clear does not reindex Routing rows')
assert.deepEqual(clearedCurrent.snapshotPair?.current.sizing, pair.current.sizing, 'Clear preserves snapshot Sizing')
assert.deepEqual(clearedCurrent.datasetSizing?.current, pair.current.sizing, 'Clear preserves configured row counts')
assert.deepEqual(clearedCurrent.datasetSizing?.reference, pair.reference.sizing)
assert.equal(clearedCurrent.preparedSnapshotRoles?.current, false)
assert.equal(clearedCurrent.preparedSnapshotRoles?.reference, true)
assert.equal(clearedCurrent.product.productCode, '', 'legacy session Product must not repopulate the cleared Current side')
assert.equal(clearedCurrent.snapshotPair?.reference.product.productCode, 'REF-001')
assert.equal(clearedCurrent.snapshotPair?.reference.remark, 'reference remark')
assert.equal(clearedCurrent.snapshotPair?.reference.bom[0].note, 'reference BOM note 1')
assert.deepEqual(clearedCurrent.snapshotPair?.current.product, emptyProductMaster)
assert.deepEqual(getMasterDataResetBaseline(clearedCurrent, 'current')?.snapshot, pair.current,
  'Reset after Clear returns the last saved Working baseline')

const hydratedCurrent = updateCurrentSnapshotFromLegacySession(clearedCurrent, clearedCurrent.snapshotPair!)
assert.equal(hydratedCurrent.product.productCode, '', 'legacy hydration must keep the cleared Current Product empty')
assert.equal(hydratedCurrent.remark, '', 'legacy hydration must preserve the cleared side Remark')
assert.equal(hydratedCurrent.bom.length, pair.current.bom.length, 'legacy hydration preserves the cleared BOM row structure')

const clearedCustom = clearMasterDataDatasetState(session, 'custom')
assert.equal(clearedCustom.customMasterData?.bom.length, customSnapshot.bom.length, 'Clearing Custom preserves BOM row count')
assert.equal(clearedCustom.customMasterData?.rates.length, customSnapshot.rates.length, 'Clearing Custom preserves Work Center row count')
assert.equal(clearedCustom.customMasterData?.routing.length, customSnapshot.routing.length, 'Clearing Custom preserves Routing row count')
assertClearedRows(customSnapshot.rates, clearedCustom.customMasterData!.rates, ['workCenterCode', 'description', 'laborRate', 'burdenRate', 'effectiveDate', 'note'])
assertClearedRows(customSnapshot.bom, clearedCustom.customMasterData!.bom, ['itemCode', 'description', 'consumption', 'unit', 'price', 'loss', 'note'])
assertClearedRows(customSnapshot.routing, clearedCustom.customMasterData!.routing, ['processName', 'workCenterId', 'manning', 'capacity', 'yield', 'note'])
assert.deepEqual(clearedCustom.customMasterData?.sizing, customSnapshot.sizing, 'Clear preserves Custom snapshot Sizing')
assert.deepEqual(clearedCustom.customDatasetSizing, customSnapshot.sizing, 'Clear preserves Custom configured row counts')
assert.strictEqual(clearedCustom.customLastSavedMasterData, customSavedMasterData, 'Clearing Custom retains its Reset baseline')
assert.deepEqual(getMasterDataResetBaseline(clearedCustom, 'custom')?.snapshot, customSnapshot,
  'Reset after Clear returns the saved Custom baseline')

const unsavedSession = { ...session, lastSavedMasterData: undefined, customLastSavedMasterData: undefined }
const clearedUnsavedCurrent = clearMasterDataDatasetState(unsavedSession, 'current')
assert.deepEqual(getMasterDataResetBaseline(clearedUnsavedCurrent, 'current')?.snapshot, pair.current,
  'Clear without a prior Save retains the initial Working-dataset Reset baseline')

console.log('Master Data value-only clear verification passed for Reference, Current, and Custom.')
