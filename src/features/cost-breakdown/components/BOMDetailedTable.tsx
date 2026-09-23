import React from 'react'
import {
  ComparisonFinding,
  SnapshotBOMItem,
  calculateSnapshotBOMDetail,
  formatNumber,
  formatVariance,
  formatPercent,
  getComparisonStatusLabels
} from '../../../core'
import type { ComparisonStatus } from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'
import { ComparisonViewMode, isVisibleInComparisonView } from './comparison-view'

interface BOMDetailedTableProps {
  referenceItems: SnapshotBOMItem[]
  currentItems: SnapshotBOMItem[]
  findings?: ComparisonFinding[]
  viewMode?: ComparisonViewMode
}

export function getBOMComparisonLabel(finding: ComparisonFinding): ComparisonStatus {
  return getComparisonStatusLabels(finding)[0]
}

function comparisonClass(label: string): string {
  if (label === 'Unchanged') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'Modified') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'Added') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'Removed') return 'text-rose-700 bg-rose-50 border-rose-200'
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

export const BOMDetailedTable: React.FC<BOMDetailedTableProps> = ({
  referenceItems,
  currentItems,
  findings,
  viewMode = 'all'
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
      detail: calculateSnapshotBOMDetail({ reference, current })
    }
  })
  const referenceOnlyRows = (findings ?? [])
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => ({
      finding,
      detail: calculateSnapshotBOMDetail({
        reference: finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      })
    }))
  const rows = [...currentRows, ...referenceOnlyRows]
  const visibleRows = rows.filter(row => isVisibleInComparisonView(row.finding, viewMode))
  const referenceTotal = sumNullable(visibleRows.map(row => row.detail.referenceCost))
  const currentTotal = sumNullable(visibleRows.map(row => row.detail.currentCost))
  const totalVariance = referenceTotal === null || currentTotal === null ? null : currentTotal - referenceTotal

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs text-left">
        <caption className="sr-only">Reference and current BOM cost comparison using snapshot source values</caption>
        <thead>
          <tr className="bg-slate-900 text-white font-semibold text-[11px]">
            <th scope="col" className="p-2.5 w-12">#</th>
            <th scope="col" className="p-2.5">Item Code</th>
            <th scope="col" className="p-2.5">Material Description</th>
            {showComparison && <th scope="col" className="p-2.5">Comparison</th>}
            {showComparison && <th scope="col" className="p-2.5">Confidence</th>}
            <th scope="col" className="p-2.5 text-right">Ref Usage</th>
            <th scope="col" className="p-2.5 text-right">Current Usage</th>
            <th scope="col" className="p-2.5">Unit</th>
            <th scope="col" className="p-2.5 text-right">Ref Price</th>
            <th scope="col" className="p-2.5 text-right">Current Price</th>
            <th scope="col" className="p-2.5 text-right">Ref Loss</th>
            <th scope="col" className="p-2.5 text-right">Current Loss</th>
            <th scope="col" className="p-2.5 text-right">Ref Cost</th>
            <th scope="col" className="p-2.5 text-right">Current Cost</th>
            <th scope="col" className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={showComparison ? 15 : 13} className="p-6 text-center text-slate-400 font-sans italic">
                No rows match this comparison view.
              </td>
            </tr>
          ) : visibleRows.map((row, index) => {
            const reference = row.detail.pair.reference
            const current = row.detail.pair.current
            const label = row.finding ? getBOMComparisonLabel(row.finding) : 'Need Review'
            const itemCode = current?.itemCode ?? reference?.itemCode ?? '—'
            const description = current?.description ?? reference?.description ?? '—'
            const unit = current?.unit ?? reference?.unit ?? '—'

            return (
              <tr key={current?.id ?? `removed-${reference?.id ?? itemCode}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-2.5 text-slate-500 tabular-nums">{index + 1}</td>
                <th scope="row" className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{itemCode}</th>
                <td className="p-2.5 font-sans font-medium text-slate-800 truncate max-w-[220px]" title={description}>{description}</td>
                {showComparison && (
                  <td className="p-2.5 min-w-[120px]">
                    <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap ${comparisonClass(label)}`}>
                      {label}
                    </span>
                  </td>
                )}
                {showComparison && (
                  <td className="p-2.5 whitespace-nowrap"><ConfidenceBadge status={row.finding?.confidence ?? 'missing'} showLabel /></td>
                )}
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.consumption ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.consumption ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 font-sans text-slate-600 whitespace-nowrap">{unit}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.price ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.price ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.loss ?? null, value => formatPercent(value, 1))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.loss ?? null, value => formatPercent(value, 1))}</td>
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(row.detail.referenceCost, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(row.detail.currentCost, value => formatNumber(value, 4))}</td>
                <td className={`p-2.5 text-right tabular-nums ${row.detail.costGap === null ? 'text-slate-400' : row.detail.costGap > 0 ? 'text-rose-600' : row.detail.costGap < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {formatNullable(row.detail.costGap, value => formatVariance(value, 4))}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-300/80 font-bold text-xs">
            <td colSpan={showComparison ? 12 : 10} className="p-2.5 text-right text-slate-700 uppercase tracking-wider text-[10px] font-sans">
              {viewMode === 'changed' ? 'Visible Changed Material (THB/pc)' : 'Total Direct Material (THB/pc)'}
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
