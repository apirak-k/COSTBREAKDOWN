import assert from 'node:assert/strict'
import { buildSourceGroups } from '../src/features/cost-breakdown/components/source-groups.ts'

const product = {
  productCode: 'SOURCE-001',
  productDescription: 'Source fixture',
  uom: 'PC',
  customer: 'Test',
  effectiveDate: '2026-01-01'
}

const pair = {
  reference: {
    id: 'ref', product, effectiveDate: product.effectiveDate, sourceRef: 'reference.xlsx', status: 'draft' as const,
    rates: [{ id: 'rate-1', workCenterCode: 'WC-1', description: 'WC 1', laborRate: 1, burdenRate: 2, effectiveDate: product.effectiveDate, sourceRef: 'reference.xlsx · WC' , confidence: {} }],
    bom: [
      { id: 'bom-1', itemCode: 'MAT-1', description: 'Mat 1', consumption: 1, unit: 'PC', price: 1, loss: 0, sourceRef: 'reference.xlsx · BOM', confidence: {} },
      { id: 'bom-2', itemCode: 'MAT-2', description: 'Mat 2', consumption: 1, unit: 'PC', price: 2, loss: 0, sourceRef: 'reference.xlsx · BOM', confidence: {} }
    ],
    routing: []
  },
  current: {
    id: 'cur', product, effectiveDate: product.effectiveDate, sourceRef: 'current.xlsx', status: 'draft' as const,
    rates: [],
    bom: [],
    routing: [{ id: 'route-1', operationCode: 'OP-10', processName: 'Cut', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, sourceRef: '', confidence: {} }]
  }
}

const groups = buildSourceGroups(pair)
const referenceBom = groups.find(group => group.role === 'reference' && group.section === 'BOM')
assert.ok(referenceBom)
assert.equal(referenceBom.recordCount, 2)
assert.deepEqual(referenceBom.locations, ['MAT-1', 'MAT-2'])

const currentRouting = groups.find(group => group.role === 'current' && group.section === 'Routing')
assert.ok(currentRouting)
assert.equal(currentRouting.missingSource, true)
assert.equal(currentRouting.sourceRef, 'Source not recorded')

console.log('Source grouping verification passed.')
