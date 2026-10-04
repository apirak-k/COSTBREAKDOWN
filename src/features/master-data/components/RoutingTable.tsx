import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CheckSquare, GripVertical, Plus, Redo2, Search, Trash2, Undo2 } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { duplicateIdentityIds, hasInvalidNumber } from '../table-validation'

interface RoutingTableProps {
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  historyScope: string
  onAddRoutingStep: () => void
  onUpdateRoutingStep: (id: string, partial: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => void
  onDeleteRoutingStep: (id: string) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after') => void
}

const numberValue = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
  isEditMode = false,
  historyScope,
  onAddRoutingStep,
  onUpdateRoutingStep,
  onDeleteRoutingStep,
  onReorderRows
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const duplicateProcessIds = useMemo(() => duplicateIdentityIds(routing, step => step.id, step => step.processName), [routing])
  const knownWorkCenters = useMemo(() => new Set(
    rates.map(rate => rate.workCenterCode.trim().toLocaleLowerCase()).filter(Boolean)
  ), [rates])
  const rowIssues = useMemo(() => {
    const issuesById = new Map<string, string[]>()
    routing.forEach(step => {
      const issues: string[] = []
      if (!step.isGeneratedSizingPlaceholder) {
        if (!step.processName.trim()) issues.push('Process is required.')
        else if (duplicateProcessIds.has(step.id)) issues.push('Process must be unique.')
        if (!step.workCenterId?.trim()) issues.push('WC is required.')
        else if (!knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase())) issues.push(`WC "${step.workCenterId}" is not in the WC table.`)
        if (step.manning === null) issues.push('Manning is missing.')
        else if (hasInvalidNumber(step.manning)) issues.push('Manning must be a non-negative number.')
        if (step.capacity === null) issues.push('Cap is missing.')
        else if (hasInvalidNumber(step.capacity)) issues.push('Cap must be a non-negative number.')
        if (step.yield === null) issues.push('Yield is missing.')
        else if (hasInvalidNumber(step.yield) || step.yield > 1) issues.push('Yield must be between 0 and 100%.')
      }
      issuesById.set(step.id, issues)
    })
    return issuesById
  }, [routing, duplicateProcessIds, knownWorkCenters])

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
    isEditMode
  })

  const {
    applyCellUpdate,
    applyPasteUpdates,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSpreadsheetEditing({
    rows: routing,
    selectedIds,
    isEditMode,
    historyScope,
    onUpdate: onUpdateRoutingStep
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotRoutingStep> | null = null
      if (cell.field === 'processName') changes = { processName: cell.value }
      else if (cell.field === 'workCenterId') changes = { workCenterId: cell.value || undefined }
      else if (cell.field === 'manning') changes = { manning: parseNumber(cell.value) }
      else if (cell.field === 'capacity') changes = { capacity: parseNumber(cell.value) }
      else if (cell.field === 'yield') changes = { yield: cell.value.trim() === '' ? null : Number(cell.value) / 100 }
      else if (cell.field === 'note') changes = { note: cell.value }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyPasteUpdates(updates)
  }, [applyPasteUpdates])

  const { selectedCellKeys } = useTableKeyboardNav({
    tableRef,
    isEditMode,
    onPasteCells: handlePasteCells,
    onUndo: undo,
    onRedo: redo
  })

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDeleteRoutingStep(id))
    clearSelection()
  }

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleRowDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    event.preventDefault()
    const movingId = event.dataTransfer.getData('text/plain')
    if (!movingId || movingId === targetId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    onReorderRows(movingId, targetId, event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before')
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
            <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo last table edit" className="inline-flex min-h-9 items-center gap-1 border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" title="Undo (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo table edit" className="inline-flex min-h-9 items-center gap-1 border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" title="Redo (Ctrl+Y)">
              <Redo2 className="h-3.5 w-3.5" aria-hidden="true" /> Redo
            </button>
            <button type="button" onClick={onAddRoutingStep} className="flex min-h-9 items-center justify-center gap-1.5 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              <Plus className="h-3 w-3" aria-hidden="true" /> Add row
            </button>
          </div>
        )}
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-slate-800">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <CheckSquare className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
            {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex min-h-9 items-center gap-1.5 px-3 text-sm text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            title="Delete selected rows"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto min-h-9 px-3 text-sm text-slate-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="max-h-[520px] overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              {isEditMode && <th scope="col" className="w-8 px-1 py-2.5" aria-label="Reorder rows" />}
              <th scope="col" className="w-12 px-3 py-2.5 text-center">#</th>
              <th scope="col" className="px-3 py-2.5">Process</th>
              <th scope="col" className="px-3 py-2.5">WC</th>
              <th scope="col" className="px-3 py-2.5 text-right">Manning</th>
              <th scope="col" className="px-3 py-2.5 text-right">Cap</th>
              <th scope="col" className="px-3 py-2.5 text-right">Yield</th>
              <th scope="col" className="px-3 py-2.5">Note</th>
              {isEditMode && <th scope="col" className="w-12 px-2 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              const issues = rowIssues.get(step.id) || []
              const identityInvalid = !step.isGeneratedSizingPlaceholder && (!step.processName.trim() || duplicateProcessIds.has(step.id))
              const workCenterInvalid = !step.isGeneratedSizingPlaceholder && (!step.workCenterId?.trim() || !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase()))
              const rowNumber = routing.findIndex(row => row.id === step.id) + 1
              const numericClass = 'min-h-9 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700'

              return (
                <tr
                  key={step.id}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, step.id) }}
                  className={`${issues.length > 0 ? 'bg-amber-50/50 ' : ''}${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                  title={issues.length > 0 ? issues.join(' ') : undefined}
                >
                  {isEditMode && (
                    <td className="w-8 px-1 py-2 text-center">
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
                  <th scope="row" className="px-2 py-2 text-center font-mono font-normal text-slate-600">
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
                  <td className="px-3 py-2 font-sans text-slate-800">
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
                          className={`min-h-9 w-full rounded-sm border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(step.id, 'processName')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      ) : step.processName || <span className="text-amber-700">—</span>}
                      {issues.length > 0 && <p className="mt-1 text-xs leading-4 text-amber-800">{issues.join(' ')}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {isEditMode ? (
                      <select
                        value={step.workCenterId || ''}
                        onChange={event => applyCellUpdate(step.id, { workCenterId: event.target.value || undefined })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="workCenterId"
                        aria-label={`WC for Routing row ${rowNumber}`}
                        aria-invalid={workCenterInvalid}
                        className={`min-h-9 w-40 rounded-sm border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 ${workCenterInvalid ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(step.id, 'workCenterId')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
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
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
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
                        aria-invalid={!step.isGeneratedSizingPlaceholder && (step.manning === null || hasInvalidNumber(step.manning))}
                        className={`${numericClass} w-24 ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : numberValue(step.manning) || <span className="text-amber-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
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
                        aria-invalid={!step.isGeneratedSizingPlaceholder && (step.capacity === null || hasInvalidNumber(step.capacity))}
                        className={`${numericClass} w-28 ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : numberValue(step.capacity) || <span className="text-amber-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
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
                          aria-invalid={!step.isGeneratedSizingPlaceholder && (step.yield === null || hasInvalidNumber(step.yield) || step.yield > 1)}
                          className={`${numericClass} w-20 ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : step.yield === null ? <span className="text-amber-700">—</span> : `${(step.yield * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={step.note || ''}
                        onChange={event => applyCellUpdate(step.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="note"
                        aria-label={`Note for ${step.processName || `Routing row ${rowNumber}`}`}
                        className={`min-h-9 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(step.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : step.note || '—'}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRoutingStep(step.id)}
                        aria-label={`Delete Routing row ${rowNumber}`}
                        className="inline-flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        title="Delete row"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
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
      {(query || filteredRouting.some(step => (rowIssues.get(step.id) || []).length > 0)) && (
        <div role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {query && `Showing ${filteredRouting.length} of ${routing.length} rows. `}
          {filteredRouting.filter(step => (rowIssues.get(step.id) || []).length > 0).length} rows need review.
        </div>
      )}
    </section>
  )
}
