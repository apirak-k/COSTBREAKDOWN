import type { DatasetSizing, LastSavedMasterDataDataset, ProductSession } from '../core/types/product.types'
import type { CostSnapshot, MasterDataRole, SnapshotPair } from '../core/types/snapshot.types'
import { applySnapshotPairToSession, getSnapshotRoleReadiness, sessionToSnapshotPair } from '../core'
import { emptyProductMaster } from './seed-data'
import { hasEnteredMasterData } from './dataset-sizing'
import { markMasterDataChangedForSnapshotPair } from './master-data-revision'
import { normalizeMasterDataSnapshot } from '../core/utils/master-data-effective'

export function cloneCostSnapshot(snapshot: CostSnapshot): CostSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as CostSnapshot
}

export function cloneMasterDataSnapshotForRole(
  snapshot: CostSnapshot,
  sourceRole: MasterDataRole,
  destinationRole: MasterDataRole,
  sizing: DatasetSizing
): CostSnapshot {
  const copied = cloneCostSnapshot(snapshot)
  const { comparisonRole: _comparisonRole, ...independentSnapshot } = copied
  return {
    ...independentSnapshot,
    id: `${snapshot.id}:${destinationRole}`,
    sourceRef: `Cloned from ${sourceRole}: ${snapshot.sourceRef}`,
    status: 'draft',
    ...(destinationRole === 'custom' ? {} : { comparisonRole: destinationRole }),
    sizing: { ...sizing }
  }
}

export function cloneMasterDataDatasetState(
  session: ProductSession,
  sourceRole: MasterDataRole,
  destinationRole: MasterDataRole,
  now = new Date().toISOString()
): ProductSession {
  if (sourceRole === destinationRole) return session
  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  const sourceSnapshot = getMasterDataSnapshot(session, pair, sourceRole)
  const sourceSizing = getMasterDataSizing(session, sourceSnapshot, sourceRole)
  const copied = cloneMasterDataSnapshotForRole(sourceSnapshot, sourceRole, destinationRole, sourceSizing)

  if (destinationRole === 'custom') {
    return {
      ...session,
      customMasterData: copied,
      customDatasetSizing: { ...sourceSizing },
      updatedAt: now
    }
  }

  const nextPair = { ...pair, [destinationRole]: copied }
  const nextSizing = {
    reference: session.datasetSizing?.reference ?? pair.reference.sizing ?? {},
    current: session.datasetSizing?.current ?? pair.current.sizing ?? {},
    [destinationRole]: { ...sourceSizing }
  }
  const nextSession = applySnapshotPairToSession({
    ...session,
    datasetSizing: nextSizing,
    preparedSnapshotRoles: {
      ...getSnapshotRoleReadiness(session),
      [destinationRole]: hasEnteredMasterData(copied)
    },
    updatedAt: now
  }, nextPair)
  return markMasterDataChangedForSnapshotPair(nextSession, pair, nextPair)
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
    customMasterData = cloneCostSnapshot(customMasterData)
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
  const snapshot = role === 'custom'
    ? session.customMasterData ?? createEmptyCustomMasterData(session.id)
    : pair[role]
  return normalizeMasterDataSnapshot(snapshot)
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
