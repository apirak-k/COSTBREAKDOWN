import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel, isVisibleInComparisonView } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { formatVariance, getCanonicalComparisonStatus } from '../../core'
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
    bom
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
    <div className="space-y-4">
      <PageHeading
        title="Cost Breakdown"
        description="Reference vs Current · Gap = Current − Reference."
        actions={(
          <dl className="flex items-baseline gap-2 border-l-2 border-slate-900 py-0.5 pl-3">
            <dt className="text-[11px] font-semibold text-slate-600">Total Gap</dt>
            <dd className={`font-mono text-lg font-semibold tabular-nums ${viewComparison.totalGap === null ? 'text-slate-500' : viewComparison.totalGap > 0 ? 'text-rose-700' : viewComparison.totalGap < 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
              {viewComparison.totalGap === null ? '—' : formatVariance(viewComparison.totalGap, 4)}
            </dd>
            <span className="text-[11px] text-slate-500">THB/pc</span>
          </dl>
        )}
      />

      <section className="flex flex-wrap items-center gap-2 border-b border-slate-300 pb-2" aria-label="Comparison scope">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scope</span>
        <span className="text-xs font-semibold text-slate-900">{isSelectingScope ? 'Choose BOM and Routing findings' : isSelectedComparisonActive ? 'Selected Comparison' : 'Full Comparison'}</span>
        {isSelectingScope && <span className="font-mono text-xs tabular-nums text-slate-600">{selectedCount} selected</span>}
        {isSelectingScope ? (
          <div className="ml-auto flex gap-1.5">
            <button type="button" onClick={cancelScopeSelection} className="min-h-8 border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Cancel</button>
            <button type="button" onClick={applyScopeSelection} disabled={selectedCount === 0} className="min-h-8 bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Apply</button>
          </div>
        ) : isSelectedComparisonActive ? (
          <div className="ml-auto flex gap-1.5">
            <button type="button" onClick={beginScopeSelection} className="min-h-8 border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Edit scope</button>
            <button type="button" onClick={clearSelectedComparison} className="min-h-8 border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Full Comparison</button>
          </div>
        ) : (
          <button type="button" onClick={beginScopeSelection} className="ml-auto min-h-8 border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Select scope</button>
        )}
      </section>

      <SnapshotComparisonCard
        comparison={viewComparison}
        selectedComparison={isViewingSelectedScope}
        comparisonView={comparisonView}
        onOpenDetail={openDetailSection}
      />

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 pb-2 text-xs" role="group" aria-label="Filter comparison by status">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
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
              className={`min-h-8 rounded-sm border px-2.5 py-1 font-sans text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${comparisonView.includes(option.status) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              {option.label} <span className={comparisonView.includes(option.status) ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={areAllComparisonStatusesSelected(comparisonView)}
            onClick={() => setComparisonView(ALL_COMPARISON_STATUSES)}
            className={`min-h-8 rounded-sm border px-2.5 py-1 font-sans text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${areAllComparisonStatusesSelected(comparisonView) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >
            All <span className={areAllComparisonStatusesSelected(comparisonView) ? 'text-slate-300' : 'text-slate-400'}>({allFindings.length})</span>
          </button>
      </div>

      {/* Record-level detail */}
      <section id="itemized-cost-details" tabIndex={-1} className="scroll-mt-16 overflow-hidden rounded-md border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label="Itemized cost breakdown">
        {/* Section Accordion Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            aria-expanded={isDetailedExpanded}
            aria-controls="itemized-cost-details"
            className="flex min-h-8 items-center gap-2 text-left font-sans text-sm font-semibold text-slate-900 hover:text-blue-800 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
