import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [{
    name: 'cost-breakdown-test-store',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../../state'
        && importer?.replaceAll('\\', '/').endsWith('/src/features/cost-breakdown/CostBreakdownPage.tsx')) {
        return '\0cost-breakdown-test-store'
      }
      return null
    },
    load(id) {
      return id === '\0cost-breakdown-test-store'
        ? 'export const useAppStore = () => globalThis.__CBD_PARAMETER_TEST_STATE__'
        : null
    }
  }]
})

const visibleText = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const assertClose = (actual, expected, message = `${actual} is not close to ${expected}`) => {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9, message)
}
const sum = values => values.reduce((total, value) => total + value, 0)

function findTotalRow(markup, caption) {
  const tables = [...markup.matchAll(/<table\b[\s\S]*?<\/table>/g)]
  const table = tables.find(match => match[0].includes(caption))?.[0]
  assert.ok(table, `expected table caption ${caption}`)
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const totalRow = rows.find(row => /<th[^>]*>Total<\/th>/.test(row))
  assert.ok(totalRow, `expected a Total row in ${caption}`)
  return [...totalRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1])
}

function costSnapshot(id, { bom = [], routing = [], rates = [] } = {}) {
  return {
    id,
    comparisonRole: id === 'reference' ? 'reference' : 'current',
    status: 'draft',
    sourceRef: id,
    product: {
      productCode: 'TEST-001', productDescription: 'LMDI fixture', uom: 'PC',
      customer: '', effectiveDate: ''
    },
    bom,
    routing,
    rates,
    warnings: []
  }
}

function bom(id, { usage = 1, price = 10, loss = 0.1 } = {}) {
  return {
    id, itemCode: 'MAT-1', description: 'Material', unit: 'KG',
    consumption: usage, price, loss, confidence: {}
  }
}

function route(id, workCenterId = 'WC-1', overrides = {}) {
  return {
    id, processName: 'Cutting', operationCode: id, sequence: 10,
    workCenterId, manning: 1, capacity: 10, yield: 1, confidence: {},
    ...overrides
  }
}

function rate(id, workCenterCode, laborRate, burdenRate) {
  return {
    id, workCenterCode, description: workCenterCode, laborRate, burdenRate,
    effectiveDate: '', confidence: {}
  }
}

function renderBOM(module, comparison, reference, current, standardCostGap = comparison.totalGap) {
  const rows = module.buildBOMItemizedRows(reference.bom, current.bom, comparison.bomFindings)
  assert.equal(rows.length, comparison.bomFindings.length)
  return renderToStaticMarkup(React.createElement(module.BOMRecordDetails, {
    row: rows[0], standardCostGap
  }))
}

function renderRouting(module, comparison, reference, current, standardCostGap = comparison.totalGap) {
  const rows = module.buildRoutingItemizedRows(
    reference.routing, current.routing, comparison.routingFindings,
    reference.rates, current.rates
  )
  assert.equal(rows.length, comparison.routingFindings.length)
  const row = rows[0]
  return renderToStaticMarkup(React.createElement(module.RoutingRecordDetails, {
    row,
    referenceRates: reference.rates,
    currentRates: current.rates,
    standardCostGap,
    laborGap: comparison.elementGaps.labor,
    burdenGap: comparison.elementGaps.burden,
    conversionGap: comparison.elementGaps.labor === null || comparison.elementGaps.burden === null
      ? null : comparison.elementGaps.labor + comparison.elementGaps.burden
  }))
}

