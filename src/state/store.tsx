import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

function moveSnapshotRow<T extends { id: string }>(
  rows: T[],
  movingId: string,
  targetId: string,
  position: 'before' | 'after'
): T[] {
  if (movingId === targetId) return rows
  const sourceIndex = rows.findIndex(row => row.id === movingId)
  if (sourceIndex < 0 || !rows.some(row => row.id === targetId)) return rows
  const next = [...rows]
  const [moving] = next.splice(sourceIndex, 1)
  const targetIndex = next.findIndex(row => row.id === targetId)
  next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, moving)
  return next
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
  masterDataHandoff: MasterDataHandoffStatus
  masterDataRole: ComparisonRole
  masterDataSnapshot: CostSnapshot
  masterDataLastSavedSnapshot?: CostSnapshot
  masterDataSizing: import('../core/types').DatasetSizing
  isDevelopmentReviewFixture: boolean
  activeTab: 'master' | 'breakdown' | 'candidate' | 'rca'
  uomList: string[]

  // Navigation
  setActiveTab: (tab: 'master' | 'breakdown' | 'candidate' | 'rca') => void

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
  setMasterDataRole: (role: ComparisonRole) => void
  saveMasterDataWorkingDataset: (role: ComparisonRole) => void
  resetMasterDataWorkingDataset: (role: ComparisonRole) => void
  cloneReferenceToCurrent: () => void
  cloneCurrentToReference: () => void
  clearMasterDataDataset: (role: ComparisonRole) => void
  updateMasterDataDatasetSizing: (role: ComparisonRole, sizing: Partial<import('../core/types').DatasetSizing>) => void
  updateMasterDataProduct: (product: ProductMaster) => void
  updateMasterDataRemark: (remark: string) => void
  addMasterDataBOMItem: (item: Omit<SnapshotBOMItem, 'id' | 'confidence'>) => void
  updateMasterDataBOMItem: (id: string, item: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => void
  deleteMasterDataBOMItem: (id: string) => void
  reorderMasterDataBOMItems: (movingId: string, targetId: string, position: 'before' | 'after') => void
  addMasterDataRoutingStep: (step: Omit<SnapshotRoutingStep, 'id' | 'confidence'>) => void
  updateMasterDataRoutingStep: (id: string, step: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => void
  deleteMasterDataRoutingStep: (id: string) => void
  reorderMasterDataRoutingSteps: (movingId: string, targetId: string, position: 'before' | 'after') => void
  addMasterDataWorkCenterRate: (rate: Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>) => void
  updateMasterDataWorkCenterRate: (id: string, rate: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => void
  deleteMasterDataWorkCenterRate: (id: string) => void
  reorderMasterDataWorkCenters: (movingId: string, targetId: string, position: 'before' | 'after') => void

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
      const normalized = withSnapshotPair({
        ...s,
        candidateRcaRecords: s.candidateRcaRecords ?? {},
        masterDataRole: s.masterDataRole ?? 'current',
        status: s.status || (idx === 0 ? 'draft' : 'draft'),
        versionLabel: s.versionLabel || (s.status === 'archived' ? 'Archived' : 'Draft')
      })
      return {
        ...normalized,
        preparedSnapshotRoles: getSnapshotRoleReadiness(normalized)
      }
    })
  })

  const [activeProductId, setActiveProductId] = useState<string>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_ID, 'ps-empty-default')
  )

  const [activeTab, setActiveTabState] = useState<'master' | 'breakdown' | 'candidate' | 'rca'>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_TAB, 'master')
  )

  const [uomList, setUomList] = useState<string[]>(() =>
    loadFromSession(STORAGE_KEYS.UOM_LIST, DEFAULT_UOMS)
  )

  const [workingDatasets, setWorkingDatasets] = useState<SingleSheetWorkingDatasets>(() =>
    loadWorkingDatasetsFromStorage()
  )

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

  const setActiveTab = (tab: 'master' | 'breakdown' | 'candidate' | 'rca') => {
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
  const snapshotComparison = compareSnapshots(snapshotPair.reference, snapshotPair.current)
  const candidateControllability = activeSession.candidateControllability ?? {}
  const candidates = buildPrioritizationCandidates(
    snapshotComparison,
    snapshotPair.reference,
    snapshotPair.current,
    candidateControllability
  )
  const masterDataHandoff = evaluateMasterDataHandoff(activeSession, snapshotPair)
  const masterDataRole = activeSession.masterDataRole ?? 'current'
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
    setProductSessions(prev => prev.map(session => session.id === activeSession.id
      ? { ...session, masterDataRole: role }
      : session))
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

  const resetMasterDataWorkingDataset = (role: ComparisonRole) => {
    const now = new Date().toISOString()
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const saved = session.lastSavedMasterData?.[role]
      if (!saved) return session

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
      return applyMasterDataSnapshotPair({
        ...session,
        datasetSizing: nextSizing,
        preparedSnapshotRoles: nextPrepared,
        updatedAt: now
      }, nextPair)
    }))
  }

  const updateMasterDataDataset = (mutate: (snapshot: CostSnapshot) => CostSnapshot) => {
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const role = session.masterDataRole ?? 'current'
      const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
      const readiness = getSnapshotRoleReadiness(session)
      const dataset = role === 'reference' ? pair.reference : pair.current
      const nextDataset = mutate(dataset)
      const nextPair = role === 'reference'
        ? { reference: { ...nextDataset, comparisonRole: 'reference' as const }, current: pair.current }
        : { reference: pair.reference, current: { ...nextDataset, comparisonRole: 'current' as const } }
      const updated = applyMasterDataSnapshotPair({
        ...session,
        masterDataRole: role,
        updatedAt: new Date().toISOString()
      }, nextPair)
      return {
        ...updated,
        preparedSnapshotRoles: { ...readiness, [role]: true }
      }
    }))
  }

  const setMasterDataProduct = (session: ProductSession, pair: SnapshotPair, nextProduct: ProductMaster): ProductSession => {
    const role = session.masterDataRole ?? 'current'
    const nextPair: SnapshotPair = role === 'reference'
      ? { reference: { ...pair.reference, product: { ...nextProduct } }, current: pair.current }
      : { reference: pair.reference, current: { ...pair.current, product: { ...nextProduct } } }
    return applyMasterDataSnapshotPair({
      ...session,
      masterDataRole: role,
      updatedAt: new Date().toISOString()
    }, nextPair)
  }

  const updateMasterDataProduct = (nextProduct: ProductMaster) => {
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const role = session.masterDataRole ?? 'current'
      const updated = setMasterDataProduct(session, session.snapshotPair ?? sessionToSnapshotPair(session), nextProduct)
      return {
        ...updated,
        preparedSnapshotRoles: { ...getSnapshotRoleReadiness(session), [role]: true }
      }
    }))
  }

  const updateMasterDataRemark = (remark: string) => {
    updateMasterDataDataset(dataset => ({ ...dataset, remark }))
  }

  const cloneReferenceToCurrent = () => {
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const readiness = getSnapshotRoleReadiness(session)
      if (!readiness.reference) return session
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
        masterDataRole: 'current',
        updatedAt: new Date().toISOString()
      }, { reference, current })
      return {
        ...updated,
        preparedSnapshotRoles: { ...readiness, current: true }
      }
    }))
  }

  const cloneCurrentToReference = () => {
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
      const readiness = getSnapshotRoleReadiness(session)
      if (!readiness.current) return session
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
        masterDataRole: 'reference',
        updatedAt: new Date().toISOString()
      }, { reference, current })
      return {
        ...updated,
        preparedSnapshotRoles: { ...readiness, reference: true }
      }
    }))
  }

  const updateMasterDataDatasetSizing = (role: ComparisonRole, sizing: Partial<DatasetSizing>) => {
    setProductSessions(prev => prev.map(session => {
      if (session.id !== activeSession.id) return session
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
      const nextPair = {
        ...pair,
        [role]: updatedSnapshot
      }
      return applyMasterDataSnapshotPair({
        ...session,
        datasetSizing: nextDatasetSizing,
        updatedAt: new Date().toISOString()
      }, nextPair)
    }))
  }

  const clearMasterDataDataset = (role: ComparisonRole) => {
    setProductSessions(prev => prev.map(session => session.id === activeSession.id
      ? clearMasterDataDatasetState(session, role)
      : session))
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

  const updateMasterDataBOMItem = (id: string, changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => {
    updateMasterDataDataset(dataset => ({
      ...dataset,
      bom: dataset.bom.map(item => {
        if (item.id !== id) return item
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

  const deleteMasterDataBOMItem = (id: string) => {
    updateMasterDataDataset(dataset => ({ ...dataset, bom: dataset.bom.filter(item => item.id !== id) }))
  }

  const reorderMasterDataBOMItems = (movingId: string, targetId: string, position: 'before' | 'after') => {
    updateMasterDataDataset(dataset => ({ ...dataset, bom: moveSnapshotRow(dataset.bom, movingId, targetId, position) }))
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

  const updateMasterDataRoutingStep = (id: string, changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => {
    updateMasterDataDataset(dataset => ({
      ...dataset,
      routing: dataset.routing.map(step => {
        if (step.id !== id) return step
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

  const deleteMasterDataRoutingStep = (id: string) => {
    updateMasterDataDataset(dataset => ({ ...dataset, routing: dataset.routing.filter(step => step.id !== id) }))
  }

  const reorderMasterDataRoutingSteps = (movingId: string, targetId: string, position: 'before' | 'after') => {
    updateMasterDataDataset(dataset => ({ ...dataset, routing: moveSnapshotRow(dataset.routing, movingId, targetId, position) }))
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

  const updateMasterDataWorkCenterRate = (id: string, changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => {
    updateMasterDataDataset(dataset => ({
      ...dataset,
      rates: dataset.rates.map(rate => {
        if (rate.id !== id) return rate
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

  const deleteMasterDataWorkCenterRate = (id: string) => {
    updateMasterDataDataset(dataset => ({ ...dataset, rates: dataset.rates.filter(rate => rate.id !== id) }))
  }

  const reorderMasterDataWorkCenters = (movingId: string, targetId: string, position: 'before' | 'after') => {
    updateMasterDataDataset(dataset => ({ ...dataset, rates: moveSnapshotRow(dataset.rates, movingId, targetId, position) }))
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
        masterDataRole: result.role,
        updatedAt: now,
        preparedSnapshotRoles
      },
      nextPair
    )
    setProductSessions(prev => prev.map(session => session.id === source.id ? updated : session))
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
      masterDataRole: 'current',
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
      masterDataHandoff,
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
      setMasterDataRole,
      saveMasterDataWorkingDataset,
      resetMasterDataWorkingDataset,
      cloneReferenceToCurrent,
      cloneCurrentToReference,
      clearMasterDataDataset,
      updateMasterDataDatasetSizing,
      updateMasterDataProduct,
      updateMasterDataRemark,
      addMasterDataBOMItem,
      updateMasterDataBOMItem,
      deleteMasterDataBOMItem,
      reorderMasterDataBOMItems,
      addMasterDataRoutingStep,
      updateMasterDataRoutingStep,
      deleteMasterDataRoutingStep,
      reorderMasterDataRoutingSteps,
      addMasterDataWorkCenterRate,
      updateMasterDataWorkCenterRate,
      deleteMasterDataWorkCenterRate,
      reorderMasterDataWorkCenters,
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
