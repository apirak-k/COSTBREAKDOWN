import { useCallback } from 'react'

interface EditableRow {
  id: string
  isGeneratedSizingPlaceholder?: boolean
}

export type RowChanges<T extends EditableRow> = Partial<Omit<T, 'id' | 'confidence'>>

export interface RowUpdate<T extends EditableRow> {
  id: string
  changes: RowChanges<T>
}

interface UseSpreadsheetEditingOptions<T extends EditableRow> {
  rows: T[]
  selectedIds: Set<string>
  isEditMode: boolean
  onUpdateBatch: (updates: RowUpdate<T>[]) => void
}

export function prepareSpreadsheetBatch<T extends EditableRow>(rows: T[], updates: RowUpdate<T>[]): RowUpdate<T>[] {
  const grouped = new Map<string, RowChanges<T>>()
  updates.forEach(({ id, changes }) => {
    grouped.set(id, { ...grouped.get(id), ...changes })
  })

  const rowsById = new Map(rows.map(row => [row.id, row]))
  const batch: RowUpdate<T>[] = []
  grouped.forEach((changes, id) => {
    const row = rowsById.get(id)
    if (!row) return
    const after: RowChanges<T> & { isGeneratedSizingPlaceholder?: boolean } = { ...changes }
    if (row.isGeneratedSizingPlaceholder) after.isGeneratedSizingPlaceholder = false
    batch.push({ id, changes: after })
  })
  return batch
}

export function useSpreadsheetEditing<T extends EditableRow>({
  rows,
  selectedIds,
  isEditMode,
  onUpdateBatch
}: UseSpreadsheetEditingOptions<T>) {
  const applyChanges = useCallback((updates: RowUpdate<T>[]) => {
    if (!isEditMode || updates.length === 0) return
    const batch = prepareSpreadsheetBatch(rows, updates)
    if (batch.length > 0) onUpdateBatch(batch)
  }, [isEditMode, onUpdateBatch, rows])

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

  return { applyCellUpdate, applyPasteUpdates }
}
