import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import {
  WhatIfScenario,
  formatCurrency,
  isPriceDriver,
  simulateWhatIfScenarios
} from '../../core'
import { createScenarioDrafts, updateScenarioDraft } from './scenario-draft'
import { CandidateRcaForm } from './components/CandidateRcaForm'
import { CandidateSelector } from './components/CandidateSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'
import { TrialValidationCard } from './components/TrialValidationCard'

export const RCASimulationPage: React.FC = () => {
  const {
    activeProductId,
    candidates,
    topDrivers,
    candidateRcaRecords,
    costBreakdown,
    bom,
    rates,
    snapshotPair,
    saveCandidateRca,
    promoteActiveToBaseline
  } = useAppStore()

  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null)
  const [selectionProductId, setSelectionProductId] = useState(activeProductId)
  const [scenarioDraftsByProduct, setScenarioDraftsByProduct] = useState<Record<string, Record<string, WhatIfScenario[]>>>({})

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

  const selectedCandidate = candidates.find(candidate => candidate.candidateKey === effectiveSelectedCandidateKey) ?? null
  const selectCandidate = (candidateKey: string | null) => {
    setSelectionProductId(activeProductId)
    setSelectedCandidateKey(candidateKey)
  }
  const currentSnapshotBom = selectedCandidate?.sourceType === 'bom'
    ? snapshotPair.current.bom.find(item => item.id === selectedCandidate.sourceId) ?? null
    : null
  const legacyBomItem = selectedCandidate?.sourceType === 'bom'
    ? bom.find(item => item.id === selectedCandidate.sourceId) ?? null
    : null
  const simulationBomItem = currentSnapshotBom && legacyBomItem
    && currentSnapshotBom.itemCode === legacyBomItem.itemCode
    && currentSnapshotBom.consumption === legacyBomItem.consumption
    && currentSnapshotBom.price === legacyBomItem.activePrice
    && currentSnapshotBom.loss === legacyBomItem.activeLoss
    ? legacyBomItem
    : null

  const simulationDriver = useMemo(() => {
    if (
      !selectedCandidate
      || selectedCandidate.status !== 'CHANGED'
      || selectedCandidate.sourceType !== 'bom'
      || !simulationBomItem
      || (selectedCandidate.factor !== 'Price' && selectedCandidate.factor !== 'Loss %')
    ) {
      return null
    }

    return topDrivers.find(driver => (
      driver.sourceType === 'bom'
      && driver.sourceId === selectedCandidate.sourceId
      && (selectedCandidate.factor === 'Price'
        ? isPriceDriver(driver.rcaParameter)
        : /loss/i.test(driver.rcaParameter))
    )) ?? null
  }, [selectedCandidate, simulationBomItem, topDrivers])

  const scenarios = selectedCandidate
    ? scenarioDraftsByProduct[activeProductId]?.[selectedCandidate.candidateKey] ?? createScenarioDrafts()
    : []

  const updateScenario = (idx: number, field: string, val: string) => {
    if (!selectedCandidate || !simulationDriver || idx < 0 || idx >= scenarios.length) return
    setScenarioDraftsByProduct(previous => ({
      ...previous,
      [activeProductId]: {
        ...previous[activeProductId],
        [selectedCandidate.candidateKey]: updateScenarioDraft(
          previous[activeProductId]?.[selectedCandidate.candidateKey] ?? createScenarioDrafts(),
          idx,
          field as keyof WhatIfScenario,
          val
        )
      }
    }))
  }

  const simulationResults = useMemo(() => {
    if (!simulationDriver || !simulationBomItem) return []
    return simulateWhatIfScenarios({
      driver: simulationDriver,
      bomItem: simulationBomItem,
      routingStep: null,
      rates,
      totalActiveCost: costBreakdown.totalActive,
      scenarios
    })
  }, [simulationDriver, simulationBomItem, rates, costBreakdown.totalActive, scenarios])

  const targetLabel = simulationDriver && isPriceDriver(simulationDriver.rcaParameter)
    ? 'Target Purchase Price (THB)'
    : 'Target Scrap Loss (%)'
  const targetPlaceholder = simulationDriver && simulationBomItem
    ? isPriceDriver(simulationDriver.rcaParameter)
      ? `e.g. ${simulationBomItem.basePrice.toFixed(2)}`
      : `e.g. ${(simulationBomItem.baseLoss * 100).toFixed(0)}`
    : ''

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
        <div>
          <h1 className="text-sm font-bold text-slate-900">Root Cause Analysis &amp; What-If Simulator</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Select a candidate, document optional notes, and review supported scenarios.
          </p>
        </div>
      </div>

      <div role="status" className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
        Scenario drafts recalculate this page without changing Active, Reference, Current, or Master Data.
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
            Candidate Prioritization has no findings to select. RCA notes and simulation become available when the pool contains a candidate.
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

          {simulationDriver && simulationBomItem ? (
            <>
              <div role="status" className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
                The current simulator supports changed material Price and Loss candidates only when the matching Current BOM values are available.
              </div>
              <SimulationGrid
                scenarios={simulationResults}
                targetLabel={targetLabel}
                targetPlaceholder={targetPlaceholder}
                isRouting={false}
                onUpdateScenario={updateScenario}
              />

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                <span className="font-sans font-medium text-slate-600">Active Total Cost:</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(costBreakdown.totalActive, 4, 'THB/pc')}
                </span>
              </div>

              <TrialValidationCard
                baselineTotalCost={costBreakdown.totalBase}
                activeTotalCost={costBreakdown.totalActive}
                scenarios={simulationResults}
                onPromoteToBaseline={promoteActiveToBaseline}
              />
            </>
          ) : (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
              <h3 className="font-semibold">Simulation is not available for this candidate yet</h3>
              <p className="mt-1 text-xs">
                This candidate remains selected and its notes can be saved. The current simulator does not model this candidate, and no other driver is substituted.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
