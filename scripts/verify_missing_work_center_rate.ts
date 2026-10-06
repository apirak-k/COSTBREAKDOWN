import assert from 'node:assert/strict'
import {
  calculateCostBreakdown,
  calculateRoutingDetailedRows,
  calculateTopDrivers,
  calculateScenarioCosts
} from '../src/core/calculations'
import { CostDriver, CostSnapshot, RoutingStep } from '../src/core/types'

const missingRateRouting: RoutingStep[] = [{
  id: 'routing-unknown-wc',
  opSeq: 10,
  description: 'Unknown rate operation',
  wc: 'UNKNOWN-WC',
  manning: 1,
  baseCap: 100,
  activeCap: 50,
  baseYield: 1,
  activeYield: 1,
  sourceRef: 'missing-rate-fixture'
}]

const breakdown = calculateCostBreakdown([], missingRateRouting, [])
assert.equal(breakdown.laborBase, null, 'missing Work Center labor must remain unavailable')
assert.equal(breakdown.laborActive, null, 'missing Work Center labor must remain unavailable')
assert.equal(breakdown.burdenBase, null, 'missing Work Center burden must remain unavailable')
assert.equal(breakdown.burdenActive, null, 'missing Work Center burden must remain unavailable')
assert.deepEqual(breakdown.missingWorkCenters, ['UNKNOWN-WC'])

const configuredBreakdown = calculateCostBreakdown([], missingRateRouting, [{
  id: 'rate-unknown-wc',
  wc: 'UNKNOWN-WC',
  description: 'Configured fixture rate',
  laborRate: 10,
  burdenRate: 20,
  effectiveDate: '2026-09-21',
  sourceRef: 'configured-rate-fixture'
}])
assert.equal(configuredBreakdown.laborBase, 0.1, 'known Work Center labor must keep using its configured rate')
assert.equal(configuredBreakdown.burdenBase, 0.2, 'known Work Center burden must keep using its configured rate')
assert.deepEqual(configuredBreakdown.missingWorkCenters, [])

const detail = calculateRoutingDetailedRows(missingRateRouting, [])
assert.equal(detail.rows[0]?.baseTotal, null, 'routing detail must preserve unavailable costs')
assert.equal(detail.rows[0]?.activeTotal, null, 'routing detail must preserve unavailable costs')

const drivers = calculateTopDrivers([], missingRateRouting, [])
assert.equal(drivers.length, 0, 'missing Work Center must not create a cost driver from a fabricated rate')

const routingDriver: CostDriver = {
  id: 1,
  category: 'UNKNOWN-WC',
  driverName: 'Unknown rate operation',
  rcaParameter: 'Capacity Drop (100 → 50 Unit/hr)',
  baseParameter: 100,
  activeParameter: 50,
  costGap: 0,
  tieBreakerScore: 0,
  rank: 1,
  pctContribution: 0,
  controllability: '',
  actionPlan: ''
}
const currentSnapshot: CostSnapshot = {
  id: 'missing-rate-current',
  product: { productCode: 'TEST-001', productDescription: 'Synthetic', uom: 'PC', customer: 'Synthetic', effectiveDate: '2026-09-27' },
  effectiveDate: '2026-09-27',
  sourceRef: 'missing-rate-fixture',
  status: 'active',
  rates: [],
  bom: [{
    id: 'bom-1', itemCode: 'MAT-01', description: 'Synthetic material',
    consumption: 1, unit: 'pc', price: 1, loss: 0, confidence: {}
  }],
  routing: [{
    id: 'routing-unknown-wc', processName: 'Unknown rate operation', workCenterId: 'UNKNOWN-WC',
    manning: 1, capacity: 100, yield: 1, confidence: {}
  }]
}
const scenario = calculateScenarioCosts(currentSnapshot, [{
  letter: 'A',
  label: 'Attempt unsupported rate addition',
  overrides: { rates: { 'new-rate': { laborRate: 100, burdenRate: 100 } } }
}])[0]
assert.ok(scenario, 'shared-engine scenario result should exist')
assert.equal(scenario.scenarioCost.labor, null, 'scenario must not fabricate a Work Center rate')
assert.equal(scenario.scenarioCost.burden, null, 'scenario must not fabricate a Work Center burden rate')
assert.equal(scenario.scenarioCost.total, null, 'missing Work Center data must remain unresolved')
assert.ok(scenario.overrideWarnings.some(warning => warning.includes('no matching record')))
assert.equal(currentSnapshot.rates.length, 0, 'scenario override must not add a Work Center rate record')

console.log('Missing Work Center rate self-check: PASS')
