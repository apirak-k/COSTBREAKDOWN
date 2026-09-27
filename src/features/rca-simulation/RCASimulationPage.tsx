import React, { useEffect, useMemo, useState } from 'react'
import { calculateScenarioCosts } from '../../core/calculations/scenario-cost'
import { calculateScenarioEconomics } from '../../core/calculations/scenario-economics'
import type { ScenarioEconomicsInputs } from '../../core'
import { useAppStore } from '../../state'
import {
  createScenarioDrafts,
  prepareScenarioEconomicsInputs,
  prepareScenarioDrafts,
  ScenarioDraftForm,
  updateScenarioEconomicsInput,
  updateScenarioInputValue,
  updateScenarioLabel
} from './scenario-draft'
import { getScenarioInputDefinitions } from './scenario-inputs'
import { CandidateRcaForm } from './components/CandidateRcaForm'
import { CandidateSelector } from './components/CandidateSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'

export const RCASimulationPage: React.FC = () => {
  const {
    activeProductId,
    candidates,
    candidateRcaRecords,
    snapshotPair,
    saveCandidateRca
  } = useAppStore()

  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null)
  const [trialHandoffLetter, setTrialHandoffLetter] = useState<'A' | 'B' | 'C' | null>(null)
  const [selectionProductId, setSelectionProductId] = useState(activeProductId)
  const [scenarioDraftsByProduct, setScenarioDraftsByProduct] = useState<Record<string, Record<string, ScenarioDraftForm[]>>>({})

  useEffect(() => {
    setSelectedCandidateKey(null)
    setSelectionProductId(activeProductId)
  }, [activeProductId])

  const effectiveSelectedCandidateKey = selectionProductId === activeProductId
    ? selectedCandidateKey
    : null

  useEffect(() => {
    if (effectiveSelectedCandidateKey && !candidates.some(candidate => candidate.candidateKey === effectiveSelectedCandidateKey)) {
      setSelectedCandidateKey(null)
    }
  }, [candidates, effectiveSelectedCandidateKey])

  useEffect(() => {
    setTrialHandoffLetter(null)
  }, [activeProductId, effectiveSelectedCandidateKey])

  const selectedCandidate = candidates.find(candidate => candidate.candidateKey === effectiveSelectedCandidateKey) ?? null
  const selectCandidate = (candidateKey: string | null) => {
    setSelectionProductId(activeProductId)
    setSelectedCandidateKey(candidateKey)
  }

  const savedScenarioDrafts = selectedCandidate
    ? scenarioDraftsByProduct[activeProductId]?.[selectedCandidate.candidateKey]
    : undefined
  const scenarioDrafts = useMemo(
    () => savedScenarioDrafts ?? createScenarioDrafts(),
    [activeProductId, selectedCandidate?.candidateKey, savedScenarioDrafts]
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

    setScenarioDraftsByProduct(previous => {
      const productDrafts = previous[activeProductId] ?? {}
      const currentDrafts = productDrafts[candidateKey] ?? createScenarioDrafts()
      return {
        ...previous,
        [activeProductId]: {
          ...productDrafts,
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
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="text-sm font-bold text-slate-900">Root Cause Analysis &amp; What-If Simulator</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Select a candidate, document optional notes, and compare independent scenarios from Current.
          </p>
        </div>
      </div>

      <div role="status" className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
        Scenario drafts use the shared Standard Cost engine. Blank inputs keep Current values; scenario edits do not change Current, Reference, or Master Data.
      </div>

      <CandidateSelector
        candidates={candidates}
        selectedCandidateKey={effectiveSelectedCandidateKey}
        onSelectCandidate={selectCandidate}
      />

      {candidates.length === 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-900">
          <h2 className="font-bold text-xs uppercase tracking-wide">No candidates available</h2>
          <p className="mt-1 text-xs">
            Candidate Prioritization has no findings to select. RCA notes and scenarios become available when the pool contains a candidate.
          </p>
        </div>
      )}

      {candidates.length > 0 && !selectedCandidate && (
        <p role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
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
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
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

          <section aria-labelledby="trial-handoff-heading" className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 id="trial-handoff-heading" className="text-sm font-semibold text-slate-900">Trial handoff</h2>
            <p className="mt-1 text-xs text-slate-600">Choose which scenario should proceed to the separate Trial stage.</p>
            <label htmlFor="trial-handoff-scenario" className="mt-3 block text-xs font-medium text-slate-700">
              Choose Scenario for Trial
            </label>
            <select
              id="trial-handoff-scenario"
              value={trialHandoffLetter ?? ''}
              onChange={event => setTrialHandoffLetter((event.target.value || null) as 'A' | 'B' | 'C' | null)}
              className="mt-1 w-full max-w-sm rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Select a scenario</option>
              {scenarioDrafts.map(scenario => (
                <option key={scenario.letter} value={scenario.letter}>
                  Scenario {scenario.letter}{scenario.label ? ` — ${scenario.label}` : ''}
                </option>
              ))}
            </select>
            {trialHandoffLetter && (
              <p role="status" className="mt-2 text-xs text-slate-700">
                Scenario {trialHandoffLetter} selected for Trial handoff. Trial workflow remains outside this agreement.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
