import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison, WorkCenterProcessingFinding } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'

interface WorkCenterProcessingTableProps {
  comparison: CostComparison
}

interface WorkCenterRow {
  finding: WorkCenterProcessingFinding
  gap: number | null
  percentage: number | null
}

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 2)
}

function formatGap(value: number | null): string {
  return value === null ? '—' : formatVariance(value, 2)
}

function renderGap(value: number | null, label: string): React.ReactNode {
  return <Tooltip label={`${label} Gap ${formatGap(value)}`} wrapperClassName="inline-flex justify-end">
    <span tabIndex={0} aria-label={`${label} Gap ${formatGap(value)}`} className={`font-mono tabular-nums whitespace-nowrap ${value === null ? 'text-slate-400' : getVarianceClass(value)}`}>
      {formatGap(value)}
    </span>
  </Tooltip>
}

function conversionTotal(labor: number | null, burden: number | null): number | null {
  return safeAdd(labor ?? Number.NaN, burden ?? Number.NaN)
}

const columnWidths = <colgroup><col className="w-[32%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[20%]" /><col className="w-[14%]" /></colgroup>

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({ comparison }) => {
  const rows: WorkCenterRow[] = comparison.processingFindings
    .map(finding => {
      const gap = finding.costEffect.gap.total
      return {
        finding,
        gap,
        percentage: gap === null ? null : safeDivide(gap, comparison.elementGaps.labor === null || comparison.elementGaps.burden === null
          ? Number.NaN
          : safeAdd(comparison.elementGaps.labor, comparison.elementGaps.burden) ?? Number.NaN)
      }
    })
    .sort((left, right) => {
      if (left.gap === null) return right.gap === null ? left.finding.workCenterCode.localeCompare(right.finding.workCenterCode) : 1
      if (right.gap === null) return -1
      return Math.abs(right.gap) - Math.abs(left.gap) || left.finding.workCenterCode.localeCompare(right.finding.workCenterCode)
    })

  const totalReference = conversionTotal(comparison.referenceCost.labor, comparison.referenceCost.burden)
  const totalCurrent = conversionTotal(comparison.currentCost.labor, comparison.currentCost.burden)
  const totalGap = conversionTotal(comparison.elementGaps.labor, comparison.elementGaps.burden)
  const totalPercentage = totalGap === null ? null : safeDivide(totalGap, totalReference ?? Number.NaN)

  return (
    <section aria-label="Work Center" className="flex h-44 min-h-0 min-w-0 flex-col overflow-hidden border border-slate-300 bg-white">
      <div data-wc-scroll-body="true" className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="h-full w-full min-w-[500px] table-fixed border-separate border-spacing-0 text-left text-xs">
          {columnWidths}
          <caption className="sr-only">Work Center conversion cost for Reference, Current, Gap, and percentage of total Conversion Gap</caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="px-2 py-1.5 text-left">Work Center</th>
              <th scope="col" className="px-2 py-1.5 text-right">REF</th>
              <th scope="col" className="px-2 py-1.5 text-right">CUR</th>
              <th scope="col" className="px-2 py-1.5 text-right">GAP</th>
              <th scope="col" className="px-2 py-1.5 text-right">%GAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.length === 0 ? <tr><td colSpan={5} className="px-2 py-3 text-center font-sans italic text-slate-500">No Work Center data.</td></tr> : rows.map(({ finding, gap, percentage }) => {
              const label = finding.workCenterCode
              return <tr key={finding.sourceId} className="hover:bg-slate-50/70">
                <th scope="row" className="truncate px-2 py-1.5 text-left font-sans font-medium text-slate-800" title={label}>{label}</th>
                <td className="px-2 py-1.5 text-right text-slate-600">{formatNullable(finding.costEffect.reference.total)}</td>
                <td className="px-2 py-1.5 text-right text-slate-900">{formatNullable(finding.costEffect.current.total)}</td>
                <td className="px-2 py-1.5 text-right">{renderGap(gap, `${label}`)}</td>
                <td className="px-2 py-1.5 text-right text-slate-600">{percentage === null ? '—' : formatPercent(percentage, 2)}</td>
              </tr>
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 border-t-2 border-slate-300 bg-slate-100 font-semibold font-mono tabular-nums">
            <tr>
              <th scope="row" className="px-2 py-1.5 text-left font-sans text-slate-950">Total</th>
              <td className="px-2 py-1.5 text-right text-slate-700">{formatNullable(totalReference)}</td>
              <td className="px-2 py-1.5 text-right text-slate-950">{formatNullable(totalCurrent)}</td>
              <td className="px-2 py-1.5 text-right">{renderGap(totalGap, 'Total')}</td>
              <td className="px-2 py-1.5 text-right text-slate-700 whitespace-nowrap">{totalPercentage === null ? <span aria-label="Total percentage unavailable">— <span className="text-[9px] text-slate-500">Total</span></span> : <span aria-label={`${formatPercent(totalPercentage, 2)} Total`}>{formatPercent(totalPercentage, 2)} <span className="text-[9px] font-semibold text-slate-500">Total</span></span>}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
