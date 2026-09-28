import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { CandidatesTable } from './components/CandidatesTable'
import { CandidateStatusFilter, filterPrioritizationCandidates } from '../../core/calculations/candidate-prioritization'
import { PageHeading } from '../../shared'

export const CandidateSelectionPage: React.FC = () => {
  const {
    candidates,
    toggleCandidateControllable,
    snapshotComparison,
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>('all')

  const visibleCandidates = useMemo(
    () => filterPrioritizationCandidates(candidates, statusFilter),
    [candidates, statusFilter]
  )

  const changedCount = useMemo(() => candidates.filter(c => c.status === 'CHANGED').length, [candidates])
  const addedCount = useMemo(() => candidates.filter(c => c.status === 'ADDED').length, [candidates])
  const removedCount = useMemo(() => candidates.filter(c => c.status === 'REMOVED').length, [candidates])

  const candidateGap = candidates.length > 0 && candidates.every(candidate => candidate.costGap !== null)
    ? candidates.reduce<number>((sum, candidate) => sum + (candidate.costGap as number), 0)
    : null
  const totalGap = snapshotComparison.totalGap ?? candidateGap

  return (
    <div className="space-y-5">
      <PageHeading
        title="Candidate Prioritization"
        description="Comparison findings ranked by cost gap, with a separate controllability assessment."
        actions={(
          <dl className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            <dt className="text-xs font-medium text-slate-600">Net comparison gap</dt>
            <dd className={`font-mono text-sm font-semibold tabular-nums ${
              totalGap === null ? 'text-slate-500' : totalGap > 0 ? 'text-rose-700' : totalGap < 0 ? 'text-emerald-700' : 'text-slate-700'
            }`}>
              {totalGap === null ? '—' : `${formatVariance(totalGap, 4)} THB/pc`}
            </dd>
          </dl>
        )}
      />

      <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-3" aria-labelledby="candidate-filter-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="candidate-filter-title" className="text-sm font-semibold text-slate-900">Findings</h2>
            <p className="mt-0.5 text-xs text-slate-600">Filter by comparison status. Candidates remain ranked by cost gap.</p>
          </div>
          <span role="status" className="text-xs text-slate-600">
            Showing <strong className="font-mono tabular-nums text-slate-900">{visibleCandidates.length}</strong> of{' '}
            <strong className="font-mono tabular-nums text-slate-900">{candidates.length}</strong> candidates
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Status filter">
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
                className={`min-h-9 rounded-sm border px-3 py-1.5 font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  statusFilter === option.filter
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {option.label} <span className={statusFilter === option.filter ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
              </button>
            ))}
          </div>
      </section>

      {/* Candidates Table */}
      <CandidatesTable
        candidates={visibleCandidates}
        onToggleControllable={toggleCandidateControllable}
      />
    </div>
  )
}
