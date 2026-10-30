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
      const mainContent = table.closest<HTMLElement>('#main-content')
      if (mainContent) {
        const stickyHeader = table.closest('section')?.querySelector<HTMLElement>('[data-sticky-table-header]')
        const stickyInset = stickyHeader
          ? Math.max(0, parseFloat(getComputedStyle(stickyHeader).top) || 0) + stickyHeader.getBoundingClientRect().height
          : 0
        const targetBounds = focusTarget.getBoundingClientRect()
        const mainBounds = mainContent.getBoundingClientRect()
        const availableHeight = mainContent.clientHeight - stickyInset
        const top = mainContent.scrollTop + targetBounds.top - mainBounds.top - stickyInset
          - Math.max(0, (availableHeight - targetBounds.height) / 2)
        // Limit centering to the content area; scrollIntoView also moves outer ancestors.
        mainContent.scrollTo({
          top: Math.max(0, Math.min(top, mainContent.scrollHeight - mainContent.clientHeight)),
          behavior: 'smooth'
        })

        const tableViewport = table.parentElement
        if (field && tableViewport) {
          const viewportBounds = tableViewport.getBoundingClientRect()
          const rowHeader = row.querySelector<HTMLElement>('th')
          const visibleLeft = viewportBounds.left + (rowHeader?.getBoundingClientRect().width ?? 0)
          const shift = targetBounds.left < visibleLeft ? targetBounds.left - visibleLeft
            : targetBounds.right > viewportBounds.right ? targetBounds.right - viewportBounds.right : 0
          if (shift) tableViewport.scrollTo({ left: tableViewport.scrollLeft + shift, behavior: 'smooth' })
        }
      }
      selectRow(target.rowId)
      focusTarget.focus({ preventScroll: true })
      onNavigationHandled(target.requestId)
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [target, searchQuery, tableRef, selectRow, onNavigationHandled])
}
