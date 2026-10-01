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

  const totalGap = snapshotComparison.totalGap
  const allStatusesSelected = ALL_CANDIDATE_STATUSES.every(status => statusFilter.includes(status))
  const statusOptions = [
    { status: 'CHANGED' as const, label: 'Changed', count: changedCount },
    { status: 'ADDED' as const, label: 'Added', count: addedCount },
    { status: 'REMOVED' as const, label: 'Removed', count: removedCount }
  ]

  return (
    <div className="space-y-6">
      <PageHeading
        title="Candidate Prioritization"
        description="Review cost findings in gap order, then mark whether each is within your control. Rankings guide review; they do not select work automatically."
        actions={(
          <dl className="border-l-2 border-amber-700 py-1 pl-3 sm:min-w-48">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Full comparison gap</dt>
            <dd className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
              totalGap === null ? 'text-slate-500' : totalGap > 0 ? 'text-rose-700' : totalGap < 0 ? 'text-emerald-700' : 'text-slate-700'
            }`}>
              {totalGap === null ? '—' : <>{formatVariance(totalGap, 4)} <span className="text-xs font-medium text-slate-600">THB/pc</span></>}
            </dd>
            <dd className="mt-0.5 text-xs text-slate-500">Reference vs Current · all cost elements</dd>
          </dl>
        )}
      />

      <section className="space-y-3 border-y border-slate-300 py-3" aria-labelledby="candidate-filter-title">
        <div>
          <h2 id="candidate-filter-title" className="text-sm font-semibold text-slate-950">Comparison status</h2>
          <p className="mt-0.5 text-xs text-slate-600">Select any combination. The list keeps its highest-to-lowest gap order.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter candidates by status">
          <button
            type="button"
            aria-pressed={allStatusesSelected}
            onClick={() => setStatusFilter(ALL_CANDIDATE_STATUSES)}
            className={`min-h-10 border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              allStatusesSelected
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100'
            }`}
          >
            All <span className={`ml-1 font-mono tabular-nums ${allStatusesSelected ? 'text-slate-300' : 'text-slate-500'}`}>({candidates.length})</span>
          </button>
          {statusOptions.map(option => (
            <button
              key={option.status}
              type="button"
              aria-pressed={statusFilter.includes(option.status)}
              onClick={() => toggleCandidateStatus(option.status)}
              className={`min-h-10 border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                statusFilter.includes(option.status)
                  ? 'border-slate-500 bg-slate-200 text-slate-950'
                  : 'border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option.label} <span className="ml-1 font-mono tabular-nums text-slate-500">({option.count})</span>
            </button>
          ))}
        </div>
      </section>

      <CandidatesTable
        candidates={visibleCandidates}
        onToggleControllable={toggleCandidateControllable}
      />
    </div>
  )
}
