import React, { useState } from 'react'
import { WhatIfResult, formatCurrency, formatVariance } from '../../../core'
import { CheckCircle2, TrendingUp, AlertCircle, ArrowUpRight, Save } from 'lucide-react'

interface TrialValidationCardProps {
  baselineTotalCost: number
  activeTotalCost: number
  scenarios: WhatIfResult[]
  onPromoteToBaseline?: () => void
}

export const TrialValidationCard: React.FC<TrialValidationCardProps> = ({
  baselineTotalCost,
  activeTotalCost,
  scenarios,
  onPromoteToBaseline
}) => {
  // Select best profitable scenario as default reference, or option A
  const profitableOptions = scenarios.filter(s => s.valid && s.isProfitable)
  const defaultOption = profitableOptions.length > 0 ? profitableOptions[0] : scenarios[0]

  const [selectedLetter, setSelectedLetter] = useState<'A' | 'B' | 'C'>(defaultOption?.letter || 'A')
  const [actualTrialCost, setActualTrialCost] = useState<string>('')
  const [trialNotes, setTrialNotes] = useState<string>('')
  const [isSaved, setIsSaved] = useState<boolean>(false)

  const selectedScenario = scenarios.find(s => s.letter === selectedLetter) || defaultOption

  const predictedCost = selectedScenario?.valid ? selectedScenario.predictedTotal : activeTotalCost
  const actualCostNum = parseFloat(actualTrialCost)

  const hasActual = !isNaN(actualCostNum) && actualCostNum > 0
  const costDeviation = hasActual ? actualCostNum - predictedCost : 0
  const pctDeviation = hasActual && predictedCost > 0 ? (costDeviation / predictedCost) * 100 : 0

  const handleSaveTrial = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <div className="bg-white rounded border border-slate-300/80 overflow-hidden shadow-2xs">
      {/* Card Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold font-mono uppercase tracking-tight text-slate-800">
              Section 5: Shop-Floor Trial Validation Matrix
            </h2>
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-slate-200 text-slate-700 rounded font-mono">
              Proposal 3.4
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Tri-Factor Evaluation: Baseline Std vs Model Predicted vs Post-Trial Measured
          </p>
        </div>

        {/* Option Selector */}
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-slate-500 text-[11px]">Benchmark:</span>
          {(['A', 'B', 'C'] as const).map(letter => {
            const sc = scenarios.find(s => s.letter === letter)
            const isValid = sc?.valid
            return (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter)}
                className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                  selectedLetter === letter
                    ? 'bg-slate-900 text-white'
                    : isValid
                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                disabled={!isValid}
              >
                OPT {letter}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        {/* 3-Column Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Column 1: Baseline Pre-Improvement */}
          <div className="p-3 rounded border border-slate-300/80 bg-slate-50 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                1. Pre-Improvement Baseline
              </span>
              <p className="text-base font-bold text-slate-900 font-mono mt-1">
                {formatCurrency(baselineTotalCost, 4, 'THB/pc')}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                Standard baseline cost prior to corrective trials
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600 flex justify-between">
              <span>Active Variance:</span>
              <span className={activeTotalCost > baselineTotalCost ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                {formatVariance(activeTotalCost - baselineTotalCost, 4)} THB
              </span>
            </div>
          </div>

          {/* Column 2: What-If Model Predicted Cost */}
          <div className="p-3 rounded border border-slate-300/80 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600">
                  2. Predicted (Option {selectedLetter})
                </span>
                {selectedScenario?.valid && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded">
                    Net: {formatVariance(selectedScenario.netSaving, 4)}
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-slate-900 font-mono mt-1">
                {selectedScenario?.valid
                  ? formatCurrency(predictedCost, 4, 'THB/pc')
                  : 'N/A (Set Target)'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5 truncate">
                {selectedScenario?.label || 'Simulated target expected cost'}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600 flex justify-between">
              <span>Gross Saving:</span>
              <span className="text-emerald-700 font-bold">
                {selectedScenario?.valid ? formatVariance(selectedScenario.grossSaving, 4) + ' THB' : '—'}
              </span>
            </div>
          </div>

          {/* Column 3: Post-Trial Actual Measurement */}
          <div className="p-3 rounded border border-slate-400 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-800">
                  3. Measured Shop-Floor Trial
                </span>
                {hasActual && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                    Math.abs(pctDeviation) <= 3
                      ? 'bg-emerald-100 text-emerald-800'
                      : costDeviation < 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {Math.abs(pctDeviation) <= 3 ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                        Accurate (≤3%)
                      </>
                    ) : costDeviation < 0 ? (
                      <>
                        <TrendingUp className="w-2.5 h-2.5 text-blue-700" />
                        Beats Target
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                        Deviation
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-1.5">
                <label className="block text-[9px] font-mono font-bold text-slate-600 mb-0.5">
                  Actual Cost Measured (THB/pc):
                </label>
                <input
                  type="number"
                  step="any"
                  value={actualTrialCost}
                  onChange={e => setActualTrialCost(e.target.value)}
                  placeholder={`e.g. ${predictedCost.toFixed(4)}`}
                  className="w-full px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-700 flex justify-between">
              <span>Model Deviation:</span>
              <span className={`font-bold ${
                !hasActual
                  ? 'text-slate-400'
                  : costDeviation <= 0
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                {hasActual ? `${formatVariance(costDeviation, 4)} THB (${pctDeviation >= 0 ? '+' : ''}${pctDeviation.toFixed(2)}%)` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Trial Notes & Observations */}
        <form onSubmit={handleSaveTrial} className="space-y-2">
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-700 mb-0.5">
              Trial Observations &amp; Engineering Notes (For Project Chapter 4-5)
            </label>
            <textarea
              rows={2}
              value={trialNotes}
              onChange={e => setTrialNotes(e.target.value)}
              placeholder="e.g. Conducted 1-day trial with 5,000 pcs batch. Scrap reduced significantly after installing positioning fixture. Cycle time stabilized within ±2% of predicted model."
              className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-[10px] text-slate-500 font-sans italic">
              * Data recorded here can be cited directly in academic project defense and chapter 4 analysis.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-mono font-bold text-xs rounded transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>{isSaved ? 'Trial Data Saved!' : 'Save Record'}</span>
              </button>

              {onPromoteToBaseline && (
                <button
                  type="button"
                  onClick={onPromoteToBaseline}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-mono font-bold text-xs rounded transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Finalize PDCA cycle by promoting validated actual parameters into standard baseline"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Promote Trial to Baseline</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
