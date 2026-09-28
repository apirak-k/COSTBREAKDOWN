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
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Prioritized candidate findings">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="sr-only">Prioritized Cost Driver Candidates ranked by Cost Gap</caption>
          <thead>
            <tr className="bg-slate-800 text-left text-xs font-semibold text-white">
              <th scope="col" className="w-12 px-3 py-3 text-center">Rank</th>
              <th scope="col" className="px-3 py-3">Candidate / Finding</th>
              <th scope="col" className="w-28 px-3 py-3 text-center">Status</th>
              <th scope="col" className="w-28 px-3 py-3 text-right">Reference</th>
              <th scope="col" className="w-28 px-3 py-3 text-right">Current</th>
              <th scope="col" className="w-28 px-3 py-3 text-right">Gap (THB)</th>
              <th scope="col" className="w-32 px-3 py-3 text-center">Controllable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
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
      <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">
          Total Candidates ({candidates.length})
        </span>

        <div className="flex items-center gap-2 sm:justify-end">
          <span className="text-slate-600">Net candidate gap:</span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${totalGap === null ? 'text-slate-500' : totalGap >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {totalGap === null ? '—' : formatCurrency(totalGap, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </section>
  )
}
