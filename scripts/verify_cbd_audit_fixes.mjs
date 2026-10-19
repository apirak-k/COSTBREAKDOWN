import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const readSource = path => readFileSync(resolve(process.cwd(), path), 'utf8')
const appSource = readSource('src/App.tsx')
const storeSource = readSource('src/state/store.tsx')
const pairSource = readSource('src/state/cost-breakdown-comparison.ts')
const pageSource = readSource('src/features/cost-breakdown/CostBreakdownPage.tsx')
const itemizedSource = readSource('src/features/cost-breakdown/components/ItemizedComparisonTable.tsx')

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] },
  plugins: [{
    name: 'cbd-audit-verifier-store-stub',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../../state'
        && importer?.replaceAll('\\', '/').endsWith('/src/features/cost-breakdown/CostBreakdownPage.tsx')) {
        return '\0cbd-audit-verifier-store'
      }
      return null
    },
    load(id) {
      return id === '\0cbd-audit-verifier-store'
        ? 'export const useAppStore = () => globalThis.__CBD_AUDIT_TEST_STORE__'
        : null
    }
  }]
})

try {
  const [{ GapContributionChart }, pairState, reorderHistory, tableState] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx'),
    vite.ssrLoadModule('/src/state/cost-breakdown-comparison.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/candidate-reorder-history.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
  ])

  // Navigation and invalidation are checked against the rendered source wiring because this
  // repository has no installed DOM interaction harness. The chart itself is server rendered.
  assert.match(appSource,
    /const \[hasVisitedCostBreakdown, setHasVisitedCostBreakdown\] = useState\(activeTab === 'breakdown'\)/,
    'Cost Breakdown records its first visit so local page state can survive tab changes')
  assert.match(appSource,
    /if \(activeTab === 'breakdown'\) setHasVisitedCostBreakdown\(true\)/,
    'opening Cost Breakdown marks it as visited')
  assert.match(appSource,
    /\{\(activeTab === 'breakdown' \|\| hasVisitedCostBreakdown\) && \([\s\S]*?<div hidden=\{activeTab !== 'breakdown'\}>[\s\S]*?<CostBreakdownPage/,
    'after first visit the Cost Breakdown page stays mounted inside a tab-hidden wrapper')

  const setActiveTabSource = storeSource.match(/const setActiveTab = \(tab: ActiveTab\) => \{[\s\S]*?\n  \}/)?.[0]
  assert.ok(setActiveTabSource, 'the store exposes an explicit tab navigation action')
  assert.match(setActiveTabSource, /setActiveTabState\(tab\)/, 'tab navigation changes the active tab')
  assert.doesNotMatch(setActiveTabSource, /setSelectedComparisonScope\(null\)/,
    'tab navigation does not clear Selected Comparison')
  assert.doesNotMatch(setActiveTabSource, /setComparison(?:Before|After)\(/,
    'tab navigation does not reset the Before/After pair')
  assert.match(storeSource, /const \[comparisonBefore, setComparisonBefore\] = useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_BEFORE\)/,
    'the Before role remains in in-memory application state')
  assert.match(storeSource, /const \[comparisonAfter, setComparisonAfter\] = useState<MasterDataRole>\(DEFAULT_CBD_COMPARISON_AFTER\)/,
    'the After role remains in in-memory application state')
  assert.match(pageSource, /const \[typeTab, setTypeTab\] = useState<ItemizedTypeTab>\('all'\)/,
    'the BOM/RTG/ALL tab remains local to the mounted Cost Breakdown page')
  assert.match(pageSource, /const \[comparisonView, setComparisonView\] = useState<ComparisonViewMode>\(ALL_COMPARISON_STATUSES\)/,
    'the Status filter remains local to the mounted Cost Breakdown page')
  assert.match(pageSource, /const \[sortMode, setSortMode\] = useState<ComparisonSortMode>\(DEFAULT_COMPARISON_SORT_MODE\)/,
    'the Sort mode remains local to the mounted Cost Breakdown page')
  assert.match(pageSource, /const \[isOverviewExpanded, setIsOverviewExpanded\] = useState\(true\)/,
    'the overview collapse state remains local to the mounted Cost Breakdown page')

  const reorderResetEffect = appSource.match(
    /useEffect\(\(\) => \{\s*const previous = lastCandidateHistoryContextRef\.current[\s\S]*?\}, \[activeProductId, comparisonPair\.fingerprint\]\)/
  )?.[0]
  assert.ok(reorderResetEffect, 'candidate reorder history has a context reconciliation effect')
  assert.match(reorderResetEffect, /previous\.activeProductId !== activeProductId/,
    'changing products resets candidate reorder history')
  assert.match(reorderResetEffect, /previous\.comparisonFingerprint !== comparisonPair\.fingerprint/,
    'changing the CBD pair or its source data resets candidate reorder history')
  assert.doesNotMatch(reorderResetEffect, /activeTab/,
    'ordinary tab navigation preserves candidate reorder history')

  assert.match(storeSource, /selectedComparisonScope\?\.pairFingerprint === comparisonPair\.fingerprint/,
    'Selected Comparison is active only for its original comparison fingerprint')
  assert.match(storeSource,
    /if \(selectedComparisonScope && !activeSelectedComparisonScope\) setSelectedComparisonScope\(null\)/,
    'a stale Selected Comparison is cleared after its fingerprint no longer matches')
  assert.match(pageSource, /<ItemizedComparisonTable\s+key=\{comparisonPair\.fingerprint\}/,
    'pair or source changes remount candidate details and discard stale expanded rows')
  const detailOutsideClickHandler = itemizedSource.match(
    /const handlePointerDown = \(event: PointerEvent\) => \{[\s\S]*?\n    \}/
  )?.[0]
  assert.ok(detailOutsideClickHandler, 'expanded candidate details have an outside-click handler')
  assert.match(detailOutsideClickHandler,
    /if \(event\.target instanceof Element && event\.target\.closest\('nav\[aria-label="Main navigation"\]'\)\) return/,
    'clicks inside Main navigation preserve expanded candidate details')
  assert.match(pairSource, /fingerprint: JSON\.stringify\(\[beforeRole, afterRole, before, after\]\)/,
    'the comparison fingerprint covers both role identities and both current source snapshots')

  const snapshot = (id, sourceRef, productCode, bom = []) => ({
    id,
    sourceRef,
    product: { productCode, productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    status: 'draft',
    bom,
    routing: [],
    rates: []
  })
  const reference = snapshot('reference', 'source-reference', 'AUDIT-PRODUCT')
  const current = snapshot('current', 'source-current', 'AUDIT-PRODUCT')
  const custom = snapshot('custom', 'source-custom', 'AUDIT-PRODUCT')
  const snapshots = { reference, current, custom }
  const baseFingerprint = pairState.createCostBreakdownComparisonPair(snapshots, 'reference', 'current').fingerprint
  assert.notEqual(
    pairState.createCostBreakdownComparisonPair(snapshots, 'current', 'reference').fingerprint,
    baseFingerprint,
    'reversing Before and After invalidates pair context')
  assert.notEqual(
    pairState.createCostBreakdownComparisonPair({ reference, current: reference, custom: reference }, 'reference', 'current').fingerprint,
    pairState.createCostBreakdownComparisonPair({ reference, current: reference, custom: reference }, 'reference', 'custom').fingerprint,
    'changing role identity invalidates pair context even for equal snapshot values')
  assert.notEqual(
    pairState.createCostBreakdownComparisonPair({ ...snapshots, reference: { ...reference, sourceRef: 'source-reference-updated' } }, 'reference', 'current').fingerprint,
    baseFingerprint,
    'changing a source reference invalidates pair context')
  assert.notEqual(
    pairState.createCostBreakdownComparisonPair({ ...snapshots, reference: { ...reference, product: { ...reference.product, productCode: 'AUDIT-PRODUCT-2' } } }, 'reference', 'current').fingerprint,
    baseFingerprint,
    'changing the active product snapshot invalidates pair context')

  const zeroExpanded = tableState.toggleCandidateDetail(new Set(), 'bom', 'finding-1')
  assert.ok(zeroExpanded.has(tableState.candidateDetailKey('bom', 'finding-1')),
    'candidate detail fixture uses the table’s real expansion key')
  assert.ok(tableState.toggleCandidateDetail(zeroExpanded, 'bom', 'finding-1').size === 0,
    'candidate detail state can be cleared when its fingerprint-keyed table is remounted')
  const reordered = reorderHistory.recordCandidateReorder(
    reorderHistory.createCandidateReorderHistory(), 'bom', ['finding-2', 'finding-1'])
  assert.deepEqual(reordered.manualOrders.bom, ['finding-2', 'finding-1'],
    'reorder history fixture records a manual order before context changes')
  assert.deepEqual(reorderHistory.resetCandidateReorderHistory(), {
    manualOrders: { bom: null, routing: null }, undo: [], redo: []
  }, 'pair and product invalidation returns reorder history to its clean state')

  const chartSegments = (values) => [
    { key: 'material', label: 'Material', full: values[0], selected: null, color: '#f59e0b' },
    { key: 'labor', label: 'Labor', full: values[1], selected: null, color: '#3b82f6' },
    { key: 'burden', label: 'Burden', full: values[2], selected: null, color: '#8b5cf6' }
  ]
  const renderChart = (values, fullTotal) => renderToStaticMarkup(React.createElement(GapContributionChart, {
    segments: chartSegments(values),
    fullTotal,
    selectedTotal: null,
    selectedActive: false,
    directionLabel: 'After − Before'
  }))
  const count = (markup, pattern) => [...markup.matchAll(pattern)].length

  const zeroMarkup = renderChart([0, 0, 0], 0)
  assert.match(zeroMarkup, /data-gap-chart-mode="empty"/, 'three exact zero gaps render in empty mode')
  assert.match(zeroMarkup, /data-gap-empty-track="true"[^>]*width="1000"[^>]*fill="#e2e8f0"/,
    'three exact zero gaps retain a full-width neutral empty track')
  assert.equal(count(zeroMarkup, /data-full-gap-segment=/g), 0,
    'empty mode has no colored full-gap contribution segments')
  assert.equal(count(zeroMarkup, /data-selected-overlay=/g), 0,
    'empty mode has no selected contribution overlays')
  assert.match(zeroMarkup, /role="img"[^>]*data-gap-chart-mode="empty"[^>]*class="h-8 w-full overflow-hidden"/,
    'empty mode retains the full-height, full-width accessible chart footprint')
  assert.match(zeroMarkup, /viewBox="0 0 1000 32"/, 'empty mode retains the chart canvas dimensions')

  const offsettingMarkup = renderChart([10, -6, -4], 0)
  assert.match(offsettingMarkup, /data-gap-chart-mode="signed"/,
    'offsetting nonzero element gaps remain in signed mode when their total is zero')
  assert.equal(count(offsettingMarkup, /data-full-gap-segment=/g), 3,
    'offsetting gaps retain all three colored contribution segments')
  const signedWidths = [...offsettingMarkup.matchAll(/data-segment-width="([^"]+)"/g)].map(([, value]) => Number(value))
  assert.equal(signedWidths.length, 3, 'signed mode retains all three element segments')
  assert.ok(signedWidths.every(width => Number.isFinite(width) && width > 0),
    'positive and negative contributions each retain a visible nonzero width')

  const unavailableMarkup = renderChart([null, 1, 0], null)
  assert.match(unavailableMarkup, /data-gap-chart-mode="unavailable"/,
    'a comparison with an unavailable element gap stays in unavailable mode')
  assert.equal(count(unavailableMarkup, /data-full-gap-segment=/g), 3,
    'unavailable mode keeps its existing segmented footprint')

  console.log('CBD audit verifier: PASS (navigation and stale-context source contracts; zero-gap, offsetting, and unavailable chart SSR cases)')
  console.log('[Unverified] Navigation persistence was checked through source contracts; no DOM interaction harness is installed.')
} finally {
  await vite.close()
}
