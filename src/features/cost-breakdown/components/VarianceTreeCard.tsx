import React from 'react'
import { CostComparison, formatNumber, formatVariance } from '../../../core'

interface VarianceTreeCardProps {
  comparison: CostComparison
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)

function gapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

export const VarianceTreeCard: React.FC<VarianceTreeCardProps> = ({ comparison }) => {
  const categories = [
    {
      name: 'Direct Material',
      reference: comparison.referenceCost.material,
      current: comparison.currentCost.material,
      gap: comparison.elementGaps.material
    },
    {
      name: 'Direct Labor',
      reference: comparison.referenceCost.labor,
      current: comparison.currentCost.labor,
      gap: comparison.elementGaps.labor
    },
    {
      name: 'Manufacturing Burden',
      reference: comparison.referenceCost.burden,
      current: comparison.currentCost.burden,
      gap: comparison.elementGaps.burden
    }
  ]
  const discrepancy = comparison.reconciliation?.discrepancy ?? null
  const categoryGapsBalance = discrepancy !== null && discrepancy < 0.0001

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-labelledby="variance-tree-title">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="variance-tree-title" className="text-base font-semibold text-slate-900">Cost Element Breakdown</h3>
          <p className="mt-1 text-sm text-slate-600">Reference, Current, and Gap from the same snapshot calculation used in the comparison.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono sm:justify-end">
          <span className="text-xs text-slate-600">Total gap (Current − Reference):</span>
          <span className={`rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold tabular-nums ${gapClass(comparison.totalGap)}`}>
            {comparison.totalGap === null ? '—' : `${formatVariance(comparison.totalGap, 4)} THB/pc`}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Reference and current snapshot cost by element and the resulting gap</caption>
          <thead className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-2.5">Cost element</th>
              <th scope="col" className="px-4 py-2.5 text-right">Reference</th>
              <th scope="col" className="px-4 py-2.5 text-right">Current</th>
              <th scope="col" className="px-4 py-2.5 text-right">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map(category => (
              <tr key={category.name}>
                <th scope="row" className="px-4 py-3 font-medium text-slate-800">{category.name}</th>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">{formatCost(category.reference)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">{formatCost(category.current)}</td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${gapClass(category.gap)}`}>
                  {category.gap === null ? '—' : formatVariance(category.gap, 4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">Check: material + labor + burden gaps equal the total gap.</span>
        <span className={`font-mono font-semibold tabular-nums ${categoryGapsBalance ? 'text-emerald-700' : 'text-rose-700'}`}>
          {discrepancy === null
            ? 'Unavailable — review source values'
            : categoryGapsBalance
            ? '0.0000 THB — Balanced ✓'
            : `${formatVariance(discrepancy, 4)} THB — Needs review`}
        </span>
      </div>
    </section>
  )
}
