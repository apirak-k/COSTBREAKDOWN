import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

function detailRowMarkup(markup, label) {
  const rows = [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => new RegExp(`<th[^>]*>${label}<\\/th>`).test(candidate))
  assert.ok(row, `expected a ${label} row`)
  return row
}

function detailRow(markup, label) {
  return [...detailRowMarkup(markup, label).matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(match => visibleText(match[1]))
}

function candidateMainRow(markup, identityHeader, identity, status) {
  const rows = [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => candidate.includes(`aria-label="${identityHeader}: ${identity}; status ${status}`))
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
    manualOrders: { bom: null, routing: null },
    onManualOrderChange() {},
    onResetManualOrderHistory() {},
    onToggleFinding() {}
  }))
}

function extractElement(markup, start, tag) {
  const tokens = new RegExp('<' + tag + '\\b[^>]*>|</' + tag + '>', 'g')
  tokens.lastIndex = start
  let depth = 0
  let match
  while ((match = tokens.exec(markup))) {
    if (match[0].startsWith('</' + tag)) depth -= 1
    else depth += 1
    if (depth === 0) return markup.slice(start, tokens.lastIndex)
  }
  assert.fail('expected a complete ' + tag + ' element')
}

try {
  const [effects, comparisonCore, comparisonStatus, formatters, bomView, routingView, snapshotView, wcView, itemizedView, candidateView] = await Promise.all([
    vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/comparison-status.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/ItemizedComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
  ])
  const { COST_ELEMENT_COLORS } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/cost-element-colors.ts')

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
  assert.deepEqual(detailRow(bomMarkup, 'Reference → Current').slice(3, 7), [
    `${formatters.formatNumber(1, 4)} → ${formatters.formatNumber(2, 4)}`,
    `${formatters.formatNumber(10, 4)} → ${formatters.formatNumber(6, 4)}`,
    formatters.formatPercent(0.1, 2), ''
  ], 'BOM Reference → Current context combines both snapshots and keeps unchanged factors to one value')
  assert.deepEqual(detailRow(bomMarkup, 'Parameter Cost Effect').slice(3, 7), [
    formatters.formatVariance(bomPositive.effects.usage, 4), formatters.formatVariance(bomPositive.effects.price, 4),
    formatters.formatVariance(bomPositive.effects.loss, 4), formatters.formatVariance(2.2, 4)
  ], 'BOM Parameter Cost Effect row reuses LMDI and carries the same actual material gap as the main row')
  assert.match(bomMarkup, /border-l-2 border-slate-300/, 'BOM details have a restrained parent-row grouping accent')
  assert.match(bomMarkup, /border-t border-slate-200 bg-white[\s\S]*border-b border-slate-200 bg-white font-bold/,
    'BOM detail is one white group with a stronger Parameter Cost Effect row')
  assert.match(detailRowMarkup(bomMarkup, 'Parameter Cost Effect'), /font-bold/)
  assert.doesNotMatch(bomMarkup, /<th[^>]*>Reference<\/th>|<th[^>]*>Current<\/th>|<th[^>]*>Parameter Effect<\/th>|<th[^>]*>EFFECT<\/th>/,
    'BOM uses exactly Reference → Current and Parameter Cost Effect detail labels')
  assert.doesNotMatch(bomMarkup, /\bUnit\b|% Parent|%Parent/)
  assert.doesNotMatch(bomMarkup, /Changed fields|<table\b|Root Cause|\bAction\b|Controllable/,
    'BOM detail is not an independent nested table and has no duplicated/RCA fields')
  const bomCandidateMarkup = renderItemized(itemizedView, bomComparisonForDisplay, bomRefSnapshot, bomCurSnapshot)
  const bomTable = bomCandidateMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  assert.ok(bomTable, 'BOM Candidates render as one actual table')
  const bomHeader = bomTable.match(/<thead\b[\s\S]*?<tr\b[\s\S]*?<\/tr>/)?.[0]
  assert.ok(bomHeader)
  assert.deepEqual([...bomHeader.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1])),
    ['#', 'Bill of Material', 'Status', 'Δ Usage', 'Δ Price', 'Δ Loss', 'Gap', '%GAP', 'Reorder', 'Details'],
    'BOM main row explicitly identifies parameter deltas')
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

  const addedBOMReference = costSnapshot('reference')
  const addedBOMCurrent = costSnapshot('current', {
    bom: [bom('added-bom', { usage: 1.5, price: 7, loss: 0.02 })]
  })
  const addedBOMComparison = comparisonCore.compareSnapshots(addedBOMReference, addedBOMCurrent)
  const addedBOMMarkup = renderItemized(itemizedView, addedBOMComparison, addedBOMReference, addedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(addedBOMMarkup, 'Bill of Material', 'Material', 'ADDED')).slice(3, 6), [
    `CUR ${formatters.formatNumber(1.5, 4)}`, `CUR ${formatters.formatNumber(7, 4)}`, `CUR ${formatters.formatPercent(0.02, 2)}`
  ], 'ADDED BOM parameters show actual Current-side values')

  const removedBOMReference = costSnapshot('reference', {
    bom: [bom('removed-bom', { usage: 2.5, price: 9, loss: 0.08 })]
  })
  const removedBOMCurrent = costSnapshot('current')
  const removedBOMComparison = comparisonCore.compareSnapshots(removedBOMReference, removedBOMCurrent)
  const removedBOMMarkup = renderItemized(itemizedView, removedBOMComparison, removedBOMReference, removedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(removedBOMMarkup, 'Bill of Material', 'Material', 'REMOVED')).slice(3, 6), [
    `REF ${formatters.formatNumber(2.5, 4)}`, `REF ${formatters.formatNumber(9, 4)}`, `REF ${formatters.formatPercent(0.08, 2)}`
  ], 'REMOVED BOM parameters show actual Reference-side values')

  const missingAddedBOMCurrent = costSnapshot('current', {
    bom: [bom('added-bom-missing', { usage: null, price: 7, loss: 0.02 })]
  })
  const missingAddedBOMComparison = comparisonCore.compareSnapshots(addedBOMReference, missingAddedBOMCurrent)
  const missingAddedBOMMarkup = renderItemized(itemizedView, missingAddedBOMComparison, addedBOMReference, missingAddedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(missingAddedBOMMarkup, 'Bill of Material', 'Material', 'ADDED')).slice(3, 6), [
    '—', `CUR ${formatters.formatNumber(7, 4)}`, `CUR ${formatters.formatPercent(0.02, 2)}`
  ], 'a genuinely missing Current-side BOM parameter remains unavailable')

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
  assert.deepEqual(detailRow(routingMarkup, 'Reference → Current').slice(3, 9), [
    formatters.formatNumber(1, 4), formatters.formatNumber(10, 4), formatters.formatPercent(1, 2),
    `${formatters.formatNumber(10, 4)} → ${formatters.formatNumber(20, 4)}`,
    `${formatters.formatNumber(5, 4)} → ${formatters.formatNumber(7, 4)}`, ''
  ], 'Routing Reference → Current context includes snapshot-owned Work Center rates without redundant conversion costs')
  const routingParameterEffectGap = sum(Object.values(rateChanged.effects.conversion))
  assert.deepEqual(detailRow(routingMarkup, 'Parameter Cost Effect').slice(3, 9), [
    formatters.formatVariance(rateChanged.effects.conversion.manning, 4),
    formatters.formatVariance(rateChanged.effects.conversion.capacity, 4),
    formatters.formatVariance(rateChanged.effects.conversion.yield, 4),
    formatters.formatVariance(rateChanged.effects.conversion.laborRate, 4),
    formatters.formatVariance(rateChanged.effects.conversion.burdenRate, 4),
    formatters.formatVariance(routingComparison.routingFindings[0].costEffect.gap.total, 4)
  ], 'Routing Parameter Cost Effect exposes all five existing LMDI factors and the actual Candidate Gap')
  const routingEffectRowMarkup = detailRowMarkup(routingMarkup, 'Parameter Cost Effect')
  assert.match(routingEffectRowMarkup, /font-bold/)
  assertClose(routingParameterEffectGap, 1.2,
    'the unrounded five-factor Routing Parameter Cost Effect reconciles to the Candidate Main Gap')
  assert.doesNotMatch(routingMarkup, /Total Effect|<th[^>]*>Cost Effect<\/th>/,
    'Routing details do not add a Total Effect row')
  assert.equal([...routingMarkup.matchAll(/<tr\b/g)].length, 2, 'Routing detail contains exactly two conceptual subrows')
  assert.doesNotMatch(routingMarkup, /Rate Effect|% Parent|%Parent|Labor Gap|Burden Gap|Conversion Gap|Changed fields|Root Cause|\bAction\b|Controllable/)
  const routingCandidateMarkup = renderItemized(itemizedView, routingComparisonForDisplay, routingRefSnapshot, routingCurSnapshot, 'rtg')
  assert.match(routingCandidateMarkup, /Routing/)
  assert.match(routingCandidateMarkup, /Manning/)
  assert.match(routingCandidateMarkup, /Capacity/)
  assert.match(routingCandidateMarkup, /Yield/)
  assert.doesNotMatch(routingCandidateMarkup, /Labor Gap|Burden Gap|Conversion Gap|% Parent|%Parent/)
  const routingTable = routingCandidateMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  assert.ok(routingTable)
  const routingHeader = routingTable.match(/<thead\b[\s\S]*?<tr\b[\s\S]*?<\/tr>/)?.[0]
  assert.ok(routingHeader)
  assert.deepEqual([...routingHeader.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1])),
    ['#', 'Routing', 'Status', 'Δ Manning', 'Δ Capacity', 'Δ Yield', 'Δ LB Rate', 'Δ BD Rate', 'Gap', '%GAP', 'Reorder', 'Details'],
    'Routing main row exposes five delta parameters with Drag immediately before the rightmost Chevron')
  const routingMainCells = gridCellText(candidateMainRow(routingCandidateMarkup, 'Routing', 'Cutting', 'CHANGED'))
  assert.equal(routingMainCells[8], formatters.formatVariance(1.2, 4),
    'Routing Main Gap remains its Candidate Conversion Cost Gap')
  assert.deepEqual(routingMainCells.slice(6, 8), [formatters.formatVariance(10, 4), formatters.formatVariance(2, 4)],
    'Routing main LB/BD rate deltas use the actual Work Center rate on each snapshot side')

  const routingCombinedCurrent = costSnapshot('current', {
    routing: [route('route-cur', 'WC-CUR', { manning: 2 })],
    rates: [rate('rate-cur', 'WC-CUR', 20, 7)]
  })
  const routingCombinedComparison = comparisonCore.compareSnapshots(routingRefSnapshot, routingCombinedCurrent)
  const routingCombinedFinding = routingCombinedComparison.routingFindings[0]
  const routingCombinedEffect = effects.calculateRoutingParameterCostEffects(
    { manning: 1, capacity: 10, yield: 1, laborRate: 10, burdenRate: 5 },
    { manning: 2, capacity: 10, yield: 1, laborRate: 20, burdenRate: 7 }
  )
  assert.equal(routingCombinedEffect.status, 'available')
  const combinedParameterEffectGap = sum(Object.values(routingCombinedEffect.effects.conversion))
  assertClose(combinedParameterEffectGap, routingCombinedFinding.costEffect.gap.total,
    'all five Routing Parameter Cost Effect contributions reconcile to the existing combined Candidate Gap')
  const routingCombinedMarkup = renderRouting(routingView, routingCombinedComparison, routingRefSnapshot, routingCombinedCurrent)
  assert.equal(detailRow(routingCombinedMarkup, 'Parameter Cost Effect')[8], formatters.formatVariance(routingCombinedFinding.costEffect.gap.total, 4))

  const addedRoutingReference = costSnapshot('reference')
  const addedRoutingCurrent = costSnapshot('current', {
    routing: [route('added-route', 'WC-1', { manning: 3, capacity: 12, yield: 0.9 })],
    rates: [rate('added-rate', 'WC-1', 15, 6)]
  })
  const addedRoutingComparison = comparisonCore.compareSnapshots(addedRoutingReference, addedRoutingCurrent)
  const addedRoutingMarkup = renderItemized(itemizedView, addedRoutingComparison, addedRoutingReference, addedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(addedRoutingMarkup, 'Routing', 'Cutting', 'ADDED')).slice(3, 8), [
    `CUR ${formatters.formatNumber(3, 4)}`, `CUR ${formatters.formatNumber(12, 4)}`, `CUR ${formatters.formatPercent(0.9, 2)}`,
    `CUR ${formatters.formatNumber(15, 4)}`, `CUR ${formatters.formatNumber(6, 4)}`
  ], 'ADDED Routing parameters and rates show actual Current-side values')

  const removedRoutingReference = costSnapshot('reference', {
    routing: [route('removed-route', 'WC-1', { manning: 4, capacity: 20, yield: 0.95 })],
    rates: [rate('removed-rate', 'WC-1', 40, 14)]
  })
  const removedRoutingCurrent = costSnapshot('current')
  const removedRoutingComparison = comparisonCore.compareSnapshots(removedRoutingReference, removedRoutingCurrent)
  const removedRoutingMarkup = renderItemized(itemizedView, removedRoutingComparison, removedRoutingReference, removedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(removedRoutingMarkup, 'Routing', 'Cutting', 'REMOVED')).slice(3, 8), [
    `REF ${formatters.formatNumber(4, 4)}`, `REF ${formatters.formatNumber(20, 4)}`, `REF ${formatters.formatPercent(0.95, 2)}`,
    `REF ${formatters.formatNumber(40, 4)}`, `REF ${formatters.formatNumber(14, 4)}`
  ], 'REMOVED Routing parameters and rates show actual Reference-side values')

  const missingAddedRoutingCurrent = costSnapshot('current', {
    routing: [route('added-route-missing', 'WC-1', { manning: 3, capacity: null, yield: 0.9 })],
    rates: [rate('missing-added-rate', 'WC-1', null, 8)]
  })
  const missingAddedRoutingComparison = comparisonCore.compareSnapshots(addedRoutingReference, missingAddedRoutingCurrent)
  const missingAddedRoutingMarkup = renderItemized(itemizedView, missingAddedRoutingComparison, addedRoutingReference, missingAddedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(missingAddedRoutingMarkup, 'Routing', 'Cutting', 'ADDED')).slice(3, 8), [
    `CUR ${formatters.formatNumber(3, 4)}`, '—', `CUR ${formatters.formatPercent(0.9, 2)}`, '—', `CUR ${formatters.formatNumber(8, 4)}`
  ], 'missing Current-side Routing parameter and rate values remain unavailable while valid values show')

  const ambiguousAddedRoutingCurrent = costSnapshot('current', {
    routing: [route('ambiguous-added-route', 'WC-1')],
    rates: [rate('ambiguous-rate-a', 'WC-1', 15, 6), rate('ambiguous-rate-b', 'WC-1', 16, 7)]
  })
  const ambiguousAddedRoutingComparison = comparisonCore.compareSnapshots(addedRoutingReference, ambiguousAddedRoutingCurrent)
  const ambiguousAddedRoutingMarkup = renderItemized(itemizedView, ambiguousAddedRoutingComparison, addedRoutingReference, ambiguousAddedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(ambiguousAddedRoutingMarkup, 'Routing', 'Cutting', 'ADDED')).slice(6, 8), ['—', '—'],
    'ambiguous snapshot-side Work Center rates remain unavailable in Routing main columns')

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
  assert.notEqual(allColumnWidths[0], allColumnWidths[1], 'BOM and Routing use type-specific grids for their different factor counts')

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
    const mainRow = candidateMainRow(markup, 'Bill of Material', 'Material', testCase.name)
    assert.equal(mainRow.includes('aria-expanded="false"'), testCase.expandable,
      `only CHANGED BOM rows expose a collapsed Detail state (${testCase.name})`)
    assert.equal(/lucide-chevron-(?:right|down)/.test(mainRow), testCase.expandable,
      `only CHANGED BOM rows show the chevron (${testCase.name})`)
    if (!testCase.expandable) assert.doesNotMatch(mainRow, /activate to (?:expand|collapse) detail/,
      `${testCase.name} BOM rows do not claim to expand`)
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
    const mainRow = candidateMainRow(markup, 'Routing', 'Cutting', testCase.name)
    assert.equal(mainRow.includes('aria-expanded="false"'), testCase.expandable,
      `only CHANGED Routing rows expose a collapsed Detail state (${testCase.name})`)
    assert.equal(/lucide-chevron-(?:right|down)/.test(mainRow), testCase.expandable,
      `only CHANGED Routing rows show the chevron (${testCase.name})`)
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
  assert.match(warningMarkup, /aria-label="Cost Element"/)
  assert.match(warningMarkup, /<caption class="sr-only">Cost Element/)
  assert.match(warningMarkup, /<th scope="col"[^>]*>Cost Element<\/th>[\s\S]*>REF<\/th>[\s\S]*>CUR<\/th>[\s\S]*>GAP<\/span>[\s\S]*>Selected<\/span>[\s\S]*>%GAP<\/th>/)
  assert.deepEqual([...warningMarkup.matchAll(/<tr\b/g)].length, 5, 'Cost has exactly a header, three element rows, and a footer')
  assert.match(warningMarkup, />Material<\/th>[\s\S]*>Labor<\/th>[\s\S]*>Burden<\/th>[\s\S]*>Standard Cost<\/th>/)
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
  assert.match(selectedCostMarkup, /GAP[\s\S]*>Selected<\/span>/, 'Selected Comparison is a plain secondary GAP header slot')
  assert.match(visibleText(selectedCostMarkup), /\+2\.20\s+\+0\.50/, 'Selected contribution is muted in the fixed secondary slot beside full Gap')
  assert.match(visibleText(selectedCostMarkup), /Labor\s+0\.00\s+0\.00\s+0\.00\s+0\.00/,
    'a real selected zero is shown directly in the fixed secondary slot')
  assert.doesNotMatch(selectedCostMarkup, /\(Selected\)|Selected \([+-]?\d|data-gap-slot="selected"[^>]*>\s*\([+-]?\d/,
    'Selected header and values have no surrounding parentheses')
  assert.doesNotMatch(selectedCostMarkup, /<th[^>]*>Selected<\/th>/, 'Selected is not a separate Cost column')
  const fullGapSlot = warningMarkup.match(/<span data-gap-slot="full"[^>]*>/)?.[0]
  const selectedGapFullSlot = selectedCostMarkup.match(/<span data-gap-slot="full"[^>]*>/)?.[0]
  assert.ok(fullGapSlot && selectedGapFullSlot)
  assert.equal(fullGapSlot, selectedGapFullSlot, 'Cost Full Gap keeps the same reserved grid slot when Selected activates')
  assert.match(warningMarkup, /data-gap-slot="selected" aria-hidden="true"[^>]*invisible/,
    'Cost reserves the secondary Selected slot before selection')
  assert.match(selectedCostMarkup, /data-gap-slot="selected" aria-hidden="false"/,
    'Selected becomes visible inside its reserved secondary slot')
  assert.equal([...selectedCostMarkup.matchAll(/data-selected-gap-part="(?:open|value|close)"/g)].length, 0,
    'Selected values use plain numeric text without punctuation nodes')
  assert.match(selectedCostMarkup, /data-gap-slot="selected"[^>]*class="[^"]*w-\[9ch\][^"]*text-right[^"]*text-\[10px\][^"]*font-normal[^"]*text-slate-500[^"]*tabular-nums/,
    'Selected uses a fixed-width, right-aligned, tabular, neutral secondary slot')
  assert.doesNotMatch(selectedCostMarkup, /data-gap-slot="selected"[^>]*class="[^"]*text-(?:rose|red|green|emerald)-|data-gap-slot="selected"[^>]*class="[^"]*font-(?:bold|semibold)/,
    'Selected has no semantic red/green color or bold emphasis')
  assert.doesNotMatch(selectedCostMarkup, /data-gap-slot="selected"[^>]*class="[^"]*w-\[\d+px\]/,
    'Selected no longer depends on a magic fixed pixel width')
  assert.match(selectedCostMarkup, /data-gap-slot="selected"[^>]*aria-hidden="false"[^>]*class="[^"]*">\+0\.50<\/span>/,
    'Selected value is displayed directly in its aligned fixed secondary slot')

  const wcComparison = routingComparisonForDisplay
  const wcMarkup = renderToStaticMarkup(React.createElement(wcView.WorkCenterProcessingTable, {
    comparison: wcComparison,
  }))
  assert.match(wcMarkup, /<section aria-label="Work Center"[^>]*data-cbd-overview-panel="work-center"/,
    'Work Center participates in the paired overview')
  assert.match(wcMarkup, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-y-auto/,
    'Work Center data rows alone use the internal vertical scroll region')
  assert.match(wcMarkup, /style="width:calc\(100% \+ var\(--cbd-wc-scrollbar-width, 0px\)\)"/,
    'Work Center body rows preserve full-width column tracks around the scrollbar')
  const wcSource = readFileSync(new URL('../src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx', import.meta.url), 'utf8')
  assert.match(wcSource, /body\.style\.setProperty\('--cbd-wc-scrollbar-width', `\$\{body\.offsetWidth - body\.clientWidth\}px`\)/,
    'Work Center measures scrollbar width rather than hardcoding header/footer compensation')
  assert.doesNotMatch(wcMarkup, /h-\[30px\]|pr-\[6px\]|scrollbar-gutter:\s*stable/,
    'Work Center has no private footer height or painted scrollbar-gutter compensation')
  const wcTableStart = wcMarkup.indexOf('<div role="table"')
  assert.ok(wcTableStart >= 0)
  const wcTable = extractElement(wcMarkup, wcTableStart, 'div')
  const wcBodyMarker = wcTable.indexOf('data-wc-scroll-body="true"')
  assert.ok(wcBodyMarker >= 0)
  const wcBodyStart = wcTable.lastIndexOf('<div', wcBodyMarker)
  const wcBody = extractElement(wcTable, wcBodyStart, 'div')
  const wcBodyEnd = wcBodyStart + wcBody.length
  const wcFooterGroup = wcTable.indexOf('<div role="rowgroup"', wcBodyEnd)
  assert.ok(wcTable.indexOf('role="columnheader"') < wcBodyStart && wcFooterGroup >= wcBodyEnd,
    'the header and Total footer are outside the body scroller')
  assert.deepEqual([...wcMarkup.matchAll(/role="columnheader"[^>]*>([^<]*)<\/div>/g)].map(([, label]) => label),
    ['Work Center', 'REF', 'CUR', 'GAP', '%GAP'])
  assert.equal([...wcMarkup.matchAll(/role="rowgroup"/g)].length, 3,
    'WC header, body, and footer remain separate aligned grid sections')
  assert.doesNotMatch(wcMarkup, /Selected|selected/i, 'WC has no Selected header, value, tooltip, or accessible text')
  assert.ok([...wcMarkup.matchAll(/role="rowheader"[^>]*>Total<\/div>/g)].length === 1,
    'WC footer remains present outside the scrolling body')
  assert.match(visibleText(wcMarkup), /Total.*%/, 'WC footer visibly identifies its percentage as Total')
  assert.doesNotMatch(wcMarkup, /<th scope="row"[^>]*>[\s\S]*·/, 'WC identity does not repeat a verbose description')

  let expanded = candidateView.toggleCandidateDetail(new Set(), 'bom', 'A')
  expanded = candidateView.toggleCandidateDetail(expanded, 'bom', 'B')
  expanded = candidateView.toggleCandidateDetail(expanded, 'routing', 'A')
  assert.equal(expanded.size, 3, 'BOM and Routing Details, including multiple rows, stay open together')
  expanded = candidateView.toggleCandidateDetail(expanded, 'bom', 'A')
  assert.equal(expanded.has(candidateView.candidateDetailKey('bom', 'A')), false)
  assert.equal(expanded.has(candidateView.candidateDetailKey('bom', 'B')), true, 'closing one row leaves other Details open')
  assert.equal(expanded.has(candidateView.candidateDetailKey('routing', 'A')), true, 'a Routing Detail remains open when a BOM Detail closes')
  assert.deepEqual(candidateView.reorderCandidateRowKeys(['A', 'B', 'C'], 'A', 'C', true), ['B', 'C', 'A'],
    'HTML drag reorder moves a row below its target')
  assert.deepEqual(candidateView.reorderCandidateRowKeys(['A', 'B', 'C'], 'C', 'A', false), ['C', 'A', 'B'],
    'HTML drag reorder moves a row above its target')
  assert.deepEqual(candidateView.reorderCandidateRowKeys(['A', 'B', 'C'], 'missing', 'B', true), ['A', 'B', 'C'],
    'HTML drag reorder safely ignores stale or unavailable row keys')
  assert.deepEqual(candidateView.reorderCandidateRowKeys(['A', 'B', 'C', 'D', 'E'], 'C', 'E', true, ['B', 'C']), ['A', 'D', 'E', 'B', 'C'],
    'selected BOM or Routing rows move together and preserve their relative order')
  const itemizedSource = readFileSync(new URL('../src/features/cost-breakdown/components/ItemizedComparisonTable.tsx', import.meta.url), 'utf8')
  assert.match(itemizedSource, /previous\.sortMode === sortMode && previous\.sortResetToken === sortResetToken\) return[\s\S]*sortStateRef\.current = \{ sortMode, sortResetToken \}[\s\S]*onResetManualOrderHistory\(\)[\s\S]*setExpandedRows\(new Set\(\)\)/,
    'Sort mode changes and reapply reset the shared manual reorder history and every expanded Detail')
  assert.match(itemizedSource, /const handlePointerDown = \(event: PointerEvent\)[\s\S]*?candidateRegionRef\.current\?\.contains\(event\.target\)[\s\S]*?setExpandedRows\(new Set\(\)\)[\s\S]*?document\.addEventListener\('pointerdown', handlePointerDown\)/,
    'outside pointerdown collapses all Candidate Details while interactions inside the Candidate region are ignored')
  assert.match(itemizedSource, /const handleKeyDown = \(event: KeyboardEvent\)[\s\S]*?event\.key === 'Escape'\) setExpandedRows\(new Set\(\)\)[\s\S]*?document\.addEventListener\('keydown', handleKeyDown\)/,
    'Escape collapses all Candidate Details')

  const pageSource = readFileSync(new URL('../src/features/cost-breakdown/CostBreakdownPage.tsx', import.meta.url), 'utf8')
  const sortMenuSource = pageSource.match(/label=\{`Choose sort mode[\s\S]*?<\/CostBreakdownPopover>/)?.[0]
  assert.ok(sortMenuSource, 'Sort options use the shared overlay component')
  assert.match(sortMenuSource, /COMPARISON_SORT_OPTIONS\.map\(option => <button/,
    'Sort dropdown renders only the three shared comparison sort options as plain buttons')
  assert.doesNotMatch(sortMenuSource, /type="radio"|checked=|aria-checked|aria-pressed|<svg|✓|Check|Circle/,
    'Sort dropdown has no persistent selection indicator')

  const popoverSource = readFileSync(new URL('../src/features/cost-breakdown/components/CostBreakdownPopover.tsx', import.meta.url), 'utf8')
  assert.match(popoverSource, /document\.addEventListener\('pointerdown'/, 'temporary CBD popovers dismiss on outside pointerdown')
  assert.match(popoverSource, /event\.key === 'Escape'/, 'temporary CBD popovers dismiss on Escape')
  assert.match(popoverSource, /activeCBDPopoverDismiss/, 'opening one temporary popover dismisses the previous popover')
  const dismissBody = popoverSource.match(/const dismissWithoutFocus = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\)/)?.[1]
  assert.ok(dismissBody)
  assert.match(dismissBody, /setOpen\(false\)/)
  assert.doesNotMatch(dismissBody, /setComparisonView|setSortMode|setSortResetToken|applySelectedComparison|clearSelectedComparison/,
    'outside/Escape dismissal closes the temporary overlay without changing its value or Selected Comparison')

  const candidateSource = readFileSync(new URL('../src/features/cost-breakdown/components/CandidateFindingsTable.tsx', import.meta.url), 'utf8')
  const readCandidateGrid = name => {
    const declaration = candidateSource.match(new RegExp(`const ${name} = (\\[[^\\]]+\\])`))
    assert.ok(declaration, `${name} must define a Candidate table grid`)
    return [...declaration[1].matchAll(/'([\d.]+)%'/g)].map(([, width]) => Number(width))
  }
  const bomGrid = readCandidateGrid('BOM_COLUMN_WIDTHS')
  const routingGrid = readCandidateGrid('ROUTING_COLUMN_WIDTHS')
  assert.deepEqual(bomGrid.slice(0, 3), routingGrid.slice(0, 3),
    'BOM and Routing share the #, identity, and Status column axes')
  assert.deepEqual(bomGrid.slice(-4), routingGrid.slice(-4),
    'BOM and Routing share the Gap, %GAP, reorder, and detail column axes')
  const bomParameterWidth = bomGrid.slice(3, -4).reduce((sum, width) => sum + width, 0)
  const routingParameterWidth = routingGrid.slice(3, -4).reduce((sum, width) => sum + width, 0)
  assert.ok(Math.abs(bomParameterWidth - routingParameterWidth) < 1e-8,
    'BOM and Routing parameter groups occupy the same total width')
  assert.match(candidateSource, /<div className="overflow-x-auto border border-slate-200">[\s\S]*<table className=\{`w-full \$\{isBOM \? 'min-w-\[1040px\]' : 'min-w-\[1260px\]'\} table-fixed/,
    'BOM and Routing tables keep a local responsive fallback with enough minimum width to avoid narrow-column collisions')
  assert.match(candidateSource, /const canExpand = status === 'CHANGED'\s+const isExpanded = canExpand && expandedRows\.has/,
    'even stale expansion state cannot show Details for a non-CHANGED finding')
  assert.match(candidateSource, /h-8 w-8 shrink-0 items-center justify-center rounded-sm p-0 font-mono[^']*tabular-nums/,
    'Candidate row numbers use a fixed square with tabular numerals')
  assert.doesNotMatch(candidateSource, /✓|aria-label=\{`\$\{isExpanded \? 'Collapse' : 'Expand'\}/,
    'Candidate selector has no checkmark and chevron is not an independent button')
  const reorderButton = candidateSource.match(/<button\s+type="button"\s+draggable[\s\S]*?<\/button>/)?.[0]
  assert.ok(reorderButton, 'each Candidate row has a dedicated reorder handle')
  assert.match(reorderButton, /draggable[\s\S]*onDragStart=\{event => startReorder\(event, row, key\)\}[\s\S]*onDragEnd=\{finishReorder\}/,
    'Master Data-style drag handle starts an HTML drag and always clears transient drag state')
  assert.match(candidateSource, /const previewDrop = \(event: React\.DragEvent<HTMLTableRowElement>[\s\S]*?event\.preventDefault\(\)[\s\S]*?getBoundingClientRect\(\)/,
    'drag-over only previews a before/after drop position')
  assert.match(candidateSource, /const dropOnRow = \(event: React\.DragEvent<HTMLTableRowElement>[\s\S]*?reorderCandidateRowKeys\([\s\S]*?onManualOrderChange\(nextKeys\)[\s\S]*?finishReorder\(\)/,
    'the completed drop commits one view-only reorder and then clears drag state')
  assert.doesNotMatch(candidateSource, /onPointerMove|setPointerCapture|elementFromPoint/,
    'CBD reorder does not continuously commit on pointer movement')
  assert.match(candidateSource, /const ROUTING_COLUMN_WIDTHS = \[[^\]]+\]/,
    'the five-factor Routing table has a dedicated shared width grid for main and detail rows')

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
    assert.deepEqual(COST_ELEMENT_COLORS, {
      material: '#4F7CAC', labor: '#D89B45', burden: '#8067B7', standardCost: '#334155'
    }, 'all CBD Cost element colors come from the finalized shared palette')
    const chartSegments = [
      { key: 'material', label: 'Material', full: 9.31, selected: 4.2, color: COST_ELEMENT_COLORS.material },
      { key: 'labor', label: 'Labor', full: 4.42, selected: 0, color: COST_ELEMENT_COLORS.labor },
      { key: 'burden', label: 'Burden', full: 2.32, selected: 1, color: COST_ELEMENT_COLORS.burden }
    ]
    const proportionalChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: chartSegments, fullTotal: 16.05, selectedTotal: 4, selectedActive: true
    }))
    assert.match(proportionalChart, /data-gap-chart-mode="proportional"/)
    assert.doesNotMatch(proportionalChart, /<text\b/, 'MAT/LB/BD labels live in the Subheader legend, not inside the bar')
    const chartContainerClass = proportionalChart.match(/<div role="img"[^>]*class="([^"]*)"/)?.[1]
    assert.ok(chartContainerClass)
    assert.doesNotMatch(chartContainerClass, /\bborder\b|bg-slate-100/,
      'the Subheader owns the boundary and the Gap Bar has no redundant inner frame')
    assert.match(proportionalChart, /Material Gap \+9\.31\nSelected \+4\.20/, 'Selected chart tooltip has two concise lines with a direct numeric value')
    assert.match(proportionalChart, /Labor Gap \+4\.42\nSelected 0\.00/, 'Selected zero remains explicit in its element tooltip')
    const proportionalRects = [...proportionalChart.matchAll(/<rect\b[^>]*>/g)].map(([rect]) => rect)
    const contributionWidth = color => {
      const rect = proportionalRects.find(candidate => candidate.includes(`fill="${color}"`) && candidate.includes('fill-opacity="0.64"'))
      assert.ok(rect, `expected a proportional full-contribution segment for ${color}`)
      return Number(rect.match(/\bwidth="([\d.]+)"/)?.[1])
    }
    assertClose(contributionWidth(COST_ELEMENT_COLORS.material) / 1000, 9.31 / 16.05, 'Material width must reflect its share of the full gap')
    assertClose(contributionWidth(COST_ELEMENT_COLORS.labor) / 1000, 4.42 / 16.05, 'Labor width must reflect its share of the full gap')
    assertClose(contributionWidth(COST_ELEMENT_COLORS.burden) / 1000, 2.32 / 16.05, 'Burden width must reflect its share of the full gap')
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
        { key: 'material', label: 'Material', full: 9, selected: 10, color: COST_ELEMENT_COLORS.material },
        { key: 'labor', label: 'Labor', full: -4, selected: -1.2, color: COST_ELEMENT_COLORS.labor },
        { key: 'burden', label: 'Burden', full: 2, selected: 0, color: COST_ELEMENT_COLORS.burden }
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
    assert.match(signedOffsetChart, /Selected -1\.20/, 'negative Selected amount remains exact and unparenthesized in the tooltip')
    const pageMarkup = renderToStaticMarkup(React.createElement(CostBreakdownPage, {
      manualOrders: { bom: null, routing: null },
      onManualOrderChange() {},
      onResetManualOrderHistory() {}
    }))
    const pageText = visibleText(pageMarkup)
    assert.match(pageText, /Standard Cost Gap \+1\.20/)
    assert.doesNotMatch(pageText, /Full \+1\.20|Selected \+1\.20/)
    assert.match(pageText, /\|Gap\| High → Low/)
    assert.match(pageText, /Standard Cost/)
    assert.match(pageText, /BOM \(0\)/)
    assert.match(pageText, /RTG \(1\)/)
    assert.match(pageText, /ALL \(1\)/, 'ALL count is the sum of BOM and Routing findings')
    assert.match(pageMarkup, /aria-label="Work Center"/)
    assert.match(pageText, /WC-REF/)
    assert.match(pageText, /WC-CUR/)
    const subheader = pageMarkup.match(/<header aria-label="Cost Breakdown subheader"[\s\S]*?<\/header>/)?.[0]
    assert.ok(subheader, 'the subheader remains a distinct fixed row')
    assert.match(subheader, /class="shrink-0 overflow-x-auto border border-slate-300 bg-white"/,
      'CBD subheader uses the same quiet border and white framing as the Master Data toolbar')
    assert.match(subheader, /flex min-w-\[1000px\] flex-nowrap items-center gap-1\.5 px-1\.5 py-1/,
      'CBD controls use compact Master Data toolbar spacing in one row')
    assert.doesNotMatch(subheader, /w-\[204px\]|w-\[142px\]/,
      'the Standard Cost Gap and legend use their content width instead of leaving a fixed dead-space gap')
    assert.match(subheader, /data-gap-chart-wrapper="true" class="min-w-\[140px\] flex-1"/,
      'the Gap Bar flexes into the space freed by the natural-width left-side information')
    const subheaderText = visibleText(subheader)
    const orderedLabels = ['Standard Cost Gap', 'MAT', 'LB', 'BD', 'BOM', 'RTG', 'ALL', 'Status', '|Gap| High → Low']
    const labelPositions = orderedLabels.map(label => subheaderText.indexOf(label))
    assert.ok(labelPositions.every(position => position >= 0),
      `the subheader exposes every finalized control and chart label: ${JSON.stringify(orderedLabels)} in ${subheaderText}`)
    assert.deepEqual(labelPositions, [...labelPositions].sort((left, right) => left - right),
      'the single subheader row follows the finalized left-to-right order')
    assert.doesNotMatch(subheader, /<text\b/, 'the bar contains no MAT/LB/BD text labels')
    const collapseButton = subheader.match(/<button[^>]*aria-controls="cost-breakdown-overview-panels"[^>]*>[\s\S]*?<\/button>/)?.[0]
    assert.ok(collapseButton)
    assert.match(collapseButton, /aria-label="Collapse Cost Element and Work Center sections"/)
    assert.equal(visibleText(collapseButton), '', 'Collapse is icon-only')
    assert.match(collapseButton, /aria-expanded="true"/)
    assert.match(collapseButton, /data-cbd-overview-indicator="true"/,
      'the disclosure uses a dedicated plain triangle indicator')
    const collapseClass = collapseButton.match(/\bclass="([^"]*)"/)?.[1] ?? ''
    assert.doesNotMatch(collapseClass, /\bborder\b|bg-white|rounded/,
      'the disclosure indicator has no boxed button chrome')
    assert.match(subheader, /aria-expanded="true"/)
    assert.match(subheader, /data-cbd-overview-click-area="true"/,
      'safe empty subheader space participates in the same overview disclosure')
    assert.equal([...pageMarkup.matchAll(/data-cbd-overview-pair="true"/g)].length, 1,
      'Cost Element and Work Center share one paired overview frame')
    assert.match(pageMarkup, /data-cbd-overview-pair="true"[^>]*data-cbd-overview-columns="equal"/,
      'the overview layout explicitly uses equal Cost Element and Work Center columns')
    assert.equal([...pageMarkup.matchAll(/data-cbd-overview-divider="true"/g)].length, 1,
      'the paired overview uses one center divider')
    const overviewPairIndex = pageMarkup.indexOf('data-cbd-overview-pair="true"')
    const overviewPair = extractElement(pageMarkup, pageMarkup.lastIndexOf('<div', overviewPairIndex), 'div')
    assert.ok(overviewPair.includes('aria-label="Cost Element"') && overviewPair.includes('aria-label="Work Center"'),
      'the paired frame contains both equal summary peers')
  const pageRootClass = pageMarkup.match(/^<div[^>]*class="([^"]+)"/)?.[1]
  const candidateRegionClass = pageMarkup.match(/<div role="region" aria-label="Candidate workspace" tabindex="0" class="([^"]+)"/)?.[1]
  assert.ok(pageRootClass && candidateRegionClass)
  assert.match(pageRootClass, /flex min-h-full min-w-0 flex-col[^"]*overflow-x-clip/,
    'CBD content grows naturally within the shared Main scroll area')
  assert.doesNotMatch(pageRootClass, /overflow-y-auto|overflow-y-scroll|overflow-auto/,
    'CBD page content does not add a nested vertical scroll owner')
  const stickyShellClass = pageMarkup.match(/data-cbd-sticky-shell="true" class="([^"]+)"/)?.[1]
  assert.ok(stickyShellClass)
  assert.match(stickyShellClass, /lg:sticky[^\"]*lg:top-0/,
    'Subheader and overview remain stuck to the top of Main while it scrolls')
  assert.ok(pageMarkup.indexOf('aria-label="Cost Breakdown subheader"') < pageMarkup.indexOf('id="cost-breakdown-overview-panels"')
    && pageMarkup.indexOf('id="cost-breakdown-overview-panels"') < pageMarkup.indexOf('aria-label="Candidate workspace"'),
  'the sticky shell contains the Subheader and summary above the normal-flow Candidate region')
  assert.match(pageMarkup, /aria-label="Cost Element"[^>]*data-cbd-overview-panel="cost"/,
    'Cost Element fills the bounded overview height')
  assert.match(pageMarkup, /aria-label="Work Center"[^>]*data-cbd-overview-panel="work-center"/,
    'Work Center matches the bounded Cost Element height')
  assert.match(pageMarkup, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-y-auto/,
    'Work Center row body scrolls internally while its aligned header/footer stay outside the body')
  assert.doesNotMatch(candidateRegionClass, /overflow-y-auto|overflow-y-scroll|overflow-auto|flex-1|min-h-0/,
    'Candidate remains natural flow without a competing vertical scroller')
  const appLayoutSource = readFileSync(new URL('../src/shared/layout/AppLayout.tsx', import.meta.url), 'utf8')
  assert.match(appLayoutSource, /className=\{isCostBreakdown\s*\?\s*'[^']*overflow-y-auto[^']*'\s*:/,
    'the shared Main owns CBD vertical scrolling')
  assert.doesNotMatch(appLayoutSource, /isCostBreakdown[\s\S]*?overflow-y-auto[^']*lg:overflow-y-hidden/,
    'CBD Main remains the vertical scroll owner at desktop widths')
  assert.match(appLayoutSource, /app-workspace-frame \$\{isCostBreakdown \? 'min-h-full min-w-0'/,
    'the CBD workspace grows naturally inside the bounded shared shell')
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
    assert.ok([...subheader.matchAll(/lucide lucide-chevron-down/g)].length >= 2,
      'Status and Sort dropdowns retain visible chevrons')
    assert.doesNotMatch(subheader, /▾/, 'dropdown affordances do not rely on a text triangle')
    assert.match(subheader, /w-\[5ch\] text-left font-mono tabular-nums/,
      'Status count and All reserve one fixed-width slot')
    assert.match(subheader, /aria-haspopup="dialog"/, 'Status and Sort remain overlay popovers')
    const sortGroup = subheader.match(/<div role="group" aria-label="Sort findings; current mode \|Gap\| High → Low" class="([^"]*)">([\s\S]*?)<\/div>/)
    assert.ok(sortGroup, 'Sort is one grouped split control')
    assert.match(sortGroup[1], /inline-flex h-8 shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-white/,
      'the Sort split control has one shared frame and stable dimensions')
    const sortMainButton = sortGroup[2].match(/<button type="button" aria-label="Reapply sort:[^>]*class="([^"]*)"/)
    const sortArrowButton = sortGroup[2].match(/<button type="button" aria-label="Choose sort mode;[^>]*class="([^"]*)"/)
    assert.ok(sortMainButton && sortArrowButton)
    assert.doesNotMatch(sortMainButton[1], /\bborder\b/, 'Sort main segment does not draw a second outer border')
    assert.match(sortArrowButton[1], /border-l border-slate-300/, 'Sort menu arrow uses the single internal divider')
    assert.doesNotMatch(sortArrowButton[1], /border-r|border-y/, 'Sort menu arrow does not add a duplicate outer edge')
    const pageSource = readFileSync(new URL('../src/features/cost-breakdown/CostBreakdownPage.tsx', import.meta.url), 'utf8')
    assert.match(pageSource, /onClick=\{\(\) => \{ onResetManualOrderHistory\(\); setSortResetToken\(token => token \+ 1\) \}\}/,
      'the main Sort segment restores sorted order and resets both reorder history stacks')
    assert.match(pageSource, /onClick=\{\(\) => \{ setSortMode\(option\.value\); onResetManualOrderHistory\(\); setSortResetToken\(token => token \+ 1\); close\(\) \}\}/,
      'choosing a sort mode resets reorder history, clears Details through the reset token, and closes the overlay')
    assert.doesNotMatch(pageMarkup, /<h2[^>]*>Candidates<\/h2>|status view ·/,
      'the redundant Candidate heading and status/sort subtitle are removed')
    assert.match(pageMarkup, /class="space-y-3"/, 'BOM and Routing tables have a restrained vertical gap')
    assert.doesNotMatch(pageText, /Select scope|Edit scope|Full Comparison/)
  } finally {
    delete globalThis.__CBD_PARAMETER_TEST_STATE__
  }

  console.log('Cost Breakdown parameter cost effect verification passed.')
} finally {
  await vite.close()
}
