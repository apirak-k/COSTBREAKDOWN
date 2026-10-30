import type { ComparisonStatus } from '../../../core'
import { applyRowDragSelection } from '../../../shared/selection/row-drag-selection'
import type { ComparisonViewMode } from './comparison-view'

/** Apply one gesture's fixed selection intent without clearing the last status. */
export function applyStatusDragSelection(previous: ComparisonViewMode, crossed: readonly ComparisonStatus[], selected: boolean): ComparisonViewMode {
  let next = new Set<string>(previous)
  crossed.forEach(status => {
    if (!selected && next.size === 1 && next.has(status)) return
    next = applyRowDragSelection(next, [status], selected)
  })
  return [...next] as ComparisonStatus[]
}
