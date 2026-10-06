import React, { useEffect, useMemo, useState } from 'react'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  CandidateSelectionPage,
  RCASimulationPage
} from './features'
import {
  getRcaSimulationStateForRevision,
  retainRcaSimulationStatesForProducts,
  updateRcaSimulationStateByProduct,
  type RcaSimulationPageState
} from './features/rca-simulation/scenario-draft'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'

const AppRouter: React.FC = () => {
  const {
    activeTab,
    activeProductId,
    activeSession,
    productSessions
  } = useAppStore()
  const [rcaSimulationStatesByProduct, setRcaSimulationStatesByProduct] = useState<Record<string, RcaSimulationPageState>>(
    () => loadFromSession(STORAGE_KEYS.RCA_SIMULATION_STATES, {})
  )
  const sourceDataRevision = activeSession.masterDataRevision ?? 0
  const rcaSimulationState = useMemo(
    () => getRcaSimulationStateForRevision(rcaSimulationStatesByProduct[activeProductId], sourceDataRevision),
    [activeProductId, rcaSimulationStatesByProduct, sourceDataRevision]
  )
  const statesToPersist = useMemo(
    () => ({ ...rcaSimulationStatesByProduct, [activeProductId]: rcaSimulationState }),
    [activeProductId, rcaSimulationState, rcaSimulationStatesByProduct]
  )

  useEffect(() => {
    const liveProductIds = new Set(productSessions.map(session => session.id))
    setRcaSimulationStatesByProduct(previous => retainRcaSimulationStatesForProducts(previous, liveProductIds))
  }, [productSessions])

  useEffect(() => {
    saveToSession(STORAGE_KEYS.RCA_SIMULATION_STATES, statesToPersist)
  }, [statesToPersist])

  const updateRcaSimulationState = (update: (state: RcaSimulationPageState) => RcaSimulationPageState) => {
    setRcaSimulationStatesByProduct(previous =>
      updateRcaSimulationStateByProduct(previous, activeProductId, sourceDataRevision, update)
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
