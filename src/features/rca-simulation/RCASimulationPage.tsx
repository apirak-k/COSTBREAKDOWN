import React, { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../../state'
import {
  WhatIfScenario,
  DriverRcaRecord,
  simulateWhatIfScenarios,
  formatCurrency,
  isYieldDriver,
  isPriceDriver
} from '../../core'
import { createScenarioDrafts, updateScenarioDraft } from './scenario-draft'
import { getSelectedDrivers } from '../candidate-selection/driver-selection'

// Sub-components
import { DriverSelector } from './components/DriverSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'
import { TrialValidationCard } from './components/TrialValidationCard'

export const RCASimulationPage: React.FC = () => {
  const {
    topDrivers,
    selectedDriverKeys,
    rcaRecords,
    costBreakdown,
    bom,
    routing,
    rates,
    promoteActiveToBaseline
  } = useAppStore()

  const selectedDrivers = useMemo(
    () => getSelectedDrivers(topDrivers, selectedDriverKeys),
    [topDrivers, selectedDriverKeys]
  )
  const [selectedDriverKey, setSelectedDriverKey] = useState<string | null>(() => selectedDriverKeys[0] ?? null)

  useEffect(() => {
    if (!selectedDrivers.some(driver => driver.driverKey === selectedDriverKey)) {
      setSelectedDriverKey(selectedDrivers[0]?.driverKey ?? null)
    }
  }, [selectedDrivers, selectedDriverKey])

  // Active driver based on selection
  const activeDriver = useMemo(() => {
    return selectedDrivers.find(driver => driver.driverKey === selectedDriverKey) ?? null
  }, [selectedDrivers, selectedDriverKey])

  // Driver type & matching source data row
  const isRoutingDriver = activeDriver?.sourceType === 'routing'
  const bomItem = activeDriver?.sourceType === 'bom'
    ? bom.find(b => b.id === activeDriver.sourceId) ?? null
    : null
  const routingStep = activeDriver?.sourceType === 'routing'
    ? routing.find(r => r.id === activeDriver.sourceId) ?? null
    : null

  // Keep 3 What-If Scenario Drafts independently for each selected driver.
  const [scenarioDraftsByDriver, setScenarioDraftsByDriver] = useState<Record<string, WhatIfScenario[]>>({})
  const scenarios = activeDriver
    ? scenarioDraftsByDriver[activeDriver.driverKey] ?? createScenarioDrafts()
    : []

  const updateScenario = (idx: number, field: string, val: string) => {
    if (!activeDriver || idx < 0 || idx >= scenarios.length) return
    setScenarioDraftsByDriver(previous => ({
      ...previous,
      [activeDriver.driverKey]: updateScenarioDraft(
        previous[activeDriver.driverKey] ?? createScenarioDrafts(),
        idx,
        field as keyof WhatIfScenario,
        val
      )
    }))
  }

  // Simulation engine evaluation
  const simulationResults = useMemo(() => {
    return simulateWhatIfScenarios({
      driver: activeDriver,
      bomItem,
      routingStep,
      rates,
      totalActiveCost: costBreakdown.totalActive,
      scenarios
    })
  }, [activeDriver, bomItem, routingStep, rates, costBreakdown.totalActive, scenarios])

  // Dynamic input label for target value
  const targetLabel = useMemo(() => {
    if (!activeDriver) return 'Target Value'
    if (isRoutingDriver) {
      const isYield = isYieldDriver(activeDriver.rcaParameter)
      return isYield ? 'Target Yield Rate (%)' : 'Target Machine Capacity (pcs/hr)'
    }
    const isPrice = isPriceDriver(activeDriver.rcaParameter)
    return isPrice ? 'Target Purchase Price (THB)' : 'Target Scrap Loss (%)'
  }, [activeDriver, isRoutingDriver])

  // Dynamic placeholder hint
  const targetPlaceholder = useMemo(() => {
    if (!activeDriver) return ''
    if (isRoutingDriver && routingStep) {
      const isYield = isYieldDriver(activeDriver.rcaParameter)
      return isYield ? `e.g. ${(routingStep.baseYield * 100).toFixed(0)}` : `e.g. ${routingStep.baseCap}`
    }
    if (bomItem) {
      const isPrice = isPriceDriver(activeDriver.rcaParameter)
      return isPrice ? `e.g. ${bomItem.basePrice.toFixed(2)}` : `e.g. ${(bomItem.baseLoss * 100).toFixed(0)}`
    }
    return ''
  }, [activeDriver, isRoutingDriver, routingStep, bomItem])

  const activeRca = activeDriver ? rcaRecords[activeDriver.driverKey] as DriverRcaRecord | undefined : undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900">Root Cause Analysis &amp; What-If Simulator</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Evaluate ROI and Net Benefit across 3 Scenarios
          </p>
        </div>
      </div>

      <div role="status" className="px-3 py-2.5 rounded border border-slate-200 bg-slate-50 text-[11px] text-slate-600 font-sans">
        Scenario Draft only: changing What-If inputs recalculates this page without changing Active, Reference, Current, or Master Data.
      </div>

      {selectedDrivers.length === 0 ? (
        <div role="status" className="bg-white p-5 rounded-lg border border-amber-200 bg-amber-50/50 text-sm text-amber-900">
          <h2 className="font-bold font-mono text-xs uppercase tracking-tight">No drivers selected for Simulation</h2>
          <p className="mt-1 text-xs font-sans">
            Go to Candidate Selection / Ranking, select one or more drivers for RCA, then return here. Simulation evaluates one selected driver at a time.
          </p>
        </div>
      ) : (
        <>
          {/* Driver Selector Bar */}
          <DriverSelector
            topDrivers={selectedDrivers}
            selectedDriverKey={activeDriver?.driverKey ?? null}
            rcaRecords={rcaRecords}
            onSelectDriver={setSelectedDriverKey}
          />

          {/* Problem Statement Card */}
          <ProblemStatementCard driver={activeDriver} rca={activeRca} />

          {/* 3-Scenario Simulation Grid */}
          {activeDriver && (
            <SimulationGrid
              scenarios={simulationResults}
              targetLabel={targetLabel}
              targetPlaceholder={targetPlaceholder}
              isRouting={isRoutingDriver}
              onUpdateScenario={updateScenario}
            />
          )}

          {/* Current Total Reference */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
            <span className="font-sans text-slate-600 font-medium">
              Active Total Cost:
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {formatCurrency(costBreakdown.totalActive, 4, 'THB/pc')}
            </span>
          </div>

          {/* Section 5: Actual vs Predicted Validation Matrix */}
          <TrialValidationCard
            baselineTotalCost={costBreakdown.totalBase}
            activeTotalCost={costBreakdown.totalActive}
            scenarios={simulationResults}
            onPromoteToBaseline={promoteActiveToBaseline}
          />
        </>
      )}
    </div>
  )
}
