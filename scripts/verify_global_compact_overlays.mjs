import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const cbdPage = read('../src/features/cost-breakdown/CostBreakdownPage.tsx')
const cbdPopover = read('../src/features/cost-breakdown/components/CostBreakdownPopover.tsx')
const masterHeader = read('../src/features/master-data/components/MasterDataWorkspaceHeader.tsx')
const prepareDataset = read('../src/features/master-data/components/MasterDataPrepareDatasetPopover.tsx')
const simulationPage = read('../src/features/simulation/SimulationPage.tsx')
const tooltip = read('../src/shared/ui/Tooltip.tsx')
const confirmModal = read('../src/shared/ui/ConfirmModal.tsx')

function snippet(source, expression, message) {
  const match = source.match(expression)
  assert.ok(match, message)
  return match[0]
}

function assertIntrinsicPanel(className, label) {
  assert.match(className, /\bw-max\b|\bmin-w-max\b/, `${label} uses intrinsic content sizing`)
  assert.match(className, /max-w-\[calc\(100vw-1rem\)\]/, `${label} is capped to the viewport`)
  assert.doesNotMatch(className, /(?:^|\s)w-(?:\d+|\[\d+(?:px|rem)\])(?:\s|$)/,
    `${label} has no arbitrary fixed width`)
  assert.doesNotMatch(className, /(?:^|\s)min-w-(?:\d+|\[[^\]]+\])(?:\s|$)/,
    `${label} has no numeric, arbitrary, or trigger-width minimum floor`)
}

const cbdRolePopover = snippet(cbdPage, /const ComparisonRolePopover:[\s\S]*?function isAvailableGap/, 'CBD role popover component exists')
const cbdRolePanelClass = cbdRolePopover.match(/panelClassName="([^"]+)"/)?.[1]
assert.ok(cbdRolePanelClass, 'CBD role menu declares its compact width strategy')
assert.match(cbdRolePanelClass, /w-max/, 'CBD role menu uses intrinsic width')
assert.doesNotMatch(cbdRolePanelClass, /(?:^|\s)(?:w|min-w)-\d+(?:\s|$)/,
  'CBD role menu has no arbitrary blank width')
assert.match(cbdRolePopover, /panelMinWidthMatchesTrigger/,
  'the Before/After selector opts into the local trigger-width exception')
assert.match(cbdPopover, /panelMinWidthMatchesTrigger\?: boolean/)
assert.match(cbdPopover, /panelMinWidthMatchesTrigger = false/,
  'all CBD popovers default to intrinsic sizing')
const triggerMinimum = cbdPopover.match(/panelElement\.style\.minWidth = panelMinWidthMatchesTrigger \? [^\n]+/)
assert.ok(triggerMinimum && /triggerBounds\.width/.test(triggerMinimum[0]) && /: ''/.test(triggerMinimum[0]),
  'only the opt-in CBD menu gets a trigger-width minimum')
assert.ok(cbdPopover.indexOf(triggerMinimum[0]) < cbdPopover.indexOf('const panelBounds = panelElement.getBoundingClientRect()'),
  'CBD measures the optional width floor before positioning')
assert.match(cbdPopover, /const panelWidth = panelBounds\.width/,
  'CBD popover positioning uses the measured width after any local minimum')
assert.doesNotMatch(cbdPopover, /panelBounds\.width\s*\|\|\s*triggerBounds\.width|Math\.max\([^\n]*triggerBounds\.width/,
  'CBD popovers do not force trigger width through a panel-width fallback')
assert.equal((cbdPopover.match(/triggerBounds\.width/g) ?? []).length, 2,
  'CBD uses trigger width only for the local minimum and centering')
assert.equal((cbdPage.match(/\bpanelMinWidthMatchesTrigger\b/g) ?? []).length, 1,
  'only the shared Before/After selector opts into the trigger-width exception')
const cbdPanelSource = snippet(cbdPopover, /<div\s+ref=\{panelRef\}[\s\S]*?className=\{`fixed[^`]*\}/, 'CBD popup panel source exists')
assert.match(cbdPanelSource, /max-w-\[calc\(100vw-1rem\)\]/,
  'CBD menu surface is limited to viewport width')
const cbdPositionSource = snippet(cbdPopover, /const positionPanel = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\)/, 'CBD popup positioning logic exists')
assert.match(cbdPositionSource, /centeredLeft = triggerBounds\.left \+ \(triggerBounds\.width - panelWidth\) \/ 2[\s\S]*Math\.max\(8, Math\.min\(centeredLeft, window\.innerWidth - panelWidth - 8\)\)/,
  'CBD menu centers on its trigger and clamps within both viewport edges')
assert.match(cbdPositionSource, /const below = triggerBounds\.bottom \+ 4[\s\S]*const above = triggerBounds\.top - panelHeight - 4[\s\S]*const top = below \+ panelHeight <= window\.innerHeight - 8[\s\S]*Math\.min\(below, window\.innerHeight - panelHeight - 8\)[\s\S]*: above/,
  'CBD menu keeps its below/above placement and viewport-height correction')

