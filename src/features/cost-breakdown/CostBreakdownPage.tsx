import React, { useEffect, useId, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { useAppStore } from '../../state'

import { ItemizedComparisonTable } from './components/ItemizedComparisonTable'
import type { ItemizedTypeTab } from './components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { CostBreakdownPopover, dismissCostBreakdownPopovers } from './components/CostBreakdownPopover'
import { ComparisonStatusOptions } from './components/ComparisonStatusOptions'
import { COST_ELEMENT_COLORS } from './components/cost-element-colors'
import { Tooltip } from '../../shared/ui/Tooltip'
import { COMPARISON_ROLE_LABELS, ComparisonRoleSelector } from '../../shared/ui/ComparisonRoleSelector'
import {
  ALL_COMPARISON_STATUSES,
  COMPARISON_SORT_OPTIONS,
  DEFAULT_COMPARISON_SORT_MODE,
  getSelectedComparisonContribution,
  isVisibleInComparisonView
} from './components/comparison-view'
import type { ComparisonSortMode, ComparisonViewMode } from './components/comparison-view'
import { formatVariance, getVarianceClass } from '../../core'
import type { CandidateManualOrders, CandidateTableType } from './candidate-reorder-history'

interface CostBreakdownPageProps {
  manualOrders: CandidateManualOrders
  onManualOrderChange: (type: CandidateTableType, keys: string[]) => void
  onResetManualOrderHistory: () => void
}

interface GapSegment {
  key: 'material' | 'labor' | 'burden'
  label: 'Material' | 'Labor' | 'Burden'
  full: number | null
  selected: number | null
  color: string
}

const iconActionButtonClass = 'grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-transparent text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

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
  directionLabel: string
}

export function GapContributionChart({ segments, fullTotal, selectedTotal, selectedActive, directionLabel }: GapContributionChartProps) {
  const width = 1000
  const chartId = useId().replace(/:/g, '')
  const fullValues = segments.map(segment => segment.full)
  const fullAvailable = fullValues.every(isAvailableGap)
  const fullNumbers = fullValues.filter(isAvailableGap)
  const empty = fullAvailable && fullValues.length === 3 && fullValues.every(value => value === 0)
  const proportional = fullAvailable && hasSingleSign(fullNumbers)
  const mode = empty ? 'empty' : !fullAvailable ? 'unavailable' : proportional ? 'proportional' : 'signed'
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
  const selectedText = (value: number | null) => `Selected ${valueLabel(value)}`
  const accessibleLabel = [
    `Full Standard Cost Gap ${valueLabel(fullTotal)}`,
    `Gap = ${directionLabel}`,
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
        {mode === 'empty'
          ? <rect data-gap-empty-track="true" x="0" y="7" width={width} height="18" fill="#e2e8f0" />
          : segments.map(renderSegment)}
        {mode === 'proportional' && proportionalSegments.slice(1).map(segment => <line key={`divider-${segment.key}`} x1={segment.x} y1="4" x2={segment.x} y2="28" stroke="white" strokeWidth="2" />)}
      </svg>
    </div>
  )
}

