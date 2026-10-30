import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import { createEmptySimulationState, getEffectiveSimulationDataset } from '../src/features/simulation/simulation-state.ts'

function snapshot(role: MasterDataRole, laborRate: number, burdenRate: number): CostSnapshot {
  return {
    id: role,
    product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: role, status: 'draft',
    rates: [{ id: `rate-${role}`, workCenterCode: 'WC-1', description: role, laborRate, burdenRate, effectiveDate: '', confidence: {} }],
    bom: [{ id: `bom-${role}`, itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price: 10, loss: 0, confidence: {} }],
    routing: [{ id: `route-${role}`, processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
  }
}

const sources = {
  reference: snapshot('reference', 20, 10),
  current: snapshot('current', 10, 5),
  custom: snapshot('custom', 30, 15)
}
const empty = createEmptySimulationState(sources)
const unchangedCurrent = getEffectiveSimulationDataset(sources, empty, 'current').snapshot
const unchangedResult = calculateParameterSimulation(sources.current, unchangedCurrent)
assert.equal(unchangedResult.afterCost.total, unchangedResult.beforeCost.total)

const edited = updateSimulationParameter(empty, sources, 'route-current', 'routing.capacity', 20, 'current')
const editedCurrent = getEffectiveSimulationDataset(sources, edited, 'current').snapshot
assert.equal(editedCurrent.routing[0]?.capacity, 20)
assert.deepEqual(editedCurrent.rates, sources.current.rates, 'a Current parameter edit retains Current Work Center rates')
assert.deepEqual(getEffectiveSimulationDataset(sources, edited, 'reference').snapshot.rates, sources.reference.rates,
  'editing Current does not replace Reference Work Center rates')
assert.deepEqual(getEffectiveSimulationDataset(sources, edited, 'custom').snapshot.rates, sources.custom.rates,
  'editing Current does not replace Custom Work Center rates')
assert.notEqual(calculateParameterSimulation(sources.current, editedCurrent).afterCost.total, unchangedResult.afterCost.total,
  'the generic calculation responds to a role-scoped Routing parameter override')

console.log('PASS: Role-scoped parameter calculation preserves each dataset rate context')
