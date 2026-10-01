import React from 'react'
import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react'
import { formatNumber, formatPercent } from '../../../core'
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

  const metrics = [
    { label: 'Total Standard Cost', key: 'total' as const, reference: comparison.referenceCost.total, current: comparison.currentCost.total, gap: comparison.totalGap, emphasis: true },
    { label: 'Direct Material', key: 'material' as const, reference: comparison.referenceCost.material, current: comparison.currentCost.material, gap: comparison.elementGaps.material },
    { label: 'Direct Labor', key: 'labor' as const, reference: comparison.referenceCost.labor, current: comparison.currentCost.labor, gap: comparison.elementGaps.labor },
    { label: 'Manufacturing Burden', key: 'burden' as const, reference: comparison.referenceCost.burden, current: comparison.currentCost.burden, gap: comparison.elementGaps.burden }
  ]
  const discrepancy = comparison.reconciliation?.discrepancy ?? null
  const reconciled = comparison.reconciliation?.reconciled === true

  return (
    <section aria-labelledby="snapshot-comparison-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="snapshot-comparison-title" className="font-mono text-xs font-bold uppercase tracking-wide text-slate-950">Reference vs Current</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Four cost measures across the two independent snapshots.</p>
        </div>
        <div className={`inline-flex min-h-7 items-center gap-1.5 self-start border px-2 py-1 font-mono text-[10px] font-semibold uppercase ${qualityClass}`} role="status">
          <QualityIcon className="h-3 w-3" aria-hidden="true" />
          Data quality: {summary.quality}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-2 text-[11px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          <span><strong className="font-mono text-slate-900">{summary.matchedCount}</strong> matched</span>
          <span><strong className="font-mono text-slate-900">{summary.estimatedCount}</strong> estimated</span>
          <span><strong className="font-mono text-slate-900">{summary.missingCount}</strong> missing</span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span>Match review: <strong className="font-mono text-slate-900">{summary.reviewCount}</strong></span>
        </div>
      </div>

      <section aria-label="Reference and Current cost measures" className="grid grid-cols-1 gap-px bg-slate-300 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => {
          const change = metric.gap !== null && metric.reference !== null && metric.reference !== 0
            ? `${metric.gap > 0 ? '+' : ''}${formatPercent(metric.gap / metric.reference, 1)}`
            : '—'

          return (
            <article key={metric.key} className={`min-w-0 bg-white px-3 py-3 ${metric.emphasis ? 'border-t-2 border-t-slate-900' : 'border-t-2 border-t-slate-400'}`}>
              <h3 className="truncate font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600" title={metric.label}>{metric.label}</h3>
              <p className="mt-2 flex min-w-0 items-baseline gap-1 font-mono tabular-nums text-slate-950">
                <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-slate-500">Current</span>
                <span className="truncate text-lg font-semibold tracking-tight">{formatCost(metric.current)}</span>
                <span className="shrink-0 text-[10px] text-slate-500">THB/pc</span>
              </p>
              <dl className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="truncate font-mono tabular-nums text-slate-700">{formatCost(metric.reference)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Change vs Ref</dt>
                  <dd className={`font-mono font-semibold tabular-nums ${gapClass(metric.gap)}`}>{change}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </section>

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
