import React from 'react'
import {
  ComparisonFinding,
  SnapshotWorkCenterRate,
  formatNumber,
  formatVariance
} from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'

interface WorkCenterComparisonTableProps {
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
  findings: ComparisonFinding[]
}

export function getWorkCenterComparisonLabel(finding: ComparisonFinding): 'Matched' | 'Changed Rate' | 'Added' | 'Removed' | 'Review' {
  if (finding.matchStatus === 'added') return 'Added'
  if (finding.matchStatus === 'removed') return 'Removed'
  if (finding.matchStatus !== 'matched') return 'Review'
  return finding.changeFlags.changedRate ? 'Changed Rate' : 'Matched'
}

function comparisonClass(label: ReturnType<typeof getWorkCenterComparisonLabel>): string {
  if (label === 'Matched') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'Changed Rate') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'Added') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'Removed') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

function formatRate(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : formatNumber(value, 2)
}

function formatRateGap(reference: number | null | undefined, current: number | null | undefined): string {
  if (reference === null || reference === undefined || current === null || current === undefined) return '—'
  return formatVariance(current - reference, 2)
}

function gapClass(reference: number | null | undefined, current: number | null | undefined): string {
  if (reference === null || reference === undefined || current === null || current === undefined) return 'text-slate-400'
  if (Math.abs(current - reference) < 0.00005) return 'text-slate-400'
  return current > reference ? 'text-rose-600' : 'text-emerald-700'
}

export const WorkCenterComparisonTable: React.FC<WorkCenterComparisonTableProps> = ({
  referenceRates,
  currentRates,
  findings
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
      .filter(finding => finding.matchStatus === 'removed')
      .map(finding => ({
        current: undefined,
        reference: finding.referenceId ? referenceById.get(finding.referenceId) : undefined,
        finding
      }))
  ]

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[980px] text-xs text-left">
        <caption className="sr-only">Reference and current Work Center rate comparison</caption>
        <thead>
          <tr className="bg-slate-900 text-white font-sans font-semibold text-[11px]">
            <th scope="col" className="p-2.5">Work Center</th>
            <th scope="col" className="p-2.5">Description</th>
            <th scope="col" className="p-2.5">Comparison</th>
            <th scope="col" className="p-2.5">Confidence</th>
            <th scope="col" className="p-2.5 text-right">Labor Ref</th>
            <th scope="col" className="p-2.5 text-right">Labor Current</th>
            <th scope="col" className="p-2.5 text-right">Labor Δ</th>
            <th scope="col" className="p-2.5 text-right">Burden Ref</th>
            <th scope="col" className="p-2.5 text-right">Burden Current</th>
            <th scope="col" className="p-2.5 text-right">Burden Δ</th>
            <th scope="col" className="p-2.5">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-6 text-center text-slate-400 font-sans italic">
                No Work Center rates configured.
              </td>
            </tr>
          ) : rows.map(row => {
            const label = row.finding ? getWorkCenterComparisonLabel(row.finding) : 'Review'
            const workCenterCode = row.current?.workCenterCode ?? row.reference?.workCenterCode ?? 'Unknown'
            const description = row.current?.description ?? row.reference?.description ?? '—'
            const source = row.current?.sourceRef ?? row.reference?.sourceRef ?? '—'

            return (
              <tr key={row.current?.id ?? `removed-${row.reference?.id ?? workCenterCode}`} className={`hover:bg-slate-50/70 transition-colors ${label === 'Removed' ? 'bg-rose-50/60' : ''}`}>
                <th scope="row" className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{workCenterCode}</th>
                <td className="p-2.5 font-sans text-slate-700">{description}</td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-sm border text-[10px] font-sans font-semibold ${comparisonClass(label)}`}>
                    {label}
                  </span>
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  <ConfidenceBadge status={row.finding?.confidence ?? 'missing'} showLabel />
                </td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatRate(row.reference?.laborRate)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatRate(row.current?.laborRate)}</td>
                <td className={`p-2.5 text-right font-mono font-bold tabular-nums ${gapClass(row.reference?.laborRate, row.current?.laborRate)}`}>
                  {formatRateGap(row.reference?.laborRate, row.current?.laborRate)}
                </td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatRate(row.reference?.burdenRate)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatRate(row.current?.burdenRate)}</td>
                <td className={`p-2.5 text-right font-mono font-bold tabular-nums ${gapClass(row.reference?.burdenRate, row.current?.burdenRate)}`}>
                  {formatRateGap(row.reference?.burdenRate, row.current?.burdenRate)}
                </td>
                <td className="p-2.5 font-sans text-[10px] text-slate-500 whitespace-nowrap">{source}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
