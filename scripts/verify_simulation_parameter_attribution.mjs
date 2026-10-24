import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { bomAttribution, routingAttribution } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { calculateParameterSimulation } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const { createEmptySimulationState, getEffectiveSimulationDataset } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const { calculateMultiplicativeCostAttribution } = await vite.ssrLoadModule('/src/core/calculations/multiplicative-cost-attribution.ts')

  const base = {
    id: 'exact-attribution',
    product: { productCode: 'P-1', productDescription: 'Test', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: 'test', status: 'draft',
    rates: [{ id: 'rate-1', workCenterCode: 'WC1', description: 'WC1', laborRate: 100, burdenRate: 50, effectiveDate: '', confidence: {} }],
    bom: [{ id: 'bom-1', itemCode: 'MAT-1', description: 'Steel', consumption: 2, unit: 'PC', price: 10, loss: 0.05, confidence: {} }],
    routing: [{ id: 'route-1', processName: 'Cut', workCenterId: 'WC1', manning: 1, capacity: 100, yield: 1, confidence: {} }]
  }
  const sources = { reference: base, current: base, custom: base }
  const baseline = getEffectiveSimulationDataset(sources, createEmptySimulationState(sources), 'current').snapshot

  function edited(parameter, value, exactValue) {
    const state = updateSimulationParameter(createEmptySimulationState(sources), sources,
      parameter.startsWith('bom.') ? 'bom-1' : 'route-1', parameter, value, 'current', exactValue)
    const target = getEffectiveSimulationDataset(sources, state, 'current').snapshot
    const kind = parameter.startsWith('bom.') ? 'bom' : 'routing'
    const row = calculateParameterSimulation(baseline, target).records.find(record => record.kind === kind)
    assert.ok(row, `${parameter} produces a matched Simulation comparison row`)
    return { target, row }
  }

  function verifyExactEffect(parameter, field, value, exactValue, label) {
    const { target, row } = edited(parameter, value, exactValue)
    const result = parameter.startsWith('bom.')
      ? bomAttribution(row, baseline, target)
      : routingAttribution(row, baseline, target)
    const amount = result.effects.effects?.[field]
    assert.ok(Number.isFinite(amount) && amount !== 0, `${label} effect uses exact text even when its Number projection is unchanged; got ${String(amount)}`)
    const effects = result.effects.effects
    assert.ok(effects, `${label} attribution is available`)
    assert.equal(Object.values(effects).reduce((sum, effect) => sum + effect, 0), result.effects.totalEffect,
      `${label} parameter effects reconcile to the exact cost delta`)
    return result.effects
  }

  const exactPrice = verifyExactEffect('bom.price', 'price', 10, '10.00000000000000001', 'BOM Price')
  const oldPrice = calculateMultiplicativeCostAttribution(21, 21, [
    { key: 'price', baseline: 10, target: 10 },
    { key: 'usage', baseline: 2, target: 2 },
    { key: 'loss', baseline: 1.05, target: 1.05 }
  ])
  assert.equal(oldPrice.effects?.price, 0, 'reproduces the prior Number-only attribution defect')
  assert.notEqual(exactPrice.effects?.price, 0, 'the Simulation Parameter Cost Effect path fixes the reproduced Price defect')

  verifyExactEffect('bom.consumption', 'usage', 2, '2.00000000000000001', 'BOM Usage')
  verifyExactEffect('bom.loss', 'loss', 0.05, '5.00000000000000001', 'BOM Loss')
  verifyExactEffect('routing.manning', 'manning', 1, '1.00000000000000001', 'Routing Manning')
  verifyExactEffect('routing.capacity', 'capacity', 100, '100.00000000000000001', 'Routing Capacity')
  verifyExactEffect('routing.yield', 'yield', 1, '100.00000000000000001', 'Routing Yield')

  const normalPrice = edited('bom.price', 12, '12')
  const normalPriceEffect = bomAttribution(normalPrice.row, baseline, normalPrice.target).effects
  const expectedPriceEffect = calculateMultiplicativeCostAttribution(21, 25.2, [
    { key: 'price', baseline: 10, target: 12 },
    { key: 'usage', baseline: 2, target: 2 },
    { key: 'loss', baseline: 1.05, target: 1.05 }
  ])
  assert.ok(Math.abs(normalPriceEffect.effects.price - expectedPriceEffect.effects.price) < 1e-9,
    'normal-sized BOM attribution remains unchanged')

  const normalCapacity = edited('routing.capacity', 80, '80')
  const normalCapacityEffect = routingAttribution(normalCapacity.row, baseline, normalCapacity.target).effects
  const expectedCapacityEffect = calculateMultiplicativeCostAttribution(1.5, 1.875, [
    { key: 'manning', baseline: 1, target: 1 },
    { key: 'capacity', baseline: 0.01, target: 0.0125 },
    { key: 'yield', baseline: 1, target: 1 }
  ])
  assert.ok(Math.abs(normalCapacityEffect.effects.capacity - expectedCapacityEffect.effects.capacity) < 1e-9,
    'normal-sized Routing attribution remains unchanged')

  console.log('Simulation Parameter Cost Effect exact-decimal self-check: 14 assertions PASS')
} finally {
  await vite.close()
}
