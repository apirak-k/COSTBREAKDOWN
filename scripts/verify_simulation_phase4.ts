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

let state = setSimulationActiveDataset(createEmptySimulationState(sources), 'current')
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

const graphRoleButtons = [...graphSvg.matchAll(/<button\b([^>]*)>([^<]+)<\/button>/g)]
  .filter(([, attributes]) => attributes.includes('Select ') && attributes.includes('as active dataset'))
assert.deepEqual(graphRoleButtons.map(([, attributes, label]) => ({
  label,
  selected: attributes.includes('aria-pressed="true"')
})), [
  { label: 'Reference', selected: false },
  { label: 'Current', selected: true },
  { label: 'Custom', selected: false }
], 'graph role labels are semantic active-dataset controls with only activeDataset selected')
assert.ok(graphRoleButtons.every(([, attributes]) => attributes.includes('type="button"') && attributes.includes('focus-visible:outline')),
  'graph dataset controls are buttons with visible keyboard focus styling')

const graphOrder = [
  '>Reference</button>',
  '>GAP 1</text>',
  '>Current</button>',
  '>GAP 2</text>',
  '>Custom</button>'
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

const { SimulationPage } = await import('../src/features/simulation/SimulationPage.tsx')
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
    .map(([, text]) => text.replace(/<[^>]*>/g, '').trim()).filter(Boolean)
const inputFor = (markup: string, label: string) => [...markup.matchAll(/<input\b[^>]*>/g)]
  .map(match => match[0]).find(input => input.includes(`aria-label="${label}"`)) ?? ''

const pairPage = renderPage(state, 'reference', 'custom')
const pairResult = resultPanel(pairPage)
assert.ok(pairResult, 'Simulation Result panel renders')
assert.doesNotMatch(pairPage, /Edit dataset|Send to active dataset|Send to Current|Send to Custom/,
  'final Simulation UI has no separate Edit dataset or arbitrary Send destination')
assert.deepEqual(
  resultHeaders(pairResult),
  ['Cost or business outcome', 'Reference', 'Custom', 'Change', '%'],
  'Result headers name the actual selected roles')
assert.deepEqual(
  [...pairResult.matchAll(/<button\b([^>]*)>/g)].map(([, attributes]) => attributes.match(/aria-label="([^"]+)"/)?.[1]).filter(Boolean).sort(),
  ['After dataset, Custom', 'Before dataset, Reference', 'More Reset actions', 'More Send actions', 'Reset', 'Send'],
  'Result exposes independent Before/After selectors and the exact Send/Reset main actions'
)
assert.match(pairResult, /aria-haspopup="menu" aria-expanded="false"/,
  'Result selectors and secondary action controls expose closed menu state')
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
    assert.deepEqual(resultHeaders(panel), ['Cost or business outcome', roleName[before], roleName[after], 'Change', '%'],
      `Result UI labels the ${before} → ${after} pair with its actual role names`)
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
    ['Cost or business outcome', 'Reference', 'Custom', 'Change', '%'],
    `choosing active ${activeRole} leaves the Result pair unchanged`)
  assert.deepEqual(graphSummary(markup), graphSummary(pairPage),
    `choosing active ${activeRole} does not change the fixed graph story`)
  assert.match(inputFor(markup, 'Selling Price'), /value="777\.00"/,
    `choosing active ${activeRole} leaves Custom's After-role economics unchanged`)
}

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
const graphSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationStoryGraph.tsx'), 'utf8')
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(graphSource, /onClick=\{\(\) => onSelectActiveDataset\(category\.role\)\}/,
  '[source contract] graph role controls select activeDataset')
assert.match(pageSource, /onChange=\{role => onChangeComparison\(role, afterRole\)\}[\s\S]*?onChange=\{role => onChangeComparison\(beforeRole, role\)\}/,
  '[source contract] Before and After selectors update only their own comparison side')
assert.match(pageSource, /label="Send"[\s\S]*?secondaryLabel="Send all datasets"[\s\S]*?onPrimary=\{onSend\}[\s\S]*?onSecondary=\{onSendAll\}/,
  '[source contract] Send main and secondary actions use the active-role and all-role callbacks')
assert.match(pageSource, /label="Reset"[\s\S]*?secondaryLabel="Reset all datasets"[\s\S]*?onPrimary=\{onReset\}[\s\S]*?onSecondary=\{onResetAll\}/,
  '[source contract] Reset main and secondary actions use active-role and all-role callbacks')
assert.match(pageSource, /function SplitActionControl[\s\S]*?<Tooltip label=\{label\}>[\s\S]*?aria-label=\{label\}/,
  '[source contract] main action tooltip and accessible name use the exact Send or Reset label')
assert.match(pageSource, /const financialFor = \(role: MasterDataRole\)[\s\S]*?effectiveDatasets\[role\][\s\S]*?calculateParameterSimulation\(dataset\.snapshot, dataset\.snapshot\)/,
  '[source contract] graph story calculates each effective role dataset independently')
assert.match(pageSource, /calculateParameterSimulation\(state\.baselineSnapshot, simulationSnapshot\)[\s\S]*?baselineSnapshot=\{state\.baselineSnapshot\}/,
  '[source contract] BOM and RTG parameter rows/effects use the active role baseline')
assert.match(pageSource, /ROLES\.map\(\(\{ role: optionRole, label: optionLabel \}[\s\S]*?onChange\(optionRole\)/,
  '[source contract] both Result selectors offer each of the three Master Data roles')
assert.match(appSource, /const snapshots = prepareSimulationSendAll\(current, masterDataSnapshots\)[\s\S]*?return sendSimulationSnapshotsToMasterData\(snapshots\)/,
  '[source contract] Send all datasets uses the existing atomic store operation')
assert.match(appSource, /const next = resetAllSimulationParameters\(current, masterDataSnapshots\)/,
  '[source contract] Reset all datasets uses the existing role-local reset primitive')
assert.match(appSource, /const role = current\.activeDataset[\s\S]*?resetSimulationParameters\(current, sources\)/,
  '[source contract] Reset main action remains scoped to activeDataset')
assert.match(appSource, /const activeDataset = current\.activeDataset[\s\S]*?prepareSimulationSend\(current, masterDataSnapshots\)[\s\S]*?sendSimulationSnapshotToMasterData\(activeDataset, payload\.snapshot\)/,
  '[source contract] Send main action maps activeDataset to its same-role Master Working target')

console.log('PASS: Phase 4 fixed graph, role-local rates, independent selectors, all nine Result pairs, and After-role economics')
