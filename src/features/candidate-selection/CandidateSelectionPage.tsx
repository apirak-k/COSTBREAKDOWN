import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { CandidatesTable } from './components/CandidatesTable'
import { filterPrioritizationCandidates } from '../../core/calculations/candidate-prioritization'
import type { CandidateStatusFilter } from '../../core/calculations/candidate-prioritization'
import type { PrioritizationStatus } from '../../core'
import { PageHeading, SelectedComparisonBanner } from '../../shared'
import { RcaCaseWorkspace } from '../rca/RcaCaseWorkspace'
import type { RcaSimulationHandoffContext } from '../../state/rca-cases'

const ALL_CANDIDATE_STATUSES: PrioritizationStatus[] = ['CHANGED', 'ADDED', 'REMOVED']

interface CandidateSelectionPageProps {
  onProceedToSimulation: (context: RcaSimulationHandoffContext) => void
}

export const CandidateSelectionPage: React.FC<CandidateSelectionPageProps> = ({ onProceedToSimulation }) => {
  const {
    candidates,
    toggleCandidateControllable,
    rcaCases,
    activeRcaCaseId,
    createRcaCase,
    selectRcaCase,
    saveRcaCase,
    snapshotComparison,
    isSelectedComparisonActive,
    selectedComparisonSelection,
    clearSelectedComparison,
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>(ALL_CANDIDATE_STATUSES)
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<Set<string>>(() => new Set())
  const [showRcaCases, setShowRcaCases] = useState(Boolean(activeRcaCaseId))

  useEffect(() => {
    if (showRcaCases && isSelectedComparisonActive) clearSelectedComparison()
  }, [showRcaCases, isSelectedComparisonActive, clearSelectedComparison])

  useEffect(() => {
    const eligibleKeys = new Set(candidates.map(candidate => candidate.candidateKey))
    setSelectedCandidateKeys(current => {
      const next = new Set([...current].filter(key => eligibleKeys.has(key)))
      return next.size === current.size ? current : next
    })
  }, [candidates])

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

  const toggleRcaSelection = (candidateKey: string, selected: boolean) => {
    setSelectedCandidateKeys(current => {
      const next = new Set(current)
      if (selected) next.add(candidateKey)
      else next.delete(candidateKey)
      return next
    })
  }

  const startRcaCase = () => {
    if (selectedCandidateKeys.size === 0) return
    createRcaCase([...selectedCandidateKeys])
    setSelectedCandidateKeys(new Set())
    clearSelectedComparison()
    setShowRcaCases(true)
  }

  const openRcaCases = () => {
    clearSelectedComparison()
    setShowRcaCases(true)
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="Candidate Prioritization"
        description="Review cost findings in gap order, then mark whether each is within your control. Rankings guide review; they do not select work automatically."
        actions={(
          <dl className="border-l-2 border-slate-900 py-1 pl-3 sm:min-w-48">
            <dt className="font-sans text-[11px] font-semibold text-slate-600">{isSelectedComparisonActive ? 'Selected comparison gap' : 'Full comparison gap'}</dt>
            <dd className={`mt-1 font-mono text-base font-semibold tabular-nums ${
              totalGap === null ? 'text-slate-500' : totalGap > 0 ? 'text-rose-700' : totalGap < 0 ? 'text-emerald-700' : 'text-slate-700'
            }`}>
              {totalGap === null ? '—' : <>{formatVariance(totalGap, 4)} <span className="text-xs font-medium text-slate-600">THB/pc</span></>}
            </dd>
            <dd className="mt-0.5 text-xs text-slate-500">{isSelectedComparisonActive ? 'Selected BOM/Routing · all cost elements' : 'Reference vs Current · all cost elements'}</dd>
          </dl>
        )}
      />

      {isSelectedComparisonActive && selectedComparisonSelection && (
        <SelectedComparisonBanner selection={selectedComparisonSelection} onExit={clearSelectedComparison} />
      )}

      {showRcaCases ? (
        <RcaCaseWorkspace
          candidates={candidates}
          cases={rcaCases}
          activeCaseId={activeRcaCaseId}
          onSelectCase={selectRcaCase}
          onSave={saveRcaCase}
          onClose={() => setShowRcaCases(false)}
          onProceedToSimulation={onProceedToSimulation}
        />
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-white px-3 py-2.5">
            <p className="text-xs text-slate-700" aria-live="polite">
              {selectedCandidateKeys.size} {selectedCandidateKeys.size === 1 ? 'Candidate' : 'Candidates'} selected for RCA
            </p>
            <div className="flex flex-wrap gap-2">
              {rcaCases.length > 0 && (
                <button type="button" onClick={openRcaCases} className="min-h-9 border border-slate-400 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                  Open RCA Cases <span className="font-mono tabular-nums">({rcaCases.length})</span>
                </button>
              )}
              <button type="button" onClick={startRcaCase} disabled={selectedCandidateKeys.size === 0} className="min-h-9 border border-slate-900 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-default disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Create RCA Case
              </button>
            </div>
          </section>

      <section className="flex flex-col gap-2 border border-slate-300 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="candidate-filter-title">
        <div className="min-w-40">
          <h2 id="candidate-filter-title" className="font-sans text-sm font-semibold text-slate-950">Comparison status</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Highest cost gap first</p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter candidates by status">
          <button
            type="button"
            aria-pressed={allStatusesSelected}
            onClick={() => setStatusFilter(ALL_CANDIDATE_STATUSES)}
            className={`min-h-8 border px-2.5 py-1 font-sans text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
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
              className={`min-h-8 border px-2.5 py-1 font-sans text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
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
        selectedCandidateKeys={selectedCandidateKeys}
        onToggleControllable={toggleCandidateControllable}
        onToggleRcaSelection={toggleRcaSelection}
        showVisibleGap={!allStatusesSelected}
      />
        </>
      )}
    </div>
  )
}
