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

export type CostDriverSource = 'bom' | 'routing'
export type CostDriverImpact = 'unfavorable' | 'neutral' | 'favorable'

// Retained for migration and persisted annotation compatibility with earlier session data.
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
