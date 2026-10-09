import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot, ProductSession } from '../src/core/types'
import {
  cloneMasterDataDatasetState,
  getMasterDataSnapshot,
  getMasterDataSizing,
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

const sourceReference = {
  ...snapshot('source-reference'),
  product: { ...snapshot('source-reference').product, productCode: 'REF-SOURCE' },
  sizing: { wcCount: 2, bomCount: 3, routingCount: 4 }
}
const sourceCurrent = {
  ...snapshot('source-current'),
  product: { ...snapshot('source-current').product, productCode: 'CURRENT-SOURCE' },
  sizing: { wcCount: 5, bomCount: 6, routingCount: 7 }
}
const sourceCustom = {
  ...snapshot('source-custom'),
  product: { ...snapshot('source-custom').product, productCode: 'CUSTOM-SOURCE' },
  sizing: { wcCount: 8, bomCount: 9, routingCount: 10 }
}
const destinationSaved = {
  reference: { snapshot: snapshot('saved-reference'), prepared: true, sizing: { bomCount: 11 } },
  current: { snapshot: snapshot('saved-current'), prepared: false, sizing: { bomCount: 12 } },
  custom: { snapshot: snapshot('saved-custom'), prepared: true, sizing: { bomCount: 13 } }
}
const allDirections: ProductSession = {
  ...cloneInput,
  snapshotPair: { reference: sourceReference, current: sourceCurrent },
  customMasterData: sourceCustom,
  datasetSizing: { reference: sourceReference.sizing, current: sourceCurrent.sizing },
  customDatasetSizing: sourceCustom.sizing,
  lastSavedMasterData: {
    reference: destinationSaved.reference,
    current: destinationSaved.current
  },
  customLastSavedMasterData: destinationSaved.custom,
  preparedSnapshotRoles: { reference: true, current: false }
}
const cloneDirections = [
  ['current', 'reference'], ['custom', 'reference'],
  ['reference', 'current'], ['custom', 'current'],
  ['reference', 'custom'], ['current', 'custom']
] as const
for (const [sourceRole, destinationRole] of cloneDirections) {
  const sourceBefore = structuredClone(getMasterDataSnapshot(allDirections, allDirections.snapshotPair!, sourceRole))
  const sizingBefore = getMasterDataSizing(allDirections, sourceBefore, sourceRole)
  const destinationLastSaved = destinationRole === 'custom'
    ? allDirections.customLastSavedMasterData
    : allDirections.lastSavedMasterData?.[destinationRole]
  const cloned = cloneMasterDataDatasetState(allDirections, sourceRole, destinationRole, '2026-01-03T00:00:00.000Z')
  const copied = getMasterDataSnapshot(cloned, cloned.snapshotPair!, destinationRole)
  assert.equal(copied.product.productCode, sourceBefore.product.productCode,
    `${sourceRole} → ${destinationRole} copies the source Working content`)
  assert.notStrictEqual(copied, sourceBefore, `${sourceRole} → ${destinationRole} creates an independent destination copy`)
  assert.deepEqual(getMasterDataSizing(cloned, copied, destinationRole), sizingBefore,
    `${sourceRole} → ${destinationRole} copies source sizing`)
  assert.deepEqual(getMasterDataSnapshot(allDirections, allDirections.snapshotPair!, sourceRole), sourceBefore,
    `${sourceRole} → ${destinationRole} does not mutate the source`)
  const savedAfter = destinationRole === 'custom'
    ? cloned.customLastSavedMasterData
    : cloned.lastSavedMasterData?.[destinationRole]
  assert.strictEqual(savedAfter, destinationLastSaved, `${sourceRole} → ${destinationRole} leaves destination Last Saved unchanged`)
  if (destinationRole !== 'custom') {
    assert.equal(cloned.preparedSnapshotRoles?.[destinationRole], true,
      `${sourceRole} → ${destinationRole} recalculates readiness from copied content rather than inheriting false`)
  }
}

const headerSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataWorkspaceHeader.tsx'), 'utf8')
assert.match(headerSource, /aria-label="Clone"/, 'Master Data exposes the icon-only Clone action with an accessible label')
assert.match(headerSource, /sourceRole !== role/, 'the currently viewed dataset is never offered as its own source')
assert.match(headerSource, /onCloneFrom\(sourceRole\)[\s\S]*setCloneMenuOpen\(false\)/, 'choosing a source performs the clone and closes source selection directly')

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
