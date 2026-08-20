import React from 'react'
import { BOMItem, calculateBOMDetailedRows, formatNumber, formatVariance, formatPercent, getVarianceClass } from '../../../core'

interface BOMDetailedTableProps {
  bom: BOMItem[]
}

export const BOMDetailedTable: React.FC<BOMDetailedTableProps> = ({ bom }) => {
  const { rows, totalBase, totalActive, totalVariance } = calculateBOMDetailedRows(bom)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-slate-900 text-white font-semibold text-[11px]">
            <th className="p-2.5 w-8">#</th>
            <th className="p-2.5">Item Code</th>
            <th className="p-2.5">Material Description</th>
            <th className="p-2.5 text-right">Usage (Q)</th>
            <th className="p-2.5 text-center">Unit</th>
            <th className="p-2.5 text-right">Base P0</th>
            <th className="p-2.5 text-right">Active P1</th>
            <th className="p-2.5 text-right">Base Loss %</th>
            <th className="p-2.5 text-right">Active Loss %</th>
            <th className="p-2.5 text-right">Base Cost</th>
            <th className="p-2.5 text-right">Active Cost</th>
            <th className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className={`hover:bg-slate-50/80 ${
                Math.abs(row.variance) > 0.00005 && row.variance > 0 ? 'bg-rose-50/30' : ''
              }`}
            >
              <td className="p-2.5 text-slate-400">{idx + 1}</td>
              <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{row.itemCode}</td>
              <td className="p-2.5 font-sans text-slate-700 truncate max-w-[200px]" title={row.description}>
                {row.description}
              </td>
              <td className="p-2.5 text-right">{formatNumber(row.consumption, 4)}</td>
              <td className="p-2.5 text-center font-sans text-slate-500">{row.unit}</td>
              <td className="p-2.5 text-right text-slate-500">{formatNumber(row.basePrice, 2)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900">{formatNumber(row.activePrice, 2)}</td>
              <td className="p-2.5 text-right text-slate-500">{formatPercent(row.baseLoss, 0)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900">{formatPercent(row.activeLoss, 0)}</td>
              <td className="p-2.5 text-right">{formatNumber(row.baseCost, 4)}</td>
              <td className="p-2.5 text-right font-bold text-slate-900">{formatNumber(row.activeCost, 4)}</td>
              <td className={`p-2.5 text-right ${getVarianceClass(row.variance)}`}>
                {formatVariance(row.variance, 4)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
            <td colSpan={9} className="p-2.5 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">
              Total Direct Material (THB/pc)
            </td>
            <td className="p-2.5 text-right font-mono text-slate-800">{formatNumber(totalBase, 4)}</td>
            <td className="p-2.5 text-right font-mono text-slate-900">{formatNumber(totalActive, 4)}</td>
            <td className={`p-2.5 text-right font-mono ${getVarianceClass(totalVariance)}`}>
              {formatVariance(totalVariance, 4)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
