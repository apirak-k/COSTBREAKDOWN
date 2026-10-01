import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  hasDatasetSizingChanged,
  hasProductSizingFieldsChanged
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

const productFields = { productCode: 'MAT-1', productDescription: 'Part', uom: 'PC' }
assert.equal(
  hasProductSizingFieldsChanged(productFields, { ...productFields }),
  false,
  'applying unchanged product fields must be a no-op'
)
assert.equal(
  hasProductSizingFieldsChanged(productFields, { ...productFields, uom: 'KG' }),
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

const modalSource = readFileSync(
  resolve(process.cwd(), 'src/features/master-data/components/DatasetSizingModal.tsx'),
  'utf8'
)
assert.match(modalSource, /if \(hasProductSizingFieldsChanged\(previousProductFields, nextProduct\)\)\s*\{\s*onUpdateProduct\(nextProduct\)/)
assert.match(modalSource, /if \(hasDatasetSizingChanged\(currentSizing, nextSizing\)\) onSaveSizing\(nextSizing\)/)
assert.match(modalSource, /if \(hasDatasetSizingChanged\(currentSizing, resetSizing\)\) onSaveSizing\(resetSizing\)/)

console.log('Dataset sizing no-op verification passed')
