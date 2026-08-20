import React, { useState } from 'react'
import { useAppStore } from '../lib/store'
import { ChevronDown, ChevronRight } from 'lucide-react'

type SubTab = 'bom' | 'routing'

export const DetailedBreakdownTables: React.FC = () => {
  const { bom, routing, rates } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [isExpanded, setIsExpanded] = useState(true)

  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))

  // ── BOM Item-by-Item Breakdown ──
  const bomRows = bom.map(b => {
    const baseCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const activeCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    const variance = activeCost - baseCost
    return { ...b, baseCost, activeCost, variance }
  })
  const bomTotalBase = bomRows.reduce((s, r) => s + r.baseCost, 0)
  const bomTotalActive = bomRows.reduce((s, r) => s + r.activeCost, 0)
  const bomTotalVar = bomTotalActive - bomTotalBase

  // ── Routing Op-by-Op Breakdown ──
  const routingRows = routing.map(rt => {
    const r = rateMap.get(rt.wc) || { labor: 102.90, burden: 79.66 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0 ? rt.manning / (rt.baseCap * rt.baseYield) : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0 ? rt.manning / (rt.activeCap * rt.activeYield) : 0
    const baseLaborCost = baseRuntime * r.labor
    const activeLaborCost = activeRuntime * r.labor
    const baseBurdenCost = baseRuntime * r.burden
    const activeBurdenCost = activeRuntime * r.burden
    const baseTotal = baseLaborCost + baseBurdenCost
    const activeTotal = activeLaborCost + activeBurdenCost
    const variance = activeTotal - baseTotal
    return {
      ...rt,
      baseRuntime, activeRuntime,
      baseLaborCost, activeLaborCost,
      baseBurdenCost, activeBurdenCost,
      baseTotal, activeTotal, variance
    }
  })
  const rtTotalBase = routingRows.reduce((s, r) => s + r.baseTotal, 0)
  const rtTotalActive = routingRows.reduce((s, r) => s + r.activeTotal, 0)
  const rtTotalVar = rtTotalActive - rtTotalBase

  const fmtN = (v: number, dp = 4) => v.toFixed(dp)
  const fmtVar = (v: number) => {
    if (Math.abs(v) < 0.00005) return '—'
    return `${v >= 0 ? '+' : ''}${v.toFixed(4)}`
  }
  const varClass = (v: number) =>
    Math.abs(v) < 0.00005 ? 'text-slate-400' : v > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Detailed Cost Breakdown Tables
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {bom.length} BOM Items · {routing.length} Routing Steps
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* Sub-Tab Switcher */}
          <div className="flex items-center bg-slate-50 px-4 py-2 border-b border-slate-100">
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSubTab('bom')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  subTab === 'bom'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                BOM Material ({bom.length})
              </button>
              <button
                onClick={() => setSubTab('routing')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  subTab === 'routing'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Routing Conversion ({routing.length})
              </button>
            </div>
          </div>

          {/* BOM Breakdown Table */}
          {subTab === 'bom' && (
            <div className="w-full">
              <table className="w-full text-xs table-auto">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px]">
                    <th className="px-2.5 py-2 text-left font-semibold w-8">#</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Item Code</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Description</th>
                    <th className="px-2 py-2 text-center font-semibold">Q</th>
                    <th className="px-2 py-2 text-center font-semibold">UOM</th>
                    <th className="px-2.5 py-2 text-right font-semibold">P0</th>
                    <th className="px-2.5 py-2 text-right font-semibold">P1</th>
                    <th className="px-2 py-2 text-center font-semibold">L0%</th>
                    <th className="px-2 py-2 text-center font-semibold">L1%</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Base Cost</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Active Cost</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Δ Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {bomRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 ${
                        Math.abs(row.variance) > 0.00005 && row.variance > 0 ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-2.5 py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-2.5 py-1.5 font-mono font-bold text-slate-800 whitespace-nowrap">{row.itemCode}</td>
                      <td className="px-2.5 py-1.5 text-slate-700 font-sans truncate max-w-[200px]" title={row.description}>{row.description}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{fmtN(row.consumption)}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500 font-sans">{row.unit}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{fmtN(row.basePrice, 2)}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold">{fmtN(row.activePrice, 2)}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{(row.baseLoss * 100).toFixed(0)}%</td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold">{(row.activeLoss * 100).toFixed(0)}%</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{fmtN(row.baseCost)}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold">{fmtN(row.activeCost)}</td>
                      <td className={`px-2.5 py-1.5 text-right font-mono ${varClass(row.variance)}`}>{fmtVar(row.variance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                    <td colSpan={9} className="px-3 py-2 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">Total Direct Material (THB/pc)</td>
                    <td className="px-2.5 py-2 text-right font-mono text-slate-800">{fmtN(bomTotalBase)}</td>
                    <td className="px-2.5 py-2 text-right font-mono text-slate-900">{fmtN(bomTotalActive)}</td>
                    <td className={`px-2.5 py-2 text-right font-mono ${varClass(bomTotalVar)}`}>{fmtVar(bomTotalVar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Routing Breakdown Table */}
          {subTab === 'routing' && (
            <div className="w-full">
              <table className="w-full text-xs table-auto">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px]">
                    <th className="px-2.5 py-2 text-left font-semibold w-12">Op #</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Operation</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Dept</th>
                    <th className="px-2 py-2 text-center font-semibold">M</th>
                    <th className="px-2 py-2 text-center font-semibold">C0</th>
                    <th className="px-2 py-2 text-center font-semibold">C1</th>
                    <th className="px-2 py-2 text-center font-semibold">Y0%</th>
                    <th className="px-2 py-2 text-center font-semibold">Y1%</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Base Conv</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Active Conv</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Δ Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {routingRows.map(row => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 ${
                        Math.abs(row.variance) > 0.00005 && row.variance > 0 ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-2.5 py-1.5 font-mono text-slate-500">Op {row.opSeq}</td>
                      <td className="px-2.5 py-1.5 text-slate-800 font-sans font-medium truncate max-w-[220px]" title={row.description}>{row.description}</td>
                      <td className="px-2.5 py-1.5 text-slate-600 font-sans truncate max-w-[140px]" title={row.wc}>{row.wc}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{row.manning}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500">{row.baseCap.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">{row.activeCap.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500">{(row.baseYield * 100).toFixed(0)}%</td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">{(row.activeYield * 100).toFixed(0)}%</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{fmtN(row.baseTotal)}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold">{fmtN(row.activeTotal)}</td>
                      <td className={`px-2.5 py-1.5 text-right font-mono ${varClass(row.variance)}`}>{fmtVar(row.variance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                    <td colSpan={8} className="px-3 py-2 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">Total Conversion Cost (THB/pc)</td>
                    <td className="px-2.5 py-2 text-right font-mono text-slate-800">{fmtN(rtTotalBase)}</td>
                    <td className="px-2.5 py-2 text-right font-mono text-slate-900">{fmtN(rtTotalActive)}</td>
                    <td className={`px-2.5 py-2 text-right font-mono ${varClass(rtTotalVar)}`}>{fmtVar(rtTotalVar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
