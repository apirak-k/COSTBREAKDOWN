import { getComparisonStatusLabels } from '../../../core'
import type { ComparisonFinding } from '../../../core'

export type ComparisonViewMode = 'all' | 'changed'

export function findingNeedsReview(finding: ComparisonFinding | undefined): boolean {
  if (finding?.confidence !== 'verified') return true
  return getComparisonStatusLabels(finding).some(label => label !== 'Unchanged')
}

export function isVisibleInComparisonView(
  finding: ComparisonFinding | undefined,
  viewMode: ComparisonViewMode
): boolean {
  return viewMode === 'all' || findingNeedsReview(finding)
}
