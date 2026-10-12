import React, { useState } from 'react'
import { formatNumber, formatPercent, formatVariance, getCanonicalComparisonStatus, getComparisonFindingKey } from '../../../core'
import type { ComparisonFinding, ComparisonStatus, CostComparison, SnapshotPair } from '../../../core'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel, isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'
import { buildBOMItemizedRows, BOMRecordDetails } from './BOMDetailedTable'
import type { BOMItemizedRow } from './BOMDetailedTable'
import { buildRoutingItemizedRows, RoutingRecordDetails } from './RoutingDetailedTable'
import type { RoutingItemizedRow } from './RoutingDetailedTable'
import { ChevronDown, ChevronRight } from 'lucide-react'

export type ItemizedTypeTab = 'all' | 'bom' | 'rtg'

interface ItemizedComparisonTableProps {
  comparison: CostComparison
  pair: SnapshotPair
  typeTab: ItemizedTypeTab
  onTypeTabChange: (tab: ItemizedTypeTab) => void
  viewMode: ComparisonViewMode
  onViewModeChange: (view: ComparisonViewMode) => void
  selectionMode?: boolean
  selectedBOMKeys?: Set<string>
  selectedRoutingKeys?: Set<string>
  onToggleFinding?: (type: 'bom' | 'routing', key: string) => void
}

interface ItemizedRow {
  key: string
  type: 'BOM' | 'RTG'
  finding?: ComparisonFinding
  label: string
  referenceCost: number | null
  currentCost: number | null
  gap: number | null
  detail: BOMItemizedRow | RoutingItemizedRow
}

const STATUSES: Array<{ status: ComparisonStatus; label: string }> = [
  { status: 'CHANGED', label: 'Changed' },
  { status: 'ADDED', label: 'Added' },
  { status: 'REMOVED', label: 'Removed' },
  { status: 'UNCHANGED', label: 'Unchanged' }
]

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function formatRatio(numerator: number | null, denominator: number | null): string {
  return numerator === null || denominator === null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0
    ? '—'
    : formatPercent(numerator / denominator, 2)
}

function statusClass(status: ComparisonStatus | null): string {
  if (status === 'CHANGED') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'ADDED') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'REMOVED') return 'border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'UNCHANGED') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function toRows(
  comparison: CostComparison,
  pair: SnapshotPair
): { bom: BOMItemizedRow[]; routing: RoutingItemizedRow[]; all: ItemizedRow[] } {
  const bom = buildBOMItemizedRows(pair.reference.bom, pair.current.bom, comparison.bomFindings)
  const routing = buildRoutingItemizedRows(
    pair.reference.routing,
    pair.current.routing,
    comparison.routingFindings,
    pair.reference.rates,
    pair.current.rates
  )
  const all: ItemizedRow[] = [
    ...bom.map(detail => ({
      key: `bom:${detail.key}`,
      type: 'BOM' as const,
      finding: detail.finding,
      label: detail.current?.description ?? detail.reference?.description ?? 'Unnamed material',
      referenceCost: detail.referenceCost,
      currentCost: detail.currentCost,
      gap: detail.gap,
      detail
    })),
    ...routing.map(detail => ({
      key: `routing:${detail.key}`,
      type: 'RTG' as const,
      finding: detail.finding,
      label: detail.current?.processName ?? detail.reference?.processName ?? 'Unnamed process',
      referenceCost: detail.referenceConversion,
      currentCost: detail.currentConversion,
      gap: detail.conversionGap,
      detail
    }))
  ]
  return { bom, routing, all }
}

