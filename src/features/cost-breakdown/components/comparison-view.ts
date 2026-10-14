import { getCanonicalComparisonStatus, getComparisonFindingKey, safeAdd } from '../../../core'
import type { ComparisonFinding, ComparisonStatus, CostComparison, SelectedComparisonSelection } from '../../../core'

export type ComparisonViewMode = readonly ComparisonStatus[]

export type ComparisonSortMode = 'gap-desc' | 'gap-asc' | 'absolute-gap-desc'

export const COMPARISON_SORT_OPTIONS: ReadonlyArray<{ value: ComparisonSortMode; label: string }> = [
  { value: 'gap-desc', label: 'Gap High → Low' },
  { value: 'gap-asc', label: 'Gap Low → High' },
  { value: 'absolute-gap-desc', label: '|Gap| High → Low' }
]

export const DEFAULT_COMPARISON_SORT_MODE: ComparisonSortMode = 'absolute-gap-desc'

export function getComparisonSortLabel(mode: ComparisonSortMode): string {
  return COMPARISON_SORT_OPTIONS.find(option => option.value === mode)?.label ?? '|Gap| High → Low'
}

export interface SortableComparisonRow {
  key: string
  gap: number | null
}

/** Sorts one existing section; callers keep BOM and Routing sections separate. */
export function sortComparisonRows<T extends SortableComparisonRow>(rows: readonly T[], mode: ComparisonSortMode): T[] {
  return [...rows].sort((left, right) => {
    const leftAvailable = left.gap !== null && Number.isFinite(left.gap)
    const rightAvailable = right.gap !== null && Number.isFinite(right.gap)
    if (!leftAvailable || !rightAvailable) {
      if (leftAvailable) return -1
      if (rightAvailable) return 1
      return left.key.localeCompare(right.key)
    }

    const leftGap = left.gap as number
    const rightGap = right.gap as number
    const difference = mode === 'gap-desc'
      ? rightGap - leftGap
      : mode === 'gap-asc'
        ? leftGap - rightGap
        : Math.abs(rightGap) - Math.abs(leftGap)
    return difference || left.key.localeCompare(right.key)
  })
}

export const ALL_COMPARISON_STATUSES: readonly ComparisonStatus[] = ['UNCHANGED', 'CHANGED', 'ADDED', 'REMOVED']

export function areAllComparisonStatusesSelected(selectedStatuses: readonly ComparisonStatus[]): boolean {
  return ALL_COMPARISON_STATUSES.every(status => selectedStatuses.includes(status))
}

export function getComparisonViewLabel(selectedStatuses: readonly ComparisonStatus[]): string {
  if (areAllComparisonStatusesSelected(selectedStatuses)) return 'All'
  if (selectedStatuses.length === 0) return 'None'
  return selectedStatuses.map(status => status[0] + status.slice(1).toLowerCase()).join(' + ')
}

export function getComparisonStatusControlLabel(selectedStatuses: readonly ComparisonStatus[]): string {
  return areAllComparisonStatusesSelected(selectedStatuses) ? 'Status (All)' : `Status (${selectedStatuses.length})`
}

function sumAvailable(values: readonly (number | null | undefined)[]): number | null {
  let total = 0
  for (const value of values) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null
    const nextTotal = safeAdd(total, value)
    if (nextTotal === null) return null
    total = nextTotal
  }
  return total
}

/**
 * Returns selected contributions from existing finding and Work Center calculations.
 * Empty selection branches are real zero; unavailable selected finding effects stay unavailable.
 */
export function getSelectedComparisonContribution(
  fullComparison: CostComparison,
  selectedComparison: CostComparison,
  selection: SelectedComparisonSelection
): { elementGaps: CostComparison['elementGaps']; totalGap: number | null } {
  const selectedBOMKeys = new Set(selection.bomFindingKeys)
  const selectedBOMFindings = fullComparison.bomFindings.filter(finding =>
    selectedBOMKeys.has(getComparisonFindingKey('bom', finding))
  )
  const material = selection.bomFindingKeys.length === 0
    ? 0
    : selectedBOMFindings.length === selectedBOMKeys.size
      ? sumAvailable(selectedBOMFindings.map(finding => finding.costEffect?.gap.material))
      : null

  const selectedRoutingGaps = selectedComparison.processingFindings
  const labor = selection.routingFindingKeys.length === 0
    ? 0
    : selectedRoutingGaps.length > 0
      ? sumAvailable(selectedRoutingGaps.map(finding => finding.costEffect.gap.labor))
      : null
  const burden = selection.routingFindingKeys.length === 0
    ? 0
    : selectedRoutingGaps.length > 0
      ? sumAvailable(selectedRoutingGaps.map(finding => finding.costEffect.gap.burden))
      : null

  return {
    elementGaps: { material, labor, burden },
    totalGap: material === null || labor === null || burden === null
      ? null
      : safeAdd(material, labor, burden)
  }
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
