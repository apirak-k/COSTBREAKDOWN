import * as fs from 'fs';
import { exportSnapshotToExcel } from './src/services/excel/snapshot-export';
import { parseSnapshotWorkbookData } from './src/services/excel/snapshot-parser';
import { migratePairedModelToSnapshots } from './src/core';
import { seedProductMaster, seedWorkCenterRates, seedBOM, seedRouting } from './src/state/seed-data';

async function run() {
  console.log('Generating Excel file for RGOM-024 Reference Dataset...');

  const pair = migratePairedModelToSnapshots({
    id: 'RGOM-024-REF-DECLARE',
    status: 'active',
    product: seedProductMaster,
    rates: seedWorkCenterRates,
    bom: seedBOM,
    routing: seedRouting,
    sourceRef: 'Cost declare 250331'
  });

  const refSnapshot = pair.reference;
  refSnapshot.sourceRef = 'Cost declare 250331';

  const blob = await exportSnapshotToExcel(refSnapshot, seedProductMaster);
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputPath = 'public/Mock_Reference_RGOM024_CostDeclare.xlsx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved file: ${outputPath} (${buffer.byteLength} bytes)`);

  // Verify parse
  console.log('Verifying parsing with parseSnapshotWorkbookData...');
  const parseResult = parseSnapshotWorkbookData(arrayBuffer, 'reference', seedProductMaster.productCode);

  if (parseResult.success && parseResult.snapshot) {
    console.log('Parse successful!');
    console.log(`- Product: ${parseResult.snapshot.product?.productCode} (${parseResult.snapshot.product?.productDescription})`);
    console.log(`- Work Centers: ${parseResult.snapshot.rates.length} centers`);
    console.log(`- BOM Items: ${parseResult.snapshot.bom.length} items`);
    console.log(`- Routing Steps: ${parseResult.snapshot.routing.length} operations`);
    if (parseResult.warnings.length > 0) {
      console.log('Warnings:', parseResult.warnings);
    }
  } else {
    console.error('Parse failed:', parseResult.message, parseResult.warnings);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
