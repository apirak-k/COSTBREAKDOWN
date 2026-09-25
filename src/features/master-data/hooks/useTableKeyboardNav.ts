import { useEffect } from 'react'

interface UseTableKeyboardNavOptions {
  tableRef: React.RefObject<HTMLTableElement | null>
  isEditMode: boolean
}

/**
 * Enables Excel-like keyboard navigation:
 * - Arrow Up / Arrow Down moves focus vertically across inputs of the same column.
 * - Enter moves to the next row (same column).
 * - Escape blurs current input.
 */
export function useTableKeyboardNav({ tableRef, isEditMode }: UseTableKeyboardNavOptions) {
  useEffect(() => {
    if (!isEditMode) return
    const table = tableRef.current
    if (!table) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT'
      if (!isInput) return

      const cell = target.closest('td')
      const row = target.closest('tr')
      if (!cell || !row) return

      const colIndex = Array.from(row.children).indexOf(cell)
      const tbody = row.parentElement
      if (!tbody) return

      const allRows = Array.from(tbody.querySelectorAll('tr'))
      const rowIndex = allRows.indexOf(row)

      if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
        // If it's a select element and ArrowDown is pressed without Alt, native select opens options.
        // We only intercept when Ctrl/Meta or in text inputs, or handle predictably:
        if (target.tagName === 'SELECT' && e.key === 'ArrowDown') return

        if (rowIndex < allRows.length - 1) {
          const nextRow = allRows[rowIndex + 1]
          const targetCell = nextRow.children[colIndex]
          const targetInput = targetCell?.querySelector('input, select') as HTMLElement | null
          if (targetInput) {
            e.preventDefault()
            targetInput.focus()
            if (targetInput instanceof HTMLInputElement && targetInput.type !== 'checkbox') {
              targetInput.select()
            }
          }
        }
      } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
        if (target.tagName === 'SELECT' && e.key === 'ArrowUp') return

        if (rowIndex > 0) {
          const prevRow = allRows[rowIndex - 1]
          const targetCell = prevRow.children[colIndex]
          const targetInput = targetCell?.querySelector('input, select') as HTMLElement | null
          if (targetInput) {
            e.preventDefault()
            targetInput.focus()
            if (targetInput instanceof HTMLInputElement && targetInput.type !== 'checkbox') {
              targetInput.select()
            }
          }
        }
      } else if (e.key === 'Escape') {
        target.blur()
      }
    }

    table.addEventListener('keydown', handleKeyDown)
    return () => {
      table.removeEventListener('keydown', handleKeyDown)
    }
  }, [tableRef, isEditMode])
}
