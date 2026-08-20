import React from 'react'
import { WhatIfResult, formatCurrency, formatVariance } from '../../../core'
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

interface ScenarioCardProps {
  scenario: WhatIfResult
  targetLabel: string
  targetPlaceholder: string
  onUpdate: (field: string, val: string) => void
  onApplyTarget: (targetValue: string) => void
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  targetLabel,
  targetPlaceholder,
  onUpdate,
  onApplyTarget
}) => {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all bg-white flex flex-col justify-between ${
        scenario.valid && scenario.isProfitable
          ? 'border-emerald-300 ring-1 ring-emerald-400/30'
          : scenario.valid && !scenario.isProfitable
          ? 'border-rose-200 bg-rose-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Option Header */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <span className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg font-mono">
            Option {scenario.letter}
          </span>
          {scenario.valid && (
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                scenario.isProfitable
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {scenario.isProfitable ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Profitable
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Unprofitable
                </>
              )}
            </span>
          )}
        </div>

        {/* Input Fields */}
        <div className="p-4 space-y-3 bg-white">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
              Corrective Action Description
            </label>
            <input
              type="text"
              value={scenario.label}
              onChange={e => onUpdate('label', e.target.value)}
              placeholder="e.g. Install calibration jig / tooling upgrade"
              className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
              {targetLabel}
            </label>
            <input
              type="number"
              step="any"
              value={scenario.targetValue}
              onChange={e => onUpdate('targetValue', e.target.value)}
              placeholder={targetPlaceholder}
              className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Investment (THB)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.investment}
                onChange={e => onUpdate('investment', e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Batch Lot Size (pcs)
              </label>
              <input
                type="number"
                step="any"
                value={scenario.lotSize}
                onChange={e => onUpdate('lotSize', e.target.value)}
                placeholder="5000"
                className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calculated Results & Apply Action */}
      {scenario.valid ? (
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Gross Saving/pc:</span>
            <span className={scenario.grossSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {formatVariance(scenario.grossSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Added Cost/pc:</span>
            <span className="text-rose-600 font-semibold">
              -{scenario.addedCost.toFixed(4)} THB
            </span>
          </div>

          <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
            <span className="font-sans">Net Saving/pc:</span>
            <span className={scenario.netSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {formatVariance(scenario.netSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5">
            <span className="text-slate-600 font-sans">Predicted Std Cost:</span>
            <span className="text-slate-900 text-sm font-bold">
              {formatCurrency(scenario.predictedTotal, 4, 'THB/pc')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onApplyTarget(scenario.targetValue)}
            className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
            title="Apply this simulated target value directly into active master data"
          >
            <span>Apply Target to Active</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-slate-400 text-xs italic">
          Enter target value above to simulate ROI and net savings.
        </div>
      )}
    </div>
  )
}