for (const label of ['Status', 'Sort']) {
  const menu = snippet(cbdPage, new RegExp(`label="${label}"[\\s\\S]*?<\\/CostBreakdownPopover>`), `CBD ${label} menu exists`)
  const className = menu.match(/panelClassName="([^"]+)"/)?.[1]
  assert.ok(className, `CBD ${label} declares a menu width strategy`)
  assert.match(className, /w-max/, `CBD ${label} menu uses intrinsic content sizing`)
  assert.doesNotMatch(className, /(?:^|\s)(?:w|min-w)-\d+(?:\s|$)/,
    `CBD ${label} has no arbitrary empty width`)
}

const masterCloneMenu = snippet(masterHeader, /id="clone-source-menu"[\s\S]*?className="([^"]+)"/, 'Master Data Clone menu exists')
const masterCloneClass = masterCloneMenu.match(/className="([^"]+)"/)?.[1]
assert.ok(masterCloneClass)
assertIntrinsicPanel(masterCloneClass, 'Master Data Clone menu')
assert.doesNotMatch(masterHeader, /\bminWidth\b|triggerBounds\.width|trigger\.width/,
  'Master Data Clone has no inline trigger-width floor')
const masterOffsetSource = snippet(masterHeader, /const useCenteredPopoverOffset = \([\s\S]*?\n\}/, 'Master Data popover viewport offset hook exists')
assert.match(masterHeader, /cloneHorizontalOffset = useCenteredPopoverOffset\(cloneMenuOpen, cloneMenuRef\)/,
  'Master Data Clone menu tracks its viewport correction offset')
assert.match(masterOffsetSource, /left < 8[\s\S]*right > window\.innerWidth - 8/,
  'Master Data Clone menu clamps against both viewport edges')
assert.match(masterCloneMenu, /left-1\/2[\s\S]*-translate-x-1\/2/,
  'Master Data Clone menu is centered on its trigger before clamping')

const masterBulkMenu = snippet(masterHeader, /className="absolute left-1\/2 top-full z-50 mt-1 min-w-max[^\"]*"/, 'Master Data all-dataset menu exists')
assert.match(masterBulkMenu, /min-w-max/, 'Master Data all-dataset menu sizes to its command text')
assert.doesNotMatch(masterBulkMenu, /(?:^|\s)(?:w|min-w)-\d+(?:\s|$)/,
  'Master Data all-dataset menu has no arbitrary fixed width')
assert.match(masterHeader, /const toolbarButton = 'grid h-8 w-8/,
  'Master Data icon action trigger establishes the 32px trigger minimum')

