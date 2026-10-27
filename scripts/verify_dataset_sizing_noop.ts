import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot } from '../src/core/types'
import { canAddDatasetSizingRow, DATASET_SIZING_LIMITS, assertDatasetSizingCounts } from '../src/core/utils/sizing'
import { getMasterDataSnapshotValidationErrors, isMasterDataSnapshotChangeValid } from '../src/core/utils/master-data-validation'
import {
  hasDatasetSizingChanged,
  hasDatasetMetadataChanged
} from '../src/features/master-data/dataset-sizing-form'
import * as datasetSizingForm from '../src/features/master-data/dataset-sizing-form'

const emptySizing = {}
const unsetSizing = { wcCount: undefined, bomCount: undefined, routingCount: undefined }
assert.equal(hasDatasetSizingChanged(emptySizing, unsetSizing), false, 'applying unset sizing must be a no-op')

const savedSizing = { wcCount: 4, bomCount: 12, routingCount: 6 }
assert.equal(hasDatasetSizingChanged(savedSizing, { ...savedSizing }), false, 'applying unchanged sizing must be a no-op')
assert.equal(
  hasDatasetSizingChanged(savedSizing, { ...savedSizing, bomCount: 13 }),
  true,
  'changing a saved sizing count must update Master Data'
)
assert.equal(
  hasDatasetSizingChanged(savedSizing, unsetSizing),
  true,
  'resetting configured sizing must update Master Data'
)

const productFields = { productName: 'Part', uom: 'PC', sellingPrice: 100, sgaPercent: 5 }
assert.equal(
  hasDatasetMetadataChanged(productFields, { ...productFields }),
  false,
  'applying unchanged product fields must be a no-op'
)
assert.equal(
  hasDatasetMetadataChanged(productFields, { ...productFields, uom: 'KG' }),
  true,
  'changing an editable product field must update Master Data'
)

assert.equal(typeof datasetSizingForm.parseDatasetSizingCounts, 'function', 'sizing input parsing must validate bounds before saving')
assert.deepEqual(datasetSizingForm.parseDatasetSizingCounts({ wcCount: '500', bomCount: '1000', routingCount: '500' }), {
  wcCount: 500, bomCount: 1000, routingCount: 500
})
assert.deepEqual(datasetSizingForm.parseDatasetSizingCounts({ wcCount: '', bomCount: '1', routingCount: '' }), {
  bomCount: 1
})
for (const invalid of [
  { wcCount: '501' },
  { bomCount: '1001' },
  { routingCount: '501' },
  { wcCount: '0' },
  { bomCount: '1.5' },
  { routingCount: 'Infinity' }
]) {
  assert.throws(
    () => datasetSizingForm.parseDatasetSizingCounts(invalid),
    RangeError,
    `sizing input ${JSON.stringify(invalid)} must be rejected`
  )
}

assertDatasetSizingCounts({ wcCount: 500, bomCount: 1000, routingCount: 500 })

function snapshotWithCounts(wcCount: number, bomCount: number, routingCount: number): CostSnapshot {
  return {
    id: 'sizing-limit-fixture',
    status: 'draft',
    sourceRef: 'test fixture',
    effectiveDate: '',
    product: { productName: 'Fixture', uom: 'PC', sellingPrice: null, sgaPercent: null },
    rates: Array.from({ length: wcCount }, (_, index) => ({
      id: `wc-${index}`, workCenterCode: '', description: '', laborRate: null, burdenRate: null, confidence: {}
    })),
    bom: Array.from({ length: bomCount }, (_, index) => ({
      id: `bom-${index}`, itemCode: '', description: '', consumption: null, unit: '', price: null, loss: null, confidence: {}
    })),
    routing: Array.from({ length: routingCount }, (_, index) => ({
      id: `routing-${index}`, processName: '', manning: null, capacity: null, yield: null, confidence: {}
    })),
    warnings: []
  }
}

const limitCases = [
  { field: 'wcCount' as const, limit: DATASET_SIZING_LIMITS.wcCount, count: (value: number) => snapshotWithCounts(value, 0, 0) },
  { field: 'bomCount' as const, limit: DATASET_SIZING_LIMITS.bomCount, count: (value: number) => snapshotWithCounts(0, value, 0) },
  { field: 'routingCount' as const, limit: DATASET_SIZING_LIMITS.routingCount, count: (value: number) => snapshotWithCounts(0, 0, value) }
]

for (const { field, limit, count } of limitCases) {
  const atLimit = count(limit)
  const overLimit = count(limit + 1)
  assert.deepEqual(getMasterDataSnapshotValidationErrors(atLimit), [], `${field} accepts its exact maximum of ${limit}`)
  assert.ok(
    getMasterDataSnapshotValidationErrors(overLimit).some(message => message.includes(`${limit}`)),
    `${field} import validation rejects ${limit + 1} rows without truncating`
  )
  assert.equal(isMasterDataSnapshotChangeValid(atLimit, overLimit), false,
    `${field} Working state cannot grow beyond ${limit} rows`)
  assert.equal(isMasterDataSnapshotChangeValid(overLimit, atLimit), true,
    `${field} deletion can reduce an existing oversized dataset back to ${limit}`)
  assert.equal(canAddDatasetSizingRow(field, limit - 1), true, `${field} Add Row is available below ${limit}`)
  assert.equal(canAddDatasetSizingRow(field, limit), false, `${field} Add Row is disabled at ${limit}`)
}

const modalSource = readFileSync(
  resolve(process.cwd(), 'src/features/master-data/components/DatasetSizingModal.tsx'),
  'utf8'
)
assert.match(modalSource, /hasDatasetMetadataChanged\(previousProductFields, nextProductFields\)/)
assert.match(modalSource, /onUpdateProduct\(nextProduct\)/)
assert.match(modalSource, /if \(hasDatasetSizingChanged\(currentSizing, nextSizing\)\) onSaveSizing\(nextSizing\)/)
assert.match(modalSource, /isMasterDataNumericInputValid\(field, parsed, field === 'sgaPercent' \? trimmed : undefined\)/,
  'the sizing modal validates SG&A against its exact percentage input')

const routingModalSource = readFileSync(
  resolve(process.cwd(), 'src/features/master-data/components/modals/AddRoutingModal.tsx'),
  'utf8'
)
assert.match(routingModalSource, /isMasterDataNumericInputValid\('yield', yieldValue \/ 100, yieldPercent\)/,
  'the routing modal validates Yield against its exact percentage input')

const tableChromeSource = readFileSync(
  resolve(process.cwd(), 'src/features/master-data/components/MasterDataTableChrome.tsx'),
  'utf8'
)
assert.match(tableChromeSource, /canAddDatasetSizingRow\(sizingField, rowCount\)/)
assert.match(tableChromeSource, /disabled=\{addRowDisabled\}/)
for (const [tableFile, sizingField] of [
  ['BOMTable.tsx', 'bomCount'],
  ['WorkCenterRatesTable.tsx', 'wcCount'],
  ['RoutingTable.tsx', 'routingCount']
] as const) {
  const tableSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components', tableFile), 'utf8')
  assert.match(tableSource, new RegExp(`sizingField="${sizingField}"`), `${tableFile} Add Row uses ${sizingField}`)
}

console.log('Dataset sizing no-op verification passed')
