import { ComparisonFinding } from '../types'

/** The four canonical comparison statuses per Section 4 of COSTBREAKDOWN_COMPARISON_PRINCIPLES.md */
export type CanonicalComparisonStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED'

export type ComparisonStatus =
  | 'Unchanged'
  | 'Modified'
  | 'Added'
  | 'Removed'
  | 'Reordered'
  | 'Moved Work Center'
  | 'Need Review'

/**
 * Returns the exact canonical comparison status (UNCHANGED, CHANGED, ADDED, REMOVED).
 * Note: Validation warnings (like ambiguous keys or missing required data) are separate from status.
 */
export function getCanonicalComparisonStatus(finding: ComparisonFinding | undefined): CanonicalComparisonStatus {
  if (!finding) return 'UNCHANGED'
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
  return 'UNCHANGED'
}

/** Maps comparison facts to the vocabulary shown in UI tables and badges. */
export function getComparisonStatusLabels(finding: ComparisonFinding | undefined): ComparisonStatus[] {
  if (!finding) return ['Need Review']
  if (finding.matchStatus === 'added') return ['Added']
  if (finding.matchStatus === 'removed') return ['Removed']
  if (finding.matchStatus !== 'matched') return ['Need Review']

  const labels: ComparisonStatus[] = []
  if (finding.changeFlags.reordered) labels.push('Reordered')
  if (finding.changeFlags.movedWorkCenter) labels.push('Moved Work Center')
  if (finding.reviewRequired) labels.push('Need Review')
  if (Object.keys(finding.fieldDiffs).length > 0 || finding.changeFlags.changedInputs || finding.changeFlags.changedRate) {
    labels.push('Modified')
  }
  return labels.length > 0 ? labels : ['Unchanged']
}
