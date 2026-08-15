import React from 'react'
import { useAppStore } from '../lib/store'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export const CandidateSelectionPage: React.FC = () => {
  const { setActiveTab } = useAppStore()

  const candidates = [
    {
      rank: 1,
      name: 'Conductive Silver Ink XA-3645 Market Price (P)',
      category: 'Direct Material (BOM)',
      baseline: '150.00 ฿/g',
      active: '545.60 ฿/g',
      gap: 1.8000,
      controllable: false,
      owner: 'Purchasing',
      reason: 'Global silver market commodity price escalation. Plant cannot control price directly without customer drawing revision.'
    },
    {
      rank: 2,
      name: 'Op 40-60 Screen Printing Yield Rate (Y)',
      category: 'Process Routing',
      baseline: '95.0%',
      active: '90.0%',
      gap: 0.9294,
      controllable: true,
      owner: 'IE / Cleanroom Production',
      reason: 'Squeegee pressure drift between shift changeovers causes ink bleeding. 100% Controllable via jig standardized procedure.',
      selected: true
    },
    {
      rank: 3,
      name: 'Cleanroom Machine Clean Air Burden Rate (BRV)',
      category: 'Machine Burden',
      baseline: '79.66 ฿/hr',
      active: '79.66 ฿/hr',
      gap: -0.2980,
      controllable: false,
      owner: 'Finance / Costing',
      reason: 'Fixed plant-wide overhead rate indexation.'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">3. Cost Gap Ranking & Kaizen Candidate Selection</h1>
        <p className="text-xs text-slate-500">Systematic screening to filter controllable operational parameters from market external inflations</p>
      </div>

      <div className="space-y-4">
        {candidates.map((c, i) => (
          <div
            key={i}
            className={`p-5 rounded-xl border transition-all ${
              c.selected
                ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/50'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  c.selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  #{c.rank}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                  <span className="text-xs text-slate-500">{c.category} • Owner: <span className="font-semibold text-slate-700">{c.owner}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right font-mono">
                  <span className="text-[11px] text-slate-400 block">Unit Cost Gap</span>
                  <span className={`text-sm font-bold ${c.gap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {c.gap > 0 ? `+${c.gap.toFixed(4)}` : c.gap.toFixed(4)} ฿/pc
                  </span>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                  c.controllable
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {c.controllable ? 'Controllable (Kaizen Target)' : 'Uncontrollable'}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
              {c.reason}
            </p>

            {c.selected && (
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Selected Target: Proceed to Root Cause Analysis & Multi-Option What-If Simulator
                </span>
                <button
                  onClick={() => setActiveTab('rca')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                >
                  Go to RCA & What-If
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
