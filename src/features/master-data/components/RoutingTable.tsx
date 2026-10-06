import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CheckSquare, GripVertical, Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { duplicateIdentityIds, hasInvalidNumber, parsePercentage } from '../table-validation'

interface RoutingTableProps {
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  historyScope: string
  onUndo: () => void
  onRedo: () => void
  onAddRoutingStep: () => void
  onUpdateRoutingSteps: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>> }>) => void
  onDeleteRoutingSteps: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
}

const numberValue = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
  isEditMode = false,
  historyScope,
  onUndo,
  onRedo,
  onAddRoutingStep,
  onUpdateRoutingSteps,
  onDeleteRoutingSteps,
  onReorderRows
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const duplicateProcessIds = useMemo(() => duplicateIdentityIds(routing, step => step.id, step => step.processName), [routing])
  const knownWorkCenters = useMemo(() => new Set(
    rates.map(rate => rate.workCenterCode.trim().toLocaleLowerCase()).filter(Boolean)
  ), [rates])

  const query = searchTerm.trim().toLocaleLowerCase()
  const filteredRouting = useMemo(() => routing.filter(step =>
    [step.processName, step.workCenterId, step.manning, step.capacity, step.yield, step.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [routing, query])

  const {
    selectedIds,
    clearSelection,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRouting,
    getItemId: step => step.id,
    isEditMode,
    selectionScope: historyScope
  })

  const {
    applyCellUpdate,
    applyPasteUpdates
  } = useSpreadsheetEditing({
    rows: routing,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateRoutingSteps
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotRoutingStep> | null = null
      if (cell.field === 'processName') changes = { processName: cell.value }
      else if (cell.field === 'workCenterId') changes = { workCenterId: cell.value || undefined }
      else if (cell.field === 'manning') changes = { manning: parseNumber(cell.value) }
      else if (cell.field === 'capacity') changes = { capacity: parseNumber(cell.value) }
      else if (cell.field === 'yield') changes = { yield: parsePercentage(cell.value) }
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
    onDeleteRoutingSteps([...selectedIds])
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
    <section aria-label="Routing rows" className="overflow-hidden bg-white select-none">
      <div className="flex flex-col gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search Routing"
            aria-label="Search Routing rows"
            className="min-h-9 w-full border border-slate-300 bg-white py-1 pl-9 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>
        {isEditMode && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onAddRoutingStep} className="flex min-h-9 items-center justify-center gap-1.5 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
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
        <table ref={tableRef} className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 px-2 py-2 text-center">#</th>
              <th scope="col" className="px-2 py-2">Process</th>
              <th scope="col" className="px-2 py-2">WC</th>
              <th scope="col" className="px-2 py-2 text-right">Manning</th>
              <th scope="col" className="px-2 py-2 text-right">Cap</th>
              <th scope="col" className="px-2 py-2 text-right">Yield</th>
              <th scope="col" className="px-2 py-2">Note</th>
              {isEditMode && <th scope="col" className="w-12 px-2 py-2 text-center">Actions</th>}
              {isEditMode && <th scope="col" className="w-8 px-1 py-2 text-center" aria-label="Reorder rows" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              const identityInvalid = !step.isGeneratedSizingPlaceholder && (!step.processName.trim() || duplicateProcessIds.has(step.id))
              const workCenterInvalid = !step.isGeneratedSizingPlaceholder && (!step.workCenterId?.trim() || !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase()))
              const manningInvalid = !step.isGeneratedSizingPlaceholder && (step.manning === null || hasInvalidNumber(step.manning))
              const capacityInvalid = !step.isGeneratedSizingPlaceholder && (step.capacity === null || hasInvalidNumber(step.capacity))
              const yieldInvalid = !step.isGeneratedSizingPlaceholder && (step.yield === null || hasInvalidNumber(step.yield) || step.yield > 1)
              const rowNumber = routing.findIndex(row => row.id === step.id) + 1
              const rowMarkerBackground = isSelected
                ? 'bg-blue-50 group-hover:bg-blue-100'
                : 'bg-white group-hover:bg-slate-50'
              const numericClass = (invalid: boolean) => `min-h-8 rounded-sm border px-2 text-right text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700 ${invalid ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'}`

              return (
                <tr
                  key={step.id}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, step.id) }}
                  className={`group h-9 ${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 w-12 px-1.5 py-0.5 text-center font-mono font-normal text-slate-600 ${rowMarkerBackground}`}>
                    {isEditMode ? (
                      <button
                        type="button"
                        aria-label={`Select Routing row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(step.id, event)}
                        onClick={event => { if (event.detail === 0) toggleRow(step.id) }}
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
                          value={step.processName}
                          onChange={event => applyCellUpdate(step.id, { processName: event.target.value })}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="processName"
                          aria-label={`Process for Routing row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-8 w-full rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(step.id, 'processName')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      ) : step.processName || <span className="text-amber-700">—</span>}
                    </div>
                  </td>
                  <td className="px-2 py-0.5">
                    {isEditMode ? (
                      <select
                        value={step.workCenterId || ''}
                        onChange={event => applyCellUpdate(step.id, { workCenterId: event.target.value || undefined })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="workCenterId"
                        aria-label={`WC for Routing row ${rowNumber}`}
                        aria-invalid={workCenterInvalid}
                        className={`min-h-8 w-40 rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${workCenterInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(step.id, 'workCenterId')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      >
                        <option value="">Select WC</option>
                        {step.workCenterId && !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase()) && (
                          <option value={step.workCenterId}>{step.workCenterId} (not in WC table)</option>
                        )}
                        {rates.map(rate => (
                          <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode}</option>
                        ))}
                      </select>
                    ) : step.workCenterId ? (
                      <span className={workCenterInvalid ? 'text-amber-800' : 'text-slate-800'}>
                        {step.workCenterId}{workCenterInvalid ? ' (not in WC table)' : ''}
                      </span>
                    ) : <span className="text-amber-700">—</span>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${manningInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.manning)}
                        onChange={event => applyCellUpdate(step.id, { manning: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="manning"
                        aria-label={`Manning for ${step.processName || `Routing row ${rowNumber}`}`}
                        aria-invalid={manningInvalid}
                        className={`${numericClass(manningInvalid)} w-24 ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : numberValue(step.manning) || <span className="text-amber-700">—</span>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${capacityInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.capacity)}
                        onChange={event => applyCellUpdate(step.id, { capacity: parseNumber(event.target.value) })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="capacity"
                        aria-label={`Cap for ${step.processName || `Routing row ${rowNumber}`}`}
                        aria-invalid={capacityInvalid}
                        className={`${numericClass(capacityInvalid)} w-28 ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : numberValue(step.capacity) || <span className="text-amber-700">—</span>}
                  </td>
                  <td className={`px-2 py-0.5 text-right ${yieldInvalid ? 'bg-amber-50/60 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={step.yield === null ? '' : String(step.yield * 100)}
                          onChange={event => {
                            const value = event.target.value.trim()
                            applyCellUpdate(step.id, { yield: value === '' ? null : Number(value) / 100 })
                          }}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="yield"
                          aria-label={`Yield percentage for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={yieldInvalid}
                          className={`${numericClass(yieldInvalid)} w-20 ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : step.yield === null ? <span className="text-amber-700">—</span> : `${(step.yield * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={step.note || ''}
                        onChange={event => applyCellUpdate(step.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="note"
                        aria-label={`Note for ${step.processName || `Routing row ${rowNumber}`}`}
                        className={`min-h-8 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(step.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : step.note || '—'}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRoutingSteps([step.id])}
                        aria-label={`Delete Routing row ${rowNumber}`}
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
                        onDragStart={event => handleDragStart(event, step.id)}
                        aria-label={`Drag to reorder Routing row ${rowNumber}`}
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
            {filteredRouting.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 9 : 7} className="py-6 text-center font-sans text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs italic text-slate-500">{routing.length === 0 ? 'No Routing rows in this dataset yet.' : 'No rows match your search.'}</p>
                    {isEditMode && routing.length === 0 && (
                      <button type="button" onClick={onAddRoutingStep} className="mt-1 flex min-h-9 items-center gap-1.5 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
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
          Showing {filteredRouting.length} of {routing.length} rows.
        </div>
      )}
    </section>
  )
}
