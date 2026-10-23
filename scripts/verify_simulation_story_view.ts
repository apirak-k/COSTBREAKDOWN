import assert from 'node:assert/strict'
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot, ScenarioFinancialResult, SnapshotCost } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})
try {
  const { calculateScenarioBusinessMetrics } = await vite.ssrLoadModule('/src/core/calculations/scenario-business.ts')
  const { createScenarioFinancialResult, createScenarioStory } = await vite.ssrLoadModule('/src/core/calculations/scenario-story.ts')
  const { SimulationStoryGraph, buildVisibleStack, buildVisibleStandardCost, buildGraphScale, positionGraphTooltip,
    positionGapTotalLabel, WIDE_GRAPH_LABEL_METRICS, NARROW_GRAPH_LABEL_METRICS } = await vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx')
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { parameterEffectPresentation } = await vite.ssrLoadModule('/src/features/simulation/parameter-effect-presentation.ts')

  assert.deepEqual(parameterEffectPresentation(2.35), { text: '+2.35', className: 'text-rose-700' },
    'positive cost effects show an explicit plus sign and red styling')
  assert.deepEqual(parameterEffectPresentation(-1.2), { text: '-1.20', className: 'text-emerald-700' },
    'negative cost effects show a minus sign and green styling')
  assert.deepEqual(parameterEffectPresentation(0), { text: '0.00', className: 'text-slate-700' },
    'zero parameter effects are neutral and never receive a plus sign')
  assert.deepEqual(parameterEffectPresentation(0.0006), { text: '+0.0006', className: 'text-rose-700' },
    'a positive effect smaller than one displayed cent keeps its sign, precision, and red styling')
  assert.deepEqual(parameterEffectPresentation(-0.0006), { text: '-0.0006', className: 'text-emerald-700' },
    'a negative effect smaller than one displayed cent keeps its sign, precision, and green styling')
  assert.deepEqual(parameterEffectPresentation(-0.001), { text: '-0.0010', className: 'text-emerald-700' },
    'a nonzero effect never becomes neutral or displays as zero')
  assert.deepEqual(parameterEffectPresentation(null), { text: '—', className: 'text-slate-400' },
    'unavailable parameter effects remain unavailable rather than becoming zero')

  assert.deepEqual(positionGraphTooltip(
    { width: 400, height: 300 },
    { left: 180, top: 120, right: 220, bottom: 140 },
    { width: 100, height: 30 }
  ), { x: 150, y: 82 }, 'tooltip centers above the hovered element with a consistent gap when space allows')
  assert.deepEqual(positionGraphTooltip(
    { width: 400, height: 300 },
    { left: 180, top: 4, right: 220, bottom: 14 },
    { width: 100, height: 30 }
  ), { x: 150, y: 22 }, 'tooltip moves below the hovered element when there is insufficient room above')
  assert.deepEqual(positionGraphTooltip(
    { width: 300, height: 200 },
    { left: 0, top: 100, right: 10, bottom: 120 },
    { width: 100, height: 30 }
  ), { x: 8, y: 62 }, 'tooltip clamps to the graph host left edge')
  assert.deepEqual(positionGraphTooltip(
    { width: 300, height: 200 },
    { left: 290, top: 100, right: 300, bottom: 120 },
    { width: 100, height: 30 }
  ), { x: 192, y: 62 }, 'tooltip clamps to the graph host right edge')
  const labelY = (value: number) => 100 - value * 4
  const mixedStack = { positive: 10, negative: -5 }
  for (const [name, metrics] of [
    ['wide', WIDE_GRAPH_LABEL_METRICS],
    ['narrow', NARROW_GRAPH_LABEL_METRICS]
  ] as const) {
    const abovePositive = positionGapTotalLabel(2, mixedStack, labelY, { top: 0, bottom: 200 }, metrics)
    assert.equal(abovePositive.direction, 'above', `${name} positive GAP total sits above the positive stack`)
    assert.equal(abovePositive.edgeY - (abovePositive.baselineY + metrics.descent), 4,
      `${name} positive GAP total keeps four SVG units above its stack edge`)

    const belowNegative = positionGapTotalLabel(-2, mixedStack, labelY, { top: 0, bottom: 200 }, metrics)
    assert.equal(belowNegative.direction, 'below', `${name} negative GAP total sits below the negative stack`)
    assert.equal(belowNegative.baselineY - metrics.ascent - belowNegative.edgeY, 4,
      `${name} negative GAP total keeps four SVG units below its stack edge`)

    const zeroMixed = positionGapTotalLabel(0, mixedStack, labelY, { top: 0, bottom: 200 }, metrics)
    assert.equal(zeroMixed.direction, 'above', `${name} mixed zero GAP total sits above the positive stack`)
    assert.equal(zeroMixed.edgeY - (zeroMixed.baselineY + metrics.descent), 4,
      `${name} mixed zero GAP total keeps four SVG units above its stack edge`)

    const zeroEmpty = positionGapTotalLabel(0, { positive: 0, negative: 0 }, labelY, { top: 0, bottom: 200 }, metrics)
    assert.equal(zeroEmpty.direction, 'above', `${name} empty zero GAP total sits above the zero baseline`)
    assert.equal(zeroEmpty.edgeY - (zeroEmpty.baselineY + metrics.descent), 4,
      `${name} empty zero GAP total has sensible clearance from the zero baseline`)
  }
  const topClampedLabel = positionGapTotalLabel(
    1, { positive: 100, negative: 0 }, value => value === 100 ? 5 : 100,
    { top: 0, bottom: 200 }, WIDE_GRAPH_LABEL_METRICS
  )
  assert.equal(topClampedLabel.baselineY - WIDE_GRAPH_LABEL_METRICS.ascent, 0,
    'GAP total text clamps inside the plot when its preferred position crosses the top edge')

  const cost = (snapshotId: string, material: number, labor: number, burden: number): SnapshotCost => ({
    snapshotId, material, labor, burden, total: material + labor + burden, status: 'complete', warnings: []
  })
  const financial = (standardCost: SnapshotCost, sellingPrice: number, sgaPercent: number): ScenarioFinancialResult =>
    createScenarioFinancialResult(standardCost, calculateScenarioBusinessMetrics({ sellingPrice, sgaPercent }, standardCost.total))

  const reference = cost('ref', 60, 20, 10)
  const current = cost('current', 65, 20, 15)
  const sim = cost('sim', 62, 20, 13)
  const story = createScenarioStory(financial(reference, 120, 8), financial(current, 120, 10), financial(sim, 120, 10))
  assert.equal(story.gap1.standardCost, 10, 'GAP 1 is Current - Reference')
  assert.equal(story.gap2.standardCost, -5, 'GAP 2 is Custom - Current and may be negative')

  const graphParts = [
    { key: 'material', legendKey: 'material', tooltipLabel: 'Material', color: '#6f99c6' },
    { key: 'labor', legendKey: 'labor', tooltipLabel: 'Labor', color: '#e5b46a' },
    { key: 'burden', legendKey: 'burden', tooltipLabel: 'Burden', color: '#9a82c6' },
    { key: 'sgaAmountPerPiece', legendKey: 'sga', tooltipLabel: 'SG&A', color: '#b8c2ce' },
    { key: 'operatingProfitPerPiece', legendKey: null, tooltipLabel: 'Operating Profit', color: '#4b9164' }
  ]
  const allLegendVisible = {
    material: true, labor: true, burden: true, sga: true,
    opPositive: true, opNegative: true, sellingPrice: true, ruler: true
  }
  const tenCostValues = {
    material: 4, labor: 3, burden: 3, sgaAmountPerPiece: 0,
    operatingProfitPerPiece: null
  } as unknown as ScenarioFinancialResult
  const tenCostValuesBefore = { ...tenCostValues }
  const allCostsStack = buildVisibleStack(tenCostValues, graphParts.slice(0, 3), allLegendVisible)
  assert.equal(allCostsStack.total, 10, '4 + 3 + 3 displays as 10 when all cost components are visible')
  assert.equal(buildVisibleStandardCost(tenCostValues, allLegendVisible), 10,
    'visible Standard Cost is Material + Labor + Burden only')
  const canonicalCost = cost('canonical-standard-cost', 4, 3, 3)
  const canonicalFinancial = financial(canonicalCost, 100, 10)
  const canonicalStory = createScenarioStory(canonicalFinancial, canonicalFinancial, canonicalFinancial)
  const canonicalStoryBeforeFilter = JSON.stringify(canonicalStory)
  assert.equal(canonicalStory.current.standardCost, 10, 'the source Standard Cost remains 10')
  assert.equal(buildVisibleStandardCost(canonicalStory.current, { ...allLegendVisible, labor: false }), 7,
    'the filtered graph Standard Cost is 7 when Labor is hidden')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, allLegendVisible).total, 100,
    'Visible + uses all currently visible cost, SG&A, and sign-matched Profit values')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, burden: false }).total, 97,
    'hiding Burden immediately excludes it from Visible +')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, sga: false }).total, 90,
    'hiding SG&A immediately excludes it from Visible +')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, opPositive: false }).total, 20,
    'hiding positive Profit immediately excludes it from Visible +')
  const onlyVisibleCosts = { ...allLegendVisible, sga: false, opPositive: false, opNegative: false }
  const equalVisiblePositive = buildVisibleStack(canonicalStory.current, graphParts, onlyVisibleCosts).total
  assert.equal(equalVisiblePositive, buildVisibleStandardCost(canonicalStory.current, onlyVisibleCosts),
    'Visible + equals the visible Standard Cost when SG&A and Profit are hidden')
  assert.equal(canonicalStory.custom.standardCost, 10, 'the authoritative Custom graph Standard Cost remains 10')
  assert.equal(JSON.stringify(canonicalStory), canonicalStoryBeforeFilter,
    'view filtering leaves the source ScenarioStory and Result values unchanged')
  assert.deepEqual(allCostsStack.segments.map(({ part, before, after }) => [part.key, before, after]), [
    ['material', 0, 4], ['labor', 4, 7], ['burden', 7, 10]
  ])
  const noLaborValues = { ...tenCostValues, labor: null }
  const noLaborStack = buildVisibleStack(noLaborValues, graphParts.slice(0, 3), { ...allLegendVisible, labor: false })
  assert.equal(noLaborStack.total, 7, 'hidden labor is excluded from the visible graph total even when unavailable')
  assert.equal(buildVisibleStandardCost(noLaborValues, { ...allLegendVisible, labor: false }), 7,
    'visible Standard Cost remains present and changes from 10 to 7 when Labor is hidden')
  assert.deepEqual(noLaborStack.segments.map(({ part, before, after }) => [part.key, before, after]), [
    ['material', 0, 4], ['burden', 4, 7]
  ], 'a hidden middle component leaves no empty stack space')
  assert.equal(buildVisibleStack(noLaborValues, graphParts.slice(0, 3), allLegendVisible).total, null,
    'a visible unavailable component keeps the displayed total unavailable')
  assert.equal(buildVisibleStandardCost(tenCostValues, { ...allLegendVisible, sga: false, opPositive: false, opNegative: false }), 10,
    'SG&A and Profit never enter Standard Cost')
  assert.deepEqual(tenCostValues, tenCostValuesBefore, 'graph filtering leaves source values unchanged')
  const expandedScale = buildGraphScale([80, 250])
  const filteredScale = buildGraphScale([80])
  assert.ok(expandedScale.maximum > filteredScale.maximum,
    'hiding a high Selling Price value allows the visible graph scale to refit')
  assert.ok(filteredScale.maximum <= 100 && filteredScale.maximum >= 80,
    'the Y-axis fits a visible maximum near 80 instead of retaining the 250 scale')
  assert.ok(buildGraphScale([-18]).minimum < 0 && buildGraphScale([-18]).maximum === 0,
    'the visible-value scale safely contains negative-only graph data')
  const positiveProfit = { ...tenCostValues, operatingProfitPerPiece: 10 }
  const positiveOnly = buildVisibleStack(positiveProfit, graphParts, { ...allLegendVisible, opNegative: false })
  const wrongProfitSign = buildVisibleStack(positiveProfit, graphParts, { ...allLegendVisible, opPositive: false, opNegative: true })
  assert.equal(positiveOnly.total, 20, 'visible positive Profit contributes with its original sign')
  assert.equal(positiveOnly.segments[positiveOnly.segments.length - 1]?.value, 10)
  assert.equal(wrongProfitSign.total, 10, 'a positive Profit is absent when only Profit minus is enabled')
  assert.doesNotMatch(JSON.stringify(wrongProfitSign.segments), /operatingProfitPerPiece/)
  const negativeProfit = { ...tenCostValues, operatingProfitPerPiece: -5 }
  const negativeOnly = buildVisibleStack(negativeProfit, graphParts, { ...allLegendVisible, opPositive: false })
  const wrongNegativeSign = buildVisibleStack(negativeProfit, graphParts, { ...allLegendVisible, opPositive: true, opNegative: false })
  assert.equal(negativeOnly.total, 5)
  assert.equal(negativeOnly.negative, -5, 'negative Profit retains its negative stack direction')
  assert.equal(wrongNegativeSign.total, 10, 'negative Profit is absent when only Profit plus is enabled')

  const storyBeforeRender = JSON.stringify(story)
  const graphMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story, unit: 'PC', activeRole: 'current', onSelectActiveDataset() {}
  }))
  assert.equal(JSON.stringify(story), storyBeforeRender, 'rendering the graph does not mutate ScenarioStory')
  const graphSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationStoryGraph.tsx'), 'utf8')
  const numericSvgAttribute = (tag: string, attribute: string) =>
    Number(tag.match(new RegExp(`(?:^|\\s)${attribute}="([^"]+)"`))?.[1])
  const graphLabelTag = (markup: string, attribute: string, state: string) =>
    markup.match(new RegExp(`<text\\b[^>]*${attribute}="${state}"[^>]*>`))?.[0] ?? ''
  const graphLabelText = (markup: string, attribute: string, state: string) =>
    markup.match(new RegExp(`<text\\b[^>]*${attribute}="${state}"[^>]*>([\\s\\S]*?)<\\/text>`))?.[1]
      ?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() ?? ''
  const estimatedTextBounds = (x: number, y: number, text: string, anchor: 'middle' | 'start') => {
    const width = text.length * 5.4
    const left = anchor === 'middle' ? x - width / 2 : x
    return { left, right: left + width, top: y - 8.25, bottom: y + 2.35 }
  }
  const boundsOverlap = (first: { left: number; right: number; top: number; bottom: number },
    second: { left: number; right: number; top: number; bottom: number }, clearance = 0) =>
    first.left - clearance <= second.right && first.right + clearance >= second.left &&
    first.top - clearance <= second.bottom && first.bottom + clearance >= second.top
  const graphGapRectangles = (markup: string, gap: string) => {
    const gapGroup = markup.match(new RegExp(`<g\\b[^>]*data-graph-gap="${gap}"[^>]*>([\\s\\S]*?)<\\/g>`))?.[1] ?? ''
    return [...gapGroup.matchAll(/<rect\b[^>]*data-graph-part="([^"]+)"[^>]*>/g)].map(([tag, part]) => ({
      part,
      x: numericSvgAttribute(tag, 'x'),
      y: numericSvgAttribute(tag, 'y'),
      width: numericSvgAttribute(tag, 'width'),
      height: numericSvgAttribute(tag, 'height')
    }))
  }
  const assertGapTotalOutsideStack = (markup: string, gap: 'gap1' | 'gap2', direction: 'above' | 'below') => {
    const rectangles = graphGapRectangles(markup, gap)
    assert.ok(rectangles.length > 0, `${gap} mixed-sign fixture renders its component bars`)
    const label = graphLabelTag(markup, 'data-graph-total', gap)
    const bounds = estimatedTextBounds(
      numericSvgAttribute(label, 'x'),
      numericSvgAttribute(label, 'y'),
      graphLabelText(markup, 'data-graph-total', gap),
      'middle'
    )
    const outerEdge = direction === 'above'
      ? Math.min(...rectangles.map(rectangle => rectangle.y))
      : Math.max(...rectangles.map(rectangle => rectangle.y + rectangle.height))
    const clearance = direction === 'above' ? outerEdge - bounds.bottom : bounds.top - outerEdge
    assert.ok(clearance >= 4, `${gap} total text has at least 4 SVG units of clearance ${direction} its outer stack edge`)
    assert.ok(rectangles.every(rectangle => !boundsOverlap(bounds, {
      left: rectangle.x,
      right: rectangle.x + rectangle.width,
      top: rectangle.y,
      bottom: rectangle.y + rectangle.height
    })), `${gap} total text does not intersect any rendered component rectangle`)
    return clearance
  }
  const sellingPriceLineSegments = (markup: string) => [...markup.matchAll(/<path\b(?=[^>]*stroke="#2563eb")[^>]*>/g)]
    .flatMap(([tag]) => {
      const coordinates = tag.match(/d="M ([^ ]+) ([^ ]+) L ([^ ]+) ([^"]+)"/)
      return coordinates ? [{ x1: Number(coordinates[1]), y1: Number(coordinates[2]), x2: Number(coordinates[3]), y2: Number(coordinates[4]) }] : []
    })
  const sellingPricePoint = (markup: string, x: number) => {
    const tag = markup.match(new RegExp(`<circle\\b[^>]*cx="${x}"[^>]*r="3\\.5"[^>]*>`))?.[0] ?? ''
    return tag ? { tag, x: numericSvgAttribute(tag, 'cx'), y: numericSvgAttribute(tag, 'cy') } : null
  }
  const priceLineCrossesText = (segment: { x1: number; y1: number; x2: number; y2: number },
    bounds: { left: number; right: number; top: number; bottom: number }, clearance = 2) => {
    const left = Math.max(Math.min(segment.x1, segment.x2), bounds.left - clearance)
    const right = Math.min(Math.max(segment.x1, segment.x2), bounds.right + clearance)
    if (left > right) return false
    const yAt = (x: number) => segment.y1 + ((x - segment.x1) / (segment.x2 - segment.x1)) * (segment.y2 - segment.y1)
    const lineTop = Math.min(yAt(left), yAt(right)) - 1
    const lineBottom = Math.max(yAt(left), yAt(right)) + 1
    return lineTop <= bounds.bottom + clearance && lineBottom >= bounds.top - clearance
  }
  const statePriceGeometryCrowds = (markup: string, stateX: number,
    bounds: { left: number; right: number; top: number; bottom: number }, clearance = 2) => {
    const point = sellingPricePoint(markup, stateX)
    const pointCrowds = point && boundsOverlap(bounds, {
      left: point.x - 4, right: point.x + 4, top: point.y - 4, bottom: point.y + 4
    }, clearance)
    const incidentLines = sellingPriceLineSegments(markup).filter(line => line.x1 === stateX || line.x2 === stateX)
    return Boolean(pointCrowds || incidentLines.some(line => priceLineCrossesText(line, bounds, clearance)))
  }
  const svgTextLabels = [...graphMarkup.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => match[1].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim())
  const gapTotalLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-total="(gap1|gap2)"[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => [match[1], match[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()])
  assert.deepEqual(gapTotalLabels, [['gap1', '+10.00'], ['gap2', '-5.00']],
    'Gap bars retain their visible signed contribution totals')

  const graphFinancial = (material: number, labor: number, burden: number): ScenarioFinancialResult => ({
    material,
    labor,
    burden,
    standardCost: material + labor + burden,
    sgaAmountPerPiece: 0,
    operatingProfitPerPiece: 0,
    sellingPrice: null
  })
  const renderMixedSignGap = (material: number, labor: number, burden: number) => {
    const referenceFinancial = graphFinancial(2, 2, 0)
    const currentFinancial = graphFinancial(material, labor, burden)
    return renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
      story: createScenarioStory(referenceFinancial, currentFinancial, currentFinancial),
      unit: 'PC',
      activeRole: 'current',
      onSelectActiveDataset() {}
    }))
  }
  const mixedNegativeGapMarkup = renderMixedSignGap(2.3, 1.23, 0)
  assert.equal(graphLabelText(mixedNegativeGapMarkup, 'data-graph-total', 'gap1'), '-0.47',
    'mixed-sign negative GAP total remains the net of +0.30 Material and -0.77 Labor')
  assertGapTotalOutsideStack(mixedNegativeGapMarkup, 'gap1', 'below')

  const mixedPositiveGapMarkup = renderMixedSignGap(3.3, 1.17, 0)
  assert.equal(graphLabelText(mixedPositiveGapMarkup, 'data-graph-total', 'gap1'), '+0.47',
    'mixed-sign positive GAP total remains the net of +1.30 Material and -0.83 Labor')
  assertGapTotalOutsideStack(mixedPositiveGapMarkup, 'gap1', 'above')

  const mixedZeroGapMarkup = renderMixedSignGap(3, 1, 0)
  assert.equal(graphLabelText(mixedZeroGapMarkup, 'data-graph-total', 'gap1'), '0.00',
    'a mixed-sign zero GAP remains displayed as 0.00')
  assertGapTotalOutsideStack(mixedZeroGapMarkup, 'gap1', 'above')

  const noSegmentZeroGapMarkup = renderMixedSignGap(2, 2, 0)
  const noSegmentZeroGapLabel = graphLabelTag(noSegmentZeroGapMarkup, 'data-graph-total', 'gap1')
  const noSegmentZeroGapRectangles = graphGapRectangles(noSegmentZeroGapMarkup, 'gap1')
  const noSegmentZeroGapBounds = estimatedTextBounds(
    numericSvgAttribute(noSegmentZeroGapLabel, 'x'),
    numericSvgAttribute(noSegmentZeroGapLabel, 'y'),
    graphLabelText(noSegmentZeroGapMarkup, 'data-graph-total', 'gap1'),
    'middle'
  )
  const zeroGridlineY = Number(noSegmentZeroGapMarkup.match(/<line x1="55" x2="765" y1="([^"]+)" y2="[^"]+" stroke="#94a3b8" stroke-width="1\.2"/)
    ?.[1])
  assert.deepEqual(noSegmentZeroGapRectangles, [], 'a zero GAP with no non-zero components renders no bar rectangles')
  assert.equal(graphLabelText(noSegmentZeroGapMarkup, 'data-graph-total', 'gap1'), '0.00')
  assert.ok(zeroGridlineY - noSegmentZeroGapBounds.bottom >= 4 && zeroGridlineY - noSegmentZeroGapBounds.bottom <= 12,
    'a zero GAP with no visible segments keeps its label a small, clear distance above the zero baseline')

  const standardCostLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => [match[1], match[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()])
  assert.deepEqual(standardCostLabels, [['reference', '90.00'], ['current', '100.00'], ['custom', '95.00']],
    'Reference/Current/Custom display Standard Cost at the visible Material + Labor + Burden boundary')
  const visiblePositiveLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-visible-total-value="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => [match[1], match[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()])
  assert.deepEqual(visiblePositiveLabels, [['reference', '+120.00'], ['current', '+120.00'], ['custom', '+120.00']],
    'Reference/Current/Custom show the signed total of all visible stack segments')
  assert.doesNotMatch(graphMarkup, /data-graph-visible-total-value="(?:gap1|gap2)"/,
    'Visible + is not added to GAP 1 or GAP 2')
  const standardCostLineTags = new Map([...graphMarkup.matchAll(/<line\b[^>]*data-graph-standard-cost="(reference|current|custom)"[^>]*>/g)]
    .map(match => [match[1], match[0]] as const))
  const standardCostValueTags = new Map([...graphMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="(reference|current|custom)"[^>]*>/g)]
    .map(match => [match[1], match[0]] as const))
  const graphStateXs = [130, 410, 690] as const
  for (const [state, x] of [['reference', graphStateXs[0]], ['current', graphStateXs[1]], ['custom', graphStateXs[2]]] as const) {
    const boundaryLine = standardCostLineTags.get(state)
    const valueLabel = standardCostValueTags.get(state)
    assert.ok(boundaryLine && valueLabel, `${state} includes its Standard Cost line and value label`)
    assert.ok(numericSvgAttribute(valueLabel, 'x') - numericSvgAttribute(boundaryLine, 'x2') > 4,
      `${state} Standard Cost text keeps a small gap beyond the old near-touching spacing`)
    assert.equal(numericSvgAttribute(valueLabel, 'x'), x + 35,
      `${state} Standard Cost keeps its existing numeric column`)
    assert.equal(numericSvgAttribute(valueLabel, 'y') - 8.25, numericSvgAttribute(boundaryLine, 'y1'),
      `${state} Standard Cost value level aligns with its text top edge`)
  }
  assert.doesNotMatch(graphMarkup, /data-graph-total="(?:reference|current|custom)"/,
    'full commercial-stack values are not duplicated above dataset states')
  const datasetButtons = [...graphMarkup.matchAll(/<button\b([^>]*aria-label="Select (Reference|Current|Custom) as active dataset"[^>]*)>([\s\S]*?)<\/button>/g)]
    .map(([, attributes, label, content]) => ({ attributes, label: content.replace(/<[^>]*>/g, '').trim() || label }))
  assert.deepEqual(datasetButtons.map(button => button.label), ['Reference', 'Current', 'Custom'],
    'the graph exposes Reference, Current, and Custom as dataset controls')
  const activeDatasetButton = datasetButtons.find(button => button.attributes.includes('aria-pressed="true"'))
  assert.ok(activeDatasetButton, 'the selected graph dataset remains exposed with aria-pressed')
  assert.match(graphMarkup, /after:h-0\.5[^"]*after:bg-slate-950/,
    'the selected graph dataset uses the lightweight dark underline')
  assert.doesNotMatch(graphMarkup, /after:bg-blue-700/,
    'the selected graph dataset has no blue underline')
  assert.doesNotMatch(activeDatasetButton.attributes, /border-blue|bg-blue|shadow/,
    'the selected graph dataset has no persistent box or fill')
  assert.deepEqual(svgTextLabels.filter(label => ['GAP 1', 'GAP 2'].includes(label)), ['GAP 1', 'GAP 2'],
    'the two fixed gap labels remain informational SVG text')
  assert.ok(!svgTextLabels.some(label => ['REF', 'CUR', 'SIM'].includes(label)),
    'the graph does not show abbreviated category labels')
  assert.match(graphMarkup, /GAP 1 · Current − Reference · Material Gap: \+5\.00 THB\/PC/)
  assert.match(graphMarkup, /GAP 2 · Custom − Current · Material Gap: -3\.00 THB\/PC/)
  assert.doesNotMatch(graphMarkup, /\bSC [+-]\d/, 'gap labels do not use the ambiguous SC +/- notation')
  const firstBarIndex = graphMarkup.indexOf('fill="#6f99c6"')
  const rulerLineIndex = graphMarkup.indexOf('stroke-dasharray="4 5"')
  assert.ok(firstBarIndex >= 0 && rulerLineIndex > firstBarIndex, 'the visible ruler line is drawn in front of the bars')
  for (const [part, color] of [['MAT', '#6f99c6'], ['LB', '#e5b46a'], ['BD', '#9a82c6']]) {
    assert.ok(graphMarkup.includes(`fill="${color}"`), `${part} uses the exact CBD palette color in the graph bars`)
    assert.ok(graphMarkup.includes(`background-color:${color}`), `${part} uses the exact CBD palette color in the legend`)
  }
  assert.match(graphMarkup, /Cost Structure/)
  assert.match(graphMarkup, /<figure aria-labelledby="simulation-story-title"/,
    'the graph figure has an accessible name from its visible heading')
  assert.match(graphMarkup, /<svg aria-labelledby="simulation-story-title" aria-describedby="simulation-story-svg-description"/,
    'the SVG retains both its accessible name and description')
  assert.match(graphMarkup, /<desc id="simulation-story-svg-description">Reference, Current, and Custom show visible/,
    'the SVG description retains the full scenario names for assistive technology')
  assert.match(graphMarkup, /preserveAspectRatio="xMidYMid meet"/,
    'the responsive graph preserves circular markers and undistorted text and lines')
  assert.doesNotMatch(graphMarkup, /<title\b|\stitle=/, 'graph elements do not expose native hover tooltips')
  assert.match(graphMarkup, /<h2 id="simulation-story-title"[^>]*>Cost Structure<\/h2>[\s\S]*?<ul aria-label="Simulation graph legend"/,
    'the graph title and legend share the header area')
  assert.match(graphMarkup, /<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul><button type="button" disabled=""[^>]*>Show all<\/button>/,
    'Show all is a separate action after the eight Legend controls and is disabled initially')
  const legendMarkup = graphMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
  assert.match(legendMarkup, /xl:flex-none/,
    'the Legend remains its own compact group at desktop widths')
  const legendButtonTags = [...legendMarkup.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag)
  assert.equal(legendButtonTags.length, 8, 'all eight legend controls render as actual buttons')
  for (const [index, buttonTag] of legendButtonTags.entries()) {
    assert.match(buttonTag, /type="button"/, `legend button ${index + 1} has button semantics`)
    assert.match(buttonTag, /aria-pressed="true"/, `legend button ${index + 1} starts enabled`)
    assert.doesNotMatch(buttonTag, /\bdisabled=|\btabindex="-1"/, `legend button ${index + 1} remains keyboard reachable`)
    assert.match(buttonTag, /focus-visible:outline/, `legend button ${index + 1} keeps a visible keyboard focus style`)
  }
  const showAllTag = graphMarkup.match(/<button\b[^>]*disabled=""[^>]*>Show all<\/button>/)?.[0] ?? ''
  assert.match(showAllTag, /type="button"/, 'Show all retains native button semantics while initially disabled')
  assert.match(showAllTag, /min-\[720px\]:ml-auto/, 'Show all is pushed to the far edge of the graph card header')
  assert.match(graphSource, /disabled=\{allLegendVisible\}/,
    'Show all becomes keyboard reachable once any Legend item is hidden')
  assert.match(graphSource, /focus-visible:outline[^`]*min-\[720px\]:self-auto/,
    'Show all keeps a visible keyboard focus style when enabled')
  assert.match(graphSource, /const allLegendVisible = LEGEND_ITEMS\.every\(item => visibleLegend\[item\.key\]\)/,
    'Show all disabled state derives from all eight existing Legend visibility values')
  assert.match(graphSource, /disabled=\{allLegendVisible\}/,
    'Show all is disabled only while every Legend item is visible')
  assert.match(graphSource, /onClick=\{\(\) => setVisibleLegend\(DEFAULT_LEGEND_VISIBILITY\)\}/,
    'Show all restores the existing all-visible Legend state')
  assert.match(graphSource, /min-h-6 self-end rounded-sm px-0\.5 text-\[11px\][^`]*focus-visible:outline[^`]*min-\[720px\]:self-auto/,
    'Show all uses lightweight Legend typography and visible keyboard focus styling')
  assert.match(graphSource, /'cursor-default text-slate-400' : 'cursor-pointer text-slate-700 hover:underline'/,
    'Show all has a muted default-cursor disabled state and a hover-only underline when enabled')
  const graphHeaderClasses = graphSource.match(/<div className="flex min-w-0 flex-col gap-1\.5 border-b border-slate-200 pb-1\.5 ([^"]+)"/)?.[1] ?? ''
  assert.match(graphHeaderClasses, /xl:flex-nowrap/, 'desktop graph title, legend, and Show all stay on one row')
  assert.doesNotMatch(graphHeaderClasses, /justify-between/,
    'the graph title and legend stay grouped instead of pushing the legend to the far edge')
  assert.match(graphMarkup, /GAP 1 is Current minus Reference; GAP 2 is Custom minus Current/)
  assert.match(graphMarkup, /Legend filters change this graph view only, not Result or source data/)
  assert.match(graphMarkup, /data-y-axis="true"/, 'the graph renders a visible Y-axis line')
  assert.match(graphMarkup, /data-y-axis-unit="true"[^>]*>THB\/PC<\/text>/, 'the dynamic UOM is attached to the Y axis')
  const yAxisLineTag = graphMarkup.match(/<line\b[^>]*data-y-axis="true"[^>]*>/)?.[0] ?? ''
  const yAxisUnitTag = graphMarkup.match(/<text\b[^>]*data-y-axis-unit="true"[^>]*>/)?.[0] ?? ''
  assert.ok(yAxisLineTag && yAxisUnitTag)
  assert.equal(numericSvgAttribute(yAxisLineTag, 'x1'), 55, 'the plot uses the reduced left gutter')
  assert.equal(numericSvgAttribute(yAxisLineTag, 'y1'), 32, 'the plot reduces its top margin')
  assert.equal(numericSvgAttribute(yAxisLineTag, 'y2'), 280, 'the plot uses more of its available height')
  assert.equal(numericSvgAttribute(yAxisUnitTag, 'x'), 55, 'the THB/PC label stays centered over the Y axis')
  const firstGridlineTag = graphMarkup.match(/<line x1="55" x2="765" y1="[^"]+" y2="[^\"]+" stroke=/)?.[0] ?? ''
  assert.ok(firstGridlineTag, 'gridlines span the fitted plot')
  const rulerLineTag = graphMarkup.match(/<line\b[^>]*data-ruler-line="true"[^>]*>/)?.[0] ?? ''
  assert.equal(numericSvgAttribute(rulerLineTag, 'x1'), 55, 'the ruler begins at the plot edge')
  assert.equal(numericSvgAttribute(rulerLineTag, 'x2'), 765, 'the ruler ends at the plot edge')
  assert.equal(numericSvgAttribute(rulerLineTag, 'x2') - numericSvgAttribute(rulerLineTag, 'x1'), 710,
    'the fitted plot width grows beyond the audited 632-unit baseline')
  const axisTickTags = [...graphMarkup.matchAll(/<text\b[^>]*data-axis-tick="[^"]+"[^>]*>[^<]*<\/text>/g)].map(([tag]) => tag)
  assert.ok(axisTickTags.length > 0 && axisTickTags.every(tag => numericSvgAttribute(tag, 'x') === 45),
    'Y-axis tick labels stay ten units left of the plot')
  const lowestTickLeft = Math.min(...axisTickTags.map(tag => {
    const text = tag.match(/>([^<]+)<\/text>/)?.[1] ?? ''
    return numericSvgAttribute(tag, 'x') - text.length * 5.4 - 16
  }))
  const unitText = yAxisUnitTag.match(/>([^<]+)<\/text>/)?.[1] ?? ''
  const unitTextLeft = numericSvgAttribute(yAxisUnitTag, 'x') - 16 - unitText.length * 6.6 / 2
  assert.ok(lowestTickLeft > 0 && unitTextLeft > 0, 'Y-axis tick and THB/PC labels stay inside the SVG left edge')
  const gapTotalTags = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-total="(gap1|gap2)"[^>]*>/g)]
  assert.deepEqual(gapTotalTags.map(([tag, gap]) => [gap, numericSvgAttribute(tag, 'x')]), [['gap1', 270], ['gap2', 550]],
    'GAP bars use the canonical category centers')
  const roleLabelTags = [...graphMarkup.matchAll(/<foreignObject x="(\d+)" y="291" width="106" height="28">/g)]
  assert.deepEqual(roleLabelTags.map(([, x]) => Number(x)), [77, 357, 637],
    'Reference, Current, and Custom controls align with the canonical state centers')
  assert.deepEqual(sellingPriceLineSegments(graphMarkup).map(({ x1, x2 }) => [x1, x2]), [[130, 410], [410, 690]],
    'Selling Price segments follow the same canonical state centers')
  assert.deepEqual(graphStateXs.map(x => sellingPricePoint(graphMarkup, x)?.x ?? null), graphStateXs,
    'Selling Price points follow the same canonical state centers')
  assert.doesNotMatch(graphMarkup, /translate\(-16 0\)|translate\(-24 0\)/,
    'the graph has no outer SVG translation')
  assert.doesNotMatch(graphSource, /GRAPH_X_SHIFT|translate\(-16 0\)|translate\(-24 0\)/,
    'the graph has no duplicate global X shift')
  assert.match(graphSource, /const GRAPH_X = \{[\s\S]*?plotLeft: 55,[\s\S]*?plotRight: 765,[\s\S]*?reference: 130,[\s\S]*?gap1: 270,[\s\S]*?current: 410,[\s\S]*?gap2: 550,[\s\S]*?custom: 690/,
    'plot and all category centers use one canonical X geometry')
  assert.match(graphSource, /const plot = \{ left: GRAPH_X\.plotLeft, right: GRAPH_X\.plotRight, top: 32, bottom: 280 \}/,
    'the fitted vertical plot bounds use one canonical geometry')
  assert.match(graphMarkup, /viewBox="0 0 820 332"/, 'the fixed graph viewBox keeps its existing dimensions')
  assert.ok([130, 270, 410, 550, 690].every(x => x >= 55 && x <= 765),
    'all five category centers stay inside the fitted plot bounds')
  assert.ok(numericSvgAttribute(standardCostValueTags.get('custom') ?? '', 'x') + 5 * 5.4 < 820,
    'the Custom Standard Cost label stays inside the SVG viewBox')
  assert.match(graphSource, /x: state\.x,[\s\S]*?path: `M \$\{state\.x\} \$\{y\(first\)\} L \$\{nextState\.x\} \$\{y\(second\)\}`/,
    'Selling Price paths and points derive their x coordinates from the canonical state centers')
  assert.doesNotMatch(yAxisUnitTag, /transform=|rotate\(\s*-90/, 'the Y-axis unit label stays horizontal')
  assert.ok(numericSvgAttribute(yAxisUnitTag, 'y') < numericSvgAttribute(yAxisLineTag, 'y1'),
    'the horizontal UOM label sits above the Y-axis')
  for (const [state, value, tooltip] of [
    ['reference', '90.00', 'Reference Standard Cost · 90.00 THB/PC'],
    ['current', '100.00', 'Current Standard Cost · 100.00 THB/PC'],
    ['custom', '95.00', 'Custom Standard Cost · 95.00 THB/PC']
  ]) {
    assert.match(graphMarkup, new RegExp(`data-graph-standard-cost="${state}"`), `${state} Standard Cost boundary remains visible`)
    assert.ok(graphMarkup.includes(`aria-label="${tooltip}"`), `${state} Standard Cost tooltip uses its visible value and UOM`)
    assert.ok(standardCostLabels.some(([labelState, labelValue]) => labelState === state && labelValue === value),
      `${state} Standard Cost value is displayed`)
  }
  assert.match(graphMarkup, /aria-label="Reference Material: 60\.00 THB\/PC"/)
  assert.match(graphMarkup, /aria-label="GAP 1 · Current − Reference · Material Gap: \+5\.00 THB\/PC"/)
  const graphTooltipTags = [...graphMarkup.matchAll(/<[a-z][^>]*data-graph-tooltip="true"[^>]*>/gi)].map(([tag]) => tag)
  assert.ok(graphTooltipTags.length > 0, 'informational graph marks retain pointer-tooltip targets')
  assert.ok(graphTooltipTags.every(tag => !/\btabindex=/i.test(tag)),
    'informational graph SVG marks are not extra Tab stops')
  assert.ok(graphTooltipTags.every(tag => !/focus-visible:outline|focus:outline/i.test(tag)),
    'informational graph SVG marks do not add a keyboard focus frame')
  const graphTooltipPropsSource = graphSource.slice(graphSource.indexOf('const tooltipProps ='), graphSource.indexOf('const tooltipPointerProps ='))
  assert.match(graphTooltipPropsSource, /onPointerEnter:/, 'informational marks still open tooltips on pointer entry')
  assert.match(graphTooltipPropsSource, /onPointerLeave:/, 'informational marks still close tooltips on pointer exit')
  assert.doesNotMatch(graphTooltipPropsSource, /setTimeout|delay/i, 'pointer tooltips still appear immediately')
  assert.doesNotMatch(graphTooltipPropsSource, /tabIndex|onFocus|onBlur|focus-visible:outline|focus:outline/,
    'pointer tooltip marks do not add keyboard focus handling or a focus frame')
  assert.match(graphSource, /Math\.min\(360, hostBounds\.width - 16\)/,
    'tooltip width can use the graph host space up to a readable maximum')
  assert.match(graphSource, /className="[^"]*break-words[^"]*text-\[11px\]/,
    'long tooltip text wraps instead of overflowing its available width')
  const tooltipClass = graphSource.match(/className="([^"]*break-words[^"]*)"/)?.[1] ?? ''
  assert.doesNotMatch(tooltipClass, /whitespace-nowrap|white-space:\s*nowrap/,
    'tooltips are not forced onto one line on narrow viewports')
  const tooltipPlacementHelper = graphSource.slice(graphSource.indexOf('export function positionGraphTooltip'), graphSource.indexOf('function formatValue'))
  assert.match(tooltipPlacementHelper, /anchorBounds\.left \+ anchorBounds\.right - tooltipBounds\.width/,
    'tooltip horizontal position is centered on the hovered element')
  assert.match(tooltipPlacementHelper, /aboveY >= inset \? aboveY : belowY/,
    'tooltip prefers above the hovered element and falls below only when above does not fit')
  assert.match(tooltipPlacementHelper, /hostBounds\.width - tooltipBounds\.width - inset/,
    'tooltip horizontal position is clamped inside the graph host')
  assert.match(tooltipPlacementHelper, /hostBounds\.height - tooltipBounds\.height - inset/,
    'tooltip vertical position is clamped inside the graph host')
  const showTooltipSource = graphSource.slice(graphSource.indexOf('const showTooltipAt ='), graphSource.indexOf('const tooltipProps ='))
  assert.match(showTooltipSource, /target\.getBoundingClientRect\(\)/,
    'tooltip anchoring uses the hovered SVG element rendered bounds')
  assert.doesNotMatch(showTooltipSource, /clientX|clientY/,
    'tooltip anchoring does not depend on pointer coordinates')
  assert.match(showTooltipSource, /anchor:\s*\{[\s\S]*elementBounds\.left[\s\S]*elementBounds\.top[\s\S]*elementBounds\.right[\s\S]*elementBounds\.bottom/,
    'the active tooltip retains the full hovered element bounds')
  assert.doesNotMatch(showTooltipSource, /onPointerMove|event\.clientX|event\.clientY/,
    'moving the pointer within one tooltip target does not move the tooltip')
  const tooltipPositionSource = graphSource.slice(graphSource.indexOf('useIsomorphicLayoutEffect(() =>'), graphSource.indexOf('const updateRulerFromPointer'))
  assert.match(tooltipPositionSource, /positionGraphTooltip\(/,
    'the measured tooltip and anchor bounds determine its rendered position')
  assert.doesNotMatch(tooltipPositionSource, /overlapsCategoryLabel|text\[y="306"\]/,
    'all graph tooltip targets use the same element-based placement rule without category-specific placement')
  assert.match(graphMarkup, /fill="none" stroke="#334155" stroke-width="1"/, 'Standard Cost uses a neutral outline without another fill')
  const rulerControlTag = graphMarkup.match(/<g\b[^>]*role="slider"[^>]*>/)?.[0] ?? ''
  assert.match(rulerControlTag, /tabindex="0"/, 'the ruler remains reachable as a keyboard slider')
  assert.match(rulerControlTag, /aria-label="Simulation comparison ruler"[^>]*aria-orientation="vertical"[^>]*class="[^"]*cursor-ns-resize/,
    'the ruler keeps its vertical resize cursor')
  assert.doesNotMatch(graphMarkup, /cursor-help/, 'graph information targets do not show a help cursor')
  assert.match(graphMarkup, /aria-valuetext="[^\"]+ THB\/PC"/)
  const rulerValueTag = graphMarkup.match(/<text\b[^>]*data-ruler-value="true"[^>]*>/)?.[0] ?? ''
  const rulerValueX = numericSvgAttribute(rulerValueTag, 'x')
  assert.match(rulerValueTag, /text-anchor="start"/, 'the ruler value starts immediately right of the plot')
  assert.equal(rulerValueX, 771, 'the accepted Ruler gutter begins six units after the plot')
  assert.doesNotMatch(rulerValueTag, /textLength|lengthAdjust/, 'the accepted Ruler has no forced glyph compression')
  assert.match(graphSource, /onKeyDown=\{handleRulerKeyDown\}/, 'the visual ruler remains keyboard operable')
  const rulerKeyHandlerSource = graphSource.slice(graphSource.indexOf('const handleRulerKeyDown'), graphSource.indexOf('const pricePoints'))
  assert.match(rulerKeyHandlerSource, /ArrowUp:\s*step/)
  assert.match(rulerKeyHandlerSource, /ArrowDown:\s*-step/)
  assert.match(rulerKeyHandlerSource, /PageUp:\s*step \* 10/)
  assert.match(rulerKeyHandlerSource, /PageDown:\s*-step \* 10/)
  assert.match(rulerKeyHandlerSource, /event\.key === 'Home'[\s\S]*setManualRulerLevel\(minimum\)/)
  assert.match(rulerKeyHandlerSource, /event\.key === 'End'[\s\S]*setManualRulerLevel\(maximum\)/)
  assert.match(graphSource, /const threshold = span \* 0\.008/, 'ruler snapping keeps its small threshold')
  assert.ok(graphSource.includes('stroke={RULER_COLOR} strokeWidth="1.4"'), 'the ruler line keeps one dark visual state')
  assert.doesNotMatch(graphSource, /rulerFocused|setRulerFocused/, 'ruler focus does not change its color')
  assert.match(graphSource, /outline-none focus:outline-none focus-visible:outline-none/,
    'the Ruler has no visible frame when focused by pointer or keyboard')
  assert.match(graphSource, /onPointerDown=/, 'the visual ruler still responds to pointer start')
  assert.match(graphSource, /onPointerMove=/, 'the visual ruler still responds to pointer movement')
  assert.match(graphSource, /onPointerUp=/, 'the visual ruler still responds to pointer release')
  assert.match(graphSource, /onPointerCancel=/, 'the visual ruler releases pointer capture on cancellation')
  assert.doesNotMatch(graphMarkup, /fill-opacity=|fillOpacity=/, 'all graph bar fills remain solid')
  assert.match(graphMarkup, /Selling Price<\/span>/, 'Selling Price remains a separate graph legend item')
  assert.match(graphMarkup, /aria-pressed="true"/)
  const pressedLegendMarkup = graphMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
  assert.equal([...pressedLegendMarkup.matchAll(/aria-pressed="true"/g)].length, 8, 'all eight legend items are on by default')
  for (const label of ['Material', 'Labor', 'Burden', 'SG&amp;A', 'Profit +', 'Profit −', 'Selling Price', 'Ruler']) {
    assert.ok(legendMarkup.includes(`aria-label="${label}"`), `the visible Legend uses the full ${label} label`)
  }
  assert.match(graphSource, /text-slate-500/, 'an OFF legend item remains readable while looking disabled')
  assert.match(graphSource, /isVisible \? 'border' : 'border-2'/,
    'OFF square indicators keep a clearly visible solid outline')
  assert.match(graphSource, /backgroundColor: isVisible \? item\.color : 'transparent'/,
    'OFF bar indicators stay hollow')
  assert.match(graphSource, /borderColor: item\.color/,
    'OFF bar indicators retain their own category color outline')
  assert.match(graphSource, /isVisible \? item\.color : '#64748b'/,
    'OFF line indicators switch to neutral gray')
  assert.doesNotMatch(graphSource, /opacity-40|>OFF</, 'an OFF legend item remains visible without fading or an extra badge')
  assert.match(graphSource, /marker: 'sellingPrice'/)
  assert.match(graphSource, /marker: 'ruler'/)
  assert.match(graphSource, /border-t-2 border-solid/)
  assert.match(graphSource, /border-t-2 border-dashed/)
  const legendClasses = graphSource.match(/<ul aria-label="Simulation graph legend" className="([^"]+)">/)?.[1] ?? ''
  assert.match(legendClasses, /xl:flex-nowrap[^\"]*xl:gap-x-1[^\"]*xl:pl-1\.5/, 'desktop legend stays on one line with compact, readable spacing')
  assert.match(graphSource, /xl:shrink-0/, 'desktop legend controls keep their full labels without shrinking')
  const layoutBreakpoint = graphHeaderClasses.match(/(?:min-\[\d+px\]|sm|md|lg|xl):flex-row(?=\s|$)/)?.[0]?.replace(/:flex-row$/, '')
  const dividerBreakpoint = legendClasses.match(/(?:min-\[\d+px\]|sm|md|lg|xl):border-l(?=\s|$)/)?.[0]?.replace(/:border-l$/, '')
  assert.ok(layoutBreakpoint && dividerBreakpoint)
  assert.equal(dividerBreakpoint, layoutBreakpoint,
    'the legend divider appears at the same responsive breakpoint as the header layout change')
  assert.doesNotMatch(legendMarkup, /aria-label="(?:MAT|LB|BD|OP[+−])"/)
  assert.doesNotMatch(graphMarkup, />SP\s+\d/, 'Selling Price labels do not use the SP prefix')
  assert.doesNotMatch(graphSource, /highlightedParts|highlighted\s*\?/, 'graph bars have no parameter-selection highlight')
  assert.doesNotMatch(graphSource, /fill="transparent"[^>]*width=\{plot\.right - plot\.left\}[^>]*height=\{plot\.bottom - plot\.top\}/,
    'the ruler does not use a full-plot transparent overlay')
  assert.match(graphSource, /y=\{rulerY - 5\} width=\{plot\.right - plot\.left\} height="10" fill="transparent" pointerEvents="all"/,
    'the ruler uses a local 10px hit target centered on the line')
  assert.doesNotMatch(graphMarkup, /RULER\s+\d/, 'the ruler has no redundant label or box')
  assert.match(graphMarkup, /data-axis-tick="0"/)
  assert.doesNotMatch(graphSource, /THB\/pc|THB\/Unit/, 'the graph does not hard-code a UOM')
  const scaleCalculation = graphSource.slice(graphSource.indexOf('const rangeValues = useMemo'), graphSource.indexOf('const plot ='))
  assert.match(scaleCalculation, /stateStacks[\s\S]*gapStacks[\s\S]*standardCostValues[\s\S]*visibleLegend\.sellingPrice/,
    'the Y scale follows visible state/gap/Standard Cost values and only includes visible Selling Price')
  const gap1TotalTag = graphMarkup.match(/<text\b[^>]*data-graph-total="gap1"[^>]*>/)?.[0] ?? ''
  const gap2TotalTag = graphMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.match(gap1TotalTag, /fill="#be123c"/, 'positive cost gap total is unfavorable red')
  assert.match(gap2TotalTag, /fill="#15803d"/, 'negative cost gap total is favorable green')
  assert.ok(graphMarkup.includes('fill="#4b9164"'), 'positive Profit uses its green sign color')
  assert.ok(graphMarkup.includes('stroke="#2563eb"'), 'Selling Price line uses the lighter blue visual')
  assert.ok(graphMarkup.includes('fill="#2563eb"'), 'Selling Price point keeps the same series color as its line')
  const lastSellingPriceVisual = Math.max(graphMarkup.lastIndexOf('stroke="#2563eb"'), graphMarkup.lastIndexOf('fill="#2563eb"'))
  const firstCostNumber = Math.min(graphMarkup.indexOf('data-graph-standard-cost-value="reference"'), graphMarkup.indexOf('data-graph-visible-total-value="reference"'))
  assert.ok(firstCostNumber > lastSellingPriceVisual, 'Standard Cost and Visible + labels render above Selling Price line and points')
  assert.match(graphSource, /const positiveVisibleTotal = state\.stack\.positive/)
  assert.match(graphSource, /const negativeVisibleTotal = state\.stack\.negative/)
  assert.doesNotMatch(graphSource, /visibleNet|Visible Net|visible-net/, 'the retired state-summary model has no parallel implementation')
  assert.match(graphSource, /const SELLING_PRICE_COLOR = '#2563eb'/,
    'Selling Price keeps its existing series behavior with only the lighter visual color changed')
  assert.doesNotMatch(graphMarkup, /GAP [12] (?:SG&A|OP|Selling Price) Gap:/,
    'gap bars only contain MAT, LB, and BD')
  assert.ok(graphMarkup.includes('SG&amp;A') && graphMarkup.includes('Operating Profit:'),
    'dataset bars and accessible data labels retain the separate economic values')
  assert.equal([...graphMarkup.matchAll(/<text\b[^>]*data-graph-visible-total-value="[^"]+"[^>]*>\+120\.00<\/text>/g)].length, 3,
    'the three 120.00 values are explicitly the Reference/Current/Custom Visible + labels')
  assert.doesNotMatch(graphMarkup, /data-graph-selling-price-value=|>SP\s+\d/,
    'Selling Price remains a line and points without a separate numeric label')

  const tooltipReference = cost('tooltip-ref', 60, 20, 10)
  const tooltipCurrent = cost('tooltip-cur', 65, 22, 15)
  const tooltipSim = cost('tooltip-sim', 62, 19, 13)
  const tooltipStory = createScenarioStory(
    financial(tooltipReference, 120, 8), financial(tooltipCurrent, 120, 10), financial(tooltipSim, 120, 10)
  )
  const tooltipMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: tooltipStory, unit: 'KG' }))
  const categoryTooltipTags = new Map([...tooltipMarkup.matchAll(/<text\b[^>]*>(GAP 1|GAP 2)<\/text>/g)]
    .map(match => [match[1], match[0]] as const))
  for (const [label, tooltip] of [
    ['GAP 1', 'Current − Reference'], ['GAP 2', 'Custom − Current']
  ]) {
    const categoryTag = categoryTooltipTags.get(label)
    assert.ok(categoryTag?.includes('data-graph-tooltip="true"') && categoryTag.includes(`aria-label="${tooltip}"`),
      `${label} bottom category label retains its explanatory tooltip`)
  }
  const gap1TotalTooltipTag = tooltipMarkup.match(/<text\b[^>]*data-graph-total="gap1"[^>]*>/)?.[0] ?? ''
  const gap2TotalTooltipTag = tooltipMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.ok(gap1TotalTooltipTag.includes('aria-label="Current − Reference total: +12.00 THB/KG"'),
    'GAP 1 total retains its useful value tooltip')
  assert.ok(gap2TotalTooltipTag.includes('aria-label="Custom − Current total: -8.00 THB/KG"'),
    'GAP 2 total retains its useful value tooltip')
  for (const tooltip of [
    'Reference Visible + · +120.00 THB/KG', 'Current Visible + · +120.00 THB/KG', 'Custom Visible + · +120.00 THB/KG',
    'Reference Material: 60.00 THB/KG', 'Reference Labor: 20.00 THB/KG', 'Reference Burden: 10.00 THB/KG',
    'Reference SG&amp;A: 9.60 THB/KG', 'Reference Operating Profit: 20.40 THB/KG',
    'Current Material: 65.00 THB/KG', 'Current Labor: 22.00 THB/KG', 'Current Burden: 15.00 THB/KG',
    'Current SG&amp;A: 12.00 THB/KG', 'Current Operating Profit: 6.00 THB/KG',
    'Custom Material: 62.00 THB/KG', 'Custom Labor: 19.00 THB/KG', 'Custom Burden: 13.00 THB/KG',
    'Custom SG&amp;A: 12.00 THB/KG', 'Custom Operating Profit: 14.00 THB/KG',
    'GAP 1 · Current − Reference · Material Gap: +5.00 THB/KG', 'GAP 1 · Current − Reference · Labor Gap: +2.00 THB/KG', 'GAP 1 · Current − Reference · Burden Gap: +5.00 THB/KG',
    'GAP 2 · Custom − Current · Material Gap: -3.00 THB/KG', 'GAP 2 · Custom − Current · Labor Gap: -3.00 THB/KG', 'GAP 2 · Custom − Current · Burden Gap: -2.00 THB/KG',
    'Reference Selling Price: 120.00 THB/KG', 'Current Selling Price: 120.00 THB/KG', 'Custom Selling Price: 120.00 THB/KG'
  ]) assert.ok(tooltipMarkup.includes(tooltip), `graph tooltip identifies its series and resolved unit: ${tooltip}`)
  assert.match(tooltipMarkup, />THB\/KG<\/text>/, 'the Y axis uses a different product UOM dynamically')

  const zeroGapStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(current, 120, 10))
  const zeroGapMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: zeroGapStory, unit: 'PC' }))
  const zeroGapTotalTag = zeroGapMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.match(zeroGapTotalTag, /fill="#475569"/, 'zero gap totals remain neutral')
  assert.match(zeroGapTotalTag, /aria-label="Custom − Current total: 0\.00 THB\/PC"/)

  const markupFor = (values: ScenarioFinancialResult) => renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(values, values, values), unit: 'KG'
  }))
  const visibleLabels = (markup: string, side: 'positive' | 'negative') =>
    [...markup.matchAll(/<text\b[^>]*data-graph-visible-total-value="([^"]+)"[^>]*data-graph-visible-total-side="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
      .filter(match => match[2] === side).map(match => [match[1], match[3]])
  const positiveFinancial = financial(cost('positive-only', 200, 60, 40), 300, 0)
  const positiveMarkup = markupFor(positiveFinancial)
  assert.deepEqual(visibleLabels(positiveMarkup, 'positive'), [['reference', '+300.00'], ['current', '+300.00'], ['custom', '+300.00']])
  assert.deepEqual(visibleLabels(positiveMarkup, 'negative'), [], 'a zero negative side has no meaningless label')
  assert.equal([...positiveMarkup.matchAll(/data-graph-standard-cost-value=/g)].length, 3,
    'Standard Cost and Visible + both remain when their displayed values are equal')
  const mixedFinancial = financial(cost('mixed', 200, 60, 40), 250, 0)
  const mixedBefore = JSON.stringify(mixedFinancial)
  const mixedMarkup = markupFor(mixedFinancial)
  assert.deepEqual(visibleLabels(mixedMarkup, 'positive'), [['reference', '+300.00'], ['current', '+300.00'], ['custom', '+300.00']])
  assert.deepEqual(visibleLabels(mixedMarkup, 'negative'), [['reference', '-50.00'], ['current', '-50.00'], ['custom', '-50.00']])
  assert.doesNotMatch(mixedMarkup, /Visible Net|data-graph-visible-net|visibleNet/)
  assert.doesNotMatch(mixedMarkup, /Visible [^·]*· \+250\.00/, 'no netted state summary is displayed')
  assert.equal(JSON.stringify(mixedFinancial), mixedBefore, 'visible summaries never mutate financial results')
  assert.match(mixedMarkup, /Current Visible \+ · \+300\.00 THB\/KG/)
  assert.match(mixedMarkup, /Current Visible − · -50\.00 THB\/KG/)
  assert.equal(buildVisibleStack(mixedFinancial, graphParts, { ...allLegendVisible, opNegative: false }).negative, 0)
  assert.equal(buildVisibleStack(mixedFinancial, graphParts, { ...allLegendVisible, labor: false }).positive, 240)
  assert.equal(buildVisibleStack(mixedFinancial, graphParts, { ...allLegendVisible, labor: false }).negative, -50)
  const negativeMarkup = markupFor({ ...mixedFinancial, material: 0, labor: 0, burden: 0, standardCost: 0 })
  assert.deepEqual(visibleLabels(negativeMarkup, 'positive'), [], 'a zero positive side has no label')
  assert.deepEqual(visibleLabels(negativeMarkup, 'negative'), [['reference', '-50.00'], ['current', '-50.00'], ['custom', '-50.00']])
  for (const [name, values, expectedPosition] of [
    ['separated Selling Price', { ...positiveFinancial, sellingPrice: 600 }, 'above'],
    ['actual Selling Price collision', { ...positiveFinancial, sellingPrice: 310 }, 'side']
  ] as const) {
    const markup = markupFor(values)
    const tag = graphLabelTag(markup, 'data-graph-visible-total-value', 'reference')
    assert.match(tag, new RegExp(`data-graph-visible-total-position="${expectedPosition}"`), name)
    const endpoint = numericSvgAttribute(tag, 'data-graph-visible-total-endpoint-y')
    assert.ok(numericSvgAttribute(tag, 'data-graph-visible-total-text-bottom') <= endpoint,
      'positive text stays outside its positive stack, including the side fallback')
    const sc = graphLabelTag(markup, 'data-graph-standard-cost-value', 'reference')
    assert.equal(numericSvgAttribute(sc, 'data-graph-standard-cost-text-top'), numericSvgAttribute(sc, 'data-graph-standard-cost-value-level-y'))
    if (expectedPosition === 'side') {
      const text = estimatedTextBounds(numericSvgAttribute(tag, 'x'), numericSvgAttribute(tag, 'y'), '+300.00', 'start')
      const scText = estimatedTextBounds(numericSvgAttribute(sc, 'x'), numericSvgAttribute(sc, 'y'), '300.00', 'start')
      assert.ok(!boundsOverlap(text, scText), 'equal Standard Cost does not obscure the valid Visible + side label')
      const defaultBounds = estimatedTextBounds(graphStateXs[0], numericSvgAttribute(tag, 'data-graph-visible-total-default-y'), '+300.00', 'middle')
      assert.ok(statePriceGeometryCrowds(markup, graphStateXs[0], defaultBounds), 'fallback requires a genuine Selling Price collision')
    }
  }
  const negativeTags = [...mixedMarkup.matchAll(/<text\b[^>]*data-graph-visible-total-side="negative"[^>]*>/g)]
  for (const [tag] of negativeTags) {
    assert.ok(numericSvgAttribute(tag, 'data-graph-visible-total-text-top') > numericSvgAttribute(tag, 'data-graph-visible-total-endpoint-y'))
    assert.match(tag, /fill="#334155"/, 'visible side labels use neutral styling')
  }

  if (process.argv.includes('--graph-only')) {
    console.log('Simulation cost structure graph verification passed')
  } else {
    const {
      createEmptySimulationState,
      getEffectiveSimulationDataset,
      setSimulationActiveDataset,
      setSimulationComparison
    } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
    const makeSnapshot = (id: string, price: number, referencePrice: number): CostSnapshot => ({
      id,
      product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '', sellingPrice: 120, sgaPercent: 10 },
      effectiveDate: '', sourceRef: id, status: 'draft',
      rates: [{ id: `${id}-rate`, workCenterCode: 'WC-1', description: 'Long Work Center Description', laborRate: 10, burdenRate: 5, effectiveDate: '', confidence: {} }],
      bom: [
        { id: `${id}-bom`, itemCode: 'MAT-1', description: 'A deliberately long stainless steel material description for wrapping', consumption: 2, unit: 'PC', price, loss: 0.05, confidence: {} },
        { id: `${id}-bom-extra`, itemCode: 'MAT-2', description: 'Second material', consumption: 1, unit: 'PC', price: referencePrice, loss: 0, confidence: {} }
      ],
      routing: [
        { id: `${id}-route`, processName: 'Assembly process with a long name', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }
      ]
    })
    const referenceSnapshot = makeSnapshot('reference', 10, 3)
    const currentSnapshot = makeSnapshot('current', 12, 3)
    const customSnapshot = makeSnapshot('custom', 12, 3)
    const roles = ['reference', 'current', 'custom'] as const
    const sources = { reference: referenceSnapshot, current: currentSnapshot, custom: customSnapshot }
    const fresh = createEmptySimulationState(sources)
    assert.deepEqual([fresh.activeDataset, fresh.comparisonBefore, fresh.comparisonAfter], ['custom', 'current', 'custom'],
      'fresh Simulation opens with Custom active and Current → Custom in Result')
    const effectiveDatasetsFor = (workspace: typeof fresh) => Object.fromEntries(
      roles.map(role => [role, getEffectiveSimulationDataset(sources, workspace, role)])
    )
    const renderPage = (workspace: typeof fresh) => {
      const effectiveDatasets = effectiveDatasetsFor(workspace)
      const active = effectiveDatasets[workspace.activeDataset]
      return renderToStaticMarkup(React.createElement(SimulationPage, {
        state: active,
        workingSelection: active.workingSelection,
        analysisBeforeDataset: effectiveDatasets[workspace.comparisonBefore],
        analysisAfterDataset: effectiveDatasets[workspace.comparisonAfter],
        effectiveDatasets,
        onSelectActiveDataset() {}, onChangeComparison() {}, onSend() {}, onSendAll() {},
        onReset() {}, onResetAll() {}, onUpdateParameter() {}, onToggleWorkingTarget() {}, onSetWorkingSelection() {},
        onUpdateEconomicInput() {}, onBeginEdit() {}, onCommitEdit() {}
      }))
    }
    const resultPanel = (markup: string) =>
      markup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
    const visibleHeaders = (panel: string) => [...panel.matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)]
      .map(([, content]) => content.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]*>/g, '').trim())
    const graphValues = (markup: string) => {
      const graph = markup.match(/<svg\b[\s\S]*?<\/svg>/)?.[0] ?? ''
      return [
        ...roles.map(role => graph.match(new RegExp(`data-graph-standard-cost-value="${role}"[^>]*>([^<]+)<\\/text>`))?.[1] ?? ''),
        ...(['gap1', 'gap2'] as const).map(gap => graph.match(new RegExp(`data-graph-total="${gap}"[^>]*>([^<]+)<\\/text>`))?.[1] ?? '')
      ]
    }

    const initialMarkup = renderPage(fresh)
    const initialResult = resultPanel(initialMarkup)
    assert.ok(initialResult, 'the current Simulation Result panel renders')
    assert.match(initialResult, /<h2 id="simulation-result-title" class="sr-only">Result<\/h2>/,
      'Result retains its screen-reader-only title')
    assert.deepEqual(visibleHeaders(initialResult), ['Cost / Unit', 'Before', 'After', 'Change', '%'],
      'Cost / Unit, Before, After, Change, and % share one compact visible header row')
    assert.match(initialResult, /aria-label="Before dataset, Current"/, 'Before keeps the selected role in its accessible name')
    assert.match(initialResult, /aria-label="After dataset, Custom"/, 'After keeps the selected role in its accessible name')
    assert.match(initialResult, /Business Outcome \/ Unit/, 'Business Outcome / Unit remains a compact section divider')
    assert.match(initialMarkup, /aria-label="Select Custom as active dataset"[^>]*aria-pressed="true"/,
      'the fresh page marks Custom as the active graph role')
    assert.match(initialMarkup, /Send to Master Data/, 'the main Send accessible name is preserved')
    assert.match(initialMarkup, /Reset all/)
    assert.doesNotMatch(initialMarkup, /Reset all datasets/)
    assert.equal((initialMarkup.match(/data-simulation-table-body="true"/g) ?? []).length, 2,
      'BOM and Routing keep independent table body viewports')
    assert.deepEqual(graphValues(initialMarkup), ['25.50', '29.70', '29.70', '+4.20', '0.00'],
      'the embedded graph keeps Reference, Current, Custom and both fixed gaps')
    const pageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
    assert.ok((pageSource.match(/orderedRows\.map\(\(\{ row, sourceIndex \}, orderedIndex\)/g) ?? []).length >= 2,
      'desktop rows and responsive cards both map the full ordered candidate set')
    assert.match(pageSource, /<div className="md:hidden">[\s\S]*?<article[\s\S]*?tabIndex=\{canExpand \? 0 : undefined\}/,
      'narrow layouts retain keyboard-reachable candidate cards')
    const desktopRowStart = pageSource.indexOf("const status = rowStatusText(row, canEdit && simulationRecord ? simulationParameterStatus(kind, simulationRecord.id, simulationSnapshot, baselineSnapshot) : null)")
    const desktopRowOpen = pageSource.indexOf('<tr', desktopRowStart)
    const desktopRowSource = pageSource.slice(desktopRowOpen, pageSource.indexOf('</tr>', desktopRowOpen))
    assert.match(desktopRowSource, /tabIndex=\{canExpand \? 0 : undefined\}/)
    assert.match(desktopRowSource, /event\.key !== 'Enter' && event\.key !== ' '/,
      'desktop candidate rows support Enter and Space expansion')
    const mobileSourceStart = pageSource.indexOf('<div className="md:hidden">')
    const mobileArticleStart = pageSource.indexOf('<article', mobileSourceStart)
    const mobileArticleEnd = pageSource.indexOf('</article>', mobileArticleStart)
    const mobileArticleSource = pageSource.slice(mobileArticleStart, mobileArticleEnd)
    assert.match(mobileArticleSource, /event\.key !== 'Enter' && event\.key !== ' '/,
      'mobile candidate cards support Enter and Space expansion')
    const bomTable = initialMarkup.match(/<section data-simulation-table="bom"[\s\S]*?<\/section>/)?.[0] ?? ''
    const initialBomRow = bomTable.match(/<tr[^>]*data-safe-workspace-interaction="true"[\s\S]*?<\/tr>/)?.[0] ?? ''
    assert.match(initialBomRow, /aria-expanded="false"/, 'desktop candidate rows expose their collapsed state')
    assert.match(initialBomRow, /tabindex="0"/, 'desktop candidate rows are keyboard reachable')
    assert.match(initialBomRow, /aria-label="Bill of Materials: .* activate to expand Parameter Cost Effect"/,
      'desktop candidate rows expose their Parameter Cost Effect action')
    assert.match(bomTable, /A deliberately long stainless steel material description for wrapping Price in Custom/,
      'parameter inputs remain owned by active Custom')
    assert.match(pageSource, /isInteractiveTarget\(event\.target, event\.currentTarget\)/,
      'editing inputs and nested controls keep their own behavior instead of toggling the row')
    assert.match(pageSource, /\{expanded && \([\s\S]*?Parameter Cost Effect[\s\S]*?detailParameters\.map\(parameter => <EffectCell/,
      'Parameter Cost Effect details remain available on demand')
    assert.match(pageSource, /aria-label=\{`Total \$\{formatBusinessNumber\(analysis\.effects\.totalEffect, \{ signPositive: true, integerDigits: Infinity \}\)\}`\}/,
      'the expanded total keeps its signed value in the accessible name')
    assert.doesNotMatch(pageSource, /analysis\.effects\.shares\?\./,
      'parameter details do not add percentage-share labels')

    const changedPair = setSimulationComparison(fresh, 'custom', 'reference')
    const changedPairMarkup = renderPage(changedPair)
    assert.deepEqual(graphValues(changedPairMarkup), graphValues(initialMarkup),
      'changing Result comparison leaves the fixed graph story unchanged')
    assert.match(changedPairMarkup, /aria-label="Before dataset, Custom"/)
    assert.match(changedPairMarkup, /aria-label="After dataset, Reference"/)
    assert.equal(changedPair.activeDataset, 'custom', 'changing Result roles does not move activeDataset')

    const changedActive = setSimulationActiveDataset(changedPair, 'current')
    const changedActiveMarkup = renderPage(changedActive)
    assert.deepEqual([changedActive.comparisonBefore, changedActive.comparisonAfter], ['custom', 'current'],
      'changing activeDataset preserves Result Before and synchronizes Result After')
    assert.match(changedActiveMarkup, /aria-label="Select Current as active dataset"[^>]*aria-pressed="true"/,
      'the graph updates the selected active role')
    assert.match(changedActiveMarkup, /aria-label="Before dataset, Custom"/,
      'the graph selection preserves the manually selected Result Before')
    assert.match(changedActiveMarkup, /aria-label="After dataset, Current"/,
      'the graph selection synchronizes Result After to the active role')
    assert.deepEqual(graphValues(changedActiveMarkup), graphValues(initialMarkup),
      'selecting another active role does not rewrite the fixed graph values')

    console.log('Simulation Story graph and continuous-scroll viewport contract verification passed')
  }
} finally {
  await vite.close()
}
