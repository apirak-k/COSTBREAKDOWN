import assert from 'node:assert/strict'
import type { CostSnapshot, SnapshotCost } from '../src/core/types'
import { calculateEconomicSimulation, createEconomicSimulationDraft, updateEconomicSimulationDraft } from '../src/features/simulation/simulation-economics.ts'

const current: CostSnapshot = {
  id: 'current',
  product: {
    productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '',
    sellingPrice: 100, sgaPercent: 10
  },
  effectiveDate: '', sourceRef: 'fixture', status: 'draft', rates: [], bom: [], routing: []
}
const simulationCost: SnapshotCost = {
  snapshotId: 'sim', material: 50, labor: 30, burden: 20, total: 100, status: 'complete', warnings: []
}
let draft = createEconomicSimulationDraft()
draft = updateEconomicSimulationDraft(draft, 'actionCost', '20000')
draft = updateEconomicSimulationDraft(draft, 'evaluationQuantity', '10000')
const result = calculateEconomicSimulation(current, simulationCost, 5, draft)

assert.equal(result.requiredSavingPerPiece, 2)
assert.equal(result.economicMarginPerPiece, 3)
assert.equal(result.simulationStandardCost, 100, 'economic inputs do not enter Standard Cost')
assert.equal(result.business.sgaAmountPerPiece, 10)
assert.equal(result.business.operatingProfitPerPiece, -10, 'negative OP remains valid')

const invalid = calculateEconomicSimulation(current, simulationCost, 5, {
  ...draft,
  evaluationQuantity: '0'
})
assert.equal(invalid.requiredSavingPerPiece, null)
assert.equal(invalid.economicMarginPerPiece, null)
assert.ok(invalid.warnings.some(warning => warning.includes('greater than zero')))
assert.equal(invalid.simulationStandardCost, 100)

console.log('Independent economic variables verification passed')
