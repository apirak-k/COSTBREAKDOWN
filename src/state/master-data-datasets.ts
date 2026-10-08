import type { ProductSession } from '../core/types/product.types'
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
  const customMasterData = session.customMasterData
    ? session.snapshotPair?.reference === session.customMasterData ||
      session.snapshotPair?.current === session.customMasterData
      ? cloneSnapshot(session.customMasterData)
      : session.customMasterData
    : createEmptyCustomMasterData(session.id)

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

export function setMasterDataSnapshot(
  session: ProductSession,
  pair: SnapshotPair,
  role: MasterDataRole,
  snapshot: CostSnapshot
): ProductSession {
  if (role === 'custom') return { ...session, customMasterData: snapshot }

  return {
    ...session,
    snapshotPair: { ...pair, [role]: snapshot },
    snapshotPairMode: 'independent'
  }
}
