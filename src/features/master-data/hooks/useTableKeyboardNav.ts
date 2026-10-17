import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MASTER_DATA_CLEAR_CELL_FOCUS_EVENT } from '../../../shared/ui/transient-interactions'

export interface SpreadsheetPasteCell {
  rowId: string
  field: string
  value: string
}

interface UseTableKeyboardNavOptions {
  tableRef: React.RefObject<HTMLTableElement | null>
  isEditMode: boolean
  selectionScopeKey?: string
  selectionOwnerScopeKey?: string
  activeSelectionOwnerKey?: string | null
  onCellInteraction?: (field: string) => void
  rowIds?: readonly string[]
  onPasteCells?: (cells: SpreadsheetPasteCell[]) => void
  onCutCells?: (cells: SpreadsheetPasteCell[]) => void
  onUndo?: () => void
  onRedo?: () => void
}

type GridCell = HTMLElement
type GridMatrix = GridCell[][]

interface PendingCellPointer {
  pointerId: number
  startX: number
  startY: number
  anchorKey: string
  previousFocusedKey: string | null
  field: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  dragging: boolean
  crossedColumn: boolean
}

const CELL_KEY_SEPARATOR = '\u001f'
const CELL_DRAG_THRESHOLD = 4
const cellKey = (rowId: string, field: string) => `${rowId}${CELL_KEY_SEPARATOR}${field}`
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
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.map(line => line.split('\t'))
}

function rowIdFromCellKey(key: string): string {
  return key.slice(0, key.indexOf(CELL_KEY_SEPARATOR))
}

function fieldFromCellKey(key: string | null): string | null {
  if (!key) return null
  const separator = key.indexOf(CELL_KEY_SEPARATOR)
  return separator < 0 ? null : key.slice(separator + 1)
}

