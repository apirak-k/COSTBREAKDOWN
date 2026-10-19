import React, { createContext, useContext, useState, useEffect, useMemo, useReducer, useRef, ReactNode } from 'react'
import {
  ProductMaster,
  WorkCenterRate,
  BOMItem,
  RoutingStep,
  ExcelImportResult,
  SnapshotImportResult,
  ProductSession,
  ProductSizingConfig,
  DatasetSizing,
  ComparisonRole,
  MasterDataRole,
  CostSnapshot,
  SnapshotPair,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  SelectedComparisonSelection,
  FieldEvidence,
  CostComparison,
  compareSnapshots,
  sessionToSnapshotPair,
  applySnapshotPairToSession,
  getFieldConfidence,
  evaluateMasterDataHandoff,
  getSnapshotRoleReadiness
} from '../core'
import { createSelectedSnapshotPair, getCanonicalComparisonStatus, getComparisonFindingKey } from '../core'
import type { MasterDataHandoffStatus } from '../core'
import { hasEnteredMasterData, importSnapshotForCustom, importSnapshotForRole, markSizingPlaceholderEdited, resizeMasterDataSnapshotForSizing, synchronizeDatasetSizingToRows } from './dataset-sizing'
import { normalizeActiveTab, type ActiveTab } from './active-tab'
import { clearMasterDataDatasetState } from './clear-master-data-dataset'
import { moveSnapshotRows } from './master-data-row-order'
import { migrateLegacyCandidateRcaRecords } from './rca-cases'
import {
  cloneCostSnapshot,
  getLastSavedMasterData,
  getMasterDataSizing,
  getMasterDataSnapshot,
  initializeCustomMasterData,
  cloneMasterDataDatasetState,
  createEmptyCustomMasterData,
  getMasterDataResetBaseline,
  initializeMasterDataResetBaselines,
  setAllMasterDataInitialResetBaselines,
  setMasterDataInitialResetBaseline,
  setMasterDataSnapshot
} from './master-data-datasets'
import { markMasterDataChanged, markMasterDataChangedForSnapshotPair } from './master-data-revision'
import { normalizeMasterDataSnapshot } from '../core/utils/master-data-effective'
import { assertDatasetSizingCounts } from '../core/utils/sizing'
import { propagateWorkCenterRenames } from './master-data-work-center-rename'
import { replaceDevelopmentMockWorkingState } from './development-mock-data'
import {
  filterInvalidMasterDataNumericChanges,
  getMasterDataSnapshotValidationErrors,
  isMasterDataSnapshotChangeValid
} from '../core/utils/master-data-validation'
import {
  createMasterDataEditHistory,
  recordMasterDataEdit,
  undoMasterDataEdit as takeMasterDataUndo,
  redoMasterDataEdit as takeMasterDataRedo,
  applyMasterDataEditHistoryEntry as restoreMasterDataEditHistoryEntry,
  type MasterDataEditHistoryEntry
} from './master-data-edit-history'
import {
  INITIAL_MASTER_DATA_UI_STATE,
  reduceMasterDataUiState,
  type MasterDataUiAction,
  type MasterDataUiState
} from '../features/master-data/master-data-ui-state'
import { STORAGE_KEYS, loadFromSession, saveToSession } from '../services/storage'

import {
  seedProductMaster,
  seedWorkCenterRates,
  seedBOM,
  seedRouting,
  seedSnapshotPair,
  emptyProductMaster,
  createEmptySnapshotPair
} from './seed-data'

export const DEFAULT_UOMS = ['PC', 'SET', 'PANEL', 'GM', 'KG', 'SM', 'M', 'RL', 'L', 'BOX', 'TRAY']

interface StoredSelectedComparison extends SelectedComparisonSelection {
  sourceFingerprint: string
}

function normalizeSnapshotPair(pair: SnapshotPair): SnapshotPair {
  return {
    reference: normalizeMasterDataSnapshot(pair.reference),
    current: normalizeMasterDataSnapshot(pair.current)
  }
}

function withSnapshotPair(session: ProductSession, explicitPair?: SnapshotPair): ProductSession {
  if (explicitPair) {
    return initializeMasterDataResetBaselines(initializeCustomMasterData({
      ...session,
      snapshotPair: normalizeSnapshotPair(explicitPair),
      snapshotPairMode: 'independent'
    }))
  }

  if (session.snapshotPairMode === 'independent' && session.snapshotPair) {
    // Keep independent snapshots canonical; legacy fields are only a projection here.
    return initializeMasterDataResetBaselines(initializeCustomMasterData(applySnapshotPairToSession(session, normalizeSnapshotPair(session.snapshotPair))))
  }

  return initializeMasterDataResetBaselines(initializeCustomMasterData({
    ...session,
    snapshotPair: normalizeSnapshotPair(sessionToSnapshotPair(session)),
    snapshotPairMode: 'derived'
  }))
}

function applyMasterDataSnapshotPair(session: ProductSession, pair: SnapshotPair): ProductSession {
  const previousPair = normalizeSnapshotPair(session.snapshotPair ?? sessionToSnapshotPair(session))
  const nextPair = normalizeSnapshotPair(pair)
  return markMasterDataChangedForSnapshotPair(applySnapshotPairToSession(session, nextPair), previousPair, nextPair)
}

function isMissingValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function workingEvidence(value: unknown, sourceRef: string | undefined, previous?: FieldEvidence): FieldEvidence {
  return {
    status: getFieldConfidence(value, sourceRef),
    quality: isMissingValue(value) ? 'missing' : 'valid',
    sourceRef: sourceRef || undefined,
    basis: 'Master Data working value',
    sourceValue: previous?.sourceValue ?? value,
    workingValue: value
  }
}

// Helper: create a brand-new session with sizing
function makeSizedSession(id: string, config: ProductSizingConfig, now: string): ProductSession {
  const defaultWcNames = ['Cutting', 'Printing-Digital RGOM', 'Assembly Digital RGOM', 'OQA-Digital']
  
  const rates: WorkCenterRate[] = []
  for (let i = 0; i < Math.max(1, config.wcCount); i++) {
    const wc = defaultWcNames[i] || `WorkCenter_${i + 1}`
    rates.push({
      id: `rate-${Date.now()}-${i + 1}`,
      wc,
      description: wc,
      laborRate: 105.29,
      burdenRate: 95.00,
      effectiveDate: config.effectiveDate || now.split('T')[0],
      sourceRef: 'Standard Rate'
    })
  }

  const bom: BOMItem[] = []
  for (let i = 0; i < Math.max(1, config.bomCount); i++) {
    bom.push({
      id: `bom-${Date.now()}-${i + 1}`,
      itemCode: `RM-${String(i + 1).padStart(4, '0')}`,
      description: `Material Item ${i + 1}`,
      consumption: 0.01,
      unit: 'PC',
      basePrice: 10.0,
      activePrice: 10.0,
      baseLoss: 0.1,
      activeLoss: 0.1,
      sourceRef: 'Initial Setup'
    })
  }

  const routing: RoutingStep[] = []
  for (let i = 0; i < Math.max(1, config.routingCount); i++) {
    routing.push({
      id: `rt-${Date.now()}-${i + 1}`,
      opSeq: (i + 1) * 10,
      description: `Process Operation ${i + 1}`,
      wc: rates[0]?.wc || 'Cutting',
      manning: 1,
      baseCap: 1000,
      activeCap: 1000,
      baseYield: 0.98,
      activeYield: 0.98,
      sourceRef: 'Initial Setup'
    })
  }

  return withSnapshotPair({
    id,
    product: {
      productCode: config.productCode,
      productDescription: config.productDescription,
      uom: config.uom,
      customer: config.customer || '',
      effectiveDate: config.effectiveDate || now.split('T')[0]
    },
    rates,
    bom,
    routing,
    savedDrivers: [],
    preparedSnapshotRoles: { reference: false, current: false },
    status: 'draft',
    versionLabel: 'Draft',
    createdAt: now,
    updatedAt: now
  })
}

// Helper: create default empty session with independent empty Reference and Current datasets
export function makeEmptySession(id: string = 'ps-empty-default'): ProductSession {
  const now = new Date().toISOString()
  return withSnapshotPair({
    id,
    product: { ...emptyProductMaster },
    rates: [],
    bom: [],
    routing: [],
    savedDrivers: [],
    preparedSnapshotRoles: { reference: false, current: false },
    status: 'draft',
    versionLabel: 'Draft',
    createdAt: now,
    updatedAt: now
  }, createEmptySnapshotPair(id))
}

// Helper: create default RGOM-024 seed session (available as fixture)
export function makeSeedSession(): ProductSession {
  const now = new Date().toISOString()
  return withSnapshotPair({
    id: 'ps-seed-rgom024',
    product: seedProductMaster,
    rates: seedWorkCenterRates,
    bom: seedBOM,
    routing: seedRouting,
    savedDrivers: [],
    preparedSnapshotRoles: { reference: true, current: true },
    status: 'active',
    versionLabel: 'Active Baseline (RGOM-024)',
    createdAt: now,
    updatedAt: now
  }, seedSnapshotPair)
}

interface AppContextType {
  // Multi-product session list & versioning
  productSessions: ProductSession[]
  activeProductId: string
  activeSession: ProductSession

