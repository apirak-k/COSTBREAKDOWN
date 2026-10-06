import React from 'react'
import type { PrioritizationCandidate } from '../../../core'
import { formatVariance } from '../../../core'

interface ProblemStatementCardProps {
  candidate: PrioritizationCandidate
}

function formatCandidateValue(value: number | null, scale = 1): string {
  return value === null ? 'N/A' : (value * scale).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatChangedInputValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') {
    const isLoss = field.trim().toLowerCase() === 'loss'
    return `${formatCandidateValue(value, isLoss ? 100 : 1)}${isLoss ? '%' : ''}`
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export const ProblemStatementCard: React.FC<ProblemStatementCardProps> = ({ candidate }) => (
  <section className="border border-slate-300 bg-white p-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
            {candidate.status}
          </span>
          <span className="font-mono text-[10px] uppercase text-slate-500">Ranking context #{candidate.rank}</span>
        </div>
        <h2 className="text-xs font-semibold text-slate-900">{candidate.candidateName}</h2>
        <p className="mt-0.5 text-[11px] text-slate-600">
          {candidate.category}{candidate.factor ? ` · ${candidate.factor}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] font-semibold uppercase text-slate-600">Cost gap</p>
        <p className="font-mono text-xs font-semibold tabular-nums text-slate-900">
          {candidate.costGap === null ? '—' : `${formatVariance(candidate.costGap, 4)} THB/pc`}
        </p>
      </div>
    </div>

    <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
      <div className="border border-slate-200 bg-slate-50 px-2.5 py-2">
        <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">Reference cost (THB/pc)</dt>
        <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">
          {formatCandidateValue(candidate.referenceCost)}
        </dd>
      </div>
      <div className="border border-slate-200 bg-slate-50 px-2.5 py-2">
        <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">Current cost (THB/pc)</dt>
        <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">
          {formatCandidateValue(candidate.currentCost)}
        </dd>
      </div>
    </dl>

    {candidate.changeDetails && candidate.changeDetails.length > 0 && (
      <section aria-label="Changed inputs" className="mt-3 border-t border-slate-200 pt-2">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">Changed inputs</h3>
        <ul className="mt-1 space-y-1 text-xs">
          {candidate.changeDetails.map(detail => (
            <li key={detail.field} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium text-slate-700">{detail.field}</span>
              <span className="font-mono tabular-nums text-slate-900">
                {formatChangedInputValue(detail.field, detail.reference)}
                {' '}<span aria-hidden="true" className="text-slate-400">→</span><span className="sr-only">to</span>{' '}
                {formatChangedInputValue(detail.field, detail.current)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    )}
  </section>
)
