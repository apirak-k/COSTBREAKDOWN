import React from 'react'
import { PrioritizationCandidate, formatNumber, formatPercent, formatVariance } from '../../../core'

interface CandidateRowProps {
  candidate: PrioritizationCandidate
  selectedForRca: boolean
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
  onToggleRcaSelection: (candidateKey: string, nextValue: boolean) => void
}

const STATUS_STYLES: Record<PrioritizationCandidate['status'], { text: string; marker: string }> = {
  CHANGED: { text: 'text-amber-800', marker: 'bg-amber-700' },
  ADDED: { text: 'text-blue-800', marker: 'bg-blue-700' },
  REMOVED: { text: 'text-rose-800', marker: 'bg-rose-700' }
}

function displayChangeValue(field: string, value: unknown): string {
  if (value === undefined) return 'Not set'
  if (value === null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    return field.trim().toLowerCase() === 'loss' ? formatPercent(value, 1) : formatNumber(value, 4)
  }
  if (typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function formatNullable(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value)
}

function hasRedundantFactor(candidate: PrioritizationCandidate): boolean {
  const factor = candidate.factor?.trim().toLocaleLowerCase()
  return (candidate.status === 'ADDED' && (factor === 'item added' || factor === 'added'))
    || (candidate.status === 'REMOVED' && (factor === 'item removed' || factor === 'removed'))
}

export const CandidateRow: React.FC<CandidateRowProps> = ({
  candidate,
  selectedForRca,
  onToggleControllable,
  onToggleRcaSelection
}) => {
  const statusStyle = STATUS_STYLES[candidate.status]
  const showFactor = Boolean(candidate.factor) && !hasRedundantFactor(candidate)

  return (
    <tr className={`transition-colors ${!candidate.controllable ? 'bg-slate-50 text-slate-600' : 'hover:bg-slate-50/70'}`}>
      <td className="px-3 py-2 text-center align-top">
        <input
          type="checkbox"
          checked={selectedForRca}
          onChange={event => onToggleRcaSelection(candidate.candidateKey, event.target.checked)}
          className="h-4 w-4 rounded-sm border-slate-400 accent-slate-900 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          aria-label={`Select ${candidate.candidateName} for an RCA Case`}
        />
      </td>
      <td className="w-14 px-3 py-2 text-center align-top">
        <span className="font-mono text-[11px] font-medium tabular-nums text-slate-500">{String(candidate.rank).padStart(2, '0')}</span>
      </td>

      <td className="min-w-72 px-4 py-2 align-top">
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-mono font-semibold uppercase tracking-wide text-slate-500">{candidate.category}</span>
            {showFactor && <span className="text-slate-500">{candidate.factor}</span>}
          </div>
          <p className="break-words text-xs font-semibold leading-4 text-slate-950">{candidate.candidateName}</p>
          {candidate.changeDetails && candidate.changeDetails.length > 0 && (
            <details className="mt-1">
              <summary className="min-h-6 cursor-pointer py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Changed fields ({candidate.changeDetails.length})
              </summary>
              <p className="mt-1 break-words text-[11px] leading-4 text-slate-600">
                {candidate.changeDetails.map((detail, index) => (
                  <span key={detail.field}>
                    {index > 0 && <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>}
                    <span className="font-medium">{detail.field}:</span>{' '}
                    <span className="font-mono tabular-nums">{displayChangeValue(detail.field, detail.reference)}</span>{' '}
                    <span aria-hidden="true" className="text-slate-400">→</span><span className="sr-only">to</span>{' '}
                    <span className="font-mono tabular-nums">{displayChangeValue(detail.field, detail.current)}</span>
                  </span>
                ))}
              </p>
            </details>
          )}
          {candidate.processBreakdown && (
            <details className="mt-2 border-t border-slate-200 pt-1.5">
              <summary className="min-h-7 cursor-pointer py-1 font-mono text-[11px] font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Process details ({candidate.processBreakdown.reference.length} Reference · {candidate.processBreakdown.current.length} Current)
              </summary>
              <div className="mt-1 space-y-2 border-l-2 border-slate-300 pl-2">
                {([
                  { key: 'reference', label: 'Reference', rows: candidate.processBreakdown.reference },
                  { key: 'current', label: 'Current', rows: candidate.processBreakdown.current }
                ] as const).map(({ key, label, rows }) => (
                  <section key={key} aria-label={`${label} Routing Processes`}>
                    <h3 className="font-sans text-[11px] font-semibold text-slate-600">
                      {label} · {rows.length} {rows.length === 1 ? 'process' : 'processes'}
                    </h3>
                    {rows.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-500">No Routing Process at this Work Center.</p>
                    ) : (
                      <ul className="mt-1 space-y-1.5">
                        {rows.map(process => (
                          <li key={process.id} className="border-l border-slate-300 pl-2">
                            <p className="break-words text-[11px] font-semibold text-slate-800">{process.processName}</p>
                            <p className="font-mono text-[11px] leading-4 text-slate-600">
                              Manning {formatNullable(process.manning, value => formatNumber(value, 2))}
                              {' · '}Capacity {formatNullable(process.capacity, value => formatNumber(value, 2))}
                              {' · '}Yield {formatNullable(process.yield, value => formatPercent(value, 1))}
                            </p>
                            <p className="font-mono text-[11px] leading-4 text-slate-600">
                              Labor {formatNullable(process.laborCost, value => formatNumber(value, 4))}
                              {' · '}Burden {formatNullable(process.burdenCost, value => formatNumber(value, 4))}
                              {' · '}Processing {formatNullable(process.totalCost, value => formatNumber(value, 4))} THB/pc
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </details>
          )}
        </div>
      </td>

      <td className="px-3 py-2 text-center align-top">
        <span className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] font-semibold ${statusStyle.text}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusStyle.marker}`} />
          {candidate.status}
        </span>
      </td>

      <td className="px-3 py-2 text-right align-top font-mono text-xs tabular-nums text-slate-600">
        {candidate.referenceCost === null ? '—' : formatNumber(candidate.referenceCost, 4)}
      </td>

      <td className="px-3 py-2 text-right align-top font-mono text-xs font-medium tabular-nums text-slate-950">
        {candidate.currentCost === null ? '—' : formatNumber(candidate.currentCost, 4)}
      </td>

      <td className={`px-3 py-2 text-right align-top font-mono text-xs font-semibold tabular-nums ${
        candidate.costGap === null ? 'text-slate-400' : candidate.costGap > 0 ? 'text-rose-700' : candidate.costGap < 0 ? 'text-emerald-700' : 'text-slate-500'
      }`}>
        {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}
      </td>

      <td className="px-3 py-2 text-center align-top">
        <label className="inline-flex min-h-8 items-center justify-center gap-1.5 px-1 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={candidate.controllable}
            onChange={e => onToggleControllable(candidate.candidateKey, e.target.checked)}
            className="h-4 w-4 rounded-sm border-slate-400 accent-slate-900 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            aria-label={`Mark ${candidate.candidateName} as controllable`}
          />
          <span className="text-[11px] font-medium text-slate-700">{candidate.controllable ? 'Yes' : 'No'}</span>
        </label>
      </td>
    </tr>
  )
}
