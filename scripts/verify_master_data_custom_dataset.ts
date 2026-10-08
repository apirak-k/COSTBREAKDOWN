import assert from 'node:assert/strict'
import type { CostSnapshot, ProductSession } from '../src/core/types'
import {
  cloneMasterDataDatasetState,
  getMasterDataSnapshot,
  initializeCustomMasterData,
  setMasterDataSnapshot
} from '../src/state/master-data-datasets.ts'
import { clearMasterDataDatasetState } from '../src/state/clear-master-data-dataset.ts'
import { importSnapshotForCustom } from '../src/state/dataset-sizing.ts'
import { applyMasterDataEditHistoryEntry } from '../src/state/master-data-edit-history.ts'
import { INITIAL_MASTER_DATA_UI_STATE, reduceMasterDataUiState } from '../src/features/master-data/master-data-ui-state.ts'

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

const lastSaved = { snapshot: snapshot('custom-saved'), prepared: true, sizing: { bomCount: 4 } }
const savedCustomSession: ProductSession = {
  ...updated,
  customLastSavedMasterData: lastSaved,
  customDatasetSizing: { bomCount: 4 }
}
const clearedCustom = clearMasterDataDatasetState(savedCustomSession, 'custom')
assert.equal(clearedCustom.customMasterData?.bom.length, 0, 'Clear removes only Custom Working rows')
assert.deepEqual(clearedCustom.customDatasetSizing, {}, 'Clear resets only Custom sizing')
assert.strictEqual(clearedCustom.customLastSavedMasterData, lastSaved, 'Clear retains Custom Last Saved')
assert.strictEqual(clearedCustom.snapshotPair?.reference, reference)
assert.strictEqual(clearedCustom.snapshotPair?.current, current)

const imported = importSnapshotForCustom({ ...reference, comparisonRole: 'reference' })
assert.equal(imported.snapshot.comparisonRole, undefined, 'A Custom import cannot inherit a CBD comparison role')
assert.deepEqual(imported.sizing, { wcCount: 0, bomCount: 0, routingCount: 0 })
assert.deepEqual(imported.snapshot.sizing, imported.sizing)

const cloneInput: ProductSession = {
  ...savedCustomSession,
  snapshotPair: { reference, current },
  datasetSizing: { reference: { wcCount: 1 }, current: { bomCount: 2 } },
  lastSavedMasterData: {
    reference: { snapshot: reference, prepared: true, sizing: { wcCount: 1 } },
    current: { snapshot: current, prepared: false, sizing: { bomCount: 2 } }
  }
}
const currentToCustom = cloneMasterDataDatasetState(cloneInput, 'current', 'custom')
assert.equal(currentToCustom.customMasterData?.product.productCode, current.product.productCode)
assert.deepEqual(currentToCustom.customDatasetSizing, { bomCount: 2 })
assert.equal(currentToCustom.customMasterData?.comparisonRole, undefined)
assert.strictEqual(currentToCustom.snapshotPair?.reference, reference)
assert.strictEqual(currentToCustom.snapshotPair?.current, current)
assert.strictEqual(currentToCustom.customLastSavedMasterData, lastSaved, 'Clone never mutates Custom Last Saved')

const customToCurrent = cloneMasterDataDatasetState(currentToCustom, 'custom', 'current', '2026-01-02T00:00:00.000Z')
assert.equal(customToCurrent.snapshotPair?.current.product.productCode, current.product.productCode)
assert.equal(customToCurrent.snapshotPair?.current.comparisonRole, 'current')
assert.equal(customToCurrent.preparedSnapshotRoles?.current, true, 'Cloning recalculates comparison-side readiness from copied content')
assert.strictEqual(customToCurrent.snapshotPair?.reference, reference)
assert.strictEqual(customToCurrent.customMasterData, currentToCustom.customMasterData)
assert.strictEqual(customToCurrent.lastSavedMasterData?.current, cloneInput.lastSavedMasterData?.current)
assert.strictEqual(cloneMasterDataDatasetState(cloneInput, 'current', 'current'), cloneInput, 'Cloning a dataset into itself is a no-op')

const afterCustom = { ...editedCustom, product: { ...editedCustom.product, productCode: 'CUSTOM-002' } }
const historySession: ProductSession = {
  ...savedCustomSession,
  customMasterData: afterCustom,
  customDatasetSizing: { bomCount: 5 }
}
const historyEntry = {
  sessionId: historySession.id,
  role: 'custom' as const,
  before: editedCustom,
  after: afterCustom,
  beforePrepared: { reference: true, current: true },
  afterPrepared: { reference: true, current: true },
  beforeCustomSizing: { bomCount: 4 },
  afterCustomSizing: { bomCount: 5 }
}
const undone = applyMasterDataEditHistoryEntry(historySession, historyEntry, 'undo')
assert.equal(undone?.customMasterData?.product.productCode, 'CUSTOM-001', 'Undo restores Custom Working')
assert.deepEqual(undone?.customDatasetSizing, { bomCount: 4 }, 'Undo restores Custom sizing')
assert.strictEqual(undone?.snapshotPair?.reference, reference, 'Undo does not mutate Reference')
assert.strictEqual(undone?.snapshotPair?.current, current, 'Undo does not mutate Current')
assert.strictEqual(undone?.customLastSavedMasterData, lastSaved, 'Undo does not rewrite Last Saved')

assert.equal(reduceMasterDataUiState(INITIAL_MASTER_DATA_UI_STATE, { type: 'set-role', role: 'custom' }).role, 'custom')

console.log('Custom Master Data isolation and migration verification passed')