export const ItemizedComparisonTable: React.FC<ItemizedComparisonTableProps> = ({
  comparison,
  pair,
  typeTab,
  onTypeTabChange,
  viewMode,
  onViewModeChange,
  selectionMode = false,
  selectedBOMKeys,
  selectedRoutingKeys,
  onToggleFinding
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const { all } = toRows(comparison, pair)
  const visibleByStatus = all.filter(row => isVisibleInComparisonView(row.finding, viewMode))
  const visibleRows = visibleByStatus
    .filter(row => typeTab === 'all' || (typeTab === 'bom' ? row.type === 'BOM' : row.type === 'RTG'))
    .sort((left, right) => {
      if (left.gap === null) return right.gap === null ? left.key.localeCompare(right.key) : 1
      if (right.gap === null) return -1
      const magnitude = Math.abs(right.gap) - Math.abs(left.gap)
      return magnitude || left.key.localeCompare(right.key)
    })
  const allCount = visibleByStatus.length
  const bomCount = visibleByStatus.filter(row => row.type === 'BOM').length
  const routingCount = visibleByStatus.filter(row => row.type === 'RTG').length
  const statusCounts = new Map<ComparisonStatus, number>(STATUSES.map(({ status }) => [
    status,
    all.filter(row => getCanonicalComparisonStatus(row.finding) === status).length
  ]))
  const conversionGap = comparison.elementGaps.labor === null || comparison.elementGaps.burden === null
    ? null
    : comparison.elementGaps.labor + comparison.elementGaps.burden
  const tabs: Array<{ key: ItemizedTypeTab; label: string; count: number }> = [
    { key: 'all', label: 'ALL', count: allCount },
    { key: 'bom', label: 'BOM', count: bomCount },
    { key: 'rtg', label: 'RTG', count: routingCount }
  ]

  return (
    <section aria-labelledby="itemized-comparison-title" className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="itemized-comparison-title" tabIndex={-1} className="font-sans text-sm font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Itemized Comparison</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{getComparisonViewLabel(viewMode)} status view · sorted by absolute cost Gap</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Itemized comparison type">
            {tabs.map(tab => (
              <button key={tab.key} type="button" aria-pressed={typeTab === tab.key} onClick={() => onTypeTabChange(tab.key)} className={`min-h-8 rounded-sm border px-2.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${typeTab === tab.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                {tab.label} <span className={typeTab === tab.key ? 'text-slate-300' : 'text-slate-400'}>({tab.count})</span>
              </button>
            ))}
          </div>
          <span className="hidden h-6 border-l border-slate-300 sm:block" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter comparison by status">
            <button type="button" aria-pressed={areAllComparisonStatusesSelected(viewMode)} onClick={() => onViewModeChange(ALL_COMPARISON_STATUSES)} className={`min-h-8 rounded-sm border px-2.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${areAllComparisonStatusesSelected(viewMode) ? 'border-slate-700 bg-white font-semibold text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
              All <span className="text-slate-400">({all.length})</span>
            </button>
            {STATUSES.map(({ status, label }) => (
              <button key={status} type="button" aria-pressed={viewMode.includes(status)} onClick={() => onViewModeChange(viewMode.includes(status) ? viewMode.filter(selected => selected !== status) : [...viewMode, status])} className={`min-h-8 rounded-sm border px-2.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${viewMode.includes(status) ? 'border-slate-700 bg-white font-semibold text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
                {label} <span className="text-slate-400">({statusCounts.get(status) ?? 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="sr-only">BOM and Routing records sorted by absolute cost gap, with expandable parameter and calculation details</caption>
          <thead><tr className="bg-slate-800 font-semibold text-white">
            {selectionMode && <th scope="col" className="px-2.5 py-2">Include</th>}
            <th scope="col" className="px-2.5 py-2">Type</th><th scope="col" className="px-2.5 py-2">Record</th><th scope="col" className="px-2.5 py-2">Status</th><th scope="col" className="px-2.5 py-2 text-right">REF · THB/pc</th><th scope="col" className="px-2.5 py-2 text-right">CUR · THB/pc</th><th scope="col" className="px-2.5 py-2 text-right">Gap</th><th scope="col" className="px-2.5 py-2 text-right">% Total</th><th scope="col" className="px-2.5 py-2 text-right">% Parent</th><th scope="col" className="w-10 px-2.5 py-2"><span className="sr-only">Details</span></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {visibleRows.length === 0 ? (
              <tr><td colSpan={9 + Number(selectionMode)} className="px-3 py-8 text-center font-sans italic text-slate-500">No BOM or RTG records match this comparison view.</td></tr>
            ) : visibleRows.map(row => {
              const status = getCanonicalComparisonStatus(row.finding)
              const isExpanded = expandedRow === row.key
              const detailId = `itemized-detail-${encodeURIComponent(row.key)}`
              const isBOM = row.type === 'BOM'
              const findingKey = row.finding ? getComparisonFindingKey(isBOM ? 'bom' : 'routing', row.finding) : null
              const canSelect = Boolean(row.finding && status && findingKey)
              const selected = isBOM ? selectedBOMKeys?.has(findingKey ?? '') : selectedRoutingKeys?.has(findingKey ?? '')
              const parentGap = isBOM ? comparison.elementGaps.material : conversionGap
              return <React.Fragment key={row.key}>
                <tr className="hover:bg-slate-50/70">
                  {selectionMode && <td className="px-2.5 py-2 text-center"><input type="checkbox" checked={Boolean(canSelect && selected)} disabled={!canSelect || !findingKey} onChange={() => { if (canSelect && findingKey) onToggleFinding?.(isBOM ? 'bom' : 'routing', findingKey) }} aria-label={`Include ${row.type} ${row.label} in Selected Comparison`} title={canSelect ? 'Include this finding in Selected Comparison' : 'This finding has no comparable business identity'} className="h-4 w-4 accent-slate-900 disabled:cursor-default disabled:opacity-30" /></td>}
                  <td className="px-2.5 py-2 font-sans text-[11px] font-semibold text-slate-500">{row.type}</td>
                  <th scope="row" className="max-w-[260px] px-2.5 py-2 font-sans font-medium text-slate-900">
                    <button type="button" aria-expanded={isExpanded} aria-controls={isExpanded ? detailId : undefined} onClick={() => setExpandedRow(isExpanded ? null : row.key)} className="flex min-h-8 items-center gap-1.5 text-left hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
                      <span className="truncate" title={row.label}>{row.label}</span>
                    </button>
                  </th>
                  <td className="px-2.5 py-2"><span aria-label={status ?? 'No comparison status'} className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-bold ${statusClass(status)}`}>{status ?? '—'}</span></td>
                  <td className="px-2.5 py-2 text-right text-slate-600">{formatNullable(row.referenceCost)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold text-slate-900">{formatNullable(row.currentCost)}</td>
                  <td className={`px-2.5 py-2 text-right font-semibold ${row.gap === null ? 'text-slate-400' : row.gap > 0 ? 'text-rose-700' : row.gap < 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{row.gap === null ? '—' : formatVariance(row.gap, 4)}</td>
                  <td className="px-2.5 py-2 text-right">{formatRatio(row.gap, comparison.totalGap)}</td>
                  <td className="px-2.5 py-2 text-right">{formatRatio(row.gap, parentGap)}</td>
                  <td aria-hidden="true" className="px-2.5 py-2 text-center text-slate-400">{isExpanded ? '−' : '+'}</td>
                </tr>
                {isExpanded && <tr><td id={detailId} colSpan={9 + Number(selectionMode)} className="bg-slate-50 px-3 py-3">
                  {isBOM
                    ? <BOMRecordDetails row={row.detail as BOMItemizedRow} standardCostGap={comparison.totalGap} />
                    : <RoutingRecordDetails row={row.detail as RoutingItemizedRow} referenceRates={pair.reference.rates} currentRates={pair.current.rates} standardCostGap={comparison.totalGap} laborGap={comparison.elementGaps.labor} burdenGap={comparison.elementGaps.burden} conversionGap={conversionGap} />}
                </td></tr>}
              </React.Fragment>
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