export const CostBreakdownPage: React.FC<CostBreakdownPageProps> = ({ manualOrders, onManualOrderChange, onResetManualOrderHistory }) => {
  const {
    activeTab,
    comparisonBefore,
    comparisonAfter,
    comparisonPair,
    setComparisonBefore,
    setComparisonAfter,
    costBreakdownFullComparison,
    costBreakdownSelectedComparison,
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
  const toggleOverview = () => setIsOverviewExpanded(expanded => !expanded)
  const gapDirection = `${COMPARISON_ROLE_LABELS[comparisonAfter]} − ${COMPARISON_ROLE_LABELS[comparisonBefore]}`

  useEffect(() => {
    if (activeTab !== 'breakdown') dismissCostBreakdownPopovers()
  }, [activeTab])

  const selectedBOMKeys = new Set(selectedComparisonSelection?.bomFindingKeys ?? [])
  const selectedRoutingKeys = new Set(selectedComparisonSelection?.routingFindingKeys ?? [])
  const selectedContribution = isSelectedComparisonActive && selectedComparisonSelection
    ? getSelectedComparisonContribution(costBreakdownFullComparison, costBreakdownSelectedComparison, selectedComparisonSelection)
    : null
  const selectedDisplayComparison = selectedContribution
    ? { ...costBreakdownSelectedComparison, ...selectedContribution }
    : costBreakdownSelectedComparison
  const gapSegments: GapSegment[] = [
    { key: 'material', label: 'Material', full: costBreakdownFullComparison.elementGaps.material, selected: selectedContribution?.elementGaps.material ?? null, color: COST_ELEMENT_COLORS.material },
    { key: 'labor', label: 'Labor', full: costBreakdownFullComparison.elementGaps.labor, selected: selectedContribution?.elementGaps.labor ?? null, color: COST_ELEMENT_COLORS.labor },
    { key: 'burden', label: 'Burden', full: costBreakdownFullComparison.elementGaps.burden, selected: selectedContribution?.elementGaps.burden ?? null, color: COST_ELEMENT_COLORS.burden }
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

  const bomCount = costBreakdownFullComparison.bomFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const routingCount = costBreakdownFullComparison.routingFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
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
    <div className="flex min-h-full min-w-0 flex-col overflow-x-clip">
      <div data-cbd-sticky-shell="true" className="flex shrink-0 flex-col lg:sticky lg:top-0 lg:z-30">
      <header aria-label="Cost Breakdown subheader" className="shrink-0 overflow-x-auto border border-slate-300 bg-white">
        <div className="flex min-w-[1000px] flex-nowrap items-center gap-1.5 px-1.5 py-1" role="group" aria-label="Cost Breakdown controls">
          <div role="group" aria-label={`Comparison datasets, Before ${COMPARISON_ROLE_LABELS[comparisonBefore]}, After ${COMPARISON_ROLE_LABELS[comparisonAfter]}`} className="inline-flex shrink-0 items-center gap-1.5">
            <ComparisonRoleSelector side="Before" role={comparisonBefore} onChange={setComparisonBefore} />
            <span aria-hidden="true" className="w-4 text-center text-sm font-semibold text-slate-500">→</span>
            <ComparisonRoleSelector side="After" role={comparisonAfter} onChange={setComparisonAfter} />
          </div>

          <div
            aria-label={`Standard Cost Gap ${costBreakdownFullComparison.totalGap === null ? 'unavailable' : formatVariance(costBreakdownFullComparison.totalGap, 2)} THB/pc; Gap = ${gapDirection}`}
            title={`Full snapshot · THB/pc · Gap = ${gapDirection}`}
            className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap border-l border-slate-300 pl-2 text-xs"
          >
            <span className="font-semibold text-slate-800">Standard Cost Gap</span>
            <span className={`font-mono tabular-nums ${costBreakdownFullComparison.totalGap === null ? 'text-slate-400' : getVarianceClass(costBreakdownFullComparison.totalGap)}`}>
              {costBreakdownFullComparison.totalGap === null ? '—' : formatVariance(costBreakdownFullComparison.totalGap, 2)}
            </span>
          </div>

          <div role="group" aria-label="Cost element color legend" className="flex shrink-0 items-center gap-2 whitespace-nowrap border-l border-slate-300 pl-2 text-[10px] font-medium text-slate-600">
            {[
              { label: 'MAT', color: COST_ELEMENT_COLORS.material },
              { label: 'LB', color: COST_ELEMENT_COLORS.labor },
              { label: 'BD', color: COST_ELEMENT_COLORS.burden }
            ].map(item => <span key={item.label} className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>)}
          </div>

          <div data-gap-chart-wrapper="true" className="min-w-[96px] flex-1">
            <GapContributionChart
              segments={gapSegments}
              fullTotal={costBreakdownFullComparison.totalGap}
              selectedTotal={selectedContribution?.totalGap ?? null}
              selectedActive={isSelectedComparisonActive}
              directionLabel={gapDirection}
            />
          </div>

          <div className="grid h-8 w-[240px] shrink-0 grid-cols-3 items-stretch border border-slate-300 bg-white" role="group" aria-label="Finding type filter">
            {(['bom', 'rtg', 'all'] as const).map((tab, index) => (
              <button
                key={tab}
                type="button"
                aria-pressed={typeTab === tab}
                onClick={() => setTypeTab(tab)}
                className={`relative inline-flex h-full w-full min-w-0 items-center justify-center gap-1 px-0.5 text-[10px] font-medium transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ${index < 2 ? 'border-r border-slate-200' : ''} ${typeTab === tab ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {typeTab === tab && <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 bg-slate-900" />}
                <span className="relative z-10">{tab === 'all' ? 'All' : tab.toUpperCase()}</span>
                <span className="relative z-10 w-[5ch] text-right font-mono tabular-nums">({typeCounts[tab]})</span>
              </button>
            ))}
          </div>

          <CostBreakdownPopover
            label="Status"
            showChevron={false}
            trigger={<Filter aria-hidden="true" className="h-4 w-4" />}
            triggerClassName={iconActionButtonClass}
            panelClassName="w-max"
          >
            {() => <ComparisonStatusOptions selected={comparisonView} onChange={setComparisonView} />}
          </CostBreakdownPopover>

          <CostBreakdownPopover
            label="Sort"
            showChevron={false}
            trigger={<ArrowUpDown aria-hidden="true" className="h-4 w-4" />}
            triggerClassName={iconActionButtonClass}
            panelClassName="w-max"
          >
            {close => <div role="group" aria-label="Sort findings" className="flex flex-col">
              {COMPARISON_SORT_OPTIONS.map(option => <button
                key={option.value}
                type="button"
                onClick={() => { setSortMode(option.value); onResetManualOrderHistory(); setSortResetToken(token => token + 1); close() }}
                className="block min-h-8 w-full rounded-sm px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
              >{option.label}</button>)}
            </div>}
          </CostBreakdownPopover>

          <Tooltip label={isOverviewExpanded ? 'Collapse' : 'Expand'} wrapperClassName="relative inline-flex shrink-0">
            <button
              type="button"
              aria-expanded={isOverviewExpanded}
              aria-controls="cost-breakdown-overview-panels"
              aria-label={isOverviewExpanded ? 'Collapse' : 'Expand'}
              onClick={toggleOverview}
              className={iconActionButtonClass}
            >
              {isOverviewExpanded
                ? <ChevronDown data-cbd-overview-indicator="true" aria-hidden="true" className="h-4 w-4" />
                : <ChevronRight data-cbd-overview-indicator="true" aria-hidden="true" className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>
      </header>

      <div id="cost-breakdown-overview-panels" data-cbd-overview-pair="true" data-cbd-overview-columns="equal" className={isOverviewExpanded ? 'grid min-w-0 grid-cols-1 items-stretch gap-2 border-x border-b border-slate-300 bg-slate-50 p-2 lg:shrink-0 lg:grid-cols-2' : 'hidden'}>
        <div className="min-w-0">
          <SnapshotComparisonCard comparison={costBreakdownFullComparison} selectedComparison={selectedDisplayComparison} selectedActive={isSelectedComparisonActive} gapDirection={gapDirection} />
        </div>
        <div className="min-w-0">
          <WorkCenterProcessingTable comparison={costBreakdownFullComparison} gapDirection={gapDirection} />
        </div>
      </div>
      </div>

      <div aria-hidden="true" data-cbd-sticky-gap="true" className="h-2 shrink-0" />

      <div role="region" aria-label="Candidate workspace" tabIndex={0} className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 max-lg:[contain:paint]">
        <ItemizedComparisonTable
          key={comparisonPair.fingerprint}
          comparison={costBreakdownFullComparison}
          pair={comparisonPair}
          typeTab={typeTab}
          viewMode={comparisonView}
          sortMode={sortMode}
          sortResetToken={sortResetToken}
          selectedBOMKeys={selectedBOMKeys}
          selectedRoutingKeys={selectedRoutingKeys}
          manualOrders={manualOrders}
          onManualOrderChange={onManualOrderChange}
          onResetManualOrderHistory={onResetManualOrderHistory}
          onToggleFinding={toggleFinding}
          onSetFindingSelection={setFindingSelection}
        />
      </div>
    </div>
  )
}
