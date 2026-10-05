import React from 'react'
import { formatVariance } from '../../../core'
import type { ComparisonFinding, CostComparison } from '../../../core'
import { isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'

type CostDetailSection = 'bom' | 'processing'

interface VarianceTreeCardProps {
  comparison: CostComparison
  comparisonView: ComparisonViewMode
  selectedComparison?: boolean
  onOpenDetail: (section: CostDetailSection) => void
}

const formatGap = (value: number | null): string => value === null ? '—' : formatVariance(value, 4)

function gapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function darkGapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-300'
  return value > 0 ? 'text-rose-300' : 'text-emerald-300'
}

function visibleCount(findings: ComparisonFinding[], viewMode: ComparisonViewMode): number {
  return findings.filter(finding => isVisibleInComparisonView(finding, viewMode)).length
}

function detailLink(section: CostDetailSection, label: string, onOpenDetail: VarianceTreeCardProps['onOpenDetail']) {
  return (
    <a
      href="#itemized-cost-details"
      onClick={() => onOpenDetail(section)}
      className="inline-flex min-h-8 items-center text-xs font-medium text-slate-700 underline decoration-slate-400 underline-offset-2 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {label}
    </a>
  )
}

export const VarianceTreeCard: React.FC<VarianceTreeCardProps> = ({ comparison, comparisonView, selectedComparison = false, onOpenDetail }) => {
  const bomCount = visibleCount(comparison.bomFindings, comparisonView)
  const routingCount = visibleCount(comparison.routingFindings, comparisonView)
  const rateCount = visibleCount(comparison.workCenterFindings, comparisonView)
  const processingCount = visibleCount(comparison.processingFindings, comparisonView)

  return (
    <section aria-labelledby="variance-tree-title" className="overflow-hidden border border-slate-300 bg-white">
      <header className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="variance-tree-title" className="font-mono text-xs font-bold uppercase tracking-wide text-slate-950">Variance tree</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
            {selectedComparison
              ? 'Element gaps use the selected BOM and Routing rows with all Work Center rates as calculation inputs.'
              : 'Element gaps use all records. Finding counts follow the status filter above.'}
          </p>
        </div>
        <p className="font-mono text-[10px] text-slate-600">Gap = Current − Reference · THB/pc</p>
      </header>

      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-1 border border-slate-800 bg-slate-900 px-3 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-300">Total standard cost</p>
            <p className="text-[10px] text-slate-400">Material + labor + burden</p>
          </div>
          <p className={`font-mono text-base font-semibold tabular-nums ${darkGapClass(comparison.totalGap)}`}>
            {formatGap(comparison.totalGap)} <span className="text-[10px] font-normal text-slate-300">THB/pc</span>
          </p>
        </div>

        <ol className="ml-3 border-l border-slate-300 pl-4 sm:ml-5 sm:pl-5">
          <li className="relative border-b border-slate-200 py-3 before:absolute before:-left-[1.3rem] before:top-[1.35rem] before:w-3 before:border-t before:border-slate-300 sm:before:-left-[1.55rem] sm:before:w-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-900">Direct material</h3>
                <p className="mt-0.5 text-[10px] text-slate-600">BOM findings in selected view: <span className="font-mono tabular-nums text-slate-900">{bomCount}</span></p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:justify-end">
                <p className={`font-mono text-xs font-semibold tabular-nums ${gapClass(comparison.elementGaps.material)}`}>
                  {formatGap(comparison.elementGaps.material)} <span className="text-[10px] font-normal text-slate-500">THB/pc</span>
                </p>
                {detailLink('bom', 'Review BOM rows', onOpenDetail)}
              </div>
            </div>
          </li>

          <li className="relative py-3 before:absolute before:-left-[1.3rem] before:top-[1.35rem] before:w-3 before:border-t before:border-slate-300 sm:before:-left-[1.55rem] sm:before:w-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-900">Processing cost</h3>
                <p className="mt-0.5 text-[10px] text-slate-600">Routing operations in selected view: <span className="font-mono tabular-nums text-slate-900">{routingCount}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {selectedComparison
                  ? <p className="text-[10px] text-slate-500">All Work Center rates remain calculation context.</p>
                  : <p className="text-[10px] text-slate-500">Work Center groups: <span className="font-mono tabular-nums text-slate-700">{processingCount}</span> · rate findings: <span className="font-mono tabular-nums text-slate-700">{rateCount}</span></p>}
                {detailLink('processing', 'Review Work Centers and Process detail', onOpenDetail)}
              </div>
            </div>

            <ol className="ml-3 mt-2 space-y-2 border-l border-slate-300 pl-4 sm:ml-5 sm:pl-5">
              <li className="relative flex flex-col gap-1 before:absolute before:-left-[1.3rem] before:top-2 before:w-3 before:border-t before:border-slate-300 sm:flex-row sm:items-center sm:justify-between sm:before:-left-[1.55rem] sm:before:w-5">
                <h4 className="text-[11px] font-medium text-slate-700">Direct labor</h4>
                <p className={`font-mono text-xs font-semibold tabular-nums ${gapClass(comparison.elementGaps.labor)}`}>
                  {formatGap(comparison.elementGaps.labor)} <span className="text-[10px] font-normal text-slate-500">THB/pc</span>
                </p>
              </li>
              <li className="relative flex flex-col gap-1 before:absolute before:-left-[1.3rem] before:top-2 before:w-3 before:border-t before:border-slate-300 sm:flex-row sm:items-center sm:justify-between sm:before:-left-[1.55rem] sm:before:w-5">
                <h4 className="text-[11px] font-medium text-slate-700">Manufacturing burden</h4>
                <p className={`font-mono text-xs font-semibold tabular-nums ${gapClass(comparison.elementGaps.burden)}`}>
                  {formatGap(comparison.elementGaps.burden)} <span className="text-[10px] font-normal text-slate-500">THB/pc</span>
                </p>
              </li>
            </ol>
          </li>
        </ol>
      </div>
    </section>
  )
}
