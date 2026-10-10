import type { ProductSession, SnapshotPair } from '../core/types'
import { applySnapshotPairToSession, getSnapshotRoleReadiness, sessionToSnapshotPair } from '../core'
import { getMasterDataSnapshotValidationErrors } from '../core/utils/master-data-validation'
import { normalizeMasterDataSnapshot } from '../core/utils/master-data-effective'
import { createEmptyCustomMasterData } from './master-data-datasets'
import { markMasterDataChangedForSnapshotPair } from './master-data-revision'

function normalizeSnapshotPair(pair: SnapshotPair): SnapshotPair {
  return {
    reference: normalizeMasterDataSnapshot(pair.reference),
    current: normalizeMasterDataSnapshot(pair.current)
  }
}

export function replaceDevelopmentMockWorkingState(
  source: ProductSession,
  pair: SnapshotPair,
  now = new Date().toISOString()
): ProductSession | undefined {
  const beforePair = normalizeSnapshotPair(source.snapshotPair ?? sessionToSnapshotPair(source))
  const nextPair = normalizeSnapshotPair(pair)
  if (getMasterDataSnapshotValidationErrors(nextPair.reference).length > 0 ||
    getMasterDataSnapshotValidationErrors(nextPair.current).length > 0) return undefined

  const customMasterData = createEmptyCustomMasterData(source.id)
  const customWorking = source.customMasterData ?? customMasterData
  const customSizingChanged = Object.keys(source.customDatasetSizing ?? {}).length > 0
  const pairChanged = JSON.stringify(beforePair) !== JSON.stringify(nextPair)
  const customChanged = JSON.stringify(customWorking) !== JSON.stringify(customMasterData) || customSizingChanged
  if (!pairChanged && !customChanged) return undefined

  const updated = applySnapshotPairToSession({
    ...source,
    datasetSizing: {
      reference: { ...(nextPair.reference.sizing ?? { wcCount: nextPair.reference.rates.length, bomCount: nextPair.reference.bom.length, routingCount: nextPair.reference.routing.length }) },
      current: { ...(nextPair.current.sizing ?? { wcCount: nextPair.current.rates.length, bomCount: nextPair.current.bom.length, routingCount: nextPair.current.routing.length }) }
    },
    customMasterData,
    customDatasetSizing: {},
    preparedSnapshotRoles: { ...getSnapshotRoleReadiness(source), reference: true, current: true },
    updatedAt: now
  }, nextPair)

  return markMasterDataChangedForSnapshotPair(updated, beforePair, nextPair)
}
