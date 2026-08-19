import React from 'react'
import { useAppStore } from '../lib/store'

export const RCAAndTrialPage: React.FC = () => {
  const { simulationOptions, promoteOptionToActive } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">4. Root Cause Analysis &amp; What-If Simulator</h1>
        <p className="text-xs text-slate-500">Economic trade-off analysis — converts improvement options into predicted unit cost savings</p>
      </div>

      {/* 5-Whys Diagnosis Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Root Cause Analysis
        </h3>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-700">Problem Statement: </span>
            Screen printing first-pass yield dropped from 95% to 90% (Variance: +0.9294 THB/pc).
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-700">Physical Root Cause: </span>
            Squeegee pressure drift during shift changeover (Current: 32 N/cm vs Target: 48 N/cm) creates open-circuit defects.
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 font-medium">
            <span className="font-bold">Corrective Action Goal: </span>
            Standardize squeegee pressure setting procedure and evaluate multi-option ROI trade-offs below.
          </div>
        </div>
      </div>

      {/* What-If Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {simulationOptions.map(opt => (
          <div
            key={opt.id}
            className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
              opt.isProfitable
                ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/30'
                : 'bg-rose-50/30 border-rose-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg font-mono">
                  Option {opt.optionLetter}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  opt.isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {opt.isProfitable ? 'Profitable' : 'Unprofitable'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mb-2">{opt.actionName}</h4>

              <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Target Yield:</span>
                  <span className="font-bold text-slate-900">{(opt.targetYield * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Investment:</span>
                  <span>{opt.investmentCost.toLocaleString()} THB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Lot Size:</span>
                  <span>{opt.lotSize.toLocaleString()} pcs</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500 font-sans">Added Cost/pc:</span>
                  <span className="text-rose-600">+{opt.addedCostPerUnit.toFixed(4)} THB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Gross Saving/pc:</span>
                  <span className="text-emerald-600">+{opt.grossSavingPerUnit.toFixed(4)} THB</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                  <span className="font-sans">Net Saving/pc:</span>
                  <span className={opt.netSavingPerUnit > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {opt.netSavingPerUnit > 0 ? `+${opt.netSavingPerUnit.toFixed(4)}` : opt.netSavingPerUnit.toFixed(4)} THB
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between items-baseline mb-3 font-mono">
                <span className="text-xs text-slate-500 font-sans">Predicted Std Cost:</span>
                <span className="text-base font-bold text-slate-900">{opt.predictedTotalStdCost.toFixed(4)} THB</span>
              </div>
              <button
                onClick={() => promoteOptionToActive(opt.id)}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  opt.isProfitable
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!opt.isProfitable}
              >
                Promote to Active Standard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
