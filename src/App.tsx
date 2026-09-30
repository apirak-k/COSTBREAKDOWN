import React, { useEffect, useState } from 'react'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  CandidateSelectionPage,
  RCASimulationPage
} from './features'
import {
  createRcaSimulationPageState,
  updateRcaSimulationStateByProduct,
  type RcaSimulationPageState
} from './features/rca-simulation/scenario-draft'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'

const AppRouter: React.FC = () => {
  const { activeTab, activeProductId } = useAppStore()
  const [rcaSimulationStatesByProduct, setRcaSimulationStatesByProduct] = useState<Record<string, RcaSimulationPageState>>(
    () => loadFromSession(STORAGE_KEYS.RCA_SIMULATION_STATES, {})
  )

  useEffect(() => {
    saveToSession(STORAGE_KEYS.RCA_SIMULATION_STATES, rcaSimulationStatesByProduct)
  }, [rcaSimulationStatesByProduct])

  const rcaSimulationState = rcaSimulationStatesByProduct[activeProductId] ?? createRcaSimulationPageState()
  const updateRcaSimulationState = (update: (state: RcaSimulationPageState) => RcaSimulationPageState) => {
    setRcaSimulationStatesByProduct(previous =>
      updateRcaSimulationStateByProduct(previous, activeProductId, update)
    )
  }

  return (
    <AppLayout>
      {activeTab === 'master' && <MasterDataPage />}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'candidate' && <CandidateSelectionPage />}
      {activeTab === 'rca' && <RCASimulationPage state={rcaSimulationState} updateState={updateRcaSimulationState} />}
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
