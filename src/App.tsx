import React, { useEffect, useMemo, useState } from 'react'
import type { MasterDataRole } from './core/types'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  CandidateSelectionPage,
  SimulationPage
} from './features'
import {
  createEmptySimulationState,
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  setSimulationEconomicInput,
  setSimulationFactors,
  startSimulationFrom,
  type SimulationWorkspaceState
} from './features/simulation/simulation-state'
import { updateSimulationParameter } from './features/simulation/simulation-engine'
import type { SimulationFactor } from './features/simulation/simulation-state'
import type { EconomicSimulationField } from './features/simulation/simulation-economics'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'

const AppRouter: React.FC = () => {
  const {
    activeTab,
    activeProductId,
    masterDataSnapshots,
    productSessions
  } = useAppStore()
  const [simulationStatesByProduct, setSimulationStatesByProduct] = useState<Record<string, SimulationWorkspaceState>>(
    () => loadFromSession(STORAGE_KEYS.SIMULATION_STATES, {})
  )
  const storedSimulationState = simulationStatesByProduct[activeProductId]
  const simulationState = useMemo(
    () => reconcileSimulationState(storedSimulationState, masterDataSnapshots),
    [masterDataSnapshots, storedSimulationState]
  )

  useEffect(() => {
    if (!storedSimulationState || simulationState === storedSimulationState) return
    setSimulationStatesByProduct(previous => previous[activeProductId] === storedSimulationState
      ? { ...previous, [activeProductId]: simulationState }
      : previous)
  }, [activeProductId, simulationState, storedSimulationState])

  useEffect(() => {
    const liveProductIds = new Set(productSessions.map(session => session.id))
    setSimulationStatesByProduct(previous => retainSimulationStatesForProducts(previous, liveProductIds))
  }, [productSessions])

  useEffect(() => {
    saveToSession(STORAGE_KEYS.SIMULATION_STATES, simulationStatesByProduct)
  }, [simulationStatesByProduct])

  const startFrom = (role: MasterDataRole) => {
    setSimulationStatesByProduct(previous => ({
      ...previous,
      [activeProductId]: startSimulationFrom(role, masterDataSnapshots)
    }))
  }

  const resetSimulation = () => {
    setSimulationStatesByProduct(previous => ({
      ...previous,
      [activeProductId]: createEmptySimulationState()
    }))
  }

  const updateSimulationState = (update: (state: SimulationWorkspaceState) => SimulationWorkspaceState) => {
    setSimulationStatesByProduct(previous => {
      const stored = previous[activeProductId]
      const current = reconcileSimulationState(stored, masterDataSnapshots)
      const next = update(current)
      if (next === current && stored === current) return previous
      return { ...previous, [activeProductId]: next }
    })
  }

  const selectSimulationFactors = (factors: SimulationFactor[]) => {
    updateSimulationState(state => setSimulationFactors(state, factors))
  }

  const updateEconomicInput = (field: EconomicSimulationField, value: string) => {
    updateSimulationState(state => setSimulationEconomicInput(state, field, value))
  }

  const updateParameter = (recordId: string, factor: SimulationFactor, value: number | null) => {
    updateSimulationState(state => updateSimulationParameter(
      state,
      masterDataSnapshots.current,
      recordId,
      factor,
      value
    ))
  }

  return (
    <AppLayout>
      {activeTab === 'master' && <MasterDataPage />}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'candidate' && <CandidateSelectionPage />}
      {activeTab === 'simulation' && (
        <SimulationPage
          state={simulationState}
          currentSnapshot={masterDataSnapshots.current}
          onStartFrom={startFrom}
          onReset={resetSimulation}
          onSelectFactors={selectSimulationFactors}
          onUpdateParameter={updateParameter}
          onUpdateEconomicInput={updateEconomicInput}
        />
      )}
    </AppLayout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}
