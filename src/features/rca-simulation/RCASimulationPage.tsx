import React, { useEffect, useMemo } from 'react'
import { calculateScenarioCosts } from '../../core/calculations/scenario-cost'
import { calculateScenarioEconomics } from '../../core/calculations/scenario-economics'
import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import type { ScenarioBusinessInputs, ScenarioBusinessResult, ScenarioEconomicsInputs } from '../../core'
import { useAppStore } from '../../state'
import {
  createScenarioDrafts,
  prepareScenarioBusinessInputs,
  prepareScenarioEconomicsInputs,
  prepareScenarioDrafts,
  type RcaSimulationPageState,
  type ScenarioDraftForm,
  updateScenarioBusinessInput,
  updateScenarioEconomicsInput,
  updateScenarioInputValue,
  updateScenarioLabel
} from './scenario-draft'
import { getScenarioInputDefinitions } from './scenario-inputs'
import { CandidateRcaForm } from './components/CandidateRcaForm'
import { CandidateSelector } from './components/CandidateSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'
import { PageHeading, SelectedComparisonBanner } from '../../shared'

interface RCASimulationPageProps {
  state: RcaSimulationPageState
  updateState: (update: (state: RcaSimulationPageState) => RcaSimulationPageState) => void
}

export const RCASimulationPage: React.FC<RCASimulationPageProps> = ({ state, updateState }) => {
  const {
    candidates,
    candidateRcaRecords,
    snapshotPair,
    isSelectedComparisonActive,
    selectedComparisonSelection,
    clearSelectedComparison,
    saveCandidateRca
  } = useAppStore()
  const selectedCandidate = candidates.find(candidate => candidate.candidateKey === state.selectedCandidateKey) ?? null

  useEffect(() => {
    if (state.selectedCandidateKey && !candidates.some(candidate => candidate.candidateKey === state.selectedCandidateKey)) {
      updateState(previous => ({ ...previous, selectedCandidateKey: null, trialHandoffLetter: null }))
    }
  }, [candidates, state.selectedCandidateKey, updateState])

  useEffect(() => {
    if (selectedCandidate && isSelectedComparisonActive) clearSelectedComparison()
  }, [selectedCandidate?.candidateKey, isSelectedComparisonActive, clearSelectedComparison])

  const selectCandidate = (candidateKey: string | null) => {
    updateState(previous => ({ ...previous, selectedCandidateKey: candidateKey, trialHandoffLetter: null }))
    if (candidateKey) clearSelectedComparison()
  }

  const savedScenarioDrafts = selectedCandidate
    ? state.scenarioDraftsByCandidate[selectedCandidate.candidateKey]
    : undefined
  const scenarioDrafts = useMemo(
    () => savedScenarioDrafts ?? createScenarioDrafts(),
    [selectedCandidate?.candidateKey, savedScenarioDrafts]
  )

  const currentSnapshot = snapshotPair.current
  const currentBusinessInputs = useMemo<ScenarioBusinessInputs>(
    () => ({
      sellingPrice: currentSnapshot.product.sellingPrice ?? null,
      sgaPercent: currentSnapshot.product.sgaPercent ?? null
    }),
    [currentSnapshot.product.sellingPrice, currentSnapshot.product.sgaPercent]
  )
  const inputDefinitions = useMemo(
    () => selectedCandidate ? getScenarioInputDefinitions(selectedCandidate, currentSnapshot) : [],
    [selectedCandidate, currentSnapshot]
  )
  const preparedDrafts = useMemo(
    () => prepareScenarioDrafts(scenarioDrafts, inputDefinitions),
    [scenarioDrafts, inputDefinitions]
  )
  const preparedEconomics = useMemo(
    () => prepareScenarioEconomicsInputs(scenarioDrafts),
    [scenarioDrafts]
  )
  const preparedBusiness = useMemo(
    () => prepareScenarioBusinessInputs(scenarioDrafts, currentBusinessInputs),
    [scenarioDrafts, currentBusinessInputs]
  )
  const scenarioResults = useMemo(
    () => selectedCandidate && !isSelectedComparisonActive ? calculateScenarioCosts(currentSnapshot, preparedDrafts.drafts) : [],
    [selectedCandidate, isSelectedComparisonActive, currentSnapshot, preparedDrafts.drafts]
  )
  const economicsResults = useMemo(
    () => scenarioResults.map(result => ({
      letter: result.letter,
      ...calculateScenarioEconomics(
        result.currentCost,
        result.scenarioCost,
        preparedEconomics.inputsByLetter[result.letter],
        new Set(preparedEconomics.invalidFieldsByLetter[result.letter])
      )
    })),
    [scenarioResults, preparedEconomics.inputsByLetter, preparedEconomics.invalidFieldsByLetter]
  )
  const businessResults = useMemo(
    () => scenarioResults.map(result => {
      const economics = economicsResults.find(item => item.letter === result.letter)
      const business: ScenarioBusinessResult = calculateScenarioBusinessMetrics(
        preparedBusiness.inputsByLetter[result.letter],
        economics?.scenarioCost.total ?? null
      )
      return { letter: result.letter, ...business }
    }),
    [scenarioResults, economicsResults, preparedBusiness.inputsByLetter]
  )

  const updateDrafts = (transform: (drafts: ScenarioDraftForm[]) => ScenarioDraftForm[]) => {
    if (!selectedCandidate) return
    const candidateKey = selectedCandidate.candidateKey

    updateState(previous => {
      const currentDrafts = previous.scenarioDraftsByCandidate[candidateKey] ?? createScenarioDrafts()
      return {
        ...previous,
        scenarioDraftsByCandidate: {
          ...previous.scenarioDraftsByCandidate,
          [candidateKey]: transform(currentDrafts)
        }
      }
    })
  }

  const handleUpdateLabel = (letter: ScenarioDraftForm['letter'], label: string) => {
    updateDrafts(drafts => updateScenarioLabel(drafts, letter, label))
  }

  const handleUpdateInput = (letter: ScenarioDraftForm['letter'], inputKey: string, value: string) => {
    updateDrafts(drafts => updateScenarioInputValue(drafts, letter, inputKey, value))
  }

  const handleUpdateEconomics = (
    letter: ScenarioDraftForm['letter'],
    key: keyof ScenarioEconomicsInputs,
    value: string
  ) => {
    updateDrafts(drafts => updateScenarioEconomicsInput(drafts, letter, key, value))
  }

  const handleUpdateBusinessInput = (
    letter: ScenarioDraftForm['letter'],
    key: keyof ScenarioBusinessInputs,
    value: string
  ) => {
    updateDrafts(drafts => updateScenarioBusinessInput(drafts, letter, key, value))
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="RCA & Simulation"
        description="Record the cause and response, then compare cost scenarios for a candidate you choose."
      />
      {isSelectedComparisonActive && selectedComparisonSelection && !selectedCandidate && (
        <SelectedComparisonBanner selection={selectedComparisonSelection} onExit={clearSelectedComparison} />
      )}
      <aside aria-label="Simulation basis" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-l-4 border-slate-300 border-l-slate-900 bg-white px-3 py-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600">Simulation basis</span>
        <span className="font-semibold text-slate-900">Current</span>
        <p className="min-w-0 flex-1 text-xs leading-5 text-slate-700">
          A and B are independent predictions from the full Current snapshot through the shared Standard Cost engine. Edits never change Current, Reference, or Master Data.
        </p>
      </aside>

      <CandidateSelector
        candidates={candidates}
        selectedCandidateKey={state.selectedCandidateKey}
        onSelectCandidate={selectCandidate}
      />

      {selectedCandidate && !isSelectedComparisonActive && (
        <>
          <ProblemStatementCard candidate={selectedCandidate} />

          <CandidateRcaForm
            key={selectedCandidate.candidateKey}
            candidateKey={selectedCandidate.candidateKey}
            record={candidateRcaRecords[selectedCandidate.candidateKey]}
            onSave={draft => saveCandidateRca(selectedCandidate.candidateKey, draft)}
          />

          <SimulationGrid
            scenarios={scenarioDrafts}
            inputDefinitions={inputDefinitions}
            results={scenarioResults}
            economicsResults={economicsResults}
            businessResults={businessResults}
            currentBusinessInputs={currentBusinessInputs}
            inputWarningsByLetter={preparedDrafts.inputWarningsByLetter}
            economicsInputWarningsByLetter={preparedEconomics.warningsByLetter}
            businessInputWarningsByLetter={preparedBusiness.warningsByLetter}
            onUpdateLabel={handleUpdateLabel}
            onUpdateInput={handleUpdateInput}
            onUpdateEconomics={handleUpdateEconomics}
            onUpdateBusinessInput={handleUpdateBusinessInput}
          />

          <section aria-labelledby="trial-handoff-heading" className="border border-slate-300 bg-white px-3 py-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)] md:items-end">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600">04 / Trial</p>
                <h2 id="trial-handoff-heading" className="mt-1 font-mono text-xs font-bold uppercase text-slate-900">Mark a scenario for Trial</h2>
                <p id="trial-handoff-guidance" className="mt-1 text-xs leading-5 text-slate-600">
                  Choose after reviewing the scenarios. This selection is a handoff marker; Trial is a separate stage.
                </p>
              </div>
              <div>
                <label htmlFor="trial-handoff-scenario" className="mb-1 block font-mono text-[10px] font-semibold uppercase text-slate-700">
                  Scenario
                </label>
                <select
                  id="trial-handoff-scenario"
                  aria-describedby="trial-handoff-guidance"
                  value={state.trialHandoffLetter ?? ''}
                  onChange={event => updateState(previous => ({
                    ...previous,
                    trialHandoffLetter: (event.target.value || null) as 'A' | 'B' | null
                  }))}
                  className="min-h-9 w-full rounded-sm border border-slate-400 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select a scenario</option>
                  {scenarioDrafts.map(scenario => (
                    <option key={scenario.letter} value={scenario.letter}>
                      Scenario {scenario.letter}{scenario.label ? ` — ${scenario.label}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {state.trialHandoffLetter && (
              <p role="status" className="mt-3 border-l-2 border-emerald-700 pl-3 text-xs text-slate-700">
                Scenario {state.trialHandoffLetter} is marked for the separate Trial stage.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
