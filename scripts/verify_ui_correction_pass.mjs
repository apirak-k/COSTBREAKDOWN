import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const stackingLevel = className => {
  const match = className.match(/(?:^|\s)(?:lg:)?z-(?:\[(\d+)\]|(\d+))(?=\s|$)/)
  return match ? Number(match[1] ?? match[2]) : null
}
const assertSearchField = (field, name, inputLabelPattern, clearLabelPattern, changeHandler, clearHandler) => {
  assert.ok(field, `${name} search field is present`)
  assert.equal([...field.matchAll(/<Search\b/g)].length, 1, `${name} field contains exactly one search icon`)
  assert.equal([...field.matchAll(/<input\b/g)].length, 1, `${name} field contains exactly one input`)
  assert.equal([...field.matchAll(/<X\b/g)].length, 1, `${name} field contains exactly one custom clear X`)
  assert.equal([...field.matchAll(/<button\b/g)].length, 1, `${name} field contains exactly one clear button`)
  assert.match(field, /<Search\b[^>]*aria-hidden="true"/, `${name} search icon stays decorative inside its field`)

  const input = field.match(/<input\b[\s\S]*?\/>/)?.[0]
  const clearButton = field.match(/<button\b[\s\S]*?<X\b[\s\S]*?<\/button>/)?.[0]
  assert.ok(input && clearButton, `${name} input and clear control stay in the same field`)
  assert.match(input, /type="search"/, `${name} keeps native search input semantics`)
  assert.match(input, inputLabelPattern, `${name} keeps its accessible search name`)
  assert.match(input, /className="[^"]*\bsearch-clear-control\b/, `${name} input uses the native-cancel suppression rule`)
  assert.match(input, /value=\{searchQuery\}/, `${name} input remains controlled by its existing query`)
  assert.match(input, changeHandler, `${name} input keeps its existing query-change handler`)

  assert.match(field, /\{\s*searchQuery\.length\s*>\s*0\s*&&\s*\(\s*<button/, `${name} clear control only renders for a nonempty query`)
  assert.match(field, /<\/button>\s*\)\s*\}/, `${name} nonempty-query condition closes around the clear control`)
  assert.match(clearButton, /type="button"/, `${name} clear control is not a form submit button`)
  assert.match(clearButton, clearLabelPattern, `${name} clear control has an accessible name`)
  assert.match(clearButton, /<X\b[^>]*aria-hidden="true"/, `${name} clear icon is decorative under the button name`)

  const inputRef = input.match(/ref=\{([A-Za-z_$][\w$]*)\}/)?.[1]
  const clearClasses = clearButton.match(/className="([^"]+)"/)?.[1]
  assert.ok(inputRef && clearClasses, `${name} input ref and clear-button styles are present`)
  const idleClasses = clearClasses.split(/\s+/).filter(token => !token.includes(':')).join(' ')
  assert.match(idleClasses, /\btext-slate-\d{3}\b/, `${name} clear control uses a neutral slate idle color`)
  assert.doesNotMatch(idleClasses, /\b(?:text|bg|border)-blue-\d{2,3}\b/, `${name} idle clear control has no blue styling`)
  assert.match(clearClasses, /\bcursor-pointer\b/, `${name} clear control shows a pointer cursor`)
  assert.match(clearClasses, /\bfocus-visible:/, `${name} clear control has a keyboard focus-visible state`)
  const idleText = idleClasses.match(/\btext-(slate-\d{3})\b/)?.[1]
  const hoverText = clearClasses.match(/\bhover:text-(slate-\d{3})\b/)?.[1]
  const idleBackground = idleClasses.match(/\bbg-(slate-\d{3})\b/)?.[1] ?? 'transparent'
  const hoverBackground = clearClasses.match(/\bhover:bg-(slate-\d{3})\b/)?.[1]
  assert.ok(hoverBackground, `${name} clear control has a slate hover fill`)
  assert.notEqual(hoverBackground, idleBackground, `${name} clear control hover fill differs from idle`)
  assert.ok(idleText && hoverText && idleText !== hoverText, `${name} clear control hover text differs from idle slate`)

  const clearCall = `${clearHandler}('')`
  const focusCall = `${inputRef}.current?.focus()`
  assert.ok(clearButton.includes(clearCall), `${name} clear control empties the correct query`)
  assert.ok(clearButton.includes(focusCall), `${name} clear control focuses the same input`)
  assert.ok(clearButton.indexOf(clearCall) < clearButton.indexOf(focusCall), `${name} clear control empties the query before returning focus`)
  return { input, clearButton }
}

