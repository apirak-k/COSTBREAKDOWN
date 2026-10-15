import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { COST_ELEMENT_COLORS } from './cost-element-colors'
import { CBD_SUMMARY_FOOTER_LABEL_CLASS, CBD_SUMMARY_FOOTER_ROW_CLASS, CBD_SUMMARY_FOOTER_VALUE_CLASS } from './summary-table-styles'

interface SnapshotComparisonCardProps {
  comparison: CostComparison
  selectedComparison?: CostComparison | null
  selectedActive?: boolean
}

type CostRow = {
  label: 'Material' | 'Labor' | 'Burden' | 'Standard Cost'
  tooltipLabel: string
  reference: number | null
  current: number | null
  gap: number | null
  selectedGap: number | null
  percentage: number | null
  total?: boolean
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 2)
const formatGap = (value: number | null): string => value === null ? '—' : formatVariance(value, 2)

function renderGap(value: number | null, selectedValue: number | null, selectedActive: boolean, tooltipLabel: string): React.ReactNode {
  const tooltipLines = [`${tooltipLabel} Gap ${formatGap(value)}`]
  if (selectedActive) tooltipLines.push(`Selected ${formatGap(selectedValue)}`)
  return (
    <Tooltip label={tooltipLines.join('\n')} wrapperClassName="flex w-full justify-end">
      <span tabIndex={0} aria-label={`${tooltipLabel} Gap ${formatGap(value)}${selectedActive ? `; Selected ${formatGap(selectedValue)}` : ''}`} className="grid w-full grid-cols-[minmax(0,1fr)_9ch] items-baseline whitespace-nowrap font-mono tabular-nums">
        <span data-gap-slot="full" className={`text-right ${value === null ? 'text-slate-400' : getVarianceClass(value)}`}>{formatGap(value)}</span>
        <span data-gap-slot="selected" aria-hidden={!selectedActive} className={`w-[9ch] text-right text-[10px] font-normal text-slate-500 tabular-nums ${selectedActive ? '' : 'invisible'}`}>
          {selectedActive ? formatGap(selectedValue) : '0.00'}
        </span>
      </span>
    </Tooltip>
  )
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({
  comparison,
  selectedComparison = null,
  selectedActive = false
}) => {
  const selectedElementGaps = selectedActive ? selectedComparison?.elementGaps : null
  const selectedTotalGap = selectedActive && selectedElementGaps
    ? safeAdd(selectedElementGaps.material ?? Number.NaN, selectedElementGaps.labor ?? Number.NaN, selectedElementGaps.burden ?? Number.NaN)
    : null
  const rows: CostRow[] = [
    {
      label: 'Material', tooltipLabel: 'Material',
      reference: comparison.referenceCost.material,
      current: comparison.currentCost.material,
      gap: comparison.elementGaps.material,
      selectedGap: selectedElementGaps?.material ?? null,
      percentage: comparison.elementGaps.material === null
        ? null
        : safeDivide(comparison.elementGaps.material, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Labor', tooltipLabel: 'Labor',
      reference: comparison.referenceCost.labor,
      current: comparison.currentCost.labor,
      gap: comparison.elementGaps.labor,
      selectedGap: selectedElementGaps?.labor ?? null,
      percentage: comparison.elementGaps.labor === null
        ? null
        : safeDivide(comparison.elementGaps.labor, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Burden', tooltipLabel: 'Burden',
      reference: comparison.referenceCost.burden,
      current: comparison.currentCost.burden,
      gap: comparison.elementGaps.burden,
      selectedGap: selectedElementGaps?.burden ?? null,
      percentage: comparison.elementGaps.burden === null
        ? null
        : safeDivide(comparison.elementGaps.burden, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Standard Cost', tooltipLabel: 'Standard Cost',
      reference: comparison.referenceCost.total,
      current: comparison.currentCost.total,
      gap: comparison.totalGap,
      selectedGap: selectedTotalGap,
      percentage: comparison.totalGap === null
        ? null
        : safeDivide(comparison.totalGap, comparison.referenceCost.total ?? Number.NaN),
      total: true
    }
  ]

  return (
    <section aria-label="Cost Element" className="min-w-0 overflow-hidden border border-slate-300 bg-white lg:h-full">
      <div className="w-full overflow-x-auto lg:h-full">
        <table className="w-full min-w-[480px] table-fixed text-left text-xs lg:h-full">
          <caption className="sr-only">Cost Element for Reference, Current, Gap, and Gap percentage</caption>
          <colgroup><col className="w-[20%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[26%]" /><col className="w-[18%]" /></colgroup>
          <thead>
            <tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="px-2 py-1.5">Cost Element</th>
              <th scope="col" className="px-2 py-1.5 text-right">REF</th>
              <th scope="col" className="px-2 py-1.5 text-right">CUR</th>
              <th scope="col" className="px-2 py-1.5"><span className="grid w-full grid-cols-[minmax(0,1fr)_9ch] items-baseline font-mono text-[12px] tabular-nums"><span data-gap-header-slot="full" className="text-right text-[11px]">GAP</span><span data-gap-header-slot="selected" aria-hidden={!selectedActive} className={`relative left-2 w-[9ch] whitespace-nowrap text-right text-[10px] font-normal text-slate-300 ${selectedActive ? '' : 'invisible'}`}>Selected</span></span></th>
              <th scope="col" className="px-2 py-1.5 text-right">%GAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.slice(0, 3).map(row => <tr key={row.label}>
              <th scope="row" style={row.total ? { color: COST_ELEMENT_COLORS.standardCost } : undefined} className="px-2 py-1.5 text-left font-sans font-medium text-slate-700">{row.label}</th>
              <td className="px-2 py-1.5 text-right text-slate-600">{formatCost(row.reference)}</td>
              <td className="px-2 py-1.5 text-right text-slate-900">{formatCost(row.current)}</td>
              <td className="px-2 py-1.5 text-right">{renderGap(row.gap, row.selectedGap, selectedActive, row.tooltipLabel)}</td>
              <td className="px-2 py-1.5 text-right text-slate-600">{row.percentage === null ? '—' : formatPercent(row.percentage, 2)}</td>
            </tr>)}
          </tbody>
          <tfoot className={CBD_SUMMARY_FOOTER_ROW_CLASS}>
            {rows.slice(3).map(row => <tr key={row.label}>
              <th scope="row" style={{ color: COST_ELEMENT_COLORS.standardCost }} className={`${CBD_SUMMARY_FOOTER_LABEL_CLASS} text-slate-950`}>{row.label}</th>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-700`}>{formatCost(row.reference)}</td>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-950`}>{formatCost(row.current)}</td>
              <td className={CBD_SUMMARY_FOOTER_VALUE_CLASS}>{renderGap(row.gap, row.selectedGap, selectedActive, row.tooltipLabel)}</td>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} whitespace-nowrap text-slate-700`}>{row.percentage === null ? <span aria-label="Total percentage unavailable">— <span className="text-[9px] text-slate-500">Total</span></span> : <span aria-label={`${formatPercent(row.percentage, 2)} Total`}>{formatPercent(row.percentage, 2)} <span className="text-[9px] font-semibold text-slate-500">Total</span></span>}</td>
            </tr>)}
          </tfoot>
        </table>
      </div>
    </section>
  )
}
