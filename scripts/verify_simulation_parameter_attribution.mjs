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
  const { calculateBOMParameterCostEffects, calculateRoutingParameterCostEffects } = await vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts')
  const { formatBusinessNumber } = await vite.ssrLoadModule('/src/shared/ui/numeric-display.ts')

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

  let zeroBoundaryCases = 0
  const casePassed = label => { zeroBoundaryCases += 1; console.log(`PASS zero-boundary case ${zeroBoundaryCases}: ${label}`) }
  const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${label}: expected ${expected}, got ${actual}`)
  const integrationPassed = label => console.log(`PASS integration: ${label}`)
  const sum = values => values.reduce((total, value) => total + value, 0)
  casePassed('positive exact-aware LMDI remains intact')
  casePassed('exact-only decimal Price change remains nonzero')
  assert.equal(Number('10'), Number('10.00000000000000001'), 'the exact-only Price fixture has equal JavaScript Number projections')
  casePassed('equal Number projections do not collapse exact decimal changes')
  const bomCost = input => input.usage * input.price * (1 + input.loss)
  const routingLabor = input => input.manning / (input.capacity * input.yield) * input.laborRate
  const routingBurden = input => input.manning / (input.capacity * input.yield) * input.burdenRate
  const verifyBOM = (label, before, after, expected = {}) => {
    const result = calculateBOMParameterCostEffects(before, after, { allowZeroBoundary: true })
    assert.equal(result.status, 'available', `${label} remains available`)
    const effects = result.effects
    const actualDelta = bomCost(after) - bomCost(before)
    close(sum(Object.values(effects)), actualDelta, `${label} effects reconcile to actual row-cost delta`)
    for (const [key, value] of Object.entries(expected)) close(effects[key], value, `${label} ${key} effect`)
    for (const key of ['usage', 'price', 'loss']) {
      if (before[key] === after[key]) assert.equal(effects[key], 0, `${label} unchanged ${key} effect remains exact zero`)
    }
    return effects
  }
  const verifyRouting = (label, before, after, expected = {}) => {
    const result = calculateRoutingParameterCostEffects(before, after, { allowZeroBoundary: true })
    assert.equal(result.status, 'available', `${label} remains available`)
    const { labor, burden, conversion } = result.effects
    close(sum(Object.values(labor)), routingLabor(after) - routingLabor(before), `${label} labor factors reconcile`)
    close(sum(Object.values(burden)), routingBurden(after) - routingBurden(before), `${label} burden factors reconcile`)
    close(sum(Object.values(conversion)), routingLabor(after) + routingBurden(after) - routingLabor(before) - routingBurden(before), `${label} conversion factors reconcile to actual delta`)
    for (const [key, value] of Object.entries(expected)) close(conversion[key], value, `${label} ${key} conversion effect`)
    for (const key of ['manning', 'capacity', 'yield']) {
      if (before[key] === after[key]) {
        assert.equal(labor[key], 0, `${label} unchanged labor ${key} effect remains exact zero`)
        assert.equal(burden[key], 0, `${label} unchanged burden ${key} effect remains exact zero`)
        assert.equal(conversion[key], 0, `${label} unchanged conversion ${key} effect remains exact zero`)
      }
    }
    return result.effects
  }

  const bomBaseline = { usage: 2, price: 10, loss: 0 }
  verifyBOM('BOM Price positive to zero', bomBaseline, { ...bomBaseline, price: 0 }, { price: -20 })
  casePassed('BOM Price positive to zero')
  verifyBOM('BOM Price zero to positive', { ...bomBaseline, price: 0 }, bomBaseline, { price: 20 })
  casePassed('BOM Price zero to positive')
  verifyBOM('BOM Usage positive to zero', bomBaseline, { ...bomBaseline, usage: 0 }, { usage: -20 })
  casePassed('BOM Usage positive to zero')
  verifyBOM('BOM Usage zero to positive', { ...bomBaseline, usage: 0 }, bomBaseline, { usage: 20 })
  casePassed('BOM Usage zero to positive')
  verifyBOM('BOM Loss zero remains valid', bomBaseline, { ...bomBaseline, loss: 0.25 }, { loss: 5 })
  casePassed('BOM Loss zero remains valid')
  verifyBOM('BOM Usage zero plus Price change has zero effects', { ...bomBaseline, usage: 0 }, { ...bomBaseline, usage: 0, price: 12 }, { usage: 0, price: 0, loss: 0 })
  casePassed('BOM Usage zero plus Price change')
  verifyBOM('BOM Price zero plus Usage change has zero effects', { ...bomBaseline, price: 0 }, { ...bomBaseline, price: 0, usage: 4 }, { usage: 0, price: 0, loss: 0 })
  casePassed('BOM Price zero plus Usage change')
  const threeFactorBOM = verifyBOM('BOM Usage, Price, and Loss changed across zero boundary', bomBaseline,
    { usage: 0, price: 12, loss: 0.05 }, { usage: -22.566666666666666, price: 2.033333333333333, loss: 0.5333333333333333 })
  casePassed('BOM Usage, Price, and Loss changed across zero boundary')
  verifyBOM('BOM zero to zero with Loss change', { ...bomBaseline, usage: 0 }, { ...bomBaseline, usage: 0, loss: 0.25 }, { usage: 0, price: 0, loss: 0 })
  casePassed('BOM zero to zero with another parameter changing')
  verifyBOM('BOM unchanged parameters remain exact zero', bomBaseline, { ...bomBaseline, price: 12 }, { usage: 0, price: 4, loss: 0 })
  casePassed('BOM unchanged parameter effects remain exact zero')
  casePassed(`BOM effects sum to actual row-cost delta (${sum(Object.values(threeFactorBOM))})`)

  const routingBaseline = { manning: 1, capacity: 100, yield: 1, laborRate: 100, burdenRate: 50 }
  verifyRouting('Routing Manning positive to zero', routingBaseline, { ...routingBaseline, manning: 0 }, { manning: -1.5, capacity: 0, yield: 0 })
  casePassed('Routing Manning positive to zero')
  verifyRouting('Routing Manning zero to positive', { ...routingBaseline, manning: 0 }, routingBaseline, { manning: 1.5, capacity: 0, yield: 0 })
  casePassed('Routing Manning zero to positive')
  verifyRouting('Routing Manning boundary with Capacity change', routingBaseline,
    { ...routingBaseline, manning: 0, capacity: 200 }, { manning: -1.125, capacity: -0.375, yield: 0 })
  casePassed('Routing Manning boundary with Capacity change')
  verifyRouting('Routing Manning boundary with Yield change', routingBaseline,
    { ...routingBaseline, manning: 0, yield: 0.5 }, { manning: -2.25, capacity: 0, yield: 0.75 })
  casePassed('Routing Manning boundary with Yield change')
  const allRoutingFactors = verifyRouting('Routing Manning, Capacity, and Yield changed across zero boundary', routingBaseline,
    { ...routingBaseline, manning: 0, capacity: 200, yield: 0.5 })
  casePassed('Routing Manning, Capacity, and Yield changed across zero boundary')
  const legacyRouteZeroOracle = calculateMultiplicativeCostAttribution(1.5, 0, [
    { key: 'manning', baseline: 1, target: 0 },
    { key: 'capacity', baseline: 1 / 100, target: 1 / 200 },
    { key: 'yield', baseline: 1, target: 1 / 0.5 }
  ])
  for (const key of ['manning', 'capacity', 'yield']) close(allRoutingFactors.conversion[key], legacyRouteZeroOracle.effects[key], `Routing zero-boundary ${key} preserves inverse-factor symmetric oracle`)
  console.log('PASS: Routing Capacity and Yield retain inverse-factor symmetric attribution')
  verifyRouting('Routing zero to zero with a Capacity change', { ...routingBaseline, manning: 0 }, { ...routingBaseline, manning: 0, capacity: 200 },
    { manning: 0, capacity: 0, yield: 0 })
  casePassed('Routing unchanged and zero-to-zero effects remain exact zero')
  casePassed(`Routing effects sum to actual Conversion delta (${sum(Object.values(allRoutingFactors.conversion))})`)

  assert.equal(calculateRoutingParameterCostEffects(routingBaseline, { ...routingBaseline, capacity: 0 }, { allowZeroBoundary: true }).status, 'unavailable', 'Capacity zero remains rejected')
  casePassed('Capacity zero remains invalid')
  assert.equal(calculateRoutingParameterCostEffects(routingBaseline, { ...routingBaseline, yield: 0 }, { allowZeroBoundary: true }).status, 'unavailable', 'Yield zero remains rejected')
  casePassed('Yield zero remains invalid')
  assert.equal(calculateBOMParameterCostEffects({ ...bomBaseline, price: null }, bomBaseline, { allowZeroBoundary: true }).status, 'unavailable', 'missing/null remains unavailable')
  casePassed('Missing/null inputs remain unavailable')
  assert.equal(calculateBOMParameterCostEffects(bomBaseline, { ...bomBaseline, price: 0 }).status, 'unavailable', 'Cost Breakdown keeps its finalized positive-only attribution domain')
  assert.equal(calculateRoutingParameterCostEffects(routingBaseline, { ...routingBaseline, manning: 0 }).status, 'unavailable', 'Cost Breakdown keeps its finalized positive-only Manning attribution domain')
  integrationPassed('Simulation zero-boundary option does not expand Cost Breakdown attribution')

  assert.equal(formatBusinessNumber(0, { signPositive: true }), '0.00', 'exact zero displays without a plus sign')
  casePassed('exact zero presentation is 0.00 without +0.00')
  assert.equal(formatBusinessNumber(-0, { signPositive: true }), '0.00', 'negative zero is normalized and displays without a sign')
  casePassed('negative zero presentation is not -0.00')
  const zeroToZeroPresentation = verifyBOM('zero-cost change stays available for presentation', { ...bomBaseline, usage: 0 }, { ...bomBaseline, usage: 0, price: 12 })
  assert.equal(formatBusinessNumber(zeroToZeroPresentation.price, { signPositive: true }), '0.00', 'valid zero-cost attribution does not render unavailable em dash')
  casePassed('valid zero-boundary effect presents 0.00 instead of unavailable')

  const emptyDomainState = createEmptySimulationState(sources)
  const validZeroLossUpdate = updateSimulationParameter(emptyDomainState, sources,
    'bom-1', 'bom.loss', 0, 'current', '0')
  assert.notStrictEqual(validZeroLossUpdate, emptyDomainState, 'Loss zero remains accepted by Simulation parameter updates')
  integrationPassed('Simulation accepts valid zero Loss')
  const rejectedCapacityUpdate = updateSimulationParameter(emptyDomainState, sources,
    'route-1', 'routing.capacity', 0, 'current', '0')
  assert.strictEqual(rejectedCapacityUpdate, emptyDomainState, 'Simulation still rejects Capacity zero')
  integrationPassed('Simulation still rejects Capacity zero at the input boundary')
  const rejectedYieldUpdate = updateSimulationParameter(emptyDomainState, sources,
    'route-1', 'routing.yield', 0, 'current', '0')
  assert.strictEqual(rejectedYieldUpdate, emptyDomainState, 'Simulation still rejects Yield zero')
  integrationPassed('Simulation still rejects Yield zero at the input boundary')

  const simulationZeroPrice = edited('bom.price', 0, '0')
  const simulationZeroPriceEffects = bomAttribution(simulationZeroPrice.row, baseline, simulationZeroPrice.target).effects
  assert.equal(simulationZeroPriceEffects.effects?.price, -21, 'Simulation BOM Price zero assigns the whole single-factor boundary delta to Price')
  integrationPassed('Simulation BOM wrapper opts into exact-aware Price zero boundary')
  const simulationZeroManning = edited('routing.manning', 0, '0')
  const simulationZeroManningEffects = routingAttribution(simulationZeroManning.row, baseline, simulationZeroManning.target).effects
  assert.equal(simulationZeroManningEffects.effects?.manning, -1.5, 'Simulation Routing Manning zero assigns the whole boundary delta to Manning')
  integrationPassed('Simulation Routing wrapper opts into exact-aware Manning zero boundary')

  assert.equal(zeroBoundaryCases, 27, `all required zero-boundary cases execute; got ${zeroBoundaryCases}`)
  console.log(`Simulation Parameter Cost Effect exact-decimal and zero-boundary self-check: ${zeroBoundaryCases} required cases PASS; exact-decimal cases PASS`)
} finally {
  await vite.close()
}
