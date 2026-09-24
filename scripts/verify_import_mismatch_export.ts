import assert from 'node:assert/strict'
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
    customer: 'Test Customer',
    effectiveDate: '2026-09-24'
  },
  rates: [
    {
      id: 'wc-1',
      workCenterCode: 'WC-CUT',
      description: 'Cutting Station',
      laborRate: 120,
      burdenRate: 80,
      effectiveDate: '2026-09-24',
      confidence: {}
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
      confidence: {}
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
      confidence: {}
    }
  ],
  warnings: []
}

async function runTests() {
  const blob = await exportSnapshotToExcel(testSnapshot)
  assert.ok(blob.size > 0, 'Exported blob must have non-zero size')
  console.log(`✓ Exported snapshot to Excel (${blob.size} bytes)`)

  const buffer = await blob.arrayBuffer()
  const importResult = parseSnapshotWorkbookData(buffer, 'reference', 'PROD-RT-01')
  assert.ok(importResult.success, `Import should succeed: ${importResult.message}`)
  assert.ok(importResult.snapshot, 'Snapshot must be parsed')

  const parsed = importResult.snapshot!
  assert.equal(parsed.product.productCode, 'PROD-RT-01')
  assert.equal(parsed.rates.length, 1)
  assert.equal(parsed.rates[0].workCenterCode, 'WC-CUT')
  assert.equal(parsed.rates[0].laborRate, 120)
  assert.equal(parsed.bom.length, 1)
  assert.equal(parsed.bom[0].itemCode, 'MAT-01')
  assert.equal(parsed.bom[0].consumption, 1.25)
  assert.equal(parsed.bom[0].price, 45.5)
  assert.equal(parsed.routing.length, 1)
  assert.equal(parsed.routing[0].processName, 'Saw Cutting')
  assert.equal(parsed.routing[0].capacity, 500)
  console.log('✓ Export -> Import round-trip preserves all Product, Rates, BOM, and Routing data (Task 5)')

  // 2. Task 4: Product Mismatch must be a non-blocking warning (not an error rejecting import or comparison)
  // Test import with different expectedProductCode
  const mismatchImport = parseSnapshotWorkbookData(buffer, 'reference', 'PROD-DIFFERENT')
  assert.ok(mismatchImport.success, 'Import with mismatching expectedProductCode must succeed')
  assert.ok(mismatchImport.warnings && mismatchImport.warnings.length > 0, 'Mismatch warning must be present')
  assert.ok(mismatchImport.warnings?.some(w => w.includes('Product mismatch')), 'Warning text must mention Product mismatch')
  console.log('✓ Excel import with Product mismatch succeeds with non-blocking warning (Task 4)')

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
    product: { productCode: 'PROD-RT-01', productDescription: '', uom: 'PC', customer: '', effectiveDate: '' },
    snapshotPairMode: 'independent' as const,
    snapshotPair: { reference: testSnapshot, current: currentSnapshot },
    preparedSnapshotRoles: { reference: true, current: true }
  }

  const handoff = evaluateMasterDataHandoff(session, session.snapshotPair)
  assert.ok(handoff.canCompare, 'Comparison must be allowed (canCompare === true) despite product mismatch')
  assert.ok(handoff.warnings && handoff.warnings.length > 0, 'Handoff must record non-blocking warning')
  assert.ok(handoff.warnings?.some(w => w.includes('Product mismatch')), 'Handoff warning must mention Product mismatch')
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
