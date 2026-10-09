import { RefObject, useEffect } from 'react'

export interface WarningNavigationTarget {
  requestId: number
  rowId: string
  field: string
}

export function useWarningNavigationFocus(
  tableRef: RefObject<HTMLTableElement | null>,
  searchQuery: string,
  setSearchQuery: (value: string) => void,
  target: WarningNavigationTarget | undefined,
  selectRow: (rowId: string) => void,
  onNavigationHandled: (requestId: number) => void
): void {
  useEffect(() => {
    if (target) setSearchQuery('')
  }, [target?.requestId, setSearchQuery])

  useEffect(() => {
    if (!target || searchQuery) return
    const frame = requestAnimationFrame(() => {
      const table = tableRef.current
      if (!table) return
      const row = [...table.querySelectorAll<HTMLElement>('[data-master-data-row-id]')]
        .find(element => element.dataset.masterDataRowId === target.rowId)
      if (!row) return
      const field = [...table.querySelectorAll<HTMLElement>('[data-grid-row-id][data-grid-field]')]
        .find(element => element.dataset.gridRowId === target.rowId && element.dataset.gridField === target.field)
      const focusTarget = field ?? row
      focusTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })
      selectRow(target.rowId)
      focusTarget.focus({ preventScroll: true })
      row.classList.add('outline', 'outline-2', 'outline-amber-500', 'outline-offset-[-2px]')
      setTimeout(() => {
        row.classList.remove('outline', 'outline-2', 'outline-amber-500', 'outline-offset-[-2px]')
      }, 1800)
      onNavigationHandled(target.requestId)
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [target, searchQuery, tableRef, selectRow, onNavigationHandled])
}
