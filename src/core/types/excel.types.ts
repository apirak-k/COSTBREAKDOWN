import { ProductMaster } from './product.types'
import { WorkCenterRate, BOMItem, RoutingStep } from './cost.types'
import { MasterDataRole, CostSnapshot } from './snapshot.types'

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
  role: MasterDataRole
}

export interface SnapshotImportOptions {
  allowLegacy?: boolean
}

export interface DynamicTemplateOptions {
  product: ProductMaster
  snapshot?: CostSnapshot
  wcCount?: number
  bomCount?: number
  routingCount?: number
  existingRates?: WorkCenterRate[]
}
