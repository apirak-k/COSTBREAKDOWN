import React from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { DriversTable } from './components/DriversTable'

export const CandidateSelectionPage: React.FC = () => {
  const { topDrivers, updateDriverHumanInput, costBreakdown } = useAppStore()
  const totalVariance = costBreakdown.totalVariance

  if (topDrivers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
          <h1 className="text-sm font-bold text-slate-900">3. Top Cost Drivers &amp; Candidate Selection</h1>
        </div>
        <div className="bg-white py-16 rounded-xl border border-slate-200 shadow-xs text-center text-slate-400 text-sm">
          No positive cost variance detected. Enter Base vs Active data in Master Data to see ranked drivers.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900">3. Top Cost Drivers &amp; Candidate Selection</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ranked by _CALC_ENGINE with Controllability Human-in-the-Loop Filter
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400 font-mono">Net Std Cost Variance (Δ)</p>
          <p className={`text-base font-bold font-mono ${totalVariance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatVariance(totalVariance, 4)} THB/pc
          </p>
        </div>
      </div>

      {/* Drivers Table */}
      <DriversTable topDrivers={topDrivers} onUpdateInput={updateDriverHumanInput} />
    </div>
  )
}
