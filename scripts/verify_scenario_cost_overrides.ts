import assert from 'node:assert/strict'
import { calculateSnapshotCost } from '../src/core/calculations/snapshot-cost'
import { calculateScenarioCosts } from '../src/core/calculations/scenario-cost'
import type {
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core/types'

type ScenarioDraftFixture = {
  letter: 'A' | 'B' | 'C'
  label: string
  overrides: {
    bom?: Record<string, Partial<Pick<SnapshotBOMItem, 'price' | 'loss' | 'consumption'>>>
    routing?: Record<string, Partial<Pick<SnapshotRoutingStep, 'manning' | 'capacity' | 'yield'>>>
    rates?: Record<string, Partial<Pick<SnapshotWorkCenterRate, 'laborRate' | 'burdenRate'>>>
  }
}

const currentSnapshot: CostSnapshot = {
  id: 'current-synthetic',
  product: {
    productCode: 'TEST-001',
    productDescription: 'Scenario cost fixture',
    uom: 'PC',
    customer: 'Synthetic',
    effectiveDate: '2026-09-27'
  },
  effectiveDate: '2026-09-27',
  sourceRef: 'scenario-cost-fixture',
  status: 'active',
  rates: [{
    id: 'rate-1',
    workCenterCode: 'WC-01',
    description: 'Synthetic workstation',
    laborRate: 10,
    burdenRate: 5,
    effectiveDate: '2026-09-27',
    confidence: {}
  }],
  bom: [{
    id: 'bom-1',
    itemCode: 'MAT-01',
    description: 'Synthetic material',
    consumption: 2,
    unit: 'kg',
    price: 10,
    loss: 0.1,
    confidence: {}
  }],
  routing: [{
    id: 'routing-1',
    processName: 'Synthetic operation',
    workCenterId: 'WC-01',
    manning: 1,
    capacity: 100,
    yield: 0.8,
    confidence: {}
  }]
}

const drafts: ScenarioDraftFixture[] = [
  {
    letter: 'A',
    label: 'Material and processing changes',
    overrides: {
      bom: { 'bom-1': { price: 8, loss: 0.2, consumption: 3 } },
      routing: { 'routing-1': { manning: 2, capacity: 80, yield: 0.9 } },
      rates: { 'rate-1': { laborRate: 12, burdenRate: 7 } }
    }
  },
  {
    letter: 'B',
    label: 'Consumption-only change',
    overrides: {
      bom: { 'bom-1': { consumption: 4 } }
    }
  },
  {
    letter: 'C',
    label: 'Processing and burden-rate change',
    overrides: {
      routing: { 'routing-1': { capacity: 50, yield: 0.5 } },
      rates: { 'rate-1': { burdenRate: 4 } }
    }
  }
]

function expectedSnapshotFromCurrent(
  source: CostSnapshot,
  draft: ScenarioDraftFixture
): CostSnapshot {
  return {
    ...source,
    bom: source.bom.map(item => ({
      ...item,
      ...(draft.overrides.bom?.[item.id] ?? {})
    })),
    routing: source.routing.map(step => ({
      ...step,
      ...(draft.overrides.routing?.[step.id] ?? {})
    })),
    rates: source.rates.map(rate => ({
      ...rate,
      ...(draft.overrides.rates?.[rate.id] ?? {})
    }))
  }
}

const sourceBeforeCalculation = JSON.stringify(currentSnapshot)
const currentCost = calculateSnapshotCost(currentSnapshot)
const scenarioResults = calculateScenarioCosts(currentSnapshot, drafts)

function resultFor(letter: 'A' | 'B' | 'C') {
  const result = scenarioResults.find(item => item.letter === letter)
  assert.ok(result, 'Scenario ' + letter + ' should have a result')
  return result
}

assert.equal(currentCost.status, 'complete')
assert.equal(currentCost.material, 22)
assert.equal(currentCost.labor, 0.125)
assert.equal(currentCost.burden, 0.0625)

for (const draft of drafts) {
  const result = resultFor(draft.letter)
  assert.equal(result.label, draft.label)
  assert.deepEqual(result.currentCost, currentCost, draft.letter + ' should use the same Current cost')
  assert.deepEqual(
    result.scenarioCost,
    calculateSnapshotCost(expectedSnapshotFromCurrent(currentSnapshot, draft)),
    draft.letter + ' should match the shared Standard Cost calculation'
  )
  assert.deepEqual(result.overrideWarnings, [], draft.letter + ' uses only existing IDs and valid numeric overrides')
}

const scenarioA = resultFor('A')
const scenarioB = resultFor('B')
const scenarioC = resultFor('C')

assert.notEqual(scenarioA.scenarioCost.total, currentCost.total, 'A should apply material and processing changes')
assert.notEqual(scenarioB.scenarioCost.material, currentCost.material, 'B should apply its Consumption override')
assert.equal(scenarioB.scenarioCost.labor, currentCost.labor, 'B must not inherit A or C processing edits')
assert.equal(scenarioB.scenarioCost.burden, currentCost.burden, 'B must not inherit A or C rate edits')
assert.equal(scenarioC.scenarioCost.material, currentCost.material, 'C must not inherit A or B material edits')
assert.notEqual(scenarioC.scenarioCost.labor, currentCost.labor, 'C should apply its Routing overrides')
assert.notEqual(scenarioC.scenarioCost.burden, currentCost.burden, 'C should apply its Work Center rate override')
assert.equal(JSON.stringify(currentSnapshot), sourceBeforeCalculation, 'Scenario calculation must not mutate Current')

const unknownIdDraft: ScenarioDraftFixture = {
  letter: 'C',
  label: 'Unknown record IDs',
  overrides: {
    bom: { 'unknown-bom': { price: 1 } },
    routing: { 'unknown-routing': { capacity: 1 } },
    rates: { 'unknown-rate': { laborRate: 1 } }
  }
}
const unknownIdResult = calculateScenarioCosts(currentSnapshot, [unknownIdDraft])[0]
assert.ok(unknownIdResult, 'Unknown-ID scenario should still return a result')
assert.deepEqual(unknownIdResult.scenarioCost, currentCost, 'Unknown IDs must not add structural records or change cost')
assert.ok(unknownIdResult.overrideWarnings.length > 0, 'Unknown IDs should be surfaced as override warnings')

const incompleteSnapshot: CostSnapshot = {
  ...currentSnapshot,
  bom: currentSnapshot.bom.map(item => ({ ...item, price: null })),
  routing: currentSnapshot.routing.map(step => ({ ...step, capacity: null }))
}
const incompleteDraft: ScenarioDraftFixture = {
  letter: 'A',
  label: 'Overrides with unresolved inputs',
  overrides: {
    bom: { 'bom-1': { loss: 0.2 } },
    routing: { 'routing-1': { manning: 2 } },
    rates: { 'rate-1': { laborRate: 12 } }
  }
}
const incompleteExpectedSnapshot = expectedSnapshotFromCurrent(incompleteSnapshot, incompleteDraft)
const incompleteResult = calculateScenarioCosts(incompleteSnapshot, [incompleteDraft])[0]
assert.ok(incompleteResult, 'Incomplete-input scenario should still return a result')
assert.deepEqual(
  incompleteResult.scenarioCost,
  calculateSnapshotCost(incompleteExpectedSnapshot),
  'Incomplete scenario values must follow the shared Standard Cost engine'
)
assert.equal(incompleteResult.scenarioCost.material, null)
assert.equal(incompleteResult.scenarioCost.total, null)
assert.equal(incompleteResult.scenarioCost.status, 'missing')

console.log('Scenario cost override verification passed')
