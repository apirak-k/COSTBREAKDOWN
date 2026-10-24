import { clearMasterDataDirectEdits } from './master-data-direct-edits'
import {
  applySnapshotPairToSession,
  getSnapshotRoleReadiness,
  sessionToSnapshotPair
} from '../core'
import type { CostSnapshot, MasterDataRole, ProductSession } from '../core'
import { emptyProductMaster } from './seed-data'
import { markMasterDataChanged } from './master-data-revision'
import { getMasterDataSnapshot } from './master-data-datasets'

function clearSnapshotValues(snapshot: CostSnapshot, role: MasterDataRole): CostSnapshot {
  return {
    ...snapshot,
    product: { ...emptyProductMaster },
    effectiveDate: '',
    sourceRef: '',
    ...(role === 'custom' ? { comparisonRole: undefined } : { comparisonRole: role }),
    remark: '',
    rates: snapshot.rates.map(({ isGeneratedBusinessIdentity: _generated, autoRenamedFrom: _renamed, ...row }) => ({
      ...row,
      workCenterCode: '',
      description: '',
      laborRate: null,
      burdenRate: null,
      exactDecimalInputs: undefined,
      effectiveDate: '',
      note: undefined,
      sourceRef: undefined,
      confidence: {},
      additionalFields: undefined
    })),
    bom: snapshot.bom.map(({ isGeneratedBusinessIdentity: _generated, autoRenamedFrom: _renamed, ...row }) => ({
      ...row,
      itemCode: '',
      description: '',
      consumption: null,
      unit: '',
      price: null,
      loss: null,
      exactDecimalInputs: undefined,
      note: undefined,
      sourceRef: undefined,
      confidence: {},
      additionalFields: undefined
    })),
    routing: snapshot.routing.map(({ isGeneratedBusinessIdentity: _generated, autoRenamedFrom: _renamed, ...row }) => ({
      ...row,
      operationCode: undefined,
      processCode: undefined,
      processName: '',
      workCenterId: undefined,
      manning: null,
      capacity: null,
      yield: null,
      exactDecimalInputs: undefined,
      note: undefined,
      sourceRef: undefined,
      confidence: {},
      additionalFields: undefined
    })),
    additionalFields: undefined,
    warnings: undefined
  }
}

export function clearMasterDataDatasetState(session: ProductSession, role: MasterDataRole): ProductSession {
  session = clearMasterDataDirectEdits(session, [role])
  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  const clearedSnapshot = clearSnapshotValues(getMasterDataSnapshot(session, pair, role), role)
  if (role === 'custom') {
    return markMasterDataChanged({
      ...session,
      customMasterData: clearedSnapshot,
      updatedAt: new Date().toISOString()
    })
  }

  const nextPair = { ...pair, [role]: clearedSnapshot }
  const updated = applySnapshotPairToSession({
    ...session,
    preparedSnapshotRoles: {
      ...getSnapshotRoleReadiness(session),
      [role]: false
    },
    updatedAt: new Date().toISOString()
  }, nextPair)
  const marked = markMasterDataChanged(updated)
  // Current's legacy product projection otherwise falls back to Reference metadata.
  return role === 'current' ? { ...marked, product: { ...emptyProductMaster } } : marked
}

export function clearAllMasterDataWorkingState(session: ProductSession): ProductSession {
  return (['reference', 'current', 'custom'] as const)
    .reduce((working, role) => clearMasterDataDatasetState(working, role), session)
}
