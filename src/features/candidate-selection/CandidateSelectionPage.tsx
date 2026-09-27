import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { CandidatesTable } from './components/CandidatesTable'
import { CandidateStatusFilter, filterPrioritizationCandidates } from '../../core/calculations/candidate-prioritization'

export const CandidateSelectionPage: React.FC = () => {
  const {
    candidates,
    toggleCandidateControllable,
    snapshotComparison,
    masterDataHandoff
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>('all')

  const visibleCandidates = useMemo(
    () => filterPrioritizationCandidates(candidates, statusFilter),
    [candidates, statusFilter]
  )

  const changedCount = useMemo(() => candidates.filter(c => c.status === 'CHANGED').length, [candidates])
  const addedCount = useMemo(() => candidates.filter(c => c.status === 'ADDED').length, [candidates])
  const removedCount = useMemo(() => candidates.filter(c => c.status === 'REMOVED').length, [candidates])

  const totalGap = masterDataHandoff.canCompare
    ? snapshotComparison.totalGap ?? candidates.reduce((sum, c) => sum + c.costGap, 0)
    : null

  return (
    <div className="space-y-4">
      {!masterDataHandoff.canCompare && (
        <div className="border border-amber-200 bg-amber-50/70 px-4 py-3 text-[11px] text-amber-900 font-sans" role="status">
          <strong className="font-mono">Candidate values are unavailable yet.</strong>{' '}
          Prepare both Reference and Current datasets in Master Data.
          {masterDataHandoff.issues.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {masterDataHandoff.issues.map(issue => <li key={issue}>{issue}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white px-4 py-3 rounded border border-slate-300/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Candidate Prioritization
          </h1>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
            Cost-change findings derived from Comparison, ranked by Cost Gap with Controllability assessment
          </p>
        </div>
        <div className="text-right font-mono flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Net Comparison Gap (Δ):</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono tabular-nums bg-slate-100 border border-slate-200 ${
            totalGap === null ? 'text-slate-400' : totalGap > 0 ? 'text-rose-700' : totalGap < 0 ? 'text-emerald-700' : 'text-slate-600'
          }`}>
            {totalGap === null ? '—' : `${formatVariance(totalGap, 4)} THB/pc`}
          </span>
        </div>

        {/* Filter Toolbar: Status filtering only per Section 10 */}
        <div className="w-full border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]" role="group" aria-label="Status filter">
            {([
              { filter: 'all' as const, label: 'All', count: candidates.length },
              { filter: 'CHANGED' as const, label: 'Changed', count: changedCount },
              { filter: 'ADDED' as const, label: 'Added', count: addedCount },
              { filter: 'REMOVED' as const, label: 'Removed', count: removedCount }
            ]).map(option => (
              <button
                key={option.filter}
                type="button"
                aria-pressed={statusFilter === option.filter}
                onClick={() => setStatusFilter(option.filter)}
                className={`px-2.5 py-1.5 border transition-colors cursor-pointer ${
                  statusFilter === option.filter
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {option.label} <span className={statusFilter === option.filter ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
              </button>
            ))}
          </div>

          <span role="status" className="text-[11px] text-slate-500 font-sans">
            Showing {visibleCandidates.length} of {candidates.length} candidates (sorted by Gap descending)
          </span>
        </div>
      </div>

      {/* Candidates Table */}
      <CandidatesTable
        candidates={visibleCandidates}
        onToggleControllable={toggleCandidateControllable}
      />
    </div>
  )
}
