import { useMemo } from 'react'
import {
  calculateScenarioCosts,
  calculateScenarioEconomics,
  formatNumber,
  formatVariance
} from '../../../core'
import type { CostSnapshot, PrioritizationCandidate } from '../../../core'
import type { ScenarioEconomicsResult } from '../../../core'
import {
  createScenarioDrafts,
  prepareScenarioEconomicsInputs,
  prepareScenarioDrafts,
  type RcaSimulationPageState
} from '../../rca-simulation/scenario-draft'
import { getScenarioInputDefinitions } from '../../rca-simulation/scenario-inputs'

interface ScenarioOverviewProps {
  currentSnapshot: CostSnapshot
  candidates: PrioritizationCandidate[]
  simulationState: RcaSimulationPageState
  onOpenRca: () => void
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function sumCostParts(first: number | null, second: number | null): number | null {
  return first === null || second === null ? null : first + second
}

function statusText(status: string): string {
  return status === 'complete' ? 'Complete' : status === 'estimated' ? 'Estimated' : 'Missing inputs'
}

function savingColor(saving: number | null): string {
  if (saving === null || saving === 0) return 'text-slate-700'
  return saving > 0 ? 'text-emerald-700' : 'text-rose-700'
}

function ScenarioCard({
  result,
  economics,
  label,
  hasOverrides,
  inputWarnings,
  economicsInputWarnings
}: {
  result: ReturnType<typeof calculateScenarioCosts>[number]
  economics: ScenarioEconomicsResult
  label: string
  hasOverrides: boolean
  inputWarnings: string[]
  economicsInputWarnings: string[]
}) {
  const currentProcessing = sumCostParts(result.currentCost.labor, result.currentCost.burden)
  const scenarioProcessing = sumCostParts(economics.scenarioCost.labor, economics.scenarioCost.burden)
  const warnings = [...inputWarnings, ...economicsInputWarnings, ...result.overrideWarnings, ...economics.warnings]

  return (
    <article className="border border-slate-300 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-900">Scenario {result.letter}</h3>
          {label && <p className="mt-0.5 break-words text-xs font-medium text-slate-700">{label}</p>}
        </div>
        <span className="font-mono text-[9px] uppercase text-slate-500">{hasOverrides ? 'Live preview from Current' : 'Current baseline'}</span>
      </header>
      <div className="grid grid-cols-2 gap-3 px-3 py-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase text-slate-500">Scenario Standard Cost · THB/pc</p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-950">{formatCost(economics.scenarioCost.total)}</p>
          <p className="mt-0.5 font-mono text-[9px] text-slate-500">{statusText(economics.scenarioCost.status)}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] font-semibold uppercase text-slate-500">Gross Improvement · THB/pc</p>
          <p className={`mt-1 font-mono text-base font-bold tabular-nums ${savingColor(economics.grossImprovementPerPiece)}`}>
            {economics.grossImprovementPerPiece === null ? '—' : formatVariance(economics.grossImprovementPerPiece, 4)}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-slate-500">Current − Scenario</p>
        </div>
      </div>
      <details className="border-t border-slate-200 px-3 py-2">
        <summary className="min-h-7 cursor-pointer py-1 font-mono text-[9px] font-semibold uppercase text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          MAT, LB, BD, and Processing
        </summary>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full min-w-[360px] text-xs">
            <thead className="font-mono text-[9px] uppercase text-slate-500">
              <tr><th scope="col" className="py-1 text-left">Cost · THB/pc</th><th scope="col" className="py-1 text-right">Current</th><th scope="col" className="py-1 text-right">Scenario</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><th scope="row" className="py-1 text-left font-medium text-slate-700">MAT</th><td className="py-1 text-right font-mono tabular-nums">{formatCost(result.currentCost.material)}</td><td className="py-1 text-right font-mono tabular-nums">{formatCost(economics.scenarioCost.material)}</td></tr>
              <tr><th scope="row" className="py-1 text-left font-medium text-slate-700">LB</th><td className="py-1 text-right font-mono tabular-nums">{formatCost(result.currentCost.labor)}</td><td className="py-1 text-right font-mono tabular-nums">{formatCost(economics.scenarioCost.labor)}</td></tr>
              <tr><th scope="row" className="py-1 text-left font-medium text-slate-700">BD</th><td className="py-1 text-right font-mono tabular-nums">{formatCost(result.currentCost.burden)}</td><td className="py-1 text-right font-mono tabular-nums">{formatCost(economics.scenarioCost.burden)}</td></tr>
              <tr><th scope="row" className="py-1 text-left font-medium text-slate-700">Processing · Labor + Burden</th><td className="py-1 text-right font-mono tabular-nums">{formatCost(currentProcessing)}</td><td className="py-1 text-right font-mono tabular-nums">{formatCost(scenarioProcessing)}</td></tr>
            </tbody>
          </table>
        </div>
      </details>
      {warnings.length > 0 && (
        <ul aria-label={`Scenario ${result.letter} review warnings`} className="space-y-1 border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-950">
          {warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
        </ul>
      )}
    </article>
  )
}

export function ScenarioOverview({ currentSnapshot, candidates, simulationState, onOpenRca }: ScenarioOverviewProps) {
  const selectedCandidate = candidates.find(candidate => candidate.candidateKey === simulationState.selectedCandidateKey)
  const scenarioForms = selectedCandidate
    ? simulationState.scenarioDraftsByCandidate[selectedCandidate.candidateKey] ?? createScenarioDrafts()
    : []
  const inputDefinitions = useMemo(
    () => selectedCandidate ? getScenarioInputDefinitions(selectedCandidate, currentSnapshot) : [],
    [selectedCandidate, currentSnapshot]
  )
  const preparedScenarios = useMemo(
    () => prepareScenarioDrafts(scenarioForms, inputDefinitions),
    [scenarioForms, inputDefinitions]
  )
  const preparedEconomics = useMemo(
    () => prepareScenarioEconomicsInputs(scenarioForms),
    [scenarioForms]
  )
  const scenarioResults = useMemo(
    () => selectedCandidate ? calculateScenarioCosts(currentSnapshot, preparedScenarios.drafts) : [],
    [selectedCandidate, currentSnapshot, preparedScenarios.drafts]
  )

  return (
    <section aria-labelledby="scenario-overview-heading" className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-300 pb-2">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Scenario impact</p>
          <h2 id="scenario-overview-heading" className="mt-0.5 text-xs font-semibold text-slate-900">Live RCA &amp; Simulation results</h2>
        </div>
        <button type="button" onClick={onOpenRca} className="min-h-8 border border-slate-400 bg-white px-2.5 font-mono text-[9px] font-semibold uppercase text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          Open RCA &amp; Simulation
        </button>
      </div>
      {selectedCandidate ? (
        <>
          <p className="text-[10px] text-slate-600">Human-selected candidate: <span className="font-semibold text-slate-900">{selectedCandidate.candidateName}</span>. All scenarios recalculate from Current.</p>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {scenarioResults.map(result => {
              const form = scenarioForms.find(item => item.letter === result.letter)
              const prepared = preparedScenarios.drafts.find(item => item.letter === result.letter)
              const hasOverrides = Boolean(prepared && Object.values(prepared.overrides).some(records => records && Object.keys(records).length > 0))
              const economics = calculateScenarioEconomics(
                result.currentCost,
                result.scenarioCost,
                preparedEconomics.inputsByLetter[result.letter],
                new Set(preparedEconomics.invalidFieldsByLetter[result.letter])
              )
              return (
                <ScenarioCard
                  key={result.letter}
                  result={result}
                  economics={economics}
                  label={form?.label.trim() ?? ''}
                  hasOverrides={hasOverrides}
                  inputWarnings={preparedScenarios.inputWarningsByLetter[result.letter]}
                  economicsInputWarnings={preparedEconomics.warningsByLetter[result.letter]}
                />
              )
            })}
          </div>
        </>
      ) : (
        <div role="status" className="border border-dashed border-slate-400 bg-white px-3 py-4 text-xs text-slate-600">
          Select a candidate in RCA &amp; Simulation to see its live Scenario A/B results here. The dashboard does not choose a candidate or scenario for you.
        </div>
      )}
    </section>
  )
}
