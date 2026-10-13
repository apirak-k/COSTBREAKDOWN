import React, { useState } from 'react'
import { useAppStore } from '../../state'

import { ItemizedComparisonTable } from './components/ItemizedComparisonTable'
import type { ItemizedTypeTab } from './components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { PageHeading } from '../../shared'
import { formatVariance } from '../../core'
import type { ComparisonStatus } from '../../core'

const statusOptions: Array<{ value: ComparisonStatus; label: string }> = [
  { value: 'CHANGED', label: 'Changed' },
  { value: 'ADDED', label: 'Added' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'UNCHANGED', label: 'Unchanged' }
]

export const CostBreakdownPage: React.FC = () => {
  const {
    snapshotComparison,
    fullSnapshotComparison,
    snapshotPair,
    selectedComparisonSelection,
    isSelectedComparisonActive,
    applySelectedComparison,
    clearSelectedComparison
  } = useAppStore()
  const [typeTab, setTypeTab] = useState<ItemizedTypeTab>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)

  const selectedBOMKeys = new Set(selectedComparisonSelection?.bomFindingKeys ?? [])
  const selectedRoutingKeys = new Set(selectedComparisonSelection?.routingFindingKeys ?? [])
  const selectedCount = selectedBOMKeys.size + selectedRoutingKeys.size
  const gapSegments = [
    { key: 'material', label: 'Material', full: fullSnapshotComparison.elementGaps.material, selected: snapshotComparison.elementGaps.material, color: 'bg-sky-700', fill: 'bg-sky-900' },
    { key: 'labor', label: 'Labor', full: fullSnapshotComparison.elementGaps.labor, selected: snapshotComparison.elementGaps.labor, color: 'bg-amber-600', fill: 'bg-amber-800' },
    { key: 'burden', label: 'Burden', full: fullSnapshotComparison.elementGaps.burden, selected: snapshotComparison.elementGaps.burden, color: 'bg-violet-700', fill: 'bg-violet-900' }
  ]

  const toggleFinding = (type: 'bom' | 'routing', findingKey: string) => {
    const selection = selectedComparisonSelection ?? { bomFindingKeys: [], routingFindingKeys: [] }
    const field = type === 'bom' ? 'bomFindingKeys' : 'routingFindingKeys'
    const currentKeys = selection[field]
    const nextKeys = currentKeys.includes(findingKey)
      ? currentKeys.filter(key => key !== findingKey)
      : [...currentKeys, findingKey]
    const nextSelection = { ...selection, [field]: nextKeys }

    if (nextSelection.bomFindingKeys.length === 0 && nextSelection.routingFindingKeys.length === 0) {
      clearSelectedComparison()
    } else {
      applySelectedComparison(nextSelection)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 bg-slate-50 pb-2">
      <header aria-label="Cost Breakdown subheader" className="space-y-3 border-b border-slate-300 pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeading title="Cost Breakdown" description="Reference vs Current · Gap = Current − Reference." />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Candidate type filter">
              {(['all', 'bom', 'rtg'] as const).map(tab => (
                <button key={tab} type="button" aria-pressed={typeTab === tab} onClick={() => setTypeTab(tab)} className={`min-h-8 rounded-sm border px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${typeTab === tab ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <details aria-label="Status filter dropdown" className="relative">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Status <span className="max-w-36 truncate font-normal text-slate-600">{getComparisonViewLabel(comparisonView)}</span><span aria-hidden="true" className="text-[10px] text-slate-500">▾</span>
              </summary>
              <div className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-sm border border-slate-300 bg-white p-2 shadow-lg">
                <button type="button" aria-pressed={areAllComparisonStatusesSelected(comparisonView)} onClick={() => setComparisonView(ALL_COMPARISON_STATUSES)} className="mb-1 w-full rounded-sm px-2 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">All statuses</button>
                {statusOptions.map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={comparisonView.includes(option.value)} onChange={() => setComparisonView(current => current.includes(option.value) ? current.filter(status => status !== option.value) : [...current, option.value])} className="h-3.5 w-3.5 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" />
                  <span>{option.label}</span>
                </label>)}
              </div>
            </details>
            <span aria-live="polite" className="min-w-24 text-right text-xs font-medium text-slate-600">
              {isSelectedComparisonActive ? `${selectedCount} selected` : 'No Candidates selected'}
            </span>
          </div>
        </div>

        <section aria-label="Standard Cost Gap" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xs font-semibold text-slate-800">Standard Cost Gap</h2>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
              <span className="font-semibold text-slate-900">Full {fullSnapshotComparison.totalGap === null ? '—' : formatVariance(fullSnapshotComparison.totalGap, 4)}</span>
              {isSelectedComparisonActive && <span className="text-blue-900">Selected {snapshotComparison.totalGap === null ? '—' : formatVariance(snapshotComparison.totalGap, 4)}</span>}
              <span className="font-sans text-[10px] text-slate-500">THB/pc · Gap = CUR − REF</span>
            </div>
          </div>
          <div role="img" aria-label={`One segmented gap bar. Full Standard Cost Gap ${fullSnapshotComparison.totalGap === null ? 'unavailable' : formatVariance(fullSnapshotComparison.totalGap, 4)}${isSelectedComparisonActive ? `; selected scope ${snapshotComparison.totalGap === null ? 'unavailable' : formatVariance(snapshotComparison.totalGap, 4)}` : ''}`} className="grid grid-cols-3 overflow-hidden rounded-sm border border-slate-300 bg-white">
            {gapSegments.map((segment, index) => {
              const fullMagnitude = Math.abs(segment.full ?? 0)
              const selectedMagnitude = isSelectedComparisonActive ? Math.abs(segment.selected ?? 0) : 0
              const scale = Math.max(fullMagnitude, selectedMagnitude)
              const fullWidth = scale === 0 ? 0 : fullMagnitude / scale * 100
              const selectedWidth = scale === 0 ? 0 : selectedMagnitude / scale * 100
              return <div key={segment.key} aria-hidden="true" className={`relative h-3 bg-slate-100 ${index < gapSegments.length - 1 ? 'border-r border-white' : ''}`}>
                <div className={`${segment.color} absolute inset-y-0 left-0 opacity-35`} style={{ width: `${fullWidth}%` }} />
                {isSelectedComparisonActive && <div className={`${segment.fill} absolute inset-y-0 left-0`} style={{ width: `${selectedWidth}%` }} />}
              </div>
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            {gapSegments.map(segment => <div key={segment.key} className="min-w-0">
              <p className="font-sans font-semibold text-slate-700">{segment.label}</p>
              <p className="truncate font-mono tabular-nums">Full {segment.full === null ? '—' : formatVariance(segment.full, 4)}{isSelectedComparisonActive && ` · Selected ${segment.selected === null ? '—' : formatVariance(segment.selected, 4)}`}</p>
            </div>)}
          </div>
        </section>
      </header>

      <section aria-label="Full Standard Cost overview" className="space-y-3">
        <SnapshotComparisonCard comparison={fullSnapshotComparison} />
      </section>
      </div>

      <WorkCenterProcessingTable findings={fullSnapshotComparison.processingFindings} />

      <ItemizedComparisonTable
        comparison={fullSnapshotComparison}
        pair={snapshotPair}
        typeTab={typeTab}
        viewMode={comparisonView}
        selectedBOMKeys={selectedBOMKeys}
        selectedRoutingKeys={selectedRoutingKeys}
        onToggleFinding={toggleFinding}
      />
    </div>
  )
}
