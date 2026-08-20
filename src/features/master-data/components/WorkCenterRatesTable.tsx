import React from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { WorkCenterRate, formatNumber } from '../../../core'

interface WorkCenterRatesTableProps {
  rates: WorkCenterRate[]
  onAddRate: () => void
  onEditRate: (rate: WorkCenterRate) => void
  onDeleteRate: (wc: string) => void
}

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  onAddRate,
  onEditRate,
  onDeleteRate
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Section B: Work Center Rates (Standard Rate Card)
          </h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {rates.length} Departments
          </span>
        </div>
        <button
          onClick={onAddRate}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Work Center Rate
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5">WC</th>
              <th className="p-2.5">Department Description</th>
              <th className="p-2.5 text-right">Labor Rate (THB/MHr)</th>
              <th className="p-2.5 text-right">Burden Rate (THB/MHr)</th>
              <th className="p-2.5">Source Reference</th>
              <th className="p-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400 font-sans italic">
                  No Work Center rates. Click Add or import an Excel file.
                </td>
              </tr>
            ) : (
              rates.map(r => (
                <tr key={r.wc} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{r.wc}</td>
                  <td className="px-3 py-2 font-sans text-slate-700">{r.description}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(r.laborRate, 2)}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(r.burdenRate, 2)}</td>
                  <td className="px-3 py-2 font-sans text-slate-500 text-[11px] whitespace-nowrap">{r.sourceRef}</td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditRate(r)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        title="Edit Rate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRate(r.wc)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                        title="Delete Rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
