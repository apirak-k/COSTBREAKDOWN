import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison, WorkCenterProcessingFinding } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { CBD_SUMMARY_FOOTER_LABEL_CLASS, CBD_SUMMARY_FOOTER_ROW_CLASS, CBD_SUMMARY_FOOTER_VALUE_CLASS } from './summary-table-styles'

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

const rowColumns = 'grid grid-cols-[24%_19%_19%_20%_18%] items-center'

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
    <section aria-label="Work Center" className="min-w-0 overflow-x-auto border border-slate-300 bg-white lg:h-full lg:overflow-hidden">
      <div role="table" aria-label="Work Center conversion cost for Reference, Current, Gap, and percentage of total Conversion Gap" aria-colcount={5} className="min-w-[520px] lg:grid lg:h-full lg:min-w-0 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        <div role="rowgroup" className="pr-0 lg:pr-[6px]">
          <div role="row" className={`${rowColumns} bg-slate-800 font-semibold text-white`}>
            <div role="columnheader" className="px-2 py-1.5 text-left">Work Center</div>
            <div role="columnheader" className="px-2 py-1.5 text-right">REF</div>
            <div role="columnheader" className="px-2 py-1.5 text-right">CUR</div>
            <div role="columnheader" className="px-2 py-1.5 text-right">GAP</div>
            <div role="columnheader" className="px-2 py-1.5 text-right">%GAP</div>
          </div>
        </div>
        <div role="rowgroup" data-wc-scroll-body="true" className="min-h-0 overflow-visible lg:overflow-x-hidden lg:overflow-y-auto [scrollbar-gutter:stable]">
          {rows.length === 0 ? <div role="row" className={rowColumns}><div role="cell" aria-colspan={5} className="col-span-5 px-2 py-3 text-center italic text-slate-500">No Work Center data.</div></div> : rows.map(({ finding, gap, percentage }) => {
            const label = finding.workCenterCode
            return <div role="row" key={finding.sourceId} className={`${rowColumns} divide-x-0 border-b border-slate-100 font-mono tabular-nums hover:bg-slate-50/70`}>
              <div role="rowheader" className="truncate px-2 py-1.5 text-left font-sans font-medium text-slate-800" title={label}>{label}</div>
              <div role="cell" className="px-2 py-1.5 text-right text-slate-600">{formatNullable(finding.costEffect.reference.total)}</div>
              <div role="cell" className="px-2 py-1.5 text-right text-slate-900">{formatNullable(finding.costEffect.current.total)}</div>
              <div role="cell" className="px-2 py-1.5 text-right">{renderGap(gap, label)}</div>
              <div role="cell" className="px-2 py-1.5 text-right text-slate-600">{percentage === null ? '—' : formatPercent(percentage, 2)}</div>
            </div>
          })}
        </div>
        <div role="rowgroup" className="pr-0 lg:pr-[6px]">
          <div role="row" className={`${rowColumns} h-[30px] ${CBD_SUMMARY_FOOTER_ROW_CLASS}`}>
            <div role="rowheader" className={`${CBD_SUMMARY_FOOTER_LABEL_CLASS} text-slate-950`}>Total</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-700`}>{formatNullable(totalReference)}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-950`}>{formatNullable(totalCurrent)}</div>
            <div role="cell" className={CBD_SUMMARY_FOOTER_VALUE_CLASS}>{renderGap(totalGap, 'Total')}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} whitespace-nowrap text-slate-700`}>{totalPercentage === null ? <span aria-label="Total percentage unavailable">— <span className="text-[9px] text-slate-500">Total</span></span> : <span aria-label={`${formatPercent(totalPercentage, 2)} Total`}>{formatPercent(totalPercentage, 2)} <span className="text-[9px] font-semibold text-slate-500">Total</span></span>}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
