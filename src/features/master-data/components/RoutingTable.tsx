import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { RoutingStep, WorkCenterRate, formatCurrency, formatNumber, formatPercent } from '../../../core'

interface RoutingTableProps {
  routing: RoutingStep[]
  rates: WorkCenterRate[]
  activeConvCost: number
  onAddRoutingStep: () => void
  onEditRoutingStep: (step: RoutingStep) => void
  onDeleteRoutingStep: (id: string) => void
}

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates: _rates,
  activeConvCost,
  onAddRoutingStep,
  onEditRoutingStep,
  onDeleteRoutingStep
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRouting = routing.filter(
    r =>
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.wc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Section D: Process Routing (Conversion Operations)
          </h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {routing.length} Steps
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search routing steps..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 font-sans"
            />
          </div>

          <button
            onClick={onAddRoutingStep}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Routing Step
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5 whitespace-nowrap">Seq</th>
              <th className="p-2.5">Operation Description</th>
              <th className="p-2.5 whitespace-nowrap">Department (WC)</th>
              <th className="p-2.5 text-right whitespace-nowrap">Manning</th>
              <th className="p-2.5 text-right whitespace-nowrap">Base Cap (pc/hr)</th>
              <th className="p-2.5 text-right whitespace-nowrap">Active Cap (pc/hr)</th>
              <th className="p-2.5 text-right whitespace-nowrap">Base Yield %</th>
              <th className="p-2.5 text-right whitespace-nowrap">Active Yield %</th>
              <th className="p-2.5 whitespace-nowrap">Source Reference</th>
              <th className="p-2.5 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredRouting.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-400 font-sans italic">
                  {routing.length === 0
                    ? 'No Routing operations present. Click "Add Routing Step" or upload an Excel file.'
                    : 'No Routing steps match your search filter.'}
                </td>
              </tr>
            ) : (
              filteredRouting.map(rt => (
                <tr key={rt.id} className="hover:bg-slate-50/80">
                  <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{rt.opSeq}</td>
                  <td className="p-2.5 font-sans text-slate-700">{rt.description}</td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px] font-sans">
                      {rt.wc}
                    </span>
                  </td>
                  <td className="p-2.5 text-right whitespace-nowrap">{formatNumber(rt.manning, 1)}</td>
                  <td className="p-2.5 text-right text-slate-500 whitespace-nowrap">{formatNumber(rt.baseCap, 0)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(rt.activeCap, 0)}</td>
                  <td className="p-2.5 text-right text-slate-500 whitespace-nowrap">{formatPercent(rt.baseYield, 1)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatPercent(rt.activeYield, 1)}</td>
                  <td className="p-2.5 font-sans text-slate-500 text-[11px] whitespace-nowrap">{rt.sourceRef}</td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditRoutingStep(rt)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        title="Edit Step"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRoutingStep(rt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                        title="Delete Step"
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

      {/* Live Conversion Summary */}
      <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono">
        <span className="font-sans text-slate-600 font-medium">
          Active Conversion Standard Total (C_L + C_B):
        </span>
        <span className="font-bold text-slate-900 text-sm">
          {formatCurrency(activeConvCost, 4, 'THB/pc')}
        </span>
      </div>
    </div>
  )
}
