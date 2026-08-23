import React, { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { RoutingStep, WorkCenterRate, formatCurrency, getFieldConfidence } from '../../../core'
import { ConfidenceBadge } from '../../../shared'

interface RoutingTableProps {
  routing: RoutingStep[]
  rates: WorkCenterRate[]
  activeConvCost: number
  onAddRoutingStep: () => void
  onEditRoutingStep?: (step: RoutingStep) => void
  onUpdateRoutingStep: (id: string, partial: Partial<RoutingStep>) => void
  onDeleteRoutingStep: (id: string) => void
}

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
  activeConvCost,
  onAddRoutingStep,
  onUpdateRoutingStep,
  onDeleteRoutingStep
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRouting = routing.filter(
    r =>
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.wc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Bulk Quick Action: Copy Base to Active for all Routing operations
  const handleCopyBaseToActiveAll = () => {
    routing.forEach(r => {
      onUpdateRoutingStep(r.id, {
        activeCap: r.baseCap,
        activeYield: r.baseYield
      })
    })
  }

  // Bulk Quick Action: Set all manning to 1
  const handleSetAllManningOne = () => {
    routing.forEach(r => {
      onUpdateRoutingStep(r.id, { manning: 1 })
    })
  }

  // Bulk Quick Action: Apply % capacity shift across all steps
  const handleBulkCapShift = (pct: number) => {
    routing.forEach(r => {
      onUpdateRoutingStep(r.id, {
        activeCap: Math.round(r.activeCap * (1 + pct))
      })
    })
  }

  return (
    <div className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">
            Section D: Process Routing (Conversion Operations) — Live Inline Grid
          </span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-200 text-slate-800 rounded-none">
            {routing.length} STEPS
          </span>
        </div>

        {/* Search & Bulk Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter operation / dept..."
              className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-36"
            />
          </div>

          {/* Bulk Tools */}
          <button
            type="button"
            onClick={handleCopyBaseToActiveAll}
            className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
            title="Reset all Active Capacity and Yield to match Base values"
          >
            Copy Base ➔ Active
          </button>

          <button
            type="button"
            onClick={handleSetAllManningOne}
            className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
            title="Set headcount Manning = 1 for all steps"
          >
            Set Manning = 1
          </button>

          <button
            type="button"
            onClick={() => handleBulkCapShift(0.05)}
            className="px-2 py-0.5 text-[11px] font-mono font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
            title="Increase all active capacity by +5%"
          >
            +5% Cap Shift
          </button>

          <button
            onClick={onAddRoutingStep}
            className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-none transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Row
          </button>
        </div>
      </div>

      {/* High-Density Spreadsheet Table */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
              <th className="py-1.5 px-2 text-center w-8 text-slate-400">#</th>
              <th className="py-1.5 px-1.5 whitespace-nowrap w-16">Seq</th>
              <th className="py-1.5 px-2 min-w-[160px]">Operation Description</th>
              <th className="py-1.5 px-1.5 whitespace-nowrap w-24">Work Center</th>
              <th className="py-1.5 px-1 text-center whitespace-nowrap w-14">Manning</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24">Base Cap (pc/hr)</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap bg-amber-100/70 text-amber-950 border-x border-amber-300 w-28">
                Active Cap (pc/hr)
              </th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-20">Base Yield</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap bg-amber-100/70 text-amber-950 border-x border-amber-300 w-24">
                Active Yield
              </th>
              <th className="py-1.5 px-2 whitespace-nowrap w-28">Source Ref</th>
              <th className="py-1.5 px-1 text-center whitespace-nowrap w-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {filteredRouting.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400 font-sans italic">
                  {routing.length === 0
                    ? 'No Routing steps configured. Click "Add Row" or import an Excel workbook.'
                    : 'No Routing steps match search filter.'}
                </td>
              </tr>
            ) : (
              filteredRouting.map((rt, idx) => (
                <tr key={rt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-1 px-2 text-center text-slate-400 select-none">{idx + 1}</td>
                  
                  {/* Seq */}
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      step="1"
                      value={rt.opSeq}
                      onChange={e => onUpdateRoutingStep(rt.id, { opSeq: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-1 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                    />
                  </td>

                  {/* Description */}
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={rt.description}
                      onChange={e => onUpdateRoutingStep(rt.id, { description: e.target.value })}
                      className="w-full px-1 py-0.5 font-sans text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                    />
                  </td>

                  {/* Work Center Select */}
                  <td className="py-1 px-1">
                    <select
                      value={rt.wc}
                      onChange={e => onUpdateRoutingStep(rt.id, { wc: e.target.value })}
                      className="w-full px-1 py-0.5 font-mono text-[10px] text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300 cursor-pointer"
                    >
                      {rates.map(r => (
                        <option key={r.wc} value={r.wc}>{r.wc}</option>
                      ))}
                    </select>
                  </td>

                  {/* Manning */}
                  <td className="py-1 px-1 text-center">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={rt.manning}
                      onChange={e => onUpdateRoutingStep(rt.id, { manning: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full text-center px-1 py-0.5 font-mono font-bold text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                    />
                  </td>

                  {/* Base Cap */}
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="any"
                      value={rt.baseCap}
                      onChange={e => onUpdateRoutingStep(rt.id, { baseCap: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-full text-right px-1 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                    />
                  </td>

                  {/* Active Cap (Yellow Editable Cell) */}
                  <td className="py-1 px-1 text-right bg-amber-50/70 border-x border-amber-200">
                    <input
                      type="number"
                      step="any"
                      value={rt.activeCap}
                      onChange={e => onUpdateRoutingStep(rt.id, { activeCap: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-full text-right px-1.5 py-0.5 font-bold font-mono text-amber-950 bg-amber-100/50 hover:bg-amber-100 focus:bg-white focus:ring-1 focus:ring-amber-500 border border-amber-300"
                    />
                  </td>

                  {/* Base Yield */}
                  <td className="py-1 px-1 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <input
                        type="number"
                        step="any"
                        value={Number((rt.baseYield * 100).toFixed(1))}
                        onChange={e => onUpdateRoutingStep(rt.id, { baseYield: Math.max(0.01, (parseFloat(e.target.value) || 100) / 100) })}
                        className="w-14 text-right px-1 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                      />
                      <span className="text-slate-400 text-[10px]">%</span>
                    </div>
                  </td>

                  {/* Active Yield (Yellow Editable Cell) */}
                  <td className="py-1 px-1 text-right bg-amber-50/70 border-x border-amber-200">
                    <div className="flex items-center justify-end gap-0.5">
                      <input
                        type="number"
                        step="any"
                        value={Number((rt.activeYield * 100).toFixed(1))}
                        onChange={e => onUpdateRoutingStep(rt.id, { activeYield: Math.max(0.01, (parseFloat(e.target.value) || 100) / 100) })}
                        className="w-14 text-right px-1.5 py-0.5 font-bold font-mono text-amber-950 bg-amber-100/50 hover:bg-amber-100 focus:bg-white focus:ring-1 focus:ring-amber-500 border border-amber-300"
                      />
                      <span className="text-amber-800 text-[10px]">%</span>
                    </div>
                  </td>

                  {/* Source Reference */}
                  <td className="py-1 px-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={rt.sourceRef}
                        onChange={e => onUpdateRoutingStep(rt.id, { sourceRef: e.target.value })}
                        placeholder="e.g. Cost declare"
                        className="w-full px-1 py-0.5 font-sans text-[10px] text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-700 border border-transparent focus:border-slate-300"
                      />
                      <ConfidenceBadge status={getFieldConfidence(rt.activeYield, rt.sourceRef)} showLabel={false} />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-1 px-1 text-center whitespace-nowrap">
                    <button
                      onClick={() => onDeleteRoutingStep(rt.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-none cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">
        <span>Displaying {filteredRouting.length} of {routing.length} Operations (Direct Live Editing Enabled)</span>
        <div className="flex items-center gap-2">
          <span>Active Conversion Total (Labor+Burden):</span>
          <span className="font-bold text-slate-900 text-xs">
            {formatCurrency(activeConvCost, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>
  )
}

