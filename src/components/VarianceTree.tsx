import React from 'react'
import { useAppStore } from '../lib/store'

export const VarianceTree: React.FC = () => {
  const { costBreakdown } = useAppStore()

  const categories = [
    {
      name: 'Direct Material (C_M)',
      base:   costBreakdown.materialBase,
      active: costBreakdown.materialActive,
      items: [
        { name: 'Material Price Variance (MPV)', desc: 'Purchase price change (P0 → P1)',        val: costBreakdown.mpv },
        { name: 'Material Loss Variance (MLV)',  desc: 'Scrap / loss rate change (L0 → L1)',      val: costBreakdown.mlv },
      ]
    },
    {
      name: 'Direct Labor (C_L)',
      base:   costBreakdown.laborBase,
      active: costBreakdown.laborActive,
      items: [
        { name: 'Labor Rate Variance (LRV)',       desc: 'Labor rate change across work centers',          val: costBreakdown.lrv },
        { name: 'Labor Efficiency Variance (LEV)', desc: 'Yield / capacity change impact on labor runtime', val: costBreakdown.lev },
      ]
    },
    {
      name: 'Manufacturing Burden (C_B)',
      base:   costBreakdown.burdenBase,
      active: costBreakdown.burdenActive,
      items: [
        { name: 'Burden Rate Variance (BRV)',       desc: 'Overhead rate change across work centers',           val: costBreakdown.brv },
        { name: 'Burden Efficiency Variance (BEV)', desc: 'Yield / capacity change impact on burden absorption', val: costBreakdown.bev },
      ]
    }
  ]

  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`

  const sumVariances = costBreakdown.mpv + costBreakdown.mlv
                     + costBreakdown.lrv + costBreakdown.lev
                     + costBreakdown.brv + costBreakdown.bev
  const isBalanced = Math.abs(costBreakdown.totalVariance - sumVariances) < 0.0001

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Variance Decomposition</h3>
          <p className="text-xs text-slate-400 mt-0.5">Level 3 — Price, Rate, and Yield/Capacity breakdown</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400 font-mono">Net Δ C_Total</p>
          <p className={`text-base font-bold font-mono ${costBreakdown.totalVariance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmt(costBreakdown.totalVariance)} THB/pc
          </p>
        </div>
      </div>

      {/* Category Blocks */}
      <div className="divide-y divide-slate-100">
        {categories.map(cat => {
          const catVar = cat.active - cat.base
          return (
            <div key={cat.name} className="px-5 py-4">
              {/* Category Row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                <div className="flex items-center gap-6 font-mono text-xs">
                  <span className="text-slate-400">Base: {cat.base.toFixed(4)}</span>
                  <span className="text-slate-700 font-semibold">Active: {cat.active.toFixed(4)}</span>
                  <span className={`font-bold w-20 text-right ${catVar >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmt(catVar)} THB
                  </span>
                </div>
              </div>

              {/* Sub-items */}
              <div className="space-y-1 pl-4 border-l border-slate-100">
                {cat.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between py-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-600 font-medium">{item.name}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                    <span className={`font-mono text-xs font-semibold w-24 text-right ${
                      item.val > 0 ? 'text-rose-600' : item.val < 0 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {fmt(item.val)} THB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer — Balance Check */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
        <span className="text-xs text-slate-500 font-medium">Balance Check — Δ C_Total vs Σ Variances</span>
        <span className={`font-mono text-xs font-bold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isBalanced ? '0.0000 THB — Balanced ✓' : `${(costBreakdown.totalVariance - sumVariances).toFixed(4)} THB — Imbalanced`}
        </span>
      </div>
    </div>
  )
}
