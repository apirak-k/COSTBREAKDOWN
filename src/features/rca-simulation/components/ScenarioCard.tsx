import React from 'react'
import { WhatIfResult, formatCurrency, formatVariance } from '../../../core'
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

interface ScenarioCardProps {
  scenario: WhatIfResult
  targetLabel: string
  targetPlaceholder: string
  isRouting?: boolean
  secondaryLabel?: string
  secondaryPlaceholder?: string
  onUpdate: (field: string, val: string) => void
  onApplyTarget: (targetValue: string) => void
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  targetLabel,
  targetPlaceholder,
  isRouting,
  secondaryLabel = 'Target Manning (Heads)',
  secondaryPlaceholder = '1',
  onUpdate,
  onApplyTarget
}) => {
  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all bg-white flex flex-col justify-between shadow-xs ${
        scenario.valid && scenario.isProfitable
          ? 'border-emerald-500/80 shadow-emerald-500/5'
          : scenario.valid && !scenario.isProfitable
          ? 'border-rose-300 bg-rose-50/10'
          : 'border-slate-200/90'
      }`}
    >
      {/* Option Header */}
      <div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/80">
          <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-900 text-white rounded-md font-mono shadow-2xs">
            OPTION {scenario.letter}
          </span>
          {scenario.valid && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                scenario.isProfitable
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {scenario.isProfitable ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  PROFITABLE
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  UNPROFITABLE
                </>
              )}
            </span>
          )}
        </div>

        {/* Input Fields */}
        <div className="p-4 space-y-3 bg-white">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Action Title / Summary
            </label>
            <input
              type="text"
              value={scenario.label}
              onChange={e => onUpdate('label', e.target.value)}
              placeholder="e.g. Install calibration jig / upgrade"
              className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className={isRouting ? 'grid grid-cols-2 gap-2.5' : ''}>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                {targetLabel}
              </label>
              <input
                type="number"
                step="any"
                value={scenario.targetValue}
                onChange={e => onUpdate('targetValue', e.target.value)}
                placeholder={targetPlaceholder}
                className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 tabular-nums transition-all"
              />
            </div>

            {isRouting && (
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  {secondaryLabel}
                </label>
                <input
                  type="number"
                  step="any"
                  value={scenario.secondaryTargetValue || ''}
                  onChange={e => onUpdate('secondaryTargetValue', e.target.value)}
                  placeholder={secondaryPlaceholder}
                  className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 tabular-nums transition-all"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Fixed Inv (THB)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.investment}
                onChange={e => onUpdate('investment', e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 tabular-nums transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Lot Size (pcs)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.lotSize}
                onChange={e => onUpdate('lotSize', e.target.value)}
                placeholder="5000"
                className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 tabular-nums transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Variable Add-on (THB/pc)
            </label>
            <input
              type="number"
              step="any"
              value={scenario.variableAddedCost || ''}
              onChange={e => onUpdate('variableAddedCost', e.target.value)}
              placeholder="0.00"
              className="w-full px-2.5 py-1.5 text-xs bg-amber-50/80 border border-amber-200/90 rounded-md font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 tabular-nums transition-all"
            />
          </div>
        </div>
      </div>

      {/* Calculated Results & Apply Action */}
      {scenario.valid ? (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-sans">Gross Saving/pc:</span>
            <span className={`tabular-nums ${scenario.grossSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
              {formatVariance(scenario.grossSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400 font-sans">↳ Fixed Inv / pc:</span>
            <span className="text-slate-600 tabular-nums">
              -{scenario.fixedAddedCostPerUnit.toFixed(4)} THB
            </span>
          </div>

          {scenario.variableAddedCostPerUnit > 0 && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-sans">↳ Var Cost / pc:</span>
              <span className="text-slate-600 tabular-nums">
                -{scenario.variableAddedCostPerUnit.toFixed(4)} THB
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-sans">Total Added Cost/pc:</span>
            <span className="text-rose-600 font-semibold tabular-nums">
              -{scenario.addedCost.toFixed(4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center font-bold border-t border-slate-200/80 pt-1.5 text-slate-900">
            <span className="font-sans">Net Saving/pc:</span>
            <span className={`tabular-nums ${scenario.netSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
              {formatVariance(scenario.netSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center font-bold border-t border-slate-200/80 pt-1.5">
            <span className="text-slate-600 font-sans text-xs">Predicted Std Cost:</span>
            <span className="text-slate-900 text-xs font-bold font-mono tabular-nums">
              {formatCurrency(scenario.predictedTotal, 4, 'THB/pc')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onApplyTarget(scenario.targetValue)}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-md transition-all shadow-xs cursor-pointer"
            title="Apply this simulated target value directly into active master data"
          >
            <span>Apply Target to Active</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 text-center text-slate-400 text-[11px] font-mono italic">
          Enter target value above to simulate financial ROI.
        </div>
      )}
    </div>

  )
}
