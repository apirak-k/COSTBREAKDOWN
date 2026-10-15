import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  applySimulationEditableSnapshot,
  captureSimulationEditableSnapshot,
  clearSimulationHistory,
  createSimulationHistory,
  recordSimulationHistory,
  redoSimulationHistory,
  undoSimulationHistory,
  type SimulationHistory
} from './features/simulation/simulation-history'
import type { MasterDataQualityItem } from './features/master-data/prepare-dataset'
import type { WarningNavigationTarget } from './features/master-data/hooks/useWarningNavigationFocus'
import { loadFromSession, saveToSession, STORAGE_KEYS } from './services/storage'
import {
  createCandidateReorderHistory,
  recordCandidateReorder,
  redoCandidateReorder,
  resetCandidateReorderHistory,
  undoCandidateReorder,
  type CandidateTableType
} from './features/cost-breakdown/candidate-reorder-history'

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
  const [simulationHistoriesByProduct, setSimulationHistoriesByProduct] = useState<Record<string, SimulationHistory>>({})
  const [candidateReorderHistory, setCandidateReorderHistory] = useState(createCandidateReorderHistory)
  const pendingSimulationEditRef = useRef<{
    productId: string
    basisFingerprint: string | null
    currentSnapshot: CostSnapshot
    before: ReturnType<typeof captureSimulationEditableSnapshot>
    latestState: SimulationWorkspaceState
  } | null>(null)
  const lastCandidateHistoryContextRef = useRef({ activeProductId, activeTab })
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
  const activeSimulationHistory = simulationHistoriesByProduct[activeProductId]
  const matchingSimulationHistory = activeSimulationHistory?.basisFingerprint === simulationState.basisFingerprint
    ? activeSimulationHistory
    : undefined
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
    const previous = lastCandidateHistoryContextRef.current
    if (previous.activeProductId !== activeProductId || (previous.activeTab === 'breakdown' && activeTab !== 'breakdown')) {
      setCandidateReorderHistory(resetCandidateReorderHistory())
    }
    lastCandidateHistoryContextRef.current = { activeProductId, activeTab }
  }, [activeProductId, activeTab])

  useEffect(() => {
    if ((!storedSimulationState && activeTab !== 'simulation') || simulationState === storedSimulationState) return
    setSimulationStatesByProduct(previous => previous[activeProductId] === storedSimulationState
      ? { ...previous, [activeProductId]: simulationState }
      : previous)
  }, [activeProductId, activeTab, simulationState, storedSimulationState])

  useEffect(() => {
    const liveProductIds = new Set(productSessions.map(session => session.id))
    setSimulationStatesByProduct(previous => retainSimulationStatesForProducts(previous, liveProductIds))
    setSimulationHistoriesByProduct(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => liveProductIds.has(id))))
  }, [productSessions])

  useEffect(() => {
    const history = simulationHistoriesByProduct[activeProductId]
    if (history && history.basisFingerprint !== simulationState.basisFingerprint) {
      setSimulationHistoriesByProduct(previous => ({
        ...previous,
        [activeProductId]: clearSimulationHistory(previous[activeProductId], simulationState.basisFingerprint)
      }))
      if (pendingSimulationEditRef.current?.productId === activeProductId) pendingSimulationEditRef.current = null
    }
  }, [activeProductId, simulationHistoriesByProduct, simulationState.basisFingerprint])

  useEffect(() => {
    saveToSession(STORAGE_KEYS.SIMULATION_STATES, simulationStatesByProduct)
  }, [simulationStatesByProduct])

  const commitSimulationEdit = () => {
    const pending = pendingSimulationEditRef.current
    if (!pending) return null
    pendingSimulationEditRef.current = null
    const after = captureSimulationEditableSnapshot(pending.currentSnapshot, pending.latestState)
    const history = simulationHistoriesByProduct[pending.productId]
    const baseHistory = history?.basisFingerprint === pending.basisFingerprint
      ? history
      : createSimulationHistory(pending.basisFingerprint)
    const nextHistory = recordSimulationHistory(baseHistory, pending.before, after)
    setSimulationHistoriesByProduct(previous => {
      const previousHistory = previous[pending.productId]
      const currentHistory = previousHistory?.basisFingerprint === pending.basisFingerprint
        ? previousHistory
        : createSimulationHistory(pending.basisFingerprint)
      return { ...previous, [pending.productId]: recordSimulationHistory(currentHistory, pending.before, after) }
    })
    return { history: nextHistory, state: pending.latestState, currentSnapshot: pending.currentSnapshot, basisFingerprint: pending.basisFingerprint }
  }

  useEffect(() => {
    if (pendingSimulationEditRef.current?.productId !== activeProductId) commitSimulationEdit()
  }, [activeProductId])

  const beginSimulationEdit = () => {
    if (!simulationState.snapshot) return
    const pending = pendingSimulationEditRef.current
    if (pending?.productId === activeProductId && pending.basisFingerprint === simulationState.basisFingerprint) return
    pendingSimulationEditRef.current = {
      productId: activeProductId,
      basisFingerprint: simulationState.basisFingerprint,
      currentSnapshot: masterDataSnapshots.current,
      before: captureSimulationEditableSnapshot(masterDataSnapshots.current, simulationState),
      latestState: simulationState
    }
  }

  const startFrom = (role: MasterDataRole) => {
    const committed = commitSimulationEdit()
    const priorState = reconcileSimulationState(simulationStatesByProduct[activeProductId], masterDataSnapshots)
    const economicInputs = committed?.state.economicInputs ?? priorState.economicInputs
    const nextState = startSimulationFrom(role, masterDataSnapshots, undefined, economicInputs)
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: nextState }))
    setSimulationHistoriesByProduct(previous => ({
      ...previous,
      [activeProductId]: clearSimulationHistory(previous[activeProductId], nextState.basisFingerprint)
    }))
  }

  const updateSimulationState = (update: (state: SimulationWorkspaceState) => SimulationWorkspaceState) => {
    const stored = simulationStatesByProduct[activeProductId]
    const current = stored ? reconcileSimulationState(stored, masterDataSnapshots) : simulationState
    const next = update(current)
    if (next === current && stored === current) return
    const pending = pendingSimulationEditRef.current
    if (pending?.productId === activeProductId && pending.basisFingerprint === current.basisFingerprint) pending.latestState = next
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: next }))
  }

  const resetSimulation = () => {
    const committed = commitSimulationEdit()
    const current = committed?.state ?? simulationState
    const next = resetSimulationParameters(current)
    if (next === current) return
    const before = captureSimulationEditableSnapshot(masterDataSnapshots.current, current)
    const after = captureSimulationEditableSnapshot(masterDataSnapshots.current, next)
    const currentHistory = committed?.history ?? matchingSimulationHistory ?? createSimulationHistory(current.basisFingerprint)
    const nextHistory = recordSimulationHistory(currentHistory, before, after)
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: next }))
    setSimulationHistoriesByProduct(previous => ({ ...previous, [activeProductId]: nextHistory }))
  }

  const runSimulationHistory = (direction: 'undo' | 'redo') => {
    const committed = commitSimulationEdit()
    const history = committed?.history ?? matchingSimulationHistory
    const currentState = committed?.state ?? simulationState
    const currentSnapshot = committed?.currentSnapshot ?? masterDataSnapshots.current
    if (!history || history.basisFingerprint !== currentState.basisFingerprint || !currentState.snapshot) return
    const currentValues = captureSimulationEditableSnapshot(currentSnapshot, currentState)
    const operation = direction === 'undo'
      ? undoSimulationHistory(history, currentValues)
      : redoSimulationHistory(history, currentValues)
    if (!operation.snapshot) {
      setSimulationHistoriesByProduct(previous => ({
        ...previous,
        [activeProductId]: clearSimulationHistory(previous[activeProductId], currentState.basisFingerprint)
      }))
      return
    }
    const nextState = applySimulationEditableSnapshot(currentSnapshot, currentState, operation.snapshot)
    if (!nextState) {
      setSimulationHistoriesByProduct(previous => ({
        ...previous,
        [activeProductId]: clearSimulationHistory(previous[activeProductId], currentState.basisFingerprint)
      }))
      return
    }
    pendingSimulationEditRef.current = null
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: nextState }))
    setSimulationHistoriesByProduct(previous => ({ ...previous, [activeProductId]: operation.history }))
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
    updateSimulationState(state => toggleSimulationWorkingTarget(state, masterDataSnapshots.current, kind, recordId))
  }

  const setCandidateManualOrder = (type: CandidateTableType, keys: string[]) => {
    setCandidateReorderHistory(history => recordCandidateReorder(history, type, keys))
  }
  const resetCandidateManualOrderHistory = () => setCandidateReorderHistory(resetCandidateReorderHistory())

  return (
    <AppLayout
      onNavigatePrepareDatasetIssue={navigateToPrepareDatasetIssue}
      simulationUndoRedo={{
        canUndo: matchingSimulationHistory?.undo.length ? true : false,
        canRedo: matchingSimulationHistory?.redo.length ? true : false,
        undo: () => runSimulationHistory('undo'),
        redo: () => runSimulationHistory('redo')
      }}
      simulationReset={resetSimulation}
      cbdReorderUndoRedo={{
        canUndo: candidateReorderHistory.undo.length > 0,
        canRedo: candidateReorderHistory.redo.length > 0,
        undo: () => setCandidateReorderHistory(undoCandidateReorder),
        redo: () => setCandidateReorderHistory(redoCandidateReorder)
      }}
    >
      {activeTab === 'master' && (
        <MasterDataPage
          searchQuery={masterDataSearchQuery}
          onSearchQueryChange={setMasterDataSearchQuery}
          prepareDatasetNavigationRequest={prepareDatasetNavigationRequest}
          onPrepareDatasetNavigationHandled={requestId => setPrepareDatasetNavigationRequest(current => current?.requestId === requestId ? undefined : current)}
        />
      )}
      {activeTab === 'breakdown' && <CostBreakdownPage
        manualOrders={candidateReorderHistory.manualOrders}
        onManualOrderChange={setCandidateManualOrder}
        onResetManualOrderHistory={resetCandidateManualOrderHistory}
      />}
      {activeTab === 'simulation' && (
        <SimulationPage
          key={activeProductId}
          state={simulationState}
          workingSelection={simulationState.workingSelection}
          referenceSnapshot={masterDataSnapshots.reference}
          currentSnapshot={masterDataSnapshots.current}
          onCloneSource={startFrom}
          onSendTo={(role: MasterDataRole, snapshot: CostSnapshot) => sendSimulationSnapshotToMasterData(role, snapshot)}
          onUpdateParameter={updateParameter}
          onToggleWorkingTarget={toggleWorkingTarget}
          onUpdateEconomicInput={updateEconomicInput}
          onBeginEdit={beginSimulationEdit}
          onCommitEdit={commitSimulationEdit}
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
