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

export const CandidateRow: React.FC<CandidateRowProps> = ({
  candidate,
  onToggleControllable
}) => {
  return (
    <tr className={`transition-colors text-xs font-mono ${!candidate.controllable ? 'bg-slate-50/70 text-slate-500' : 'hover:bg-slate-50/50'}`}>
      {/* Rank */}
      <td className="p-2.5 text-center w-12">
        <span className="w-5 h-5 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] tabular-nums shadow-2xs">
          {candidate.rank}
        </span>
      </td>

      {/* Candidate / Finding */}
      <td className="p-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 font-sans">
            {candidate.candidateName}
          </span>
          <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
            {candidate.category}
          </span>
          {candidate.factor && (
            <span className="text-[10px] text-slate-500 font-sans">
              · {candidate.factor}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="p-2.5 text-center">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeClass(candidate.status)}`}>
          {candidate.status}
        </span>
      </td>

      {/* Reference Cost */}
      <td className="p-2.5 text-right tabular-nums text-slate-600">
        {candidate.referenceCost === null ? '—' : formatNumber(candidate.referenceCost, 4)}
      </td>

      {/* Current Cost */}
      <td className="p-2.5 text-right tabular-nums text-slate-900 font-medium">
        {candidate.currentCost === null ? '—' : formatNumber(candidate.currentCost, 4)}
      </td>

      {/* Gap */}
      <td className={`p-2.5 text-right tabular-nums font-bold ${
        candidate.costGap > 0 ? 'text-rose-700' : candidate.costGap < 0 ? 'text-emerald-700' : 'text-slate-500'
      }`}>
        {formatVariance(candidate.costGap, 4)}
      </td>

      {/* Controllable */}
      <td className="p-2.5 text-center">
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={candidate.controllable}
            onChange={e => onToggleControllable(candidate.candidateKey, e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
            aria-label={`Controllable flag for ${candidate.candidateName}`}
          />
          <span className="text-[11px] font-sans font-medium text-slate-700">
            {candidate.controllable ? 'Yes' : 'No'}
          </span>
        </label>
      </td>
    </tr>
  )
}
