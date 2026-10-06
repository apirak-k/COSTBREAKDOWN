import React from 'react'
import { PrioritizationCandidate, formatCurrency } from '../../../core'
import { CandidateRow } from './CandidateRow'

interface CandidatesTableProps {
  candidates: PrioritizationCandidate[]
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
  showVisibleGap: boolean
}

export const CandidatesTable: React.FC<CandidatesTableProps> = ({
  candidates,
  onToggleControllable,
  showVisibleGap
}) => {
  const totalGap = candidates.length > 0 && candidates.every(candidate => candidate.costGap !== null)
    ? candidates.reduce<number>((sum, candidate) => sum + (candidate.costGap as number), 0)
    : null

  return (
    <section aria-labelledby="candidate-table-title">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="candidate-table-title" className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-950">Ranked findings</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Review the numbers and change details before prioritizing work.</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Material Gap is the calculated cost difference for the whole BOM record; changed inputs are shown as value details.</p>
        </div>
        <p className="text-xs text-slate-500 sm:hidden">Scroll horizontally to view all columns.</p>
      </div>

      <div
        className="overflow-x-auto border-y border-slate-300 bg-white"
        role="region"
        aria-label="Ranked candidate findings table"
        tabIndex={0}
      >
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <caption className="sr-only">Candidate findings ranked from highest to lowest cost gap, with Reference and Current costs and a human-set controllability flag.</caption>
          <thead>
            <tr className="bg-slate-900 text-[10px] font-semibold text-white">
              <th scope="col" className="w-14 px-3 py-2 text-center">Rank</th>
              <th scope="col" className="min-w-72 px-4 py-2">Candidate / finding</th>
              <th scope="col" className="w-28 px-3 py-2 text-center">Status</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Reference (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Current (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Gap (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-2 text-center">Controllable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-600">
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

      {showVisibleGap && (
        <div className="flex justify-end border-b border-slate-300 bg-slate-100 px-3 py-2">
          <dl className="text-right">
            <dt className="font-mono text-[10px] font-semibold uppercase text-slate-700">Visible candidate gap</dt>
            <dd className={`mt-0.5 font-mono text-xs font-semibold tabular-nums ${totalGap === null ? 'text-slate-500' : totalGap >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {totalGap === null ? '—' : formatCurrency(totalGap, 4, 'THB/pc')}
            </dd>
            <dd className="mt-0.5 text-[10px] text-slate-500">Subtotal · selected status rows</dd>
          </dl>
        </div>
      )}
    </section>
  )
}
