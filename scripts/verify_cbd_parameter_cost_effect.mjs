import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup as renderStaticMarkup } from 'react-dom/server'
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

const { SelectedNumber, SelectedValueProvider } = await vite.ssrLoadModule('/src/shared/ui/selected-value.tsx')
const visibleText = markup => {
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
  const hiddenTags = []
  let text = ''
  for (const token of markup.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (!token.startsWith('<')) {
      if (hiddenTags.length === 0) text += token
      continue
    }
    const closingTag = token.match(/^<\/([a-z][\w:-]*)/i)?.[1]?.toLowerCase()
    if (hiddenTags.length > 0) {
      if (closingTag) {
        const matchingIndex = hiddenTags.lastIndexOf(closingTag)
        if (matchingIndex >= 0) hiddenTags.length = matchingIndex
      } else {
        const openingTag = token.match(/^<([a-z][\w:-]*)\b/i)?.[1]?.toLowerCase()
        if (openingTag && !voidTags.has(openingTag) && !/\/\s*>$/.test(token)) hiddenTags.push(openingTag)
      }
      continue
    }
    const hiddenOpeningTag = token.match(/^<([a-z][\w:-]*)\b(?=[^>]*\baria-hidden=(?:"true"|'true'))/i)?.[1]?.toLowerCase()
    if (hiddenOpeningTag && !voidTags.has(hiddenOpeningTag) && !/\/\s*>$/.test(token)) hiddenTags.push(hiddenOpeningTag)
  }
  return text.replace(/\s+/g, ' ').trim()
}
const renderToStaticMarkup = element => renderStaticMarkup(React.createElement(
  SelectedValueProvider,
  { scopeKey: 'cbd-verifier' },
  element
))
const assertClose = (actual, expected, message = `${actual} is not close to ${expected}`) => {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9, message)
}
const sum = values => values.reduce((total, value) => total + value, 0)

function detailRowMarkup(markup, label) {
  const rows = [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
  const row = rows.find(candidate => [...candidate.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
    .some(match => visibleText(match[1]) === label))
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

function assertExpansionRowContract(mainRow, identityHeader, identity, status, expandable) {
  const rowAttributes = mainRow.match(/<tr\b[^>]*>/)?.[0] ?? ''
  const rowLabel = rowAttributes.match(/\baria-label="([^"]*)"/)?.[1] ?? ''
  assert.ok(rowAttributes, `expected a ${identityHeader} row element`)
  assert.equal(rowAttributes.includes('aria-expanded="false"'), expandable,
    `only CHANGED ${identityHeader} rows expose a collapsed expansion state (${status})`)
  assert.equal(/\btabindex="0"/.test(rowAttributes), expandable,
    `only CHANGED ${identityHeader} rows are keyboard-focusable expansion targets (${status})`)
  assert.equal(rowLabel.includes('activate to expand detail'), expandable,
    `only CHANGED ${identityHeader} rows announce their expansion action (${status})`)
  if (expandable) {
    assert.equal(rowLabel, `${identityHeader}: ${identity}; status ${status}; activate to expand detail`,
      `${identityHeader} row label names its expand action`)
  }
  assert.doesNotMatch(mainRow, /<button\b[^>]*(?:aria-label|title)="[^"]*\b(?:expand|collapse)\b[^"]*"[^>]*>/i,
    `${status} ${identityHeader} row does not add a separate expand/collapse button`)
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
    row: rows[0],
    beforeRoleLabel: 'Reference',
    afterRoleLabel: 'Current',
    selectionIdPrefix: 'cbd:legacy-verifier:bom',
    detailId: 'bom-detail-test'
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
    currentRates: current.rates,
    beforeRoleLabel: 'Reference',
    afterRoleLabel: 'Current',
    selectionIdPrefix: 'cbd:legacy-verifier:routing',
    detailId: 'routing-detail-test'
  }))
}