export function useTableKeyboardNav({
  tableRef,
  isEditMode,
  selectionScopeKey,
  selectionOwnerScopeKey,
  activeSelectionOwnerKey,
  onCellInteraction,
  rowIds,
  onPasteCells,
  onCutCells,
  onUndo,
  onRedo
}: UseTableKeyboardNavOptions) {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(new Set())
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null)
  const selectedCellKeysRef = useRef<Set<string>>(new Set())
  const focusedCellKeyRef = useRef<string | null>(null)
  const selectionAnchor = useRef<string | null>(null)
  const selectionField = useRef<string | null>(null)
  const focusedField = useRef<string | null>(null)
  const pendingCellPointer = useRef<PendingCellPointer | null>(null)
  const pendingMouseCell = useRef<PendingCellPointer | null>(null)
  const isEditModeRef = useRef(isEditMode)
  const handlersRef = useRef({ onPasteCells, onCutCells, onUndo, onRedo, onCellInteraction })
  const scopeRef = useRef(selectionScopeKey)
  isEditModeRef.current = isEditMode
  handlersRef.current = { onPasteCells, onCutCells, onUndo, onRedo, onCellInteraction }

  const clearCellSelection = (preservePendingPointer = false) => {
    selectionAnchor.current = null
    selectionField.current = null
    focusedField.current = null
    focusedCellKeyRef.current = null
    if (!preservePendingPointer) {
      pendingCellPointer.current = null
      pendingMouseCell.current = null
    }
    selectedCellKeysRef.current = new Set()
    setSelectedCellKeys(current => current.size === 0 ? current : new Set())
    setFocusedCellKey(null)
  }

  useLayoutEffect(() => {
    if (selectionScopeKey !== scopeRef.current) {
      scopeRef.current = selectionScopeKey
      clearCellSelection()
    }

    const ownsSelectionScope = Boolean(
      selectionOwnerScopeKey
      && activeSelectionOwnerKey?.startsWith(`${selectionOwnerScopeKey}:`)
    )
    if (selectionOwnerScopeKey && !ownsSelectionScope) clearCellSelection()
    if (!rowIds) return

    const currentIds = new Set(rowIds)
    const previousSelection = selectedCellKeysRef.current
    const nextSelection = new Set([...previousSelection].filter(key => currentIds.has(rowIdFromCellKey(key))))
    const selectionChanged = nextSelection.size !== previousSelection.size
    const previousFocus = focusedCellKeyRef.current
    const focusRemains = previousFocus ? currentIds.has(rowIdFromCellKey(previousFocus)) : false

    if (selectionChanged) {
      const next = nextSelection.size >= 2 ? nextSelection : new Set<string>()
      selectedCellKeysRef.current = next
      setSelectedCellKeys(next)

      if (nextSelection.size === 1) {
        const remainingKey = [...nextSelection][0]
        selectionAnchor.current = remainingKey
        selectionField.current = fieldFromCellKey(remainingKey)
        focusedField.current = fieldFromCellKey(remainingKey)
        focusedCellKeyRef.current = remainingKey
        setFocusedCellKey(remainingKey)
        const remainingCell = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-grid-cell="true"]') ?? [])
          .find(cell => getCellKey(cell) === remainingKey)
        remainingCell?.focus()
      } else if (nextSelection.size === 0) {
        selectionAnchor.current = focusRemains ? previousFocus : null
        selectionField.current = focusRemains ? fieldFromCellKey(previousFocus) : null
        if (!focusRemains) {
          focusedCellKeyRef.current = null
          focusedField.current = null
          selectionAnchor.current = null
          selectionField.current = null
          setFocusedCellKey(null)
        }
      }
    }

    if (selectionAnchor.current && !currentIds.has(rowIdFromCellKey(selectionAnchor.current))) {
      selectionAnchor.current = focusRemains ? previousFocus : [...nextSelection][0] ?? null
    }
    if (previousFocus && !focusRemains && nextSelection.size >= 2) {
      const nextFocus = [...nextSelection][0]
      focusedCellKeyRef.current = nextFocus
      focusedField.current = fieldFromCellKey(nextFocus)
      setFocusedCellKey(nextFocus)
      const focusedCell = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-grid-cell="true"]') ?? [])
        .find(cell => getCellKey(cell) === nextFocus)
      focusedCell?.focus()
    } else if (previousFocus && !focusRemains && nextSelection.size === 0 && !selectionChanged) {
      focusedCellKeyRef.current = null
      focusedField.current = null
      selectionAnchor.current = null
      selectionField.current = null
      setFocusedCellKey(null)
    }
  }, [rowIds, selectionScopeKey, selectionOwnerScopeKey, activeSelectionOwnerKey])

  useEffect(() => {
    const clearCellSelection = (preservePendingPointer = false) => {
      selectionAnchor.current = null
      selectionField.current = null
      focusedField.current = null
      focusedCellKeyRef.current = null
      if (!preservePendingPointer) {
        pendingCellPointer.current = null
        pendingMouseCell.current = null
      }
      selectedCellKeysRef.current = new Set()
      setSelectedCellKeys(current => current.size === 0 ? current : new Set())
      setFocusedCellKey(null)
    }
    const handleClearCellFocus = () => clearCellSelection()
    window.addEventListener(MASTER_DATA_CLEAR_CELL_FOCUS_EVENT, handleClearCellFocus)

    const table = tableRef.current
    if (!table) return () => window.removeEventListener(MASTER_DATA_CLEAR_CELL_FOCUS_EVENT, handleClearCellFocus)

    const setSelection = (next: Set<string>) => {
      const normalized = next.size >= 2 ? next : new Set<string>()
      selectedCellKeysRef.current = normalized
      setSelectedCellKeys(normalized)
    }

    const setContiguousRange = (anchorKey: string, targetKey: string) => {
      const matrix = getGridMatrix(table)
      const anchor = locateCell(matrix, anchorKey)
      const target = locateCell(matrix, targetKey)
      const field = anchor ? matrix[anchor.row][anchor.column]?.dataset.gridField : undefined
      const targetField = target ? matrix[target.row][target.column]?.dataset.gridField : undefined
      if (!anchor || !target || !field || field !== targetField) return false

      const rowMin = Math.min(anchor.row, target.row)
      const rowMax = Math.max(anchor.row, target.row)
      const next = new Set<string>()
      for (let row = rowMin; row <= rowMax; row += 1) {
        const candidate = matrix[row]?.find(cell => cell.dataset.gridField === field)
        const key = candidate ? getCellKey(candidate) : null
        if (key) next.add(key)
      }
      selectionField.current = field
      setSelection(next)
      return true
    }

    const focusCell = (key: string) => {
      focusedCellKeyRef.current = key
      setFocusedCellKey(key)
      const cell = getGridMatrix(table).flat().find(candidate => getCellKey(candidate) === key)
      cell?.focus()
    }

    const claimCellInteraction = (field: string) => {
      handlersRef.current.onCellInteraction?.(field)
    }

    const focusCellAtPoint = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y)
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      const field = cell?.dataset.gridField
      if (!cell || !key || !field || !table.contains(cell)) return
      claimCellInteraction(field)
      selectionAnchor.current = key
      selectionField.current = field
      focusedField.current = field
      focusCell(key)
    }

    const applyCellClick = (
      key: string,
      field: string,
      ctrlKey: boolean,
      metaKey: boolean,
      shiftKey: boolean,
      previousFocusedKey: string | null
    ) => {
      if (ctrlKey || metaKey) {
        const next = new Set(selectedCellKeysRef.current)
        const previousField = fieldFromCellKey(previousFocusedKey)
        if (next.size < 2 && previousFocusedKey && previousFocusedKey !== key && previousField === field) next.add(previousFocusedKey)
        if (next.has(key)) next.delete(key)
        else next.add(key)

        selectionField.current = field
        if (!selectionAnchor.current || fieldFromCellKey(selectionAnchor.current) !== field) {
          selectionAnchor.current = previousField === field && previousFocusedKey ? previousFocusedKey : key
        }
        if (next.size < 2) {
          const focusKey = [...next][0] ?? key
          selectionAnchor.current = focusKey
          setSelection(new Set())
          focusedField.current = field
          focusCell(focusKey)
          return
        }
        setSelection(next)
        return
      }

      if (
        shiftKey
        && selectionField.current === field
        && selectionAnchor.current
        && locateCell(getGridMatrix(table), selectionAnchor.current)
      ) {
        setContiguousRange(selectionAnchor.current, key)
        focusedField.current = field
        focusCell(key)
        return
      }

      selectionAnchor.current = key
      selectionField.current = field
      setSelection(new Set())
    }

    const getSelectedPositions = (matrix: GridMatrix) => {
      const selected = selectedCellKeysRef.current
      const field = selectionField.current
      const positions: Array<{ row: number; column: number }> = []
      if (!field) return positions
      matrix.forEach((row, rowIndex) => row.forEach((candidate, columnIndex) => {
        const key = getCellKey(candidate)
        if (key && candidate.dataset.gridField === field && selected.has(key)) {
          positions.push({ row: rowIndex, column: columnIndex })
        }
      }))
      return positions
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const field = cell && table.contains(cell) ? cell.dataset.gridField ?? null : null
      if (!field) return
      if (focusedField.current && focusedField.current !== field) clearCellSelection(true)
      claimCellInteraction(field)
      focusedField.current = field
      const key = cell ? getCellKey(cell) : null
      if (key) {
        focusedCellKeyRef.current = key
        setFocusedCellKey(key)
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.button !== 0
        || !event.isPrimary
        || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
      ) return
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      const field = cell?.dataset.gridField
      if (!cell || !key || !field || !table.contains(cell)) return

      const previousFocusedKey = focusedCellKeyRef.current
      claimCellInteraction(field)
      pendingMouseCell.current = null
      if (focusedField.current && focusedField.current !== field) clearCellSelection(true)
      focusedField.current = field
      focusedCellKeyRef.current = key
      setFocusedCellKey(key)

      pendingCellPointer.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        anchorKey: key,
        previousFocusedKey,
        field,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        dragging: false,
        crossedColumn: false
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      const field = cell?.dataset.gridField
      if (!cell || !key || !field || !table.contains(cell)) return

      // Native click adapters may emit mouse events without PointerEvents. Keep
      // click/focus selection working there; the PointerEvent path owns gestures
      // when both event families are emitted for the same press.
      if (pendingCellPointer.current?.anchorKey === key) {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
          applyCellClick(key, field, false, false, false, pendingCellPointer.current.previousFocusedKey)
        }
        return
      }
      const previousFocusedKey = focusedCellKeyRef.current
      claimCellInteraction(field)
      if (focusedField.current && focusedField.current !== field) clearCellSelection()
      focusedField.current = field
      focusedCellKeyRef.current = key
      setFocusedCellKey(key)
      applyCellClick(key, field, event.ctrlKey, event.metaKey, event.shiftKey, previousFocusedKey)
      pendingMouseCell.current = {
        pointerId: -1,
        startX: event.clientX,
        startY: event.clientY,
        anchorKey: key,
        previousFocusedKey,
        field,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        dragging: false,
        crossedColumn: false
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = pendingCellPointer.current
      if (!gesture || event.pointerId !== gesture.pointerId || gesture.crossedColumn) return

      if (!gesture.dragging) {
        const deltaX = Math.abs(event.clientX - gesture.startX)
        const deltaY = Math.abs(event.clientY - gesture.startY)
        if (deltaY < CELL_DRAG_THRESHOLD || deltaY <= deltaX) return

        gesture.dragging = true
        if (event.cancelable) event.preventDefault()
        selectionAnchor.current = gesture.anchorKey
        selectionField.current = gesture.field
        setSelection(new Set([gesture.anchorKey]))
      }

      const target = document.elementFromPoint(event.clientX, event.clientY)
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      if (cell && key && table.contains(cell)) {
        if (cell.dataset.gridField !== gesture.field) {
          gesture.crossedColumn = true
          clearCellSelection(true)
          return
        }
        setContiguousRange(gesture.anchorKey, key)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const gesture = pendingCellPointer.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      pendingCellPointer.current = null
      if (gesture.crossedColumn) {
        focusCellAtPoint(event.clientX, event.clientY)
        return
      }
      if (gesture.dragging) return

      const { anchorKey: key, field, ctrlKey, metaKey, shiftKey, previousFocusedKey } = gesture
      applyCellClick(key, field, ctrlKey, metaKey, shiftKey, previousFocusedKey)
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (pendingCellPointer.current?.pointerId === event.pointerId) pendingCellPointer.current = null
    }

    const handleMouseMove = (event: MouseEvent) => {
      const gesture = pendingMouseCell.current
      if (!gesture || gesture.crossedColumn) return

      if (!gesture.dragging) {
        const deltaX = Math.abs(event.clientX - gesture.startX)
        const deltaY = Math.abs(event.clientY - gesture.startY)
        if (deltaY < CELL_DRAG_THRESHOLD || deltaY <= deltaX) return

        gesture.dragging = true
        if (event.cancelable) event.preventDefault()
        selectionAnchor.current = gesture.anchorKey
        selectionField.current = gesture.field
        setSelection(new Set([gesture.anchorKey]))
      }

      const target = document.elementFromPoint(event.clientX, event.clientY)
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const key = cell ? getCellKey(cell) : null
      if (cell && key && table.contains(cell)) {
        if (cell.dataset.gridField !== gesture.field) {
          gesture.crossedColumn = true
          clearCellSelection(true)
          return
        }
        setContiguousRange(gesture.anchorKey, key)
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      const gesture = pendingMouseCell.current
      pendingMouseCell.current = null
      if (gesture?.crossedColumn) focusCellAtPoint(event.clientX, event.clientY)
    }

    const moveFocus = (cell: GridCell | undefined) => {
      if (!cell) return false
      const field = cell.dataset.gridField ?? null
      if (focusedField.current && field && focusedField.current !== field) clearCellSelection()
      if (field) claimCellInteraction(field)
      focusedField.current = field
      const key = getCellKey(cell)
      if (key) {
        focusedCellKeyRef.current = key
        setFocusedCellKey(key)
      }
      cell.focus()
      if (cell instanceof HTMLInputElement && cell.type === 'number') cell.select()
      return true
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const cell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      if (!cell || !table.contains(cell)) return
      const currentField = cell.dataset.gridField
      if (currentField) claimCellInteraction(currentField)

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const isSelectableTextControl = cell instanceof HTMLTextAreaElement
          || (cell instanceof HTMLInputElement && ['email', 'password', 'search', 'tel', 'text', 'url'].includes(cell.type))
        if (isSelectableTextControl) {
          const input = cell as HTMLInputElement | HTMLTextAreaElement
          const selectionStart = input.selectionStart
          const selectionEnd = input.selectionEnd
          const hasSelection = selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd
          const hasCaretRoom = selectionStart !== null && (event.key === 'ArrowLeft'
            ? selectionStart > 0
            : selectionStart < input.value.length)

          // Let text controls collapse a selection and move the caret through
          // their value. At the value's edge, keep the spreadsheet navigation.
          if (hasSelection || hasCaretRoom) return
        }
      }

      const isCommand = event.ctrlKey || event.metaKey
      if (isEditModeRef.current && isCommand && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handlersRef.current.onRedo?.()
        else handlersRef.current.onUndo?.()
        return
      }
      if (isEditModeRef.current && isCommand && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handlersRef.current.onRedo?.()
        return
      }

      const matrix = getGridMatrix(table)
      const key = getCellKey(cell)
      if (!key) return
      const location = locateCell(matrix, key)
      if (!location) return

      if (event.shiftKey && event.key.startsWith('Arrow')) {
        if (cell instanceof HTMLSelectElement && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return
        const rowDelta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
        const columnDelta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        const next = matrix[location.row + rowDelta]?.[location.column + columnDelta]
        if (!next) return
        event.preventDefault()
        if (columnDelta !== 0) {
          moveFocus(next)
          return
        }
        const field = cell.dataset.gridField
        const nextKey = getCellKey(next)
        if (!field || !nextKey || next.dataset.gridField !== field) return
        claimCellInteraction(field)
        const anchor = selectionAnchor.current && selectionField.current === field && locateCell(matrix, selectionAnchor.current)
          ? selectionAnchor.current
          : key
        selectionAnchor.current = anchor
        selectionField.current = field
        setContiguousRange(anchor, nextKey)
        focusedField.current = field
        focusedCellKeyRef.current = nextKey
        setFocusedCellKey(nextKey)
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
      if (!isEditModeRef.current) return
      const target = event.target as HTMLElement | null
      const activeCell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      if (!activeCell || !table.contains(activeCell) || !event.clipboardData) return
      const matrix = getGridMatrix(table)
      const positions = getSelectedPositions(matrix)
      const selectionIsActive = positions.length >= 2
      if (selectionIsActive) {
        const text = positions.map(position => cellValue(matrix[position.row][position.column])).join('\n')
        event.clipboardData.setData('text/plain', text)
        event.preventDefault()
        return
      }

      if (activeCell instanceof HTMLInputElement && activeCell.selectionStart !== activeCell.selectionEnd) return
      event.clipboardData.setData('text/plain', cellValue(activeCell))
      event.preventDefault()
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (!isEditModeRef.current) return
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

      if (clipboardMatrix.length > 1 && clipboardMatrix.every(row => row.length === 1)) {
        clipboardMatrix.forEach(([value], rowOffset) => {
          const candidate = matrix[start.row + rowOffset]?.[start.column]
          if (!candidate) return
          const { gridRowId, gridField } = candidate.dataset
          if (gridRowId && gridField) cells.push({ rowId: gridRowId, field: gridField, value })
        })
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

    const handleCut = (event: ClipboardEvent) => {
      if (!isEditModeRef.current) return
      const target = event.target as HTMLElement | null
      const activeCell = target?.closest<HTMLElement>('[data-grid-cell="true"]')
      const callback = handlersRef.current.onCutCells
      if (!activeCell || !table.contains(activeCell) || !event.clipboardData || !callback) return
      if (activeCell instanceof HTMLInputElement && activeCell.type !== 'number' && activeCell.selectionStart !== activeCell.selectionEnd) return

      const matrix = getGridMatrix(table)
      const activeKey = getCellKey(activeCell)
      const activePosition = activeKey ? locateCell(matrix, activeKey) : null
      if (!activePosition) return
      const positions = getSelectedPositions(matrix)
      const selectionIsActive = positions.length >= 2
      const selection = selectionIsActive ? positions : [activePosition]
      const text = selection.map(position => cellValue(matrix[position.row][position.column])).join('\n')
      const cutCells = selection.flatMap(position => {
        const candidate = matrix[position.row][position.column]
        const { gridRowId, gridField } = candidate.dataset
        return gridRowId && gridField ? [{ rowId: gridRowId, field: gridField, value: '' }] : []
      })
      if (cutCells.length === 0) return

      event.clipboardData.setData('text/plain', text)
      event.preventDefault()
      callback(cutCells)
    }

    table.addEventListener('focusin', handleFocusIn)
    table.addEventListener('pointerdown', handlePointerDown)
    table.addEventListener('mousedown', handleMouseDown)
    table.addEventListener('keydown', handleKeyDown)
    table.addEventListener('copy', handleCopy)
    table.addEventListener('paste', handlePaste)
    table.addEventListener('cut', handleCut)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      table.removeEventListener('focusin', handleFocusIn)
      table.removeEventListener('pointerdown', handlePointerDown)
      table.removeEventListener('mousedown', handleMouseDown)
      table.removeEventListener('keydown', handleKeyDown)
      table.removeEventListener('copy', handleCopy)
      table.removeEventListener('paste', handlePaste)
      table.removeEventListener('cut', handleCut)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener(MASTER_DATA_CLEAR_CELL_FOCUS_EVENT, handleClearCellFocus)
    }
  }, [tableRef])

  return { selectedCellKeys, focusedCellKey }
}
