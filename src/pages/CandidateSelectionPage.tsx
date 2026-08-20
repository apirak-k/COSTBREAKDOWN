import React from 'react'
import { useAppStore } from '../lib/store'
import { CostDriver } from '../lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtParam(param: number | null, isYield: boolean): string {
  if (param === null) return '—'
  if (isYield) return `${(param * 100).toFixed(1)}%`
  return param.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isYieldDriver(rca: string): boolean {
  return rca.includes('Yield')
}

// ── Component ──────────────────────────────────────────────────────────────

export const CandidateSelectionPage: React.FC = () => {
  const { topDrivers, updateDriverHumanInput, costBreakdown } = useAppStore()
  const totalVariance = costBreakdown.totalVariance

  if (topDrivers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-sm font-bold text-slate-900">3. Top Cost Drivers &amp; Candidate Selection</h1>
        </div>
        <div className="bg-white py-16 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400 text-sm">
          No cost variance detected. Enter Base vs Active data in Tab 1 to see ranked drivers.
        </div>
      </div>
    )
  }

  const totalGap = topDrivers.reduce((a, d) => a + d.costGap, 0)

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <h1 className="text-sm font-bold text-slate-900">3. Top Cost Drivers &amp; Candidate Selection</h1>
        <div className="text-right">
          <p className="text-[11px] text-slate-400 font-mono">Net Std Cost Variance (Δ)</p>
          <p className={`text-base font-bold font-mono ${totalVariance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalVariance >= 0 ? '+' : ''}{totalVariance.toFixed(4)} THB/pc
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-x-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Driver</div>
          <div className="col-span-2">RCA Parameter</div>
          <div className="col-span-1 text-right">Base</div>
          <div className="col-span-1 text-right">Active</div>
          <div className="col-span-1 text-right">Gap (THB)</div>
          <div className="col-span-1 text-right">% Contrib</div>
          <div className="col-span-1 text-center">Uncontrollable</div>
        </div>

        {/* Driver Rows */}
        <div className="divide-y divide-slate-100">
          {topDrivers.map((d: CostDriver) => {
            const yieldDriver    = isYieldDriver(d.rcaParameter)
            const isUncontrollable = d.controllability === 'Uncontrollable'

            return (
              <div key={d.rank} className={isUncontrollable ? 'bg-amber-50/40' : ''}>

                {/* Main Row */}
                <div className="grid grid-cols-12 gap-x-3 px-4 py-3 items-center">

                  {/* Rank */}
                  <div className="col-span-1">
                    <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {d.rank}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {d.category}
                    </span>
                  </div>

                  {/* Driver Name */}
                  <div className="col-span-2">
                    <span className="text-xs font-semibold text-slate-900">{d.driverName}</span>
                  </div>

                  {/* RCA Parameter */}
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500">{d.rcaParameter || '—'}</span>
                  </div>

                  {/* Base */}
                  <div className="col-span-1 text-right font-mono text-xs text-slate-400">
                    {fmtParam(d.baseParameter, yieldDriver)}
                  </div>

                  {/* Active */}
                  <div className="col-span-1 text-right font-mono text-xs font-semibold text-slate-700">
                    {fmtParam(d.activeParameter, yieldDriver)}
                  </div>

                  {/* Gap */}
                  <div className={`col-span-1 text-right font-mono text-xs font-bold ${d.costGap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {d.costGap >= 0 ? '+' : ''}{d.costGap.toFixed(4)}
                  </div>

                  {/* % Contrib */}
                  <div className="col-span-1 text-right font-mono text-xs text-slate-500">
                    {d.pctContribution.toFixed(1)}%
                  </div>

                  {/* Uncontrollable checkbox */}
                  <div className="col-span-1 flex justify-center">
                    <input
                      id={`ctrl-${d.rank}`}
                      type="checkbox"
                      checked={isUncontrollable}
                      onChange={e =>
                        updateDriverHumanInput(
                          d.rank,
                          e.target.checked ? 'Uncontrollable' : 'Controllable',
                          d.actionPlan
                        )
                      }
                      className="w-4 h-4 rounded border-slate-300 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Action Plan sub-row */}
                <div className="grid grid-cols-12 gap-x-3 px-4 pb-3 items-center">
                  <div className="col-span-1" />
                  <div className="col-span-11 flex items-center gap-2">
                    <label
                      htmlFor={`plan-${d.rank}`}
                      className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0 w-20"
                    >
                      Action Plan
                    </label>
                    <input
                      id={`plan-${d.rank}`}
                      type="text"
                      value={d.actionPlan}
                      onChange={e => updateDriverHumanInput(d.rank, d.controllability, e.target.value)}
                      placeholder="Enter corrective action..."
                      className="flex-1 text-xs px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-300"
                    />
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            Top {topDrivers.length} positive gap drivers out of all BOM &amp; Routing candidates
          </span>
          <div className="text-right font-mono">
            <span className="text-[11px] text-slate-400">Total Ranked Gap</span>
            <span className="ml-3 text-sm font-bold text-rose-600">
              +{totalGap.toFixed(4)} THB/pc
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
