import React from 'react'
import {
  ComparisonFinding,
  SnapshotWorkCenterRate,
  exactDecimalToNumber,
  resolveExactDecimalInputPair,
  subtractExactDecimals,
  getComparisonStatusLabels
} from '../../../core'
import type { ComparisonStatus } from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'
import { ALL_COMPARISON_STATUSES, isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'
import { ComparisonFieldDetails } from './ComparisonFieldDetails'
import { DataQualityPairBadge } from './DataQualityPairBadge'
import { formatBusinessNumber } from '../../../shared/ui/numeric-display'

interface WorkCenterComparisonTableProps {
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
  findings: ComparisonFinding[]
  viewMode?: ComparisonViewMode
  contextOnly?: boolean
}

export function getWorkCenterComparisonLabel(finding: ComparisonFinding): ComparisonStatus | null {
  return getComparisonStatusLabels(finding)[0] ?? null
}

function comparisonClass(label: ReturnType<typeof getWorkCenterComparisonLabel>): string {
  if (label === 'UNCHANGED') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'CHANGED') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'ADDED') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'REMOVED') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

function formatRate(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : formatBusinessNumber(value)
}

type RateField = 'laborRate' | 'burdenRate'

function rateGap(reference: SnapshotWorkCenterRate | undefined, current: SnapshotWorkCenterRate | undefined, field: RateField): number | null {
  if (!reference || !current) return null
  const pair = resolveExactDecimalInputPair(
    reference[field], reference.exactDecimalInputs?.[field],
    current[field], current.exactDecimalInputs?.[field],
    false, { allowOneSidedNumberProjectionMatch: true }
  )
  if (!pair.reference || !pair.current) return null
  return exactDecimalToNumber(subtractExactDecimals(pair.current, pair.reference))
}

function formatRateGap(value: number | null): string {
  return value === null ? '—' : formatBusinessNumber(value, { signPositive: true })
}

function gapClass(value: number | null): string {
  if (value === null || value === 0) return 'text-slate-400'
  return value > 0 ? 'text-rose-600' : 'text-emerald-700'
}

export const WorkCenterComparisonTable: React.FC<WorkCenterComparisonTableProps> = ({
  referenceRates,
  currentRates,
  findings,
  viewMode = ALL_COMPARISON_STATUSES,
  contextOnly = false
}) => {
  const referenceById = new Map(referenceRates.map(rate => [rate.id, rate]))
  const findingByCurrentId = new Map(
    findings
      .filter(finding => finding.currentId)
      .map(finding => [finding.currentId as string, finding])
  )

  const rows = [
    ...currentRates.map(rate => ({
      current: rate,
      reference: (() => {
        const finding = findingByCurrentId.get(rate.id)
        return finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
      })(),
      finding: findingByCurrentId.get(rate.id)
    })),
    ...findings
      .filter(finding => !finding.currentId && finding.referenceId)
      .map(finding => ({
        current: undefined,
        reference: finding.referenceId ? referenceById.get(finding.referenceId) : undefined,
        finding
      }))
  ]
  const visibleRows = contextOnly ? rows : rows.filter(row => isVisibleInComparisonView(row.finding, viewMode))

  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full ${contextOnly ? 'min-w-[660px]' : 'min-w-[1120px]'} text-left text-xs`}>
        <caption className="sr-only">
          {contextOnly
            ? 'All Before and After Work Center rates retained as Selected Comparison calculation context; rate gaps are not shown.'
            : 'Before and After Work Center rate comparison'}
        </caption>
        <thead>
          <tr className="bg-slate-800 text-xs font-semibold text-white">
            <th scope="col" className="p-2.5">Work Center</th>
            <th scope="col" className="p-2.5">Description</th>
            {!contextOnly && <th scope="col" className="p-2.5">Comparison</th>}
            {!contextOnly && <th scope="col" className="p-2.5">Confidence</th>}
            {!contextOnly && <th scope="col" className="p-2.5">Data Quality</th>}
            <th scope="col" className="p-2.5 text-right">Labor Before</th>
            <th scope="col" className="p-2.5 text-right">Labor After</th>
            {!contextOnly && <th scope="col" className="p-2.5 text-right">Labor Δ</th>}
            <th scope="col" className="p-2.5 text-right">Burden Before</th>
            <th scope="col" className="p-2.5 text-right">Burden After</th>
            {!contextOnly && <th scope="col" className="p-2.5 text-right">Burden Δ</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={contextOnly ? 6 : 11} className="p-6 text-center text-slate-400 font-sans italic">
                No Work Center rates configured.
              </td>
            </tr>
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={contextOnly ? 6 : 11} className="p-6 text-center text-slate-400 font-sans italic">
                No rows match this comparison view.
              </td>
            </tr>
          ) : visibleRows.map(row => {
            const label = row.finding ? getWorkCenterComparisonLabel(row.finding) : null
            const visibleLabel = label === 'UNCHANGED' ? null : label
            const workCenterCode = row.current ? row.current.workCenterCode || '—' : row.reference?.workCenterCode ?? 'Unknown'
            const description = row.current ? row.current.description || '—' : row.reference?.description ?? '—'
            const laborGap = rateGap(row.reference, row.current, 'laborRate')
            const burdenGap = rateGap(row.reference, row.current, 'burdenRate')

            return (
              <tr key={row.current?.id ?? `removed-${row.reference?.id ?? workCenterCode}`} className={`hover:bg-slate-50/70 transition-colors ${!contextOnly && label === 'REMOVED' ? 'bg-rose-50/60' : ''}`}>
                <th scope="row" className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{workCenterCode}</th>
                <td className="p-2.5 font-sans text-slate-700">{description}</td>
                {!contextOnly && <td className="p-2.5">
                  <div className="flex flex-col items-start gap-1.5">
                    {visibleLabel ? (
                      <span className={`inline-flex px-1.5 py-0.5 rounded border text-[11px] font-mono font-bold ${comparisonClass(visibleLabel)}`}>
                        {visibleLabel}
                      </span>
                    ) : (
                      <span aria-label={label === 'UNCHANGED' ? 'Unchanged' : undefined} title={!row.finding || !label ? 'No comparable business identity; see validation warnings' : undefined}>
                        —
                      </span>
                    )}
                    <ComparisonFieldDetails finding={row.finding} />
                  </div>
                </td>}
                {!contextOnly && <td className="p-2.5 whitespace-nowrap">
                  <ConfidenceBadge status={row.finding?.confidence ?? 'missing'} showLabel />
                </td>}
                {!contextOnly && <td className="p-2.5"><DataQualityPairBadge reference={row.reference} current={row.current} /></td>}
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatRate(row.reference?.laborRate)}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatRate(row.current?.laborRate)}</td>
                {!contextOnly && <td className={`p-2.5 text-right font-bold tabular-nums ${gapClass(laborGap)}`}>
                  {formatRateGap(laborGap)}
                </td>}
                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatRate(row.reference?.burdenRate)}</td>
                <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">{formatRate(row.current?.burdenRate)}</td>
                {!contextOnly && <td className={`p-2.5 text-right font-bold tabular-nums ${gapClass(burdenGap)}`}>
                  {formatRateGap(burdenGap)}
                </td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
