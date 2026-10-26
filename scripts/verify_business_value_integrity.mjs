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
  const { compareSnapshots } = core
  const { getCanonicalComparisonStatus } = statusModule
  const { exactDecimalInputValue, exactDecimalToString } = decimal

  const product = {
    productName: 'Integrity Fixture',
    uom: 'PC',
    sellingPrice: 100,
    sgaPercent: 8,
    exactDecimalInputs: { sellingPrice: '100', sgaPercent: '8' }
  }

  const rate = (id, code = 'WC-A', burdenRate = 138.48, exactBurdenRate = '138.48') => ({
    id,
    workCenterCode: code,
    description: 'Annealing',
    laborRate: 105.29,
    burdenRate,
    exactDecimalInputs: { laborRate: '105.29', burdenRate: exactBurdenRate },
    effectiveDate: '',
    confidence: {}
  })

  const bom = (id, overrides = {}) => ({
    id,
    description: 'PTF-300 DILUENT',
    consumption: 0.0555,
    unit: 'GM',
    price: 1.213638,
    loss: 0.3,
    exactDecimalInputs: {
      consumption: '0.055500',
      price: '1.2136380',
      loss: '30'
    },
    confidence: {},
    ...overrides
  })

  const route = (id, overrides = {}) => ({
    id,
    processName: 'Annealing',
    workCenterId: 'WC-A',
    manning: 1,
    capacity: 2520,
    yield: 0.7,
    exactDecimalInputs: { manning: '1', capacity: '2520', yield: '70' },
    confidence: {},
    ...overrides
  })

  const snapshot = (id, role, bomRows, routingRows, rates) => ({
    id,
    comparisonRole: role,
    product,
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    bom: bomRows,
    routing: routingRows,
    rates,
    warnings: []
  })

  // Exact text may contain more precision than the Number projection; keep it
  // authoritative when both still describe the same stored business value.
  assert.equal(
    exactDecimalToString(exactDecimalInputValue(138.48, '138.480000000000001')),
    '138.480000000000001'
  )

  // A stale sidecar that no longer projects to the stored Number must not
  // override the later business value.
  assert.equal(
    exactDecimalToString(exactDecimalInputValue(1.213638, '9.999999')),
    '1.213638'
  )
  assert.equal(
    exactDecimalToString(exactDecimalInputValue(0.7, '99', true)),
    '0.7'
  )

  const reference = snapshot(
    'reference',
    'reference',
    [bom('bom-ref')],
    [route('route-ref')],
    [rate('rate-ref')]
  )

  const sameBusiness = snapshot(
    'current-same',
    'current',
    [bom('bom-cur', {
      // Same approved BOM identity after normalization. Hidden/internal
      // metadata and a stale exact sidecar must not create a business change.
      description: '  ptf-300 diluent  ',
      exactDecimalInputs: {
        consumption: '0.055500',
        price: '9.999999',
        loss: '30'
      },
      isGeneratedBusinessIdentity: true,
      autoRenamedFrom: 'PTF-300 DILUENT (generated)',
      additionalFields: { LegacyColumn: 'different internal value' }
    })],
    [route('route-cur', {
      processName: ' annealing ',
      workCenterId: ' wc-a '
    })],
    [rate('rate-cur', ' wc-a ')]
  )

  const sameComparison = compareSnapshots(reference, sameBusiness)
  const sameBOM = sameComparison.bomFindings[0]
  const sameRouting = sameComparison.routingFindings[0]

  assert.equal(getCanonicalComparisonStatus(sameBOM), 'UNCHANGED', 'same BOM business values stay UNCHANGED')
  assert.equal(sameBOM.costEffect?.gap.material, 0, 'same BOM business values produce exact zero material Gap')
  assert.equal(Object.is(sameBOM.costEffect?.gap.material, -0), false, 'same BOM Gap is not negative zero')
  assert.equal(getCanonicalComparisonStatus(sameRouting), 'UNCHANGED', 'normalized same Routing identity and WC stay UNCHANGED')
  assert.equal(sameRouting.changeFlags.movedWorkCenter, true, 'fixture proves raw WC spelling differs before canonical status normalization')
  assert.equal(sameRouting.costEffect?.gap.total, 0, 'same Routing business values produce exact zero total Gap')
  assert.equal(sameComparison.totalGap, 0, 'same full business values produce exact zero Standard Cost Gap')
  assert.equal(Object.is(sameComparison.totalGap, -0), false, 'same full comparison does not create negative zero')

  const trueTinyDifference = snapshot(
    'current-tiny-difference',
    'current',
    [bom('bom-cur')],
    [route('route-cur')],
    [rate('rate-cur', 'WC-A', 138.48, '138.480000000000001')]
  )
  const changedComparison = compareSnapshots(reference, trueTinyDifference)
  const changedRouting = changedComparison.routingFindings[0]
  assert.equal(getCanonicalComparisonStatus(changedRouting), 'CHANGED', 'real exact decimal difference remains CHANGED')
  assert.equal(changedRouting.changeFlags.changedRate, true)
  assert.notEqual(changedRouting.costEffect?.gap.burden, 0, 'real exact difference keeps a non-zero cost Gap')

  const trueMove = snapshot(
    'current-real-move',
    'current',
    [bom('bom-cur')],
    [route('route-cur', { workCenterId: 'WC-B' })],
    [rate('rate-cur-a', 'WC-A'), rate('rate-cur-b', 'WC-B')]
  )
  const movedComparison = compareSnapshots(reference, trueMove)
  assert.equal(getCanonicalComparisonStatus(movedComparison.routingFindings[0]), 'CHANGED', 'real Work Center move remains CHANGED')

  console.log('Business value integrity verification passed.')
} finally {
  await vite.close()
}
