import React from 'react'
import {
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  calculateSnapshotRoutingDetail,
  formatNumber,
  formatVariance,
  formatPercent,
  getComparisonStatusLabels
} from '../../../core'
import type { ComparisonStatus, ComparisonFinding } from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'
import { ALL_COMPARISON_STATUSES, isOnlyComparisonStatus, isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'
import { DataQualityPairBadge } from './DataQualityPairBadge'
import { getRoutingDataQuality } from './data-quality'

interface RoutingDetailedTableProps {
  referenceItems: SnapshotRoutingStep[]
  currentItems: SnapshotRoutingStep[]
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
  findings?: ComparisonFinding[]
  viewMode?: ComparisonViewMode
}

export function getRoutingComparisonLabels(finding: ComparisonFinding): ComparisonStatus[] {
  return getComparisonStatusLabels(finding)
}

function comparisonClass(label: string): string {
  if (label === 'UNCHANGED') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'CHANGED') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'ADDED') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'REMOVED') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

function formatNullable(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value)
}

function sumNullable(values: Array<number | null>): number | null {
  return values.some(value => value === null) || values.length === 0
    ? null
    : values.reduce<number>((sum, value) => sum + (value as number), 0)
}

function costGapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-400'
  return value > 0 ? 'text-rose-600' : 'text-emerald-700'
}

function gap(current: number | null, reference: number | null): number | null {
  return current === null || reference === null ? null : current - reference
}

function comparisonDetail(
  pair: { reference?: SnapshotRoutingStep; current?: SnapshotRoutingStep },
  finding: ComparisonFinding | undefined,
  showComparison: boolean,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
) {
  const detail = calculateSnapshotRoutingDetail(pair, referenceRates, currentRates)
  if (!showComparison) return detail
  const effect = finding?.costEffect
  return effect
    ? {
        ...detail,
        referenceLaborCost: effect.reference.labor,
        currentLaborCost: effect.current.labor,
        referenceBurdenCost: effect.reference.burden,
        currentBurdenCost: effect.current.burden,
        referenceTotal: effect.reference.total,
        currentTotal: effect.current.total,
        totalGap: effect.gap.total
      }
    : { ...detail, referenceLaborCost: null, currentLaborCost: null, referenceBurdenCost: null, currentBurdenCost: null, referenceTotal: null, currentTotal: null, totalGap: null }
}

