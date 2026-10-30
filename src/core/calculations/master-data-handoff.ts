import type { ProductSession, SnapshotPair, SnapshotRoleReadiness } from '../types'
import { isProductIdentityMismatch } from '../utils/master-data-effective'

export interface MasterDataHandoffStatus {
  referenceReady: boolean
  currentReady: boolean
  datasetsPrepared: boolean
  issues: string[]
  warnings?: string[]
  productMismatch: boolean
}

const roleLabels = {
  reference: 'Reference',
  current: 'Current'
} as const

/**
 * Returns persisted readiness, with a safe migration default for sessions
 * created before explicit role readiness existed.
 */
export function getSnapshotRoleReadiness(
  session: Pick<ProductSession, 'snapshotPairMode' | 'snapshotPair' | 'preparedSnapshotRoles'>
): SnapshotRoleReadiness {
  const legacyIndependentPair = session.snapshotPairMode === 'independent' && Boolean(session.snapshotPair)

  return {
    reference: session.preparedSnapshotRoles?.reference ?? legacyIndependentPair,
    current: session.preparedSnapshotRoles?.current ?? legacyIndependentPair
  }
}

/**
 * Reports which sides have been prepared and exposes Product Mismatch as status.
 * Preparation is informational; missing inputs remain visible in Cost Breakdown.
 */
export function evaluateMasterDataHandoff(
  session: Pick<ProductSession, 'snapshotPairMode' | 'snapshotPair' | 'preparedSnapshotRoles'>,
  pair: SnapshotPair
): MasterDataHandoffStatus {
  const readiness = getSnapshotRoleReadiness(session)
  const issues: string[] = []

  ;(['reference', 'current'] as const).forEach(role => {
    const label = roleLabels[role]
    if (!readiness[role]) {
      issues.push(`${label} dataset is not prepared yet.`)
    }
  })

  const productMismatch = isProductIdentityMismatch(pair.reference.product, pair.current.product)

  return {
    referenceReady: readiness.reference,
    currentReady: readiness.current,
    datasetsPrepared: issues.length === 0,
    issues,
    warnings: [],
    productMismatch
  }
}
