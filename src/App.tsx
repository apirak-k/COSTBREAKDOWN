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
  startSimulationFrom,
  type SimulationWorkspaceState
} from './features/simulation/simulation-state'
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

  return (
    <AppLayout>
      {activeTab === 'master' && <MasterDataPage />}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'candidate' && <CandidateSelectionPage />}
      {activeTab === 'simulation' && (
        <SimulationPage state={simulationState} onStartFrom={startFrom} onReset={resetSimulation} />
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