  // Derived (from active session)
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  snapshotPair: SnapshotPair
  masterDataSnapshots: Record<MasterDataRole, CostSnapshot>
  snapshotComparison: CostComparison
  fullSnapshotComparison: CostComparison
  analysisSnapshotPair: SnapshotPair
  selectedComparisonSelection: SelectedComparisonSelection | null
  isSelectedComparisonActive: boolean
  masterDataHandoff: MasterDataHandoffStatus
  masterDataUiState: MasterDataUiState
  canUndoMasterDataEdit: boolean
  canRedoMasterDataEdit: boolean
  masterDataRole: MasterDataRole
  masterDataSnapshot: CostSnapshot
  masterDataLastSavedSnapshot?: CostSnapshot
  masterDataLastSavedSnapshots: Partial<Record<MasterDataRole, CostSnapshot>>
  masterDataSizing: import('../core/types').DatasetSizing
  masterDataPrepareDatasetOpen: boolean
  masterDataPrepareDatasetPinned: boolean
  setMasterDataPrepareDatasetOpen: React.Dispatch<React.SetStateAction<boolean>>
  masterDataPrepareDatasetRequested: boolean
  masterDataPrepareDatasetRequestMode: 'all-warnings' | null
  activeTab: ActiveTab
  uomList: string[]

  // Navigation
  setActiveTab: (tab: ActiveTab) => void
  toggleMasterDataPrepareDataset: () => void
  previewMasterDataPrepareDataset: () => void
  scheduleDismissMasterDataPrepareDatasetPreview: () => void
  closeMasterDataPrepareDataset: () => void
  requestMasterDataPrepareDataset: (mode?: 'all-warnings') => void
  consumeMasterDataPrepareDatasetRequest: () => void

  // Product session management
  createProductWithSizing: (config: ProductSizingConfig) => void
  updateProductSizing: (config: ProductSizingConfig) => void
  switchProduct: (id: string) => void
  duplicateProduct: (id: string) => void
  deleteProduct: (id: string) => void
  addUOM: (uom: string) => void

  // 3-State Versioning controls
  cloneActiveToDraft: (sourceId?: string) => void
  activateDraft: (draftId: string) => void

