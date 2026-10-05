import React from 'react'
import { formatNumber, formatVariance } from '../../../core'
import type { CostComparison } from '../../../core'

export type SnapshotQuality = 'Verified' | 'Estimated' | 'Missing'

export interface SnapshotComparisonSummary {
  quality: SnapshotQuality
  missingCount: number
  estimatedCount: number
  warningCount: number
  matchedCount: number
  reviewCount: number
}

function getSnapshotWarnings(comparison: CostComparison, selectedComparison: boolean) {
  if (!selectedComparison) return comparison.warnings
  return comparison.warnings.filter(warning => !(
    (warning.code === 'MISSING_BUSINESS_KEY' || warning.code === 'AMBIGUOUS_KEY')
    && warning.message.includes('Work Center')
  ))
}

export function summarizeSnapshotComparison(comparison: CostComparison, selectedComparison = false): SnapshotComparisonSummary {
  const findings = [
    ...comparison.bomFindings,
    ...comparison.routingFindings,
    ...(selectedComparison ? [] : comparison.workCenterFindings)
  ]
  const warnings = getSnapshotWarnings(comparison, selectedComparison)
  const missingCount = findings.filter(finding => finding.confidence === 'missing').length
  const estimatedCount = findings.filter(finding => finding.confidence === 'estimated').length
  const matchedCount = findings.filter(finding => finding.matchStatus === 'matched').length
  const reviewCount = findings.filter(finding => finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched' || finding.reviewRequired).length
  const hasMissingCost = comparison.referenceCost.status === 'missing' || comparison.currentCost.status === 'missing'
  const hasEstimatedCost = comparison.referenceCost.status === 'estimated' || comparison.currentCost.status === 'estimated'

  return {
    quality: hasMissingCost || missingCount > 0
      ? 'Missing'
      : hasEstimatedCost || estimatedCount > 0
      ? 'Estimated'
      : 'Verified',
    missingCount,
    estimatedCount,
    warningCount: warnings.length,
    matchedCount,
    reviewCount
  }
}

interface SnapshotComparisonCardProps {
  comparison: CostComparison
  selectedComparison?: boolean
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)

function addCosts(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left + right
}

function costGap(current: number | null, reference: number | null): number | null {
  return current === null || reference === null ? null : current - reference
}

function gapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({ comparison, selectedComparison = false }) => {
  const summary = summarizeSnapshotComparison(comparison, selectedComparison)
  const warnings = getSnapshotWarnings(comparison, selectedComparison)
  const referenceConversion = addCosts(comparison.referenceCost.labor, comparison.referenceCost.burden)
  const currentConversion = addCosts(comparison.currentCost.labor, comparison.currentCost.burden)
  const metrics = [
    { label: 'Direct Material', key: 'material' as const, reference: comparison.referenceCost.material, current: comparison.currentCost.material, gap: comparison.elementGaps.material },
    { label: 'Direct Labor', key: 'labor' as const, reference: comparison.referenceCost.labor, current: comparison.currentCost.labor, gap: comparison.elementGaps.labor },
    { label: 'Manufacturing Burden', key: 'burden' as const, reference: comparison.referenceCost.burden, current: comparison.currentCost.burden, gap: comparison.elementGaps.burden },
    { label: 'Conversion subtotal', key: 'conversion' as const, reference: referenceConversion, current: currentConversion, gap: costGap(currentConversion, referenceConversion), subtotal: true },
    { label: 'Standard Cost', key: 'total' as const, reference: comparison.referenceCost.total, current: comparison.currentCost.total, gap: comparison.totalGap, emphasis: true }
  ]
  const discrepancy = comparison.reconciliation?.discrepancy ?? null
  const reconciled = comparison.reconciliation?.reconciled === true

  return (
    <section aria-labelledby="snapshot-comparison-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="snapshot-comparison-title" className="font-mono text-xs font-bold uppercase tracking-wide text-slate-950">{selectedComparison ? 'Selected Comparison · Reference vs Current' : 'Reference vs Current'}</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
            {selectedComparison
              ? 'Cost measures use the selected BOM and Routing findings with all Work Center rates as calculation context.'
              : 'Reference and Current are calculated independently. Gap = Current − Reference.'}
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <caption className="sr-only">Reference, Current, and Gap for material, labor, burden, conversion subtotal, and standard cost</caption>
          <thead>
            <tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="p-2.5">Cost category</th>
              <th scope="col" className="p-2.5 text-right">Reference (THB/pc)</th>
              <th scope="col" className="p-2.5 text-right">Current (THB/pc)</th>
              <th scope="col" className="p-2.5 text-right">Gap (THB/pc)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {metrics.map(metric => (
              <tr key={metric.key} className={metric.emphasis ? 'border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-950' : metric.subtotal ? 'bg-slate-50 text-slate-700' : 'bg-white text-slate-800'}>
                <th scope="row" className={`p-2.5 text-left ${metric.subtotal ? 'font-medium italic' : 'font-semibold'}`}>
                  {metric.label}{metric.subtotal && <span className="ml-2 font-sans text-[10px] font-normal not-italic text-slate-500">Labor + Burden; subtotal only</span>}
                </th>
                <td className="p-2.5 text-right">{formatCost(metric.reference)}</td>
                <td className="p-2.5 text-right">{formatCost(metric.current)}</td>
                <td className={`p-2.5 text-right ${gapClass(metric.gap)}`}>{metric.gap === null ? '—' : formatVariance(metric.gap, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">Material + labor + burden reconcile to Standard Cost Gap; Conversion is a labor + burden subtotal and is not counted again.</span>
        <span className={`font-mono font-semibold tabular-nums ${reconciled ? 'text-emerald-800' : 'text-amber-800'}`}>
          {reconciled
            ? discrepancy === null ? 'Balanced' : `${formatNumber(Math.abs(discrepancy), 4)} THB · Balanced`
            : discrepancy === null ? 'Unavailable · review source values' : `${formatNumber(Math.abs(discrepancy), 4)} THB · Needs review`}
        </span>
      </div>

      {warnings.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50/50 px-4 py-2">
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              Review warnings ({summary.warningCount})
            </summary>
            <ul className="mt-2 space-y-1 border-t border-amber-200 pt-2 text-xs leading-5 text-amber-950">
              {warnings.map((warning, index) => (
                <li key={`${warning.code}-${warning.referenceId ?? warning.currentId ?? index}`}>{warning.message}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  )
}
