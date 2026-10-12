import React from 'react'
import { formatNumber, formatVariance } from '../../../core'
import type { PrioritizationCandidate } from '../../../core'
import { CandidateParameterTable } from './CandidateParameterTable'
import type { CandidateParameterData } from './candidate-detail-data'

interface CandidateQuickInfoProps {
  candidate: PrioritizationCandidate | null
  parameters: CandidateParameterData | null
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

export const CandidateQuickInfo: React.FC<CandidateQuickInfoProps> = ({ candidate, parameters }) => (
  <section aria-labelledby="candidate-quick-information-title" className="border-b border-slate-300 pb-3">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 id="candidate-quick-information-title" className="font-sans text-xs font-semibold text-slate-800">Candidate information</h2>
      {candidate ? (
        <p className="min-w-0 break-words text-xs text-slate-700">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">{candidate.category}</span>
          <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
          <span className="font-semibold text-slate-950">{candidate.candidateName}</span>
        </p>
      ) : (
        <span className="font-mono text-xs text-slate-500">—</span>
      )}
    </div>

    {candidate && parameters && (
      <>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
          <div className="flex items-baseline gap-1.5">
            <dt className="font-sans font-medium text-slate-600">Reference Cost</dt>
            <dd className="font-mono tabular-nums text-slate-700">{formatCost(candidate.referenceCost)} <span className="font-sans text-slate-500">THB/pc</span></dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="font-sans font-medium text-slate-600">Current Cost</dt>
            <dd className="font-mono tabular-nums text-slate-950">{formatCost(candidate.currentCost)} <span className="font-sans text-slate-500">THB/pc</span></dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="font-sans font-medium text-slate-600">Cost Gap</dt>
            <dd className={`font-mono font-semibold tabular-nums ${candidate.costGap === null ? 'text-slate-500' : candidate.costGap > 0 ? 'text-rose-700' : candidate.costGap < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
              {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)} <span className="font-sans text-slate-500">THB/pc</span>
            </dd>
          </div>
        </dl>
        <div className="mt-2 max-w-3xl">
          <CandidateParameterTable data={parameters} compact />
        </div>
      </>
    )}
  </section>
)
