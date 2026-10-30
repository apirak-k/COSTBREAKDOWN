import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const core = await vite.ssrLoadModule('/src/core/index.ts')
  const statusModule = await vite.ssrLoadModule('/src/core/calculations/comparison-status.ts')
  const decimal = await vite.ssrLoadModule('/src/core/utils/exact-decimal.ts')
  const masterData = await vite.ssrLoadModule('/src/core/utils/master-data-effective.ts')
  const { compareSnapshots } = core
  const { getCanonicalComparisonStatus } = statusModule
  const { exactDecimalInputValue, exactDecimalSidecarValue, exactDecimalToString } = decimal
  const { normalizeMasterDataSnapshot } = masterData

  for (const text of ['10.1', '29.1', '33.3', '1.1', '16.7']) {
    const displayNumber = Number(text)
    const storedNumber = displayNumber / 100
    const exact = exactDecimalSidecarValue(storedNumber, text, true)
    assert.ok(exact, `${text}% exact sidecar must survive the JS percentage boundary`)
    assert.equal(
      exactDecimalToString(exactDecimalInputValue(storedNumber, text, true)),
      exactDecimalToString(exact),
      `${text}% calculation must use the entered exact percentage`
    )
  }

  const lossNumber = 10.1 / 100
  assert.notEqual(lossNumber, Number('0.101'), 'fixture must exercise adjacent IEEE-754 projections')
  assert.equal(
    exactDecimalToString(exactDecimalInputValue(lossNumber, '10.1', true)),
    '0.101',
    '10.1% resolves to exact stored business value 0.101'
  )

  const stale = exactDecimalSidecarValue(0.7, '99', true)
  assert.equal(stale, null, 'a genuinely stale percentage sidecar is still rejected')

  const numericResidue = 0.29000000000000004
  const boundaryExact = exactDecimalSidecarValue(numericResidue, '29', true)
  assert.ok(boundaryExact, '29 percentage points remain valid against the narrow machine-residue fraction projection')
  assert.equal(exactDecimalToString(exactDecimalInputValue(numericResidue, '29', true)), '0.29',
    'the authoritative 29% text resolves to the exact stored fraction without inheriting Number residue')

  const snapshot = {
    id: 'percentage-boundary',
    comparisonRole: 'current',
    product: { productName: 'P', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: 'fixture',
    status: 'draft',
    rates: [],
    bom: [{
      id: 'bom-1', description: 'Material', consumption: 1, unit: 'PC', price: 1,
      loss: lossNumber, exactDecimalInputs: { loss: '10.1' }, confidence: {}
    }],
    routing: []
  }
  const normalized = normalizeMasterDataSnapshot(snapshot)
  assert.equal(normalized.bom[0].exactDecimalInputs?.loss, '10.1',
    'Master Data normalization must not discard a valid decimal percentage sidecar')

  const normalizedBoundary = normalizeMasterDataSnapshot({
    ...snapshot,
    bom: [{ ...snapshot.bom[0], loss: numericResidue, exactDecimalInputs: { loss: '29' } }]
  })
  assert.equal(normalizedBoundary.bom[0].exactDecimalInputs?.loss, '29',
    'Master Data normalization preserves the exact 29% sidecar at the stored-fraction boundary')

  const product = { productName: 'P', uom: 'PC', customer: '', effectiveDate: '' }
  const rate = id => ({
    id, workCenterCode: 'WC-A', description: 'WC-A', laborRate: 105.29, burdenRate: 138.48,
    exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.48' }, effectiveDate: '', confidence: {}
  })
  const makeSnapshot = (id, role, loss, yieldValue) => ({
    id,
    comparisonRole: role,
    product,
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [rate(`rate-${role}`)],
    bom: [{
      id: `bom-${role}`, description: 'Same Material', consumption: 1, unit: 'PC', price: 1,
      loss, exactDecimalInputs: { consumption: '1', price: '1', loss: '10.1' }, confidence: {}
    }],
    routing: [{
      id: `routing-${role}`, processName: 'Same Process', workCenterId: 'WC-A', manning: 1, capacity: 100,
      yield: yieldValue, exactDecimalInputs: { manning: '1', capacity: '100', yield: '29.1' }, confidence: {}
    }]
  })

  // This reproduces the real cross-path divergence that existed before the fix:
  // XLSX percent parsing derives Number from exact decimal division, while direct
  // entry/paste historically used ordinary JS Number division by 100.
  const importedLoss = Number('0.101')
  const directLoss = 10.1 / 100
  const importedYield = Number('0.291')
  const directYield = 29.1 / 100
  assert.notEqual(directLoss, importedLoss)
  assert.notEqual(directYield, importedYield)
  assert.ok(exactDecimalSidecarValue(importedLoss, '10.1', true),
    'imported exact percentage sidecar is accepted against canonical exact projection')
  assert.ok(exactDecimalSidecarValue(directLoss, '10.1', true),
    'direct exact percentage sidecar is accepted against historical JS division projection')
  assert.ok(exactDecimalSidecarValue(importedYield, '29.1', true),
    'imported exact Yield sidecar is accepted against canonical exact projection')
  assert.ok(exactDecimalSidecarValue(directYield, '29.1', true),
    'direct exact Yield sidecar is accepted against historical JS division projection')

  const reference = makeSnapshot('imported-reference', 'reference', importedLoss, importedYield)
  const current = makeSnapshot('direct-current', 'current', directLoss, directYield)
  const comparison = compareSnapshots(reference, current)
  const bomFinding = comparison.bomFindings[0]
  const routingFinding = comparison.routingFindings[0]

  assert.equal(getCanonicalComparisonStatus(bomFinding), 'UNCHANGED',
    'same visible/imported/direct Loss remains the same authoritative business value')
  assert.equal(bomFinding.costEffect?.gap.material, 0,
    'same exact Loss across import/direct paths produces exact zero material Gap')
  assert.equal(getCanonicalComparisonStatus(routingFinding), 'UNCHANGED',
    'same visible/imported/direct Yield remains the same authoritative business value')
  assert.equal(routingFinding.changeFlags.changedInputs, false,
    'same exact Yield across import/direct paths does not create a false changed-input flag')
  assert.equal(routingFinding.costEffect?.gap.total, 0,
    'same exact Yield across import/direct paths produces exact zero routing Gap')

  console.log('Percentage exact boundary verification passed.')
} finally {
  await vite.close()
}
