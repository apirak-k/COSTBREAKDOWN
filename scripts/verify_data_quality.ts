import assert from 'node:assert/strict'
import { getRoutingDataQuality, getSnapshotDataQuality } from '../src/features/cost-breakdown/components/data-quality.ts'

const base = {
  id: 'bom-1',
  itemCode: 'MAT-1',
  description: 'Material',
  unit: 'PC',
  consumption: 1,
  price: 10,
  loss: 0,
  sourceRef: 'fixture'
}

assert.equal(getSnapshotDataQuality({
  ...base,
  confidence: {
    consumption: { status: 'verified', quality: 'valid' },
    price: { status: 'verified', quality: 'valid' },
    loss: { status: 'verified', quality: 'valid' }
  }
}), 'Valid')

assert.equal(getSnapshotDataQuality({
  ...base,
  price: null,
  confidence: {
    consumption: { status: 'verified', quality: 'valid' },
    price: { status: 'missing', quality: 'missing' },
    loss: { status: 'verified', quality: 'valid' }
  }
}), 'Missing')

assert.equal(getSnapshotDataQuality({
  ...base,
  confidence: {
    consumption: { status: 'verified', quality: 'valid' },
    price: { status: 'missing', quality: 'invalid' },
    loss: { status: 'verified', quality: 'valid' }
  }
}), 'Invalid')

assert.equal(getSnapshotDataQuality({
  ...base,
  confidence: {
    consumption: { status: 'estimated', quality: 'valid' },
    price: { status: 'verified', quality: 'valid' },
    loss: { status: 'verified', quality: 'valid' }
  }
}), 'Warning')

const routing = {
  id: 'route-1',
  operationCode: 'OP-10',
  sequence: 10,
  processName: 'Assembly',
  workCenterId: 'WC-MISSING',
  manning: 1,
  capacity: 1,
  yield: 1,
  confidence: {
    sequence: { status: 'verified' as const, quality: 'valid' as const },
    manning: { status: 'verified' as const, quality: 'valid' as const },
    capacity: { status: 'verified' as const, quality: 'valid' as const },
    yield: { status: 'verified' as const, quality: 'valid' as const }
  }
}
assert.equal(getRoutingDataQuality(routing, []), 'Missing')

console.log('Data quality verification passed.')
