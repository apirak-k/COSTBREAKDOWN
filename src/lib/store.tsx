import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, CostElementBreakdown, CostDriver, ExcelImportResult, ProductSession, ProductSizingConfig } from './types'
import { seedProductMaster, seedWorkCenterRates, seedBOM, seedRouting } from './seed-data'
import { calculateCostBreakdown, calculateTopDrivers } from './cost-engine'

// ── Storage Keys ────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  SESSIONS:    'costbreakdown_sessions',
  ACTIVE_ID:   'costbreakdown_active_id',
  ACTIVE_TAB:  'costbreakdown_active_tab',
  UOM_LIST:    'costbreakdown_uom_list'
}

export const DEFAULT_UOMS = ['PC', 'SET', 'PANEL', 'GM', 'KG', 'SM', 'M', 'RL', 'L', 'BOX', 'TRAY']

// ── Helper: create a brand-new session with sizing ─────────────────────────
function makeSizedSession(id: string, config: ProductSizingConfig, now: string): ProductSession {
  const defaultWcNames = ['Cutting', 'Printing-Digital RGOM', 'Assembly Digital RGOM', 'OQA-Digital']
  
  // Work Centers
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

  // BOM
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

  // Routing
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

  return {
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
    status: 'draft',
    versionLabel: 'Draft',
    createdAt: now,
    updatedAt: now
  }
}

// ── Helper: create default RGOM-024 seed session ────────────────────────────
function makeSeedSession(): ProductSession {
  const now = new Date().toISOString()
  return {
    id:        'ps-seed-rgom024',
    product:   seedProductMaster,
    rates:     seedWorkCenterRates,
    bom:       seedBOM,
    routing:   seedRouting,
    savedDrivers: [],
    status:    'active',
    versionLabel: 'Active Baseline (RGOM-024)',
    createdAt: now,
    updatedAt: now
  }
}

// ── Context Type ─────────────────────────────────────────────────────────────
interface AppContextType {
  // Multi-product session list
  productSessions:     ProductSession[]
  activeProductId:     string
  activeSession:       ProductSession

  // Derived (from active session)
  product:             ProductMaster
  rates:               WorkCenterRate[]
  bom:                 BOMItem[]
  routing:             RoutingStep[]
  costBreakdown:       CostElementBreakdown
  topDrivers:          CostDriver[]
  activeTab:           'master' | 'breakdown' | 'candidate' | 'rca'
  uomList:             string[]

  // Navigation
  setActiveTab:        (tab: 'master' | 'breakdown' | 'candidate' | 'rca') => void

  // Product session management
  createProductWithSizing: (config: ProductSizingConfig) => void
  updateProductSizing:     (config: ProductSizingConfig) => void
  switchProduct:           (id: string) => void
  duplicateProduct:        (id: string) => void
  deleteProduct:           (id: string) => void
  addUOM:                  (uom: string) => void

  // 3-State Versioning controls
  cloneActiveToDraft:      (sourceId?: string) => void
  activateDraft:           (draftId: string) => void

