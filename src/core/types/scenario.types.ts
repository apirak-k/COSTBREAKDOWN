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
  variableAddedCostPerPiece: number | null
  evaluationVolume: number | null
}

export interface ScenarioEconomicsResult {
  grossSavingPerPiece: number | null
  fixedCostEquivalentPerPiece: number | null
  netBenefitPerPiece: number | null
  totalGrossSaving: number | null
  totalVariableAddedCost: number | null
  totalNetBenefit: number | null
  warnings: string[]
}
