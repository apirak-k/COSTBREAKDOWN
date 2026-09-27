import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {
  buildComparisonExportModel,
  generateSnapshotComparisonExcel,
  getComparisonExportFilename,
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
assert.equal(model.bomRows.find(row => row.itemCode === 'MAT-1')?.comparison, 'CHANGED')
assert.equal(model.bomRows.find(row => row.itemCode === 'MAT-2')?.comparison, 'ADDED')
assert.equal(model.routingRows.find(row => row.operationCode === 'OP-10')?.comparison, 'CHANGED')
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-1')?.comparison, 'CHANGED')
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-2')?.comparison, 'ADDED')
assert.equal(model.workCenterRows.find(row => row.workCenterCode === 'WC-1')?.laborGap, 20)
assert.deepEqual(model.statusCounts, { unchanged: 0, changed: 3, added: 3, removed: 0, review: 0 })
assert(model.bomRows.every(row => row.costGap !== null), 'Valid BOM rows export a record cost effect')
assert(model.routingRows.every(row => row.laborCostGap !== null && row.burdenCostGap !== null), 'Valid Routing rows export Labor and Burden effects')
const materialGap = model.summaryRows.find(row => row.element === 'Material')?.gap
const laborGap = model.summaryRows.find(row => row.element === 'Labor')?.gap
const burdenGap = model.summaryRows.find(row => row.element === 'Burden')?.gap
assert.equal(model.bomRows.reduce((sum, row) => sum + (row.costGap ?? 0), 0), materialGap, 'Exported BOM row effects must sum to Material gap')
assert.equal(model.routingRows.reduce((sum, row) => sum + (row.laborCostGap ?? 0), 0), laborGap, 'Exported Routing labor effects must sum to Labor gap')
assert.equal(model.routingRows.reduce((sum, row) => sum + (row.burdenCostGap ?? 0), 0), burdenGap, 'Exported Routing burden effects must sum to Burden gap')
assert.ok(model.warnings.length >= 0)
assert.equal(getComparisonExportFilename('RGOM/024'), 'CostBreakdown_Comparison_RGOM_024.xlsx')

async function verifyWorkbook(): Promise<void> {
  const blob = await generateSnapshotComparisonExcel(input)
  assert.ok(blob.size > 0)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  assert.deepEqual(
    workbook.worksheets.map(sheet => sheet.name),
    ['Summary', 'BOM Comparison', 'Routing Comparison', 'Work Center Comparison']
  )
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A1').value, 'Cost Breakdown Comparison')
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A6').value, 'Element')
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A7').value, 'Material')
  assert.equal(workbook.getWorksheet('BOM Comparison')?.getCell('A4').value, 'Item Code')
  assert.equal(workbook.getWorksheet('BOM Comparison')?.getCell('O4').value, 'Reference Material Cost')
  assert.equal(workbook.getWorksheet('Routing Comparison')?.getCell('P4').value, 'Reference Labor Cost')
  const bomSheet = workbook.getWorksheet('BOM Comparison')
  const routingSheet = workbook.getWorksheet('Routing Comparison')
  assert.equal(bomSheet?.getCell('O5').value, model.bomRows[0].referenceCost)
  assert.equal(bomSheet?.getCell('P5').value, model.bomRows[0].currentCost)
  assert.equal(bomSheet?.getCell('Q5').value, model.bomRows[0].costGap)
  assert.equal(routingSheet?.getCell('P5').value, model.routingRows[0].referenceLaborCost)
  assert.equal(routingSheet?.getCell('Q5').value, model.routingRows[0].currentLaborCost)
  assert.equal(routingSheet?.getCell('R5').value, model.routingRows[0].laborCostGap)
  assert.equal(routingSheet?.getCell('S5').value, model.routingRows[0].referenceBurdenCost)
  assert.equal(routingSheet?.getCell('T5').value, model.routingRows[0].currentBurdenCost)
  assert.equal(routingSheet?.getCell('U5').value, model.routingRows[0].burdenCostGap)
  const workbookBomGap = model.bomRows.reduce((sum, _, index) => sum + Number(bomSheet?.getCell(5 + index, 17).value ?? 0), 0)
  const workbookLaborGap = model.routingRows.reduce((sum, _, index) => sum + Number(routingSheet?.getCell(5 + index, 18).value ?? 0), 0)
  const workbookBurdenGap = model.routingRows.reduce((sum, _, index) => sum + Number(routingSheet?.getCell(5 + index, 21).value ?? 0), 0)
  assert(Math.abs(workbookBomGap - Number(workbook.getWorksheet('Summary')?.getCell('D7').value)) < 0.0001, 'Workbook BOM effects must reconcile to Summary Material gap')
  assert(Math.abs(workbookLaborGap - Number(workbook.getWorksheet('Summary')?.getCell('D8').value)) < 0.0001, 'Workbook routing Labor effects must reconcile to Summary Labor gap')
  assert(Math.abs(workbookBurdenGap - Number(workbook.getWorksheet('Summary')?.getCell('D9').value)) < 0.0001, 'Workbook routing Burden effects must reconcile to Summary Burden gap')
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A14').value, 'UNCHANGED')
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A15').value, 'CHANGED')
  assert.equal(workbook.getWorksheet('Summary')?.getCell('A18').value, 'Validation warnings')
  assert.equal(workbook.getWorksheet('Work Center Comparison')?.getCell('A4').value, 'Work Center')
}

verifyWorkbook()
  .then(() => console.log('Comparison export workbook self-check: PASS'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
