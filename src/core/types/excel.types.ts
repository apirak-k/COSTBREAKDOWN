import { ProductMaster } from './product.types'
import { WorkCenterRate, BOMItem, RoutingStep } from './cost.types'
import { ComparisonRole, CostSnapshot } from './snapshot.types'

export interface ExcelImportResult {
  success: boolean
  message: string
  product?: ProductMaster
  rates?: WorkCenterRate[]
  bom?: BOMItem[]
  routing?: RoutingStep[]
  warnings?: string[]
}

export interface SnapshotImportResult {
  success: boolean
  message: string
  format?: 'canonical' | 'legacy'
  snapshot?: CostSnapshot
  warnings?: string[]
  role: ComparisonRole
}

export interface DynamicTemplateOptions {
  product: ProductMaster
  wcCount: number
  bomCount: number
  routingCount: number
  existingRates?: WorkCenterRate[]
}
