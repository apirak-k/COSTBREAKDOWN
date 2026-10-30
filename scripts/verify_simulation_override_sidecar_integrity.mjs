import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const simulationState = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const simulationEngine = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const { createEmptySimulationState, getEffectiveSimulationDataset, reconcileSimulationState } = simulationState
  const { updateSimulationParameter } = simulationEngine

  const row = {
    id: 'bom-1',
    description: 'Material',
    consumption: 1,
    unit: 'PC',
    price: 1,
    loss: 0,
    exactDecimalInputs: { consumption: '1', price: '1', loss: '0' },
    confidence: {}
  }
  const base = {
    id: 'base',
    product: { productName: 'P', uom: 'PC', sellingPrice: 1, sgaPercent: 0 },
    effectiveDate: '', sourceRef: 'fixture', status: 'draft',
    rates: [], bom: [row], routing: []
  }
  const sources = {
    reference: { ...structuredClone(base), id: 'reference', comparisonRole: 'reference' },
    current: { ...structuredClone(base), id: 'current', comparisonRole: 'current' },
    custom: { ...structuredClone(base), id: 'custom' }
  }

  const numericOnly = createEmptySimulationState(sources)
  numericOnly.datasets.custom.parameterOverrides = { 'bom.price': { 'bom-1': 2 } }
  numericOnly.datasets.custom.exactDecimalInputs = {}
  const effectiveNumericOnly = getEffectiveSimulationDataset(sources, numericOnly, 'custom')
  assert.equal(effectiveNumericOnly.snapshot.bom[0].price, 2)
  assert.equal(effectiveNumericOnly.snapshot.bom[0].exactDecimalInputs?.price, undefined,
    'numeric-only Simulation override clears the inherited baseline exact sidecar')

  const paired = createEmptySimulationState(sources)
  paired.datasets.custom.parameterOverrides = { 'bom.price': { 'bom-1': 2 } }
  paired.datasets.custom.exactDecimalInputs = { 'bom.price': { 'bom-1': '2.000' } }
  const effectivePaired = getEffectiveSimulationDataset(sources, paired, 'custom')
  assert.equal(effectivePaired.snapshot.bom[0].price, 2)
  assert.equal(effectivePaired.snapshot.bom[0].exactDecimalInputs?.price, '2.000',
    'coherent Simulation numeric/exact override stays paired')

  const exactOnly = createEmptySimulationState(sources)
  exactOnly.datasets.custom.exactDecimalInputs = { 'bom.price': { 'bom-1': '1.00000000000000001' } }
  const effectiveExactOnly = getEffectiveSimulationDataset(sources, exactOnly, 'custom')
  assert.equal(effectiveExactOnly.snapshot.bom[0].price, 1)
  assert.equal(effectiveExactOnly.snapshot.bom[0].exactDecimalInputs?.price, '1.00000000000000001',
    'legitimate exact-only precision survives without changing the Number projection')

  const nearPairRow = {
    ...row,
    price: 0.09,
    exactDecimalInputs: { consumption: '1', loss: '0' }
  }
  const nearPairBase = { ...base, id: 'near-pair-base', bom: [nearPairRow] }
  const nearPairSources = {
    reference: { ...structuredClone(nearPairBase), id: 'near-pair-reference', comparisonRole: 'reference' },
    current: { ...structuredClone(nearPairBase), id: 'near-pair-current', comparisonRole: 'current' },
    custom: { ...structuredClone(nearPairBase), id: 'near-pair-custom' }
  }
  const nearPairState = createEmptySimulationState(nearPairSources)
  const exactNearPairState = updateSimulationParameter(
    nearPairState,
    nearPairSources,
    'bom-1',
    'bom.price',
    0.09000000000000004,
    'custom',
    '0.09000000000000004'
  )
  assert.equal(exactNearPairState.datasets.custom.parameterOverrides['bom.price']?.['bom-1'], 0.09000000000000004,
    'a valid exact Simulation override keeps its Number projection when the pair is machine-equivalent without sidecars')
  assert.equal(exactNearPairState.datasets.custom.exactDecimalInputs?.['bom.price']?.['bom-1'], '0.09000000000000004',
    'a valid exact Simulation override keeps its authoritative exact text')
  const effectiveNearPair = getEffectiveSimulationDataset(nearPairSources, exactNearPairState, 'custom')
  assert.equal(effectiveNearPair.snapshot.bom[0].price, 0.09000000000000004,
    'effective Simulation state retains an exact change across the pair normalization boundary')
  assert.equal(effectiveNearPair.snapshot.bom[0].exactDecimalInputs?.price, '0.09000000000000004',
    'effective Simulation state retains the exact sidecar paired with its Number override')
  const reloadedNearPairState = reconcileSimulationState(JSON.parse(JSON.stringify(exactNearPairState)), nearPairSources)
  const effectiveReloadedNearPair = getEffectiveSimulationDataset(nearPairSources, reloadedNearPairState, 'custom')
  assert.equal(effectiveReloadedNearPair.snapshot.bom[0].price, 0.09000000000000004,
    'Simulation persistence normalization retains an exact override whose Number is pair-equivalent without sidecars')
  assert.equal(effectiveReloadedNearPair.snapshot.bom[0].exactDecimalInputs?.price, '0.09000000000000004',
    'Simulation persistence normalization retains the exact override sidecar')

  const nearPairNumericOnlyState = createEmptySimulationState(nearPairSources)
  nearPairNumericOnlyState.datasets.custom.parameterOverrides = { 'bom.price': { 'bom-1': 0.09000000000000004 } }
  const effectiveNearPairNumericOnly = getEffectiveSimulationDataset(nearPairSources, nearPairNumericOnlyState, 'custom')
  assert.equal(effectiveNearPairNumericOnly.snapshot.bom[0].price, 0.09,
    'a pair-equivalent no-sidecar numeric override remains normalized to the baseline')
  assert.equal(effectiveNearPairNumericOnly.snapshot.bom[0].exactDecimalInputs?.price, undefined,
    'a no-sidecar numeric override does not invent an exact sidecar')

  const mismatchedPairState = createEmptySimulationState(nearPairSources)
  mismatchedPairState.datasets.custom.parameterOverrides = { 'bom.price': { 'bom-1': 0.09000000000000004 } }
  mismatchedPairState.datasets.custom.exactDecimalInputs = {
    'bom.price': { 'bom-1': '0.090000000000000003' }
  }
  const effectiveMismatchedPair = getEffectiveSimulationDataset(nearPairSources, mismatchedPairState, 'custom')
  assert.equal(effectiveMismatchedPair.snapshot.bom[0].price, 0.09,
    'normalization drops a Number override that was pair-equivalent without a valid matching sidecar')
  assert.equal(effectiveMismatchedPair.snapshot.bom[0].exactDecimalInputs?.price, undefined,
    'normalization does not reinterpret a mismatched override sidecar as an exact-only override')

  const nearPairPercentageBase = {
    ...base,
    id: 'near-pair-percentage-base',
    bom: [{ ...row, loss: 0.09, exactDecimalInputs: { consumption: '1', price: '1' } }]
  }
  const nearPairPercentageSources = {
    reference: { ...structuredClone(nearPairPercentageBase), id: 'near-pair-percentage-reference', comparisonRole: 'reference' },
    current: { ...structuredClone(nearPairPercentageBase), id: 'near-pair-percentage-current', comparisonRole: 'current' },
    custom: { ...structuredClone(nearPairPercentageBase), id: 'near-pair-percentage-custom' }
  }
  const nearPairPercentageState = createEmptySimulationState(nearPairPercentageSources)
  const exactNearPairPercentageState = updateSimulationParameter(
    nearPairPercentageState,
    nearPairPercentageSources,
    'bom-1',
    'bom.loss',
    0.09000000000000004,
    'custom',
    '9.000000000000004'
  )
  const effectiveNearPairPercentage = getEffectiveSimulationDataset(
    nearPairPercentageSources,
    exactNearPairPercentageState,
    'custom'
  )
  assert.equal(effectiveNearPairPercentage.snapshot.bom[0].loss, 0.09000000000000004,
    'percentage override normalization keeps the stored fraction paired with its percentage-point sidecar')
  assert.equal(effectiveNearPairPercentage.snapshot.bom[0].exactDecimalInputs?.loss, '9.000000000000004',
    'percentage override normalization keeps its authoritative percentage-point text')

  console.log('Simulation override sidecar integrity verification passed.')
} finally {
  await vite.close()
}
