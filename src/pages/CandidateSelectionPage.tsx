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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">3. Top Cost Drivers & Candidate Selection</h1>
          <p className="text-xs text-slate-500 mt-1">Systematic ranking of all cost gap sources — mirrors the <span className="font-mono bg-slate-100 px-1 rounded">_CALC_ENGINE</span> and <span className="font-mono bg-slate-100 px-1 rounded">4_SUMMARY_&_COMPARISON</span> sheets</p>
        </div>
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400 text-sm italic">
          No cost variance detected. Enter Base vs Active data in the Master Data tab to see ranked drivers.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">3. Top Cost Drivers & Candidate Selection</h1>
          <p className="text-xs text-slate-500 mt-1">
            Systematic ranking of all cost gap sources — mirrors the{' '}
            <span className="font-mono bg-slate-100 px-1 rounded">_CALC_ENGINE</span> and{' '}
            <span className="font-mono bg-slate-100 px-1 rounded">4_SUMMARY_&_COMPARISON</span> sheets
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-slate-400 font-mono">Net Std Cost Variance (Δ)</p>
          <p className={`text-xl font-bold font-mono ${totalVariance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalVariance >= 0 ? '+' : ''}{totalVariance.toFixed(4)} ฿/pc
          </p>
        </div>
      </div>

      {/* Column Header */}
      <div className="hidden lg:grid grid-cols-12 gap-2 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="col-span-1">Rank</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Driver (Item / Station)</div>
        <div className="col-span-2">RCA Parameter</div>
        <div className="col-span-1 text-right">Base</div>
        <div className="col-span-1 text-right">Active</div>
        <div className="col-span-1 text-right">Gap (฿)</div>
        <div className="col-span-1 text-right">% Contrib</div>
        <div className="col-span-1 text-center">Control</div>
      </div>

      {/* Driver Rows */}
      <div className="space-y-2">
        {topDrivers.map((d: CostDriver) => {
          const yieldDriver = isYieldDriver(d.rcaParameter)
          const isControllable   = d.controllability === 'Controllable'
          const isUncontrollable = d.controllability === 'Uncontrollable'

          return (
            <div
              key={d.rank}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Main Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-2 gap-y-1 p-4 items-start lg:items-center">
                {/* Rank Badge */}
                <div className="col-span-1 flex items-center gap-2 lg:block">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {d.rank}
                  </span>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <span className="text-[11px] font-mono text-slate-400 lg:hidden">Category: </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{d.category}</span>
                </div>

                {/* Driver Name */}
                <div className="col-span-2">
                  <span className="text-xs font-bold text-slate-900">{d.driverName}</span>
                </div>

                {/* RCA Parameter */}
                <div className="col-span-2">
                  {d.rcaParameter ? (
                    <span className="text-xs text-slate-600 italic">{d.rcaParameter}</span>
                  ) : (
                    <span className="text-xs text-slate-300 italic">No parameter change</span>
                  )}
                </div>

                {/* Base Parameter */}
                <div className="col-span-1 text-right font-mono text-xs text-slate-400">
                  {fmtParam(d.baseParameter, yieldDriver)}
                </div>

                {/* Active Parameter */}
                <div className="col-span-1 text-right font-mono text-xs font-bold text-slate-900">
                  {fmtParam(d.activeParameter, yieldDriver)}
                </div>

                {/* Cost Gap */}
                <div className="col-span-1 text-right font-mono text-sm font-bold text-rose-600">
                  +{d.costGap.toFixed(4)}
                </div>

                {/* % Contribution */}
                <div className="col-span-1 text-right font-mono text-xs text-slate-600">
                  {d.pctContribution.toFixed(2)}%
                </div>

                {/* Controllability Dropdown */}
                <div className="col-span-1 flex items-center justify-center">
                  <select
                    id={`ctrl-${d.rank}`}
                    value={d.controllability}
                    onChange={e =>
                      updateDriverHumanInput(d.rank, e.target.value as CostDriver['controllability'], d.actionPlan)
                    }
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition-colors w-full max-w-[140px] ${
                      isControllable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : isUncontrollable
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-amber-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <option value="">— Select —</option>
                    <option value="Controllable">Controllable</option>
                    <option value="Uncontrollable">Uncontrollable</option>
                  </select>
                </div>
              </div>

              {/* Action Plan Row — mirrors Col J in Excel Sheet 4 */}
              <div className="px-4 pb-3 border-t border-slate-100 pt-2 flex items-center gap-2">
                <label
                  htmlFor={`plan-${d.rank}`}
                  className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0"
                >
                  Action Plan:
                </label>
                <input
                  id={`plan-${d.rank}`}
                  type="text"
                  value={d.actionPlan}
                  onChange={e =>
                    updateDriverHumanInput(d.rank, d.controllability, e.target.value)
                  }
                  placeholder="Enter corrective action plan..."
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-amber-50 placeholder:text-slate-300 font-sans"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Footer */}
      <div className="bg-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
        <div className="text-xs font-semibold text-slate-300">
          Showing Top {topDrivers.length} positive cost gap drivers out of all BOM & Routing candidates
        </div>
        <div className="font-mono text-right">
          <p className="text-[11px] text-slate-400">Total Ranked Gap</p>
          <p className="text-lg font-bold text-rose-400">
            +{topDrivers.reduce((a, d) => a + d.costGap, 0).toFixed(4)} ฿/pc
          </p>
        </div>
      </div>
    </div>
  )
}
