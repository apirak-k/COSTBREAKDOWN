import React from 'react'
import { CostDriver, formatParam, formatVariance, isYieldDriver } from '../../../core'

interface DriverRowProps {
  driver: CostDriver
  onUpdateInput: (
    driverKey: string,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => void
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, onUpdateInput }) => {
  const yieldDriver = isYieldDriver(driver.rcaParameter)
  const isUncontrollable = driver.controllability === 'Uncontrollable'

  return (
    <div className={`transition-colors ${isUncontrollable ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}>
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-x-2 px-4 py-2.5 items-center text-xs font-mono">
        {/* Rank */}
        <div className="col-span-1 text-center">
          <span className="w-5 h-5 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] tabular-nums shadow-2xs">
            {driver.rank}
          </span>
        </div>

        {/* Category */}
        <div className="col-span-2">
          <span className="text-[10px] font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {driver.category}
          </span>
        </div>

        {/* Driver Name */}
        <div className="col-span-3">
          <span className="text-xs font-bold text-slate-900 font-sans truncate block" title={driver.driverName}>
            {driver.driverName}
          </span>
        </div>

        {/* RCA Parameter */}
        <div className="col-span-2">
          <span className="text-[11px] text-slate-600 truncate block font-sans" title={driver.rcaParameter}>
            {driver.rcaParameter || '—'}
          </span>
        </div>

        {/* Base */}
        <div className="col-span-1 text-right text-slate-500 tabular-nums">
          {formatParam(driver.baseParameter, yieldDriver)}
        </div>

        {/* Active */}
        <div className="col-span-1 text-right font-bold text-slate-900 tabular-nums">
          {formatParam(driver.activeParameter, yieldDriver)}
        </div>

        {/* Gap */}
        <div className={`col-span-1 text-right font-bold tabular-nums ${
          driver.costGap >= 0 ? 'text-rose-600' : 'text-emerald-700'
        }`}>
          {formatVariance(driver.costGap, 4)}
        </div>

        {/* % Contrib */}
        <div className="col-span-1 text-right text-slate-500 tabular-nums">
          {driver.pctContribution.toFixed(1)}%
        </div>
      </div>

      {/* Governance & Countermeasure row */}
      <div className="grid grid-cols-12 gap-x-2 px-4 pb-2.5 items-center text-xs">
        <div className="col-span-1" />
        <div className="col-span-11 flex flex-wrap items-center gap-3">
          {/* Single Controllability Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!isUncontrollable}
              onChange={e =>
                onUpdateInput(
                  driver.driverKey,
                  e.target.checked ? 'Controllable' : 'Uncontrollable',
                  driver.actionPlan,
                  e.target.checked,
                  e.target.checked
                )
              }
              className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
            />
            <span className="font-semibold text-slate-700 font-sans text-[11px]">Controllable</span>
          </label>

          {/* Action Plan input */}
          <div className="flex-1 min-w-[260px] flex items-center gap-2">
            <label
              htmlFor={`plan-${driver.driverKey}`}
              className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0"
            >
              Action:
            </label>
            <input
              id={`plan-${driver.driverKey}`}
              type="text"
              value={driver.actionPlan}
              onChange={e =>
                onUpdateInput(
                  driver.driverKey,
                  driver.controllability,
                  e.target.value,
                  driver.canInfluence,
                  driver.requirementFit
                )
              }
              placeholder={
                isUncontrollable
                  ? 'External price spike (uncontrollable)'
                  : 'e.g. Optimize fixture, reduce loss, adjust process...'
              }
              className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-sans text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>
    </div>

  )
}
