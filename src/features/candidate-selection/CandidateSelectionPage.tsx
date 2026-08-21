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
      <div className="bg-white px-3.5 py-2.5 rounded border border-slate-300/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Section 3: Cost Driver Prioritization &amp; Candidate Selection
          </h1>
          <p className="text-[10px] text-slate-500 font-sans">
            Ranked by atomic Cost Gap with Human-in-the-Loop Controllability Governance
          </p>
        </div>
        <div className="text-right font-mono flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Net Std Cost Variance (Δ):</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            totalVariance >= 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
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
