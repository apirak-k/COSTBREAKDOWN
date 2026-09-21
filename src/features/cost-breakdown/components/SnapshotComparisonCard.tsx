import React from 'react'
import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react'
import {
  CostComparison,
  formatNumber,
  formatVariance
} from '../../../core'

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
  const reviewCount = findings.filter(finding => finding.matchStatus !== 'matched').length
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
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-400'
  return value > 0 ? 'text-rose-600' : 'text-emerald-700'
}

export const SnapshotComparisonCard: React.FC<SnapshotComparisonCardProps> = ({ comparison }) => {
  const summary = summarizeSnapshotComparison(comparison)
  const qualityClass = summary.quality === 'Verified'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : summary.quality === 'Estimated'
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-rose-700 bg-rose-50 border-rose-200'
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

  return (
    <section
      aria-labelledby="snapshot-comparison-title"
      className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div>
          <h2 id="snapshot-comparison-title" className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Reference vs Current Snapshot
          </h2>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
            Independent snapshot calculation and comparison. Exact gap first; attribution follows later.
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 self-start px-2 py-1 rounded border text-[10px] font-mono font-bold uppercase ${qualityClass}`} role="status">
          <QualityIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Data quality: {summary.quality}
        </div>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
        <div className="p-3">
          <dt className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Reference</dt>
          <dd className="mt-1 text-lg font-mono font-bold text-slate-900 tabular-nums">{formatCost(comparison.referenceCost.total)}</dd>
          <span className="text-[10px] text-slate-400 font-sans">THB / unit</span>
        </div>
        <div className="p-3">
          <dt className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Current</dt>
          <dd className="mt-1 text-lg font-mono font-bold text-slate-900 tabular-nums">{formatCost(comparison.currentCost.total)}</dd>
          <span className="text-[10px] text-slate-400 font-sans">THB / unit</span>
        </div>
        <div className="p-3">
          <dt className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Exact Cost Gap</dt>
          <dd className={`mt-1 text-lg font-mono font-bold tabular-nums ${gapClass(comparison.totalGap)}`}>{formatGap(comparison.totalGap)}</dd>
          <span className="text-[10px] text-slate-400 font-sans">Current − Reference</span>
        </div>
        <div className="p-3">
          <dt className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Match Review</dt>
          <dd className="mt-1 text-lg font-mono font-bold text-slate-900 tabular-nums">{summary.reviewCount}</dd>
          <span className="text-[10px] text-slate-400 font-sans">rows need review</span>
        </div>
      </dl>

      <div className="border-t border-slate-200">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold font-mono text-slate-700 uppercase tracking-tight">Cost element bridge</h3>
          <span className="text-[10px] font-mono text-slate-400">
            {summary.matchedCount} matched · {summary.estimatedCount} estimated · {summary.missingCount} missing
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Reference and current cost by element</caption>
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="px-4 py-2">Cost element</th>
                <th scope="col" className="px-4 py-2 text-right">Reference</th>
                <th scope="col" className="px-4 py-2 text-right">Current</th>
                <th scope="col" className="px-4 py-2 text-right">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {elements.map(element => {
                const gap = comparison.elementGaps[element.key]
                return (
                  <tr key={element.key} className="text-xs font-mono text-slate-700">
                    <th scope="row" className="px-4 py-2.5 font-medium text-slate-800">{element.label}</th>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCost(element.reference)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCost(element.current)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${gapClass(gap)}`}>{formatGap(gap)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {comparison.warnings.length > 0 && (
        <div className="px-4 py-3 border-t border-amber-200 bg-amber-50/70" role="status">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold font-mono text-amber-900">Review warnings ({summary.warningCount})</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-amber-900 font-sans">
                {comparison.warnings.slice(0, 3).map((warning, index) => (
                  <li key={`${warning.code}-${warning.referenceId ?? warning.currentId ?? index}`}>{warning.message}</li>
                ))}
              </ul>
              {comparison.warnings.length > 3 && (
                <p className="mt-1 text-[10px] text-amber-800 font-sans">+{comparison.warnings.length - 3} more warnings in detailed comparison.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
