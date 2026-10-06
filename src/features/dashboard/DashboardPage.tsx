import React from 'react'
import { formatNumber, formatVariance } from '../../core'
import type { CostComparison, PrioritizationCandidate, SelectedComparisonSelection, SnapshotPair } from '../../core'
import { PageHeading, SelectedComparisonBanner } from '../../shared'
import type { RcaSimulationPageState } from '../rca-simulation/scenario-draft'
import { ComparisonDetails } from './components/ComparisonDetails'
import { CostCauseSection } from './components/CostCauseSection'
import { ScenarioOverview } from './components/ScenarioOverview'

interface DashboardPageProps {
  analysisSnapshotPair: SnapshotPair
  comparison: CostComparison
  candidates: PrioritizationCandidate[]
  selectedComparisonSelection: SelectedComparisonSelection | null
  isSelectedComparisonActive: boolean
  clearSelectedComparison: () => void
  simulationState: RcaSimulationPageState
  onOpenRca: () => void
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function gapColor(gap: number | null): string {
  if (gap === null || gap === 0) return 'text-slate-700'
  return gap > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function statusText(status: string): string {
  return status === 'complete' ? 'Complete' : status === 'estimated' ? 'Estimated' : 'Missing inputs'
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analysisSnapshotPair,
  comparison,
  candidates,
  selectedComparisonSelection,
  isSelectedComparisonActive,
  clearSelectedComparison,
  simulationState,
  onOpenRca
}) => {
  const product = analysisSnapshotPair.current.product
  const materialCandidates = candidates.filter(candidate => candidate.sourceType === 'bom')
  const processingCandidates = candidates.filter(candidate => candidate.sourceType === 'work-center')

  return (
    <div className="space-y-4">
      <PageHeading
        title="Cost Overview"
        description="Standard Cost comparison with BOM and Work Center detail. Business measures remain uncalculated until their formulas are confirmed."
      />

      {isSelectedComparisonActive && selectedComparisonSelection && (
        <SelectedComparisonBanner selection={selectedComparisonSelection} onExit={clearSelectedComparison} />
      )}

      <section aria-labelledby="overview-result-heading" className="border border-slate-300 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Result</p>
            <h2 id="overview-result-heading" className="mt-0.5 font-mono text-xs font-bold uppercase tracking-wide text-slate-900">Standard Cost / pc</h2>
          </div>
          <div className="min-w-40 text-right">
            <p className="font-mono text-[9px] font-semibold uppercase text-slate-500">Gap · Current − Reference</p>
            <p className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${gapColor(comparison.totalGap)}`}>
              {comparison.totalGap === null ? '—' : formatVariance(comparison.totalGap, 4)}
              <span className="ml-1 text-[10px] font-medium">THB/pc</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-3">
          <div className="bg-white px-4 py-3">
            <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Reference</dt>
            <dd className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-600">{formatCost(comparison.referenceCost.total)}</dd>
            <dd className="mt-0.5 font-mono text-[9px] text-slate-500">{statusText(comparison.referenceCost.status)} · THB/pc</dd>
          </div>
          <div className="bg-white px-4 py-3 sm:col-span-2">
            <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Current</dt>
            <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-950">{formatCost(comparison.currentCost.total)}</dd>
            <dd className="mt-0.5 font-mono text-[9px] text-slate-500">{statusText(comparison.currentCost.status)} · THB/pc</dd>
          </div>
        </dl>
      </section>

      <CostCauseSection comparison={comparison} />
      <ComparisonDetails materialCandidates={materialCandidates} processingCandidates={processingCandidates} />
      <ScenarioOverview
        currentSnapshot={analysisSnapshotPair.current}
        candidates={candidates}
        simulationState={simulationState}
        onOpenRca={onOpenRca}
      />

      <section aria-labelledby="business-context-heading" className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="border border-slate-300 bg-white px-3 py-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Current input context</p>
          <h2 id="business-context-heading" className="mt-0.5 text-xs font-semibold text-slate-900">Selling Price and SG&amp;A</h2>
          <dl className="mt-2 grid grid-cols-2 gap-3">
            <div><dt className="font-mono text-[9px] uppercase text-slate-500">Selling Price</dt><dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">{product.sellingPrice == null ? '—' : `${formatNumber(product.sellingPrice, 4)} THB`}</dd></div>
            <div><dt className="font-mono text-[9px] uppercase text-slate-500">SG&amp;A</dt><dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">{product.sgaPercent == null ? '—' : `${formatNumber(product.sgaPercent, 2)}%`}</dd></div>
          </dl>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">Context inputs only. They do not feed the Standard Cost calculation.</p>
        </div>
        <aside aria-label="Business metric formula status" className="border border-amber-300 bg-amber-50 px-3 py-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-amber-900">Calculation status</p>
          <p className="mt-1 text-xs font-semibold text-amber-950">Business metrics are not calculated — formula pending.</p>
          <p className="mt-1 text-[10px] leading-4 text-amber-900">COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity are not shown as numeric results. No placeholder values are used.</p>
        </aside>
      </section>
    </div>
  )
}
