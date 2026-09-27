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
  letter: 'A' | 'B' | 'C'
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