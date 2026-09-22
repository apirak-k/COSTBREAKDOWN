import React from 'react'
import { WhatIfResult, formatCurrency, formatVariance } from '../../../core'

interface ScenarioCardProps {
  scenario: WhatIfResult
  targetLabel: string
  targetPlaceholder: string
  isRouting?: boolean
  secondaryLabel?: string
  secondaryPlaceholder?: string
  onUpdate: (field: string, val: string) => void
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  targetLabel,
  targetPlaceholder,
  isRouting,
  secondaryLabel = 'Target Manning (Heads)',
  secondaryPlaceholder = '1',
  onUpdate
}) => {
  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all bg-white flex flex-col justify-between shadow-xs ${
        scenario.valid && scenario.isProfitable
          ? 'border-slate-300'
          : scenario.valid && !scenario.isProfitable
          ? 'border-slate-300'
          : 'border-slate-200'
      }`}
    >
      {/* Option Header */}
      <div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
          <span className="px-2 py-0.5 text-xs font-bold bg-slate-900 text-white rounded font-mono shadow-2xs">
            Option {scenario.letter}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
              SCENARIO DRAFT
            </span>
            {scenario.valid && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  scenario.isProfitable
                    ? 'bg-slate-100 text-emerald-700 border-slate-200'
                    : 'bg-slate-100 text-rose-700 border-slate-200'
                }`}
              >
                {scenario.isProfitable ? 'PROFITABLE' : 'UNPROFITABLE'}
              </span>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <div className="p-4 space-y-3 bg-white">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Action Title
            </label>
            <input
              type="text"
              value={scenario.label}
              onChange={e => onUpdate('label', e.target.value)}
              placeholder="e.g. Install calibration jig / upgrade"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-sans text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
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
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 tabular-nums shadow-2xs transition-all"
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
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 tabular-nums shadow-2xs transition-all"
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
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 tabular-nums shadow-2xs transition-all"
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
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 tabular-nums shadow-2xs transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-500 mb-1 uppercase tracking-wider">
              Var Cost (THB/pc)
            </label>
            <input
              type="number"
              step="any"
              value={scenario.variableAddedCost || ''}
              onChange={e => onUpdate('variableAddedCost', e.target.value)}
              placeholder="0.00"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 tabular-nums shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Calculated Results & Apply Action */}
      {scenario.valid ? (
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-sans">Gross Saving:</span>
            <span className={`tabular-nums ${scenario.grossSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
              {formatVariance(scenario.grossSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400 font-sans">↳ Fixed Cost:</span>
            <span className="text-slate-600 tabular-nums">
              -{scenario.fixedAddedCostPerUnit.toFixed(4)} THB
            </span>
          </div>

          {scenario.variableAddedCostPerUnit > 0 && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-sans">↳ Var Cost:</span>
              <span className="text-slate-600 tabular-nums">
                -{scenario.variableAddedCostPerUnit.toFixed(4)} THB
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-sans">Added Cost:</span>
            <span className="text-rose-600 font-semibold tabular-nums">
              -{scenario.addedCost.toFixed(4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center font-bold border-t border-slate-200 pt-1.5 text-slate-900">
            <span className="font-sans">Net Saving:</span>
            <span className={`tabular-nums ${scenario.netSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}`}>
              {formatVariance(scenario.netSaving, 4)} THB
            </span>
          </div>

          <div className="flex justify-between items-center font-bold border-t border-slate-200 pt-1.5">
            <span className="text-slate-600 font-sans text-xs">Predicted Cost:</span>
            <span className="text-slate-900 text-xs font-bold font-mono tabular-nums">
              {formatCurrency(scenario.predictedTotal, 4, 'THB/pc')}
            </span>
          </div>

          <p className="pt-1 text-[10px] text-slate-500 font-sans">
            This result is isolated to the scenario draft; official source values remain unchanged.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-slate-400 text-[11px] font-mono italic">
          Enter a valid target value above to simulate. Official source values remain unchanged.
        </div>
      )}
    </div>

  )
}
