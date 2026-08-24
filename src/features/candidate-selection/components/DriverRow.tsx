import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { CostDriver, formatParam, formatVariance, isYieldDriver } from '../../../core'
import { ConfidenceBadge } from '../../../shared'

interface DriverRowProps {
  driver: CostDriver
  onUpdateInput: (
    rank: number,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => void
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, onUpdateInput }) => {
  const yieldDriver = isYieldDriver(driver.rcaParameter)
  const isUncontrollable = driver.controllability === 'Uncontrollable'
  const isEstimated = driver.confidence === 'estimated'

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

        {/* Confidence Badge */}
        <div className="col-span-1 flex justify-center">
          <ConfidenceBadge status={driver.confidence || 'verified'} showLabel={false} />
        </div>
      </div>

      {/* Data Confidence Warning Banner (if Estimated) */}
      {isEstimated && (
        <div className="mx-3 my-1 px-2.5 py-1 bg-amber-50 border-l-2 border-amber-500 text-[10px] font-mono text-amber-950 flex items-center gap-1.5 rounded-none shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>⚠️ ESTIMATED DATA WARNING:</strong> Baseline/Active values are unverified placeholders. Confirm with actual measurement before committing resources or capital.
          </span>
        </div>
      )}

      {/* Governance & Countermeasure row */}
      <div className="grid grid-cols-12 gap-x-2 px-3 pb-2 items-center text-xs">
        <div className="col-span-1" />
        <div className="col-span-11 flex flex-wrap items-center gap-3">
          {/* Controllability & Requirement Checkboxes */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={driver.canInfluence !== false}
                onChange={e =>
                  onUpdateInput(
                    driver.rank,
                    e.target.checked ? 'Controllable' : 'Uncontrollable',
                    driver.actionPlan,
                    e.target.checked,
                    driver.requirementFit
                  )
                }
                className="w-3.5 h-3.5 rounded-none border-slate-300 accent-slate-900 cursor-pointer"
              />
              <span className="font-bold text-slate-700">Can Influence</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={driver.requirementFit !== false}
                onChange={e =>
                  onUpdateInput(
                    driver.rank,
                    driver.controllability,
                    driver.actionPlan,
                    driver.canInfluence,
                    e.target.checked
                  )
                }
                className="w-3.5 h-3.5 rounded-none border-slate-300 accent-slate-900 cursor-pointer"
              />
              <span className="font-bold text-slate-700">Requirement Fit</span>
            </label>
          </div>


          {/* Action Plan input */}
          <div className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <label
              htmlFor={`plan-${driver.rank}`}
              className="text-[10px] font-mono font-bold uppercase text-slate-500 shrink-0"
            >
              Action Plan:
            </label>
            <input
              id={`plan-${driver.rank}`}
              type="text"
              value={driver.actionPlan}
              onChange={e =>
                onUpdateInput(
                  driver.rank,
                  driver.controllability,
                  e.target.value,
                  driver.canInfluence,
                  driver.requirementFit
                )
              }
              placeholder={
                isUncontrollable
                  ? 'External commodity/market price increase (uncontrollable)'
                  : 'e.g. Redesign AOI lighting, replace nozzle, negotiate volume rebate...'
              }
              className="flex-1 px-2 py-0.5 text-xs bg-amber-50/70 border border-amber-200 rounded-none font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
