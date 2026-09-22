export type DataConfidence = 'verified' | 'estimated' | 'missing'

export interface WorkCenterRate {
  id?: string
  wc: string
  description: string
  laborRate: number // THB/MHr
  burdenRate: number // THB/MHr
  effectiveDate: string
  sourceRef: string
  confidence?: DataConfidence
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
  confidence?: DataConfidence
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
  confidence?: DataConfidence
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
  lev: number // Labor Efficiency Variance
  brv: number // Burden Rate Variance
  bev: number // Burden Efficiency Variance
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
  baseCost: number
  activeCost: number
  variance: number
  mpv: number
  mlv: number
}

export interface RoutingDetailedRow extends RoutingStep {
  baseRuntime: number
  activeRuntime: number
  baseLaborCost: number
  activeLaborCost: number
  baseBurdenCost: number
  activeBurdenCost: number
  baseTotal: number
  activeTotal: number
  variance: number
}

// What-If Simulation Scenario types
export type ScenarioValueOrigin = 'source' | 'calculated' | 'override'
export type ScenarioVariableType = 'amount' | 'rate' | 'percentage' | 'quantity' | 'text' | 'driver-defined'

export interface ScenarioVariableDefinition {
  key: string
  label: string
  valueType: ScenarioVariableType
  unit?: string
  dependencies?: string[]
  formula?: string
}

export interface ScenarioValue extends ScenarioVariableDefinition {
  value: number | string | null
  origin: ScenarioValueOrigin
}

export interface WhatIfScenario {
  letter: 'A' | 'B' | 'C'
  label: string
  targetValue: string
  secondaryTargetValue?: string // e.g. Target Manning or Secondary Parameter
  investment: string // Lump-sum Fixed Investment (THB)
  variableAddedCost?: string // Variable Added Cost per Piece (THB/Unit)
  lotSize: string // Production volume / Lot size (Units)
  /** Future or imported variables remain visible instead of being discarded. */
  additionalVariables?: ScenarioValue[]
}

export interface WhatIfResult extends WhatIfScenario {
  valid: boolean
  grossSaving: number
  fixedAddedCostPerUnit: number
  variableAddedCostPerUnit: number
  addedCost: number // Total added cost = fixed + variable per unit
  netSaving: number
  predictedTotal: number
  isProfitable: boolean
  totalNetBenefit: number
  scenarioValues: ScenarioValue[]
}

// Actual Shop-floor Trial Validation Matrix (Before vs Predicted vs Actual)
export interface TrialValidationRecord {
  driverName: string
  actionDescription: string
  baselineCost: number
  predictedCost: number
  actualCost: number
  costDeviation: number // (actualCost - predictedCost)
  pctDeviation: number // ((actualCost - predictedCost) / predictedCost) * 100
  notes: string
}

