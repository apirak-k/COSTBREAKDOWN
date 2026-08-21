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
      className={`rounded border overflow-hidden transition-colors bg-white flex flex-col justify-between shadow-2xs ${
        scenario.valid && scenario.isProfitable
          ? 'border-emerald-600/60'
          : scenario.valid && !scenario.isProfitable
          ? 'border-rose-300 bg-rose-50/10'
          : 'border-slate-300/80'
      }`}
    >
      {/* Option Header */}
      <div>
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50/80">
          <span className="px-2 py-0.5 text-xs font-bold bg-slate-900 text-white rounded font-mono">
            OPTION {scenario.letter}
          </span>
          {scenario.valid && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                scenario.isProfitable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {scenario.isProfitable ? (
                <>
                  <CheckCircle className="w-2.5 h-2.5" />
                  PROFITABLE
                </>
              ) : (
                <>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  UNPROFITABLE
                </>
              )}
            </span>
          )}
        </div>

        {/* Input Fields */}
        <div className="p-3 space-y-2 bg-white">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
              Action Title / Summary
            </label>
            <input
              type="text"
              value={scenario.label}
              onChange={e => onUpdate('label', e.target.value)}
              placeholder="e.g. Install calibration jig / upgrade"
              className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
            />
          </div>

          <div className={isRouting ? 'grid grid-cols-2 gap-2' : ''}>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
                {targetLabel}
              </label>
              <input
                type="number"
                step="any"
                value={scenario.targetValue}
                onChange={e => onUpdate('targetValue', e.target.value)}
                placeholder={targetPlaceholder}
                className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {isRouting && (
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
                  {secondaryLabel}
                </label>
                <input
                  type="number"
                  step="any"
                  value={scenario.secondaryTargetValue || ''}
                  onChange={e => onUpdate('secondaryTargetValue', e.target.value)}
                  placeholder={secondaryPlaceholder}
                  className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
                Fixed Inv (THB)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.investment}
                onChange={e => onUpdate('investment', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
                Lot Size (pcs)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.lotSize}
                onChange={e => onUpdate('lotSize', e.target.value)}
                placeholder="5000"
                className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-600 mb-0.5">
              Variable Add-on (THB/pc)
            </label>
            <input
              type="number"
              step="any"
              value={scenario.variableAddedCost || ''}
              onChange={e => onUpdate('variableAddedCost', e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Calculated Results & Apply Action */}
      {scenario.valid ? (
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Gross Saving/pc:</span>
            <span className={scenario.grossSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {formatVariance(scenario.grossSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 font-sans">↳ Fixed Inv / pc:</span>
            <span className="text-slate-600">
              -{scenario.fixedAddedCostPerUnit.toFixed(4)} THB
            </span>
          </div>

          {scenario.variableAddedCostPerUnit > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-sans">↳ Var Cost / pc:</span>
              <span className="text-slate-600">
                -{scenario.variableAddedCostPerUnit.toFixed(4)} THB
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Total Added Cost/pc:</span>
            <span className="text-rose-600 font-semibold">
              -{scenario.addedCost.toFixed(4)} THB
            </span>
          </div>

          <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
            <span className="font-sans">Net Saving/pc:</span>
            <span className={scenario.netSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {formatVariance(scenario.netSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
            <span className="text-slate-600 font-sans">Predicted Std Cost:</span>
            <span className="text-slate-900 text-xs font-bold font-mono">
              {formatCurrency(scenario.predictedTotal, 4, 'THB/pc')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onApplyTarget(scenario.targetValue)}
            className="w-full mt-1.5 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded transition-colors shadow-2xs cursor-pointer"
            title="Apply this simulated target value directly into active master data"
          >
            <span>Apply Target to Active</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-slate-400 text-[11px] font-mono italic">
          Enter target value above to simulate financial ROI.
        </div>
      )}
    </div>
  )
}
