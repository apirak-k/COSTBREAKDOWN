import React from 'react'
import {
  SnapshotBOMItem,
  calculateSnapshotBOMDetail,
  formatNumber,
  formatVariance,
  formatPercent,
  getComparisonStatusLabels,
  getCanonicalComparisonStatus,
  getComparisonFindingKey
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus } from '../../../core'
import { ALL_COMPARISON_STATUSES, isOnlyComparisonStatus, isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'
import { ComparisonFieldDetails } from './ComparisonFieldDetails'

interface BOMDetailedTableProps {
  referenceItems: SnapshotBOMItem[]
  currentItems: SnapshotBOMItem[]
  findings?: ComparisonFinding[]
  viewMode?: ComparisonViewMode
  selectionMode?: boolean
  selectedFindingKeys?: Set<string>
  onToggleFinding?: (key: string) => void
}

export function getBOMComparisonLabel(finding: ComparisonFinding): ComparisonStatus | null {
  return getComparisonStatusLabels(finding)[0] ?? null
}

function comparisonClass(label: ComparisonStatus | null): string {
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

function comparisonDetail(
  pair: { reference?: SnapshotBOMItem; current?: SnapshotBOMItem },
  finding: ComparisonFinding | undefined,
  showComparison: boolean
) {
  const detail = calculateSnapshotBOMDetail(pair)
  if (!showComparison) return detail
  const effect = finding?.costEffect
  return effect
    ? { ...detail, referenceCost: effect.reference.material, currentCost: effect.current.material, costGap: effect.gap.material }
    : { ...detail, referenceCost: null, currentCost: null, costGap: null }
}

export const BOMDetailedTable: React.FC<BOMDetailedTableProps> = ({
  referenceItems,
  currentItems,
  findings,
  viewMode = ALL_COMPARISON_STATUSES,
  selectionMode = false,
  selectedFindingKeys,
  onToggleFinding
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
      detail: comparisonDetail({ reference, current }, finding, showComparison)
    }
  })
  const referenceOnlyRows = (findings ?? [])
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => ({
      finding,
      detail: comparisonDetail({
        reference: finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      }, finding, showComparison)
    }))
  const rows = [...currentRows, ...referenceOnlyRows]
  const visibleRows = rows.filter(row => isVisibleInComparisonView(row.finding, viewMode))
  const referenceTotal = sumNullable(visibleRows.map(row => row.detail.referenceCost))
  const currentTotal = sumNullable(visibleRows.map(row => row.detail.currentCost))
  const totalVariance = referenceTotal === null || currentTotal === null ? null : currentTotal - referenceTotal

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-xs">
        <caption className="sr-only">Reference, current, and gap for each BOM material using snapshot source values</caption>
        <thead>
          <tr className="bg-slate-800 text-xs font-semibold text-white">
            {selectionMode && <th scope="col" className="p-2.5">Include</th>}
            <th scope="col" className="p-2.5">Name</th>
            {showComparison && <th scope="col" className="p-2.5">Status</th>}
            <th scope="col" className="p-2.5 text-right">Ref Usage</th>
            <th scope="col" className="p-2.5 text-right">Current Usage</th>
            <th scope="col" className="p-2.5">Ref Unit</th>
            <th scope="col" className="p-2.5">Current Unit</th>
            <th scope="col" className="p-2.5 text-right">Ref Price</th>
            <th scope="col" className="p-2.5 text-right">Current Price</th>
            <th scope="col" className="p-2.5 text-right">Ref Loss</th>
            <th scope="col" className="p-2.5 text-right">Current Loss</th>
            <th scope="col" className="p-2.5 text-right">Ref Cost</th>
            <th scope="col" className="p-2.5 text-right">Current Cost</th>
            <th scope="col" className="p-2.5 text-right">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={(showComparison ? 13 : 12) + Number(selectionMode)} className="p-6 text-center text-slate-400 font-sans italic">
                No rows match this comparison view.
              </td>
            </tr>
          ) : visibleRows.map((row, index) => {
            const reference = row.detail.pair.reference
            const current = row.detail.pair.current
            const label = row.finding ? getBOMComparisonLabel(row.finding) : null
            const visibleLabel = label === 'UNCHANGED' ? null : label
            const description = current ? current.description ?? '—' : reference?.description ?? '—'
            const findingKey = row.finding ? getComparisonFindingKey('bom', row.finding) : null
            const canSelectFinding = row.finding !== undefined && getCanonicalComparisonStatus(row.finding) !== null

            return (
              <tr key={current?.id ?? `removed-${reference?.id ?? index}`} className="hover:bg-slate-50/70 transition-colors">
                {selectionMode && (
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(findingKey && selectedFindingKeys?.has(findingKey))}
                      disabled={!canSelectFinding || !findingKey}
                      onChange={() => { if (findingKey) onToggleFinding?.(findingKey) }}
                      aria-label={`Include ${description} in Selected Comparison`}
                      title={canSelectFinding ? 'Include this finding in Selected Comparison' : 'This finding has no comparable business identity'}
                      className="h-4 w-4 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                    />
                  </td>
                )}
                <th scope="row" className="p-2.5 font-sans font-medium text-slate-800 min-w-[180px]" title={description}>
                  <div className="space-y-1">
                    <div>{description}</div>
                    {showComparison && <ComparisonFieldDetails finding={row.finding} fieldLabelOverrides={{ description: 'Name' }} />}
                  </div>
                </th>
                {showComparison && (
                  <td className="p-2.5 min-w-[120px]">
                    <div className="flex flex-col items-start gap-1.5">
                      {visibleLabel ? (
                        <span className={`inline-flex px-1.5 py-0.5 rounded border text-[11px] font-mono font-bold whitespace-nowrap ${comparisonClass(visibleLabel)}`}>
                          {visibleLabel}
                        </span>
                      ) : (
                        <span aria-label={label === 'UNCHANGED' ? 'Unchanged' : undefined} title={!row.finding || !label ? 'No comparable business identity; see validation warnings' : undefined}>
                          —
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatNullable(reference?.consumption ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatNullable(current?.consumption ?? null, value => formatNumber(value, 4))}</td>
                <td className="p-2.5 font-sans text-slate-600 whitespace-nowrap">{reference?.unit ?? '—'}</td>
                <td className="p-2.5 font-sans font-medium text-slate-800 whitespace-nowrap">{current?.unit ?? '—'}</td>
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
            <td colSpan={(showComparison ? 10 : 9) + Number(selectionMode)} className="p-2.5 text-right text-slate-700 uppercase tracking-wider text-[11px] font-sans">
              {isOnlyComparisonStatus(viewMode, 'CHANGED') ? 'Visible Changed Material (THB/pc)' : viewMode.length < 4 ? 'Visible Direct Material (THB/pc)' : 'Total Direct Material (THB/pc)'}
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
