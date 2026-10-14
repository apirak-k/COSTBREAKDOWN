import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison, WorkCenterProcessingFinding } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'

interface WorkCenterProcessingTableProps {
  comparison: CostComparison
  selectedComparison?: CostComparison | null
  selectedActive?: boolean
}

interface WorkCenterRow {
  finding: WorkCenterProcessingFinding
  gap: number | null
  selectedGap: number | null
  percentage: number | null
}

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 2)
}

function formatGap(value: number | null): string {
  return value === null ? '—' : formatVariance(value, 2)
}

function normalizedWorkCenterCode(code: string): string {
  return code.trim().toLocaleLowerCase()
}

function renderGap(value: number | null, selectedValue: number | null, selectedActive: boolean, label: string): React.ReactNode {
  const tooltipLines = [`${label} Gap ${formatGap(value)}`]
  if (selectedActive) tooltipLines.push(`Selected (${formatGap(selectedValue)})`)
  return (
    <Tooltip label={tooltipLines.join('\n')} wrapperClassName="inline-flex justify-end">
      <span tabIndex={0} aria-label={`${label} Gap ${formatGap(value)}${selectedActive ? `; Selected (${formatGap(selectedValue)})` : ''}`} className="inline-flex items-baseline gap-1 whitespace-nowrap">
        <span className={value === null ? 'text-slate-400' : getVarianceClass(value)}>{formatGap(value)}</span>
        {selectedActive && <span className="text-[10px] font-normal text-slate-500">({formatGap(selectedValue)})</span>}
      </span>
    </Tooltip>
  )
}

function conversionTotal(labor: number | null, burden: number | null): number | null {
  return safeAdd(labor ?? Number.NaN, burden ?? Number.NaN)
}

const columnWidths = <colgroup><col className="w-[32%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[20%]" /><col className="w-[14%]" /></colgroup>

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({
  comparison,
  selectedComparison = null,
  selectedActive = false
}) => {
  const selectedByCode = new Map(
    (selectedActive ? selectedComparison?.processingFindings ?? [] : [])
      .map(finding => [normalizedWorkCenterCode(finding.workCenterCode), finding] as const)
  )
  const rows: WorkCenterRow[] = comparison.processingFindings
    .map(finding => {
      const selectedFinding = selectedByCode.get(normalizedWorkCenterCode(finding.workCenterCode))
      const gap = finding.costEffect.gap.total
      return {
        finding,
        gap,
        selectedGap: selectedActive ? (selectedFinding ? selectedFinding.costEffect.gap.total : 0) : null,
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
  const selectedTotalGap = selectedActive && selectedComparison
    ? conversionTotal(selectedComparison.elementGaps.labor, selectedComparison.elementGaps.burden)
    : null
  const totalPercentage = totalGap === null ? null : safeDivide(totalGap, totalReference ?? Number.NaN)
  const activeGapLabel = selectedActive ? <>GAP <span className="text-[10px] font-normal text-slate-300">(Selected)</span></> : 'GAP'

  return (
    <section aria-label="Work Center comparison" className="flex h-44 min-h-0 min-w-0 flex-col overflow-hidden border border-slate-300 bg-white">
      <div className="shrink-0 overflow-x-auto">
        <table className="w-full min-w-[500px] table-fixed text-left text-xs">
          {columnWidths}
          <thead><tr className="bg-slate-800 font-semibold text-white">
            <th scope="col" className="px-2 py-1.5">WC</th>
            <th scope="col" className="px-2 py-1.5 text-right">REF</th>
            <th scope="col" className="px-2 py-1.5 text-right">CUR</th>
            <th scope="col" className="px-2 py-1.5 text-right">{activeGapLabel}</th>
            <th scope="col" className="px-2 py-1.5 text-right">%GAP</th>
          </tr></thead>
        </table>
      </div>
      <div data-wc-scroll-body="true" className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[500px] table-fixed text-left text-xs">
          {columnWidths}
          <caption className="sr-only">Conversion Cost by Work Center for Reference, Current, Gap, and percentage of total Conversion Gap</caption>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.length === 0 ? <tr><td colSpan={5} className="px-2 py-3 text-center font-sans italic text-slate-500">No Work Center data.</td></tr> : rows.map(({ finding, gap, selectedGap, percentage }) => {
              const label = finding.workCenterCode
              return <tr key={finding.sourceId} className="hover:bg-slate-50/70">
                <th scope="row" className="truncate px-2 py-1.5 text-left font-sans font-medium text-slate-800" title={label}>{label}</th>
                <td className="px-2 py-1.5 text-right text-slate-600">{formatNullable(finding.costEffect.reference.total)}</td>
                <td className="px-2 py-1.5 text-right text-slate-900">{formatNullable(finding.costEffect.current.total)}</td>
                <td className="px-2 py-1.5 text-right">{renderGap(gap, selectedGap, selectedActive, `${label}`)}</td>
                <td className="px-2 py-1.5 text-right text-slate-600">{percentage === null ? '—' : formatPercent(percentage, 2)}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t-2 border-slate-300 bg-slate-100 overflow-x-auto">
        <table className="w-full min-w-[500px] table-fixed text-left text-xs">
          {columnWidths}
          <tfoot className="font-semibold font-mono tabular-nums">
            <tr>
              <th scope="row" className="px-2 py-1.5 text-left font-sans text-slate-950">Total</th>
              <td className="px-2 py-1.5 text-right text-slate-700">{formatNullable(totalReference)}</td>
              <td className="px-2 py-1.5 text-right text-slate-950">{formatNullable(totalCurrent)}</td>
              <td className="px-2 py-1.5 text-right">{renderGap(totalGap, selectedTotalGap, selectedActive, 'Total')}</td>
              <td className="px-2 py-1.5 text-right text-slate-700">{totalPercentage === null ? '—' : formatPercent(totalPercentage, 2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
