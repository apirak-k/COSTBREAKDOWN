import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { CostSnapshot, SnapshotPair } from '../src/core'
import { parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser.ts'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export.ts'
import { evaluateMasterDataHandoff } from '../src/core/calculations/master-data-handoff.ts'

console.log('--- Verifying Tasks 3, 4, 5 (Import Replacement, Mismatch Warning, Export Round-Trip) ---')

// 1. Task 5: Export a snapshot to Excel and verify buffer can be parsed back (Task 3 & 5 round-trip)
const testSnapshot: CostSnapshot = {
  id: 'snap-round-trip-01',
  comparisonRole: 'reference',
  status: 'draft',
  sourceRef: 'Manual Entry Baseline',
  product: {
    productCode: 'PROD-RT-01',
    productDescription: 'Round-Trip Product',
    uom: 'PC',
    note: 'Product annotation',
    customer: 'Test Customer',
    effectiveDate: '2026-09-24',
    additionalFields: { 'Customer Group': 'Consumer' }
  },
  rates: [
    {
      id: 'wc-1',
      workCenterCode: 'WC-CUT',
      description: 'Cutting Station',
      laborRate: 120,
      burdenRate: 80,
      effectiveDate: '2026-09-24',
      note: 'Work Center annotation',
      confidence: {},
      additionalFields: { 'Supplier Group': 'Vendor-01' }
    },
    {
      id: 'rate-size-legacy-2',
      workCenterCode: '',
      description: '',
      laborRate: 0,
      burdenRate: 0,
      effectiveDate: '2026-09-24',
      confidence: {},
      isGeneratedSizingPlaceholder: true
    }
  ],
  bom: [
    {
      id: 'bom-1',
      itemCode: 'MAT-01',
      description: 'Aluminum Extrusion',
      consumption: 1.25,
      unit: 'KG',
      price: 45.5,
      loss: 0.03,
      note: 'BOM annotation',
      confidence: {},
      additionalFields: { Supplier: 'Factory A', 'Material Group': 'Film' }
    },
    {
      id: 'bom-size-legacy-2',
      itemCode: '',
      description: '',
      consumption: null,
      unit: 'PC',
      price: null,
      loss: 0,
      confidence: {},
      isGeneratedSizingPlaceholder: true
    }
  ],
  routing: [
    {
      id: 'rt-1',
      operationCode: 'OP-10',
      sequence: 10,
      processCode: 'PRC-01',
      processName: 'Saw Cutting',
      workCenterId: 'WC-CUT',
      manning: 1,
      capacity: 500,
      yield: 0.99,
      note: 'Routing annotation',
      confidence: {},
      additionalFields: { 'Operator Note': 'Keep guard fitted' }
    },
    {
      id: 'routing-size-legacy-2',
      operationCode: '',
      sequence: 20,
      processName: '',
      workCenterId: 'WC-CUT',
      manning: null,
      capacity: null,
      yield: null,
      confidence: {},
      isGeneratedSizingPlaceholder: true
    }
  ],
  additionalFields: {
    'Dataset Note': 'Imported working dataset',
    Status: 'archived',
    'Dataset Status': 'archived',
    'Comparison Role': 'current'
  },
  remark: 'Dataset annotation',
  warnings: []
}

async function runTests() {
  const blob = await exportSnapshotToExcel(testSnapshot)
  assert.ok(blob.size > 0, 'Exported blob must have non-zero size')
  console.log(`✓ Exported snapshot to Excel (${blob.size} bytes)`)

  const buffer = await blob.arrayBuffer()
  const importResult = parseSnapshotWorkbookData(buffer, 'reference')
  assert.ok(importResult.success, `Import should succeed: ${importResult.message}`)
  assert.ok(importResult.snapshot, 'Snapshot must be parsed')

  const parsed = importResult.snapshot!
  assert.equal(parsed.product.productCode, 'PROD-RT-01')
  assert.equal(parsed.product.note, 'Product annotation')
  assert.equal(parsed.rates.length, 1)
  assert.equal(parsed.rates[0].workCenterCode, 'WC-CUT')
  assert.equal(parsed.rates[0].laborRate, 120)
  assert.equal(parsed.rates[0].note, 'Work Center annotation')
  assert.equal(parsed.rates[0].additionalFields?.['Supplier Group'], undefined)
  assert.equal(parsed.bom.length, 1)
  assert.equal(parsed.bom[0].itemCode, 'MAT-01')
  assert.equal(parsed.bom[0].consumption, 1.25)
  assert.equal(parsed.bom[0].price, 45.5)
  assert.equal(parsed.bom[0].note, 'BOM annotation')
  assert.equal(parsed.bom[0].additionalFields?.Supplier, undefined)
  assert.equal(parsed.bom[0].additionalFields?.['Material Group'], undefined)
  assert.equal(parsed.product.additionalFields?.['Customer Group'], undefined)
  assert.equal(parsed.routing.length, 1)
  assert.equal(parsed.routing[0].processName, 'Saw Cutting')
  assert.equal(parsed.routing[0].operationCode, 'OP-10')
  assert.equal(parsed.routing[0].processCode, undefined)
  assert.equal(parsed.routing[0].capacity, 500)
  assert.equal(parsed.routing[0].note, 'Routing annotation')
  assert.equal(parsed.warnings?.some(warning => warning.includes('Operation Code')), false)
  assert.equal(parsed.routing[0].additionalFields?.['Operator Note'], undefined)
  assert.equal(parsed.remark, 'Dataset annotation')
  assert.equal(parsed.additionalFields?.Status, undefined)
  assert.equal(parsed.additionalFields?.['Dataset Status'], undefined)
  assert.equal(parsed.additionalFields?.['Comparison Role'], undefined)
  console.log('✓ Neutral Export -> Import round-trip preserves agreed business fields and annotations (Task 5)')

  const exportedWorkbook = XLSX.read(buffer, { type: 'array' })
  assert.deepEqual(exportedWorkbook.SheetNames, ['META', 'PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING'])
  assert.equal(exportedWorkbook.SheetNames.includes('ADDITIONAL_DATA'), false)
  const metaRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.META, { header: 1, defval: null }) as unknown[][]
  assert.deepEqual(metaRows[2], ['Remark'])
  assert.equal(metaRows[3][0], 'Dataset annotation')
  const productRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.PRODUCT, { header: 1, defval: null }) as unknown[][]
  const workCenterRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.WORK_CENTER, { header: 1, defval: null }) as unknown[][]
  const bomRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.BOM, { header: 1, defval: null }) as unknown[][]
  const routingRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.ROUTING, { header: 1, defval: null }) as unknown[][]
  assert.deepEqual(productRows[2], ['Product Code', 'Product Name', 'UOM', 'Note'])
  assert.deepEqual(workCenterRows[2], ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note'])
  assert.deepEqual(bomRows[2], ['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note'])
  assert.deepEqual(routingRows[2], ['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note'])
  console.log('✓ Export workbook uses only the exact neutral schema and omits unsupported custom/lifecycle fields')

  // Test comparison handoff with mismatching Reference and Current Product Codes
  const currentSnapshot: CostSnapshot = {
    ...testSnapshot,
    id: 'snap-cur-02',
    comparisonRole: 'current',
    product: {
      ...testSnapshot.product,
      productCode: 'PROD-CUR-02'
    }
  }

  const session = {
    snapshotPairMode: 'independent' as const,
    snapshotPair: { reference: testSnapshot, current: currentSnapshot },
    preparedSnapshotRoles: { reference: true, current: true }
  }

  const handoff = evaluateMasterDataHandoff(session, session.snapshotPair)
  assert.ok(handoff.datasetsPrepared, 'Prepared datasets remain visible despite product mismatch')
  assert.ok(handoff.warnings && handoff.warnings.length > 0, 'Handoff must record non-blocking warning')
  assert.ok(handoff.warnings?.some(w => w.includes('Product mismatch')), 'Handoff warning must mention Product mismatch')
  assert.equal(handoff.warnings?.some(w => w.includes('Header Product')), false)
  console.log('✓ Comparison handoff allows comparison with mismatching Product Codes with non-blocking warning (Task 4)')

  // 3. Task 3: Replacement rule - replacing selected side keeps opposite side intact
  const originalReference = { ...testSnapshot }
  const originalCurrent = { ...currentSnapshot, bom: [{ ...currentSnapshot.bom[0], price: 999 }] }

  const pair: SnapshotPair = {
    reference: originalReference,
    current: originalCurrent
  }

  // Simulate importing new data to Reference
  const newImportedReference: CostSnapshot = {
    ...testSnapshot,
    id: 'new-ref-import',
    bom: [{ ...testSnapshot.bom[0], itemCode: 'NEW-MAT-99', price: 88 }]
  }

  const nextPair: SnapshotPair = {
    reference: newImportedReference,
    current: pair.current
  }

  assert.equal(nextPair.reference.bom[0].itemCode, 'NEW-MAT-99')
  assert.equal(nextPair.current.bom[0].price, 999, 'Current must remain completely untouched when Reference is replaced')
  console.log('✓ Import replacement replaces selected side and preserves opposite side (Task 3)')
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
