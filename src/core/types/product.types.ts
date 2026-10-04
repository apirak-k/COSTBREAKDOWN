export interface ProductMaster {
  /** Canonical Master Data identity. Legacy fields below remain for old session adapters. */
  productName?: string
  sellingPrice?: number | null
  /** Percentage of Selling Price, stored as entered (e.g. 8 means 8%). */
  sgaPercent?: number | null
  productCode: string
  productDescription: string
  uom: string
  note?: string
  customer: string
  effectiveDate: string
  additionalFields?: Record<string, unknown>
}

export interface ProductSizingConfig {
  productName?: string
  sellingPrice?: number | null
  sgaPercent?: number | null
  productCode: string
  productDescription: string
  uom: string
  customer?: string
  effectiveDate?: string
  wcCount: number
  bomCount: number
  routingCount: number
}

export interface DatasetSizing {
  wcCount?: number
  bomCount?: number
  routingCount?: number
}

export type DatasetStatus = 'archived' | 'active' | 'draft'

export type SnapshotRoleReadiness = Record<import('./snapshot.types').ComparisonRole, boolean>

export interface CandidateRcaDraft {
  rootCause: string
  action: string
}

export interface CandidateRcaRecord extends CandidateRcaDraft {
  candidateKey: string
  updatedAt: string
}

// A self-contained product session — one "workbook" per product version
export interface ProductSession {
  id: string
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
  /** Persisted driver annotations are keyed by CostDriver.driverKey, not display rank. */
  savedDrivers: CostDriver[]
  /** @deprecated Retained to preserve older session data; active RCA selects candidates on the RCA page. */
  selectedDriverKeys?: string[]
  /** @deprecated Retained to preserve older RCA notes; active notes use candidateRcaRecords. */
  rcaRecords?: Record<string, DriverRcaRecord>
  /** RCA notes are keyed by the Candidate Prioritization candidateKey. */
  candidateRcaRecords?: Record<string, CandidateRcaRecord>
  /** Session-scoped candidate controllability map, keyed by candidateKey. */
  candidateControllability?: Record<string, boolean>
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
  /** Monotonic source revision used to invalidate RCA scenarios after Master Data changes. */
  masterDataRevision?: number
  /** Dataset currently open in Master Data; Product context remains session-scoped. */
  masterDataRole?: import('./snapshot.types').ComparisonRole
  /** Per-dataset row sizing configuration. */
  datasetSizing?: Record<import('./snapshot.types').ComparisonRole, DatasetSizing>
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver, DriverRcaRecord } from './cost.types'
