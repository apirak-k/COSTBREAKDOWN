import React, { useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotWorkCenterRate } from '../../../core'
import { DatasetQualityBadge } from './DatasetQualityBadge'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSource, setBulkSource] = useState('')

  const filteredRates = useMemo(() => rates.filter(rate =>
    `${rate.workCenterCode} ${rate.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [rates, searchTerm])

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(filteredRates.map(rate => rate.id)) : new Set())
  const toggleRow = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const applyBulkSource = () => {
    if (!bulkSource.trim()) return
    selectedIds.forEach(id => onUpdateRate(id, { sourceRef: bulkSource.trim() }))
    setSelectedIds(new Set())
    setBulkSource('')
  }

  return (
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Work Center Rates</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{rates.length} ROWS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filter work centers..." className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-40" />
          </div>
          {isEditMode && (
            <button type="button" onClick={onAddRate} className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          )}
        </div>
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-mono">
          <span>{selectedIds.size} selected</span>
          <input value={bulkSource} onChange={event => setBulkSource(event.target.value)} placeholder="Source Reference" className="px-2 py-0.5 bg-white text-slate-900 border border-slate-300 rounded" />
          <button type="button" onClick={applyBulkSource} className="px-2 py-0.5 bg-white text-slate-900 font-bold rounded cursor-pointer">Apply source</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="px-2 py-0.5 text-slate-300 hover:text-white cursor-pointer">Cancel</button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
            <tr>
              {isEditMode && <th className="py-1.5 px-2 text-center w-8"><input type="checkbox" checked={filteredRates.length > 0 && selectedIds.size === filteredRates.length} onChange={event => toggleAll(event.target.checked)} /></th>}
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
            {filteredRates.map(rate => (
              <tr key={rate.id} className="hover:bg-slate-50/80">
                {isEditMode && <td className="py-1 px-2 text-center"><input type="checkbox" checked={selectedIds.has(rate.id)} onChange={() => toggleRow(rate.id)} /></td>}
                <td className="py-1 px-2 font-bold text-slate-900">{rate.workCenterCode}</td>
                <td className="py-1 px-2 font-sans text-slate-800">{rate.description || '—'}</td>
                <td className="py-1 px-2 text-right">
                  {isEditMode ? <input type="number" step="any" value={numberValue(rate.laborRate)} onChange={event => onUpdateRate(rate.id, { laborRate: parseNumber(event.target.value) })} className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : rate.laborRate === null ? <span className="text-amber-700">—</span> : rate.laborRate.toFixed(4)}
                </td>
                <td className="py-1 px-2 text-right">
                  {isEditMode ? <input type="number" step="any" value={numberValue(rate.burdenRate)} onChange={event => onUpdateRate(rate.id, { burdenRate: parseNumber(event.target.value) })} className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : rate.burdenRate === null ? <span className="text-amber-700">—</span> : rate.burdenRate.toFixed(4)}
                </td>
                <td className="py-1 px-2 text-slate-600">{rate.effectiveDate || '—'}</td>
                <td className="py-1 px-2 font-sans text-slate-600">{rate.sourceRef || '—'}</td>
                <td className="py-1 px-2"><DatasetQualityBadge evidences={[rate.confidence.laborRate, rate.confidence.burdenRate]} sourceRef={rate.sourceRef} /></td>
                {isEditMode && <td className="py-1 px-1 text-center"><button type="button" onClick={() => onDeleteRate(rate.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete row"><Trash2 className="w-3 h-3" /></button></td>}
              </tr>
            ))}
            {filteredRates.length === 0 && <tr><td colSpan={isEditMode ? 9 : 7} className="py-8 text-center text-slate-400 font-sans italic">{rates.length === 0 ? 'No Work Center rates configured.' : 'No rows match the filter.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">Displaying {filteredRates.length} of {rates.length} Work Centers</div>
    </section>
  )
}
