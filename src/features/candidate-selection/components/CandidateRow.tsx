import React from 'react'
import { PrioritizationCandidate, formatNumber, formatVariance } from '../../../core'

interface CandidateRowProps {
  candidate: PrioritizationCandidate
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
}

function statusBadgeClass(status: PrioritizationCandidate['status']): string {
  if (status === 'CHANGED') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (status === 'ADDED') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (status === 'REMOVED') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

function displayChangeValue(value: unknown): string {
  if (value === undefined) return 'Not set'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export const CandidateRow: React.FC<CandidateRowProps> = ({
  candidate,
  onToggleControllable
}) => {
  return (
    <tr className={`transition-colors text-xs font-mono ${!candidate.controllable ? 'bg-slate-50 text-slate-600' : 'hover:bg-slate-50/70'}`}>
      {/* Rank */}
      <td className="px-3 py-3 text-center w-12">
        <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold tabular-nums text-white">
          {candidate.rank}
        </span>
      </td>

      {/* Candidate / Finding */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-sm text-slate-900 font-sans">
            {candidate.candidateName}
          </span>
          <span className="rounded-sm border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {candidate.category}
          </span>
          {candidate.factor && (
            <span className="text-xs text-slate-600 font-sans">
              · {candidate.factor}
            </span>
          )}
          {candidate.changeDetails && candidate.changeDetails.length > 0 && (
            <div className="basis-full break-words text-xs font-sans text-slate-600">
              <span className="font-medium">Changed fields: </span>
              {candidate.changeDetails.map(detail => (
                <span key={detail.field} className="mr-2">
                  {detail.field}: {displayChangeValue(detail.reference)} → {displayChangeValue(detail.current)}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3 text-center">
        <span className={`inline-flex min-h-7 items-center rounded-sm border px-2 py-1 text-xs font-semibold ${statusBadgeClass(candidate.status)}`}>
          {candidate.status}
        </span>
      </td>

      {/* Reference Cost */}
      <td className="px-3 py-3 text-right tabular-nums text-slate-600">
        {candidate.referenceCost === null ? '—' : formatNumber(candidate.referenceCost, 4)}
      </td>

      {/* Current Cost */}
      <td className="px-3 py-3 text-right tabular-nums text-slate-900 font-medium">
        {candidate.currentCost === null ? '—' : formatNumber(candidate.currentCost, 4)}
      </td>

      {/* Gap */}
      <td className={`px-3 py-3 text-right tabular-nums font-semibold ${
        candidate.costGap === null ? 'text-slate-400' : candidate.costGap > 0 ? 'text-rose-700' : candidate.costGap < 0 ? 'text-emerald-700' : 'text-slate-500'
      }`}>
        {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}
      </td>

      {/* Controllable */}
      <td className="px-3 py-3 text-center">
        <label className="inline-flex min-h-9 items-center justify-center gap-2 rounded-sm px-2 cursor-pointer select-none hover:bg-slate-50">
          <input
            type="checkbox"
            checked={candidate.controllable}
            onChange={e => onToggleControllable(candidate.candidateKey, e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 accent-slate-900 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            aria-label={`Controllable flag for ${candidate.candidateName}`}
          />
          <span className="text-xs font-sans font-medium text-slate-700">
            {candidate.controllable ? 'Yes' : 'No'}
          </span>
        </label>
      </td>
    </tr>
  )
}
