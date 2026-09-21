import assert from 'node:assert/strict'
import {
  calculateCostBreakdown,
  calculateRoutingDetailedRows,
  calculateTopDrivers,
  simulateWhatIfScenarios
} from '../src/core/calculations'
import { CostDriver, RoutingStep } from '../src/core/types'

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
assert.equal(breakdown.laborBase, 0, 'missing Work Center must not use an invented base labor rate')
assert.equal(breakdown.laborActive, 0, 'missing Work Center must not use an invented active labor rate')
assert.equal(breakdown.burdenBase, 0, 'missing Work Center must not use an invented base burden rate')
assert.equal(breakdown.burdenActive, 0, 'missing Work Center must not use an invented active burden rate')
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
assert.equal(detail.rows[0]?.baseTotal, 0, 'routing detail must agree with the primary breakdown')
assert.equal(detail.rows[0]?.activeTotal, 0, 'routing detail must agree with the primary breakdown')

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
const simulation = simulateWhatIfScenarios({
  driver: routingDriver,
  bomItem: null,
  routingStep: missingRateRouting[0],
  rates: [],
  totalActiveCost: 0,
  scenarios: [{ letter: 'A', label: 'Test', targetValue: '100', investment: '', lotSize: '1' }]
})
assert.equal(simulation[0]?.grossSaving, 0, 'what-if simulation must not use an invented Work Center rate')

console.log('Missing Work Center rate self-check: PASS')
