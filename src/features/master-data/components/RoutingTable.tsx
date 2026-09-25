import React, { useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, CheckSquare } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { DatasetQualityBadge } from './DatasetQualityBadge'
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
  const [bulkSource, setBulkSource] = useState('')
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

  const applyBulkSource = () => {
    if (!bulkSource.trim()) return
    selectedIds.forEach(id => onUpdateRoutingStep(id, { sourceRef: bulkSource.trim() }))
    clearSelection()
    setBulkSource('')
  }

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
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Process Routing</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{routing.length} STEPS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Filter operation / WC..."
              className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-44"
            />
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={onAddRoutingStep}
              className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          )}
        </div>
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-mono animate-in fade-in duration-100">
          <span className="font-bold flex items-center gap-1 text-emerald-300">
            <CheckSquare className="w-3.5 h-3.5" />
            {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <span className="text-slate-500">|</span>

          {/* Bulk Assign Work Center */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300">WC:</span>
            <select
              value={bulkWorkCenter}
              onChange={e => setBulkWorkCenter(e.target.value)}
              className="px-2 py-0.5 bg-slate-800 text-white border border-slate-600 rounded text-[11px] focus:outline-none focus:border-slate-400"
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
              className="px-2.5 py-0.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded cursor-pointer transition-colors"
            >
              Apply WC
            </button>
          </div>

          <span className="text-slate-500">|</span>

          {/* Bulk Source Reference */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300">Source:</span>
            <input
              value={bulkSource}
              onChange={event => setBulkSource(event.target.value)}
              placeholder="e.g. Cost declare row..."
              className="px-2 py-0.5 bg-slate-800 text-white border border-slate-600 rounded text-[11px] placeholder:text-slate-400 focus:outline-none focus:border-slate-400 w-36"
            />
            <button
              type="button"
              disabled={!bulkSource.trim()}
              onClick={applyBulkSource}
              className="px-2.5 py-0.5 bg-white text-slate-900 font-bold rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Apply Source
            </button>
          </div>

          <span className="text-slate-500">|</span>

          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-2 py-0.5 text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
            title="Delete selected rows"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[520px]">
        <table ref={tableRef} className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300 select-none">
            <tr>
              {isEditMode && (
                <th className="py-1.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredRouting.length > 0 && selectedIds.size === filteredRouting.length}
                    onChange={event => toggleAll(event.target.checked)}
                    className="cursor-pointer"
                  />
                </th>
              )}
              <th className="py-1.5 px-2">Operation</th>
              <th className="py-1.5 px-2">Process Name</th>
              <th className="py-1.5 px-2">Work Center</th>
              <th className="py-1.5 px-2 text-right">Manning</th>
              <th className="py-1.5 px-2 text-right">Capacity</th>
              <th className="py-1.5 px-2 text-right">Yield</th>
              <th className="py-1.5 px-2">Source Reference</th>
              <th className="py-1.5 px-2">Quality</th>
              {isEditMode && <th className="py-1.5 px-1 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              return (
                <tr
                  key={step.id}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 hover:bg-blue-100/70 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditMode && (
                    <td
                      className="py-1 px-2 text-center cursor-pointer select-none"
                      onMouseDown={e => startDrag(step.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled by onMouseDown/useDragSelect
                        className="cursor-pointer pointer-events-none"
                      />
                    </td>
                  )}
                  <td className="py-1 px-2 font-bold text-slate-900">
                    {isEditMode ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={step.operationCode || ''}
                          onChange={event => onUpdateRoutingStep(step.id, { operationCode: event.target.value })}
                          placeholder="Op Code"
                          className="w-20 px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                        />
                        <input
                          type="number"
                          step="1"
                          value={numberValue(step.sequence)}
                          onChange={event => onUpdateRoutingStep(step.id, { sequence: parseNumber(event.target.value) ?? undefined })}
                          placeholder="Seq"
                          className="w-14 px-1 py-0.5 text-right border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                        />
                      </div>
                    ) : (
                      `${step.operationCode || `Op ${step.sequence ?? '—'}`}`
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-800">
                    {isEditMode ? (
                      <input
                        value={step.processName}
                        onChange={event => onUpdateRoutingStep(step.id, { processName: event.target.value })}
                        className="w-full min-w-[150px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      step.processName || '—'
                    )}
                  </td>
                  <td className="py-1 px-2">
                    {isEditMode ? (
                      <select
                        value={step.workCenterId || ''}
                        onChange={event => onUpdateRoutingStep(step.id, { workCenterId: event.target.value || undefined })}
                        className="w-36 px-1 py-0.5 border border-transparent focus:border-slate-300 bg-transparent focus:bg-white"
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
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.manning)}
                        onChange={event => onUpdateRoutingStep(step.id, { manning: parseNumber(event.target.value) })}
                        className="w-20 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      numberValue(step.manning) || <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(step.capacity)}
                        onChange={event => onUpdateRoutingStep(step.id, { capacity: parseNumber(event.target.value) })}
                        className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      numberValue(step.capacity) || <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
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
                          className="w-16 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : step.yield === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      `${(step.yield * 100).toFixed(1)}%`
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={step.sourceRef || ''}
                        onChange={event => onUpdateRoutingStep(step.id, { sourceRef: event.target.value })}
                        placeholder="Source ref"
                        className="w-full min-w-[120px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      step.sourceRef || '—'
                    )}
                  </td>
                  <td className="py-1 px-2">
                    <DatasetQualityBadge
                      evidences={[step.confidence.sequence, step.confidence.manning, step.confidence.capacity, step.confidence.yield]}
                      sourceRef={step.sourceRef}
                    />
                  </td>
                  {isEditMode && (
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRoutingStep(step.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
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
                        className="mt-1 flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
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
      <div className="px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">
        Displaying {filteredRouting.length} of {routing.length} Routing Steps
      </div>
    </section>
  )
}
