export interface ProductMaster {
  productCode: string
  productDescription: string
  uom: string
  customer: string
  effectiveDate: string
}

export interface ProductSizingConfig {
  productCode: string
  productDescription: string
  uom: string
  customer?: string
  effectiveDate?: string
  wcCount: number
  bomCount: number
  routingCount: number
}

// A self-contained product session — one "workbook" per product
export interface ProductSession {
  id: string
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  savedDrivers: CostDriver[]
  createdAt: string
  updatedAt: string
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver } from './cost.types'
