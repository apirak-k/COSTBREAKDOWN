import React from 'react'
import {
  ComparisonFinding,
  RoutingStep,
  SnapshotRoutingStep,
  WorkCenterRate,
  calculateRoutingDetailedRows,
  formatNumber,
  formatVariance,
  formatPercent,
  getVarianceClass
} from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'

interface RoutingDetailedTableProps {
  routing: RoutingStep[]
  rates: WorkCenterRate[]
  findings?: ComparisonFinding[]
  referenceItems?: SnapshotRoutingStep[]
}

export function getRoutingComparisonLabels(finding: ComparisonFinding): string[] {
  if (finding.matchStatus === 'added') return ['Added']
  if (finding.matchStatus === 'removed') return ['Removed']
  if (finding.matchStatus !== 'matched') return ['Review']

  const labels: string[] = []
  if (finding.changeFlags.reordered) labels.push('Reordered')
  if (finding.changeFlags.movedWorkCenter) labels.push('Moved WC')
  if (finding.changeFlags.changedInputs) labels.push('Changed Input')
  return labels.length > 0 ? labels : ['Matched']
}

function comparisonClass(label: string): string {
  if (label === 'Matched') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'Changed Input') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'Reordered' || label === 'Moved WC') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'Added') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'Removed') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

export const RoutingDetailedTable: React.FC<RoutingDetailedTableProps> = ({ routing, rates, findings, referenceItems = [] }) => {
  const { rows, totalBase, totalActive, totalVariance } = calculateRoutingDetailedRows(routing, rates)
  const showComparison = findings !== undefined
  const findingByCurrentId = new Map(
    (findings ?? [])
      .filter(finding => finding.currentId)
      .map(finding => [finding.currentId as string, finding])
  )
  const removedFindings = (findings ?? []).filter(finding => finding.matchStatus === 'removed')
  const referenceById = new Map(referenceItems.map(item => [item.id, item]))

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1120px] text-xs text-left">
        <caption className="sr-only">Detailed routing cost comparison</caption>
        <thead>
          <tr className="bg-slate-900 text-white font-sans font-semibold text-[11px]">
            <th className="p-2.5 w-12">Op #</th>
            <th className="p-2.5">Operation Description</th>
            <th className="p-2.5">Department</th>
            {showComparison && <th className="p-2.5">Comparison</th>}
            {showComparison && <th className="p-2.5">Confidence</th>}
            <th className="p-2.5 text-right">Manning</th>
            <th className="p-2.5 text-right">Base Cap</th>
            <th className="p-2.5 text-right">Active Cap</th>
            <th className="p-2.5 text-right">Base Yield</th>
            <th className="p-2.5 text-right">Active Yield</th>
            <th className="p-2.5 text-right">Base Conv</th>
            <th className="p-2.5 text-right">Active Conv</th>
            <th className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans">
          {rows.map(row => {
            const finding = findingByCurrentId.get(row.id)
            const labels = finding ? getRoutingComparisonLabels(finding) : ['Review']

            return (
              <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-2.5 text-slate-500 tabular-nums">Op {row.opSeq}</td>
                <td className="p-2.5 font-sans font-medium text-slate-800 truncate max-w-[220px]" title={row.description}>
                  {row.description}
                </td>
                <td className="p-2.5 font-sans text-slate-600 truncate max-w-[140px]" title={row.wc}>
                  {row.wc}
                </td>
                {showComparison && (
                  <td className="p-2.5 min-w-[150px]">
                    <div className="flex flex-wrap gap-1">
                      {labels.map(label => (
                        <span key={label} className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap ${comparisonClass(label)}`}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                {showComparison && (
                  <td className="p-2.5 whitespace-nowrap">
                    <ConfidenceBadge status={finding?.confidence ?? 'missing'} showLabel />
                  </td>
                )}
                <td className="p-2.5 text-right font-mono tabular-nums">{formatNumber(row.manning, 1)}</td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatNumber(row.baseCap, 0)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatNumber(row.activeCap, 0)}</td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatPercent(row.baseYield, 1)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatPercent(row.activeYield, 1)}</td>
                <td className="p-2.5 text-right font-mono tabular-nums">{formatNumber(row.baseTotal, 4)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatNumber(row.activeTotal, 4)}</td>
                <td className={`p-2.5 text-right font-mono tabular-nums ${getVarianceClass(row.variance)}`}>
                  {formatVariance(row.variance, 4)}
                </td>
              </tr>
            )
          })}
          {showComparison && removedFindings.map(finding => {
            const item = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
            return (
              <tr key={`removed-${finding.referenceId ?? 'unknown'}`} className="bg-rose-50/60 text-xs">
                <td colSpan={13} className="p-2.5 border-t border-rose-100">
                  <span className="font-sans font-semibold text-rose-700">Removed from Current</span>
                  <span className="ml-2 font-mono text-rose-900">{item?.sequence ?? finding.referenceId ?? 'Unknown operation'}</span>
                  {item?.processName && <span className="ml-2 font-sans text-rose-800">{item.processName}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-300/80 font-bold text-xs">
            <td colSpan={showComparison ? 10 : 8} className="p-2.5 text-right text-slate-700 text-[10px] font-sans font-semibold">
              Total Conversion Cost (THB/pc)
            </td>
            <td className="p-2.5 text-right font-mono text-slate-800 tabular-nums">{formatNumber(totalBase, 4)}</td>
            <td className="p-2.5 text-right font-mono text-slate-900 tabular-nums">{formatNumber(totalActive, 4)}</td>
            <td className={`p-2.5 text-right font-mono tabular-nums ${getVarianceClass(totalVariance)}`}>
              {formatVariance(totalVariance, 4)}
            </td>
          </tr>
        </tfoot>

      </table>
    </div>
  )
}
