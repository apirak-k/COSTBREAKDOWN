import assert from 'node:assert/strict'
import { calculateSnapshotBOMDetail } from '../src/core/calculations/snapshot-bom-detail.ts'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business.ts'
import { calculateSnapshotCost } from '../src/core/calculations/snapshot-cost.ts'
import { compareSnapshots } from '../src/core/calculations/snapshot-comparison.ts'
import { calculateBOMParameterCostEffects } from '../src/core/calculations/parameter-cost-effect.ts'
import { calculateEconomicSimulation } from '../src/features/simulation/simulation-economics.ts'
import { exactDecimalInputValue, exactDecimalToString } from '../src/core/utils/exact-decimal.ts'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export.ts'
import { parseSnapshotExcelInputFile } from '../src/services/excel/snapshot-parser.ts'
import type { CostSnapshot, SnapshotBOMItem } from '../src/core/types'

const exactBOMItem: SnapshotBOMItem = {
  id: 'exact-bom',
  itemCode: 'MAT-1',
  description: 'Exact material',
  consumption: 1,
  price: Number('12.34567890123456789'),
  loss: Number('0.0029'),
  unit: 'PC',
  exactDecimalInputs: { consumption: '1', price: '12.34567890123456789', loss: '0.29' },
  confidence: { consumption: { status: 'verified' }, price: { status: 'verified' }, loss: { status: 'verified' } }
}

const exactDetail = calculateSnapshotBOMDetail({ current: exactBOMItem })
assert.equal(
  exactDetail.exactValues?.currentCost,
  '12.381481370048148136881',
  'CBD BOM calculation must use the full Price and exact 0.29% Loss value'
)

const snapshot: CostSnapshot = {
  id: 'exact-snapshot',
  product: {
    productName: 'Exact product',
    sellingPrice: 123.45678901234568,
    sgaPercent: 8.25,
    exactDecimalInputs: { sellingPrice: '123.4567890123456789', sgaPercent: '8.25' },
    productCode: '', productDescription: 'Exact product', uom: 'PC', customer: '', effectiveDate: ''
  },
  effectiveDate: '', sourceRef: 'numeric-value-integrity', status: 'draft',
  rates: [], bom: [exactBOMItem], routing: []
}

const cost = calculateSnapshotCost(snapshot)
assert.equal(cost.exactValues?.material, '12.381481370048148136881', 'Standard Cost must preserve the intended BOM value')

const ordinaryLossFraction = exactDecimalInputValue(Number('0.0029'), undefined, true)
const editedLossPercentage = exactDecimalInputValue(Number('0.0029'), '0.29', true)
assert.equal(ordinaryLossFraction && exactDecimalToString(ordinaryLossFraction), '0.0029',
  'A stored Loss fraction without editor text must remain a fraction, not be divided by 100 again')
assert.equal(editedLossPercentage && exactDecimalToString(editedLossPercentage), '0.0029',
  'A percentage editor sidecar must convert 0.29% to the same stored fraction exactly')

const tinyItem: SnapshotBOMItem = {
  ...exactBOMItem,
  id: 'tiny-bom',
  consumption: 1,
  price: 1e-100,
  loss: 0,
  exactDecimalInputs: { consumption: '1', price: '1e-100', loss: '0' }
}
const tinyCost = calculateSnapshotBOMDetail({ current: tinyItem })
assert.equal(tinyCost.currentCost, 1e-100, 'A legitimate tiny nonzero input must stay nonzero through cost calculation')
assert.equal(Number(tinyCost.exactValues?.currentCost), 1e-100)

const numberOnlyItem: SnapshotBOMItem = {
  ...exactBOMItem,
  id: 'number-only-bom',
  consumption: 1,
  price: Number('9.000000000000004'),
  loss: Number('0.29000000000000004'),
  exactDecimalInputs: undefined
}
const numberOnlyCost = calculateSnapshotBOMDetail({ current: numberOnlyItem })
assert.equal(numberOnlyCost.exactValues?.currentCost, '11.61',
  'Without an exact sidecar, the finalized narrow residue rule supplies the business decimal before calculation')
assert.equal(numberOnlyItem.price, Number('9.000000000000004'),
  'business-value cleanup does not mutate the stored Number compatibility projection')
assert.equal(numberOnlyItem.loss, Number('0.29000000000000004'),
  'percentage cleanup does not mutate the stored fraction compatibility projection')
assert.equal(numberOnlyItem.exactDecimalInputs, undefined,
  'no-sidecar cleanup does not invent authoritative exact-input state')
const intentionalExactItem = {
  ...numberOnlyItem,
  exactDecimalInputs: { consumption: '1', price: '9.000000000000004', loss: '29' }
}
const intentionalExactCost = calculateSnapshotBOMDetail({ current: intentionalExactItem })
assert.equal(intentionalExactCost.exactValues?.currentCost, '11.61000000000000516',
  'Authoritative imported/editor text preserves the supplied exact digits and percentage value')

