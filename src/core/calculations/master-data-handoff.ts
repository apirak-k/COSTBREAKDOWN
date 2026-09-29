import type { ProductSession, SnapshotPair, SnapshotRoleReadiness } from '../types'

export interface MasterDataHandoffStatus {
  referenceReady: boolean
  currentReady: boolean
  datasetsPrepared: boolean
  issues: string[]
  warnings?: string[]
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
 * Reports which sides have been prepared and warns about a Product mismatch.
 * Preparation is informational; missing inputs remain visible in Cost Breakdown.
 */
export function evaluateMasterDataHandoff(
  session: Pick<ProductSession, 'snapshotPairMode' | 'snapshotPair' | 'preparedSnapshotRoles'>,
  pair: SnapshotPair
): MasterDataHandoffStatus {
  const readiness = getSnapshotRoleReadiness(session)
  const issues: string[] = []
  const warnings: string[] = []

  ;(['reference', 'current'] as const).forEach(role => {
    const label = roleLabels[role]
    const snapshotCode = pair[role].product.productCode.trim()

    if (!readiness[role]) {
      issues.push(`${label} dataset is not prepared yet.`)
    }

    if (!snapshotCode) {
      warnings.push(`${label} Product Code is not specified.`)
    }
  })

  // Product Code is the primary identity. Fall back to Product Name only when
  // both datasets cannot be compared by Product Code.
  const refCode = pair.reference.product.productCode.trim()
  const curCode = pair.current.product.productCode.trim()
  const refName = pair.reference.product.productDescription.trim()
  const curName = pair.current.product.productDescription.trim()

  if (refCode && curCode) {
    if (normalized(refCode) !== normalized(curCode)) {
      warnings.push(`Product mismatch: Reference is "${refCode}" while Current is "${curCode}".`)
    }
  } else if (refName && curName && normalized(refName) !== normalized(curName)) {
    warnings.push(`Product mismatch: Reference is "${refName}" while Current is "${curName}".`)
  }

  return {
    referenceReady: readiness.reference,
    currentReady: readiness.current,
    datasetsPrepared: issues.length === 0,
    issues,
    warnings
  }
}
