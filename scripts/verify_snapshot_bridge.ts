import assert from 'node:assert/strict'
import type { ProductSession } from '../src/core'
import { sessionToSnapshotPair } from '../src/core/migrations/session-to-snapshots'
import { projectSnapshotPairToLegacySession } from '../src/core/migrations/snapshot-to-session'

const session: ProductSession = {
  id: 'session-import-1',
  product: {
    productCode: 'TEST-001',
    productDescription: 'Test product',
    uom: 'PC',
    customer: 'Test customer',
    effectiveDate: '2026-09-21',
    exactDecimalInputs: { sellingPrice: '123.4567890123456789', sgaPercent: '8.2500000000000001' }
  },
  rates: [{
    id: 'rate-1',
    wc: 'WC-01',
    description: 'Test work center',
    laborRate: 10,
    burdenRate: 5,
    effectiveDate: '2026-09-21',
    sourceRef: 'test-rate',
    exactDecimalInputs: { laborRate: '10.00000000000000001', burdenRate: '5.00000000000000001' }
  }],
  bom: [{
    id: 'bom-1',
    itemCode: 'MAT-01',
    description: 'Test material',
    consumption: 2,
    unit: 'PC',
    basePrice: 10,
    activePrice: 12,
    baseLoss: 0.1,
    activeLoss: 0.2,
    exactDecimalInputs: {
      consumption: '2.00000000000000001',
      basePrice: '10.00000000000000001', activePrice: '12.00000000000000001',
      baseLoss: '10.00000000000000001', activeLoss: '20.00000000000000001'
    },
    sourceRef: 'test-bom'
  }],
  routing: [{
    id: 'routing-1',
    opSeq: 10,
    description: 'Test operation',
    wc: 'WC-01',
    manning: 1,
    baseCap: 100,
    activeCap: 80,
    baseYield: 0.98,
    activeYield: 0.9,
    exactDecimalInputs: {
      manning: '1.00000000000000001', baseCap: '100.00000000000000001', activeCap: '80.00000000000000001',
      baseYield: '98.00000000000000001', activeYield: '90.00000000000000001'
    },
    sourceRef: 'test-routing'
  }],
  savedDrivers: [],
  status: 'draft',
  versionLabel: 'Draft',
  createdAt: '2026-09-21T00:00:00.000Z',
  updatedAt: '2026-09-21T00:00:00.000Z'
}

const pair = sessionToSnapshotPair(session)

assert.equal(pair.reference.id, 'session-import-1:reference')
assert.equal(pair.current.id, 'session-import-1:current')
assert.equal(pair.reference.bom[0].price, 10)
assert.equal(pair.current.bom[0].price, 12)
assert.equal(pair.reference.routing[0].capacity, 100)
assert.equal(pair.current.routing[0].capacity, 80)
assert.equal(pair.reference.rates[0].laborRate, 10)
assert.equal(pair.current.rates[0].laborRate, 10)
assert.notEqual(pair.reference.bom, session.bom)
assert.notEqual(pair.current.routing, session.routing)

const projected = projectSnapshotPairToLegacySession(pair)
assert.equal(projected.product.exactDecimalInputs?.sellingPrice, '123.4567890123456789',
  'Exact Product text survives projection into the legacy Master Data session')
assert.equal(projected.bom[0].exactDecimalInputs?.basePrice, '10.00000000000000001',
  'Reference BOM Price precision survives snapshot-pair projection')
assert.equal(projected.bom[0].exactDecimalInputs?.activePrice, '12.00000000000000001',
  'Current BOM Price precision survives snapshot-pair projection')
assert.equal(projected.routing.find(step => step.exactDecimalInputs?.activeYield)?.exactDecimalInputs?.activeYield, '90.00000000000000001',
  'Routing percentage precision survives snapshot-pair projection')
assert.equal(projected.rates[0].exactDecimalInputs?.laborRate, '10.00000000000000001',
  'Work Center rate precision survives snapshot-pair projection')

console.log('snapshot bridge self-check: PASS')
