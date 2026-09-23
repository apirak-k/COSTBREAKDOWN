import { ProductMaster, DatasetStatus } from './product.types'
import { BOMItem, DataConfidence, RoutingStep, WorkCenterRate } from './cost.types'

export type ComparisonRole = 'reference' | 'current'
export type ConfidenceStatus = DataConfidence

export type DataQualityStatus = 'valid' | 'missing' | 'invalid' | 'warning' | 'needs-review'

export interface FieldEvidence {
  status: ConfidenceStatus
  quality?: DataQualityStatus
  sourceRef?: string
  basis?: string
  sourceValue?: unknown
  workingValue?: unknown
}

export interface SnapshotBOMItem {
  id: string
  itemCode: string
  description: string
  consumption: number | null
  unit: string
  price: number | null
  loss: number | null
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
}

export interface SnapshotRoutingStep {
  id: string
  operationCode?: string
  sequence?: number
  processCode?: string
  processName: string
  workCenterId?: string
  manning: number | null
  capacity: number | null
  yield: number | null
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
}

export interface SnapshotWorkCenterRate {
  id: string
  workCenterCode: string
  description: string
  laborRate: number | null
  burdenRate: number | null
  effectiveDate: string
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
}

export interface CostSnapshot {
  id: string
  product: ProductMaster
  effectiveDate: string
  sourceRef: string
  comparisonRole?: ComparisonRole
  status: DatasetStatus
  rates: SnapshotWorkCenterRate[]
  bom: SnapshotBOMItem[]
  routing: SnapshotRoutingStep[]
  warnings?: string[]
}

export type CalculationStatus = 'complete' | 'estimated' | 'missing'

export interface SnapshotCost {
  snapshotId: string
  material: number
  labor: number
  burden: number
  total: number
  status: CalculationStatus
  warnings: string[]
}

export type MatchStatus = 'matched' | 'added' | 'removed' | 'ambiguous' | 'unmatched'

export interface ChangeFlags {
  reordered?: boolean
  movedWorkCenter?: boolean
  changedInputs?: boolean
  changedRate?: boolean
}

export interface ComparisonFinding {
  referenceId?: string
  currentId?: string
  matchStatus: MatchStatus
  changeFlags: ChangeFlags
  fieldDiffs: Record<string, { reference: unknown; current: unknown }>
  costGap?: number | null
  confidence: ConfidenceStatus
}

export interface ComparisonWarning {
  code: string
  message: string
  referenceId?: string
  currentId?: string
}

export interface CostComparison {
  id: string
  referenceSnapshotId: string
  currentSnapshotId: string
  referenceCost: SnapshotCost
  currentCost: SnapshotCost
  totalGap: number | null
  elementGaps: Record<'material' | 'labor' | 'burden', number | null>
  bomFindings: ComparisonFinding[]
  routingFindings: ComparisonFinding[]
  workCenterFindings: ComparisonFinding[]
  warnings: ComparisonWarning[]
}

export interface LegacyPairedModel {
  id: string
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  status: DatasetStatus
  sourceRef?: string
}

export interface SnapshotPair {
  reference: CostSnapshot
  current: CostSnapshot
}
