import type { DatasetSizing, LastSavedMasterDataDataset, ProductSession } from '../core/types/product.types'
import type { CostSnapshot, MasterDataRole, SnapshotPair } from '../core/types/snapshot.types'
import { emptyProductMaster } from './seed-data'

function cloneSnapshot(snapshot: CostSnapshot): CostSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as CostSnapshot
}

export function createEmptyCustomMasterData(sessionId: string): CostSnapshot {
  return {
    id: `${sessionId}:custom`,
    product: { ...emptyProductMaster },
    effectiveDate: '',
    sourceRef: 'empty:custom',
    status: 'draft',
    rates: [],
    bom: [],
    routing: []
  }
}

/** Adds an independent blank Custom workspace to sessions persisted before Custom existed. */
export function initializeCustomMasterData(session: ProductSession): ProductSession {
  let customMasterData = session.customMasterData ?? createEmptyCustomMasterData(session.id)
  if (session.snapshotPair?.reference === customMasterData || session.snapshotPair?.current === customMasterData) {
    customMasterData = cloneSnapshot(customMasterData)
  }
  if (customMasterData.comparisonRole) {
    const { comparisonRole: _comparisonRole, ...independentSnapshot } = customMasterData
    customMasterData = independentSnapshot
  }

  return {
    ...session,
    customMasterData,
    customDatasetSizing: { ...(session.customDatasetSizing ?? customMasterData.sizing ?? {}) },
    customLastSavedMasterData: session.customLastSavedMasterData
  }
}

export function getMasterDataSnapshot(
  session: ProductSession,
  pair: SnapshotPair,
  role: MasterDataRole
): CostSnapshot {
  return role === 'custom'
    ? session.customMasterData ?? createEmptyCustomMasterData(session.id)
    : pair[role]
}

export function getMasterDataSizing(
  session: ProductSession,
  snapshot: CostSnapshot,
  role: MasterDataRole
): DatasetSizing {
  return role === 'custom'
    ? session.customDatasetSizing ?? snapshot.sizing ?? {}
    : session.datasetSizing?.[role] ?? snapshot.sizing ?? {}
}

export function getLastSavedMasterData(
  session: ProductSession,
  role: MasterDataRole
): LastSavedMasterDataDataset | undefined {
  return role === 'custom'
    ? session.customLastSavedMasterData
    : session.lastSavedMasterData?.[role]
}

export function setMasterDataSnapshot(
  session: ProductSession,
  pair: SnapshotPair,
  role: MasterDataRole,
  snapshot: CostSnapshot
): ProductSession {
  if (role === 'custom') {
    const { comparisonRole: _comparisonRole, ...customSnapshot } = snapshot
    return { ...session, customMasterData: customSnapshot }
  }

  return {
    ...session,
    snapshotPair: { ...pair, [role]: snapshot },
    snapshotPairMode: 'independent'
  }
}
