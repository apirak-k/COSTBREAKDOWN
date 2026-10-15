import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison, WorkCenterProcessingFinding } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'
import {
  CBD_SUMMARY_BODY_GROUP_CLASS,
  CBD_SUMMARY_BODY_LABEL_CLASS,
  CBD_SUMMARY_BODY_ROW_CLASS,
  CBD_SUMMARY_BODY_VALUE_CLASS,
  CBD_WC_BODY_SCROLL_REGION,
  CBD_SUMMARY_FOOTER_LABEL_CLASS,
  CBD_SUMMARY_FOOTER_ROW_CLASS,
  CBD_SUMMARY_FOOTER_VALUE_CLASS,
  CBD_SUMMARY_HEADER_CELL_CLASS,
  CBD_SUMMARY_HEADER_CELL_STYLE,
  CBD_SUMMARY_HEADER_LABEL_CLASS,
  CBD_SUMMARY_HEADER_ROW_CLASS,
  CBD_SUMMARY_HEADER_VALUE_CLASS
} from './summary-table-styles'

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

const rowColumns = 'grid grid-cols-[24%_19%_19%_20%_18%] items-center lg:col-span-full'
const scrollBodyRowStyle: React.CSSProperties = { width: 'calc(100% + var(--cbd-wc-scrollbar-width, 0px))' }

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({ comparison }) => {
  const scrollBodyRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const body = scrollBodyRef.current
    if (!body) return

    const updateScrollbarWidth = () => {
      body.style.setProperty('--cbd-wc-scrollbar-width', `${body.offsetWidth - body.clientWidth}px`)
    }

    updateScrollbarWidth()
    const observer = new ResizeObserver(updateScrollbarWidth)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

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
    <section aria-label="Work Center" data-cbd-overview-panel="work-center" className="min-w-0 overflow-x-auto bg-white lg:h-full lg:overflow-hidden">
      <div role="table" aria-label="Work Center conversion cost for Reference, Current, Gap, and percentage of total Conversion Gap" aria-colcount={5} className="min-w-[520px] text-xs leading-4 lg:grid lg:h-full lg:min-w-0 lg:grid-cols-[24%_19%_19%_20%_18%] lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        <div role="rowgroup" className="bg-slate-800 lg:col-span-full lg:row-start-1 lg:grid lg:grid-cols-[subgrid] lg:overflow-hidden">
          <div role="row" className={`${rowColumns} ${CBD_SUMMARY_HEADER_ROW_CLASS}`}>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_LABEL_CLASS}`}>Work Center</div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}>REF</div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}>CUR</div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}>GAP</div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS} pr-4`}>%GAP</div>
          </div>
        </div>
        <div ref={scrollBodyRef} role="rowgroup" data-wc-scroll-body="true" className={`${CBD_SUMMARY_BODY_GROUP_CLASS} ${CBD_WC_BODY_SCROLL_REGION}`}>
          {rows.length === 0 ? <div role="row" style={scrollBodyRowStyle} className={rowColumns}><div role="cell" aria-colspan={5} className="col-span-5 px-2 py-3 text-center italic text-slate-500">No Work Center data.</div></div> : rows.map(({ finding, gap, percentage }) => {
            const label = finding.workCenterCode
            return <div role="row" key={finding.sourceId} style={scrollBodyRowStyle} className={`${rowColumns} ${CBD_SUMMARY_BODY_ROW_CLASS}`}>
              <div role="rowheader" className={`${CBD_SUMMARY_BODY_LABEL_CLASS} truncate`} title={label}>{label}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-600`}>{formatNullable(finding.costEffect.reference.total)}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-900`}>{formatNullable(finding.costEffect.current.total)}</div>
              <div role="cell" className={CBD_SUMMARY_BODY_VALUE_CLASS}>{renderGap(gap, label)}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} pr-4 text-slate-600`}>{percentage === null ? '—' : formatPercent(percentage, 2)}</div>
            </div>
          })}
        </div>
        <div role="rowgroup" className="bg-slate-100 lg:col-span-full lg:row-start-3 lg:grid lg:grid-cols-[subgrid] lg:overflow-hidden">
          <div role="row" className={`${rowColumns} ${CBD_SUMMARY_FOOTER_ROW_CLASS}`}>
            <div role="rowheader" className={`${CBD_SUMMARY_FOOTER_LABEL_CLASS} text-slate-950`}>Total</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-700`}>{formatNullable(totalReference)}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-950`}>{formatNullable(totalCurrent)}</div>
            <div role="cell" className={CBD_SUMMARY_FOOTER_VALUE_CLASS}>{renderGap(totalGap, 'Total')}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} pr-4 whitespace-nowrap text-slate-700`}>{totalPercentage === null ? <span aria-label="Total percentage unavailable">— <span className="text-[9px] text-slate-500">Total</span></span> : <span aria-label={`${formatPercent(totalPercentage, 2)} Total`}>{formatPercent(totalPercentage, 2)} <span className="text-[9px] font-semibold text-slate-500">Total</span></span>}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
