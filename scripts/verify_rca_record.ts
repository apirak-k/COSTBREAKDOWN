import assert from 'node:assert/strict'
import { createDriverRcaRecord } from '../src/core/utils/rca'

const driver = {
  driverKey: 'bom:bom-1',
  sourceType: 'bom' as const,
  sourceId: 'bom-1',
  impact: 'unfavorable' as const,
  id: 1,
  category: 'Direct Material',
  driverName: 'Material A',
  rcaParameter: 'Unit Price Inflation',
  baseParameter: 10,
  activeParameter: 12,
  costGap: 2,
  tieBreakerScore: 2,
  rank: 1,
  pctContribution: 100,
  controllability: 'Controllable' as const,
  actionPlan: '',
  sourceRef: 'fixture row 1'
}

const record = createDriverRcaRecord(driver, {
  factor: 'Unit price changed',
  rootCause: 'Supplier quotation increased',
  action: 'Review alternative supplier'
}, '2026-09-22T00:00:00.000Z')

assert.equal(record.driverKey, 'bom:bom-1')
assert.equal(record.sourceType, 'bom')
assert.equal(record.sourceId, 'bom-1')
assert.equal(record.costGap, 2)
assert.equal(record.factor, 'Unit price changed')
assert.equal(record.rootCause, 'Supplier quotation increased')
assert.equal(record.action, 'Review alternative supplier')
assert.equal(record.updatedAt, '2026-09-22T00:00:00.000Z')

console.log('RCA record verification passed')
