import React, { createContext, useContext, useState, useEffect, useMemo, useReducer, useRef, ReactNode } from 'react'
import {
  ProductMaster,
  WorkCenterRate,
  BOMItem,
  RoutingStep,
  CostElementBreakdown,
  CostDriver,
  ExcelImportResult,
  SnapshotImportResult,
  ProductSession,
  ProductSizingConfig,
  DatasetSizing,
  ComparisonRole,
  CostSnapshot,
  SnapshotPair,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  SelectedComparisonSelection,
  FieldEvidence,
  CostComparison,
  CandidateRcaDraft,
  CandidateRcaRecord,
  PrioritizationCandidate,
  buildPrioritizationCandidates,
  calculateCostBreakdown,
  calculateTopDrivers,
  compareSnapshots,
  sessionToSnapshotPair,
  applySnapshotPairToSession,
  getFieldConfidence,
  evaluateMasterDataHandoff,
  getSnapshotRoleReadiness
} from '../core'
import { createSelectedSnapshotPair, getCanonicalComparisonStatus, getComparisonFindingKey } from '../core'
import type { MasterDataHandoffStatus } from '../core'
import {
  loadWorkingDatasetsFromStorage,
  saveWorkingDatasetsToStorage,
  SingleSheetWorkingDatasets
} from './working-datasets'
import { WorkingDataset } from '../core/types/dataset-standard.types'
import { markSizingPlaceholderEdited, resizeMasterDataSnapshotForSizing } from './dataset-sizing'
import { clearMasterDataDatasetState } from './clear-master-data-dataset'
import { markMasterDataChanged, markMasterDataChangedForSnapshotPair } from './master-data-revision'
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

const DEVELOPMENT_REVIEW_FIXTURE_ID = 'ps-dev-review-fixture'
const DEVELOPMENT_REVIEW_RETURN_ID_KEY = 'cost_breakdown_dev_review_return_id'

interface StoredSelectedComparison extends SelectedComparisonSelection {
  sourceFingerprint: string
}

function moveSnapshotRows<T extends { id: string }>(
  rows: T[],
  movingIds: string[],
  targetId: string,
  position: 'before' | 'after'
): T[] {
  const requestedIds = new Set(movingIds)
  const movingRows = rows.filter(row => requestedIds.has(row.id))
  if (movingRows.length === 0 || requestedIds.has(targetId) || !rows.some(row => row.id === targetId)) return rows

  const movingRowIds = new Set(movingRows.map(row => row.id))
  const remainingRows = rows.filter(row => !movingRowIds.has(row.id))
  const targetIndex = remainingRows.findIndex(row => row.id === targetId)
  if (targetIndex < 0) return rows
  remainingRows.splice(targetIndex + (position === 'after' ? 1 : 0), 0, ...movingRows)
  return remainingRows
}

function withSnapshotPair(session: ProductSession, explicitPair?: SnapshotPair): ProductSession {
  if (explicitPair) {
    return {
      ...session,
      snapshotPair: explicitPair,
      snapshotPairMode: 'independent'
    }
  }

  if (session.snapshotPairMode === 'independent' && session.snapshotPair) {
    // Keep independent snapshots canonical; legacy fields are only a projection here.
    return applySnapshotPairToSession(session, session.snapshotPair)
  }

  return {
    ...session,
    snapshotPair: sessionToSnapshotPair(session),
    snapshotPairMode: 'derived'
  }
}

