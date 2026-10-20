import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const simulationPage = source('src/features/simulation/SimulationPage.tsx')
const simulationGraph = source('src/features/simulation/SimulationStoryGraph.tsx')
assert.match(simulationGraph, /<h2[^>]*>Cost Structure<\/h2>/)
assert.doesNotMatch(`${simulationPage}\n${simulationGraph}`, /Simulation Cost Structure/)

const footer = simulationPage.match(/<footer data-simulation-table-footer=\{kind\}[\s\S]*?<\/footer>/)?.[0]
assert.ok(footer, 'Simulation BOM/Routing footer is present')
const previousButtonStart = footer.indexOf('aria-label={`Previous ${navigationLabel} row`}')
const nextButtonStart = footer.indexOf('aria-label={`Next ${navigationLabel} row`}')
assert.ok(previousButtonStart >= 0 && nextButtonStart > previousButtonStart, 'previous and next controls render in order')
const previousButton = footer.slice(footer.lastIndexOf('<button', previousButtonStart), footer.indexOf('</button>', previousButtonStart) + '</button>'.length)
const nextButton = footer.slice(footer.lastIndexOf('<button', nextButtonStart), footer.indexOf('</button>', nextButtonStart) + '</button>'.length)
const previousButtonEnd = footer.indexOf('</button>', previousButtonStart) + '</button>'.length
assert.equal(footer.slice(previousButtonEnd, footer.lastIndexOf('<button', nextButtonStart)).trim(), '', 'Simulation chevron controls are adjacent siblings')
const arrowGroupStart = footer.lastIndexOf('<div', previousButtonStart)
const arrowGroupEnd = footer.indexOf('</div>', nextButtonStart) + '</div>'.length
const arrowGroup = footer.slice(arrowGroupStart, arrowGroupEnd)
assert.match(arrowGroup, /md:col-start-8/, 'the next chevron group remains in table column 8')
assert.equal([...arrowGroup.matchAll(/<button\b[\s\S]*?<\/button>/g)].length, 2, 'the arrow group contains only the two row-navigation controls')
assert.match(previousButton, /onClick=\{\(\) => moveOneRow\(-1\)\}/)
assert.match(nextButton, /onClick=\{\(\) => moveOneRow\(1\)\}/)
assert.match(previousButton, /disabled=\{visibleRange\.atTop\}/)
assert.match(nextButton, /disabled=\{visibleRange\.atBottom\}/)
for (const [name, button] of [['previous', previousButton], ['next', nextButton]]) {
  assert.match(button, /hover:bg-slate-100/, `${name} enabled row control uses the neutral hover affordance`)
  assert.match(button, /focus-visible:/, `${name} row control has a keyboard focus affordance`)
  assert.match(button, /disabled:text-slate-300/, `${name} row control remains subdued when disabled`)
  assert.match(button, /disabled:hover:bg-transparent/, `${name} disabled row control has no enabled-looking hover state`)
}
assert.match(previousButton, /md:absolute md:right-full md:top-0/, 'desktop Previous sits directly to the left of Next')
assert.match(nextButton, /md:absolute md:left-0 md:top-0/, 'desktop Next starts at the column-8 center axis wrapper')
assert.match(arrowGroup, /relative flex h-6 w-12[^\n]*md:col-start-8 md:w-6 md:justify-self-center/,
  'the compact pair is centered on the same final grid track as row details')
