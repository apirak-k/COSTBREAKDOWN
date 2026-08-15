import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, KaizenOption, CostElementBreakdown, ExcelImportResult } from './types'
import { seedProductMaster, seedWorkCenterRates, seedBOM, seedRouting, seedKaizenOptions } from './seed-data'
import { calculateCostBreakdown } from './cost-engine'

const STORAGE_KEYS = {
  PRODUCT: 'costbreakdown_product',
  RATES: 'costbreakdown_rates',
  BOM: 'costbreakdown_bom',
  ROUTING: 'costbreakdown_routing',
  KAIZEN: 'costbreakdown_kaizen',
  ACTIVE_TAB: 'costbreakdown_active_tab'
}

interface AppContextType {
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  kaizenOptions: KaizenOption[]
  costBreakdown: CostElementBreakdown
  activeTab: 'master' | 'breakdown' | 'candidate' | 'rca'
  setActiveTab: (tab: 'master' | 'breakdown' | 'candidate' | 'rca') => void
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
  addKaizenOption: (opt: Omit<KaizenOption, 'id'>) => void
  promoteOptionToActive: (optionId: string) => void
  importFromExcel: (result: ExcelImportResult) => void
  resetToDefault: () => void
  clearAllData: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      return JSON.parse(raw) as T
    }
  } catch (e) {
    console.warn(`[sessionStorage] Error reading ${key}`, e)
  }
  return fallback
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [product, setProduct] = useState<ProductMaster>(() => loadFromSession(STORAGE_KEYS.PRODUCT, seedProductMaster))
  const [rates, setRates] = useState<WorkCenterRate[]>(() => loadFromSession(STORAGE_KEYS.RATES, seedWorkCenterRates))
  const [bom, setBOM] = useState<BOMItem[]>(() => loadFromSession(STORAGE_KEYS.BOM, seedBOM))
  const [routing, setRouting] = useState<RoutingStep[]>(() => loadFromSession(STORAGE_KEYS.ROUTING, seedRouting))
  const [kaizenOptions, setKaizenOptions] = useState<KaizenOption[]>(() => loadFromSession(STORAGE_KEYS.KAIZEN, seedKaizenOptions))
  const [activeTab, setActiveTabState] = useState<'master' | 'breakdown' | 'candidate' | 'rca'>(() =>
    loadFromSession(STORAGE_KEYS.ACTIVE_TAB, 'master')
  )

  // Sync to sessionStorage automatically on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.PRODUCT, JSON.stringify(product))
    } catch (e) {}
  }, [product])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rates))
    } catch (e) {}
  }, [rates])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.BOM, JSON.stringify(bom))
    } catch (e) {}
  }, [bom])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ROUTING, JSON.stringify(routing))
    } catch (e) {}
  }, [routing])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.KAIZEN, JSON.stringify(kaizenOptions))
    } catch (e) {}
  }, [kaizenOptions])

  const setActiveTab = (tab: 'master' | 'breakdown' | 'candidate' | 'rca') => {
    setActiveTabState(tab)
    try {
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(tab))
    } catch (e) {}
  }

  const costBreakdown = calculateCostBreakdown(bom, routing, rates)

  const updateProduct = (p: ProductMaster) => setProduct(p)

  const addBOMItem = (item: Omit<BOMItem, 'id'>) => {
    const newItem: BOMItem = { ...item, id: `bom-${Date.now()}` }
    setBOM(prev => [...prev, newItem])
  }

  const updateBOMItem = (id: string, item: Partial<BOMItem>) => {
    setBOM(prev => prev.map(b => (b.id === id ? { ...b, ...item } : b)))
  }

  const deleteBOMItem = (id: string) => {
    setBOM(prev => prev.filter(b => b.id !== id))
  }

  const addRoutingStep = (step: Omit<RoutingStep, 'id'>) => {
    const newStep: RoutingStep = { ...step, id: `rt-${Date.now()}` }
    setRouting(prev => [...prev, newStep])
  }

  const updateRoutingStep = (id: string, step: Partial<RoutingStep>) => {
    setRouting(prev => prev.map(s => (s.id === id ? { ...s, ...step } : s)))
  }

  const deleteRoutingStep = (id: string) => {
    setRouting(prev => prev.filter(s => s.id !== id))
  }

  const addWorkCenterRate = (rate: Omit<WorkCenterRate, 'id'>) => {
    const newRate: WorkCenterRate = { ...rate, id: `rate-${Date.now()}` }
    setRates(prev => [...prev.filter(r => r.wc !== rate.wc), newRate])
  }

  const updateWorkCenterRate = (wc: string, rate: Partial<WorkCenterRate>) => {
    setRates(prev => prev.map(r => (r.wc === wc ? { ...r, ...rate } : r)))
  }

  const deleteWorkCenterRate = (wc: string) => {
    setRates(prev => prev.filter(r => r.wc !== wc))
  }

  const addKaizenOption = (opt: Omit<KaizenOption, 'id'>) => {
    const newOpt: KaizenOption = { ...opt, id: `opt-${Date.now()}` }
    setKaizenOptions(prev => [...prev, newOpt])
  }

  const promoteOptionToActive = (optionId: string) => {
    const opt = kaizenOptions.find(o => o.id === optionId)
    if (!opt) return

    setRouting(prev =>
      prev.map(s => {
        if (s.opSeq === 40 || s.opSeq === 60) {
          return { ...s, activeYield: opt.targetYield }
        }
        return s
      })
    )
  }

  const importFromExcel = (result: ExcelImportResult) => {
    if (!result.success) return

    if (result.product) {
      setProduct(result.product)
    }
    if (result.rates && result.rates.length > 0) {
      setRates(result.rates)
    }
    if (result.bom && result.bom.length > 0) {
      setBOM(result.bom)
    }
    if (result.routing && result.routing.length > 0) {
      setRouting(result.routing)
    }
  }

  const resetToDefault = () => {
    setProduct(seedProductMaster)
    setRates(seedWorkCenterRates)
    setBOM(seedBOM)
    setRouting(seedRouting)
    setKaizenOptions(seedKaizenOptions)
  }

  const clearAllData = () => {
    setProduct({
      productCode: '',
      productDescription: '',
      uom: 'PC',
      customer: '',
      effectiveDate: new Date().toISOString().split('T')[0]
    })
    setRates([])
    setBOM([])
    setRouting([])
  }

  return (
    <AppContext.Provider
      value={{
        product,
        rates,
        bom,
        routing,
        kaizenOptions,
        costBreakdown,
        activeTab,
        setActiveTab,
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
        addKaizenOption,
        promoteOptionToActive,
        importFromExcel,
        resetToDefault,
        clearAllData
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppStore = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
