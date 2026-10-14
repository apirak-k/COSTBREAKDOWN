import React from 'react'
import { formatNumber, formatPercent, formatVariance, getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison } from '../../../core'
import { Tooltip } from '../../../shared/ui/Tooltip'

interface SnapshotComparisonCardProps {
  comparison: CostComparison
  selectedComparison?: CostComparison | null
  selectedActive?: boolean
}

type CostRow = {
  label: 'MAT' | 'LB' | 'BD' | 'STD Cost'
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
  if (selectedActive) tooltipLines.push(`Selected (${formatGap(selectedValue)})`)
  return (
    <Tooltip label={tooltipLines.join('\n')} wrapperClassName="inline-flex justify-end">
      <span tabIndex={0} aria-label={`${tooltipLabel} Gap ${formatGap(value)}${selectedActive ? `; Selected (${formatGap(selectedValue)})` : ''}`} className="inline-flex items-baseline gap-1 whitespace-nowrap">
        <span className={value === null ? 'text-slate-400' : getVarianceClass(value)}>{formatGap(value)}</span>
        {selectedActive && <span className="text-[10px] font-normal text-slate-500">({formatGap(selectedValue)})</span>}
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
      label: 'MAT', tooltipLabel: 'Material',
      reference: comparison.referenceCost.material,
      current: comparison.currentCost.material,
      gap: comparison.elementGaps.material,
      selectedGap: selectedElementGaps?.material ?? null,
      percentage: comparison.elementGaps.material === null
        ? null
        : safeDivide(comparison.elementGaps.material, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'LB', tooltipLabel: 'Labor',
      reference: comparison.referenceCost.labor,
      current: comparison.currentCost.labor,
      gap: comparison.elementGaps.labor,
      selectedGap: selectedElementGaps?.labor ?? null,
      percentage: comparison.elementGaps.labor === null
        ? null
        : safeDivide(comparison.elementGaps.labor, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'BD', tooltipLabel: 'Burden',
      reference: comparison.referenceCost.burden,
      current: comparison.currentCost.burden,
      gap: comparison.elementGaps.burden,
      selectedGap: selectedElementGaps?.burden ?? null,
      percentage: comparison.elementGaps.burden === null
        ? null
        : safeDivide(comparison.elementGaps.burden, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'STD Cost', tooltipLabel: 'Standard Cost',
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
    <section aria-label="Cost comparison" className="h-44 min-w-0 overflow-hidden border border-slate-300 bg-white">
      <div className="h-full w-full overflow-x-auto">
        <table className="h-full w-full min-w-[480px] table-fixed text-left text-xs">
          <caption className="sr-only">Cost comparison for Reference, Current, Gap, and Gap percentage</caption>
          <colgroup><col className="w-[30%]" /><col className="w-[17.5%]" /><col className="w-[17.5%]" /><col className="w-[21%]" /><col className="w-[14%]" /></colgroup>
          <thead>
            <tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="px-2 py-1.5">Cost</th>
              <th scope="col" className="px-2 py-1.5 text-right">REF</th>
              <th scope="col" className="px-2 py-1.5 text-right">CUR</th>
              <th scope="col" className="px-2 py-1.5 text-right">GAP{selectedActive && <span className="ml-1 text-[10px] font-normal text-slate-300">(Selected)</span>}</th>
              <th scope="col" className="px-2 py-1.5 text-right">%GAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.slice(0, 3).map(row => <tr key={row.label}>
              <th scope="row" className="px-2 py-1.5 text-left font-sans font-medium text-slate-700">{row.label}</th>
              <td className="px-2 py-1.5 text-right text-slate-600">{formatCost(row.reference)}</td>
              <td className="px-2 py-1.5 text-right text-slate-900">{formatCost(row.current)}</td>
              <td className="px-2 py-1.5 text-right">{renderGap(row.gap, row.selectedGap, selectedActive, row.tooltipLabel)}</td>
              <td className="px-2 py-1.5 text-right text-slate-600">{row.percentage === null ? '—' : formatPercent(row.percentage, 2)}</td>
            </tr>)}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-semibold font-mono tabular-nums">
            {rows.slice(3).map(row => <tr key={row.label}>
              <th scope="row" className="px-2 py-1.5 text-left font-sans text-slate-950">{row.label}</th>
              <td className="px-2 py-1.5 text-right text-slate-700">{formatCost(row.reference)}</td>
              <td className="px-2 py-1.5 text-right text-slate-950">{formatCost(row.current)}</td>
              <td className="px-2 py-1.5 text-right">{renderGap(row.gap, row.selectedGap, selectedActive, row.tooltipLabel)}</td>
              <td className="px-2 py-1.5 text-right text-slate-700">{row.percentage === null ? '—' : formatPercent(row.percentage, 2)}</td>
            </tr>)}
          </tfoot>
        </table>
      </div>
    </section>
  )
}
