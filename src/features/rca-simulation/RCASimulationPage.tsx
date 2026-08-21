import React, { useState, useMemo } from 'react'
import { useAppStore } from '../../state'
import {
  WhatIfScenario,
  simulateWhatIfScenarios,
  formatCurrency,
  parsePercentage,
  isYieldDriver,
  isPriceDriver
} from '../../core'

// Sub-components
import { DriverSelector } from './components/DriverSelector'
import { ProblemStatementCard } from './components/ProblemStatementCard'
import { SimulationGrid } from './components/SimulationGrid'
import { TrialValidationCard } from './components/TrialValidationCard'

export const RCASimulationPage: React.FC = () => {
  const {
    topDrivers,
    costBreakdown,
    bom,
    routing,
    rates,
    updateBOMItem,
    updateRoutingStep,
    promoteActiveToBaseline
  } = useAppStore()

  // Default to first controllable driver, or first driver overall
  const defaultDriver = useMemo(() => {
    const controllable = topDrivers.filter(d => d.controllability !== 'Uncontrollable')
    return controllable.length > 0 ? controllable[0] : topDrivers[0]
  }, [topDrivers])

  const [selectedRank, setSelectedRank] = useState<number>(() => defaultDriver?.rank ?? 1)

  // Active driver based on selection
  const activeDriver = useMemo(() => {
    return topDrivers.find(d => d.rank === selectedRank) ?? defaultDriver ?? null
  }, [topDrivers, selectedRank, defaultDriver])

  // Driver type & matching source data row
  const isRoutingDriver = activeDriver ? activeDriver.category !== 'Direct Material' : false
  const bomItem = !isRoutingDriver && activeDriver
    ? bom.find(b => b.description === activeDriver.driverName) ?? null
    : null
  const routingStep = isRoutingDriver && activeDriver
    ? routing.find(r => r.description === activeDriver.driverName) ?? null
    : null

  // 3 What-If Scenarios
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([
    { letter: 'A', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'B', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'C', label: '', targetValue: '', investment: '', lotSize: '5000' }
  ])

  const updateScenario = (idx: number, field: string, val: string) => {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
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

  // Handle "Apply Target to Active"
  const handleApplyTarget = (targetValue: string) => {
    const val = parseFloat(targetValue)
    if (isNaN(val) || val <= 0) return

    if (isRoutingDriver && routingStep && activeDriver) {
      const isYield = isYieldDriver(activeDriver.rcaParameter)
      if (isYield) {
        const newYield = parsePercentage(val)
        updateRoutingStep(routingStep.id, { activeYield: newYield })
      } else {
        updateRoutingStep(routingStep.id, { activeCap: val })
      }
    } else if (bomItem && activeDriver) {
      const isPrice = isPriceDriver(activeDriver.rcaParameter)
      if (isPrice) {
        updateBOMItem(bomItem.id, { activePrice: val })
      } else {
        const newLoss = parsePercentage(val)
        updateBOMItem(bomItem.id, { activeLoss: newLoss })
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900">4. Root Cause Analysis &amp; What-If Simulator</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Evaluate ROI and Net Benefit across 3 improvement scenarios with 2-Step economic feasibility
          </p>
        </div>
      </div>

      {/* Driver Selector Bar */}
      {topDrivers.length > 0 && (
        <DriverSelector
          topDrivers={topDrivers}
          selectedRank={activeDriver?.rank ?? 1}
          onSelectDriver={setSelectedRank}
        />
      )}

      {/* Problem Statement Card */}
      <ProblemStatementCard driver={activeDriver} />

      {/* 3-Scenario Simulation Grid */}
      {activeDriver && (
        <SimulationGrid
          scenarios={simulationResults}
          targetLabel={targetLabel}
          targetPlaceholder={targetPlaceholder}
          isRouting={isRoutingDriver}
          onUpdateScenario={updateScenario}
          onApplyTarget={handleApplyTarget}
        />
      )}

      {/* Current Total Reference */}
      <div className="flex items-center justify-between text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 font-mono">
        <span className="font-sans text-slate-600 font-medium">
          Current Active Total Standard Cost:
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
    </div>
  )
}
