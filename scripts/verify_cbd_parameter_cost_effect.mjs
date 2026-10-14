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

function detailRow(markup, label) {
  const rows = [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => new RegExp(`<th[^>]*>${label}<\\/th>`).test(candidate))
  assert.ok(row, `expected a ${label} row`)
  return [...row.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(match => visibleText(match[1]))
}

function candidateMainRow(markup, identityHeader, identity, status) {
  const rows = [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => candidate.includes(`aria-label="${identityHeader}: ${identity}; status ${status};`))
  assert.ok(row, `expected the ${identityHeader} main row for ${identity}`)
  return row
}

function gridCellText(row) {
  return [...row.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(match => visibleText(match[1]))
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
  const [effects, comparisonCore, comparisonStatus, formatters, bomView, routingView, snapshotView, wcView, itemizedView] = await Promise.all([
    vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/comparison-status.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx'),
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
  assert.deepEqual(detailRow(bomMarkup, 'REF').slice(3, 7), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(0.1, 2), formatters.formatNumber(11, 4)
  ], 'BOM REF row must carry actual reference parameters and cost in the shared parent grid')
  assert.deepEqual(detailRow(bomMarkup, 'CUR').slice(3, 7), [
    formatters.formatNumber(2, 4), formatters.formatNumber(6, 4), formatters.formatPercent(0.1, 2), formatters.formatNumber(13.2, 4)
  ], 'BOM CUR row must carry actual current parameters and cost in the shared parent grid')
  assert.deepEqual(detailRow(bomMarkup, 'EFFECT').slice(3, 7), [
    formatters.formatVariance(bomPositive.effects.usage, 4), formatters.formatVariance(bomPositive.effects.price, 4),
    formatters.formatVariance(bomPositive.effects.loss, 4), formatters.formatVariance(2.2, 4)
  ], 'BOM EFFECT row must preserve LMDI parameter effects and the same actual material gap as the main row')
  assert.doesNotMatch(bomMarkup, /\bUnit\b|% Parent|%Parent/)
  assert.doesNotMatch(bomMarkup, /Changed fields|<table\b|Root Cause|\bAction\b|Controllable/,
    'BOM detail is not an independent nested table and has no duplicated/RCA fields')
  const bomCandidateMarkup = renderItemized(itemizedView, bomComparisonForDisplay, bomRefSnapshot, bomCurSnapshot)
  const bomTable = bomCandidateMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  assert.ok(bomTable, 'BOM Candidates render as one actual table')
  const bomHeader = bomTable.match(/<thead\b[\s\S]*?<tr\b[\s\S]*?<\/tr>/)?.[0]
  assert.ok(bomHeader)
  assert.deepEqual([...bomHeader.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1])),
    ['#', 'Bill of Material', 'Status', 'Usage', 'Price', 'Loss', 'Gap', '%GAP', 'Reorder', 'Details'],
    'BOM main row uses the finalized shared column schema')
  assert.match(bomTable, /<colgroup>[\s\S]*?<\/colgroup>/)
  assert.match(bomCandidateMarkup, /Bill of Material/)
  assert.match(bomCandidateMarkup, /Usage/)
  assert.match(bomCandidateMarkup, /Price/)
  assert.match(bomCandidateMarkup, /Loss/)
  assert.match(bomCandidateMarkup, /100\.00%/)
  const bomMainCells = gridCellText(candidateMainRow(bomCandidateMarkup, 'Bill of Material', 'Material', 'CHANGED'))
  assert.deepEqual(bomMainCells.slice(3, 8), [
    formatters.formatVariance(1, 4), formatters.formatVariance(-4, 4), formatters.formatPercent(0, 2),
    formatters.formatVariance(2.2, 4), '100.00%'
  ], 'BOM main cells show parameter gaps separately from Candidate Cost Gap and its Standard Cost percentage')
  assert.match(candidateMainRow(bomCandidateMarkup, 'Bill of Material', 'Material', 'CHANGED'), /text-amber-700/)
  assert.doesNotMatch(candidateMainRow(bomCandidateMarkup, 'Bill of Material', 'Material', 'CHANGED'), /rounded-full|bg-amber/,
    'status is colored text without pill or badge background styling')
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
  assert.deepEqual(detailRow(routingMarkup, 'REF').slice(3, 7), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(1, 2), formatters.formatNumber(1.5, 4)
  ], 'Routing REF row must carry the reference operating parameters and conversion cost in the shared parent grid')
  assert.deepEqual(detailRow(routingMarkup, 'CUR').slice(3, 7), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(1, 2), formatters.formatNumber(2.7, 4)
  ], 'Routing CUR row must carry the current operating parameters and conversion cost in the shared parent grid')
  assert.deepEqual(detailRow(routingMarkup, 'EFFECT').slice(3, 7), [
    formatters.formatVariance(rateChanged.effects.conversion.manning, 4),
    formatters.formatVariance(rateChanged.effects.conversion.capacity, 4),
    formatters.formatVariance(rateChanged.effects.conversion.yield, 4),
    formatters.formatVariance(1.2, 4)
  ], 'Routing EFFECT row must keep primary operating-factor effects and the same actual conversion gap as the main row')
  assert.doesNotMatch(routingMarkup, /% Parent|%Parent|Labor Gap|Burden Gap|Conversion Gap|Changed fields|Root Cause|\bAction\b|Controllable/)
  assert.doesNotMatch(routingMarkup, /Labor Rate|Burden Rate|Work Center/,
    'routing rate and Work Center context are not promoted into parameter detail columns')
  const routingCandidateMarkup = renderItemized(itemizedView, routingComparisonForDisplay, routingRefSnapshot, routingCurSnapshot, 'rtg')
  assert.match(routingCandidateMarkup, /Routing/)
  assert.match(routingCandidateMarkup, /Manning/)
  assert.match(routingCandidateMarkup, /Capacity/)
  assert.match(routingCandidateMarkup, /Yield/)
  assert.doesNotMatch(routingCandidateMarkup, /Labor Gap|Burden Gap|Conversion Gap|% Parent|%Parent/)
  const routingMainCells = gridCellText(candidateMainRow(routingCandidateMarkup, 'Routing', 'Cutting', 'CHANGED'))
  assert.equal(routingMainCells[6], formatters.formatVariance(1.2, 4),
    'Routing Main Gap remains its Candidate Conversion Cost Gap')

  const bomTablesInAll = [...renderItemized(itemizedView, {
    ...bomComparisonForDisplay,
    routingFindings: routingComparison.routingFindings
  }, bomRefSnapshot, bomCurSnapshot, 'all').matchAll(/<table\b[\s\S]*?<\/table>/g)]
  assert.equal(bomTablesInAll.length, 2, 'ALL renders exactly the BOM table followed by the Routing table')
  const allTableMarkup = bomTablesInAll.map(match => match[0])
  assert.ok(allTableMarkup[0].includes('Bill of Material') && allTableMarkup[1].includes('Routing'),
    'ALL keeps BOM first and Routing immediately below without merging their rows')
  const allColumnWidths = allTableMarkup.map(table => table.match(/<colgroup>([\s\S]*?)<\/colgroup>/)?.[1])
  assert.ok(allColumnWidths[0] && allColumnWidths[1])
  assert.equal(allColumnWidths[0], allColumnWidths[1], 'BOM and Routing use the same corresponding column widths')

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
    assert.equal(markup.includes('aria-label="Expand details for Material"'), true,
      `BOM detail remains expandable for ${testCase.name}; absent-side values use em dashes`)
    const detailMarkup = renderBOM(bomView, comparison, reference, current)
    if (testCase.name === 'ADDED') assert.match(detailMarkup, /<th[^>]*>REF<\/th>[\s\S]*?—/)
    if (testCase.name === 'REMOVED') assert.match(detailMarkup, /<th[^>]*>CUR<\/th>[\s\S]*?—/)
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
    assert.equal(markup.includes('aria-label="Expand details for Cutting"'), true,
      `Routing detail remains expandable for ${testCase.name}; absent-side values use em dashes`)
  }

  const warningComparison = {
    ...bomComparison,
    referenceCost: { ...bomComparison.referenceCost, labor: 0, burden: 0, total: 11 },
    currentCost: { ...bomComparison.currentCost, labor: 0, burden: 0, total: 13.2 },
    elementGaps: { ...bomComparison.elementGaps, material: 2.2, labor: 0, burden: 0 },
    totalGap: 2.2,
    warnings: [{ code: 'FIXTURE_WARNING', message: 'Fixture warning remains reviewable' }]
  }
  const warningMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: warningComparison
  }))
  assert.doesNotMatch(warningMarkup, /Data quality:/, 'page-level Data quality summary must be removed')
  assert.doesNotMatch(warningMarkup, /Review warnings|Fixture warning remains reviewable/, 'comparison warnings are not presented in the Cost Breakdown summary')
  assert.match(warningMarkup, /aria-label="Cost comparison"/)
  assert.match(warningMarkup, /<th scope="col"[^>]*>Cost<\/th>[\s\S]*>REF<\/th>[\s\S]*>CUR<\/th>[\s\S]*>GAP<\/th>[\s\S]*>%GAP<\/th>/)
  assert.deepEqual([...warningMarkup.matchAll(/<tr\b/g)].length, 5, 'Cost has exactly a header, three element rows, and a footer')
  assert.match(warningMarkup, />MAT<\/th>[\s\S]*>LB<\/th>[\s\S]*>BD<\/th>[\s\S]*>STD Cost<\/th>/)
  assert.doesNotMatch(warningMarkup, /Standard Cost Overview|Material color legend|Selected REF|Selected CUR/,
    'Cost stays compact and has no duplicate legend or Selected dataset columns')
  assert.ok(warningMarkup.includes('100.00%'), 'MAT %GAP uses element Gap divided by Standard Cost Gap')
  assert.ok(warningMarkup.includes('20.00%'), 'STD Cost %Total uses Standard Cost Gap divided by REF Standard Cost')
  assert.match(visibleText(warningMarkup), /20\.00% Total/, 'STD Cost footer identifies its percentage as %Total')

  const selectedCostComparison = {
    ...warningComparison,
    elementGaps: { material: 0.5, labor: 0, burden: 0 },
    totalGap: 0.5
  }
  const selectedCostMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: warningComparison,
    selectedComparison: selectedCostComparison,
    selectedActive: true
  }))
  assert.match(selectedCostMarkup, /GAP[\s\S]*\(Selected\)/, 'Selected Comparison is secondary in the GAP header')
  assert.match(visibleText(selectedCostMarkup), /\+2\.20 \(\+0\.50\)/, 'Selected contribution is muted and parenthesized beside full Gap')
  assert.match(visibleText(selectedCostMarkup), /\(0\.00\)/, 'a real selected zero is shown as (0.00)')
  assert.doesNotMatch(selectedCostMarkup, /<th[^>]*>Selected<\/th>/, 'Selected is not a separate Cost column')
  const fullGapSlot = warningMarkup.match(/<span data-gap-slot="full"[^>]*>/)?.[0]
  const selectedGapFullSlot = selectedCostMarkup.match(/<span data-gap-slot="full"[^>]*>/)?.[0]
  assert.ok(fullGapSlot && selectedGapFullSlot)
  assert.equal(fullGapSlot, selectedGapFullSlot, 'Cost Full Gap keeps the same reserved grid slot when Selected activates')
  assert.match(warningMarkup, /data-gap-slot="selected" aria-hidden="true"[^>]*invisible/,
    'Cost reserves the secondary Selected slot before selection')
  assert.match(selectedCostMarkup, /data-gap-slot="selected" aria-hidden="false"/,
    'Selected becomes visible inside its reserved secondary slot')

  const wcComparison = routingComparisonForDisplay
  const wcMarkup = renderToStaticMarkup(React.createElement(wcView.WorkCenterProcessingTable, {
    comparison: wcComparison,
  }))
  assert.match(wcMarkup, /data-wc-scroll-body="true" class="min-h-0 flex-1 overflow-y-auto/, 'only the WC body owns the vertical scroller')
  assert.match(wcMarkup, />WC<\/th>[\s\S]*>REF<\/th>[\s\S]*>CUR<\/th>[\s\S]*>GAP<\/th>[\s\S]*>%GAP<\/th>/)
  assert.doesNotMatch(wcMarkup, /Selected|selected/i, 'WC has no Selected header, value, tooltip, or accessible text')
  assert.match(wcMarkup, /<th scope="row"[^>]*>Total<\/th>/, 'WC footer remains present outside the scrolling body')
  assert.match(visibleText(wcMarkup), /Total.*%/, 'WC footer visibly identifies its percentage as Total')
  assert.doesNotMatch(wcMarkup, /<th scope="row"[^>]*>[\s\S]*·/, 'WC identity does not repeat a verbose description')

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
      { key: 'material', label: 'Material', full: 9.31, selected: 4.2, color: '#0369a1', selectedColor: '#075985' },
      { key: 'labor', label: 'Labor', full: 4.42, selected: 0, color: '#b45309', selectedColor: '#92400e' },
      { key: 'burden', label: 'Burden', full: 2.32, selected: 1, color: '#6d28d9', selectedColor: '#5b21b6' }
    ]
    const proportionalChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: chartSegments, fullTotal: 16.05, selectedTotal: 4, selectedActive: true
    }))
    assert.match(proportionalChart, /data-gap-chart-mode="proportional"/)
    assert.doesNotMatch(proportionalChart, /<text\b/, 'MAT/LB/BD labels live in the Subheader legend, not inside the bar')
    assert.match(proportionalChart, /Material Gap \+9\.31\nSelected \(\+4\.20\)/, 'Selected chart tooltip has exactly two concise lines')
    assert.match(proportionalChart, /Labor Gap \+4\.42\nSelected \(0\.00\)/, 'Selected zero remains explicit in its element tooltip')
    const proportionalRects = [...proportionalChart.matchAll(/<rect\b[^>]*>/g)].map(([rect]) => rect)
    const contributionWidth = color => {
      const rect = proportionalRects.find(candidate => candidate.includes(`fill="${color}"`) && candidate.includes('fill-opacity="0.64"'))
      assert.ok(rect, `expected a proportional full-contribution segment for ${color}`)
      return Number(rect.match(/\bwidth="([\d.]+)"/)?.[1])
    }
    assertClose(contributionWidth('#0369a1') / 1000, 9.31 / 16.05, 'Material width must reflect its share of the full gap')
    assertClose(contributionWidth('#b45309') / 1000, 4.42 / 16.05, 'Labor width must reflect its share of the full gap')
    assertClose(contributionWidth('#6d28d9') / 1000, 2.32 / 16.05, 'Burden width must reflect its share of the full gap')
    const materialGroup = proportionalChart.match(/<g data-gap-element="material" data-selected-state="highlight"[^>]*>([\s\S]*?)<\/g>/)?.[0]
    assert.ok(materialGroup, 'selected Material remains a local element overlay')
    const materialSegment = materialGroup.match(/<rect data-full-gap-segment="true" x="([\d.]+)" y="7" width="([\d.]+)" height="18"[^>]*>/)
    const materialOverlay = materialGroup.match(/<rect data-selected-overlay="highlight" x="([\d.]+)" y="5" width="([\d.]+)" height="22"[^>]*>/)
    assert.ok(materialSegment && materialOverlay, 'full and selected Material portions render in the same owning segment')
    const fullMaterialX = Number(materialSegment[1])
    const fullMaterialWidth = Number(materialSegment[2])
    const selectedMaterialX = Number(materialOverlay[1])
    const selectedMaterialWidth = Number(materialOverlay[2])
    assert.ok(selectedMaterialWidth > 0 && selectedMaterialWidth < fullMaterialWidth,
      'Selected +4.20 inside Full +9.31 occupies only a partial highlight')
    assertClose(selectedMaterialWidth / fullMaterialWidth, 4.2 / 9.31,
      'Material Selected visual magnitude follows its absolute ratio to the owning Full element')
    assert.ok(selectedMaterialX >= fullMaterialX && selectedMaterialX + selectedMaterialWidth <= fullMaterialX + fullMaterialWidth,
      'the selected overlay remains bounded within its owning segment')
    assert.ok(proportionalChart.includes(`Selected Material Gap ${formatters.formatVariance(4.2, 2)}`))

    const fullOnlyChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: chartSegments.map(segment => ({ ...segment, selected: null })), fullTotal: 16.05, selectedTotal: null, selectedActive: false
    }))
    assert.match(fullOnlyChart, /Material Gap \+9\.31/)
    assert.doesNotMatch(fullOnlyChart, /Selected \(/, 'Full mode tooltip stays on one line')

    const signedOffsetChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: [
        { key: 'material', label: 'Material', full: 9, selected: 10, color: '#0369a1' },
        { key: 'labor', label: 'Labor', full: -4, selected: -1.2, color: '#b45309' },
        { key: 'burden', label: 'Burden', full: 2, selected: 0, color: '#6d28d9' }
      ], fullTotal: 7, selectedTotal: 10, selectedActive: true
    }))
    assert.match(signedOffsetChart, /data-gap-chart-mode="signed"/,
      'opposite-sign full component gaps preserve the signed chart')
    assert.ok(signedOffsetChart.includes([
      `Full Standard Cost Gap ${formatters.formatVariance(7, 4)}`,
      `Full Material Gap ${formatters.formatVariance(9, 2)}`,
      `Full Labor Gap ${formatters.formatVariance(-4, 2)}`,
      `Full Burden Gap ${formatters.formatVariance(2, 2)}`
    ].join('; ')))
    assert.ok(signedOffsetChart.includes(`Selected Material Gap ${formatters.formatVariance(10, 2)}`))
    assert.ok(signedOffsetChart.includes('Selected Labor Gap -1.20'))
    assert.ok(signedOffsetChart.includes('Selected Burden Gap 0.00'))
    assert.match(signedOffsetChart, /data-gap-element="material" data-selected-state="highlight"/)
    assert.match(signedOffsetChart, /data-gap-element="labor" data-selected-state="remove"/)
    assert.match(signedOffsetChart, /data-gap-element="burden" data-selected-state="normal"/)
    const laborGroup = signedOffsetChart.match(/<g data-gap-element="labor" data-selected-state="remove"[^>]*>([\s\S]*?)<\/g>/)?.[1]
    const laborFull = laborGroup?.match(/<rect data-full-gap-segment="true" x="([\d.]+)" y="7" width="([\d.]+)" height="18"[^>]*>/)
    const laborHatch = laborGroup?.match(/<rect data-selected-overlay="remove" x="([\d.]+)" y="5" width="([\d.]+)" height="22" fill="url\(/)
    assert.ok(laborFull && laborHatch, 'negative Selected treatment is drawn inside the owning Labor segment')
    assert.ok(Number(laborHatch[1]) >= Number(laborFull[1])
      && Number(laborHatch[1]) + Number(laborHatch[2]) <= Number(laborFull[1]) + Number(laborFull[2]),
      'negative Labor Selected treatment stays bounded by Labor’s signed segment instead of rebasing to global zero')
    assertClose(Number(laborHatch[2]) / Number(laborFull[2]), 1.2 / 4,
      'negative Selected hatch size reflects its own magnitude inside Labor')
    const zeroBurdenGroup = signedOffsetChart.match(/<g data-gap-element="burden" data-selected-state="normal"[^>]*>([\s\S]*?)<\/g>/)?.[1]
    assert.doesNotMatch(zeroBurdenGroup ?? '', /data-selected-overlay=/,
      'Selected net zero leaves the element Normal with no Selected overlay')
    assert.match(signedOffsetChart, /stroke-dasharray="2 2"/,
      'the signed full-gap chart keeps its shared zero baseline')
    assert.match(signedOffsetChart, /patternTransform="rotate\(45\)"/, 'negative Selected net uses a same-color hatch treatment')
    assert.match(signedOffsetChart, /Selected \(-1\.20\)/, 'negative Selected amount remains exact in the tooltip')
    const pageMarkup = renderToStaticMarkup(React.createElement(CostBreakdownPage))
    const pageText = visibleText(pageMarkup)
    assert.match(pageText, /Standard Cost Gap \+1\.20/)
    assert.doesNotMatch(pageText, /Full \+1\.20|Selected \+1\.20/)
    assert.match(pageText, /\|Gap\| High → Low/)
    assert.match(pageText, /STD Cost/)
    assert.match(pageText, /BOM \(0\)/)
    assert.match(pageText, /RTG \(1\)/)
    assert.match(pageText, /ALL \(1\)/, 'ALL count is the sum of BOM and Routing findings')
    assert.match(pageMarkup, /aria-label="Work Center comparison"/)
    assert.match(pageText, /WC-REF/)
    assert.match(pageText, /WC-CUR/)
    const subheader = pageMarkup.match(/<header aria-label="Cost Breakdown subheader"[\s\S]*?<\/header>/)?.[0]
    assert.ok(subheader, 'the subheader remains a distinct fixed row')
    const subheaderText = visibleText(subheader)
    const orderedLabels = ['Standard Cost Gap', 'MAT', 'LB', 'BD', 'BOM', 'RTG', 'ALL', 'Status (All)', '|Gap| High → Low']
    const labelPositions = orderedLabels.map(label => subheaderText.indexOf(label))
    assert.ok(labelPositions.every(position => position >= 0), 'the subheader exposes every finalized control and chart label')
    assert.deepEqual(labelPositions, [...labelPositions].sort((left, right) => left - right),
      'the single subheader row follows the finalized left-to-right order')
    assert.doesNotMatch(subheader, /<text\b/, 'the bar contains no MAT/LB/BD text labels')
    const collapseButton = subheader.match(/<button[^>]*aria-controls="cost-breakdown-overview-panels"[^>]*>[\s\S]*?<\/button>/)?.[0]
    assert.ok(collapseButton)
    assert.match(collapseButton, /aria-label="Collapse Cost and Work Center sections"/)
    assert.equal(visibleText(collapseButton), '', 'Collapse is icon-only')
    assert.match(subheader, /aria-expanded="true"/)
    assert.match(pageMarkup, /id="cost-breakdown-overview-panels" class="[^\"]*grid[^\"]*"/,
      'Cost and Work Center panels remain visible by default below the subheader')
    assert.match(pageMarkup, /aria-label="Cost comparison" class="h-44/)
    assert.match(pageMarkup, /aria-label="Work Center comparison" class="flex h-44/)
    assert.match(pageMarkup, /data-wc-scroll-body="true" class="min-h-0 flex-1 overflow-y-auto/)
    assert.match(pageMarkup, /aria-label="Deselect Routing finding Cutting"/,
      'CBD finding selection remains available in the Candidates table')
    assert.equal([...pageMarkup.matchAll(/data-gap-chart-mode=/g)].length, 1,
      'the subheader must render one full-baseline Gap Bar with the Selected contribution inside it')
    assert.match(pageMarkup, /data-gap-chart-mode="unavailable"/,
      'unavailable full component gaps remain unavailable instead of being treated as zero')
    assert.match(pageMarkup, /aria-label="Finding type filter"/)
    assert.match(pageMarkup, /aria-label="Status filter, Status \(All\)"/)
    assert.match(pageMarkup, /aria-label="Reapply sort: \|Gap\| High → Low"/)
    assert.match(pageMarkup, /aria-label="Choose sort mode; current mode \|Gap\| High → Low"/)
    assert.doesNotMatch(pageMarkup, /<details\b/, 'Status and Sort are overlay popovers, not in-flow details')
    assert.doesNotMatch(pageText, /Select scope|Edit scope|Full Comparison/)
  } finally {
    delete globalThis.__CBD_PARAMETER_TEST_STATE__
  }

  console.log('Cost Breakdown parameter cost effect verification passed.')
} finally {
  await vite.close()
}
