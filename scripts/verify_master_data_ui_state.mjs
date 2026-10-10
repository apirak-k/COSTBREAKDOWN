import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
    export const BOMTable = () => React.createElement('div', { role: 'table', 'aria-label': 'BOM data' }, 'BOM data')
  `],
  ['\0master-data-ui-verifier-work-centers', `
    import React from 'react'
    export const WorkCenterRatesTable = () => React.createElement('div', { role: 'table', 'aria-label': 'Work Centers data' }, 'Work Centers data')
  `],
  ['\0master-data-ui-verifier-routing', `
    import React from 'react'
    export const RoutingTable = () => React.createElement('div', { role: 'table', 'aria-label': 'Routing data' }, 'Routing data')
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
  const match = buttons.find(([, , content]) => content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase() === label.toLowerCase())
  assert.ok(match, `Expected an accessible button named "${label}"`)
  return /\baria-pressed="true"/.test(match[1])
}

const renderMasterDataPage = async uiState => {
  globalThis.__MASTER_DATA_UI_TEST_STORE__ = makeStore(uiState)
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
  assert.match(footerMarkup, /id="footer-dataset-status-tooltip" role="tooltip"[\s\S]*Reference[\s\S]*Ready[\s\S]*Current[\s\S]*Ready/, 'dataset status tooltip shows only Reference and Current readiness without a heading')
  assert.doesNotMatch(footerMarkup.match(/id="footer-dataset-status-tooltip"[\s\S]*?<\/span>/)?.[0] ?? '', /Custom/, 'dataset readiness tooltip omits Custom')
  assert.match(footerMarkup, /Product Mismatch/, 'Footer renders the existing Product Mismatch status independently')
  assert.match(footerMarkup, /class="inline-flex min-h-7 cursor-default select-none items-center gap-1\.5 whitespace-nowrap rounded-sm font-semibold[^\"]*text-violet-300"><span aria-hidden="true" class="h-1\.5 w-1\.5 rounded-full bg-violet-400"><\/span>Product Mismatch/, 'Footer Product Mismatch uses violet text and dot')
  assert.match(footerMarkup, /footer-product-status-tooltip[\s\S]*Reference[\s\S]*Master Data UI fixture \(PC\)[\s\S]*Current[\s\S]*Master Data UI fixture \(PC\)/, 'Product tooltip names both datasets and their Product Name/UOM without defaults or a heading')
  const footerProductStatus = footerMarkup.slice(footerMarkup.indexOf('aria-label="Product Mismatch"') - 40, footerMarkup.indexOf('aria-label="Product Mismatch"') + 180)
  assert.doesNotMatch(footerProductStatus, /<button|onClick/, 'Footer Product status is informational and not clickable')
  assert.match(footerMarkup, /<span class="font-mono tabular-nums">1<\/span>/, 'Footer warning total includes affected warning items across datasets')
  assert.match(footerMarkup, /Missing required value[\s\S]*<span class="text-right font-mono tabular-nums">1<\/span>/, 'Footer warning tooltip shows the non-zero category breakdown without a heading or total')
  assert.doesNotMatch(footerMarkup.match(/id="footer-warning-tooltip"[\s\S]*?<\/span>/)?.[0] ?? '', /Generated identity|Auto-renamed duplicate/, 'Footer warning tooltip omits zero-count categories')
  assert.ok(footerMarkup.indexOf('REF STD') < footerMarkup.indexOf('CUR STD')
    && footerMarkup.indexOf('CUR STD') < footerMarkup.indexOf('NET GAP'), 'Footer cost summary orders Reference, Current, then Net Gap')
  assert.match(footerMarkup, /REF STD<\/span>120[\s\S]*CUR STD<\/span>125\.5[\s\S]*NET GAP<\/span><span class="font-semibold text-rose-300">\+5\.5<\/span><\/span><span class="ml-2 max-\[359px\]:basis-full max-\[359px\]:ml-0 max-\[359px\]:text-right cursor-default select-none font-sans font-bold text-slate-300">\(THB\/PC\)<\/span>/, 'Footer shared unit matches the cost-label emphasis and remains 20px away without a separator')
  assert.match(footerMarkup, /Full Reference and Current standard costs and net gap in THB\/PC/, 'Footer cost summary exposes the displayed unit to assistive technology')
  const matchingUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' kg ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'KG' } }
    }
  })
  const normalizedUomFooter = matchingUomFooter.slice(matchingUomFooter.indexOf('<footer'))
  assert.match(normalizedUomFooter, /\(THB\/kg\)/, 'matching UOM values are trimmed and compared case-insensitively while displaying Reference spelling')
  const differentUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: 'kg' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'PC' } }
    }
  })
  assert.match(differentUomFooter, /\(THB\/Unit\)/, 'different Reference and Current UOM values use the neutral Unit label')
  const blankUomFooter = await renderAppLayout({
    snapshotPair: {
      reference: { ...fixtureSnapshot('reference'), product: { ...fixtureProduct, uom: ' ' } },
      current: { ...fixtureSnapshot('current'), product: { ...fixtureProduct, uom: 'PC' } }
    }
  })
  assert.match(blankUomFooter, /\(THB\/Unit\)/, 'a blank Reference or Current UOM uses the neutral Unit label')
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
  const zeroWarningControl = zeroWarningFooter.match(/<button[^>]*aria-label="Open Prepare Dataset showing all 0 warnings"[^>]*>/)?.[0] ?? ''
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
  assert.match(defaultMarkup, /id="master-data-table-panel" role="region" aria-label="All dataset tables"/, 'All Tables exposes one semantic region containing all dataset tables')
  const tableSections = [
    ['master-data-table-bom', 'BOM'],
    ['master-data-table-wc', 'Work Centers'],
    ['master-data-table-routing', 'Process Routing']
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
  assert.deepEqual(tableSections.map(section => section.heading), ['BOM', 'Work Centers', 'Process Routing'], 'All Tables keeps the vertical BOM → Work Centers → Routing heading order')
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
  assert.match(returnedPageMarkup, /aria-label="Process Routing table"/, 'the selected Routing view remains the only table region')

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
  const headerSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataWorkspaceHeader.tsx'), 'utf8')
  const pageSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/MasterDataPage.tsx'), 'utf8')
  const warningFocusSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useWarningNavigationFocus.ts'), 'utf8')
  const footerSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/AppLayout.tsx'), 'utf8')
  assert.match(footerSource, /gap-x-3 gap-y-1 font-mono tabular-nums[\s\S]*NET GAP[\s\S]*<span className="ml-2 max-\[359px\]:basis-full max-\[359px\]:ml-0 max-\[359px\]:text-right cursor-default select-none font-sans font-bold text-slate-300">\(THB\/\{costUnit\}\)<\/span>/, 'the shared Footer unit matches the cost-label emphasis, has 20px separation, then moves below 360px')
  assert.match(footerSource, /Reference and Current dataset structure" className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer dataset counts use the default cursor and cannot be selected')
  assert.match(footerSource, /Dataset readiness, product comparison, and warnings" className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer separators and display-only summary use the default cursor')
  assert.match(footerSource, /Full Reference and Current standard costs and net gap in THB\/\$\{costUnit\}`\} className="flex min-w-0 flex-wrap cursor-default select-none/, 'Footer costs and shared unit use the default cursor and cannot be selected')
  assert.match(footerSource, /className="flex h-dvh min-h-0 w-full flex-col overflow-hidden[\s\S]*className="min-h-0 min-w-0 flex-1 overflow-y-auto py-3/, 'the fixed shell clips outer overflow and Main owns page scrolling')
  assert.match(footerSource, /normalizeProductIdentityValue\(referenceUom\) === normalizeProductIdentityValue\(currentUom\)[\s\S]*\? referenceUom[\s\S]*: 'Unit'/, 'Footer unit uses normalized shared UOM or the neutral Unit fallback')
  const globalCssSource = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
  const navbarSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
  const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const sizingModalSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/DatasetSizingModal.tsx'), 'utf8')
  const storeSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
  const developmentMockSource = readFileSync(resolve(process.cwd(), 'src/state/development-mock-data.ts'), 'utf8')
  const prepareDatasetSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/prepare-dataset.ts'), 'utf8')
  const snapshotParserSource = readFileSync(resolve(process.cwd(), 'src/services/excel/snapshot-parser.ts'), 'utf8')
  const importDropzoneSource = readFileSync(resolve(process.cwd(), 'src/shared/ui/ExcelUploadDropzone.tsx'), 'utf8')
  const validationSource = readFileSync(resolve(process.cwd(), 'src/core/utils/master-data-validation.ts'), 'utf8')
  const storageSource = readFileSync(resolve(process.cwd(), 'src/services/storage/session-storage.ts'), 'utf8')

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
  assert.match(bomSource, /<th scope="col"[^>]*>Actions<\/th>[\s\S]*aria-label="Reorder rows"/, 'the reorder handle column is separate and rightmost after Actions')
  assert.match(routingSource, /not in WC table|knownWorkCenters/, 'Routing WC input keeps unknown values visible for typo correction')
  assert.match(headerSource, /aria-label="Clone"[\s\S]*title="Clone from another dataset"/, 'Clone is icon-only with an accessible label and tooltip')
  const mockActionSource = pageSource.slice(pageSource.indexOf('const developmentAction'), pageSource.indexOf('const renderTable'))
  assert.match(mockActionSource, /grid w-full grid-cols-2 divide-x[\s\S]*Complete Mock[\s\S]*Incomplete Mock/, 'development mock actions use equal two-column widths')
  assert.match(mockActionSource, /w-full px-1\.5 text-center[\s\S]*w-full px-1\.5 text-center/, 'both mock labels are centered in full-width buttons')
  assert.doesNotMatch(mockActionSource, /aria-haspopup|window\.confirm|>\|</, 'mock actions have no dropdown or confirmation')
  assert.match(headerSource, /onClick=\{\(\) => setCloneMenuOpen\(true\)\}/, 'clicking Clone opens its source flyout without toggling it closed')
  assert.match(headerSource, /id="clone-source-menu" role="group"[\s\S]*top-full z-50 min-w-36/, 'Clone source choices remain keyboard reachable without a pointer gap')
  assert.match(headerSource, /onPointerLeave=\{\(\) => setCloneMenuOpen\(false\)\}/, 'Clone closes when the pointer leaves its trigger and flyout')
  assert.match(headerSource, /onFocusCapture=\{\(\) => setCloneMenuOpen\(true\)\}/, 'keyboard focus can open Clone without hover')
  assert.match(headerSource, /event\.relatedTarget as Node \| null\)[\s\S]*event\.currentTarget\.matches\(':hover'\)/, 'Clone remains open while the pointer stays within its trigger or flyout')
  assert.match(headerSource, /sourceRole !== role/, 'Clone excludes the viewed dataset as its own source')
  const cloneActionSource = headerSource.slice(headerSource.indexOf('onCloneFrom(sourceRole)') - 120, headerSource.indexOf('onCloneFrom(sourceRole)') + 100)
  assert.doesNotMatch(cloneActionSource, /confirm\(/, 'choosing a Clone source does not ask for a second confirmation')
  assert.equal((headerSource.match(/window\.confirm\(/g) ?? []).length, 2, 'only Reset and Clear use toolbar confirmations')
  assert.match(headerSource, /Reset \$\{roleLabel\} dataset\? Draft changes will be discarded[\s\S]*onResetWorkingDataset\(\)/, 'Reset confirmation describes restoring Last Saved using Draft terminology')
  assert.match(headerSource, /Clear \$\{roleLabel\} dataset\? Current working data will be cleared\. The last saved dataset will remain available\.[\s\S]*onClearDataset\(\)/, 'Clear confirmation preserves Last Saved')
  assert.match(sizingModalSource, /if \(removedData\.length > 0\)[\s\S]*window\.confirm\(/, 'Sizing confirms only when populated data will be removed')
  assert.match(navbarSource, /id="header-prepare-dataset-trigger"[\s\S]*onClick=\{toggleMasterDataPrepareDataset\}[\s\S]*aria-expanded=\{masterDataPrepareDatasetOpen\}[\s\S]*aria-controls="prepare-dataset-panel"/, 'Header Info is the accessible Prepare Dataset toggle and controls the shared panel')
  assert.match(navbarSource, /id="header-prepare-dataset-portal-root"/, 'the shared popover portal is hosted beside the Header Info control')
  assert.match(readyFooterMarkup, /id="header-prepare-dataset-trigger"[\s\S]*id="header-prepare-dataset-portal-root"/, 'the rendered Header places the portal host directly after its Info trigger')
  assert.equal((navbarSource.match(/id="header-prepare-dataset-trigger"/g) ?? []).length, 1, 'the Header owns one Prepare Dataset trigger')
  assert.doesNotMatch(headerSource, /aria-label="Prepare Dataset"|title="Prepare Dataset"|prepareTriggerRef|<Info/, 'Master Data toolbar has no duplicate Prepare Dataset Info trigger')
  assert.match(headerSource, /import \{ createPortal \} from 'react-dom'/, 'Prepare Dataset uses a portal instead of a toolbar-owned popover anchor')
  assert.match(headerSource, /document\.getElementById\('header-prepare-dataset-portal-root'\)[\s\S]*isPrepareDatasetOpen && preparePortalRoot && createPortal\([\s\S]*id="prepare-dataset-panel"[\s\S]*preparePortalRoot/, 'the open panel renders into the Header-owned portal root')
  assert.match(storeSource, /toggleMasterDataPrepareDataset = \(\) => \{[\s\S]*setActiveTab\('master'\)[\s\S]*setMasterDataPrepareDatasetOpen\(current => wasOnMasterData \? !current : true\)/, 'Header Info toggles on Master Data and opens when navigating there')
  assert.match(storeSource, /requestMasterDataPrepareDataset = \(mode\?: 'all-warnings'\)[\s\S]*setActiveTab\('master'\)[\s\S]*setMasterDataPrepareDatasetOpen\(true\)[\s\S]*setMasterDataPrepareDatasetRequestMode\(mode \?\? null\)/, 'Footer requests force the same Header-owned panel open with the requested warning mode')
  assert.match(headerSource, /closePrepareDatasetAndRestoreFocus = \(\) => \{[\s\S]*onPrepareDatasetOpenChange\(false\)[\s\S]*document\.getElementById\('header-prepare-dataset-trigger'\)\?\.focus\(\)/, 'the panel Close action returns focus to Header Info')
  const pointerDownHandler = headerSource.slice(headerSource.indexOf('const handlePointerDown'), headerSource.indexOf('const handleKeyDown'))
  assert.match(pointerDownHandler, /preparePanelRef\.current\?\.contains\(target\) \|\| trigger\?\.contains\(target\)/, 'outside-click handling treats Header Info and the panel as inside')
  assert.match(pointerDownHandler, /onPrepareDatasetOpenChange\(false\)/, 'outside clicks close the Prepare Dataset panel')
  assert.doesNotMatch(pointerDownHandler, /\.focus\(/, 'outside clicks do not steal focus from the clicked control')
  const escapeHandler = headerSource.slice(headerSource.indexOf('const handleKeyDown'), headerSource.indexOf("document.addEventListener('pointerdown'"))
  assert.match(escapeHandler, /event\.key === 'Escape'[\s\S]*onPrepareDatasetOpenChange\(false\)[\s\S]*document\.getElementById\('header-prepare-dataset-trigger'\)\?\.focus\(\)/, 'Escape closes the panel and restores focus to Header Info')
  assert.match(headerSource, /addEventListener\('pointerdown'/, 'the popover listens for outside pointer clicks')
  assert.match(navbarSource, /aria-expanded=\{masterDataPrepareDatasetOpen\}/, 'Header Info exposes the live popover expanded state')
  assert.match(headerSource, /datasetSaveStateDotClass\(state\)/, 'dataset selector save dots use the shared state style')
  assert.match(headerSource, /datasetSaveStateDotClass\(saveState, 'h-2 w-2'\)/, 'Prepare Dataset save dots use the shared semantic style at 8px')
  assert.match(headerSource, /datasetSaveStateDotClass = \(state: MasterDataSaveState, size = 'h-1\.5 w-1\.5'\) =>[\s\S]*\$\{size\} shrink-0 rounded-full ring-\[1\.5px\] ring-inset[\s\S]*state === 'Saved' \? 'bg-emerald-500 ring-emerald-700\/70' : 'bg-slate-400 ring-slate-600\/70'/, 'Saved and Draft dots share semantic fills and higher-contrast rings while preserving the toolbar default size')
  assert.match(headerSource, /datasetSaveStateDotClass\(state\)/, 'toolbar save-state dots keep the helper default size of 6px')
  assert.match(headerSource, /aria-label=\{`\$\{roleLabels\[datasetRole\]\} — \$\{state\}`\}/, 'dataset save state is accessible independently from active styling')
  assert.match(headerSource, /\{roleLabels\[datasetRole\]\}[\s\S]*datasetSaveStateDotClass\(state\)/, 'active selection and save-state dot use separate styles')
  assert.doesNotMatch(headerSource, /prepareRegionRef|prepareTriggerRef/, 'the toolbar does not own a local Prepare Dataset trigger or anchor')
  assert.doesNotMatch(headerSource, /Prepared|Needs input/, 'Prepare Dataset dataset summaries do not show readiness labels')
  assert.match(headerSource, /datasetWarningCounts\[datasetRole\][\s\S]*>\s*\{datasetWarningCount\}/, 'each dataset summary shows its independent warning count')
  const datasetRowSource = headerSource.slice(headerSource.indexOf('const rowContents = ('), headerSource.indexOf('const rowClassName ='))
  assert.match(datasetRowSource, /<span className="min-w-0 truncate pl-3[^\"]*">\{roleLabels\[datasetRole\]\}<\/span>/, 'dataset child label alone is indented by 12px')
  assert.match(headerSource, /rowClassName = `grid h-8 w-full \$\{datasetSummaryColumns\}/, 'dataset indentation leaves shared icon and count tracks aligned')
  assert.match(headerSource, /<span className="grid h-7 w-5 place-items-center" aria-hidden="true">\s*<AlertTriangle className=\{`h-3 w-3 \$\{datasetWarningCount > 0 \? 'text-amber-800' : 'text-slate-400'\}`\}/, 'dataset warning icon is vertically centered in a fixed cell and muted when count is zero')
  assert.match(headerSource, /datasetSummaryColumns = 'grid-cols-\[minmax\(0,1fr\)_5rem_1\.25rem_2rem_1\.5rem\]'/, 'dataset summary tracks align dataset, save state, warning icon, count, and reserved affordance')
  assert.match(headerSource, /comparisonStatus = handoff\.productMismatch \? 'Mismatch' : 'Match'/, 'Match or Mismatch is derived from the comparison status')
  assert.doesNotMatch(headerSource, /\(\{comparisonStatus\}\)/, 'Match or Mismatch is not presented in parentheses')
  assert.doesNotMatch(headerSource, /productDetailsOpen|setProductDetailsOpen|Compared product identities|decoration-dotted/, 'Prepare Dataset Product status has no interactive detail popover')
  const prepareTopRow = headerSource.slice(headerSource.indexOf('<div className="flex min-h-8 shrink-0 items-center gap-1'), headerSource.indexOf('<div role="group" aria-label="Dataset save states'))
  assert.match(prepareTopRow, /<h2[^>]*>\s*Dataset\s*<\/h2>[\s\S]*datasetsReady \? 'Ready' : 'Incomplete'[\s\S]*Product \{comparisonStatus\}[\s\S]*Close Prepare Dataset/, 'top row presents Dataset, readiness, Product status, and Close')
  assert.match(prepareTopRow, /<span[\s\S]*aria-label=\{`Product \$\{comparisonStatus\}`\}[\s\S]*Product \{comparisonStatus\}/, 'Product status is display-only text')
  const prepareProductStatus = prepareTopRow.slice(prepareTopRow.indexOf('aria-label={`Product'), prepareTopRow.indexOf('<button'))
  assert.doesNotMatch(prepareProductStatus, /<button|onClick|underline|decoration-dotted/, 'Product status has no click affordance')
  assert.doesNotMatch(prepareTopRow, /Chevron/, 'top status summary does not show a Product status chevron')
  assert.match(prepareTopRow, /className=\{`h-2 w-2 shrink-0 rounded-full \$\{datasetsReady \? 'bg-blue-600' : 'bg-rose-500'\}`\}/, 'Ready and Incomplete dots are 8px and retain blue/rose semantics')
  assert.match(prepareTopRow, /datasetsReady \? 'text-blue-700' : 'text-rose-700'/, 'readiness text is blue for Ready and muted rose for Incomplete')
  assert.match(prepareTopRow, /className=\{`h-2 w-2 shrink-0 rounded-full \$\{handoff\.productMismatch \? 'bg-violet-500' : 'bg-emerald-600'\}`\}/, 'Product Match and Mismatch dots are 8px and retain green/violet semantics')
  assert.match(prepareProductStatus, /handoff\.productMismatch \? 'text-violet-700' : 'text-emerald-700'/, 'Prepare Dataset Product Mismatch text uses violet')
  assert.match(prepareTopRow, /gap-1 min-\[360px\]:gap-2\.5 sm:gap-3/, 'Prepare Dataset top statuses reduce spacing only at narrow widths')
  assert.doesNotMatch(headerSource, /comparisonProducts|prepare-dataset-identity-details/, 'Prepare Dataset does not retain the superseded Product mini-popover')
  assert.match(headerSource, /max-h-\[min\(30rem,calc\(100dvh-6rem\)\)\] w-\[min\(20rem,calc\(100vw-2rem\)\)\][\s\S]*overflow-hidden/, 'the popover is 20rem wide on desktop and viewport-clamped')
  assert.match(headerSource, /const availableHeight = Math\.floor\(mainBottom - triggerBottom - 8\)[\s\S]*Math\.min\(480, availableHeight\)/, 'smaller viewports clamp the panel to the remaining visible Main area')
  assert.match(headerSource, /maxHeight: `\$\{prepareDatasetMaxHeight\}px`[\s\S]*hasExpandedWarningCategory \? \{ height: `\$\{prepareDatasetMaxHeight\}px` \} : \{\}/, 'collapsed popover height follows content while expanded warnings use available height')
  assert.match(headerSource, /const datasetSummaryColumns = 'grid-cols-\[minmax\(0,1fr\)_5rem_1\.25rem_2rem_1\.5rem\]'/, 'dataset summary tracks align label, save state, warning icon, count, and reserved affordance')
  assert.match(headerSource, /const warningCategoryColumns = datasetSummaryColumns/, 'warning category counts align with dataset warning-count columns')
  assert.match(headerSource, /aria-label="Dataset save states and warning counts"/, 'dataset row summary has an accessible label')
  assert.doesNotMatch(headerSource, /sm:grid-cols-3/, 'dataset summaries never become a horizontal three-column strip')
  const { MASTER_DATA_WARNING_CATEGORY_DEFINITIONS, buildMasterDataWarningItems } = await vite.ssrLoadModule('/src/features/master-data/prepare-dataset.ts')
  assert.deepEqual(MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(({ category }) => category), [
    'generated-identity', 'missing-value', 'auto-renamed-duplicate'
  ], 'Prepare Dataset defines exactly the three user-facing warning categories')
  const warningSnapshots = {
    reference: fixtureSnapshot('reference'),
    current: fixtureSnapshot('current'),
    custom: {
      ...customMissingSnapshot,
      bom: [
        { id: 'custom-earlier-row', description: 'Earlier Material', consumption: 1, price: 1, loss: 0, confidence: {} },
        ...customMissingSnapshot.bom
      ]
    }
  }
  const missingUsageWarning = buildMasterDataWarningItems(warningSnapshots)
    .find(item => item.rowId === 'custom-missing-usage' && item.field === 'consumption')
  assert.ok(missingUsageWarning, 'the fixture exposes its stable missing Usage source item')
  assert.equal(missingUsageWarning.label, 'Custom · BOM · Row 2 · Usage', 'warning details show the dataset, table, current display row, and field')
  assert.equal(missingUsageWarning.rowId, 'custom-missing-usage', 'warning display numbering does not replace the stable source row identity')
  const reorderedWarningSnapshots = {
    ...warningSnapshots,
    custom: { ...warningSnapshots.custom, bom: [...warningSnapshots.custom.bom].reverse() }
  }
  const reorderedMissingUsageWarning = buildMasterDataWarningItems(reorderedWarningSnapshots)
    .find(item => item.rowId === 'custom-missing-usage' && item.field === 'consumption')
  assert.equal(reorderedMissingUsageWarning?.label, 'Custom · BOM · Row 1 · Usage', 'warning display row follows the current table order after reorder')
  assert.equal(reorderedMissingUsageWarning?.rowId, missingUsageWarning.rowId, 'reordering keeps navigation bound to the same stable rowId')
  const warningCategoryRenderSource = headerSource.slice(headerSource.indexOf('{visibleWarningGroups.map'), headerSource.indexOf('{mockAction &&'))
  assert.match(warningCategoryRenderSource, /warningCategoryColumns[\s\S]*\{group\.label\}[\s\S]*\{groupCount\}[\s\S]*ChevronRight/, 'warning category layout is label, fixed count, fixed far-right chevron')
  assert.match(warningCategoryRenderSource, /<span className="col-span-2 min-w-0 truncate pl-3[^\"]*">\{group\.label\}<\/span>/, 'warning category child label alone is indented by 12px')
  assert.match(warningCategoryRenderSource, /warningCategoryColumns[\s\S]*pl-3[\s\S]*\{groupCount\}[\s\S]*ChevronRight/, 'category indentation preserves the shared count and chevron tracks')
  const zeroCategoryRowSource = warningCategoryRenderSource.slice(
    warningCategoryRenderSource.indexOf('{disabled ? ('),
    warningCategoryRenderSource.indexOf(') : (')
  )
  const positiveCategoryRowSource = warningCategoryRenderSource.slice(
    warningCategoryRenderSource.indexOf(') : ('),
    warningCategoryRenderSource.indexOf('{expanded && groupCount > 0')
  )
  assert.match(zeroCategoryRowSource, /text-slate-800[\s\S]*group\.label/, 'zero-count warning label keeps normal contrast')
  assert.match(zeroCategoryRowSource, /text-slate-400">0/, 'only the zero count is muted')
  assert.doesNotMatch(zeroCategoryRowSource, /<button|hover:|cursor-|Chevron/, 'zero-count warning rows have no interaction or chevron affordance')
  assert.match(positiveCategoryRowSource, /<button[\s\S]*aria-expanded=\{expanded\}[\s\S]*setExpandedWarningCategory\(expanded \? null : group\.category\)[\s\S]*ChevronRight/, 'every positive category row toggles a compact detail list')
  assert.match(warningCategoryRenderSource, /expanded && groupCount > 0[\s\S]*group\.items\.map\(item =>/, 'an expanded category renders actual warning items even when its count is one')
  assert.doesNotMatch(warningCategoryRenderSource, /const direct|onNavigateWarning\(group\.items\[0\]\)/, 'category rows never navigate directly')
  const actualWarningItemSource = warningCategoryRenderSource.slice(warningCategoryRenderSource.indexOf('group.items.map(item =>'))
  assert.match(actualWarningItemSource, /onNavigateWarning\(item\)/, 'each actual warning item directly invokes source navigation')
  assert.doesNotMatch(actualWarningItemSource, /ChevronRight|ChevronDown|ChevronUp|›|aria-expanded/, 'actual warning items have no chevron, arrow, or nested expansion')
  assert.match(prepareDatasetSource, /if \(row\.confidence\?\.\[field\]\?\.quality === 'invalid'\) return/, 'invalid legacy values do not become Missing required value warnings')
  assert.doesNotMatch(prepareDatasetSource, /invalid-value|unresolved-work-center|Invalid value|Unresolved Work Center/, 'invalid and unresolved values are not Prepare Dataset categories')
  assert.match(prepareDatasetSource, /if \(!workCenterId\)[\s\S]*'missing-value'/, 'blank Routing Work Center is Missing required value')
  const warningsHeadingStart = headerSource.lastIndexOf('{warningRoleFilter ? (', headerSource.indexOf('<h3 id="prepare-dataset-warning-heading"'))
  const warningsHeadingSource = headerSource.slice(warningsHeadingStart, headerSource.indexOf('<ul aria-label="Warning categories"', warningsHeadingStart))
  assert.doesNotMatch(warningsHeadingSource, /AlertTriangle|<AlertTriangle/, 'Warnings heading has no warning icon')
  assert.match(warningsHeadingSource, /warningCategoryColumns[\s\S]*<h3[^>]*className="col-span-3[\s\S]*All[\s\S]*<span className="h-6 w-6" aria-hidden="true" \/>/, 'All-mode Warnings heading keeps All in the shared count column and reserves the chevron column blank')
  assert.match(warningsHeadingSource, /warningRoleFilter \? \([\s\S]*<button[\s\S]*aria-label=\{`Show all warning items, \$\{visibleWarningCount\} currently shown`\}[\s\S]*setWarningRoleFilter\(null\)[\s\S]*setExpandedWarningCategory\(null\)[\s\S]*>\s*\{warningHeadingLabel\}[\s\S]*>All<\/span>[\s\S]*\) : \([\s\S]*<span aria-label="Showing all warning items"[^>]*>All<\/span>/, 'the entire filtered Warnings row resets to All and collapses open categories; All mode stays static')
  assert.match(warningsHeadingSource, /mb-1 grid h-7 w-full shrink-0[\s\S]*hover:bg-slate-50 focus-visible:outline/, 'the filtered Warnings row itself is the full-width pointer and keyboard target')
  assert.doesNotMatch(warningsHeadingSource, /Chevron/, 'the All control does not use a chevron affordance')
  assert.match(headerSource, /max-h-36 flex-1 overflow-y-auto overscroll-contain/, 'only the expanded warning item list scrolls, bounded to 144px')
  assert.doesNotMatch(headerSource.match(/<ul aria-label="Warning categories"[^>]*className="([^"]+)"/)?.[1] ?? '', /overflow-y-auto/, 'collapsed category rows do not reserve a scroll viewport')
  assert.match(headerSource, /expanded \? 'flex min-h-0 flex-1 flex-col' : undefined/, 'only the expanded category retains flexible space and keeps its row visible')
  assert.match(headerSource, /expanded \? 'bg-slate-100' : 'hover:bg-slate-50'/, 'expanded category uses a quiet neutral background')
  const mockActionPosition = headerSource.indexOf('{mockAction &&')
  assert.ok(mockActionPosition > headerSource.lastIndexOf('</ul>', mockActionPosition), 'mock actions stay in a fixed footer outside the warning scroller')
  assert.match(headerSource, /className="mt-auto shrink-0 border-t border-slate-200 pt-2"/, 'mock actions remain at the fixed bottom row when warnings are collapsed')
  assert.match(headerSource, /<span className="grid h-7 w-5 place-items-center" aria-hidden="true">[\s\S]*<AlertTriangle className=\{`h-3 w-3 \$\{datasetWarningCount > 0 \? 'text-amber-800' : 'text-slate-400'\}`\}/, 'warning icon is centered inside its own fixed track')
  const warningIconCellSource = headerSource.match(/<span className="grid h-7 w-5 place-items-center"[\s\S]*?<\/span>/)?.[0] ?? ''
  assert.doesNotMatch(warningIconCellSource, /translate-[xy]-/, 'warning icon alignment uses grid rather than visual translation')
  assert.match(headerSource, /<AlertTriangle className=\{`h-3 w-3 \$\{datasetWarningCount > 0 \? 'text-amber-800' : 'text-slate-400'\}`\}[\s\S]*datasetWarningCount > 0 \? 'text-amber-800' : 'text-slate-400'/, 'warning icon and count remain in separate aligned tracks, with zero shown in gray')
  assert.match(headerSource, /setWarningRoleFilter\(datasetRole\)[\s\S]*setWarningRoleFilter\(null\)/, 'dataset warning counts filter categories and the filtered All control clears the filter')
  assert.match(headerSource, /setExpandedWarningCategory\(expanded \? null : group\.category\)/, 'multiple warning locations expand progressively')
  assert.match(pageSource, /setMasterDataRole\(item\.role\)[\s\S]*tableView: item\.table/, 'warning navigation selects the affected dataset and table')
  assert.match(pageSource, /updateMasterDataUiState\(\{ type: 'set-mode', mode: 'edit' \}\)[\s\S]*tableView: item\.table/, 'warning navigation switches to Edit and the affected table')
  assert.match(pageSource, /handleWarningNavigationHandled[\s\S]*current\?\.requestId === requestId \? undefined : current/, 'warning navigation consumes the completed request')
  assert.match(warningFocusSource, /setSearchQuery\(''\)[\s\S]*scrollIntoView[\s\S]*selectRow\(target\.rowId\)[\s\S]*focusTarget\.focus[\s\S]*onNavigationHandled\(target\.requestId\)/, 'warning navigation clears filters, selects the row, scrolls, focuses the source, and consumes its target')
  assert.match(footerSource, /const warningItems = buildMasterDataWarningItems\(masterDataSnapshots\)[\s\S]*const warningCount = warningItems\.length/, 'footer total uses affected warning-item count')
  assert.match(footerSource, /areMasterDataDatasetsReady\(masterDataHandoff, warningItems\)/, 'Footer uses the shared Reference/Current readiness derivation')
  assert.match(footerSource, /Datasets \{datasetsReady \? 'Ready' : 'Incomplete'\}/, 'footer uses the finalized compact readiness wording')
  assert.match(footerSource, /BOM \{snapshotPair\.reference\.bom\.length\} · WC \{snapshotPair\.reference\.rates\.length\} · RTG \{snapshotPair\.reference\.routing\.length\}/, 'Reference structural counts use BOM, WC, RTG order')
  assert.match(footerSource, /BOM \{snapshotPair\.current\.bom\.length\} · WC \{snapshotPair\.current\.rates\.length\} · RTG \{snapshotPair\.current\.routing\.length\}/, 'Current structural counts use BOM, WC, RTG order')
  assert.match(footerSource, /id="footer-dataset-status-tooltip"[\s\S]*datasetReadiness\.map[\s\S]*ready \? 'Ready' : 'Incomplete'/, 'Footer dataset status tooltip lists only Reference and Current statuses without a title')
  assert.match(footerSource, /id="footer-product-status-tooltip"[\s\S]*snapshotPair\.reference\.product\.productName[\s\S]*snapshotPair\.reference\.product\.uom[\s\S]*snapshotPair\.current\.product\.productName[\s\S]*snapshotPair\.current\.product\.uom/, 'Footer Product tooltip shows Reference and Current Product Name/UOM without a title')
  const productStatusMarkupSource = footerSource.slice(footerSource.indexOf('aria-label={`Product ${masterDataHandoff.productMismatch'), footerSource.indexOf('id="footer-warning-tooltip"'))
  assert.doesNotMatch(productStatusMarkupSource, /<button|onClick=|requestMasterDataPrepareDataset/, 'Product Match/Mismatch is display-only in the Footer')
  assert.match(footerSource, /const FooterTooltip[\s\S]*pointer-events-none fixed[\s\S]*max-w-\[min\(17\.5rem,calc\(100vw-1rem\)\)\]/, 'Footer tooltips are fixed overlays with content-sized width and viewport max-width')
  assert.match(footerSource, /setTimeout\(\(\) => \{[\s\S]*positionTooltip\(\)[\s\S]*setVisible\(true\)[\s\S]*\}, 275\)/, 'Footer hover tooltips wait 275ms while keyboard focus opens immediately')
  assert.match(footerSource, /footerTop - tooltipHeight - 8/, 'Footer tooltips remain above the entire Footer area')
  assert.match(footerSource, /warningBreakdown = MASTER_DATA_WARNING_CATEGORY_DEFINITIONS[\s\S]*filter\(item => item\.count > 0\)/, 'Footer warning breakdown excludes zero-count categories')
  assert.match(footerSource, /id="footer-warning-tooltip"[\s\S]*warningBreakdown\.map/, 'Footer warning tooltip lists the filtered warning breakdown without a heading or total')
  assert.doesNotMatch(footerSource.slice(footerSource.indexOf('id="footer-warning-tooltip"'), footerSource.indexOf('aria-label={`Open Prepare Dataset showing')), /title=|Warnings|warningCount/, 'Footer warning tooltip contains only the non-zero warning categories')
  assert.match(footerSource, /id="footer-warning-tooltip"[\s\S]*align="right"/, 'Footer warning tooltip aligns to the right edge')
  assert.match(footerSource, /masterDataHandoff\.productMismatch \? 'bg-violet-400' : 'bg-emerald-400'/, 'Footer Product Match/Mismatch uses a violet/green dot')
  assert.match(footerSource, /masterDataHandoff\.productMismatch \? 'text-violet-300' : 'text-emerald-300'/, 'Footer Product Match/Mismatch uses violet/green semantic text without hover affordance')
  assert.match(footerSource, /warningCount > 0 \? 'text-amber-300 hover:text-amber-200' : 'text-slate-400 hover:text-slate-300'/, 'Footer warning color remains amber and visually distinct from violet Product Mismatch')
  assert.doesNotMatch(footerSource.slice(footerSource.indexOf('footer-product-status-tooltip'), footerSource.indexOf('footer-warning-tooltip')), /Chevron|ChevronRight|ChevronDown/, 'Footer Product tooltip has no chevron')
  assert.match(footerSource, /onClick=\{\(\) => requestMasterDataPrepareDataset\('all-warnings'\)\}[\s\S]*\{warningCount\}/, 'footer warning count opens Prepare Dataset with all warning roles')
  assert.match(footerSource, /aria-label=\{`Open Prepare Dataset showing all \$\{warningCount\} warnings`\}/, 'footer warning count has an accessible action label')
  assert.match(footerSource, /fullSnapshotComparison\.referenceCost\.total[\s\S]*fullSnapshotComparison\.currentCost\.total[\s\S]*fullSnapshotComparison\.totalGap/, 'footer uses full Reference/Current Standard Costs and their full net gap')
  assert.doesNotMatch(footerSource, /snapshotComparison\.totalGap|isSelectedComparisonActive|SELECTED GAP/, 'footer never switches to a Selected Comparison gap')
  assert.match(footerSource, /REF STD[\s\S]*CUR STD[\s\S]*NET GAP/, 'footer labels both full Standard Costs and Net Gap')
  assert.match(footerSource, /value === null \|\| !Number\.isFinite\(value\) \? '—'/, 'unavailable Standard Cost remains a dash rather than fabricated zero')
  assert.match(footerSource, /totalGap !== null && Number\.isFinite\(totalGap\)/, 'unavailable or non-finite Net Gap remains neutral')
  assert.match(footerSource, /totalGap > 0[\s\S]*text-rose-300[\s\S]*totalGap < 0[\s\S]*text-emerald-300[\s\S]*text-slate-300/, 'Net Gap colors are positive rose, negative emerald, and zero neutral')
  assert.match(readyFooterMarkup, /<div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden/, 'app shell fills the viewport and contains scrolling')
  assert.match(readyFooterMarkup, /<main id="main-content" tabindex="-1" class="min-h-0 min-w-0 flex-1 overflow-y-auto py-3"><div class="app-workspace-frame">/, 'full-width Main owns scrolling and the shared frame stays inside it')
  assert.doesNotMatch(footerSource.match(/<main[\s\S]*?className="([^"]+)"/)?.[1] ?? '', /app-workspace-frame/, 'the scroll container itself is not constrained to the centered frame')
  assert.match(readyFooterMarkup, /<footer aria-label="Dataset and comparison status" class="w-full shrink-0/, 'Footer remains in the shell flow without using fixed positioning')
  assert.doesNotMatch(footerSource.match(/<div className="flex h-dvh[^\"]*"/)?.[0] ?? '', /fixed/, 'Footer layout does not use a fixed overlay')
  assert.match(navbarSource, /className="app-workspace-frame"/, 'Header content shares the centered workspace frame')
  assert.match(globalCssSource, /\.app-workspace-frame[\s\S]*max-w-\[1440px\][\s\S]*px-3 sm:px-4 lg:px-6/, 'Header, Main, and Footer use one bounded shared frame rule')
  assert.match(footerSource, /className="app-workspace-frame flex flex-wrap[\s\S]*xl:flex-nowrap/, 'footer groups wrap responsively and share one compact desktop row')
  assert.match(headerSource, /if \(!prepareDatasetRequestMode\) return[\s\S]*setWarningRoleFilter\(null\)[\s\S]*setExpandedWarningCategory\(null\)/, 'opening the Footer all-warning view clears dataset and category filters')
  assert.match(storeSource, /requestMasterDataPrepareDataset = \(mode\?: 'all-warnings'\)[\s\S]*setActiveTab\('master'\)[\s\S]*setMasterDataPrepareDatasetRequestMode\(mode \?\? null\)[\s\S]*setMasterDataPrepareDatasetRequested\(true\)/, 'Footer warning request switches to Master Data and carries the all-warning view')
  assert.match(pageSource, /if \(!masterDataPrepareDatasetRequested\) return[\s\S]*setMasterDataPrepareDatasetOpen\(true\)[\s\S]*consumeMasterDataPrepareDatasetRequest\(\)/, 'Footer status requests open the Header-owned Prepare Dataset popover and are consumed')
  assert.match(pageSource, /prepareDatasetRequestMode=\{masterDataPrepareDatasetRequestMode\}/, 'Prepare Dataset receives the Footer all-warning request mode')
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
  assert.match(navbarSource, /onClick=\{toggleMasterDataPrepareDataset\}[\s\S]*aria-label="Prepare Dataset"[\s\S]*title="Prepare Dataset"[\s\S]*<Info/, 'the final Header control is an Info icon that toggles Prepare Dataset')
  assert.match(navbarSource, /col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center[\s\S]*lg:col-start-2/, 'Header navigation can wrap on narrow widths and stays in the centered desktop zone')
  assert.match(headerSource, /type="search"[\s\S]*aria-label="Search Master Data"[\s\S]*value=\{searchQuery\}[\s\S]*onSearchQueryChange\(event\.target\.value\)/, 'the existing search query is exposed locally in the Master Data toolbar')
  assert.doesNotMatch(bomSource, /aria-label="Search BOM"|placeholder="Search BOM/, 'BOM no longer renders a per-table search box')
  assert.doesNotMatch(routingSource, /aria-label="Search Routing"|placeholder="Search Routing/, 'Routing no longer renders a per-table search box')
  assert.match(pageSource, /searchQuery=\{searchQuery\}[\s\S]*onSearchQueryChange=\{onSearchQueryChange\}/, 'the same Master Data query flows to the toolbar and existing tables')
  assert.match(headerSource, /type="text"[\s\S]*aria-label="UOM"[\s\S]*onUpdateProduct\(\{ \.\.\.product, uom: event\.target\.value \}\)/, 'UOM is editable as free text')
  assert.match(headerSource, /xl:grid-cols-\[3fr_1fr_2fr_1fr_4fr\]/, 'metadata widths are stable and follow the requested relative sizing')
  assert.match(storeSource, /normalizeMasterDataSnapshot\(mutate\(currentDataset\), currentDataset\)/, 'all dataset edit paths normalize identities, including direct edit, paste, and bulk updates')
  assert.match(storeSource, /isMasterDataSnapshotChangeValid\(currentDataset, nextDataset\)/, 'direct edits and spreadsheet paste reject newly invalid or unresolved values at the Working boundary')
  assert.match(storeSource, /filterInvalidMasterDataNumericChanges\(changes\)/, 'mixed spreadsheet pastes preserve valid cells while rejecting invalid numeric cells')
  assert.match(storeSource, /knownWorkCenters\.has\(proposed\.toLocaleLowerCase\(\)\)/, 'Routing edits reject newly entered unavailable Work Centers')
  assert.match(storeSource, /getMasterDataSnapshotValidationErrors\(result\.snapshot\)/, 'the store rejects invalid or unresolved snapshots before applying an Import result')
  assert.match(developmentMockSource, /getMasterDataSnapshotValidationErrors\(nextPair\.reference\)[\s\S]*getMasterDataSnapshotValidationErrors\(nextPair\.current\)/, 'development mock data also passes the ordinary Working data validation boundary')
  assert.match(snapshotParserSource, /getMasterDataSnapshotValidationErrors\(snapshot\)[\s\S]*success: false[\s\S]*format: 'canonical'/, 'canonical imports reject invalid numeric values and unavailable nonblank Routing Work Centers')
  assert.match(snapshotParserSource, /canonicalResult\.success \|\| canonicalResult\.format === 'canonical'/, 'validation-rejected canonical workbooks cannot fall through to legacy import parsing')
  assert.match(importDropzoneSource, /type: 'error',[\s\S]*text: result\.message,[\s\S]*details: result\.warnings/, 'Import rejection shows the existing validation details')
  assert.match(validationSource, /field === 'capacity' \|\| field === 'yield'[\s\S]*value <= 0[\s\S]*field === 'yield' && value > 1/, 'ingress validation reuses the existing positive Capacity and bounded Yield rules')
  assert.match(pageSource, /Complete Mock[\s\S]*Incomplete Mock/, 'Master Data exposes direct Complete Mock and Incomplete Mock actions')
  assert.doesNotMatch(pageSource, /Load Mock Data|window\.confirm\(`(?:Complete|Incomplete) Mock/, 'mock fixtures load without a generic action label or confirmation')
  assert.match(appSource, /getElementById\('main-content'\)\?\.scrollTo\(\{ top: 0, behavior: 'auto' \}\)[\s\S]*\[activeTab\]/, 'changing pages resets the shared content viewport to its heading')
  assert.doesNotMatch(pageSource, /Load complete review mock|Load data-quality mock|Return to working session|window\.confirm/, 'mock loading is immediate and has no session-return UI or confirmation')
  const tableSelectorSource = pageSource.slice(pageSource.indexOf('const tableSections'), pageSource.indexOf('return (\n    <div className="w-full space-y-4">'))
  assert.match(tableSelectorSource, /grid w-64 shrink-0 grid-cols-4 items-stretch[\s\S]*sm:w-96/, 'table selector keeps four equal columns and a compact fixed width on narrow screens')
  assert.equal((tableSelectorSource.match(/min-h-8 w-full/g) ?? []).length, 2, 'the mapped table controls and All share the same responsive fixed sizing')
  assert.doesNotMatch(bomSource + wcSource + routingSource, /max-h-\[520px\]/, 'Master Data tables grow with page content instead of creating nested vertical scrollers')
  assert.match(bomSource, /className="overflow-x-auto"/)
  assert.match(wcSource, /className="overflow-x-auto"/)
  assert.match(routingSource, /className="overflow-x-auto"/)
  assert.match(tableSelectorSource, /navLabel: 'BOM'[\s\S]*navLabel: 'Work Centers'[\s\S]*navLabel: 'Routing'[\s\S]*>\s*All\s*</, 'table selector order is BOM, Work Centers, Routing, All')
  assert.match(headerSource, /title=\{lastSavedSnapshot \? 'Export Last Saved'/, 'Export tooltip states it uses Last Saved data')
  assert.match(headerSource, /exportSnapshotToExcel\(lastSavedSnapshot\)/, 'Export passes the Last Saved snapshot to the workbook generator')
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
