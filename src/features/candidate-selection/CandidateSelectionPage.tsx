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
        <div className="bg-white px-4 py-3 rounded border border-slate-300/80 shadow-2xs">
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Section 3: Cost Driver Prioritization & Candidate Selection
          </h1>
        </div>
        <div className="bg-white py-12 rounded border border-slate-300/80 shadow-2xs text-center text-slate-400 text-xs font-mono">
          No positive cost variance detected. Enter Base vs Active data in Master Data to evaluate drivers.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Cost Driver Prioritization
          </h1>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
            Ranked by Cost Gap with Controllability Assessment
          </p>
        </div>
        <div className="text-right font-mono flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Net Variance (Δ):</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono tabular-nums bg-slate-100 border border-slate-200 ${
            totalVariance >= 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {formatVariance(totalVariance, 4)} THB/pc
          </span>
        </div>
      </div>


      {/* Drivers Table */}
      <DriversTable topDrivers={topDrivers} onUpdateInput={updateDriverHumanInput} />
    </div>
  )
}
