import type { ComparisonFinding } from '../../../core'

export type ComparisonViewMode = 'all' | 'changed'

export function findingNeedsReview(finding: ComparisonFinding | undefined): boolean {
  if (!finding) return true
  if (finding.matchStatus !== 'matched') return true
  if (finding.confidence !== 'verified') return true
  if (Object.keys(finding.fieldDiffs).length > 0) return true
  return Object.values(finding.changeFlags).some(Boolean)
}

export function isVisibleInComparisonView(
  finding: ComparisonFinding | undefined,
  viewMode: ComparisonViewMode
): boolean {
  return viewMode === 'all' || findingNeedsReview(finding)
}
