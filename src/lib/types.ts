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

// Mirrors one row of the _CALC_ENGINE sheet — a single ranked cost driver
export interface CostDriver {
  id: number                  // 1-based row ID in calc engine (1–16 BOM, 17–55 Routing)
  category: string            // e.g. "Direct Material" | section name from routing
  driverName: string          // BOM description or Routing operation name
  rcaParameter: string        // Auto-generated RCA text, e.g. "Unit Price Inflation (31.70 → 65.00 THB)"
  baseParameter: number | null
  activeParameter: number | null
  costGap: number             // Positive = cost increase, Negative = saving
  tieBreakerScore: number     // costGap + (55 - id) * 0.00000001 for stable rank
  rank: number                // 1-10 after sorting (only positive gap drivers)
  pctContribution: number     // costGap / totalPositiveGap * 100
  // Human-input fields (mirrors Col I & J in Sheet 4)
  controllability: 'Controllable' | 'Uncontrollable' | ''
  actionPlan: string
}

