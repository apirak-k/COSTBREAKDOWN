export interface ProductMaster {
  productCode: string
  productDescription: string
  uom: string
  customer: string
  effectiveDate: string
}

export interface WorkCenterRate {
  id?: string
  wc: string
  description: string
  laborRate: number // THB/MHr
  burdenRate: number // THB/MHr
  effectiveDate: string
  sourceRef: string
}

export interface BOMItem {
  id: string
  itemCode: string
  description: string
  consumption: number // Q (Usage per 1 finished good)
  unit: string
  basePrice: number // P0 (THB/Unit)
  activePrice: number // P1 (THB/Unit)
  baseLoss: number // L0 (e.g. 0.30 = 30%)
  activeLoss: number // L1 (e.g. 0.30 = 30%)
  sourceRef: string
}

export interface RoutingStep {
  id: string
  opSeq: number
  description: string
  wc: string
  manning: number // M (Headcount)
  baseCap: number // C0 (pcs/hr)
  activeCap: number // C1 (pcs/hr)
  baseYield: number // Y0 (e.g. 0.95 = 95%)
  activeYield: number // Y1 (e.g. 0.90 = 90%)
  sourceRef: string
}

export interface CostElementBreakdown {
  materialBase: number
  materialActive: number
  laborBase: number
  laborActive: number
  burdenBase: number
  burdenActive: number
  totalBase: number
  totalActive: number
  totalVariance: number
  mpv: number // Material Price Variance
  mlv: number // Material Loss Variance
  lrv: number // Labor Rate Variance
  lev: number // Labor Yield Variance
  brv: number // Burden Rate Variance
  bev: number // Burden Yield Variance
}

export interface KaizenOption {
  id: string
  optionLetter: string
  actionName: string
  targetYield: number
  investmentCost: number
  lotSize: number
  addedCostPerUnit: number
  grossSavingPerUnit: number
  netSavingPerUnit: number
  predictedTotalStdCost: number
  isProfitable: boolean
}

export interface ExcelImportResult {
  success: boolean
  message: string
  product?: ProductMaster
  rates?: WorkCenterRate[]
  bom?: BOMItem[]
  routing?: RoutingStep[]
  warnings?: string[]
}
