import React from 'react'
import { formatNumber, formatVariance } from '../../../core'
import type { CostComparison } from '../../../core'

interface SnapshotComparisonCardProps {
  comparison: CostComparison
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)

function gapClass(value: number | null): string {
  const tone = value === null || !Number.isFinite(value) || Math.abs(value) < 0.00005
    ? 'text-slate-500'
    : value > 0 ? 'text-rose-700' : 'text-emerald-700'
  return 'px-3 py-2 text-right ' + tone
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({ comparison }) => {
  const rows = [
    { label: 'Material', reference: comparison.referenceCost.material, current: comparison.currentCost.material, gap: comparison.elementGaps.material },
    { label: 'Labor', reference: comparison.referenceCost.labor, current: comparison.currentCost.labor, gap: comparison.elementGaps.labor },
    { label: 'Burden', reference: comparison.referenceCost.burden, current: comparison.currentCost.burden, gap: comparison.elementGaps.burden },
    { label: 'Standard Cost', reference: comparison.referenceCost.total, current: comparison.currentCost.total, gap: comparison.totalGap, total: true }
  ]

  return (
    <section aria-labelledby="standard-cost-overview-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 px-3 py-2">
        <h2 id="standard-cost-overview-title" className="font-sans text-xs font-semibold tracking-tight text-slate-950">Standard Cost Overview</h2>
        <span className="text-[11px] text-slate-500">Full Reference / Current snapshot · THB/pc</span>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <caption className="sr-only">Full snapshot Material, Labor, Burden, and Standard Cost values for Reference, Current, and Gap</caption>
          <thead><tr className="bg-slate-800 font-semibold text-white"><th scope="col" className="px-3 py-2">Cost element</th><th scope="col" className="px-3 py-2 text-right">REF</th><th scope="col" className="px-3 py-2 text-right">CUR</th><th scope="col" className="px-3 py-2 text-right">Gap</th></tr></thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.map(row => <tr key={row.label} className={row.total ? 'bg-slate-100 font-semibold' : 'bg-white'}>
              <th scope="row" className={row.total ? 'px-3 py-2 font-sans text-slate-950' : 'px-3 py-2 font-sans font-medium text-slate-700'}>{row.label}</th>
              <td className="px-3 py-2 text-right text-slate-700">{formatCost(row.reference)}</td>
              <td className="px-3 py-2 text-right text-slate-900">{formatCost(row.current)}</td>
              <td className={gapClass(row.gap)}>{row.gap === null ? '—' : formatVariance(row.gap, 4)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}
