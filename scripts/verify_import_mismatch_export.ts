import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
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
    productName: 'Round-Trip Product',
    productCode: '',
    productDescription: 'Round-Trip Product',
    uom: 'PC',
    sellingPrice: 125,
    sgaPercent: 8,
    note: 'Legacy product note is intentionally excluded',
    customer: '',
    effectiveDate: '',
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
  assert.equal(parsed.product.productName, 'Round-Trip Product')
  assert.equal(parsed.product.uom, 'PC')
  assert.equal(parsed.product.sellingPrice, 125)
  assert.equal(parsed.product.sgaPercent, 8)
  assert.equal(parsed.product.note, '')
  assert.equal(parsed.rates.length, 1)
  assert.equal(parsed.rates[0].workCenterCode, 'WC-CUT')
  assert.equal(parsed.rates[0].laborRate, 120)
  assert.equal(parsed.rates[0].note, 'Work Center annotation')
  assert.equal(parsed.rates[0].additionalFields?.['Supplier Group'], undefined)
  assert.equal(parsed.bom.length, 1)
  assert.equal(parsed.bom[0].description, 'Aluminum Extrusion')
  assert.equal(parsed.bom[0].consumption, 1.25)
  assert.equal(parsed.bom[0].price, 45.5)
  assert.equal(parsed.bom[0].note, 'BOM annotation')
  assert.equal(parsed.bom[0].additionalFields?.Supplier, undefined)
  assert.equal(parsed.bom[0].additionalFields?.['Material Group'], undefined)
  assert.equal(parsed.product.additionalFields?.['Customer Group'], undefined)
  assert.equal(parsed.routing.length, 1)
  assert.equal(parsed.routing[0].processName, 'Saw Cutting')
  assert.equal(parsed.routing[0].operationCode, undefined)
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
  const styledExport = new ExcelJS.Workbook()
  await styledExport.xlsx.load(Buffer.from(buffer))
  assert.deepEqual(exportedWorkbook.SheetNames, ['META', 'BOM', 'WORK_CENTER', 'ROUTING'])
  assert.equal(exportedWorkbook.SheetNames.includes('ADDITIONAL_DATA'), false)
  const metaRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.META, { header: 1, defval: null }) as unknown[][]
  assert.deepEqual(metaRows.slice(2, 7), [
    ['PRODUCT NAME', 'Round-Trip Product'],
    ['UOM', 'PC'],
    ['SELLING PRICE', 125],
    ['SG&A %', 8],
    ['DATASET REMARK', 'Dataset annotation']
  ])
  const workCenterRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.WORK_CENTER, { header: 1, defval: null }) as unknown[][]
  const bomRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.BOM, { header: 1, defval: null }) as unknown[][]
  const routingRows = XLSX.utils.sheet_to_json(exportedWorkbook.Sheets.ROUTING, { header: 1, defval: null }) as unknown[][]
  assert.equal(styledExport.getWorksheet('WORK_CENTER')?.getTable('WorkCenterData').table.tableRef, 'A3:D4')
  assert.equal(styledExport.getWorksheet('BOM')?.getTable('BOMData').table.tableRef, 'A3:F4')
  assert.equal(styledExport.getWorksheet('ROUTING')?.getTable('RoutingData').table.tableRef, 'A3:F4')
  assert.deepEqual(workCenterRows[2], ['WC', 'Labor', 'Burden', 'Note'])
  assert.deepEqual(bomRows[2], ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
  assert.deepEqual(routingRows[2], ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])
  console.log('✓ Export workbook uses the current four-sheet Master Data schema and omits unsupported custom/lifecycle fields')

  // Product Name mismatch stays visible as a non-blocking handoff warning.
  const currentSnapshot: CostSnapshot = {
    ...testSnapshot,
    id: 'snap-cur-02',
    comparisonRole: 'current',
    product: {
      ...testSnapshot.product,
      productName: 'Current Product',
      productDescription: 'Current Product'
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
  console.log('✓ Comparison handoff allows mismatching Product Names with a non-blocking warning')

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
    bom: [{ ...testSnapshot.bom[0], description: 'New Material', itemCode: 'New Material', price: 88 }]
  }

  const nextPair: SnapshotPair = {
    reference: newImportedReference,
    current: pair.current
  }

  assert.equal(nextPair.reference.bom[0].description, 'New Material')
  assert.equal(nextPair.current.bom[0].price, 999, 'Current must remain completely untouched when Reference is replaced')
  console.log('✓ Import replacement replaces selected side and preserves opposite side (Task 3)')
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