const simulationPage = source('src/features/simulation/SimulationPage.tsx')
const simulationGraph = source('src/features/simulation/SimulationStoryGraph.tsx')
const globalStyles = source('src/index.css')
assert.match(simulationGraph, /<h2[^>]*>Cost Structure<\/h2>/)
assert.doesNotMatch(`${simulationPage}\n${simulationGraph}`, /Simulation Cost Structure/)

const nativeSearchCancelRule = globalStyles.match(/\.search-clear-control::-webkit-search-cancel-button\s*\{[^}]*\}/)?.[0]
assert.ok(nativeSearchCancelRule, 'the browser-native search cancel pseudo-element is explicitly suppressed')
assert.match(nativeSearchCancelRule, /-webkit-appearance:\s*none\s*;/)
assert.match(nativeSearchCancelRule, /appearance:\s*none\s*;/)
assert.match(nativeSearchCancelRule, /display:\s*none\s*;/)

const simulationParameterTable = simulationPage.match(/function SimulationParameterTable\([\s\S]*?(?=\nfunction ResultPanel)/)?.[0]
assert.ok(simulationParameterTable, 'Simulation BOM/Routing table component remains present')
const simulationTableProps = simulationPage.match(/function SimulationParameterTable\(\{[\s\S]*?\}:\s*\{([\s\S]*?)\}\s*\)\s*\{/)?.[1]
assert.ok(simulationTableProps, 'Simulation table search remains owned by each table instance')
assert.doesNotMatch(simulationTableProps, /\bsearchQuery\b|\bonSearchQueryChange\b/, 'Simulation query state is not shared through table props')
assert.match(simulationParameterTable, /const \[searchQuery, setSearchQuery\] = useState\(''\)/,
  'each Simulation table instance owns an independent local query')
const simulationTableKinds = [...simulationPage.matchAll(/<SimulationParameterTable\b[\s\S]*?\bkind="(bom|routing)"/g)].map(([, kind]) => kind)
assert.deepEqual(simulationTableKinds, ['bom', 'routing'], 'BOM and Routing keep separate Simulation table instances')
const searchChangeResetEffect = simulationParameterTable.match(/useSafeLayoutEffect\(\(\) => \{\s*if \(previousSearchQueryRef\.current === searchQuery\)[\s\S]*?\}, \[searchQuery, updateViewportState\]\)/)?.[0]
assert.ok(searchChangeResetEffect, 'Simulation retains its query-change viewport reset effect')
assert.match(searchChangeResetEffect, /previousSearchQueryRef\.current = searchQuery/)
assert.match(searchChangeResetEffect, /body\.scrollTop = 0/)
assert.match(searchChangeResetEffect, /window\.scrollBy|scrollHost\.scrollBy/)
assert.match(searchChangeResetEffect, /updateViewportState\(\)/)

const footer = simulationPage.match(/<footer data-simulation-table-footer=\{kind\}[\s\S]*?<\/footer>/)?.[0]
assert.ok(footer, 'Simulation BOM/Routing footer is present')
const simulationSearchField = footer.match(/<div\b[^>]*>\s*<Search\b[\s\S]*?<\/div>/)?.[0]
const simulationSearch = assertSearchField(
  simulationSearchField,
  'Simulation',
  /aria-label=\{`Search \$\{shortTitle\} by \$\{searchField\}`\}/,
  /aria-label=\{`Clear \$\{searchField\} search`\}/,
  /onChange=\{event => setSearchQuery\(event\.target\.value\)\}/,
  'setSearchQuery'
)
assert.match(simulationSearch.input, /placeholder=\{searchField\}/, 'Simulation keeps its field-specific placeholder')
assert.match(simulationSearchField, /className="relative h-6 w-40 min-w-0 shrink-0 sm:w-48"/,
  'Simulation Search stays compact and preserves the previous combined control footprint')
const simulationClearClasses = simulationSearch.clearButton.match(/className="([^"]+)"/)?.[1]
assert.match(simulationClearClasses, /\babsolute right-0\.5 top-1\/2 grid h-5 w-5 -translate-y-1\/2\b/,
  'Simulation clear hover surface is smaller than the field, vertically centered, and inset from the right border')
const previousButtonStart = footer.indexOf('aria-label={`Previous ${navigationLabel} row`}')
const nextButtonStart = footer.indexOf('aria-label={`Next ${navigationLabel} row`}')
assert.ok(previousButtonStart >= 0 && nextButtonStart > previousButtonStart, 'previous and next controls render in order')
const previousButton = footer.slice(footer.lastIndexOf('<button', previousButtonStart), footer.indexOf('</button>', previousButtonStart) + '</button>'.length)
const nextButton = footer.slice(footer.lastIndexOf('<button', nextButtonStart), footer.indexOf('</button>', nextButtonStart) + '</button>'.length)
const rangeCounterClass = footer.match(/<span aria-live="polite" className="([^"]+)"/)?.[1]
assert.ok(rangeCounterClass, 'Simulation row range counter is present')
assert.match(rangeCounterClass, /md:col-start-7/)
assert.match(rangeCounterClass, /md:mr-6/, 'the range counter leaves a compact gap before the Previous chevron')
assert.match(rangeCounterClass, /md:justify-self-end/)
assert.doesNotMatch(rangeCounterClass, /md:col-span-/)
const previousButtonEnd = footer.indexOf('</button>', previousButtonStart) + '</button>'.length
assert.equal(footer.slice(previousButtonEnd, footer.lastIndexOf('<button', nextButtonStart)).trim(), '', 'Simulation chevron controls are adjacent siblings')
const arrowGroupStart = footer.lastIndexOf('<div', previousButtonStart)
const arrowGroupEnd = footer.indexOf('</div>', nextButtonStart) + '</div>'.length
const arrowGroup = footer.slice(arrowGroupStart, arrowGroupEnd)
assert.match(arrowGroup, /md:col-start-8/, 'the next chevron group remains in table column 8')
const rangeColumn = Number(rangeCounterClass.match(/md:col-start-(\d+)/)?.[1])
const chevronColumn = Number(arrowGroup.match(/md:col-start-(\d+)/)?.[1])
assert.equal(rangeColumn + 1, chevronColumn, 'the range counter sits immediately beside the compact column-8 navigation cluster')
assert.equal([...arrowGroup.matchAll(/<button\b[\s\S]*?<\/button>/g)].length, 2, 'the arrow group contains only the two row-navigation controls')
assert.match(previousButton, /onClick=\{\(\) => moveOneRow\(-1\)\}/)
assert.match(nextButton, /onClick=\{\(\) => moveOneRow\(1\)\}/)
assert.match(previousButton, /disabled=\{visibleRange\.atTop\}/)
assert.match(nextButton, /disabled=\{visibleRange\.atBottom\}/)
for (const [name, button] of [['previous', previousButton], ['next', nextButton]]) {
  const footerBackground = footer.match(/\bbg-slate-\d{3}\b/)?.[0]
  const enabledHoverBackground = button.match(/\bhover:(bg-slate-\d{3})\b/)?.[1]
  assert.equal(footerBackground, 'bg-slate-100', 'Simulation navigation sits on the established slate-100 footer')
  assert.equal(enabledHoverBackground, 'bg-slate-200', `${name} enabled row control has a visibly distinct hover fill`)
  assert.notEqual(enabledHoverBackground, footerBackground, `${name} enabled hover fill differs from its footer background`)
  assert.match(button, /hover:text-slate-950/, `${name} enabled hover strengthens the arrow color`)
  assert.match(button, /focus-visible:/, `${name} row control has a keyboard focus affordance`)
  assert.match(button, /disabled:text-slate-300/, `${name} row control remains subdued when disabled`)
  assert.match(button, /disabled:hover:bg-transparent/, `${name} disabled row control has no enabled-looking hover state`)
  assert.match(button, /disabled:hover:text-slate-300/, `${name} disabled row control keeps muted text on hover`)
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
const masterSearchField = masterHeader.match(/<div role="search"[\s\S]*?<\/div>/)?.[0]
const masterSearch = assertSearchField(
  masterSearchField,
  'Master Data',
  /aria-label="Search Master Data"/,
  /aria-label="Clear Master Data search"/,
  /onChange=\{event => onSearchQueryChange\(event\.target\.value\)\}/,
  'onSearchQueryChange'
)
assert.match(masterSearch.input, /placeholder=\{searchPlaceholder\}/, 'Master Data keeps its table-specific placeholder')
const masterClearClasses = masterSearch.clearButton.match(/className="([^"]+)"/)?.[1]
assert.match(masterClearClasses, /\babsolute right-1 top-1\/2 grid h-6 w-6 -translate-y-1\/2\b/,
  'Master Data clear-control geometry remains unchanged')
