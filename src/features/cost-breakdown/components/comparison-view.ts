import { getCanonicalComparisonStatus } from '../../../core'
import type { ComparisonFinding, ComparisonStatus } from '../../../core'

export type ComparisonViewMode = readonly ComparisonStatus[]

export const ALL_COMPARISON_STATUSES: readonly ComparisonStatus[] = ['UNCHANGED', 'CHANGED', 'ADDED', 'REMOVED']

export function areAllComparisonStatusesSelected(selectedStatuses: readonly ComparisonStatus[]): boolean {
  return ALL_COMPARISON_STATUSES.every(status => selectedStatuses.includes(status))
}

export function getComparisonViewLabel(selectedStatuses: readonly ComparisonStatus[]): string {
  if (areAllComparisonStatusesSelected(selectedStatuses)) return 'All'
  if (selectedStatuses.length === 0) return 'None'
  return selectedStatuses.map(status => status[0] + status.slice(1).toLowerCase()).join(' + ')
}

export function isOnlyComparisonStatus(
  selectedStatuses: readonly ComparisonStatus[],
  status: ComparisonStatus
): boolean {
  return selectedStatuses.length === 1 && selectedStatuses[0] === status
}

export function isVisibleInComparisonView(
  finding: ComparisonFinding | undefined,
  selectedStatuses: ComparisonViewMode
): boolean {
  if (areAllComparisonStatusesSelected(selectedStatuses)) return true
  const status = getCanonicalComparisonStatus(finding)
  return status !== null && selectedStatuses.includes(status)
}
