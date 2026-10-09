import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CheckSquare, GripVertical, Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotWorkCenterRate } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, hasInvalidNumber } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'

interface WorkCenterRatesTableProps {
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  historyScope: string
  onUndo: () => void
  onRedo: () => void
  onAddRate: () => void
  onUpdateRates: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>) => void
  onDeleteRates: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  isEditMode = false,
  historyScope,
  onUndo,
  onRedo,
  onAddRate,
  onUpdateRates,
  onDeleteRates,
  onReorderRows,
  warningNavigationTarget
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  useWarningNavigationFocus(tableRef, searchTerm, setSearchTerm, warningNavigationTarget)
  const duplicateWcIds = useMemo(() => duplicateIdentityIds(rates, rate => rate.id, rate => rate.workCenterCode), [rates])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(rates, rate => rate.workCenterCode), [rates])

  const query = searchTerm.trim().toLocaleLowerCase()
  const filteredRates = useMemo(() => rates.filter(rate =>
    [rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [rates, query])

  const {
    selectedIds,
    clearSelection,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRates,
    getItemId: rate => rate.id,
    isEditMode,
    selectionScope: historyScope
  })

  const {
    applyCellUpdate,
    applyPasteUpdates
  } = useSpreadsheetEditing({
    rows: rates,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateRates
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotWorkCenterRate> | null = null
      if (cell.field === 'workCenterCode') changes = { workCenterCode: cell.value }
      else if (cell.field === 'laborRate') changes = { laborRate: parseNumber(cell.value) }
      else if (cell.field === 'burdenRate') changes = { burdenRate: parseNumber(cell.value) }
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
    onDeleteRates([...selectedIds])
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
    <section aria-label="WC rows" className="overflow-hidden bg-white select-none">
      <div className="flex flex-col gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search WC"
            aria-label="Search WC rows"
            className="min-h-9 w-full border border-slate-300 bg-white py-1 pl-9 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>
        {isEditMode && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onAddRate} className="flex min-h-9 items-center justify-center gap-1.5 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              <Plus className="h-3 w-3" aria-hidden="true" /> Add row
            </button>
          </div>
        )}
      </div>

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
        <table ref={tableRef} className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 px-2 py-2 text-center">#</th>
              <th scope="col" className="px-2 py-2">WC</th>
              <th scope="col" className="px-2 py-2 text-right">Labor</th>
              <th scope="col" className="px-2 py-2 text-right">Burden</th>
              <th scope="col" className="px-2 py-2">Note</th>
              {isEditMode && <th scope="col" className="w-12 px-2 py-2 text-center">Actions</th>}
              {isEditMode && <th scope="col" className="w-8 px-1 py-2 text-center" aria-label="Reorder rows" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRates.map(rate => {
              const isSelected = selectedIds.has(rate.id)
              const identityInvalid = !rate.workCenterCode.trim() || duplicateWcIds.has(rate.id)
              const laborInvalid = rate.laborRate === null || hasInvalidNumber(rate.laborRate)
              const burdenInvalid = rate.burdenRate === null || hasInvalidNumber(rate.burdenRate)
              const rowNumber = rates.findIndex(row => row.id === rate.id) + 1
              const placeholderNumber = placeholderNumbers.get(rate.id)
              const rowMarkerBackground = isSelected
                ? 'bg-blue-50 group-hover:bg-blue-100'
                : 'bg-white group-hover:bg-slate-50'
              const numericClass = (invalid: boolean) => `min-h-8 rounded-sm border px-2 text-right text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700 ${invalid ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'}`

              return (
                <tr
                  key={rate.id}
                  data-master-data-row-id={rate.id}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(rate.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, rate.id) }}
                  className={`group h-9 ${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 w-12 px-1.5 py-0.5 text-center font-mono font-normal text-slate-600 ${rowMarkerBackground}`}>
                    {isEditMode ? (
                      <button
                        type="button"
                        aria-label={`Select WC row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(rate.id, event)}
                        onClick={event => { if (event.detail === 0) toggleRow(rate.id) }}
                        className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                      >
                        {rowNumber}
                      </button>
                    ) : rowNumber}
                  </th>
                  <td className="px-2 py-0.5 font-mono font-semibold text-slate-950">
                    {isEditMode ? (
                      <div className="min-w-[150px]">
                        <input
                          value={rate.workCenterCode}
                          placeholder={placeholderNumber === undefined ? undefined : String(placeholderNumber)}
                          onChange={event => applyCellUpdate(rate.id, { workCenterCode: event.target.value })}
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="workCenterCode"
                          aria-label={`WC for row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-8 w-full rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(rate.id, 'workCenterCode')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      </div>
                    ) : (
                      <div>
                        {rate.workCenterCode || <span className="text-amber-700">{placeholderNumber ?? '—'}</span>}
                      </div>
                    )}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${laborInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(rate.laborRate)}
                        onChange={event => applyCellUpdate(rate.id, { laborRate: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={rate.id}
                        data-grid-field="laborRate"
                        aria-label={`Labor for ${rate.workCenterCode || `WC row ${rowNumber}`}`}
                        aria-invalid={laborInvalid}
                        className={`${numericClass(laborInvalid)} w-28 ${selectedCellKeys.has(tableCellKey(rate.id, 'laborRate')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : rate.laborRate === null ? <span className="text-amber-700">—</span> : rate.laborRate.toFixed(4)}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${burdenInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(rate.burdenRate)}
                        onChange={event => applyCellUpdate(rate.id, { burdenRate: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={rate.id}
                        data-grid-field="burdenRate"
                        aria-label={`Burden for ${rate.workCenterCode || `WC row ${rowNumber}`}`}
                        aria-invalid={burdenInvalid}
                        className={`${numericClass(burdenInvalid)} w-28 ${selectedCellKeys.has(tableCellKey(rate.id, 'burdenRate')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : rate.burdenRate === null ? <span className="text-amber-700">—</span> : rate.burdenRate.toFixed(4)}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={rate.note || ''}
                        onChange={event => applyCellUpdate(rate.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={rate.id}
                        data-grid-field="note"
                        aria-label={`Note for ${rate.workCenterCode || `WC row ${rowNumber}`}`}
                        className={`min-h-8 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(rate.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : rate.note || '—'}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRates([rate.id])}
                        aria-label={`Delete WC row ${rowNumber}`}
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
                        onDragStart={event => handleDragStart(event, rate.id)}
                        aria-label={`Drag to reorder WC row ${rowNumber}`}
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
            {filteredRates.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 7 : 5} className="py-6 text-center font-sans text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs italic text-slate-500">{rates.length === 0 ? 'No WC rows in this dataset yet.' : 'No rows match your search.'}</p>
                    {isEditMode && rates.length === 0 && (
                      <button type="button" onClick={onAddRate} className="mt-1 flex min-h-9 items-center gap-1.5 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
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
          Showing {filteredRates.length} of {rates.length} rows.
        </div>
      )}
    </section>
  )
}
