import assert from 'node:assert/strict'
import { getSnapshotRoleReadiness } from '../src/core/calculations/master-data-handoff.ts'
import type { CostSnapshot, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types/snapshot.types.ts'
import { createEmptySnapshotPair } from '../src/state/seed-data.ts'
import { hasEnteredMasterData } from '../src/state/dataset-sizing.ts'
import { normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective.ts'

const emptyPair = createEmptySnapshotPair('clone-readiness-verification')
const blankSnapshot = emptyPair.current

const metadataOnlySnapshot: CostSnapshot = {
  ...blankSnapshot,
  product: {
    ...blankSnapshot.product,
    productName: 'Metadata-only fixture'
  }
}
assert.equal(
  hasEnteredMasterData(metadataOnlySnapshot),
  true,
  'non-empty user-entered metadata is sufficient for Clone readiness'
)

const importedIncompleteBOMRow: SnapshotBOMItem = {
  id: 'bom-imported-readiness-fixture',
  isGeneratedSizingPlaceholder: false,
  itemCode: '',
  description: 'Imported resin row',
  consumption: null,
  unit: 'KG',
  price: null,
  loss: null,
  sourceRef: 'fixture-import.xlsx',
  confidence: {}
}
const userEnteredSnapshot: CostSnapshot = {
  ...blankSnapshot,
  bom: [importedIncompleteBOMRow]
}
const sourceSession = {
  snapshotPairMode: 'independent' as const,
  snapshotPair: {
    reference: emptyPair.reference,
    current: userEnteredSnapshot
  },
  preparedSnapshotRoles: { reference: false, current: false }
}
assert.equal(getSnapshotRoleReadiness(sourceSession).current, false, 'the source role is still marked unprepared')
assert.equal(
  hasEnteredMasterData(userEnteredSnapshot),
  true,
  'an incomplete non-placeholder user/import row counts as entered even when source readiness is false'
)

const generatedRatePlaceholder: SnapshotWorkCenterRate = {
  id: 'rate-size-readiness-1',
  isGeneratedSizingPlaceholder: true,
  workCenterCode: '',
  description: '',
  laborRate: 0,
  burdenRate: 0,
  effectiveDate: '',
  sourceRef: 'Direct Input',
  confidence: {}
}
const generatedBOMPlaceholder: SnapshotBOMItem = {
  id: 'bom-size-readiness-1',
  isGeneratedSizingPlaceholder: true,
  itemCode: '',
  description: '',
  consumption: 0,
  unit: 'PC',
  price: 0,
  loss: 0,
  sourceRef: 'Direct Input',
  confidence: {}
}
const generatedRoutingPlaceholder: SnapshotRoutingStep = {
  id: 'routing-size-readiness-1',
  isGeneratedSizingPlaceholder: true,
  operationCode: '',
  sequence: 10,
  processName: '',
  manning: 0,
  capacity: 0,
  yield: 0,
  sourceRef: 'Direct Input',
  confidence: {}
}
const placeholdersOnlySnapshot: CostSnapshot = {
  ...blankSnapshot,
  rates: [generatedRatePlaceholder],
  bom: [generatedBOMPlaceholder],
  routing: [generatedRoutingPlaceholder]
}
assert.equal(
  hasEnteredMasterData(placeholdersOnlySnapshot),
  false,
  'untouched generated Sizing placeholders alone do not make the dataset Clone-ready'
)
assert.equal(
  hasEnteredMasterData(normalizeMasterDataSnapshot(placeholdersOnlySnapshot)),
  false,
  'effective generated business identities do not make untouched Sizing placeholders Clone-ready'
)

assert.equal(
  hasEnteredMasterData(blankSnapshot),
  false,
  'the blank default snapshot is not Clone-ready'
)

console.log('✓ Non-empty product metadata counts as entered Master Data')
console.log('✓ Incomplete non-placeholder imported data counts even while source readiness is false')
console.log('✓ Untouched generated Sizing placeholders alone do not count as entered data')
console.log('✓ Blank default snapshot is not Clone-ready')
