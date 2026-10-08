import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  reconcileSimulationState,
  startSimulationFrom
} from '../src/features/simulation/simulation-state.ts'

function snapshot(id: string, price: number): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [],
    bom: [{
      id: `bom-${id}`, itemCode: 'MAT-1', description: 'Test material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {}
    }],
    routing: []
  }
}

function sources(referencePrice = 10, currentPrice = 12, customPrice = 14): Record<MasterDataRole, CostSnapshot> {
  return {
    reference: snapshot('reference', referencePrice),
    current: snapshot('current', currentPrice),
    custom: snapshot('custom', customPrice)
  }
}

const initial = sources()
const referenceSim = startSimulationFrom('reference', initial, '2026-10-09T02:00:00.000Z')
assert.equal(referenceSim.sourceRole, 'reference')
assert.equal(referenceSim.snapshot?.id, 'reference')
assert.notStrictEqual(referenceSim.snapshot, initial.reference, 'SIM owns an isolated snapshot copy')
assert.notStrictEqual(referenceSim.snapshot?.bom[0], initial.reference.bom[0], 'SIM row edits cannot mutate the source row')
if (referenceSim.snapshot) referenceSim.snapshot.bom[0].price = 99
assert.equal(initial.reference.bom[0].price, 10, 'Editing the copied SIM snapshot leaves Reference Working unchanged')
assert.equal(reconcileSimulationState(referenceSim, initial), referenceSim, 'An unchanged source and Current basis preserves SIM')

const changedReference = reconcileSimulationState(referenceSim, sources(11))
assert.deepEqual(changedReference, createEmptySimulationState(), 'Changing the selected source invalidates SIM deterministically')
const changedCurrent = reconcileSimulationState(referenceSim, sources(10, 13))
assert.deepEqual(changedCurrent, createEmptySimulationState(), 'Changing the Current comparison basis invalidates SIM deterministically')
const changedUnrelatedSource = reconcileSimulationState(referenceSim, sources(10, 12, 99))
assert.strictEqual(changedUnrelatedSource, referenceSim, 'A non-source, non-basis dataset change does not invalidate SIM')

const customSim = startSimulationFrom('custom', initial)
assert.equal(customSim.sourceRole, 'custom')
assert.equal(customSim.snapshot?.bom[0].price, 14)
assert.deepEqual(reconcileSimulationState(customSim, sources(10, 12, 15)), createEmptySimulationState())
const currentSim = startSimulationFrom('current', initial)
assert.equal(currentSim.sourceRole, 'current')
assert.equal(currentSim.snapshot?.bom[0].price, 12)

console.log('Independent Simulation workspace verification passed')
