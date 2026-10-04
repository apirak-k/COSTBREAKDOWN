import { useCallback, useEffect, useRef, useState } from 'react'

interface EditableRow {
  id: string
  isGeneratedSizingPlaceholder?: boolean
}

export type RowChanges<T extends EditableRow> = Partial<Omit<T, 'id' | 'confidence'>>

interface RowUpdate<T extends EditableRow> {
  id: string
  changes: RowChanges<T>
}

interface HistoryChange<T extends EditableRow> {
  id: string
  before: RowChanges<T>
  after: RowChanges<T>
}

interface UseSpreadsheetEditingOptions<T extends EditableRow> {
  rows: T[]
  selectedIds: Set<string>
  isEditMode: boolean
  historyScope: string
  onUpdate: (id: string, changes: RowChanges<T>) => void
}

export function useSpreadsheetEditing<T extends EditableRow>({
  rows,
  selectedIds,
  isEditMode,
  historyScope,
  onUpdate
}: UseSpreadsheetEditingOptions<T>) {
  const undoStack = useRef<HistoryChange<T>[][]>([])
  const redoStack = useRef<HistoryChange<T>[][]>([])
  const [, setHistoryRevision] = useState(0)

  useEffect(() => {
    undoStack.current = []
    redoStack.current = []
    setHistoryRevision(revision => revision + 1)
  }, [historyScope])

  const applyChanges = useCallback((updates: RowUpdate<T>[]) => {
    if (!isEditMode || updates.length === 0) return
    const grouped = new Map<string, RowChanges<T>>()
    updates.forEach(({ id, changes }) => {
      grouped.set(id, { ...grouped.get(id), ...changes })
    })

    const batch: HistoryChange<T>[] = []
    grouped.forEach((changes, id) => {
      const row = rows.find(candidate => candidate.id === id)
      if (!row) return
      const before: RowChanges<T> = {}
      ;(Object.keys(changes) as Array<keyof RowChanges<T>>).forEach(field => {
        ;(before as Record<string, unknown>)[field as string] = row[field as keyof T]
      })
      const after = { ...changes }
      if (row.isGeneratedSizingPlaceholder) {
        before.isGeneratedSizingPlaceholder = true
        after.isGeneratedSizingPlaceholder = false
      }
      batch.push({ id, before, after })
    })

    if (batch.length === 0) return
    batch.forEach(change => onUpdate(change.id, change.after))
    undoStack.current.push(batch)
    if (undoStack.current.length > 100) undoStack.current.shift()
    redoStack.current = []
    setHistoryRevision(revision => revision + 1)
  }, [isEditMode, onUpdate, rows])

  const applyCellUpdate = useCallback((id: string, changes: RowChanges<T>) => {
    const ids = selectedIds.has(id) ? [...selectedIds] : [id]
    applyChanges(ids.map(rowId => ({ id: rowId, changes })))
  }, [applyChanges, selectedIds])

  const applyPasteUpdates = useCallback((updates: RowUpdate<T>[]) => {
    if (updates.length === 1) {
      applyCellUpdate(updates[0].id, updates[0].changes)
    } else {
      applyChanges(updates)
    }
  }, [applyCellUpdate, applyChanges])

  const undo = useCallback(() => {
    const batch = undoStack.current.pop()
    if (!batch) return
    const applicable = batch.filter(change => {
      const row = rows.find(candidate => candidate.id === change.id)
      return row && Object.entries(change.after).every(([field, value]) => Object.is(row[field as keyof T], value))
    })
    applicable.slice().reverse().forEach(change => onUpdate(change.id, change.before))
    if (applicable.length > 0) redoStack.current.push(applicable)
    setHistoryRevision(revision => revision + 1)
  }, [onUpdate, rows])

  const redo = useCallback(() => {
    const batch = redoStack.current.pop()
    if (!batch) return
    const applicable = batch.filter(change => {
      const row = rows.find(candidate => candidate.id === change.id)
      return row && Object.entries(change.before).every(([field, value]) => Object.is(row[field as keyof T], value))
    })
    applicable.forEach(change => onUpdate(change.id, change.after))
    if (applicable.length > 0) undoStack.current.push(applicable)
    setHistoryRevision(revision => revision + 1)
  }, [onUpdate, rows])

  return {
    applyCellUpdate,
    applyPasteUpdates,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0
  }
}