assert.match(previousButton, /<ChevronLeft[^>]*className="h-4 w-4"/)
assert.match(nextButton, /<ChevronRight[^>]*className="h-4 w-4"/)
assert.match(simulationPage, /<ChevronRight className="h-4 w-4" \/>/, 'row expansion chevrons use the matching 16px size')
assert.match(simulationPage, /const columnWidths = \['6%', '18%', '10%', '14\.5%', '14\.5%', '14\.5%', '17%', '5\.5%'\]/)
assert.match(simulationPage, /columnWidths\.map\(\(width, index\) =>/,
  'the table uses the same eight column tracks as the footer control grid')
assert.match(simulationPage, /gridTemplateColumns: columnWidths\.join\(' '\)/)
assert.match(simulationPage, /\{displayMoney\(analysis\.simCost\)\}<\/td>\s*<td className="px-0\.5 py-1 text-center">[\s\S]*?<ChevronRight className="h-4 w-4" \/>/,
  'the row Details chevron is centered in table column 8')
assert.doesNotMatch(footer, /[◀▶]/)
const orderedRowsDefinition = simulationPage.match(/const orderedRows =[\s\S]*?(?=\n\s*const visibleRange)/)?.[0]
assert.ok(orderedRowsDefinition, 'the complete ordered row collection is defined before visibility tracking')
assert.doesNotMatch(orderedRowsDefinition, /\.slice\s*\(/, 'row navigation does not paginate by slicing the ordered collection')
assert.match(simulationPage, /data-simulation-table-body="true"[^>]*xl:overflow-y-auto/)
const simulationTableBody = simulationPage.match(/data-simulation-table-body="true"[\s\S]*?(?=<footer data-simulation-table-footer)/)?.[0]
assert.ok(simulationTableBody, 'the Simulation table body is present before its navigation footer')
assert.match(simulationTableBody, /orderedRows\.map\(/, 'the table renders the complete ordered row set')
assert.doesNotMatch(simulationTableBody, /orderedRows\.slice\s*\(/, 'the rendered row set is not truncated with slicing')

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
assert.match(stickyHeaderHelper, /data-sticky-table-header="true" className=\{`sticky [^`]*w-full/)
assert.match(stickyHeaderHelper, /data-sticky-table-header-viewport="true" className="overflow-hidden"/)
const stickyHeaderWrapper = stickyHeaderHelper.match(/data-sticky-table-header="true" className=\{`([^`]*)`\}/)?.[1]
const stickyHeaderZ = stickyHeaderWrapper?.match(/(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?=\s|$)/)
assert.ok(stickyHeaderZ, 'the shared sticky header wrapper has a stacking level')
const stickyHeaderZIndex = Number(stickyHeaderZ[1] ?? stickyHeaderZ[2])

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
  const indexHeader = table.match(/<th scope="col" className=\{`([^`]*)`\}/)?.[1]
  const indexBodyCell = table.match(/<th scope="row" className=\{`([^`]*)`\}/)?.[1]
  assert.ok(indexHeader && indexBodyCell, `${file} retains sticky # header and row index cells`)
  assert.match(indexHeader, /sticky left-0/)
  assert.match(indexHeader, /\bbg-slate-100\b/, `${file} # header keeps its opaque slate background`)
  assert.match(table, /<thead className="border-y-2 border-slate-400 bg-slate-100 text-\[11px\] font-semibold uppercase tracking-wide text-slate-800">/,
    `${file} retains the established table-header border, fill, and typography`)
  const bodyCellZ = indexBodyCell.match(/(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?=\s|$)/)
  assert.ok(bodyCellZ, `${file} row index cell has a stacking level`)
  assert.ok(stickyHeaderZIndex > Number(bodyCellZ[1] ?? bodyCellZ[2]), `${file} sticky header wrapper stacks above its sticky row index cells`)
  const wrapperBackground = table.match(/backgroundClassName="([^"]+)"/)?.[1]
  assert.ok(wrapperBackground && /(?:^|\s)bg-(?:white|[a-z]+-\d{2,3})(?:\s|$)/.test(wrapperBackground), `${file} sticky header background is opaque`)
  for (const label of labels) assert.ok(table.includes(`>${label}</th>`), `${file} retains ${label} header`)
}

const cbdPage = source('src/features/cost-breakdown/CostBreakdownPage.tsx')
const cbdTables = source('src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
const itemized = source('src/features/cost-breakdown/components/ItemizedComparisonTable.tsx')
const cbdOffsetUpdate = cbdPage.match(/const updateStickyOffset[\s\S]*?;/)?.[0]
assert.ok(cbdOffsetUpdate, 'Cost Breakdown measures the sticky shell for the table header offset')
assert.match(cbdOffsetUpdate, /shell\.getBoundingClientRect\(\)\.height/)
assert.doesNotMatch(cbdOffsetUpdate, /height\s*[+*/-]|(?:\+\s*8)|(?:8\s*\+)/, 'sticky offset is the measured shell height alone')
assert.match(cbdPage, /new ResizeObserver\(updateStickyOffset\)/)
assert.match(cbdPage, /data-cbd-sticky-shell="true"[^>]*lg:sticky lg:top-0/)
const cbdGap = cbdPage.match(/<div[^>]*data-cbd-sticky-gap="true"[^>]*>/)?.[0]
assert.ok(cbdGap, 'the normal-flow gap after the sticky shell remains present')
assert.match(cbdGap, /aria-hidden="true"/)
assert.match(cbdGap, /className="[^"]*h-2[^\"]*shrink-0[^"]*"/)
assert.doesNotMatch(cbdGap, /(?:^|\s)(?:sticky|absolute|fixed)(?:\s|$)/, 'the gap stays in normal flow')
assert.match(cbdPage, /data-cbd-sticky-shell="true"[\s\S]*?<\/div>\s*<div[^>]*data-cbd-sticky-gap="true"[\s\S]*?aria-label="Candidate workspace"/, 'the sticky shell and normal-flow gap retain their existing DOM handoff order')
assert.match(cbdTables, /<StickyTableHeader[\s\S]*?topClassName="top-0 lg:top-\[var\(--cbd-table-header-top\)\]"/)
assert.match(cbdTables, /<div className="overflow-x-auto" onScroll=\{syncHeaderScroll\}>/)
assert.match(cbdTables, /<div className="border border-slate-200">\s*<StickyTableHeader/)
assert.doesNotMatch(cbdTables, /<div className="overflow-x-auto border border-slate-200">/)
assert.match(cbdTables, /<thead className="sr-only">[\s\S]*?<\/thead>/)
assert.match(cbdTables, /min-w-\[1040px\]/)
assert.match(cbdTables, /min-w-\[1260px\]/)
const cbdCandidateTypes = [...itemized.matchAll(/<CandidateFindingsTable\b[\s\S]*?type="(bom|routing)"/g)].map(([, type]) => type)
assert.deepEqual(cbdCandidateTypes, ['bom', 'routing'], 'both BOM and Routing findings use the shared CandidateFindingsTable')
assert.match(itemized, /typeTab !== 'rtg'[\s\S]*type="bom"[\s\S]*typeTab !== 'bom'[\s\S]*type="routing"/)

console.log('PASS: focused Simulation, Master Data, and Cost Breakdown UI correction contracts')
