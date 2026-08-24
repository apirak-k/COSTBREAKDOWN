import React, { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { RoutingStep, WorkCenterRate, formatCurrency } from '../../../core'

interface RoutingTableProps {
  routing: RoutingStep[]
  rates: WorkCenterRate[]
  activeConvCost: number
  isEditMode?: boolean
  onAddRoutingStep: () => void
  onEditRoutingStep?: (step: RoutingStep) => void
  onUpdateRoutingStep: (id: string, partial: Partial<RoutingStep>) => void
  onDeleteRoutingStep: (id: string) => void
}

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
  activeConvCost,
  isEditMode = false,
  onAddRoutingStep,
  onUpdateRoutingStep,
  onDeleteRoutingStep
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkWc, setBulkWc] = useState<string>(rates[0]?.wc || '')

  const filteredRouting = routing.filter(
    r =>
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.wc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredRouting.map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleApplyBulkWc = () => {
    const targetWc = bulkWc || rates[0]?.wc
    if (!targetWc || selectedIds.size === 0) return
    selectedIds.forEach(id => {
      onUpdateRoutingStep(id, { wc: targetWc })
    })
    setSelectedIds(new Set())
  }

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
            Process Routing
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

          {/* Bulk Tools (Only in Edit Mode) */}
          {isEditMode && (
            <>
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
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
                title="Increase all active capacity by +5%"
              >
                +5% Cap Shift
              </button>

              <button
                onClick={onAddRoutingStep}
                className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contextual Bulk Action Bar (Only in Edit Mode with Selected Rows) */}
      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-mono animate-in fade-in duration-100">
          <span className="font-bold">{selectedIds.size} steps selected</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-[11px]">Assign Work Center:</span>
            <select
              value={bulkWc || rates[0]?.wc || ''}
              onChange={e => setBulkWc(e.target.value)}
              className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-white text-xs rounded focus:outline-none cursor-pointer"
            >
              {rates.map(r => (
                <option key={r.wc} value={r.wc}>
                  {r.wc} — {r.description}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyBulkWc}
              className="px-2.5 py-0.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded transition-colors cursor-pointer shadow-2xs"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-0.5 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* High-Density Spreadsheet Table */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
              {isEditMode && (
                <th className="py-1.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredRouting.length > 0 && selectedIds.size === filteredRouting.length}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
                    title="Select / Deselect all visible rows"
                  />
                </th>
              )}
              <th className="py-1.5 px-2 text-center w-8 text-slate-400">#</th>
              <th className="py-1.5 px-1.5 whitespace-nowrap w-16">Seq</th>
              <th className="py-1.5 px-2 min-w-[160px]">Operation Description</th>
              <th className="py-1.5 px-1.5 whitespace-nowrap w-24">Work Center</th>
              <th className="py-1.5 px-1 text-center whitespace-nowrap w-14">Manning</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24">Base Cap (pc/hr)</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-28 font-bold text-slate-900">
                Active Cap (pc/hr)
              </th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-20">Base Yield</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24 font-bold text-slate-900">
                Active Yield
              </th>
              <th className="py-1.5 px-2 whitespace-nowrap w-28">Source Ref</th>
              {isEditMode && <th className="py-1.5 px-1 text-center whitespace-nowrap w-12">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredRouting.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 12 : 10} className="py-8 text-center text-slate-400 font-sans italic">
                  {routing.length === 0
                    ? 'No Routing steps configured.'
                    : 'No Routing steps match search filter.'}
                </td>
              </tr>
            ) : (
              filteredRouting.map((rt, idx) => (
                <tr key={rt.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.has(rt.id) ? 'bg-slate-50' : ''}`}>
                  {/* Select Checkbox */}
                  {isEditMode && (
                    <td className="py-1 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rt.id)}
                        onChange={() => handleToggleRow(rt.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
                      />
                    </td>
                  )}

                  <td className="py-1.5 px-2 text-center text-slate-400 select-none">{idx + 1}</td>
                  
                  {/* Seq */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="1"
                        value={rt.opSeq}
                        onChange={e => onUpdateRoutingStep(rt.id, { opSeq: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono text-slate-500 text-xs tabular-nums">Op {rt.opSeq}</span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={rt.description}
                        onChange={e => onUpdateRoutingStep(rt.id, { description: e.target.value })}
                        className="w-full px-1.5 py-0.5 font-sans text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans font-medium text-slate-800 text-xs truncate max-w-[240px] block" title={rt.description}>{rt.description}</span>
                    )}
                  </td>

                  {/* Work Center */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <select
                        value={rt.wc}
                        onChange={e => onUpdateRoutingStep(rt.id, { wc: e.target.value })}
                        className="w-full px-1.5 py-0.5 font-mono text-[10px] text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 cursor-pointer rounded"
                      >
                        {rates.map(r => (
                          <option key={r.wc} value={r.wc}>{r.wc}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-1.5 font-sans text-slate-700 text-xs truncate max-w-[140px] block">{rt.wc}</span>
                    )}
                  </td>

                  {/* Manning */}
                  <td className="py-1 px-1 text-center">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={rt.manning}
                        onChange={e => onUpdateRoutingStep(rt.id, { manning: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full text-center px-1.5 py-0.5 font-mono font-bold text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1 font-mono text-slate-700 text-xs tabular-nums">{rt.manning}</span>
                    )}
                  </td>

                  {/* Base Cap */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={rt.baseCap}
                        onChange={e => onUpdateRoutingStep(rt.id, { baseCap: Math.max(1, parseFloat(e.target.value) || 1) })}
                        className="w-full text-right px-1.5 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono text-slate-500 text-xs tabular-nums">{rt.baseCap.toLocaleString()}</span>
                    )}
                  </td>

                  {/* Active Cap */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={rt.activeCap}
                        onChange={e => onUpdateRoutingStep(rt.id, { activeCap: Math.max(1, parseFloat(e.target.value) || 1) })}
                        className="w-full text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{rt.activeCap.toLocaleString()}</span>
                    )}
                  </td>

                  {/* Base Yield */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          step="any"
                          value={Number((rt.baseYield * 100).toFixed(1))}
                          onChange={e => onUpdateRoutingStep(rt.id, { baseYield: Math.max(0.01, (parseFloat(e.target.value) || 100) / 100) })}
                          className="w-14 text-right px-1.5 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    ) : (
                      <span className="px-1.5 font-mono text-slate-500 text-xs tabular-nums">{(rt.baseYield * 100).toFixed(1)}%</span>
                    )}
                  </td>

                  {/* Active Yield */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          step="any"
                          value={Number((rt.activeYield * 100).toFixed(1))}
                          onChange={e => onUpdateRoutingStep(rt.id, { activeYield: Math.max(0.01, (parseFloat(e.target.value) || 100) / 100) })}
                          className="w-14 text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{(rt.activeYield * 100).toFixed(1)}%</span>
                    )}
                  </td>

                  {/* Source Reference */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={rt.sourceRef}
                        onChange={e => onUpdateRoutingStep(rt.id, { sourceRef: e.target.value })}
                        placeholder="e.g. Cost declare"
                        className="w-full px-1.5 py-0.5 font-sans text-[10px] text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans text-slate-500 text-[11px]">{rt.sourceRef || '—'}</span>
                    )}
                  </td>

                  {/* Actions */}
                  {isEditMode && (
                    <td className="py-1 px-1 text-center whitespace-nowrap">
                      <button
                        onClick={() => onDeleteRoutingStep(rt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete Row"
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

      {/* Table Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">
        <span>Displaying {filteredRouting.length} of {routing.length} Operations</span>
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

