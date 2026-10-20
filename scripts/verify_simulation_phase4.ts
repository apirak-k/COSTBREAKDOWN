import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CostSnapshot, MasterDataRole, ScenarioFinancialResult } from '../src/core/types'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import { calculateEconomicSimulation } from '../src/features/simulation/simulation-economics.ts'
import { createScenarioFinancialResult, createScenarioStory } from '../src/core/calculations/scenario-story.ts'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  setSimulationActiveDataset,
  setSimulationComparison,
  setSimulationEconomicInput
} from '../src/features/simulation/simulation-state.ts'

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

function snapshot(role: MasterDataRole, materialPrice: number, laborRate: number): CostSnapshot {
  return {
    id: `phase4-${role}`,
    product: {
      productCode: 'PHASE4-1',
      productDescription: 'Phase 4 verifier',
      uom: 'PC',
      customer: '',
      effectiveDate: '',
      sellingPrice: 100 + materialPrice,
      sgaPercent: 10
    },
    effectiveDate: '',
    sourceRef: role,
    status: 'active',
    rates: [{
      id: `rate-${role}`,
      workCenterCode: 'WC-1',
      description: role,
      laborRate,
      burdenRate: laborRate / 2,
      effectiveDate: '',
      confidence: {}
    }],
    bom: [{
      id: `bom-${role}`,
      itemCode: 'MAT-1',
      description: 'Shared material',
      consumption: 1,
      unit: 'PC',
      price: materialPrice,
      loss: 0,
      confidence: {}
    }],
    routing: [{
      id: `routing-${role}`,
      processName: 'Shared process',
      workCenterId: 'WC-1',
      manning: 1,
      capacity: 1,
      yield: 1,
      confidence: {}
    }]
  }
}

const sources: Record<MasterDataRole, CostSnapshot> = {
  reference: snapshot('reference', 10, 10),
  current: snapshot('current', 20, 20),
  custom: snapshot('custom', 30, 30)
}
const view = (state: ReturnType<typeof createEmptySimulationState>, role: MasterDataRole) =>
  getEffectiveSimulationDataset(sources, state, role)
