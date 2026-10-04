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
  /** Identifies an untouched row allocated by dataset sizing. */
  isGeneratedSizingPlaceholder?: boolean
  itemCode: string
  description: string
  consumption: number | null
  unit: string
  price: number | null
  loss: number | null
  note?: string
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
  /** Imported dataset fields that are retained for comparison but have no core cost mapping yet. */
  additionalFields?: Record<string, unknown>
}

export interface SnapshotRoutingStep {
  id: string
  /** Identifies an untouched row allocated by dataset sizing. */
  isGeneratedSizingPlaceholder?: boolean
  operationCode?: string
  sequence?: number
  processCode?: string
  processName: string
  workCenterId?: string
  manning: number | null
  capacity: number | null
  yield: number | null
  note?: string
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
  additionalFields?: Record<string, unknown>
}

export interface SnapshotWorkCenterRate {
  id: string
  /** Identifies an untouched row allocated by dataset sizing. */
  isGeneratedSizingPlaceholder?: boolean
  workCenterCode: string
  description: string
  laborRate: number | null
  burdenRate: number | null
  effectiveDate: string
  note?: string
  sourceRef?: string
  confidence: Record<string, FieldEvidence>
  additionalFields?: Record<string, unknown>
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
  remark?: string
  sizing?: import('./product.types').DatasetSizing
  additionalFields?: Record<string, unknown>
  warnings?: string[]
}

export type CalculationStatus = 'complete' | 'estimated' | 'missing'

export interface SnapshotCost {
  snapshotId: string
  material: number | null
  labor: number | null
  burden: number | null
  total: number | null
  status: CalculationStatus
  warnings: string[]
}

export type MatchStatus = 'matched' | 'added' | 'removed' | 'ambiguous' | 'unmatched'
export type CanonicalComparisonStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED'

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
  costEffect?: ComparisonRecordCostEffect
  confidence: ConfidenceStatus
  reviewRequired?: boolean
}

/** Processing-cost comparison aggregated at the Work Center level. */
export interface WorkCenterProcessingFinding extends ComparisonFinding {
  workCenterCode: string
  workCenterDescription?: string
  sourceId: string
  sourceRef?: string
  costEffect: ComparisonRecordCostEffect
}

export interface ComparisonCostValues {
  material: number | null
  labor: number | null
  burden: number | null
  total: number | null
}

export interface ComparisonRecordCostEffect {
  reference: ComparisonCostValues
  current: ComparisonCostValues
  gap: ComparisonCostValues
}

export interface ComparisonWarning {
  code: string
  message: string
  referenceId?: string
  currentId?: string
}

export interface ComparisonReconciliation {
  reconciled: boolean
  recordEffectGaps: Record<'material' | 'labor' | 'burden', number | null>
  recordEffectDiscrepancies: Record<'material' | 'labor' | 'burden', number | null>
  totalGap: number | null
  sumOfElementGaps: number | null
  discrepancy: number | null
  issues: string[]
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
  processingFindings: WorkCenterProcessingFinding[]
  productFieldDiffs: Record<string, { reference: unknown; current: unknown }>
  warnings: ComparisonWarning[]
  reconciliation?: ComparisonReconciliation
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

export interface SelectedComparisonSelection {
  bomFindingKeys: string[]
  routingFindingKeys: string[]
}