try {
  const [effects, comparisonCore, comparisonStatus, bomView, routingView, snapshotView] = await Promise.all([
    vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/comparison-status.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx')
  ])

  const bomReference = { usage: 1, price: 10, loss: 0.1 }
  const bomPositiveCurrent = { usage: 2, price: 6, loss: 0.1 }
  const bomPositive = effects.calculateBOMParameterCostEffects(bomReference, bomPositiveCurrent)
  assert.equal(bomPositive.status, 'available')
  assertClose(sum(Object.values(bomPositive.effects)), 2.2, 'BOM effects must reconcile to the unrounded +2.2 gap')
  assert.ok(bomPositive.effects.usage > 2.2, 'BOM usage contribution must exceed the net gap when price offsets it')
  assert.ok(bomPositive.effects.price < 0, 'BOM price contribution must preserve an offsetting negative effect')

  const bomNegative = effects.calculateBOMParameterCostEffects(
    bomReference,
    { usage: 0.8, price: 12, loss: 0.05 }
  )
  assert.equal(bomNegative.status, 'available')
  assertClose(sum(Object.values(bomNegative.effects)), -0.92, 'BOM effects must reconcile to a negative gap')
  assert.ok(Object.values(bomNegative.effects).some(value => value > 0)
    && Object.values(bomNegative.effects).some(value => value < 0), 'BOM negative gap must retain opposing factor effects')

  const bomKeys = ['usage', 'price', 'loss']
  for (const key of bomKeys) {
    for (const side of ['reference', 'current']) {
      const reference = { ...bomReference }
      const current = { ...bomPositiveCurrent }
      ;(side === 'reference' ? reference : current)[key] = 0
      assert.equal(effects.calculateBOMParameterCostEffects(reference, current).status, 'unavailable', `BOM zero ${side}.${key} is unavailable`)
      ;(side === 'reference' ? reference : current)[key] = null
      assert.equal(effects.calculateBOMParameterCostEffects(reference, current).status, 'unavailable', `BOM missing ${side}.${key} is unavailable`)
      for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        ;(side === 'reference' ? reference : current)[key] = invalid
        assert.equal(effects.calculateBOMParameterCostEffects(reference, current).status, 'unavailable', `BOM invalid ${side}.${key} is unavailable`)
      }
    }
  }

  const routingReference = { manning: 1, capacity: 10, yield: 1, laborRate: 10, burdenRate: 5 }
  const routingPositiveCurrent = { ...routingReference, manning: 2 }
  const routingPositive = effects.calculateRoutingParameterCostEffects(routingReference, routingPositiveCurrent)
  assert.equal(routingPositive.status, 'available')
  assertClose(sum(Object.values(routingPositive.effects.labor)), 1, 'Routing labor factors must reconcile to +1')
  assertClose(sum(Object.values(routingPositive.effects.burden)), 0.5, 'Routing burden factors must reconcile to +0.5')
  assertClose(sum(Object.values(routingPositive.effects.conversion)), 1.5, 'Routing conversion factors must reconcile to +1.5')

  const routingNegative = effects.calculateRoutingParameterCostEffects(
    routingReference,
    { ...routingReference, capacity: 20 }
  )
  assert.equal(routingNegative.status, 'available')
  assertClose(sum(Object.values(routingNegative.effects.labor)), -0.5, 'Routing labor factors must reconcile to a negative gap')
  assertClose(sum(Object.values(routingNegative.effects.burden)), -0.25, 'Routing burden factors must reconcile to a negative gap')
  assert.ok(routingNegative.effects.labor.capacity < 0 && routingNegative.effects.burden.capacity < 0)

  const routingOffset = effects.calculateRoutingParameterCostEffects(
    routingReference,
    { ...routingReference, manning: 2, capacity: 20 }
  )
  assert.equal(routingOffset.status, 'available')
  assertClose(sum(Object.values(routingOffset.effects.labor)), 0, 'Routing offsetting changes must reconcile to zero')
  assert.ok(routingOffset.effects.labor.manning > 0 && routingOffset.effects.labor.capacity < 0,
    'Routing must keep offsetting Manning and Capacity effects visible')

  const rateChanged = effects.calculateRoutingParameterCostEffects(
    routingReference,
    { ...routingReference, laborRate: 20, burdenRate: 7 }
  )
  assert.equal(rateChanged.status, 'available')
  assertClose(rateChanged.effects.labor.laborRate, 1, 'Labor rate change must be attributed to Labor Rate')
  assertClose(rateChanged.effects.burden.burdenRate, 0.2, 'Burden rate change must be attributed to Burden Rate')
  assertClose(sum(Object.values(rateChanged.effects.conversion)), 1.2, 'Conversion must add Labor and Burden parameter effects')

  const routeKeys = ['manning', 'capacity', 'yield', 'laborRate', 'burdenRate']
  for (const key of routeKeys) {
    for (const side of ['reference', 'current']) {
      const reference = { ...routingReference }
      const current = { ...routingPositiveCurrent }
      ;(side === 'reference' ? reference : current)[key] = 0
      assert.equal(effects.calculateRoutingParameterCostEffects(reference, current).status, 'unavailable', `Routing zero ${side}.${key} is unavailable`)
      ;(side === 'reference' ? reference : current)[key] = null
      assert.equal(effects.calculateRoutingParameterCostEffects(reference, current).status, 'unavailable', `Routing missing ${side}.${key} is unavailable`)
      for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        ;(side === 'reference' ? reference : current)[key] = invalid
        assert.equal(effects.calculateRoutingParameterCostEffects(reference, current).status, 'unavailable', `Routing invalid ${side}.${key} is unavailable`)
      }
    }
  }

  const bomRefSnapshot = costSnapshot('reference', { bom: [bom('bom-ref')] })
  const bomCurSnapshot = costSnapshot('current', { bom: [bom('bom-cur', { usage: 2, price: 6 })] })
  const bomComparison = comparisonCore.compareSnapshots(bomRefSnapshot, bomCurSnapshot)
  assert.equal(bomComparison.bomFindings.length, 1)
  assert.equal(bomComparison.bomFindings[0].matchStatus, 'matched')
  const bomMarkup = renderBOM(bomView, bomComparison, bomRefSnapshot, bomCurSnapshot, 2.2)
  const bomText = visibleText(bomMarkup)
  assert.doesNotMatch(bomText, /Data quality|Confidence|(?:^|\s)Ref:|(?:^|\s)Current:|\b(?:Verified|Estimated|Missing|Need Review)\b/,
    'expanded BOM record must omit quality and confidence badges')
  assert.match(bomMarkup, /aria-label="BOM Parameter Cost Effect"/)
  const bomTotals = findTotalRow(bomMarkup, 'BOM cost effect by parameter')
  assert.deepEqual(bomTotals, ['+2.20', '100.00%', '100.00%'], 'BOM Total must use the actual record gap and full-comparison gap')

  const routingRefSnapshot = costSnapshot('reference', {
    routing: [route('route-ref', 'WC-REF')],
    rates: [rate('rate-ref', 'WC-REF', 10, 5)]
  })
  const routingCurSnapshot = costSnapshot('current', {
    routing: [route('route-cur', 'WC-CUR')],
    rates: [rate('rate-cur', 'WC-CUR', 20, 7)]
  })
  const routingComparison = comparisonCore.compareSnapshots(routingRefSnapshot, routingCurSnapshot)
  assert.equal(routingComparison.routingFindings.length, 1, 'a Work Center move remains one Process/Routing record')
  assert.equal(routingComparison.routingFindings[0].matchStatus, 'matched')
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(routingComparison.routingFindings[0]), 'CHANGED')
  const routingMarkup = renderRouting(routingView, routingComparison, routingRefSnapshot, routingCurSnapshot, 1.2)
  const routingText = visibleText(routingMarkup)
  assert.doesNotMatch(routingText, /Data quality|Confidence|(?:^|\s)Ref:|(?:^|\s)Current:|\b(?:Verified|Estimated|Missing|Need Review)\b/,
    'expanded Routing record must omit quality and confidence badges')
  assert.match(routingText, /WC-REF/)
  assert.match(routingText, /WC-CUR/)
  const routingTotals = findTotalRow(routingMarkup, 'Labor, burden, and conversion parameter effects by factor')
  assert.deepEqual(routingTotals, [
    '+1.00', '100.00%', '83.33%',
    '+0.20', '100.00%', '16.67%',
    '+1.20', '100.00%', '100.00%'
  ], 'Routing Total must use actual Labor, Burden, and Conversion gaps')

  const statusCases = [
    { name: 'CHANGED', reference: [bom('status-ref')], current: [bom('status-cur', { price: 11 })], expected: true },
    { name: 'UNCHANGED', reference: [bom('status-ref')], current: [bom('status-cur')], expected: false },
    { name: 'ADDED', reference: [], current: [bom('status-cur')], expected: false },
    { name: 'REMOVED', reference: [bom('status-ref')], current: [], expected: false }
  ]
  for (const testCase of statusCases) {
    const reference = costSnapshot('reference', { bom: testCase.reference })
    const current = costSnapshot('current', { bom: testCase.current })
    const comparison = comparisonCore.compareSnapshots(reference, current)
    const finding = comparison.bomFindings[0]
    assert.equal(comparisonStatus.getCanonicalComparisonStatus(finding),
      testCase.name, `fixture must represent ${testCase.name}`)
    const markup = renderBOM(bomView, comparison, reference, current)
    assert.equal(markup.includes('aria-label="BOM Parameter Cost Effect"'), testCase.expected,
      `Parameter Cost Effect visibility must be gated by CHANGED status (${testCase.name})`)
  }

  const rateRef = rate('rate-ref', 'WC-1', 10, 5)
  const routeStatusCases = [
    { name: 'CHANGED', reference: [route('route-ref')], current: [route('route-cur', 'WC-1', { manning: 2 })], expected: true },
    { name: 'UNCHANGED', reference: [route('route-ref')], current: [route('route-cur')], expected: false },
    { name: 'ADDED', reference: [], current: [route('route-cur')], expected: false },
    { name: 'REMOVED', reference: [route('route-ref')], current: [], expected: false }
  ]
  for (const testCase of routeStatusCases) {
    const reference = costSnapshot('reference', {
      routing: testCase.reference,
      rates: testCase.reference.length ? [rateRef] : []
    })
    const current = costSnapshot('current', {
      routing: testCase.current,
      rates: testCase.current.length ? [rate('rate-cur', 'WC-1', 10, 5)] : []
    })
    const comparison = comparisonCore.compareSnapshots(reference, current)
    const finding = comparison.routingFindings[0]
    assert.equal(comparisonStatus.getCanonicalComparisonStatus(finding), testCase.name,
      `Routing fixture must represent ${testCase.name}`)
    const markup = renderRouting(routingView, comparison, reference, current)
    assert.equal(markup.includes('aria-label="Routing Parameter Cost Effect"'), testCase.expected,
      `Routing Parameter Cost Effect visibility must be gated by CHANGED status (${testCase.name})`)
  }

  const warningComparison = {
    ...bomComparison,
    warnings: [{ code: 'FIXTURE_WARNING', message: 'Fixture warning remains reviewable' }]
  }
  const warningMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: warningComparison
  }))
  assert.doesNotMatch(warningMarkup, /Data quality:/, 'page-level Data quality summary must be removed')
  assert.match(warningMarkup, /Review warnings \(1\)/, 'Review warnings must remain available')
  assert.match(warningMarkup, /Fixture warning remains reviewable/)

  assert.ok(routingComparison.processingFindings.length > 0,
    'the full comparison fixture must have Work Center processing context')
  globalThis.__CBD_PARAMETER_TEST_STATE__ = {
    snapshotComparison: { ...routingComparison, processingFindings: [] },
    fullSnapshotComparison: routingComparison,
    snapshotPair: { reference: routingRefSnapshot, current: routingCurSnapshot },
    analysisSnapshotPair: { reference: routingRefSnapshot, current: routingCurSnapshot },
    selectedComparisonSelection: { bomFindingKeys: [], routingFindingKeys: [] },
    isSelectedComparisonActive: true,
    applySelectedComparison() {},
    clearSelectedComparison() {}
  }
  try {
    const { CostBreakdownPage } = await vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx')
    const pageMarkup = renderToStaticMarkup(React.createElement(CostBreakdownPage))
    const pageText = visibleText(pageMarkup)
    assert.match(pageText, /Selected Comparison/)
    assert.match(pageText, /Work Center Net Summary/)
    assert.match(pageText, /Full Reference \/ Current snapshot pair/)
    assert.match(pageText, /WC-REF/)
    assert.match(pageText, /WC-CUR/)
  } finally {
    delete globalThis.__CBD_PARAMETER_TEST_STATE__
  }

  console.log('Cost Breakdown parameter cost effect verification passed.')
} finally {
  await vite.close()
}
