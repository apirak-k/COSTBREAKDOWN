import assert from 'node:assert/strict'
import {
  calculateSnapshotCost,
  calculateSnapshotRoutingDetail,
  compareSnapshots,
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  SIMULATION_PARAMETERS
} from '../src/features/simulation/simulation-state.ts'

const product = {
  productCode: 'TEST-001',
  productDescription: 'Synthetic',
  uom: 'PC',
  customer: 'Synthetic',
  effectiveDate: '2026-09-27'
}

function bom(): SnapshotBOMItem {
  return {
    id: 'bom-1', itemCode: 'MAT-01', description: 'Synthetic material',
    consumption: 1, unit: 'pc', price: 1, loss: 0, confidence: {}
  }
}

function route(overrides: Partial<SnapshotRoutingStep> = {}): SnapshotRoutingStep {
  return {
    id: 'routing-unknown-wc', processName: 'Unknown rate operation', workCenterId: 'UNKNOWN-WC',
    manning: 1, capacity: 100, yield: 1, confidence: {}, ...overrides
  }
}

function rate(overrides: Partial<SnapshotWorkCenterRate> = {}): SnapshotWorkCenterRate {
  return {
    id: 'rate-unknown-wc', workCenterCode: 'UNKNOWN-WC', description: 'Configured fixture rate',
    laborRate: 10, burdenRate: 20, effectiveDate: '2026-09-27', confidence: {}, ...overrides
  }
}

function snapshot(options: {
  id: string
  routing?: SnapshotRoutingStep[]
  rates?: SnapshotWorkCenterRate[]
}): CostSnapshot {
  return {
    id: options.id,
    product,
    effectiveDate: '2026-09-27',
    sourceRef: 'missing-rate-fixture',
    status: 'active',
    rates: options.rates ?? [],
    bom: [bom()],
    routing: options.routing ?? [route()]
  }
}

const reference = snapshot({ id: 'missing-rate-reference' })
const current = snapshot({
  id: 'missing-rate-current',
  routing: [route({ id: 'routing-unknown-wc-current', capacity: 50 })]
})

const missingRateCost = calculateSnapshotCost(current)
assert.equal(missingRateCost.labor, null, 'missing Work Center labor must remain unavailable')
assert.equal(missingRateCost.burden, null, 'missing Work Center burden must remain unavailable')
assert.equal(missingRateCost.total, null, 'missing Work Center data must not produce a Standard Cost')

const missingRateDetail = calculateSnapshotRoutingDetail(
  { reference: reference.routing[0], current: current.routing[0] },
  reference.rates,
  current.rates
)
assert.equal(missingRateDetail.referenceLaborCost, null)
assert.equal(missingRateDetail.currentLaborCost, null)
assert.equal(missingRateDetail.referenceBurdenCost, null)
assert.equal(missingRateDetail.currentBurdenCost, null)
assert.equal(missingRateDetail.totalGap, null, 'unavailable Process detail must not become zero')

const missingRateComparison = compareSnapshots(reference, current)
assert.equal(missingRateComparison.routingFindings[0]?.costEffect?.gap.total, null)
assert.equal(missingRateComparison.routingFindings[0]?.matchStatus, 'matched')

const configuredReference = snapshot({ id: 'configured-reference', rates: [rate()] })
const configuredCurrent = snapshot({
  id: 'configured-current',
  rates: [rate()],
  routing: [route({ id: 'routing-configured-current', capacity: 50 })]
})
const configuredReferenceCost = calculateSnapshotCost(configuredReference)
const configuredCurrentCost = calculateSnapshotCost(configuredCurrent)
assert.equal(configuredReferenceCost.labor, 0.1, 'known Work Center labor uses its configured rate')
assert.equal(configuredReferenceCost.burden, 0.2, 'known Work Center burden uses its configured rate')
assert.equal(configuredCurrentCost.labor, 0.2)
assert.equal(configuredCurrentCost.burden, 0.4)

const configuredComparison = compareSnapshots(configuredReference, configuredCurrent)
const configuredProcessFinding = configuredComparison.routingFindings.find(finding => finding.matchStatus === 'matched')
assert.ok(configuredProcessFinding)
assert.ok(
  Math.abs((configuredProcessFinding.costEffect?.gap.total ?? Number.NaN) - 0.3) < 1e-12,
  'Process finding Gap uses canonical side-specific snapshot rates'
)

const simulationSources = {
  reference,
  current,
  custom: configuredCurrent
}
const simState = createEmptySimulationState(simulationSources)
assert.deepEqual(SIMULATION_PARAMETERS, [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
], 'Simulation exposes only the finalized BOM and Routing parameters')
assert.equal(simState.activeDataset, 'custom')
assert.equal(simState.comparisonBefore, 'current')
assert.equal(simState.comparisonAfter, 'custom')
assert.equal(
  getEffectiveSimulationDataset(simulationSources, simState, 'current').snapshot.rates.length,
  0,
  'Simulation derives its role from Master Working without fabricating Work Center rates'
)

console.log('Canonical missing Work Center verification passed; unavailable costs remain explicit')
