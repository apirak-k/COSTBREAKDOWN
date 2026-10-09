import assert from 'node:assert/strict'
import {
  buildPrioritizationCandidates,
  calculateSnapshotCost,
  calculateSnapshotRoutingDetail,
  compareSnapshots,
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core'
import { SIMULATION_PARAMETERS, startSimulationFrom } from '../src/features/simulation/simulation-state.ts'

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
const missingRateProcessCandidate = buildPrioritizationCandidates(
  missingRateComparison,
  reference,
  current
).find(candidate => candidate.sourceType === 'process')
assert.ok(missingRateProcessCandidate, 'changed Process remains identifiable despite unavailable cost')
assert.equal(missingRateProcessCandidate.costGap, null, 'Candidate pipeline must preserve unavailable Gap')

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
const configuredProcessCandidate = buildPrioritizationCandidates(
  configuredComparison,
  configuredReference,
  configuredCurrent
).find(candidate => candidate.sourceType === 'process')
assert.ok(
  Math.abs((configuredProcessCandidate?.costGap ?? Number.NaN) - 0.3) < 1e-12,
  'Process Candidate Gap uses canonical side-specific snapshot rates'
)

const simState = startSimulationFrom('current', {
  reference,
  current,
  custom: current
})
assert.deepEqual(SIMULATION_PARAMETERS, [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
], 'Simulation exposes only the finalized BOM and Routing parameters')
assert.equal(simState.snapshot?.rates.length, 0, 'starting SIM does not fabricate Work Center rate records')

console.log('Canonical missing Work Center verification passed; unavailable costs remain explicit')
