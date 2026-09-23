import type { ProductSession, SnapshotPair, SnapshotRoleReadiness } from '../types'

export interface MasterDataHandoffStatus {
  productCode: string
  referenceReady: boolean
  currentReady: boolean
  canCompare: boolean
  issues: string[]
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
 * Describes whether Master Data has a trustworthy Reference/Current pair for
 * the selected product before Cost Breakdown is allowed to calculate.
 */
export function evaluateMasterDataHandoff(
  session: Pick<ProductSession, 'product' | 'snapshotPairMode' | 'snapshotPair' | 'preparedSnapshotRoles'>,
  pair: SnapshotPair
): MasterDataHandoffStatus {
  const productCode = session.product.productCode.trim()
  const readiness = getSnapshotRoleReadiness(session)
  const issues: string[] = []

  if (!productCode) {
    issues.push('Header Product Code is required.')
  }

  ;(['reference', 'current'] as const).forEach(role => {
    const label = roleLabels[role]
    const snapshotCode = pair[role].product.productCode.trim()

    if (!readiness[role]) {
      issues.push(`${label} dataset is not prepared yet.`)
    }

    if (!snapshotCode) {
      issues.push(`${label} Product Code is missing.`)
    } else if (productCode && normalized(snapshotCode) !== normalized(productCode)) {
      issues.push(`${label} Product Code does not match the Header Product (${productCode}).`)
    }
  })

  return {
    productCode,
    referenceReady: readiness.reference,
    currentReady: readiness.current,
    canCompare: issues.length === 0,
    issues
  }
}
