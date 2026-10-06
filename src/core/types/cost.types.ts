export type DataConfidence = 'verified' | 'estimated' | 'missing'

export interface WorkCenterRate {
  id?: string
  /** Internal marker preserving untouched sizing placeholders across session projection. */
  isGeneratedSizingPlaceholder?: boolean
  wc: string
  description: string
  laborRate: number // THB/MHr
  burdenRate: number // THB/MHr
  effectiveDate: string
  sourceRef: string
  confidence?: DataConfidence
  note?: string
}

export interface BOMItem {
  id: string
  /** Internal marker preserving untouched sizing placeholders across session projection. */
  isGeneratedSizingPlaceholder?: boolean
  itemCode: string
  description: string
  consumption: number // Q (Usage per 1 finished good)
  unit: string
  basePrice: number // P0 (THB/Unit)
  activePrice: number // P1 (THB/Unit)
  baseLoss: number // L0 (e.g. 0.30 = 30%)
  activeLoss: number // L1 (e.g. 0.30 = 30%)
  sourceRef: string
  confidence?: DataConfidence
  note?: string
}

export interface RoutingStep {
  id: string
  /** Internal marker preserving untouched sizing placeholders across session projection. */
  isGeneratedSizingPlaceholder?: boolean
  /** Stable Routing business identity retained by the snapshot compatibility projection. */
  operationCode?: string
  opSeq: number
  description: string
  wc: string
  manning: number // M (Headcount)
  baseCap: number // C0 (pcs/hr)
  activeCap: number // C1 (pcs/hr)
  baseYield: number // Y0 (e.g. 0.95 = 95%)
  activeYield: number // Y1 (e.g. 0.90 = 90%)
  sourceRef: string
  confidence?: DataConfidence
  note?: string
}

export interface CostElementBreakdown {
  materialBase: number | null
  materialActive: number | null
  laborBase: number | null
  laborActive: number | null
  burdenBase: number | null
  burdenActive: number | null
  totalBase: number | null
  totalActive: number | null
  totalVariance: number | null
  mpv: number | null // Material Price Variance
  mlv: number | null // Material Loss Variance
  lrv: number | null // Labor Rate Variance
  lev: number | null // Labor Efficiency Variance
  brv: number | null // Burden Rate Variance
  bev: number | null // Burden Efficiency Variance
  missingWorkCenters: string[]
}

export type CostDriverSource = 'bom' | 'routing'
export type CostDriverImpact = 'unfavorable' | 'neutral' | 'favorable'

/** Stable persistence identity for a driver: source kind + source record id. */
export function buildDriverKey(sourceType: CostDriverSource, sourceId: string): string {
  return `${sourceType}:${sourceId}`
}

export function getCostDriverImpact(costGap: number): CostDriverImpact {
  if (costGap > 0) return 'unfavorable'
  if (costGap < 0) return 'favorable'
  return 'neutral'
}

// Single ranked cost driver from _CALC_ENGINE
export interface CostDriver {
  driverKey: string
  sourceType: CostDriverSource
  sourceId: string
  impact: CostDriverImpact
  id: number
  category: string
  driverName: string
  rcaParameter: string
  baseParameter: number | null
  activeParameter: number | null
  costGap: number
  tieBreakerScore: number
  rank: number
  pctContribution: number
  controllability: 'Controllable' | 'Uncontrollable' | ''
  actionPlan: string
  canInfluence?: boolean
  requirementFit?: boolean
  confidence?: DataConfidence
  sourceRef?: string
}

export interface DriverRcaDraft {
  factor: string
  rootCause: string
  action: string
}

export interface DriverRcaRecord extends DriverRcaDraft {
  driverKey: string
  sourceType: CostDriverSource
  sourceId: string
  driverName: string
  category: string
  baseParameter: number | null
  activeParameter: number | null
  costGap: number
  sourceRef?: string
  updatedAt: string
}

// Detailed row breakdown types
export interface BOMDetailedRow extends BOMItem {
  baseCost: number | null
  activeCost: number | null
  variance: number | null
  mpv: number | null
  mlv: number | null
}

export interface RoutingDetailedRow extends RoutingStep {
  baseRuntime: number | null
  activeRuntime: number | null
  baseLaborCost: number | null
  activeLaborCost: number | null
  baseBurdenCost: number | null
  activeBurdenCost: number | null
  baseTotal: number | null
  activeTotal: number | null
  variance: number | null
}