function renderItemized(module, comparison, reference, current, typeTab = 'bom') {
  return renderToStaticMarkup(React.createElement(module.ItemizedComparisonTable, {
    comparison,
    pair: {
      beforeRole: reference.comparisonRole,
      afterRole: current.comparisonRole,
      before: reference,
      after: current,
      fingerprint: JSON.stringify([reference.comparisonRole, current.comparisonRole, reference.id, current.id])
    },
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
  const [effects, comparisonCore, comparisonStatus, formatters, numericDisplay, routingDetail, bomView, routingView, snapshotView, wcView, itemizedView, candidateView] = await Promise.all([
    vite.ssrLoadModule('/src/core/calculations/parameter-cost-effect.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/comparison-status.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/shared/ui/numeric-display.ts'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-routing-detail.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/ItemizedComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
  ])
  const { COST_ELEMENT_COLORS } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/cost-element-colors.ts')

  const tinyNegativeEffect = -5.67e-18
  assert.equal(formatters.formatVariance(0), '0.00', 'exact zero keeps the neutral zero presentation')
  assert.equal(formatters.formatVariance(tinyNegativeEffect), '-0.00',
    'a real negative effect keeps its direction even when it rounds below display precision')
  assert.equal(formatters.getVarianceClass(tinyNegativeEffect), 'text-emerald-600 font-bold',
    'cost-effect color follows the semantic sign rather than a display threshold')
  assert.equal(numericDisplay.formatBusinessNumber(tinyNegativeEffect, { signPositive: true }), '-5.67E-18',
    'shared adaptive display preserves a genuine tiny negative effect and its sign')
  const tinyEffectMarkup = renderToStaticMarkup(React.createElement(SelectedNumber, {
    numericColumn: true,
    signPositive: true,
    value: tinyNegativeEffect,
    'aria-label': 'Tiny negative effect'
  }))
  assert.equal(visibleText(tinyEffectMarkup), '-5.67E-18',
    'numeric-column SelectedNumber uses the shared adaptive presentation for genuine tiny effects')
  assert.match(tinyEffectMarkup, /data-numeric-presentation="scientific"/,
    'numeric-column SelectedNumber marks a genuine tiny effect as scientific presentation')
  const formattedPercentageMarkup = renderToStaticMarkup(React.createElement(SelectedNumber, {
    numericColumn: true,
    percentage: true,
    value: 0.5,
    'aria-label': 'Formatted percentage'
  }, '50.00%'))
  assert.equal(visibleText(formattedPercentageMarkup), '50.00%',
    'numeric-column SelectedNumber preserves caller formatting and renders its percent suffix once')

  const bomReference = { usage: 1, price: 10, loss: 0.1 }
  const bomPositiveCurrent = { usage: 2, price: 6, loss: 0.1 }
  const bomPositive = effects.calculateBOMParameterCostEffects(bomReference, bomPositiveCurrent)
  assert.equal(bomPositive.status, 'available')
  assertClose(sum(Object.values(bomPositive.effects)), 2.2, 'BOM effects must reconcile to the unrounded +2.2 gap')
  assert.ok(bomPositive.effects.usage > 2.2, 'BOM usage contribution must exceed the net gap when price offsets it')
  assert.ok(bomPositive.effects.price < 0, 'BOM price contribution must preserve an offsetting negative effect')
  assert.equal(bomPositive.effects.loss, 0,
    'BOM reconciliation residue must not be assigned to Loss when Loss is unchanged')

  const bomZeroLoss = effects.calculateBOMParameterCostEffects(
    { usage: 2, price: 10, loss: 0 },
    { usage: 2, price: 12, loss: 0 }
  )
  assert.deepEqual(bomZeroLoss, { status: 'available', effects: { usage: 0, price: 4, loss: 0 } },
    'valid zero Loss keeps BOM attribution available and assigns the exact +4 cost gap to Price')
  assert.equal(effects.calculateBOMParameterCostEffects(
    { usage: 2, price: 10, loss: -0.001 },
    { usage: 2, price: 12, loss: 0 }
  ).status, 'unavailable', 'negative BOM Loss remains invalid')
  assert.equal(effects.calculateBOMParameterCostEffects(
    { usage: 2, price: 10, loss: 1.001 },
    { usage: 2, price: 12, loss: 0 }
  ).status, 'unavailable', 'BOM Loss above the existing 100% maximum remains invalid')

  const bomMachineNoise = effects.calculateBOMParameterCostEffects(
    bomReference,
    { ...bomReference, price: 10.000000000000004 }
  )
  assert.equal(bomMachineNoise.status, 'available')
  assert.deepEqual(bomMachineNoise.effects, { usage: 0, price: 0, loss: 0 },
    'ULP-equivalent BOM inputs do not fabricate parameter cost effects')
  const bomUnreconciledMachineNoise = effects.calculateBOMParameterCostEffects(
    { usage: 1, price: 1, loss: 1 },
    { usage: 1.0000000000000009, price: 1.0000000000000009, loss: 1.0000000000000009 }
  )
  assert.equal(bomUnreconciledMachineNoise.status, 'unavailable',
    'BOM does not report zero effects when equivalent inputs produce an unreconciled cost gap')

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
      const zeroResult = effects.calculateBOMParameterCostEffects(reference, current)
      if (key === 'loss') {
        assert.equal(zeroResult.status, 'available', `valid BOM zero ${side}.loss remains attributable`)
        if (zeroResult.status === 'available') assertClose(sum(Object.values(zeroResult.effects)),
          current.usage * current.price * (1 + current.loss) - reference.usage * reference.price * (1 + reference.loss),
          `BOM zero ${side}.loss effects reconcile to the raw cost gap`)
      } else {
        assert.equal(zeroResult.status, 'unavailable', `BOM zero ${side}.${key} is unavailable`)
      }
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

  const routingUnreconciledMachineNoise = effects.calculateRoutingParameterCostEffects(
    { manning: 1, capacity: 1, yield: 1, laborRate: 1, burdenRate: 1 },
    { manning: 1.0000000000000009, capacity: 1, yield: 1, laborRate: 1.0000000000000009, burdenRate: 1.0000000000000009 }
  )
  assert.equal(routingUnreconciledMachineNoise.status, 'available',
    'Routing values outside the narrow residue rule remain real inputs and receive reconciled effects')
  if (routingUnreconciledMachineNoise.status === 'available') {
    assert.notEqual(routingUnreconciledMachineNoise.effects.labor.manning, 0,
      'a Manning difference beyond the narrow residue rule keeps its PCE')
    assert.notEqual(routingUnreconciledMachineNoise.effects.labor.laborRate, 0,
      'a Labor Rate difference beyond the narrow residue rule keeps its PCE')
  }

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
  assert.deepEqual(detailRow(bomMarkup, 'Reference').slice(3, 7), [
    formatters.formatNumber(1, 2), formatters.formatNumber(10, 2), formatters.formatPercent(0.1, 2), ''
  ], 'BOM Reference detail row shows the Before snapshot values in their own role row')
  assert.deepEqual(detailRow(bomMarkup, 'Current').slice(3, 7), [
    formatters.formatNumber(2, 2), formatters.formatNumber(6, 2), formatters.formatPercent(0.1, 2), ''
  ], 'BOM Current detail row shows the After snapshot values in their own role row')
  assert.deepEqual(detailRow(bomMarkup, 'Parameter Cost Effect').slice(3, 7), [
    formatters.formatVariance(bomPositive.effects.usage, 4), formatters.formatVariance(bomPositive.effects.price, 4),
    formatters.formatVariance(bomPositive.effects.loss, 4), formatters.formatVariance(2.2, 4)
  ], 'BOM Parameter Cost Effect row reuses LMDI and carries the same actual material gap as the main row')
  assert.match(bomMarkup, /<span class="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">/,
    'BOM detail identity is inset under its parent row with the shared hierarchy guide')
  const bomReferenceRow = detailRowMarkup(bomMarkup, 'Reference')
  const bomCurrentRow = detailRowMarkup(bomMarkup, 'Current')
  const bomEffectRow = detailRowMarkup(bomMarkup, 'Parameter Cost Effect')
  assert.ok([bomReferenceRow, bomCurrentRow, bomEffectRow].every(row => /class="[^"]*\bbg-white\b/.test(row)),
    'BOM Reference, Current, and Parameter Cost Effect rows remain in one white group')
  for (const [role, row] of [['Current', bomCurrentRow], ['Parameter Cost Effect', bomEffectRow]]) {
    assert.match(row, /background-size:92% 1px;\s*background-position:center top/,
      `BOM ${role} row keeps its centered 92% inset separator`)
  }
  assert.equal([...bomMarkup.matchAll(/background-size:92% 1px;\s*background-position:center top/g)].length, 2,
    'BOM details preserve both inset separators between Reference, Current, and Parameter Cost Effect')
  assert.match(bomEffectRow, /border-b border-slate-200/,
    'the stronger Parameter Cost Effect row retains its final bottom rule')
  assert.match(bomEffectRow, /font-bold/)
  assert.deepEqual([...bomMarkup.matchAll(/<th scope="row"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>[\s\S]*?<\/th>/g)].map(([, label]) => label.trim()),
    ['Reference', 'Current', 'Parameter Cost Effect'], 'BOM details show the two active role labels followed by Parameter Cost Effect')
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
    formatters.formatVariance(2.2, 4), '+100.00%'
  ], 'BOM main cells show parameter gaps separately from Candidate Cost Gap and its signed Standard Cost percentage')
  assert.match(candidateMainRow(bomCandidateMarkup, 'Bill of Material', 'Material', 'CHANGED'), /text-amber-700/)
  assert.doesNotMatch(candidateMainRow(bomCandidateMarkup, 'Bill of Material', 'Material', 'CHANGED'), /rounded-full|bg-amber/,
    'status is colored text without pill or badge background styling')
  assert.doesNotMatch(bomCandidateMarkup, /\bUnit\b|% Parent|%Parent/)
  const overContributionMarkup = renderItemized(itemizedView, { ...bomComparisonForDisplay, totalGap: 1 }, bomRefSnapshot, bomCurSnapshot)
  assert.match(overContributionMarkup, /220\.00%/, 'Candidate contribution above 100 percent remains visible without clamping')
  assert.match(visibleText(overContributionMarkup), /\+220\.00%/, 'positive Candidate contribution above 100 percent retains its sign without clamping')

  const addedBOMReference = costSnapshot('reference')
  const addedBOMCurrent = costSnapshot('current', {
    bom: [bom('added-bom', { usage: 1.5, price: 7, loss: 0.02 })]
  })
  const addedBOMComparison = comparisonCore.compareSnapshots(addedBOMReference, addedBOMCurrent)
  const addedBOMMarkup = renderItemized(itemizedView, addedBOMComparison, addedBOMReference, addedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(addedBOMMarkup, 'Bill of Material', 'Material', 'ADDED')).slice(3, 6), [
    formatters.formatNumber(1.5, 4), formatters.formatNumber(7, 4), formatters.formatPercent(0.02, 2)
  ], 'ADDED BOM parameters show present-side values without a side prefix')

  const removedBOMReference = costSnapshot('reference', {
    bom: [bom('removed-bom', { usage: 2.5, price: 9, loss: 0.08 })]
  })
  const removedBOMCurrent = costSnapshot('current')
  const removedBOMComparison = comparisonCore.compareSnapshots(removedBOMReference, removedBOMCurrent)
  const removedBOMMarkup = renderItemized(itemizedView, removedBOMComparison, removedBOMReference, removedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(removedBOMMarkup, 'Bill of Material', 'Material', 'REMOVED')).slice(3, 6), [
    formatters.formatNumber(2.5, 4), formatters.formatNumber(9, 4), formatters.formatPercent(0.08, 2)
  ], 'REMOVED BOM parameters show present-side values without a side prefix')

  const missingAddedBOMCurrent = costSnapshot('current', {
    bom: [bom('added-bom-missing', { usage: null, price: 7, loss: 0.02 })]
  })
  const missingAddedBOMComparison = comparisonCore.compareSnapshots(addedBOMReference, missingAddedBOMCurrent)
  const missingAddedBOMMarkup = renderItemized(itemizedView, missingAddedBOMComparison, addedBOMReference, missingAddedBOMCurrent)
  assert.deepEqual(gridCellText(candidateMainRow(missingAddedBOMMarkup, 'Bill of Material', 'Material', 'ADDED')).slice(3, 6), [
    '—', formatters.formatNumber(7, 4), formatters.formatPercent(0.02, 2)
  ], 'a genuinely missing After-side BOM parameter remains unavailable')

  const annealing = (id, { capacity = 2520, burdenRate = 138.48, burdenRateExact = '138.48' } = {}) => costSnapshot(id, {
    routing: [route(`${id}-annealing`, 'WC-ANNEAL', {
      processName: 'Annealing', manning: 1, capacity, yield: 0.7,
      exactDecimalInputs: { manning: '1', capacity: String(capacity), yield: '70' }
    })],
    rates: [{
      ...rate(`${id}-anneal-rate`, 'WC-ANNEAL', 105.29, burdenRate),
      exactDecimalInputs: { laborRate: '105.29', burdenRate: burdenRateExact }
    }]
  })
  const exactAnnealingInput = (burdenRate = 138.48, burdenRateExact = '138.48') => ({
    manning: 1, capacity: 2520, yield: 0.7, laborRate: 105.29, burdenRate,
    exactInputs: { manning: '1', capacity: '2520', yield: '70', laborRate: '105.29', burdenRate: burdenRateExact }
  })
  const identicalAnnealingReference = annealing('reference')
  const identicalAnnealingCurrent = annealing('current')
  const referenceAnnealing = identicalAnnealingReference.routing[0]
  const currentAnnealing = identicalAnnealingCurrent.routing[0]
  const referenceResolvedRate = routingDetail.resolveSnapshotRoutingRate(referenceAnnealing, identicalAnnealingReference.rates)
  const currentResolvedRate = routingDetail.resolveSnapshotRoutingRate(currentAnnealing, identicalAnnealingCurrent.rates)
  const identicalAnnealingDetail = routingDetail.calculateSnapshotRoutingDetail(
    { reference: referenceAnnealing, current: currentAnnealing },
    identicalAnnealingReference.rates,
    identicalAnnealingCurrent.rates
  )
  assert.deepEqual({
    reference: {
      workCenterId: referenceAnnealing.workCenterId,
      manning: referenceAnnealing.manning,
      capacity: referenceAnnealing.capacity,
      yield: referenceAnnealing.yield,
      exactDecimalInputs: referenceAnnealing.exactDecimalInputs
    },
    current: {
      workCenterId: currentAnnealing.workCenterId,
      manning: currentAnnealing.manning,
      capacity: currentAnnealing.capacity,
      yield: currentAnnealing.yield,
      exactDecimalInputs: currentAnnealing.exactDecimalInputs
    }
  }, {
    reference: {
      workCenterId: 'WC-ANNEAL', manning: 1, capacity: 2520, yield: 0.7,
      exactDecimalInputs: { manning: '1', capacity: '2520', yield: '70' }
    },
    current: {
      workCenterId: 'WC-ANNEAL', manning: 1, capacity: 2520, yield: 0.7,
      exactDecimalInputs: { manning: '1', capacity: '2520', yield: '70' }
    }
  }, 'first-divergence trace: Routing identities, Number projections, and exact sidecars match before rate resolution')
  assert.deepEqual({
    reference: referenceResolvedRate && {
      code: referenceResolvedRate.workCenterCode,
      laborRate: referenceResolvedRate.laborRate,
      burdenRate: referenceResolvedRate.burdenRate,
      exactDecimalInputs: referenceResolvedRate.exactDecimalInputs
    },
    current: currentResolvedRate && {
      code: currentResolvedRate.workCenterCode,
      laborRate: currentResolvedRate.laborRate,
      burdenRate: currentResolvedRate.burdenRate,
      exactDecimalInputs: currentResolvedRate.exactDecimalInputs
    }
  }, {
    reference: { code: 'WC-ANNEAL', laborRate: 105.29, burdenRate: 138.48, exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.48' } },
    current: { code: 'WC-ANNEAL', laborRate: 105.29, burdenRate: 138.48, exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.48' } }
  }, 'first-divergence trace: each side resolves the same authoritative Work Center rate identity and exact values')
  for (const [referenceKey, currentKey] of [
    ['referenceRuntime', 'currentRuntime'],
    ['referenceLaborCost', 'currentLaborCost'],
    ['referenceBurdenCost', 'currentBurdenCost'],
    ['referenceTotal', 'currentTotal']
  ]) {
    const referenceValue = identicalAnnealingDetail.exactValues?.[referenceKey]
    const currentValue = identicalAnnealingDetail.exactValues?.[currentKey]
    assert.ok(referenceValue && currentValue, `first-divergence trace exposes exact ${referenceKey}/${currentKey}`)
    assert.equal(referenceValue, currentValue, `first-divergence trace keeps exact ${referenceKey}/${currentKey} identical`)
  }
  assert.equal(identicalAnnealingDetail.exactValues?.totalGap, '0',
    'first-divergence trace: exact runtime, labor, burden, total, and Reference/Current gap remain identical')
  const identicalAnnealingComparison = comparisonCore.compareSnapshots(identicalAnnealingReference, identicalAnnealingCurrent)
  const identicalAnnealingFinding = identicalAnnealingComparison.routingFindings[0]
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(identicalAnnealingFinding), 'UNCHANGED',
    'identical Annealing inputs and effective Work Center rates stay UNCHANGED')
  assert.deepEqual(identicalAnnealingFinding.changeFlags, { movedWorkCenter: false, changedInputs: false, changedRate: false },
    'classification first diverges only when business change flags are derived; the exact source comparison is false for every flag')
  assert.deepEqual(identicalAnnealingFinding.fieldDiffs, {}, 'identical exact Routing fields produce no field differences')
  assert.deepEqual(identicalAnnealingFinding.costEffect.gap, { material: 0, labor: 0, burden: 0, total: 0 },
    'identical exact Routing inputs produce exact-zero labor, burden, and total Gaps')
  const identicalExactReference = exactAnnealingInput()
  const identicalExactCurrent = exactAnnealingInput()
  const identicalAnnealingEffects = effects.calculateRoutingParameterCostEffects(
    identicalExactReference, identicalExactCurrent
  )
  assert.equal(identicalAnnealingEffects.status, 'available')
  assert.deepEqual(identicalAnnealingEffects.effects.conversion, {
    manning: 0, capacity: 0, yield: 0, laborRate: 0, burdenRate: 0
  }, 'identical exact Routing inputs assign exact zero to every Parameter Cost Effect factor')
  const identicalChangedKeys = Object.keys(identicalExactReference.exactInputs).filter(key =>
    identicalExactReference.exactInputs[key] !== identicalExactCurrent.exactInputs[key])
  assert.deepEqual(identicalChangedKeys, [], 'exact attribution considers no Routing factor changed')
  assert.equal(Object.values(identicalAnnealingEffects.effects.conversion).reduce((total, value) => total + value, 0), 0,
    'identical exact factor effects have zero reconciliation residual')

  const capacityAnnealingCurrent = annealing('current', { capacity: 2600 })
  const capacityAnnealingComparison = comparisonCore.compareSnapshots(identicalAnnealingReference, capacityAnnealingCurrent)
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(capacityAnnealingComparison.routingFindings[0]), 'CHANGED',
    'an actual Capacity change remains CHANGED')
  assert.ok(capacityAnnealingComparison.routingFindings[0].costEffect.gap.total < 0,
    'the 2520 to 2600 Capacity change reduces Conversion Cost')

  const rateAnnealingCurrent = annealing('current', { burdenRate: 140, burdenRateExact: '140.00' })
  const rateAnnealingComparison = comparisonCore.compareSnapshots(identicalAnnealingReference, rateAnnealingCurrent)
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(rateAnnealingComparison.routingFindings[0]), 'CHANGED',
    'an actual resolved Burden Rate change makes the affected Process CHANGED')
  assert.equal(rateAnnealingComparison.routingFindings[0].changeFlags.changedRate, true,
    'Routing rate change is attributed from the resolved Work Center rate values')
  assert.ok(rateAnnealingComparison.routingFindings[0].costEffect.gap.burden > 0,
    'a higher Burden Rate produces a positive burden cost effect')

  const tinyRateAnnealingCurrent = annealing('current', { burdenRate: 138.48, burdenRateExact: '138.480000000000001' })
  const tinyRateAnnealingComparison = comparisonCore.compareSnapshots(identicalAnnealingReference, tinyRateAnnealingCurrent)
  const tinyRateFinding = tinyRateAnnealingComparison.routingFindings[0]
  assert.equal(comparisonStatus.getCanonicalComparisonStatus(tinyRateFinding), 'CHANGED',
    'an exact rate change remains real when its JavaScript Number projection is unchanged')
  assert.ok(tinyRateFinding.costEffect.gap.burden > 0,
    'the exact rate change retains its positive nonzero burden Gap')
  const tinyRateReference = exactAnnealingInput()
  const tinyRateCurrent = exactAnnealingInput(138.48, '138.480000000000001')
  const tinyRateEffects = effects.calculateRoutingParameterCostEffects(tinyRateReference, tinyRateCurrent)
  const tinyRateChangedKeys = Object.keys(tinyRateReference.exactInputs).filter(key =>
    tinyRateReference.exactInputs[key] !== tinyRateCurrent.exactInputs[key])
  assert.deepEqual(tinyRateChangedKeys, ['burdenRate'],
    'the critical sub-Number precision scenario has only Burden Rate in its exact changed-factor set')
  assert.equal(tinyRateEffects.status, 'available', 'the intentionally tiny exact rate change remains available for attribution')
  assert.ok(tinyRateEffects.effects.conversion.burdenRate > 0,
    'the exact positive Burden Rate change receives its own positive Parameter Cost Effect')
  for (const unchangedFactor of ['manning', 'capacity', 'yield', 'laborRate']) {
    assert.equal(tinyRateEffects.effects.conversion[unchangedFactor], 0,
      `the unchanged ${unchangedFactor} factor receives no floating decomposition residue`)
  }
  const tinyRateMarkup = renderItemized(itemizedView, tinyRateAnnealingComparison,
    identicalAnnealingReference, tinyRateAnnealingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(tinyRateMarkup, 'Routing', 'Annealing', 'CHANGED')).slice(6, 8), [
    '0.00', '+1.00E-15'
  ], 'Candidate rate delta uses adaptive notation for a genuine tiny exact difference')

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
  assert.deepEqual(detailRow(routingMarkup, 'Reference').slice(3, 9), [
    formatters.formatNumber(1, 2), formatters.formatNumber(10, 2), formatters.formatPercent(1, 2),
    formatters.formatNumber(10, 2), formatters.formatNumber(5, 2), ''
  ], 'Routing Reference detail row includes Reference Work Center rates in its own role row')
  assert.deepEqual(detailRow(routingMarkup, 'Current').slice(3, 9), [
    formatters.formatNumber(1, 2), formatters.formatNumber(10, 2), formatters.formatPercent(1, 2),
    formatters.formatNumber(20, 2), formatters.formatNumber(7, 2), ''
  ], 'Routing Current detail row includes Current Work Center rates in its own role row')
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
  assert.match(routingMarkup, /<span class="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">/,
    'Routing detail identity is inset under its parent row with the shared hierarchy guide')
  assertClose(routingParameterEffectGap, 1.2,
    'the unrounded five-factor Routing Parameter Cost Effect reconciles to the Candidate Main Gap')
  assert.doesNotMatch(routingMarkup, /Total Effect|<th[^>]*>Cost Effect<\/th>/,
    'Routing details do not add a Total Effect row')
  assert.equal([...routingMarkup.matchAll(/<tr\b/g)].length, 3, 'Routing detail contains the two role rows and the Parameter Cost Effect row')
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
    formatters.formatNumber(3, 4), formatters.formatNumber(12, 4), formatters.formatPercent(0.9, 2),
    formatters.formatNumber(15, 4), formatters.formatNumber(6, 4)
  ], 'ADDED Routing parameters and rates show present-side values without a side prefix')

  const removedRoutingReference = costSnapshot('reference', {
    routing: [route('removed-route', 'WC-1', { manning: 4, capacity: 20, yield: 0.95 })],
    rates: [rate('removed-rate', 'WC-1', 40, 14)]
  })
  const removedRoutingCurrent = costSnapshot('current')
  const removedRoutingComparison = comparisonCore.compareSnapshots(removedRoutingReference, removedRoutingCurrent)
  const removedRoutingMarkup = renderItemized(itemizedView, removedRoutingComparison, removedRoutingReference, removedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(removedRoutingMarkup, 'Routing', 'Cutting', 'REMOVED')).slice(3, 8), [
    formatters.formatNumber(4, 4), formatters.formatNumber(20, 4), formatters.formatPercent(0.95, 2),
    formatters.formatNumber(40, 4), formatters.formatNumber(14, 4)
  ], 'REMOVED Routing parameters and rates show present-side values without a side prefix')

  const missingAddedRoutingCurrent = costSnapshot('current', {
    routing: [route('added-route-missing', 'WC-1', { manning: 3, capacity: null, yield: 0.9 })],
    rates: [rate('missing-added-rate', 'WC-1', null, 8)]
  })
  const missingAddedRoutingComparison = comparisonCore.compareSnapshots(addedRoutingReference, missingAddedRoutingCurrent)
  const missingAddedRoutingMarkup = renderItemized(itemizedView, missingAddedRoutingComparison, addedRoutingReference, missingAddedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(missingAddedRoutingMarkup, 'Routing', 'Cutting', 'ADDED')).slice(3, 8), [
    formatters.formatNumber(3, 4), '—', formatters.formatPercent(0.9, 2), '—', formatters.formatNumber(8, 4)
  ], 'missing After-side Routing parameter and rate values remain unavailable while valid values show')

  const ambiguousAddedRoutingCurrent = costSnapshot('current', {
    routing: [route('ambiguous-added-route', 'WC-1')],
    rates: [rate('ambiguous-rate-a', 'WC-1', 15, 6), rate('ambiguous-rate-b', 'WC-1', 16, 7)]
  })
  const ambiguousAddedRoutingComparison = comparisonCore.compareSnapshots(addedRoutingReference, ambiguousAddedRoutingCurrent)
  const ambiguousAddedRoutingMarkup = renderItemized(itemizedView, ambiguousAddedRoutingComparison, addedRoutingReference, ambiguousAddedRoutingCurrent, 'rtg')
  assert.deepEqual(gridCellText(candidateMainRow(ambiguousAddedRoutingMarkup, 'Routing', 'Cutting', 'ADDED')).slice(6, 8), ['—', '—'],
    'ambiguous snapshot-side Work Center rates remain unavailable in Routing main columns')

  const tablesInAll = [...renderItemized(itemizedView, {
    ...bomComparisonForDisplay,
    routingFindings: routingComparison.routingFindings
  }, bomRefSnapshot, bomCurSnapshot, 'all').matchAll(/<table\b[\s\S]*?<\/table>/g)].map(match => match[0])
  const allTableMarkup = tablesInAll.filter(table => /<caption\b/.test(table))
  assert.equal(tablesInAll.length, 4, 'ALL renders a sticky header and data table for BOM, then Routing')
  const renderedTableTypes = tablesInAll.map(table => {
    if (/aria-label="Bill of Material candidate findings column headers"/.test(table)) return 'BOM header'
    if (/aria-label="Routing candidate findings column headers"/.test(table)) return 'Routing header'
    if (/<caption\b[^>]*>Bill of Material Candidate findings/.test(table)) return 'BOM data'
    if (/<caption\b[^>]*>Routing Candidate findings/.test(table)) return 'Routing data'
    return 'unknown table'
  })
  assert.deepEqual(renderedTableTypes, ['BOM header', 'BOM data', 'Routing header', 'Routing data'],
    'the sticky header/body pairs stay aligned and BOM remains before Routing')
  assert.equal(allTableMarkup.length, 2, 'ALL renders one data table for each finding type')
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
    assertExpansionRowContract(mainRow, 'Bill of Material', 'Material', testCase.name, testCase.expandable)
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
    assertExpansionRowContract(mainRow, 'Routing', 'Cutting', testCase.name, testCase.expandable)
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
    comparison: warningComparison,
    gapDirection: 'Current − Reference'
  }))
  assert.doesNotMatch(warningMarkup, /Data quality:/, 'page-level Data quality summary must be removed')
  assert.doesNotMatch(warningMarkup, /Review warnings|Fixture warning remains reviewable/, 'comparison warnings are not presented in the Cost Breakdown summary')
  assert.match(warningMarkup, /aria-label="Cost Element"/)
  assert.match(warningMarkup, /<caption class="sr-only">Cost Element/)
  const warningHeader = warningMarkup.match(/<thead\b[\s\S]*?<tr\b[\s\S]*?<\/tr>/)?.[0]
  assert.ok(warningHeader)
  assert.deepEqual([...warningHeader.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1])),
    ['Cost Element', 'Before', 'After', 'GAP', '%GAP'],
    'Cost Element headers expose the visible Before, After, Gap, and percentage columns')
  assert.match(warningHeader, /data-gap-header-slot="selected"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-gap-header-slot="selected"/,
    'the unused secondary Gap label is a hidden layout placeholder')
  assert.deepEqual([...warningMarkup.matchAll(/<tr\b/g)].length, 5, 'Cost has exactly a header, three element rows, and a footer')
  assert.match(warningMarkup, />Material<\/th>[\s\S]*>Labor<\/th>[\s\S]*>Burden<\/th>[\s\S]*>Standard Cost<\/th>/)
  assert.doesNotMatch(warningMarkup, /Standard Cost Overview|Material color legend|Selected REF|Selected CUR/,
    'Cost stays compact and has no duplicate legend or Selected dataset columns')
  assert.ok(warningMarkup.includes('100.00%'), 'MAT %GAP uses element Gap divided by Standard Cost Gap')
  assert.ok(warningMarkup.includes('20.00%'), 'STD Cost %Total uses Standard Cost Gap divided by Before Standard Cost')
  assert.match(visibleText(warningMarkup), /Total20\.00%/, 'STD Cost footer identifies its percentage as %Total')

  const selectedCostComparison = {
    ...warningComparison,
    elementGaps: { material: 0.5, labor: 0, burden: 0 },
    totalGap: 0.5
  }
  const selectedCostMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: warningComparison,
    selectedComparison: selectedCostComparison,
    selectedActive: true,
    gapDirection: 'Current − Reference'
  }))
  assert.match(selectedCostMarkup, /GAP[\s\S]*>Selected<\/span>/, 'Selected Comparison is a plain secondary GAP header slot')
  assert.match(visibleText(selectedCostMarkup), /\+2\.20\+0\.50/, 'Selected contribution is muted in the fixed secondary slot beside full Gap')
  assert.match(visibleText(selectedCostMarkup), /Labor0\.000\.000\.000\.00/,
    'a real selected zero is shown directly in the fixed secondary slot')
  assert.doesNotMatch(selectedCostMarkup, /\(Selected\)|Selected \([+-]?\d|data-gap-slot="selected"[^>]*>\s*\([+-]?\d/,
    'Selected header and values have no surrounding parentheses')
  assert.doesNotMatch(selectedCostMarkup, /<th[^>]*>Selected<\/th>/, 'Selected is not a separate Cost column')
  const fullGapClass = warningMarkup.match(/<button[^>]*data-gap-slot="full"[^>]*class="([^"]*)"/)?.[1]
  const selectedFullGapClass = selectedCostMarkup.match(/<button[^>]*data-gap-slot="full"[^>]*class="([^"]*)"/)?.[1]
  assert.ok(fullGapClass && selectedFullGapClass)
  assert.equal(fullGapClass, selectedFullGapClass, 'Cost Full Gap keeps the same presentation when Selected activates')
  assert.match(warningMarkup, /data-gap-slot="selected" aria-hidden="true"[^>]*invisible/,
    'Cost reserves the secondary Selected slot before selection')
  assert.match(selectedCostMarkup, /<button[^>]*data-gap-slot="selected"[^>]*data-selected-number="true"/,
    'Selected becomes a directly selectable numeric source inside its reserved secondary slot')
  assert.equal([...selectedCostMarkup.matchAll(/data-selected-gap-part="(?:open|value|close)"/g)].length, 0,
    'Selected values use plain numeric text without punctuation nodes')
  const selectedHeaderTrack = selectedCostMarkup.match(/<span class="grid w-full grid-cols-\[minmax\(0,1fr\)_([^\]]+)\][^"]*"[^>]*>[\s\S]*?data-gap-header-slot="selected"/)?.[1]
  const selectedBodyTracks = [...selectedCostMarkup.matchAll(/<div aria-label="[^"]*Full Gap[^"]*" class="grid w-full grid-cols-\[minmax\(0,1fr\)_([^\]]+)\]/g)].map(match => match[1])
  assert.ok(selectedHeaderTrack && selectedBodyTracks.length > 0
    && selectedBodyTracks.every(width => width === selectedHeaderTrack),
  'the summary uses one fixed secondary Selected track in its header, body, and footer')
  assert.equal(selectedHeaderTrack, '65px', 'the shared summary slot uses its existing 65px CSS track')
  assert.match(selectedCostMarkup, /<button[^>]*data-gap-slot="selected"[^>]*class="[^"]*text-right[^"]*text-\[10px\][^"]*font-normal[^"]*text-slate-500[^"]*tabular-nums/,
    'Selected is right-aligned, tabular, and neutral within its reserved slot')
  assert.doesNotMatch(selectedCostMarkup, /data-gap-slot="selected"[^>]*class="[^"]*text-(?:rose|red|green|emerald)-|data-gap-slot="selected"[^>]*class="[^"]*font-(?:bold|semibold)/,
    'Selected has no semantic red/green color or bold emphasis')
  assert.doesNotMatch(selectedCostMarkup, /data-gap-slot="selected"[^>]*class="[^"]*w-\[\d+px\]/,
    'the Selected value uses the shared fixed track without a separate width that could diverge')
  assert.match(selectedCostMarkup, /<button[^>]*data-gap-slot="selected"[^>]*data-selected-number="true"[^>]*>[\s\S]*?<span data-numeric-token="true">\+0\.50<\/span>/,
    'Selected value is displayed directly in its aligned fixed secondary slot')

  const wcComparison = routingComparisonForDisplay
  const wcMarkup = renderToStaticMarkup(React.createElement(wcView.WorkCenterProcessingTable, {
    comparison: wcComparison,
    gapDirection: 'Current − Reference',
  }))
  assert.match(wcMarkup, /<section aria-label="Work Center"[^>]*data-cbd-overview-panel="work-center"/,
    'Work Center participates in the paired overview')
  assert.match(wcMarkup, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-y-auto/,
    'Work Center data rows alone use the internal vertical scroll region')
  const wcSource = readFileSync(new URL('../src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(wcMarkup + wcSource, /h-\[30px\]|pr-\[6px\]|scrollbar-gutter:\s*stable/,
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
  assert.deepEqual([...wcMarkup.matchAll(/<div role="columnheader"[^>]*>/g)]
    .map(match => visibleText(extractElement(wcMarkup, match.index, 'div'))),
    ['Work Center', 'Before', 'After', 'GAP', '%GAP'])
  assert.equal([...wcMarkup.matchAll(/role="rowgroup"/g)].length, 3,
    'WC header, body, and footer remain separate aligned grid sections')
  assert.match(wcMarkup, /aria-label="WC-REF Gap [^"]*; Gap = Current − Reference"/)
  assert.match(wcMarkup, /aria-label="WC-REF Gap [^"]*; Gap = Current − Reference"[^>]*data-selected-number="true"|data-selected-number="true"[^>]*aria-label="WC-REF Gap [^"]*; Gap = Current − Reference"/,
    'Work Center Gap is an accessible SelectedNumber source with its Gap direction in the accessible name')
  assert.doesNotMatch(wcMarkup, /role="tooltip"|<title(?:\s|>)/,
    'Work Center numeric values do not add hover tooltip markup')
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
  const popoverSource = readFileSync(new URL('../src/features/cost-breakdown/components/CostBreakdownPopover.tsx', import.meta.url), 'utf8')
  const sharedSelectorSource = readFileSync(new URL('../src/shared/ui/ComparisonRoleSelector.tsx', import.meta.url), 'utf8')
  const sortMenuSource = pageSource.match(/label="Sort"[\s\S]*?<\/CostBreakdownPopover>/)?.[0]
  assert.ok(sortMenuSource, 'Sort options use the shared overlay component')
  assert.match(sortMenuSource, /COMPARISON_SORT_OPTIONS\.map\(option => <button/,
    'Sort dropdown renders only the three shared comparison sort options as plain buttons')
  assert.doesNotMatch(sortMenuSource, /aria-pressed|sortMode === option\.value|bg-slate-100 font-semibold/,
    'Sort options have no persistent selected-mode semantics or styling')
  assert.match(sortMenuSource, /showChevron=\{false\}[\s\S]*trigger=\{<ArrowUpDown aria-hidden="true"/,
    'Sort uses the icon-only ArrowUpDown trigger without a dropdown chevron')
  assert.match(sortMenuSource, /onClick=\{\(\) => \{ setSortMode\(option\.value\); onResetManualOrderHistory\(\); setSortResetToken\(token => token \+ 1\); close\(\) \}\}/,
    'each Sort command, including the same command, re-applies sorting, resets reorder history and Details, then closes')
  assert.doesNotMatch(sortMenuSource, /<h[1-6]\b|<footer\b/,
    'Sort contains only its compact choices without a title or footer')

  assert.match(pageSource, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/,
    'CBD consumes the shared comparison selector')
  assert.match(sharedSelectorSource, /COMPARISON_ROLES\.filter\(option => option !== role\)/,
    'each role menu filters only its own selected value')
  assert.doesNotMatch(sharedSelectorSource, /aria-pressed|optionRole === role|disabled=/,
    'role alternatives have no selected or disabled state')
  assert.match(sharedSelectorSource, /onChange\(optionRole\); close\(true\)/,
    'selecting an alternative applies immediately and closes the role menu')
  assert.match(sharedSelectorSource, /h-8 w-\[96px\]/,
    'Before and After use one compact, equal 96px by 32px trigger layout')
  const roleTriggerClass = sharedSelectorSource.match(/className="([^"]*w-\[96px\][^"]*)"/)?.[1] ?? ''
  for (const className of ['rounded-sm', 'border', 'border-slate-300', 'bg-white', 'px-2', 'hover:bg-slate-100', 'focus-visible:outline']) {
    assert.ok(roleTriggerClass.split(/\s+/).includes(className), 'Before and After use the required boxed selector styles')
  }
  assert.doesNotMatch(roleTriggerClass, /\bbg-transparent\b/,
    'role selectors retain the white boxed idle surface')
  assert.match(sharedSelectorSource, /aria-label=\{`\$\{side\} dataset, \$\{COMPARISON_ROLE_LABELS\[role\]\}`\}/,
    'accessible names include Before/After plus the selected role')
  assert.match(sharedSelectorSource, /<Tooltip label=\{side\}>/,
    'visible tooltips retain the exact Before/After side name')
  assert.match(sharedSelectorSource, /w-max max-w-\[calc\(100vw-1rem\)\]/,
    'role menu grows to fit intrinsic option content')
  assert.match(sharedSelectorSource, /panel\.style\.minWidth = `\$\{triggerBounds\.width\}px`/,
    'popup minimum equals trigger width and content can grow it')
  assert.match(popoverSource, /const panelWidth = panelBounds\.width/,
    'generic CBD menus use their measured intrinsic width')
  assert.doesNotMatch(popoverSource, /panelBounds\.width\s*\|\|\s*triggerBounds\.width|Math\.max\([^\n]*triggerBounds\.width/,
    'CBD menus have no panel-width fallback that forces trigger width')
  assert.equal((popoverSource.match(/triggerBounds\.width/g) ?? []).length, 1,
    'generic CBD trigger width is used only for centering')
  assert.doesNotMatch(popoverSource, /panelMinWidthMatchesTrigger|panelElement\.style\.minWidth/,
    'Status and Sort preserve content-sized menus')
  const statusPopoverSource = pageSource.match(/label="Status"[\s\S]*?<\/CostBreakdownPopover>/)?.[0]
  assert.ok(statusPopoverSource, 'Status uses the shared overlay component')
  assert.match(statusPopoverSource, /\{\(\) => <ComparisonStatusOptions selected=\{comparisonView\} onChange=\{setComparisonView\} \/>\}/,
    'status toggles update persistent local filter state without closing the popover')
  assert.doesNotMatch(statusPopoverSource, /close\(\)/,
    'the Status menu stays open after each toggle')
  const statusOptionsSource = readFileSync(new URL('../src/features/cost-breakdown/components/ComparisonStatusOptions.tsx', import.meta.url), 'utf8')
  assert.match(statusOptionsSource, /checked=\{selected\.includes\(option\.value\)\}/,
    'Status options expose persistent checked state')
  assert.match(statusOptionsSource, /toggleComparisonStatus\(previous, option\.value\)/,
    'keyboard checkbox changes remain supported and preserve the final-selection guard')
  assert.match(statusOptionsSource, /applyStatusDragSelection\(previous, crossed, selecting\)/,
    'fixed-intent drag selection remains wired to the Status menu')
  const overviewControlSource = pageSource.match(/<button(?=[^>]*aria-controls="cost-breakdown-overview-panels")[^>]*>[\s\S]*?<\/button>/)?.[0]
  assert.ok(overviewControlSource, 'the overview has a dedicated disclosure control')
  assert.match(overviewControlSource, /aria-expanded=\{isOverviewExpanded\}/)
  assert.match(overviewControlSource, /aria-label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}/)
  assert.doesNotMatch(overviewControlSource, /\btitle=/, 'the disclosure does not duplicate its shared tooltip with a native title')
  assert.match(pageSource, /<Tooltip label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}[\s\S]*aria-label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}[\s\S]*<\/Tooltip>/,
    'the disclosure shared Tooltip and accessible name match its expanded state')
  const overviewClassName = pageSource.match(/const iconActionButtonClass = '([^']+)'/)?.[1]
    ?? overviewControlSource.match(/className="([^"]+)"/)?.[1]
  assert.ok(overviewClassName)
  assert.match(overviewClassName, /\bh-8\b.*\bw-8\b/, 'the bare Chevron retains a 32px hit target')
  assert.doesNotMatch(overviewClassName, /\bborder(?:-|\s)|\bbg-white\b/,
    'the overview control has no persistent border or background')
  assert.match(overviewClassName, /hover:bg-slate-100/, 'the bare Chevron keeps a restrained hover cue')
  assert.match(overviewClassName, /focus-visible:outline/, 'the bare Chevron keeps visible keyboard focus')

  assert.match(popoverSource, /document\.addEventListener\('pointerdown'/, 'temporary CBD popovers dismiss on outside pointerdown')
  assert.match(popoverSource, /useTransientInteraction\(open,[\s\S]*reason === 'escape'\) close\(\)/,
    'CBD popovers reuse shared transient Escape dismissal and restore trigger focus')
  assert.match(popoverSource, /openExclusivePopover\(owner\.current, dismissWithoutFocus\)/,
    'opening one temporary popover dismisses the previous popover through the shared overlay manager')
  assert.match(popoverSource, /const toggleOpen = \(\) => \{[\s\S]*if \(pinnedRef\.current\) dismissWithoutFocus\(\)[\s\S]*preview\(\)[\s\S]*pinnedRef\.current = true/,
    'clicking a trigger opens and pins its menu, while a second click closes it')
  const dismissBody = popoverSource.match(/const dismissWithoutFocus = useCallback\(\(\) => \{([\s\S]*?)\}, \[[^\]]*\]\)/)?.[1]
  assert.ok(dismissBody)
  assert.match(dismissBody, /setOpen\(false\)/)
  assert.doesNotMatch(dismissBody, /setComparisonView|setSortMode|setSortResetToken|applySelectedComparison|clearSelectedComparison/,
    'outside/Escape dismissal closes the temporary overlay without changing its value or Selected Comparison')
  const { applyStatusDragSelection } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/status-drag-selection.ts')
  const { toggleComparisonStatus } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts')
  const { ComparisonStatusOptions } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/ComparisonStatusOptions.tsx')
  const allStatuses = ['CHANGED', 'ADDED', 'REMOVED', 'UNCHANGED']
  const selectThree = applyStatusDragSelection(['UNCHANGED'], ['CHANGED', 'ADDED', 'REMOVED'], true)
  assert.deepEqual(new Set(selectThree), new Set(allStatuses), 'drag from an unchecked status selects all three crossed rows')
  assert.deepEqual(applyStatusDragSelection(selectThree, ['CHANGED', 'ADDED', 'CHANGED'], true), selectThree,
    'select mode remains idempotent when the pointer crosses a row again')
  const deselectThree = applyStatusDragSelection(allStatuses, ['CHANGED', 'ADDED', 'REMOVED'], false)
  assert.deepEqual(deselectThree, ['UNCHANGED'], 'drag from a checked status deselects every crossed row')
  assert.deepEqual(applyStatusDragSelection(deselectThree, ['UNCHANGED'], false), ['UNCHANGED'],
    'drag cannot deselect the final remaining status')
  assert.deepEqual(applyStatusDragSelection(allStatuses, ['CHANGED', 'ADDED', 'CHANGED'], false), ['REMOVED', 'UNCHANGED'],
    'revisiting a row does not select it again in deselect mode')
  assert.equal(applyStatusDragSelection(allStatuses, allStatuses, false).length, 1,
    'a drag crossing every status still preserves one selected status')
  assert.deepEqual(toggleComparisonStatus(['UNCHANGED'], 'UNCHANGED'), ['UNCHANGED'],
    'keyboard and single-checkbox toggles cannot remove the final selected status')
  for (const selected of [allStatuses, ['UNCHANGED']]) {
    const statusMarkup = renderToStaticMarkup(React.createElement(ComparisonStatusOptions, { selected, onChange() {} }))
    assert.equal([...statusMarkup.matchAll(/type="checkbox"/g)].length, 4, 'the compact Status menu has exactly four accessible checkboxes')
    assert.equal([...statusMarkup.matchAll(/checked=""/g)].length, selected.length, 'checkbox state reflects selected statuses')
    assert.equal(visibleText(statusMarkup), 'ChangedAddedRemovedUnchanged', 'Status has no heading, footer or explanatory copy')
    assert.match(statusMarkup, /select-none/, 'Status suppresses text selection during pointer drag')
  }

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
  assert.match(candidateSource, /const tableClassName = `w-full \$\{isBOM \? 'min-w-\[1240px\]' : 'min-w-\[1260px\]'\} table-fixed/,
    'BOM and Routing use type-specific minimum widths to avoid narrow-column collisions')
  assert.match(candidateSource, /<StickyTableHeader[\s\S]*?<\/StickyTableHeader>[\s\S]*?<div className="overflow-x-auto" onScroll=\{syncHeaderScroll\}>[\s\S]*?<table className=\{tableClassName\}>/,
    'BOM and Routing body scrolling stays local and synchronized with the sticky header')
  assert.match(candidateSource, /const canExpand = status === 'CHANGED'\s+const isExpanded = canExpand && expandedRows\.has/,
    'even stale expansion state cannot show Details for a non-CHANGED finding')
  assert.match(candidateSource, /h-8 w-8 shrink-0 items-center justify-center rounded-sm p-0 font-mono[^']*tabular-nums/,
    'Candidate row numbers use a fixed square with tabular numerals')
  assert.match(candidateSource, /<tr[\s\S]*?aria-expanded=\{canExpand \? isExpanded : undefined\}[\s\S]*?aria-label=\{canExpand[\s\S]*?activate to \$\{isExpanded \? 'collapse' : 'expand'\} detail[\s\S]*?tabIndex=\{canExpand \? 0 : -1\}[\s\S]*?onKeyDown=\{event => \{[\s\S]*?onToggleExpanded\(type, row\.key\)/,
    'the CHANGED row itself is focusable, labeled, and keyboard-operable as the expansion target')
  assert.doesNotMatch(candidateSource, /<button[\s\S]*?aria-label=\{`\$\{isExpanded \? 'Collapse' : 'Expand'\} \$\{identityHeader\} detail for \$\{row\.label\}`\}[\s\S]*?onToggleExpanded\(type, row\.key\)/,
    'row expansion is not exposed as a separate expand/collapse button')
  assert.match(candidateSource, /<button[\s\S]*?aria-pressed=\{selected\}[\s\S]*?aria-label=\{key \? `\$\{selected \? 'Deselect' : 'Select'\} \$\{identityHeader\} finding \$\{row\.label\}`/,
    'the # Candidate selector remains a separate accessible selection button')
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
    comparisonBefore: 'reference',
    comparisonAfter: 'current',
    comparisonPair: {
      beforeRole: 'reference',
      afterRole: 'current',
      before: routingRefSnapshot,
      after: routingCurSnapshot,
      fingerprint: 'reference-current-fixture'
    },
    setComparisonBefore() {},
    setComparisonAfter() {},
    costBreakdownFullComparison: routingComparisonForDisplay,
    costBreakdownSelectedComparison: {
      ...routingComparisonForDisplay,
      elementGaps: { material: 0, labor: 0.15, burden: 0.1 },
      totalGap: 0.25,
      processingFindings: []
    },
    selectedComparisonSelection: { bomFindingKeys: [], routingFindingKeys: [JSON.stringify(['routing', 'route-ref', 'route-cur'])] },
    isSelectedComparisonActive: true,
    applySelectedComparison() {},
    clearSelectedComparison() {}
  }
  try {
    const { CostBreakdownPage, GapContributionChart } = await vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx')
    assert.deepEqual(COST_ELEMENT_COLORS, {
      material: '#6f99c6', labor: '#e5b46a', burden: '#9a82c6', standardCost: '#334155'
    }, 'all CBD Cost element colors come from the finalized shared palette')
    const chartSegments = [
      { key: 'material', label: 'Material', full: 9.31, selected: 4.2, color: COST_ELEMENT_COLORS.material },
      { key: 'labor', label: 'Labor', full: 4.42, selected: 0, color: COST_ELEMENT_COLORS.labor },
      { key: 'burden', label: 'Burden', full: 2.32, selected: 1, color: COST_ELEMENT_COLORS.burden }
    ]
    const proportionalChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: chartSegments, fullTotal: 16.05, selectedTotal: 4, selectedActive: true,
      directionLabel: 'Current − Reference'
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
      segments: chartSegments.map(segment => ({ ...segment, selected: null })), fullTotal: 16.05, selectedTotal: null, selectedActive: false,
      directionLabel: 'Current − Reference'
    }))
    assert.match(fullOnlyChart, /Material Gap \+9\.31/)
    assert.doesNotMatch(fullOnlyChart, /Selected \(/, 'Full mode tooltip stays on one line')

    const signedOffsetChart = renderToStaticMarkup(React.createElement(GapContributionChart, {
      segments: [
        { key: 'material', label: 'Material', full: 9, selected: 10, color: COST_ELEMENT_COLORS.material },
        { key: 'labor', label: 'Labor', full: -4, selected: -1.2, color: COST_ELEMENT_COLORS.labor },
        { key: 'burden', label: 'Burden', full: 2, selected: 0, color: COST_ELEMENT_COLORS.burden }
      ], fullTotal: 7, selectedTotal: 10, selectedActive: true,
      directionLabel: 'Current − Reference'
    }))
    assert.match(signedOffsetChart, /data-gap-chart-mode="signed"/,
      'opposite-sign full component gaps preserve the signed chart')
    assert.ok(signedOffsetChart.includes([
      `Full Standard Cost Gap ${formatters.formatVariance(7, 4)}`,
      'Gap = Current − Reference',
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
    assert.match(pageText, /Standard Cost Gap\+1\.20/)
    assert.doesNotMatch(pageText, /Full\+1\.20|Selected\+1\.20/)
    assert.doesNotMatch(pageText, /\|Gap\| High → Low|Gap High → Low|Gap Low → High/, 'the closed Sort trigger does not show its current command')
    assert.match(pageText, /Standard Cost/)
    assert.match(pageText, /BOM\(0\)/)
    assert.match(pageText, /RTG\(1\)/)
    assert.match(pageText, /All\(1\)/, 'All count is the sum of BOM and Routing findings')
    assert.match(pageMarkup, /aria-label="Work Center"/)
    assert.match(pageText, /WC-REF/)
    assert.match(pageText, /WC-CUR/)
    const subheader = pageMarkup.match(/<header aria-label="Cost Breakdown subheader"[\s\S]*?<\/header>/)?.[0]
    assert.ok(subheader, 'the subheader remains a distinct fixed row')
    const gapLegendClass = subheader.match(/<div role="group" aria-label="Cost element color legend" class="([^"]+)"/)?.[1]
    assert.ok(gapLegendClass)
    assert.match(gapLegendClass, /(?:^|\s)border-l border-slate-300 pl-2(?:\s|$)/,
      'Standard Cost Gap title/value is separated from MAT/LB/BD by a subtle divider')
    assert.match(subheader, /class="shrink-0 overflow-x-auto border border-slate-300 bg-white"/,
      'CBD subheader uses the same quiet border and white framing as the Master Data toolbar')
    assert.match(subheader, /flex min-w-\[1000px\] flex-nowrap items-center gap-1\.5 px-1\.5 py-1/,
      'CBD controls use compact Master Data toolbar spacing in one row')
    assert.doesNotMatch(subheader, /w-\[204px\]|w-\[142px\]/,
      'the Standard Cost Gap and legend use their content width instead of leaving a fixed dead-space gap')
    assert.match(subheader, /data-gap-chart-wrapper="true" class="min-w-\[96px\] flex-1"/,
      'the Gap Bar flexes into the space freed by the natural-width left-side information')
    assert.match(subheader, /aria-label="Comparison datasets, Before Reference, After Current"/,
      'the default pair is announced with generic Before/After sides')
    assert.equal([...subheader.matchAll(/h-8 w-\[96px\]/g)].length, 2,
      'both role selectors use the shared compact width and stay equal in the toolbar')
    assert.doesNotMatch(subheader, /w-\[108px\]/,
      'the superseded 108px role trigger width is absent')
    const subheaderText = visibleText(subheader)
    const orderedLabels = ['Reference', 'Current', 'Standard Cost Gap', 'MAT', 'LB', 'BD', 'BOM', 'RTG', 'All']
    const labelPositions = orderedLabels.map(label => subheaderText.indexOf(label))
    assert.ok(labelPositions.every(position => position >= 0),
      `the subheader exposes every finalized control and chart label: ${JSON.stringify(orderedLabels)} in ${subheaderText}`)
    assert.deepEqual(labelPositions, [...labelPositions].sort((left, right) => left - right),
      'the single subheader row follows the finalized left-to-right order')
    assert.doesNotMatch(subheader, /<text\b/, 'the bar contains no MAT/LB/BD text labels')
    const typeSelector = subheader.match(/<div[^>]*role="group" aria-label="Finding type filter"[^>]*>[\s\S]*?<\/div>/)?.[0]
    assert.ok(typeSelector, 'the BOM/RTG/All segmented type selector is present')
    assert.equal(visibleText(typeSelector), 'BOM(0)RTG(1)All(1)',
      'type labels use All casing and each displayed count reflects its live finding total')
    assert.match(typeSelector, /h-8[^\"]*grid-cols-3[^\"]*border border-slate-300 bg-white/,
      'the type selector matches Master Data’s 32px bordered grid surface')
    assert.equal([...typeSelector.matchAll(/<button\b/g)].length, 3, 'the type selector has three equal grid cells')
    assert.match(typeSelector, /grid-cols-3|basis-0/, 'the three selector cells divide the available width equally')
    assert.match(typeSelector, /border-r border-slate-200|border-l border-slate-300/, 'adjacent selector cells have separators')
    assert.match(typeSelector, /absolute inset-0\.5 bg-slate-900/, 'the active type uses Master Data’s inset dark slab')
    assert.match(typeSelector, /aria-pressed="true"/, 'the current type remains accessible as pressed')
    assert.match(typeSelector, /text-slate-700 hover:bg-slate-100 hover:text-slate-950/,
      'inactive type cells share Master Data’s neutral hover treatment')
    const masterPageSource = readFileSync(new URL('../src/features/master-data/MasterDataPage.tsx', import.meta.url), 'utf8')
    const masterTypeSelector = masterPageSource.match(/const tableSelector = \([\s\S]*?\n  \)/)?.[0]
    assert.ok(masterTypeSelector, 'Master Data table selector source is available as the styling reference')
    assert.match(masterTypeSelector, /grid h-8[^\n]*grid-cols-4[^\n]*border border-slate-300 bg-white/,
      'Master Data reference selector has the same bordered 32px grid frame')
    assert.match(masterTypeSelector, /absolute inset-0\.5 bg-slate-900/,
      'Master Data reference selector uses the inset dark active slab')
    assert.match(masterTypeSelector, /text-slate-700 hover:bg-slate-100 hover:text-slate-950/,
      'Master Data reference selector uses the same neutral inactive-cell treatment')
    const collapseButton = subheader.match(/<button[^>]*aria-controls="cost-breakdown-overview-panels"[^>]*>[\s\S]*?<\/button>/)?.[0]
    assert.ok(collapseButton)
    assert.match(collapseButton, /aria-label="Collapse"/)
    assert.equal(visibleText(collapseButton), '', 'Collapse is icon-only')
    assert.match(collapseButton, /aria-expanded="true"/)
    assert.match(collapseButton, /data-cbd-overview-indicator="true"/,
      'the disclosure uses a dedicated visible direction indicator')
    assert.match(collapseButton, /lucide lucide-chevron-down/, 'expanded overview renders ChevronDown')
    const collapseClass = collapseButton.match(/\bclass="([^"]*)"/)?.[1] ?? ''
    assert.doesNotMatch(collapseClass, /\bborder(?:-|\s)|\bbg-white\b/,
      'the bare disclosure has no persistent border or background')
    assert.match(collapseClass, /hover:bg-slate-100/,
      'the bare disclosure retains a subtle hover cue')
    assert.match(collapseClass, /focus-visible:/,
      'the disclosure retains a keyboard focus indicator')
    assert.match(subheader, /aria-expanded="true"/)
    assert.doesNotMatch(subheader, /data-cbd-overview-click-area/,
      'blank subheader space does not collapse the overview')
    assert.equal([...pageMarkup.matchAll(/data-cbd-overview-pair="true"/g)].length, 1,
      'Cost Element and Work Center share one paired overview frame')
    assert.match(pageMarkup, /data-cbd-overview-pair="true"[^>]*data-cbd-overview-columns="equal"/,
      'the overview layout explicitly uses equal Cost Element and Work Center columns')
    assert.doesNotMatch(pageMarkup, /data-cbd-overview-divider|grid-cols-\[[^\]]*_1px_/,
      'the independent summary boxes do not use a center-divider architecture')
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
  assert.doesNotMatch(stickyShellClass, /(?:^|\s)(?:pb-2|lg:bg-slate-100)(?:\s|$)/,
    'the 8px gap is not part of the sticky CBD Summary')
  assert.match(stickyShellClass, /lg:sticky[^\"]*lg:top-0/,
    'Subheader and overview remain stuck to the top of Main while it scrolls')
  assert.ok(pageMarkup.indexOf('aria-label="Cost Breakdown subheader"') < pageMarkup.indexOf('id="cost-breakdown-overview-panels"')
    && pageMarkup.indexOf('id="cost-breakdown-overview-panels"') < pageMarkup.indexOf('aria-label="Candidate workspace"'),
  'the sticky shell contains the Subheader and summary above the normal-flow Candidate region')
  const stickyGap = pageMarkup.match(/<div aria-hidden="true" data-cbd-sticky-gap="true" class="([^"]+)"\s*><\/div>/)?.[1]
    ?? pageMarkup.match(/<div aria-hidden="true" data-cbd-sticky-gap="true" class="([^"]+)"\s*\/?>/)?.[1]
  assert.equal(stickyGap, 'h-2 shrink-0', 'an 8px normal-flow sibling gap follows the sticky summary')
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
    const pageSource = readFileSync(new URL('../src/features/cost-breakdown/CostBreakdownPage.tsx', import.meta.url), 'utf8')
    const popoverSource = readFileSync(new URL('../src/features/cost-breakdown/components/CostBreakdownPopover.tsx', import.meta.url), 'utf8')
    assert.match(pageSource, /<CostBreakdownPopover\s+label="Status"/)
    assert.match(pageSource, /<CostBreakdownPopover\s+label="Sort"/)
    assert.match(pageMarkup, /aria-label="Status"/)
    assert.match(pageMarkup, /aria-label="Sort"/)
    assert.doesNotMatch(pageMarkup, /<details\b/, 'Status and Sort are overlay popovers, not in-flow details')
    const popoverTriggers = [...subheader.matchAll(/<button type="button" aria-label="(Status|Sort)"([^>]*)>([\s\S]*?)<\/button>/g)]
    assert.equal(popoverTriggers.length, 2, 'Status and Sort each expose exactly one trigger button')
    for (const [, label, attributes, content] of popoverTriggers) {
      assert.match(attributes, /aria-haspopup="dialog"/, 'each toolbar-style trigger opens its own options popup')
      assert.match(attributes, /class="[^"]*h-8 w-8/, `${label} has a 32px by 32px target`)
      const triggerClass = attributes.match(/class="([^"]+)"/)?.[1] ?? ''
      assert.match(triggerClass, /bg-transparent/, `${label} has a transparent idle background`)
      assert.doesNotMatch(triggerClass, /(?:^|\s)border(?:-|\s)|bg-white/, `${label} has no persistent border or white box`)
      assert.match(triggerClass, /focus-visible:outline/, `${label} has a visible keyboard focus style`)
      assert.match(content, label === 'Status' ? /lucide lucide-filter/ : /lucide lucide-arrow-up-down/,
        `${label} uses its required icon`)
      assert.doesNotMatch(content, /lucide-chevron-down|Status|Sort|Gap High|Gap Low/,
        `${label} is icon-only and does not show the current sort mode`)
    }
    const sortTrigger = popoverTriggers.find(([, label]) => label === 'Sort')
    assert.ok(sortTrigger)
    assert.doesNotMatch(sortTrigger[0], /\|Gap\| High → Low|Gap High → Low|Gap Low → High/,
      'the Sort mode is absent from its trigger and tooltip')
    assert.doesNotMatch(subheader, /aria-label="Reapply sort:|aria-label="Choose sort mode; current mode/,
      'Sort has no separate Reapply segment or split-control frame')
    assert.doesNotMatch(subheader, /▾/, 'dropdown affordances do not rely on a text triangle')
    assert.match(subheader, /aria-haspopup="dialog"/, 'Status and Sort remain overlay popovers')
    assert.doesNotMatch(pageSource, /All statuses|At least one status must remain selected|toggleOverviewFromBlank|data-cbd-overview-click-area/,
      'Status contains only compact status choices and blank subheader space never toggles the overview')
    for (const label of ['Status', 'Sort']) {
      const menu = pageSource.match(new RegExp(`label="${label}"[\\s\\S]*?<\\/CostBreakdownPopover>`))?.[0]
      assert.ok(menu, `${label} uses a shared overlay`)
      assert.match(menu, /panelClassName="[^"]*w-max[^"]*"/, `${label} panel uses intrinsic content sizing`)
      assert.doesNotMatch(menu, /panelClassName="[^"]*\b(?:w|min-w)-\d+\b/, `${label} panel has no arbitrary blank fixed width`)
    }
    assert.match(popoverSource, /import \{ Tooltip \} from '[^']*Tooltip'/,
      'Status and Sort use the shared Tooltip component')
    assert.match(popoverSource, /<Tooltip label=\{label\}>[\s\S]*aria-label=\{label\}[\s\S]*<\/Tooltip>/,
      'each toolbar trigger receives a concise matching tooltip and accessible name')
    assert.match(pageSource, /label="Sort"[\s\S]*showChevron=\{false\}[\s\S]*trigger=\{<ArrowUpDown aria-hidden="true"/,
      'the Sort trigger label and tooltip do not disclose the active command')
    assert.match(pageSource, /label="Status"[\s\S]*showChevron=\{false\}[\s\S]*trigger=\{<Filter aria-hidden="true"/,
      'the Status trigger is icon-only and does not show the selected count')
    assert.match(pageSource, /aria-label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}/,
      'the overview disclosure uses the exact concise expanded/collapsed accessible names')
    assert.match(pageSource, /aria-controls="cost-breakdown-overview-panels"/,
      'the bare Chevron still controls only the overview panels')
    assert.match(pageSource, /isOverviewExpanded\s*\?[\s\S]*<ChevronDown data-cbd-overview-indicator[\s\S]*:\s*<ChevronRight data-cbd-overview-indicator/,
      'the expanded overview uses ChevronDown and the collapsed overview uses ChevronRight')
    assert.doesNotMatch(pageSource, /leadingAction=|buttonClassName=|aria-label=\{`Reapply sort:/,
      'Sort does not render the obsolete split Reapply button')
    assert.match(popoverSource, /import \{ closeExclusivePopover, dismissExclusivePopover, openExclusivePopover, useTransientInteraction \} from '\.\.\/\.\.\/\.\.\/shared\/ui\/transient-interactions'/,
      'Status and Sort share the transient dismissal and exclusive-popover manager')
    assert.match(popoverSource, /openExclusivePopover\(owner\.current, dismissWithoutFocus\)[\s\S]*?closeExclusivePopover\(owner\.current\)/,
      'Status and Sort remain mutually exclusive with the shared Before/After selectors')
    assert.match(popoverSource, /export function dismissCostBreakdownPopovers\(\): void \{\s*dismissExclusivePopover\(\)/,
      'page navigation can dismiss the active CBD or comparison popover')
    assert.match(popoverSource, /aria-haspopup="dialog"/,
      'Status and Sort expose their options as dialogs from one toolbar trigger')
    assert.match(popoverSource, /setTimeout\(preview, 120\)/, 'toolbar hover preview keeps Master Data timing')
    assert.match(popoverSource, /\}, 150\)/, 'toolbar menu leaves use Master Data travel grace')
    assert.match(popoverSource, /const centeredLeft = triggerBounds\.left \+ \(triggerBounds\.width - panelWidth\) \/ 2[\s\S]*const left = Math\.max\(8, Math\.min\(centeredLeft, window\.innerWidth - panelWidth - 8\)\)/,
      'Status and Sort popups center on their trigger while staying within viewport bounds')
    assert.match(popoverSource, /const below = triggerBounds\.bottom \+ 4/,
      'Status and Sort popups open below the trigger')
    assert.match(popoverSource, /useTransientInteraction\(open,[\s\S]*reason === 'escape'[\s\S]*close\(\)/,
      'Escape dismissal uses the shared transient interaction and restores trigger focus')
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
