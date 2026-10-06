import assert from 'node:assert/strict'
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
      if (source === '../../state' && normalizedImporter.endsWith('/src/features/master-data/MasterDataPage.tsx')) {
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
const makeStore = (uiState = { role: 'current', mode: 'view', tableView: 'all' }) => {
  const snapshot = fixtureSnapshot(uiState.role)
  return {
    uomList: ['PC'],
    isDevelopmentReviewFixture: false,
    masterDataRole: uiState.role,
    masterDataSnapshot: snapshot,
    masterDataLastSavedSnapshot: undefined,
    masterDataSizing: {},
    masterDataHandoff: {
      datasetsPrepared: false,
      referenceReady: false,
      currentReady: false,
      issues: [],
      warnings: []
    },
    masterDataUiState: uiState,
    setMasterDataRole: noOp,
    updateMasterDataUiState: noOp,
    saveMasterDataWorkingDataset: noOp,
    resetMasterDataWorkingDataset: noOp,
    loadDevelopmentReviewFixture: noOp,
    returnFromDevelopmentReviewFixture: noOp,
    cloneReferenceToCurrent: noOp,
    cloneCurrentToReference: noOp,
    clearMasterDataDataset: noOp,
    updateMasterDataDatasetSizing: noOp,
    updateMasterDataProduct: noOp,
    updateMasterDataRemark: noOp,
    addMasterDataBOMItem: noOp,
    updateMasterDataBOMItem: noOp,
    deleteMasterDataBOMItem: noOp,
    reorderMasterDataBOMItems: noOp,
    addMasterDataRoutingStep: noOp,
    updateMasterDataRoutingStep: noOp,
    deleteMasterDataRoutingStep: noOp,
    reorderMasterDataRoutingSteps: noOp,
    addMasterDataWorkCenterRate: noOp,
    updateMasterDataWorkCenterRate: noOp,
    deleteMasterDataWorkCenterRate: noOp,
    reorderMasterDataWorkCenters: noOp
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

try {
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
  assert.equal(pressedButton(defaultMarkup, 'All tables'), true, 'Master Data first opens with All Tables selected')

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
  assert.equal(pressedButton(returnedPageMarkup, 'All tables'), false, 'the retained Routing view does not revert to All Tables')
  assert.match(returnedPageMarkup, /aria-label="Process Routing table"/, 'the selected Routing view remains the only table region')

  const freshAppSessionMarkup = await renderMasterDataPage(INITIAL_MASTER_DATA_UI_STATE)
  assert.equal(pressedButton(freshAppSessionMarkup, 'Current'), true, 'a fresh app session does not inherit Reference selection')
  assert.equal(pressedButton(freshAppSessionMarkup, 'View'), true, 'a fresh app session does not inherit Edit mode')
  assert.equal(pressedButton(freshAppSessionMarkup, 'All tables'), true, 'a fresh app session returns to All Tables')

  const { makeEmptySession } = await vite.ssrLoadModule('/src/state/store.tsx')
  const businessSession = makeEmptySession('master-data-ui-state-test')
  assert.equal(Object.hasOwn(businessSession, 'masterDataRole'), false, 'dataset-side UI state stays out of saved business sessions')
  assert.equal(Object.hasOwn(businessSession, 'masterDataUiState'), false, 'mode and table-view UI state stay out of saved business sessions')
  assert.equal(Object.hasOwn(businessSession, 'masterDataTableView'), false, 'table-view UI state does not become business data')
  assert.equal(Object.hasOwn(businessSession, 'masterDataMode'), false, 'mode UI state does not become business data')

  console.log('✓ Fresh Master Data view selects Current, View, and All Tables')
  console.log('✓ All Tables renders BOM, Work Centers, and Routing in the required order')
  console.log('✓ Re-rendering Master Data with the same application-memory state retains Reference, Edit, and Routing')
  console.log('✓ A fresh application state returns to Current, View, and All Tables')
  console.log('✓ Master Data UI state is absent from the business session object')
  console.log('[Unverified] Browser-driven navigation/remount and process-restart behavior are not exercised without a client DOM/browser test runner in this repository')
} finally {
  delete globalThis.__MASTER_DATA_UI_TEST_STORE__
  await vite.close()
}