const appSource = source('src/App.tsx')
assert.match(appSource, /const \[masterDataSearchQuery, setMasterDataSearchQuery\] = useState\(''\)/,
  'Master Data keeps its existing shared query state')
assert.match(appSource, /searchQuery=\{masterDataSearchQuery\}/)
assert.match(appSource, /onSearchQueryChange=\{setMasterDataSearchQuery\}/)
assert.match(masterPage, /searchQuery=\{searchQuery\}/, 'Master Data keeps passing its query to the existing table filter')
assert.match(masterPage, /onSearchQueryChange=\{onSearchQueryChange\}/, 'Master Data keeps passing query edits to the existing owner')
assert.match(masterPage, /tableSections = \[[\s\S]*key: 'bom'[\s\S]*key: 'wc'[\s\S]*key: 'routing'/)
assert.match(masterPage, /isAllTablesVisible\s*\?\s*tableSections\.map\(section => \([\s\S]*<section[\s\S]*renderTable\(section\.key\)/)
assert.match(masterPage, /activeSection && \([\s\S]*<section[\s\S]*renderTable\(activeSection\.key\)/)
assert.match(masterPage, /header\.getBoundingClientRect\(\)\.height/)
assert.match(masterPage, /new ResizeObserver\(updateStickyOffset\)/)
assert.match(masterHeader, /workspaceHeaderRef=|ref=\{workspaceHeaderRef\}/)
assert.match(masterHeader, /className="sticky top-0 z-40/)
const masterWorkspaceHeaderClass = masterHeader.match(/className="(sticky top-0 z-40[^"]*)"/)?.[1]
assert.ok(masterWorkspaceHeaderClass, 'Master Data workspace header retains its z-40 sticky layer')
assert.doesNotMatch(masterChrome, /sticky/)
assert.match(stickyHeaderHelper, /data-sticky-table-header="true" className=\{`sticky [^`]*w-full/)
assert.match(stickyHeaderHelper, /data-sticky-table-header-viewport="true" className="overflow-hidden"/)
const stickyHeaderWrapper = stickyHeaderHelper.match(/data-sticky-table-header="true" className=\{`([^`]*)`\}/)?.[1]
const stickyHeaderZ = stickyHeaderWrapper?.match(/(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?=\s|$)/)
assert.ok(stickyHeaderZ, 'the shared sticky header wrapper has a stacking level')
const stickyHeaderZIndex = Number(stickyHeaderZ[1] ?? stickyHeaderZ[2])
assert.ok(stackingLevel(masterWorkspaceHeaderClass) > stickyHeaderZIndex,
  'Master Data workspace header remains above its sticky table headers')

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
const cbdShellClass = cbdPage.match(/data-cbd-sticky-shell="true"[^>]*className="([^"]+)"/)?.[1]
assert.ok(cbdShellClass, 'Cost Breakdown sticky shell exposes its stacking utility')
const cbdShellZIndex = stackingLevel(cbdShellClass)
assert.ok(cbdShellZIndex !== null && cbdShellZIndex > stickyHeaderZIndex,
  'Cost Breakdown shell stacks strictly above the Candidate sticky header')
const cbdGap = cbdPage.match(/<div[^>]*data-cbd-sticky-gap="true"[^>]*>/)?.[0]
assert.ok(cbdGap, 'the normal-flow gap after the sticky shell remains present')
assert.match(cbdGap, /aria-hidden="true"/)
assert.match(cbdGap, /className="[^"]*h-2[^\"]*shrink-0[^"]*"/)
assert.doesNotMatch(cbdGap, /(?:^|\s)(?:sticky|absolute|fixed)(?:\s|$)/, 'the gap stays in normal flow')
assert.match(cbdPage, /data-cbd-sticky-shell="true"[\s\S]*?<\/div>\s*<div[^>]*data-cbd-sticky-gap="true"[\s\S]*?aria-label="Candidate workspace"/, 'the sticky shell and normal-flow gap retain their existing DOM handoff order')
assert.match(cbdTables, /<StickyTableHeader[\s\S]*?topClassName="top-0 lg:top-\[var\(--cbd-table-header-top\)\]"/)
const candidateStickyHeader = cbdTables.match(/<StickyTableHeader\b[\s\S]*?<\/StickyTableHeader>/)?.[0]
assert.ok(candidateStickyHeader, 'Candidate findings use the shared sticky header wrapper')
const candidateBody = cbdTables.match(/<tbody\b[\s\S]*?<\/tbody>/)?.[0]
assert.ok(candidateBody, 'Candidate findings body rows remain present below the sticky header')
assert.doesNotMatch(candidateBody, /(?:^|\s)(?:sticky|z-(?:\[\d+\]|\d+))(?:\s|$)/,
  'Candidate body rows do not create a stacking layer above their sticky header')
assert.ok(stickyHeaderZIndex > 0, 'Candidate sticky header stacks above its unstacked body rows')
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
