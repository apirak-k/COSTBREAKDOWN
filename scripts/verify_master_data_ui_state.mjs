import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const fixtureProduct = {
  productCode: 'MD-UI-01',
  productName: 'Master Data UI fixture',
  productDescription: 'Master Data UI fixture',
  uom: 'PC',
  customer: '',
  effectiveDate: '2026-01-01',
  sellingPrice: null,
  sgaPercent: null
}

const fixtureSnapshot = role => ({
  id: `fixture-${role}`,
  comparisonRole: role,
  status: 'draft',
  sourceRef: 'ui-state-verification',
  effectiveDate: fixtureProduct.effectiveDate,
  product: fixtureProduct,
  remark: '',
  rates: [],
  bom: [],
  routing: [],
  warnings: []
})

const componentStubs = new Map([
  ['\0master-data-ui-verifier-bom', `
    import React from 'react'
    export const BOMTable = () => React.createElement('div', { role: 'table', 'aria-label': 'BOM data' }, React.createElement('h3', null, 'Bill of Materials'), 'BOM data')
  `],
  ['\0master-data-ui-verifier-work-centers', `
    import React from 'react'
    export const WorkCenterRatesTable = () => React.createElement('div', { role: 'table', 'aria-label': 'Work Centers data' }, React.createElement('h3', null, 'Work Centers'), 'Work Centers data')
  `],
  ['\0master-data-ui-verifier-routing', `
    import React from 'react'
    export const RoutingTable = () => React.createElement('div', { role: 'table', 'aria-label': 'Routing data' }, React.createElement('h3', null, 'Routing'), 'Routing data')
  `],
  ['\0master-data-ui-verifier-import-modal', `export const ExcelImportModal = () => null`],
  ['\0master-data-ui-verifier-sizing-modal', `export const DatasetSizingModal = () => null`]
])

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] },
  plugins: [{
    name: 'master-data-ui-state-verification-stubs',
    enforce: 'pre',
    resolveId(source, importer) {
      const normalizedImporter = importer?.replaceAll('\\', '/') ?? ''
      if (source === '../../state' && [
        '/src/features/master-data/MasterDataPage.tsx',
        '/src/shared/layout/AppLayout.tsx',
        '/src/shared/layout/Navbar.tsx'
      ].some(path => normalizedImporter.endsWith(path))) {
        return '\0master-data-ui-verifier-store'
      }
      if (!normalizedImporter.endsWith('/src/features/master-data/MasterDataPage.tsx')) return null
      if (source === './components/BOMTable') return '\0master-data-ui-verifier-bom'
      if (source === './components/WorkCenterRatesTable') return '\0master-data-ui-verifier-work-centers'
      if (source === './components/RoutingTable') return '\0master-data-ui-verifier-routing'
      if (source === './components/ExcelImportModal') return '\0master-data-ui-verifier-import-modal'
      if (source === './components/DatasetSizingModal') return '\0master-data-ui-verifier-sizing-modal'
      return null
    },
    load(id) {
      if (id === '\0master-data-ui-verifier-store') {
        return 'export const useAppStore = () => globalThis.__MASTER_DATA_UI_TEST_STORE__'
      }
      return componentStubs.get(id) ?? null
    }
  }]
})

const noOp = () => {}
const headerSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataWorkspaceHeader.tsx'), 'utf8')
const tooltipComponentSource = readFileSync(resolve(process.cwd(), 'src/shared/ui/Tooltip.tsx'), 'utf8')
const {
  formatProductIdentityForDisplay,
  resolveHeaderProductContext,
  resolveProductComparisonDisplayStatus
} = await vite.ssrLoadModule('/src/shared/layout/header-product-context.ts')
assert.equal(resolveProductComparisonDisplayStatus({ productName: 'Part A', uom: 'PC' }, { productName: ' part a ', uom: ' pc ' }), 'match', 'complete normalized identities resolve to Product Match')
assert.equal(resolveProductComparisonDisplayStatus({ productName: 'Part A', uom: 'PC' }, { productName: 'Part B', uom: 'PC' }), 'mismatch', 'different complete identities resolve to Product Mismatch')
assert.equal(resolveProductComparisonDisplayStatus({ productName: '', uom: '' }, { productName: '', uom: '' }), 'not-set', 'two incomplete identities resolve to display-only Product Not Set')
assert.equal(resolveProductComparisonDisplayStatus({ productName: 'Part A', uom: '' }, { productName: 'Part A', uom: 'PC' }), 'not-set', 'a partially entered identity resolves to Product Not Set')
assert.equal(resolveHeaderProductContext({ productName: 'Part A', uom: 'PC' }, { productName: 'Part B', uom: 'PC' }), 'Product Mismatch')
assert.equal(resolveHeaderProductContext({ productName: '', uom: '' }, { productName: '', uom: '' }), 'Product Not Set')
assert.equal(formatProductIdentityForDisplay({ productName: '', uom: '' }), 'Not set')
assert.equal(formatProductIdentityForDisplay({ productName: '', uom: 'PC' }), 'Product name not set (PC)')
assert.equal(formatProductIdentityForDisplay({ productName: 'Part A', uom: '' }), 'Part A (UOM not set)')
const makeStore = (uiState = { role: 'current', mode: 'view', tableView: 'all' }, storeOverrides = {}) => {
  const snapshot = fixtureSnapshot(uiState.role)
  const snapshots = {
    reference: fixtureSnapshot('reference'),
    current: fixtureSnapshot('current'),
    custom: fixtureSnapshot('custom')
  }
  return {
    snapshotPair: { reference: snapshots.reference, current: snapshots.current },
    snapshotComparison: { totalGap: -999 },
    fullSnapshotComparison: {
      referenceCost: { total: 120 },
      currentCost: { total: 125.5 },
      totalGap: 5.5
    },
    activeTab: 'master',
    setActiveTab: noOp,
    isSelectedComparisonActive: true,
    masterDataSnapshots: snapshots,
    masterDataRole: uiState.role,
    masterDataSnapshot: snapshot,
    masterDataLastSavedSnapshot: undefined,
    masterDataLastSavedSnapshots: {},
    masterDataSizing: {},
    masterDataPrepareDatasetRequested: false,
    masterDataPrepareDatasetRequestMode: null,
    masterDataHandoff: {
      datasetsPrepared: false,
      referenceReady: false,
      currentReady: false,
      issues: [],
      warnings: [],
      productMismatch: false
    },
    masterDataUiState: uiState,
    canUndoMasterDataEdit: false,
    canRedoMasterDataEdit: false,
    undoMasterDataEdit: noOp,
    redoMasterDataEdit: noOp,
    setMasterDataRole: noOp,
    updateMasterDataUiState: noOp,
    requestMasterDataPrepareDataset: noOp,
    consumeMasterDataPrepareDatasetRequest: noOp,
    saveMasterDataWorkingDataset: noOp,
    resetMasterDataWorkingDataset: noOp,
    loadDevelopmentMockData: noOp,
    cloneMasterDataWorkspace: noOp,
    clearMasterDataDataset: noOp,
    updateMasterDataDatasetSizing: noOp,
    updateMasterDataProduct: noOp,
    updateMasterDataRemark: noOp,
    addMasterDataBOMItem: noOp,
    updateMasterDataBOMItems: noOp,
    deleteMasterDataBOMItems: noOp,
    reorderMasterDataBOMItems: noOp,
    addMasterDataRoutingStep: noOp,
    updateMasterDataRoutingSteps: noOp,
    deleteMasterDataRoutingSteps: noOp,
    reorderMasterDataRoutingSteps: noOp,
    addMasterDataWorkCenterRate: noOp,
    updateMasterDataWorkCenterRates: noOp,
    deleteMasterDataWorkCenterRates: noOp,
    reorderMasterDataWorkCenters: noOp,
    ...storeOverrides
  }
}

const pressedButton = (markup, label) => {
  const buttons = [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  const match = buttons.find(([, attributes, content]) => {
    const ariaLabel = attributes.match(/\baria-label="([^"]+)"/)?.[1]
    const text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    return ariaLabel === label || ariaLabel?.startsWith(`${label} —`) || text.toLowerCase() === label.toLowerCase()
  })
  assert.ok(match, `Expected an accessible button named "${label}"`)
  return /\baria-pressed="true"/.test(match[1])
}

const renderMasterDataPage = async (uiState, storeOverrides = {}) => {
  globalThis.__MASTER_DATA_UI_TEST_STORE__ = makeStore(uiState, storeOverrides)
  const { MasterDataPage } = await vite.ssrLoadModule('/src/features/master-data/MasterDataPage.tsx')
  return renderToStaticMarkup(React.createElement(MasterDataPage))
}

const renderAppLayout = async storeOverrides => {
  globalThis.__MASTER_DATA_UI_TEST_STORE__ = makeStore(undefined, storeOverrides)
  const { AppLayout } = await vite.ssrLoadModule('/src/shared/layout/AppLayout.tsx')
  return renderToStaticMarkup(React.createElement(
    AppLayout,
    {},
    React.createElement('div', null, 'Workspace content')
  ))
}

