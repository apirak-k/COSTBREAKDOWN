import React from 'react'
import {
  BOMItem,
  ComparisonFinding,
  SnapshotBOMItem,
  calculateBOMDetailedRows,
  formatNumber,
  formatVariance,
  formatPercent,
  getVarianceClass
} from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'

interface BOMDetailedTableProps {
  bom: BOMItem[]
  findings?: ComparisonFinding[]
  referenceItems?: SnapshotBOMItem[]
}

export function getBOMComparisonLabel(finding: ComparisonFinding): 'Matched' | 'Changed' | 'Added' | 'Removed' | 'Review' {
  if (finding.matchStatus === 'added') return 'Added'
  if (finding.matchStatus === 'removed') return 'Removed'
  if (finding.matchStatus !== 'matched') return 'Review'
  return Object.keys(finding.fieldDiffs).length > 0 ? 'Changed' : 'Matched'
}

function comparisonClass(label: ReturnType<typeof getBOMComparisonLabel>): string {
  if (label === 'Matched') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'Changed') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'Added') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (label === 'Removed') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-slate-700 bg-slate-100 border-slate-200'
}

export const BOMDetailedTable: React.FC<BOMDetailedTableProps> = ({ bom, findings, referenceItems = [] }) => {
  const { rows, totalBase, totalActive, totalVariance } = calculateBOMDetailedRows(bom)
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
      <table className="w-full min-w-[1180px] text-xs text-left">
        <caption className="sr-only">Detailed bill of materials cost comparison</caption>
        <thead>
          <tr className="bg-slate-900 text-white font-sans font-semibold text-[11px]">
            <th className="p-2.5 w-8">#</th>
            <th className="p-2.5">Item Code</th>
            <th className="p-2.5">Material Description</th>
            {showComparison && <th className="p-2.5">Comparison</th>}
            {showComparison && <th className="p-2.5">Confidence</th>}
            <th className="p-2.5 text-right">Usage (Q)</th>
            <th className="p-2.5 text-center">Unit</th>
            <th className="p-2.5 text-right">Base P0</th>
            <th className="p-2.5 text-right">Active P1</th>
            <th className="p-2.5 text-right">Base Loss %</th>
            <th className="p-2.5 text-right">Active Loss %</th>
            <th className="p-2.5 text-right">Base Cost</th>
            <th className="p-2.5 text-right">Active Cost</th>
            <th className="p-2.5 text-right">Δ Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans">
          {rows.map((row, idx) => {
            const finding = findingByCurrentId.get(row.id)
            const label = finding ? getBOMComparisonLabel(finding) : 'Review'

            return (
              <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-2.5 text-slate-400 tabular-nums">{idx + 1}</td>
                <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{row.itemCode}</td>
                <td className="p-2.5 font-sans text-slate-700 truncate max-w-[200px]" title={row.description}>
                  {row.description}
                </td>
                {showComparison && (
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-sm border text-[10px] font-sans font-semibold ${comparisonClass(label)}`}>
                      {label}
                    </span>
                  </td>
                )}
                {showComparison && (
                  <td className="p-2.5 whitespace-nowrap">
                    <ConfidenceBadge status={finding?.confidence ?? 'missing'} showLabel />
                  </td>
                )}
                <td className="p-2.5 text-right font-mono tabular-nums">{formatNumber(row.consumption, 4)}</td>
                <td className="p-2.5 text-center font-sans text-slate-500">{row.unit}</td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatNumber(row.basePrice, 2)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatNumber(row.activePrice, 2)}</td>
                <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">{formatPercent(row.baseLoss, 0)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatPercent(row.activeLoss, 0)}</td>
                <td className="p-2.5 text-right font-mono tabular-nums">{formatNumber(row.baseCost, 4)}</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">{formatNumber(row.activeCost, 4)}</td>
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
                <td colSpan={14} className="p-2.5 border-t border-rose-100">
                  <span className="font-sans font-semibold text-rose-700">Removed from Current</span>
                  <span className="ml-2 font-mono text-rose-900">{item?.itemCode ?? finding.referenceId ?? 'Unknown item'}</span>
                  {item?.description && <span className="ml-2 font-sans text-rose-800">{item.description}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 border-t-2 border-slate-300/80 font-bold text-xs">
            <td colSpan={showComparison ? 11 : 9} className="p-2.5 text-right text-slate-700 text-[10px] font-sans font-semibold">
              Total Direct Material (THB/pc)
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
