import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../state'

import { ItemizedComparisonTable } from './components/ItemizedComparisonTable'
import type { ItemizedTypeTab } from './components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from './components/WorkCenterProcessingTable'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { formatVariance, getComparisonFindingKey, safeAdd } from '../../core'
import type { ComparisonFinding, ComparisonStatus } from '../../core'

const statusOptions: Array<{ value: ComparisonStatus; label: string }> = [
  { value: 'CHANGED', label: 'Changed' },
  { value: 'ADDED', label: 'Added' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'UNCHANGED', label: 'Unchanged' }
]

interface GapSegment {
  key: 'material' | 'labor' | 'burden'
  label: string
  full: number | null
  selected: number | null
  color: string
  selectedColor: string
}

function isAvailableGap(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
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

function sumSelectedFindingGaps(findings: ComparisonFinding[], element: 'material' | 'labor' | 'burden'): number | null {
  let total = 0
  for (const finding of findings) {
    const value = finding.costEffect?.gap[element]
    if (!isAvailableGap(value)) return null
    const nextTotal = safeAdd(total, value)
    if (nextTotal === null) return null
    total = nextTotal
  }
  return total
}

interface GapContributionChartProps {
  segments: GapSegment[]
  fullTotal: number | null
  selectedTotal: number | null
  selectedActive: boolean
}

export function GapContributionChart({ segments, fullTotal, selectedTotal, selectedActive }: GapContributionChartProps) {
  const width = 1000
  const fullValues = segments.map(segment => segment.full)
  const selectedValues = segments.map(segment => segment.selected)
  const fullAvailable = fullValues.every(isAvailableGap)
  const selectedAvailable = selectedValues.every(isAvailableGap)
  const fullNumbers = fullValues.filter(isAvailableGap)
  const selectedNumbers = selectedValues.filter(isAvailableGap)
  const selectedFitsProportional = selectedActive && selectedAvailable && segments.every(({ full, selected }) => {
    if (!isAvailableGap(full) || !isAvailableGap(selected)) return false
    return selected === 0 || (full !== 0 && Math.sign(full) === Math.sign(selected) && Math.abs(selected) <= Math.abs(full))
  })
  const proportional = fullAvailable && hasSingleSign(fullNumbers)
    && (!selectedActive || !selectedAvailable || selectedFitsProportional)
  const mode = !fullAvailable ? 'unavailable' : proportional ? 'proportional' : 'signed'
  const drawSelected = selectedActive && selectedAvailable
  const fullPath = fullAvailable ? getWaterfallSegments(fullNumbers) : []
  const selectedPath = drawSelected ? getWaterfallSegments(selectedNumbers) : []
  const chartPoints = [
    0,
    ...fullPath.flatMap(segment => [segment.start, segment.end]),
    ...selectedPath.flatMap(segment => [segment.start, segment.end])
  ]
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
  const proportionalSegments = proportional && fullMagnitude > 0
    ? segments.map(segment => {
      const segmentWidth = isAvailableGap(segment.full) ? Math.abs(segment.full) / fullMagnitude * width : 0
      const selectedWidth = drawSelected && isAvailableGap(segment.selected)
        ? Math.abs(segment.selected) / fullMagnitude * width
        : 0
      const result = { ...segment, x: proportionalCursor, width: segmentWidth, selectedWidth }
      proportionalCursor += segmentWidth
      return result
    })
    : []
  const valueLabel = (value: number | null) => isAvailableGap(value) ? formatVariance(value, 4) : 'unavailable'
  const accessibleLabel = [
    `Full Standard Cost Gap ${valueLabel(fullTotal)}`,
    ...segments.map(segment => `Full ${segment.label} ${valueLabel(segment.full)}`),
    selectedActive ? `Selected Standard Cost Gap ${valueLabel(selectedTotal)}` : '',
    ...(selectedActive ? segments.map(segment => `Selected ${segment.label} ${valueLabel(segment.selected)}`) : []),
    selectedActive && !selectedAvailable ? 'Selected overlay is unavailable because one or more component values are unavailable' : '',
    mode === 'signed' ? 'Signed waterfall uses a shared zero baseline; selected contributions are outlined in the same chart' : ''
  ].filter(Boolean).join('; ')

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      data-gap-chart-mode={mode}
      className="h-8 w-full overflow-hidden border border-slate-300 bg-slate-100"
    >
      <svg aria-hidden="true" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" className="block h-full w-full">
        {mode === 'proportional' && fullMagnitude > 0 && proportionalSegments.map(segment => <g key={segment.key}>
          <rect x={segment.x} y="7" width={segment.width} height="18" fill={segment.color} fillOpacity="0.38" />
          {segment.selectedWidth > 0 && <rect x={segment.x} y="7" width={segment.selectedWidth} height="18" fill={segment.selectedColor} />}
          {segment.x > 0 && <line x1={segment.x} y1="4" x2={segment.x} y2="28" stroke="white" strokeWidth="2" />}
        </g>)}
        {mode === 'proportional' && fullMagnitude === 0 && <line x1={width / 2} y1="3" x2={width / 2} y2="29" stroke="#475569" strokeDasharray="3 3" />}
        {mode === 'signed' && <>
          <line x1={zeroX} y1="2" x2={zeroX} y2="30" stroke="#0f172a" strokeDasharray="2 2" />
          {segments.map((segment, index) => {
            const pathSegment = fullPath[index]
            const x1 = scaleSignedValue(pathSegment.start)
            const x2 = scaleSignedValue(pathSegment.end)
            return <rect key={`full-${segment.key}`} x={Math.min(x1, x2)} y="7" width={Math.abs(x2 - x1)} height="18" fill={segment.color} fillOpacity="0.48" />
          })}
          {drawSelected && segments.map((segment, index) => {
            const pathSegment = selectedPath[index]
            const x1 = scaleSignedValue(pathSegment.start)
            const x2 = scaleSignedValue(pathSegment.end)
            return pathSegment.start === pathSegment.end ? null : <g key={`selected-${segment.key}`}>
              <rect x={Math.min(x1, x2)} y="5" width={Math.abs(x2 - x1)} height="22" fill="none" stroke={segment.selectedColor} strokeWidth="2" strokeDasharray="4 2" />
              <line x1={x2} y1="3" x2={x2} y2="29" stroke={segment.selectedColor} strokeWidth="2" strokeDasharray="2 2" />
            </g>
          })}
        </>}
      </svg>
    </div>
  )
}

