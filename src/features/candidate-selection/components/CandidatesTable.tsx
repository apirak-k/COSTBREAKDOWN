import React from 'react'
import { PrioritizationCandidate, formatCurrency } from '../../../core'
import type { CostComparison, SnapshotPair } from '../../../core'
import { CandidateRow } from './CandidateRow'
import { getCandidateViewKey, resolveCandidateParameterData } from './candidate-detail-data'

interface CandidatesTableProps {
  candidates: PrioritizationCandidate[]
  selectedCandidateKeys: ReadonlySet<string>
  quickViewSelectedKey: string | null
  expandedCandidateKeys: ReadonlySet<string>
  comparison: CostComparison
  snapshotPair: SnapshotPair
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
  onToggleRcaSelection: (candidateKey: string, nextValue: boolean) => void
  onHoverQuickView: (quickViewKey: string | null) => void
  onToggleQuickView: (quickViewKey: string) => void
  onToggleExpanded: (quickViewKey: string) => void
  showVisibleGap: boolean
}

export const CandidatesTable: React.FC<CandidatesTableProps> = ({
  candidates,
  selectedCandidateKeys,
  quickViewSelectedKey,
  expandedCandidateKeys,
  comparison,
  snapshotPair,
  onToggleControllable,
  onToggleRcaSelection,
  onHoverQuickView,
  onToggleQuickView,
  onToggleExpanded,
  showVisibleGap
}) => {
  const totalGap = candidates.length > 0 && candidates.every(candidate => candidate.costGap !== null)
    ? candidates.reduce<number>((sum, candidate) => sum + (candidate.costGap as number), 0)
    : null

  return (
    <section aria-labelledby="candidate-table-title">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="candidate-table-title" className="font-sans text-sm font-semibold text-slate-950">Candidates · Gap descending</h2>
        </div>
        <p className="text-xs text-slate-500 sm:hidden">Scroll horizontally to view all columns.</p>
      </div>

      <div
        className="overflow-x-auto border-y border-slate-300 bg-white"
        role="region"
        aria-label="Candidate findings table"
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] border-collapse text-left text-xs">
          <caption className="sr-only">Candidate findings ordered by descending Cost Gap, with current Candidate group selection and a human-set controllability flag.</caption>
          <thead>
            <tr className="bg-slate-900 font-semibold text-white">
              <th scope="col" className="w-12 px-3 py-2 text-center">Select</th>
              <th scope="col" className="min-w-72 px-4 py-2">Candidate / finding</th>
              <th scope="col" className="w-28 px-3 py-2 text-center">Status</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Reference (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Current (THB/pc)</th>
              <th scope="col" className="w-36 px-3 py-2 text-right">Cost Gap (THB/pc)</th>
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
              candidates.map(candidate => {
                const quickViewKey = getCandidateViewKey(candidate)
                return (
                  <CandidateRow
                    key={quickViewKey}
                    candidate={candidate}
                    quickViewKey={quickViewKey}
                    parameters={resolveCandidateParameterData(candidate, comparison, snapshotPair)}
                    selectedForRca={selectedCandidateKeys.has(candidate.candidateKey)}
                    quickViewSelected={quickViewSelectedKey === quickViewKey}
                    expanded={expandedCandidateKeys.has(quickViewKey)}
                    onToggleControllable={onToggleControllable}
                    onToggleRcaSelection={onToggleRcaSelection}
                    onHoverQuickView={onHoverQuickView}
                    onToggleQuickView={onToggleQuickView}
                    onToggleExpanded={onToggleExpanded}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showVisibleGap && (
        <div className="flex justify-end border-b border-slate-300 bg-slate-100 px-3 py-2">
          <dl className="text-right">
            <dt className="font-sans text-[11px] font-medium text-slate-700">Visible candidate gap</dt>
            <dd className={`mt-0.5 font-mono text-xs font-semibold tabular-nums ${totalGap === null ? 'text-slate-500' : totalGap >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {totalGap === null ? '—' : formatCurrency(totalGap, 4, 'THB/pc')}
            </dd>
            <dd className="mt-0.5 text-[11px] text-slate-500">Subtotal · selected status rows</dd>
          </dl>
        </div>
      )}
    </section>
  )
}
