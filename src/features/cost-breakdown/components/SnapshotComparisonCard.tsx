import React from 'react'
import { getVarianceClass, safeAdd, safeDivide } from '../../../core'
import type { CostComparison } from '../../../core'
import { SelectedNumber } from '../../../shared/ui/selected-value'
import { formatBusinessNumber } from '../../../shared/ui/numeric-display'
import { NumericColumnHeader } from '../../../shared/ui/NumericColumnHeader'
import { COST_ELEMENT_COLORS } from './cost-element-colors'
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
  CBD_SUMMARY_FOOTER_LABEL_CLASS,
  CBD_SUMMARY_FOOTER_ROW_CLASS,
  CBD_SUMMARY_FOOTER_VALUE_CLASS,
  CBD_SUMMARY_HEADER_CELL_CLASS,
  CBD_SUMMARY_HEADER_LABEL_CLASS,
  CBD_SUMMARY_HEADER_ROW_CLASS,
  CBD_SUMMARY_HEADER_CELL_STYLE,
  CBD_SUMMARY_HEADER_VALUE_CLASS
} from './summary-table-styles'

interface SnapshotComparisonCardProps {
  comparison: CostComparison
  gapDirection: string
  pairFingerprint?: string
  selectedComparison?: CostComparison | null
  selectedActive?: boolean
}

type CostRow = {
  label: 'Material' | 'Labor' | 'Burden' | 'Standard Cost'
  reference: number | null
  current: number | null
  gap: number | null
  selectedGap: number | null
  percentage: number | null
  total?: boolean
}

const formatCost = (value: number | null): string => value === null ? '—' : formatBusinessNumber(value)
const formatGap = (value: number | null): string => value === null ? '—' : formatBusinessNumber(value, { signPositive: true })
const formatGapPercentage = (ratio: number | null): string => ratio === null ? '—' : formatBusinessNumber(ratio * 100, { percent: true })