export const RoutingDetailedTable: React.FC<RoutingDetailedTableProps> = ({
  referenceItems,
  currentItems,
  referenceRates,
  currentRates,
  findings,
  viewMode = ALL_COMPARISON_STATUSES
}) => {
  const showComparison = findings !== undefined
  const referenceById = new Map(referenceItems.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    (findings ?? [])
      .filter(finding => finding.currentId)
      .map(finding => [finding.currentId as string, finding])
  )

  const currentRows = currentItems.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    return {
      finding,
      detail: comparisonDetail({ reference, current }, finding, showComparison, referenceRates, currentRates)
    }
  })
  const referenceOnlyRows = (findings ?? [])
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => ({
      finding,
      detail: comparisonDetail({
        reference: finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      }, finding, showComparison, referenceRates, currentRates)
    }))
  const rows = [...currentRows, ...referenceOnlyRows]
  const visibleRows = rows.filter(row => isVisibleInComparisonView(row.finding, viewMode))
  const referenceTotal = sumNullable(visibleRows.map(row => row.detail.referenceTotal))
  const currentTotal = sumNullable(visibleRows.map(row => row.detail.currentTotal))
  const totalVariance = referenceTotal === null || currentTotal === null ? null : currentTotal - referenceTotal

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1500px] text-left text-xs">
        <caption className="sr-only">Reference and current routing cost comparison using matching Work Center rates</caption>
        <thead>
          <tr className="bg-slate-800 text-xs font-semibold text-white">
            <th className="p-2.5 w-12">Op #</th>
            <th className="p-2.5">Operation Description</th>
            <th className="p-2.5">Work Center</th>
            {showComparison && <th className="p-2.5">Comparison</th>}
            {showComparison && <th className="p-2.5">Confidence</th>}
            {showComparison && <th className="p-2.5">Data Quality</th>}
            <th className="p-2.5 text-right">Manning</th>
            <th className="p-2.5 text-right">Ref Cap</th>
            <th className="p-2.5 text-right">Current Cap</th>
            <th className="p-2.5 text-right">Ref Yield</th>
            <th className="p-2.5 text-right">Current Yield</th>
            <th className="p-2.5 text-right">Ref Labor</th>
            <th className="p-2.5 text-right">Current Labor</th>
            <th className="p-2.5 text-right">Δ Labor</th>
            <th className="p-2.5 text-right">Ref Burden</th>
            <th className="p-2.5 text-right">Current Burden</th>
            <th className="p-2.5 text-right">Δ Burden</th>
            <th className="p-2.5 text-right">Ref Conv</th>
            <th className="p-2.5 text-right">Current Conv</th>
            <th className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={showComparison ? 20 : 17} className="p-6 text-center text-slate-400 font-sans italic">
                No rows match this comparison view.
              </td>
            </tr>
          ) : visibleRows.map(row => {
            const reference = row.detail.pair.reference
            const current = row.detail.pair.current
            const labels = row.finding ? getRoutingComparisonLabels(row.finding) : []
            const visibleLabels = labels.filter(label => label !== 'UNCHANGED')
            const referenceWorkCenter = reference?.workCenterId
            const currentWorkCenter = current?.workCenterId
            const workCenter = referenceWorkCenter && currentWorkCenter && referenceWorkCenter !== currentWorkCenter
              ? `${referenceWorkCenter} → ${currentWorkCenter}`
              : currentWorkCenter ?? referenceWorkCenter ?? '—'
            const operationKey = current?.id ?? reference?.id ?? row.finding?.referenceId ?? 'unknown'
            const laborGap = showComparison ? row.finding?.costEffect?.gap.labor ?? null : gap(row.detail.currentLaborCost, row.detail.referenceLaborCost)
            const burdenGap = showComparison ? row.finding?.costEffect?.gap.burden ?? null : gap(row.detail.currentBurdenCost, row.detail.referenceBurdenCost)

            return (
              <tr key={operationKey} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-2.5 text-slate-500 tabular-nums">{current?.sequence ?? reference?.sequence ?? '—'}</td>
                <td className="p-2.5 font-sans font-medium text-slate-800 truncate max-w-[220px]" title={current?.processName ?? reference?.processName ?? '—'}>
                  {current?.processName ?? reference?.processName ?? '—'}
                </td>
                <td className="p-2.5 font-sans text-slate-600 truncate max-w-[160px]" title={workCenter}>{workCenter}</td>
                {showComparison && (
                  <td className="p-2.5 min-w-[150px]">
                    <div className="flex flex-wrap gap-1">
                      {visibleLabels.length > 0 ? visibleLabels.map(label => <span key={label} className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap ${comparisonClass(label)}`}>{label}</span>) : <span aria-label={labels.includes('UNCHANGED') ? 'Unchanged' : undefined} title={labels.length === 0 ? 'No comparable business identity; see validation warnings' : undefined}>—</span>}
                    </div>
                  </td>
                )}
                {showComparison && (
                  <td className="p-2.5 whitespace-nowrap"><ConfidenceBadge status={row.finding?.confidence ?? 'missing'} showLabel /></td>
                )}
                {showComparison && (
                  <td className="p-2.5"><DataQualityPairBadge
                    reference={reference}
                    current={current}
                    referenceQualityOverride={getRoutingDataQuality(reference, referenceRates)}
                    currentQualityOverride={getRoutingDataQuality(current, currentRates)}
                  /></td>
                )}
                <td className="p-2.5 text-right tabular-nums">{formatNullable(current?.manning ?? reference?.manning ?? null, value => formatNumber(value, 1))}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.capacity ?? null, value => formatNumber(value, 0))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.capacity ?? null, value => formatNumber(value, 0))}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.yield ?? null, value => formatPercent(value, 1))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.yield ?? null, value => formatPercent(value, 1))}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(row.detail.referenceLaborCost, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(row.detail.currentLaborCost, value => formatNumber(value, 4))}</td>
                <td className={`p-2.5 text-right tabular-nums ${costGapClass(laborGap)}`}>
                  {formatNullable(laborGap, value => formatVariance(value, 4))}
                </td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(row.detail.referenceBurdenCost, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(row.detail.currentBurdenCost, value => formatNumber(value, 4))}</td>
                <td className={`p-2.5 text-right tabular-nums ${costGapClass(burdenGap)}`}>
                  {formatNullable(burdenGap, value => formatVariance(value, 4))}
                </td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(row.detail.referenceTotal, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(row.detail.currentTotal, value => formatNumber(value, 4))}</td>
                <td className={`p-2.5 text-right tabular-nums ${costGapClass(row.detail.totalGap)}`}>
                  {formatNullable(row.detail.totalGap, value => formatVariance(value, 4))}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-300/80 font-bold text-xs">
            <td colSpan={showComparison ? 17 : 14} className="p-2.5 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">
              {isOnlyComparisonStatus(viewMode, 'CHANGED') ? 'Visible Changed Conversion (THB/pc)' : viewMode.length < 4 ? 'Visible Conversion Cost (THB/pc)' : 'Total Conversion Cost (THB/pc)'}
            </td>
            <td className="p-2.5 text-right font-mono text-slate-800 tabular-nums">{formatNullable(referenceTotal, value => formatNumber(value, 4))}</td>
            <td className="p-2.5 text-right font-mono text-slate-900 tabular-nums">{formatNullable(currentTotal, value => formatNumber(value, 4))}</td>
            <td className="p-2.5 text-right font-mono tabular-nums text-slate-700">{formatNullable(totalVariance, value => formatVariance(value, 4))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
