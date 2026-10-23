export interface ProductMaster {
  /** Canonical Master Data identity. Legacy fields below remain for old session adapters. */
  productName?: string
  sellingPrice?: number | null
  /** Exact accepted editor text; numeric values remain the calculation representation. */
  exactDecimalInputs?: Partial<Record<'sellingPrice' | 'sgaPercent', string>>
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

export interface RcaCaseRecord extends CandidateRcaDraft {
  id: string
  candidateKeys: string[]
  updatedAt: string
}

export interface CurrentRcaWorkspace extends CandidateRcaDraft {
  candidateKeys: string[]
}

export interface LastSavedMasterDataDataset {
  snapshot: import('./snapshot.types').CostSnapshot
  prepared: boolean
  sizing?: DatasetSizing
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
  /** @deprecated Retained only for compatibility with older saved sessions. */
  selectedDriverKeys?: string[]
  /** @deprecated Retained only for older driver-level RCA note compatibility; active RCA Cases use rcaCases. */
  rcaRecords?: Record<string, DriverRcaRecord>
  /** @deprecated Migrated into rcaCases; retained for older saved session compatibility. */
  candidateRcaRecords?: Record<string, CandidateRcaRecord>
  /** Legacy RCA Case records retained so existing saved sessions remain readable. */
  rcaCases?: Record<string, RcaCaseRecord>
  /** Legacy active Case selection retained so existing browser sessions remain readable. */
  activeRcaCaseId?: string
  /** Legacy Candidate/RCA workspace retained so existing browser sessions remain readable. */
  currentRcaWorkspace?: CurrentRcaWorkspace
  /** Legacy Candidate page flags retained so existing browser sessions remain readable. */
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
  /** Per-dataset row sizing configuration. */
  datasetSizing?: Record<import('./snapshot.types').ComparisonRole, DatasetSizing>
  /** Independent Custom Master Data Working snapshot; never projected into CBD's pair. */
  customMasterData?: import('./snapshot.types').CostSnapshot
  /** Custom Master Data Sizing, kept separate from Reference/Current comparison state. */
  customDatasetSizing?: DatasetSizing
  /** Explicitly saved Master Data snapshots, kept only for this browser session. */
  lastSavedMasterData?: Partial<Record<import('./snapshot.types').ComparisonRole, LastSavedMasterDataDataset>>
  /** Custom's Last Saved state is isolated from the CBD Reference/Current pair. */
  customLastSavedMasterData?: LastSavedMasterDataDataset
  /** Initial Working reset targets for each dataset role, captured when the workbook is opened or a dataset is loaded. */
  initialMasterDataBaseline?: Partial<Record<import('./snapshot.types').MasterDataRole, LastSavedMasterDataDataset>>
}

import { WorkCenterRate, BOMItem, RoutingStep, CostDriver, DriverRcaRecord } from './cost.types'