export const CostBreakdownPage: React.FC = () => {
  const {
    fullSnapshotComparison,
    snapshotPair,
    selectedComparisonSelection,
    isSelectedComparisonActive,
    applySelectedComparison,
    clearSelectedComparison
  } = useAppStore()
  const [typeTab, setTypeTab] = useState<ItemizedTypeTab>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true)

  const selectedBOMKeys = new Set(selectedComparisonSelection?.bomFindingKeys ?? [])
  const selectedRoutingKeys = new Set(selectedComparisonSelection?.routingFindingKeys ?? [])
  const selectedFindings = isSelectedComparisonActive
    ? [
        ...fullSnapshotComparison.bomFindings.filter(finding => selectedBOMKeys.has(getComparisonFindingKey('bom', finding))),
        ...fullSnapshotComparison.routingFindings.filter(finding => selectedRoutingKeys.has(getComparisonFindingKey('routing', finding)))
      ]
    : []
  const selectedElementGaps = {
    material: sumSelectedFindingGaps(selectedFindings, 'material'),
    labor: sumSelectedFindingGaps(selectedFindings, 'labor'),
    burden: sumSelectedFindingGaps(selectedFindings, 'burden')
  }
  const selectedTotalGap = [selectedElementGaps.material, selectedElementGaps.labor, selectedElementGaps.burden].every(isAvailableGap)
    ? safeAdd(selectedElementGaps.material as number, selectedElementGaps.labor as number, selectedElementGaps.burden as number)
    : null
  const gapSegments = [
    { key: 'material' as const, label: 'Material', full: fullSnapshotComparison.elementGaps.material, selected: selectedElementGaps.material, color: '#0369a1', selectedColor: '#075985' },
    { key: 'labor' as const, label: 'Labor', full: fullSnapshotComparison.elementGaps.labor, selected: selectedElementGaps.labor, color: '#b45309', selectedColor: '#92400e' },
    { key: 'burden' as const, label: 'Burden', full: fullSnapshotComparison.elementGaps.burden, selected: selectedElementGaps.burden, color: '#6d28d9', selectedColor: '#5b21b6' }
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
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <header aria-label="Cost Breakdown subheader" className="shrink-0 space-y-1.5 border-b border-slate-300 bg-slate-50 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
        </div>

        <section aria-label="Standard Cost Gap" className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-xs font-semibold text-slate-800">Standard Cost Gap</h2>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
              <span className="font-semibold text-slate-900">Full {fullSnapshotComparison.totalGap === null ? '—' : formatVariance(fullSnapshotComparison.totalGap, 4)}</span>
              {isSelectedComparisonActive && <span className="text-blue-900">Selected {selectedTotalGap === null ? '—' : formatVariance(selectedTotalGap, 4)}</span>}
              <span className="font-sans text-[10px] text-slate-500">THB/pc · Gap = CUR − REF</span>
            </div>
          </div>
          <GapContributionChart
            segments={gapSegments}
            fullTotal={fullSnapshotComparison.totalGap}
            selectedTotal={selectedTotalGap}
            selectedActive={isSelectedComparisonActive}
          />
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            {gapSegments.map(segment => <div key={segment.key} className="min-w-0">
              <p className="font-sans font-semibold text-slate-700">{segment.label}</p>
              <p className="font-mono tabular-nums">Full {segment.full === null ? '—' : formatVariance(segment.full, 4)}</p>
              {isSelectedComparisonActive && <p className="font-mono tabular-nums text-blue-900">Selected {segment.selected === null ? '—' : formatVariance(segment.selected, 4)}</p>}
            </div>)}
          </div>
        </section>
      </header>

      <section aria-labelledby="cost-breakdown-overview-title" className="shrink-0 min-w-0">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          <h2 id="cost-breakdown-overview-title" className="text-xs font-semibold text-slate-800">Fixed Overview</h2>
          <button
            type="button"
            aria-expanded={isOverviewExpanded}
            aria-controls="cost-breakdown-overview-panels"
            aria-label={`${isOverviewExpanded ? 'Collapse' : 'Expand'} Fixed Overview`}
            onClick={() => setIsOverviewExpanded(expanded => !expanded)}
            className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isOverviewExpanded ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
            {isOverviewExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div id="cost-breakdown-overview-panels" className={isOverviewExpanded ? 'mt-1.5 grid min-w-0 grid-cols-2 gap-2' : 'hidden'}>
          <SnapshotComparisonCard comparison={fullSnapshotComparison} />
          <WorkCenterProcessingTable findings={fullSnapshotComparison.processingFindings} />
        </div>
      </section>

      <div role="region" aria-label="Candidate workspace" tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-y-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700">
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
    </div>
  )
}
