import { useCallback } from 'react'
import {
  MASTER_DATA_NUMERIC_DOMAINS,
  isMasterDataNumericInputValid,
  type MasterDataNumericField
} from '../../../core/utils/master-data-validation'

interface EditableRow {
  id: string
  isGeneratedSizingPlaceholder?: boolean
}

export type RowChanges<T extends EditableRow> = Partial<Omit<T, 'id' | 'confidence'>>

export interface RowUpdate<T extends EditableRow> {
  id: string
  changes: RowChanges<T>
  exactDecimalUpdates?: Record<string, string | null>
}

interface UseSpreadsheetEditingOptions<T extends EditableRow> {
  rows: T[]
  selectedIds: Set<string>
  isEditMode: boolean
  onUpdateBatch: (updates: RowUpdate<T>[]) => void
}

export function prepareSpreadsheetBatch<T extends EditableRow>(rows: T[], updates: RowUpdate<T>[]): RowUpdate<T>[] {
  const grouped = new Map<string, RowChanges<T>>()
  const exactById = new Map<string, Record<string, string | null>>()
  updates.forEach(({ id, changes }) => {
    grouped.set(id, { ...grouped.get(id), ...changes })
  })
  updates.forEach(({ id, exactDecimalUpdates }) => {
    if (exactDecimalUpdates) exactById.set(id, { ...exactById.get(id), ...exactDecimalUpdates })
  })

  const rowsById = new Map(rows.map(row => [row.id, row]))
  const batch: RowUpdate<T>[] = []
  grouped.forEach((changes, id) => {
    const row = rowsById.get(id)
    if (!row) return
    const after = { ...changes } as RowChanges<T> & { isGeneratedSizingPlaceholder?: boolean; exactDecimalInputs?: Record<string, string> }
    const exactUpdates = exactById.get(id)
    if (exactUpdates) {
      const exactDecimalInputs = { ...((row as T & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs ?? {}) }
      let acceptedExactUpdate = false
      Object.entries(exactUpdates).forEach(([field, value]) => {
        const numericValue = (changes as Record<string, unknown>)[field]
        if (!Object.prototype.hasOwnProperty.call(changes, field)
          || !Object.prototype.hasOwnProperty.call(MASTER_DATA_NUMERIC_DOMAINS, field)) return
        if (!isMasterDataNumericInputValid(
          field as MasterDataNumericField,
          numericValue,
          typeof value === 'string' ? value : undefined
        )) {
          delete (after as Record<string, unknown>)[field]
          return
        }
        acceptedExactUpdate = true
        if (value === null || value === '') delete exactDecimalInputs[field]
        else exactDecimalInputs[field] = value
      })
      if (acceptedExactUpdate) after.exactDecimalInputs = Object.keys(exactDecimalInputs).length ? exactDecimalInputs : undefined
    }
    if (Object.keys(after).length === 0) return
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

  const applyCellUpdate = useCallback((id: string, changes: RowChanges<T>, exactDecimalUpdate?: { field: string; value: string | null }) => {
    const ids = selectedIds.has(id) ? [...selectedIds] : [id]
    applyChanges(ids.map(rowId => ({
      id: rowId,
      changes,
      ...(exactDecimalUpdate ? { exactDecimalUpdates: { [exactDecimalUpdate.field]: exactDecimalUpdate.value } } : {})
    })))
  }, [applyChanges, selectedIds])

  const applyPasteUpdates = useCallback((updates: RowUpdate<T>[]) => {
    applyChanges(updates)
  }, [applyChanges])

  const applyCutUpdates = useCallback((updates: RowUpdate<T>[]) => {
    applyChanges(updates)
  }, [applyChanges])

  return { applyCellUpdate, applyPasteUpdates, applyCutUpdates }
}
