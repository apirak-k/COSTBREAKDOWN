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

export type DatasetStatus = 'archived' | 'active' | 'draft'

// A self-contained product session — one "workbook" per product version
export interface ProductSession {
  id: string
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  savedDrivers: CostDriver[]
  status: DatasetStatus
  versionLabel?: string
  createdAt: string
  updatedAt: string
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver } from './cost.types'
