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
    <div className={`transition-colors ${isUncontrollable ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-x-2 px-3 py-2 items-center text-xs font-mono">
        {/* Rank */}
        <div className="col-span-1 text-center">
          <span className="w-5 h-5 mx-auto rounded-none bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
            {driver.rank}
          </span>
        </div>

        {/* Category */}
        <div className="col-span-2">
          <span className="text-[10px] font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded-none border border-slate-200">
            {driver.category}
          </span>
        </div>

        {/* Driver Name */}
        <div className="col-span-2">
          <span className="text-xs font-bold text-slate-900 font-sans truncate block" title={driver.driverName}>
            {driver.driverName}
          </span>
        </div>

        {/* RCA Parameter */}
        <div className="col-span-2">
          <span className="text-[11px] text-slate-600 truncate block" title={driver.rcaParameter}>
            {driver.rcaParameter || '—'}
          </span>
        </div>

        {/* Base */}
        <div className="col-span-1 text-right text-slate-500">
          {formatParam(driver.baseParameter, yieldDriver)}
        </div>

        {/* Active */}
        <div className="col-span-1 text-right font-bold text-slate-900">
          {formatParam(driver.activeParameter, yieldDriver)}
        </div>

        {/* Gap */}
        <div className={`col-span-1 text-right font-bold ${
          driver.costGap >= 0 ? 'text-rose-600' : 'text-emerald-700'
        }`}>
          {formatVariance(driver.costGap, 4)}
        </div>

        {/* % Contrib */}
        <div className="col-span-1 text-right text-slate-500">
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
            className="w-3.5 h-3.5 rounded-none border-slate-300 accent-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Plan sub-row */}
      <div className="grid grid-cols-12 gap-x-2 px-3 pb-2 items-center text-xs">
        <div className="col-span-1" />
        <div className="col-span-11 flex items-center gap-1.5">
          <label
            htmlFor={`plan-${driver.rank}`}
            className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0"
          >
            Action Plan:
          </label>
          <input
            id={`plan-${driver.rank}`}
            type="text"
            value={driver.actionPlan}
            onChange={e =>
              onUpdateInput(driver.rank, driver.controllability, e.target.value)
            }
            placeholder={
              isUncontrollable
                ? 'External commodity/market price increase (uncontrollable)'
                : 'e.g. Redesign AOI lighting, replace nozzle, negotiate volume rebate...'
            }
            className="flex-1 px-2 py-0.5 text-xs bg-amber-50 border border-amber-200 rounded-none font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  )
}
