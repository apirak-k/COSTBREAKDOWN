import {
  SnapshotBOMItem,
  SnapshotCost,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from './snapshot.types'

type NumericFieldPatch<T, K extends keyof T> = Partial<{
  [Field in K]: Extract<T[Field], number>
}>

export interface ScenarioParameterOverrides {
  bom?: Record<string, NumericFieldPatch<SnapshotBOMItem, 'price' | 'loss' | 'consumption'>>
  routing?: Record<string, NumericFieldPatch<SnapshotRoutingStep, 'manning' | 'capacity' | 'yield'>>
  rates?: Record<string, NumericFieldPatch<SnapshotWorkCenterRate, 'laborRate' | 'burdenRate'>>
}

export interface ScenarioCostDraft {
  letter: 'A' | 'B'
  label: string
  overrides: ScenarioParameterOverrides
}

export interface ScenarioCostResult {
  letter: ScenarioCostDraft['letter']
  label: string
  currentCost: SnapshotCost
  scenarioCost: SnapshotCost
  overrideWarnings: string[]
}

export interface ScenarioEconomicsInputs {
  fixedInvestment: number | null
  fixedInvestmentCategory: ScenarioCostCategory | null
  variableAddedCostPerPiece: number | null
  variableAddedCostCategory: ScenarioCostCategory | null
  evaluationVolume: number | null
}

export type ScenarioCostCategory = 'material' | 'labor' | 'burden'

export interface ScenarioBusinessInputs {
  sellingPrice: number | null
  sgaPercent: number | null
}

export interface ScenarioBusinessResult extends ScenarioBusinessInputs {
  sgaAmountPerPiece: number | null
  operatingProfitPerPiece: number | null
  warnings: string[]
}

export interface ScenarioEconomicsResult {
  scenarioCost: SnapshotCost
  grossImprovementPerPiece: number | null
  fixedCostEquivalentPerPiece: number | null
  variableAddedCostPerPiece: number | null
  totalImprovement: number | null
  warnings: string[]
}
