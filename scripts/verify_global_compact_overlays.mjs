import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const cbdPage = read('../src/features/cost-breakdown/CostBreakdownPage.tsx')
const cbdPopover = read('../src/features/cost-breakdown/components/CostBreakdownPopover.tsx')
const masterHeader = read('../src/features/master-data/components/MasterDataWorkspaceHeader.tsx')
const prepareDataset = read('../src/features/master-data/components/MasterDataPrepareDatasetPopover.tsx')
const simulationPage = read('../src/features/simulation/SimulationPage.tsx')
const sharedRoleSelector = read('../src/shared/ui/ComparisonRoleSelector.tsx')
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

assert.match(cbdPage, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/,
  'CBD imports the canonical shared comparison selector')
assert.match(simulationPage, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/,
  'Simulation imports the same canonical shared comparison selector')
assert.doesNotMatch(cbdPage, /ComparisonRolePopover|COMPARISON_ROLES\.filter/,
  'CBD no longer keeps a duplicate Before/After interaction implementation')
assert.doesNotMatch(simulationPage, /function ComparisonRoleSelector\(/,
  'Simulation no longer keeps a duplicate Before/After interaction implementation')
const sharedTrigger = sharedRoleSelector.match(/className="([^"]*w-\[96px\][^"]*)"/)?.[1] ?? ''
assert.match(sharedTrigger, /h-8/, 'shared selectors use a fixed 96×32 trigger for every role')
assert.match(sharedTrigger, /whitespace-nowrap/, 'shared trigger labels remain on one line')
assert.doesNotMatch(sharedTrigger, /truncate/, 'shared trigger labels never show ellipses')
const sharedPanelClass = sharedRoleSelector.match(/className="([^"]*w-max[^"]*)"/)?.[1] ?? ''
assertIntrinsicPanel(sharedPanelClass, 'Shared Before/After role menu')
assert.match(sharedRoleSelector, /panel\.style\.minWidth = `\$\{triggerBounds\.width\}px`/,
  'shared popup minimum equals the 96px trigger and may grow intrinsically for longer content')
assert.match(sharedRoleSelector, /COMPARISON_ROLES\.filter\(option => option !== role\)/,
  'each shared selector excludes only its own selected role')
assert.match(sharedRoleSelector, /aria-label=\{`\$\{side\} dataset, \$\{COMPARISON_ROLE_LABELS\[role\]\}`\}/,
  'shared selector names include Before/After and the selected role')
assert.match(sharedRoleSelector, /setTimeout\(preview, 120\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*\}, 150\)/,
  'shared selector keeps the 120ms open and 150ms leave behavior')
assert.match(sharedRoleSelector, /ArrowDown[\s\S]*availableRoles\.length[\s\S]*event\.key === 'Home'[\s\S]*event\.key === 'End'/,
  'keyboard entry and navigation use only filtered visible roles')
assert.match(sharedRoleSelector, /window\.innerWidth - panelBounds\.width - 8/,
  'shared selector clamps its menu within horizontal viewport edges')
assert.match(sharedRoleSelector, /above = triggerBounds\.top - panelBounds\.height - 4[\s\S]*: above/,
  'shared selector flips above when there is insufficient room below')
assert.match(cbdPopover, /openExclusivePopover\(owner\.current, dismissWithoutFocus\)/,
  'CBD Status/Sort popovers share mutual exclusion with the extracted role selector')
assert.doesNotMatch(cbdPopover, /panelMinWidthMatchesTrigger|panelElement\.style\.minWidth/,
  'generic CBD Status/Sort intrinsic sizing remains unchanged')
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
