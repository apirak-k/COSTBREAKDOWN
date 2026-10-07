import { CanonicalComparisonStatus, ComparisonFinding } from '../types'

/** The four canonical comparison statuses per Section 4 of COSTBREAKDOWN_COMPARISON_PRINCIPLES.md */
export type { CanonicalComparisonStatus } from '../types'
export type ComparisonStatus = CanonicalComparisonStatus

/**
 * Returns the exact canonical comparison status (UNCHANGED, CHANGED, ADDED, REMOVED).
 * Missing data prevents a canonical status; other validation warnings remain separate.
 */
export function getCanonicalComparisonStatus(finding: ComparisonFinding | undefined): CanonicalComparisonStatus | null {
  if (!finding || finding.confidence === 'missing') return null
  if (finding.matchStatus === 'added') return 'ADDED'
  if (finding.matchStatus === 'removed') return 'REMOVED'
  if (finding.matchStatus === 'matched') {
    const hasFieldChanges = Object.keys(finding.fieldDiffs).length > 0
    const hasFlagChanges = Boolean(
      finding.changeFlags.reordered ||
      finding.changeFlags.movedWorkCenter ||
      finding.changeFlags.changedInputs ||
      finding.changeFlags.changedRate
    )
    return (hasFieldChanges || hasFlagChanges) ? 'CHANGED' : 'UNCHANGED'
  }
  return null
}

/** Returns only a contract status. Unmatched/ambiguous validation is reported separately. */
export function getComparisonStatusLabels(finding: ComparisonFinding | undefined): ComparisonStatus[] {
  const status = getCanonicalComparisonStatus(finding)
  return status ? [status] : []
}
