import { ProductMaster } from './product.types'
import { WorkCenterRate, BOMItem, RoutingStep } from './cost.types'

export interface ExcelImportResult {
  success: boolean
  message: string
  product?: ProductMaster
  rates?: WorkCenterRate[]
  bom?: BOMItem[]
  routing?: RoutingStep[]
  warnings?: string[]
}

export interface DynamicTemplateOptions {
  product: ProductMaster
  wcCount: number
  bomCount: number
  routingCount: number
  existingRates?: WorkCenterRate[]
}
