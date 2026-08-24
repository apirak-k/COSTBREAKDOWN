import React from 'react'
import { RoutingStep, WorkCenterRate, calculateRoutingDetailedRows, formatNumber, formatVariance, formatPercent, getVarianceClass } from '../../../core'

interface RoutingDetailedTableProps {
  routing: RoutingStep[]
  rates: WorkCenterRate[]
}

export const RoutingDetailedTable: React.FC<RoutingDetailedTableProps> = ({ routing, rates }) => {
  const { rows, totalBase, totalActive, totalVariance } = calculateRoutingDetailedRows(routing, rates)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-slate-900 text-white font-semibold text-[11px]">
            <th className="p-2.5 w-12">Op #</th>
            <th className="p-2.5">Operation Description</th>
            <th className="p-2.5">Department</th>
            <th className="p-2.5 text-right">Manning</th>
            <th className="p-2.5 text-right">Base Cap</th>
            <th className="p-2.5 text-right">Active Cap</th>
            <th className="p-2.5 text-right">Base Yield</th>
            <th className="p-2.5 text-right">Active Yield</th>
            <th className="p-2.5 text-right">Base Conv</th>
            <th className="p-2.5 text-right">Active Conv</th>
            <th className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.map(row => (
            <tr
              key={row.id}
              className="hover:bg-slate-50/70 transition-colors"
            >
              <td className="p-2.5 text-slate-500 tabular-nums">Op {row.opSeq}</td>
              <td className="p-2.5 font-sans font-medium text-slate-800 truncate max-w-[220px]" title={row.description}>
                {row.description}
              </td>
              <td className="p-2.5 font-sans text-slate-600 truncate max-w-[140px]" title={row.wc}>
                {row.wc}
              </td>
              <td className="p-2.5 text-right tabular-nums">{formatNumber(row.manning, 1)}</td>
              <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNumber(row.baseCap, 0)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNumber(row.activeCap, 0)}</td>
              <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatPercent(row.baseYield, 1)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatPercent(row.activeYield, 1)}</td>
              <td className="p-2.5 text-right tabular-nums">{formatNumber(row.baseTotal, 4)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNumber(row.activeTotal, 4)}</td>
              <td className={`p-2.5 text-right tabular-nums ${getVarianceClass(row.variance)}`}>
                {formatVariance(row.variance, 4)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-300/80 font-bold text-xs">
            <td colSpan={8} className="p-2.5 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">
              Total Conversion Cost (THB/pc)
            </td>
            <td className="p-2.5 text-right font-mono text-slate-800 tabular-nums">{formatNumber(totalBase, 4)}</td>
            <td className="p-2.5 text-right font-mono text-slate-900 tabular-nums">{formatNumber(totalActive, 4)}</td>
            <td className={`p-2.5 text-right font-mono tabular-nums ${getVarianceClass(totalVariance)}`}>
              {formatVariance(totalVariance, 4)}
            </td>
          </tr>
        </tfoot>

      </table>
    </div>
  )
}
