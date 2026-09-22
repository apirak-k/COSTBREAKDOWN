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
  /** Persisted driver annotations are keyed by CostDriver.driverKey, not display rank. */
  savedDrivers: CostDriver[]
  /** Session-scoped Ranking/RCA selection, keyed by CostDriver.driverKey. */
  selectedDriverKeys?: string[]
  status: DatasetStatus
  versionLabel?: string
  createdAt: string
  updatedAt: string
  /** Compatibility projection for the incremental snapshot migration. */
  snapshotPair?: import('./snapshot.types').SnapshotPair
  /** Indicates that snapshotPair was imported independently rather than derived from paired fields. */
  snapshotPairMode?: 'derived' | 'independent'
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver } from './cost.types'
