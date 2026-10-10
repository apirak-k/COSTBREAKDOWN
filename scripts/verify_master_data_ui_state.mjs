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
  server: { middlewareMode: true },
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
    { masterDataSearchQuery: '', onMasterDataSearchQueryChange: noOp },
    React.createElement('div', null, 'Workspace content')
  ))
}

try {
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
  assert.match(footerMarkup, /rounded-full bg-emerald-400"><\/span><span class="font-semibold text-emerald-300">Datasets Ready/, 'Footer readiness has a green dot and semibold green text')
  assert.match(footerMarkup, /Product Mismatch/, 'Footer renders the existing Product Mismatch status independently')
  assert.match(footerMarkup, /rounded-full bg-amber-400"><\/span>Product Mismatch/, 'Footer Product Mismatch has an amber dot and no chevron')
  assert.match(footerMarkup, /<span class="font-mono tabular-nums">1<\/span>/, 'Footer warning total includes affected warning items across datasets')
  assert.ok(footerMarkup.indexOf('REF STD') < footerMarkup.indexOf('CUR STD')
    && footerMarkup.indexOf('CUR STD') < footerMarkup.indexOf('NET GAP'), 'Footer cost summary orders Reference, Current, then Net Gap')
  assert.match(footerMarkup, /REF STD<\/span>120\.0000[\s\S]*CUR STD<\/span>125\.5000[\s\S]*NET GAP<\/span><span class="font-semibold text-rose-300">\+5\.5000/, 'Footer displays full snapshot costs and full positive Net Gap even with Selected Comparison active')
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
  assert.match(incompleteFooter, /rounded-full bg-amber-400"><\/span><span class="font-semibold text-amber-300">Datasets Incomplete/, 'a Reference missing required value makes Footer readiness incomplete with an amber dot and text')

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
  assert.match(matchingFooter, /text-emerald-300 hover:text-emerald-200[\s\S]*rounded-full bg-emerald-400"><\/span>Product Match/, 'Footer Product Match has a green dot and semibold green text')

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
  assert.match(negativeGapMarkup, /NET GAP<\/span><span class="font-semibold text-emerald-300">-5\.5000/, 'negative Net Gap is emerald')
  assert.match(zeroGapMarkup, /NET GAP<\/span><span class="font-semibold text-slate-300">0\.0000/, 'zero Net Gap is neutral and stays visible')
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
  const routingSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/RoutingTable.tsx'), 'utf8')
  const headerSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/MasterDataWorkspaceHeader.tsx'), 'utf8')
  const pageSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/MasterDataPage.tsx'), 'utf8')
  const warningFocusSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/hooks/useWarningNavigationFocus.ts'), 'utf8')
  const footerSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/AppLayout.tsx'), 'utf8')
  const globalCssSource = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
  const navbarSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
  const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const sizingModalSource = readFileSync(resolve(process.cwd(), 'src/features/master-data/components/DatasetSizingModal.tsx'), 'utf8')
  const storeSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
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
  assert.match(headerSource, /onClick=\{\(\) => onPrepareDatasetOpenChange\(!isPrepareDatasetOpen\)\}/, 'Prepare Dataset trigger toggles the popover')
  assert.match(headerSource, /if \(isPrepareDatasetOpen\) prepareTriggerRef\.current\?\.focus\(\)/, 'opening Prepare Dataset from the footer moves keyboard focus to its trigger')
  assert.match(headerSource, /onPrepareDatasetOpenChange\(false\)[\s\S]*prepareTriggerRef\.current\?\.focus\(\)/, 'Escape and the close button return focus to the Prepare Dataset trigger')
  assert.match(headerSource, /addEventListener\('pointerdown'/, 'clicking outside closes the Prepare Dataset popover')
  assert.match(headerSource, /event\.key === 'Escape'[\s\S]*onPrepareDatasetOpenChange\(false\)/, 'Escape closes the Prepare Dataset popover')
  assert.match(headerSource, /state === 'Saved' \? 'bg-emerald-400' : 'bg-slate-400'/, 'save dots encode Saved green and unsaved states gray')
  assert.match(headerSource, /aria-label=\{`\$\{roleLabels\[datasetRole\]\} — \$\{state\}`\}/, 'dataset save state is accessible independently from active styling')
  assert.match(headerSource, /\{roleLabels\[datasetRole\]\}[\s\S]*bg-emerald-400/, 'active selection and save-state dot use separate styles')
  assert.ok(headerSource.indexOf('ref={prepareRegionRef}') > headerSource.indexOf('{tableSelector}'), 'Prepare Dataset follows the table selector at the toolbar right edge')
  assert.match(headerSource, /aria-label="Prepare Dataset"[\s\S]*title="Prepare Dataset"[\s\S]*<Info/, 'Prepare Dataset is icon-only with a concise tooltip')
  assert.doesNotMatch(headerSource, /Prepared|Needs input/, 'Prepare Dataset dataset summaries do not show readiness labels')
  assert.match(headerSource, /datasetWarningCounts\[datasetRole\][\s\S]*<span>\{datasetWarningCount\}<\/span>/, 'each dataset summary shows its independent warning count')
  assert.match(headerSource, /comparisonStatus = handoff\.productMismatch \? 'Mismatch' : 'Match'/, 'Match or Mismatch is derived from the comparison status')
  assert.doesNotMatch(headerSource, /\(\{comparisonStatus\}\)/, 'Match or Mismatch is not presented in parentheses')
  assert.match(headerSource, /const \[comparisonDetailsOpen, setComparisonDetailsOpen\] = useState\(false\)/, 'comparison details are collapsed by default')
  assert.match(headerSource, /onClick=\{\(\) => setComparisonDetailsOpen\(open => !open\)\}/, 'Match or Mismatch opens and closes comparison details')
  assert.match(headerSource, /grid-cols-\[minmax\(0,1fr\)_auto_1\.75rem\]/, 'the title row allocates space to title, readiness, and close control')
  assert.match(headerSource, /datasetsReady \? 'Ready' : 'Incomplete'/, 'Prepare Dataset title row shows shared Ready/Incomplete state')
  const prepareTitleRow = headerSource.slice(headerSource.indexOf('grid-cols-[minmax(0,1fr)_auto_1.75rem]'), headerSource.indexOf('onClick={() => setComparisonDetailsOpen'))
  assert.doesNotMatch(prepareTitleRow, /comparisonStatus|ChevronRight|ChevronDown/, 'Product Match/Mismatch is not beside the Prepare Dataset title')
  assert.match(headerSource, /className={`flex min-h-8 w-full items-center justify-between[\s\S]*Product \{comparisonStatus\}[\s\S]*ChevronRight/, 'Product Match/Mismatch is a separate full-width expandable row')
  assert.ok(/aria-label="Compared product identities"/.test(headerSource)
    && /productIdentity\(comparisonProducts\.reference\)/.test(headerSource)
    && /productIdentity\(comparisonProducts\.current\)/.test(headerSource)
    && /details\.uom\?\.trim\(\)/.test(headerSource), 'comparison details expose Reference and Current product name and UOM')
  assert.match(headerSource, /max-h-\[calc\(100dvh-6rem\)\][\s\S]*overflow-y-auto/, 'the popover bounds its height and scrolls warning categories internally')
  const { MASTER_DATA_WARNING_CATEGORY_DEFINITIONS } = await vite.ssrLoadModule('/src/features/master-data/prepare-dataset.ts')
  assert.deepEqual(MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(({ category }) => category), [
    'generated-identity', 'missing-value', 'auto-renamed-duplicate'
  ], 'Prepare Dataset defines exactly the three user-facing warning categories')
  const warningCategoryRenderSource = headerSource.slice(headerSource.indexOf('{visibleWarningGroups.map'), headerSource.indexOf('{mockAction &&'))
  assert.match(warningCategoryRenderSource, /grid-cols-\[minmax\(0,1fr\)_2rem_1rem\][\s\S]*\{group\.label\}[\s\S]*\{groupCount\}[\s\S]*ChevronRight/, 'warning category layout is label, fixed count, fixed far-right chevron')
  assert.match(warningCategoryRenderSource, /const disabled = groupCount === 0[\s\S]*aria-expanded=\{disabled \? undefined : expanded\}[\s\S]*if \(!disabled\)[\s\S]*setExpandedWarningCategory\(expanded \? null : group\.category\)/, 'zero rows disable and every positive category count toggles expansion')
  assert.match(warningCategoryRenderSource, /expanded && groupCount > 0[\s\S]*group\.items\.map\(item =>/, 'an expanded category renders actual warning items even when its count is one')
  assert.doesNotMatch(warningCategoryRenderSource, /const direct|onNavigateWarning\(group\.items\[0\]\)/, 'category rows never navigate directly')
  const actualWarningItemSource = warningCategoryRenderSource.slice(warningCategoryRenderSource.indexOf('group.items.map(item =>'))
  assert.match(actualWarningItemSource, /onNavigateWarning\(item\)/, 'each actual warning item directly invokes source navigation')
  assert.doesNotMatch(actualWarningItemSource, /ChevronRight|ChevronDown|ChevronUp|›|aria-expanded/, 'actual warning items have no chevron, arrow, or nested expansion')
  assert.match(prepareDatasetSource, /if \(row\.confidence\?\.\[field\]\?\.quality === 'invalid'\) return/, 'invalid legacy values do not become Missing required value warnings')
  assert.doesNotMatch(prepareDatasetSource, /invalid-value|unresolved-work-center|Invalid value|Unresolved Work Center/, 'invalid and unresolved values are not Prepare Dataset categories')
  assert.match(prepareDatasetSource, /if \(!workCenterId\)[\s\S]*'missing-value'/, 'blank Routing Work Center is Missing required value')
  assert.match(headerSource, /const disabled = groupCount === 0[\s\S]*disabled=\{disabled\}/, 'zero-count warning categories remain visible and disabled')
  assert.match(headerSource, /min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto/, 'warning categories scroll inside the bounded popover')
  assert.match(headerSource, /setWarningRoleFilter\(datasetRole\)[\s\S]*setWarningRoleFilter\(null\)/, 'dataset warning counts filter categories and All clears the filter')
  assert.match(headerSource, /setExpandedWarningCategory\(expanded \? null : group\.category\)/, 'multiple warning locations expand progressively')
  assert.match(pageSource, /setMasterDataRole\(item\.role\)[\s\S]*tableView: item\.table/, 'warning navigation selects the affected dataset and table')
  assert.match(pageSource, /updateMasterDataUiState\(\{ type: 'set-mode', mode: 'edit' \}\)[\s\S]*tableView: item\.table/, 'warning navigation switches to Edit and the affected table')
  assert.match(pageSource, /handleWarningNavigationHandled[\s\S]*current\?\.requestId === requestId \? undefined : current/, 'warning navigation consumes the completed request')
  assert.match(warningFocusSource, /setSearchQuery\(''\)[\s\S]*scrollIntoView[\s\S]*selectRow\(target\.rowId\)[\s\S]*focusTarget\.focus[\s\S]*onNavigationHandled\(target\.requestId\)/, 'warning navigation clears filters, selects the row, scrolls, focuses the source, and consumes its target')
  assert.match(footerSource, /const warningItems = buildMasterDataWarningItems\(masterDataSnapshots\)[\s\S]*const warningCount = warningItems\.length/, 'footer total uses affected warning-item count')
  assert.match(footerSource, /areMasterDataDatasetsReady\(masterDataHandoff, warningItems\)/, 'Footer uses the shared Reference/Current readiness derivation')
  assert.match(footerSource, /Datasets Ready[\s\S]*Datasets Incomplete/, 'footer uses the finalized compact readiness wording')
  assert.match(footerSource, /BOM \{snapshotPair\.reference\.bom\.length\} · WC \{snapshotPair\.reference\.rates\.length\} · RTG \{snapshotPair\.reference\.routing\.length\}/, 'Reference structural counts use BOM, WC, RTG order')
  assert.match(footerSource, /BOM \{snapshotPair\.current\.bom\.length\} · WC \{snapshotPair\.current\.rates\.length\} · RTG \{snapshotPair\.current\.routing\.length\}/, 'Current structural counts use BOM, WC, RTG order')
  assert.match(footerSource, /onClick=\{\(\) => requestMasterDataPrepareDataset\('comparison'\)\}[\s\S]*Product \{masterDataHandoff\.productMismatch \? 'Mismatch' : 'Match'\}/, 'Product Match/Mismatch opens Prepare Dataset comparison details')
  assert.match(footerSource, /masterDataHandoff\.productMismatch \? 'bg-amber-400' : 'bg-emerald-400'/, 'Footer Product Match/Mismatch uses an amber/green dot')
  assert.match(footerSource, /masterDataHandoff\.productMismatch \? 'text-amber-300 hover:text-amber-200' : 'text-emerald-300 hover:text-emerald-200'/, 'Footer Product Match/Mismatch uses semibold semantic text color')
  const productStatusButton = footerSource.slice(footerSource.indexOf("requestMasterDataPrepareDataset('comparison')"), footerSource.indexOf("requestMasterDataPrepareDataset('all-warnings')"))
  assert.doesNotMatch(productStatusButton, /Chevron|ChevronRight|ChevronDown/, 'Footer Product Match/Mismatch has no chevron')
  assert.match(footerSource, /onClick=\{\(\) => requestMasterDataPrepareDataset\('all-warnings'\)\}[\s\S]*\{warningCount\}/, 'footer warning count opens Prepare Dataset with all warning roles')
  assert.match(footerSource, /aria-label=\{`Open Prepare Dataset showing all \$\{warningCount\} warnings`\}/, 'footer warning count has an accessible action label')
  assert.match(footerSource, /fullSnapshotComparison\.referenceCost\.total[\s\S]*fullSnapshotComparison\.currentCost\.total[\s\S]*fullSnapshotComparison\.totalGap/, 'footer uses full Reference/Current Standard Costs and their full net gap')
  assert.doesNotMatch(footerSource, /snapshotComparison\.totalGap|isSelectedComparisonActive|SELECTED GAP/, 'footer never switches to a Selected Comparison gap')
  assert.match(footerSource, /REF STD[\s\S]*CUR STD[\s\S]*NET GAP/, 'footer labels both full Standard Costs and Net Gap')
  assert.match(footerSource, /value === null \|\| !Number\.isFinite\(value\) \? '—'/, 'unavailable Standard Cost remains a dash rather than fabricated zero')
  assert.match(footerSource, /totalGap !== null && Number\.isFinite\(totalGap\)/, 'unavailable or non-finite Net Gap remains neutral')
  assert.match(footerSource, /totalGap > 0[\s\S]*text-rose-300[\s\S]*totalGap < 0[\s\S]*text-emerald-300[\s\S]*text-slate-300/, 'Net Gap colors are positive rose, negative emerald, and zero neutral')
  assert.match(readyFooterMarkup, /<div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden/, 'app shell fills the viewport and contains scrolling')
  assert.match(readyFooterMarkup, /<main id="main-content" tabindex="-1" class="app-workspace-frame min-h-0 min-w-0 flex-1 overflow-y-auto py-3">/, 'Main is the flexible vertical scroll area')
  assert.match(readyFooterMarkup, /<footer aria-label="Dataset and comparison status" class="w-full shrink-0/, 'Footer remains in the shell flow without using fixed positioning')
  assert.doesNotMatch(footerSource.match(/<div className="flex h-dvh[^\"]*"/)?.[0] ?? '', /fixed/, 'Footer layout does not use a fixed overlay')
  assert.match(navbarSource, /className="app-workspace-frame"/, 'Header content shares the centered workspace frame')
  assert.match(globalCssSource, /\.app-workspace-frame[\s\S]*max-w-\[1440px\][\s\S]*px-3 sm:px-4 lg:px-6/, 'Header, Main, and Footer use one bounded shared frame rule')
  assert.match(footerSource, /className="app-workspace-frame flex flex-wrap[\s\S]*xl:flex-nowrap/, 'footer groups wrap responsively and share one compact desktop row')
  assert.match(headerSource, /if \(!prepareDatasetRequestMode\) return[\s\S]*setWarningRoleFilter\(null\)[\s\S]*setExpandedWarningCategory\(null\)[\s\S]*setComparisonDetailsOpen\(prepareDatasetRequestMode === 'comparison'\)/, 'comparison requests expand comparison details without retaining a warning filter')
  assert.match(storeSource, /requestMasterDataPrepareDataset = \(mode\?: 'comparison' \| 'all-warnings'\)[\s\S]*setActiveTab\('master'\)[\s\S]*setMasterDataPrepareDatasetRequestMode\(mode \?\? null\)[\s\S]*setMasterDataPrepareDatasetRequested\(true\)/, 'Footer requests switch to Master Data and carry the selected Prepare Dataset view')
  assert.match(pageSource, /if \(!masterDataPrepareDatasetRequested\) return[\s\S]*setIsPrepareDatasetOpen\(true\)[\s\S]*consumeMasterDataPrepareDatasetRequest\(\)/, 'Footer status requests open the Prepare Dataset popover and are consumed')
  assert.match(pageSource, /prepareDatasetRequestMode=\{masterDataPrepareDatasetRequestMode\}/, 'Prepare Dataset receives the comparison or all-warnings request mode')
  assert.match(navbarSource, /const navItems = \[[\s\S]*\{ id: 'master', label: 'Master Data' \}[\s\S]*\{ id: 'breakdown', label: 'Cost Breakdown' \}[\s\S]*\{ id: 'candidate', label: 'Candidate' \}[\s\S]*\{ id: 'simulation', label: 'Simulation' \}[\s\S]*\] as const/, 'Global Header navigation contains the four exact primary labels in order')
  assert.doesNotMatch(navbarSource, /Candidate \/ RCA|workflowStatus|Ready|Not Ready|Selected Comparison|Missing data/, 'Global Header omits workflow guidance and uses Candidate wording')
  const headerOrder = [
    navbarSource.indexOf('aria-label="Page edit tools"'),
    navbarSource.indexOf('>COSTBREAKDOWN</span>'),
    navbarSource.indexOf('<nav aria-label="Main navigation"'),
    navbarSource.indexOf('role="search"'),
    navbarSource.indexOf('aria-label="Prepare Dataset"')
  ]
  assert.ok(headerOrder.every((position, index) => position >= 0 && (index === 0 || position > headerOrder[index - 1])), 'Header regions render left utilities/context, centered navigation, then right Search/Info')
  assert.match(navbarSource, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\][\s\S]*justify-center/, 'desktop Header centers navigation between left and right zones')
  assert.match(navbarSource, /text-sm font-semibold tracking-wide text-slate-100/, 'COSTBREAKDOWN uses text-sm branding')
  assert.doesNotMatch(navbarSource, /disabled:cursor-not-allowed/, 'disabled Header Undo, Redo, and Search use the normal cursor')
  assert.match(navbarSource, /disabled=\{!isMasterData \|\| !canUndoMasterDataEdit\}/, 'Undo stays visible and is disabled outside Master Data or without history')
  assert.match(navbarSource, /disabled=\{!isMasterData \|\| !canRedoMasterDataEdit\}/, 'Redo stays visible and is disabled outside Master Data or without redo history')
  assert.match(navbarSource, /type="search"[\s\S]*aria-label="Search data"[\s\S]*disabled=\{!isMasterData\}[\s\S]*placeholder="Search data\.\.\."/, 'the permanent Search data field is enabled only where search is implemented')
  assert.match(navbarSource, /onMasterDataSearchQueryChange\(event\.target\.value\)/, 'Header Search updates the existing Master Data table query')
  assert.doesNotMatch(navbarSource, /searchOpen|searchRegionRef|aria-expanded/, 'Header Search is an inline field rather than a popup')
  assert.match(navbarSource, /onClick=\{\(\) => requestMasterDataPrepareDataset\(\)\}[\s\S]*aria-label="Prepare Dataset"[\s\S]*title="Prepare Dataset"[\s\S]*<Info/, 'the final Header control is an Info icon that opens Prepare Dataset')
  assert.match(navbarSource, /flex min-w-0 flex-wrap items-center justify-center[\s\S]*sm:col-span-2[\s\S]*lg:col-start-2/, 'Header navigation can wrap on narrow widths and stays in the centered desktop zone')
  assert.doesNotMatch(bomSource, /aria-label="Search BOM"|placeholder="Search BOM/, 'BOM no longer renders a per-table search box')
  assert.doesNotMatch(routingSource, /aria-label="Search Routing"|placeholder="Search Routing/, 'Routing no longer renders a per-table search box')
  assert.match(pageSource, /searchQuery=\{searchQuery\}[\s\S]*onSearchQueryChange=\{onSearchQueryChange\}/, 'the shared Header query flows into Master Data tables')
  assert.match(headerSource, /type="text"[\s\S]*aria-label="UOM"[\s\S]*onUpdateProduct\(\{ \.\.\.product, uom: event\.target\.value \}\)/, 'UOM is editable as free text')
  assert.match(headerSource, /xl:grid-cols-\[3fr_1fr_2fr_1fr_4fr\]/, 'metadata widths are stable and follow the requested relative sizing')
  assert.match(storeSource, /normalizeMasterDataSnapshot\(mutate\(currentDataset\), currentDataset\)/, 'all dataset edit paths normalize identities, including direct edit, paste, and bulk updates')
  assert.match(storeSource, /isMasterDataSnapshotChangeValid\(currentDataset, nextDataset\)/, 'direct edits and spreadsheet paste reject newly invalid or unresolved values at the Working boundary')
  assert.match(storeSource, /filterInvalidMasterDataNumericChanges\(changes\)/, 'mixed spreadsheet pastes preserve valid cells while rejecting invalid numeric cells')
  assert.match(storeSource, /knownWorkCenters\.has\(proposed\.toLocaleLowerCase\(\)\)/, 'Routing edits reject newly entered unavailable Work Centers')
  assert.match(storeSource, /getMasterDataSnapshotValidationErrors\(result\.snapshot\)/, 'the store rejects invalid or unresolved snapshots before applying an Import result')
  assert.match(storeSource, /getMasterDataSnapshotValidationErrors\(nextPair\.reference\)[\s\S]*getMasterDataSnapshotValidationErrors\(nextPair\.current\)/, 'development mock data also passes the ordinary Working data validation boundary')
  assert.match(snapshotParserSource, /getMasterDataSnapshotValidationErrors\(snapshot\)[\s\S]*success: false[\s\S]*format: 'canonical'/, 'canonical imports reject invalid numeric values and unavailable nonblank Routing Work Centers')
  assert.match(snapshotParserSource, /canonicalResult\.success \|\| canonicalResult\.format === 'canonical'/, 'validation-rejected canonical workbooks cannot fall through to legacy import parsing')
  assert.match(importDropzoneSource, /type: 'error',[\s\S]*text: result\.message,[\s\S]*details: result\.warnings/, 'Import rejection shows the existing validation details')
  assert.match(validationSource, /field === 'capacity' \|\| field === 'yield'[\s\S]*value <= 0[\s\S]*field === 'yield' && value > 1/, 'ingress validation reuses the existing positive Capacity and bounded Yield rules')
  assert.match(pageSource, /Load Mock Data/, 'Master Data exposes one consolidated mock action')
  assert.match(appSource, /getElementById\('main-content'\)\?\.scrollTo\(\{ top: 0, behavior: 'auto' \}\)[\s\S]*\[activeTab\]/, 'changing pages resets the shared content viewport to its heading')
  assert.doesNotMatch(pageSource, /Load complete review mock|Load data-quality mock|Return to working session|window\.confirm/, 'mock loading is immediate and has no session-return UI or confirmation')
  const tableSelectorSource = pageSource.slice(pageSource.indexOf('const tableSections'), pageSource.indexOf('return (\n    <div className="w-full space-y-4">'))
  assert.equal((tableSelectorSource.match(/w-24/g) ?? []).length, 2, 'the mapped table controls and All share the same fixed width')
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

  console.log('✓ Fresh Master Data view selects Current, View, and All Tables')
  console.log('✓ All Tables renders BOM, Work Centers, and Routing in the required order')
  console.log('✓ Re-rendering Master Data with the same application-memory state retains Reference, Edit, and Routing')
  console.log('✓ A fresh application state returns to Current, View, and All Tables')
  console.log('✓ Master Data UI state is absent from the business session object')
  console.log('✓ Spreadsheet navigation, paste/copy, selection, reorder, and session-storage behavior are wired to the finalized interaction rules')
} finally {
  delete globalThis.__MASTER_DATA_UI_TEST_STORE__
  await vite.close()
}