const close = (actual: number | null | undefined, expected: number, message: string) =>
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, received ${String(actual)}`)

const freshState = createEmptySimulationState(sources)
assert.deepEqual([freshState.activeDataset, freshState.comparisonBefore, freshState.comparisonAfter], ['custom', 'current', 'custom'],
  'fresh Simulation uses Custom and Current → Custom')
let state = setSimulationActiveDataset(freshState, 'current')
state = setSimulationEconomicInput(state, 'sellingPriceOverride', '777', 'custom')
state = setSimulationEconomicInput(state, 'sellingPriceOverride', '555', 'current')
state = updateSimulationParameter(state, sources, 'bom-custom', 'bom.price', 35, 'custom')
state = setSimulationComparison(state, 'reference', 'custom')

const { SimulationStoryGraph } = await import('../src/features/simulation/SimulationStoryGraph.tsx')
const graphFinancial = (role: MasterDataRole): ScenarioFinancialResult => {
  const dataset = view(state, role)
  const cost = calculateParameterSimulation(dataset.snapshot, dataset.snapshot).afterCost
  const economics = calculateEconomicSimulation(dataset.snapshot, cost, null, dataset.economicInputs)
  return createScenarioFinancialResult(cost, economics.business)
}
const referenceFinancial = graphFinancial('reference')
const currentFinancial = graphFinancial('current')
const customFinancial = graphFinancial('custom')
const story = createScenarioStory(referenceFinancial, currentFinancial, customFinancial)
const graphMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
  story,
  unit: 'PC',
  activeRole: state.activeDataset,
  onSelectActiveDataset() {}
}))
const graphSvg = graphMarkup.match(/<svg\b[\s\S]*?<\/svg>/)?.[0] ?? ''
assert.ok(graphSvg, 'Simulation graph renders an SVG story')

const graphRoleButtons = [...graphSvg.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .filter(([, attributes]) => attributes.includes('Select ') && attributes.includes('as active dataset'))
assert.deepEqual(graphRoleButtons.map(([, attributes, label]) => ({
  label: label.replace(/<[^>]*>/g, '').trim(),
  selected: attributes.includes('aria-pressed="true"')
})), [
  { label: 'Reference', selected: false },
  { label: 'Current', selected: true },
  { label: 'Custom', selected: false }
], 'graph role labels are semantic active-dataset controls with only activeDataset selected')
assert.ok(graphRoleButtons.every(([, attributes]) => attributes.includes('type="button"') && attributes.includes('focus-visible:outline')),
  'graph dataset controls are buttons with visible keyboard focus styling')
const activeGraphButton = graphRoleButtons.find(([, attributes]) => attributes.includes('aria-pressed="true"'))
assert.ok(activeGraphButton, 'exactly one active graph role is selected')
assert.ok(activeGraphButton[2].includes('after:bg-slate-950') && activeGraphButton[2].includes('after:h-0.5'),
  'active graph role uses the dark 2px underline cue')
assert.doesNotMatch(activeGraphButton[2], /after:bg-blue-/,
  'active graph underline is not blue')
assert.doesNotMatch(activeGraphButton?.[1] ?? '', /border-blue|bg-blue|shadow/,
  'active graph role has no persistent selected box, fill, or shadow')
assert.ok(graphRoleButtons.filter(([, attributes]) => !attributes.includes('aria-pressed="true"'))
  .every(([, attributes, content]) => attributes.includes('hover:bg-slate-50') && content.includes('after:bg-transparent')),
  'inactive graph roles remain readable and interactive without an underline')

const graphOrder = [
  'aria-label="Select Reference as active dataset"',
  '>GAP 1</text>',
  'aria-label="Select Current as active dataset"',
  '>GAP 2</text>',
  'aria-label="Select Custom as active dataset"'
].map(label => graphSvg.indexOf(label))
assert.ok(graphOrder.every(index => index >= 0), 'graph renders all three fixed role labels and both gap labels')
assert.deepEqual(graphOrder, [...graphOrder].sort((left, right) => left - right),
  'graph order is Reference, GAP 1, Current, GAP 2, Custom')
assert.match(graphSvg, /aria-label="Current − Reference"/, 'GAP 1 is labeled Current minus Reference')
assert.match(graphSvg, /aria-label="Custom − Current"/, 'GAP 2 is labeled Custom minus Current')

const standardCostLabel = (role: MasterDataRole) => {
  const match = graphSvg.match(new RegExp(`data-graph-standard-cost-value="${role}"[^>]*>([^<]+)<\\/text>`))
  return match?.[1] ?? ''
}
close(Number(standardCostLabel('reference')), 25, 'graph uses Reference BOM data and Reference Work Center rates')
close(Number(standardCostLabel('current')), 50, 'graph uses Current BOM data and Current Work Center rates')
close(Number(standardCostLabel('custom')), 80, 'graph uses effective Custom override and Custom Work Center rates')
assert.notEqual(Number(standardCostLabel('reference')), 10 + 20 + 10,
  'Reference graph value does not borrow Current Work Center rates')
assert.notEqual(Number(standardCostLabel('custom')), 35 + 20 + 10,
  'Custom graph value does not borrow Current Work Center rates')
const graphGap = (gap: 'gap1' | 'gap2') => {
  const match = graphSvg.match(new RegExp(`data-graph-total="${gap}"[^>]*>([^<]+)<\\/text>`))
  return match?.[1] ?? ''
}
assert.equal(graphGap('gap1'), '+25.00', 'GAP 1 remains Current minus Reference')
assert.equal(graphGap('gap2'), '+30.00', 'GAP 2 remains Custom minus Current')
assert.match(graphSvg, /aria-label="Current Selling Price: 555\.00 THB\/PC"/,
  'the Current graph state uses the Current role-local Business draft')
assert.match(graphSvg, /aria-label="Custom Selling Price: 777\.00 THB\/PC"/,
  'the Custom graph state uses the Custom role-local Business draft')

const { SimulationPage, filterSimulationTableRows, getSimulationTablePage } = await import('../src/features/simulation/SimulationPage.tsx')
const pageFixture = Array.from({ length: 9 }, (_, index) => ({ row: { name: `Material ${index + 1}` }, index }))
assert.deepEqual(filterSimulationTableRows(pageFixture, '  mAtErIaL 3 '), [pageFixture[2]],
  'Simulation table search trims and matches names case-insensitively')
assert.deepEqual(filterSimulationTableRows(pageFixture, ''), pageFixture,
  'an empty Simulation table search preserves source order')
const secondTablePage = getSimulationTablePage(pageFixture, 1)
assert.deepEqual(secondTablePage.rows.map(({ index }) => index), [4, 5, 6, 7],
  'Simulation table pages expose four rows in stable order')
assert.deepEqual([secondTablePage.start, secondTablePage.end, secondTablePage.total], [5, 8, 9],
  'Simulation table range text reflects the current page and total matches')
const lastTablePage = getSimulationTablePage(pageFixture, 99)
assert.deepEqual(lastTablePage.rows.map(({ index }) => index), [8],
  'Simulation table navigation clamps to the last partial page')
assert.deepEqual(getSimulationTablePage([], 3), { rows: [], pageIndex: 0, total: 0, start: 0, end: 0 },
  'empty Simulation table pages report a safe zero range')
const renderPage = (
  workspace: typeof state,
  beforeRole: MasterDataRole,
  afterRole: MasterDataRole
) => {
  const active = view(workspace, workspace.activeDataset)
  const analysisBeforeDataset = view(workspace, beforeRole)
  const analysisAfterDataset = view(workspace, afterRole)
  const effectiveDatasets = Object.fromEntries(roles.map(role => [role, view(workspace, role)])) as Record<MasterDataRole, ReturnType<typeof view>>
  return renderToStaticMarkup(React.createElement(SimulationPage, {
    state: active,
    workingSelection: active.workingSelection,
    analysisBeforeDataset,
    analysisAfterDataset,
    effectiveDatasets,
    onSelectActiveDataset() {},
    onChangeComparison() {},
    onSend() {},
    onSendAll() {},
    onReset() {},
    onResetAll() {},
    onUpdateParameter() {},
    onToggleWorkingTarget() {},
    onSetWorkingSelection() {},
    onUpdateEconomicInput() {},
    onBeginEdit() {},
    onCommitEdit() {}
  }))
}
const resultPanel = (markup: string) =>
  markup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
const resultRow = (panel: string, label: string) =>
  [...panel.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map(match => match[0]).find(row =>
    row.includes(`>${label}</th>`)
  ) ?? ''
const resultValues = (row: string) => [...row.matchAll(/<td class="([^"]*)">([^<]*)<\/td>/g)]
  .map(match => ({ className: match[1], text: match[2] }))
const resultHeaders = (panel: string) =>
  [...panel.matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)]
    .map(([, text]) => text.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]*>/g, '').trim()).filter(Boolean)
const inputFor = (markup: string, label: string) => [...markup.matchAll(/<input\b[^>]*>/g)]
  .map(match => match[0]).find(input => input.includes(`aria-label="${label}"`)) ?? ''

const pairPage = renderPage(state, 'reference', 'custom')
const graphPanelIndex = pairPage.indexOf('<figure aria-labelledby="simulation-story-title"')
const resultColumnIndex = pairPage.indexOf('data-simulation-layout-column="result-and-break-even"')
const breakEvenPanelIndex = pairPage.indexOf('id="break-even-graph-title"')
const businessEconomicPanelIndex = pairPage.indexOf('data-simulation-layout-column="inputs"')
assert.ok(graphPanelIndex >= 0 && graphPanelIndex < resultColumnIndex && resultColumnIndex < breakEvenPanelIndex && breakEvenPanelIndex < businessEconomicPanelIndex,
  'desktop source order is Graph, Result plus Break-even, then far-right Business/Economic')
const pairResult = resultPanel(pairPage)
assert.ok(pairResult, 'Simulation Result panel renders')
const resultHeader = pairResult.match(/<header data-simulation-result-header="true"[\s\S]*?<\/header>/)?.[0] ?? ''
assert.ok(resultHeader, 'comparison selectors and actions share one header container')
assert.doesNotMatch(resultHeader, /<h2[^>]*>Result<\/h2>/, 'Result title is absent from the visible toolbar')
assert.match(pairResult, /aria-labelledby="simulation-result-title"/, 'Result section retains its accessible identity')
assert.match(pairResult, /<h2 id="simulation-result-title" class="sr-only">Result<\/h2>/,
  'Result retains a screen-reader-only heading')
assert.match(resultHeader, /xl:flex-nowrap/, 'Result header is structurally one row at desktop widths')
assert.match(resultHeader, /aria-label="Result comparison, Before Reference, After Custom"/,
  'Before/After selectors remain a grouped comparison in the shared header')
assert.equal((pairResult.match(/Result comparison/g) ?? []).length, 1,
  'Result has no separate comparison row below its header')
assert.doesNotMatch(pairPage, /Edit dataset|Send to active dataset|Send to Current|Send to Custom/,
  'final Simulation UI has no separate Edit dataset or arbitrary Send destination')
assert.deepEqual(
  resultHeaders(pairResult),
  ['Cost / Unit', 'Before', 'After', 'Change', '%'],
  'Result uses one compact Cost / Unit | Before | After | Change | % header row')
assert.deepEqual(
  [...resultHeader.matchAll(/<button\b([^>]*)>/g)].map(([, attributes]) => attributes.match(/aria-label="([^"]+)"/)?.[1]).filter(Boolean).sort(),
  ['After dataset, Custom', 'Before dataset, Reference', 'Reset', 'Send to Master Data'],
  'Result exposes independent selectors and the final Send/Reset accessible names'
)
assert.equal((resultHeader.match(/aria-haspopup="menu"/g) ?? []).length, 2,
  'only the two role selectors expose dropdown triggers in the Result header')
assert.doesNotMatch(resultHeader, /More (?:Send|Reset) actions/,
  'Send and Reset have no permanent split-button trigger')
assert.match(resultHeader, /Send all datasets/)
assert.match(resultHeader, /Reset all/)
assert.doesNotMatch(resultHeader, /Reset all datasets/)
const roleTriggers = [...resultHeader.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .filter(([, attributes]) => /aria-label="(?:Before|After) dataset, /.test(attributes))
assert.equal(roleTriggers.length, 2, 'Result renders independent Before and After selectors')
for (const [attributes, markup] of roleTriggers.map(([, attributes, markup]) => [attributes, markup])) {
  assert.match(attributes, /h-8 w-\[96px\].*border-slate-300.*bg-white/,
    'Before/After selector uses an equal 96×32 boxed field')
  assert.match(attributes, /focus-visible:outline/, 'Before/After selector has visible keyboard focus')
  assert.match(attributes, /whitespace-nowrap/, 'selector role text cannot wrap or truncate')
  assert.doesNotMatch(markup, /truncate/, 'selector role text has no ellipsis styling')
  assert.doesNotMatch(markup, /Before|After/, 'selector trigger content is a single selected role label')
  assert.match(markup.replace(/<[^>]*>/g, '').trim(), /^(Reference|Current|Custom)$/,
    'selector trigger shows the full selected role name')
}
assert.deepEqual(resultValues(resultRow(pairResult, 'Standard Cost')).map(cell => cell.text),
  ['25.00', '80.00', '+55.00', '+220.00%'],
  'Result uses effective Reference and Custom role costs with After minus Before direction')
assert.deepEqual(resultValues(resultRow(pairResult, 'Selling Price')).map(cell => cell.text),
  ['110.00', '777.00', '+667.00', '+606.36%'],
  'Result business values use the selected After role economic draft')
assert.match(inputFor(pairPage, 'Selling Price'), /value="777\.00"/,
  'Business inputs display the Custom draft while Custom is the After role')
assert.match(pairPage, /aria-label="Select Current as active dataset"[^>]*aria-pressed="true"/,
  'active Current remains visually selected while Result is Reference to Custom')
const activeBomTable = pairPage.match(/<section data-simulation-table="bom"[\s\S]*?<\/section>/)?.[0] ?? ''
assert.ok(activeBomTable, 'the active role BOM table renders')
const activeRoutingTable = pairPage.match(/<section data-simulation-table="routing"[\s\S]*?<\/section>/)?.[0] ?? ''
assert.ok(activeRoutingTable, 'the active role Routing table renders')
for (const [table, footerKind, searchName, shortName] of [
  [activeBomTable, 'bom', 'Search BOM by Material', 'BOM'],
  [activeRoutingTable, 'routing', 'Search RTG by Process', 'RTG']
] as const) {
  const footer = table.match(/<footer data-simulation-table-footer="[^"]+"[\s\S]*?<\/footer>/)?.[0] ?? ''
  assert.ok(footer, `${shortName} has its own compact table footer`)
  assert.match(footer, new RegExp(`data-simulation-table-footer="${footerKind}"`), `${shortName} footer is independently identified`)
  assert.match(footer, new RegExp(`aria-label="${searchName}"`), `${shortName} footer exposes its own search control`)
  assert.match(footer, /1–1 of 1/, `${shortName} footer shows the current page range`)
  const footerButtons = [...footer.matchAll(/<button\b([^>]*)>/g)].map(([, attributes]) => attributes)
  assert.ok(footerButtons.some(attributes => attributes.includes(`aria-label="Previous ${shortName} rows"`) && /\bdisabled(?:="")?/.test(attributes)),
    `${shortName} previous control is disabled on its first page`)
  assert.ok(footerButtons.some(attributes => attributes.includes(`aria-label="Next ${shortName} rows"`) && /\bdisabled(?:="")?/.test(attributes)),
    `${shortName} next control is disabled on its last page`)
}
assert.match(inputFor(activeBomTable, 'Shared material Price in Current'), /value="20\.00"/,
  'parameter editing remains scoped to active Current while Result uses Reference and Custom')
assert.match(activeBomTable, /UNCHANGED/, 'active Current row status uses the active role baseline')

const graphSummary = (markup: string) => {
  const svg = markup.match(/<svg\b[\s\S]*?<\/svg>/)?.[0] ?? ''
  return [
    ...roles.map(role => svg.match(new RegExp(`data-graph-standard-cost-value="${role}"[^>]*>([^<]+)<\\/text>`))?.[1] ?? ''),
    ...(['gap1', 'gap2'] as const).map(gap => svg.match(new RegExp(`data-graph-total="${gap}"[^>]*>([^<]+)<\\/text>`))?.[1] ?? '')
  ]
}
const switchedPairPage = renderPage(state, 'custom', 'reference')
assert.deepEqual(graphSummary(switchedPairPage), graphSummary(pairPage),
  'changing Result comparison does not change the fixed graph story or GAP values')
const selfPairPage = renderPage(state, 'custom', 'custom')
assert.deepEqual(resultValues(resultRow(resultPanel(selfPairPage), 'Standard Cost')).map(cell => cell.text),
  ['80.00', '80.00', '0.00', '0.00%'], 'Custom to Custom Result remains valid with zero cost change')
assert.deepEqual(graphSummary(selfPairPage), graphSummary(pairPage),
  'a Result self-pair does not collapse or change the fixed graph story')
assert.match(inputFor(renderPage(state, 'reference', 'current'), 'Selling Price'), /value="555\.00"/,
  'Business inputs switch to Current draft when Current becomes the After role')

const roleName: Record<MasterDataRole, string> = { reference: 'Reference', current: 'Current', custom: 'Custom' }
const expectedCost: Record<MasterDataRole, number> = { reference: 25, current: 50, custom: 80 }
const money = (value: number) => value.toFixed(2)
const signedMoney = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
for (const before of roles) {
  for (const after of roles) {
    const selectedPair = setSimulationComparison(state, before, after)
    assert.deepEqual([selectedPair.comparisonBefore, selectedPair.comparisonAfter], [before, after],
      `${before} → ${after} is a valid Result pair`)
    assert.equal(selectedPair.activeDataset, 'current', `selecting ${before} → ${after} leaves activeDataset unchanged`)
    const markup = renderPage(selectedPair, before, after)
    const panel = resultPanel(markup)
    assert.deepEqual(resultHeaders(panel), ['Cost / Unit', 'Before', 'After', 'Change', '%'],
      `Result keeps compact visible column labels for ${before} → ${after}`)
    assert.match(panel, new RegExp(`aria-label="Before dataset, ${roleName[before]}"`),
      `Before selector can display ${before}`)
    assert.match(panel, new RegExp(`aria-label="After dataset, ${roleName[after]}"`),
      `After selector can display ${after}`)
    assert.match(markup, /aria-label="Select Current as active dataset"[^>]*aria-pressed="true"/,
      `changing ${before} → ${after} does not change active Current`)
    assert.match(inputFor(markup.match(/<section data-simulation-table="bom"[\s\S]*?<\/section>/)?.[0] ?? '', 'Shared material Price in Current'), /value="20\.00"/,
      `changing ${before} → ${after} leaves parameter editing on Current`)
    const beforeTotal = expectedCost[before]
    const afterTotal = expectedCost[after]
    const delta = afterTotal - beforeTotal
    const percent = beforeTotal === 0 ? '—' : `${signedMoney(delta / beforeTotal * 100)}%`
    assert.deepEqual(resultValues(resultRow(panel, 'Standard Cost')).map(cell => cell.text), [
      money(beforeTotal), money(afterTotal), signedMoney(delta), percent
    ], `Result displays effective ${before} and ${after} costs with After minus Before direction`)
    assert.deepEqual(graphSummary(markup), graphSummary(pairPage),
      `Result ${before} → ${after} leaves the graph's three role datasets and two gaps fixed`)
    assert.match(inputFor(markup, 'Selling Price'), new RegExp(`value="${after === 'custom' ? '777' : after === 'current' ? '555' : '110'}\\.00"`),
      `Business/Economic restores ${after} draft when it is the After role`)
  }
}

