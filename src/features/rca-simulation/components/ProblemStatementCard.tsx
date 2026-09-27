import React from 'react'
import type { PrioritizationCandidate } from '../../../core'
import { formatVariance } from '../../../core'

interface ProblemStatementCardProps {
  candidate: PrioritizationCandidate
}

function formatCandidateValue(value: number | null): string {
  return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

export const ProblemStatementCard: React.FC<ProblemStatementCardProps> = ({ candidate }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {candidate.status}
          </span>
          <span className="text-xs text-slate-500">Ranking context #{candidate.rank}</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-900">{candidate.candidateName}</h2>
        <p className="mt-1 text-xs text-slate-600">
          {candidate.category}{candidate.factor ? ` · ${candidate.factor}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Cost gap</p>
        <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
          {formatVariance(candidate.costGap, 4)} THB/pc
        </p>
      </div>
    </div>

    <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
      <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Reference {candidate.paramLabel ?? 'value'}
        </dt>
        <dd className="mt-1 font-mono tabular-nums text-slate-900">
          {formatCandidateValue(candidate.referenceParam ?? candidate.referenceCost)}
        </dd>
      </div>
      <div className="rounded border border-slate-200 bg-slate-50 p-2.5">
        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Current {candidate.paramLabel ?? 'value'}
        </dt>
        <dd className="mt-1 font-mono tabular-nums text-slate-900">
          {formatCandidateValue(candidate.currentParam ?? candidate.currentCost)}
        </dd>
      </div>
    </dl>
  </section>
)
