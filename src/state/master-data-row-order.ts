export function moveSnapshotRows<T extends { id: string }>(
  rows: T[],
  movingIds: string[],
  targetId: string,
  position: 'before' | 'after'
): T[] {
  const requestedIds = new Set(movingIds)
  const movingRows = rows.filter(row => requestedIds.has(row.id))
  if (movingRows.length === 0 || requestedIds.has(targetId) || !rows.some(row => row.id === targetId)) return rows

  const movingRowIds = new Set(movingRows.map(row => row.id))
  const remainingRows = rows.filter(row => !movingRowIds.has(row.id))
  const targetIndex = remainingRows.findIndex(row => row.id === targetId)
  if (targetIndex < 0) return rows
  remainingRows.splice(targetIndex + (position === 'after' ? 1 : 0), 0, ...movingRows)
  return remainingRows
}
