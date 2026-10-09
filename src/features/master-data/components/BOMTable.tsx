import React, { useCallback, useMemo, useRef } from 'react'
import { CheckSquare, GripVertical, Plus, Trash2 } from 'lucide-react'
import { SnapshotBOMItem } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, hasInvalidNumber, parsePercentage } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
  isEditMode?: boolean
  historyScope: string
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  onUndo: () => void
  onRedo: () => void
  onAddBOMItem: () => void
  onUpdateBOMItems: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>> }>) => void
  onDeleteBOMItems: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
  onWarningNavigationHandled: (requestId: number) => void
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const displayNumber = (value: number | null, digits = 4): string => value === null ? '—' : value.toFixed(digits)

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  isEditMode = false,
  historyScope,
  searchQuery = '',
  onSearchQueryChange = () => undefined,
  onUndo,
  onRedo,
  onAddBOMItem,
  onUpdateBOMItems,
  onDeleteBOMItems,
  onReorderRows,
  warningNavigationTarget,
  onWarningNavigationHandled
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateNameIds = useMemo(() => duplicateIdentityIds(bom, item => item.id, item => item.description), [bom])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(bom, item => item.description), [bom])

  const filteredBOM = useMemo(() => bom.filter(item =>
    [item.description, item.consumption, item.unit, item.price, item.loss, item.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [bom, query])

  const {
    selectedIds,
    setSelectedIds,
    clearSelection,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredBOM,
    getItemId: item => item.id,
    isEditMode,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  const {
    applyCellUpdate,
    applyPasteUpdates
  } = useSpreadsheetEditing({
    rows: bom,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateBOMItems
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotBOMItem> | null = null
      if (cell.field === 'description') changes = { description: cell.value }
      else if (cell.field === 'consumption') changes = { consumption: parseNumber(cell.value) }
      else if (cell.field === 'unit') changes = { unit: cell.value }
      else if (cell.field === 'price') changes = { price: parseNumber(cell.value) }
      else if (cell.field === 'loss') changes = { loss: parsePercentage(cell.value) }
      else if (cell.field === 'note') changes = { note: cell.value }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyPasteUpdates(updates)
  }, [applyPasteUpdates])

  const { selectedCellKeys } = useTableKeyboardNav({
    tableRef,
    isEditMode,
    onPasteCells: handlePasteCells,
    onUndo,
    onRedo
  })

  const handleDeleteSelected = () => {
    onDeleteBOMItems([...selectedIds])
    clearSelection()
  }

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.setData('application/x-costbreakdown-row-ids', JSON.stringify(selectedIds.has(id) ? [...selectedIds] : [id]))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleRowDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    event.preventDefault()
    const movingId = event.dataTransfer.getData('text/plain')
    if (!movingId || movingId === targetId) return
    let movingIds = [movingId]
    try {
      const parsedIds: unknown = JSON.parse(event.dataTransfer.getData('application/x-costbreakdown-row-ids'))
      if (Array.isArray(parsedIds)) {
        const validIds = parsedIds.filter((id): id is string => typeof id === 'string')
        if (validIds.includes(movingId)) movingIds = validIds
      }
    } catch {
      // Keep the existing single-row drag behavior when group data is unavailable.
    }
    if (movingIds.includes(targetId)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    onReorderRows(movingId, targetId, event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before', movingIds)
  }

  return (
    <section aria-label="BOM rows" className="overflow-hidden bg-white select-none">
      {isEditMode && (
        <div className="flex min-h-11 items-center justify-end border-b border-slate-200 bg-white px-3 py-1">
          <button type="button" onClick={onAddBOMItem} className="flex min-h-8 items-center justify-center gap-1.5 border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <Plus className="h-3 w-3" aria-hidden="true" /> Add row
          </button>
        </div>
      )}

      {isEditMode && (
        <div className={`flex h-[52px] items-center gap-3 overflow-x-auto border-b px-4 text-xs text-slate-800 ${selectedIds.size > 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
          {selectedIds.size > 0 ? (
            <>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-slate-900">
                <CheckSquare className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'} selected
              </span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                title="Delete selected rows"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto min-h-9 shrink-0 whitespace-nowrap px-3 text-sm text-slate-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-slate-500">Select rows by # or drag across the row numbers.</span>
          )}
        </div>
      )}

      <div className="max-h-[520px] overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[860px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 px-2 py-2 text-center">#</th>
              <th scope="col" className="px-2 py-2">Name</th>
              <th scope="col" className="px-2 py-2 text-right">Usage</th>
              <th scope="col" className="px-2 py-2">Unit</th>
              <th scope="col" className="px-2 py-2 text-right">Price</th>
              <th scope="col" className="px-2 py-2 text-right">Loss</th>
              <th scope="col" className="px-2 py-2">Note</th>
              {isEditMode && <th scope="col" className="w-12 px-2 py-2 text-center">Actions</th>}
              {isEditMode && <th scope="col" className="w-8 px-1 py-2 text-center" aria-label="Reorder rows" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredBOM.map(item => {
              const isSelected = selectedIds.has(item.id)
              const identityInvalid = !item.description.trim() || duplicateNameIds.has(item.id)
              const consumptionInvalid = item.consumption === null || hasInvalidNumber(item.consumption)
              const priceInvalid = item.price === null || hasInvalidNumber(item.price)
              const lossInvalid = item.loss === null || hasInvalidNumber(item.loss)
              const rowNumber = bom.findIndex(row => row.id === item.id) + 1
              const placeholderNumber = placeholderNumbers.get(item.id)
              const rowMarkerBackground = isSelected
                ? 'bg-blue-50 group-hover:bg-blue-100'
                : 'bg-white group-hover:bg-slate-50'
              const numericClass = (invalid: boolean) => `min-h-8 rounded-sm border px-2 text-right text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700 ${invalid ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'}`

              return (
                <tr
                  key={item.id}
                  data-master-data-row-id={item.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(item.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, item.id) }}
                  className={`group h-9 ${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 w-12 px-1.5 py-0.5 text-center font-mono font-normal text-slate-600 ${rowMarkerBackground}`}>
                    {isEditMode ? (
                      <button
                        type="button"
                        aria-label={`Select BOM row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(item.id, event)}
                        onClick={event => { if (event.detail === 0) toggleRow(item.id) }}
                        className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                      >
                        {rowNumber}
                      </button>
                    ) : rowNumber}
                  </th>
                  <td className="px-2 py-0.5 font-sans text-slate-800">
                    <div className="min-w-[170px]">
                      {isEditMode ? (
                        <input
                          value={item.description}
                          placeholder={placeholderNumber === undefined ? undefined : String(placeholderNumber)}
                          onChange={event => applyCellUpdate(item.id, { description: event.target.value })}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="description"
                          aria-label={`Name for BOM row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-8 w-full rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      ) : item.description || <span className="text-amber-700">{placeholderNumber ?? '—'}</span>}
                    </div>
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${consumptionInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.consumption)}
                        onChange={event => applyCellUpdate(item.id, { consumption: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="consumption"
                        aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={consumptionInvalid}
                        className={`${numericClass(consumptionInvalid)} w-28 ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : displayNumber(item.consumption)}
                  </td>
                  <td className="px-2 py-0.5 font-mono">
                    {isEditMode ? (
                      <input
                        value={item.unit}
                        onChange={event => applyCellUpdate(item.id, { unit: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="unit"
                        aria-label={`Unit for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={!item.unit.trim()}
                        className={`min-h-8 w-20 rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${!item.unit.trim() ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : item.unit || <span className="text-amber-700">—</span>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${priceInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.price)}
                        onChange={event => applyCellUpdate(item.id, { price: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="price"
                        aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={priceInvalid}
                        className={`${numericClass(priceInvalid)} w-28 ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : displayNumber(item.price, 2)}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${lossInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.loss === null ? '' : String(item.loss * 100)}
                          onChange={event => {
                            const value = event.target.value.trim()
                            applyCellUpdate(item.id, { loss: value === '' ? null : Number(value) / 100 })
                          }}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="loss"
                          aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={lossInvalid}
                          className={`${numericClass(lossInvalid)} w-20 ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : item.loss === null ? <span className="text-amber-700">—</span> : `${(item.loss * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={item.note || ''}
                        onChange={event => applyCellUpdate(item.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="note"
                        aria-label={`Note for ${item.description || `BOM row ${rowNumber}`}`}
                        className={`min-h-8 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : item.note || '—'}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteBOMItems([item.id])}
                        aria-label={`Delete BOM row ${rowNumber}`}
                        className="inline-flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        title="Delete row"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                  {isEditMode && (
                    <td className={`w-8 px-1 py-0.5 text-center ${rowMarkerBackground}`}>
                      <button
                        type="button"
                        draggable
                        onDragStart={event => handleDragStart(event, item.id)}
                        aria-label={`Drag to reorder BOM row ${rowNumber}`}
                        title="Drag to reorder"
                        className="inline-flex h-8 w-7 cursor-grab items-center justify-center text-slate-500 hover:bg-slate-200 active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {filteredBOM.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 9 : 7} className="py-6 text-center font-sans text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs italic text-slate-500">{bom.length === 0 ? 'No BOM rows in this dataset yet.' : 'No rows match your search.'}</p>
                    {isEditMode && bom.length === 0 && (
                      <button type="button" onClick={onAddBOMItem} className="mt-1 flex min-h-9 items-center gap-1.5 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
                        <Plus className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" /> Add first row
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {query && (
        <div role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Showing {filteredBOM.length} of {bom.length} rows.
        </div>
      )}
    </section>
  )
}
