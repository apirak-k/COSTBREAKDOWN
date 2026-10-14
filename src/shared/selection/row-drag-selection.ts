export function applyRowDragSelection(
  current: ReadonlySet<string>,
  traversedIds: readonly string[],
  selected: boolean
): Set<string> {
  const next = new Set(current)

  traversedIds.forEach(id => {
    if (selected) next.add(id)
    else next.delete(id)
  })

  return next
}
