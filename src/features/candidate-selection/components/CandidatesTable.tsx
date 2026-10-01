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
    <section aria-labelledby="candidate-table-title">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="candidate-table-title" className="text-sm font-semibold text-slate-950">Ranked findings</h2>
          <p className="mt-0.5 text-xs text-slate-600">Highest cost gap first. Review the numbers and change details before prioritizing work.</p>
        </div>
        <p className="text-xs text-slate-500 sm:hidden">Scroll horizontally to view all columns.</p>
      </div>

      <div
        className="overflow-x-auto border-y border-slate-300 bg-white"
        role="region"
        aria-label="Ranked candidate findings table"
        tabIndex={0}
      >
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <caption className="sr-only">Candidate findings ranked from highest to lowest cost gap, with Reference and Current costs and a human-set controllability flag.</caption>
          <thead>
            <tr className="bg-slate-900 text-xs font-semibold text-white">
              <th scope="col" className="w-14 px-3 py-3 text-center">Rank</th>
              <th scope="col" className="min-w-72 px-4 py-3">Candidate / finding</th>
              <th scope="col" className="w-28 px-3 py-3 text-center">Status</th>
              <th scope="col" className="w-36 px-3 py-3 text-right">Reference (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-3 text-right">Current (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-3 text-right">Gap (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-3 text-center">Controllable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                  No candidates in this view.
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

      <div className="flex justify-end border-b border-slate-300 bg-slate-100 px-4 py-3">
        <dl className="text-right">
          <dt className="text-xs font-medium text-slate-700">Visible candidate gap</dt>
          <dd className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${totalGap === null ? 'text-slate-500' : totalGap >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {totalGap === null ? '—' : formatCurrency(totalGap, 4, 'THB/pc')}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-500">Subtotal · selected status rows</dd>
        </dl>
      </div>
    </section>
  )
}
