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
  const { createEmptySimulationState, getEffectiveSimulationDataset } = simulationState

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

  console.log('Simulation override sidecar integrity verification passed.')
} finally {
  await vite.close()
}
