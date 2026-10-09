import type { ProductSession, SnapshotPair, SnapshotRoleReadiness } from '../types'

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

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
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

  const refName = pair.reference.product.productName?.trim() ?? ''
  const curName = pair.current.product.productName?.trim() ?? ''
  const productMismatch = normalized(refName) !== normalized(curName)

  return {
    referenceReady: readiness.reference,
    currentReady: readiness.current,
    datasetsPrepared: issues.length === 0,
    issues,
    warnings: [],
    productMismatch
  }
}