const simulationRoleSelector = snippet(simulationPage, /function ComparisonRoleSelector\([\s\S]*?\nfunction CompactActionControl/, 'Simulation Before/After role selectors exist')
const simulationRoleMenuClass = simulationRoleSelector.match(/className="([^"]*w-max[^"]*)"/)?.[1]
assert.ok(simulationRoleMenuClass, 'Simulation role selector menu declares intrinsic width')
assert.match(simulationRoleMenuClass, /max-w-\[calc\(100vw-1rem\)\]/,
  'Simulation role selector menu is capped to the viewport')
assert.match(simulationRoleMenuClass, /\bw-max\b/,
  'Simulation Before/After menus use intrinsic content width')
assert.match(simulationRoleMenuClass, /\bp-1\b/,
  'Simulation role menus keep the established compact panel padding')
assert.doesNotMatch(simulationRoleMenuClass, /\bmin-w-/,
  'Simulation Before/After menus do not inherit their trigger width as a minimum')
assert.match(simulationRoleSelector, /block min-h-8 w-full px-2 text-left/,
  'Simulation role options keep only their normal horizontal content padding')
assert.doesNotMatch(simulationRoleMenuClass, /(?:^|\s)w-(?:\d+|\[\d+(?:px|rem)\])(?:\s|$)/,
  'Simulation role selector menu has no arbitrary fixed width')
assert.match(simulationRoleSelector, /w-\[112px\].*h-8|h-8.*w-\[112px\]/,
  'Simulation role selector triggers use an equal stable width and remain 32px high')
assert.match(simulationRoleSelector, /whitespace-nowrap/,
  'Simulation role selector labels remain on one line')
assert.doesNotMatch(simulationRoleSelector, /className="truncate"/,
  'Simulation role selector labels cannot display with ellipses')
assert.match(simulationRoleSelector, /<Tooltip label=\{side\}>/,
  'Simulation role selector tooltips expose only Before or After')
assert.doesNotMatch(simulationRoleSelector, /flex min-w-0 flex-col|text-\[9px\].*side/,
  'Simulation role selector triggers do not show a two-line side label')
assert.doesNotMatch(simulationRoleSelector, /\bminWidth\b|Math\.max\([^\n]*trigger\.width/,
  'Simulation role selector has no JavaScript trigger-width floor')
assert.equal((simulationRoleSelector.match(/trigger\.width/g) ?? []).length, 1,
  'Simulation role selector uses trigger width only for centering')
assert.match(simulationRoleSelector, /setTimeout\(preview, 120\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*\}, 150\)/,
  'Simulation role selector keeps the approved hover-open delay and leave grace')
assert.match(simulationRoleSelector, /if \(pinnedRef\.current\) close\(\)[\s\S]*pinnedRef\.current = true/,
  'Simulation role selector click pins and unpins the open popover')
assert.match(simulationRoleSelector, /Math\.max\(8, Math\.min\(centeredLeft, window\.innerWidth - menu\.width - 8\)\)/,
  'Simulation role selector menu centers on its trigger and clamps horizontally')
assert.match(simulationRoleSelector, /top \+ menu\.height > window\.innerHeight - 8[\s\S]*Math\.max\(8, trigger\.top - menu\.height\)/,
  'Simulation role selector menu flips above the trigger when it would exceed the viewport')
assert.match(simulationRoleSelector, /left-1\/2 top-full[\s\S]*-translate-x-1\/2/,
  'Simulation role selector menu uses trigger-centered placement before viewport correction')

const simulationActionControl = snippet(simulationPage, /function CompactActionControl\([\s\S]*?\nfunction EffectCell/, 'Simulation compact Send/Reset actions exist')
const simulationActionMenuClass = simulationActionControl.match(/className="([^"]*min-w-max[^"]*)"/)?.[1]
assert.ok(simulationActionMenuClass, 'Simulation action menu declares intrinsic width')
assertIntrinsicPanel(simulationActionMenuClass, 'Simulation Send/Reset action menu')
assert.equal((simulationActionControl.match(/trigger\.width/g) ?? []).length, 1,
  'Simulation action menu uses trigger width only for centering')
assert.match(simulationActionControl, /Math\.max\(8, Math\.min\(centeredLeft, window\.innerWidth - menu\.width - 8\)\)/,
  'Simulation action menu centers on its trigger and clamps horizontally')
assert.match(simulationActionControl, /const below = trigger\.bottom \+ 4[\s\S]*const above = trigger\.top - menu\.height - 4[\s\S]*const top = below \+ menu\.height <= window\.innerHeight - 8[\s\S]*Math\.min\(below, window\.innerHeight - menu\.height - 8\)[\s\S]*: above/,
  'Simulation action menu flips above the trigger when it would exceed the viewport')
assert.match(simulationActionControl, /onClick=\{\(\) => \{ close\(\); onPrimary\(\) \}\}[\s\S]*onKeyDown=\{event => \{[\s\S]*Alt\+ArrowDown/,
  'Simulation action main click stays immediate and keyboard users can open the secondary action')
assert.match(simulationActionControl, /setTimeout\(\(\) => setOpen\(true\), 120\)[\s\S]*\}, 150\)/,
  'Simulation action menu follows the approved delayed hover/leave behavior')
assert.match(simulationActionControl, /aria-label=\{tooltipLabel\}[\s\S]*aria-describedby=\{helpId\}[\s\S]*className=\{resultActionButton\}/,
  'Simulation action trigger is icon-only, named, described, and keyboard-focusable')
assert.doesNotMatch(simulationActionControl, /More .* actions|<ChevronDown/,
  'Simulation action control has no permanent split-button chevron')
assert.match(simulationActionControl, /hidden=\{!open\}[\s\S]*\{secondaryLabel\}/,
  'Simulation all-dataset action stays in the compact secondary menu')

assert.match(tooltip, /max-w-\[calc\(100vw-1rem\)\]/,
  'shared tooltips cannot exceed the viewport width')
assert.match(tooltip, /bounds\.left \+ \(bounds\.width - width\) \/ 2[\s\S]*window\.innerWidth - width - 8/,
  'shared tooltip positions center above or below the trigger while clamping horizontally')

const preparePanel = snippet(prepareDataset, /id="prepare-dataset-panel"[\s\S]*?className="([^\"]+)"/, 'Prepare Dataset structured warning panel exists')
assert.match(preparePanel, /w-\[min\(19rem,calc\(100vw-2rem\)\)\]/,
  'structured Prepare Dataset warning panel keeps its intentional bounded multi-column width')
assert.match(prepareDataset, /datasetSummaryColumns|grid shrink-0 grid-cols-1 divide-y/,
  'Prepare Dataset warning panel remains a structured multi-column status surface')

if (/w-max max-w-\[min\(28rem,calc\(100vw-2rem\)\)\]/.test(confirmModal)) {
  assert.match(confirmModal, /w-max max-w-\[min\(28rem,calc\(100vw-2rem\)\)\]/,
    'the compact ConfirmModal fits content within a responsive maximum')
  assert.match(confirmModal, /id="confirm-modal-title" className="break-words/,
    'ConfirmModal title wraps instead of expanding its surface')
  assert.match(confirmModal, /id="confirm-modal-message" className="mt-3 min-w-0 break-words/,
    'ConfirmModal message wraps inside narrow viewports')
  assert.match(confirmModal, /flex flex-wrap items-center justify-end gap-2\.5/,
    'ConfirmModal actions wrap when available width is limited')
}

console.log('Global compact overlay source contracts: PASS (CBD, Master Data, Simulation, shared Tooltip, structured-panel exception, and responsive ConfirmModal)')
console.log('Verification type: source contracts only; no browser interaction was run.')
