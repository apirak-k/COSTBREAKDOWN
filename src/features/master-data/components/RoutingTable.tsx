import React, { useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, CheckSquare } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { useTableKeyboardNav } from '../hooks/useTableKeyboardNav'

interface RoutingTableProps {
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  onAddRoutingStep: () => void
  onUpdateRoutingStep: (id: string, partial: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>>) => void
  onDeleteRoutingStep: (id: string) => void
}
const numberValue = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
  isEditMode = false,
  onAddRoutingStep,
  onUpdateRoutingStep,
  onDeleteRoutingStep
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [bulkWorkCenter, setBulkWorkCenter] = useState('')

  const filteredRouting = useMemo(() => routing.filter(step =>
    `${step.operationCode || ''} ${step.processName} ${step.workCenterId || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [routing, searchTerm])

  const {
    selectedIds,
    toggleAll,
    clearSelection,
    startDrag,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRouting,
    getItemId: step => step.id,
    isEditMode
  })

  useTableKeyboardNav({
    tableRef,
    isEditMode
  })

  const applyBulkWorkCenter = () => {
    if (!bulkWorkCenter) return
    selectedIds.forEach(id => onUpdateRoutingStep(id, { workCenterId: bulkWorkCenter }))
    clearSelection()
    setBulkWorkCenter('')
  }

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDeleteRoutingStep(id))
    clearSelection()
  }

  return (
    <section aria-label="Process Routing rows" className="overflow-hidden bg-white select-none">
      <div className="flex flex-col gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Find operation or work center"
              aria-label="Filter routing by operation, process, or work center"
              className="min-h-9 w-full border border-slate-300 bg-white py-1 pl-9 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={onAddRoutingStep}
            className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add row
          </button>
        )}
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-slate-800 animate-in fade-in duration-100">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
            {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
          </span>

          {/* Bulk Assign Work Center */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="bulk-work-center" className="text-slate-700">Work center</label>
            <select
              id="bulk-work-center"
              value={bulkWorkCenter}
              onChange={e => setBulkWorkCenter(e.target.value)}
              className="min-h-9 max-w-full border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="">Select Work Center...</option>
              {rates.map(rate => (
                <option key={rate.id} value={rate.workCenterCode}>
                  {rate.workCenterCode} ({rate.description})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkWorkCenter}
              onClick={applyBulkWorkCenter}
              className="min-h-9 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              Apply WC
            </button>
          </div>

          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex min-h-9 items-center gap-1.5 px-3 text-sm text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 cursor-pointer"
            title="Delete selected rows"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="min-h-9 px-3 text-sm text-slate-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[520px]">
        <table ref={tableRef} className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800 select-none">
            <tr>
              {isEditMode && (
                <th scope="col" className="px-3 py-2.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredRouting.length > 0 && selectedIds.size === filteredRouting.length}
                    onChange={event => toggleAll(event.target.checked)}
                    aria-label="Select all visible routing rows"
                    className="h-4 w-4 cursor-pointer accent-slate-900"
                  />
                </th>
              )}
              <th scope="col" className="px-3 py-2.5">Operation Code</th>
              <th scope="col" className="px-3 py-2.5 text-right">Sequence</th>
              <th scope="col" className="px-3 py-2.5">Process Name</th>
              <th scope="col" className="px-3 py-2.5">Work Center</th>
              <th scope="col" className="px-3 py-2.5 text-right">Manning</th>
              <th scope="col" className="px-3 py-2.5 text-right">Capacity</th>
              <th scope="col" className="px-3 py-2.5 text-right">Yield</th>
              <th scope="col" className="px-3 py-2.5">Note</th>
              {isEditMode && <th scope="col" className="px-2 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              return (
                <tr
                  key={step.id}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  className={`transition-colors ${
                    isSelected
                      ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {isEditMode && (
                    <td
                      className="px-3 py-2 text-center cursor-pointer select-none"
                      onMouseDown={e => startDrag(step.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled by onMouseDown/useDragSelect
                        aria-label={`Select routing row ${step.operationCode || step.id}`}
                        className="h-4 w-4 cursor-pointer pointer-events-none accent-slate-900"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {isEditMode ? (
                      <input
                        value={step.operationCode || ''}
                        onChange={event => onUpdateRoutingStep(step.id, { operationCode: event.target.value })}
                        placeholder="Operation Code"
                        aria-label={`Operation code for routing row ${step.id}`}
                        className="min-h-9 w-32 rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      step.operationCode || <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="1"
                        value={numberValue(step.sequence)}
                        onChange={event => onUpdateRoutingStep(step.id, { sequence: parseNumber(event.target.value) ?? undefined })}
                        aria-label={`Sequence for ${step.operationCode || step.id}`}
                        className="min-h-9 w-20 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      step.sequence ?? <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-800">
                    {isEditMode ? (
                      <input
                        value={step.processName}
                        onChange={event => onUpdateRoutingStep(step.id, { processName: event.target.value })}
                        aria-label={`Process name for ${step.operationCode || step.id}`}
                        className="min-h-9 w-full min-w-[170px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      step.processName || '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditMode ? (
                      <select
                        value={step.workCenterId || ''}
                        onChange={event => onUpdateRoutingStep(step.id, { workCenterId: event.target.value || undefined })}
                        aria-label={`Work center for ${step.operationCode || step.id}`}
                        className="min-h-9 w-40 rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      >
                        <option value="">Select WC</option>
                        {rates.map(rate => (
                          <option key={rate.id} value={rate.workCenterCode}>
                            {rate.workCenterCode}
                          </option>
                        ))}
                      </select>
                    ) : (
                      step.workCenterId || <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.manning)}
                        onChange={event => onUpdateRoutingStep(step.id, { manning: parseNumber(event.target.value) })}
                        aria-label={`Manning for ${step.operationCode || step.id}`}
                        className="min-h-9 w-24 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      numberValue(step.manning) || <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.capacity)}
                        onChange={event => onUpdateRoutingStep(step.id, { capacity: parseNumber(event.target.value) })}
                        aria-label={`Capacity for ${step.operationCode || step.id}`}
                        className="min-h-9 w-28 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      numberValue(step.capacity) || <span className="text-amber-700">—</span>
                    )}
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
                            onUpdateRoutingStep(step.id, { yield: value === '' ? null : Number(value) / 100 })
                          }}
                          aria-label={`Yield percentage for ${step.operationCode || step.id}`}
                          className="min-h-9 w-20 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : step.yield === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      `${(step.yield * 100).toFixed(1)}%`
                    )}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={step.note || ''}
                        onChange={event => onUpdateRoutingStep(step.id, { note: event.target.value })}
                        placeholder="Note"
                        aria-label={`Note for ${step.operationCode || step.id}`}
                        className="min-h-9 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      step.note || '—'
                    )}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRoutingStep(step.id)}
                        aria-label={`Delete routing row ${step.operationCode || step.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {filteredRouting.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 10 : 8} className="py-6 text-center text-slate-500 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs text-slate-500 italic">
                      {routing.length === 0 ? 'No Process Routing steps in this dataset yet.' : 'No rows match your filter.'}
                    </p>
                    {isEditMode && routing.length === 0 && (
                      <button
                        type="button"
                        onClick={onAddRoutingStep}
                        className="mt-1 flex min-h-9 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                        <span>Add First Row</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {searchTerm.trim() !== '' && (
        <div role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Showing {filteredRouting.length} of {routing.length} matching rows
        </div>
      )}
    </section>
  )
}
