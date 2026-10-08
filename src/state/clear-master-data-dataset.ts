import {
  applySnapshotPairToSession,
  getSnapshotRoleReadiness,
  sessionToSnapshotPair
} from '../core'
import type { CostSnapshot, MasterDataRole, ProductSession } from '../core'
import { emptyProductMaster } from './seed-data'
import { markMasterDataChanged } from './master-data-revision'

export function clearMasterDataDatasetState(session: ProductSession, role: MasterDataRole): ProductSession {
  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  const emptySnapshot: CostSnapshot = {
    id: `${session.id}:${role}`,
    product: { ...emptyProductMaster },
    effectiveDate: '',
    sourceRef: `Empty dataset (${role})`,
    ...(role === 'custom' ? {} : { comparisonRole: role }),
    status: 'draft',
    remark: '',
    rates: [],
    bom: [],
    routing: [],
    sizing: undefined
  }
  if (role === 'custom') {
    return {
      ...session,
      customMasterData: emptySnapshot,
      customDatasetSizing: {},
      updatedAt: new Date().toISOString()
    }
  }
  const nextPair = {
    ...pair,
    [role]: emptySnapshot
  }
  const nextSizing = {
    reference: session.datasetSizing?.reference ?? {},
    current: session.datasetSizing?.current ?? {},
    [role]: {}
  }

  const updated = markMasterDataChanged(applySnapshotPairToSession({
    ...session,
    datasetSizing: nextSizing,
    preparedSnapshotRoles: {
      ...getSnapshotRoleReadiness(session),
      [role]: false
    },
    updatedAt: new Date().toISOString()
  }, nextPair))

  // The legacy session projection represents Current. Do not let Reference's
  // fallback Product repopulate a Current dataset that was explicitly cleared.
  return role === 'current' ? { ...updated, product: { ...emptyProductMaster } } : updated
}