function applyMasterDataSnapshotPair(session: ProductSession, pair: SnapshotPair): ProductSession {
  const previousPair = session.snapshotPair ?? sessionToSnapshotPair(session)
  return markMasterDataChangedForSnapshotPair(applySnapshotPairToSession(session, pair), previousPair, pair)
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

function cloneMasterDataSnapshot(snapshot: CostSnapshot): CostSnapshot {
  return {
    ...snapshot,
    product: {
      ...snapshot.product,
      additionalFields: snapshot.product.additionalFields ? { ...snapshot.product.additionalFields } : undefined
    },
    sizing: snapshot.sizing ? { ...snapshot.sizing } : undefined,
    warnings: snapshot.warnings ? [...snapshot.warnings] : undefined,
    rates: snapshot.rates.map(rate => ({
      ...rate,
      confidence: { ...rate.confidence },
      additionalFields: rate.additionalFields ? { ...rate.additionalFields } : undefined
    })),
    bom: snapshot.bom.map(item => ({
      ...item,
      confidence: { ...item.confidence },
      additionalFields: item.additionalFields ? { ...item.additionalFields } : undefined
    })),
    routing: snapshot.routing.map(step => ({
      ...step,
      confidence: { ...step.confidence },
      additionalFields: step.additionalFields ? { ...step.additionalFields } : undefined
    }))
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
    candidateRcaRecords: {},
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
    candidateRcaRecords: {},
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
    candidateRcaRecords: {},
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
  costBreakdown: CostElementBreakdown
  topDrivers: CostDriver[]
  candidates: PrioritizationCandidate[]
  candidateRcaRecords: Record<string, CandidateRcaRecord>
  snapshotPair: SnapshotPair
  snapshotComparison: CostComparison
  fullSnapshotComparison: CostComparison
  analysisSnapshotPair: SnapshotPair
  selectedComparisonSelection: SelectedComparisonSelection | null
  isSelectedComparisonActive: boolean
  masterDataHandoff: MasterDataHandoffStatus
  masterDataUiState: MasterDataUiState
  canUndoMasterDataEdit: boolean
  canRedoMasterDataEdit: boolean
  masterDataRole: ComparisonRole
  masterDataSnapshot: CostSnapshot
  masterDataLastSavedSnapshot?: CostSnapshot
  masterDataSizing: import('../core/types').DatasetSizing
  isDevelopmentReviewFixture: boolean
  activeTab: 'master' | 'breakdown' | 'dashboard' | 'candidate' | 'rca'
  uomList: string[]

  // Navigation
  setActiveTab: (tab: 'master' | 'breakdown' | 'dashboard' | 'candidate' | 'rca') => void

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
  setMasterDataRole: (role: ComparisonRole) => void
  undoMasterDataEdit: () => void
  redoMasterDataEdit: () => void
  saveMasterDataWorkingDataset: (role: ComparisonRole) => void
  resetMasterDataWorkingDataset: (role: ComparisonRole) => void
  cloneReferenceToCurrent: () => void
  cloneCurrentToReference: () => void
  clearMasterDataDataset: (role: ComparisonRole) => void
  updateMasterDataDatasetSizing: (role: ComparisonRole, sizing: Partial<import('../core/types').DatasetSizing>) => void
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
  updateMasterDataWorkCenterRates: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>) => void
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
  toggleCandidateControllable: (candidateKey: string, nextValue: boolean) => void
  saveCandidateRca: (candidateKey: string, draft: CandidateRcaDraft) => void
  importFromExcel: (result: ExcelImportResult) => void
  importSnapshotFromExcel: (result: SnapshotImportResult) => void
  loadDevelopmentReviewFixture: (pair: SnapshotPair) => void
  returnFromDevelopmentReviewFixture: () => void
  resetToDefault: () => void

  clearAllData: () => void
  // Single Sheet Working Datasets
  workingDatasets: import('./working-datasets').SingleSheetWorkingDatasets
  updateWorkingDataset: (role: ComparisonRole, dataset: import('../core/types/dataset-standard.types').WorkingDataset) => void
}



const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productSessions, setProductSessions] = useState<ProductSession[]>(() => {
    const loaded = loadFromSession<ProductSession[]>(STORAGE_KEYS.SESSIONS, [makeEmptySession()])
    return loaded.map((s, idx) => {
      const sessionWithoutLegacyUiState = { ...s } as ProductSession & { masterDataRole?: ComparisonRole }
      delete sessionWithoutLegacyUiState.masterDataRole
      const normalized = withSnapshotPair({
        ...sessionWithoutLegacyUiState,
        candidateRcaRecords: sessionWithoutLegacyUiState.candidateRcaRecords ?? {},
        status: sessionWithoutLegacyUiState.status || (idx === 0 ? 'draft' : 'draft'),
        versionLabel: sessionWithoutLegacyUiState.versionLabel || (sessionWithoutLegacyUiState.status === 'archived' ? 'Archived' : 'Draft')
      })
      return {
        ...normalized,
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
  const recordMasterDataWorkingEdit = (before: ProductSession, after: ProductSession, role: ComparisonRole) => {
    const beforePair = before.snapshotPair ?? sessionToSnapshotPair(before)
    const afterPair = after.snapshotPair ?? sessionToSnapshotPair(after)
    const entry: MasterDataEditHistoryEntry = {
      sessionId: before.id,
      role,
      before: cloneMasterDataSnapshot(beforePair[role]),
      after: cloneMasterDataSnapshot(afterPair[role]),
      beforePrepared: { ...getSnapshotRoleReadiness(before) },
      afterPrepared: { ...getSnapshotRoleReadiness(after) },
      beforeSizing: copyDatasetSizing(before.datasetSizing),
      afterSizing: copyDatasetSizing(after.datasetSizing)
    }
    masterDataHistoryRef.current = recordMasterDataEdit(masterDataHistoryRef.current, entry)
    setMasterDataHistoryRevision(revision => revision + 1)
  }

  const [activeProductId, setActiveProductId] = useState<string>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_ID, 'ps-empty-default')
  )

  useEffect(() => {
    masterDataHistoryRef.current = createMasterDataEditHistory()
    setMasterDataHistoryRevision(revision => revision + 1)
  }, [activeProductId])

  const [activeTab, setActiveTabState] = useState<'master' | 'breakdown' | 'dashboard' | 'candidate' | 'rca'>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_TAB, 'master')
  )

  const [uomList, setUomList] = useState<string[]>(() =>
    loadFromSession(STORAGE_KEYS.UOM_LIST, DEFAULT_UOMS)
  )

  const [workingDatasets, setWorkingDatasets] = useState<SingleSheetWorkingDatasets>(() =>
    loadWorkingDatasetsFromStorage()
  )
  const [selectedComparisonScope, setSelectedComparisonScope] = useState<StoredSelectedComparison | null>(null)

  useEffect(() => {
    saveWorkingDatasetsToStorage(workingDatasets)
  }, [workingDatasets])

  const updateWorkingDataset = (
    role: ComparisonRole,
    dataset: WorkingDataset
  ) => {
    setWorkingDatasets(prev => ({
      ...prev,
      [role]: dataset
    }))
  }


  // Sync to sessionStorage
  useEffect(() => saveToSession(STORAGE_KEYS.SESSIONS, productSessions), [productSessions])
  useEffect(() => saveToSession(STORAGE_KEYS.ACTIVE_ID, activeProductId), [activeProductId])
  useEffect(() => saveToSession(STORAGE_KEYS.UOM_LIST, uomList), [uomList])

  const setActiveTab = (tab: 'master' | 'breakdown' | 'dashboard' | 'candidate' | 'rca') => {
    setActiveTabState(tab)
    saveToSession(STORAGE_KEYS.ACTIVE_TAB, tab)
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

  const { product, rates, bom, routing, savedDrivers } = activeSession

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

  const costBreakdown = calculateCostBreakdown(bom, routing, rates)
  const topDrivers = calculateTopDrivers(bom, routing, rates, savedDrivers)
  const candidateRcaRecords = activeSession.candidateRcaRecords ?? {}
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
  const candidateControllability = activeSession.candidateControllability ?? {}
  const candidates = buildPrioritizationCandidates(
    snapshotComparison,
    analysisSnapshotPair.reference,
    analysisSnapshotPair.current,
    candidateControllability
  )
  const masterDataHandoff = evaluateMasterDataHandoff(activeSession, snapshotPair)
  const masterDataRole = masterDataUiState.role
  const masterDataSnapshot = masterDataRole === 'reference' ? snapshotPair.reference : snapshotPair.current
  const masterDataLastSavedSnapshot = activeSession.lastSavedMasterData?.[masterDataRole]?.snapshot
  const masterDataSizing = activeSession.datasetSizing?.[masterDataRole] ?? masterDataSnapshot.sizing ?? {}
  const isDevelopmentReviewFixture = activeProductId === DEVELOPMENT_REVIEW_FIXTURE_ID

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

  const setMasterDataRole = (role: ComparisonRole) => {
    updateMasterDataUiState({ type: 'set-role', role })
  }

  const saveMasterDataWorkingDataset = (role: ComparisonRole) => {
    const now = new Date().toISOString()
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
      const snapshot = pair[role]
      return {
        ...session,
        updatedAt: now,
        lastSavedMasterData: {
          ...session.lastSavedMasterData,
          [role]: {
            snapshot: cloneMasterDataSnapshot(snapshot),
            prepared: getSnapshotRoleReadiness(session)[role],
            sizing: { ...(session.datasetSizing?.[role] ?? snapshot.sizing ?? {}) }
          }
        }
      }
    }))
  }

  const commitMasterDataWorkingSession = (before: ProductSession, after: ProductSession, role: ComparisonRole) => {
    const beforePair = before.snapshotPair ?? sessionToSnapshotPair(before)
    const afterPair = after.snapshotPair ?? sessionToSnapshotPair(after)
    const beforeState = {
      snapshot: beforePair[role],
      prepared: getSnapshotRoleReadiness(before),
      sizing: before.datasetSizing
    }
    const afterState = {
      snapshot: afterPair[role],
      prepared: getSnapshotRoleReadiness(after),
      sizing: after.datasetSizing
    }
    if (JSON.stringify(beforeState) === JSON.stringify(afterState)) return

    setProductSessions(previous => previous.map(session => session.id === before.id ? after : session))
    recordMasterDataWorkingEdit(before, after, role)
  }

  const resetMasterDataWorkingDataset = (role: ComparisonRole) => {
    const session = activeSession
    const now = new Date().toISOString()
    const saved = session.lastSavedMasterData?.[role]
    if (!saved) return

    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const nextPair: SnapshotPair = {
      ...pair,
      [role]: cloneMasterDataSnapshot(saved.snapshot)
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

  const updateMasterDataDataset = (mutate: (snapshot: CostSnapshot) => CostSnapshot) => {
    const session = activeSession
    const role = masterDataUiState.role
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const readiness = getSnapshotRoleReadiness(session)
    const currentDataset = pair[role]
    const nextDataset = mutate(currentDataset)
    const nextPair: SnapshotPair = {
      ...pair,
      [role]: { ...nextDataset, comparisonRole: role }
    }
    const updated = applyMasterDataSnapshotPair({
      ...session,
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

  const cloneReferenceToCurrent = () => {
    const session = activeSession
    const readiness = getSnapshotRoleReadiness(session)
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const reference = pair.reference
    const refSizing = session.datasetSizing?.reference ?? reference.sizing
    const current: CostSnapshot = {
      ...reference,
      id: `${reference.id}:current`,
      comparisonRole: 'current',
      status: 'draft',
      sourceRef: `Cloned from Reference: ${reference.sourceRef}`,
      product: { ...reference.product },
      rates: reference.rates.map(rate => ({ ...rate, confidence: { ...rate.confidence } })),
      bom: reference.bom.map(item => ({ ...item, confidence: { ...item.confidence } })),
      routing: reference.routing.map(step => ({ ...step, confidence: { ...step.confidence } })),
      sizing: refSizing ? { ...refSizing } : undefined,
      warnings: [...(reference.warnings ?? [])]
    }
    const updatedSizing: Record<ComparisonRole, DatasetSizing> = {
      reference: session.datasetSizing?.reference ?? {},
      current: refSizing ? { ...refSizing } : (session.datasetSizing?.current ?? {})
    }

    const updated = applyMasterDataSnapshotPair({
      ...session,
      datasetSizing: updatedSizing,
      updatedAt: new Date().toISOString()
    }, { reference, current })
    const next = {
      ...updated,
      preparedSnapshotRoles: { ...readiness, current: readiness.reference }
    }
    commitMasterDataWorkingSession(session, next, 'current')
  }

  const cloneCurrentToReference = () => {
    const session = activeSession
    const readiness = getSnapshotRoleReadiness(session)
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const current = pair.current
    const currentSizing = session.datasetSizing?.current ?? current.sizing
    const reference: CostSnapshot = {
      ...current,
      id: `${current.id}:reference`,
      comparisonRole: 'reference',
      status: 'draft',
      sourceRef: `Cloned from Current: ${current.sourceRef}`,
      product: { ...current.product },
      rates: current.rates.map(rate => ({ ...rate, confidence: { ...rate.confidence } })),
      bom: current.bom.map(item => ({ ...item, confidence: { ...item.confidence } })),
      routing: current.routing.map(step => ({ ...step, confidence: { ...step.confidence } })),
      sizing: currentSizing ? { ...currentSizing } : undefined,
      warnings: [...(current.warnings ?? [])]
    }
    const updatedSizing: Record<ComparisonRole, DatasetSizing> = {
      reference: currentSizing ? { ...currentSizing } : (session.datasetSizing?.reference ?? {}),
      current: session.datasetSizing?.current ?? {}
    }

    const updated = applyMasterDataSnapshotPair({
      ...session,
      datasetSizing: updatedSizing,
      updatedAt: new Date().toISOString()
    }, { reference, current })
    const next = {
      ...updated,
      preparedSnapshotRoles: { ...readiness, reference: readiness.current }
    }
    commitMasterDataWorkingSession(session, next, 'reference')
  }

  const updateMasterDataDatasetSizing = (role: ComparisonRole, sizing: Partial<DatasetSizing>) => {
    const session = activeSession
    const existingRoleSizing = session.datasetSizing?.[role] ?? {}
    const nextRoleSizing: DatasetSizing = {
      ...existingRoleSizing,
      ...sizing
    }
    const nextDatasetSizing: Record<ComparisonRole, DatasetSizing> = {
      reference: session.datasetSizing?.reference ?? {},
      current: session.datasetSizing?.current ?? {},
      [role]: nextRoleSizing
    }
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    const currentDataset = pair[role]

    const updatedSnapshot = resizeMasterDataSnapshotForSizing(currentDataset, nextRoleSizing, {
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
          loss: 0,
          sourceRef: 'Direct Input',
          confidence: {
            consumption: workingEvidence(null, 'Direct Input'),
            price: workingEvidence(null, 'Direct Input'),
            loss: workingEvidence(0, 'Direct Input')
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

  const clearMasterDataDataset = (role: ComparisonRole) => {
    const session = activeSession
    const updated = clearMasterDataDatasetState(session, role)
    commitMasterDataWorkingSession(session, updated, role)
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
    })
  }

  const updateMasterDataBOMItems = (updates: Array<{ id: string; changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>> }>) => {
    const changesById = new Map<string, Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => changesById.set(id, { ...changesById.get(id), ...changes }))
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
    updateMasterDataDataset(dataset => ({ ...dataset, bom: dataset.bom.filter(item => !deletedIds.has(item.id)) }))
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
    })
  }

  const updateMasterDataRoutingSteps = (updates: Array<{ id: string; changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>> }>) => {
    const changesById = new Map<string, Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => changesById.set(id, { ...changesById.get(id), ...changes }))
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
    updateMasterDataDataset(dataset => ({ ...dataset, routing: dataset.routing.filter(step => !deletedIds.has(step.id)) }))
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
    })
  }

  const updateMasterDataWorkCenterRates = (updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>) => {
    const changesById = new Map<string, Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>>()
    updates.forEach(({ id, changes }) => changesById.set(id, { ...changesById.get(id), ...changes }))
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
    }))
  }

  const updateMasterDataWorkCenterRate = (id: string, changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => {
    updateMasterDataWorkCenterRates([{ id, changes }])
  }

  const deleteMasterDataWorkCenterRates = (ids: string[]) => {
    const deletedIds = new Set(ids)
    if (deletedIds.size === 0) return
    updateMasterDataDataset(dataset => ({ ...dataset, rates: dataset.rates.filter(rate => !deletedIds.has(rate.id)) }))
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

  const toggleCandidateControllable = (candidateKey: string, nextValue: boolean) => {
    const existing = activeSession.candidateControllability ?? {}
    patchActive({
      candidateControllability: {
        ...existing,
        [candidateKey]: nextValue
      }
    })
  }

  const saveCandidateRca = (candidateKey: string, draft: CandidateRcaDraft) => {
    if (!candidates.some(candidate => candidate.candidateKey === candidateKey)) return

    patchActive({
      candidateRcaRecords: {
        ...candidateRcaRecords,
        [candidateKey]: {
          candidateKey,
          rootCause: draft.rootCause,
          action: draft.action,
          updatedAt: new Date().toISOString()
        }
      }
    })
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
      candidateRcaRecords: {},
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

    const source = activeSession
    const existingPair = source.snapshotPair ?? sessionToSnapshotPair(source)
    const nextPair: SnapshotPair = result.role === 'reference'
      ? { reference: result.snapshot, current: existingPair.current }
      : { reference: existingPair.reference, current: result.snapshot }
    const now = new Date().toISOString()
    const preparedSnapshotRoles = {
      ...getSnapshotRoleReadiness(source),
      [result.role]: true
    }

    const updated = applyMasterDataSnapshotPair(
      {
        ...source,
        updatedAt: now,
        preparedSnapshotRoles
      },
      nextPair
    )
    setProductSessions(prev => prev.map(session => session.id === source.id ? updated : session))
    recordMasterDataWorkingEdit(source, updated, result.role)
    updateMasterDataUiState({ type: 'set-role', role: result.role })
    setActiveTab('master')
  }

  const loadDevelopmentReviewFixture = (pair: SnapshotPair) => {
    if (!import.meta.env.DEV) return

    if (!isDevelopmentReviewFixture && !sessionStorage.getItem(DEVELOPMENT_REVIEW_RETURN_ID_KEY)) {
      sessionStorage.setItem(DEVELOPMENT_REVIEW_RETURN_ID_KEY, activeProductId)
    }

    const referenceSizing: DatasetSizing = {
      wcCount: pair.reference.sizing?.wcCount ?? pair.reference.rates.length,
      bomCount: pair.reference.sizing?.bomCount ?? pair.reference.bom.length,
      routingCount: pair.reference.sizing?.routingCount ?? pair.reference.routing.length
    }
    const currentSizing: DatasetSizing = {
      wcCount: pair.current.sizing?.wcCount ?? pair.current.rates.length,
      bomCount: pair.current.sizing?.bomCount ?? pair.current.bom.length,
      routingCount: pair.current.sizing?.routingCount ?? pair.current.routing.length
    }
    const nextPair: SnapshotPair = {
      reference: { ...pair.reference, comparisonRole: 'reference', sizing: referenceSizing },
      current: { ...pair.current, comparisonRole: 'current', sizing: currentSizing }
    }
    const source = productSessions.find(session => session.id === DEVELOPMENT_REVIEW_FIXTURE_ID) ??
      makeEmptySession(DEVELOPMENT_REVIEW_FIXTURE_ID)
    const now = new Date().toISOString()
    const updated = applyMasterDataSnapshotPair({
      ...source,
      updatedAt: now,
      savedDrivers: [],
      selectedDriverKeys: [],
      rcaRecords: {},
      candidateRcaRecords: {},
      candidateControllability: {},
      preparedSnapshotRoles: { reference: true, current: true },
      datasetSizing: { reference: referenceSizing, current: currentSizing },
      status: 'draft',
      versionLabel: 'Synthetic Review Fixture'
    }, nextPair)

    setProductSessions(prev => prev.some(session => session.id === source.id)
      ? prev.map(session => session.id === source.id ? updated : session)
      : [...prev, updated])
    setActiveProductId(DEVELOPMENT_REVIEW_FIXTURE_ID)
    setActiveTab('master')
  }

  const returnFromDevelopmentReviewFixture = () => {
    if (!import.meta.env.DEV) return

    const previousId = sessionStorage.getItem(DEVELOPMENT_REVIEW_RETURN_ID_KEY)
    sessionStorage.removeItem(DEVELOPMENT_REVIEW_RETURN_ID_KEY)
    if (previousId && productSessions.some(session => session.id === previousId)) {
      setActiveProductId(previousId)
      setActiveTab('master')
    }
  }

  const resetToDefault = () => {
    patchActive({
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
      costBreakdown,
      topDrivers,
      candidates,
      candidateRcaRecords,
      snapshotPair,
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
      masterDataSizing,
      isDevelopmentReviewFixture,
      activeTab,
      uomList,
      setActiveTab,
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
      resetMasterDataWorkingDataset,
      cloneReferenceToCurrent,
      cloneCurrentToReference,
      clearMasterDataDataset,
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
      toggleCandidateControllable,
      saveCandidateRca,
      importFromExcel,
      importSnapshotFromExcel,
      loadDevelopmentReviewFixture,
      returnFromDevelopmentReviewFixture,
      resetToDefault,
      clearAllData,
      workingDatasets,
      updateWorkingDataset
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
