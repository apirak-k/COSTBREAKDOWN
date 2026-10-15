import React, { useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../state'

import { ItemizedComparisonTable } from './components/ItemizedComparisonTable'
import type { ItemizedTypeTab } from './components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { CostBreakdownPopover } from './components/CostBreakdownPopover'
import { COST_ELEMENT_COLORS } from './components/cost-element-colors'
import {
  ALL_COMPARISON_STATUSES,
  areAllComparisonStatusesSelected,
  COMPARISON_SORT_OPTIONS,
  DEFAULT_COMPARISON_SORT_MODE,
  getComparisonStatusControlLabel,
  getComparisonSortLabel,
  getSelectedComparisonContribution,
  isOnlyComparisonStatus,
  isVisibleInComparisonView,
  toggleComparisonStatus
} from './components/comparison-view'
import type { ComparisonSortMode, ComparisonViewMode } from './components/comparison-view'
import { formatVariance, getVarianceClass } from '../../core'
import type { ComparisonStatus } from '../../core'

const statusOptions: Array<{ value: ComparisonStatus; label: string }> = [
  { value: 'CHANGED', label: 'Changed' },
  { value: 'ADDED', label: 'Added' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'UNCHANGED', label: 'Unchanged' }
]

interface GapSegment {
  key: 'material' | 'labor' | 'burden'
  label: 'Material' | 'Labor' | 'Burden'
  full: number | null
  selected: number | null
  color: string
}

function isAvailableGap(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

function selectedSegmentWidth(full: number | null, selected: number | null, width: number): number {
  if (!isAvailableGap(full) || !isAvailableGap(selected) || selected === 0 || full === 0 || width <= 0) return 0
  const ratio = Math.min(1, Math.abs(selected) / Math.abs(full))
  return Number.isFinite(ratio) ? Math.min(width, Math.max(1, width * ratio)) : 0
}

function getWaterfallSegments(values: number[]) {
  let total = 0
  return values.map(value => {
    const start = total
    total += value
    return { start, end: total }
  })
}

function hasSingleSign(values: number[]): boolean {
  return new Set(values.filter(value => value !== 0).map(value => Math.sign(value))).size <= 1
}

interface GapContributionChartProps {
  segments: GapSegment[]
  fullTotal: number | null
  selectedTotal: number | null
  selectedActive: boolean
}

export function GapContributionChart({ segments, fullTotal, selectedTotal, selectedActive }: GapContributionChartProps) {
  const width = 1000
  const chartId = useId().replace(/:/g, '')
  const fullValues = segments.map(segment => segment.full)
  const fullAvailable = fullValues.every(isAvailableGap)
  const fullNumbers = fullValues.filter(isAvailableGap)
  const proportional = fullAvailable && hasSingleSign(fullNumbers)
  const mode = !fullAvailable ? 'unavailable' : proportional ? 'proportional' : 'signed'
  const fullPath = fullAvailable ? getWaterfallSegments(fullNumbers) : []
  const chartPoints = [0, ...fullPath.flatMap(segment => [segment.start, segment.end])]
  const chartMin = Math.min(...chartPoints)
  const chartMax = Math.max(...chartPoints)
  const chartRange = chartMax - chartMin
  const chartPadding = chartRange > 0 ? chartRange * 0.04 : 1
  const domainMin = chartMin - chartPadding
  const domainMax = chartMax + chartPadding
  const scaleSignedValue = (value: number) => (value - domainMin) / (domainMax - domainMin) * width
  const zeroX = scaleSignedValue(0)
  const fullMagnitude = fullAvailable ? fullNumbers.reduce((total, value) => total + Math.abs(value), 0) : 0
  let proportionalCursor = 0
  const proportionalSegments = proportional
    ? segments.map(segment => {
      const segmentWidth = fullMagnitude > 0
        ? (isAvailableGap(segment.full) ? Math.abs(segment.full) / fullMagnitude * width : 0)
        : width / segments.length
      const result = { ...segment, x: proportionalCursor, width: segmentWidth }
      proportionalCursor += segmentWidth
      return result
    })
    : []
  const valueLabel = (value: number | null) => isAvailableGap(value) ? formatVariance(value, 2) : '—'
  const selectedText = (value: number | null) => `Selected (${valueLabel(value)})`
  const accessibleLabel = [
    `Full Standard Cost Gap ${valueLabel(fullTotal)}`,
    ...segments.map(segment => `Full ${segment.label} Gap ${valueLabel(segment.full)}`),
    selectedActive ? `Selected Standard Cost Gap ${valueLabel(selectedTotal)}` : '',
    ...(selectedActive ? segments.map(segment => `Selected ${segment.label} Gap ${valueLabel(segment.selected)}`) : [])
  ].filter(Boolean).join('; ')

  const selectedTreatment = (segment: GapSegment): 'normal' | 'highlight' | 'remove' => {
    if (!selectedActive || !isAvailableGap(segment.selected) || segment.selected === 0) return 'normal'
    return segment.selected > 0 ? 'highlight' : 'remove'
  }

  const renderSegment = (segment: GapSegment, index: number) => {
    const selectedState = selectedTreatment(segment)
    let x = 0
    let segmentWidth = 0
    if (mode === 'proportional') {
      const proportionalSegment = proportionalSegments[index]
      x = proportionalSegment.x
      segmentWidth = proportionalSegment.width
    } else if (mode === 'signed') {
      const pathSegment = fullPath[index]
      const startX = scaleSignedValue(pathSegment.start)
      const endX = scaleSignedValue(pathSegment.end)
      x = Math.min(startX, endX)
      segmentWidth = Math.abs(endX - startX)
      if (segmentWidth === 0 && selectedState !== 'normal') x = Math.max(0, Math.min(width - 4, endX - 2))
    } else {
      x = index * width / segments.length
      segmentWidth = width / segments.length
    }
    const selectedWidth = selectedSegmentWidth(segment.full, segment.selected, segmentWidth)
    const selectedX = segment.full !== null && segment.full < 0 ? x + segmentWidth - selectedWidth : x
    const tooltip = [`${segment.label} Gap ${valueLabel(segment.full)}`]
    if (selectedActive) tooltip.push(selectedText(segment.selected))

    return <g key={segment.key} data-gap-element={segment.key} data-selected-state={selectedState} data-segment-width={segmentWidth} data-selected-width={selectedWidth}>
      <title>{tooltip.join('\n')}</title>
      {mode === 'proportional' && segmentWidth > 0 && <rect data-full-gap-segment="true" x={x} y="7" width={segmentWidth} height="18" fill={segment.color} fillOpacity="0.64" />}
      {mode === 'signed' && segmentWidth > 0 && <rect data-full-gap-segment="true" x={x} y="7" width={segmentWidth} height="18" fill={segment.color} fillOpacity="0.64" />}
      {mode === 'unavailable' && segmentWidth > 0 && <rect data-full-gap-segment="true" x={x} y="7" width={segmentWidth} height="18" fill={segment.color} fillOpacity="0.42" />}
      {selectedState === 'highlight' && selectedWidth > 0 && <rect data-selected-overlay="highlight" x={selectedX} y="5" width={selectedWidth} height="22" fill={segment.color} fillOpacity="0.98" />}
      {selectedState === 'remove' && selectedWidth > 0 && <rect data-selected-overlay="remove" x={selectedX} y="5" width={selectedWidth} height="22" fill={`url(#${chartId}-remove-${segment.key})`} />}
    </g>
  }

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      data-gap-chart-mode={mode}
      data-selected-mode={selectedActive ? 'active' : 'inactive'}
      className="h-8 w-full overflow-hidden"
    >
      <svg aria-hidden="true" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" className="block h-full w-full">
        <defs>
          {segments.map(segment => <pattern key={segment.key} id={`${chartId}-remove-${segment.key}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={segment.color} fillOpacity="0.12" />
            <path d="M 0 0 V 8" stroke={segment.color} strokeWidth="3" strokeOpacity="0.85" />
          </pattern>)}
        </defs>
        {mode === 'signed' && <line x1={zeroX} y1="2" x2={zeroX} y2="30" stroke="#0f172a" strokeDasharray="2 2" />}
        {segments.map(renderSegment)}
        {mode === 'proportional' && proportionalSegments.slice(1).map(segment => <line key={`divider-${segment.key}`} x1={segment.x} y1="4" x2={segment.x} y2="28" stroke="white" strokeWidth="2" />)}
      </svg>
    </div>
  )
}

export const CostBreakdownPage: React.FC = () => {
  const {
    fullSnapshotComparison,
    snapshotComparison,
    snapshotPair,
    selectedComparisonSelection,
    isSelectedComparisonActive,
    applySelectedComparison,
    clearSelectedComparison
  } = useAppStore()
  const [typeTab, setTypeTab] = useState<ItemizedTypeTab>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)
  const [sortMode, setSortMode] = useState<ComparisonSortMode>(DEFAULT_COMPARISON_SORT_MODE)
  const [sortResetToken, setSortResetToken] = useState(0)
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true)

  const selectedBOMKeys = new Set(selectedComparisonSelection?.bomFindingKeys ?? [])
  const selectedRoutingKeys = new Set(selectedComparisonSelection?.routingFindingKeys ?? [])
  const selectedContribution = isSelectedComparisonActive && selectedComparisonSelection
    ? getSelectedComparisonContribution(fullSnapshotComparison, snapshotComparison, selectedComparisonSelection)
    : null
  const selectedDisplayComparison = selectedContribution
    ? { ...snapshotComparison, ...selectedContribution }
    : snapshotComparison
  const gapSegments: GapSegment[] = [
    { key: 'material', label: 'Material', full: fullSnapshotComparison.elementGaps.material, selected: selectedContribution?.elementGaps.material ?? null, color: COST_ELEMENT_COLORS.material },
    { key: 'labor', label: 'Labor', full: fullSnapshotComparison.elementGaps.labor, selected: selectedContribution?.elementGaps.labor ?? null, color: COST_ELEMENT_COLORS.labor },
    { key: 'burden', label: 'Burden', full: fullSnapshotComparison.elementGaps.burden, selected: selectedContribution?.elementGaps.burden ?? null, color: COST_ELEMENT_COLORS.burden }
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

  const statusControlLabel = getComparisonStatusControlLabel(comparisonView)
  const sortLabel = getComparisonSortLabel(sortMode)
  const bomCount = fullSnapshotComparison.bomFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const routingCount = fullSnapshotComparison.routingFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const typeCounts: Record<ItemizedTypeTab, number> = { bom: bomCount, rtg: routingCount, all: bomCount + routingCount }

  const setFindingSelection = (type: 'bom' | 'routing', nextKeys: ReadonlySet<string>) => {
    const current = selectedComparisonSelection ?? { bomFindingKeys: [], routingFindingKeys: [] }
    const nextSelection = type === 'bom'
      ? { ...current, bomFindingKeys: [...nextKeys] }
      : { ...current, routingFindingKeys: [...nextKeys] }
    if (nextSelection.bomFindingKeys.length === 0 && nextSelection.routingFindingKeys.length === 0) clearSelectedComparison()
    else applySelectedComparison(nextSelection)
  }

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-2">
      <header aria-label="Cost Breakdown subheader" className="shrink-0 overflow-x-auto border border-slate-300 bg-white" tabIndex={0}>
        <div className="flex min-w-[1000px] flex-nowrap items-center gap-1.5 px-1.5 py-1" role="group" aria-label="Cost Breakdown controls">
          <div
            aria-label={`Standard Cost Gap ${fullSnapshotComparison.totalGap === null ? 'unavailable' : formatVariance(fullSnapshotComparison.totalGap, 2)} THB/pc; Gap = CUR − REF`}
            title="Full snapshot · THB/pc · Gap = CUR − REF"
            className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xs"
          >
            <span className="font-semibold text-slate-800">Standard Cost Gap</span>
            <span className={`font-mono tabular-nums ${fullSnapshotComparison.totalGap === null ? 'text-slate-400' : getVarianceClass(fullSnapshotComparison.totalGap)}`}>
              {fullSnapshotComparison.totalGap === null ? '—' : formatVariance(fullSnapshotComparison.totalGap, 2)}
            </span>
          </div>

          <div role="group" aria-label="Cost element color legend" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[10px] font-medium text-slate-600">
            {[
              { label: 'MAT', color: COST_ELEMENT_COLORS.material },
              { label: 'LB', color: COST_ELEMENT_COLORS.labor },
              { label: 'BD', color: COST_ELEMENT_COLORS.burden }
            ].map(item => <span key={item.label} className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>)}
          </div>

          <div data-gap-chart-wrapper="true" className="min-w-[140px] flex-1">
            <GapContributionChart
              segments={gapSegments}
              fullTotal={fullSnapshotComparison.totalGap}
              selectedTotal={selectedContribution?.totalGap ?? null}
              selectedActive={isSelectedComparisonActive}
            />
          </div>

          <div className="inline-flex h-8 w-[264px] shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-white" role="group" aria-label="Finding type filter">
            {(['bom', 'rtg', 'all'] as const).map((tab, index) => (
              <button
                key={tab}
                type="button"
                aria-pressed={typeTab === tab}
                onClick={() => setTypeTab(tab)}
                className={`flex min-w-0 flex-1 basis-0 items-center justify-center gap-1 whitespace-nowrap px-1 text-xs font-semibold focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ${index > 0 ? 'border-l border-slate-300' : ''} ${typeTab === tab ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span>{tab.toUpperCase()}</span>
                <span className="w-[5ch] text-right font-mono tabular-nums">({typeCounts[tab]})</span>
              </button>
            ))}
          </div>

          <CostBreakdownPopover
            label={`Status filter, ${statusControlLabel}`}
            trigger={<span className="inline-flex items-baseline whitespace-nowrap"><span>Status</span><span aria-hidden="true" className="ml-1 inline-block w-[5ch] text-left font-mono tabular-nums">({areAllComparisonStatusesSelected(comparisonView) ? 'All' : comparisonView.length})</span></span>}
            panelClassName="w-44"
          >
            {close => <div aria-label="Filter by comparison status">
              <button
                type="button"
                aria-pressed={areAllComparisonStatusesSelected(comparisonView)}
                onClick={() => { setComparisonView(ALL_COMPARISON_STATUSES); close() }}
                className="mb-1 w-full rounded-sm px-2 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
              >All statuses</button>
              {statusOptions.map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={comparisonView.includes(option.value)}
                  disabled={isOnlyComparisonStatus(comparisonView, option.value)}
                  title={isOnlyComparisonStatus(comparisonView, option.value) ? 'At least one status must remain selected' : undefined}
                  onChange={() => setComparisonView(current => toggleComparisonStatus(current, option.value))}
                  className="h-3.5 w-3.5 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-70"
                />
                <span>{option.label}</span>
              </label>)}
              {comparisonView.length === 1 && <p role="note" className="mt-1 border-t border-slate-200 px-2 pt-2 text-[10px] text-slate-500">At least one status must remain selected.</p>}
            </div>}
          </CostBreakdownPopover>

          <div role="group" aria-label={`Sort findings; current mode ${sortLabel}`} className="inline-flex h-8 shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-white">
            <button type="button" aria-label={`Reapply sort: ${sortLabel}`} title={`Reapply ${sortLabel} and restore sorted order`} onClick={() => setSortResetToken(token => token + 1)} className="inline-flex h-full min-h-8 items-center bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700">
              {sortLabel}
            </button>
            <CostBreakdownPopover
              label={`Choose sort mode; current mode ${sortLabel}`}
              trigger={null}
              panelClassName="w-48"
              buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-l border-slate-300 bg-white p-0 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            >
            {close => <div role="group" aria-label="Sort findings" className="space-y-0.5">
              {COMPARISON_SORT_OPTIONS.map(option => <button
                key={option.value}
                type="button"
                onClick={() => { setSortMode(option.value); setSortResetToken(token => token + 1); close() }}
                className="block w-full rounded-sm px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
              >{option.label}</button>)}
            </div>}
            </CostBreakdownPopover>
          </div>

          <button
            type="button"
            aria-expanded={isOverviewExpanded}
            aria-controls="cost-breakdown-overview-panels"
            aria-label={`${isOverviewExpanded ? 'Collapse' : 'Expand'} Cost and Work Center sections`}
            title={`${isOverviewExpanded ? 'Collapse' : 'Expand'} Cost and Work Center sections`}
            onClick={() => setIsOverviewExpanded(expanded => !expanded)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isOverviewExpanded ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <div id="cost-breakdown-overview-panels" className={isOverviewExpanded ? 'shrink-0 grid min-w-0 grid-cols-1 items-stretch gap-2 lg:grid-cols-2' : 'hidden'}>
        <SnapshotComparisonCard comparison={fullSnapshotComparison} selectedComparison={selectedDisplayComparison} selectedActive={isSelectedComparisonActive} />
        <WorkCenterProcessingTable comparison={fullSnapshotComparison} />
      </div>

      <div role="region" aria-label="Candidate workspace" tabIndex={0} className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700">
        <ItemizedComparisonTable
          comparison={fullSnapshotComparison}
          pair={snapshotPair}
          typeTab={typeTab}
          viewMode={comparisonView}
          sortMode={sortMode}
          sortResetToken={sortResetToken}
          selectedBOMKeys={selectedBOMKeys}
          selectedRoutingKeys={selectedRoutingKeys}
          onToggleFinding={toggleFinding}
          onSetFindingSelection={setFindingSelection}
        />
      </div>
    </div>
  )
}
