import React from 'react'
import type { PrioritizationCandidate } from '../../../core'
import { formatVariance } from '../../../core'

interface ProblemStatementCardProps {
  candidate: PrioritizationCandidate
}

function formatCandidateValue(value: number | null, scale = 1): string {
  return value === null ? 'N/A' : (value * scale).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatCandidateParameter(candidate: PrioritizationCandidate, side: 'reference' | 'current'): string {
  const isLossPercentage = candidate.paramLabel?.trim().toLowerCase() === 'loss (%)'
  const parameter = side === 'reference' ? candidate.referenceParam : candidate.currentParam
  const cost = side === 'reference' ? candidate.referenceCost : candidate.currentCost
  const value = isLossPercentage ? parameter ?? null : parameter ?? cost
  return formatCandidateValue(value, isLossPercentage ? 100 : 1)
}

export const ProblemStatementCard: React.FC<ProblemStatementCardProps> = ({ candidate }) => (
  <section className="border border-slate-300 bg-white p-3 sm:p-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
            {candidate.status}
          </span>
          <span className="font-mono text-[10px] uppercase text-slate-500">Ranking context #{candidate.rank}</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-950">{candidate.candidateName}</h2>
        <p className="mt-0.5 text-[11px] text-slate-600">
          {candidate.category}{candidate.factor ? ` · ${candidate.factor}` : ''}
        </p>
      </div>
      <dl className="border border-slate-200 bg-slate-50 sm:min-w-48">
        <div className="px-2.5 py-1.5 text-left sm:text-right">
          <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">Cost gap</dt>
          <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-950">
            {candidate.costGap === null ? '—' : `${formatVariance(candidate.costGap, 4)} THB/pc`}
          </dd>
        </div>
      </dl>
    </div>

    <dl className="mt-3 grid grid-cols-1 divide-y divide-slate-200 border border-slate-200 bg-slate-50 text-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <div className="min-w-0 px-2.5 py-2">
        <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">
          Reference {candidate.paramLabel ?? 'value'}
        </dt>
        <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">
          {formatCandidateParameter(candidate, 'reference')}
        </dd>
      </div>
      <div className="min-w-0 px-2.5 py-2">
        <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">
          Current {candidate.paramLabel ?? 'value'}
        </dt>
        <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">
          {formatCandidateParameter(candidate, 'current')}
        </dd>
      </div>
    </dl>
  </section>
)
