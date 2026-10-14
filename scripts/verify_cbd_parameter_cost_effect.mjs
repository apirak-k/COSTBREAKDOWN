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

function findDetailTable(markup, caption) {
  const tables = [...markup.matchAll(/<table\b[\s\S]*?<\/table>/g)]
  const table = tables.find(match => match[0].includes(caption))?.[0]
  assert.ok(table, `expected table caption ${caption}`)
  return table
}

function detailHeaders(markup, caption) {
  const table = findDetailTable(markup, caption)
  const header = table.match(/<thead\b[\s\S]*?<tr\b[\s\S]*?<\/tr>/)?.[0]
  assert.ok(header, `expected table headings in ${caption}`)
  return [...header.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1]))
}

function detailRow(markup, caption, label) {
  const table = findDetailTable(markup, caption)
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => new RegExp(`<th[^>]*>${label}<\\/th>`).test(candidate))
  assert.ok(row, `expected a ${label} row in ${caption}`)
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => visibleText(match[1]))
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

function renderBOM(module, comparison, reference, current) {
  const rows = module.buildBOMItemizedRows(reference.bom, current.bom, comparison.bomFindings)
  assert.equal(rows.length, comparison.bomFindings.length)
  return renderToStaticMarkup(React.createElement(module.BOMRecordDetails, {
    row: rows[0]
  }))
}

function renderRouting(module, comparison, reference, current) {
  const rows = module.buildRoutingItemizedRows(
    reference.routing, current.routing, comparison.routingFindings,
    reference.rates, current.rates
  )
  assert.equal(rows.length, comparison.routingFindings.length)
  const row = rows[0]
  return renderToStaticMarkup(React.createElement(module.RoutingRecordDetails, {
    row,
    referenceRates: reference.rates,
    currentRates: current.rates
  }))
}

function renderItemized(module, comparison, reference, current, typeTab = 'bom') {
  return renderToStaticMarkup(React.createElement(module.ItemizedComparisonTable, {
    comparison,
    pair: { reference, current },
    typeTab,
    viewMode: ['UNCHANGED', 'CHANGED', 'ADDED', 'REMOVED'],
    selectedBOMKeys: new Set(),
    selectedRoutingKeys: new Set(),
    onToggleFinding() {}
  }))
}

