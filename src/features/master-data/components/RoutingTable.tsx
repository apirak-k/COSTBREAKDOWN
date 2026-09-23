import React, { useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { DatasetQualityBadge } from './DatasetQualityBadge'

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

export const RoutingTable: React.FC<RoutingTableProps> = ({ routing, rates, isEditMode = false, onAddRoutingStep, onUpdateRoutingStep, onDeleteRoutingStep }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSource, setBulkSource] = useState('')
  const filteredRouting = useMemo(() => routing.filter(step => `${step.operationCode || ''} ${step.processName} ${step.workCenterId || ''}`.toLowerCase().includes(searchTerm.toLowerCase())), [routing, searchTerm])

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(filteredRouting.map(step => step.id)) : new Set())
  const toggleRow = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const applyBulkSource = () => {
    if (!bulkSource.trim()) return
    selectedIds.forEach(id => onUpdateRoutingStep(id, { sourceRef: bulkSource.trim() }))
    setSelectedIds(new Set())
    setBulkSource('')
  }

  return (
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2"><span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Process Routing</span><span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{routing.length} STEPS</span></div>
        <div className="flex flex-wrap items-center gap-2"><div className="relative"><Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filter operation / WC..." className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-40" /></div>{isEditMode && <button type="button" onClick={onAddRoutingStep} className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"><Plus className="w-3 h-3" /> Add Row</button>}</div>
      </div>

      {isEditMode && selectedIds.size > 0 && <div className="flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-mono"><span>{selectedIds.size} selected</span><input value={bulkSource} onChange={event => setBulkSource(event.target.value)} placeholder="Source Reference" className="px-2 py-0.5 bg-white text-slate-900 border border-slate-300 rounded" /><button type="button" onClick={applyBulkSource} className="px-2 py-0.5 bg-white text-slate-900 font-bold rounded cursor-pointer">Apply source</button><button type="button" onClick={() => setSelectedIds(new Set())} className="px-2 py-0.5 text-slate-300 hover:text-white cursor-pointer">Cancel</button></div>}

      <div className="overflow-x-auto max-h-[520px]"><table className="w-full text-xs text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300"><tr>
          {isEditMode && <th className="py-1.5 px-2 text-center w-8"><input type="checkbox" checked={filteredRouting.length > 0 && selectedIds.size === filteredRouting.length} onChange={event => toggleAll(event.target.checked)} /></th>}
          <th className="py-1.5 px-2">Operation</th><th className="py-1.5 px-2">Process Name</th><th className="py-1.5 px-2">Work Center</th><th className="py-1.5 px-2 text-right">Manning</th><th className="py-1.5 px-2 text-right">Capacity</th><th className="py-1.5 px-2 text-right">Yield</th><th className="py-1.5 px-2">Source Reference</th><th className="py-1.5 px-2">Quality</th>{isEditMode && <th className="py-1.5 px-1 text-center">Actions</th>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {filteredRouting.map(step => <tr key={step.id} className="hover:bg-slate-50/80">
            {isEditMode && <td className="py-1 px-2 text-center"><input type="checkbox" checked={selectedIds.has(step.id)} onChange={() => toggleRow(step.id)} /></td>}
            <td className="py-1 px-2 font-bold text-slate-900">{isEditMode ? <div className="flex items-center gap-1"><input value={step.operationCode || ''} onChange={event => onUpdateRoutingStep(step.id, { operationCode: event.target.value })} className="w-20 px-1 py-0.5 border border-transparent focus:border-slate-300" /><input type="number" step="1" value={numberValue(step.sequence)} onChange={event => onUpdateRoutingStep(step.id, { sequence: parseNumber(event.target.value) ?? undefined })} className="w-14 px-1 py-0.5 text-right border border-transparent focus:border-slate-300" /></div> : `${step.operationCode || `Op ${step.sequence ?? '—'}`}`}</td>
            <td className="py-1 px-2 font-sans text-slate-800">{isEditMode ? <input value={step.processName} onChange={event => onUpdateRoutingStep(step.id, { processName: event.target.value })} className="w-full min-w-[150px] px-1 py-0.5 border border-transparent focus:border-slate-300" /> : step.processName || '—'}</td>
            <td className="py-1 px-2">{isEditMode ? <select value={step.workCenterId || ''} onChange={event => onUpdateRoutingStep(step.id, { workCenterId: event.target.value || undefined })} className="w-32 px-1 py-0.5 border border-transparent focus:border-slate-300"><option value="">Select WC</option>{rates.map(rate => <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode}</option>)}</select> : step.workCenterId || <span className="text-amber-700">—</span>}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <input type="number" step="any" value={numberValue(step.manning)} onChange={event => onUpdateRoutingStep(step.id, { manning: parseNumber(event.target.value) })} className="w-20 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : numberValue(step.manning) || <span className="text-amber-700">—</span>}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <input type="number" step="any" value={numberValue(step.capacity)} onChange={event => onUpdateRoutingStep(step.id, { capacity: parseNumber(event.target.value) })} className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : numberValue(step.capacity) || <span className="text-amber-700">—</span>}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <div className="flex items-center justify-end gap-1"><input type="number" step="any" value={step.yield === null ? '' : String(step.yield * 100)} onChange={event => { const value = event.target.value.trim(); onUpdateRoutingStep(step.id, { yield: value === '' ? null : Number(value) / 100 }) }} className="w-16 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /><span className="text-slate-400">%</span></div> : step.yield === null ? <span className="text-amber-700">—</span> : `${(step.yield * 100).toFixed(1)}%`}</td>
            <td className="py-1 px-2 font-sans text-slate-600">{step.sourceRef || '—'}</td>
            <td className="py-1 px-2"><DatasetQualityBadge evidences={[step.confidence.sequence, step.confidence.manning, step.confidence.capacity, step.confidence.yield]} sourceRef={step.sourceRef} /></td>
            {isEditMode && <td className="py-1 px-1 text-center"><button type="button" onClick={() => onDeleteRoutingStep(step.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete row"><Trash2 className="w-3 h-3" /></button></td>}
          </tr>)}
          {filteredRouting.length === 0 && <tr><td colSpan={isEditMode ? 10 : 8} className="py-8 text-center text-slate-400 font-sans italic">{routing.length === 0 ? 'No Routing steps configured.' : 'No rows match the filter.'}</td></tr>}
        </tbody>
      </table></div>
      <div className="px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">Displaying {filteredRouting.length} of {routing.length} Routing Steps</div>
    </section>
  )
}