  // Master Data dataset controls
  updateMasterDataUiState: (action: MasterDataUiAction) => void
  setMasterDataRole: (role: MasterDataRole) => void
  undoMasterDataEdit: () => void
  redoMasterDataEdit: () => void
  saveMasterDataWorkingDataset: (role: MasterDataRole) => void
  saveAllMasterDataWorkingDatasets: () => void
  resetMasterDataWorkingDataset: (role: MasterDataRole) => void
  resetAllMasterDataWorkingDatasets: () => void
  cloneMasterDataWorkspace: (sourceRole: MasterDataRole) => void
  sendSimulationSnapshotToMasterData: (role: MasterDataRole, snapshot: CostSnapshot) => boolean
  sendSimulationSnapshotsToMasterData: (snapshots: Partial<Record<MasterDataRole, CostSnapshot>>) => boolean
  clearMasterDataDataset: (role: MasterDataRole) => void
  clearAllMasterDataWorkingDatasets: () => void
  updateMasterDataDatasetSizing: (role: MasterDataRole, sizing: Partial<import('../core/types').DatasetSizing>) => void
  updateMasterDataProduct: (product: ProductMaster) => void
  updateMasterDataRemark: (remark: string) => void
  updateMasterDataBOMItems: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>> }>) => void
  addMasterDataBOMItem: (item: Omit<SnapshotBOMItem, 'id' | 'confidence'>) => void
  updateMasterDataBOMItem: (id: string, item: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => void
  deleteMasterDataBOMItem: (id: string) => void
  deleteMasterDataBOMItems: (ids: string[]) => void
  reorderMasterDataBOMItems: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  addMasterDataRoutingStep: (step: Omit<SnapshotRoutingStep, 'id' | 'confidence'>) => void
  updateMasterDataRoutingSteps: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>> }>) => void
  updateMasterDataRoutingStep: (id: string, step: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => void
  deleteMasterDataRoutingStep: (id: string) => void
  deleteMasterDataRoutingSteps: (ids: string[]) => void
  reorderMasterDataRoutingSteps: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  addMasterDataWorkCenterRate: (rate: Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>) => void
  updateMasterDataWorkCenterRates: (
    updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>,
    options?: { routingRowIdsByRateId?: Record<string, string[]> }
  ) => void
  updateMasterDataWorkCenterRate: (id: string, rate: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => void
  deleteMasterDataWorkCenterRate: (id: string) => void
  deleteMasterDataWorkCenterRates: (ids: string[]) => void
  reorderMasterDataWorkCenters: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  applySelectedComparison: (selection: SelectedComparisonSelection) => void
  clearSelectedComparison: () => void

  // Active-product CRUD
  updateProduct: (p: ProductMaster) => void
  addBOMItem: (item: Omit<BOMItem, 'id'>) => void
  updateBOMItem: (id: string, item: Partial<BOMItem>) => void
  deleteBOMItem: (id: string) => void
  addRoutingStep: (step: Omit<RoutingStep, 'id'>) => void
  updateRoutingStep: (id: string, step: Partial<RoutingStep>) => void
  deleteRoutingStep: (id: string) => void
  addWorkCenterRate: (rate: Omit<WorkCenterRate, 'id'>) => void
  updateWorkCenterRate: (wc: string, rate: Partial<WorkCenterRate>) => void
  deleteWorkCenterRate: (wc: string) => void
  importFromExcel: (result: ExcelImportResult) => void
  importSnapshotFromExcel: (result: SnapshotImportResult) => void
  loadDevelopmentMockData: (pair: SnapshotPair) => void
  resetToDefault: () => void

  clearAllData: () => void
}



const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productSessions, setProductSessions] = useState<ProductSession[]>(() => {
    const loaded = loadFromSession<ProductSession[]>(STORAGE_KEYS.SESSIONS, [makeEmptySession()])
    return loaded.map((s, idx) => {
      const sessionWithoutLegacyUiState = { ...s } as ProductSession & { masterDataRole?: MasterDataRole }
      delete sessionWithoutLegacyUiState.masterDataRole
      const normalized = withSnapshotPair({
        ...sessionWithoutLegacyUiState,
        status: sessionWithoutLegacyUiState.status || (idx === 0 ? 'draft' : 'draft'),
        versionLabel: sessionWithoutLegacyUiState.versionLabel || (sessionWithoutLegacyUiState.status === 'archived' ? 'Archived' : 'Draft')
      })
      const normalizedRcaCases = migrateLegacyCandidateRcaRecords(normalized)
      return {
        ...normalizedRcaCases,
        preparedSnapshotRoles: getSnapshotRoleReadiness(normalized)
      }
    })
  })

  const [masterDataUiState, dispatchMasterDataUiState] = useReducer(
    reduceMasterDataUiState,
    INITIAL_MASTER_DATA_UI_STATE
  )
  const updateMasterDataUiState = (action: MasterDataUiAction) => dispatchMasterDataUiState(action)
  const masterDataHistoryRef = useRef(createMasterDataEditHistory())
  const [, setMasterDataHistoryRevision] = useState(0)
  const clearMasterDataEditHistory = () => {
    masterDataHistoryRef.current = createMasterDataEditHistory()
    setMasterDataHistoryRevision(revision => revision + 1)
  }
  const copyDatasetSizing = (sizing?: Record<ComparisonRole, DatasetSizing>) => sizing ? {
    reference: { ...(sizing.reference ?? {}) },
    current: { ...(sizing.current ?? {}) }
  } : undefined
  const copyMasterDataBaselines = (baselines: ProductSession['initialMasterDataBaseline']) => baselines
    ? Object.fromEntries(Object.entries(baselines).map(([role, baseline]) => [role, baseline ? {
      ...baseline,
      snapshot: cloneCostSnapshot(baseline.snapshot),
      sizing: { ...(baseline.sizing ?? {}) }
    } : baseline])) as ProductSession['initialMasterDataBaseline']
    : undefined
  const recordMasterDataWorkingEdit = (before: ProductSession, after: ProductSession, role: MasterDataRole) => {
    const beforePair = before.snapshotPair ?? sessionToSnapshotPair(before)
    const afterPair = after.snapshotPair ?? sessionToSnapshotPair(after)
    const entry: MasterDataEditHistoryEntry = {
      sessionId: before.id,
      role,
      before: cloneCostSnapshot(getMasterDataSnapshot(before, beforePair, role)),
      after: cloneCostSnapshot(getMasterDataSnapshot(after, afterPair, role)),
      beforePrepared: { ...getSnapshotRoleReadiness(before) },
      afterPrepared: { ...getSnapshotRoleReadiness(after) },
      beforeSizing: copyDatasetSizing(before.datasetSizing),
      afterSizing: copyDatasetSizing(after.datasetSizing),
      beforeInitialMasterDataBaseline: copyMasterDataBaselines(before.initialMasterDataBaseline),
      afterInitialMasterDataBaseline: copyMasterDataBaselines(after.initialMasterDataBaseline),
      beforeCustomSizing: role === 'custom' ? { ...(before.customDatasetSizing ?? {}) } : undefined,
      afterCustomSizing: role === 'custom' ? { ...(after.customDatasetSizing ?? {}) } : undefined
    }
    masterDataHistoryRef.current = recordMasterDataEdit(masterDataHistoryRef.current, entry)
    setMasterDataHistoryRevision(revision => revision + 1)
  }

  const recordMasterDataPairWorkingEdit = (before: ProductSession, after: ProductSession) => {
    const beforePair = normalizeSnapshotPair(before.snapshotPair ?? sessionToSnapshotPair(before))
    const afterPair = normalizeSnapshotPair(after.snapshotPair ?? sessionToSnapshotPair(after))
    const entry: MasterDataEditHistoryEntry = {
      sessionId: before.id,
      role: 'current',
      before: cloneCostSnapshot(beforePair.current),
      after: cloneCostSnapshot(afterPair.current),
      beforePrepared: { ...getSnapshotRoleReadiness(before) },
      afterPrepared: { ...getSnapshotRoleReadiness(after) },
      beforeSizing: copyDatasetSizing(before.datasetSizing),
      afterSizing: copyDatasetSizing(after.datasetSizing),
      beforeInitialMasterDataBaseline: copyMasterDataBaselines(before.initialMasterDataBaseline),
      afterInitialMasterDataBaseline: copyMasterDataBaselines(after.initialMasterDataBaseline),
      beforePair: {
        reference: cloneCostSnapshot(beforePair.reference),
        current: cloneCostSnapshot(beforePair.current)
      },
      afterPair: {
        reference: cloneCostSnapshot(afterPair.reference),
        current: cloneCostSnapshot(afterPair.current)
      },
      beforeCustom: cloneCostSnapshot(before.customMasterData ?? createEmptyCustomMasterData(before.id)),
      afterCustom: cloneCostSnapshot(after.customMasterData ?? createEmptyCustomMasterData(after.id)),
      beforeCustomSizing: { ...(before.customDatasetSizing ?? {}) },
      afterCustomSizing: { ...(after.customDatasetSizing ?? {}) }
    }
    masterDataHistoryRef.current = recordMasterDataEdit(masterDataHistoryRef.current, entry)
    setMasterDataHistoryRevision(revision => revision + 1)
  }

  const [activeProductId, setActiveProductId] = useState<string>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_ID, 'ps-empty-default')
  )

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() =>
    normalizeActiveTab(loadFromSession<unknown>(STORAGE_KEYS.ACTIVE_TAB, 'master'))
  )

  const [uomList, setUomList] = useState<string[]>(() =>
    loadFromSession(STORAGE_KEYS.UOM_LIST, DEFAULT_UOMS)
  )

  const [selectedComparisonScope, setSelectedComparisonScope] = useState<StoredSelectedComparison | null>(null)
  const [masterDataPrepareDatasetOpen, setMasterDataPrepareDatasetOpen] = useState(false)
  const [masterDataPrepareDatasetPinned, setMasterDataPrepareDatasetPinnedState] = useState(false)
  const masterDataPrepareDatasetPinnedRef = useRef(false)
  const masterDataPrepareDatasetHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [masterDataPrepareDatasetRequested, setMasterDataPrepareDatasetRequested] = useState(false)
  const [masterDataPrepareDatasetRequestMode, setMasterDataPrepareDatasetRequestMode] = useState<'all-warnings' | null>(null)

  const setMasterDataPrepareDatasetPinned = (pinned: boolean) => {
    masterDataPrepareDatasetPinnedRef.current = pinned
    setMasterDataPrepareDatasetPinnedState(pinned)
  }
  const clearMasterDataPrepareDatasetHoverTimer = () => {
    if (masterDataPrepareDatasetHoverTimerRef.current) clearTimeout(masterDataPrepareDatasetHoverTimerRef.current)
    masterDataPrepareDatasetHoverTimerRef.current = null
  }

  useEffect(() => {
    clearMasterDataEditHistory()
  }, [activeProductId])

  // Sync to sessionStorage
  useEffect(() => saveToSession(STORAGE_KEYS.SESSIONS, productSessions), [productSessions])
  useEffect(() => saveToSession(STORAGE_KEYS.ACTIVE_ID, activeProductId), [activeProductId])
  useEffect(() => saveToSession(STORAGE_KEYS.UOM_LIST, uomList), [uomList])

  const setActiveTab = (tab: ActiveTab) => {
    if (tab === 'simulation') setSelectedComparisonScope(null)
    if (tab !== 'master') {
      clearMasterDataPrepareDatasetHoverTimer()
      setMasterDataPrepareDatasetPinned(false)
      setMasterDataPrepareDatasetOpen(false)
    }
    setActiveTabState(tab)
    saveToSession(STORAGE_KEYS.ACTIVE_TAB, tab)
  }

  const toggleMasterDataPrepareDataset = () => {
    clearMasterDataPrepareDatasetHoverTimer()
    setMasterDataPrepareDatasetRequestMode(null)
    setMasterDataPrepareDatasetRequested(false)
    if (masterDataPrepareDatasetPinned) {
      setMasterDataPrepareDatasetPinned(false)
      setMasterDataPrepareDatasetOpen(false)
    } else {
      setMasterDataPrepareDatasetPinned(true)
      setMasterDataPrepareDatasetOpen(true)
    }
  }

  const previewMasterDataPrepareDataset = () => {
    clearMasterDataPrepareDatasetHoverTimer()
    if (masterDataPrepareDatasetPinnedRef.current) return
    setMasterDataPrepareDatasetOpen(true)
  }

  const scheduleDismissMasterDataPrepareDatasetPreview = () => {
    clearMasterDataPrepareDatasetHoverTimer()
    masterDataPrepareDatasetHoverTimerRef.current = setTimeout(() => {
      masterDataPrepareDatasetHoverTimerRef.current = null
      if (masterDataPrepareDatasetPinnedRef.current) return
      const trigger = typeof document === 'undefined' ? null : document.getElementById('header-prepare-dataset-trigger')
      const interactionBoundary = trigger?.parentElement
      const panel = typeof document === 'undefined' ? null : document.getElementById('prepare-dataset-panel')
      const activeElement = typeof document === 'undefined' ? null : document.activeElement
      const focusWithin = Boolean(
        (activeElement && interactionBoundary?.contains(activeElement))
        || (activeElement && panel?.contains(activeElement))
      )
      const pointerWithin = Boolean(interactionBoundary?.matches(':hover') || panel?.matches(':hover'))
      if (!focusWithin && !pointerWithin) setMasterDataPrepareDatasetOpen(false)
    }, 160)
  }

  const closeMasterDataPrepareDataset = () => {
    clearMasterDataPrepareDatasetHoverTimer()
    setMasterDataPrepareDatasetPinned(false)
    setMasterDataPrepareDatasetOpen(false)
    setMasterDataPrepareDatasetRequestMode(null)
    setMasterDataPrepareDatasetRequested(false)
  }

  const requestMasterDataPrepareDataset = (mode?: 'all-warnings') => {
    clearMasterDataPrepareDatasetHoverTimer()
    if (masterDataPrepareDatasetOpen) {
      closeMasterDataPrepareDataset()
      return
    }
    setMasterDataPrepareDatasetPinned(true)
    setMasterDataPrepareDatasetOpen(true)
    setMasterDataPrepareDatasetRequestMode(mode ?? null)
    setMasterDataPrepareDatasetRequested(true)
  }
  const consumeMasterDataPrepareDatasetRequest = () => {
    setMasterDataPrepareDatasetRequested(false)
    setMasterDataPrepareDatasetRequestMode(null)
  }


  const addUOM = (newUOM: string) => {
    const trimmed = newUOM.trim().toUpperCase()
    if (trimmed && !uomList.includes(trimmed)) {
      setUomList(prev => [...prev, trimmed])
    }
  }

  // Active session
  const activeSession: ProductSession =
    productSessions.find(s => s.id === activeProductId) ?? productSessions[0]

  const { product, rates, bom, routing } = activeSession

  const patchActive = (patch: Partial<ProductSession>) => {
    const now = new Date().toISOString()
    const changesMasterData = ['product', 'rates', 'bom', 'routing', 'snapshotPair', 'snapshotPairMode', 'datasetSizing']
      .some(key => Object.prototype.hasOwnProperty.call(patch, key))
    setProductSessions(prev =>
      prev.map(s => {
        if (s.id !== activeSession.id) return s
        const updated = withSnapshotPair({ ...s, ...patch, updatedAt: now })
        return changesMasterData ? markMasterDataChanged(updated) : updated
      })
    )
  }

  const snapshotPair = activeSession.snapshotPair ?? sessionToSnapshotPair(activeSession)
  const fullSnapshotComparison = compareSnapshots(snapshotPair.reference, snapshotPair.current)
  const snapshotSourceFingerprint = useMemo(() => JSON.stringify([snapshotPair.reference, snapshotPair.current]), [snapshotPair])
  const activeSelectedComparisonScope = selectedComparisonScope?.sourceFingerprint === snapshotSourceFingerprint
    ? selectedComparisonScope
    : null
  const analysisSnapshotPair = activeSelectedComparisonScope
    ? createSelectedSnapshotPair(snapshotPair, fullSnapshotComparison, activeSelectedComparisonScope)
    : snapshotPair
  const snapshotComparison = activeSelectedComparisonScope
    ? compareSnapshots(analysisSnapshotPair.reference, analysisSnapshotPair.current)
    : fullSnapshotComparison
  const selectedComparisonSelection: SelectedComparisonSelection | null = activeSelectedComparisonScope
    ? {
        bomFindingKeys: activeSelectedComparisonScope.bomFindingKeys,
        routingFindingKeys: activeSelectedComparisonScope.routingFindingKeys
      }
    : null
  const isSelectedComparisonActive = activeSelectedComparisonScope !== null

  useEffect(() => {
    if (selectedComparisonScope && !activeSelectedComparisonScope) setSelectedComparisonScope(null)
  }, [selectedComparisonScope, activeSelectedComparisonScope])

  const applySelectedComparison = (selection: SelectedComparisonSelection) => {
    const selectableBOMKeys = new Set(fullSnapshotComparison.bomFindings
      .filter(finding => getCanonicalComparisonStatus(finding) !== null)
      .map(finding => getComparisonFindingKey('bom', finding)))
    const selectableRoutingKeys = new Set(fullSnapshotComparison.routingFindings
      .filter(finding => getCanonicalComparisonStatus(finding) !== null)
      .map(finding => getComparisonFindingKey('routing', finding)))
    const nextScope: StoredSelectedComparison = {
      sourceFingerprint: snapshotSourceFingerprint,
      bomFindingKeys: [...new Set(selection.bomFindingKeys)].filter(key => selectableBOMKeys.has(key)),
      routingFindingKeys: [...new Set(selection.routingFindingKeys)].filter(key => selectableRoutingKeys.has(key))
    }
    if (nextScope.bomFindingKeys.length === 0 && nextScope.routingFindingKeys.length === 0) return
    setSelectedComparisonScope(nextScope)
  }

  const clearSelectedComparison = () => setSelectedComparisonScope(null)
  const masterDataHandoff = evaluateMasterDataHandoff(activeSession, snapshotPair)
  const masterDataRole = masterDataUiState.role
  const masterDataSnapshot = getMasterDataSnapshot(activeSession, snapshotPair, masterDataRole)
  const masterDataSnapshots: Record<MasterDataRole, CostSnapshot> = {
    reference: getMasterDataSnapshot(activeSession, snapshotPair, 'reference'),
    current: getMasterDataSnapshot(activeSession, snapshotPair, 'current'),
    custom: getMasterDataSnapshot(activeSession, snapshotPair, 'custom')
  }
  const masterDataLastSavedSnapshot = getLastSavedMasterData(activeSession, masterDataRole)?.snapshot
  const masterDataLastSavedSnapshots: Partial<Record<MasterDataRole, CostSnapshot>> = {
    reference: getLastSavedMasterData(activeSession, 'reference')?.snapshot,
    current: getLastSavedMasterData(activeSession, 'current')?.snapshot,
    custom: getLastSavedMasterData(activeSession, 'custom')?.snapshot
  }
  ;(['reference', 'current', 'custom'] as const).forEach(role => {
    if (masterDataLastSavedSnapshots[role]) {
      masterDataLastSavedSnapshots[role] = normalizeMasterDataSnapshot(masterDataLastSavedSnapshots[role]!)
    }
  })
  const masterDataSizing = getMasterDataSizing(activeSession, masterDataSnapshot, masterDataRole)

  // Product Session Actions
  const createProductWithSizing = (config: ProductSizingConfig) => {
    const id = `ps-${Date.now()}`
    const now = new Date().toISOString()
    const newSession = makeSizedSession(id, config, now)
    setProductSessions(prev => [...prev, newSession])
    setActiveProductId(id)
    setActiveTab('master')
  }

  const updateProductSizing = (config: ProductSizingConfig) => {
    const now = new Date().toISOString()
    const targetWcCount = Math.max(1, config.wcCount)
    const targetBomCount = Math.max(1, config.bomCount)
    const targetRoutingCount = Math.max(1, config.routingCount)

    // Adjust Rates
    let newRates = [...rates]
    if (newRates.length < targetWcCount) {
      const defaultWcNames = ['Cutting', 'Printing-Digital RGOM', 'Assembly Digital RGOM', 'OQA-Digital']
      for (let i = newRates.length; i < targetWcCount; i++) {
        const wc = defaultWcNames[i] || `WorkCenter_${i + 1}`
        newRates.push({
          id: `rate-${Date.now()}-${i + 1}`,
          wc,
          description: wc,
          laborRate: 105.29,
          burdenRate: 95.00,
          effectiveDate: config.effectiveDate || now.split('T')[0],
          sourceRef: 'Standard Rate'
        })
      }
    } else if (newRates.length > targetWcCount) {
      newRates = newRates.slice(0, targetWcCount)
    }

    // Adjust BOM
    let newBOM = [...bom]
    if (newBOM.length < targetBomCount) {
      for (let i = newBOM.length; i < targetBomCount; i++) {
        newBOM.push({
          id: `bom-${Date.now()}-${i + 1}`,
          itemCode: `RM-${String(i + 1).padStart(4, '0')}`,
          description: `Material Item ${i + 1}`,
          consumption: 0.01,
          unit: 'PC',
          basePrice: 10.0,
          activePrice: 10.0,
          baseLoss: 0.1,
          activeLoss: 0.1,
          sourceRef: 'Standard Addon'
        })
      }
    } else if (newBOM.length > targetBomCount) {
      newBOM = newBOM.slice(0, targetBomCount)
    }

    // Adjust Routing
    let newRouting = [...routing]
    if (newRouting.length < targetRoutingCount) {
      for (let i = newRouting.length; i < targetRoutingCount; i++) {
        newRouting.push({
          id: `rt-${Date.now()}-${i + 1}`,
          opSeq: (i + 1) * 10,
          description: `Process Operation ${i + 1}`,
          wc: newRates[0]?.wc || 'Cutting',
          manning: 1,
          baseCap: 1000,
          activeCap: 1000,
          baseYield: 0.98,
          activeYield: 0.98,
          sourceRef: 'Standard Addon'
        })
      }
    } else if (newRouting.length > targetRoutingCount) {
      newRouting = newRouting.slice(0, targetRoutingCount)
    }

    patchActive({
      product: {
        productCode: config.productCode,
        productDescription: config.productDescription,
        uom: config.uom,
        customer: config.customer || product.customer,
        effectiveDate: config.effectiveDate || product.effectiveDate
      },
      rates: newRates,
      bom: newBOM,
      routing: newRouting
    })
  }

  const switchProduct = (id: string) => {
    if (productSessions.some(s => s.id === id)) {
      setActiveProductId(id)
      setActiveTab('master')
    }
  }

  const duplicateProduct = (id: string) => {
    const source = productSessions.find(s => s.id === id)
    if (!source) return
    const newId = `ps-${Date.now()}`
    const now = new Date().toISOString()
    const copy: ProductSession = withSnapshotPair({
      ...source,
      id: newId,
      initialMasterDataBaseline: undefined,
      product: { ...source.product, productCode: `${source.product.productCode}-COPY` },
      bom: source.bom.map(b => ({ ...b, id: `bom-${Date.now()}-${b.id}` })),
      routing: source.routing.map(r => ({ ...r, id: `rt-${Date.now()}-${r.id}` })),
      savedDrivers: [],
      selectedDriverKeys: [],
      rcaRecords: {},
      candidateRcaRecords: {},
      preparedSnapshotRoles: { reference: false, current: false },
      status: 'draft',
      versionLabel: `Draft (${source.product.productCode || 'Copy'})`,
      createdAt: now,
      updatedAt: now
    })
    setProductSessions(prev => [...prev, copy])
    setActiveProductId(newId)
    setActiveTab('master')
  }

  // 3-State Versioning actions
  const cloneActiveToDraft = (sourceId?: string) => {
    const source = productSessions.find(s => s.id === (sourceId || activeProductId)) || activeSession
    const newId = `ps-draft-${Date.now()}`
    const now = new Date().toISOString()
    const preparedSnapshotRoles = getSnapshotRoleReadiness(source)
    const copy: ProductSession = withSnapshotPair({
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      initialMasterDataBaseline: undefined,
      status: 'draft',
      versionLabel: `Draft (${source.product.productCode || 'Working Copy'})`,
      createdAt: now,
      updatedAt: now,
      preparedSnapshotRoles
    })
    setProductSessions(prev => [...prev, copy])
    setActiveProductId(newId)
    setActiveTab('master')
  }

  const activateDraft = (draftId: string) => {
    const target = productSessions.find(s => s.id === draftId)
    if (!target) return
    const now = new Date().toISOString()
    const targetCode = target.product.productCode

    setProductSessions(prev =>
      prev.map(s => {
        if (s.id === draftId) {
          return withSnapshotPair({
            ...s,
            status: 'active',
            versionLabel: 'Active Version',
            updatedAt: now
          })
        }
        // Archive previous active dataset
        if (s.status === 'active' && (!targetCode || s.product.productCode === targetCode || s.id === activeProductId)) {
          return withSnapshotPair({
            ...s,
            status: 'archived',
            versionLabel: `Archived (${new Date(s.updatedAt || now).toLocaleDateString()})`,
            updatedAt: now
          })
        }
        return s
      })
    )
    setActiveProductId(draftId)
  }

  const deleteProduct = (id: string) => {
    setProductSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        const empty = makeEmptySession()
        setActiveProductId(empty.id)
        return [empty]
      }
      if (activeProductId === id) {
        // Prefer switching to another active session or first remaining
        const nextActive = remaining.find(s => s.status === 'active') || remaining[0]
        setActiveProductId(nextActive.id)
      }
      return remaining
    })
  }

  const setMasterDataRole = (role: MasterDataRole) => {
    updateMasterDataUiState({ type: 'set-role', role })
  }

  const saveMasterDataWorkingDataset = (role: MasterDataRole) => {
    const now = new Date().toISOString()
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
      const snapshot = getMasterDataSnapshot(session, pair, role)
      const saved = {
        snapshot: cloneCostSnapshot(snapshot),
        prepared: role === 'custom' ? hasEnteredMasterData(snapshot) : getSnapshotRoleReadiness(session)[role],
        sizing: { ...getMasterDataSizing(session, snapshot, role) }
      }
      if (role === 'custom') {
        return { ...session, updatedAt: now, customLastSavedMasterData: saved }
      }
      return {
        ...session,
        updatedAt: now,
        lastSavedMasterData: {
          ...session.lastSavedMasterData,
          [role]: saved
        }
      }
    }))
  }

  const saveAllMasterDataWorkingDatasets = () => {
    const session = activeSession
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const readiness = getSnapshotRoleReadiness(session)
    const now = new Date().toISOString()
    const createSavedDataset = (role: MasterDataRole) => {
      const snapshot = getMasterDataSnapshot(session, pair, role)
      return {
        snapshot: cloneCostSnapshot(snapshot),
        prepared: role === 'custom' ? hasEnteredMasterData(snapshot) : readiness[role],
        sizing: { ...getMasterDataSizing(session, snapshot, role) }
      }
    }

    const reference = createSavedDataset('reference')
    const current = createSavedDataset('current')
    const custom = createSavedDataset('custom')
    setProductSessions(previous => previous.map(candidate => candidate.id === session.id
      ? {
        ...candidate,
        updatedAt: now,
        lastSavedMasterData: {
          ...candidate.lastSavedMasterData,
          reference,
          current
        },
        customLastSavedMasterData: custom
      }
      : candidate))
  }

  const commitMasterDataWorkingSession = (before: ProductSession, after: ProductSession, role: MasterDataRole) => {
    const beforePair = before.snapshotPair ?? sessionToSnapshotPair(before)
    const afterPair = after.snapshotPair ?? sessionToSnapshotPair(after)
    const beforeState = {
      snapshot: getMasterDataSnapshot(before, beforePair, role),
      prepared: role === 'custom' ? undefined : getSnapshotRoleReadiness(before)[role],
      sizing: role === 'custom' ? before.customDatasetSizing : before.datasetSizing
    }
    const afterState = {
      snapshot: getMasterDataSnapshot(after, afterPair, role),
      prepared: role === 'custom' ? undefined : getSnapshotRoleReadiness(after)[role],
      sizing: role === 'custom' ? after.customDatasetSizing : after.datasetSizing
    }
    if (JSON.stringify(beforeState) === JSON.stringify(afterState)) return

    setProductSessions(previous => previous.map(session => session.id === before.id ? after : session))
    recordMasterDataWorkingEdit(before, after, role)
  }

  const resetMasterDataWorkingDataset = (role: MasterDataRole) => {
    const session = activeSession
    const now = new Date().toISOString()
    const saved = getMasterDataResetBaseline(session, role)
    if (!saved) return

    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    if (role === 'custom') {
      const updated = {
        ...session,
        customMasterData: cloneCostSnapshot(saved.snapshot),
        customDatasetSizing: { ...(saved.sizing ?? saved.snapshot.sizing ?? {}) },
        updatedAt: now
      }
      commitMasterDataWorkingSession(session, updated, role)
      return
    }
    const nextPair: SnapshotPair = {
      ...pair,
      [role]: cloneCostSnapshot(saved.snapshot)
    }
    const nextSizing = {
      reference: session.datasetSizing?.reference ?? pair.reference.sizing ?? {},
      current: session.datasetSizing?.current ?? pair.current.sizing ?? {},
      [role]: { ...(saved.sizing ?? saved.snapshot.sizing ?? {}) }
    }
    const nextPrepared = {
      ...getSnapshotRoleReadiness(session),
      [role]: saved.prepared
    }
    const updated = applyMasterDataSnapshotPair({
      ...session,
      datasetSizing: nextSizing,
      preparedSnapshotRoles: nextPrepared,
      updatedAt: now
    }, nextPair)
    commitMasterDataWorkingSession(session, updated, role)
  }

  const commitMasterDataAllWorkingDatasets = (before: ProductSession, after: ProductSession) => {
    const getWorkingState = (session: ProductSession) => {
      const pair = normalizeSnapshotPair(session.snapshotPair ?? sessionToSnapshotPair(session))
      return {
        pair,
        custom: getMasterDataSnapshot(session, pair, 'custom'),
        prepared: getSnapshotRoleReadiness(session),
        sizing: session.datasetSizing,
        customSizing: session.customDatasetSizing
      }
    }
    if (JSON.stringify(getWorkingState(before)) === JSON.stringify(getWorkingState(after))) return
    setProductSessions(previous => previous.map(candidate => candidate.id === before.id ? after : candidate))
    // The existing compound history entry already snapshots Reference/Current plus Custom atomically.
    recordMasterDataPairWorkingEdit(before, after)
  }

  const resetAllMasterDataWorkingDatasets = () => {
    const session = activeSession
    const pair = normalizeSnapshotPair(session.snapshotPair ?? sessionToSnapshotPair(session))
    const nextPair: SnapshotPair = { ...pair }
    const nextSizing = {
      reference: session.datasetSizing?.reference ?? pair.reference.sizing ?? {},
      current: session.datasetSizing?.current ?? pair.current.sizing ?? {}
    }
    const nextPrepared = { ...getSnapshotRoleReadiness(session) }
    let nextCustom = session.customMasterData ?? createEmptyCustomMasterData(session.id)
    let nextCustomSizing = session.customDatasetSizing ?? nextCustom.sizing ?? {}

    ;(['reference', 'current', 'custom'] as const).forEach(role => {
      const saved = getMasterDataResetBaseline(session, role)
      if (!saved) return
      if (role === 'custom') {
        nextCustom = cloneCostSnapshot(saved.snapshot)
        nextCustomSizing = { ...(saved.sizing ?? saved.snapshot.sizing ?? {}) }
        return
      }
      nextPair[role] = cloneCostSnapshot(saved.snapshot)
      nextSizing[role] = { ...(saved.sizing ?? saved.snapshot.sizing ?? {}) }
      nextPrepared[role] = saved.prepared
    })

    const now = new Date().toISOString()
    const updated = applyMasterDataSnapshotPair({
      ...session,
      datasetSizing: nextSizing,
      preparedSnapshotRoles: nextPrepared,
      customMasterData: nextCustom,
      customDatasetSizing: { ...nextCustomSizing },
      updatedAt: now
    }, nextPair)
    commitMasterDataAllWorkingDatasets(session, updated)
  }

  const updateMasterDataDataset = (
    mutate: (snapshot: CostSnapshot) => CostSnapshot,
    sizingField?: keyof DatasetSizing,
    finalize?: (previous: CostSnapshot, normalizedNext: CostSnapshot) => CostSnapshot
  ) => {
    const session = activeSession
    const role = masterDataUiState.role
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const readiness = getSnapshotRoleReadiness(session)
    const currentDataset = getMasterDataSnapshot(session, pair, role)
    let nextDataset = normalizeMasterDataSnapshot(mutate(currentDataset), currentDataset)
    if (finalize) nextDataset = finalize(currentDataset, nextDataset)
    if (!isMasterDataSnapshotChangeValid(currentDataset, nextDataset)) return
    if (role === 'custom' && nextDataset.comparisonRole) {
      const { comparisonRole: _comparisonRole, ...customDataset } = nextDataset
      nextDataset = customDataset
    }
    if (role === 'custom') {
      let nextCustomSizing = { ...(session.customDatasetSizing ?? currentDataset.sizing ?? {}) }
      if (sizingField) {
        const count = sizingField === 'wcCount' ? nextDataset.rates.length
          : sizingField === 'bomCount' ? nextDataset.bom.length
            : nextDataset.routing.length
        if (count > 0) nextCustomSizing[sizingField] = count
        else delete nextCustomSizing[sizingField]
        nextDataset = { ...nextDataset, sizing: { ...nextCustomSizing } }
      }
      const updated = {
        ...setMasterDataSnapshot(session, pair, role, nextDataset),
        ...(sizingField ? { customDatasetSizing: nextCustomSizing } : {}),
        updatedAt: new Date().toISOString()
      }
      commitMasterDataWorkingSession(session, updated, role)
      return
    }
    let nextPair: SnapshotPair = {
      ...pair,
      [role]: { ...nextDataset, comparisonRole: role }
    }
    let nextSizing = session.datasetSizing
    if (sizingField) {
      const synchronized = synchronizeDatasetSizingToRows(nextPair, session.datasetSizing, role, sizingField)
      nextPair = synchronized.snapshotPair
      nextSizing = synchronized.datasetSizing
    }
    const updated = applyMasterDataSnapshotPair({
      ...session,
      ...(sizingField ? { datasetSizing: nextSizing } : {}),
      updatedAt: new Date().toISOString(),
      preparedSnapshotRoles: { ...readiness, [role]: true }
    }, nextPair)
    commitMasterDataWorkingSession(session, updated, role)
  }

  const updateMasterDataProduct = (nextProduct: ProductMaster) => {
    updateMasterDataDataset(dataset => ({ ...dataset, product: { ...nextProduct } }))
  }

  const updateMasterDataRemark = (remark: string) => {
    updateMasterDataDataset(dataset => ({ ...dataset, remark }))
  }

  const applyMasterDataHistoryEntry = (entry: MasterDataEditHistoryEntry, direction: 'undo' | 'redo') => {
    const session = productSessions.find(candidate => candidate.id === entry.sessionId)
    if (!session) {
      clearMasterDataEditHistory()
      return
    }

    const updated = restoreMasterDataEditHistoryEntry(session, entry, direction)
    if (!updated) {
      clearMasterDataEditHistory()
      return
    }

    setProductSessions(previous => previous.map(candidate => candidate.id === session.id ? updated : candidate))
    setMasterDataHistoryRevision(revision => revision + 1)
  }

  const undoMasterDataEdit = () => {
    const result = takeMasterDataUndo(masterDataHistoryRef.current)
    masterDataHistoryRef.current = result.history
    if (result.entry) applyMasterDataHistoryEntry(result.entry, 'undo')
  }

  const redoMasterDataEdit = () => {
    const result = takeMasterDataRedo(masterDataHistoryRef.current)
    masterDataHistoryRef.current = result.history
    if (result.entry) applyMasterDataHistoryEntry(result.entry, 'redo')
  }

  const cloneMasterDataWorkspace = (sourceRole: MasterDataRole) => {
    const session = activeSession
    const destinationRole = masterDataUiState.role
    if (sourceRole === destinationRole) return
    const updated = cloneMasterDataDatasetState(session, sourceRole, destinationRole)
    commitMasterDataWorkingSession(session, updated, destinationRole)
  }

  const sendSimulationSnapshotsToMasterData = (snapshots: Partial<Record<MasterDataRole, CostSnapshot>>) => {
    const session = activeSession
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const roles = (['reference', 'current', 'custom'] as const).filter(role => snapshots[role] !== undefined)
    if (!roles.length) return false
    const nextPair = { ...pair }
    const nextDatasetSizing = {
      reference: session.datasetSizing?.reference ?? pair.reference.sizing ?? {},
      current: session.datasetSizing?.current ?? pair.current.sizing ?? {}
    }
    const nextPreparedSnapshotRoles = { ...getSnapshotRoleReadiness(session) }
    let nextCustomMasterData = session.customMasterData
    let nextCustomDatasetSizing = session.customDatasetSizing

    // Prepare and validate every requested role before changing the session.
    for (const role of roles) {
      const snapshot = snapshots[role]!
      const currentDataset = getMasterDataSnapshot(session, pair, role)
      const { comparisonRole: _comparisonRole, ...workingSnapshot } = cloneCostSnapshot(snapshot)
      const sizing = {
        ...(snapshot.sizing ?? {}),
        wcCount: snapshot.rates.length,
        bomCount: snapshot.bom.length,
        routingCount: snapshot.routing.length
      }
      const nextDataset = normalizeMasterDataSnapshot({
        ...workingSnapshot,
        id: `${snapshot.id}:${role}`,
        sourceRef: 'Copied from Simulation',
        status: 'draft',
        ...(role === 'custom' ? {} : { comparisonRole: role }),
        sizing
      }, currentDataset)
      if (!isMasterDataSnapshotChangeValid(currentDataset, nextDataset)) return false
      if (role === 'custom') {
        nextCustomMasterData = nextDataset
        nextCustomDatasetSizing = sizing
      } else {
        nextPair[role] = nextDataset
        nextDatasetSizing[role] = sizing
        nextPreparedSnapshotRoles[role] = hasEnteredMasterData(nextDataset)
      }
    }

    const now = new Date().toISOString()
    let updated: ProductSession = {
      ...session,
      updatedAt: now,
      datasetSizing: nextDatasetSizing,
      preparedSnapshotRoles: nextPreparedSnapshotRoles,
      ...(nextCustomMasterData ? { customMasterData: nextCustomMasterData } : {}),
      ...(nextCustomDatasetSizing ? { customDatasetSizing: nextCustomDatasetSizing } : {})
    }
    if (roles.some(role => role !== 'custom')) {
      updated = applySnapshotPairToSession(updated, nextPair)
      updated = markMasterDataChangedForSnapshotPair(updated, pair, nextPair)
    }
    if (roles.length === 3) {
      commitMasterDataAllWorkingDatasets(session, updated)
    } else if (roles.length === 1) {
      commitMasterDataWorkingSession(session, updated, roles[0])
    } else {
      // A two-dataset Send is one compound Master Data history step.
      commitMasterDataAllWorkingDatasets(session, updated)
    }
    return true
  }

  const sendSimulationSnapshotToMasterData = (role: MasterDataRole, snapshot: CostSnapshot) =>
    sendSimulationSnapshotsToMasterData({ [role]: snapshot })

  const updateMasterDataDatasetSizing = (role: MasterDataRole, sizing: Partial<DatasetSizing>) => {
    assertDatasetSizingCounts(sizing)
    const session = activeSession
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const currentDataset = getMasterDataSnapshot(session, pair, role)
    const existingRoleSizing = getMasterDataSizing(session, currentDataset, role)
    const nextRoleSizing: DatasetSizing = {
      ...existingRoleSizing,
      ...sizing
    }
    const resizedSnapshot = resizeMasterDataSnapshotForSizing(currentDataset, nextRoleSizing, {
        rate: (idx): SnapshotWorkCenterRate => ({
          id: `rate-size-${Date.now()}-${idx}`,
          isGeneratedSizingPlaceholder: true,
          workCenterCode: '',
          description: '',
          laborRate: null,
          burdenRate: null,
          effectiveDate: currentDataset.product.effectiveDate || new Date().toISOString().split('T')[0],
          sourceRef: 'Direct Input',
          confidence: {
            laborRate: workingEvidence(null, 'Direct Input'),
            burdenRate: workingEvidence(null, 'Direct Input')
          }
        }),
        bom: (idx): SnapshotBOMItem => ({
          id: `bom-size-${Date.now()}-${idx}`,
          isGeneratedSizingPlaceholder: true,
          itemCode: '',
          description: '',
          consumption: null,
          unit: 'PC',
          price: null,
          loss: null,
          sourceRef: 'Direct Input',
          confidence: {
            consumption: workingEvidence(null, 'Direct Input'),
            price: workingEvidence(null, 'Direct Input'),
            loss: workingEvidence(null, 'Direct Input')
          }
        }),
        routing: (idx, rates): SnapshotRoutingStep => ({
          id: `routing-size-${Date.now()}-${idx}`,
          isGeneratedSizingPlaceholder: true,
          operationCode: '',
          processName: '',
          sequence: idx * 10,
          workCenterId: rates[0]?.workCenterCode || undefined,
          manning: null,
          capacity: null,
          yield: null,
          sourceRef: 'Direct Input',
          confidence: {
            sequence: workingEvidence(idx * 10, 'Direct Input'),
            manning: workingEvidence(null, 'Direct Input'),
            capacity: workingEvidence(null, 'Direct Input'),
            yield: workingEvidence(null, 'Direct Input')
          }
        })
    })
    const updatedSnapshot = normalizeMasterDataSnapshot(resizedSnapshot, currentDataset)
    if (!isMasterDataSnapshotChangeValid(currentDataset, updatedSnapshot)) return
    if (role === 'custom') {
      const updated = {
        ...session,
        customMasterData: updatedSnapshot,
        customDatasetSizing: nextRoleSizing,
        updatedAt: new Date().toISOString()
      }
      commitMasterDataWorkingSession(session, updated, role)
      return
    }
    const nextDatasetSizing: Record<ComparisonRole, DatasetSizing> = {
      reference: session.datasetSizing?.reference ?? {},
      current: session.datasetSizing?.current ?? {},
      [role]: nextRoleSizing
    }
    const nextPair: SnapshotPair = {
      ...pair,
      [role]: updatedSnapshot
    }
    const updated = applyMasterDataSnapshotPair({
      ...session,
      datasetSizing: nextDatasetSizing,
      updatedAt: new Date().toISOString()
    }, nextPair)
    commitMasterDataWorkingSession(session, updated, role)
  }

  const clearMasterDataDataset = (role: MasterDataRole) => {
    const session = activeSession
    const updated = clearMasterDataDatasetState(session, role)
    commitMasterDataWorkingSession(session, updated, role)
  }

  const clearAllMasterDataWorkingDatasets = () => {
    const session = activeSession
    const updated = (['reference', 'current', 'custom'] as const)
      .reduce((working, role) => clearMasterDataDatasetState(working, role), session)
    commitMasterDataAllWorkingDatasets(session, updated)
  }

  const addMasterDataBOMItem = (item: Omit<SnapshotBOMItem, 'id' | 'confidence'>) => {
    updateMasterDataDataset(dataset => {
      const sourceRef = item.sourceRef || dataset.sourceRef
      const newItem: SnapshotBOMItem = {
        ...item,
        id: `bom-${Date.now()}`,
        sourceRef,
        confidence: {
          consumption: workingEvidence(item.consumption, sourceRef),
          price: workingEvidence(item.price, sourceRef),
          loss: workingEvidence(item.loss, sourceRef)
        }
      }
      return { ...dataset, bom: [...dataset.bom, newItem] }
    }, 'bomCount')
  }

  const updateMasterDataBOMItems = (updates: Array<{ id: string; changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>> }>) => {
    const changesById = new Map<string, Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => changesById.set(id, {
      ...changesById.get(id),
      ...filterInvalidMasterDataNumericChanges(changes)
    }))
    updateMasterDataDataset(dataset => ({
      ...dataset,
      bom: dataset.bom.map(item => {
        const changes = changesById.get(item.id)
        if (!changes) return item
        const next = { ...item, ...changes }
        const sourceRef = next.sourceRef || dataset.sourceRef
        const confidence = { ...item.confidence }
        ;(['consumption', 'price', 'loss'] as const).forEach(field => {
          if (Object.prototype.hasOwnProperty.call(changes, field)) {
            confidence[field] = workingEvidence(next[field], sourceRef, item.confidence[field])
          }
        })
        const updated = { ...next, sourceRef, confidence }
        return changes.isGeneratedSizingPlaceholder === true ? updated : markSizingPlaceholderEdited(updated)
      })
    }))
  }

  const updateMasterDataBOMItem = (id: string, changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => {
    updateMasterDataBOMItems([{ id, changes }])
  }

  const deleteMasterDataBOMItems = (ids: string[]) => {
    const deletedIds = new Set(ids)
    if (deletedIds.size === 0) return
    updateMasterDataDataset(dataset => ({ ...dataset, bom: dataset.bom.filter(item => !deletedIds.has(item.id)) }), 'bomCount')
  }

  const deleteMasterDataBOMItem = (id: string) => {
    deleteMasterDataBOMItems([id])
  }

  const reorderMasterDataBOMItems = (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => {
    const idsToMove = movingIds?.includes(movingId) ? movingIds : [movingId]
    updateMasterDataDataset(dataset => ({ ...dataset, bom: moveSnapshotRows(dataset.bom, idsToMove, targetId, position) }))
  }

  const addMasterDataRoutingStep = (step: Omit<SnapshotRoutingStep, 'id' | 'confidence'>) => {
    updateMasterDataDataset(dataset => {
      const sourceRef = step.sourceRef || dataset.sourceRef
      const newStep: SnapshotRoutingStep = {
        ...step,
        id: `routing-${Date.now()}`,
        sourceRef,
        confidence: {
          sequence: workingEvidence(step.sequence, sourceRef),
          manning: workingEvidence(step.manning, sourceRef),
          capacity: workingEvidence(step.capacity, sourceRef),
          yield: workingEvidence(step.yield, sourceRef)
        }
      }
      return { ...dataset, routing: [...dataset.routing, newStep] }
    }, 'routingCount')
  }

  const updateMasterDataRoutingSteps = (updates: Array<{ id: string; changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>> }>) => {
    const session = activeSession
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const currentDataset = getMasterDataSnapshot(session, pair, masterDataUiState.role)
    const knownWorkCenters = new Set(currentDataset.rates.map(rate => rate.workCenterCode.trim().toLocaleLowerCase()).filter(Boolean))
    const changesById = new Map<string, Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => {
      const acceptedChanges = filterInvalidMasterDataNumericChanges(changes)
      if (Object.prototype.hasOwnProperty.call(changes, 'workCenterId')) {
        const proposed = String(changes.workCenterId ?? '').trim()
        const existing = currentDataset.routing.find(step => step.id === id)?.workCenterId?.trim() ?? ''
        if (proposed && !knownWorkCenters.has(proposed.toLocaleLowerCase()) && proposed.toLocaleLowerCase() !== existing.toLocaleLowerCase()) {
          delete acceptedChanges.workCenterId
        }
      }
      changesById.set(id, { ...changesById.get(id), ...acceptedChanges })
    })
    updateMasterDataDataset(dataset => ({
      ...dataset,
      routing: dataset.routing.map(step => {
        const changes = changesById.get(step.id)
        if (!changes) return step
        const next = { ...step, ...changes }
        const sourceRef = next.sourceRef || dataset.sourceRef
        const confidence = { ...step.confidence }
        ;(['sequence', 'manning', 'capacity', 'yield'] as const).forEach(field => {
          if (Object.prototype.hasOwnProperty.call(changes, field)) {
            confidence[field] = workingEvidence(next[field], sourceRef, step.confidence[field])
          }
        })
        const updated = { ...next, sourceRef, confidence }
        return changes.isGeneratedSizingPlaceholder === true ? updated : markSizingPlaceholderEdited(updated)
      })
    }))
  }

  const updateMasterDataRoutingStep = (id: string, changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => {
    updateMasterDataRoutingSteps([{ id, changes }])
  }

  const deleteMasterDataRoutingSteps = (ids: string[]) => {
    const deletedIds = new Set(ids)
    if (deletedIds.size === 0) return
    updateMasterDataDataset(dataset => ({ ...dataset, routing: dataset.routing.filter(step => !deletedIds.has(step.id)) }), 'routingCount')
  }

  const deleteMasterDataRoutingStep = (id: string) => {
    deleteMasterDataRoutingSteps([id])
  }

  const reorderMasterDataRoutingSteps = (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => {
    const idsToMove = movingIds?.includes(movingId) ? movingIds : [movingId]
    updateMasterDataDataset(dataset => ({ ...dataset, routing: moveSnapshotRows(dataset.routing, idsToMove, targetId, position) }))
  }

  const addMasterDataWorkCenterRate = (rate: Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>) => {
    updateMasterDataDataset(dataset => {
      const sourceRef = rate.sourceRef || dataset.sourceRef
      const newRate: SnapshotWorkCenterRate = {
        ...rate,
        id: `rate-${Date.now()}`,
        sourceRef,
        confidence: {
          laborRate: workingEvidence(rate.laborRate, sourceRef),
          burdenRate: workingEvidence(rate.burdenRate, sourceRef)
        }
      }
      return { ...dataset, rates: [...dataset.rates, newRate] }
    }, 'wcCount')
  }

  const updateMasterDataWorkCenterRates = (
    updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>,
    options?: { routingRowIdsByRateId?: Record<string, string[]> }
  ) => {
    const changesById = new Map<string, Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => changesById.set(id, {
      ...changesById.get(id),
      ...filterInvalidMasterDataNumericChanges(changes)
    }))
    updateMasterDataDataset(dataset => ({
      ...dataset,
      rates: dataset.rates.map(rate => {
        const changes = changesById.get(rate.id)
        if (!changes) return rate
        const next = { ...rate, ...changes }
        const sourceRef = next.sourceRef || dataset.sourceRef
        const confidence = { ...rate.confidence }
        ;(['laborRate', 'burdenRate'] as const).forEach(field => {
          if (Object.prototype.hasOwnProperty.call(changes, field)) {
            confidence[field] = workingEvidence(next[field], sourceRef, rate.confidence[field])
          }
        })
        const updated = { ...next, sourceRef, confidence }
        return changes.isGeneratedSizingPlaceholder === true ? updated : markSizingPlaceholderEdited(updated)
      })
    }), undefined, (previous, normalizedNext) => {
      const routingRowIdsByRateId = options?.routingRowIdsByRateId
        ? new Map(Object.entries(options.routingRowIdsByRateId).map(([id, rowIds]) => [id, new Set(rowIds)]))
        : undefined
      return propagateWorkCenterRenames(previous, normalizedNext, updates, routingRowIdsByRateId)
    })
  }

  const updateMasterDataWorkCenterRate = (id: string, changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => {
    updateMasterDataWorkCenterRates([{ id, changes }])
  }

  const deleteMasterDataWorkCenterRates = (ids: string[]) => {
    const deletedIds = new Set(ids)
    if (deletedIds.size === 0) return
    updateMasterDataDataset(dataset => ({ ...dataset, rates: dataset.rates.filter(rate => !deletedIds.has(rate.id)) }), 'wcCount')
  }

  const deleteMasterDataWorkCenterRate = (id: string) => {
    deleteMasterDataWorkCenterRates([id])
  }

  const reorderMasterDataWorkCenters = (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => {
    const idsToMove = movingIds?.includes(movingId) ? movingIds : [movingId]
    updateMasterDataDataset(dataset => ({ ...dataset, rates: moveSnapshotRows(dataset.rates, idsToMove, targetId, position) }))
  }

  // Active-product CRUD
  const updateProduct = (p: ProductMaster) => patchActive({ product: p })

  const addBOMItem = (item: Omit<BOMItem, 'id'>) => {
    const newItem: BOMItem = { ...item, id: `bom-${Date.now()}` }
    patchActive({ bom: [...bom, newItem] })
  }

  const updateBOMItem = (id: string, item: Partial<BOMItem>) => {
    patchActive({ bom: bom.map(b => b.id === id ? { ...b, ...item } : b) })
  }

  const deleteBOMItem = (id: string) => {
    patchActive({ bom: bom.filter(b => b.id !== id) })
  }

  const addRoutingStep = (step: Omit<RoutingStep, 'id'>) => {
    const newStep: RoutingStep = { ...step, id: `rt-${Date.now()}` }
    patchActive({ routing: [...routing, newStep] })
  }

  const updateRoutingStep = (id: string, step: Partial<RoutingStep>) => {
    patchActive({ routing: routing.map(s => s.id === id ? { ...s, ...step } : s) })
  }

  const deleteRoutingStep = (id: string) => {
    patchActive({ routing: routing.filter(s => s.id !== id) })
  }

  const addWorkCenterRate = (rate: Omit<WorkCenterRate, 'id'>) => {
    const newRate: WorkCenterRate = { ...rate, id: `rate-${Date.now()}` }
    patchActive({ rates: [...rates.filter(r => r.wc !== rate.wc), newRate] })
  }

  const updateWorkCenterRate = (wc: string, rate: Partial<WorkCenterRate>) => {
    patchActive({ rates: rates.map(r => r.wc === wc ? { ...r, ...rate } : r) })
  }

  const deleteWorkCenterRate = (wc: string) => {
    patchActive({ rates: rates.filter(r => r.wc !== wc) })
  }

  // Import creates a new DRAFT session per Section 7
  const importFromExcel = (result: ExcelImportResult) => {
    if (!result.success) return
    const id = `ps-draft-import-${Date.now()}`
    const now = new Date().toISOString()
    const importedDraft: ProductSession = withSnapshotPair({
      id,
      product: result.product ?? product,
      rates: result.rates ?? rates,
      bom: result.bom ?? bom,
      routing: result.routing ?? routing,
      savedDrivers: [],
      selectedDriverKeys: [],
      rcaRecords: {},
      preparedSnapshotRoles: { reference: false, current: true },
      status: 'draft',
      versionLabel: `Draft (Imported: ${result.product?.productCode || product.productCode || 'Excel'})`,
      createdAt: now,
      updatedAt: now
    })
    setProductSessions(prev => [...prev, importedDraft])
    setActiveProductId(id)
    setActiveTab('master')
  }

  // Snapshot import keeps Reference and Current as independent datasets.
  const importSnapshotFromExcel = (result: SnapshotImportResult) => {
    if (!result.success || !result.snapshot) return
    if (getMasterDataSnapshotValidationErrors(result.snapshot).length > 0) return

    const source = activeSession
    const existingPair = source.snapshotPair ?? sessionToSnapshotPair(source)
    const now = new Date().toISOString()
    if (result.role === 'custom') {
      const imported = importSnapshotForCustom(result.snapshot)
      const updated = setMasterDataInitialResetBaseline({
        ...source,
        customMasterData: normalizeMasterDataSnapshot(imported.snapshot),
        customDatasetSizing: imported.sizing,
        updatedAt: now
      }, result.role)
      setProductSessions(prev => prev.map(session => session.id === source.id ? updated : session))
      recordMasterDataWorkingEdit(source, updated, 'custom')
      updateMasterDataUiState({ type: 'set-role', role: 'custom' })
      setActiveTab('master')
      return
    }

    const imported = importSnapshotForRole(existingPair, source.datasetSizing, result.role, result.snapshot)
    const preparedSnapshotRoles = {
      ...getSnapshotRoleReadiness(source),
      [result.role]: true
    }

    const updated = setMasterDataInitialResetBaseline(applyMasterDataSnapshotPair(
      {
        ...source,
        datasetSizing: imported.datasetSizing,
        updatedAt: now,
        preparedSnapshotRoles
      },
      imported.snapshotPair
    ), result.role)
    setProductSessions(prev => prev.map(session => session.id === source.id ? updated : session))
    recordMasterDataWorkingEdit(source, updated, result.role)
    updateMasterDataUiState({ type: 'set-role', role: result.role })
    setActiveTab('master')
  }

  const loadDevelopmentMockData = (pair: SnapshotPair) => {
    if (!import.meta.env.DEV) return
    const source = activeSession
    const replaced = replaceDevelopmentMockWorkingState(source, pair)
    if (!replaced) return
    const updated = setAllMasterDataInitialResetBaselines(replaced)
    setSelectedComparisonScope(null)
    setProductSessions(previous => previous.map(session => session.id === source.id ? updated : session))
    recordMasterDataPairWorkingEdit(source, updated)
  }

  const resetToDefault = () => {
    patchActive({
      initialMasterDataBaseline: undefined,
      product: { ...emptyProductMaster },
      rates: [],
      bom: [],
      routing: [],
      savedDrivers: [],
      selectedDriverKeys: [],
      rcaRecords: {},
      candidateRcaRecords: {},
      preparedSnapshotRoles: { reference: false, current: false },
      status: 'draft',
      versionLabel: 'Draft',
      snapshotPair: createEmptySnapshotPair(activeSession.id),
      snapshotPairMode: 'independent'
    })
  }

  const clearAllData = () => {
    patchActive({
      initialMasterDataBaseline: undefined,
      product: { ...emptyProductMaster },
      rates: [],
      bom: [],
      routing: [],
      savedDrivers: [],
      selectedDriverKeys: [],
      rcaRecords: {},
      candidateRcaRecords: {},
      preparedSnapshotRoles: { reference: false, current: false },
      snapshotPair: createEmptySnapshotPair(activeSession.id),
      snapshotPairMode: 'independent'
    })
  }

  return (
    <AppContext.Provider value={{
      productSessions,
      activeProductId,
      activeSession,
      product,
      rates,
      bom,
      routing,
      snapshotPair,
      masterDataSnapshots,
      snapshotComparison,
      fullSnapshotComparison,
      analysisSnapshotPair,
      selectedComparisonSelection,
      isSelectedComparisonActive,
      masterDataHandoff,
      masterDataUiState,
      canUndoMasterDataEdit: masterDataHistoryRef.current.undo.length > 0,
      canRedoMasterDataEdit: masterDataHistoryRef.current.redo.length > 0,
      masterDataRole,
      masterDataSnapshot,
      masterDataLastSavedSnapshot,
      masterDataLastSavedSnapshots,
      masterDataSizing,
      masterDataPrepareDatasetOpen,
      masterDataPrepareDatasetPinned,
      setMasterDataPrepareDatasetOpen,
      masterDataPrepareDatasetRequested,
      masterDataPrepareDatasetRequestMode,
      activeTab,
      uomList,
      setActiveTab,
      toggleMasterDataPrepareDataset,
      previewMasterDataPrepareDataset,
      scheduleDismissMasterDataPrepareDatasetPreview,
      closeMasterDataPrepareDataset,
      requestMasterDataPrepareDataset,
      consumeMasterDataPrepareDatasetRequest,
      createProductWithSizing,
      updateProductSizing,
      switchProduct,
      duplicateProduct,
      deleteProduct,
      addUOM,
      cloneActiveToDraft,
      activateDraft,
      updateMasterDataUiState,
      setMasterDataRole,
      undoMasterDataEdit,
      redoMasterDataEdit,
      saveMasterDataWorkingDataset,
      saveAllMasterDataWorkingDatasets,
      resetMasterDataWorkingDataset,
      resetAllMasterDataWorkingDatasets,
      cloneMasterDataWorkspace,
      sendSimulationSnapshotToMasterData,
      sendSimulationSnapshotsToMasterData,
      clearMasterDataDataset,
      clearAllMasterDataWorkingDatasets,
      updateMasterDataDatasetSizing,
      updateMasterDataProduct,
      updateMasterDataRemark,
      updateMasterDataBOMItems,
      addMasterDataBOMItem,
      updateMasterDataBOMItem,
      deleteMasterDataBOMItem,
      deleteMasterDataBOMItems,
      reorderMasterDataBOMItems,
      addMasterDataRoutingStep,
      updateMasterDataRoutingSteps,
      updateMasterDataRoutingStep,
      deleteMasterDataRoutingStep,
      deleteMasterDataRoutingSteps,
      reorderMasterDataRoutingSteps,
      addMasterDataWorkCenterRate,
      updateMasterDataWorkCenterRates,
      updateMasterDataWorkCenterRate,
      deleteMasterDataWorkCenterRate,
      deleteMasterDataWorkCenterRates,
      reorderMasterDataWorkCenters,
      applySelectedComparison,
      clearSelectedComparison,
      updateProduct,
      addBOMItem,
      updateBOMItem,
      deleteBOMItem,
      addRoutingStep,
      updateRoutingStep,
      deleteRoutingStep,
      addWorkCenterRate,
      updateWorkCenterRate,
      deleteWorkCenterRate,
      importFromExcel,
      importSnapshotFromExcel,
      loadDevelopmentMockData,
      resetToDefault,
      clearAllData
    }}>

      {children}
    </AppContext.Provider>
  )
}

export const useAppStore = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
