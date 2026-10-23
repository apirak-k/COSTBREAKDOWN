import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison, WorkCenterProcessingFinding } from '../../../core'
import { SelectedNumber } from '../../../shared/ui/selected-value'
import { NumericColumnHeader } from '../../../shared/ui/NumericColumnHeader'
import {
  CBD_SUMMARY_PANEL_CLASS,
  CBD_SUMMARY_TABLE_CLASS,
  CBD_SUMMARY_ROW_CLASS,
  CBD_SUMMARY_HEADER_GROUP_CLASS,
  CBD_SUMMARY_FOOTER_GROUP_CLASS,
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
  gapDirection: string
  pairFingerprint?: string
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

function renderGap(value: number | null, label: string, gapDirection: string, pairFingerprint: string, sourceId: string): React.ReactNode {
  const accessibleLabel = `${label} Gap ${formatGap(value)}; Gap = ${gapDirection}`
  const className = `font-mono tabular-nums whitespace-nowrap ${value === null || !Number.isFinite(value) ? 'text-slate-400' : getVarianceClass(value)}`
  const alignedClassName = `block w-full text-right ${className}`
  if (value === null || !Number.isFinite(value)) {
    return <span tabIndex={0} aria-label={accessibleLabel} className={alignedClassName}>{formatGap(value)}</span>
  }
  return <SelectedNumber numericColumn signPositive
    value={value}
    selectionId={`cbd:${pairFingerprint}:work-center:${sourceId}:gap`}
    aria-label={accessibleLabel}
    className={`text-right ${className}`}
  >{formatGap(value)}</SelectedNumber>
}

function renderValue(value: number | null, label: string, selectionId: string, className: string): React.ReactNode {
  const ariaLabel = `${label} ${formatNullable(value)}`
  if (value === null || !Number.isFinite(value)) {
    return <span tabIndex={0} aria-label={ariaLabel} className={`block w-full text-right ${className}`}>{formatNullable(value)}</span>
  }
  return <SelectedNumber numericColumn value={value} selectionId={selectionId} aria-label={ariaLabel} className={`text-right ${className}`}>{formatNullable(value)}</SelectedNumber>
}

function renderPercentage(value: number | null, label: string, selectionId: string, className: string): React.ReactNode {
  const display = value === null || !Number.isFinite(value) ? '—' : formatPercent(value, 2)
  const ariaLabel = `${label} ${display}`
  if (value === null || !Number.isFinite(value)) {
    return <span aria-label={ariaLabel} className={`block w-full text-right ${className}`}>{display}</span>
  }
  return <SelectedNumber numericColumn value={value * 100} percentage selectionId={selectionId} aria-label={ariaLabel} className={`text-right ${className}`}>{display}</SelectedNumber>
}

function conversionTotal(labor: number | null, burden: number | null): number | null {
  return safeAdd(labor ?? Number.NaN, burden ?? Number.NaN)
}

const rowColumns = CBD_SUMMARY_ROW_CLASS
// Align fixed rows to the body's real content width, without hiding cells under its scrollbar.
const fixedRowStyle: React.CSSProperties = { width: 'calc(100% - var(--cbd-wc-scrollbar-width, 0px))' }

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({ comparison, gapDirection, pairFingerprint = 'unscoped' }) => {
  const scrollBodyRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const body = scrollBodyRef.current
    if (!body) return

    const updateScrollbarWidth = () => {
      body.parentElement?.style.setProperty('--cbd-wc-scrollbar-width', `${body.offsetWidth - body.clientWidth}px`)
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
    <section aria-label="Work Center" data-cbd-overview-panel="work-center" className={CBD_SUMMARY_PANEL_CLASS}>
      <div role="table" aria-label={`Work Center conversion cost for Before, After, Gap, and percentage of total Conversion Gap. Gap = ${gapDirection}.`} aria-colcount={5} style={{ '--cbd-summary-columns': '24% 19% 19% 20% 18%' } as React.CSSProperties} className={CBD_SUMMARY_TABLE_CLASS}>
        <div role="rowgroup" data-cbd-summary-header="true" className={CBD_SUMMARY_HEADER_GROUP_CLASS}>
          <div role="row" style={fixedRowStyle} className={`${rowColumns} ${CBD_SUMMARY_HEADER_ROW_CLASS}`}>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_LABEL_CLASS}`}>Work Center</div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><NumericColumnHeader>Before</NumericColumnHeader></div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><NumericColumnHeader>After</NumericColumnHeader></div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><NumericColumnHeader>GAP</NumericColumnHeader></div>
            <div role="columnheader" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><span className="grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1"><NumericColumnHeader>%GAP</NumericColumnHeader><span aria-hidden="true" /></span></div>
          </div>
        </div>
        <div ref={scrollBodyRef} role="rowgroup" data-wc-scroll-body="true" data-cbd-summary-body="true" className={`${CBD_SUMMARY_BODY_GROUP_CLASS} ${CBD_WC_BODY_SCROLL_REGION}`}>
          {rows.length === 0 ? <div role="row" className={rowColumns}><div role="cell" aria-colspan={5} className="col-span-5 px-2 py-3 text-center italic text-slate-500">No Work Center data.</div></div> : rows.map(({ finding, gap, percentage }) => {
            const label = finding.workCenterCode
            return <div role="row" key={finding.sourceId} className={`${rowColumns} ${CBD_SUMMARY_BODY_ROW_CLASS}`}>
              <div role="rowheader" className={`${CBD_SUMMARY_BODY_LABEL_CLASS} truncate`} title={label}>{label}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-600`}>{renderValue(finding.costEffect.reference.total, `${label} Before`, `cbd:${pairFingerprint}:work-center:${finding.sourceId}:before`, 'text-slate-600')}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-900`}>{renderValue(finding.costEffect.current.total, `${label} After`, `cbd:${pairFingerprint}:work-center:${finding.sourceId}:after`, 'text-slate-900')}</div>
              <div role="cell" className={CBD_SUMMARY_BODY_VALUE_CLASS}>{renderGap(gap, label, gapDirection, pairFingerprint, finding.sourceId)}</div>
              <div role="cell" className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-600`}>{renderPercentage(percentage, `${label} percent Gap`, `cbd:${pairFingerprint}:work-center:${finding.sourceId}:percent-gap`, 'text-slate-600')}</div>
            </div>
          })}
        </div>
        <div role="rowgroup" data-cbd-summary-footer="true" className={CBD_SUMMARY_FOOTER_GROUP_CLASS}>
          <div role="row" style={fixedRowStyle} className={`${rowColumns} ${CBD_SUMMARY_FOOTER_ROW_CLASS}`}>
            <div role="rowheader" className={`${CBD_SUMMARY_FOOTER_LABEL_CLASS} text-slate-950`}>Total</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-700`}>{renderValue(totalReference, 'Work Center Total Before', `cbd:${pairFingerprint}:work-center:total:before`, 'text-slate-700')}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-950`}>{renderValue(totalCurrent, 'Work Center Total After', `cbd:${pairFingerprint}:work-center:total:after`, 'text-slate-950')}</div>
            <div role="cell" className={CBD_SUMMARY_FOOTER_VALUE_CLASS}>{renderGap(totalGap, 'Total', gapDirection, pairFingerprint, 'total')}</div>
            <div role="cell" className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} whitespace-nowrap text-slate-700`}>
              <SelectedNumber numericColumn value={totalPercentage === null ? null : totalPercentage * 100} percentage leadingAnnotation={<span data-cbd-total-annotation="true" className="font-sans text-[9px] font-semibold text-slate-500">Total</span>} selectionId={`cbd:${pairFingerprint}:work-center:total:percent-gap`} aria-label={`Work Center Total percent Gap ${totalPercentage === null ? '—' : formatPercent(totalPercentage, 2)}`} className="text-right text-slate-700">{totalPercentage === null ? '—' : formatPercent(totalPercentage, 2)}</SelectedNumber>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
