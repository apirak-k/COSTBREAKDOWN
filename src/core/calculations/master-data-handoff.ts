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
    const snapshotName = (pair[role].product.productName || pair[role].product.productDescription).trim()

    if (!readiness[role]) {
      issues.push(`${label} dataset is not prepared yet.`)
    }

    if (!snapshotName) {
      warnings.push(`${label} Product Name is not specified.`)
    }
  })

  const refName = (pair.reference.product.productName || pair.reference.product.productDescription).trim()
  const curName = (pair.current.product.productName || pair.current.product.productDescription).trim()

  if (refName && curName && normalized(refName) !== normalized(curName)) {
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
