import React from 'react'
import { CostElementBreakdown, formatNumber, formatVariance } from '../../../core'

interface VarianceTreeCardProps {
  costBreakdown: CostElementBreakdown
}

export const VarianceTreeCard: React.FC<VarianceTreeCardProps> = ({ costBreakdown }) => {
  const categories = [
    {
      name: 'Direct Material',
      base: costBreakdown.materialBase,
      active: costBreakdown.materialActive,
      items: [
        { name: 'Material Price Variance', desc: 'Purchase price change (Reference → Current)', val: costBreakdown.mpv },
        { name: 'Material Loss Variance', desc: 'Scrap / loss rate change (Reference → Current)', val: costBreakdown.mlv }
      ]
    },
    {
      name: 'Direct Labor',
      base: costBreakdown.laborBase,
      active: costBreakdown.laborActive,
      items: [
        { name: 'Labor Rate Variance', desc: 'Labor rate change across work centers', val: costBreakdown.lrv },
        { name: 'Labor Efficiency Variance', desc: 'Yield / capacity change impact on labor runtime', val: costBreakdown.lev }
      ]
    },
    {
      name: 'Manufacturing Burden',
      base: costBreakdown.burdenBase,
      active: costBreakdown.burdenActive,
      items: [
        { name: 'Burden Rate Variance', desc: 'Overhead rate change across work centers', val: costBreakdown.brv },
        { name: 'Burden Efficiency Variance', desc: 'Yield / capacity change impact on burden absorption', val: costBreakdown.bev }
      ]
    }
  ]

  const sumVariances =
    costBreakdown.mpv + costBreakdown.mlv +
    costBreakdown.lrv + costBreakdown.lev +
    costBreakdown.brv + costBreakdown.bev

  const isBalanced = Math.abs(costBreakdown.totalVariance - sumVariances) < 0.0001

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-labelledby="variance-tree-title">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="variance-tree-title" className="text-base font-semibold text-slate-900">
            Variance Decomposition Tree
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Decomposition into price, loss, and conversion efficiency variances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono sm:justify-end">
          <span className="text-xs text-slate-600">Net cost gap (Δ):</span>
          <span className={`rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold tabular-nums ${
            costBreakdown.totalVariance >= 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {formatVariance(costBreakdown.totalVariance, 4)} THB/pc
          </span>
        </div>
      </div>

      {/* Category Blocks */}
      <div className="divide-y divide-slate-100">
        {categories.map(cat => {
          const catVar = cat.active - cat.base
          return (
            <div key={cat.name} className="px-4 py-4 transition-colors hover:bg-slate-50/60">
              {/* Category Row */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
                  <span className="text-slate-600">Reference: {formatNumber(cat.base, 4)}</span>
                  <span className="font-medium text-slate-900">Current: {formatNumber(cat.active, 4)}</span>
                  <span className={`font-semibold sm:w-28 sm:text-right ${catVar >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatVariance(catVar, 4)} THB
                  </span>
                </div>
              </div>

              {/* Sub-items */}
              <div className="space-y-2 border-l-2 border-slate-200 pl-3.5">
                {cat.items.map(item => (
                  <div key={item.name} className="flex flex-col gap-1 py-0.5 text-sm sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-600 sm:ml-2 sm:mt-0 sm:inline">{item.desc}</span>
                    </div>
                    <span className={`font-mono text-xs tabular-nums font-semibold sm:w-28 sm:shrink-0 sm:text-right ${
                      item.val > 0 ? 'text-rose-700 font-bold' : item.val < 0 ? 'text-emerald-700 font-bold' : 'text-slate-500'
                    }`}>
                      {formatVariance(item.val, 4)} THB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer — Balance Check */}
      <div className="flex flex-col gap-1.5 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">Mathematical balance check: Net Δ C_Total vs Σ Variances</span>
        <span className={`font-mono font-semibold tabular-nums ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isBalanced ? '0.0000 THB — Balanced ✓' : `${formatVariance(costBreakdown.totalVariance - sumVariances, 4)} THB — Imbalanced`}
        </span>
      </div>
    </section>

  )
}
