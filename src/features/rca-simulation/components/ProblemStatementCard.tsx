import React from 'react'
import { CostDriver, formatParam, formatVariance, isYieldDriver } from '../../../core'

interface ProblemStatementCardProps {
  driver: CostDriver | null
}

export const ProblemStatementCard: React.FC<ProblemStatementCardProps> = ({ driver }) => {
  if (!driver) {
    return (
      <div className="bg-white p-3.5 rounded border border-slate-300/80 shadow-2xs">
        <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-800 font-mono">
          All operational parameters are at or below baseline — no unfavorable cost drivers detected.
        </div>
      </div>
    )
  }

  const yieldDriver = isYieldDriver(driver.rcaParameter)
  const isUncontrollable = driver.controllability === 'Uncontrollable'

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center tabular-nums">
            #{driver.rank}
          </span>
          <h2 className="text-xs font-bold font-mono text-slate-900">
            {driver.driverName}
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-slate-100/90 text-slate-700 rounded border border-slate-200/70">
            {driver.category}
          </span>
          {isUncontrollable && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-300">
              UNCONTROLLABLE
            </span>
          )}
        </div>

        <div className="text-right font-mono flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Cost Gap:</span>
          <span className="text-xs font-bold text-rose-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
            {formatVariance(driver.costGap, 4)} THB/pc
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Parameter &amp; Symptom</p>
          <p className="font-mono text-xs text-slate-800 font-semibold">{driver.rcaParameter || 'Parameter variance'}</p>
        </div>

        <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Baseline vs Active</p>
          <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">
            Base: {formatParam(driver.baseParameter, yieldDriver)} ➔ Active: {formatParam(driver.activeParameter, yieldDriver)}
          </p>
        </div>
      </div>

      {driver.actionPlan && (
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
          <span className="font-mono font-bold text-slate-700 text-[10px] uppercase tracking-wider block mb-0.5">
            Action Plan:
          </span>
          <p className="text-slate-800 font-sans">{driver.actionPlan}</p>
        </div>
      )}
    </div>
  )
}
