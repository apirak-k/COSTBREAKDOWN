import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../lib/store'
import { CostDriver } from '../lib/types'
import { ConfidenceBadge } from '../shared'

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
        <div className="bg-white px-5 py-3.5 rounded-none border border-slate-300 shadow-2xs">
          <h1 className="text-xs font-mono font-bold text-slate-900 uppercase">3. Top Cost Drivers &amp; Candidate Selection</h1>
        </div>
        <div className="bg-white py-16 rounded-none border border-slate-300 shadow-2xs text-center text-slate-400 font-mono text-xs">
          No cost variance detected. Enter Base vs Active data in Tab 1 to see ranked drivers.
        </div>
      </div>
    )
  }

  const totalGap = topDrivers.reduce((a, d) => a + d.costGap, 0)

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="bg-white px-5 py-3.5 rounded-none border border-slate-300 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xs font-bold font-mono text-slate-900 uppercase">3. Top Cost Drivers &amp; Candidate Selection</h1>
          <p className="text-[10px] text-slate-500 font-mono">Stage 1: System Auto-Rank · Stage 2: Human RCA Checklist</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-mono">Net Std Cost Variance (Δ)</p>
          <p className={`text-sm font-bold font-mono ${totalVariance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalVariance >= 0 ? '+' : ''}{totalVariance.toFixed(4)} THB/pc
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-none border border-slate-300 shadow-2xs overflow-hidden">

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-x-3 px-4 py-2.5 border-b border-slate-300 bg-slate-100 text-[10px] font-bold font-mono text-slate-700 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Driver</div>
          <div className="col-span-2">RCA Parameter</div>
          <div className="col-span-1 text-right">Base</div>
          <div className="col-span-1 text-right">Active</div>
          <div className="col-span-1 text-right">Gap (THB)</div>
          <div className="col-span-1 text-right">% Contrib</div>
          <div className="col-span-1 text-center">Confidence</div>
        </div>

        {/* Driver Rows */}
        <div className="divide-y divide-slate-200">
          {topDrivers.map((d: CostDriver) => {
            const yieldDriver = isYieldDriver(d.rcaParameter)
            const isUncontrollable = d.controllability === 'Uncontrollable'
            const isEstimated = d.confidence === 'estimated'

            return (
              <div key={d.rank} className={isUncontrollable ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>

                {/* Main Row */}
                <div className="grid grid-cols-12 gap-x-3 px-4 py-2.5 items-center text-xs font-mono">

                  {/* Rank */}
                  <div className="col-span-1">
                    <span className="w-5 h-5 rounded-none bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                      {d.rank}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-none border border-slate-200">
                      {d.category}
                    </span>
                  </div>

                  {/* Driver Name */}
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-slate-900 font-sans">{d.driverName}</span>
                  </div>

                  {/* RCA Parameter */}
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-600 truncate block">{d.rcaParameter || '—'}</span>
                  </div>

                  {/* Base */}
                  <div className="col-span-1 text-right text-slate-500">
                    {fmtParam(d.baseParameter, yieldDriver)}
                  </div>

                  {/* Active */}
                  <div className="col-span-1 text-right font-bold text-slate-900">
                    {fmtParam(d.activeParameter, yieldDriver)}
                  </div>

                  {/* Gap */}
                  <div className={`col-span-1 text-right font-bold ${d.costGap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {d.costGap >= 0 ? '+' : ''}{d.costGap.toFixed(4)}
                  </div>

                  {/* % Contrib */}
                  <div className="col-span-1 text-right text-slate-500">
                    {d.pctContribution.toFixed(1)}%
                  </div>

                  {/* Confidence Badge */}
                  <div className="col-span-1 flex justify-center">
                    <ConfidenceBadge status={d.confidence || 'verified'} showLabel={false} />
                  </div>
                </div>

                {/* Data Confidence Warning Banner */}
                {isEstimated && (
                  <div className="mx-4 my-1 px-2.5 py-1 bg-amber-50 border-l-2 border-amber-500 text-[10px] font-mono text-amber-950 flex items-center gap-1.5 rounded-none shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>⚠️ ESTIMATED DATA WARNING:</strong> Baseline/Active values are unverified placeholders. Confirm with actual measurement before committing resources or capital.
                    </span>
                  </div>
                )}

                {/* Stage 1 & Stage 2 Governance row */}
                <div className="grid grid-cols-12 gap-x-3 px-4 pb-2.5 items-center text-xs">
                  <div className="col-span-1" />
                  <div className="col-span-11 flex flex-wrap items-center gap-3">
                    {/* Stage 1 Auto Tag */}
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-300 rounded-none select-none">
                      <span>Stage 1: Cost Gap (+{d.costGap.toFixed(4)} THB)</span>
                    </div>

                    {/* Stage 2 Checklist Checkboxes */}
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={d.canInfluence !== false}
                          onChange={e =>
                            updateDriverHumanInput(
                              String(d.rank),
                              e.target.checked ? 'Controllable' : 'Uncontrollable',
                              d.actionPlan,
                              e.target.checked,
                              d.requirementFit
                            )
                          }
                          className="w-3.5 h-3.5 rounded-none border-slate-300 accent-slate-900 cursor-pointer"
                        />
                        <span className="font-bold text-slate-700">Stage 2: Can Influence</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={d.requirementFit !== false}
                          onChange={e =>
                            updateDriverHumanInput(
                              String(d.rank),
                              d.controllability,
                              d.actionPlan,
                              d.canInfluence,
                              e.target.checked
                            )
                          }
                          className="w-3.5 h-3.5 rounded-none border-slate-300 accent-slate-900 cursor-pointer"
                        />
                        <span className="font-bold text-slate-700">Requirement Fit</span>
                      </label>
                    </div>

                    {/* Action Plan */}
                    <div className="flex-1 min-w-[220px] flex items-center gap-1.5">
                      <label
                        htmlFor={`plan-${d.rank}`}
                        className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0"
                      >
                        Action:
                      </label>
                      <input
                        id={`plan-${d.rank}`}
                        type="text"
                        value={d.actionPlan}
                        onChange={e =>
                          updateDriverHumanInput(
                            String(d.rank),
                            d.controllability,
                            e.target.value,
                            d.canInfluence,
                            d.requirementFit
                          )
                        }
                        placeholder={


                          isUncontrollable
                            ? 'External commodity/market price increase (uncontrollable)'
                            : 'e.g. Redesign AOI lighting, replace nozzle, negotiate volume rebate...'
                        }
                        className="flex-1 text-xs px-2 py-0.5 bg-amber-50/70 border border-amber-200 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 font-sans"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-300 bg-slate-50 text-xs font-mono">
          <span className="text-slate-500 text-[11px]">
            Stage 1: System Auto-Ranked Top {topDrivers.length} Cost Drivers
          </span>
          <div className="text-right font-mono flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Total Ranked Gap:</span>
            <span className="text-xs font-bold text-rose-600">
              +{totalGap.toFixed(4)} THB/pc
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
