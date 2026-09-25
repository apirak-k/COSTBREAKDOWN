import React, { useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, CheckSquare } from 'lucide-react'
import { SnapshotWorkCenterRate } from '../../../core'
import { DatasetQualityBadge } from './DatasetQualityBadge'
import { useDragSelect } from '../hooks/useDragSelect'
import { useTableKeyboardNav } from '../hooks/useTableKeyboardNav'

interface WorkCenterRatesTableProps {
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  onAddRate: () => void
  onEditRate?: (rate: SnapshotWorkCenterRate) => void
  onUpdateRate: (id: string, partial: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>>) => void
  onDeleteRate: (id: string) => void
}
const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  isEditMode = false,
  onAddRate,
  onUpdateRate,
  onDeleteRate
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [bulkSource, setBulkSource] = useState('')

  const filteredRates = useMemo(() => rates.filter(rate =>
    `${rate.workCenterCode} ${rate.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [rates, searchTerm])

  const {
    selectedIds,
    toggleAll,
    clearSelection,
    startDrag,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRates,
    getItemId: rate => rate.id,
    isEditMode
  })

  useTableKeyboardNav({
    tableRef,
    isEditMode
  })

  const applyBulkSource = () => {
    if (!bulkSource.trim()) return
    selectedIds.forEach(id => onUpdateRate(id, { sourceRef: bulkSource.trim() }))
    clearSelection()
    setBulkSource('')
  }

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDeleteRate(id))
    clearSelection()
  }

  return (
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Work Center Rates</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{rates.length} ROWS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Filter work centers..."
              className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-44"
            />
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={onAddRate}
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

          {/* Bulk Source Reference */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300">Source:</span>
            <input
              value={bulkSource}
              onChange={event => setBulkSource(event.target.value)}
              placeholder="e.g. Cost declare row..."
              className="px-2 py-0.5 bg-slate-800 text-white border border-slate-600 rounded text-[11px] placeholder:text-slate-400 focus:outline-none focus:border-slate-400 w-44"
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
                    checked={filteredRates.length > 0 && selectedIds.size === filteredRates.length}
                    onChange={event => toggleAll(event.target.checked)}
                    className="cursor-pointer"
                  />
                </th>
              )}
              <th className="py-1.5 px-2">Work Center</th>
              <th className="py-1.5 px-2">Description</th>
              <th className="py-1.5 px-2 text-right">Labor Rate</th>
              <th className="py-1.5 px-2 text-right">Burden Rate</th>
              <th className="py-1.5 px-2">Effective Date</th>
              <th className="py-1.5 px-2">Source Reference</th>
              <th className="py-1.5 px-2">Quality</th>
              {isEditMode && <th className="py-1.5 px-1 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredRates.map(rate => {
              const isSelected = selectedIds.has(rate.id)
              return (
                <tr
                  key={rate.id}
                  onMouseEnter={() => onMouseEnterRow(rate.id)}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 hover:bg-blue-100/70 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditMode && (
                    <td
                      className="py-1 px-2 text-center cursor-pointer select-none"
                      onMouseDown={e => startDrag(rate.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="cursor-pointer pointer-events-none"
                      />
                    </td>
                  )}
                  <td className="py-1 px-2 font-bold text-slate-900">
                    {isEditMode ? (
                      <input
                        value={rate.workCenterCode}
                        onChange={event => onUpdateRate(rate.id, { workCenterCode: event.target.value })}
                        className="w-28 px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      rate.workCenterCode
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-800">
                    {isEditMode ? (
                      <input
                        value={rate.description}
                        onChange={event => onUpdateRate(rate.id, { description: event.target.value })}
                        className="w-full min-w-[150px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      rate.description || '—'
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(rate.laborRate)}
                        onChange={event => onUpdateRate(rate.id, { laborRate: parseNumber(event.target.value) })}
                        className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : rate.laborRate === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      rate.laborRate.toFixed(4)
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(rate.burdenRate)}
                        onChange={event => onUpdateRate(rate.id, { burdenRate: parseNumber(event.target.value) })}
                        className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : rate.burdenRate === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      rate.burdenRate.toFixed(4)
                    )}
                  </td>
                  <td className="py-1 px-2 text-slate-600">
                    {isEditMode ? (
                      <input
                        type="date"
                        value={rate.effectiveDate || ''}
                        onChange={event => onUpdateRate(rate.id, { effectiveDate: event.target.value })}
                        className="w-32 px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent text-[11px]"
                      />
                    ) : (
                      rate.effectiveDate || '—'
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={rate.sourceRef || ''}
                        onChange={event => onUpdateRate(rate.id, { sourceRef: event.target.value })}
                        placeholder="Source ref"
                        className="w-full min-w-[120px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      rate.sourceRef || '—'
                    )}
                  </td>
                  <td className="py-1 px-2">
                    <DatasetQualityBadge
                      evidences={[rate.confidence.laborRate, rate.confidence.burdenRate]}
                      sourceRef={rate.sourceRef}
                    />
                  </td>
                  {isEditMode && (
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRate(rate.id)}
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
            {filteredRates.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 9 : 7} className="py-6 text-center text-slate-500 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs text-slate-500 italic">
                      {rates.length === 0 ? 'No Work Center rates in this dataset yet.' : 'No rows match your filter.'}
                    </p>
                    {isEditMode && rates.length === 0 && (
                      <button
                        type="button"
                        onClick={onAddRate}
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
        Displaying {filteredRates.length} of {rates.length} Work Centers
      </div>
    </section>
  )
}
