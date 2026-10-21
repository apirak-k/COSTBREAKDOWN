import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] },
  plugins: [{
    name: 'cbd-comparison-pair-test-store',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../../state'
        && importer?.replaceAll('\\', '/').endsWith('/src/features/cost-breakdown/CostBreakdownPage.tsx')) {
        return '\0cbd-comparison-pair-test-store'
      }
      return null
    },
    load(id) {
      return id === '\0cbd-comparison-pair-test-store'
        ? 'export const useAppStore = () => globalThis.__CBD_PHASE2_TEST_STORE__'
        : null
    }
  }]
})

const closeTo = (actual, expected, message) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9,
  message ?? `expected ${actual} to be within 1e-9 of ${expected}`
)
const clone = value => JSON.parse(JSON.stringify(value))
const visibleText = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

try {
  const [{ seedSnapshotPair }, core, pairState, { SelectedValueProvider }] = await Promise.all([
    vite.ssrLoadModule('/src/state/seed-data.ts'),
    vite.ssrLoadModule('/src/core/index.ts'),
    vite.ssrLoadModule('/src/state/cost-breakdown-comparison.ts'),
    vite.ssrLoadModule('/src/shared/ui/selected-value.tsx')
  ])
  const renderWithSelectedValueProvider = element => renderToStaticMarkup(
    React.createElement(SelectedValueProvider, { scopeKey: 'cbd-comparison-pair-verifier' }, element)
  )
  const {
    compareSnapshots,
    createSelectedSnapshotPair,
    getCanonicalComparisonStatus,
    getComparisonFindingKey
  } = core
  const {
    createCostBreakdownComparisonPair,
    toSnapshotPair,
    DEFAULT_CBD_COMPARISON_BEFORE,
    DEFAULT_CBD_COMPARISON_AFTER
  } = pairState

  assert.equal(DEFAULT_CBD_COMPARISON_BEFORE, 'reference', 'the default Before role is Reference')
  assert.equal(DEFAULT_CBD_COMPARISON_AFTER, 'current', 'the default After role is Current')

  const referenceBase = clone(seedSnapshotPair.reference.bom[0])
  const removedOnly = { ...clone(referenceBase), id: 'phase2-removed', description: 'Phase 2 removed material', consumption: 1, price: 5, loss: 0 }
  const sharedBefore = { ...referenceBase, id: 'phase2-shared-before', description: 'Phase 2 shared material', consumption: 1, price: 10, loss: 0 }
  const sharedCurrent = { ...sharedBefore, id: 'phase2-shared-current', price: 15 }
  const sharedCustom = { ...sharedBefore, id: 'phase2-shared-custom', price: 20 }
  const addedOnly = { ...clone(referenceBase), id: 'phase2-added', description: 'Phase 2 added material', consumption: 1, price: 7, loss: 0 }
  const customOnly = { ...clone(referenceBase), id: 'phase2-custom-only', description: 'Phase 2 custom-only material', consumption: 1, price: 3, loss: 0 }
  const routeTemplate = clone(seedSnapshotPair.reference.routing[0])
  const rateTemplate = clone(seedSnapshotPair.reference.rates.find(rate => rate.workCenterCode === 'Cutting'))

  const makeSnapshot = (role, laborRate, burdenRate, bom) => ({
    ...clone(seedSnapshotPair.reference),
    id: `phase2-${role}`,
    sourceRef: `phase2:${role}`,
    bom: clone(bom),
    routing: [{ ...routeTemplate, id: 'phase2-cutting', processName: 'Phase 2 Cutting', workCenterId: 'Cutting', manning: 1, capacity: 1, yield: 1 }],
    rates: [{ ...rateTemplate, id: `phase2-cutting-${role}`, laborRate, burdenRate }]
  })

  const masterDataSnapshots = {
    reference: makeSnapshot('reference', 10, 20, [sharedBefore, removedOnly]),
    current: makeSnapshot('current', 30, 40, [sharedCurrent, addedOnly]),
    custom: makeSnapshot('custom', 50, 60, [sharedCustom, addedOnly, customOnly])
  }
  const roles = ['reference', 'current', 'custom']
  const allPairs = []
  for (const beforeRole of roles) {
    for (const afterRole of roles) {
      const pair = createCostBreakdownComparisonPair(masterDataSnapshots, beforeRole, afterRole)
      allPairs.push(pair)
      assert.equal(pair.beforeRole, beforeRole)
      assert.equal(pair.afterRole, afterRole)
      assert.strictEqual(pair.before, masterDataSnapshots[beforeRole])
      assert.strictEqual(pair.after, masterDataSnapshots[afterRole])
      const enginePair = toSnapshotPair(pair)
      assert.strictEqual(enginePair.reference, pair.before, 'engine first argument maps to Before')
      assert.strictEqual(enginePair.current, pair.after, 'engine second argument maps to After')
      const comparison = compareSnapshots(enginePair.reference, enginePair.current)
      assert.ok(comparison, `${beforeRole} to ${afterRole} is a valid ordered pair`)
    }
  }
  assert.equal(allPairs.length, 9, 'all ordered pairs, including self-pairs, are available')
  assert.notEqual(
    createCostBreakdownComparisonPair(masterDataSnapshots, 'reference', 'current').fingerprint,
    createCostBreakdownComparisonPair(masterDataSnapshots, 'current', 'reference').fingerprint,
    'pair fingerprints preserve order'
  )
  const sameSnapshotRoles = { reference: masterDataSnapshots.reference, current: masterDataSnapshots.reference, custom: masterDataSnapshots.reference }
  assert.notEqual(
    createCostBreakdownComparisonPair(sameSnapshotRoles, 'reference', 'current').fingerprint,
    createCostBreakdownComparisonPair(sameSnapshotRoles, 'reference', 'custom').fingerprint,
    'pair fingerprints include selected role identities even when values are equal'
  )

  const compareRoles = (beforeRole, afterRole) => {
    const pair = createCostBreakdownComparisonPair(masterDataSnapshots, beforeRole, afterRole)
    return { pair, comparison: compareSnapshots(toSnapshotPair(pair).reference, toSnapshotPair(pair).current) }
  }
  const referenceToCurrent = compareRoles('reference', 'current').comparison
  const currentToReference = compareRoles('current', 'reference').comparison
  const currentToCustom = compareRoles('current', 'custom').comparison
  const customToCurrent = compareRoles('custom', 'current').comparison
  closeTo(referenceToCurrent.totalGap, 47, 'Reference → Current is After total cost minus Before total cost')
  closeTo(currentToReference.totalGap, -referenceToCurrent.totalGap, 'reversing Reference/Current reverses the gap')
  closeTo(currentToCustom.totalGap, 48, 'Current → Custom uses Custom costs after Current costs')
  closeTo(customToCurrent.totalGap, -currentToCustom.totalGap, 'reversing Current/Custom reverses the gap')
  closeTo(referenceToCurrent.currentCost.labor, 30, 'Current labor uses the Current rate')
  closeTo(referenceToCurrent.referenceCost.labor, 10, 'Reference labor uses the Reference rate')
  closeTo(compareRoles('reference', 'custom').comparison.currentCost.labor, 50, 'Reference → Custom uses Custom after-rates')
  closeTo(compareRoles('reference', 'custom').comparison.referenceCost.labor, 10, 'Reference → Custom uses Reference before-rates')
  closeTo(compareRoles('current', 'reference').comparison.referenceCost.labor, 30, 'Current → Reference uses Current before-rates')
  closeTo(compareRoles('current', 'reference').comparison.currentCost.labor, 10, 'Current → Reference uses Reference after-rates')

  for (const role of roles) {
    const { comparison } = compareRoles(role, role)
    closeTo(comparison.totalGap, 0, `${role} self-comparison has zero Standard Cost Gap`)
    for (const gap of Object.values(comparison.elementGaps)) closeTo(gap, 0, `${role} self-comparison has zero element gaps`)
    assert.ok([...comparison.bomFindings, ...comparison.routingFindings].every(finding =>
      getCanonicalComparisonStatus(finding) === 'UNCHANGED'
    ), `${role} self-comparison does not create Added or Removed records`)
  }

  const { SnapshotComparisonCard } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx')
  const referenceSelfComparison = compareRoles('reference', 'reference').comparison
  const referenceSelfMarkup = renderWithSelectedValueProvider(React.createElement(SnapshotComparisonCard, {
    comparison: referenceSelfComparison,
    gapDirection: 'Reference − Reference'
  }))
  const selfBody = referenceSelfMarkup.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1]
  assert.ok(selfBody, 'self-comparison renders the Cost Element body')
  const selfPercentages = [...selfBody.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(([row]) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)]
    return cells.at(-1)?.[1].replace(/<[^>]*>/g, '').trim()
  })
  assert.deepEqual(selfPercentages, ['—', '—', '—'], 'a zero full Gap keeps element %GAP unavailable')
  assert.doesNotMatch(referenceSelfMarkup, /NaN|Infinity/, 'self-comparison never exposes non-finite percentage output')

  const addedForward = referenceToCurrent.bomFindings.find(finding => finding.currentId === 'phase2-added')
  const removedForward = referenceToCurrent.bomFindings.find(finding => finding.referenceId === 'phase2-removed')
  assert.equal(getCanonicalComparisonStatus(addedForward), 'ADDED', 'After-only is ADDED')
  assert.equal(getCanonicalComparisonStatus(removedForward), 'REMOVED', 'Before-only is REMOVED')
  const addedReverse = currentToReference.bomFindings.find(finding => finding.referenceId === 'phase2-added')
  const removedReverse = currentToReference.bomFindings.find(finding => finding.currentId === 'phase2-removed')
  assert.equal(getCanonicalComparisonStatus(addedReverse), 'REMOVED', 'reversing the pair makes the former After-only record REMOVED')
  assert.equal(getCanonicalComparisonStatus(removedReverse), 'ADDED', 'reversing the pair makes the former Before-only record ADDED')

  const beforeAfterPair = compareRoles('reference', 'current').pair
  const sharedFinding = referenceToCurrent.bomFindings.find(finding =>
    finding.referenceId === 'phase2-shared-before' && finding.currentId === 'phase2-shared-current'
  )
  assert.equal(getCanonicalComparisonStatus(sharedFinding), 'CHANGED')
  closeTo(sharedFinding.costGap, 5, 'matched BOM cost delta is After minus Before')
  const selection = { bomFindingKeys: [getComparisonFindingKey('bom', sharedFinding)], routingFindingKeys: [] }
  const selectedPair = createSelectedSnapshotPair(toSnapshotPair(beforeAfterPair), referenceToCurrent, selection)
  const selectedComparison = compareSnapshots(selectedPair.reference, selectedPair.current)
  closeTo(selectedComparison.elementGaps.material, 5, 'Selected Comparison recalculates material on the active Before/After pair')
  const { getSelectedComparisonContribution } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts')
  const selectedContribution = getSelectedComparisonContribution(referenceToCurrent, selectedComparison, selection)
  closeTo(selectedContribution.elementGaps.material, 5, 'selected contribution overlays the active pair\'s finding gap')
  closeTo(selectedContribution.totalGap, 5, 'selected contribution uses the full active pair as its scope')

  const storeSource = readFileSync('src/state/store.tsx', 'utf8')
  const pageSource = readFileSync('src/features/cost-breakdown/CostBreakdownPage.tsx', 'utf8')
  const appSource = readFileSync('src/App.tsx', 'utf8')
  const candidateSource = readFileSync('src/features/cost-breakdown/components/CandidateFindingsTable.tsx', 'utf8')
  const popoverSource = readFileSync('src/features/cost-breakdown/components/CostBreakdownPopover.tsx', 'utf8')
  const sharedSelectorSource = readFileSync('src/shared/ui/ComparisonRoleSelector.tsx', 'utf8')
  assert.match(storeSource, /useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_BEFORE\)/)
  assert.match(storeSource, /useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_AFTER\)/)
  assert.match(storeSource, /getMasterDataSnapshot\(activeSession, snapshotPair, 'custom'\)/, 'Custom source is latest Master Data Working')
  assert.match(storeSource, /selectedComparisonScope\?\.pairFingerprint === comparisonPair\.fingerprint/, 'selection invalidation uses role and value fingerprint')
  assert.match(storeSource, /createSelectedSnapshotPair\(engineComparisonPair, costBreakdownFullComparison/)
  assert.match(appSource, /previous\.comparisonFingerprint !== comparisonPair\.fingerprint[\s\S]*resetCandidateReorderHistory/)
  assert.match(pageSource, /key=\{comparisonPair\.fingerprint\}/, 'pair changes remount the candidate details state')
  assert.match(pageSource, /min-w-\[96px\] flex-1/, 'the Gap Bar remains flexible and usable beside selectors')
  assert.match(pageSource, /from '\.\.\/\.\.\/shared\/ui\/ComparisonRoleSelector'/,
    'CBD imports the shared Before/After selector')
  assert.match(sharedSelectorSource, /COMPARISON_ROLES\.filter\(option => option !== role\)/,
    'each selector menu shows the two alternatives to its own role')
  assert.match(sharedSelectorSource, /reference: 'Reference',[\s\S]*current: 'Current',[\s\S]*custom: 'Custom'/,
    'shared role selector content uses the full Reference, Current, and Custom names')
  assert.match(sharedSelectorSource, /aria-label=\{`\$\{side\} dataset, \$\{COMPARISON_ROLE_LABELS\[role\]\}`\}/,
    'the selector accessible name includes its semantic side and selected role')
  assert.match(sharedSelectorSource, /<Tooltip label=\{side\}>/,
    'the visible tooltip remains the exact Before or After side name')
  assert.match(popoverSource, /<Tooltip label=\{label\}>[\s\S]*aria-label=\{label\}/,
    'the shared popover forwards its exact label to both Tooltip and trigger accessible name')
  assert.match(sharedSelectorSource, /h-8 w-\[96px\]/,
    'both role triggers share a compact, stable 96px by 32px layout')
  const roleTriggerClass = sharedSelectorSource.match(/className="([^"]*w-\[96px\][^"]*)"/)?.[1] ?? ''
  for (const className of ['rounded-sm', 'border', 'border-slate-300', 'bg-white', 'px-2', 'hover:bg-slate-100', 'focus-visible:outline']) {
    assert.ok(roleTriggerClass.split(/\s+/).includes(className), 'role triggers include the required boxed selector styles')
  }
  assert.doesNotMatch(roleTriggerClass, /\bbg-transparent\b/, 'role triggers retain their white boxed surface')
  assert.doesNotMatch(sharedSelectorSource, /aria-pressed|optionRole === role|disabled=/,
    'role menus do not mark or disable any option')
  assert.match(sharedSelectorSource, /onChange\(optionRole\); close\(true\)/,
    'choosing any alternative applies it and closes the menu')
  assert.match(sharedSelectorSource, /w-max max-w-\[calc\(100vw-1rem\)\]/,
    'role menu grows to fit intrinsic option content')
  assert.match(sharedSelectorSource, /panel\.style\.minWidth = `\$\{triggerBounds\.width\}px`/,
    'popup minimum equals the actual trigger width and may grow for intrinsic content')
  assert.match(popoverSource, /showChevron = true[\s\S]*\{showChevron && <ChevronDown aria-hidden="true"/,
    'role triggers keep a visible ChevronDown beside their selected dataset label')
  assert.match(popoverSource, /const panelWidth = panelBounds\.width/,
    'generic CBD popovers position by their measured content width')
  assert.doesNotMatch(popoverSource, /panelBounds\.width\s*\|\|\s*triggerBounds\.width|Math\.max\([^\n]*triggerBounds\.width/,
    'CBD popovers do not force trigger width through a panel-width fallback')
  assert.equal((popoverSource.match(/triggerBounds\.width/g) ?? []).length, 1,
    'generic CBD popovers use trigger width only for centering')
  assert.doesNotMatch(popoverSource, /panelMinWidthMatchesTrigger|panelElement\.style\.minWidth/,
    'Status/Sort retain content-sized behavior without the selector minimum')
  assert.match(popoverSource, /const centeredLeft = triggerBounds\.left \+ \(triggerBounds\.width - panelWidth\) \/ 2[\s\S]*const left = Math\.max\(8, Math\.min\(centeredLeft, window\.innerWidth - panelWidth - 8\)\)/,
    'role menu stays centered and clamped to the viewport')
  assert.match(popoverSource, /const below = triggerBounds\.bottom \+ 4[\s\S]*const above = triggerBounds\.top - panelHeight - 4[\s\S]*const top = below \+ panelHeight <= window\.innerHeight - 8[\s\S]*Math\.min\(below, window\.innerHeight - panelHeight - 8\)[\s\S]*: above/,
    'role menu keeps its below/above placement and viewport-height correction')
  assert.match(candidateSource, /afterValue - beforeValue/, 'Candidate parameter deltas are After minus Before')
  assert.match(candidateSource, /if \(status === 'ADDED'\) \{[\s\S]*?rawValue = afterValue/,
    'ADDED main-row parameters inspect only the present After value')
  assert.match(candidateSource, /\} else if \(status === 'REMOVED'\) \{[\s\S]*?rawValue = beforeValue/,
    'REMOVED main-row parameters inspect only the present Before value')
  assert.doesNotMatch(candidateSource, /side: 'After'|side: 'Before'/,
    'main-row numeric values carry no visible role prefix')
  assert.match(candidateSource, /beforeRoleLabel=\{COMPARISON_ROLE_LABELS\[pair\.beforeRole\]\}/,
    'expanded details receive the selected Before role name')
  assert.match(candidateSource, /afterRoleLabel=\{COMPARISON_ROLE_LABELS\[pair\.afterRole\]\}/,
    'expanded details receive the selected After role name')
  assert.match(popoverSource, /setTimeout\(preview, 120\)/)
  assert.match(popoverSource, /\}, 150\)/)
  assert.match(popoverSource, /openExclusivePopover\(owner\.current, dismissWithoutFocus\)/, 'CBD popovers are mutually exclusive')

  const appModule = await vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx')
  const uiPair = createCostBreakdownComparisonPair(masterDataSnapshots, 'current', 'custom')
  globalThis.__CBD_PHASE2_TEST_STORE__ = {
    comparisonBefore: 'current',
    comparisonAfter: 'custom',
    comparisonPair: uiPair,
    setComparisonBefore() {},
    setComparisonAfter() {},
    costBreakdownFullComparison: currentToCustom,
    costBreakdownSelectedComparison: currentToCustom,
    selectedComparisonSelection: null,
    isSelectedComparisonActive: false,
    applySelectedComparison() {},
    clearSelectedComparison() {}
  }
  const ui = renderWithSelectedValueProvider(React.createElement(appModule.CostBreakdownPage, {
    manualOrders: { bom: null, routing: null },
    onManualOrderChange() {},
    onResetManualOrderHistory() {}
  }))
  assert.match(ui, /Standard Cost Gap[^>]*Gap = Custom − Current/)
  assert.match(ui, /Cost Element for Before, After, Gap, and Gap percentage/)
  assert.match(ui, />Before<\/th>[\s\S]*>After<\/th>/)
  assert.doesNotMatch(ui, /Before → After/)
  assert.match(ui, /CHANGED rows expand Current, Custom, and Parameter Cost Effect details/)
  assert.match(ui, /Gap = Custom − Current/)
  assert.doesNotMatch(ui, /Gap = CUR − REF|>REF<|>CUR<|Current minus Reference|Reference → Current/)
  const roleTriggers = [...ui.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .filter(([, attributes]) => /\baria-label="(?:Before|After) dataset, /.test(attributes))
  assert.equal(roleTriggers.length, 2, 'the rendered page exposes one semantic button for each role selector')
  for (const [side, visibleRole] of [['Before', 'Current'], ['After', 'Custom']]) {
    const matches = roleTriggers.filter(([, attributes]) => attributes.match(/\baria-label="([^"]+)"/)?.[1].startsWith(`${side} dataset, `))
    assert.equal(matches.length, 1, `${side} has exactly one button with that accessible name`)
    const [, attributes, content] = matches[0]
    assert.match(attributes, /h-8 w-\[96px\]/, `${side} uses the shared compact, stable trigger size`)
    assert.match(attributes, /bg-white/, `${side} uses a white boxed idle surface`)
    assert.match(attributes, /\bborder border-slate-300\b/, `${side} keeps the thin border and white field`)
    assert.equal(visibleText(content), visibleRole, `${side} visibly shows its selected dataset role`)
    assert.match(content, /lucide lucide-chevron-down/, `${side} visibly includes ChevronDown`)
  }
  assert.doesNotMatch(ui, /w-\[(?:108|112)px\]/, 'superseded role trigger widths are absent')

  console.log('Cost Breakdown generic Before/After comparison verifier: PASS (9 ordered pairs, direction, statuses, rates, self-comparisons, selected scope, selectors, labels, and pair-bound context)')
} finally {
  delete globalThis.__CBD_PHASE2_TEST_STORE__
  await vite.close()
}
