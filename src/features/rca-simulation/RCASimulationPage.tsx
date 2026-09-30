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
    <div className="space-y-5">
      <PageHeading
        title="RCA & Simulation"
        description="Select a candidate, add optional root-cause notes, and compare independent scenarios based on Current."
      />

      <div role="status" className="rounded-md border-l-4 border-l-slate-500 border-y border-r border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        Scenario drafts use the shared Standard Cost engine. Blank inputs keep Current values; scenario edits do not change Current, Reference, or Master Data.
      </div>

      <CandidateSelector
        candidates={candidates}
        selectedCandidateKey={state.selectedCandidateKey}
        onSelectCandidate={selectCandidate}
      />

      {candidates.length === 0 && (
        <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-semibold text-sm">No candidates available</h2>
          <p className="mt-1 text-sm leading-6">
            Candidate Prioritization has no findings to select. RCA notes and scenarios become available when the pool contains a candidate.
          </p>
        </div>
      )}

      {candidates.length > 0 && !selectedCandidate && (
        <p role="status" className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Select a candidate to view its context and record optional Root Cause and Action notes.
        </p>
      )}

      {selectedCandidate && (
        <>
          <ProblemStatementCard candidate={selectedCandidate} />

          <CandidateRcaForm
            key={selectedCandidate.candidateKey}
            candidateKey={selectedCandidate.candidateKey}
            record={candidateRcaRecords[selectedCandidate.candidateKey]}
            onSave={draft => saveCandidateRca(selectedCandidate.candidateKey, draft)}
          />

          {inputDefinitions.length === 0 && (
            <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <h3 className="font-semibold">No measurable Current inputs are available for this candidate</h3>
              <p className="mt-1 text-xs">
                The scenarios remain based on Current. Structural changes such as adding, removing, splitting, or merging records are not simulated.
              </p>
            </div>
          )}

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

          <section aria-labelledby="trial-handoff-heading" className="rounded-md border border-slate-200 bg-white p-4">
            <h2 id="trial-handoff-heading" className="text-sm font-semibold text-slate-900">Trial handoff</h2>
            <p className="mt-1 text-xs text-slate-600">Choose which scenario should proceed to the separate Trial stage.</p>
            <label htmlFor="trial-handoff-scenario" className="mt-3 block text-xs font-medium text-slate-700">
              Choose Scenario for Trial
            </label>
            <select
              id="trial-handoff-scenario"
              value={state.trialHandoffLetter ?? ''}
              onChange={event => updateState(previous => ({
                ...previous,
                trialHandoffLetter: (event.target.value || null) as 'A' | 'B' | 'C' | null
              }))}
              className="mt-1 min-h-10 w-full max-w-sm rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select a scenario</option>
              {scenarioDrafts.map(scenario => (
                <option key={scenario.letter} value={scenario.letter}>
                  Scenario {scenario.letter}{scenario.label ? ` — ${scenario.label}` : ''}
                </option>
              ))}
            </select>
            {state.trialHandoffLetter && (
              <p role="status" className="mt-2 text-xs text-slate-700">
                Scenario {state.trialHandoffLetter} selected for Trial handoff. Trial workflow remains outside this agreement.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