function renderGap(
  value: number | null,
  selectedValue: number | null,
  selectedActive: boolean,
  label: string,
  gapDirection: string,
  pairFingerprint: string
): React.ReactNode {
  const accessibleLabel = `${label} Full Gap ${formatGap(value)}; Gap = ${gapDirection}`
  const selectedDescription = selectedActive ? `Selected ${formatGap(selectedValue)}` : undefined
  const selectedAccessibleLabel = `${label} Selected Gap ${formatGap(selectedValue)}; Gap = ${gapDirection}`
  const valueClassName = `block w-full text-right ${value === null ? 'text-slate-400' : getVarianceClass(value)}`
  const selectedValueClassName = `justify-self-end text-right ${value === null ? 'text-slate-400' : getVarianceClass(value)}`
  return (
    <div aria-label={`${accessibleLabel}${selectedActive ? `; ${selectedDescription}` : ''}`} className="grid w-full grid-cols-[minmax(0,1fr)_65px] items-baseline whitespace-nowrap font-mono tabular-nums">
      {value === null
        ? <span data-gap-slot="full" tabIndex={0} aria-label={accessibleLabel} className={valueClassName}>{formatGap(value)}</span>
        : <SelectedNumber numericColumn signPositive
            data-gap-slot="full"
            value={value}
            selectionId={`cbd:${pairFingerprint}:cost-element:${label.toLowerCase()}:full-gap`}
            aria-label={accessibleLabel}
            aria-description={selectedDescription}
            className={selectedValueClassName}
          />}
      {selectedActive
        ? selectedValue === null
          ? <span data-gap-slot="selected" tabIndex={0} aria-label={selectedAccessibleLabel} className="w-[65px] text-right text-[10px] font-normal text-slate-500 tabular-nums">{formatGap(selectedValue)}</span>
          : <SelectedNumber numericColumn signPositive
              data-gap-slot="selected"
              value={selectedValue}
              selectionId={`cbd:${pairFingerprint}:cost-element:${label.toLowerCase()}:selected-gap`}
              aria-label={selectedAccessibleLabel}
              className="justify-self-end text-right text-[10px] font-normal text-slate-500 tabular-nums"
            />
        : <span data-gap-slot="selected" aria-hidden="true" className="w-[65px] text-right text-[10px] font-normal text-slate-500 tabular-nums invisible">0.00</span>}
    </div>
  )
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({
  comparison,
  gapDirection,
  pairFingerprint = 'unscoped',
  selectedComparison = null,
  selectedActive = false
}) => {
  const selectedElementGaps = selectedActive ? selectedComparison?.elementGaps : null
  const selectedTotalGap = selectedActive && selectedElementGaps
    ? safeAdd(selectedElementGaps.material ?? Number.NaN, selectedElementGaps.labor ?? Number.NaN, selectedElementGaps.burden ?? Number.NaN)
    : null
  const rows: CostRow[] = [
    {
      label: 'Material',
      reference: comparison.referenceCost.material,
      current: comparison.currentCost.material,
      gap: comparison.elementGaps.material,
      selectedGap: selectedElementGaps?.material ?? null,
      percentage: comparison.elementGaps.material === null
        ? null
        : safeDivide(comparison.elementGaps.material, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Labor',
      reference: comparison.referenceCost.labor,
      current: comparison.currentCost.labor,
      gap: comparison.elementGaps.labor,
      selectedGap: selectedElementGaps?.labor ?? null,
      percentage: comparison.elementGaps.labor === null
        ? null
        : safeDivide(comparison.elementGaps.labor, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Burden',
      reference: comparison.referenceCost.burden,
      current: comparison.currentCost.burden,
      gap: comparison.elementGaps.burden,
      selectedGap: selectedElementGaps?.burden ?? null,
      percentage: comparison.elementGaps.burden === null
        ? null
        : safeDivide(comparison.elementGaps.burden, comparison.totalGap ?? Number.NaN)
    },
    {
      label: 'Standard Cost',
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
    <section aria-label="Cost Element" data-cbd-overview-panel="cost" className={CBD_SUMMARY_PANEL_CLASS}>
      <div>
        <table role="table" style={{ '--cbd-summary-columns': '20% 18% 18% 26% 18%' } as React.CSSProperties} className={CBD_SUMMARY_TABLE_CLASS}>
          <caption className="sr-only">Cost Element for Before, After, Gap, and Gap percentage. Gap = {gapDirection}.</caption>
          <thead data-cbd-summary-header="true" className={CBD_SUMMARY_HEADER_GROUP_CLASS}>
            <tr className={`${CBD_SUMMARY_ROW_CLASS} ${CBD_SUMMARY_HEADER_ROW_CLASS}`}>
              <th scope="col" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_LABEL_CLASS}`}>Cost Element</th>
              <th scope="col" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><NumericColumnHeader>Before</NumericColumnHeader></th>
              <th scope="col" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><NumericColumnHeader>After</NumericColumnHeader></th>
              <th scope="col" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={CBD_SUMMARY_HEADER_CELL_CLASS}><span className="grid w-full grid-cols-[minmax(0,1fr)_65px] items-baseline font-mono text-[11px] leading-4 tabular-nums"><NumericColumnHeader data-gap-header-slot="full" className="text-[11px] leading-4">GAP</NumericColumnHeader><NumericColumnHeader data-gap-header-slot="selected" aria-hidden={!selectedActive} className={`block w-[65px] whitespace-nowrap text-center text-[10px] leading-4 font-normal text-slate-300 ${selectedActive ? '' : 'invisible'}`}>Selected</NumericColumnHeader></span></th>
              <th scope="col" style={CBD_SUMMARY_HEADER_CELL_STYLE} className={`${CBD_SUMMARY_HEADER_CELL_CLASS} ${CBD_SUMMARY_HEADER_VALUE_CLASS}`}><span className="grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1"><NumericColumnHeader>%GAP</NumericColumnHeader><span aria-hidden="true" /></span></th>
            </tr>
          </thead>
          <tbody data-cbd-summary-body="true" className={CBD_SUMMARY_BODY_GROUP_CLASS}>
            {rows.slice(0, 3).map(row => <tr key={row.label} className={`${CBD_SUMMARY_ROW_CLASS} ${CBD_SUMMARY_BODY_ROW_CLASS}`}>
              <th scope="row" style={row.total ? { color: COST_ELEMENT_COLORS.standardCost } : undefined} className={CBD_SUMMARY_BODY_LABEL_CLASS}>{row.label}</th>
              <td className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-600`}><SelectedNumber numericColumn value={row.reference} selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:before`} aria-label={`${row.label} Before ${formatCost(row.reference)}`} className="text-right" /></td>
              <td className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-900`}><SelectedNumber numericColumn value={row.current} selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:after`} aria-label={`${row.label} After ${formatCost(row.current)}`} className="text-right" /></td>
              <td className={CBD_SUMMARY_BODY_VALUE_CLASS}>{renderGap(row.gap, row.selectedGap, selectedActive, row.label, gapDirection, pairFingerprint)}</td>
              <td className={`${CBD_SUMMARY_BODY_VALUE_CLASS} text-slate-600`}>{row.percentage === null ? '—' : <SelectedNumber numericColumn value={row.percentage * 100} percentage selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:percent-gap`} aria-label={`${row.label} percent Gap ${formatGapPercentage(row.percentage)}`} className="text-right" />}</td>
            </tr>)}
          </tbody>
          <tfoot data-cbd-summary-footer="true" className={CBD_SUMMARY_FOOTER_GROUP_CLASS}>
            {rows.slice(3).map(row => <tr key={row.label} className={`${CBD_SUMMARY_ROW_CLASS} ${CBD_SUMMARY_FOOTER_ROW_CLASS}`}>
              <th scope="row" style={{ color: COST_ELEMENT_COLORS.standardCost }} className={`${CBD_SUMMARY_FOOTER_LABEL_CLASS} text-slate-950`}>{row.label}</th>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-700`}><SelectedNumber numericColumn value={row.reference} selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:before`} aria-label={`${row.label} Before ${formatCost(row.reference)}`} className="text-right" /></td>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} text-slate-950`}><SelectedNumber numericColumn value={row.current} selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:after`} aria-label={`${row.label} After ${formatCost(row.current)}`} className="text-right" /></td>
              <td className={CBD_SUMMARY_FOOTER_VALUE_CLASS}>{renderGap(row.gap, row.selectedGap, selectedActive, row.label, gapDirection, pairFingerprint)}</td>
              <td className={`${CBD_SUMMARY_FOOTER_VALUE_CLASS} whitespace-nowrap text-slate-700`}>
                <SelectedNumber numericColumn value={row.percentage === null ? null : row.percentage * 100} percentage leadingAnnotation={<span data-cbd-total-annotation="true" className="font-sans text-[9px] font-semibold text-slate-500">Total</span>} selectionId={`cbd:${pairFingerprint}:cost-element:${row.label.toLowerCase()}:percent-gap`} aria-label={`${row.label} percent Gap ${formatGapPercentage(row.percentage)}`} className="text-right" />
              </td>
            </tr>)}
          </tfoot>
        </table>
      </div>
    </section>
  )
}
