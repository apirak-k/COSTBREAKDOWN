import React from 'react'
import { formatNumber, formatPercent, formatVariance, safeAdd } from '../../../core'
import type { CostComparison } from '../../../core'
import { ALL_COMPARISON_STATUSES, isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'

interface SnapshotComparisonCardProps {
  comparison: CostComparison
  selectedComparison?: boolean
  comparisonView?: ComparisonViewMode
  onOpenDetail?: (section: 'bom' | 'rtg') => void
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)

function addCosts(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : safeAdd(left, right)
}

function costGap(current: number | null, reference: number | null): number | null {
  return current === null || reference === null ? null : safeAdd(current, -reference)
}

function gapClass(value: number | null): string {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function formatRatio(numerator: number | null, denominator: number | null): string {
  return numerator === null || denominator === null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0
    ? '—'
    : formatPercent(numerator / denominator, 2)
}

function balanceClass(balanced: boolean | null): string {
  return balanced === true
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : balanced === false
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-600'
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({
  comparison,
  selectedComparison = false,
  comparisonView = ALL_COMPARISON_STATUSES,
  onOpenDetail = () => undefined
}) => {
  const standardCostGap = comparison.totalGap
  const referenceConversion = addCosts(comparison.referenceCost.labor, comparison.referenceCost.burden)
  const currentConversion = addCosts(comparison.currentCost.labor, comparison.currentCost.burden)
  const conversionGap = costGap(currentConversion, referenceConversion)
  const materialGap = comparison.elementGaps.material
  const laborGap = comparison.elementGaps.labor
  const burdenGap = comparison.elementGaps.burden
  const bomCount = comparison.bomFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const routingCount = comparison.routingFindings.filter(finding => isVisibleInComparisonView(finding, comparisonView)).length
  const combinedElementGap = laborGap === null || burdenGap === null ? null : safeAdd(laborGap, burdenGap)
  const conversionBalanced = laborGap === null || burdenGap === null || conversionGap === null
    ? null
    : combinedElementGap === null ? null : Math.abs(combinedElementGap - conversionGap) < 0.00005
  const rows = [
    { label: 'Material', reference: comparison.referenceCost.material, current: comparison.currentCost.material, gap: materialGap, parent: standardCostGap },
    { label: 'Labor', reference: comparison.referenceCost.labor, current: comparison.currentCost.labor, gap: laborGap, parent: conversionGap },
    { label: 'Burden', reference: comparison.referenceCost.burden, current: comparison.currentCost.burden, gap: burdenGap, parent: conversionGap },
    { label: 'Conversion', reference: referenceConversion, current: currentConversion, gap: conversionGap, parent: standardCostGap, subtotal: true }
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.78fr)_minmax(0,1.22fr)]">
      <section aria-labelledby="standard-cost-summary-title" className="overflow-hidden border border-slate-300 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
          <h2 id="standard-cost-summary-title" className="font-sans text-xs font-semibold tracking-tight text-slate-950">Standard Cost Summary</h2>
          <span className="text-[11px] text-slate-500">{selectedComparison ? 'Selected Comparison' : 'Reference vs Current'} · THB/pc</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <caption className="sr-only">Reference, Current, Gap, and Gap percentage for Standard Cost</caption>
            <thead><tr className="bg-slate-800 font-semibold text-white"><th scope="col" className="px-2.5 py-2">Cost</th><th scope="col" className="px-2.5 py-2 text-right">REF</th><th scope="col" className="px-2.5 py-2 text-right">CUR</th><th scope="col" className="px-2.5 py-2 text-right">Gap</th><th scope="col" className="px-2.5 py-2 text-right">Gap %</th></tr></thead>
            <tbody><tr className="bg-slate-100 font-semibold text-slate-950"><th scope="row" className="px-2.5 py-3">Standard Cost</th><td className="px-2.5 py-3 text-right font-mono tabular-nums">{formatCost(comparison.referenceCost.total)}</td><td className="px-2.5 py-3 text-right font-mono tabular-nums">{formatCost(comparison.currentCost.total)}</td><td className={`px-2.5 py-3 text-right font-mono tabular-nums ${gapClass(standardCostGap)}`}>{standardCostGap === null ? '—' : formatVariance(standardCostGap, 4)}</td><td className="px-2.5 py-3 text-right font-mono tabular-nums">{formatRatio(standardCostGap, comparison.referenceCost.total)}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cost-element-breakdown-title" className="overflow-hidden border border-slate-300 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
          <h2 id="cost-element-breakdown-title" className="font-sans text-xs font-semibold tracking-tight text-slate-950">Cost Element Breakdown</h2>
          <span className="text-[11px] text-slate-500">% of Gap · THB/pc</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <caption className="sr-only">Reference, Current, Gap, and total and parent contribution by cost element. Conversion is a subtotal.</caption>
            <thead><tr className="bg-slate-800 font-semibold text-white"><th scope="col" className="px-2.5 py-2">Element</th><th scope="col" className="px-2.5 py-2 text-right">Reference</th><th scope="col" className="px-2.5 py-2 text-right">Current</th><th scope="col" className="px-2.5 py-2 text-right">Gap</th><th scope="col" className="px-2.5 py-2 text-right">% Total</th><th scope="col" className="px-2.5 py-2 text-right">% Parent</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(row => (
                <tr key={row.label} className={row.subtotal ? 'bg-slate-50 text-slate-700' : 'bg-white text-slate-800'}>
                  <th scope="row" className={`px-2.5 py-2 text-left ${row.subtotal ? 'font-medium italic' : 'font-semibold'}`}>{row.label}{row.subtotal && <span className="ml-1.5 font-sans text-[10px] font-normal not-italic text-slate-500">Labor + Burden</span>}</th>
                  <td className="px-2.5 py-2 text-right font-mono tabular-nums">{formatCost(row.reference)}</td>
                  <td className="px-2.5 py-2 text-right font-mono tabular-nums">{formatCost(row.current)}</td>
                  <td className={`px-2.5 py-2 text-right font-mono tabular-nums ${gapClass(row.gap)}`}>{row.gap === null ? '—' : formatVariance(row.gap, 4)}</td>
                  <td className="px-2.5 py-2 text-right font-mono tabular-nums">{formatRatio(row.gap, standardCostGap)}</td>
                  <td className="px-2.5 py-2 text-right font-mono tabular-nums">{formatRatio(row.gap, row.parent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
          <span className="text-slate-600">Labor + Burden = Conversion</span>
          <span className={`inline-flex rounded-sm border px-1.5 py-0.5 font-semibold ${balanceClass(conversionBalanced)}`}>
            {conversionBalanced === true ? 'Balanced' : conversionBalanced === false ? 'Needs review' : 'Unavailable'}
          </span>
          <span className="ml-auto text-slate-500">Conversion is not added again to Standard Cost.</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">
          <button type="button" onClick={() => onOpenDetail('bom')} className="min-h-7 text-left font-medium underline decoration-slate-300 underline-offset-2 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {bomCount} BOM findings · Review
          </button>
          <button type="button" onClick={() => onOpenDetail('rtg')} className="min-h-7 text-left font-medium underline decoration-slate-300 underline-offset-2 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {routingCount} RTG findings · Review
          </button>
        </div>
      </section>

    </div>
  )
}