const fullSnapshot: CostSnapshot = {
  ...snapshot,
  rates: [{
    id: 'wc-1', workCenterCode: 'WC-1', description: 'Work Center', laborRate: 0, burdenRate: 0,
    exactDecimalInputs: { laborRate: '0', burdenRate: '0' }, effectiveDate: '', confidence: {}
  }],
  routing: [{
    id: 'route-1', processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1,
    exactDecimalInputs: { manning: '1', capacity: '1', yield: '100' }, confidence: {}
  }],
  bom: [exactBOMItem, numberOnlyItem, intentionalExactItem]
}
const referenceSnapshot: CostSnapshot = {
  ...fullSnapshot,
  id: 'reference',
  bom: [{ ...exactBOMItem, price: 1, loss: 0, exactDecimalInputs: { consumption: '1', price: '1', loss: '0' } }]
}
const currentSnapshot: CostSnapshot = {
  ...fullSnapshot,
  id: 'current',
  bom: [{
    ...exactBOMItem,
    price: 1,
    loss: 0,
    exactDecimalInputs: { consumption: '1', price: '1.00000000000000001', loss: '0' }
  }]
}
const comparison = compareSnapshots(referenceSnapshot, currentSnapshot)
assert.equal(comparison.totalGap, 1e-17, 'CBD comparison must retain a meaningful decimal difference below one Number ULP')
assert.deepEqual(comparison.bomFindings[0].fieldDiffs.price, {
  reference: '1', current: '1.00000000000000001'
}, 'CBD comparison must identify exact numeric changes hidden by Number equality')
assert.equal(comparison.bomFindings[0].costEffect?.gap.material, 1e-17)
const exactEffects = calculateBOMParameterCostEffects(
  { usage: 1, price: 1, loss: 0, exactInputs: { usage: '1', price: '1', loss: '0' } },
  { usage: 1, price: 1, loss: 0, exactInputs: { usage: '1', price: '1.00000000000000001', loss: '0' } }
)
assert.equal(exactEffects.status, 'available', 'CBD parameter attribution must recognize exact input changes hidden by Number equality')
if (exactEffects.status === 'available') {
  assert.equal(exactEffects.effects.price, 1e-17, 'CBD parameter attribution must use the intended exact Price value')
}

const scenarioBusiness = calculateScenarioBusinessMetrics(
  { sellingPrice: 123.45678901234568, sgaPercent: 8.25 },
  Number('12.381481370048148136881'),
  {
    sellingPrice: '123.4567890123456789',
    sgaPercent: '8.25',
    standardCost: '12.381481370048148136881'
  }
)
assert.equal(scenarioBusiness.exactValues?.sgaAmountPerPiece, '10.18518509351851850925')
assert.equal(scenarioBusiness.exactValues?.operatingProfitPerPiece, '100.890122548779012253869')

const economic = calculateEconomicSimulation(fullSnapshot, calculateSnapshotCost(fullSnapshot), null, {
  fixedActionCost: '0',
  variableActionCostPerPiece: '0',
  batchSize: '1',
  sellingPriceOverride: '123.4567890123456789',
  sgaPercentOverride: '8.25'
})
assert.equal(economic.business.exactValues?.sgaAmountPerPiece, '10.18518509351851850925',
  'Simulation Business calculations must use the exact override draft')

async function verifyExcelRoundTrip() {
  const exported = await exportSnapshotToExcel(fullSnapshot)
  const imported = await parseSnapshotExcelInputFile(new Blob([await exported.arrayBuffer()]) as File, 'current')
  assert.equal(imported.success, true, `Full precision Excel round-trip should import: ${imported.message}`)
  assert.equal(imported.snapshot?.product.exactDecimalInputs?.sellingPrice, '123.4567890123456789',
    'Excel export and import must retain exact product input text')
  assert.equal(imported.snapshot?.bom[0].exactDecimalInputs?.price, '12.34567890123456789',
    'Excel export and import must retain exact BOM input text')
  assert.equal(fullSnapshot.bom[1].price, Number('9.000000000000004'),
    'Excel export does not mutate the source Number compatibility projection')
  assert.equal(imported.snapshot?.bom[1].price, 9,
    'Excel export cleans only no-sidecar machine residue before writing the numeric cell')
  assert.equal(imported.snapshot?.bom[1].exactDecimalInputs?.price, undefined,
    'Excel round-trip does not turn a cleaned no-sidecar Number into authoritative exact text')
  assert.equal(imported.snapshot?.bom[2].exactDecimalInputs?.price, '9.000000000000004',
    'Excel export and import retain the complete digits when exact source text authorizes them')
  const importedLossExact = exactDecimalInputValue(
    imported.snapshot?.bom[0].loss,
    imported.snapshot?.bom[0].exactDecimalInputs?.loss,
    true
  )
  assert.equal(importedLossExact && exactDecimalToString(importedLossExact), '0.0029',
    'Excel percentage export and import must retain the intended 0.29% fraction')
}

verifyExcelRoundTrip().then(() => console.log('Numeric value integrity verification passed')).catch(error => {
  console.error(error)
  process.exitCode = 1
})