try {
  const { formatCurrency, formatNumber, formatPercent, formatVariance } = await vite.ssrLoadModule('/src/core/utils/formatters.ts')
  assert.equal(formatNumber(98.125, 4), '98.13', 'visible numbers cap at two decimals and round at the display boundary')
  assert.equal(formatNumber(98.1, 4), '98.1', 'visible numbers omit unnecessary trailing zeros')
  assert.equal(formatPercent(0.98125, 4), '98.13%', 'visible percentages use at most two decimals')
  assert.equal(formatCurrency(1.256, 4), '1.26 THB', 'visible currency uses at most two decimals')
  assert.equal(formatVariance(-1.256, 4), '-1.26', 'visible variance uses at most two decimals')
  assert.equal(formatNumber(Number.NaN), '—', 'non-finite values do not display as a fabricated zero')
  assert.equal(formatPercent(Number.NaN), '—', 'non-finite percentages do not show a misleading percent suffix')
  assert.equal(formatCurrency(Number.POSITIVE_INFINITY), '—', 'non-finite currency does not show a misleading unit suffix')
  assert.equal(formatVariance(Number.POSITIVE_INFINITY), '—', 'non-finite variance stays unavailable')

  const customMissingSnapshot = {
    ...fixtureSnapshot('custom'),
    bom: [{
      id: 'custom-missing-usage',
      description: 'Custom Material',
      consumption: null,
      price: 1,
      loss: 0,
      confidence: {}
    }]
  }
  const readyFooterMarkup = await renderAppLayout({
    snapshotPair: {
      reference: fixtureSnapshot('reference'),
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, productName: 'Master Data UI variant' } }
    },
    masterDataSnapshots: {
      reference: fixtureSnapshot('reference'),
      current: fixtureSnapshot('current'),
      custom: customMissingSnapshot
    },
    masterDataHandoff: {
      datasetsPrepared: true,
      referenceReady: true,
      currentReady: true,
      issues: [],
      warnings: [],
      productMismatch: true
    }
  })
  const footerMarkup = readyFooterMarkup.slice(readyFooterMarkup.indexOf('<footer'))
  assert.match(footerMarkup, /REF[\s\S]*BOM 0 · WC 0 · RTG 0[\s\S]*CUR[\s\S]*BOM 0 · WC 0 · RTG 0/, 'Footer renders Reference and Current structural counts in BOM/WC/RTG order')
  assert.doesNotMatch(footerMarkup, /Custom/, 'Footer does not include Custom in structural summaries')
  assert.match(footerMarkup, /Datasets Ready/, 'missing values in Custom do not change Reference/Current readiness')
  assert.match(footerMarkup, /rounded-full bg-blue-400"><\/span><span class="font-semibold text-blue-300">Datasets Ready/, 'Footer readiness has a blue dot and semibold blue text')
  const readinessTooltipStart = footerMarkup.indexOf('id="footer-dataset-status-tooltip"')
  const readinessTooltipEnd = footerMarkup.indexOf('id="footer-product-status-tooltip"', readinessTooltipStart)
  const readinessTooltipMarkup = footerMarkup.slice(readinessTooltipStart, readinessTooltipEnd)
  assert.match(readinessTooltipMarkup, /Reference[\s\S]*lucide-circle-x[\s\S]*0[\s\S]*Current[\s\S]*lucide-circle-x[\s\S]*0/, 'dataset status tooltip shows Reference and Current blocker icon/count rows only')
  assert.doesNotMatch(readinessTooltipMarkup, />(?:Ready|Incomplete)<\/span>/, 'dataset readiness tooltip does not repeat the global Ready/Incomplete status')
  assert.doesNotMatch(footerMarkup.match(/id="footer-dataset-status-tooltip"[\s\S]*?<\/span>/)?.[0] ?? '', /Custom/, 'dataset readiness tooltip omits Custom')
  assert.match(footerMarkup, /Product Mismatch/, 'Footer renders the existing Product Mismatch status independently')
  assert.match(footerMarkup, /class="inline-flex min-h-7 cursor-default select-none items-center gap-1\.5 whitespace-nowrap rounded-sm font-semibold[^\"]*text-violet-300"><span aria-hidden="true" class="h-1\.5 w-1\.5 rounded-full bg-violet-400"><\/span>Product Mismatch/, 'Footer Product Mismatch uses violet text and dot')
  assert.match(footerMarkup, /footer-product-status-tooltip[\s\S]*Reference[\s\S]*Master Data UI fixture \(PC\)[\s\S]*Current[\s\S]*Master Data UI variant \(PC\)/, 'Product tooltip names both datasets and their complete Product Name/UOM without defaults or a heading')
  const footerProductStatus = footerMarkup.slice(footerMarkup.indexOf('aria-label="Product Mismatch"') - 40, footerMarkup.indexOf('aria-label="Product Mismatch"') + 180)
  assert.doesNotMatch(footerProductStatus, /<button|onClick/, 'Footer Product status is informational and not clickable')
  assert.match(footerMarkup, /aria-label="Toggle Prepare Dataset showing 0 warnings"/, 'Footer warning total excludes Custom blockers and keeps the zero-count action available')
  assert.doesNotMatch(footerMarkup.slice(footerMarkup.indexOf('id="footer-warning-tooltip"'), footerMarkup.indexOf('aria-label="Toggle Prepare Dataset showing 0 warnings"')), /Missing required value/, 'Footer warning tooltip excludes blockers')
  assert.match(footerMarkup, /footer-dataset-status-tooltip[\s\S]*Reference[\s\S]*lucide-circle-x[\s\S]* 0[\s\S]*Current[\s\S]*lucide-circle-x[\s\S]* 0/, 'Footer readiness tooltip keeps Reference and Current blocker counts separate from warnings')
  assert.ok(footerMarkup.indexOf('REF STD') < footerMarkup.indexOf('CUR STD')
    && footerMarkup.indexOf('CUR STD') < footerMarkup.indexOf('NET GAP'), 'Footer cost summary orders Reference, Current, then Net Gap')
  assert.match(footerMarkup, /REF STD<\/span>120[\s\S]*CUR STD<\/span>125\.5[\s\S]*NET GAP<\/span><span class="font-semibold text-rose-300">\+5\.5<\/span><\/span><span class="ml-2 max-\[359px\]:basis-full max-\[359px\]:ml-0 max-\[359px\]:text-right cursor-default select-none font-sans font-bold text-slate-300">THB\/PC<\/span>/, 'Footer unit is bold and secondary, remains 20px away without a separator, and preserves narrow wrapping')
  assert.match(footerMarkup, /Full Reference and Current standard costs and net gap in THB\/PC/, 'Footer cost summary exposes the displayed unit to assistive technology')
  const matchingUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' kg ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'KG' } }
    }
  })
  const normalizedUomFooter = matchingUomFooter.slice(matchingUomFooter.indexOf('<footer'))
  assert.match(normalizedUomFooter, /THB\/kg/, 'matching UOM values are trimmed and compared case-insensitively while displaying Reference spelling')
  const differentUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: 'kg' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'PC' } }
    }
  })
  assert.match(differentUomFooter, /THB\/Unit/, 'different Reference and Current UOM values use the neutral Unit label')
  const blankUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'PC' } }
    }
  })
  assert.match(blankUomFooter, /THB\/PC/, 'the nonblank Current UOM is used when Reference UOM is blank')
  const referenceOnlyUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' PC ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: ' ' } }
    }
  })
  assert.match(referenceOnlyUomFooter, /THB\/PC/, 'the trimmed Reference UOM is used when Current UOM is blank')
  const bothBlankUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: '' } }
    }
  })
  assert.match(bothBlankUomFooter, /THB\/Unit/, 'two blank UOMs use the neutral Unit label')
  assert.doesNotMatch(footerMarkup, /SELECTED GAP|-999/, 'Selected Comparison values never leak into the global Footer')

  const referenceMissingSnapshot = {
    ...fixtureSnapshot('reference'),
    bom: [{
      id: 'reference-missing-usage',
      description: 'Reference Material',
      consumption: null,
      price: 1,
      loss: 0,
      confidence: {}
    }]
  }
  const incompleteFooterMarkup = await renderAppLayout({
    masterDataSnapshots: {
      reference: referenceMissingSnapshot,
      current: fixtureSnapshot('current'),
      custom: fixtureSnapshot('custom')
    },
    masterDataHandoff: {
      datasetsPrepared: true,
      referenceReady: true,
      currentReady: true,
      issues: [],
      warnings: [],
      productMismatch: false
    }
  })
  const incompleteFooter = incompleteFooterMarkup.slice(incompleteFooterMarkup.indexOf('<footer'))
  assert.match(incompleteFooter, /rounded-full bg-rose-400"><\/span><span class="font-semibold text-rose-300">Datasets Incomplete/, 'a Reference missing required value makes Footer readiness incomplete with a muted rose dot and text')

  const zeroWarningFooterMarkup = await renderAppLayout({
    snapshotPair: {
      reference: fixtureSnapshot('reference'),
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, productName: 'Different product' } }
    },
    masterDataHandoff: {
      datasetsPrepared: true,
      referenceReady: true,
      currentReady: true,
      issues: [],
      warnings: [],
      productMismatch: true
    }
  })
  const zeroWarningFooter = zeroWarningFooterMarkup.slice(zeroWarningFooterMarkup.indexOf('<footer'))
  assert.match(zeroWarningFooter, /<span class="font-mono tabular-nums">0<\/span>/, 'Footer keeps the zero-warning indicator visible')
  assert.doesNotMatch(zeroWarningFooter, /No warning items|Warnings<\/span>/, 'zero-warning tooltip does not invent a heading or placeholder row')
  const zeroWarningControl = zeroWarningFooter.match(/<button[^>]*aria-label="Toggle Prepare Dataset showing 0 warnings"[^>]*>/)?.[0] ?? ''
  assert.ok(zeroWarningControl, 'zero-warning indicator remains an accessible button')
  assert.match(zeroWarningControl, /text-slate-400/, 'zero-warning footer indicator uses neutral gray')
  assert.doesNotMatch(zeroWarningControl, /aria-describedby=/, 'zero-warning indicator does not reference a tooltip that is not rendered')
  assert.match(zeroWarningFooter, /Product Mismatch[\s\S]*<span class="font-mono tabular-nums">0<\/span>/, 'Product Mismatch does not add to the Footer warning total')

  const matchingFooterMarkup = await renderAppLayout({
    masterDataHandoff: {
      datasetsPrepared: true,
      referenceReady: true,
      currentReady: true,
      issues: [],
      warnings: [],
      productMismatch: false
    }
  })
  const matchingFooter = matchingFooterMarkup.slice(matchingFooterMarkup.indexOf('<footer'))
  assert.match(matchingFooter, /class="inline-flex min-h-7 cursor-default select-none items-center gap-1\.5 whitespace-nowrap rounded-sm font-semibold[^\"]*text-emerald-300"><span aria-hidden="true" class="h-1\.5 w-1\.5 rounded-full bg-emerald-400"><\/span>Product Match/, 'Footer Product Match has a green dot and semibold green text without click styling')

  const notSetFooterMarkup = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, productName: '', uom: '' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, productName: 'Partial product', uom: '' } }
    }
  })
  const notSetFooter = notSetFooterMarkup.slice(notSetFooterMarkup.indexOf('<footer'))
  assert.match(notSetFooter, /aria-label="Product Not Set"[\s\S]*text-slate-300[\s\S]*Product Not Set/, 'incomplete product identity is shown as neutral Product Not Set')
  assert.match(notSetFooter, /footer-product-status-tooltip[\s\S]*Reference[\s\S]*Not set[\s\S]*Current[\s\S]*Partial product \(UOM not set\)/, 'Product tooltip preserves partial identity and labels an empty side Not set')
  assert.doesNotMatch(notSetFooter, /Product \(Unit\)|— \(—\)/, 'Product display never fabricates fallback identity values')

  const negativeGapMarkup = await renderAppLayout({
    fullSnapshotComparison: {
      referenceCost: { total: 125.5 },
      currentCost: { total: 120 },
      totalGap: -5.5
    }
  })
  const zeroGapMarkup = await renderAppLayout({
    fullSnapshotComparison: {
      referenceCost: { total: 120 },
      currentCost: { total: 120 },
      totalGap: 0
    }
  })
  const unavailableCostMarkup = await renderAppLayout({
    fullSnapshotComparison: {
      referenceCost: { total: null },
      currentCost: { total: 120 },
      totalGap: null
    }
  })
  assert.match(negativeGapMarkup, /NET GAP<\/span><span class="font-semibold text-emerald-300">-5\.5/, 'negative Net Gap is emerald and omits unnecessary trailing zeros')
  assert.match(zeroGapMarkup, /NET GAP<\/span><span class="font-semibold text-slate-300">0</, 'zero Net Gap is neutral and stays visible without forced decimals')
  assert.match(unavailableCostMarkup, /REF STD<\/span>—[\s\S]*NET GAP<\/span><span class="font-semibold text-slate-500">—/, 'unavailable Standard Cost and Net Gap remain dashes')

  const { INITIAL_MASTER_DATA_UI_STATE, reduceMasterDataUiState } = await vite.ssrLoadModule(
    '/src/features/master-data/master-data-ui-state.ts'
  )
  assert.deepEqual(INITIAL_MASTER_DATA_UI_STATE, {
    role: 'current',
    mode: 'view',
    tableView: 'all'
  }, 'a new application session starts with Current, View, and All Tables')

  const defaultMarkup = await renderMasterDataPage(INITIAL_MASTER_DATA_UI_STATE)
  assert.equal(pressedButton(defaultMarkup, 'Current'), true, 'a fresh application session starts on Current')
  assert.equal(pressedButton(defaultMarkup, 'View'), true, 'a fresh application session starts in View mode')
  assert.equal(pressedButton(defaultMarkup, 'All'), true, 'Master Data first opens with All selected')
  const toolbarControlOrder = [
    'aria-label="Master Data workspace"',
    'aria-label="View"',
    'aria-label="Edit"',
    'aria-label="Master Data actions"',
    'role="search" class="relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0"',
    'aria-label="Master Data table section"'
  ].map(marker => defaultMarkup.indexOf(marker))
  assert.ok(toolbarControlOrder.every((position, index) => position >= 0 && (index === 0 || position > toolbarControlOrder[index - 1])),
    'toolbar renders Dataset → View/Edit → tools → fixed Search → Table selector')
  const toolbarActionStart = headerSource.indexOf('aria-label="Master Data actions"')
  const toolbarActionEnd = headerSource.indexOf('<div role="search"', toolbarActionStart)
  const toolbarActionSource = headerSource.slice(toolbarActionStart, toolbarActionEnd)
  assert.doesNotMatch(toolbarActionSource, /border-l|border-r/, 'Master Data toolbar actions have no vertical separators')
  const toolbarButtons = [...defaultMarkup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  for (const [label, active] of [['View', true], ['Edit', false]]) {
    const button = toolbarButtons.find(([, attributes]) => attributes.match(/\baria-label="([^"]+)"/)?.[1] === label)
    assert.ok(button, `${label} mode has a labelled button`)
    assert.match(button[1], /aria-describedby="[^"]+"/, `${label} mode is associated with its custom tooltip`)
    assert.equal(/aria-pressed="true"/.test(button[1]), active, `${label} mode exposes its selected state`)
    assert.match(button[1], /relative grid h-6 w-6[^']*justify-self-center/, `${label} remains a centered 24px accessible target within the 32px segmented control`)
    assert.match(button[1], active ? /text-white/ : /text-slate-700/, `${label} has a clear selected state`)
    assert.match(button[2], label === 'View' ? /lucide-eye h-4 w-4/ : /lucide-pencil h-4 w-4/, `${label} uses its requested icon`)
    assert.doesNotMatch(button[2], />\s*(?:View|Edit)\s*</, `${label} has no visible text label`)
  }
  assert.match(headerSource, /role="group"\s+aria-label="View and Edit mode"[\s\S]*?className="relative grid h-8 w-16 shrink-0 grid-cols-2[\s\S]*transition-transform duration-150 ease-out[\s\S]*isEditMode \? 'translate-x-full' : 'translate-x-0'/,
    'View/Edit use one compact icon-only segmented control with a sliding active thumb')
  assert.match(headerSource, /role="group"[\s\S]*aria-label="View and Edit mode"[\s\S]*onClick=\{event => \{\s*if \(event\.target !== event\.currentTarget\) return\s*onToggleEditMode\(!isEditMode\)\s*\}\}/,
    'clicking the segmented-control track toggles modes while bubbled segment clicks are ignored')
  assert.match(headerSource, /aria-label="View"[\s\S]*onClick=\{\(\) => onToggleEditMode\(false\)\}/,
    'clicking Eye explicitly selects View without relying on the track toggle')
  assert.match(headerSource, /aria-label="Edit"[\s\S]*onClick=\{\(\) => onToggleEditMode\(true\)\}/,
    'clicking Pencil explicitly selects Edit without relying on the track toggle')
  const searchViewCases = [
    ['bom', 'Search BOM'],
    ['wc', 'Search Work Centers'],
    ['routing', 'Search Routing'],
    ['all', 'Search all tables']
  ]
  const searchViewMarkups = []
  for (const [tableView] of searchViewCases) {
    searchViewMarkups.push(await renderMasterDataPage({ ...INITIAL_MASTER_DATA_UI_STATE, tableView }))
  }
  searchViewCases.forEach(([, placeholder], index) => {
    assert.match(searchViewMarkups[index], new RegExp(`placeholder="${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
      `${placeholder} matches its active table context`)
  })
  const searchWidths = searchViewMarkups.map(markup => markup.match(/<div role="search" class="([^"]+)">/)?.[1])
  assert.deepEqual(searchWidths, Array(4).fill('relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0'),
    'Search stays at the same fixed width and toolbar position across all table placeholders')
  const searchPositions = searchViewMarkups.map(markup => markup.indexOf('role="search" class="relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0"'))
  assert.equal(new Set(searchPositions).size, 1, 'table view changes do not move the Search control')
  assert.match(headerSource, /placeholder=\{searchPlaceholder\}[\s\S]*className="h-8 w-full min-w-0/, 'placeholder changes cannot size the fixed Search input')
  assert.match(defaultMarkup, /id="master-data-table-panel" role="region" aria-label="All dataset tables"/, 'All Tables exposes one semantic region containing all dataset tables')
  const tableSections = [
    ['master-data-table-bom', 'Bill of Materials'],
    ['master-data-table-wc', 'Work Centers'],
    ['master-data-table-routing', 'Routing']
  ].map(([sectionId, expectedHeading]) => {
    const sectionStart = defaultMarkup.indexOf(`id="${sectionId}"`)
    assert.notEqual(sectionStart, -1, `All Tables includes the ${expectedHeading} section`)
    const headingMarkup = defaultMarkup.slice(sectionStart).match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]
    assert.ok(headingMarkup, `${expectedHeading} section has an accessible heading`)
    return {
      sectionId,
      position: sectionStart,
      heading: headingMarkup.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    }
  })
  assert.deepEqual(tableSections.map(section => section.heading), ['Bill of Materials', 'Work Centers', 'Routing'], 'All Tables keeps the vertical BOM → Work Centers → Routing heading order')
  assert.ok(tableSections[0].position < tableSections[1].position && tableSections[1].position < tableSections[2].position, 'All Tables places BOM before Work Centers before Routing in document order')

  const sessionStorageWrites = []
  const previousStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: (key, value) => sessionStorageWrites.push({ key, value })
    }
  })
  let appSessionState
  try {
    appSessionState = [
      { type: 'set-role', role: 'reference' },
      { type: 'set-mode', mode: 'edit' },
      { type: 'set-table-view', tableView: 'routing' }
    ].reduce(reduceMasterDataUiState, INITIAL_MASTER_DATA_UI_STATE)
  } finally {
    if (previousStorageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', previousStorageDescriptor)
    else delete globalThis.sessionStorage
  }
  assert.deepEqual(appSessionState, {
    role: 'reference',
    mode: 'edit',
    tableView: 'routing'
  }, 'dataset, mode, and table view can be retained together in application memory')
  assert.deepEqual(sessionStorageWrites, [], 'Master Data UI transitions never persist their state into browser session storage')
  assert.deepEqual(INITIAL_MASTER_DATA_UI_STATE, {
    role: 'current',
    mode: 'view',
    tableView: 'all'
  }, 'editing UI state does not mutate the fresh-session defaults')

  const returnedPageMarkup = await renderMasterDataPage(appSessionState)
  assert.equal(pressedButton(returnedPageMarkup, 'Reference'), true, 'a remounted page reflects the retained dataset side')
  assert.equal(pressedButton(returnedPageMarkup, 'Edit'), true, 'a remounted page reflects the retained mode')
  assert.equal(pressedButton(returnedPageMarkup, 'Routing'), true, 'a remounted page reflects the retained table view')
  assert.equal(pressedButton(returnedPageMarkup, 'All'), false, 'the retained Routing view does not revert to All')
  assert.match(returnedPageMarkup, /aria-label="Routing table"/, 'the selected Routing view remains the only table region')

  const freshAppSessionMarkup = await renderMasterDataPage(INITIAL_MASTER_DATA_UI_STATE)
  assert.equal(pressedButton(freshAppSessionMarkup, 'Current'), true, 'a fresh app session does not inherit Reference selection')
  assert.equal(pressedButton(freshAppSessionMarkup, 'View'), true, 'a fresh app session does not inherit Edit mode')
  assert.equal(pressedButton(freshAppSessionMarkup, 'All'), true, 'a fresh app session returns to All')

  const { makeEmptySession } = await vite.ssrLoadModule('/src/state/store.tsx')
  const businessSession = makeEmptySession('master-data-ui-state-test')
  assert.equal(Object.hasOwn(businessSession, 'masterDataRole'), false, 'dataset-side UI state stays out of saved business sessions')
  assert.equal(Object.hasOwn(businessSession, 'masterDataUiState'), false, 'mode and table-view UI state stay out of saved business sessions')
  assert.equal(Object.hasOwn(businessSession, 'masterDataTableView'), false, 'table-view UI state does not become business data')
  assert.equal(Object.hasOwn(businessSession, 'masterDataMode'), false, 'mode UI state does not become business data')

  const keyboardSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useTableKeyboardNav.ts'), 'utf8')
  const rowSelectionSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useDragSelect.ts'), 'utf8')
  const spreadsheetEditingSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useSpreadsheetEditing.ts'), 'utf8')
  const bomSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/BOMTable.tsx'), 'utf8')
  const wcSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/WorkCenterRatesTable.tsx'), 'utf8')
  const routingSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/RoutingTable.tsx'), 'utf8')
  const tableChromeSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataTableChrome.tsx'), 'utf8')
  const preparePopoverSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataPrepareDatasetPopover.tsx'), 'utf8')
  const blockerMarkerSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataBlockerMarker.tsx'), 'utf8')
  const pageSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/MasterDataPage.tsx'), 'utf8')
  const masterDataDatasetSource = readFileSync(resolve(process.cwd(), 'src/state/master-data-datasets.ts'), 'utf8')
  const warningFocusSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useWarningNavigationFocus.ts'), 'utf8')
  const footerSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/AppLayout.tsx'), 'utf8')
  assert.match(footerSource, /gap-x-3 gap-y-1 font-mono tabular-nums[\s\S]*NET GAP[\s\S]*<span className="ml-2 max-\[359px\]:basis-full max-\[359px\]:ml-0 max-\[359px\]:text-right cursor-default select-none font-sans font-bold text-slate-300">THB\/\{costUnit\}<\/span>/, 'the shared Footer unit is bold and secondary, has 20px separation, then moves below 360px')
  assert.match(footerSource, /Reference and Current dataset structure" className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer dataset counts use the default cursor and cannot be selected')
  assert.match(footerSource, /Dataset readiness, product comparison, and warnings" className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer separators and display-only summary use the default cursor')
  assert.match(footerSource, /Full Reference and Current standard costs and net gap in THB\/\$\{costUnit\}`\} className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer costs and shared unit use the default cursor and cannot be selected')
  assert.match(footerSource, /className="flex h-dvh min-h-0 w-full flex-col overflow-hidden[\s\S]*className=\{`min-h-0 min-w-0 flex-1 overflow-y-auto \$\{activeTab === 'master' \? 'pt-0 pb-3 \[scrollbar-gutter:stable\]' : 'py-3'\}`\}/, 'the fixed shell clips outer overflow, removes Master Data top spacing, and stabilizes its Search layout')
  assert.match(footerSource, /!referenceUom && !currentUom[\s\S]*!referenceUom[\s\S]*currentUom[\s\S]*normalizeProductIdentityValue\(referenceUom\) === normalizeProductIdentityValue\(currentUom\)[\s\S]*\? referenceUom[\s\S]*: 'Unit'/, 'Footer unit chooses the sole nonblank UOM, matching Reference spelling, or Unit for blank/conflicting values')
  const globalCssSource = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
  const navbarSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
  const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const sizingModalSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/DatasetSizingModal.tsx'), 'utf8')
  const importModalSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/ExcelImportModal.tsx'), 'utf8')
  const storeSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
  const developmentMockSource = readFileSync(resolve(process.cwd(), 'src/state/development-mock-data.ts'), 'utf8')
  const prepareDatasetSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/prepare-dataset.ts'), 'utf8')
  const snapshotParserSource = readFileSync(resolve(process.cwd(), 'src/services/excel/snapshot-parser.ts'), 'utf8')
  const importDropzoneSource = readFileSync(resolve(process.cwd(), 'src/shared/ui/ExcelUploadDropzone.tsx'), 'utf8')
  const validationSource = readFileSync(resolve(process.cwd(), 'src/core/utils/master-data-validation.ts'), 'utf8')
  const storageSource = readFileSync(resolve(process.cwd(), 'src/services/storage/session-storage.ts'), 'utf8')
  const appSourceFiles = (() => {
    const visit = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return visit(path)
      return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
    })
    return visit(resolve(process.cwd(), 'src')).join('\n')
  })()

  assert.match(keyboardSource, /event\.key === 'Escape'[\s\S]*target\?\.blur\(\)/, 'Escape exits the active cell editor')
  assert.match(keyboardSource, /event\.key === 'ArrowUp'[\s\S]*event\.key === 'Tab'/, 'Arrow, Enter, and Tab navigation share the spreadsheet cell matrix')
  assert.match(keyboardSource, /event\.key === 'Enter' && event\.shiftKey/, 'Shift+Enter moves upward')
  assert.match(keyboardSource, /event\.key === 'Tab' && event\.shiftKey/, 'Shift+Tab moves left')
  assert.match(keyboardSource, /event\.key\.toLowerCase\(\) === 'z'[\s\S]*onUndo[\s\S]*onRedo/, 'Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z use the page-level edit history')
  assert.match(keyboardSource, /event\.key\.toLowerCase\(\) === 'y'[\s\S]*onRedo/, 'Ctrl/Cmd+Y invokes page-level Redo')
  assert.match(keyboardSource, /handleCopy[\s\S]*setData\('text\/plain'/, 'copy writes the selected spreadsheet cells as tabular text')
  assert.match(keyboardSource, /handlePaste[\s\S]*clipboardMatrix\.forEach/, 'paste maps tabular clipboard cells into the visible grid')
  assert.match(rowSelectionSource, /if \(e\.shiftKey\)/, 'Shift-click selects a contiguous row range')
  assert.match(rowSelectionSource, /e\.ctrlKey \|\| e\.metaKey/, 'Ctrl/Cmd-click toggles a non-contiguous row selection')
  assert.match(rowSelectionSource, /onMouseEnterRow/, 'dragging across row headers extends row selection')
  assert.match(spreadsheetEditingSource, /selectedIds\.has\(id\) \? \[\.\.\.selectedIds\]/, 'editing a selected row applies a same-column change to selected rows')
  assert.match(bomSource, /dataTransfer\.setData\('application\/x-costbreakdown-row-ids'/, 'selected rows are carried as a group for reorder')
  assert.match(bomSource, /<th scope="col"[^>]*>Actions<\/th>[\s\S]*aria-label=\{`Reorder BOM row/, 'Trash and Grip reorder controls share the single rightmost Actions column')
  assert.match(routingSource, /not in WC table|knownWorkCenters/, 'Routing WC input keeps unknown values visible for typo correction')
  assert.match(headerSource, /<Tooltip label="Clone">[\s\S]*aria-label="Clone"/, 'Clone is icon-only with an accessible label and custom tooltip')
  const mockActionSource = footerSource.slice(footerSource.indexOf('const mockAction'), footerSource.indexOf('const referenceStandardCost'))
  assert.match(mockActionSource, /grid w-full grid-cols-2 divide-x[\s\S]*Complete Mock[\s\S]*Incomplete Mock/, 'development mock actions use equal two-column widths')
  assert.match(mockActionSource, /w-full px-1\.5 text-center[\s\S]*w-full px-1\.5 text-center/, 'both mock labels are centered in full-width buttons')
  assert.doesNotMatch(mockActionSource, /aria-haspopup|window\.confirm|>\|</, 'mock actions have no dropdown or confirmation')
  assert.match(headerSource, /onPointerEnter=\{\(\) => \{[\s\S]*if \(!cloneMenuPinned\) setCloneMenuOpen\(true\)/, 'Clone opens a temporary preview on pointer hover unless pinned')
  assert.ok(headerSource.includes('id="clone-source-menu"')
    && headerSource.includes('left-1/2 top-full z-50 mt-1 min-w-36 -translate-x-1/2')
    && headerSource.includes('From {roleLabels[sourceRole]}'), 'Clone source choices are centered below the trigger with concise labels')
  assert.match(headerSource, /const handlePointerDown = \(event: PointerEvent\) => \{\s*if \(!cloneContainerRef\.current\?\.contains\(event\.target as Node\)\) closeCloneMenu\(\)/, 'Clone closes when clicking outside the trigger and popover')
  assert.match(headerSource, /event\.key !== 'Escape'[\s\S]*closeCloneMenu\(true\)/, 'Escape closes Clone')
  assert.match(headerSource, /if \(restoreFocus\) cloneTriggerRef\.current\?\.focus\(\)/, 'Escape restores focus to the Clone trigger')
  const cloneTriggerSource = headerSource.slice(headerSource.indexOf('ref={cloneTriggerRef}'), headerSource.indexOf('{cloneMenuOpen &&'))
  assert.doesNotMatch(cloneTriggerSource, /onFocus=/, 'Clone does not open from keyboard focus alone')
  assert.match(cloneTriggerSource, /onClick=\{\(\) => \{[\s\S]*if \(cloneMenuPinned\) closeCloneMenu\(\)[\s\S]*setCloneMenuPinned\(true\)[\s\S]*setCloneMenuOpen\(true\)[\s\S]*aria-expanded=\{cloneMenuOpen\}[\s\S]*aria-haspopup="menu"/,
    'Clone trigger exposes an accessible click/keyboard menu control')
  assert.match(headerSource, /onPointerLeave=\{\(\) => \{[\s\S]*setTimeout\(\(\) => setCloneMenuOpen\(false\), 140\)/, 'Clone preview stays open during pointer transition and dismisses after leaving trigger and menu')
  assert.match(headerSource, /useEffect\(\(\) => \{\s*closeCloneMenu\(\)\s*\}, \[role\]\)/, 'changing active destination closes the Clone flyout')
  assert.match(headerSource, /sourceRole !== role/, 'Clone excludes the viewed dataset as its own source')
  const cloneActionSource = headerSource.slice(headerSource.indexOf('onCloneFrom(sourceRole)') - 120, headerSource.indexOf('onCloneFrom(sourceRole)') + 100)
  assert.doesNotMatch(cloneActionSource, /confirm\(/, 'choosing a Clone source does not ask for a second confirmation')
  assert.equal((headerSource.match(/window\.confirm\(/g) ?? []).length, 0, 'Reset and Clear have no browser confirmation')
  assert.match(headerSource, /const handleResetDataset = \(\) => \{\s*if \(lastSavedSnapshot\) onResetWorkingDataset\(\)/, 'Reset immediately delegates to the history-backed Working reset')
  const currentAndAllActionSource = headerSource.slice(headerSource.indexOf('const CurrentAndAllAction'), headerSource.indexOf('export const MasterDataWorkspaceHeader'))
  assert.match(currentAndAllActionSource, /onClick=\{\(\) => \{\s*if \(currentDisabled\) return\s*closeMenu\(\)\s*onCurrent\(\)/, 'the primary action click continues to affect only the currently viewed dataset')
  assert.match(currentAndAllActionSource, /onClick=\{\(\) => \{\s*closeMenu\(\)\s*onAll\(\)/, 'the secondary menu has one direct all-dataset action')
  assert.match(currentAndAllActionSource, /onMouseEnter=\{\(\) => \{[\s\S]*setTimeout\(\(\) => setOpen\(true\), 120\)/, 'all-dataset action menus open after a short hover delay')
  assert.match(currentAndAllActionSource, /onMouseLeave=\{\(\) => \{[\s\S]*setTimeout\(\(\) => \{[\s\S]*\}, 150\)/, 'all-dataset action menus remain open long enough to move the pointer into them')
  assert.match(currentAndAllActionSource, /event\.key !== 'Escape'[\s\S]*closeMenu\(true\)[\s\S]*aria-keyshortcuts="Alt\+ArrowDown"[\s\S]*event\.shiftKey && event\.key === 'F10'[\s\S]*openMenu\(true\)/, 'keyboard users can open the all-dataset action and Escape restores focus')
  assert.match(currentAndAllActionSource, /Acts on the current dataset\. Hover or press Alt plus Down Arrow to access the all-dataset action\./, 'the hover-only secondary action is also discoverable to assistive technology')
  assert.match(headerSource, /label="Save"[\s\S]*onCurrent=\{onSaveWorkingDataset\}[\s\S]*onAll=\{onSaveAllWorkingDatasets\}[\s\S]*label="Reset"[\s\S]*onCurrent=\{handleResetDataset\}[\s\S]*onAll=\{onResetAllWorkingDatasets\}[\s\S]*label="Clear"[\s\S]*onCurrent=\{onClearDataset\}[\s\S]*onAll=\{onClearAllDatasets\}/, 'Save, Reset, and Clear expose current and all-dataset actions in the agreed order')
  assert.doesNotMatch(currentAndAllActionSource, /Chevron|Save Current|Reset Current|Clear Current/, 'action triggers have no visible chevrons or redundant current-dataset menu entries')
  const saveAllSource = storeSource.slice(storeSource.indexOf('const saveAllMasterDataWorkingDatasets'), storeSource.indexOf('const commitMasterDataWorkingSession'))
  assert.match(saveAllSource, /const reference = createSavedDataset\('reference'\)[\s\S]*const current = createSavedDataset\('current'\)[\s\S]*const custom = createSavedDataset\('custom'\)/, 'Save all reads each dataset from its current Working snapshot')
  assert.match(saveAllSource, /lastSavedMasterData:\s*\{[\s\S]*reference,[\s\S]*current[\s\S]*customLastSavedMasterData: custom/, 'Save all writes Reference, Current, and Custom snapshots to their matching Last Saved slots')
  assert.match(storeSource, /resetAllMasterDataWorkingDatasets = \(\) =>[\s\S]*getLastSavedMasterData\(session, role\)[\s\S]*commitMasterDataAllWorkingDatasets\(session, updated\)/, 'Reset all restores available Last Saved datasets as one working-state action')
  assert.match(storeSource, /clearAllMasterDataWorkingDatasets = \(\) =>[\s\S]*reduce\(\(working, role\) => clearMasterDataDatasetState\(working, role\), session\)[\s\S]*commitMasterDataAllWorkingDatasets\(session, updated\)/, 'Clear all uses the existing clear semantics across Working datasets as one action')
  assert.match(storeSource, /commitMasterDataAllWorkingDatasets = \(before: ProductSession, after: ProductSession\)[\s\S]*recordMasterDataPairWorkingEdit\(before, after\)/, 'all-dataset Working changes use the existing atomic Undo/Redo history entry')
  assert.match(headerSource, /const toolbarButton = 'grid h-8 w-8[^']*bg-transparent[^']*hover:bg-slate-100[^']*focus-visible:outline/, 'tool actions have borderless idle styling and retain 32px interaction targets')
  assert.match(headerSource, /<div\s+role="group"\s+aria-label="View and Edit mode"[\s\S]*?<Eye className="h-4 w-4"[\s\S]*?<Pencil className="h-4 w-4"/, 'View/Edit use an icon-only sliding segmented control with both icons present')
  assert.ok(headerSource.includes('w-[calc(50%-2px)] bg-slate-900 transition-transform duration-150 ease-out'), 'the View/Edit selected thumb slides without changing control geometry')
  assert.match(headerSource, /className="inline-flex h-8 shrink-0 border border-slate-300 bg-white" role="group" aria-label="Master Data workspace"[\s\S]*className=\{'flex h-full items-center/, 'Dataset selector keeps a bordered 32px selector height and existing status dots')
  assert.match(pageSource, /grid h-8 w-72 shrink-0 grid-cols-4 items-stretch[\s\S]*h-full w-full/, 'Table selector uses equal controls with the same 32px height')
  assert.match(headerSource, /className="relative grid h-8 w-16 shrink-0 grid-cols-2/, 'View/Edit selector has the same 32px height as toolbar utilities')
  assert.match(headerSource, /className="inline-flex shrink-0 items-center gap-1" role="group" aria-label="Master Data actions"/, 'action icons remain grouped without changing their 32px targets')
  assert.match(headerSource, /role="search" className="relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0"/, 'Search remains exactly 192px wide and 32px high')
  assert.match(sizingModalSource, /if \(removedData\.length > 0\)[\s\S]*window\.confirm\(/, 'Sizing confirms only when populated data will be removed')
  assert.match(navbarSource, /id="header-prepare-dataset-trigger"[\s\S]*onClick=\{toggleMasterDataPrepareDataset\}[\s\S]*aria-expanded=\{masterDataPrepareDatasetOpen\}[\s\S]*aria-controls="prepare-dataset-panel"/, 'Header Info is the accessible Prepare Dataset toggle and controls the shared panel')
  assert.match(navbarSource, /id="header-prepare-dataset-portal-root"/, 'the shared popover portal is hosted beside the Header Info control')
  assert.match(readyFooterMarkup, /id="header-prepare-dataset-trigger"[\s\S]*id="header-prepare-dataset-portal-root"/, 'the rendered Header places the portal host directly after its Info trigger')
  assert.equal((navbarSource.match(/id="header-prepare-dataset-trigger"/g) ?? []).length, 1, 'the Header owns one Prepare Dataset trigger')
  assert.doesNotMatch(headerSource, /aria-label="Prepare Dataset"|title="Prepare Dataset"|prepareTriggerRef|<Info/, 'Master Data toolbar has no duplicate Prepare Dataset Info trigger')
  assert.doesNotMatch(headerSource, /aria-label="Prepare Dataset"|<Info|createPortal/, 'Master Data toolbar has no duplicate Prepare Dataset trigger or panel owner')
  assert.match(footerSource, /<MasterDataPrepareDatasetPopover[\s\S]*isOpen=\{masterDataPrepareDatasetOpen\}[\s\S]*onNavigateIssue=\{onNavigatePrepareDatasetIssue\}/, 'the shared shell renders Prepare Dataset independently of the active page')
  assert.match(navbarSource, /id="header-prepare-dataset-portal-root"/, 'the always-mounted Header supplies the shared popover portal root')
  assert.match(storeSource, /toggleMasterDataPrepareDataset = \(\) => \{[\s\S]*if \(masterDataPrepareDatasetPinned\)[\s\S]*setMasterDataPrepareDatasetPinned\(false\)[\s\S]*setMasterDataPrepareDatasetPinned\(true\)/, 'Header Info pins the hover preview on click and toggles a pinned panel closed')
  const storePrepareActions = storeSource.slice(storeSource.indexOf('const toggleMasterDataPrepareDataset'), storeSource.indexOf('const addUOM'))
  assert.doesNotMatch(storePrepareActions, /setActiveTab\(/, 'preview, toggle, footer request, and close never navigate by themselves')
  assert.match(storeSource, /previewMasterDataPrepareDataset = \(\) => \{[\s\S]*setMasterDataPrepareDatasetOpen\(true\)/, 'Info hover opens the shared panel without selecting Master Data')
  assert.match(navbarSource, /onPointerEnter=\{previewMasterDataPrepareDataset\}[\s\S]*panelRoot\?\.contains\(relatedTarget\)[\s\S]*scheduleDismissMasterDataPrepareDatasetPreview\(\)/, 'Info hover keeps the preview open while pointer travels into the shared panel')
  assert.match(preparePopoverSource, /onPointerEnter=\{onPanelPointerEnter\}[\s\S]*onPointerLeave=\{onPanelPointerLeave\}/, 'leaving the preview panel schedules dismissal')
  assert.match(navbarSource, /onPointerEnter=\{previewMasterDataPrepareDataset\}[\s\S]*onPointerLeave=\{event => \{[\s\S]*relatedTarget instanceof Node[\s\S]*panelRoot\?\.contains\(relatedTarget\)[\s\S]*scheduleDismissMasterDataPrepareDatasetPreview\(\)[\s\S]*aria-pressed=\{masterDataPrepareDatasetPinned\}/, 'Header Info previews on hover, preserves pointer movement into its portal, dismisses after leaving, and exposes the pinned state')
  assert.match(storeSource, /requestMasterDataPrepareDataset = \(mode\?: 'all-warnings'\)[\s\S]*if \(masterDataPrepareDatasetOpen\)[\s\S]*closeMasterDataPrepareDataset\(\)[\s\S]*setMasterDataPrepareDatasetOpen\(true\)[\s\S]*setMasterDataPrepareDatasetRequestMode\(mode \?\? null\)/, 'Footer warning action toggles the shared panel without navigating')
  assert.match(preparePopoverSource, /onClick=\{\(\) => \{ onClose\(\); document\.getElementById\('header-prepare-dataset-trigger'\)\?\.focus\(\) \}\}/, 'the panel Close action returns focus to Header Info')
  assert.match(preparePopoverSource, /if \(panelRef\.current\?\.contains\(target\)[\s\S]*onClose\(\)/, 'outside clicks close the shared panel')
  assert.match(preparePopoverSource, /event\.key !== 'Escape'[\s\S]*onClose\(\)[\s\S]*document\.getElementById\('header-prepare-dataset-trigger'\)\?\.focus\(\)/, 'Escape closes the panel and restores focus to Header Info')
  assert.match(preparePopoverSource, /addEventListener\('pointerdown'/, 'the shared popover listens for outside pointer clicks')
  assert.match(preparePopoverSource, /const resetUiState = useCallback\(\(\) => \{\s*setDatasetRoleFilter\(null\)\s*setExpandedWarningCategories\(new Set\(\)\)\s*setExpandedBlockerCategories\(new Set\(\)\)\s*\}, \[\]\)[\s\S]*if \(!isOpen\) resetUiState\(\)/, 'every close resets the shared filter and expanded Warning/Blocker categories')
  assert.match(navbarSource, /aria-expanded=\{masterDataPrepareDatasetOpen\}[\s\S]*aria-pressed=\{masterDataPrepareDatasetPinned\}/, 'Header Info exposes live open and pinned state')
  assert.match(headerSource, /datasetSaveStateDotClass\(state\)/, 'dataset selector save dots use the shared state style')
  assert.match(preparePopoverSource, /saveStateDotClass\(saveState\)/, 'Prepare Dataset save dots use their semantic style')
  assert.match(headerSource, /datasetSaveStateDotClass = \(state: MasterDataSaveState, size = 'h-1\.5 w-1\.5'\) =>[\s\S]*\$\{size\} shrink-0 rounded-full ring-\[1\.5px\] ring-inset[\s\S]*state === 'Saved' \? 'bg-emerald-500 ring-emerald-700\/70' : 'bg-slate-400 ring-slate-600\/70'/, 'Saved and Draft dots share semantic fills and higher-contrast rings while preserving the toolbar default size')
  assert.match(headerSource, /datasetSaveStateDotClass\(state\)/, 'toolbar save-state dots keep the helper default size of 6px')
  assert.match(headerSource, /aria-label=\{`\$\{roleLabels\[datasetRole\]\} — \$\{state\}`\}/, 'dataset save state is accessible independently from active styling')
  assert.match(headerSource, /\{roleLabels\[datasetRole\]\}[\s\S]*datasetSaveStateDotClass\(state\)/, 'active selection and save-state dot use separate styles')
  assert.doesNotMatch(headerSource, /prepareRegionRef|prepareTriggerRef/, 'the toolbar does not own a local Prepare Dataset trigger or anchor')
  assert.doesNotMatch(preparePopoverSource, /Prepared|Needs input/, 'Prepare Dataset dataset summaries do not show readiness labels')
  assert.match(preparePopoverSource, /warningCountForRole = warningCounts\[datasetRole\][\s\S]*blockerCountForRole = blockerCounts\[datasetRole\][\s\S]*\{warningCountForRole\}[\s\S]*\{blockerCountForRole\}/, 'each dataset summary shows both issue counts beside its save state')
  assert.match(preparePopoverSource, /min-w-0 truncate pl-3 text-\[11px\] font-semibold text-slate-700/, 'Prepare Dataset child labels remain slightly indented')
  assert.doesNotMatch(preparePopoverSource, /productDetailsOpen|setProductDetailsOpen|Compared product identities|decoration-dotted/, 'Prepare Dataset Product status has no interactive detail popover')
  const prepareTopRow = preparePopoverSource.slice(preparePopoverSource.indexOf('<div className="flex min-h-8 shrink-0 items-center gap-1'), preparePopoverSource.indexOf('<div role="group" aria-label="Dataset filters, save states'))
  assert.match(prepareTopRow, /<h2[^>]*>\s*Dataset\s*<\/h2>[\s\S]*datasetsReady \? 'Ready' : 'Incomplete'[\s\S]*Product \{productStatusLabel\(productStatus\)\}[\s\S]*Close Prepare Dataset/, 'top row presents Dataset, readiness, Product status, and Close')
  assert.ok(prepareTopRow.includes('Product {productStatusLabel(productStatus)}') && /aria-label=.*productStatusLabel\(productStatus\)/.test(prepareTopRow), 'Product status is display-only text')
  const prepareProductStatus = prepareTopRow.slice(prepareTopRow.indexOf('aria-label={`Product'), prepareTopRow.indexOf('<button'))
  assert.doesNotMatch(prepareProductStatus, /<button|onClick|underline|decoration-dotted/, 'Product status has no click affordance')
  assert.doesNotMatch(prepareTopRow, /Chevron/, 'top status summary does not show a Product status chevron')
  assert.match(prepareTopRow, /className=\{`h-2 w-2 shrink-0 rounded-full \$\{datasetsReady \? 'bg-blue-600' : 'bg-rose-500'\}`\}/, 'Ready and Incomplete dots are 8px and retain blue/rose semantics')
  assert.match(prepareTopRow, /datasetsReady \? 'text-blue-700' : 'text-rose-700'/, 'readiness text is blue for Ready and muted rose for Incomplete')
  assert.match(preparePopoverSource, /function productDisplayDotClass[\s\S]*bg-emerald-600[\s\S]*bg-violet-500[\s\S]*bg-slate-400/, 'Prepare Dataset Product Match/Mismatch/Not Set dots use green/violet/neutral colors')
  assert.match(preparePopoverSource, /function productDisplayClass[\s\S]*text-emerald-700[\s\S]*text-violet-700[\s\S]*text-slate-600/, 'Prepare Dataset Product Match/Mismatch/Not Set text uses green/violet/neutral colors')
  assert.match(prepareTopRow, /gap-1 border-b border-slate-200 pb-0\.5 min-\[360px\]:gap-2 sm:gap-2\.5/, 'Prepare Dataset top statuses use compact spacing')
  assert.doesNotMatch(preparePopoverSource, /comparisonProducts|prepare-dataset-identity-details/, 'Prepare Dataset does not retain the superseded Product mini-popover')
  assert.match(preparePopoverSource, /max-h-\[min\(38rem,calc\(100dvh-6rem\)\)\] w-\[min\(19rem,calc\(100vw-2rem\)\)\][\s\S]*overflow-hidden/, 'the popover is narrower on desktop and viewport-clamped')
  assert.match(preparePopoverSource, /Math\.min\(608, Math\.floor\(mainBottom - triggerBottom - 8\)\)/, 'smaller viewports clamp the panel to the remaining visible Main area')
  assert.match(preparePopoverSource, /style=\{\{ maxHeight: `\$\{Math\.min\(group\.items\.length, 3\) \* 28\}px` \}\}[\s\S]*overflow-y-auto/, 'each category detail list scrolls independently and shows at most three rows')
  assert.doesNotMatch(preparePopoverSource, /issueCategoryCount|expandedCategoryCount|issueDataMaxHeight/, 'detail list height is not redistributed across expanded categories')
  assert.ok(preparePopoverSource.includes('createPortal(')
    && navbarSource.includes('left-1/2 top-full z-[60] w-max -translate-x-1/2 pt-1'), 'the popover remains horizontally centered/clamped and vertically bounded')
  assert.match(preparePopoverSource, /className="relative flex max-h-\[min\(38rem,calc\(100dvh-6rem\)\)\] w-\[min\(19rem,calc\(100vw-2rem\)\)\] min-h-0 select-text flex-col gap-0\.5 overflow-hidden/, 'Prepare Dataset keeps its compact viewport-bounded panel structure')
  assert.match(preparePopoverSource, /const datasetSummaryColumns = 'grid-cols-\[minmax\(0,1fr\)_5rem_3\.5rem_3\.5rem\]'/, 'dataset summary tracks align dataset, save state, warning icon/count, and blocker icon/count')
  assert.match(preparePopoverSource, /aria-label="Dataset filters, save states, warning counts, and blocker counts"/, 'dataset row summary has an accessible label for its shared filter and issue counts')
  assert.match(preparePopoverSource, /setDatasetRoleFilter\(current => current === datasetRole \? null : datasetRole\)/, 'clicking the active dataset summary row toggles back to all datasets')
  assert.doesNotMatch(preparePopoverSource, /sm:grid-cols-3/, 'dataset summaries never become a horizontal three-column strip')
  const {
    MASTER_DATA_WARNING_CATEGORY_DEFINITIONS,
    MASTER_DATA_BLOCKER_CATEGORY_DEFINITIONS,
    buildMasterDataWarningItems,
    buildMasterDataBlockerItems,
    groupMasterDataWarnings,
    groupMasterDataBlockers,
    areMasterDataDatasetsReady,
    countMasterDataWarningsByRole,
    countMasterDataQualityByRole
  } = await vite.ssrLoadModule('/src/features/master-data/prepare-dataset.ts')
  assert.deepEqual(MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(({ category }) => category), [
    'generated-identity', 'auto-renamed-duplicate'
  ], 'Warnings contain only generated identity and auto-renamed duplicate')
  assert.deepEqual(MASTER_DATA_BLOCKER_CATEGORY_DEFINITIONS.map(({ category }) => category), ['missing-value'], 'Missing required value is a separate Blocker category')
  const warningSnapshots = {
    reference: fixtureSnapshot('reference'),
    current: fixtureSnapshot('current'),
    custom: {
      ...customMissingSnapshot,
      bom: [
        { id: 'custom-earlier-row', description: 'Steel', consumption: 1, price: 1, loss: 0, confidence: {} },
        { ...customMissingSnapshot.bom[0], isGeneratedBusinessIdentity: true },
        { id: 'custom-duplicate-row', description: 'mat0.3a(1)', autoRenamedFrom: 'mat0.3a', consumption: 1, price: 1, loss: 0, confidence: {} }
      ]
    }
  }
  const testWarnings = buildMasterDataWarningItems(warningSnapshots)
  const testBlockers = buildMasterDataBlockerItems(warningSnapshots)
  const missingUsageBlocker = testBlockers
    .find(item => item.rowId === 'custom-missing-usage' && item.field === 'consumption')
  assert.ok(missingUsageBlocker, 'a missing required Usage value creates a Blocker source item')
  assert.equal(missingUsageBlocker.label, 'Custom · Bill of Materials · Row 2 · Usage', 'Blocker details show dataset, full table title, display row, and field')
  assert.equal(missingUsageBlocker.rowId, 'custom-missing-usage', 'display numbering does not replace stable source row identity')
  assert.equal(testWarnings.length, 2, 'one generated identity and one auto-renamed duplicate count as warnings')
  assert.equal(testBlockers.length, 1, 'the missing Usage source is counted separately as a Blocker')
  assert.deepEqual(countMasterDataWarningsByRole(testWarnings), { reference: 0, current: 0, custom: 2 }, 'warning counts are role-specific and exclude blockers')
  assert.deepEqual(countMasterDataQualityByRole(testBlockers), { reference: 0, current: 0, custom: 1 }, 'blocker counts are role-specific')
  assert.deepEqual(groupMasterDataWarnings(testWarnings).map(group => group.items.length), [1, 1], 'warning groups contain only the two warning categories')
  assert.deepEqual(groupMasterDataBlockers(testBlockers).map(group => group.items.length), [1], 'the separate blocker group contains the missing value')
  const readyStatus = { referenceReady: true, currentReady: true, datasetsPrepared: true }
  assert.equal(areMasterDataDatasetsReady(readyStatus, []), true, 'prepared Reference and Current are Ready when there are no blockers')
  assert.equal(areMasterDataDatasetsReady(readyStatus, testBlockers), true, 'Custom blockers do not affect global readiness')
  assert.equal(areMasterDataDatasetsReady(readyStatus, [{ ...missingUsageBlocker, role: 'reference' }]), false, 'a Reference blocker makes global readiness Incomplete')
  const generatedOnlySnapshots = { ...warningSnapshots, custom: { ...warningSnapshots.custom, bom: warningSnapshots.custom.bom.map(row => ({ ...row, consumption: 1 })) } }
  assert.equal(areMasterDataDatasetsReady(readyStatus, buildMasterDataBlockerItems(generatedOnlySnapshots)), true, 'Warnings alone do not make datasets Incomplete')
  const notSetProductSnapshots = {
    reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, productName: '', uom: '' } },
    current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, productName: 'Part A', uom: '' } },
    custom: fixtureSnapshot('custom')
  }
  const notSetProductWarnings = buildMasterDataWarningItems(notSetProductSnapshots)
  const notSetProductBlockers = buildMasterDataBlockerItems(notSetProductSnapshots)
  assert.equal(notSetProductWarnings.length, 0, 'Product Not Set alone does not create a Warning')
  assert.equal(notSetProductBlockers.length, 0, 'Product Not Set alone does not create a Blocker')
  assert.equal(areMasterDataDatasetsReady(readyStatus, notSetProductBlockers), true, 'Product Not Set alone does not make prepared Reference and Current Incomplete')
  const reorderedWarningSnapshots = {
    ...warningSnapshots,
    custom: { ...warningSnapshots.custom, bom: [...warningSnapshots.custom.bom].reverse() }
  }
  const reorderedMissingUsageBlocker = buildMasterDataBlockerItems(reorderedWarningSnapshots)
    .find(item => item.rowId === 'custom-missing-usage' && item.field === 'consumption')
  assert.equal(reorderedMissingUsageBlocker?.label, 'Custom · Bill of Materials · Row 2 · Usage', 'source row label follows the current display order while retaining the same stable rowId')
  const renderIssueSectionStart = preparePopoverSource.indexOf('const renderIssueSection')
  const issueSectionSource = preparePopoverSource.slice(renderIssueSectionStart, preparePopoverSource.indexOf('if (!isOpen || !preparePortalRoot)', renderIssueSectionStart))
  assert.match(preparePopoverSource, /renderIssueSection\('warning'\)[\s\S]*renderIssueSection\('blocker'\)[\s\S]*mockAction/, 'Prepare Dataset orders Warnings, Blockers, then the two mock controls')
  assert.match(preparePopoverSource, /visibleWarningCount[\s\S]*visibleBlockerCount/, 'Warning and Blocker headings maintain separate totals')
  const datasetSummarySource = preparePopoverSource.slice(preparePopoverSource.indexOf('aria-label="Dataset filters, save states, warning counts, and blocker counts"'), preparePopoverSource.indexOf('className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto'))
  assert.match(datasetSummarySource, /aria-pressed=\{active\}[\s\S]*setDatasetRoleFilter\(current => current === datasetRole \? null : datasetRole\)/, 'one whole dataset row toggles the shared Warning/Blocker filter')
  assert.match(datasetSummarySource, /setExpandedWarningCategories\(new Set\(\)\)[\s\S]*setExpandedBlockerCategories\(new Set\(\)\)/, 'changing or clearing the dataset filter collapses expanded Warning and Blocker categories')
  assert.equal((datasetSummarySource.match(/<button\b/g) ?? []).length, 1, 'warning and blocker counts are not independent row filter buttons')
  assert.match(datasetSummarySource, /warningCountForRole > 0 \? 'text-amber-700' : 'text-slate-500'[\s\S]*blockerCountForRole > 0 \? 'text-rose-700' : 'text-slate-500'/, 'top summary counts use Warning amber and Blocker rose only when nonzero')
  assert.ok(issueSectionSource.includes('Dataset filter: ${filterLabel}') && issueSectionSource.includes('{filterLabel}'), 'both issue headings show the current full dataset filter label')
  assert.doesNotMatch(issueSectionSource, /<button[^>]*>[\s\S]*All[\s\S]*<\/button>/, 'section-level All buttons are removed')
  assert.match(issueSectionSource, /aria-label=\{isWarning \? 'Warning categories' : 'Blocker categories'\}[\s\S]*className="shrink-0 space-y-0\.5"/, 'Warning and Blocker category rows stay outside their detail scroll regions')
  assert.ok(issueSectionSource.includes('Math.min(group.items.length, 3) * 28') && issueSectionSource.includes('overflow-y-auto'), 'only each expanded category detail list scrolls within a fixed three-row bound')
  assert.match(preparePopoverSource, /className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain"[\s\S]*renderIssueSection\('warning'\)[\s\S]*renderIssueSection\('blocker'\)[\s\S]*mockAction && <div className="shrink-0 border-t/, 'Warnings and Blockers remain in the scrollable issue region above fixed Mock controls')
  assert.match(issueSectionSource, /aria-label=\{isWarning \? 'Warning categories' : 'Blocker categories'\}/, 'Warning and Blocker lists remain separate semantic sections')
  assert.match(issueSectionSource, /grid min-h-7 w-full grid-cols-\[minmax\(0,1fr\)_2rem_1\.5rem\][\s\S]*pl-3/, 'category rows stay indented with aligned count and chevron tracks')
  assert.match(issueSectionSource, /aria-expanded=\{isExpanded\}[\s\S]*onClick=\{\(\) => setExpanded\(current => \{[\s\S]*const next = new Set\(current\)[\s\S]*if \(next\.has\(group\.category\)\) next\.delete\(group\.category\)[\s\S]*else next\.add\(group\.category\)[\s\S]*return next/, 'every category row toggles details consistently and multiple categories can stay expanded')
  assert.doesNotMatch(issueSectionSource, /divide-y/, 'category rows have no thin divider lines')
  assert.match(issueSectionSource, /text-slate-600/, 'Warning and Blocker category counts use neutral text')
  assert.match(issueSectionSource, /group\.label\}<span aria-hidden="true" className="ml-1 font-bold text-rose-600">\*<\/span>/, 'Missing required value shows its red star after the category label')
  const actualIssueRows = issueSectionSource.slice(issueSectionSource.indexOf('{group.items.map(item =>'))
  assert.match(actualIssueRows, /onNavigateIssue\(item\)/, 'each expanded Warning or Blocker location directly navigates to its source')
  assert.doesNotMatch(actualIssueRows, /ChevronRight|ChevronDown|ChevronUp|›|aria-expanded/, 'actual issue locations have no navigation chevron or nested expansion')
  assert.match(preparePopoverSource, /className="relative flex max-h-\[min\(38rem,calc\(100dvh-6rem\)\)\] w-\[min\(19rem,calc\(100vw-2rem\)\)\][\s\S]*overflow-hidden/, 'Prepare Dataset uses a compact viewport-clamped panel with fixed Mock actions below its issue scroller')
  assert.match(footerSource, /grid w-full grid-cols-2 divide-x[\s\S]*Complete Mock[\s\S]*Incomplete Mock/, 'both development mock actions remain visible as equal controls')
  assert.match(prepareDatasetSource, /if \(row\.confidence\?\.\[field\]\?\.quality === 'invalid'\) return/, 'invalid legacy values are not mislabeled as Missing required value')
  assert.match(prepareDatasetSource, /if \(!workCenterId \|\| !knownWorkCenters\.has\(workCenterId\.toLocaleLowerCase\(\)\)\)[\s\S]*'missing-value'/, 'blank or unresolved Routing Work Center is a Blocker')
  assert.match(issueSectionSource, /text-rose-600/, 'missing-value category retains its red required-field cue')
  assert.match(pageSource, /setMasterDataRole\(item\.role\)[\s\S]*tableView: item\.table/, 'warning/blocker navigation selects the source dataset and table')
  assert.match(pageSource, /updateMasterDataUiState\(\{ type: 'set-mode', mode: 'edit' \}\)[\s\S]*tableView: item\.table/, 'warning/blocker navigation switches to Edit mode')
  assert.match(footerSource, /<MasterDataPrepareDatasetPopover[\s\S]*onNavigateIssue=\{onNavigatePrepareDatasetIssue\}/, 'Prepare Dataset detail navigation remains connected through the shared shell')
  assert.match(pageSource, /onNavigateBlocker: \(item: MasterDataQualityItem\) => handleWarningNavigation\(item, true\)/, 'table-local Blocker navigation requests All-view preservation')
  assert.match(pageSource, /if \(!preserveAllView \|\| !isAllTablesVisible\)[\s\S]*tableView: item\.table/, 'local Blocker navigation stays in All while warning details can switch tables')
  assert.match(pageSource, /handleWarningNavigationHandled[\s\S]*current\?\.requestId === requestId \? undefined : current/, 'warning/blocker navigation consumes the completed request')
  assert.match(warningFocusSource, /setSearchQuery\(''\)[\s\S]*scrollIntoView[\s\S]*selectRow\(target\.rowId\)[\s\S]*focusTarget\.focus[\s\S]*onNavigationHandled\(target\.requestId\)/, 'warning/blocker navigation clears Search, selects and scrolls the source row, focuses its field, then consumes the target')
  const { updateVisibleRowSelection } = await vite.ssrLoadModule('/src/features/master-data/hooks/useDragSelect.ts')
  const visibleSelection = updateVisibleRowSelection(new Set(['hidden', 'visible-a']), ['visible-a', 'visible-b'], true)
  assert.deepEqual([...visibleSelection], ['hidden', 'visible-a', 'visible-b'], 'Select All adds visible rows while preserving hidden selected rows')
  const clearedVisibleSelection = updateVisibleRowSelection(visibleSelection, ['visible-a', 'visible-b'], false)
  assert.deepEqual([...clearedVisibleSelection], ['hidden'], 'Clear All removes only visible rows and preserves hidden selections')
  assert.match(rowSelectionSource, /const toggleAll = useCallback\(\(checked: boolean\) => \{[\s\S]*items\.map\(getItemId\)[\s\S]*updateVisibleRowSelection/, 'table header selection is limited to currently filtered rows')
  assert.match(rowSelectionSource, /selectionScope\]\)/, 'row selection resets only when its dataset scope changes, not on View/Edit mode')
  for (const [tableSource, tableLabel] of [[bomSource, 'BOM'], [wcSource, 'Work Centers'], [routingSource, 'Routing']]) {
    assert.match(tableSource, /onMouseDown=\{event => startDrag\(/, tableLabel + ' row selection works in View and Edit')
    assert.match(tableSource, /aria-label=\{allVisibleSelected \? 'Clear selection for visible .* rows' : 'Select all visible .* rows'\}/, tableLabel + ' # header toggles visible selection')
    assert.match(tableSource, /aria-pressed=\{allVisibleSelected\}[\s\S]*allVisibleSelected \? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-200'/, tableLabel + ' # Select All has a visible pressed state with stable geometry')
    assert.match(tableSource, /<section aria-label="(?:Bill of Materials|Work Centers|Routing) rows" className="overflow-hidden border border-slate-300 bg-white select-none">/, tableLabel + ' table has its own bounded bordered container')
    assert.match(tableSource, /const idsToDelete = selectedIds\.has\([\w.]+\) \? \[\.\.\.selectedIds\] : \[[\w.]+\]/, tableLabel + ' Trash deletes selected rows as a group or only the clicked unselected row')
    assert.match(tableSource, /<th scope="col" className="w-20[^"]*">Actions<\/th>[\s\S]*aria-label=\{[^}]*Reorder/, tableLabel + ' keeps Trash and Grip within one Actions column')
    assert.match(tableSource, /blockerIndexRef\.current % blockerItems\.length[\s\S]*blockerIndexRef\.current = \(blockerIndexRef\.current \+ 1\) % blockerItems\.length/, tableLabel + ' blocker navigation wraps cyclically')
    assert.match(tableSource, /warningIndexRef\.current % warningItems\.length[\s\S]*warningIndexRef\.current = \(warningIndexRef\.current \+ 1\) % warningItems\.length/, tableLabel + ' warning navigation wraps cyclically')
    assert.match(tableSource, /<MasterDataTableHeader title=.*warningCount=.*blockerCount=.*onNextWarning=.*onNextBlocker=.*onAddRow=/, tableLabel + ' header contains title, counts, Warning/Blocker jumps, and Add Row')
    assert.match(tableSource, /isSelected \? 'text-slate-700' : 'text-slate-400'/, tableLabel + ' Grip handle is stronger for a selected row and muted otherwise')
    assert.doesNotMatch(tableSource, /MasterDataTableFooter|table-footer/, tableLabel + ' does not render a per-table footer')
    assert.match(tableSource, /overflow-x-auto/, tableLabel + ' can scroll horizontally when needed')
    assert.doesNotMatch(tableSource, /overflow-y-auto|max-h-\d/, tableLabel + ' does not create its own vertical scroll region')
  }
  assert.match(pageSource, /className=\{isAllTablesVisible \? 'space-y-3' : ''\}[\s\S]*tableSections\.map\(section => \([\s\S]*renderTable\(section\.key\)/, 'All view gives the three table sections a compact visible gap')
  assert.doesNotMatch(pageSource, /<section className="overflow-hidden border border-slate-300 bg-white" aria-label="Working dataset tables"/, 'All view is not wrapped in one shared table card')
  assert.doesNotMatch(tableChromeSource, /MasterDataTableFooter|<footer/, 'table chrome contains no per-table footer')
  assert.match(tableChromeSource, /<h3[^>]*>\{title\}<\/h3>[\s\S]*\{rowCount\} rows · \{selectedCount\} selected/, 'table header always shows its title and row/selection totals, including zero')
  assert.match(tableChromeSource, /warningCount > 0[\s\S]*\{warningCount\}[\s\S]*blockerCount > 0[\s\S]*\{blockerCount\}[\s\S]*onAddRow/, 'table header shows Warning and Blocker counters before Add Row even at zero')
  assert.match(tableChromeSource, /<Tooltip label="Jump to next warning">[\s\S]*<Tooltip label="Jump to next blocker">/, 'table issue counter tooltips describe their local jump actions')
  assert.match(bomSource, /<th scope="col" className="px-2 py-2 text-left">Material<\/th>[\s\S]*Usage[\s\S]*Unit[\s\S]*Price[\s\S]*Loss[\s\S]*Note/, 'BOM uses the full Material label and approved column order')
  assert.match(wcSource, /Work Center[\s\S]*Labor Rate[\s\S]*Burden Rate[\s\S]*Note/, 'Work Centers uses full professional labels')
  assert.match(routingSource, /Process[\s\S]*Work Center[\s\S]*Manning[\s\S]*Capacity[\s\S]*Yield[\s\S]*Note/, 'Routing uses full professional labels')
  for (const [tableSource, tableLabel, fields] of [
    [bomSource, 'BOM', ['Usage', 'Unit', 'Price', 'Loss']],
    [wcSource, 'Work Centers', ['Work Center', 'Labor Rate', 'Burden Rate']],
    [routingSource, 'Routing', ['Work Center', 'Manning', 'Capacity', 'Yield']],
  ]) {
    for (const field of fields) {
      assert.match(tableSource, new RegExp(`<th scope="col" className="px-2 py-2 text-center">${field}<\\/th>`), `${tableLabel} ${field} heading is centered`)
    }
    assert.match(tableSource, /font-mono tabular-nums[^\n]*text-center|text-center font-mono tabular-nums/, `${tableLabel} structured values use centered cells`)
    assert.match(tableSource, /numericClass[\s\S]*text-center/, `${tableLabel} numeric edit controls center their values`)
  }
  assert.match(bomSource, /max-w-20[\s\S]*max-w-12[\s\S]*max-w-24[\s\S]*w-16/, 'BOM numeric fields stay compact and centered in wider columns')
  assert.match(wcSource, /max-w-24/, 'Work Center rate controls stay compact within their columns')
  assert.match(routingSource, /max-w-20[\s\S]*max-w-24[\s\S]*w-16/, 'Routing numeric fields stay compact within their columns')
  assert.match(bomSource, /relative mx-auto w-full max-w-20[\s\S]*MasterDataBlockerMarker/, 'BOM blocker marker overlays the actual compact field without taking layout width')
  assert.match(wcSource, /relative mx-auto w-full max-w-24[\s\S]*MasterDataBlockerMarker/, 'Work Center blocker markers overlay compact fields without taking layout width')
  assert.match(routingSource, /relative mx-auto w-full max-w-20[\s\S]*MasterDataBlockerMarker/, 'Routing blocker markers overlay compact fields without taking layout width')
  assert.match(pageSource, /setMasterDataRole\(item\.role\)[\s\S]*tableView: item\.table/, 'warning navigation selects the affected dataset and table')
  assert.match(pageSource, /updateMasterDataUiState\(\{ type: 'set-mode', mode: 'edit' \}\)[\s\S]*tableView: item\.table/, 'warning navigation switches to Edit and the affected table')
  assert.match(pageSource, /handleWarningNavigationHandled[\s\S]*current\?\.requestId === requestId \? undefined : current/, 'warning navigation consumes the completed request')
  assert.match(warningFocusSource, /setSearchQuery\(''\)[\s\S]*scrollIntoView[\s\S]*selectRow\(target\.rowId\)[\s\S]*focusTarget\.focus[\s\S]*onNavigationHandled\(target\.requestId\)/, 'warning navigation clears filters, selects the row, scrolls, focuses the source, and consumes its target')
  assert.match(footerSource, /const warningItems = buildMasterDataWarningItems\(masterDataSnapshots\)[\s\S]*const warningCount = warningItems\.length/, 'footer total uses affected warning-item count')
  assert.match(footerSource, /const blockerItems = buildMasterDataBlockerItems\(masterDataSnapshots\)[\s\S]*const warningCount = warningItems\.length[\s\S]*areMasterDataDatasetsReady\(masterDataHandoff, blockerItems\)/, 'Footer derives readiness from blockers while the warning total excludes them')
  assert.match(footerSource, /Datasets \{datasetsReady \? 'Ready' : 'Incomplete'\}/, 'footer uses the finalized compact readiness wording')
  assert.match(footerSource, /BOM \{snapshotPair\.reference\.bom\.length\} · WC \{snapshotPair\.reference\.rates\.length\} · RTG \{snapshotPair\.reference\.routing\.length\}/, 'Reference structural counts use BOM, WC, RTG order')
  assert.match(footerSource, /BOM \{snapshotPair\.current\.bom\.length\} · WC \{snapshotPair\.current\.rates\.length\} · RTG \{snapshotPair\.current\.routing\.length\}/, 'Current structural counts use BOM, WC, RTG order')
  const footerReadinessTooltipSource = footerSource.slice(footerSource.indexOf('id="footer-dataset-status-tooltip"'), footerSource.indexOf('aria-label={`Datasets'))
  assert.match(footerReadinessTooltipSource, /datasetReadiness\.map\(\(\{ label, blockerCount \}\)[\s\S]*CircleX[\s\S]*blockerCount/, 'Footer status tooltip contains Reference and Current blocker icon/count rows')
  assert.doesNotMatch(footerReadinessTooltipSource, /ready|Ready|Incomplete/, 'Footer readiness tooltip does not repeat readiness labels')
  assert.match(footerSource, /id="footer-product-status-tooltip"[\s\S]*formatProductIdentityForDisplay\(snapshotPair\.reference\.product\)[\s\S]*formatProductIdentityForDisplay\(snapshotPair\.current\.product\)/, 'Footer Product tooltip uses the shared full-name and missing-component formatter')
  const productStatusMarkupSource = footerSource.slice(footerSource.indexOf('aria-label=\{productDisplayLabel\}'), footerSource.indexOf('id="footer-warning-tooltip"'))
  assert.doesNotMatch(productStatusMarkupSource, /<button|onClick=|requestMasterDataPrepareDataset/, 'Product Match/Mismatch/Not Set is display-only in the Footer')
  assert.match(footerSource, /const FooterTooltip[\s\S]*pointer-events-none fixed[\s\S]*max-w-\[min\(28rem,calc\(100vw-1rem\)\)\]/, 'Footer tooltips are fixed overlays with a wider viewport-safe maximum')
  assert.match(footerSource, /const preferredLeft = wrapper\.left \+ \(wrapper\.width - tooltipWidth\) \/ 2[\s\S]*const left = Math\.max\(8, Math\.min\(preferredLeft, window\.innerWidth - tooltipWidth - 8\)\)/, 'all Footer tooltips center above their trigger and clamp within the viewport')
  assert.match(footerSource, /setTimeout\(\(\) => \{[\s\S]*positionTooltip\(\)[\s\S]*setVisible\(true\)[\s\S]*\}, 275\)/, 'Footer hover tooltips wait 275ms while keyboard focus opens immediately')
  assert.match(footerSource, /footerTop - tooltipHeight - 8/, 'Footer tooltips remain above the entire Footer area')
  assert.match(footerSource, /warningBreakdown = MASTER_DATA_WARNING_CATEGORY_DEFINITIONS[\s\S]*filter\(item => item\.count > 0\)/, 'Footer warning breakdown excludes zero-count categories')
  assert.match(footerSource, /id="footer-warning-tooltip"[\s\S]*warningBreakdown\.map/, 'Footer warning tooltip lists the filtered warning breakdown without a heading or total')
  assert.doesNotMatch(footerSource.slice(footerSource.indexOf('id="footer-warning-tooltip"'), footerSource.indexOf('aria-label={`Toggle Prepare Dataset showing')), /title=|Warnings|warningCount/, 'Footer warning tooltip contains only the non-zero warning categories')
  assert.doesNotMatch(footerSource, /align="right"|align="center"/, 'Footer tooltip placement does not vary by trigger')
  assert.match(footerSource, /productDotClass = productDisplayStatus === 'match'[\s\S]*bg-emerald-400[\s\S]*bg-violet-400[\s\S]*bg-slate-400/, 'Footer Product Match/Mismatch/Not Set uses green/violet/neutral dots')
  assert.match(footerSource, /productStatusClass = productDisplayStatus === 'match'[\s\S]*text-emerald-300[\s\S]*text-violet-300[\s\S]*text-slate-300/, 'Footer Product Match/Mismatch/Not Set uses green/violet/neutral text')
  assert.match(footerSource, /warningCount > 0 \? 'text-amber-300 hover:text-amber-200' : 'text-slate-400 hover:text-slate-300'/, 'Footer warning color remains amber and distinct from violet Product Mismatch')
  assert.doesNotMatch(footerSource.slice(footerSource.indexOf('footer-product-status-tooltip'), footerSource.indexOf('footer-warning-tooltip')), /Chevron|ChevronRight|ChevronDown/, 'Footer Product tooltip has no chevron')
  assert.match(footerSource, /id="footer-warning-action"[\s\S]*onClick=\{\(\) => requestMasterDataPrepareDataset\('all-warnings'\)\}[\s\S]*aria-expanded=\{masterDataPrepareDatasetOpen\}[\s\S]*\{warningCount\}/, 'footer warning count toggles the shared Prepare Dataset panel')
  assert.match(footerSource, /aria-label=\{`Toggle Prepare Dataset showing \$\{warningCount\} warnings`\}/, 'footer warning count has an accessible toggle label')
  assert.match(footerSource, /fullSnapshotComparison\.referenceCost\.total[\s\S]*fullSnapshotComparison\.currentCost\.total[\s\S]*fullSnapshotComparison\.totalGap/, 'footer uses full Reference/Current Standard Costs and their full net gap')
  assert.doesNotMatch(footerSource, /snapshotComparison\.totalGap|isSelectedComparisonActive|SELECTED GAP/, 'footer never switches to a Selected Comparison gap')
  assert.match(footerSource, /REF STD[\s\S]*CUR STD[\s\S]*NET GAP/, 'footer labels both full Standard Costs and Net Gap')
  assert.match(footerSource, /value === null \|\| !Number\.isFinite\(value\) \? '—'/, 'unavailable Standard Cost remains a dash rather than fabricated zero')
  assert.match(footerSource, /totalGap !== null && Number\.isFinite\(totalGap\)/, 'unavailable or non-finite Net Gap remains neutral')
  assert.match(footerSource, /totalGap > 0[\s\S]*text-rose-300[\s\S]*totalGap < 0[\s\S]*text-emerald-300[\s\S]*text-slate-300/, 'Net Gap colors are positive rose, negative emerald, and zero neutral')
  assert.match(readyFooterMarkup, /<div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden/, 'app shell fills the viewport and contains scrolling')
  assert.match(readyFooterMarkup, /<main id="main-content" tabindex="-1" class="min-h-0 min-w-0 flex-1 overflow-y-auto pt-0 pb-3 \[scrollbar-gutter:stable\]"><div class="app-workspace-frame">/, 'full-width Master Data Main owns scrolling, removes the toolbar gap, and reserves a stable scrollbar gutter')
  assert.doesNotMatch(footerSource.match(/<main[\s\S]*?className=\{([^}]*)\}/)?.[1] ?? '', /app-workspace-frame/, 'the scroll container itself is not constrained to the centered frame')
  assert.match(readyFooterMarkup, /<footer aria-label="Dataset and comparison status" class="w-full shrink-0/, 'Footer remains in the shell flow without using fixed positioning')
  assert.doesNotMatch(footerSource.match(/<div className="flex h-dvh[^\"]*"/)?.[0] ?? '', /fixed/, 'Footer layout does not use a fixed overlay')
  assert.match(navbarSource, /className="app-workspace-frame"/, 'Header content shares the centered workspace frame')
  assert.match(globalCssSource, /\.app-workspace-frame[\s\S]*max-w-\[1440px\][\s\S]*px-3 sm:px-4 lg:px-6/, 'Header, Main, and Footer use one bounded shared frame rule')
  assert.match(footerSource, /className="app-workspace-frame flex flex-wrap[\s\S]*xl:flex-nowrap/, 'footer groups wrap responsively and share one compact desktop row')
  const footerPrepareRequestSource = storeSource.slice(storeSource.indexOf('const requestMasterDataPrepareDataset'), storeSource.indexOf('const addUOM'))
  assert.doesNotMatch(footerPrepareRequestSource, /setActiveTab\(/, 'Footer warning requests open Prepare Dataset without navigating away from the current page')
  assert.match(footerSource, /requestMode=\{masterDataPrepareDatasetRequestMode\}/, 'the shared Prepare Dataset panel receives the Footer request mode')
  assert.match(preparePopoverSource, /if \(requestMode\) resetUiState\(\)/, 'Footer all-warning requests clear panel-only filters and expanded categories')
  assert.match(navbarSource, /const navItems = \[[\s\S]*\{ id: 'master', label: 'Master Data' \}[\s\S]*\{ id: 'breakdown', label: 'Cost Breakdown' \}[\s\S]*\{ id: 'candidate', label: 'Candidate' \}[\s\S]*\{ id: 'simulation', label: 'Simulation' \}[\s\S]*\] as const/, 'Global Header navigation contains the four exact primary labels in order')
  assert.doesNotMatch(navbarSource, /Candidate \/ RCA|workflowStatus|Ready|Not Ready|Selected Comparison|Missing data/, 'Global Header omits workflow guidance and uses Candidate wording')
  const headerOrder = [
    navbarSource.indexOf('>COSTBREAKDOWN</span>'),
    navbarSource.indexOf('<nav aria-label="Main navigation"'),
    navbarSource.indexOf('aria-label="Workspace utilities"'),
    navbarSource.indexOf('aria-label="Undo"'),
    navbarSource.indexOf('aria-label="Redo"'),
    navbarSource.indexOf('aria-label="Prepare Dataset"')
  ]
  assert.ok(headerOrder.every((position, index) => position >= 0 && (index === 0 || position > headerOrder[index - 1])), 'Header renders brand/context left, navigation centered, then Undo/Redo/Info at right')
  assert.match(navbarSource, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\][\s\S]*justify-center/, 'desktop Header centers navigation between left and right zones')
  assert.match(navbarSource, /text-base font-bold tracking-tight text-slate-100/, 'COSTBREAKDOWN leads the Header with larger, bolder branding')
  assert.match(navbarSource, /text-\[11px\] font-normal text-slate-300/, 'product context remains visually secondary to the brand')
  assert.doesNotMatch(navbarSource, /Search|role="search"|disabled:cursor-not-allowed/, 'Header has no Search or prohibited disabled cursor')
  assert.match(navbarSource, /disabled=\{!isMasterData \|\| !canUndoMasterDataEdit\}/, 'Undo stays visible and is disabled outside Master Data or without history')
  assert.match(navbarSource, /disabled=\{!isMasterData \|\| !canRedoMasterDataEdit\}/, 'Redo stays visible and is disabled outside Master Data or without redo history')
  assert.match(navbarSource, /onClick=\{toggleMasterDataPrepareDataset\}[\s\S]*aria-label="Prepare Dataset"[\s\S]*<Info/, 'the Header Info icon toggles Prepare Dataset without competing with its hover preview')
  assert.match(navbarSource, /col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center[\s\S]*lg:col-start-2/, 'Header navigation can wrap on narrow widths and stays in the centered desktop zone')
  assert.match(headerSource, /type="search"[\s\S]*aria-label="Search Master Data"[\s\S]*value=\{searchQuery\}[\s\S]*onSearchQueryChange\(event\.target\.value\)/, 'the existing search query is exposed locally in the Master Data toolbar')
  assert.match(headerSource, /tableView === 'all'[\s\S]*'Search all tables'[\s\S]*tableView === 'wc'[\s\S]*'Search Work Centers'[\s\S]*tableView === 'routing'[\s\S]*'Search Routing'[\s\S]*'Search BOM'/,
    'Search placeholder follows the active table view')
  assert.match(headerSource, /role="search" className="relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0"/,
    'Search has a fixed 192px width that cannot change with its placeholder')
  assert.match(headerSource, /className="flex flex-wrap items-center gap-1\.5[\s\S]*xl:flex-nowrap"/,
    'toolbar keeps its action and selector groups together on desktop')
  assert.match(headerSource, /aria-pressed=\{!isEditMode\}[\s\S]*aria-label="View"[\s\S]*<Eye className="h-4 w-4"/, 'View uses an accessible icon-only Eye control')
  assert.match(headerSource, /aria-pressed=\{isEditMode\}[\s\S]*aria-label="Edit"[\s\S]*<Pencil className="h-4 w-4"/, 'Edit uses an accessible icon-only Pencil control')
  assert.match(headerSource, /const datasetSaveStateDotClass = \(state: MasterDataSaveState, size = 'h-1\.5 w-1\.5'\)/, 'dataset save-state dots retain their existing size')
  assert.match(headerSource, /aria-pressed=\{showWarningHighlights\}[\s\S]*Hide warning highlights[\s\S]*Show warning highlights[\s\S]*!<\/span>[\s\S]*rotate-\[-45deg\]/,
    'warning visibility uses an accessible toggle and a diagonal slash when hidden')
  assert.match(headerSource, /left-1\/2 top-1\/2 h-px w-\[17px\] -translate-x-1\/2 -translate-y-1\/2 rotate-\[-45deg\]/,
    'the hidden Warning slash is a centered one-pixel diagonal with no geometry change')
  assert.match(headerSource, /onPointerEnter=\{\(\) => \{[\s\S]*if \(!cloneMenuPinned\) setCloneMenuOpen\(true\)/,
    'Clone hover preview opens without pinning')
  assert.match(headerSource, /setCloneMenuPinned\(true\)[\s\S]*setCloneMenuOpen\(true\)/,
    'Clone click pins the preview while keyboard activation uses the native button')
  assert.doesNotMatch(headerSource.slice(headerSource.indexOf('ref={cloneTriggerRef}'), headerSource.indexOf('{cloneMenuOpen &&')), /onFocus=/,
    'Clone does not open by focus alone')
  assert.match(headerSource, /roles\.filter\(sourceRole => sourceRole !== role\)[\s\S]*From \{roleLabels\[sourceRole\]\}/,
    'Clone presents concise source options while excluding the destination')
  assert.doesNotMatch(bomSource, /aria-label="Search BOM"|placeholder="Search BOM/, 'BOM no longer renders a per-table search box')
  assert.doesNotMatch(routingSource, /aria-label="Search Routing"|placeholder="Search Routing/, 'Routing no longer renders a per-table search box')
  assert.match(pageSource, /searchQuery=\{searchQuery\}[\s\S]*onSearchQueryChange=\{onSearchQueryChange\}/, 'the same Master Data query flows to the toolbar and existing tables')
  assert.match(headerSource, /type="text"[\s\S]*aria-label="UOM"[\s\S]*onUpdateProduct\(\{ \.\.\.product, uom: event\.target\.value \}\)/, 'UOM is editable as free text')
  assert.match(headerSource, /xl:grid-cols-\[minmax\(0,3fr\)_minmax\(0,1fr\)_minmax\(0,2fr\)_minmax\(0,1fr\)_minmax\(0,4fr\)\]/,
    'inline metadata widths remain stable and follow the requested relative sizing')
  assert.match(headerSource, /Product Name :[\s\S]*UOM :[\s\S]*Selling Price \(THB\) :[\s\S]*SG&amp;A \(%\) :[\s\S]*Remark :/,
    'metadata uses compact inline label-value pairs without a heading')
  assert.doesNotMatch(headerSource, /<h[1-6][^>]*>Metadata<\/h[1-6]>/, 'metadata has no redundant section heading')
  assert.match(headerSource, /placeholder=\{searchPlaceholder\}/, 'Search uses a table-aware placeholder independent of its fixed wrapper width')
  assert.match(storeSource, /normalizeMasterDataSnapshot\(mutate\(currentDataset\), currentDataset\)/, 'all dataset edit paths normalize identities, including direct edit, paste, and bulk updates')
  assert.match(storeSource, /isMasterDataSnapshotChangeValid\(currentDataset, nextDataset\)/, 'direct edits and spreadsheet paste reject newly invalid or unresolved values at the Working boundary')
  assert.match(storeSource, /filterInvalidMasterDataNumericChanges\(changes\)/, 'mixed spreadsheet pastes preserve valid cells while rejecting invalid numeric cells')
  assert.match(storeSource, /knownWorkCenters\.has\(proposed\.toLocaleLowerCase\(\)\)/, 'Routing edits reject newly entered unavailable Work Centers')
  assert.match(storeSource, /getMasterDataSnapshotValidationErrors\(result\.snapshot\)/, 'the store rejects invalid or unresolved snapshots before applying an Import result')
  assert.match(developmentMockSource, /getMasterDataSnapshotValidationErrors\(nextPair\.reference\)[\s\S]*getMasterDataSnapshotValidationErrors\(nextPair\.current\)/, 'development mock data also passes the ordinary Working data validation boundary')
  assert.match(snapshotParserSource, /getMasterDataSnapshotValidationErrors\(snapshot\)[\s\S]*success: false[\s\S]*format: 'canonical'/, 'canonical imports reject invalid numeric values and unavailable nonblank Routing Work Centers')
  assert.match(snapshotParserSource, /canonicalResult\.success \|\| canonicalResult\.format === 'canonical'/, 'validation-rejected canonical workbooks cannot fall through to legacy import parsing')
  assert.match(importDropzoneSource, /onParsed\(await parseSnapshotExcelInputFile\(file, importRole, \{ allowLegacy: false \}\)\)/,
    'Import parses and validates a workbook before passing it back to the modal')
  assert.doesNotMatch(importDropzoneSource, /importSnapshotFromExcel|useAppStore/, 'file selection does not mutate Working data')
  assert.match(importModalSource, /canImport = !isParsing && parsedImport\?\.success === true[\s\S]*onImport\(parsedImport\)/,
    'Working data changes only after the explicit Import action')
  assert.match(importModalSource, /hasWorkingData && parsedImport\?\.success[\s\S]*This will replace \{targetLabel\} Working data\. Last Saved remains unchanged\./,
    'replacement context appears only for a populated Working dataset')
  assert.doesNotMatch(importModalSource, /window\.confirm|Import will replace.*\n.*confirm/i, 'Import has no second confirmation')
  assert.match(sizingModalSource, /max-w-\[40rem\][\s\S]*aria-label="Dataset metadata"[\s\S]*aria-label="Dataset row counts"/,
    'Sizing presents Dataset metadata and row counts in a narrower compact centered dialog')
  assert.match(sizingModalSource, /value=\{productName\}[\s\S]*value=\{uom\}[\s\S]*value=\{sellingPrice\}[\s\S]*value=\{sgaPercent\}[\s\S]*value=\{remark\}/,
    'Sizing retains all local metadata draft fields')
  assert.match(sizingModalSource, /buildSizingDraft\(\)[\s\S]*getPopulatedRowsRemovedBySizing\(snapshot, nextSizing\)[\s\S]*onSaveSizing\(nextSizing\)[\s\S]*onClose\(\)/,
    'Sizing still validates its draft, protects populated truncation, and applies only on Apply')
  assert.match(sizingModalSource, /const templateSnapshot = \{ \.\.\.snapshot, product: nextProduct, remark, sizing: nextSizing \}/,
    'Download Template uses the uncommitted dialog draft')
  assert.match(sizingModalSource, /error instanceof RangeError \? error\.message : 'Template could not be generated\. Please try again\.'/,
    'unexpected ExcelJS or Vite failures use concise dialog copy instead of exposing module URLs')
  assert.match(sizingModalSource, /type="number"[\s\S]*min="1"[\s\S]*max=\{max\}[\s\S]*onChange=\{event => \{ setValue\(event\.target\.value\); setSizingError\(''\) \}\}/,
    'Sizing row counts remain directly editable numeric inputs with validation bounds')
  assert.ok(sizingModalSource.includes('className="grid grid-cols-1 gap-2 sm:grid-cols-3"')
    && sizingModalSource.includes("renderRowCount('Bill of Materials'")
    && sizingModalSource.includes("renderRowCount('Work Centers'")
    && sizingModalSource.includes("renderRowCount('Routing'"),
  'row count controls use three desktop columns in BOM, Work Centers, Routing order')
  assert.doesNotMatch(sizingModalSource, /Decrease \$\{label\} rows|Increase \$\{label\} rows|changeCount|[−+]/,
    'Sizing has no custom decrement or increment controls')
  assert.match(sizingModalSource, /DATASET_SIZING_LIMITS\.bomCount[\s\S]*DATASET_SIZING_LIMITS\.wcCount[\s\S]*DATASET_SIZING_LIMITS\.routingCount/,
    'BOM, Work Centers, and Routing controls use their existing maximum limits')
  assert.match(sizingModalSource, /<Download className="h-3\.5 w-3\.5" aria-hidden="true" \/>[\s\S]*Download Template/, 'Download Template uses a down-arrow action icon')
  assert.match(sizingModalSource, /border-t border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between[\s\S]*Download Template[\s\S]*Apply Sizing/, 'Download Template stays at the lower left, secondary to Apply')
  assert.match(importDropzoneSource, /role="group"[\s\S]*type="button"[\s\S]*onClick=\{openFilePicker\}[\s\S]*onDragOver=\{event => \{ event\.preventDefault\(\); setIsDragging\(true\) \}\}[\s\S]*onDrop=\{handleDrop\}/,
    'the full-size centered dashed dropzone is a keyboard-accessible click and drag/drop target')
  assert.match(importDropzoneSource, /CloudUpload/, 'Import uses one centered cloud-upload icon')
  assert.match(importDropzoneSource, /min-h-36 w-full[\s\S]*border-dashed/, 'Import dropzone has a taller responsive target without widening the dialog')
  assert.match(importDropzoneSource, /Drop an \.xlsx workbook here[\s\S]*\.xlsx files only/,
    'Import dropzone uses concise .xlsx-only wording')
  assert.doesNotMatch(importDropzoneSource, />Browse<|Choose another file/, 'Import dropzone has no secondary Browse button')
  assert.match(importModalSource, /max-w-lg/, 'the Import dialog retains its width while the dropzone grows taller')
  assert.doesNotMatch(importModalSource, /FileSpreadsheet/, 'the Import title has no decorative spreadsheet icon')
  assert.doesNotMatch(importModalSource, /\.xls(?!x)/, 'Import error copy does not describe legacy .xls files')
  assert.match(importDropzoneSource, /extension\.endsWith\('\.xlsx'\)[\s\S]*Choose an Excel workbook \(\.xlsx\)\.[\s\S]*accept="\.xlsx"[\s\S]*\.xlsx files only/,
    'Import accepts and describes only .xlsx files')
  assert.doesNotMatch(importDropzoneSource, /\.xls(?!x)/, 'Import does not list or accept legacy .xls files')
  assert.match(importModalSource, /getImportErrorSummary\(parsedImport\.message\)/,
    'Import errors are summarized for the user rather than exposing raw parser messages')
  assert.match(importModalSource, /parsedImport\.snapshot\.bom\.length[\s\S]*parsedImport\.snapshot\.rates\.length[\s\S]*parsedImport\.snapshot\.routing\.length/,
    'valid Import state shows concise BOM, Work Center, and Routing counts')
  assert.match(importModalSource, /hasWorkingData && parsedImport\?\.success[\s\S]*This will replace \{targetLabel\} Working data\. Last Saved remains unchanged\./,
    'replacement context is concise and appears only after a valid workbook is ready')
  assert.match(validationSource, /field === 'capacity' \|\| field === 'yield'[\s\S]*value <= 0[\s\S]*field === 'yield' && value > 1/, 'ingress validation reuses the existing positive Capacity and bounded Yield rules')
  assert.match(footerSource, /Complete Mock[\s\S]*Incomplete Mock/, 'the shared Prepare Dataset panel exposes direct Complete Mock and Incomplete Mock actions')
  assert.doesNotMatch(pageSource, /Load Mock Data|window\.confirm\(`(?:Complete|Incomplete) Mock/, 'mock fixtures load without a generic action label or confirmation')
  assert.match(appSource, /getElementById\('main-content'\)\?\.scrollTo\(\{ top: 0, behavior: 'auto' \}\)[\s\S]*\[activeTab\]/, 'changing pages resets the shared content viewport to its heading')
  assert.doesNotMatch(pageSource, /Load complete review mock|Load data-quality mock|Return to working session|window\.confirm/, 'mock loading is immediate and has no session-return UI or confirmation')
  const tableSelectorSource = pageSource.slice(pageSource.indexOf('const tableSections'), pageSource.indexOf('return (\n    <div className="w-full space-y-2">'))
  assert.match(tableSelectorSource, /grid h-8 w-72 shrink-0 grid-cols-4 items-stretch/, 'table selector keeps four equal columns at a stable 32px height')
  assert.match(tableSelectorSource, /inline-flex h-full w-full items-center justify-center/, 'mapped table options and All use equal fixed-height controls')
  assert.doesNotMatch(bomSource + wcSource + routingSource, /max-h-\[520px\]/, 'Master Data tables grow with page content instead of creating nested vertical scrollers')
  assert.match(bomSource, /className="overflow-x-auto"/)
  assert.match(wcSource, /className="overflow-x-auto"/)
  assert.match(routingSource, /className="overflow-x-auto"/)
  assert.match(tableSelectorSource, /navLabel: 'BOM'[\s\S]*navLabel: 'Work Centers'[\s\S]*navLabel: 'Routing'[\s\S]*>\s*All\s*</, 'table selector order is BOM, Work Centers, Routing, All')
  assert.match(pageSource, /className=\{isAllTablesVisible \? 'space-y-3' : ''\}[\s\S]*tableSections\.map\(section => \([\s\S]*<section[\s\S]*aria-label=\{section\.label\}[\s\S]*\{renderTable\(section\.key\)\}/, 'All view separates BOM, Work Centers, and Routing into distinct bordered table sections')
  assert.match(pageSource, /onNavigateBlocker: \(item: MasterDataQualityItem\) => handleWarningNavigation\(item, true\)/, 'each table-local Blocker navigator requests All-view preservation')
  assert.match(pageSource, /if \(!preserveAllView \|\| !isAllTablesVisible\)[\s\S]*tableView: item\.table/, 'local Blocker navigation stays in All while warning details can switch tables')
  assert.match(headerSource, /<Tooltip label=\{hasExportableSavedData \? 'Export Last Saved' : 'No saved table data to export'\}>/, 'Export custom tooltip states it uses Last Saved data')
  assert.match(headerSource, /exportSnapshotToExcel\(lastSavedSnapshot\)/, 'Export passes the Last Saved snapshot to the workbook generator')
  assert.match(headerSource, /const showSaveFilePicker = \(window as SaveFilePickerWindow\)\.showSaveFilePicker[\s\S]*showSaveFilePicker\.call\(window[\s\S]*suggestedName: filename[\s\S]*downloadBlob\(blob, filename\)/,
    'Export attempts native Save As and falls back to a browser download')
  const exportHandlerSource = headerSource.slice(headerSource.indexOf('const handleExportDataset'), headerSource.indexOf('const handleResetDataset'))
  assert.match(exportHandlerSource, /const saveFileHandlePromise = showSaveFilePicker\.call\(window[\s\S]*const handle = await saveFileHandlePromise[\s\S]*await import\('\.\.\/\.\.\/\.\.\/services\/excel\/snapshot-export'\)/,
    'Export opens Save As directly from the user activation before the asynchronous exporter is loaded')
  assert.match(headerSource, /const hasExportableSavedData = Boolean\(lastSavedSnapshot && hasEnteredMasterData\(lastSavedSnapshot\)\)[\s\S]*disabled=\{!hasExportableSavedData\}/,
    'Export is disabled only when the active Last Saved snapshot has no exportable data')
  assert.match(storeSource, /const masterDataLastSavedSnapshot = getLastSavedMasterData\(activeSession, masterDataRole\)\?\.snapshot/, 'the active role supplies its own Last Saved snapshot to Export')
  assert.match(headerSource, /onClick=\{\(\) => \{ void handleExportDataset\(\) \}\}[\s\S]*<Upload className="h-4 w-4" aria-hidden="true" \/>/, 'Export uses an upward arrow from a tray/box')
  assert.match(headerSource, /onClick=\{onOpenImportModal\}[\s\S]*<FileSpreadsheet className="h-4 w-4" aria-hidden="true" \/>/, 'Import uses a spreadsheet/file icon')
  assert.match(bomSource, /invalid \? 'border-amber-600' : 'border-slate-300'[\s\S]*showWarningHighlights && \(invalid \|\| missing\) \? 'bg-amber-50' : 'bg-white'/,
    'BOM warning and blocker yellow fills follow the visibility toggle while validation borders remain')
  assert.match(wcSource, /invalid \? 'border-amber-600' : 'border-slate-300'[\s\S]*showWarningHighlights && \(invalid \|\| missing\) \? 'bg-amber-50' : 'bg-white'/,
    'Work Center warning and blocker yellow fills follow the visibility toggle while validation borders remain')
  assert.match(routingSource, /invalid \? 'border-amber-600' : 'border-slate-300'[\s\S]*showWarningHighlights && \(invalid \|\| missing\) \? 'bg-amber-50' : 'bg-white'/,
    'Routing warning and blocker yellow fills follow the visibility toggle while validation borders remain')
  assert.match(bomSource + wcSource + routingSource, /identityWarning && showWarningHighlights \? 'bg-amber-50' : ''/, 'generated identity yellow fills follow the visibility toggle')
  assert.match(bomSource + wcSource + routingSource, /showWarningHighlights \? 'bg-amber-50' : ''/, 'all blocker cell yellow fills follow the same Warning toggle')
  assert.match(blockerMarkerSource, /aria-label=\{label\}[\s\S]*pointer-events-none absolute[\s\S]*text-rose-600[\s\S]*>\s*\*\s*</, 'blocker star is a small accessible overlay rather than content in the field flow')
  assert.match(bomSource + wcSource + routingSource, /<MasterDataBlockerMarker/, 'BOM, Work Centers, and Routing render blocker stars through the shared overlay marker')
  assert.doesNotMatch(bomSource + wcSource + routingSource, /pr-(?:3|4|5)(?:\s|`)/, 'blocker markers do not reserve padding that shifts values or narrows their inputs')
  assert.match(bomSource + wcSource + routingSource, /relative inline-block[^\n]*MasterDataBlockerMarker className="right-0 top-0"/, 'View-mode blocker stars overlay the actual value wrapper')
  assert.match(routingSource, /workCenterInvalid \? `\$\{showWarningHighlights \? 'bg-amber-50' : ''\} text-amber-900` : ''[\s\S]*showWarningHighlights && workCenterInvalid \? 'bg-amber-50' : 'bg-white'/,
    'unresolved Work Center blocker yellow fill follows the toggle while its text and red required marker remain')
  assert.doesNotMatch(headerSource + pageSource + bomSource + wcSource + routingSource + navbarSource + footerSource + sizingModalSource + importDropzoneSource, /cursor-not-allowed/,
    'Master Data and shared workspace controls never use the prohibited disabled cursor')
  assert.doesNotMatch(appSourceFiles, /cursor-not-allowed/, 'no app source file uses the prohibited disabled cursor')

  const savedFixtures = {
    reference: { ...fixtureSnapshot('reference'), id: 'saved-reference' },
    current: fixtureSnapshot('current'),
    custom: { ...fixtureSnapshot('custom'), id: 'saved-custom' }
  }
  const { getLastSavedMasterData } = await vite.ssrLoadModule('/src/state/master-data-datasets.ts')
  const lastSavedSession = {
    lastSavedMasterData: {
      reference: { snapshot: savedFixtures.reference },
      current: { snapshot: savedFixtures.current }
    },
    customLastSavedMasterData: { snapshot: savedFixtures.custom }
  }
  for (const role of ['reference', 'current', 'custom']) {
    assert.equal(getLastSavedMasterData(lastSavedSession, role)?.snapshot, savedFixtures[role], `${role} resolves its own Last Saved snapshot`)
  }
  assert.equal(getLastSavedMasterData({ ...lastSavedSession, customLastSavedMasterData: undefined }, 'custom'), undefined,
    'Custom has no export source until it has its own Last Saved snapshot')
  for (const role of ['reference', 'current', 'custom']) {
    const lastSaved = role === 'custom' ? undefined : savedFixtures[role]
    const markup = await renderMasterDataPage(
      { role, mode: 'view', tableView: 'all' },
      {
        masterDataLastSavedSnapshot: lastSaved,
        masterDataLastSavedSnapshots: lastSaved ? { [role]: lastSaved } : {}
      }
    )
    const exportButton = [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
      .find(([, attributes]) => attributes.match(/\baria-label="([^"]+)"/)?.[1] === 'Export Last Saved')
    assert.ok(exportButton, `${role} has an Export control`)
    assert.equal(/\sdisabled(?:=""|\s|>)/.test(exportButton[1]), !lastSaved,
      `${role} Export follows the availability of that role's Last Saved snapshot`)
    if (role === 'reference' && lastSaved) {
      assert.equal(pressedButton(markup, 'Reference'), true, 'Reference can be Draft while retaining an enabled Last Saved export')
    }
  }
  const snapshotImportFlow = storeSource.slice(
    storeSource.indexOf('const importSnapshotFromExcel'),
    storeSource.indexOf('const loadDevelopmentMockData')
  )
  assert.ok(snapshotImportFlow.includes('...source'), 'Import replaces Working data within the existing session')
  assert.ok(snapshotImportFlow.includes('importSnapshotForRole(existingPair, source.datasetSizing, result.role, result.snapshot)'), 'Reference/Current import replaces only the selected Working side')
  assert.ok(snapshotImportFlow.includes('customMasterData: normalizeMasterDataSnapshot(imported.snapshot)') && snapshotImportFlow.includes('customDatasetSizing: imported.sizing'), 'Custom import replaces only Custom Working data after identity normalization')
  assert.doesNotMatch(snapshotImportFlow, /lastSavedMasterData|customLastSavedMasterData/, 'Import never overwrites any dataset Last Saved state')
  assert.match(storeSource, /saveMasterDataWorkingDataset\s*=\s*\(role: MasterDataRole\)[\s\S]*lastSavedMasterData:[\s\S]*\[role\]: saved/, 'Save writes a Last Saved copy only for the viewed dataset')
  assert.match(storeSource, /resetMasterDataWorkingDataset\s*=\s*\(role: MasterDataRole\)[\s\S]*getLastSavedMasterData\(session, role\)/, 'Reset reads only the viewed dataset Last Saved state')
  assert.match(storageSource, /sessionStorage\.getItem[\s\S]*sessionStorage\.setItem/, 'in-session data is held in browser session storage')
  assert.doesNotMatch(storageSource, /localStorage|indexedDB/, 'Master Data does not use permanent browser storage')
  assert.doesNotMatch(storeSource, /DevelopmentReviewFixture|returnFromDevelopmentReviewFixture/, 'no separate review session is stored')
  assert.match(storeSource, /recordMasterDataPairWorkingEdit\(source, updated\)/, 'mock load is recorded in the ordinary shared undo/redo history')
  assert.match(storeSource, /replaceDevelopmentMockWorkingState\(source, pair\)/, 'the development button uses the verified Working-state replacement path')
  assert.match(storeSource, /beforeCustom: cloneCostSnapshot[\s\S]*afterCustom: cloneCostSnapshot/, 'the mock action keeps its Custom replacement inside one Undo/Redo entry')
  assert.match(developmentMockSource, /customMasterData,[\s\S]*customDatasetSizing: \{\}/, 'mock replacement clears stale Custom Working placeholders and sizing')

  console.log('✓ Fresh Master Data view selects Current, View, and All Tables')
  console.log('✓ All Tables renders BOM, Work Centers, and Routing in the required order')
  console.log('✓ Re-rendering Master Data with the same application-memory state retains Reference, Edit, and Routing')
  console.log('✓ A fresh application state returns to Current, View, and All Tables')
  console.log('✓ Master Data UI state is absent from the business session object')
  console.log('✓ Warning labels show the current row number while navigation retains stable rowId')
  console.log('✓ Spreadsheet navigation, paste/copy, selection, reorder, and session-storage behavior are wired to the finalized interaction rules')
} finally {
  delete globalThis.__MASTER_DATA_UI_TEST_STORE__
  await vite.close()
}
