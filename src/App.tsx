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
  prepareSimulationForRcaHandoff,
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  setSimulationEconomicInput,
  setSimulationFactors,
  startSimulationFrom,
  type SimulationWorkspaceState
} from './features/simulation/simulation-state'
import { updateSimulationParameter } from './features/simulation/simulation-engine'
import type { SimulationFactor, SimulationParameter } from './features/simulation/simulation-state'
import type { EconomicSimulationField } from './features/simulation/simulation-economics'
import { retainRcaSimulationHandoff, type RcaSimulationHandoffContext } from './state/rca-cases'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'

const AppRouter: React.FC = () => {
  const {
    activeTab,
    activeProductId,
    setActiveTab,
    masterDataSnapshots,
    productSessions
  } = useAppStore()
  const [simulationRcaHandoff, setSimulationRcaHandoff] = useState<{
    productId: string
    context: RcaSimulationHandoffContext
  } | null>(null)
  const [masterDataSearchQuery, setMasterDataSearchQuery] = useState('')
  const [simulationStatesByProduct, setSimulationStatesByProduct] = useState<Record<string, SimulationWorkspaceState>>(
    () => loadFromSession(STORAGE_KEYS.SIMULATION_STATES, {})
  )
  const storedSimulationState = simulationStatesByProduct[activeProductId]
  const simulationState = useMemo(
    () => reconcileSimulationState(storedSimulationState, masterDataSnapshots),
    [masterDataSnapshots, storedSimulationState]
  )
  const simulationRcaContext = activeTab === 'simulation' && simulationRcaHandoff?.productId === activeProductId
    ? simulationRcaHandoff.context
    : null

  useEffect(() => {
    setSimulationRcaHandoff(previous => retainRcaSimulationHandoff(previous, activeTab, activeProductId))
  }, [activeProductId, activeTab])

  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeTab])

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
    setSimulationStatesByProduct(previous => {
      const priorState = reconcileSimulationState(previous[activeProductId], masterDataSnapshots)
      return {
        ...previous,
        [activeProductId]: startSimulationFrom(role, masterDataSnapshots, undefined, priorState.economicInputs)
      }
    })
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

  const updateParameter = (recordId: string, parameter: SimulationParameter, value: number | null) => {
    updateSimulationState(state => updateSimulationParameter(
      state,
      masterDataSnapshots.current,
      recordId,
      parameter,
      value
    ))
  }

  const proceedFromRcaToSimulation = (context: RcaSimulationHandoffContext) => {
    setSimulationStatesByProduct(previous => ({
      ...previous,
      [activeProductId]: prepareSimulationForRcaHandoff(previous[activeProductId], masterDataSnapshots)
    }))
    setSimulationRcaHandoff({ productId: activeProductId, context })
    setActiveTab('simulation')
  }

  return (
    <AppLayout
      masterDataSearchQuery={masterDataSearchQuery}
      onMasterDataSearchQueryChange={setMasterDataSearchQuery}
    >
      {activeTab === 'master' && (
        <MasterDataPage
          searchQuery={masterDataSearchQuery}
          onSearchQueryChange={setMasterDataSearchQuery}
        />
      )}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'candidate' && <CandidateSelectionPage onProceedToSimulation={proceedFromRcaToSimulation} />}
      {activeTab === 'simulation' && (
        <SimulationPage
          state={simulationState}
          referenceSnapshot={masterDataSnapshots.reference}
          currentSnapshot={masterDataSnapshots.current}
          rcaContext={simulationRcaContext}
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
