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
  const { SimulationStoryGraph, buildVisibleStack, buildVisibleStandardCost, buildGraphScale } = await vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx')
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
    return { left, right: left + width, top: y - 7, bottom: y + 2 }
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
  const statePriceVisualBottom = (markup: string, stateX: number,
    bounds: { left: number; right: number; top: number; bottom: number }) => {
    const point = sellingPricePoint(markup, stateX)
    const pointTouchesText = point && bounds.left - 2 <= point.x + 4 && bounds.right + 2 >= point.x - 4
    let bottom = pointTouchesText ? point.y + 4 : Number.NEGATIVE_INFINITY
    for (const line of sellingPriceLineSegments(markup).filter(segment => segment.x1 === stateX || segment.x2 === stateX)) {
      const left = Math.max(Math.min(line.x1, line.x2), bounds.left - 2)
      const right = Math.min(Math.max(line.x1, line.x2), bounds.right + 2)
      if (left > right) continue
      const yAt = (x: number) => line.y1 + ((x - line.x1) / (line.x2 - line.x1)) * (line.y2 - line.y1)
      bottom = Math.max(bottom, yAt(left), yAt(right)) + 1
    }
    return Number.isFinite(bottom) ? bottom : null
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
    assert.equal(numericSvgAttribute(valueLabel, 'y'), numericSvgAttribute(boundaryLine, 'y1') + 3,
      `${state} Standard Cost keeps its existing position relative to its boundary`)
  }
  assert.doesNotMatch(graphMarkup, /data-graph-total="(?:reference|current|simulated)"/,
    'full commercial-stack values are not duplicated above REF/CUR/SIM')
  assert.deepEqual(svgTextLabels.filter(label => ['REF', 'GAP 1', 'CUR', 'GAP 2', 'SIM'].includes(label)),
    ['REF', 'GAP 1', 'CUR', 'GAP 2', 'SIM'], 'the five category labels follow the fixed graph story')
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
  assert.match(graphMarkup, /preserveAspectRatio="xMidYMid meet"/,
    'the responsive graph preserves circular markers and undistorted text and lines')
  assert.doesNotMatch(graphMarkup, /<title\b|\stitle=/, 'graph elements do not expose native hover tooltips')
  assert.match(graphMarkup, /<h2 id="simulation-story-title"[^>]*>Simulation Cost Structure<\/h2>[\s\S]*?<ul aria-label="Simulation graph legend"/,
    'the graph title and legend share the header area')
  const graphHeaderClasses = graphSource.match(/<div className="flex min-w-0 flex-col gap-1\.5 border-b border-slate-200 pb-1\.5 ([^"]+)"/)?.[1] ?? ''
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
  assert.match(graphMarkup, /fill="none" stroke="#334155" stroke-width="1"/, 'Standard Cost uses a neutral outline without another fill')
  assert.match(graphMarkup, /role="slider"[^>]*aria-label="Simulation comparison ruler"[^>]*aria-orientation="vertical"[^>]*class="[^"]*cursor-ns-resize/,
    'the ruler keeps its vertical resize cursor')
  assert.doesNotMatch(graphMarkup, /cursor-help/, 'graph information targets do not show a help cursor')
  assert.match(graphMarkup, /aria-valuetext="[^\"]+ THB\/PC"/)
  assert.match(graphSource, /data-ruler-value="true" x=\{plot\.right \+ 7\}/, 'the ruler value sits at the line end without a label')
  assert.match(graphSource, /onKeyDown=\{handleRulerKeyDown\}/, 'the visual ruler remains keyboard operable')
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
  const legendMarkup = graphMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
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
  assert.doesNotMatch(graphSource, /VISIBLE_NET_SIDE_LABEL_GAP|const candidates\s*=\s*\[base/,
    'Visible Net uses one deterministic fallback instead of the obsolete candidate search')
  assert.match(graphSource, /defaultNetBounds\.top < plot\.top \+ VISIBLE_NET_LABEL_CLEARANCE/,
    'centered Visible Net placement checks the plot top boundary')
  assert.match(graphSource, /clippedAtDefaultY[\s\S]*defaultNetPosition === 'above' \? 'below' : 'above'/,
    'top or bottom clipping switches to the opposite side of the same stack endpoint')
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
  const categoryTooltipTags = new Map([...tooltipMarkup.matchAll(/<text\b[^>]*>(REF|GAP 1|CUR|GAP 2|SIM)<\/text>/g)]
    .map(match => [match[1], match[0]] as const))
  for (const [label, tooltip] of [
    ['REF', 'Reference Cost Structure'], ['GAP 1', 'Current − Reference'], ['CUR', 'Current Cost Structure'],
    ['GAP 2', 'Simulation − Current'], ['SIM', 'Simulation Cost Structure']
  ]) {
    const categoryTag = categoryTooltipTags.get(label)
    assert.ok(categoryTag?.includes('data-graph-tooltip="true"') && categoryTag.includes(`aria-label="${tooltip}"`),
      `${label} maps to its own accessible graph tooltip`)
  }
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

  for (const [state, x] of [['reference', 180], ['current', 430], ['simulated', 680]] as const) {
    const visibleNet = graphLabelTag(graphMarkup, 'data-graph-visible-net-value', state)
    const sellingPricePoint = graphMarkup.match(new RegExp(`<circle\\b[^>]*cx="${x}"[^>]*r="3\\.5"[^>]*>`))?.[0] ?? ''
    assert.ok(visibleNet && sellingPricePoint, `${state} renders Visible Net and its Selling Price point`)
    const endpointY = numericSvgAttribute(visibleNet, 'data-graph-visible-net-endpoint-y')
    const labelY = numericSvgAttribute(visibleNet, 'y')
    assert.equal(numericSvgAttribute(sellingPricePoint, 'cy'), endpointY,
      `${state} Selling Price equals the Visible Net endpoint in the default story`)
    assert.equal(numericSvgAttribute(visibleNet, 'x'), x,
      `${state} Visible Net is centered over its own bar`)
    assert.match(visibleNet, /text-anchor="middle"/)
    assert.match(visibleNet, /data-graph-visible-net-position="above"/,
      `${state} equal Net and Selling Price stays above when the rendered glyph box clears the point`)
    assert.equal(labelY, endpointY - 12,
      `${state} positive Visible Net uses the stack-total endpoint rather than the Standard Cost anchor`)
    const candidateBox = estimatedTextBounds(x, labelY, '120.00', 'middle')
    const pointY = numericSvgAttribute(sellingPricePoint, 'cy')
    assert.ok(!boundsOverlap(candidateBox, { left: x - 4, right: x + 4, top: pointY - 4, bottom: pointY + 4 }, 2),
      `${state} equal Net/Selling Price is not moved sideways when the actual point clears the above label`)
  }

  const endpointStory = createScenarioStory(
    { ...financial(reference, 200, 10), operatingProfitPerPiece: 10 },
    { ...financial(current, 200, 10), operatingProfitPerPiece: 10 },
    { ...financial(sim, 200, 10), operatingProfitPerPiece: 10 }
  )
  const endpointMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: endpointStory, unit: 'PC' }))
  assert.deepEqual([...endpointMarkup.matchAll(/<text\b[^>]*data-graph-standard-cost-value="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
    .map(([, state, value]) => [state, value]),
  [['reference', '90.00'], ['current', '100.00'], ['simulated', '95.00']],
  'the endpoint-based Visible Net placement leaves the existing Standard Cost values unchanged')
  for (const [state, x, expectedNet] of [['reference', 180, '120.00'], ['current', 430, '130.00'], ['simulated', 680, '125.00']] as const) {
    const visibleNet = graphLabelTag(endpointMarkup, 'data-graph-visible-net-value', state)
    const standardCost = graphLabelTag(endpointMarkup, 'data-graph-standard-cost-value', state)
    const endpointY = numericSvgAttribute(visibleNet, 'data-graph-visible-net-endpoint-y')
    const standardCostY = numericSvgAttribute(standardCost, 'y')
    assert.equal(graphLabelText(endpointMarkup, 'data-graph-visible-net-value', state), expectedNet,
      `${state} visible-stack filtering updates the displayed Visible Net value`)
    assert.match(visibleNet, /data-graph-visible-net-position="above"/)
    assert.equal(numericSvgAttribute(visibleNet, 'x'), x)
    assert.match(visibleNet, /text-anchor="middle"/)
    assert.equal(numericSvgAttribute(visibleNet, 'y'), endpointY - 12,
      `${state} label y follows y(state.stack.total), not the Standard Cost value`)
    assert.notEqual(numericSvgAttribute(visibleNet, 'y'), standardCostY - 8,
      `${state} label is not positioned from the Standard Cost text baseline`)
  }

  const belowNetFinancial = { ...financial(reference, 80, 0), operatingProfitPerPiece: 10 }
  const belowNetMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(belowNetFinancial, belowNetFinancial, belowNetFinancial), unit: 'PC'
  }))
  for (const [state, x] of [['reference', 180], ['current', 430], ['simulated', 680]] as const) {
    const visibleNet = graphLabelTag(belowNetMarkup, 'data-graph-visible-net-value', state)
    const endpointY = numericSvgAttribute(visibleNet, 'data-graph-visible-net-endpoint-y')
    const defaultY = numericSvgAttribute(visibleNet, 'data-graph-visible-net-default-y')
    const point = sellingPricePoint(belowNetMarkup, x)
    assert.ok(point && point.y > endpointY, `${state} Selling Price is below its Visible Net value`)
    assert.match(visibleNet, /data-graph-visible-net-position="above"/,
      `${state} keeps normal endpoint placement when Selling Price is below Visible Net`)
    assert.equal(numericSvgAttribute(visibleNet, 'x'), x)
    assert.equal(numericSvgAttribute(visibleNet, 'y'), defaultY)
    assert.equal(defaultY, endpointY - 12)
    assert.ok(!statePriceGeometryCrowds(belowNetMarkup, x, estimatedTextBounds(x, defaultY, '100.00', 'middle')),
      `${state} keeps the normal position when the lower Selling Price visuals do not crowd it`)
  }

  const pointCollisionFinancial = { ...financial(reference, 110, 0), operatingProfitPerPiece: 10 }
  const pointCollisionMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(pointCollisionFinancial, pointCollisionFinancial, pointCollisionFinancial), unit: 'PC'
  }))
  for (const [state, x] of [['reference', 180], ['current', 430], ['simulated', 680]] as const) {
    const pointCollisionLabel = graphLabelTag(pointCollisionMarkup, 'data-graph-visible-net-value', state)
    const endpointY = numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-endpoint-y')
    const defaultY = numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-default-y')
    const defaultBox = estimatedTextBounds(x, defaultY, '100.00', 'middle')
    const point = sellingPricePoint(pointCollisionMarkup, x)
    assert.ok(point && boundsOverlap(defaultBox, {
      left: x - 4, right: x + 4, top: point.y - 4, bottom: point.y + 4
    }, 2), `${state} Selling Price point actually crowds the centered endpoint label`)
    assert.match(pointCollisionLabel, /data-graph-visible-net-position="side"/,
      `${state} point crowding moves Visible Net to its side column`)
    assert.equal(numericSvgAttribute(pointCollisionLabel, 'x'), x + 35,
      `${state} side Visible Net uses its existing Standard Cost numeric column`)
    assert.match(pointCollisionLabel, /text-anchor="start"/)
    assert.equal(defaultY, endpointY - 12,
      `${state} side placement retains the positive Visible Net endpoint baseline`)

    const sideBox = visibleNetTextBounds(pointCollisionMarkup, pointCollisionLabel)
    assert.ok(sideBox.left >= 0 && sideBox.right <= 820 && sideBox.top >= 0 && sideBox.bottom <= 332,
      `${state} side Visible Net remains inside the SVG viewBox`)
    assert.ok(!statePriceGeometryCrowds(pointCollisionMarkup, x, sideBox, 0),
      `${state} side Visible Net is clear of its Selling Price point and incident line`)
    assert.equal(numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-text-top'), sideBox.top)
    assert.equal(numericSvgAttribute(pointCollisionLabel, 'data-graph-visible-net-text-bottom'), sideBox.bottom)
    const sideDefaultBox = estimatedTextBounds(x + 35, defaultY, '100.00', 'start')
    const sideVisualBottom = statePriceVisualBottom(pointCollisionMarkup, x, sideDefaultBox)
    if (sideVisualBottom !== null && statePriceGeometryCrowds(pointCollisionMarkup, x, sideDefaultBox)) {
      assert.equal(sideBox.top, sideVisualBottom + 2,
        `${state} moves only enough to clear Selling Price visuals still under the side-column text`)
    } else {
      assert.equal(numericSvgAttribute(pointCollisionLabel, 'y'), defaultY,
        `${state} keeps endpoint-derived Y when the side-column text clears Selling Price visuals`)
    }

    const standardCost = graphLabelTag(pointCollisionMarkup, 'data-graph-standard-cost-value', state)
    const standardCostBox = estimatedTextBounds(
      numericSvgAttribute(standardCost, 'x'), numericSvgAttribute(standardCost, 'y'),
      graphLabelText(pointCollisionMarkup, 'data-graph-standard-cost-value', state), 'start'
    )
    assert.ok(!boundsOverlap(sideBox, standardCostBox, 1),
      `${state} side Visible Net remains readable beside the Standard Cost value`)
  }

  const lineReference = { ...financial(reference, 80, 0), operatingProfitPerPiece: 10 }
  const lineCurrent = { ...financial(current, 10000, 0), operatingProfitPerPiece: 10 }
  const lineSimulated = { ...financial(sim, 10000, 0), operatingProfitPerPiece: 10 }
  const lineCollisionMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(lineReference, lineCurrent, lineSimulated), unit: 'PC'
  }))
  const lineCollisionLabel = graphLabelTag(lineCollisionMarkup, 'data-graph-visible-net-value', 'reference')
  const lineCollisionEndpoint = numericSvgAttribute(lineCollisionLabel, 'data-graph-visible-net-endpoint-y')
  const lineCandidateBox = estimatedTextBounds(180, lineCollisionEndpoint - 12, '100.00', 'middle')
  const referenceSellingPricePoint = lineCollisionMarkup.match(/<circle\b[^>]*cx="180"[^>]*r="3\.5"[^>]*>/)?.[0] ?? ''
  const referencePointY = numericSvgAttribute(referenceSellingPricePoint, 'cy')
  assert.ok(referencePointY > lineCollisionEndpoint,
    'Reference Selling Price is numerically below the Reference Visible Net')
  assert.ok(!boundsOverlap(lineCandidateBox, {
    left: 176, right: 184, top: referencePointY - 4, bottom: referencePointY + 4
  }, 2), 'the Reference Selling Price point itself clears the default label')
  const sellingPriceLine = lineCollisionMarkup.match(/<path\b(?=[^>]*stroke="#2563eb")[^>]*>/)?.[0] ?? ''
  const linePath = sellingPriceLine.match(/d="M ([^ ]+) ([^ ]+) L ([^ ]+) ([^"]+)"/)
  assert.ok(linePath, 'the reference-to-current Selling Price line is rendered')
  const [, lineX1, lineY1, lineX2, lineY2] = linePath
  const labelEdgeX = lineCandidateBox.right
  const lineAtLabelEdge = Number(lineY1) +
    ((labelEdgeX - Number(lineX1)) / (Number(lineX2) - Number(lineX1))) * (Number(lineY2) - Number(lineY1))
  assert.ok(lineAtLabelEdge >= lineCandidateBox.top - 3 && lineAtLabelEdge <= lineCandidateBox.bottom + 3,
    'the connected Reference-to-Current Selling Price line crosses the default label text bounds')
  assert.match(lineCollisionLabel, /data-graph-visible-net-position="side"/,
    'a connected-line collision triggers the side fallback even when Reference Selling Price is below Visible Net')
  assert.equal(numericSvgAttribute(lineCollisionLabel, 'x'), 215)
  assert.match(lineCollisionLabel, /text-anchor="start"/)
  assert.equal(numericSvgAttribute(lineCollisionLabel, 'data-graph-visible-net-default-y'), lineCollisionEndpoint - 12,
    'the line-triggered side label retains the positive Visible Net endpoint baseline')
  const lineFallbackBox = visibleNetTextBounds(lineCollisionMarkup, lineCollisionLabel)
  const referenceIncidentLine = sellingPriceLineSegments(lineCollisionMarkup).find(line => line.x1 === 180 || line.x2 === 180)
  assert.ok(referenceIncidentLine && !priceLineCrossesText(referenceIncidentLine, lineFallbackBox, 0),
    'after moving right, Visible Net no longer intersects the crossing Selling Price line')
  const sideLineVisualBottom = statePriceVisualBottom(lineCollisionMarkup, 180, lineFallbackBox)
  if (sideLineVisualBottom !== null && statePriceGeometryCrowds(lineCollisionMarkup, 180,
    estimatedTextBounds(215, lineCollisionEndpoint - 12, '100.00', 'start'))) {
    assert.equal(lineFallbackBox.top, sideLineVisualBottom + 2,
      'the line-triggered fallback moves down only by the measured clearance still needed at the side column')
  } else {
    assert.equal(numericSvgAttribute(lineCollisionLabel, 'y'), lineCollisionEndpoint - 12,
      'the line-triggered fallback keeps endpoint Y when the right-side text column clears the line')
  }
  assert.ok(lineFallbackBox.left >= 0 && lineFallbackBox.right <= 820 && lineFallbackBox.top >= 0 && lineFallbackBox.bottom <= 332,
    'the line-triggered side label remains within the SVG viewBox')

  const boundaryFinancial = {
    material: 4, labor: 3, burden: 3, standardCost: 10,
    sgaAmountPerPiece: 0, operatingProfitPerPiece: 1e18, sellingPrice: null
  }
  const boundaryMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: createScenarioStory(boundaryFinancial, boundaryFinancial, boundaryFinancial), unit: 'PC'
  }))
  const boundaryLabel = graphLabelTag(boundaryMarkup, 'data-graph-visible-net-value', 'reference')
  const boundaryLabelText = graphLabelText(boundaryMarkup, 'data-graph-visible-net-value', 'reference')
  const boundaryEndpointY = numericSvgAttribute(boundaryLabel, 'data-graph-visible-net-endpoint-y')
  const centeredBoundaryBox = estimatedTextBounds(180, boundaryEndpointY - 12, boundaryLabelText, 'middle')
  assert.ok(centeredBoundaryBox.left < 122,
    'the long centered Visible Net would crowd the plot left boundary')
  assert.ok(centeredBoundaryBox.top >= 40,
    'the current finite-value fixture keeps its centered label below the top boundary because the graph range includes headroom')
  assert.match(boundaryLabel, /data-graph-visible-net-position="side"/,
    'a Visible Net label that crowds a plot boundary moves to the side')
  assert.equal(numericSvgAttribute(boundaryLabel, 'x'), 215)
  assert.match(boundaryLabel, /text-anchor="start"/)
  const sideBoundaryBox = estimatedTextBounds(
    numericSvgAttribute(boundaryLabel, 'x'), numericSvgAttribute(boundaryLabel, 'y'), boundaryLabelText, 'start'
  )
  assert.ok(sideBoundaryBox.left >= 122 && sideBoundaryBox.right <= 750 && sideBoundaryBox.top >= 40 && sideBoundaryBox.bottom <= 270,
    'the side label text stays within the plot boundary')

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
  assert.equal(state.economicInputs.sellingPriceOverride, '')
  assert.equal(state.economicInputs.sgaPercentOverride, '')
  const currentFallbackResult = calculateEconomicSimulation(
    currentSnapshot,
    simulation.simulationCost,
    simulation.parameterSavingPerPiece,
    state.economicInputs
  )
  assert.equal(currentFallbackResult.business.sellingPrice, currentSnapshot.product.sellingPrice,
    'blank Selling Price override uses the Current Selling Price in the rendered Simulation state')
  assert.equal(currentFallbackResult.business.sgaPercent, currentSnapshot.product.sgaPercent,
    'blank SG&A override uses the Current SG&A in the rendered Simulation state')
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
  const sgaInput = pageInputs.find(tag => tag.includes('aria-label="SG&amp;A"')) ?? ''
  for (const [label, input] of [['Selling Price', sellingPriceInput], ['SG&A', sgaInput]]) {
    assert.ok(input, `${label} override input renders in the Simulation Business panel`)
    assert.match(input, /placeholder="Current"/, `${label} shows the Current fallback as its placeholder`)
    assert.match(input, /value=""/, `${label} override draft remains visually blank`)
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
  assert.match(pageMarkup, /Current → SIM/)
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
