import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const jiti = require('jiti')(fileURLToPath(import.meta.url))

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
  const guards = await vite.ssrLoadModule('/src/core/utils/guards.ts')
  const masterData = await vite.ssrLoadModule('/src/core/utils/master-data-effective.ts')
  const seedData = await vite.ssrLoadModule('/src/state/seed-data.ts')
  const simulationState = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const simulationEngine = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  // ExcelJS's process/browser shim is CommonJS and cannot run as a Vite SSR
  // inlined ESM module. Load the same production exporter through Node's
  // CommonJS-compatible TypeScript loader; the workbook export assertions
  // below still execute the real export and parse paths.
  const snapshotExport = jiti('../src/services/excel/snapshot-export.ts')
  const snapshotParser = await vite.ssrLoadModule('/src/services/excel/snapshot-parser.ts')
  const { compareSnapshots } = core
  const { getCanonicalComparisonStatus } = statusModule
  const { exactDecimalInputValue, exactDecimalToString } = decimal
  const { areNumericValuesEquivalent } = guards
  const { normalizeMasterDataSnapshot } = masterData
  const { seedSnapshotPair, seedBOM } = seedData
  const {
    createEmptySimulationState,
    getEffectiveSimulationDataset,
    reconcileSimulationState,
    simulationParameterStatus
  } = simulationState
  const { updateSimulationParameter } = simulationEngine
  const { exportSnapshotToExcel } = snapshotExport
  const { parseSnapshotWorkbookData } = snapshotParser

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
    ...(role ? { comparisonRole: role } : {}),
    product,
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    bom: bomRows,
    routing: routingRows,
    rates,
    warnings: []
  })

  assert.equal(areNumericValuesEquivalent(1, 1 + Number.EPSILON), false,
    'distinct stored Numbers are never collapsed by tolerance')

  assert.equal(
    exactDecimalToString(exactDecimalInputValue(138.48, '138.480000000000001')),
    '138.480000000000001'
  )

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
  assert.equal(Object.hasOwn(sameBOM.fieldDiffs, 'description'), false, 'matched BOM identity is not raw-compared a second time')
  assert.equal(sameBOM.costEffect?.gap.material, 0, 'same BOM business values produce exact zero material Gap')
  assert.equal(Object.is(sameBOM.costEffect?.gap.material, -0), false, 'same BOM Gap is not negative zero')
  assert.equal(getCanonicalComparisonStatus(sameRouting), 'UNCHANGED', 'normalized same Routing identity and WC stay UNCHANGED')
  assert.equal(sameRouting.changeFlags.movedWorkCenter, false, 'normalized same Work Center does not create a false move flag')
  assert.equal(Object.hasOwn(sameRouting.fieldDiffs, 'processName'), false, 'matched Routing identity is not raw-compared a second time')
  assert.equal(Object.hasOwn(sameRouting.fieldDiffs, 'workCenterId'), false, 'normalized same Work Center creates no field diff')
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
  assert.equal(movedComparison.routingFindings[0].changeFlags.movedWorkCenter, true, 'real Work Center move keeps its move flag')
  assert.equal(getCanonicalComparisonStatus(movedComparison.routingFindings[0]), 'CHANGED', 'real Work Center move remains CHANGED')

  const previousMaster = snapshot(
    'master-before',
    'current',
    [bom('master-bom', { price: 1, exactDecimalInputs: { consumption: '0.0555', price: '1', loss: '30' } })],
    [route('master-route')],
    [rate('master-rate')]
  )
  const numericOnlyMutation = {
    ...previousMaster,
    bom: [{ ...previousMaster.bom[0], price: 2 }]
  }
  const normalizedNumericOnly = normalizeMasterDataSnapshot(numericOnlyMutation, previousMaster)
  assert.equal(normalizedNumericOnly.bom[0].price, 2)
  assert.equal(normalizedNumericOnly.bom[0].exactDecimalInputs?.price, undefined,
    'numeric-only Master Data mutation clears an inherited stale exact sidecar')

  const stalePercentMutation = {
    ...previousMaster,
    bom: [{ ...previousMaster.bom[0], loss: 0.4 }]
  }
  const normalizedPercent = normalizeMasterDataSnapshot(stalePercentMutation, previousMaster)
  assert.equal(normalizedPercent.bom[0].loss, 0.4)
  assert.equal(normalizedPercent.bom[0].exactDecimalInputs?.loss, undefined,
    'percentage numeric-only mutation clears the old percentage-point sidecar')

  const preciseSameNumber = {
    ...previousMaster,
    bom: [{
      ...previousMaster.bom[0],
      price: 1,
      exactDecimalInputs: { ...previousMaster.bom[0].exactDecimalInputs, price: '1.00000000000000001' }
    }]
  }
  const normalizedPrecise = normalizeMasterDataSnapshot(preciseSameNumber, previousMaster)
  assert.equal(normalizedPrecise.bom[0].exactDecimalInputs?.price, '1.00000000000000001',
    'intentional exact-only precision that projects to the same Number is preserved')

  const seedComparison = compareSnapshots(seedSnapshotPair.reference, seedSnapshotPair.current)
  for (const item of seedBOM.filter(item => item.basePrice === item.activePrice && item.baseLoss === item.activeLoss)) {
    const finding = seedComparison.bomFindings.find(candidate => candidate.referenceId === item.id && candidate.currentId === item.id)
    assert.ok(finding, `RGOM seed finding exists for ${item.description}`)
    assert.equal(getCanonicalComparisonStatus(finding), 'UNCHANGED', `${item.description} stays UNCHANGED when base/active values match`)
    assert.equal(finding.costEffect?.gap.material, 0, `${item.description} has exact zero material Gap`)
  }
  const annealing = seedComparison.routingFindings.find(finding => finding.referenceId === 'rt-2' && finding.currentId === 'rt-2')
  assert.ok(annealing, 'real RGOM Annealing finding exists')
  assert.equal(getCanonicalComparisonStatus(annealing), 'UNCHANGED', 'real RGOM Annealing remains UNCHANGED when routing/rates match')
  assert.equal(annealing.costEffect?.gap.labor, 0, 'real RGOM Annealing Labor Gap is exact zero')
  assert.equal(annealing.costEffect?.gap.burden, 0, 'real RGOM Annealing Burden Gap is exact zero')
  assert.equal(annealing.costEffect?.gap.total, 0, 'real RGOM Annealing Total Gap is exact zero')

  const simulationBase = snapshot(
    'simulation-custom',
    undefined,
    [bom('sim-bom', { price: 1, exactDecimalInputs: { consumption: '0.0555', price: '1', loss: '30' } })],
    [route('sim-route')],
    [rate('sim-rate')]
  )
  const simulationSources = {
    reference: { ...simulationBase, id: 'simulation-reference', comparisonRole: 'reference' },
    current: { ...simulationBase, id: 'simulation-current', comparisonRole: 'current' },
    custom: { ...simulationBase, id: 'simulation-custom' }
  }
  let simulation = createEmptySimulationState(simulationSources)
  simulation = updateSimulationParameter(simulation, simulationSources, 'sim-bom', 'bom.price', 1, 'custom', '1')
  assert.deepEqual(simulation.datasets.custom.parameterOverrides, {}, 'same Simulation business value creates no numeric override')
  assert.deepEqual(simulation.datasets.custom.exactDecimalInputs, {}, 'same Simulation business value creates no exact override')

  simulation = updateSimulationParameter(
    simulation,
    simulationSources,
    'sim-bom',
    'bom.price',
    1,
    'custom',
    '1.00000000000000001'
  )
  assert.equal(simulation.datasets.custom.parameterOverrides['bom.price']?.['sim-bom'], undefined,
    'exact-only difference does not invent a different Number projection')
  assert.equal(simulation.datasets.custom.exactDecimalInputs?.['bom.price']?.['sim-bom'], '1.00000000000000001',
    'real exact-only difference is retained')
  const preciseSimulation = getEffectiveSimulationDataset(simulationSources, simulation, 'custom')
  const preciseSimulationComparison = compareSnapshots(simulationSources.custom, preciseSimulation.snapshot)
  const preciseSimulationFinding = preciseSimulationComparison.bomFindings.find(candidate => candidate.currentId === 'sim-bom')
  assert.ok(preciseSimulationFinding)
  assert.equal(getCanonicalComparisonStatus(preciseSimulationFinding), 'CHANGED', 'exact-only Simulation difference is a real business change')
  assert.notEqual(preciseSimulationFinding.costEffect?.gap.material, 0, 'exact-only Simulation difference retains a real non-zero Gap')
  assert.equal(
    simulationParameterStatus('bom', 'sim-bom', preciseSimulation.snapshot, preciseSimulation.baselineSnapshot),
    'CHANGED',
    'Simulation row status uses the same exact business-value semantics as comparison'
  )

  simulation = updateSimulationParameter(simulation, simulationSources, 'sim-bom', 'bom.price', 1, 'custom', '1')
  assert.deepEqual(simulation.datasets.custom.parameterOverrides, {}, 'returning Simulation to baseline clears numeric override')
  assert.deepEqual(simulation.datasets.custom.exactDecimalInputs, {}, 'returning Simulation to baseline clears exact override atomically')

  const corruptedSimulation = createEmptySimulationState(simulationSources)
  corruptedSimulation.datasets.custom.exactDecimalInputs = { 'bom.price': { 'sim-bom': '9.999999' } }
  const repairedCorrupted = reconcileSimulationState(corruptedSimulation, simulationSources)
  assert.deepEqual(repairedCorrupted.datasets.custom.exactDecimalInputs, {},
    'persisted exact sidecar that does not project to the baseline Number is removed during reconciliation')

  const redundantSimulation = createEmptySimulationState(simulationSources)
  redundantSimulation.datasets.custom.exactDecimalInputs = { 'bom.price': { 'sim-bom': '1' } }
  const repairedRedundant = reconcileSimulationState(redundantSimulation, simulationSources)
  assert.deepEqual(repairedRedundant.datasets.custom.exactDecimalInputs, {},
    'persisted exact sidecar equal to the baseline business value is removed during reconciliation')

  const persistedPreciseSimulation = createEmptySimulationState(simulationSources)
  persistedPreciseSimulation.datasets.custom.exactDecimalInputs = {
    'bom.price': { 'sim-bom': '1.00000000000000001' }
  }
  const reconciledPrecise = reconcileSimulationState(persistedPreciseSimulation, simulationSources)
  assert.equal(
    reconciledPrecise.datasets.custom.exactDecimalInputs?.['bom.price']?.['sim-bom'],
    '1.00000000000000001',
    'persisted legitimate exact-only precision survives reconciliation'
  )

  const staleExportSnapshot = {
    ...previousMaster,
    bom: [{
      ...previousMaster.bom[0],
      price: 2,
      exactDecimalInputs: { ...previousMaster.bom[0].exactDecimalInputs, price: '9.999999' }
    }]
  }
  const exported = await exportSnapshotToExcel(staleExportSnapshot)
  const imported = parseSnapshotWorkbookData(await exported.arrayBuffer(), 'current')
  assert.equal(imported.success, true, `stale-sidecar export round trip succeeds: ${imported.message}`)
  assert.equal(imported.snapshot?.bom[0].price, 2, 'export writes the current numeric business value, never a stale exact sidecar')
  assert.notEqual(imported.snapshot?.bom[0].exactDecimalInputs?.price, '9.999999', 'stale exact text does not survive export/import as business data')

  console.log('Business value integrity verification passed.')
} finally {
  await vite.close()
}
