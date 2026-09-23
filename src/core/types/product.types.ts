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

export type SnapshotRoleReadiness = Record<import('./snapshot.types').ComparisonRole, boolean>

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
  /** Extensible RCA records keyed by the selected CostDriver.driverKey. */
  rcaRecords?: Record<string, DriverRcaRecord>
  status: DatasetStatus
  versionLabel?: string
  createdAt: string
  updatedAt: string
  /** Compatibility projection for the incremental snapshot migration. */
  snapshotPair?: import('./snapshot.types').SnapshotPair
  /** Indicates that snapshotPair was imported independently rather than derived from paired fields. */
  snapshotPairMode?: 'derived' | 'independent'
  /** Tracks which dataset roles have been explicitly prepared for comparison. */
  preparedSnapshotRoles?: SnapshotRoleReadiness
  /** Dataset currently open in Master Data; Product context remains session-scoped. */
  masterDataRole?: import('./snapshot.types').ComparisonRole
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver, DriverRcaRecord } from './cost.types'
