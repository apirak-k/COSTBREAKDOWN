import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { compareSnapshots } = await vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts')
  const { getCanonicalComparisonStatus } = await vite.ssrLoadModule('/src/core/calculations/comparison-status.ts')

  const product = {
    productName: 'Integrity fixture',
    productCode: 'INTEGRITY-1',
    productDescription: 'Integrity fixture',
    uom: 'PC',
    customer: '',
    effectiveDate: '',
    sellingPrice: 100,
    sgaPercent: 8,
    exactDecimalInputs: { sellingPrice: '100', sgaPercent: '8' }
  }

  const referenceBOM = {
    id: 'bom-reference',
    isGeneratedBusinessIdentity: true,
    itemCode: 'MAT-1',
    description: 'Material A',
    consumption: 1,
    exactDecimalInputs: { consumption: '1', price: '10', loss: '10' },
    unit: 'KG',
    price: 10,
    loss: 0.1,
    confidence: {}
  }
  const currentBOM = {
    ...referenceBOM,
    id: 'bom-current',
    isGeneratedBusinessIdentity: undefined,
    autoRenamedFrom: 'Material A (generated)'
  }

  const referenceRoute = {
    id: 'route-reference',
    isGeneratedBusinessIdentity: true,
    processName: 'Annealing',
    workCenterId: 'WC-ANNEAL',
    manning: 1,
    exactDecimalInputs: { manning: '1', capacity: '2520', yield: '70' },
    capacity: 2520,
    yield: 0.7,
    confidence: {}
  }
  const currentRoute = {
    ...referenceRoute,
    id: 'route-current',
    isGeneratedBusinessIdentity: undefined,
    autoRenamedFrom: 'Annealing (generated)',
    // Deliberately different binary projection; the exact sidecar is the business value.
    yield: 0.7000000000000001
  }

  const referenceRate = {
    id: 'rate-reference',
    isGeneratedBusinessIdentity: true,
    workCenterCode: 'WC-ANNEAL',
    description: 'Annealing',
    laborRate: 105.29,
    exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.48' },
    burdenRate: 138.48,
    effectiveDate: '',
    confidence: {}
  }
  const currentRate = {
    ...referenceRate,
    id: 'rate-current',
    isGeneratedBusinessIdentity: undefined,
    autoRenamedFrom: 'WC-ANNEAL (generated)',
    // Same exact business value, slightly different Number projection.
    burdenRate: 138.48000000000002
  }

  const snapshot = (id, role, bom, routing, rates) => ({
    id,
    product,
    effectiveDate: '',
    sourceRef: id,
    comparisonRole: role,
    status: 'draft',
    bom,
    routing,
    rates,
    warnings: []
  })

  const reference = snapshot('reference', 'reference', [referenceBOM], [referenceRoute], [referenceRate])
  const current = snapshot('current', 'current', [currentBOM], [currentRoute], [currentRate])
  const sameBusinessComparison = compareSnapshots(reference, current)

  const bomFinding = sameBusinessComparison.bomFindings[0]
  const routingFinding = sameBusinessComparison.routingFindings[0]
  const rateFinding = sameBusinessComparison.workCenterFindings[0]

  assert.equal(getCanonicalComparisonStatus(bomFinding), 'UNCHANGED', 'internal BOM metadata must not create CHANGED')
  assert.equal(getCanonicalComparisonStatus(routingFinding), 'UNCHANGED', 'internal Routing metadata and binary projection residue must not create CHANGED')
  assert.equal(getCanonicalComparisonStatus(rateFinding), 'UNCHANGED', 'internal Work Center metadata and binary projection residue must not create CHANGED')
  assert.deepEqual(bomFinding.fieldDiffs, {}, 'BOM metadata is outside business comparison fields')
  assert.deepEqual(routingFinding.fieldDiffs, {}, 'Routing metadata is outside business comparison fields')
  assert.deepEqual(rateFinding.fieldDiffs, {}, 'Work Center metadata is outside business comparison fields')
  assert.equal(routingFinding.changeFlags.changedInputs, false)
  assert.equal(routingFinding.changeFlags.changedRate, false)
  assert.equal(rateFinding.changeFlags.changedRate, false)
  assert.equal(routingFinding.costEffect?.gap.labor, 0, 'same exact labor inputs must produce exact zero gap')
  assert.equal(routingFinding.costEffect?.gap.burden, 0, 'same exact burden inputs must produce exact zero gap')
  assert.equal(routingFinding.costEffect?.gap.total, 0, 'same exact routing inputs must produce exact zero total gap')
  assert.equal(sameBusinessComparison.elementGaps.labor, 0)
  assert.equal(sameBusinessComparison.elementGaps.burden, 0)
  assert.equal(sameBusinessComparison.totalGap, 0)
  assert.equal(Object.is(sameBusinessComparison.totalGap, -0), false, 'exact zero must not become negative zero')

  const genuinelyDifferentRate = {
    ...currentRate,
    exactDecimalInputs: { ...currentRate.exactDecimalInputs, burdenRate: '138.481' },
    // Keep the Number projection equal on purpose: exact business text must win.
    burdenRate: 138.48
  }
  const genuinelyDifferent = compareSnapshots(
    reference,
    snapshot('current-exact-change', 'current', [currentBOM], [currentRoute], [genuinelyDifferentRate])
  )
  const changedRouting = genuinelyDifferent.routingFindings[0]
  const changedRate = genuinelyDifferent.workCenterFindings[0]

  assert.equal(getCanonicalComparisonStatus(changedRate), 'CHANGED', 'real exact Work Center rate change remains CHANGED')
  assert.equal(changedRate.changeFlags.changedRate, true)
  assert.equal(getCanonicalComparisonStatus(changedRouting), 'CHANGED', 'resolved exact rate change propagates to Routing status')
  assert.equal(changedRouting.changeFlags.changedRate, true)
  assert.ok((changedRouting.costEffect?.gap.burden ?? 0) > 0, 'real exact Burden Rate change keeps a positive non-zero gap')
  assert.ok((genuinelyDifferent.totalGap ?? 0) > 0, 'real exact business change must not be rounded or tolerance-masked to zero')

  console.log('Comparison metadata and numeric integrity verification passed.')
} finally {
  await vite.close()
}
