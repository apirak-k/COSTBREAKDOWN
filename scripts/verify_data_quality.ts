import assert from 'node:assert/strict'
import { getSnapshotDataQuality } from '../src/features/cost-breakdown/components/data-quality.ts'

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

console.log('Data quality verification passed.')
