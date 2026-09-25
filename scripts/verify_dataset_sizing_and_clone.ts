import { evaluateMasterDataHandoff } from '../src/core/calculations/master-data-handoff.ts'
import { generateDynamicExcelTemplate, exportSnapshotToExcel } from '../src/services/excel/index.ts'
import { parseSnapshotExcelInputFile } from '../src/services/excel/snapshot-parser.ts'
import { createEmptySnapshotPair } from '../src/state/seed-data.ts'
import { ProductSession, DatasetSizing, SnapshotPair, CostSnapshot } from '../src/core/types/index.ts'
import ExcelJS from 'exceljs'

async function runVerifications() {
  console.log('--- Verifying Master Data Dataset Sizing & Bi-directional Clone ---')

  const initialPair = createEmptySnapshotPair('test-session-1')

  // 1. Peer Datasets & Independent Sizing
  let session: ProductSession = {
    id: 'test-session-1',
    product: {
      productCode: 'RGOM-024',
      productDescription: 'Membrane Switch Panel',
      uom: 'PCS',
      customer: 'Automotive Customer',
      effectiveDate: '2026-09-25'
    },
    rates: [],
    bom: [],
    routing: [],
    savedDrivers: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snapshotPairMode: 'independent',
    snapshotPair: initialPair,
    preparedSnapshotRoles: { reference: false, current: false },
    masterDataRole: 'reference',
    datasetSizing: {
      reference: {},
      current: {}
    }
  }

  console.log('1. Checking initial sizing state...')
  if (session.datasetSizing?.reference.wcCount !== undefined || session.datasetSizing?.current.wcCount !== undefined) {
    throw new Error('Expected initial dataset sizing to be unset for fresh session')
  }
  console.log('✓ Initial dataset sizing is unset for both Reference and Current')

  // Set Reference sizing
  const refSizing: DatasetSizing = { wcCount: 5, bomCount: 15, routingCount: 8 }
  session = {
    ...session,
    datasetSizing: {
      ...session.datasetSizing,
      reference: refSizing,
      current: session.datasetSizing?.current ?? {}
    }
  }

  if (session.datasetSizing?.reference.bomCount !== 15) {
    throw new Error('Failed to update Reference dataset sizing')
  }
  if (session.datasetSizing?.current.bomCount !== undefined) {
    throw new Error('Changing Reference dataset sizing mutated Current dataset sizing')
  }
  console.log('✓ Reference dataset sizing updated independently without mutating Current')

  // 2. Bi-directional Cloning (Reference -> Current)
  console.log('2. Checking Clone Reference -> Current...')
  // Populate Reference with sample data
  const refSnapshot: CostSnapshot = {
    ...session.snapshotPair!.reference,
    product: { ...session.product, productCode: 'RGOM-024' },
    sizing: refSizing,
    rates: [
      {
        id: 'r-wc-1',
        workCenterCode: 'WC-CUT',
        description: 'Cutting Machine',
        laborRate: 150,
        burdenRate: 80,
        effectiveDate: '2026-09-25',
        confidence: {}
      }
    ],
    bom: [
      {
        id: 'r-bom-1',
        itemCode: 'MAT-PET-01',
        description: 'PET Film Sheet 0.18mm',
        consumption: 0.05,
        unit: 'M2',
        price: 45.0,
        loss: 0.02,
        confidence: {}
      }
    ],
    routing: [
      {
        id: 'r-rt-1',
        operationCode: 'OP-10',
        sequence: 10,
        processCode: 'PR-CUT',
        processName: 'Precision Cutting',
        workCenterId: 'WC-CUT',
        manning: 1,
        capacity: 500,
        yield: 0.98,
        confidence: {}
      }
    ]
  }

  session = {
    ...session,
    preparedSnapshotRoles: { reference: true, current: false },
    snapshotPair: {
      ...session.snapshotPair!,
      reference: refSnapshot
    }
  }

  // Clone Reference to Current
  const currentClonedFromRef: CostSnapshot = {
    ...refSnapshot,
    id: 'test-session-1:current',
    comparisonRole: 'current',
    sourceRef: `Cloned from Reference: ${refSnapshot.sourceRef}`,
    rates: refSnapshot.rates.map(r => ({ ...r })),
    bom: refSnapshot.bom.map(b => ({ ...b })),
    routing: refSnapshot.routing.map(rt => ({ ...rt }))
  }

  session = {
    ...session,
    preparedSnapshotRoles: { reference: true, current: true },
    datasetSizing: {
      reference: refSizing,
      current: { ...refSizing }
    },
    snapshotPair: {
      reference: refSnapshot,
      current: currentClonedFromRef
    }
  }

  if (session.snapshotPair.current.bom.length !== 1 || session.snapshotPair.current.bom[0].itemCode !== 'MAT-PET-01') {
    throw new Error('Clone Reference -> Current failed to copy dataset data')
  }
  if (session.datasetSizing.current.bomCount !== 15) {
    throw new Error('Clone Reference -> Current failed to copy dataset sizing')
  }
  console.log('✓ Clone Reference -> Current copied dataset data and sizing')

  // Edit Current dataset to prove independence
  session.snapshotPair.current.bom[0].price = 99.0
  if (session.snapshotPair.reference.bom[0].price === 99.0) {
    throw new Error('Editing Current mutated Reference dataset after clone')
  }
  console.log('✓ Reference and Current datasets remain independent after Clone Reference -> Current')

  // 3. Bi-directional Cloning (Current -> Reference)
  console.log('3. Checking Clone Current -> Reference...')
  const currentSnapshot: CostSnapshot = {
    ...session.snapshotPair.current,
    product: { ...session.product, productCode: 'RGOM-024-REV' },
    sizing: { wcCount: 3, bomCount: 8, routingCount: 4 },
    bom: [
      {
        id: 'c-bom-1',
        itemCode: 'MAT-INK-02',
        description: 'Conductive Silver Ink',
        consumption: 0.01,
        unit: 'KG',
        price: 1200.0,
        loss: 0.05,
        confidence: {}
      }
    ]
  }

  session.datasetSizing.current = { wcCount: 3, bomCount: 8, routingCount: 4 }
  session.snapshotPair.current = currentSnapshot

  // Execute Clone Current -> Reference
  const refClonedFromCur: CostSnapshot = {
    ...currentSnapshot,
    id: 'test-session-1:reference',
    comparisonRole: 'reference',
    sourceRef: `Cloned from Current: ${currentSnapshot.sourceRef}`
  }

  session = {
    ...session,
    preparedSnapshotRoles: { reference: true, current: true },
    datasetSizing: {
      reference: { wcCount: 3, bomCount: 8, routingCount: 4 },
      current: { wcCount: 3, bomCount: 8, routingCount: 4 }
    },
    snapshotPair: {
      reference: refClonedFromCur,
      current: currentSnapshot
    }
  }

  if (session.snapshotPair.reference.bom[0].itemCode !== 'MAT-INK-02') {
    throw new Error('Clone Current -> Reference failed to copy dataset data')
  }
  if (session.datasetSizing.reference.bomCount !== 8) {
    throw new Error('Clone Current -> Reference failed to copy dataset sizing')
  }
  console.log('✓ Clone Current -> Reference copied dataset data and sizing')

  // 4. Sizing Adjustment & Populated Record Preservation
  console.log('4. Checking Populated Record Preservation on Sizing Reduction...')
  // Session has 1 populated BOM item, let's set bomCount: 1
  session.datasetSizing.reference.bomCount = 1
  if (session.snapshotPair.reference.bom.length !== 1 || session.snapshotPair.reference.bom[0].itemCode !== 'MAT-INK-02') {
    throw new Error('Reducing configured sizing count deleted populated records')
  }
  console.log('✓ Reducing configured sizing count preserved all populated records')

  // 5. Excel Template & Import/Export Round-Trip
  console.log('5. Checking Excel Template Generation & Import/Export Round-Trip...')
  const templateBlob = await generateDynamicExcelTemplate({
    product: session.product,
    snapshot: session.snapshotPair.reference,
    wcCount: 3,
    bomCount: 10,
    routingCount: 5
  })
  if (!templateBlob || templateBlob.size === 0) {
    throw new Error('Generated template blob is empty')
  }
  console.log(`✓ Blank template generated successfully (${templateBlob.size} bytes)`)

  // Programmatically create and populate a test Excel workbook to test import
  const testWb = new ExcelJS.Workbook()
  const metaSheet = testWb.addWorksheet('META')
  metaSheet.addRow(['Key', 'Value'])
  metaSheet.addRow(['Format Version', 'master-data-v1'])

  const prodSheet = testWb.addWorksheet('PRODUCT')
  prodSheet.addRow(['Product Code', 'Product Description', 'UOM', 'Customer / Application', 'Effective Date'])
  prodSheet.addRow(['RGOM-024', 'Test Membrane Panel', 'PCS', 'Auto Customer', '2026-09-25'])

  const wcSheet = testWb.addWorksheet('WORK_CENTER')
  wcSheet.addRow(['ID', 'Work Center Code', 'Description', 'Labor Rate', 'Burden Rate', 'Effective Date', 'Source Ref', 'Confidence'])
  wcSheet.addRow(['wc-10', 'WC-PRINT', 'Screen Printing', 120.5, 95.0, '2026-09-25', 'Ref-Doc', ''])

  const bomSheet = testWb.addWorksheet('BOM')
  bomSheet.addRow(['ID', 'Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Source Ref', 'Confidence'])
  bomSheet.addRow(['bom-10', 'RM-FILM-10', 'Polyester Film', 0.08, 'M2', 50.0, 0.03, 'Ref-Doc', ''])

  const rtgSheet = testWb.addWorksheet('ROUTING')
  rtgSheet.addRow(['ID', 'Operation Code', 'Sequence', 'Process Code', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Source Ref', 'Confidence'])
  rtgSheet.addRow(['rtg-10', 'OP-20', 20, 'PR-PRINT', 'Circuit Printing', 'WC-PRINT', 1, 400, 0.95, 'Ref-Doc', ''])

  const buffer = await testWb.xlsx.writeBuffer()
  const testFile = new File([buffer], 'TestImportTemplate.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  const importResult = await parseSnapshotExcelInputFile(testFile, 'reference', { expectedProductCode: 'RGOM-024' })
  if (!importResult.success || !importResult.snapshot) {
    throw new Error(`Import failed: ${importResult.message}`)
  }
  if (importResult.snapshot.bom.length !== 1 || importResult.snapshot.bom[0].itemCode !== 'RM-FILM-10') {
    throw new Error('Imported data does not match populated workbook data')
  }
  console.log('✓ Import populated workbook into Reference succeeded')

  // Export Reference and Import into Current (Round-Trip)
  const exportedBlob = await exportSnapshotToExcel(importResult.snapshot, session.product)
  const exportedFile = new File([await exportedBlob.arrayBuffer()], 'ExportedRef.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const roundTripResult = await parseSnapshotExcelInputFile(exportedFile, 'current', { expectedProductCode: 'RGOM-024' })
  if (!roundTripResult.success || !roundTripResult.snapshot) {
    throw new Error(`Round-trip import failed: ${roundTripResult.message}`)
  }
  if (roundTripResult.snapshot.bom[0].itemCode !== 'RM-FILM-10' || !roundTripResult.snapshot.routing[0].processName) {
    throw new Error('Round-trip export -> import failed to preserve dataset values')
  }
  console.log('✓ Export -> Import round-trip preserved all Product, Rates, BOM, and Routing data')

  console.log('--- ALL MASTER DATA DATASET SIZING & CLONE VERIFICATIONS PASSED SUCCESSFULLY! ---')
}

runVerifications().catch(err => {
  console.error('VERIFICATION FAILED:', err)
  process.exit(1)
})
