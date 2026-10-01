import React from 'react'
import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react'
import { CostComparison, formatNumber, formatPercent, formatVariance } from '../../../core'

export type SnapshotQuality = 'Verified' | 'Estimated' | 'Missing'

export interface SnapshotComparisonSummary {
  quality: SnapshotQuality
  missingCount: number
  estimatedCount: number
  warningCount: number
  matchedCount: number
  reviewCount: number
}

export function summarizeSnapshotComparison(comparison: CostComparison): SnapshotComparisonSummary {
  const findings = [
    ...comparison.bomFindings,
    ...comparison.routingFindings,
    ...comparison.workCenterFindings
  ]
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
    warningCount: comparison.warnings.length,
    matchedCount,
    reviewCount
  }
}

interface SnapshotComparisonCardProps {
  comparison: CostComparison
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)
const formatGap = (value: number | null): string => value === null ? '—' : formatVariance(value, 4)

function gapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({ comparison }) => {
  const summary = summarizeSnapshotComparison(comparison)
  const qualityClass = summary.quality === 'Verified'
    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
    : summary.quality === 'Estimated'
    ? 'text-amber-800 bg-amber-50 border-amber-200'
    : 'text-rose-800 bg-rose-50 border-rose-200'
  const QualityIcon = summary.quality === 'Verified'
    ? CheckCircle2
    : summary.quality === 'Estimated'
    ? CircleHelp
    : AlertTriangle

  const elements = [
    { label: 'Direct Material', key: 'material' as const, reference: comparison.referenceCost.material, current: comparison.currentCost.material },
    { label: 'Direct Labor', key: 'labor' as const, reference: comparison.referenceCost.labor, current: comparison.currentCost.labor },
    { label: 'Manufacturing Burden', key: 'burden' as const, reference: comparison.referenceCost.burden, current: comparison.currentCost.burden }
  ]
  const discrepancy = comparison.reconciliation?.discrepancy ?? null
  const reconciled = comparison.reconciliation?.reconciled === true

  return (
    <section aria-labelledby="snapshot-comparison-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="snapshot-comparison-title" className="text-base font-semibold text-slate-950">Reference vs Current</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">Standard cost and the element gaps that make up the difference.</p>
        </div>
        <div className={`inline-flex min-h-8 items-center gap-1.5 self-start border px-2.5 py-1 text-xs font-medium ${qualityClass}`} role="status">
          <QualityIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Data quality: {summary.quality}
        </div>
      </div>

      <dl className="grid grid-cols-1 divide-y divide-slate-700 bg-slate-900 text-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <dt className="text-xs text-slate-300">Reference · THB / unit</dt>
          <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatCost(comparison.referenceCost.total)}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-slate-300">Current · THB / unit</dt>
          <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatCost(comparison.currentCost.total)}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs text-slate-300">Cost gap · Current − Reference</dt>
          <dd className={`mt-1 font-mono text-xl font-semibold tabular-nums ${comparison.totalGap === null ? 'text-slate-300' : comparison.totalGap > 0 ? 'text-rose-300' : comparison.totalGap < 0 ? 'text-emerald-300' : 'text-white'}`}>
            {formatGap(comparison.totalGap)} <span className="text-xs font-normal text-slate-300">THB / unit</span>
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-2.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          <span><strong className="font-mono text-slate-900">{summary.matchedCount}</strong> matched</span>
          <span><strong className="font-mono text-slate-900">{summary.estimatedCount}</strong> estimated</span>
          <span><strong className="font-mono text-slate-900">{summary.missingCount}</strong> missing</span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span>Match review: <strong className="font-mono text-slate-900">{summary.reviewCount}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <caption className="sr-only">Reference and current cost by element, with the resulting gap and percentage change</caption>
          <thead className="border-b border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-2.5">Cost element</th>
              <th scope="col" className="px-4 py-2.5 text-right">Reference</th>
              <th scope="col" className="px-4 py-2.5 text-right">Current</th>
              <th scope="col" className="px-4 py-2.5 text-right">Gap</th>
              <th scope="col" className="px-4 py-2.5 text-right">Change vs Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {elements.map(element => {
              const gap = comparison.elementGaps[element.key]
              const change = gap !== null && element.reference !== null && element.reference !== 0
                ? formatPercent(gap / element.reference, 1)
                : '—'

              return (
                <tr key={element.key}>
                  <th scope="row" className="px-4 py-2.5 font-medium text-slate-800">{element.label}</th>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">{formatCost(element.reference)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-slate-900">{formatCost(element.current)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${gapClass(gap)}`}>{formatGap(gap)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${gapClass(gap)}`}>{change}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">Material, labor, and burden gaps should add to the total gap.</span>
        <span className={`font-mono font-semibold tabular-nums ${reconciled ? 'text-emerald-800' : 'text-amber-800'}`}>
          {reconciled
            ? discrepancy === null ? 'Balanced' : `${formatNumber(Math.abs(discrepancy), 4)} THB · Balanced`
            : discrepancy === null ? 'Unavailable · review source values' : `${formatNumber(Math.abs(discrepancy), 4)} THB · Needs review`}
        </span>
      </div>

      {comparison.warnings.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0">
              <p role="status" className="text-sm font-semibold text-amber-950">Review warnings ({summary.warningCount})</p>
              <ul className="mt-1 space-y-1 text-sm text-amber-950">
                {comparison.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${warning.referenceId ?? warning.currentId ?? index}`}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
