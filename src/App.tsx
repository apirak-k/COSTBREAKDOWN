import React, { useEffect, useMemo, useState } from 'react'
import type { CostSnapshot, MasterDataRole } from './core/types'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  SimulationPage
} from './features'
import {
  reconcileSimulationState,
  resetSimulationParameters,
  retainSimulationStatesForProducts,
  setSimulationEconomicInput,
  startSimulationFrom,
  toggleSimulationWorkingTarget,
  type SimulationWorkspaceState
} from './features/simulation/simulation-state'
import { updateSimulationParameter } from './features/simulation/simulation-engine'
import type { SimulationParameter } from './features/simulation/simulation-state'
import type { EconomicSimulationField } from './features/simulation/simulation-economics'
import type { MasterDataQualityItem } from './features/master-data/prepare-dataset'
import type { WarningNavigationTarget } from './features/master-data/hooks/useWarningNavigationFocus'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'

const AppRouter: React.FC = () => {
  const {
    activeTab,
    activeProductId,
    setActiveTab,
    masterDataSnapshots,
    productSessions,
    sendSimulationSnapshotToMasterData
  } = useAppStore()
  const [prepareDatasetNavigationRequest, setPrepareDatasetNavigationRequest] = useState<(MasterDataQualityItem & WarningNavigationTarget) | undefined>()
  const [masterDataSearchQuery, setMasterDataSearchQuery] = useState('')
  const [simulationStatesByProduct, setSimulationStatesByProduct] = useState<Record<string, SimulationWorkspaceState>>(
    () => loadFromSession(STORAGE_KEYS.SIMULATION_STATES, {})
  )
  const storedSimulationState = simulationStatesByProduct[activeProductId]
  const reconciledSimulationState = useMemo(
    () => reconcileSimulationState(storedSimulationState, masterDataSnapshots),
    [masterDataSnapshots, storedSimulationState]
  )
  const simulationState = useMemo(
    () => activeTab === 'simulation' && !reconciledSimulationState.snapshot
      ? startSimulationFrom('current', masterDataSnapshots, undefined, reconciledSimulationState.economicInputs)
      : reconciledSimulationState,
    [activeTab, masterDataSnapshots, reconciledSimulationState]
  )
  const navigateToPrepareDatasetIssue = (item: MasterDataQualityItem) => {
    setPrepareDatasetNavigationRequest(previous => ({
      ...item,
      requestId: (previous?.requestId ?? 0) + 1
    }))
    setActiveTab('master')
  }

  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeTab])

  useEffect(() => {
    if ((!storedSimulationState && activeTab !== 'simulation') || simulationState === storedSimulationState) return
    setSimulationStatesByProduct(previous => previous[activeProductId] === storedSimulationState
      ? { ...previous, [activeProductId]: simulationState }
      : previous)
  }, [activeProductId, activeTab, simulationState, storedSimulationState])

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

  const updateSimulationState = (update: (state: SimulationWorkspaceState) => SimulationWorkspaceState) => {
    setSimulationStatesByProduct(previous => {
      const stored = previous[activeProductId]
      const current = reconcileSimulationState(stored, masterDataSnapshots)
      const next = update(current)
      if (next === current && stored === current) return previous
      return { ...previous, [activeProductId]: next }
    })
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

  const toggleWorkingTarget = (kind: 'bom' | 'routing', recordId: string) => {
    updateSimulationState(state => toggleSimulationWorkingTarget(state, kind, recordId))
  }

  return (
    <AppLayout onNavigatePrepareDatasetIssue={navigateToPrepareDatasetIssue}>
      {activeTab === 'master' && (
        <MasterDataPage
          searchQuery={masterDataSearchQuery}
          onSearchQueryChange={setMasterDataSearchQuery}
          prepareDatasetNavigationRequest={prepareDatasetNavigationRequest}
          onPrepareDatasetNavigationHandled={requestId => setPrepareDatasetNavigationRequest(current => current?.requestId === requestId ? undefined : current)}
        />
      )}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'simulation' && (
        <SimulationPage
          key={activeProductId}
          state={simulationState}
          workingSelection={simulationState.workingSelection}
          referenceSnapshot={masterDataSnapshots.reference}
          currentSnapshot={masterDataSnapshots.current}
          onCloneSource={startFrom}
          onResetParameters={() => updateSimulationState(resetSimulationParameters)}
          onSendTo={(role: MasterDataRole, snapshot: CostSnapshot) => sendSimulationSnapshotToMasterData(role, snapshot)}
          onUpdateParameter={updateParameter}
          onToggleWorkingTarget={toggleWorkingTarget}
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
