import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel, isVisibleInComparisonView } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { getCanonicalComparisonStatus } from '../../core'
import type { ComparisonStatus } from '../../core'
import { PageHeading } from '../../shared'

type SubTab = 'bom' | 'processing'

export const CostBreakdownPage: React.FC = () => {
  const {
    snapshotComparison,
    fullSnapshotComparison,
    snapshotPair,
    analysisSnapshotPair,
    selectedComparisonSelection,
    isSelectedComparisonActive,
    applySelectedComparison,
    clearSelectedComparison,
    bom,
    routing
  } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)
  const [isSelectingScope, setIsSelectingScope] = useState(false)
  const [selectionDraft, setSelectionDraft] = useState({ bomFindingKeys: [] as string[], routingFindingKeys: [] as string[] })
  const isViewingSelectedScope = isSelectedComparisonActive && !isSelectingScope
  const viewComparison = isSelectingScope ? fullSnapshotComparison : snapshotComparison
  const viewPair = isSelectingScope ? snapshotPair : analysisSnapshotPair
  const allFindings = [
    ...viewComparison.bomFindings,
    ...viewComparison.routingFindings,
    ...(isViewingSelectedScope ? [] : viewComparison.workCenterFindings)
  ]
  const changedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'CHANGED').length
  const addedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'ADDED').length
  const removedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'REMOVED').length
  const unchangedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'UNCHANGED').length
  const visibleBOMCount = viewComparison.bomFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const visibleRoutingCount = viewComparison.routingFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const selectedCount = selectionDraft.bomFindingKeys.length + selectionDraft.routingFindingKeys.length
  const selectedBOMKeys = new Set(selectionDraft.bomFindingKeys)
  const selectedRoutingKeys = new Set(selectionDraft.routingFindingKeys)

  const beginScopeSelection = () => {
    setSelectionDraft(selectedComparisonSelection
      ? {
          bomFindingKeys: [...selectedComparisonSelection.bomFindingKeys],
          routingFindingKeys: [...selectedComparisonSelection.routingFindingKeys]
        }
      : { bomFindingKeys: [], routingFindingKeys: [] })
    clearSelectedComparison()
    setIsSelectingScope(true)
  }

  const toggleSelection = (section: 'bom' | 'routing', findingKey: string) => {
    setSelectionDraft(current => {
      const field = section === 'bom' ? 'bomFindingKeys' : 'routingFindingKeys'
      const currentKeys = current[field]
      const nextKeys = currentKeys.includes(findingKey)
        ? currentKeys.filter(key => key !== findingKey)
        : [...currentKeys, findingKey]
      return { ...current, [field]: nextKeys }
    })
  }

  const cancelScopeSelection = () => {
    setIsSelectingScope(false)
    clearSelectedComparison()
  }

  const applyScopeSelection = () => {
    applySelectedComparison(selectionDraft)
    setIsSelectingScope(false)
  }

  const toggleComparisonStatus = (status: ComparisonStatus) => {
    setComparisonView(current => current.includes(status)
      ? current.filter(selected => selected !== status)
      : [...current, status])
  }

  const openDetailSection = (section: SubTab) => {
    setSubTab(section)
    setIsDetailedExpanded(true)
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Cost Breakdown"
        description="Compare Reference and Current cost, then review the record-level changes that explain the gap."
      />

      <section className="flex flex-col gap-3 border border-slate-300 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Selected Comparison controls">
        <div>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-900">
            {isSelectingScope ? 'Choose Selected Comparison rows' : isSelectedComparisonActive ? 'Selected Comparison is active' : 'Full Comparison is active'}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            {isSelectingScope
              ? 'Select BOM and Routing findings below. A matched finding selects both sides; Added and Removed select their existing side. All WC rates stay in the calculation.'
              : isSelectedComparisonActive
                ? 'This temporary scope follows you to Candidate Selection and RCA & Simulation. Source data changes clear it.'
                : 'Full Comparison includes all findings. Selected Comparison is a temporary analysis scope for chosen BOM and Routing findings.'}
          </p>
        </div>
        {isSelectingScope ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-slate-600">{selectedCount} selected</span>
            <button type="button" onClick={cancelScopeSelection} className="min-h-9 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Cancel</button>
            <button type="button" onClick={applyScopeSelection} disabled={selectedCount === 0} className="min-h-9 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Apply Selected Comparison</button>
          </div>
        ) : isSelectedComparisonActive ? (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={beginScopeSelection} className="min-h-9 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Edit selection</button>
            <button type="button" onClick={clearSelectedComparison} className="min-h-9 border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Exit Selected Comparison</button>
          </div>
        ) : (
          <button type="button" onClick={beginScopeSelection} className="min-h-9 shrink-0 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Enter Selected Comparison</button>
        )}
      </section>

      {/* One canonical summary and cost element bridge */}
      <SnapshotComparisonCard comparison={viewComparison} selectedComparison={isViewingSelectedScope} />

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="comparison-view-title">
        <div>
          <h2 id="comparison-view-title" className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-900">Comparison view</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {isViewingSelectedScope
              ? 'Filter the selected BOM and Routing findings. Work Center rates stay as complete calculation context.'
              : 'Select any combination of statuses. Unmatched rows remain visible under All for review.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Comparison view">
          {([
            { status: 'CHANGED' as const, label: 'Changed', count: changedFindingsCount },
            { status: 'ADDED' as const, label: 'Added', count: addedFindingsCount },
            { status: 'REMOVED' as const, label: 'Removed', count: removedFindingsCount },
            { status: 'UNCHANGED' as const, label: 'Unchanged', count: unchangedFindingsCount }
          ]).map(option => (
            <button
              key={option.status}
              type="button"
              aria-pressed={comparisonView.includes(option.status)}
              onClick={() => toggleComparisonStatus(option.status)}
              className={`min-h-8 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${comparisonView.includes(option.status) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              {option.label} <span className={comparisonView.includes(option.status) ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={areAllComparisonStatusesSelected(comparisonView)}
            onClick={() => setComparisonView(ALL_COMPARISON_STATUSES)}
            className={`min-h-8 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${areAllComparisonStatusesSelected(comparisonView) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >
            All <span className={areAllComparisonStatusesSelected(comparisonView) ? 'text-slate-300' : 'text-slate-400'}>({allFindings.length})</span>
          </button>
        </div>
      </section>

      <VarianceTreeCard
        comparison={viewComparison}
        comparisonView={comparisonView}
        selectedComparison={isViewingSelectedScope}
        onOpenDetail={openDetailSection}
      />

      {/* Record-level detail */}
      <section id="itemized-cost-details" tabIndex={-1} className="scroll-mt-16 overflow-hidden rounded-md border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label="Itemized cost breakdown">
        {/* Section Accordion Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            aria-expanded={isDetailedExpanded}
            aria-controls="itemized-cost-details"
            className="flex min-h-8 items-center gap-2 text-left font-mono text-xs font-bold uppercase text-slate-900 hover:text-blue-800 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isDetailedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Itemized Cost Breakdown <span className="font-normal text-slate-500">· {getComparisonViewLabel(comparisonView)}</span></span>
          </button>

          {/* Sub-Tab Switcher */}
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Detailed cost section">
              <button
                type="button"
                aria-pressed={subTab === 'bom'}
                onClick={() => setSubTab('bom')}
                className={`min-h-9 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  subTab === 'bom'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                BOM ({isViewingSelectedScope ? visibleBOMCount : bom.length})
              </button>
              <button
                type="button"
                aria-pressed={subTab === 'processing'}
                onClick={() => setSubTab('processing')}
                className={`min-h-9 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  subTab === 'processing'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Processing ({visibleRoutingCount})
              </button>
            </div>
          </div>
        </div>

      {isDetailedExpanded && (
        <div>
          {subTab === 'bom' ? (
            <BOMDetailedTable
              findings={viewComparison.bomFindings}
              referenceItems={viewPair.reference.bom}
              currentItems={viewPair.current.bom}
              viewMode={comparisonView}
              selectionMode={isSelectingScope}
              selectedFindingKeys={selectedBOMKeys}
              onToggleFinding={key => toggleSelection('bom', key)}
            />
          ) : (
            <WorkCenterProcessingTable
              referenceRouting={viewPair.reference.routing}
              currentRouting={viewPair.current.routing}
              referenceRates={viewPair.reference.rates}
              currentRates={viewPair.current.rates}
              routingFindings={viewComparison.routingFindings}
              processingFindings={viewComparison.processingFindings}
              viewMode={comparisonView}
              selectionMode={isSelectingScope}
              selectedFindingKeys={selectedRoutingKeys}
              onToggleFinding={key => toggleSelection('routing', key)}
            />
          )}
        </div>
      )}
      </section>
    </div>
  )
}
