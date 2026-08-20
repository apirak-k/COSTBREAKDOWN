import React from 'react'
import { CostDriver, formatParam, formatVariance, isYieldDriver } from '../../../core'

interface ProblemStatementCardProps {
  driver: CostDriver | null
}

export const ProblemStatementCard: React.FC<ProblemStatementCardProps> = ({ driver }) => {
  if (!driver) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium">
          All parameters are at or below baseline — no cost drivers detected to investigate.
        </div>
      </div>
    )
  }

  const yieldDriver = isYieldDriver(driver.rcaParameter)
  const isUncontrollable = driver.controllability === 'Uncontrollable'

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
            #{driver.rank}
          </span>
          <h2 className="text-sm font-bold text-slate-900">
            {driver.driverName}
          </h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {driver.category}
          </span>
          {isUncontrollable && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-md border border-amber-300">
              Uncontrollable
            </span>
          )}
        </div>

        <div className="text-right font-mono">
          <span className="text-[11px] text-slate-400 font-sans">Cost Gap: </span>
          <span className="text-sm font-bold text-rose-600">
            {formatVariance(driver.costGap, 4)} THB/pc
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RCA Parameter &amp; Symptom</p>
          <p className="font-semibold text-slate-800">{driver.rcaParameter || 'Parameter variance'}</p>
        </div>

        <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Baseline vs Active Shift</p>
          <p className="font-mono font-bold text-amber-900">
            Base: {formatParam(driver.baseParameter, yieldDriver)} ➔ Active: {formatParam(driver.activeParameter, yieldDriver)}
          </p>
        </div>
      </div>

      {driver.actionPlan && (
        <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
          <span className="font-bold text-blue-900">Registered Action Plan: </span>
          <span className="text-blue-800">{driver.actionPlan}</span>
        </div>
      )}
    </div>
  )
}
