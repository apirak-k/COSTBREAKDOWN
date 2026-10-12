import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { CandidatesTable } from './components/CandidatesTable'
import { filterPrioritizationCandidates } from '../../core/calculations/candidate-prioritization'
import type { CandidateStatusFilter } from '../../core/calculations/candidate-prioritization'
import type { CandidateRcaDraft, PrioritizationStatus } from '../../core'
import { PageHeading, SelectedComparisonBanner } from '../../shared'
import { RcaAnalysisWorkspace } from '../rca/RcaCaseWorkspace'
import type { RcaSimulationHandoffContext } from '../../state/rca-cases'
import { CandidateQuickInfo } from './components/CandidateQuickInfo'
import { getCandidateViewKey, resolveCandidateParameterData } from './components/candidate-detail-data'

const ALL_CANDIDATE_STATUSES: PrioritizationStatus[] = ['CHANGED', 'ADDED', 'REMOVED']

interface CandidateSelectionPageProps {
  onProceedToSimulation: (context: RcaSimulationHandoffContext) => void
}

export const CandidateSelectionPage: React.FC<CandidateSelectionPageProps> = () => {
  const {
    candidates,
    currentRcaWorkspace,
    setCurrentRcaWorkspace,
    toggleCandidateControllable,
    snapshotComparison,
    analysisSnapshotPair,
    isSelectedComparisonActive,
    selectedComparisonSelection,
    clearSelectedComparison,
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>(ALL_CANDIDATE_STATUSES)
  const [selectedQuickViewKey, setSelectedQuickViewKey] = useState<string | null>(null)
  const [hoveredQuickViewKey, setHoveredQuickViewKey] = useState<string | null>(null)
  const [expandedCandidateKeys, setExpandedCandidateKeys] = useState<Set<string>>(() => new Set())
  const candidateKeys = useMemo(() => new Set(candidates.map(candidate => candidate.candidateKey)), [candidates])
  const selectedCandidateKeys = useMemo(
    () => new Set(currentRcaWorkspace.candidateKeys.filter(key => candidateKeys.has(key))),
    [candidateKeys, currentRcaWorkspace.candidateKeys]
  )

  useEffect(() => {
    if (selectedCandidateKeys.size === currentRcaWorkspace.candidateKeys.length) return
    setCurrentRcaWorkspace({ ...currentRcaWorkspace, candidateKeys: [...selectedCandidateKeys] })
  }, [currentRcaWorkspace, selectedCandidateKeys, setCurrentRcaWorkspace])

  useEffect(() => {
    const eligibleViewKeys = new Set(candidates.map(getCandidateViewKey))
    setSelectedQuickViewKey(current => current && !eligibleViewKeys.has(current) ? null : current)
    setHoveredQuickViewKey(current => current && !eligibleViewKeys.has(current) ? null : current)
    setExpandedCandidateKeys(current => {
      const next = new Set([...current].filter(key => eligibleViewKeys.has(key)))
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
  const activeQuickViewKey = hoveredQuickViewKey ?? selectedQuickViewKey
  const activeQuickCandidate = candidates.find(candidate => getCandidateViewKey(candidate) === activeQuickViewKey) ?? null
  const activeQuickParameters = activeQuickCandidate
    ? resolveCandidateParameterData(activeQuickCandidate, snapshotComparison, analysisSnapshotPair)
    : null

  const changedCount = useMemo(() => candidates.filter(candidate => candidate.status === 'CHANGED').length, [candidates])
  const addedCount = useMemo(() => candidates.filter(candidate => candidate.status === 'ADDED').length, [candidates])
  const removedCount = useMemo(() => candidates.filter(candidate => candidate.status === 'REMOVED').length, [candidates])

  const totalGap = snapshotComparison.totalGap
  const allStatusesSelected = ALL_CANDIDATE_STATUSES.every(status => statusFilter.includes(status))
  const statusOptions = [
    { status: 'CHANGED' as const, label: 'Changed', count: changedCount },
    { status: 'ADDED' as const, label: 'Added', count: addedCount },
    { status: 'REMOVED' as const, label: 'Removed', count: removedCount }
  ]

  const selectedCandidates = useMemo(
    () => candidates.filter(candidate => selectedCandidateKeys.has(candidate.candidateKey)),
    [candidates, selectedCandidateKeys]
  )

  const toggleRcaSelection = (candidateKey: string, selected: boolean) => {
    const next = new Set(selectedCandidateKeys)
    if (selected) next.add(candidateKey)
    else next.delete(candidateKey)
    setCurrentRcaWorkspace({ ...currentRcaWorkspace, candidateKeys: [...next] })
  }

  const toggleQuickViewSelection = (quickViewKey: string) => {
    setSelectedQuickViewKey(current => current === quickViewKey ? null : quickViewKey)
  }

  const toggleExpandedCandidate = (quickViewKey: string) => {
    setExpandedCandidateKeys(current => {
      const next = new Set(current)
      if (next.has(quickViewKey)) next.delete(quickViewKey)
      else next.add(quickViewKey)
      return next
    })
  }

  const updateRcaDraft = (draft: CandidateRcaDraft) => {
    setCurrentRcaWorkspace({ ...currentRcaWorkspace, ...draft })
  }

  return (
    <div className="w-full space-y-4">
      <PageHeading
        title="Candidate / RCA"
        description="Review findings, choose a Candidate group, and record its Root Cause / Why? and Action."
        actions={(
          <dl className="flex items-baseline gap-2 border-l-2 border-slate-900 py-0.5 pl-3">
            <dt className="font-sans text-[11px] font-semibold text-slate-600">{isSelectedComparisonActive ? 'Selected Gap' : 'Comparison Gap'}</dt>
            <dd className={`font-mono text-lg font-semibold tabular-nums ${
              totalGap === null ? 'text-slate-500' : totalGap > 0 ? 'text-rose-700' : totalGap < 0 ? 'text-emerald-700' : 'text-slate-700'
            }`}>
              {totalGap === null ? '—' : formatVariance(totalGap, 4)}
            </dd>
            <span className="text-[11px] text-slate-500">THB/pc</span>
          </dl>
        )}
      />

      {isSelectedComparisonActive && selectedComparisonSelection && (
        <SelectedComparisonBanner selection={selectedComparisonSelection} onExit={clearSelectedComparison} />
      )}

      <CandidateQuickInfo candidate={activeQuickCandidate} parameters={activeQuickParameters} />

      <section className="space-y-3" aria-labelledby="candidate-selection-title">
        <h2 id="candidate-selection-title" className="font-sans text-sm font-semibold text-slate-950">Candidate Selection</h2>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 pb-2" role="group" aria-label="Filter candidates by status">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
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

        <CandidatesTable
          candidates={visibleCandidates}
          selectedCandidateKeys={selectedCandidateKeys}
          quickViewSelectedKey={selectedQuickViewKey}
          expandedCandidateKeys={expandedCandidateKeys}
          comparison={snapshotComparison}
          snapshotPair={analysisSnapshotPair}
          onToggleControllable={toggleCandidateControllable}
          onToggleRcaSelection={toggleRcaSelection}
          onHoverQuickView={setHoveredQuickViewKey}
          onToggleQuickView={toggleQuickViewSelection}
          onToggleExpanded={toggleExpandedCandidate}
          showVisibleGap={!allStatusesSelected}
        />

        <p className="border-b border-slate-300 px-3 py-2 text-right text-xs text-slate-700" aria-live="polite">
          <span className="font-mono font-semibold tabular-nums">{selectedCandidateKeys.size}</span> selected for RCA analysis
        </p>
      </section>

      <RcaAnalysisWorkspace
        candidates={selectedCandidates}
        draft={currentRcaWorkspace}
        onDraftChange={updateRcaDraft}
      />
    </div>
  )
}
