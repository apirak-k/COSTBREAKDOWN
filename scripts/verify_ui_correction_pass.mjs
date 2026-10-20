import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const simulationPage = source('src/features/simulation/SimulationPage.tsx')
const simulationGraph = source('src/features/simulation/SimulationStoryGraph.tsx')
assert.match(simulationGraph, /<h2[^>]*>Cost Structure<\/h2>/)
assert.doesNotMatch(`${simulationPage}\n${simulationGraph}`, /Simulation Cost Structure/)

const footer = simulationPage.match(/<footer data-simulation-table-footer=\{kind\}[\s\S]*?<\/footer>/)?.[0]
assert.ok(footer, 'Simulation BOM/Routing footer is present')
assert.match(footer, /<ChevronLeft[^>]*className="h-4 w-4"/)
assert.match(footer, /<ChevronRight[^>]*className="h-4 w-4"/)
assert.match(simulationPage, /<ChevronRight className="h-4 w-4" \/>/, 'row expansion chevrons use the matching 16px size')
assert.match(simulationPage, /const columnWidths = \['6%', '18%', '10%', '14\.5%', '14\.5%', '14\.5%', '17%', '5\.5%'\]/)
assert.match(simulationPage, /gridTemplateColumns: columnWidths\.join\(' '\)/)
assert.match(footer, /md:col-start-8 md:justify-self-center/, 'footer next control occupies the final table column')
assert.match(footer, /onClick=\{\(\) => moveOneRow\(1\)\}/)
assert.match(footer, /onClick=\{\(\) => moveOneRow\(-1\)\}/)
assert.doesNotMatch(footer, /[◀▶]/)
assert.match(simulationPage, /data-simulation-table-body="true"[^>]*xl:overflow-y-auto/)
assert.match(simulationPage, /orderedRows\.map\(\(\{ row, sourceIndex \}/, 'the table continues to render the full ordered row set')

const masterPage = source('src/features/master-data/MasterDataPage.tsx')
const masterHeader = source('src/features/master-data/components/MasterDataWorkspaceHeader.tsx')
const masterChrome = source('src/features/master-data/components/MasterDataTableChrome.tsx')
const stickyHeaderHelper = source('src/shared/ui/StickyTableHeader.tsx')
assert.match(masterPage, /tableSections = \[[\s\S]*key: 'bom'[\s\S]*key: 'wc'[\s\S]*key: 'routing'/)
assert.match(masterPage, /isAllTablesVisible\s*\?\s*tableSections\.map\(section => \([\s\S]*<section[\s\S]*renderTable\(section\.key\)/)
assert.match(masterPage, /activeSection && \([\s\S]*<section[\s\S]*renderTable\(activeSection\.key\)/)
assert.match(masterPage, /header\.getBoundingClientRect\(\)\.height/)
assert.match(masterPage, /new ResizeObserver\(updateStickyOffset\)/)
assert.match(masterHeader, /workspaceHeaderRef=|ref=\{workspaceHeaderRef\}/)
assert.match(masterHeader, /className="sticky top-0 z-40/)
assert.doesNotMatch(masterChrome, /sticky/)
assert.match(stickyHeaderHelper, /data-sticky-table-header="true" className=\{`sticky z-20 w-full/)
assert.match(stickyHeaderHelper, /data-sticky-table-header-viewport="true" className="overflow-hidden"/)

for (const [file, title, labels] of [
  ['BOMTable.tsx', 'Bill of Materials rows', ['Material', 'Usage', 'Unit', 'Price', 'Loss']],
  ['WorkCenterRatesTable.tsx', 'Work Centers rows', ['Work Center', 'Labor Rate', 'Burden Rate']],
  ['RoutingTable.tsx', 'Routing rows', ['Process', 'Work Center', 'Manning', 'Capacity', 'Yield']]
]) {
  const table = source(`src/features/master-data/components/${file}`)
  assert.match(table, new RegExp(`<section aria-label="${title}" className="border border-slate-300 bg-white select-none">`))
  assert.match(table, /<StickyTableHeader[\s\S]*?top="var\(--master-data-table-header-top, 0px\)"/)
  assert.match(table, /<div className="overflow-x-auto" onScroll=\{syncHeaderScroll\}>/)
  assert.match(table, /<thead className="sr-only">[\s\S]*?<\/thead>/)
  assert.match(table, /<RowSelectionButton[^>]*variant="light"/)
  for (const label of labels) assert.ok(table.includes(`>${label}</th>`), `${file} retains ${label} header`)
}

const cbdPage = source('src/features/cost-breakdown/CostBreakdownPage.tsx')
const cbdTables = source('src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
const itemized = source('src/features/cost-breakdown/components/ItemizedComparisonTable.tsx')
assert.match(cbdPage, /shell\.getBoundingClientRect\(\)\.height \+ 8/)
assert.match(cbdPage, /new ResizeObserver\(updateStickyOffset\)/)
assert.match(cbdPage, /data-cbd-sticky-shell="true"[^>]*lg:sticky lg:top-0/)
assert.match(cbdTables, /<StickyTableHeader[\s\S]*?topClassName="top-0 lg:top-\[var\(--cbd-table-header-top\)\]"/)
assert.match(cbdTables, /<div className="overflow-x-auto" onScroll=\{syncHeaderScroll\}>/)
assert.match(cbdTables, /<div className="border border-slate-200">\s*<StickyTableHeader/)
assert.doesNotMatch(cbdTables, /<div className="overflow-x-auto border border-slate-200">/)
assert.match(cbdTables, /<thead className="sr-only">[\s\S]*?<\/thead>/)
assert.match(cbdTables, /min-w-\[1040px\]/)
assert.match(cbdTables, /min-w-\[1260px\]/)
assert.match(itemized, /typeTab !== 'rtg'[\s\S]*type="bom"[\s\S]*typeTab !== 'bom'[\s\S]*type="routing"/)

console.log('PASS: focused Simulation, Master Data, and Cost Breakdown UI correction contracts')
