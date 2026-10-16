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
  const { SimulationStoryGraph, buildVisibleStack } = await vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx')
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { simulationWorkingTargetKey, startSimulationFrom } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { calculateParameterSimulation, updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

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
    { key: 'material', legendKey: 'material', tooltipLabel: 'Material', color: '#4F7CAC' },
    { key: 'labor', legendKey: 'labor', tooltipLabel: 'Labor', color: '#D89B45' },
    { key: 'burden', legendKey: 'burden', tooltipLabel: 'Burden', color: '#8067B7' },
    { key: 'sgaAmountPerPiece', legendKey: 'sga', tooltipLabel: 'SG&A', color: '#a8b4c2' },
    { key: 'operatingProfitPerPiece', legendKey: null, tooltipLabel: 'Operating Profit', color: '#15803d' }
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
  assert.deepEqual(allCostsStack.segments.map(({ part, before, after }) => [part.key, before, after]), [
    ['material', 0, 4], ['labor', 4, 7], ['burden', 7, 10]
  ])
  const noLaborValues = { ...tenCostValues, labor: null }
  const noLaborStack = buildVisibleStack(noLaborValues, graphParts.slice(0, 3), { ...allLegendVisible, labor: false })
  assert.equal(noLaborStack.total, 7, 'hidden labor is excluded from the visible graph total even when unavailable')
  assert.deepEqual(noLaborStack.segments.map(({ part, before, after }) => [part.key, before, after]), [
    ['material', 0, 4], ['burden', 4, 7]
  ], 'a hidden middle component leaves no empty stack space')
  assert.equal(buildVisibleStack(noLaborValues, graphParts.slice(0, 3), allLegendVisible).total, null,
    'a visible unavailable component keeps the displayed total unavailable')
  assert.deepEqual(tenCostValues, tenCostValuesBefore, 'graph filtering leaves source values unchanged')
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
  const graphText = graphMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  const svgTextLabels = [...graphMarkup.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map(match => match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim())
  const expectedBarTotals = new Map([['180', '120.00'], ['305', '+10.00'], ['430', '120.00'], ['555', '-5.00'], ['680', '120.00']])
  const expectedBarTotalValues = new Set(expectedBarTotals.values())
  const barTopLabels = [...graphMarkup.matchAll(/<text\b[^>]*data-graph-total="(?:reference|gap1|current|gap2|simulated)"[^>]*>[\s\S]*?<\/text>/g)]
    .map(match => {
      const openingTag = match[0].slice(0, match[0].indexOf('>') + 1)
      const x = Number(openingTag.match(/\bx="([^"]+)"/)?.[1])
      const y = openingTag.match(/\by="([^"]+)"/)?.[1]
      const label = match[0].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]*>/g, '').trim()
      return { x, y, label }
    })
    .filter(({ y, label }) => y !== '306' && expectedBarTotalValues.has(label))
    .map(({ x, label }) => [x, label] as const)
    .sort((left, right) => left[0] - right[0])
  assert.deepEqual(barTopLabels, [...expectedBarTotals].map(([x, label]) => [Number(x), label]),
    'REF/GAP1/CUR/GAP2/SIM bar ends show numeric totals only, in graph order')
  assert.deepEqual(svgTextLabels.filter(label => ['REF', 'GAP 1', 'CUR', 'GAP 2', 'SIM'].includes(label)),
    ['REF', 'GAP 1', 'CUR', 'GAP 2', 'SIM'], 'the five category labels follow the fixed graph story')
  assert.match(graphMarkup, /GAP 1 · Current − Reference · Material Gap: \+5\.00 THB\/PC/)
  assert.match(graphMarkup, /GAP 2 · Simulation − Current · Material Gap: -3\.00 THB\/PC/)
  assert.doesNotMatch(graphMarkup, /\bSC [+-]\d/, 'gap labels do not use the ambiguous SC +/- notation')
  const firstBarIndex = graphMarkup.indexOf('fill-opacity="0.68"')
  const rulerLineIndex = graphMarkup.indexOf('stroke-dasharray="4 5"')
  assert.ok(firstBarIndex >= 0 && rulerLineIndex > firstBarIndex, 'the visible ruler line is drawn in front of the bars')
  for (const [part, color] of [['MAT', '#4F7CAC'], ['LB', '#D89B45'], ['BD', '#8067B7']]) {
    assert.ok(graphMarkup.includes(`fill="${color}"`), `${part} uses the exact CBD palette color in the graph bars`)
    assert.ok(graphMarkup.includes(`background-color:${color}`), `${part} uses the exact CBD palette color in the legend`)
  }
  assert.match(graphMarkup, /Simulation Cost Structure/)
  assert.match(graphMarkup, /id="simulation-story-svg-title">Simulation Cost Structure<\/title>/)
  assert.match(graphMarkup, /GAP 1 is Current minus Reference; GAP 2 is Simulation minus Current/)
  assert.match(graphMarkup, /Legend filters this graph view only and does not change calculations or Simulation data/)
  assert.match(graphMarkup, />THB\/PC<\/text>/, 'the axis uses the resolved UOM')
  assert.match(graphMarkup, /rotate\(-90 24 155\).*THB\/PC/, 'the dynamic UOM is attached to the Y axis')
  assert.match(graphMarkup, /data-graph-standard-cost="true"[^>]*>[\s\S]*?<title>Standard Cost<\/title>/,
    'the Standard Cost reference uses its concise tooltip')
  assert.match(graphMarkup, /role="slider"[^>]*aria-label="Simulation comparison ruler"[^>]*aria-orientation="vertical"/)
  assert.match(graphMarkup, /aria-valuetext="[^\"]+ THB\/PC"/)
  assert.match(graphSource, /data-ruler-value="true" x=\{plot\.right \+ 7\}/, 'the ruler value sits at the line end without a label')
  assert.match(graphSource, /onKeyDown=\{handleRulerKeyDown\}/, 'the visual ruler remains keyboard operable')
  assert.match(graphSource, /const threshold = span \* 0\.008/, 'ruler snapping keeps its small threshold')
  assert.ok(graphSource.includes('stroke={RULER_COLOR} strokeWidth="1.4"'), 'the ruler line keeps one dark visual state')
  assert.doesNotMatch(graphSource, /rulerFocused|setRulerFocused/, 'ruler focus does not change its color')
  assert.match(graphSource, /onPointerDown=/, 'the visual ruler still responds to pointer start')
  assert.match(graphSource, /onPointerMove=/, 'the visual ruler still responds to pointer movement')
  assert.match(graphSource, /onPointerUp=/, 'the visual ruler still responds to pointer release')
  assert.match(graphSource, /onPointerCancel=/, 'the visual ruler releases pointer capture on cancellation')
  assert.match(graphMarkup, /fill-opacity="0.68"/, 'dataset bar fills use a softened but distinct treatment')
  assert.match(graphMarkup, /Selling Price<\/span>/, 'Selling Price remains a separate graph legend item')
  assert.match(graphMarkup, /aria-pressed="true"/)
  assert.equal([...graphMarkup.matchAll(/aria-pressed="true"/g)].length, 8, 'all eight legend items are on by default')
  const legendMarkup = graphMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
  for (const label of ['Material', 'Labor', 'Burden', 'SG&amp;A', 'Profit +', 'Profit −', 'Selling Price', 'Ruler']) {
    assert.ok(legendMarkup.includes(`aria-label="${label}"`), `the visible Legend uses the full ${label} label`)
  }
  assert.match(graphSource, /text-slate-500/, 'an OFF legend item remains readable while looking disabled')
  assert.doesNotMatch(graphSource, /opacity-40/, 'an OFF legend item is not faded to near-invisibility')
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
  assert.match(scaleCalculation, /stateStacks[\s\S]*gapStacks[\s\S]*visibleLegend\.sellingPrice/,
    'the Y scale follows visible state/gap stacks and only includes visible Selling Price')
  const gap1TotalTag = graphMarkup.match(/<text\b[^>]*data-graph-total="gap1"[^>]*>/)?.[0] ?? ''
  const gap2TotalTag = graphMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.match(gap1TotalTag, /fill="#be123c"/, 'positive cost gap total is unfavorable red')
  assert.match(gap2TotalTag, /fill="#15803d"/, 'negative cost gap total is favorable green')
  assert.ok(graphMarkup.includes('fill="#15803d"'), 'positive Profit uses its green sign color')
  assert.doesNotMatch(graphMarkup, /GAP [12] (?:SG&A|OP|Selling Price) Gap:/,
    'gap bars only contain MAT, LB, and BD')
  assert.ok(graphMarkup.includes('SG&amp;A') && graphText.includes('Operating Profit'), 'dataset bars and legend retain the separate economic values')

  const tooltipReference = cost('tooltip-ref', 60, 20, 10)
  const tooltipCurrent = cost('tooltip-cur', 65, 22, 15)
  const tooltipSim = cost('tooltip-sim', 62, 19, 13)
  const tooltipStory = createScenarioStory(
    financial(tooltipReference, 120, 8), financial(tooltipCurrent, 120, 10), financial(tooltipSim, 120, 10)
  )
  const tooltipMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: tooltipStory, unit: 'KG' }))
  for (const tooltip of [
    'Reference Material: 60.00 THB/KG', 'Reference Labor: 20.00 THB/KG', 'Reference Burden: 10.00 THB/KG',
    'Reference SG&amp;A: 9.60 THB/KG', 'Reference Operating Profit: 20.40 THB/KG',
    'Current Material: 65.00 THB/KG', 'Current Labor: 22.00 THB/KG', 'Current Burden: 15.00 THB/KG',
    'Current SG&amp;A: 12.00 THB/KG', 'Current Operating Profit: 6.00 THB/KG',
    'Simulated Material: 62.00 THB/KG', 'Simulated Labor: 19.00 THB/KG', 'Simulated Burden: 13.00 THB/KG',
    'Simulated SG&amp;A: 12.00 THB/KG', 'Simulated Operating Profit: 14.00 THB/KG',
    'GAP 1 · Current − Reference · Material Gap: +5.00 THB/KG', 'GAP 1 · Current − Reference · Labor Gap: +2.00 THB/KG', 'GAP 1 · Current − Reference · Burden Gap: +5.00 THB/KG',
    'GAP 2 · Simulation − Current · Material Gap: -3.00 THB/KG', 'GAP 2 · Simulation − Current · Labor Gap: -3.00 THB/KG', 'GAP 2 · Simulation − Current · Burden Gap: -2.00 THB/KG',
    'Reference Selling Price: 120.00 THB/KG', 'Current Selling Price: 120.00 THB/KG', 'Simulated Selling Price: 120.00 THB/KG'
  ]) assert.ok(tooltipMarkup.includes(tooltip), `graph tooltip identifies its series and resolved unit: ${tooltip}`)
  assert.match(tooltipMarkup, />THB\/KG<\/text>/, 'the Y axis uses a different product UOM dynamically')

  const zeroGapStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(current, 120, 10))
  const zeroGapMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: zeroGapStory, unit: 'PC' }))
  const zeroGapTotalTag = zeroGapMarkup.match(/<text\b[^>]*data-graph-total="gap2"[^>]*>/)?.[0] ?? ''
  assert.match(zeroGapTotalTag, /fill="#475569"/, 'zero gap totals remain neutral')
  assert.match(zeroGapMarkup, /data-graph-total="gap2"[^>]*><title>Simulation − Current<\/title>0\.00/)

  const negativeOPStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(cost('loss', 90, 0, 0), 80, 10))
  assert.equal(negativeOPStory.simulated.operatingProfitPerPiece, -18, 'negative OP remains a valid story value')
  const negativeOPMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: negativeOPStory, unit: 'PC' }))
  assert.match(negativeOPMarkup, /Simulated Operating Profit: -18\.00 THB\/PC/)
  assert.ok(negativeOPMarkup.includes('fill="#be5673"'), 'negative Profit uses its softer red sign color')

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
  assert.equal(simulation.currentCost.total, simulation.simulationCost.total)
  assert.equal(simulation.parameterSavingPerPiece, 0, 'No-change Parameter Saving is zero')
  const pageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: state.workingSelection,
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {},
    onSendTo() { return true },
    onResetParameters() {},
    onToggleWorkingTarget() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  const pageText = pageMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  assert.match(pageMarkup, /Clone from/)
  assert.match(pageMarkup, /Send to/)
  assert.match(pageMarkup, /Result/)
  assert.match(pageMarkup, /Economic/)
  assert.match(pageMarkup, /Bill of Materials/, 'the BOM table uses its full identity')
  assert.match(pageMarkup, /Routing Process/, 'the RTG table uses its full identity')
  assert.equal([...pageMarkup.matchAll(/<th scope="col"[^>]*>Status<\/th>/g)].length, 2,
    'BOM and RTG each expose Status as a dedicated table column')
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
    onResetParameters() {},
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
      onCloneSource() {}, onSendTo() { return true }, onResetParameters() {}, onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
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
  assert.match(rowHandlerSource, /isInteractiveTarget\(event\.target\)/,
    'editing inputs and nested controls keep their own click behavior')
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
    onCloneSource() {}, onSendTo() { return true }, onResetParameters() {}, onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
  }))
  assert.match(protectedMarkup, /Ambiguous identity · protected/)
  assert.match(protectedMarkup, /aria-label="Bill of Materials: .* activate to expand Parameter Cost Effect"/,
    'the ambiguous row exposes its full-row expansion name')
  assert.match(protectedMarkup, /aria-label="Expand Parameter Cost Effect for A deliberately long stainless steel material description for wrapping" aria-expanded="false"/,
    'the protected row has a real accessible expand button')
  assert.match(pageSource, /aria-expanded=\{expanded\}[\s\S]*?aria-controls=\{expanded \? detailId : undefined\}[\s\S]*?event\.stopPropagation\(\); toggleExpanded\(\)/,
    'the same dedicated button toggles details without bubbling into the row action')
  assert.match(pageSource, /<td aria-hidden="true" \/>[\s\S]*?<th scope="row" colSpan=\{2\}/,
    'the empty number cell precedes the identity-aligned label while effects remain under parameters')
  assert.match(protectedMarkup, /aria-expanded="false"/)
  assert.doesNotMatch(protectedMarkup, /<h4[^>]*>Parameter Cost Effect<\/h4>/,
    'the Parameter Cost Effect detail remains collapsed until requested')
  assert.doesNotMatch(protectedMarkup, /100\.00%/, 'per-parameter attribution shares are not presented')
  assert.doesNotMatch(protectedMarkup, /type="checkbox"|aria-label="Select BOM row/, 'ambiguous rows are not selectable')
  assert.match(pageSource, /const canExpand = true/, 'protected rows can expand even without a status')
  assert.match(pageSource, /Business identity cannot be matched safely/, 'expanded protected rows explain why effect is unavailable')
  assert.match(pageSource, /\{expanded && \(/, 'Parameter Cost Effect appears only after expanding the row')
  assert.match(pageSource, /Parameter Cost Effect/, 'the expandable row contains the effect detail')
  assert.match(pageSource, /analysis\.effects\.totalEffect === null \? '—' : `\$\{displayEffect\(analysis\.effects\.totalEffect\)\} Total`/,
    'unavailable attribution does not fabricate a total amount')
  assert.doesNotMatch(pageSource, /analysis\.effects\.shares\?\./, 'per-factor share percentages are removed from the presentation')

  console.log('Simulation story graph and page contract verification passed')
  }
} finally {
  await vite.close()
}
