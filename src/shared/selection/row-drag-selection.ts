export type RowSelectionState = 'none' | 'mixed' | 'all'

export function getRowSelectionState(
  current: ReadonlySet<string>,
  scope: readonly string[]
): RowSelectionState {
  const applicableIds = new Set(scope)
  if (applicableIds.size === 0) return 'none'
  let selectedCount = 0
  applicableIds.forEach(id => { if (current.has(id)) selectedCount += 1 })
  if (selectedCount === 0) return 'none'
  return selectedCount === applicableIds.size ? 'all' : 'mixed'
}

export function applyRowSelectionScope(
  current: ReadonlySet<string>,
  scope: readonly string[],
  selected: boolean
): Set<string> {
  const next = new Set(current)

  scope.forEach(id => {
    if (selected) next.add(id)
    else next.delete(id)
  })

  return next
}

export function applyRowDragSelection(
  current: ReadonlySet<string>,
  traversedIds: readonly string[],
  selected: boolean
): Set<string> {
  return applyRowSelectionScope(current, traversedIds, selected)
}
