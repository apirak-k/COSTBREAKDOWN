import type { CostSnapshot, MasterDataRole, ProductSession, SnapshotPair } from '../core/types'
import { applySnapshotPairToSession, getSnapshotRoleReadiness, sessionToSnapshotPair } from '../core'
import { hasEnteredMasterData } from './dataset-sizing'
import { cloneCostSnapshot, getMasterDataSnapshot } from './master-data-datasets'
import { markMasterDataChangedForSnapshotPair } from './master-data-revision'
import { normalizeMasterDataSnapshot } from '../core/utils/master-data-effective'
import { isMasterDataSnapshotChangeValid } from '../core/utils/master-data-validation'

export interface SimulationMasterDataSendResult {
  session: ProductSession
  roles: MasterDataRole[]
}

/** Builds the atomic same-role Working update used by Simulation Send and Send All. */
export function applySimulationSnapshotsToMasterData(
  session: ProductSession,
  snapshots: Partial<Record<MasterDataRole, CostSnapshot>>,
  now = new Date().toISOString()
): SimulationMasterDataSendResult | undefined {
  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  const roles = (['reference', 'current', 'custom'] as const).filter(role => snapshots[role] !== undefined)
  if (!roles.length) return undefined

  const nextPair: SnapshotPair = { ...pair }
  const nextDatasetSizing = {
    reference: session.datasetSizing?.reference ?? pair.reference.sizing ?? {},
    current: session.datasetSizing?.current ?? pair.current.sizing ?? {}
  }
  const nextPreparedSnapshotRoles = { ...getSnapshotRoleReadiness(session) }
  let nextCustomMasterData = session.customMasterData
  let nextCustomDatasetSizing = session.customDatasetSizing

  // Validate and prepare every requested destination before constructing the result.
  for (const role of roles) {
    const snapshot = snapshots[role]!
    const currentDataset = getMasterDataSnapshot(session, pair, role)
    const { comparisonRole: _comparisonRole, ...workingSnapshot } = cloneCostSnapshot(snapshot)
    const sizing = {
      ...(snapshot.sizing ?? {}),
      wcCount: snapshot.rates.length,
      bomCount: snapshot.bom.length,
      routingCount: snapshot.routing.length
    }
    const nextDataset = normalizeMasterDataSnapshot({
      ...workingSnapshot,
      id: `${snapshot.id}:${role}`,
      sourceRef: 'Copied from Simulation',
      status: 'draft',
      ...(role === 'custom' ? {} : { comparisonRole: role }),
      sizing
    }, currentDataset)
    if (!isMasterDataSnapshotChangeValid(currentDataset, nextDataset)) return undefined
    if (role === 'custom') {
      nextCustomMasterData = nextDataset
      nextCustomDatasetSizing = sizing
    } else {
      nextPair[role] = nextDataset
      nextDatasetSizing[role] = sizing
      nextPreparedSnapshotRoles[role] = hasEnteredMasterData(nextDataset)
    }
  }

  let updated: ProductSession = {
    ...session,
    updatedAt: now,
    datasetSizing: nextDatasetSizing,
    preparedSnapshotRoles: nextPreparedSnapshotRoles,
    ...(nextCustomMasterData ? { customMasterData: nextCustomMasterData } : {}),
    ...(nextCustomDatasetSizing ? { customDatasetSizing: nextCustomDatasetSizing } : {})
  }
  if (roles.some(role => role !== 'custom')) {
    updated = applySnapshotPairToSession(updated, nextPair)
    updated = markMasterDataChangedForSnapshotPair(updated, pair, nextPair)
  }

  return { session: updated, roles: [...roles] }
}
