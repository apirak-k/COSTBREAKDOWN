import { ProductMaster } from './product.types'
import { WorkCenterRate } from './cost.types'
import { MasterDataRole, CostSnapshot } from './snapshot.types'

export interface SnapshotImportResult {
  success: boolean
  message: string
  format?: 'canonical'
  snapshot?: CostSnapshot
  warnings?: string[]
  role: MasterDataRole
}

export interface DynamicTemplateOptions {
  product: ProductMaster
  snapshot?: CostSnapshot
  wcCount?: number
  bomCount?: number
  routingCount?: number
  existingRates?: WorkCenterRate[]
}
