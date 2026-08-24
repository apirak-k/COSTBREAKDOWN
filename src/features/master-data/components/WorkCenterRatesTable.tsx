import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WorkCenterRate } from '../../../core'

interface WorkCenterRatesTableProps {
  rates: WorkCenterRate[]
  isEditMode?: boolean
  onAddRate: () => void
  onEditRate?: (rate: WorkCenterRate) => void
  onUpdateRate: (wc: string, partial: Partial<WorkCenterRate>) => void
  onDeleteRate: (wc: string) => void
}

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  isEditMode = false,
  onAddRate,
  onUpdateRate,
  onDeleteRate
}) => {
  return (
    <div className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">
            Work Center Rates
          </span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-200 text-slate-800 rounded-none">
            {rates.length} DEPTS
          </span>
        </div>

        {isEditMode && (
          <button
            onClick={onAddRate}
            className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Rate
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
              <th className="py-1.5 px-2.5 whitespace-nowrap w-36">Department (WC)</th>
              <th className="py-1.5 px-2.5 min-w-[160px]">Description</th>
              <th className="py-1.5 px-2.5 text-right whitespace-nowrap w-36 font-bold text-slate-900">Labor Rate (THB/hr)</th>
              <th className="py-1.5 px-2.5 text-right whitespace-nowrap w-36 font-bold text-slate-900">Burden Rate (THB/hr)</th>
              <th className="py-1.5 px-2.5 whitespace-nowrap w-36">Source Reference</th>
              {isEditMode && <th className="py-1.5 px-2 text-center whitespace-nowrap w-12">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 6 : 5} className="py-6 text-center text-slate-400 font-sans italic">
                  No Work Center rates configured.
                </td>
              </tr>
            ) : (
              rates.map(r => (
                <tr key={r.wc} className="hover:bg-slate-50/80 transition-colors">
                  {/* WC Name */}
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-800 rounded font-mono text-[10px] border border-slate-200">
                      {r.wc}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={r.description}
                        onChange={e => onUpdateRate(r.wc, { description: e.target.value })}
                        className="w-full px-1.5 py-0.5 font-sans text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans text-slate-800 text-xs">{r.description || '—'}</span>
                    )}
                  </td>

                  {/* Labor Rate */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={r.laborRate}
                        onChange={e => onUpdateRate(r.wc, { laborRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{r.laborRate.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Burden Rate */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={r.burdenRate}
                        onChange={e => onUpdateRate(r.wc, { burdenRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{r.burdenRate.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Source Reference */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={r.sourceRef}
                        onChange={e => onUpdateRate(r.wc, { sourceRef: e.target.value })}
                        placeholder="e.g. Cost Declare"
                        className="w-full px-1.5 py-0.5 font-sans text-[10px] text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans text-slate-500 text-[11px]">{r.sourceRef || '—'}</span>
                    )}
                  </td>

                  {/* Actions */}
                  {isEditMode && (
                    <td className="py-1 px-1 text-center whitespace-nowrap">
                      <button
                        onClick={() => onDeleteRate(r.wc)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete Rate"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
