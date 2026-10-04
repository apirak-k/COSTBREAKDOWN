import { useEffect, useRef, useState } from 'react'

export interface SpreadsheetPasteCell {
  rowId: string
  field: string
  value: string
}

interface UseTableKeyboardNavOptions {
  tableRef: React.RefObject<HTMLTableElement | null>
  isEditMode: boolean
  onPasteCells?: (cells: SpreadsheetPasteCell[]) => void
  onUndo?: () => void
  onRedo?: () => void
}

type GridCell = HTMLElement
type GridMatrix = GridCell[][]

const cellKey = (rowId: string, field: string) => `${rowId}\u001f${field}`
export const tableCellKey = cellKey

function getCellKey(cell: GridCell): string | null {
  const { gridRowId, gridField } = cell.dataset
  return gridRowId && gridField ? cellKey(gridRowId, gridField) : null
}

function getGridMatrix(table: HTMLTableElement): GridMatrix {
  return Array.from(table.querySelectorAll('tbody tr')).map(row =>
    Array.from(row.querySelectorAll<HTMLElement>('[data-grid-cell="true"]'))
  ).filter(row => row.length > 0)
}

function locateCell(matrix: GridMatrix, key: string): { row: number; column: number } | null {
  for (let row = 0; row < matrix.length; row += 1) {
    const column = matrix[row].findIndex(cell => getCellKey(cell) === key)
    if (column >= 0) return { row, column }
  }
  return null
}

function cellValue(cell: GridCell): string {
  if (cell instanceof HTMLSelectElement || cell instanceof HTMLInputElement || cell instanceof HTMLTextAreaElement) {
    return cell.value
  }
  return ''
}

function parseClipboardMatrix(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines.map(line => line.split('\t'))
}

