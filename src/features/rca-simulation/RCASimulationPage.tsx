import React, { useEffect, useMemo } from 'react'
import { calculateScenarioCosts } from '../../core/calculations/scenario-cost'
import { calculateScenarioEconomics } from '../../core/calculations/scenario-economics'
import type { ScenarioEconomicsInputs } from '../../core'
import { useAppStore } from '../../state'
import {
  createScenarioDrafts,
  prepareScenarioEconomicsInputs,
  prepareScenarioDrafts,
  type RcaSimulationPageState,
  type ScenarioDraftForm,
  updateScenarioEconomicsInput,
  updateScenarioInputValue,
  updateScenarioLabel
} from './scenario-draft'
import { getScenarioInputDefinitions } from './scenario-inputs'
import { CandidateRcaForm } from './components/CandidateRcaForm'
import { CandidateSelector } from './components/CandidateSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'
import { PageHeading } from '../../shared'

interface RCASimulationPageProps {
  state: RcaSimulationPageState
  updateState: (update: (state: RcaSimulationPageState) => RcaSimulationPageState) => void
}

export const RCASimulationPage: React.FC<RCASimulationPageProps> = ({ state, updateState }) => {
  const {
    candidates,
    candidateRcaRecords,
    snapshotPair,
    saveCandidateRca
  } = useAppStore()

  useEffect(() => {
    if (state.selectedCandidateKey && !candidates.some(candidate => candidate.candidateKey === state.selectedCandidateKey)) {
      updateState(previous => ({ ...previous, selectedCandidateKey: null, trialHandoffLetter: null }))
    }
  }, [candidates, state.selectedCandidateKey, updateState])

  const selectedCandidate = candidates.find(candidate => candidate.candidateKey === state.selectedCandidateKey) ?? null
  const selectCandidate = (candidateKey: string | null) => {
    updateState(previous => ({ ...previous, selectedCandidateKey: candidateKey, trialHandoffLetter: null }))
  }

  const savedScenarioDrafts = selectedCandidate
    ? state.scenarioDraftsByCandidate[selectedCandidate.candidateKey]
    : undefined
  const scenarioDrafts = useMemo(
    () => savedScenarioDrafts ?? createScenarioDrafts(),
    [selectedCandidate?.candidateKey, savedScenarioDrafts]
  )

  const currentSnapshot = snapshotPair.current
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
  const scenarioResults = useMemo(
    () => selectedCandidate ? calculateScenarioCosts(currentSnapshot, preparedDrafts.drafts) : [],
    [selectedCandidate, currentSnapshot, preparedDrafts.drafts]
  )
  const economicsResults = useMemo(
    () => scenarioResults.map(result => ({
      letter: result.letter,
      ...calculateScenarioEconomics(
        result.currentCost.total,
        result.scenarioCost.total,
        preparedEconomics.inputsByLetter[result.letter]
      )
    })),
    [scenarioResults, preparedEconomics.inputsByLetter]
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

  return (
    <div className="space-y-6">
      <PageHeading
        title="RCA & Simulation"
        description="Record the cause and response, then compare cost scenarios for a candidate you choose."
      />

      <aside aria-label="Simulation basis" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-blue-700 bg-slate-50 px-4 py-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-slate-600">Simulation basis</span>
        <span className="font-semibold text-slate-900">Current</span>
        <p className="min-w-0 flex-1 text-sm leading-5 text-slate-700">
          A, B, and C are independent predictions through the shared Standard Cost engine. Edits never change Current, Reference, or Master Data.
        </p>
      </aside>

      <CandidateSelector
        candidates={candidates}
        selectedCandidateKey={state.selectedCandidateKey}
        onSelectCandidate={selectCandidate}
      />

      {selectedCandidate && (
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
            inputWarningsByLetter={preparedDrafts.inputWarningsByLetter}
            economicsInputWarningsByLetter={preparedEconomics.warningsByLetter}
            onUpdateLabel={handleUpdateLabel}
            onUpdateInput={handleUpdateInput}
            onUpdateEconomics={handleUpdateEconomics}
          />

          <section aria-labelledby="trial-handoff-heading" className="border-t-2 border-slate-900 pt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)] md:items-end">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-wide text-slate-600">04 / Trial</p>
                <h2 id="trial-handoff-heading" className="mt-1 text-base font-semibold text-slate-900">Mark a scenario for Trial</h2>
                <p id="trial-handoff-guidance" className="mt-1 text-sm leading-5 text-slate-600">
                  Choose after reviewing the scenarios. This selection is a handoff marker; Trial is a separate stage.
                </p>
              </div>
              <div>
                <label htmlFor="trial-handoff-scenario" className="mb-1 block text-xs font-semibold text-slate-700">
                  Scenario
                </label>
                <select
                  id="trial-handoff-scenario"
                  aria-describedby="trial-handoff-guidance"
                  value={state.trialHandoffLetter ?? ''}
                  onChange={event => updateState(previous => ({
                    ...previous,
                    trialHandoffLetter: (event.target.value || null) as 'A' | 'B' | 'C' | null
                  }))}
                  className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              <p role="status" className="mt-3 border-l-2 border-emerald-700 pl-3 text-sm text-slate-700">
                Scenario {state.trialHandoffLetter} is marked for the separate Trial stage.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
