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
  const { SimulationStoryGraph, buildVisibleStack, buildVisibleStandardCost, buildGraphScale, positionGraphTooltip } = await vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx')
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { parameterEffectPresentation } = await vite.ssrLoadModule('/src/features/simulation/parameter-effect-presentation.ts')
  const { simulationWorkingTargetKey, startSimulationFrom } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { calculateEconomicSimulation } = await vite.ssrLoadModule('/src/features/simulation/simulation-economics.ts')
  const { calculateParameterSimulation, updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

  assert.deepEqual(parameterEffectPresentation(2.35), { text: '+2.35', className: 'text-rose-700' },
    'positive cost effects show an explicit plus sign and red styling')
  assert.deepEqual(parameterEffectPresentation(-1.2), { text: '-1.20', className: 'text-emerald-700' },
    'negative cost effects show a minus sign and green styling')
  assert.deepEqual(parameterEffectPresentation(0), { text: '0.00', className: 'text-slate-700' },
    'zero parameter effects are neutral and never receive a plus sign')
  assert.deepEqual(parameterEffectPresentation(-0.001), { text: '0.00', className: 'text-slate-700' },
    'values that round to zero remain neutral and do not show negative zero')
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
  assert.equal(story.gap2.standardCost, -5, 'GAP 2 is SIM - Current and may be negative')

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
    'Visible Net uses all currently visible cost, SG&A, and sign-matched Profit values')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, burden: false }).total, 97,
    'hiding Burden immediately excludes it from Visible Net')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, sga: false }).total, 90,
    'hiding SG&A immediately excludes it from Visible Net')
  assert.equal(buildVisibleStack(canonicalStory.current, graphParts, { ...allLegendVisible, opPositive: false }).total, 20,
    'hiding positive Profit immediately excludes it from Visible Net')
  const onlyVisibleCosts = { ...allLegendVisible, sga: false, opPositive: false, opNegative: false }
  const equalVisibleNet = buildVisibleStack(canonicalStory.current, graphParts, onlyVisibleCosts).total
  assert.equal(equalVisibleNet, buildVisibleStandardCost(canonicalStory.current, onlyVisibleCosts),
    'Visible Net equals the visible Standard Cost when SG&A and Profit are hidden')
  assert.equal(canonicalStory.simulated.standardCost, 10, 'the authoritative SIM/Result Standard Cost remains 10')
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
  const graphMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story, unit: 'PC' }))
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
  const sellingPriceLineSegments = (markup: string) => [...markup.matchAll(/<path\b(?=[^>]*stroke="#2563eb")[^>]*>/g)]
    .flatMap(([tag]) => {
      const coordinates = tag.match(/d="M ([^ ]+) ([^ ]+) L ([^ ]+) ([^"]+)"/)
      return coordinates ? [{ x1: Number(coordinates[1]), y1: Number(coordinates[2]), x2: Number(coordinates[3]), y2: Number(coordinates[4]) }] : []
    })
  const sellingPricePoint = (markup: string, x: number) => {
    const tag = markup.match(new RegExp(`<circle\\b[^>]*cx="${x}"[^>]*r="3\\.5"[^>]*>`))?.[0] ?? ''
    return tag ? { tag, x: numericSvgAttribute(tag, 'cx'), y: numericSvgAttribute(tag, 'cy') } : null
  }
  const visibleNetTextBounds = (markup: string, label: string) => estimatedTextBounds(
    numericSvgAttribute(label, 'x'), numericSvgAttribute(label, 'y'),
    graphLabelText(markup, 'data-graph-visible-net-value', label.match(/data-graph-visible-net-value="([^"]+)"/)?.[1] ?? ''),
    label.includes('text-anchor="start"') ? 'start' : 'middle'
  )
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
  const standardCostLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => [match[1], match[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()])
  assert.deepEqual(standardCostLabels, [['reference', '90.00'], ['current', '100.00'], ['simulated', '95.00']],
    'REF/CUR/SIM display Standard Cost at the visible Material + Labor + Burden boundary')
  const visibleNetLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-visible-net-value="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => [match[1], match[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()])
  assert.deepEqual(visibleNetLabels, [['reference', '120.00'], ['current', '120.00'], ['simulated', '120.00']],
    'REF/CUR/SIM show the signed total of all visible stack segments')
  assert.doesNotMatch(graphMarkup, /data-graph-visible-net-value="(?:gap1|gap2)"/,
    'Visible Net is not added to GAP 1 or GAP 2')
  const standardCostLineTags = new Map([...graphMarkup.matchAll(/<line\b[^>]*data-graph-standard-cost="(reference|current|simulated)"[^>]*>/g)]
    .map(match => [match[1], match[0]] as const))
  const standardCostValueTags = new Map([...graphMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="(reference|current|simulated)"[^>]*>/g)]
    .map(match => [match[1], match[0]] as const))
  for (const [state, x] of [['reference', 180], ['current', 430], ['simulated', 680]] as const) {
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
  assert.doesNotMatch(graphMarkup, /data-graph-total="(?:reference|current|simulated)"/,
    'full commercial-stack values are not duplicated above REF/CUR/SIM')
  assert.deepEqual(svgTextLabels.filter(label => ['Reference', 'GAP 1', 'Current', 'GAP 2', 'Simulation'].includes(label)),
    ['Reference', 'GAP 1', 'Current', 'GAP 2', 'Simulation'],
    'the five visible category labels follow the full graph story names')
  assert.ok(!svgTextLabels.some(label => ['REF', 'CUR', 'SIM'].includes(label)),
    'the graph does not show abbreviated category labels')
  assert.match(graphMarkup, /GAP 1 · Current − Reference · Material Gap: \+5\.00 THB\/PC/)
  assert.match(graphMarkup, /GAP 2 · Simulation − Current · Material Gap: -3\.00 THB\/PC/)
  assert.doesNotMatch(graphMarkup, /\bSC [+-]\d/, 'gap labels do not use the ambiguous SC +/- notation')
  const firstBarIndex = graphMarkup.indexOf('fill="#6f99c6"')
  const rulerLineIndex = graphMarkup.indexOf('stroke-dasharray="4 5"')
  assert.ok(firstBarIndex >= 0 && rulerLineIndex > firstBarIndex, 'the visible ruler line is drawn in front of the bars')
  for (const [part, color] of [['MAT', '#6f99c6'], ['LB', '#e5b46a'], ['BD', '#9a82c6']]) {
    assert.ok(graphMarkup.includes(`fill="${color}"`), `${part} uses the exact CBD palette color in the graph bars`)
    assert.ok(graphMarkup.includes(`background-color:${color}`), `${part} uses the exact CBD palette color in the legend`)
  }
  assert.match(graphMarkup, /Simulation Cost Structure/)
  assert.match(graphMarkup, /<figure aria-labelledby="simulation-story-title"/,
    'the graph figure has an accessible name from its visible heading')
  assert.match(graphMarkup, /<svg aria-labelledby="simulation-story-title" aria-describedby="simulation-story-svg-description"/,
    'the SVG retains both its accessible name and description')
  assert.match(graphMarkup, /<desc id="simulation-story-svg-description">Reference, Current, and Simulation show visible/,
    'the SVG description retains the full scenario names for assistive technology')
  assert.match(graphMarkup, /preserveAspectRatio="xMidYMid meet"/,
    'the responsive graph preserves circular markers and undistorted text and lines')
  assert.doesNotMatch(graphMarkup, /<title\b|\stitle=/, 'graph elements do not expose native hover tooltips')
  assert.match(graphMarkup, /<h2 id="simulation-story-title"[^>]*>Simulation Cost Structure<\/h2>[\s\S]*?<ul aria-label="Simulation graph legend"/,
    'the graph title and legend share the header area')
  assert.match(graphMarkup, /<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul><button type="button" disabled=""[^>]*>Show all<\/button>/,
    'Show all is a separate action after the eight Legend controls and is disabled initially')
  const legendMarkup = graphMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
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
  assert.match(graphMarkup, /GAP 1 is Current minus Reference; GAP 2 is Simulation minus Current/)
  assert.match(graphMarkup, /Legend filters change this graph view only, not Result or source data/)
  assert.match(graphMarkup, /data-y-axis="true"/, 'the graph renders a visible Y-axis line')
  assert.match(graphMarkup, /data-y-axis-unit="true"[^>]*>THB\/PC<\/text>/, 'the dynamic UOM is attached to the Y axis')
  const yAxisLineTag = graphMarkup.match(/<line\b[^>]*data-y-axis="true"[^>]*>/)?.[0] ?? ''
  const yAxisUnitTag = graphMarkup.match(/<text\b[^>]*data-y-axis-unit="true"[^>]*>/)?.[0] ?? ''
  assert.ok(yAxisLineTag && yAxisUnitTag)
  assert.doesNotMatch(yAxisUnitTag, /transform=|rotate\(\s*-90/, 'the Y-axis unit label stays horizontal')
  assert.ok(numericSvgAttribute(yAxisUnitTag, 'y') < numericSvgAttribute(yAxisLineTag, 'y1'),
    'the horizontal UOM label sits above the Y-axis')
  for (const [state, value, tooltip] of [
    ['reference', '90.00', 'Reference Standard Cost · 90.00 THB/PC'],
    ['current', '100.00', 'Current Standard Cost · 100.00 THB/PC'],
    ['simulated', '95.00', 'Simulation Standard Cost · 95.00 THB/PC']
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
  assert.match(graphSource, /data-ruler-value="true" x=\{plot\.right \+ 7\}/, 'the ruler value sits at the line end without a label')
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
  assert.equal([...graphMarkup.matchAll(/aria-pressed="true"/g)].length, 8, 'all eight legend items are on by default')
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
  const firstCostNumber = Math.min(graphMarkup.indexOf('data-graph-standard-cost-value="reference"'), graphMarkup.indexOf('data-graph-visible-net-value="reference"'))
  assert.ok(firstCostNumber > lastSellingPriceVisual, 'Standard Cost and Visible Net labels render above Selling Price line and points')
  assert.match(graphSource, /const visibleNet = state\.stack\.total/,
    'Visible Net comes directly from the same visible stack that draws each state bar')
  assert.match(graphSource, /data-graph-visible-net-position=\{netPosition\}/,
    'Visible Net placement is exposed for focused regression verification')
  const netPlacementSource = graphSource.slice(graphSource.indexOf('const visibleNetEndpointY'), graphSource.indexOf('const visibleNetTooltip'))
  assert.match(netPlacementSource, /const sellingPriceIsAboveNet = visibleLegend\.sellingPrice/,
    'case 5: hidden Selling Price disables the side-fallback gate')
  assert.match(netPlacementSource, /state\.values\.sellingPrice > visibleNet/,
    'Selling Price must be greater than Visible Net before it can trigger side fallback')
  assert.match(netPlacementSource, /visibleNetTextCrowdsSellingPrice\(defaultNetBounds/,
    'side fallback also requires actual rendered-text collision geometry')
  assert.doesNotMatch(netPlacementSource, /plot\.|clamp\(|clipped|candidate|visibleNetClearOfSellingPriceY/,
    'label placement has no plot-boundary fallback, clipping policy, or candidate-position search')
  assert.doesNotMatch(graphSource, /VISIBLE_NET_SIDE_LABEL_GAP|const candidates\s*=\s*\[base/,
    'Visible Net does not use arbitrary candidate offsets')
  assert.doesNotMatch(graphMarkup, /data-graph-visible-net-connector|data-visible-net-connector/,
    'Visible Net has no connector line')
  assert.match(graphSource, /const SELLING_PRICE_COLOR = '#2563eb'/,
    'Selling Price keeps its existing series behavior with only the lighter visual color changed')
  assert.doesNotMatch(graphMarkup, /GAP [12] (?:SG&A|OP|Selling Price) Gap:/,
    'gap bars only contain MAT, LB, and BD')
  assert.ok(graphMarkup.includes('SG&amp;A') && graphMarkup.includes('Operating Profit:'),
    'dataset bars and accessible data labels retain the separate economic values')
  assert.equal([...graphMarkup.matchAll(/<text\b[^>]*data-graph-visible-net-value="[^"]+"[^>]*>120\.00<\/text>/g)].length, 3,
    'the three 120.00 values are explicitly the REF/CUR/SIM Visible Net labels')
  assert.doesNotMatch(graphMarkup, /data-graph-selling-price-value=|>SP\s+\d/,
    'Selling Price remains a line and points without a separate numeric label')

  const tooltipReference = cost('tooltip-ref', 60, 20, 10)
  const tooltipCurrent = cost('tooltip-cur', 65, 22, 15)
  const tooltipSim = cost('tooltip-sim', 62, 19, 13)
  const tooltipStory = createScenarioStory(
    financial(tooltipReference, 120, 8), financial(tooltipCurrent, 120, 10), financial(tooltipSim, 120, 10)
  )
  const tooltipMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: tooltipStory, unit: 'KG' }))
  const categoryTooltipTags = new Map([...tooltipMarkup.matchAll(/<text\b[^>]*>(Reference|GAP 1|Current|GAP 2|Simulation)<\/text>/g)]
    .map(match => [match[1], match[0]] as const))
  for (const label of ['Reference', 'Current', 'Simulation']) {
    const categoryTag = categoryTooltipTags.get(label) ?? ''
    assert.doesNotMatch(categoryTag, /data-graph-tooltip="true"|aria-label=/,
      `${label} bottom category label has no redundant tooltip`)
  }
  for (const [label, tooltip] of [
    ['GAP 1', 'Current − Reference'], ['GAP 2', 'Simulation − Current']
  ]) {
    const categoryTag = categoryTooltipTags.get(label)
    assert.ok(categoryTag?.includes('data-graph-tooltip="true"') && categoryTag.includes(`aria-label="${tooltip}"`),
      `${label} bottom category label retains its explanatory tooltip`)
  }
  const gap1TotalTooltipTag = tooltipMarkup.match(/<text\b[^>]*data-graph-total="gap1"[^>]*>/)?.[0] ?? ''
  const gap2TotalTooltipTag = tooltipMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.ok(gap1TotalTooltipTag.includes('aria-label="Current − Reference total: +12.00 THB/KG"'),
    'GAP 1 total retains its useful value tooltip')
  assert.ok(gap2TotalTooltipTag.includes('aria-label="Simulation − Current total: -8.00 THB/KG"'),
    'GAP 2 total retains its useful value tooltip')
  for (const tooltip of [
    'Reference Visible Net · 120.00 THB/KG', 'Current Visible Net · 120.00 THB/KG', 'Simulation Visible Net · 120.00 THB/KG',
    'Reference Material: 60.00 THB/KG', 'Reference Labor: 20.00 THB/KG', 'Reference Burden: 10.00 THB/KG',
    'Reference SG&amp;A: 9.60 THB/KG', 'Reference Operating Profit: 20.40 THB/KG',
    'Current Material: 65.00 THB/KG', 'Current Labor: 22.00 THB/KG', 'Current Burden: 15.00 THB/KG',
    'Current SG&amp;A: 12.00 THB/KG', 'Current Operating Profit: 6.00 THB/KG',
    'Simulation Material: 62.00 THB/KG', 'Simulation Labor: 19.00 THB/KG', 'Simulation Burden: 13.00 THB/KG',
    'Simulation SG&amp;A: 12.00 THB/KG', 'Simulation Operating Profit: 14.00 THB/KG',
    'GAP 1 · Current − Reference · Material Gap: +5.00 THB/KG', 'GAP 1 · Current − Reference · Labor Gap: +2.00 THB/KG', 'GAP 1 · Current − Reference · Burden Gap: +5.00 THB/KG',
    'GAP 2 · Simulation − Current · Material Gap: -3.00 THB/KG', 'GAP 2 · Simulation − Current · Labor Gap: -3.00 THB/KG', 'GAP 2 · Simulation − Current · Burden Gap: -2.00 THB/KG',
    'Reference Selling Price: 120.00 THB/KG', 'Current Selling Price: 120.00 THB/KG', 'Simulation Selling Price: 120.00 THB/KG'
  ]) assert.ok(tooltipMarkup.includes(tooltip), `graph tooltip identifies its series and resolved unit: ${tooltip}`)
  assert.match(tooltipMarkup, />THB\/KG<\/text>/, 'the Y axis uses a different product UOM dynamically')

  const zeroGapStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(current, 120, 10))
  const zeroGapMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: zeroGapStory, unit: 'PC' }))
  const zeroGapTotalTag = zeroGapMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.match(zeroGapTotalTag, /fill="#475569"/, 'zero gap totals remain neutral')
  assert.match(zeroGapTotalTag, /aria-label="Simulation − Current total: 0\.00 THB\/PC"/)

  const zeroProfitFinancial = financial(cost('equal-visible-net', 4, 3, 3), 10, 0)
  const equalNetStory = createScenarioStory(zeroProfitFinancial, zeroProfitFinancial, zeroProfitFinancial)
  const equalNetMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: equalNetStory, unit: 'PC' }))
  assert.equal([...equalNetMarkup.matchAll(/data-graph-standard-cost-value="/g)].length, 3,
    'the existing Standard Cost labels remain when Visible Net equals them')
  assert.doesNotMatch(equalNetMarkup, /data-graph-visible-net-value=/,
    'effectively equal Visible Net does not render a duplicate number')
  assert.deepEqual([...equalNetMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
    .map(([, state, value]) => [state, value]),
  [['reference', '10.00'], ['current', '10.00'], ['simulated', '10.00']],
  'suppressing an equal Visible Net leaves every Standard Cost value intact')

  const nearEqualFinancial = { ...zeroProfitFinancial, sgaAmountPerPiece: 0.004, sellingPrice: 20 }
  const nearEqualMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(nearEqualFinancial, nearEqualFinancial, nearEqualFinancial), unit: 'PC'
  }))
  assert.doesNotMatch(nearEqualMarkup, /data-graph-visible-net-value=/,
    'Visible Net is suppressed when it rounds to the same displayed value as Standard Cost')
  assert.deepEqual([...nearEqualMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
    .map(([, state, value]) => [state, value]),
  [['reference', '10.00'], ['current', '10.00'], ['simulated', '10.00']],
  'rounding-based duplicate suppression does not hide or alter Standard Cost')

  const markupFor = (referenceFinancial: ScenarioFinancialResult,
    currentFinancial = referenceFinancial, simulatedFinancial = referenceFinancial) => renderToStaticMarkup(
    React.createElement(SimulationStoryGraph, {
      story: createScenarioStory(referenceFinancial, currentFinancial, simulatedFinancial), unit: 'PC'
    })
  )
  const financialWithVisibleNet = (id: string, standardCostValue: number, visibleNetValue: number) =>
    financial(cost(id, standardCostValue, 0, 0), visibleNetValue, 0)

  const sameDisplayFinancial = financialWithVisibleNet('same-display-precision', 86.431, 86.434)
  const sameDisplayRawBeforeRender = JSON.stringify(sameDisplayFinancial)
  const sameDisplayMarkup = markupFor(sameDisplayFinancial)
  assert.equal(sameDisplayFinancial.standardCost, 86.431)
  assert.equal(buildVisibleStack(sameDisplayFinancial, graphParts, allLegendVisible).total, 86.434,
    'the first precision fixture retains the distinct raw Visible Net value')
  assert.equal(graphLabelText(sameDisplayMarkup, 'data-graph-standard-cost-value', 'reference'), '86.43')
  assert.doesNotMatch(sameDisplayMarkup, /data-graph-visible-net-value=/,
    'raw 86.431 and 86.434 are both displayed as 86.43, so Visible Net is suppressed')
  assert.equal(JSON.stringify(sameDisplayFinancial), sameDisplayRawBeforeRender,
    'display duplicate suppression does not mutate raw source financial values')

  const differentDisplayFinancial = financialWithVisibleNet('different-display-precision', 86.431, 86.435)
  const differentDisplayRawBeforeRender = JSON.stringify(differentDisplayFinancial)
  const differentDisplayMarkup = markupFor(differentDisplayFinancial)
  assert.equal(buildVisibleStack(differentDisplayFinancial, graphParts, allLegendVisible).total, 86.435,
    'the second precision fixture retains the raw 86.435 Visible Net')
  assert.equal(graphLabelText(differentDisplayMarkup, 'data-graph-standard-cost-value', 'reference'), '86.43')
  assert.equal(graphLabelText(differentDisplayMarkup, 'data-graph-visible-net-value', 'reference'), '86.44',
    'raw 86.435 and 86.431 have different displayed precision, so both labels render')
  assert.equal(JSON.stringify(differentDisplayFinancial), differentDisplayRawBeforeRender,
    'displaying two precision-distinct values does not mutate raw source financial values')

  const largeMagnitudeFinancial = financialWithVisibleNet('large-magnitude-precision', 1_000_000_000.01, 1_000_000_000.02)
  const largeMagnitudeRawBeforeRender = JSON.stringify(largeMagnitudeFinancial)
  const largeMagnitudeMarkup = markupFor(largeMagnitudeFinancial)
  assert.equal(buildVisibleStack(largeMagnitudeFinancial, graphParts, allLegendVisible).total, 1_000_000_000.02,
    'the large-magnitude fixture retains the raw two-cent-distinct Visible Net')
  assert.equal(graphLabelText(largeMagnitudeMarkup, 'data-graph-standard-cost-value', 'reference'), '1,000,000,000.01')
  assert.equal(graphLabelText(largeMagnitudeMarkup, 'data-graph-visible-net-value', 'reference'), '1,000,000,000.02',
    'large values that differ at two decimals are not hidden by a magnitude-scaled tolerance')
  assert.equal(JSON.stringify(largeMagnitudeFinancial), largeMagnitudeRawBeforeRender,
    'large-magnitude display checks do not mutate raw source financial values')

  const positiveNetFinancial = {
    ...financial(cost('positive-net', 60, 20, 10), 0, 0),
    sellingPrice: 80,
    operatingProfitPerPiece: 10
  }
  const positiveNetMarkup = markupFor(positiveNetFinancial)
  const positiveNetLabel = graphLabelTag(positiveNetMarkup, 'data-graph-visible-net-value', 'reference')
  const positiveNetEndpoint = numericSvgAttribute(positiveNetLabel, 'data-graph-visible-net-endpoint-y')
  assert.match(positiveNetLabel, /data-graph-visible-net-position="above"/,
    'case 1: positive Visible Net without a Selling Price collision stays above its bar')
  assert.equal(numericSvgAttribute(positiveNetLabel, 'x'), 180)
  assert.equal(numericSvgAttribute(positiveNetLabel, 'y'), positiveNetEndpoint - 12)

  const farSellingPriceFinancial = { ...financial(cost('far-price', 60, 20, 10), 250, 0), operatingProfitPerPiece: 10 }
  const farSellingPriceMarkup = markupFor(farSellingPriceFinancial)
  const farSellingPriceLabel = graphLabelTag(farSellingPriceMarkup, 'data-graph-visible-net-value', 'reference')
  const farSellingPriceDefaultY = numericSvgAttribute(farSellingPriceLabel, 'data-graph-visible-net-default-y')
  assert.ok(farSellingPriceFinancial.sellingPrice! > 100, 'case 2 fixture has Selling Price above Visible Net')
  assert.ok(!statePriceGeometryCrowds(farSellingPriceMarkup, 180,
    estimatedTextBounds(180, farSellingPriceDefaultY, '100.00', 'middle')))
  assert.match(farSellingPriceLabel, /data-graph-visible-net-position="above"/,
    'case 2: SP > Net without actual collision keeps normal above placement')

  const pointCollisionFinancial = { ...financial(cost('point-collision', 60, 20, 10), 110, 0), operatingProfitPerPiece: 10 }
  const pointCollisionMarkup = markupFor(pointCollisionFinancial)
  const pointCollisionLabel = graphLabelTag(pointCollisionMarkup, 'data-graph-visible-net-value', 'reference')
  const pointCollisionEndpoint = numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-endpoint-y')
  const pointCollisionDefaultY = numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-default-y')
  const pointCollisionDefaultBox = estimatedTextBounds(180, pointCollisionDefaultY, '100.00', 'middle')
  assert.ok(pointCollisionFinancial.sellingPrice! > 100)
  assert.ok(statePriceGeometryCrowds(pointCollisionMarkup, 180, pointCollisionDefaultBox),
    'case 3: the visible Selling Price point actually intersects normal Visible Net text')
  assert.match(pointCollisionLabel, /data-graph-visible-net-position="side"/,
    'case 3: SP > Net plus actual point collision moves Visible Net right')
  assert.equal(numericSvgAttribute(pointCollisionLabel, 'x'), 215,
    'case 3: side Visible Net shares the Standard Cost numeric column')
  assert.match(pointCollisionLabel, /text-anchor="start"/)
  assert.equal(numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-text-top'), pointCollisionEndpoint,
    'case 3: side Visible Net value level aligns with the text top edge')

  const belowGateReference = { ...financial(cost('below-gate-ref', 60, 20, 10), 80, 0), operatingProfitPerPiece: 10 }
  const belowGateCurrent = { ...financial(cost('below-gate-cur', 60, 20, 10), 10000, 0), operatingProfitPerPiece: 10 }
  const belowGateMarkup = markupFor(belowGateReference, belowGateCurrent, belowGateCurrent)
  const belowGateLabel = graphLabelTag(belowGateMarkup, 'data-graph-visible-net-value', 'reference')
  const belowGateDefaultY = numericSvgAttribute(belowGateLabel, 'data-graph-visible-net-default-y')
  assert.ok(belowGateReference.sellingPrice! <= 100, 'case 4 fixture has SP <= Visible Net')
  assert.ok(statePriceGeometryCrowds(belowGateMarkup, 180,
    estimatedTextBounds(180, belowGateDefaultY, '100.00', 'middle')),
    'case 4 fixture still has an actual connected-line collision')
  assert.match(belowGateLabel, /data-graph-visible-net-position="above"/,
    'case 4: SP <= Net disables Selling Price side fallback even when the line crowds the text')

  const negativePlacementFinancial = {
    ...financial(cost('negative-net', 60, 20, 20), 0, 0),
    operatingProfitPerPiece: -120
  }
  const negativePlacementMarkup = markupFor(negativePlacementFinancial)
  const negativePlacementLabel = graphLabelTag(negativePlacementMarkup, 'data-graph-visible-net-value', 'reference')
  const negativePlacementEndpoint = numericSvgAttribute(negativePlacementLabel, 'data-graph-visible-net-endpoint-y')
  assert.equal(graphLabelText(negativePlacementMarkup, 'data-graph-visible-net-value', 'reference'), '-20.00')
  assert.match(negativePlacementLabel, /data-graph-visible-net-position="below"/,
    'case 6: negative Visible Net stays below its own level')
  assert.equal(numericSvgAttribute(negativePlacementLabel, 'y'), negativePlacementEndpoint + 16,
    'case 6: negative Net alone does not create a side label')

  const separatedSideFinancial = { ...financial(cost('separated-side', 25, 15, 10), 110, 0), operatingProfitPerPiece: 50 }
  const separatedSideMarkup = markupFor(separatedSideFinancial)
  const separatedNet = graphLabelTag(separatedSideMarkup, 'data-graph-visible-net-value', 'reference')
  const separatedStandardCost = graphLabelTag(separatedSideMarkup, 'data-graph-standard-cost-value', 'reference')
  const separatedStandardCostLine = separatedSideMarkup.match(/<line\b[^>]*data-graph-standard-cost="reference"[^>]*>/)?.[0] ?? ''
  const separatedStandardCostLevel = numericSvgAttribute(separatedStandardCost, 'data-graph-standard-cost-value-level-y')
  assert.equal(numericSvgAttribute(separatedStandardCost, 'y') - 8.25, separatedStandardCostLevel,
    'case 7: Standard Cost value level aligns with the text top edge')
  assert.equal(numericSvgAttribute(separatedStandardCostLine, 'y1'), separatedStandardCostLevel,
    'case 7: Standard Cost label top aligns with its actual group boundary')
  assert.match(separatedNet, /data-graph-visible-net-position="side"/)
  assert.equal(numericSvgAttribute(separatedNet, 'x'), numericSvgAttribute(separatedStandardCost, 'x'),
    'case 8: side Net and Standard Cost share one numeric column')
  assert.equal(numericSvgAttribute(separatedNet, 'data-graph-visible-net-text-top'),
    numericSvgAttribute(separatedNet, 'data-graph-visible-net-value-level-y'),
    'case 8: separated side Visible Net aligns its own value level to the text top')
  assert.equal(numericSvgAttribute(separatedStandardCost, 'data-graph-standard-cost-text-top'),
    numericSvgAttribute(separatedStandardCost, 'data-graph-standard-cost-value-level-y'),
    'case 8: separated Standard Cost aligns its own value level to the text top')
  assert.ok(!boundsOverlap(visibleNetTextBounds(separatedSideMarkup, separatedNet), estimatedTextBounds(
    numericSvgAttribute(separatedStandardCost, 'x'), numericSvgAttribute(separatedStandardCost, 'y'),
    graphLabelText(separatedSideMarkup, 'data-graph-standard-cost-value', 'reference'), 'start'
  )), 'case 8: separated side labels keep their natural levels without overlap')

  const midpointFinancial = {
    ...financial(cost('midpoint', 60, 20, 19), 110, 0),
    sgaAmountPerPiece: 1,
    operatingProfitPerPiece: 0
  }
  const midpointMarkup = markupFor(midpointFinancial)
  const midpointNet = graphLabelTag(midpointMarkup, 'data-graph-visible-net-value', 'reference')
  const midpointStandardCost = graphLabelTag(midpointMarkup, 'data-graph-standard-cost-value', 'reference')
  const midpointNetValue = numericSvgAttribute(midpointNet, 'data-graph-visible-net-value-level-y')
  const midpointStandardValue = numericSvgAttribute(midpointStandardCost, 'data-graph-standard-cost-value-level-y')
  const midpoint = (Math.min(midpointNetValue, midpointStandardValue) + Math.max(midpointNetValue, midpointStandardValue)) / 2
  const normalMidpointNetBox = estimatedTextBounds(215, midpointNetValue + 8.25, '100.00', 'start')
  const normalMidpointStandardBox = estimatedTextBounds(215, midpointStandardValue + 8.25, '99.00', 'start')
  assert.ok(statePriceGeometryCrowds(midpointMarkup, 180,
    estimatedTextBounds(180, numericSvgAttribute(midpointNet, 'data-graph-visible-net-default-y'), '100.00', 'middle')))
  assert.ok(boundsOverlap(normalMidpointNetBox, normalMidpointStandardBox),
    'case 10 fixture has distinct side values whose text boxes would overlap')
  assert.equal(graphLabelText(midpointMarkup, 'data-graph-visible-net-value', 'reference'), '100.00')
  assert.equal(graphLabelText(midpointMarkup, 'data-graph-standard-cost-value', 'reference'), '99.00')
  assert.equal(numericSvgAttribute(midpointNet, 'x'), numericSvgAttribute(midpointStandardCost, 'x'))
  if (midpointNetValue < midpointStandardValue) {
    assert.equal(numericSvgAttribute(midpointNet, 'data-graph-visible-net-text-bottom'), midpoint,
      'case 10: the upper Net text bottom ends at the midpoint')
    assert.equal(numericSvgAttribute(midpointStandardCost, 'data-graph-standard-cost-text-top'), midpoint,
      'case 10: the lower Standard Cost text top starts at the midpoint')
  } else {
    assert.equal(numericSvgAttribute(midpointStandardCost, 'data-graph-standard-cost-text-bottom'), midpoint,
      'case 10: the upper Standard Cost text bottom ends at the midpoint')
    assert.equal(numericSvgAttribute(midpointNet, 'data-graph-visible-net-text-top'), midpoint,
      'case 10: the lower Net text top starts at the midpoint')
  }

  assert.equal(buildVisibleStack(midpointFinancial, graphParts, allLegendVisible).total, 100,
    'case 11: the all-visible Net includes its SG&A amount')
  assert.equal(buildVisibleStack(midpointFinancial, graphParts, { ...allLegendVisible, sga: false }).total, 99,
    'case 11: hiding SG&A recomputes Visible Net from the new filtered stack')
  assert.doesNotMatch(graphMarkup, /data-graph-visible-net-value="(?:gap1|gap2)"/,
    'case 12: GAP 1 and GAP 2 have no Visible Net labels')

  const negativeOPStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(cost('loss', 90, 0, 0), 80, 10))
  assert.equal(negativeOPStory.simulated.operatingProfitPerPiece, -18, 'negative OP remains a valid story value')
  const negativeOPMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: negativeOPStory, unit: 'PC' }))
  assert.match(negativeOPMarkup, /Simulation Operating Profit: -18\.00 THB\/PC/)
  assert.ok(negativeOPMarkup.includes('fill="#cc7489"'), 'negative Profit uses its softer red sign color')
  const negativeOnlyLegend = { ...allLegendVisible, material: false, labor: false, burden: false, sga: false, opPositive: false }
  const negativeVisibleStack = buildVisibleStack(negativeOPStory.simulated, graphParts, negativeOnlyLegend)
  const negativeVisibleStandardCost = buildVisibleStandardCost(negativeOPStory.simulated, negativeOnlyLegend)
  assert.equal(negativeVisibleStack.total, -18, 'negative Visible Net remains signed after legend filtering')
  assert.equal(negativeVisibleStandardCost, 0, 'hiding costs leaves a zero Standard Cost')
  const negativeNetFinancial = {
    material: 0, labor: 0, burden: 0, standardCost: 0,
    sgaAmountPerPiece: 0, operatingProfitPerPiece: -18, sellingPrice: null
  }
  const negativeNetMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(negativeNetFinancial, negativeNetFinancial, negativeNetFinancial), unit: 'PC'
  }))
  const negativeNetLabel = graphLabelTag(negativeNetMarkup, 'data-graph-visible-net-value', 'simulated')
  assert.equal(graphLabelText(negativeNetMarkup, 'data-graph-visible-net-value', 'simulated'), '-18.00',
    'the rendered negative Visible Net keeps its signed value')
  assert.match(negativeNetLabel, /data-graph-visible-net-position="below"/,
    'a negative Visible Net is placed below its own stack endpoint')
  assert.equal(numericSvgAttribute(negativeNetLabel, 'y'),
    numericSvgAttribute(negativeNetLabel, 'data-graph-visible-net-endpoint-y') + 16,
    'negative Visible Net placement remains endpoint-relative')

  if (process.argv.includes('--graph-only')) {
    console.log('Simulation cost structure graph verification passed')
  } else {
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
  const sources = { reference: referenceSnapshot, current: currentSnapshot, custom: customSnapshot }
  const state = startSimulationFrom('current', sources)
  const simulation = calculateParameterSimulation(currentSnapshot, state.snapshot!)
  assert.equal(state.economicInputs.fixedActionCost, '')
  assert.equal(state.economicInputs.variableActionCostPerPiece, '')
  assert.equal(state.economicInputs.batchSize, '')
  assert.equal(state.economicInputs.sellingPriceOverride, String(currentSnapshot.product.sellingPrice))
  assert.equal(state.economicInputs.sgaPercentOverride, String(currentSnapshot.product.sgaPercent))
  const currentDefaultsResult = calculateEconomicSimulation(
    currentSnapshot,
    simulation.simulationCost,
    simulation.parameterSavingPerPiece,
    state.economicInputs
  )
  assert.equal(currentDefaultsResult.business.sellingPrice, currentSnapshot.product.sellingPrice,
    'the initial Selling Price input uses the actual Current Selling Price')
  assert.equal(currentDefaultsResult.business.sgaPercent, currentSnapshot.product.sgaPercent,
    'the initial SG&A % input uses the actual Current percentage')
  assert.equal(simulation.currentCost.total, simulation.simulationCost.total)
  assert.equal(simulation.parameterSavingPerPiece, 0, 'No-change Parameter Saving is zero')
  const pageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: state.workingSelection,
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {},
    onSendTo() { return true },
    onReset() {},
    onToggleWorkingTarget() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  const pageText = pageMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  const pageInputs = [...pageMarkup.matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag)
  const sellingPriceInput = pageInputs.find(tag => tag.includes('aria-label="Selling Price"')) ?? ''
  const sgaInput = pageInputs.find(tag => tag.includes('aria-label="SG&amp;A %"')) ?? ''
  for (const [label, input, value] of [
    ['Selling Price', sellingPriceInput, '120.00'], ['SG&A %', sgaInput, '10.00']
  ]) {
    assert.ok(input, `${label} override input renders in the Simulation Business panel`)
    assert.match(input, new RegExp(`value="${value}"`), `${label} visibly contains its Current value`)
    assert.doesNotMatch(input, /placeholder="Current"/, `${label} does not use a Current placeholder`)
  }
  for (const label of ['Fixed Action Cost', 'Variable Action Cost / Unit', 'Batch Size']) {
    const input = pageInputs.find(tag => tag.includes(`aria-label="${label}"`)) ?? ''
    assert.ok(input, `${label} input renders in the Simulation panel`)
    assert.match(input, /value=""/, `${label} remains blank by default`)
  }
  assert.match(pageMarkup, /Clone from/)
  assert.match(pageMarkup, /Send to/)
  const sendToButtonIndex = pageMarkup.indexOf('>Send to<')
  const resetButtonIndex = pageMarkup.indexOf('aria-label="Reset Simulation"')
  assert.ok(sendToButtonIndex >= 0 && resetButtonIndex > sendToButtonIndex,
    'Simulation exposes its Reset action immediately after Send To')
  const actionGroupStart = pageMarkup.lastIndexOf('<div class="flex items-center gap-1.5">', sendToButtonIndex)
  const actionGroupEnd = pageMarkup.indexOf('</div>', resetButtonIndex)
  const actionMarkup = pageMarkup.slice(actionGroupStart, actionGroupEnd)
  const actionLabels = [...actionMarkup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attributes, contents]) =>
    attributes.match(/aria-label="([^"]+)"/)?.[1] ?? contents.replace(/<[^>]*>/g, '').trim())
  assert.deepEqual(actionLabels, ['Clone from', 'Send to', 'Reset Simulation'],
    'Reset is the next Simulation action after Send To')
  const navbarSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
  assert.doesNotMatch(navbarSource, /simulationReset|Reset Simulation/,
    'Reset is not rendered by the global Navbar on Master Data or Cost Breakdown')
  const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  assert.equal([...appSource.matchAll(/<SimulationPage\b/g)].length, 1,
    'the app mounts one Simulation page instance')
  assert.match(appSource, /activeTab === 'simulation'\s*&&\s*\(\s*<SimulationPage/,
    'the Simulation page action, including Reset, only mounts for the Simulation tab')
  assert.match(pageMarkup, /Result/)
  assert.match(pageMarkup, /Economic/)
  assert.match(pageMarkup, /Bill of Materials/, 'the BOM table uses its full identity')
  assert.match(pageMarkup, /Routing Process/, 'the RTG table uses its full identity')
  assert.equal([...pageMarkup.matchAll(/<th scope="col"[^>]*>Status<\/th>/g)].length, 4,
    'BOM and RTG expose visible and screen-reader table headers while keeping a separate visual header')
  assert.doesNotMatch(pageMarkup, /0 selected|1 selected|2 selected/, 'separate table title/count bars are removed')
  assert.match(pageMarkup, /Selection is a local working aid and does not limit the full Simulation calculation/,
    'the UI explains that local row selection does not filter calculation')
  const renderedResultPanel = pageMarkup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.match(renderedResultPanel, /<h2 id="simulation-result-title"[^>]*>Result<\/h2>/,
    'the Result heading remains visible')
  const inputsColumnIndex = pageMarkup.indexOf('data-simulation-layout-column="inputs"')
  const resultColumnIndex = pageMarkup.indexOf('data-simulation-layout-column="result-and-break-even"')
  assert.ok(inputsColumnIndex >= 0 && resultColumnIndex > inputsColumnIndex,
    'the upper-right workspace has two separate vertical columns')
  const inputsColumnMarkup = pageMarkup.slice(inputsColumnIndex, resultColumnIndex)
  const leftSectionHeadings = [
    inputsColumnMarkup.indexOf('Business Inputs'),
    inputsColumnMarkup.indexOf('Economic Inputs'),
    inputsColumnMarkup.indexOf('Economic Outputs')
  ]
  assert.ok(leftSectionHeadings.every((index, position) => index >= 0 && (position === 0 || index > leftSectionHeadings[position - 1])),
    'the left column stacks Business Inputs, Economic Inputs, and Economic Outputs in order')
  assert.doesNotMatch(inputsColumnMarkup, />SIM Standard Cost<\/span>|>Operating Profit<\/span>|>SG&amp;A<\/span>/,
    'Business outputs are removed from the input column')
  const breakEvenGraphIndex = pageMarkup.indexOf('Break-even Graph', resultColumnIndex)
  assert.ok(breakEvenGraphIndex > resultColumnIndex,
    'the right column places the Break-even Graph below Result')
  assert.match(renderedResultPanel, /Selling Price[\s\S]*SG&amp;A[\s\S]*Operating Profit/,
    'Result retains all three Business outcomes')
  assert.ok(pageMarkup.includes('xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]'),
    'the main graph has a wider desktop column than the right-side block')
  assert.ok(pageMarkup.includes('xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]') &&
    pageMarkup.includes('xl:grid-rows-[minmax(0,1.2fr)_minmax(0,.8fr)]') &&
    pageMarkup.includes('xl:grid-rows-[minmax(0,.95fr)_minmax(0,1.45fr)_minmax(0,1fr)]'),
  'the two right-side columns use independent fixed row subdivisions')
  const businessInputsMarkup = pageMarkup.match(/<section[^>]*aria-labelledby="simulation-business-inputs-title"[\s\S]*?<\/section>/)?.[0] ?? ''
  const economicInputsMarkup = pageMarkup.match(/<section[^>]*aria-labelledby="simulation-economic-inputs-title"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.ok(businessInputsMarkup.includes('grid grid-cols-1') && economicInputsMarkup.includes('grid min-w-0 grid-cols-1'),
    'Business and Economic inputs use vertical single-column layouts')
  const businessInputLabels = ['Selling Price', 'SG&amp;A %'].map(label => businessInputsMarkup.indexOf(label))
  const economicInputLabels = ['Variable Action Cost / Unit', 'Fixed Action Cost', 'Batch Size'].map(label => economicInputsMarkup.indexOf(label))
  assert.ok(businessInputLabels.every((index, position) => index >= 0 && (position === 0 || index > businessInputLabels[position - 1])),
    'Business inputs remain in Selling Price then SG&A order')
  assert.ok(economicInputLabels.every((index, position) => index >= 0 && (position === 0 || index > economicInputLabels[position - 1])),
    'Economic inputs remain in Variable Action Cost, Fixed Action Cost, Batch Size order')
  assert.ok(pageMarkup.includes('xl:flex-[1.25]') && pageMarkup.includes('xl:flex-1'),
    'the bottom BOM/RTG area receives the larger fixed workspace allocation')
  assert.doesNotMatch(renderedResultPanel, /Current → SIM|THB\//,
    'the Result panel does not render the removed Current-to-SIM/UOM subtitle')
  assert.ok(pageText.includes('0.00%'), 'no-change Result percentage renders as 0.00%')
  assert.doesNotMatch(pageMarkup, /Calculation notes/, 'Calculation Notes are removed from the Economic UI')
  assert.doesNotMatch(pageMarkup, /<h1[^>]*>Simulation<\/h1>|Adjust SIM parameters and review the live/,
    'the large Simulation PageHeading is removed')
  assert.doesNotMatch(pageMarkup, /Factors to Simulate|Select .* factor/,
    'direct editing does not show a Factors selector')
  assert.doesNotMatch(pageMarkup, /min-w-\[(?:390|650|730)px\]|overflow-x-auto/,
    'Result, BOM, and RTG do not force a horizontal scroll area')
  assert.match(pageMarkup, /table-fixed/, 'the parameter table fits its panel with fixed layout')
  assert.equal([...pageMarkup.matchAll(/<div class="hidden md:flex xl:shrink-0">/g)].length, 2,
    'BOM and RTG render a separate non-scrolling visual header')
  assert.equal([...pageMarkup.matchAll(/aria-hidden="true" class="shrink-0 bg-slate-900 shadow-\[inset_0_-1px_0_#334155\]" style="width:0"/g)].length, 2,
    'each header has its own measured gutter cell outside the table column geometry')
  assert.equal([...pageMarkup.matchAll(/inline-block whitespace-nowrap">(?:Material Cost|Conversion Cost)<\/span>/g)].length, 2,
    'both desktop cost headers remain on one line')
  assert.equal([...pageMarkup.matchAll(/<div class="overflow-x-hidden md:overflow-y-visible xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:\[scrollbar-gutter:stable\]">/g)].length, 2,
    'only the BOM and RTG table body wrappers own vertical scrolling')
  assert.equal([...pageMarkup.matchAll(/<table role="presentation"/g)].length, 2,
    'the visual header table does not duplicate table semantics')
  assert.equal([...pageMarkup.matchAll(/<col style="width:14\.5%"\/>/g)].length, 12,
    'the separate BOM and RTG header and body tables share the same parameter column geometry')
  assert.equal([...pageMarkup.matchAll(/relative left-4 inline-block/g)].length, 2,
    'only the Material Cost and Conversion Cost header labels shift toward their existing value axes')
  assert.match(pageMarkup, /<td class="whitespace-nowrap px-1 py-2 leading-3 font-sans text-\[10px\] font-bold text-slate-500">UNCHANGED<\/td>/,
    'desktop status is a separate cell rather than secondary text under row identity')
  assert.match(pageMarkup, /aria-label="A deliberately long stainless steel material description for wrapping Price in SIM"/,
    'editable fields remain labelled for long material names')
  const materialNameIndex = pageMarkup.indexOf('A deliberately long stainless steel material description for wrapping')
  assert.ok(materialNameIndex >= 0, 'the test row is present in the rendered table')
  const selectedPageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: [simulationWorkingTargetKey('bom', currentSnapshot.bom[1].id)],
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {},
    onSendTo() { return true },
    onReset() {},
    onToggleWorkingTarget() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  assert.match(selectedPageMarkup, /aria-label="Deselect BOM row 2: Second material"[^>]*aria-pressed="true"/,
    'the row number itself becomes the blue selected control')
  assert.doesNotMatch(selectedPageMarkup, /1 selected/, 'selection does not reintroduce a selected-count strip')
  assert.doesNotMatch(selectedPageMarkup, /type="checkbox"|>Select<\/th>/,
    'Simulation has no separate Select column or checkbox')
  assert.ok(selectedPageMarkup.indexOf('Second material') < selectedPageMarkup.indexOf('A deliberately long stainless steel material description'),
    'selected rows are presented before unselected rows without changing the underlying snapshot')
  assert.deepEqual(state.snapshot!.bom.map(row => row.id), currentSnapshot.bom.map(row => row.id),
    'selected-first presentation does not mutate source snapshot order')
  const renderStandardCostChangeCells = (price: number) => {
    const changed = updateSimulationParameter(state, currentSnapshot, currentSnapshot.bom[0].id, 'bom.price', price)
    const markup = renderToStaticMarkup(React.createElement(SimulationPage, {
      state: changed,
      workingSelection: changed.workingSelection,
      referenceSnapshot,
      currentSnapshot,
      onCloneSource() {}, onSendTo() { return true }, onReset() {}, onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
    }))
    const resultPanel = markup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
    const standardCostRow = [...resultPanel.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      .find(match => match[1].includes('Standard Cost'))?.[1] ?? ''
    return [...standardCostRow.matchAll(/<td class="([^"]*)">([\s\S]*?)<\/td>/g)]
      .map(match => ({ className: match[1], text: match[2].replace(/<[^>]*>/g, '').trim() }))
  }
  const increasedCostCells = renderStandardCostChangeCells(13)
  assert.equal(increasedCostCells[2]?.text, '+2.10')
  assert.match(increasedCostCells[2]?.className ?? '', /text-rose-700/)
  assert.equal(increasedCostCells[3]?.text, '+7.07%')
  assert.match(increasedCostCells[3]?.className ?? '', /text-rose-700/)
  const decreasedCostCells = renderStandardCostChangeCells(11)
  assert.equal(decreasedCostCells[2]?.text, '-2.10')
  assert.match(decreasedCostCells[2]?.className ?? '', /text-emerald-700/)
  assert.equal(decreasedCostCells[3]?.text, '-7.07%')
  assert.match(decreasedCostCells[3]?.className ?? '', /text-emerald-700/)
  const materialRowStart = pageMarkup.lastIndexOf('<tr', materialNameIndex)
  assert.ok(materialRowStart >= 0, 'the test material belongs to a rendered table row')
  const materialRowStartTag = pageMarkup.slice(materialRowStart, pageMarkup.indexOf('>', materialRowStart))
  assert.match(materialRowStartTag, /tabindex="0"/, 'the whole parameter row is keyboard reachable')
  assert.match(materialRowStartTag, /aria-expanded="false"/, 'the row exposes its collapsed state')
  assert.match(materialRowStartTag, /aria-label=/, 'the whole parameter row has an accessible name')
  const pageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
  const rolesStart = pageSource.indexOf('const ROLES: Array')
  const rolesEnd = pageSource.indexOf('const BOM_PARAMETERS', rolesStart)
  const roleSource = pageSource.slice(rolesStart, rolesEnd)
  for (const [role, label] of [['reference', 'Reference'], ['current', 'Current'], ['custom', 'Custom']]) {
    assert.ok(roleSource.includes(`role: '${role}', label: '${label}'`),
      `Send to offers the ${label} Master Data role`)
  }
  const sendToMenuSource = pageSource.match(/<RoleActionMenu\s+label="Send to"[\s\S]*?\/>/)?.[0] ?? ''
  assert.ok(sendToMenuSource.length > 0, 'the Send to role menu is wired in the Simulation actions')
  assert.match(sendToMenuSource, /onSendTo\(role, simulationSnapshot\)/,
    'Send to passes the selected role and current SIM snapshot to its integration callback')
  assert.doesNotMatch(pageSource, /transferMessage|transferError|SIM sent to|Send blocked by Master Data validation/,
    'Send keeps defensive validation without persistent Result feedback')
  const rowTemplateStart = pageSource.indexOf('const status = rowStatusText(row,')
  assert.ok(rowTemplateStart >= 0, 'the Simulation parameter row template remains identifiable')
  const rowOpeningStart = pageSource.indexOf('<tr', rowTemplateStart)
  assert.ok(rowOpeningStart >= 0, 'the parameter row uses a table row element')
  const rowHandlerSource = pageSource.slice(rowOpeningStart, pageSource.indexOf('</tr>', rowOpeningStart))
  assert.match(rowHandlerSource, /onClick=\{/, 'clicking anywhere on the parameter row invokes its row action')
  assert.match(rowHandlerSource, /onKeyDown=\{/, 'the row action has a keyboard handler')
  assert.match(rowHandlerSource, /event\.key\s*!==\s*['"]Enter['"]/, 'Enter is accepted by the row activation guard')
  assert.match(rowHandlerSource, /event\.key\s*!==\s*['"] ['"]/, 'Space is accepted by the row activation guard')
  assert.match(rowHandlerSource, /isInteractiveTarget\(event\.target, event\.currentTarget\)/,
    'editing inputs and nested controls keep their own click behavior')
  assert.match(pageSource, /\[data-safe-workspace-interaction="true"\]/,
    'clicking inside an expanded detail does not bubble into its parent row toggle')
  assert.match(rowHandlerSource, /aria-expanded=\{canExpand \? expanded : undefined\}/,
    'the row exposes its expanded state to assistive technology')
  assert.match(rowHandlerSource, /onClick=\{event => \{[\s\S]*?toggleExpanded\(\)/,
    'safe row clicks toggle the expanded detail')
  assert.match(rowHandlerSource, /event\.key !== 'Enter' && event\.key !== ' '/,
    'the row itself responds to both Enter and Space')
  assert.match(rowHandlerSource, /<span aria-hidden="true" className="inline-grid h-7 w-7 place-items-center text-slate-600">/,
    'the Chevron remains a decorative indicator rather than a duplicate button')
  const mobileRowsStart = pageSource.indexOf('visibleRows.map(({ row, sourceIndex }) => {', pageSource.indexOf('visibleRows.map(({ row, sourceIndex }) => {') + 1)
  assert.ok(mobileRowsStart >= 0, 'a separate mobile card row template remains available')
  const mobileArticleStart = pageSource.indexOf('<article', mobileRowsStart)
  const mobileRowHandlerSource = pageSource.slice(mobileArticleStart, pageSource.indexOf('</article>', mobileArticleStart))
  assert.match(mobileRowHandlerSource, /tabIndex=\{canExpand \? 0 : undefined\}/, 'mobile rows are keyboard reachable too')
  assert.match(mobileRowHandlerSource, /onClick=\{/, 'the full mobile card toggles its detail')
  assert.match(mobileRowHandlerSource, /onKeyDown=\{/, 'mobile rows use the same keyboard activation')
  assert.match(mobileRowHandlerSource, /event\.key\s*!==\s*['"]Enter['"]|event\.key\s*!==\s*['"] ['"]/,
    'mobile cards respond to Enter or Space')
  assert.doesNotMatch(pageMarkup, /RCA Case context|Start SIM From|Action Cost\s*\/\s*Evaluation Quantity|Evaluation Quantity/,
    'visible Simulation has no active RCA strip or old economic model')

  const duplicateSnapshot = {
    ...customSnapshot,
    bom: [
      { ...customSnapshot.bom[0], id: 'ambiguous-1' },
      { ...customSnapshot.bom[0], id: 'ambiguous-2' }
    ]
  }
  const protectedState = startSimulationFrom('custom', { ...sources, custom: duplicateSnapshot })
  const protectedMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state: protectedState,
    workingSelection: protectedState.workingSelection,
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {}, onSendTo() { return true }, onReset() {}, onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
  }))
  assert.match(protectedMarkup, /Ambiguous identity · protected/)
  assert.match(protectedMarkup, /aria-label="Bill of Materials: .* activate to expand Parameter Cost Effect"/,
    'the ambiguous row exposes its full-row expansion name')
  const protectedRowStart = protectedMarkup.indexOf('<tr data-safe-workspace-interaction="true" aria-selected="false"')
  const protectedRowTag = protectedMarkup.slice(protectedRowStart, protectedMarkup.indexOf('>', protectedRowStart))
  assert.match(protectedRowTag, /aria-label="Bill of Materials: .* activate to expand Parameter Cost Effect"/,
    'the protected row itself exposes its expansion action')
  assert.match(protectedRowTag, /tabindex="0"/, 'the protected row is keyboard reachable')
  assert.match(protectedRowTag, /aria-expanded="false"/, 'the protected row exposes its collapsed state')
  assert.doesNotMatch(protectedMarkup, /<button[^>]*aria-label="Expand Parameter Cost Effect for/,
    'the Chevron does not create a second independent expand button')
  assert.match(pageSource, /<td aria-hidden="true" \/>[\s\S]*?<th scope="row" colSpan=\{2\}/,
    'the empty number cell precedes the identity-aligned label while effects remain under parameters')
  assert.match(protectedMarkup, /aria-expanded="false"/)
  assert.doesNotMatch(protectedMarkup, /<h4[^>]*>Parameter Cost Effect<\/h4>/,
    'the Parameter Cost Effect detail remains collapsed until requested')
  assert.doesNotMatch(protectedMarkup, /100\.00%/, 'per-parameter attribution shares are not presented')
  assert.doesNotMatch(protectedMarkup, /type="checkbox"|aria-label="Select BOM row/, 'ambiguous rows are not selectable')
  assert.match(pageSource, /const canExpand = true/, 'protected rows can expand even without a status')
  assert.doesNotMatch(pageSource, /effectUnavailableReason|Unavailable\s*·|Business identity cannot be matched safely|Business identity is missing or unmatched|The row exists only in SIM|The row exists only in Current|Required inputs or Work Center context are unavailable/,
    'expanded BOM and Routing details do not render unavailable-reason prose')
  assert.match(pageSource, /\{expanded && \(/, 'Parameter Cost Effect appears only after expanding the row')
  assert.match(pageSource, /Parameter Cost Effect/, 'the expandable row contains the effect detail')
  assert.match(pageSource, /detailParameters\.map\(parameter => <EffectCell key=\{parameter\.parameter\} amount=\{parameter\.amount\} \/>/,
    'desktop effect cells keep rendering the existing dash presentation for unavailable values')
  assert.match(pageSource, /parameterEffectPresentation\(analysis\.effects\.effects\?\.\[parameter\.effectKey\]\)/,
    'mobile effect values keep using the same unavailable-value presentation')
  assert.match(pageSource, /const totalEffect = parameterEffectPresentation\(analysis\.effects\.totalEffect\)/,
    'the expanded Total uses the signed presentation helper')
  assert.match(pageSource, /aria-label=\{`Total \$\{totalEffect\.text\}`\}/,
    'the expanded Total accessible name includes its signed value')
  assert.match(pageSource, /useTransientInteraction\(expandedRows\.size > 0, \(\) => setExpandedRows\(new Set\(\)\)\)/,
    'expanded details register with the shared transient workspace-dismiss system')
  assert.match(pageSource, /<tr id=\{detailId\} data-safe-workspace-interaction="true"/,
    'the expanded detail itself is protected from workspace dismissal')
  assert.match(pageSource, /<th scope="row" colSpan=\{2\}[^>]*>\s*<span className="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">Parameter Cost Effect/,
    'the hierarchy guide and label are indented within their cell while effect cells remain separate')
  assert.match(pageSource, /className="whitespace-nowrap py-1\.5 pl-1 pr-8 text-right font-mono tabular-nums"/,
    'parameter effect numeric cells keep their existing column alignment')
  assert.match(pageSource, /<td className="py-2 pl-1 pr-6 text-right font-mono text-xs tabular-nums text-slate-900">\{displayMoney\(analysis\.simCost\)\}<\/td>/,
    'the Material Cost and Conversion Cost values keep their existing numeric axis')
  assert.match(pageSource, /className="whitespace-nowrap py-1\.5 pl-1 pr-6 text-right text-\[10px\] font-semibold"/,
    'the expanded Total keeps the same numeric padding as its cost value')
  assert.doesNotMatch(pageSource, /analysis\.effects\.shares\?\./, 'per-factor share percentages are removed from the presentation')

  console.log('Simulation story graph and page contract verification passed')
  }
} finally {
  await vite.close()
}
