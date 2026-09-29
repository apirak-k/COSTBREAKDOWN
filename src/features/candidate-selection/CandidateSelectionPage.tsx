import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { CandidatesTable } from './components/CandidatesTable'
import { filterPrioritizationCandidates } from '../../core/calculations/candidate-prioritization'
import type { CandidateStatusFilter } from '../../core/calculations/candidate-prioritization'
import type { PrioritizationStatus } from '../../core'
import { PageHeading } from '../../shared'

const ALL_CANDIDATE_STATUSES: PrioritizationStatus[] = ['CHANGED', 'ADDED', 'REMOVED']

export const CandidateSelectionPage: React.FC = () => {
  const {
    candidates,
    toggleCandidateControllable,
    snapshotComparison,
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>(ALL_CANDIDATE_STATUSES)

  const toggleCandidateStatus = (status: PrioritizationStatus) => {
    setStatusFilter(current => current.includes(status)
      ? current.filter(selected => selected !== status)
      : [...current, status])
  }

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
              { status: 'CHANGED' as const, label: 'Changed', count: changedCount },
              { status: 'ADDED' as const, label: 'Added', count: addedCount },
              { status: 'REMOVED' as const, label: 'Removed', count: removedCount }
            ]).map(option => (
              <button
                key={option.status}
                type="button"
                aria-pressed={statusFilter.includes(option.status)}
                onClick={() => toggleCandidateStatus(option.status)}
                className={`min-h-9 rounded-sm border px-3 py-1.5 font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  statusFilter.includes(option.status)
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {option.label} <span className={statusFilter.includes(option.status) ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={ALL_CANDIDATE_STATUSES.every(status => statusFilter.includes(status))}
              onClick={() => setStatusFilter(ALL_CANDIDATE_STATUSES)}
              className={`min-h-9 rounded-sm border px-3 py-1.5 font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                ALL_CANDIDATE_STATUSES.every(status => statusFilter.includes(status))
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              All <span className={ALL_CANDIDATE_STATUSES.every(status => statusFilter.includes(status)) ? 'text-slate-300' : 'text-slate-400'}>({candidates.length})</span>
            </button>
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