try {
  const [effects, comparisonCore, comparisonStatus, formatters, bomView, routingView, snapshotView, itemizedView] = await Promise.all([
    vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/comparison-status.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/ItemizedComparisonTable.tsx')
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
  const bomComparisonForDisplay = { ...bomComparison, totalGap: 2.2 }
  assert.equal(bomComparison.bomFindings.length, 1)
  assert.equal(bomComparison.bomFindings[0].matchStatus, 'matched')
  const bomMarkup = renderBOM(bomView, bomComparison, bomRefSnapshot, bomCurSnapshot)
  const bomText = visibleText(bomMarkup)
  assert.doesNotMatch(bomText, /Data quality|Confidence|(?:^|\s)Ref:|(?:^|\s)Current:|\b(?:Verified|Estimated|Missing|Need Review)\b/,
    'expanded BOM record must omit quality and confidence badges')
  const bomCaption = 'Changed BOM REF, CUR, and EFFECT values by Usage, Price, Loss, and Cost Gap'
  assert.deepEqual(detailHeaders(bomMarkup, bomCaption), ['Comparison', 'Usage', 'Price', 'Loss', 'Cost Gap · THB/pc'])
  assert.deepEqual(detailRow(bomMarkup, bomCaption, 'REF'), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(0.1, 2), formatters.formatNumber(11, 4)
  ], 'BOM REF row must carry actual reference parameters and cost')
  assert.deepEqual(detailRow(bomMarkup, bomCaption, 'CUR'), [
    formatters.formatNumber(2, 4), formatters.formatNumber(6, 4), formatters.formatPercent(0.1, 2), formatters.formatNumber(13.2, 4)
  ], 'BOM CUR row must carry actual current parameters and cost')
  assert.deepEqual(detailRow(bomMarkup, bomCaption, 'EFFECT'), [
    formatters.formatVariance(bomPositive.effects.usage, 4), formatters.formatVariance(bomPositive.effects.price, 4),
    formatters.formatVariance(bomPositive.effects.loss, 4), formatters.formatVariance(2.2, 4)
  ], 'BOM EFFECT row must preserve LMDI parameter effects and the actual material cost gap')
  assert.doesNotMatch(bomMarkup, /\bUnit\b|% Parent|%Parent/)
  assert.doesNotMatch(findDetailTable(bomMarkup, bomCaption), /<th[^>]*>Parameter<\/th>/)
  const bomCandidateMarkup = renderItemized(itemizedView, bomComparisonForDisplay, bomRefSnapshot, bomCurSnapshot)
  assert.match(bomCandidateMarkup, /Bill of Material/)
  assert.match(bomCandidateMarkup, /Usage/)
  assert.match(bomCandidateMarkup, /Price/)
  assert.match(bomCandidateMarkup, /Loss/)
  assert.match(bomCandidateMarkup, /100\.00%/)
  assert.doesNotMatch(bomCandidateMarkup, /\bUnit\b|% Parent|%Parent/)
  const overContributionMarkup = renderItemized(itemizedView, { ...bomComparisonForDisplay, totalGap: 1 }, bomRefSnapshot, bomCurSnapshot)
  assert.match(overContributionMarkup, /220\.00%/, 'Candidate contribution above 100 percent remains visible without clamping')

  const routingRefSnapshot = costSnapshot('reference', {
    routing: [route('route-ref', 'WC-REF')],
    rates: [rate('rate-ref', 'WC-REF', 10, 5)]
  })
  const routingCurSnapshot = costSnapshot('current', {
    routing: [route('route-cur', 'WC-CUR')],
    rates: [rate('rate-cur', 'WC-CUR', 20, 7)]
  })
  const routingComparison = comparisonCore.compareSnapshots(routingRefSnapshot, routingCurSnapshot)
  const routingComparisonForDisplay = { ...routingComparison, totalGap: 1.2 }
  assert.equal(routingComparison.routingFindings.length, 1, 'a Work Center move remains one Process/Routing record')
  assert.equal(routingComparison.routingFindings[0].matchStatus, 'matched')
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(routingComparison.routingFindings[0]), 'CHANGED')
  const routingMarkup = renderRouting(routingView, routingComparison, routingRefSnapshot, routingCurSnapshot)
  const routingText = visibleText(routingMarkup)
  assert.doesNotMatch(routingText, /Data quality|Confidence|(?:^|\s)Ref:|(?:^|\s)Current:|\b(?:Verified|Estimated|Missing|Need Review)\b/,
    'expanded Routing record must omit quality and confidence badges')
  assert.match(routingText, /WC-REF/)
  assert.match(routingText, /WC-CUR/)
  const routingCaption = 'Changed Routing REF, CUR, and EFFECT values by Manning, Capacity, Yield, and Cost Gap'
  assert.deepEqual(detailHeaders(routingMarkup, routingCaption), ['Comparison', 'Manning', 'Capacity', 'Yield', 'Cost Gap · THB/pc'])
  assert.deepEqual(detailRow(routingMarkup, routingCaption, 'REF'), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(1, 2), formatters.formatNumber(1.5, 4)
  ], 'Routing REF row must carry the reference operating parameters and conversion cost')
  assert.deepEqual(detailRow(routingMarkup, routingCaption, 'CUR'), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(1, 2), formatters.formatNumber(2.7, 4)
  ], 'Routing CUR row must carry the current operating parameters and conversion cost')
  assert.deepEqual(detailRow(routingMarkup, routingCaption, 'EFFECT'), [
    formatters.formatVariance(rateChanged.effects.conversion.manning, 4),
    formatters.formatVariance(rateChanged.effects.conversion.capacity, 4),
    formatters.formatVariance(rateChanged.effects.conversion.yield, 4),
    formatters.formatVariance(1.2, 4)
  ], 'Routing EFFECT row must keep primary operating-factor effects and the actual conversion gap')
  assert.doesNotMatch(routingMarkup, /% Parent|%Parent|Labor Gap|Burden Gap|Conversion Gap/)
  assert.doesNotMatch(findDetailTable(routingMarkup, routingCaption), /<th[^>]*>Labor Rate<\/th>|<th[^>]*>Burden Rate<\/th>/)
  assert.doesNotMatch(findDetailTable(routingMarkup, routingCaption), /<th[^>]*>Work Center<\/th>/)
  assert.ok(routingText.includes(`Labor Rate ${formatters.formatNumber(10, 4)} → ${formatters.formatNumber(20, 4)} Effect ${formatters.formatVariance(rateChanged.effects.conversion.laborRate, 4)}`),
    'Routing Labor Rate and its existing conversion effect stay in secondary context')
  assert.ok(routingText.includes(`Burden Rate ${formatters.formatNumber(5, 4)} → ${formatters.formatNumber(7, 4)} Effect ${formatters.formatVariance(rateChanged.effects.conversion.burdenRate, 4)}`),
    'Routing Burden Rate and its existing conversion effect stay in secondary context')
  const routingCandidateMarkup = renderItemized(itemizedView, routingComparisonForDisplay, routingRefSnapshot, routingCurSnapshot, 'rtg')
  assert.match(routingCandidateMarkup, /Routing/)
  assert.match(routingCandidateMarkup, /Manning/)
  assert.match(routingCandidateMarkup, /Capacity/)
  assert.match(routingCandidateMarkup, /Yield/)
  assert.doesNotMatch(routingCandidateMarkup, /Labor Gap|Burden Gap|Conversion Gap|% Parent|%Parent/)

  const statusCases = [
    { name: 'CHANGED', reference: [bom('status-ref')], current: [bom('status-cur', { price: 11 })], expandable: true },
    { name: 'UNCHANGED', reference: [bom('status-ref')], current: [bom('status-cur')], expandable: false },
    { name: 'ADDED', reference: [], current: [bom('status-cur')], expandable: false },
    { name: 'REMOVED', reference: [bom('status-ref')], current: [], expandable: false }
  ]
  for (const testCase of statusCases) {
    const reference = costSnapshot('reference', { bom: testCase.reference })
    const current = costSnapshot('current', { bom: testCase.current })
    const comparison = comparisonCore.compareSnapshots(reference, current)
    const finding = comparison.bomFindings[0]
    assert.equal(comparisonStatus.getCanonicalComparisonStatus(finding),
      testCase.name, `fixture must represent ${testCase.name}`)
    const markup = renderItemized(itemizedView, comparison, reference, current)
    assert.equal(markup.includes('aria-label="Expand details for Material"'), testCase.expandable,
      `BOM detail expansion must be gated by CHANGED status (${testCase.name})`)
  }

  const rateRef = rate('rate-ref', 'WC-1', 10, 5)
  const routeStatusCases = [
    { name: 'CHANGED', reference: [route('route-ref')], current: [route('route-cur', 'WC-1', { manning: 2 })], expandable: true },
    { name: 'UNCHANGED', reference: [route('route-ref')], current: [route('route-cur')], expandable: false },
    { name: 'ADDED', reference: [], current: [route('route-cur')], expandable: false },
    { name: 'REMOVED', reference: [route('route-ref')], current: [], expandable: false }
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
    const markup = renderItemized(itemizedView, comparison, reference, current, 'rtg')
    assert.equal(markup.includes('aria-label="Expand details for Cutting"'), testCase.expandable,
      `RTG detail expansion must be gated by CHANGED status (${testCase.name})`)
  }

  const warningComparison = {
    ...bomComparison,
    warnings: [{ code: 'FIXTURE_WARNING', message: 'Fixture warning remains reviewable' }]
  }
  const warningMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: warningComparison
  }))
  assert.doesNotMatch(warningMarkup, /Data quality:/, 'page-level Data quality summary must be removed')
  assert.doesNotMatch(warningMarkup, /Review warnings|Fixture warning remains reviewable/, 'comparison warnings are not presented in the Cost Breakdown summary')
  assert.match(warningMarkup, /Standard Cost Overview/)
  assert.doesNotMatch(warningMarkup, /Conversion|Labor \+ Burden|% Parent|%Parent|Review/,
    'the fixed overview omits the obsolete Conversion subtotal, reconciliation, and review UI')

  assert.ok(routingComparison.processingFindings.length > 0,
    'the full comparison fixture must have Work Center processing context')
  globalThis.__CBD_PARAMETER_TEST_STATE__ = {
    snapshotComparison: {
    ...routingComparisonForDisplay,
      elementGaps: { material: 0, labor: 0.15, burden: 0.1 },
      totalGap: 0.25,
      processingFindings: []
    },
    fullSnapshotComparison: routingComparisonForDisplay,
    snapshotPair: { reference: routingRefSnapshot, current: routingCurSnapshot },
    analysisSnapshotPair: { reference: routingRefSnapshot, current: routingCurSnapshot },
    selectedComparisonSelection: { bomFindingKeys: [], routingFindingKeys: [JSON.stringify(['routing', 'route-ref', 'route-cur'])] },
    isSelectedComparisonActive: true,
    applySelectedComparison() {},
    clearSelectedComparison() {}
  }
  try {
    const { CostBreakdownPage, GapContributionChart } = await vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx')
    const chartSegments = [
      { key: 'material', label: 'Material', full: 9.31, selected: 3, color: '#0369a1', selectedColor: '#075985' },
      { key: 'labor', label: 'Labor', full: 4.42, selected: 0, color: '#b45309', selectedColor: '#92400e' },
      { key: 'burden', label: 'Burden', full: 2.32, selected: 1, color: '#6d28d9', selectedColor: '#5b21b6' }
    ]
    const proportionalChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: chartSegments, fullTotal: 16.05, selectedTotal: 4, selectedActive: true
    }))
    assert.match(proportionalChart, /data-gap-chart-mode="proportional"/)
    for (const label of ['MAT', 'LB', 'BD']) {
      assert.ok(proportionalChart.includes(`>${label}</text>`), `${label} is labeled inside the continuous bar`)
    }
    const proportionalRects = [...proportionalChart.matchAll(/<rect\b[^>]*>/g)].map(([rect]) => rect)
    const contributionWidth = color => {
      const rect = proportionalRects.find(candidate => candidate.includes(`fill="${color}"`) && candidate.includes('fill-opacity="0.38"'))
      assert.ok(rect, `expected a proportional full-contribution segment for ${color}`)
      return Number(rect.match(/\bwidth="([\d.]+)"/)?.[1])
    }
    assertClose(contributionWidth('#0369a1') / 1000, 9.31 / 16.05, 'Material width must reflect its share of the full gap')
    assertClose(contributionWidth('#b45309') / 1000, 4.42 / 16.05, 'Labor width must reflect its share of the full gap')
    assertClose(contributionWidth('#6d28d9') / 1000, 2.32 / 16.05, 'Burden width must reflect its share of the full gap')
    assert.ok(proportionalChart.includes(`Selected Material ${formatters.formatVariance(3, 4)}`))

    const signedOffsetChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: [
        { key: 'material', label: 'Material', full: 9, selected: 10, color: '#0369a1', selectedColor: '#075985' },
        { key: 'labor', label: 'Labor', full: -4, selected: 0, color: '#b45309', selectedColor: '#92400e' },
        { key: 'burden', label: 'Burden', full: 2, selected: 0, color: '#6d28d9', selectedColor: '#5b21b6' }
      ], fullTotal: 7, selectedTotal: 10, selectedActive: true
    }))
    assert.match(signedOffsetChart, /data-gap-chart-mode="signed"/,
      'opposite-sign component gaps and a selected component above the net must use the signed chart')
    assert.ok(signedOffsetChart.includes([
      `Full Standard Cost Gap ${formatters.formatVariance(7, 4)}`,
      `Full Material ${formatters.formatVariance(9, 4)}`,
      `Full Labor ${formatters.formatVariance(-4, 4)}`,
      `Full Burden ${formatters.formatVariance(2, 4)}`
    ].join('; ')))
    assert.ok(signedOffsetChart.includes(`Selected Material ${formatters.formatVariance(10, 4)}`))
    assert.match(signedOffsetChart, /stroke-dasharray="2 2"/,
      'the offset chart must retain a visible shared zero baseline')
    assert.match(signedOffsetChart, /stroke-dasharray="4 2"/,
      'selected contribution beyond the full Material segment must remain visible as an outlined marker')
    const pageMarkup = renderToStaticMarkup(React.createElement(CostBreakdownPage))
    const pageText = visibleText(pageMarkup)
    assert.match(pageText, /Standard Cost Gap \+1\.20/)
    assert.doesNotMatch(pageText, /Full \+1\.20|Selected \+1\.20/)
    assert.match(pageText, /Absolute Cost Gap · High → Low/)
    assert.match(pageText, /Work Center Context/)
    assert.match(pageText, /Full snapshot · Conversion Cost/)
    assert.match(pageText, /WC-REF/)
    assert.match(pageText, /WC-CUR/)
    const subheader = pageMarkup.match(/<header aria-label="Cost Breakdown subheader"[\s\S]*?<\/header>/)?.[0]
    assert.ok(subheader, 'the subheader remains a distinct fixed row')
    const subheaderText = visibleText(subheader)
    const orderedLabels = ['Standard Cost Gap', 'MAT', 'LB', 'BD', 'ALL', 'BOM', 'RTG', 'Status', 'Sort', 'Absolute Cost Gap · High → Low', 'Collapse']
    const labelPositions = orderedLabels.map(label => subheaderText.indexOf(label))
    assert.ok(labelPositions.every(position => position >= 0), 'the subheader exposes every finalized control and chart label')
    assert.deepEqual(labelPositions, [...labelPositions].sort((left, right) => left - right),
      'the single subheader row follows the finalized left-to-right order')
    assert.doesNotMatch(subheaderText, /Full Material|Selected Material|Full Labor|Selected Labor|Full Burden|Selected Burden/,
      'per-element numeric blocks are removed from the subheader')
    assert.match(subheader, /aria-controls="cost-breakdown-overview-panels"/,
      'the far-right collapse control targets only Cost and Work Center overview panels')
    assert.match(subheader, /aria-expanded="true"/)
    assert.match(pageMarkup, /id="cost-breakdown-overview-panels" class="[^\"]*grid[^\"]*"/,
      'Cost and Work Center panels remain visible by default below the subheader')
    assert.match(pageMarkup, /aria-label="Deselect Candidate Cutting"/,
      'CBD finding selection remains available in the Candidates table')
    assert.equal([...pageMarkup.matchAll(/data-gap-chart-mode=/g)].length, 1,
      'the subheader must render one full-baseline Gap Bar with the Selected contribution inside it')
    assert.match(pageMarkup, /data-gap-chart-mode="unavailable"/,
      'unavailable full component gaps remain unavailable instead of being treated as zero')
    assert.match(pageMarkup, /aria-label="Candidate type filter"/)
    assert.match(pageMarkup, /aria-label="Status filter dropdown"/)
    assert.match(pageMarkup, /type="checkbox"/)
    assert.doesNotMatch(pageText, /Select scope|Edit scope|Full Comparison/)
  } finally {
    delete globalThis.__CBD_PARAMETER_TEST_STATE__
  }

  console.log('Cost Breakdown parameter cost effect verification passed.')
} finally {
  await vite.close()
}
