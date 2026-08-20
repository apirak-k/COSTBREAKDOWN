import React from 'react'
import { CostDriver, formatParam, formatVariance, isYieldDriver } from '../../../core'

interface DriverRowProps {
  driver: CostDriver
  onUpdateInput: (rank: number, controllability: CostDriver['controllability'], actionPlan: string) => void
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, onUpdateInput }) => {
  const yieldDriver = isYieldDriver(driver.rcaParameter)
  const isUncontrollable = driver.controllability === 'Uncontrollable'

  return (
    <div className={`transition-colors ${isUncontrollable ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'}`}>
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-x-3 px-4 py-3 items-center">
        {/* Rank */}
        <div className="col-span-1">
          <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono">
            {driver.rank}
          </span>
        </div>

        {/* Category */}
        <div className="col-span-2">
          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {driver.category}
          </span>
        </div>

        {/* Driver Name */}
        <div className="col-span-2">
          <span className="text-xs font-bold text-slate-900 truncate block" title={driver.driverName}>
            {driver.driverName}
          </span>
        </div>

        {/* RCA Parameter */}
        <div className="col-span-2">
          <span className="text-xs text-slate-600 truncate block" title={driver.rcaParameter}>
            {driver.rcaParameter || '—'}
          </span>
        </div>

        {/* Base */}
        <div className="col-span-1 text-right font-mono text-xs text-slate-400">
          {formatParam(driver.baseParameter, yieldDriver)}
        </div>

        {/* Active */}
        <div className="col-span-1 text-right font-mono text-xs font-bold text-slate-900">
          {formatParam(driver.activeParameter, yieldDriver)}
        </div>

        {/* Gap */}
        <div className={`col-span-1 text-right font-mono text-xs font-bold ${
          driver.costGap >= 0 ? 'text-rose-600' : 'text-emerald-600'
        }`}>
          {formatVariance(driver.costGap, 4)}
        </div>

        {/* % Contrib */}
        <div className="col-span-1 text-right font-mono text-xs text-slate-500">
          {driver.pctContribution.toFixed(1)}%
        </div>

        {/* Uncontrollable checkbox */}
        <div className="col-span-1 flex justify-center">
          <input
            id={`ctrl-${driver.rank}`}
            type="checkbox"
            checked={isUncontrollable}
            onChange={e =>
              onUpdateInput(
                driver.rank,
                e.target.checked ? 'Uncontrollable' : 'Controllable',
                driver.actionPlan
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
            htmlFor={`plan-${driver.rank}`}
            className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0 w-20"
          >
            Action Plan
          </label>
          <input
            id={`plan-${driver.rank}`}
            type="text"
            value={driver.actionPlan}
            onChange={e => onUpdateInput(driver.rank, driver.controllability, e.target.value)}
            placeholder="Enter corrective countermeasure / action plan..."
            className="flex-1 text-xs px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400 font-sans"
          />
        </div>
      </div>
    </div>
  )
}
