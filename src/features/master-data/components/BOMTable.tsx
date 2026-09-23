import React, { useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotBOMItem } from '../../../core'
import { DatasetQualityBadge } from './DatasetQualityBadge'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
  isEditMode?: boolean
  onAddBOMItem: () => void
  onUpdateBOMItem: (id: string, partial: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => void
  onDeleteBOMItem: (id: string) => void
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const displayNumber = (value: number | null, digits = 4): string => value === null ? '—' : value.toFixed(digits)

export const BOMTable: React.FC<BOMTableProps> = ({ bom, isEditMode = false, onAddBOMItem, onUpdateBOMItem, onDeleteBOMItem }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSource, setBulkSource] = useState('')
  const filteredBOM = useMemo(() => bom.filter(item => `${item.itemCode} ${item.description}`.toLowerCase().includes(searchTerm.toLowerCase())), [bom, searchTerm])

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(filteredBOM.map(item => item.id)) : new Set())
  const toggleRow = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const applyBulkSource = () => {
    if (!bulkSource.trim()) return
    selectedIds.forEach(id => onUpdateBOMItem(id, { sourceRef: bulkSource.trim() }))
    setSelectedIds(new Set())
    setBulkSource('')
  }

  return (
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2"><span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Bill of Materials</span><span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{bom.length} ITEMS</span></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filter item / code..." className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-40" /></div>
          {isEditMode && <button type="button" onClick={onAddBOMItem} className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"><Plus className="w-3 h-3" /> Add Row</button>}
        </div>
      </div>

      {isEditMode && selectedIds.size > 0 && <div className="flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-mono"><span>{selectedIds.size} selected</span><input value={bulkSource} onChange={event => setBulkSource(event.target.value)} placeholder="Source Reference" className="px-2 py-0.5 bg-white text-slate-900 border border-slate-300 rounded" /><button type="button" onClick={applyBulkSource} className="px-2 py-0.5 bg-white text-slate-900 font-bold rounded cursor-pointer">Apply source</button><button type="button" onClick={() => setSelectedIds(new Set())} className="px-2 py-0.5 text-slate-300 hover:text-white cursor-pointer">Cancel</button></div>}

      <div className="overflow-x-auto max-h-[520px]"><table className="w-full text-xs text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300"><tr>
          {isEditMode && <th className="py-1.5 px-2 text-center w-8"><input type="checkbox" checked={filteredBOM.length > 0 && selectedIds.size === filteredBOM.length} onChange={event => toggleAll(event.target.checked)} /></th>}
          <th className="py-1.5 px-2">Item Code</th><th className="py-1.5 px-2">Description</th><th className="py-1.5 px-2 text-right">Consumption</th><th className="py-1.5 px-2">Unit</th><th className="py-1.5 px-2 text-right">Price</th><th className="py-1.5 px-2 text-right">Loss</th><th className="py-1.5 px-2">Source Reference</th><th className="py-1.5 px-2">Quality</th>{isEditMode && <th className="py-1.5 px-1 text-center">Actions</th>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {filteredBOM.map(item => <tr key={item.id} className="hover:bg-slate-50/80">
            {isEditMode && <td className="py-1 px-2 text-center"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleRow(item.id)} /></td>}
            <td className="py-1 px-2 font-bold text-slate-900">{isEditMode ? <input value={item.itemCode} onChange={event => onUpdateBOMItem(item.id, { itemCode: event.target.value })} className="w-28 px-1 py-0.5 border border-transparent focus:border-slate-300" /> : item.itemCode}</td>
            <td className="py-1 px-2 font-sans text-slate-800">{isEditMode ? <input value={item.description} onChange={event => onUpdateBOMItem(item.id, { description: event.target.value })} className="w-full min-w-[150px] px-1 py-0.5 border border-transparent focus:border-slate-300" /> : item.description || '—'}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <input type="number" step="any" value={numberValue(item.consumption)} onChange={event => onUpdateBOMItem(item.id, { consumption: parseNumber(event.target.value) })} className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : displayNumber(item.consumption)}</td>
            <td className="py-1 px-2">{isEditMode ? <input value={item.unit} onChange={event => onUpdateBOMItem(item.id, { unit: event.target.value })} className="w-16 px-1 py-0.5 border border-transparent focus:border-slate-300" /> : item.unit || '—'}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <input type="number" step="any" value={numberValue(item.price)} onChange={event => onUpdateBOMItem(item.id, { price: parseNumber(event.target.value) })} className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /> : displayNumber(item.price, 2)}</td>
            <td className="py-1 px-2 text-right">{isEditMode ? <div className="flex items-center justify-end gap-1"><input type="number" step="any" value={item.loss === null ? '' : String(item.loss * 100)} onChange={event => { const value = event.target.value.trim(); onUpdateBOMItem(item.id, { loss: value === '' ? null : Number(value) / 100 }) }} className="w-16 text-right px-1 py-0.5 border border-transparent focus:border-slate-300" /><span className="text-slate-400">%</span></div> : item.loss === null ? <span className="text-amber-700">—</span> : `${(item.loss * 100).toFixed(1)}%`}</td>
            <td className="py-1 px-2 font-sans text-slate-600">{item.sourceRef || '—'}</td>
            <td className="py-1 px-2"><DatasetQualityBadge evidences={[item.confidence.consumption, item.confidence.price, item.confidence.loss]} sourceRef={item.sourceRef} /></td>
            {isEditMode && <td className="py-1 px-1 text-center"><button type="button" onClick={() => onDeleteBOMItem(item.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete row"><Trash2 className="w-3 h-3" /></button></td>}
          </tr>)}
          {filteredBOM.length === 0 && <tr><td colSpan={isEditMode ? 10 : 8} className="py-8 text-center text-slate-400 font-sans italic">{bom.length === 0 ? 'No BOM items configured.' : 'No rows match the filter.'}</td></tr>}
        </tbody>
      </table></div>
      <div className="px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">Displaying {filteredBOM.length} of {bom.length} BOM Items</div>
    </section>
  )
}
