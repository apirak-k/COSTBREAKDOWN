import React, { useState } from 'react'
import { formatNumber, formatPercent, formatVariance, getCanonicalComparisonStatus, getComparisonFindingKey } from '../../../core'
import type { ComparisonFinding, ComparisonStatus, CostComparison, SnapshotPair } from '../../../core'
import { getComparisonViewLabel, isVisibleInComparisonView } from './comparison-view'
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
  viewMode: ComparisonViewMode
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

function renderStatusMetric(
  status: ComparisonStatus | null,
  reference: number | null | undefined,
  current: number | null | undefined,
  formatValue: (value: number) => string,
  formatDelta: (value: number) => string = value => formatVariance(value, 4)
): React.ReactNode {
  if (status === 'CHANGED') {
    return reference === null || reference === undefined || current === null || current === undefined
      ? '—'
      : formatDelta(current - reference)
  }
  if (status === 'ADDED') {
    return current === null || current === undefined ? '—' : <span><span className="mr-1 text-[9px] font-sans font-semibold uppercase text-sky-800">CUR</span>{formatValue(current)}</span>
  }
  if (status === 'REMOVED') {
    return reference === null || reference === undefined ? '—' : <span><span className="mr-1 text-[9px] font-sans font-semibold uppercase text-rose-800">REF</span>{formatValue(reference)}</span>
  }
  if (status === 'UNCHANGED') {
    const value = current ?? reference
    return value === null || value === undefined ? '—' : <span><span className="mr-1 text-[9px] font-sans font-semibold uppercase text-slate-500">CUR</span>{formatValue(value)}</span>
  }
  return '—'
}

function toRows(comparison: CostComparison, pair: SnapshotPair): { bom: ItemizedRow[]; routing: ItemizedRow[] } {
  const bom = buildBOMItemizedRows(pair.reference.bom, pair.current.bom, comparison.bomFindings).map(detail => ({
    key: 'bom:' + detail.key,
    type: 'BOM' as const,
    finding: detail.finding,
    label: detail.current?.description ?? detail.reference?.description ?? 'Unnamed material',
    referenceCost: detail.referenceCost,
    currentCost: detail.currentCost,
    gap: detail.gap,
    detail
  }))
  const routing = buildRoutingItemizedRows(
    pair.reference.routing,
    pair.current.routing,
    comparison.routingFindings,
    pair.reference.rates,
    pair.current.rates
  ).map(detail => ({
    key: 'routing:' + detail.key,
    type: 'RTG' as const,
    finding: detail.finding,
    label: detail.current?.processName ?? detail.reference?.processName ?? 'Unnamed process',
    referenceCost: detail.referenceConversion,
    currentCost: detail.currentConversion,
    gap: detail.conversionGap,
    detail
  }))
  return { bom, routing }
}

function sortRows(rows: ItemizedRow[]): ItemizedRow[] {
  return [...rows].sort((left, right) => {
    if (left.gap === null) return right.gap === null ? left.key.localeCompare(right.key) : 1
    if (right.gap === null) return -1
    const magnitude = Math.abs(right.gap) - Math.abs(left.gap)
    return magnitude || left.key.localeCompare(right.key)
  })
}

