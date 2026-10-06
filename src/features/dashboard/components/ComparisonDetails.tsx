import React from 'react'
import type { PrioritizationCandidate } from '../../../core'
import { formatNumber, formatPercent, formatVariance } from '../../../core'

interface ComparisonDetailsProps {
  materialCandidates: PrioritizationCandidate[]
  processingCandidates: PrioritizationCandidate[]
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function formatInputValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') {
    return field.trim().toLowerCase() === 'loss'
      ? formatPercent(value, 1)
      : formatNumber(value, 4)
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function CandidateStatus({ candidate }: { candidate: PrioritizationCandidate }) {
  const className = candidate.status === 'CHANGED'
    ? 'border-amber-300 bg-amber-50 text-amber-900'
    : candidate.status === 'ADDED'
      ? 'border-sky-300 bg-sky-50 text-sky-900'
      : 'border-rose-300 bg-rose-50 text-rose-900'

  return <span className={`inline-flex border px-1.5 py-0.5 font-mono text-[11px] font-bold ${className}`}>{candidate.status}</span>
}

function MaterialDetails({ candidates }: { candidates: PrioritizationCandidate[] }) {
  return (
    <details className="border border-slate-300 bg-white">
      <summary className="cursor-pointer px-3 py-2.5 font-sans text-xs font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        BOM material detail ({candidates.length})
      </summary>
      {candidates.length === 0 ? (
        <p className="border-t border-slate-200 px-3 py-3 text-xs text-slate-600">No changed, added, or removed BOM findings in this comparison.</p>
      ) : (
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full min-w-[720px] text-left text-xs">
            <caption className="sr-only">BOM material cost findings and changed inputs</caption>
            <thead className="bg-slate-100 font-sans text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2">Name / Status</th>
                <th scope="col" className="px-3 py-2 text-right">Reference · THB/pc</th>
                <th scope="col" className="px-3 py-2 text-right">Current · THB/pc</th>
                <th scope="col" className="px-3 py-2 text-right">Gap · THB/pc</th>
                <th scope="col" className="px-3 py-2">Changed inputs · Ref → Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidates.map(candidate => (
                <tr key={candidate.candidateKey} className="align-top">
                  <th scope="row" className="px-3 py-2.5 font-medium text-slate-900">
                    <div className="space-y-1">
                      <span className="block break-words">{candidate.candidateName}</span>
                      <CandidateStatus candidate={candidate} />
                    </div>
                  </th>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">{formatCost(candidate.referenceCost)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-900">{formatCost(candidate.currentCost)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {candidate.changeDetails && candidate.changeDetails.length > 0 ? (
                      <ul className="space-y-1">
                        {candidate.changeDetails.map(detail => (
                          <li key={detail.field} className="break-words">
                            <span className="font-medium">{detail.field}:</span>{' '}
                            <span className="font-mono tabular-nums">{formatInputValue(detail.field, detail.reference)} → {formatInputValue(detail.field, detail.current)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-slate-400">No field detail available</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}

function ProcessList({ label, rows }: {
  label: string
  rows: NonNullable<PrioritizationCandidate['processBreakdown']>['reference']
}) {
  return (
    <section aria-label={`${label} Routing Process details`} className="min-w-0">
      <h4 className="font-sans text-[11px] font-semibold text-slate-700">{label} · {rows.length} {rows.length === 1 ? 'process' : 'processes'}</h4>
      {rows.length === 0 ? (
        <p className="mt-1 text-[11px] text-slate-500">No matching Routing Process on this side.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {rows.map(process => (
            <li key={process.id} className="border-l border-slate-300 pl-2">
              <p className="break-words text-[11px] font-semibold text-slate-800">{process.processName}</p>
              <p className="font-mono text-[11px] leading-4 text-slate-600">
                Manning {formatCost(process.manning)} · Capacity {formatCost(process.capacity)} · Yield {process.yield === null ? '—' : formatPercent(process.yield, 1)}
              </p>
              <p className="font-mono text-[11px] leading-4 text-slate-600">
                Labor {formatCost(process.laborCost)} · Burden {formatCost(process.burdenCost)} · Processing {formatCost(process.totalCost)} THB/pc
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ProcessingDetails({ candidates }: { candidates: PrioritizationCandidate[] }) {
  return (
    <details className="border border-slate-300 bg-white">
      <summary className="cursor-pointer px-3 py-2.5 font-sans text-xs font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        Processing by Process ({candidates.length})
      </summary>
      {candidates.length === 0 ? (
        <p className="border-t border-slate-200 px-3 py-3 text-xs text-slate-600">No changed, added, or removed Process findings in this comparison.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-t border-slate-200">
          {candidates.map(candidate => (
            <li key={candidate.candidateKey} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-900">{candidate.candidateName}</h3>
                  <CandidateStatus candidate={candidate} />
                </div>
                <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-right">
                  <div><dt className="font-sans text-[11px] text-slate-500">Reference · THB/pc</dt><dd className="font-mono tabular-nums text-slate-600">{formatCost(candidate.referenceCost)}</dd></div>
                  <div><dt className="font-sans text-[11px] text-slate-500">Current · THB/pc</dt><dd className="font-mono tabular-nums text-slate-900">{formatCost(candidate.currentCost)}</dd></div>
                  <div><dt className="font-sans text-[11px] text-slate-500">Gap · THB/pc</dt><dd className="font-mono font-semibold tabular-nums text-slate-900">{candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}</dd></div>
                </dl>
              </div>
              {candidate.processBreakdown ? (
                <details className="border-t border-slate-200 pt-1.5">
                  <summary className="min-h-7 cursor-pointer py-1 font-mono text-[11px] font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                    Process details ({candidate.processBreakdown.reference.length} Reference · {candidate.processBreakdown.current.length} Current)
                  </summary>
                  <div className="mt-1 grid grid-cols-1 gap-3 border-l-2 border-slate-300 pl-2 sm:grid-cols-2">
                    <ProcessList label="Reference" rows={candidate.processBreakdown.reference} />
                    <ProcessList label="Current" rows={candidate.processBreakdown.current} />
                  </div>
                </details>
              ) : <p className="text-[11px] text-slate-500">Routing Process detail is unavailable.</p>}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

export const ComparisonDetails: React.FC<ComparisonDetailsProps> = ({ materialCandidates, processingCandidates }) => (
  <section aria-labelledby="comparison-detail-heading" className="space-y-2">
    <div className="border-b border-slate-300 pb-2">
      <p className="font-sans text-[11px] font-semibold text-slate-600">Detail</p>
      <h2 id="comparison-detail-heading" className="mt-0.5 text-sm font-semibold text-slate-900">Changed records and Process cost</h2>
    </div>
    <MaterialDetails candidates={materialCandidates} />
    <ProcessingDetails candidates={processingCandidates} />
  </section>
)
