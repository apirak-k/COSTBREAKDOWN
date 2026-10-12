import React, { useState } from 'react'
import { useAppStore } from '../../state'

import { ItemizedComparisonTable } from './components/ItemizedComparisonTable'
import type { ItemizedTypeTab } from './components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { ALL_COMPARISON_STATUSES } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { PageHeading } from '../../shared'

export const CostBreakdownPage: React.FC = () => {
  const {
    snapshotComparison,
    fullSnapshotComparison,
    snapshotPair,
    analysisSnapshotPair,
    selectedComparisonSelection,
    isSelectedComparisonActive,
    applySelectedComparison,
    clearSelectedComparison
  } = useAppStore()
  const [typeTab, setTypeTab] = useState<ItemizedTypeTab>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)
  const [isSelectingScope, setIsSelectingScope] = useState(false)
  const [selectionDraft, setSelectionDraft] = useState({ bomFindingKeys: [] as string[], routingFindingKeys: [] as string[] })
  const isViewingSelectedScope = isSelectedComparisonActive && !isSelectingScope
  const viewComparison = isSelectingScope ? fullSnapshotComparison : snapshotComparison
  const viewPair = isSelectingScope ? snapshotPair : analysisSnapshotPair
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

  const openDetailSection = (section: 'bom' | 'rtg') => {
    setTypeTab(section)
    window.requestAnimationFrame(() => {
      const title = document.getElementById('itemized-comparison-title')
      title?.focus({ preventScroll: true })
      title?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="Cost Breakdown"
        description="Reference vs Current · Gap = Current − Reference."
      />

      <section className="flex flex-wrap items-center gap-2 border-b border-slate-300 pb-2" aria-label="Comparison scope">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scope</span>
        <span className="text-xs font-semibold text-slate-900">{isSelectingScope ? 'Choose BOM and RTG findings' : isSelectedComparisonActive ? 'Selected Comparison' : 'Full Comparison'}</span>
        {isSelectingScope && <span className="font-mono text-xs tabular-nums text-slate-600">{selectedCount} selected</span>}
        {isSelectingScope ? (
          <div className="ml-auto flex gap-1.5">
            <button type="button" onClick={cancelScopeSelection} className="min-h-8 border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Cancel</button>
            <button type="button" onClick={applyScopeSelection} disabled={selectedCount === 0} className="min-h-8 bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Apply</button>
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

      <WorkCenterProcessingTable findings={fullSnapshotComparison.processingFindings} />

      <ItemizedComparisonTable
        comparison={viewComparison}
        pair={viewPair}
        typeTab={typeTab}
        onTypeTabChange={setTypeTab}
        viewMode={comparisonView}
        onViewModeChange={setComparisonView}
        selectionMode={isSelectingScope}
        selectedBOMKeys={selectedBOMKeys}
        selectedRoutingKeys={selectedRoutingKeys}
        onToggleFinding={toggleSelection}
      />
    </div>
  )
}
