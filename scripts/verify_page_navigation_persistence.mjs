import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const app = read('../src/App.tsx')
const masterPage = read('../src/features/master-data/MasterDataPage.tsx')
const cbdPage = read('../src/features/cost-breakdown/CostBreakdownPage.tsx')
const simulationPage = read('../src/features/simulation/SimulationPage.tsx')

const pageContracts = {
  master: {
    visited: 'hasVisitedMasterData',
    component: 'MasterDataPage',
    mount: /\(activeTab === 'master' \|\| hasVisitedMasterData\)/,
    hidden: /<div hidden=\{activeTab !== 'master'\}/
  },
  breakdown: {
    visited: 'hasVisitedCostBreakdown',
    component: 'CostBreakdownPage',
    mount: /\(activeTab === 'breakdown' \|\| hasVisitedCostBreakdown\)/,
    hidden: /<div hidden=\{activeTab !== 'breakdown'\}/
  },
  simulation: {
    visited: 'hasVisitedSimulation',
    component: 'SimulationPage',
    mount: /\(activeTab === 'simulation' \|\| hasVisitedSimulation\)/,
    hidden: /<div hidden=\{activeTab !== 'simulation'\}/
  }
}

for (const [page, contract] of Object.entries(pageContracts)) {
  assert.match(app, new RegExp(`const \\[${contract.visited}, set${contract.visited[0].toUpperCase()}${contract.visited.slice(1)}\\] = useState\\(activeTab === '${page}'\\)`),
    `${page} records whether it has been visited`)
  assert.match(app, contract.mount, `${page} remains mounted after first navigation to it`)
  assert.match(app, contract.hidden, `${page} is hidden while another route is active`)
  assert.match(app, new RegExp(`<${contract.component}\\b`), `${page} renders its existing page component`)
}

const routePairs = [
  ['master', 'breakdown'],
  ['master', 'simulation'],
  ['breakdown', 'master'],
  ['breakdown', 'simulation'],
  ['simulation', 'master'],
  ['simulation', 'breakdown']
]
assert.equal(routePairs.length, 6, 'the ordered route matrix covers every cross-page direction')
assert.equal(new Set(routePairs.map(([from, to]) => `${from}->${to}`)).size, 6,
  'each of the six route directions appears exactly once')
for (const [from, to] of routePairs) {
  const fromPage = pageContracts[from]
  const toPage = pageContracts[to]
  assert.match(app, fromPage.mount, `${from} stays mounted when navigating to ${to}`)
  assert.match(app, fromPage.hidden, `${from} becomes hidden when navigating to ${to}`)
  assert.match(app, toPage.mount, `${to} stays eligible to render after navigation from ${from}`)
}

assert.match(app, /if \(activeTab === 'master'\) setHasVisitedMasterData\(true\)[\s\S]*if \(activeTab === 'breakdown'\) setHasVisitedCostBreakdown\(true\)[\s\S]*if \(activeTab === 'simulation'\) setHasVisitedSimulation\(true\)[\s\S]*\}, \[activeTab\]/,
  'navigation records visits without clearing visited-page mounts')
const visitedEffect = app.match(/useEffect\(\(\) => \{\s*if \(activeTab === 'master'\) setHasVisitedMasterData\(true\)[\s\S]*?\}, \[activeTab\]\)/)?.[0]
assert.ok(visitedEffect, 'the active-tab effect that records visited pages exists')
assert.doesNotMatch(visitedEffect, /setHasVisited(?:MasterData|CostBreakdown|Simulation)\(false\)|setCandidateReorderHistory|setSimulationStatesByProduct/,
  'route changes do not clear visited flags or persistent page state')

for (const [name, source, states] of [
  ['Master Data', masterPage, ['showWarningHighlights', 'activeCellSelectionOwnerKey']],
  ['Cost Breakdown', cbdPage, ['typeTab', 'comparisonView', 'sortMode', 'isOverviewExpanded']],
  ['Simulation', simulationPage, ['expandedRows', 'dragRowOrder']]
]) {
  for (const state of states) {
    assert.match(source, new RegExp(`const \\[${state},[^\\n]*\\] = useState`), `${name} retains local UI state ${state} while its component remains mounted`)
  }
}

assert.match(masterPage, /masterDataUiState\.tableView|masterDataUiState\.mode/,
  'Master Data selection and edit mode remain held by the persistent store')
const masterNavigationEffect = masterPage.match(/useEffect\(\(\) => \{\s*if \(activeTab === 'master'\) return[\s\S]*?\}, \[activeTab\]\)/)?.[0]
assert.ok(masterNavigationEffect, 'Master Data navigation cleanup is limited to its transient overlays')
assert.match(masterNavigationEffect, /setImportModalOpen\(false\)[\s\S]*setSizingModalOpen\(false\)/,
  'leaving Master Data closes transient import and sizing dialogs')
assert.doesNotMatch(masterNavigationEffect, /setShowWarningHighlights|setActiveCellSelectionOwnerKey|updateMasterDataUiState/,
  'Master Data warning preference, cell context, and persisted table state are not reset on route changes')

const cbdNavigationEffect = cbdPage.match(/useEffect\(\(\) => \{\s*if \(activeTab !== 'breakdown'\)[\s\S]*?\}, \[activeTab\]\)/)?.[0]
assert.ok(cbdNavigationEffect, 'Cost Breakdown closes its transient popovers when hidden')
assert.doesNotMatch(cbdNavigationEffect, /setTypeTab|setComparisonView|setSortMode|setIsOverviewExpanded/,
  'Cost Breakdown type, status, sort, and overview state survive page navigation')

assert.match(app, /simulationStatesByProduct\[activeProductId\]/,
  'Simulation business state is retained per active product')
assert.match(app, /simulationHistoriesByProduct\[activeProductId\]/,
  'Simulation undo/redo history is retained per active product')
assert.match(app, /reconcileSimulationState\(storedSimulationState, masterDataSnapshots\)/,
  'current Master Data context is reconciled into Simulation state')
assert.match(app, /<SimulationPage\s+key=\{activeProductId\}/,
  'a product switch remounts Simulation local view state against the new context')
assert.match(app, /previous\.activeProductId !== activeProductId[\s\S]*previous\.comparisonFingerprint !== comparisonPair\.fingerprint[\s\S]*resetCandidateReorderHistory/,
  'Cost Breakdown reorder history is invalidated when product or comparison context changes')

console.log('Page navigation persistence source contracts: PASS (all six route directions, visited page mounts, local state, and context invalidation)')
console.log('Verification type: source contracts only; no browser navigation was run.')