export function useTableKeyboardNav({
  tableRef,
  isEditMode,
  onPasteCells,
  onUndo,
  onRedo
}: UseTableKeyboardNavOptions) {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(new Set())
  const selectedCellKeysRef = useRef<Set<string>>(new Set())
  const selectionAnchor = useRef<string | null>(null)
  const isSelectingCells = useRef(false)
  const handlersRef = useRef({ onPasteCells, onUndo, onRedo })
  handlersRef.current = { onPasteCells, onUndo, onRedo }

  useEffect(() => {
    if (!isEditMode) {
      selectedCellKeysRef.current = new Set()
      setSelectedCellKeys(new Set())
      return
    }

    const table = tableRef.current
    if (!table) return

    const setRange = (anchorKey: string, targetKey: string) => {
      const matrix = getGridMatrix(table)
      const anchor = locateCell(matrix, anchorKey) || locateCell(matrix, targetKey)
      const target = locateCell(matrix, targetKey)
      if (!anchor || !target) return
      const rowMin = Math.min(anchor.row, target.row)
      const rowMax = Math.max(anchor.row, target.row)
      const columnMin = Math.min(anchor.column, target.column)
      const columnMax = Math.max(anchor.column, target.column)
      const next = new Set<string>()
      for (let row = rowMin; row <= rowMax; row += 1) {
        for (let column = columnMin; column <= columnMax; column += 1) {
          const key = getCellKey(matrix[row]?.[column])
          if (key) next.add(key)
        }
      }
      selectedCellKeysRef.current = next
      setSelectedCellKeys(next)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      if (!cell || !key || !table.contains(cell)) return
      selectionAnchor.current = key
      isSelectingCells.current = true
      setRange(key, key)
    }

    const handleMouseOver = (event: MouseEvent) => {
      if (!isSelectingCells.current || !selectionAnchor.current) return
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      if (cell && key && table.contains(cell)) setRange(selectionAnchor.current, key)
    }

    const handleMouseUp = () => { isSelectingCells.current = false }

    const moveFocus = (cell: GridCell | undefined) => {
      if (!cell) return false
      const key = getCellKey(cell)
      if (key) {
        selectionAnchor.current = key
        setRange(key, key)
      }
      cell.focus()
      if (cell instanceof HTMLInputElement && cell.type === 'number') cell.select()
      return true
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      if (!cell || !table.contains(cell)) return

      const isCommand = event.ctrlKey || event.metaKey
      if (isCommand && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handlersRef.current.onRedo?.()
        else handlersRef.current.onUndo?.()
        return
      }
      if (isCommand && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handlersRef.current.onRedo?.()
        return
      }

      if (event.key === 'Escape') {
        target?.blur()
        selectionAnchor.current = null
        isSelectingCells.current = false
        selectedCellKeysRef.current = new Set()
        setSelectedCellKeys(new Set())
        return
      }

      const matrix = getGridMatrix(table)
      const key = getCellKey(cell)
      if (!key) return
      const location = key ? locateCell(matrix, key) : null
      if (!location) return

      if (event.shiftKey && event.key.startsWith('Arrow')) {
        if (cell instanceof HTMLSelectElement && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return
        const rowDelta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
        const columnDelta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        const next = matrix[location.row + rowDelta]?.[location.column + columnDelta]
        if (!next) return
        event.preventDefault()
        const anchor = selectionAnchor.current || key
        const nextKey = getCellKey(next)
        if (!nextKey) return
        setRange(anchor, nextKey)
        next.focus()
        return
      }

      let rowDelta = 0
      let columnDelta = 0
      if (event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey)) rowDelta = -1
      else if (event.key === 'ArrowDown' || event.key === 'Enter') rowDelta = 1
      else if (event.key === 'ArrowLeft' || (event.key === 'Tab' && event.shiftKey)) columnDelta = -1
      else if (event.key === 'ArrowRight' || event.key === 'Tab') columnDelta = 1
      else return

      if (cell instanceof HTMLSelectElement && event.key.startsWith('Arrow') && !event.shiftKey) return
      const next = matrix[location.row + rowDelta]?.[location.column + columnDelta]
      if (moveFocus(next)) event.preventDefault()
    }

    const handleCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      const activeCell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      if (!activeCell || !table.contains(activeCell) || !event.clipboardData) return
      const matrix = getGridMatrix(table)
      const selected = selectedCellKeysRef.current
      const positions: Array<{ row: number; column: number }> = []
      matrix.forEach((row, rowIndex) => row.forEach((candidate, columnIndex) => {
        const candidateKey = getCellKey(candidate)
        if (candidateKey && selected.has(candidateKey)) positions.push({ row: rowIndex, column: columnIndex })
      }))

      if (positions.length > 1) {
        const rowMin = Math.min(...positions.map(position => position.row))
        const rowMax = Math.max(...positions.map(position => position.row))
        const columnMin = Math.min(...positions.map(position => position.column))
        const columnMax = Math.max(...positions.map(position => position.column))
        const text = matrix.slice(rowMin, rowMax + 1).map(row =>
          row.slice(columnMin, columnMax + 1).map(cellValue).join('\t')
        ).join('\n')
        event.clipboardData.setData('text/plain', text)
        event.preventDefault()
        return
      }

      if (activeCell instanceof HTMLInputElement && activeCell.selectionStart !== activeCell.selectionEnd) return
      event.clipboardData.setData('text/plain', cellValue(activeCell))
      event.preventDefault()
    }

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      const activeCell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      if (!activeCell || !table.contains(activeCell) || !event.clipboardData) return
      const callback = handlersRef.current.onPasteCells
      if (!callback) return
      const matrix = getGridMatrix(table)
      const startKey = getCellKey(activeCell)
      const start = startKey ? locateCell(matrix, startKey) : null
      if (!start) return
      const clipboardMatrix = parseClipboardMatrix(event.clipboardData.getData('text/plain'))
      const cells: SpreadsheetPasteCell[] = []
      const selected = selectedCellKeysRef.current

      if (clipboardMatrix.length === 1 && clipboardMatrix[0].length === 1 && selected.size > 1) {
        matrix.forEach(row => row.forEach(candidate => {
          const key = getCellKey(candidate)
          if (!key || !selected.has(key)) return
          const { gridRowId, gridField } = candidate.dataset
          if (gridRowId && gridField) cells.push({ rowId: gridRowId, field: gridField, value: clipboardMatrix[0][0] })
        }))
      } else {
        clipboardMatrix.forEach((pasteRow, rowOffset) => pasteRow.forEach((value, columnOffset) => {
          const candidate = matrix[start.row + rowOffset]?.[start.column + columnOffset]
          if (!candidate) return
          const { gridRowId, gridField } = candidate.dataset
          if (gridRowId && gridField) cells.push({ rowId: gridRowId, field: gridField, value })
        }))
      }

      if (cells.length > 0) {
        event.preventDefault()
        callback(cells)
      }
    }

    table.addEventListener('mousedown', handleMouseDown)
    table.addEventListener('mouseover', handleMouseOver)
    table.addEventListener('keydown', handleKeyDown)
    table.addEventListener('copy', handleCopy)
    table.addEventListener('paste', handlePaste)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      table.removeEventListener('mousedown', handleMouseDown)
      table.removeEventListener('mouseover', handleMouseOver)
      table.removeEventListener('keydown', handleKeyDown)
      table.removeEventListener('copy', handleCopy)
      table.removeEventListener('paste', handlePaste)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isEditMode, tableRef])

  return { selectedCellKeys }
}
