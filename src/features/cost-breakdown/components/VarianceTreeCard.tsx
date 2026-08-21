import React from 'react'
import { CostElementBreakdown, formatNumber, formatVariance } from '../../../core'

interface VarianceTreeCardProps {
  costBreakdown: CostElementBreakdown
}

export const VarianceTreeCard: React.FC<VarianceTreeCardProps> = ({ costBreakdown }) => {
  const categories = [
    {
      name: 'Direct Material (C_M)',
      base: costBreakdown.materialBase,
      active: costBreakdown.materialActive,
      items: [
        { name: 'Material Price Variance (MPV)', desc: 'Purchase price change (P0 → P1)', val: costBreakdown.mpv },
        { name: 'Material Loss Variance (MLV)', desc: 'Scrap / loss rate change (L0 → L1)', val: costBreakdown.mlv }
      ]
    },
    {
      name: 'Direct Labor (C_L)',
      base: costBreakdown.laborBase,
      active: costBreakdown.laborActive,
      items: [
        { name: 'Labor Rate Variance (LRV)', desc: 'Labor rate change across work centers', val: costBreakdown.lrv },
        { name: 'Labor Efficiency Variance (LEV)', desc: 'Yield / capacity change impact on labor runtime', val: costBreakdown.lev }
      ]
    },
    {
      name: 'Manufacturing Burden (C_B)',
      base: costBreakdown.burdenBase,
      active: costBreakdown.burdenActive,
      items: [
        { name: 'Burden Rate Variance (BRV)', desc: 'Overhead rate change across work centers', val: costBreakdown.brv },
        { name: 'Burden Efficiency Variance (BEV)', desc: 'Yield / capacity change impact on burden absorption', val: costBreakdown.bev }
      ]
    }
  ]

  const sumVariances =
    costBreakdown.mpv + costBreakdown.mlv +
    costBreakdown.lrv + costBreakdown.lev +
    costBreakdown.brv + costBreakdown.bev

  const isBalanced = Math.abs(costBreakdown.totalVariance - sumVariances) < 0.0001

  return (
    <div className="bg-white rounded border border-slate-300/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-200">
        <div>
          <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Level 2: Variance Decomposition Tree
          </h3>
          <p className="text-[10px] text-slate-500 font-sans">
            Atomic Level 3 decomposition into price, loss, and conversion efficiency variances
          </p>
        </div>
        <div className="text-right flex items-center gap-2 font-mono">
          <span className="text-[11px] text-slate-500">Net Δ C_Total:</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            costBreakdown.totalVariance >= 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {formatVariance(costBreakdown.totalVariance, 4)} THB/pc
          </span>
        </div>
      </div>

      {/* Category Blocks */}
      <div className="divide-y divide-slate-200">
        {categories.map(cat => {
          const catVar = cat.active - cat.base
          return (
            <div key={cat.name} className="px-3.5 py-2.5">
              {/* Category Row */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono text-slate-900">{cat.name}</span>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-slate-500">Base: {formatNumber(cat.base, 4)}</span>
                  <span className="text-slate-800 font-semibold">Active: {formatNumber(cat.active, 4)}</span>
                  <span className={`font-bold w-24 text-right ${catVar >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatVariance(catVar, 4)} THB
                  </span>
                </div>
              </div>

              {/* Sub-items */}
              <div className="space-y-1 pl-3 border-l-2 border-slate-200">
                {cat.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between py-0.5 text-xs">
                    <div>
                      <span className="font-mono text-slate-800 font-medium">{item.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-sans">({item.desc})</span>
                    </div>
                    <span className={`font-mono text-[11px] font-semibold w-24 text-right ${
                      item.val > 0 ? 'text-rose-600 font-bold' : item.val < 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'
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
      <div className="px-3.5 py-2 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-[11px] font-mono">
        <span className="text-slate-600">Mathematical Balance Check: Net Δ C_Total vs Σ Variances</span>
        <span className={`font-bold ${isBalanced ? 'text-emerald-700' : 'text-rose-600'}`}>
          {isBalanced ? '0.0000 THB — Balanced ✓' : `${formatVariance(costBreakdown.totalVariance - sumVariances, 4)} THB — Imbalanced`}
        </span>
      </div>
    </div>
  )
}