export const ItemizedComparisonTable: React.FC<ItemizedComparisonTableProps> = ({
  comparison,
  pair,
  typeTab,
  viewMode,
  selectedBOMKeys,
  selectedRoutingKeys,
  onToggleFinding
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const { bom, routing } = toRows(comparison, pair)
  const visibleBOMRows = sortRows(bom.filter(row => isVisibleInComparisonView(row.finding, viewMode)))
  const visibleRoutingRows = sortRows(routing.filter(row => isVisibleInComparisonView(row.finding, viewMode)))
  const visibleRows = typeTab === 'bom'
    ? visibleBOMRows
    : typeTab === 'rtg' ? visibleRoutingRows : [...visibleBOMRows, ...visibleRoutingRows]
  const totalRows = visibleRows.length

  const keyFor = (row: ItemizedRow) => row.finding
    ? getComparisonFindingKey(row.type === 'BOM' ? 'bom' : 'routing', row.finding)
    : null
  const isSelected = (row: ItemizedRow) => {
    const key = keyFor(row)
    if (!key) return false
    return row.type === 'BOM' ? Boolean(selectedBOMKeys?.has(key)) : Boolean(selectedRoutingKeys?.has(key))
  }
  const toggleRow = (row: ItemizedRow) => {
    const key = keyFor(row)
    if (key) onToggleFinding?.(row.type === 'BOM' ? 'bom' : 'routing', key)
  }
  const renderSelection = (row: ItemizedRow, index: number) => {
    const status = getCanonicalComparisonStatus(row.finding)
    const key = keyFor(row)
    const selected = isSelected(row)
    const canSelect = Boolean(row.finding && status && key)
    return <button type="button" disabled={!canSelect} aria-pressed={selected} aria-label={selected ? 'Deselect Candidate ' + row.label : 'Select Candidate ' + row.label} title={canSelect ? (selected ? 'Deselect this Candidate' : 'Select this Candidate') : 'This finding cannot be selected'} onClick={() => toggleRow(row)} className={selected ? 'inline-flex min-h-7 min-w-7 items-center justify-center rounded-sm border border-blue-800 bg-blue-800 px-1.5 text-[11px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700' : 'inline-flex min-h-7 min-w-7 items-center justify-center rounded-sm border border-slate-300 bg-white px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-40'}>
      {index + 1}{selected && <span className="ml-1" aria-hidden="true">✓</span>}
    </button>
  }
  const renderStatus = (status: ComparisonStatus | null) => <span aria-label={status ?? 'No comparison status'} className={'inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-bold ' + statusClass(status)}>{status ?? '—'}</span>
  const renderDetailToggle = (row: ItemizedRow, detailId: string, changedOnly: boolean) => {
    const expandable = changedOnly ? getCanonicalComparisonStatus(row.finding) === 'CHANGED' : true
    const isExpanded = expandedRow === row.key
    return expandable
      ? <button type="button" aria-expanded={isExpanded} aria-controls={isExpanded ? detailId : undefined} aria-label={(isExpanded ? 'Collapse' : 'Expand') + ' details for ' + row.label} onClick={() => setExpandedRow(isExpanded ? null : row.key)} className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button>
      : <span aria-hidden="true" className="inline-flex min-h-7 min-w-7 items-center justify-center text-slate-300">—</span>
  }

  return (
    <section aria-labelledby="itemized-comparison-title" className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
        <h2 id="itemized-comparison-title" tabIndex={-1} className="font-sans text-sm font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Candidates</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">{getComparisonViewLabel(viewMode)} status view · {totalRows} shown · sorted by absolute Cost Gap</p>
      </div>

      {typeTab !== 'rtg' && <div className="border-b border-slate-200">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-white px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Bill of Material</h3>
          <span className="text-[11px] text-slate-500">{visibleBOMRows.length} findings · Cost Gap = Material Gap</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <caption className="sr-only">Bill of Material candidates with changed parameter deltas and full Standard Cost contribution</caption>
            <thead><tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="w-12 px-2 py-2 text-center">#</th>
              <th scope="col" className="min-w-[220px] px-2.5 py-2">Bill of Material</th>
              <th scope="col" className="px-2.5 py-2">Status</th>
              <th scope="col" className="px-2.5 py-2 text-right">Usage</th>
              <th scope="col" className="px-2.5 py-2 text-right">Price</th>
              <th scope="col" className="px-2.5 py-2 text-right">Loss</th>
              <th scope="col" className="px-2.5 py-2 text-right">Cost Gap</th>
              <th scope="col" className="px-2.5 py-2 text-right">% Total</th>
              <th scope="col" className="w-10 px-2.5 py-2"><span className="sr-only">Details</span></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {visibleBOMRows.length === 0 ? <tr><td colSpan={9} className="px-3 py-8 text-center font-sans italic text-slate-500">No BOM Candidates match this filter.</td></tr> : visibleBOMRows.map((row, index) => {
                const status = getCanonicalComparisonStatus(row.finding)
                const selected = isSelected(row)
                const isExpanded = expandedRow === row.key && status === 'CHANGED'
                const detailId = 'itemized-detail-' + encodeURIComponent(row.key)
                const detail = row.detail as BOMItemizedRow
                return <React.Fragment key={row.key}>
                  <tr aria-selected={selected} className={selected ? 'bg-blue-50' : 'hover:bg-slate-50/70'}>
                    <td className="px-2 py-2 text-center">{renderSelection(row, index)}</td>
                    <th scope="row" className="max-w-[320px] px-2.5 py-2 font-sans font-medium text-slate-900"><span className="block truncate" title={row.label}>{row.label}</span></th>
                    <td className="px-2.5 py-2">{renderStatus(status)}</td>
                    <td className="px-2.5 py-2 text-right">{renderStatusMetric(status, detail.reference?.consumption, detail.current?.consumption, value => formatNumber(value, 4))}</td>
                    <td className="px-2.5 py-2 text-right">{renderStatusMetric(status, detail.reference?.price, detail.current?.price, value => formatNumber(value, 4))}</td>
                    <td className="px-2.5 py-2 text-right">{renderStatusMetric(status, detail.reference?.loss, detail.current?.loss, value => formatPercent(value, 2), value => formatPercent(value, 2))}</td>
                    <td className={row.gap === null ? 'px-2.5 py-2 text-right text-slate-400' : row.gap > 0 ? 'px-2.5 py-2 text-right font-semibold text-rose-700' : row.gap < 0 ? 'px-2.5 py-2 text-right font-semibold text-emerald-700' : 'px-2.5 py-2 text-right font-semibold text-slate-500'}>{row.gap === null ? '—' : formatVariance(row.gap, 4)}</td>
                    <td className="px-2.5 py-2 text-right">{formatRatio(row.gap, comparison.totalGap)}</td>
                    <td className="px-2.5 py-2 text-center">{renderDetailToggle(row, detailId, true)}</td>
                  </tr>
                  {isExpanded && <tr><td id={detailId} colSpan={9} className="bg-slate-50 px-3 py-3"><BOMRecordDetails row={detail} /></td></tr>}
                </React.Fragment>
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {typeTab !== 'bom' && <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-white px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Routing</h3>
          <span className="text-[11px] text-slate-500">{visibleRoutingRows.length} findings · Work Center and rates remain calculation context</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-xs">
            <caption className="sr-only">Routing candidates with full Standard Cost contribution and expandable parameter effects</caption>
            <thead><tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="w-12 px-2 py-2 text-center">#</th>
              <th scope="col" className="min-w-[220px] px-2.5 py-2">Routing</th>
              <th scope="col" className="px-2.5 py-2">Status</th>
              <th scope="col" className="px-2.5 py-2 text-right">Manning</th>
              <th scope="col" className="px-2.5 py-2 text-right">Capacity</th>
              <th scope="col" className="px-2.5 py-2 text-right">Yield</th>
              <th scope="col" className="px-2.5 py-2 text-right">Cost Gap</th>
              <th scope="col" className="px-2.5 py-2 text-right">% Total</th>
              <th scope="col" className="w-10 px-2.5 py-2"><span className="sr-only">Details</span></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {visibleRoutingRows.length === 0 ? <tr><td colSpan={9} className="px-3 py-8 text-center font-sans italic text-slate-500">No RTG Candidates match this filter.</td></tr> : visibleRoutingRows.map((row, index) => {
                const status = getCanonicalComparisonStatus(row.finding)
                const selected = isSelected(row)
                const isExpanded = expandedRow === row.key && status === 'CHANGED'
                const detailId = 'itemized-detail-' + encodeURIComponent(row.key)
                const detail = row.detail as RoutingItemizedRow
                const metric = (reference: number | null | undefined, current: number | null | undefined, format: (value: number) => string, deltaFormat?: (value: number) => string) => renderStatusMetric(status, reference, current, format, deltaFormat)
                return <React.Fragment key={row.key}>
                  <tr aria-selected={selected} className={selected ? 'bg-blue-50' : 'hover:bg-slate-50/70'}>
                    <td className="px-2 py-2 text-center">{renderSelection(row, index)}</td>
                    <th scope="row" className="max-w-[280px] px-2.5 py-2 font-sans font-medium text-slate-900"><span className="block truncate" title={row.label}>{row.label}</span></th>
                    <td className="px-2.5 py-2">{renderStatus(status)}</td>
                    <td className="px-2.5 py-2 text-right">{metric(detail.reference?.manning, detail.current?.manning, value => formatNumber(value, 4))}</td>
                    <td className="px-2.5 py-2 text-right">{metric(detail.reference?.capacity, detail.current?.capacity, value => formatNumber(value, 4))}</td>
                    <td className="px-2.5 py-2 text-right">{metric(detail.reference?.yield, detail.current?.yield, value => formatPercent(value, 2), value => formatPercent(value, 2))}</td>
                    <td className={row.gap === null ? 'px-2.5 py-2 text-right text-slate-400' : row.gap > 0 ? 'px-2.5 py-2 text-right font-semibold text-rose-700' : row.gap < 0 ? 'px-2.5 py-2 text-right font-semibold text-emerald-700' : 'px-2.5 py-2 text-right font-semibold text-slate-500'}>{row.gap === null ? '—' : formatVariance(row.gap, 4)}</td>
                    <td className="px-2.5 py-2 text-right">{formatRatio(row.gap, comparison.totalGap)}</td>
                    <td className="px-2.5 py-2 text-center">{renderDetailToggle(row, detailId, true)}</td>
                  </tr>
                  {isExpanded && <tr><td id={detailId} colSpan={9} className="bg-slate-50 px-3 py-3"><RoutingRecordDetails row={detail} referenceRates={pair.reference.rates} currentRates={pair.current.rates} /></td></tr>}
                </React.Fragment>
              })}
            </tbody>
          </table>
        </div>
      </div>}
    </section>
  )
}
