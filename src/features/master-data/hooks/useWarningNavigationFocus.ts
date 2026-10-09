import { RefObject, useEffect } from 'react'

export interface WarningNavigationTarget {
  requestId: number
  rowId: string
  field: string
}

export function useWarningNavigationFocus(
  tableRef: RefObject<HTMLTableElement | null>,
  searchTerm: string,
  setSearchTerm: (value: string) => void,
  target: WarningNavigationTarget | undefined
): void {
  useEffect(() => {
    if (target) setSearchTerm('')
  }, [target?.requestId, setSearchTerm])

  useEffect(() => {
    if (!target || searchTerm) return
    let removeHighlight: ReturnType<typeof setTimeout> | undefined
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
      focusTarget.focus({ preventScroll: true })
      row.classList.add('outline', 'outline-2', 'outline-amber-500', 'outline-offset-[-2px]')
      removeHighlight = setTimeout(() => {
        row.classList.remove('outline', 'outline-2', 'outline-amber-500', 'outline-offset-[-2px]')
      }, 1800)
    })

    return () => {
      cancelAnimationFrame(frame)
      if (removeHighlight) clearTimeout(removeHighlight)
    }
  }, [target, searchTerm, tableRef])
}