  // Active-product CRUD
  updateProduct:           (p: ProductMaster) => void
  addBOMItem:              (item: Omit<BOMItem, 'id'>) => void
  updateBOMItem:           (id: string, item: Partial<BOMItem>) => void
  deleteBOMItem:           (id: string) => void
  addRoutingStep:          (step: Omit<RoutingStep, 'id'>) => void
  updateRoutingStep:       (id: string, step: Partial<RoutingStep>) => void
  deleteRoutingStep:       (id: string) => void
  addWorkCenterRate:       (rate: Omit<WorkCenterRate, 'id'>) => void
  updateWorkCenterRate:    (wc: string, rate: Partial<WorkCenterRate>) => void
  deleteWorkCenterRate:    (wc: string) => void
  promoteActiveToBaseline: () => void
  updateDriverHumanInput:  (
    rank: number,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => void
  importFromExcel:         (result: ExcelImportResult) => void
  resetToDefault:          () => void
  clearAllData:            () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch (e) {
    console.warn(`[sessionStorage] Error reading ${key}`, e)
  }
  return fallback
}

function saveToSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch (_) {}
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productSessions, setProductSessions] = useState<ProductSession[]>(() =>
    loadFromSession(STORAGE_KEYS.SESSIONS, [makeSeedSession()])
  )

  const [activeProductId, setActiveProductId] = useState<string>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_ID, 'ps-seed-rgom024')
  )

  const [activeTab, setActiveTabState] = useState<'master' | 'breakdown' | 'candidate' | 'rca'>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_TAB, 'master')
  )

  const [uomList, setUomList] = useState<string[]>(() =>
    loadFromSession(STORAGE_KEYS.UOM_LIST, DEFAULT_UOMS)
  )

  // Sync to sessionStorage
  useEffect(() => saveToSession(STORAGE_KEYS.SESSIONS, productSessions),       [productSessions])
  useEffect(() => saveToSession(STORAGE_KEYS.ACTIVE_ID, activeProductId),      [activeProductId])
  useEffect(() => saveToSession(STORAGE_KEYS.UOM_LIST, uomList),               [uomList])

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
    setProductSessions(prev =>
      prev.map(s => s.id === activeSession.id ? { ...s, ...patch, updatedAt: now } : s)
    )
  }

  const costBreakdown = calculateCostBreakdown(bom, routing, rates)
  const topDrivers    = calculateTopDrivers(bom, routing, rates, savedDrivers)

  // ── Product Session Actions ────────────────────────────────────────────────
  const createProductWithSizing = (config: ProductSizingConfig) => {
    const id  = `ps-${Date.now()}`
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

  // 3-State Versioning actions
  const cloneActiveToDraft = (sourceId?: string) => {
    const source = productSessions.find(s => s.id === (sourceId || activeProductId)) || activeSession
    const newId = `ps-draft-${Date.now()}`
    const now = new Date().toISOString()
    const copy: ProductSession = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      status: 'draft',
      versionLabel: `Draft (${source.product.productCode || 'Working Copy'})`,
      createdAt: now,
      updatedAt: now
    }
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
          return {
            ...s,
            status: 'active',
            versionLabel: 'Active Version',
            updatedAt: now
          }
        }
        // Archive previous active dataset
        if (s.status === 'active' && (!targetCode || s.product.productCode === targetCode || s.id === activeProductId)) {
          return {
            ...s,
            status: 'archived',
            versionLabel: `Archived (${new Date(s.updatedAt || now).toLocaleDateString()})`,
            updatedAt: now
          }
        }
        return s
      })
    )
    setActiveProductId(draftId)
  }

  const duplicateProduct = (id: string) => {
    const source = productSessions.find(s => s.id === id)
    if (!source) return
    const newId  = `ps-${Date.now()}`
    const now    = new Date().toISOString()
    const copy: ProductSession = {
      ...source,
      id:      newId,
      product: { ...source.product, productCode: `${source.product.productCode}-COPY` },
      bom:     source.bom.map(b  => ({ ...b, id: `bom-${Date.now()}-${b.id}` })),
      routing: source.routing.map(r => ({ ...r, id: `rt-${Date.now()}-${r.id}` })),
      savedDrivers: [],
      status:  'draft',
      versionLabel: `Draft (${source.product.productCode || 'Copy'})`,
      createdAt: now,
      updatedAt: now
    }
    setProductSessions(prev => [...prev, copy])
    setActiveProductId(newId)
    setActiveTab('master')
  }

  const deleteProduct = (id: string) => {
    setProductSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        const seed = makeSeedSession()
        setActiveProductId(seed.id)
        return [seed]
      }
      if (activeProductId === id) {
        const nextActive = remaining.find(s => s.status === 'active') || remaining[0]
        setActiveProductId(nextActive.id)
      }
      return remaining
    })
  }

  // ── Active-product CRUD ────────────────────────────────────────────────────
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

  // Promote Active to Baseline — copies active parameters to base (closing the PDCA loop)
  const promoteActiveToBaseline = () => {
    patchActive({
      bom: bom.map(b => ({
        ...b,
        basePrice: b.activePrice,
        baseLoss: b.activeLoss
      })),
      routing: routing.map(r => ({
        ...r,
        baseCap: r.activeCap,
        baseYield: r.activeYield
      })),
      savedDrivers: []
    })
  }

  const updateDriverHumanInput = (
    rank: number,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => {
    const driver = topDrivers.find(d => d.rank === rank)
    if (!driver) return
    const updated = savedDrivers.filter(d => d.driverName !== driver.driverName)
    patchActive({
      savedDrivers: [
        ...updated,
        {
          ...driver,
          controllability,
          actionPlan,
          canInfluence: canInfluence !== undefined ? canInfluence : driver.canInfluence,
          requirementFit: requirementFit !== undefined ? requirementFit : driver.requirementFit
        }
      ]
    })
  }

  // Import creates a new DRAFT session per Section 7
  const importFromExcel = (result: ExcelImportResult) => {
    if (!result.success) return
    const id = `ps-draft-import-${Date.now()}`
    const now = new Date().toISOString()
    const importedDraft: ProductSession = {
      id,
      product:      result.product      ?? product,
      rates:        result.rates        ?? rates,
      bom:          result.bom          ?? bom,
      routing:      result.routing      ?? routing,
      savedDrivers: [],
      status:       'draft',
      versionLabel: `Draft (Imported: ${result.product?.productCode || product.productCode || 'Excel'})`,
      createdAt:    now,
      updatedAt:    now
    }
    setProductSessions(prev => [...prev, importedDraft])
    setActiveProductId(id)
    setActiveTab('master')
  }

  const resetToDefault = () => {
    patchActive({
      product:      seedProductMaster,
      rates:        seedWorkCenterRates,
      bom:          seedBOM,
      routing:      seedRouting,
      savedDrivers: [],
      status:       'active',
      versionLabel: 'Active Baseline'
    })
  }

  const clearAllData = () => {
    patchActive({
      product: {
        productCode: '', productDescription: '', uom: 'PC', customer: '',
        effectiveDate: new Date().toISOString().split('T')[0]
      },
      rates:        [],
      bom:          [],
      routing:      [],
      savedDrivers: []
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
      promoteActiveToBaseline,
      updateDriverHumanInput,
      importFromExcel,
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
