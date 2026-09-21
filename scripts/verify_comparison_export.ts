import assert from 'node:assert/strict'
import {
  buildComparisonExportModel,
  type ComparisonExportInput
} from '../src/services/excel/comparison-export'
import { compareSnapshots } from '../src/core'

const product = {
  productCode: 'TEST-001',
  productDescription: 'Test Product',
  uom: 'PC',
  customer: 'Test Customer',
  effectiveDate: '2026-09-21'
}

const reference = {
  id: 'snapshot-reference',
  product,
  effectiveDate: '2026-09-21',
  sourceRef: 'reference.xlsx',
  status: 'active' as const,
  rates: [
    {
      id: 'rate-wc1',
      workCenterCode: 'WC-1',
      description: 'Cutting',
      laborRate: 100,
      burdenRate: 50,
      effectiveDate: '2026-09-21',
      sourceRef: 'reference.xlsx',
      confidence: {
        laborRate: { status: 'verified' as const },
        burdenRate: { status: 'verified' as const }
      }
    }
  ],
  bom: [
    {
      id: 'bom-1',
      itemCode: 'MAT-1',
      description: 'Material 1',
      consumption: 2,
      unit: 'PC',
      price: 10,
      loss: 0.1,
      sourceRef: 'reference.xlsx',
      confidence: {
        consumption: { status: 'verified' as const },
        price: { status: 'verified' as const },
        loss: { status: 'verified' as const }
      }
    }
  ],
  routing: [
    {
      id: 'routing-1',
      operationCode: 'OP-10',
      sequence: 10,
      processName: 'Cut',
      workCenterId: 'WC-1',
      manning: 1,
      capacity: 100,
      yield: 0.9,
      sourceRef: 'reference.xlsx',
      confidence: {
        manning: { status: 'verified' as const },
        capacity: { status: 'verified' as const },
        yield: { status: 'verified' as const }
      }
    }
  ]
}

const current = {
  ...reference,
  id: 'snapshot-current',
  sourceRef: 'current.xlsx',
  rates: [
    {
      ...reference.rates[0],
      laborRate: 120,
      sourceRef: 'current.xlsx'
    },
    {
      ...reference.rates[0],
      id: 'rate-wc2',
      workCenterCode: 'WC-2',
      description: 'Assembly',
      laborRate: 90,
      burdenRate: 30,
      sourceRef: 'current.xlsx'
    }
  ],
  bom: [
    {
      ...reference.bom[0],
      price: 11,
      sourceRef: 'current.xlsx'
    },
    {
      ...reference.bom[0],
      id: 'bom-2',
      itemCode: 'MAT-2',
      description: 'Material 2',
      sourceRef: 'current.xlsx'
    }
  ],
  routing: [
    {
      ...reference.routing[0],
      sequence: 20,
      sourceRef: 'current.xlsx'
    },
    {
      ...reference.routing[0],
      id: 'routing-2',
      operationCode: 'OP-20',
      sequence: 30,
      processName: 'Assembly',
      sourceRef: 'current.xlsx'
    }
  ]
}

const input: ComparisonExportInput = {
  product,
  snapshotPair: { reference, current },
  comparison: compareSnapshots(reference, current)
}

const model = buildComparisonExportModel(input)

assert.deepEqual(model.summaryRows.map(row => row.element), ['Material', 'Labor', 'Burden', 'Total'])
assert.equal(model.bomRows.length, 2)
assert.equal(model.bomRows.find(row => row.itemCode === 'MAT-1')?.comparison, 'Changed')
assert.equal(model.bomRows.find(row => row.itemCode === 'MAT-2')?.comparison, 'Added')
assert.ok(model.routingRows.find(row => row.operationCode === 'OP-10')?.comparison.includes('Reordered'))
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-1')?.comparison, 'Changed Rate')
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-2')?.comparison, 'Added')
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-1')?.laborGap, 20)
assert.ok(model.statusCounts.changed >= 3)
assert.ok(model.warnings.length >= 0)

console.log('Comparison export model self-check: PASS')
