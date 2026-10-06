import React from 'react'
import { formatNumber } from '../../core'
import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import type { CostComparison, CostSnapshot, PrioritizationCandidate, SelectedComparisonSelection, SnapshotPair } from '../../core'
import { PageHeading, SelectedComparisonBanner } from '../../shared'
import type { RcaSimulationPageState } from '../rca-simulation/scenario-draft'
import { ComparisonDetails } from './components/ComparisonDetails'
import { CostComparisonChart } from './components/CostComparisonChart'
import { CostCauseSection } from './components/CostCauseSection'
import { ResultSummary } from './components/ResultSummary'
import { ScenarioOverview } from './components/ScenarioOverview'

interface DashboardPageProps {
  analysisSnapshotPair: SnapshotPair
  simulationCurrentSnapshot: CostSnapshot
  comparison: CostComparison
  candidates: PrioritizationCandidate[]
  selectedComparisonSelection: SelectedComparisonSelection | null
  isSelectedComparisonActive: boolean
  clearSelectedComparison: () => void
  simulationState: RcaSimulationPageState
  onOpenRca: () => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analysisSnapshotPair,
  simulationCurrentSnapshot,
  comparison,
  candidates,
  selectedComparisonSelection,
  isSelectedComparisonActive,
  clearSelectedComparison,
  simulationState,
  onOpenRca
}) => {
  const product = analysisSnapshotPair.current.product
  const currentBusiness = calculateScenarioBusinessMetrics({
    sellingPrice: product.sellingPrice ?? null,
    sgaPercent: product.sgaPercent ?? null
  }, comparison.currentCost.total)
  const materialCandidates = candidates.filter(candidate => candidate.sourceType === 'bom')
  const processingCandidates = candidates.filter(candidate => candidate.sourceType === 'process')

  return (
    <div className="space-y-4">
      <PageHeading
        title="Cost Overview"
        description="Result → Cause → Detail. Start with the net Standard Cost Gap, then review its largest component movement."
      />

      {isSelectedComparisonActive && selectedComparisonSelection && (
        <SelectedComparisonBanner selection={selectedComparisonSelection} onExit={clearSelectedComparison} />
      )}

      <ResultSummary comparison={comparison} />

      <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
        <CostComparisonChart
          comparison={comparison}
          referenceSellingPrice={analysisSnapshotPair.reference.product.sellingPrice ?? null}
          currentSellingPrice={analysisSnapshotPair.current.product.sellingPrice ?? null}
        />

        <div className="space-y-3">
          <section aria-labelledby="business-context-heading" className="border border-slate-300 bg-white px-3 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Current input context</p>
            <h2 id="business-context-heading" className="mt-0.5 text-xs font-semibold text-slate-900">Selling Price and SG&amp;A</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div><dt className="font-mono text-[9px] uppercase text-slate-500">Selling Price</dt><dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">{product.sellingPrice == null ? '—' : `${formatNumber(product.sellingPrice, 4)} THB`}</dd></div>
              <div><dt className="font-mono text-[9px] uppercase text-slate-500">SG&amp;A</dt><dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">{product.sgaPercent == null ? '—' : `${formatNumber(product.sgaPercent, 2)}%`}</dd></div>
            </dl>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">Selling Price and SG&amp;A feed the finalized SG&amp;A and OP calculations; they do not change Standard Cost.</p>
          </section>

          <aside aria-label="Current OP calculation" className="border border-slate-300 bg-white px-3 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Current business result · THB/pc</p>
            <h2 className="mt-1 text-xs font-bold text-slate-950">Operating Profit (OP)</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <dt className="font-mono text-[9px] uppercase text-slate-500">SG&amp;A amount / pc</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                  {currentBusiness.sgaAmountPerPiece === null ? 'N/A' : formatNumber(currentBusiness.sgaAmountPerPiece, 4)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase text-slate-500">OP / pc</dt>
                <dd className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${currentBusiness.operatingProfitPerPiece !== null && currentBusiness.operatingProfitPerPiece < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {currentBusiness.operatingProfitPerPiece === null ? 'N/A' : formatNumber(currentBusiness.operatingProfitPerPiece, 4)}
                  {currentBusiness.operatingProfitPerPiece !== null && currentBusiness.operatingProfitPerPiece < 0 ? ' · Operating loss' : ''}
                </dd>
              </div>
            </dl>
            {currentBusiness.warnings.length > 0 && (
              <ul role="status" className="mt-2 list-disc space-y-1 pl-5 text-[10px] leading-4 text-amber-900">
                {currentBusiness.warnings.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-4 text-slate-600">OP = Selling Price − Standard Cost − SG&amp;A amount. Negative OP is an operating loss. Other unavailable business measures: COGS, GP, GP Margin, OP Margin, Sales, and Volume/Quantity.</p>
          </aside>
        </div>
      </div>

      <CostCauseSection comparison={comparison} />
      <ComparisonDetails materialCandidates={materialCandidates} processingCandidates={processingCandidates} />
      <ScenarioOverview
        currentSnapshot={simulationCurrentSnapshot}
        candidates={candidates}
        simulationState={simulationState}
        onOpenRca={onOpenRca}
      />

    </div>
  )
}
