import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const app = read('../src/App.tsx')
const masterPage = read('../src/features/master-data/MasterDataPage.tsx')
const masterUiState = read('../src/features/master-data/master-data-ui-state.ts')
const cbdPage = read('../src/features/cost-breakdown/CostBreakdownPage.tsx')
const simulationPage = read('../src/features/simulation/SimulationPage.tsx')
const simulationState = read('../src/features/simulation/simulation-state.ts')
const store = read('../src/state/store.tsx')
const storage = read('../src/services/storage/session-storage.ts')
const activeTab = read('../src/state/active-tab.ts')

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
assert.match(masterUiState, /INITIAL_MASTER_DATA_UI_STATE:[\s\S]*role: 'current',[\s\S]*mode: 'edit',[\s\S]*tableView: 'all'/,
  'fresh app initialization defaults Master Data to Edit Data, Current, and All Tables')
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

assert.match(app, /pageScrollPositions = useRef<Record<ActiveTab, number>>\(\{ master: 0, breakdown: 0, simulation: 0 \}\)/,
  'page scroll positions live only in an in-memory, page-keyed map')
assert.match(app, /main\.scrollTop = pageScrollPositions\.current\[activeTab\]/,
  'navigation restores the destination page scroll position')
assert.doesNotMatch(app, /scrollTo\(\{\s*top:\s*0/, 'page changes do not reset the shared scroll container')
assert.match(activeTab, /export type ActiveTab\s*=\s*'master'\s*\|\s*'breakdown'\s*\|\s*'simulation'/,
  'the active-page storage whitelist contains only the three supported destinations')
const activePageInitialization = store.match(/const \[activeTab,\s*setActiveTabState\] = useState<ActiveTab>\([\s\S]*?\n\s*\)/)?.[0]
assert.ok(activePageInitialization
  && /normalizeActiveTab\(/.test(activePageInitialization)
  && /loadFromSession<unknown>\(STORAGE_KEYS\.ACTIVE_TAB,\s*'master'\)/.test(activePageInitialization),
  'the initial route restores a validated active page and falls back to Master Data when storage is missing')
assert.match(store, /saveToSession\(STORAGE_KEYS\.ACTIVE_TAB, activeTab\)/,
  'navigation persists the validated active page')
assert.match(storage, /ACTIVE_TAB:\s*['"]costbreakdown_active_tab['"]/, 'session storage has a dedicated active-page key')
assert.match(store, /useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_BEFORE\)[\s\S]*useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_AFTER\)/,
  'temporary comparison selectors still initialize to in-memory defaults on a fresh app load')
assert.match(app, /omitSimulationViewStateMap\(loadFromSession\(STORAGE_KEYS\.SIMULATION_STATES, \{\}\)\)/,
  'old persisted Simulation view context is stripped before a refreshed app initializes')
assert.match(app, /saveToSession\(STORAGE_KEYS\.SIMULATION_STATES, omitSimulationViewStateMap\(simulationStatesByProduct\)\)/,
  'Simulation session persistence writes business data without role, comparison, or selection view state')
assert.match(simulationState, /delete state\.activeDataset[\s\S]*delete state\.comparisonBefore[\s\S]*delete state\.comparisonAfter[\s\S]*delete state\.workingSelection/,
  'Simulation storage projection omits active role, pair, and row selection')
assert.match(simulationState, /delete persistedDataset\.workingSelection/,
  'per-role worklist selections are excluded from durable Simulation state')
const simulationTableMounts = [...simulationPage.matchAll(/<SimulationParameterTable\s+kind="(bom|routing)"/g)].map(([, kind]) => kind)
assert.deepEqual(simulationTableMounts, ['bom', 'routing'],
  'Simulation keeps separate mounted BOM and Routing table instances')
const parameterTableSource = simulationPage.slice(
  simulationPage.indexOf('function SimulationParameterTable('),
  simulationPage.indexOf('const SimulationPage:')
)
assert.match(parameterTableSource, /const \[searchQuery, setSearchQuery\] = useState\(''\)/,
  'each Simulation table instance owns an in-memory search query')
assert.match(parameterTableSource, /const bodyRef = useRef<HTMLDivElement>\(null\)[\s\S]*const \[expandedRows, setExpandedRows\] = useState<Set<string>>\(\(\) => new Set\(\)\)/,
  'each Simulation table instance owns its body scroll element and expanded-row state')
assert.match(store, /const \[productSessions, setProductSessions\] = useState<ProductSession\[]>\(\(\) => \{\s*const loaded = loadFromSession<ProductSession\[]>\(STORAGE_KEYS\.SESSIONS/,
  'Master Data working datasets continue loading from their existing business-data storage')
assert.match(store, /saveToSession\(STORAGE_KEYS\.SESSIONS, productSessions\)/,
  'Master Data business datasets continue saving through their existing session-storage contract')

console.log('Page navigation and refresh-state contracts: PASS (six route directions, validated active-page persistence, transient view defaults, and business-state persistence)')
console.log('Verification type: source contracts only; no browser navigation was run.')
