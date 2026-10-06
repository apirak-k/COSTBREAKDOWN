import assert from 'node:assert/strict'
import { getScenarioInputDefinitions } from '../src/features/rca-simulation/scenario-inputs'
import type { PrioritizationCandidate } from '../src/core/calculations/material-candidates'
import type { CostSnapshot } from '../src/core/types'

type InputDefinitionContract = {
  key: string
  sourceType: 'bom' | 'routing' | 'rate'
  sourceId: string
  field: string
  currentValue: number
  displayScale: number
  label: string
  unit: string
}

const currentSnapshot: CostSnapshot = {
  id: 'current-inputs-synthetic',
  product: {
    productCode: 'TEST-INPUTS',
    productDescription: 'Scenario input mapping fixture',
    uom: 'PC',
    customer: 'Synthetic',
    effectiveDate: '2026-09-27'
  },
  effectiveDate: '2026-09-27',
  sourceRef: 'scenario-input-mapping-fixture',
  status: 'active',
  bom: [
    {
      id: 'bom-current',
      itemCode: 'MAT-01',
      description: 'Current material',
      consumption: 2.5,
      unit: 'kg',
      price: 12,
      loss: 0.15,
      confidence: {}
    },
    {
      id: 'bom-other',
      itemCode: 'MAT-02',
      description: 'Other material',
      consumption: 7,
      unit: 'kg',
      price: 4,
      loss: 0.05,
      confidence: {}
    }
  ],
  rates: [
    {
      id: 'rate-current-wc-01',
      workCenterCode: 'WC-01',
      description: 'Current work center',
      laborRate: 18,
      burdenRate: 9,
      effectiveDate: '2026-09-27',
      confidence: {}
    },
    {
      id: 'rate-other-wc-02',
      workCenterCode: 'WC-02',
      description: 'Other work center',
      laborRate: 80,
      burdenRate: 40,
      effectiveDate: '2026-09-27',
      confidence: {}
    }
  ],
  routing: [
    {
      id: 'routing-wc-01-a',
      processName: 'First WC-01 operation',
      workCenterId: 'WC-01',
      manning: 1.5,
      capacity: 120,
      yield: 0.9,
      confidence: {}
    },
    {
      id: 'routing-wc-01-b',
      processName: 'Second WC-01 operation',
      workCenterId: 'WC-01',
      manning: 2,
      capacity: 80,
      yield: 0.8,
      confidence: {}
    },
    {
      id: 'routing-wc-01-generated',
      processName: '',
      workCenterId: 'WC-01',
      manning: null,
      capacity: null,
      yield: null,
      isGeneratedSizingPlaceholder: true,
      confidence: {}
    },
    {
      id: 'routing-wc-02',
      processName: 'Other work center operation',
      workCenterId: 'WC-02',
      manning: 9,
      capacity: 30,
      yield: 0.7,
      confidence: {}
    }
  ]
}

function makeCandidate(
  sourceType: PrioritizationCandidate['sourceType'],
  sourceId: string
): PrioritizationCandidate {
  return {
    candidateKey: sourceType + ':' + sourceId,
    candidateName: 'Synthetic ' + sourceType + ' candidate',
    category: sourceType === 'bom' ? 'Direct Material' : 'Processing Cost',
    factor: sourceType === 'bom' ? 'Price' : 'Work Center Aggregation',
    status: 'CHANGED',
    referenceCost: 10,
    currentCost: 12,
    costGap: 2,
    controllable: true,
    rank: 1,
    sourceType,
    sourceId
  }
}

function getInputs(candidate: PrioritizationCandidate): InputDefinitionContract[] {
  return getScenarioInputDefinitions(candidate, currentSnapshot)
}

function targets(inputs: InputDefinitionContract[]) {
  return inputs
    .map(({ sourceType, sourceId, field, currentValue, displayScale }) => ({
      sourceType,
      sourceId,
      field,
      currentValue,
      displayScale
    }))
    .sort((left, right) =>
      (left.sourceType + ':' + left.sourceId + ':' + left.field)
        .localeCompare(right.sourceType + ':' + right.sourceId + ':' + right.field)
    )
}

function assertStableUniqueKeys(inputs: InputDefinitionContract[], candidate: PrioritizationCandidate): void {
  const keys = inputs.map(input => input.key)
  assert.equal(new Set(keys).size, keys.length, 'Input keys must be unique within a candidate')
  assert.deepEqual(
    [...keys].sort(),
    getInputs(candidate).map(input => input.key).sort(),
    'Input keys must remain stable for the same Current snapshot and candidate'
  )
}

const bomCandidate = makeCandidate('bom', 'bom-current')
const bomInputs = getInputs(bomCandidate)
assert.deepEqual(
  bomInputs.map(input => input.label).sort(),
  [
    'Current material — Usage',
    'Current material — Loss',
    'Current material — Price'
  ].sort(),
  'Scenario input labels use the approved BOM Name rather than the legacy Item Code'
)
assert.deepEqual(targets(bomInputs), [
  { sourceType: 'bom', sourceId: 'bom-current', field: 'consumption', currentValue: 2.5, displayScale: 1 },
  { sourceType: 'bom', sourceId: 'bom-current', field: 'loss', currentValue: 0.15, displayScale: 100 },
  { sourceType: 'bom', sourceId: 'bom-current', field: 'price', currentValue: 12, displayScale: 1 }
])
assertStableUniqueKeys(bomInputs, bomCandidate)

const workCenterCandidate = makeCandidate('work-center', 'rate-current-wc-01')
const workCenterInputs = getInputs(workCenterCandidate)
assert.deepEqual(targets(workCenterInputs), [
  { sourceType: 'rate', sourceId: 'rate-current-wc-01', field: 'burdenRate', currentValue: 9, displayScale: 1 },
  { sourceType: 'rate', sourceId: 'rate-current-wc-01', field: 'laborRate', currentValue: 18, displayScale: 1 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-a', field: 'capacity', currentValue: 120, displayScale: 1 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-a', field: 'manning', currentValue: 1.5, displayScale: 1 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-a', field: 'yield', currentValue: 0.9, displayScale: 100 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-b', field: 'capacity', currentValue: 80, displayScale: 1 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-b', field: 'manning', currentValue: 2, displayScale: 1 },
  { sourceType: 'routing', sourceId: 'routing-wc-01-b', field: 'yield', currentValue: 0.8, displayScale: 100 }
])
assertStableUniqueKeys(workCenterInputs, workCenterCandidate)

for (const definition of [...bomInputs, ...workCenterInputs]) {
  assert.ok(definition.label.trim().length > 0, 'Every editable input must have a display label')
  assert.ok(definition.unit.trim().length > 0, 'Every editable input must have a display unit')
}

assert.deepEqual(
  getInputs(makeCandidate('bom', 'bom-absent')),
  [],
  'A BOM candidate missing from Current must produce no editable inputs'
)
assert.deepEqual(
  getInputs(makeCandidate('work-center', 'rate-absent')),
  [],
  'A Work Center candidate without a Current rate must produce no editable inputs'
)

console.log('Scenario input mapping verification passed')
