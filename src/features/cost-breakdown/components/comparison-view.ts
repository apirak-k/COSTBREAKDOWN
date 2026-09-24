import { getCanonicalComparisonStatus } from '../../../core'
import type { ComparisonFinding } from '../../../core'

export type ComparisonViewMode = 'all' | 'changed' | 'added' | 'removed' | 'unchanged'

export function findingNeedsReview(finding: ComparisonFinding | undefined): boolean {
  if (!finding) return false
  const status = getCanonicalComparisonStatus(finding)
  return status !== 'UNCHANGED' || finding.confidence !== 'verified'
}

export function isVisibleInComparisonView(
  finding: ComparisonFinding | undefined,
  viewMode: ComparisonViewMode
): boolean {
  if (viewMode === 'all') return true
  const status = getCanonicalComparisonStatus(finding)
  if (viewMode === 'changed') return status === 'CHANGED' || status === 'ADDED' || status === 'REMOVED' || findingNeedsReview(finding)
  if (viewMode === 'added') return status === 'ADDED'
  if (viewMode === 'removed') return status === 'REMOVED'
  if (viewMode === 'unchanged') return status === 'UNCHANGED'
  return true
}