for (const activeRole of roles) {
  const activeState = setSimulationActiveDataset(state, activeRole)
  assert.equal(activeState.activeDataset, activeRole, `graph selection can set activeDataset to ${activeRole}`)
  assert.deepEqual([activeState.comparisonBefore, activeState.comparisonAfter], ['reference', 'custom'],
    `selecting ${activeRole} does not move Result comparison`)
  const markup = renderPage(activeState, 'reference', 'custom')
  const table = markup.match(/<section data-simulation-table="bom"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.match(markup, new RegExp(`aria-label="Select ${roleName[activeRole]} as active dataset"[^>]*aria-pressed="true"`),
    `${activeRole} graph label has the active visual state`)
  assert.match(inputFor(table, `Shared material Price in ${roleName[activeRole]}`),
    new RegExp(`value="${activeRole === 'reference' ? '10' : activeRole === 'current' ? '20' : '35'}\\.00"`),
    `active ${activeRole} owns the parameter table values`)
  assert.deepEqual(resultHeaders(resultPanel(markup)),
    ['Cost / Unit', 'Before', 'After', 'Change', '%'],
    `choosing active ${activeRole} leaves the Result pair unchanged`)
  assert.deepEqual(graphSummary(markup), graphSummary(pairPage),
    `choosing active ${activeRole} does not change the fixed graph story`)
  assert.match(inputFor(markup, 'Selling Price'), /value="777\.00"/,
    `choosing active ${activeRole} leaves Custom's After-role economics unchanged`)
}

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
const parameterTableSource = pageSource.slice(pageSource.indexOf('function SimulationParameterTable('), pageSource.indexOf('function ResultPanel('))
const graphSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationStoryGraph.tsx'), 'utf8')
const sharedSelectorSource = readFileSync(resolve(process.cwd(), 'src/shared/ui/ComparisonRoleSelector.tsx'), 'utf8')
const cbdPageSource = readFileSync(resolve(process.cwd(), 'src/features/cost-breakdown/CostBreakdownPage.tsx'), 'utf8')
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(graphSource, /onClick=\{\(\) => onSelectActiveDataset\(category\.role\)\}/,
  '[source contract] graph role controls select activeDataset')
assert.match(pageSource, /onChange=\{role => onChangeComparison\(role, afterRole\)\}[\s\S]*?onChange=\{role => onChangeComparison\(beforeRole, role\)\}/,
  '[source contract] Before and After selectors update only their own comparison side')
const upperWorkspaceStart = pageSource.indexOf('xl:grid-cols-[minmax(0,2.82fr)_minmax(0,1.63fr)_minmax(max-content,.85fr)]')
const upperWorkspaceEnd = pageSource.indexOf('<div className="grid min-w-0 gap-2 xl:flex-none xl:grid-cols-2', upperWorkspaceStart)
const upperWorkspaceSource = upperWorkspaceStart >= 0 && upperWorkspaceEnd > upperWorkspaceStart
  ? pageSource.slice(upperWorkspaceStart, upperWorkspaceEnd)
  : ''
assert.ok(upperWorkspaceSource, '[source contract] desktop upper workspace source is present')
assert.match(upperWorkspaceSource, /xl:grid-cols-\[minmax\(0,2\.82fr\)_minmax\(0,1\.63fr\)_minmax\(max-content,\.85fr\)\]/,
  '[source contract] direct desktop columns allocate about 53% Graph, 31% Result/Break-even, and a content-sized supporting Business/Economic column')
assert.ok(2.82 / 5.3 >= 0.52 && 2.82 / 5.3 <= 0.55)
assert.ok(1.63 / 5.3 >= 0.30 && 1.63 / 5.3 <= 0.32)
assert.ok(.85 / 5.3 >= 0.15 && .85 / 5.3 <= 0.17)
const resultColumnSource = upperWorkspaceSource.match(/<div data-simulation-layout-column="result-and-break-even"[\s\S]*?<EconomicSimulationPanel/)?.[0] ?? ''
assert.match(resultColumnSource, /<ResultPanel[\s\S]*?<EconomicBreakEvenGraphPanel[\s\S]*?<\/div>\s*<EconomicSimulationPanel/,
  '[source contract] Result sits above Break-even in the middle column before far-right Business/Economic')
assert.match(resultColumnSource, /xl:grid-rows-\[minmax\(0,1\.4fr\)_minmax\(0,1fr\)\]/,
  '[source contract] Result takes about 58% of the middle column height and Break-even 42%')
assert.match(pageSource, /label="Send"[\s\S]*?secondaryLabel="Send all datasets"[\s\S]*?onPrimary=\{onSend\}[\s\S]*?onSecondary=\{onSendAll\}/,
  '[source contract] Send main and secondary actions use the active-role and all-role callbacks')
assert.match(pageSource, /label="Reset"[\s\S]*?secondaryLabel="Reset all"[\s\S]*?onPrimary=\{onReset\}[\s\S]*?onSecondary=\{onResetAll\}/,
  '[source contract] Reset main and secondary actions use active-role and all-role callbacks')
assert.match(pageSource, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/)
assert.match(cbdPageSource, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/,
  '[source contract] CBD and Simulation import the same shared selector')
assert.ok(sharedSelectorSource.includes('<Tooltip label={side}>'), '[source contract] selector tooltip text is exactly Before or After')
assert.ok(sharedSelectorSource.includes('aria-label={`${side} dataset, ${COMPARISON_ROLE_LABELS[role]}`}'),
  '[source contract] selector accessible name includes its side and selected role')
assert.doesNotMatch(pageSource, /function ComparisonRoleSelector\(/, '[source contract] Simulation has no duplicate selector implementation')
assert.match(sharedSelectorSource, /COMPARISON_ROLES\.filter\(option => option !== role\)/,
  '[source contract] each selector omits only its own currently selected role')
assert.match(sharedSelectorSource, /w-max max-w-\[calc\(100vw-1rem\)\]/,
  '[source contract] role menus size intrinsically and keep a viewport maximum')
assert.match(sharedSelectorSource, /h-8 w-\[96px\]/,
  '[source contract] all roles use a stable 96×32 trigger')
assert.match(sharedSelectorSource, /panel\.style\.minWidth = `\$\{triggerBounds\.width\}px`/,
  '[source contract] popup minimum equals the trigger width while w-max permits content growth')
assert.match(sharedSelectorSource, /\{availableRoles\.map\([\s\S]*?role="menuitem"/,
  '[source contract] the dropdown contains the other two selectable roles without a selected duplicate')
assert.match(sharedSelectorSource, /focusOption\(event\.key === 'ArrowUp' \? availableRoles\.length - 1 : 0\)/,
  '[source contract] trigger ArrowUp enters at the last visible option and ArrowDown at the first')
assert.match(sharedSelectorSource, /\(activeIndex \+ 1\) % availableRoles\.length[\s\S]*?\(activeIndex - 1 \+ availableRoles\.length\) % availableRoles\.length[\s\S]*?event\.key === 'Home' \? 0 : event\.key === 'End' \? availableRoles\.length - 1/,
  '[source contract] Arrow, Home, and End navigation use the filtered visible option list')
assert.doesNotMatch(sharedSelectorSource, /COMPARISON_ROLES\.length/, 'filtered keyboard indexes do not use the unfiltered role count')
assert.match(pageSource, /const tooltipLabel = label === 'Send' \? 'Send to Master Data' : label/,
  '[source contract] only Send receives the final tooltip wording')
assert.match(pageSource, /function CompactActionControl[\s\S]*?<Tooltip label=\{tooltipLabel\}>[\s\S]*?aria-label=\{tooltipLabel\}/,
  '[source contract] Send tooltip and primary accessible name are Send to Master Data; Reset remains Reset')
assert.match(pageSource, /function CompactActionControl[\s\S]*?onClick=\{\(\) => \{ close\(\); onPrimary\(\) \}\}/,
  '[source contract] Send/Reset primary click remains immediate')
assert.match(pageSource, /function CompactActionControl[\s\S]*?hidden=\{!open\}[\s\S]*?\{secondaryLabel\}/,
  '[source contract] all-dataset actions remain in the same compact secondary-action control')
assert.match(pageSource, /const financialFor = \(role: MasterDataRole\)[\s\S]*?effectiveDatasets\[role\][\s\S]*?calculateParameterSimulation\(dataset\.snapshot, dataset\.snapshot\)/,
  '[source contract] graph story calculates each effective role dataset independently')
assert.match(pageSource, /calculateParameterSimulation\(state\.baselineSnapshot, simulationSnapshot\)[\s\S]*?baselineSnapshot=\{state\.baselineSnapshot\}/,
  '[source contract] BOM and RTG parameter rows/effects use the active role baseline')
assert.match(parameterTableSource, /const filteredRows = filterSimulationTableRows\(tableRows, searchQuery\)/,
  '[source contract] each independent BOM/RTG search filters its own rows')
assert.match(parameterTableSource, /const page = getSimulationTablePage\(orderedRows, pageIndex\)[\s\S]*?const visibleRows = page\.rows/,
  '[source contract] each table renders only the current four-row page')
assert.match(parameterTableSource, /const selectableTargets = filteredRows\.flatMap/,
  '[source contract] header selection covers every eligible match across all search-result pages')
assert.match(parameterTableSource, /setPageIndex\(0\)[\s\S]*?aria-label=\{`Search \$\{searchField\}`\}[\s\S]*?aria-label=\{`Clear \$\{searchField\} search`\}/,
  '[source contract] search edits and clear actions return the table to its first page')
assert.match(parameterTableSource, /data-simulation-table-body="true"[^>]*xl:h-40[^>]*xl:overflow-y-auto/,
  '[source contract] desktop BOM/Routing table bodies retain the compact four-row viewport')
assert.match(parameterTableSource, /\{visibleRows\.map\(\(\{ row, sourceIndex \}\)/,
  '[source contract] the current page preserves stable source row numbers')
assert.doesNotMatch(pageSource, /rows\.filter\(row => row\.kind === kind\s*&&\s*row\.status/,
  '[source contract] the viewport does not filter rows to CHANGED-only')
assert.match(appSource, /const snapshots = prepareSimulationSendAll\(current, masterDataSnapshots\)[\s\S]*?return sendSimulationSnapshotsToMasterData\(snapshots\)/,
  '[source contract] Send all datasets uses the existing atomic store operation')
assert.match(appSource, /const next = resetAllSimulationParameters\(current, masterDataSnapshots\)/,
  '[source contract] Reset all uses the existing role-local reset primitive')
assert.match(appSource, /const role = current\.activeDataset[\s\S]*?resetSimulationParameters\(current, sources\)/,
  '[source contract] Reset main action remains scoped to activeDataset')
assert.match(appSource, /const activeDataset = current\.activeDataset[\s\S]*?prepareSimulationSend\(current, masterDataSnapshots\)[\s\S]*?sendSimulationSnapshotToMasterData\(activeDataset, payload\.snapshot\)/,
  '[source contract] Send main action maps activeDataset to its same-role Master Working target')

console.log('PASS: Phase 4 fixed graph, role-local rates, independent selectors, all nine Result pairs, and After-role economics')
