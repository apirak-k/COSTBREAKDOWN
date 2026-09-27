import React from 'react'
import { PrioritizationCandidate, formatCurrency } from '../../../core'
import { CandidateRow } from './CandidateRow'

interface CandidatesTableProps {
  candidates: PrioritizationCandidate[]
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
}

export const CandidatesTable: React.FC<CandidatesTableProps> = ({
  candidates,
  onToggleControllable
}) => {
  const totalGap = candidates.length > 0 && candidates.every(candidate => candidate.costGap !== null)
    ? candidates.reduce<number>((sum, candidate) => sum + (candidate.costGap as number), 0)
    : null

  return (
    <div className="bg-white rounded border border-slate-300/80 shadow-2xs overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs text-left">
          <caption className="sr-only">Prioritized Cost Driver Candidates ranked by Cost Gap</caption>
          <thead>
            <tr className="bg-slate-900 text-white font-semibold text-[11px]">
              <th scope="col" className="p-2.5 text-center w-12">Rank</th>
              <th scope="col" className="p-2.5">Candidate / Finding</th>
              <th scope="col" className="p-2.5 text-center w-28">Status</th>
              <th scope="col" className="p-2.5 text-right w-28">Reference</th>
              <th scope="col" className="p-2.5 text-right w-28">Current</th>
              <th scope="col" className="p-2.5 text-right w-28">Gap (THB)</th>
              <th scope="col" className="p-2.5 text-center w-28">Controllable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-sans italic">
                  No candidates available in this view.
                </td>
              </tr>
            ) : (
              candidates.map(candidate => (
                <CandidateRow
                  key={candidate.candidateKey}
                  candidate={candidate}
                  onToggleControllable={onToggleControllable}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-xs font-mono">
        <span className="text-slate-500 text-[11px]">
          Total Candidates ({candidates.length})
        </span>

        <div className="text-right flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-sans">Net Candidate Gap:</span>
          <span className={`text-xs font-bold tabular-nums ${totalGap === null ? 'text-slate-400' : totalGap >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {totalGap === null ? '—' : formatCurrency(totalGap, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>
  )
}
