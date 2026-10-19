import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { MasterDataRole } from './core/types'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  SimulationPage
} from './features'
import {
  createEmptySimulationState,
  getActiveSimulationDataset,
  prepareSimulationSend,
  getEffectiveSimulationDataset,
  reconcileSimulationState,
  resetSimulationParameters,
  retainSimulationStatesForProducts,
  setSimulationActiveDataset,
  setSimulationEconomicInput,
  toggleSimulationWorkingTarget,
  type SimulationSources,
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
    comparisonPair,
    productSessions,
    sendSimulationSnapshotToMasterData
  } = useAppStore()
  const [prepareDatasetNavigationRequest, setPrepareDatasetNavigationRequest] = useState<(MasterDataQualityItem & WarningNavigationTarget) | undefined>()
  const [masterDataSearchQuery, setMasterDataSearchQuery] = useState('')
  const [hasVisitedMasterData, setHasVisitedMasterData] = useState(activeTab === 'master')
  const [hasVisitedCostBreakdown, setHasVisitedCostBreakdown] = useState(activeTab === 'breakdown')
  const [hasVisitedSimulation, setHasVisitedSimulation] = useState(activeTab === 'simulation')
  const [simulationStatesByProduct, setSimulationStatesByProduct] = useState<Record<string, SimulationWorkspaceState>>(
    () => loadFromSession(STORAGE_KEYS.SIMULATION_STATES, {})
  )
  const [simulationHistoriesByProduct, setSimulationHistoriesByProduct] = useState<Record<string, Partial<Record<MasterDataRole, SimulationHistory>>>>({})
  const [simulationHistoryRolesByProduct, setSimulationHistoryRolesByProduct] = useState<Record<string, MasterDataRole>>({})
  const [candidateReorderHistory, setCandidateReorderHistory] = useState(createCandidateReorderHistory)
  const pendingSimulationEditRef = useRef<{
    productId: string
    basisFingerprint: string | null
    sources: SimulationSources
    role: MasterDataRole
    before: ReturnType<typeof captureSimulationEditableSnapshot>
    latestState: SimulationWorkspaceState
  } | null>(null)
  const lastCandidateHistoryContextRef = useRef({ activeProductId, comparisonFingerprint: comparisonPair.fingerprint })
  const storedSimulationState = simulationStatesByProduct[activeProductId]
  const reconciledSimulationState = useMemo(
    () => reconcileSimulationState(storedSimulationState, masterDataSnapshots),
    [masterDataSnapshots, storedSimulationState]
  )
  const simulationState = useMemo(
    () => activeTab === 'simulation' && !storedSimulationState
      ? createEmptySimulationState(masterDataSnapshots)
      : reconciledSimulationState,
    [activeTab, masterDataSnapshots, reconciledSimulationState, storedSimulationState]
  )
  const activeSimulationDataset = useMemo(
    () => getActiveSimulationDataset(masterDataSnapshots, simulationState),
    [masterDataSnapshots, simulationState]
  )
  const analysisBeforeDataset = useMemo(
    () => getEffectiveSimulationDataset(masterDataSnapshots, simulationState, simulationState.comparisonBefore),
    [masterDataSnapshots, simulationState]
  )
  const analysisAfterDataset = useMemo(
    () => getEffectiveSimulationDataset(masterDataSnapshots, simulationState, simulationState.comparisonAfter),
    [masterDataSnapshots, simulationState]
  )
  const simulationHistoryRole = simulationHistoryRolesByProduct[activeProductId] ?? simulationState.activeDataset
  const simulationHistoryDataset = getEffectiveSimulationDataset(masterDataSnapshots, simulationState, simulationHistoryRole)
  const selectedSimulationHistory = simulationHistoriesByProduct[activeProductId]?.[simulationHistoryRole]
  const matchingSimulationHistory = selectedSimulationHistory?.basisFingerprint === simulationHistoryDataset.basisFingerprint
    ? selectedSimulationHistory
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
    if (activeTab === 'master') setHasVisitedMasterData(true)
    if (activeTab === 'breakdown') setHasVisitedCostBreakdown(true)
    if (activeTab === 'simulation') setHasVisitedSimulation(true)
  }, [activeTab])

  useEffect(() => {
    const previous = lastCandidateHistoryContextRef.current
    if (previous.activeProductId !== activeProductId
      || previous.comparisonFingerprint !== comparisonPair.fingerprint) {
      setCandidateReorderHistory(resetCandidateReorderHistory())
    }
    lastCandidateHistoryContextRef.current = { activeProductId, comparisonFingerprint: comparisonPair.fingerprint }
  }, [activeProductId, comparisonPair.fingerprint])

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
    setSimulationHistoryRolesByProduct(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => liveProductIds.has(id))))
  }, [productSessions])

  useEffect(() => {
    const histories = simulationHistoriesByProduct[activeProductId]
    const staleRoles = (['reference', 'current', 'custom'] as const).filter(role => {
      const history = histories?.[role]
      return history && history.basisFingerprint !== simulationState.datasets[role].basisFingerprint
    })
    if (staleRoles.length) {
      setSimulationHistoriesByProduct(previous => {
        const productHistory = { ...(previous[activeProductId] ?? {}) }
        staleRoles.forEach(role => {
          productHistory[role] = clearSimulationHistory(productHistory[role], simulationState.datasets[role].basisFingerprint)
        })
        return { ...previous, [activeProductId]: productHistory }
      })
      const pending = pendingSimulationEditRef.current
      if (pending?.productId === activeProductId && staleRoles.includes(pending.role)) pendingSimulationEditRef.current = null
    }
    const historyRole = simulationHistoryRolesByProduct[activeProductId]
    if (historyRole && staleRoles.includes(historyRole)) {
      const fallbackHistoryRole = (['reference', 'current', 'custom'] as const).find(role => {
        const history = histories?.[role]
        return !staleRoles.includes(role)
          && history?.basisFingerprint === simulationState.datasets[role].basisFingerprint
          && Boolean(history.undo.length || history.redo.length)
      }) ?? simulationState.activeDataset
      setSimulationHistoryRolesByProduct(previous => ({ ...previous, [activeProductId]: fallbackHistoryRole }))
    }
  }, [activeProductId, simulationHistoriesByProduct, simulationHistoryRolesByProduct, simulationState.datasets])

  useEffect(() => {
    saveToSession(STORAGE_KEYS.SIMULATION_STATES, simulationStatesByProduct)
  }, [simulationStatesByProduct])

  const commitSimulationEdit = () => {
    const pending = pendingSimulationEditRef.current
    if (!pending) return null
    pendingSimulationEditRef.current = null
    const after = captureSimulationEditableSnapshot(pending.sources, pending.latestState, pending.role)
    const history = simulationHistoriesByProduct[pending.productId]?.[pending.role]
    const baseHistory = history?.basisFingerprint === pending.basisFingerprint
      ? history
      : createSimulationHistory(pending.basisFingerprint)
    const nextHistory = recordSimulationHistory(baseHistory, pending.before, after)
    setSimulationHistoriesByProduct(previous => {
      const productHistory = previous[pending.productId] ?? {}
      const previousHistory = productHistory[pending.role]
      const currentHistory = previousHistory?.basisFingerprint === pending.basisFingerprint
        ? previousHistory
        : createSimulationHistory(pending.basisFingerprint)
      return { ...previous, [pending.productId]: {
        ...productHistory,
        [pending.role]: recordSimulationHistory(currentHistory, pending.before, after)
      } }
    })
    const recorded = nextHistory !== baseHistory
    if (recorded) {
      setSimulationHistoryRolesByProduct(previous => ({ ...previous, [pending.productId]: pending.role }))
    }
    return { history: nextHistory, state: pending.latestState, sources: pending.sources, role: pending.role, basisFingerprint: pending.basisFingerprint, recorded }
  }

  useEffect(() => {
    if (pendingSimulationEditRef.current?.productId !== activeProductId) commitSimulationEdit()
  }, [activeProductId])

  const beginSimulationEdit = (role: MasterDataRole) => {
    const pending = pendingSimulationEditRef.current
    if (pending?.productId === activeProductId
      && pending.role === role
      && pending.basisFingerprint === getEffectiveSimulationDataset(masterDataSnapshots, pending.latestState, role).basisFingerprint) return
    const committed = pending ? commitSimulationEdit() : null
    const currentState = committed?.state ?? simulationState
    const sources = committed?.sources ?? masterDataSnapshots
    const dataset = getEffectiveSimulationDataset(sources, currentState, role)
    pendingSimulationEditRef.current = {
      productId: activeProductId,
      basisFingerprint: dataset.basisFingerprint,
      sources,
      role,
      before: captureSimulationEditableSnapshot(sources, currentState, role),
      latestState: currentState
    }
  }

  const selectActiveDataset = (role: MasterDataRole) => {
    const committed = commitSimulationEdit()
    const priorState = committed?.state
      ?? reconcileSimulationState(simulationStatesByProduct[activeProductId], masterDataSnapshots)
    const nextState = setSimulationActiveDataset(priorState, role)
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: nextState }))
  }

  const updateSimulationState = (role: MasterDataRole, update: (state: SimulationWorkspaceState) => SimulationWorkspaceState) => {
    const stored = simulationStatesByProduct[activeProductId]
    const current = stored ? reconcileSimulationState(stored, masterDataSnapshots) : simulationState
    const next = update(current)
    if (next === current && stored === current) return
    const pending = pendingSimulationEditRef.current
    if (pending?.productId === activeProductId
      && pending.role === role
      && pending.basisFingerprint === getEffectiveSimulationDataset(masterDataSnapshots, current, role).basisFingerprint) pending.latestState = next
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: next }))
  }

  const resetSimulation = () => {
    const committed = commitSimulationEdit()
    const current = committed?.state ?? simulationState
    const role = current.activeDataset
    const sources = committed?.sources ?? masterDataSnapshots
    const next = resetSimulationParameters(current, sources)
    if (next === current) return
    const before = captureSimulationEditableSnapshot(sources, current, role)
    const after = captureSimulationEditableSnapshot(sources, next, role)
    const fingerprint = getEffectiveSimulationDataset(sources, current, role).basisFingerprint
    const roleHistory = simulationHistoriesByProduct[activeProductId]?.[role]
    const currentHistory = committed?.role === role && committed.recorded
      ? committed.history
      : roleHistory?.basisFingerprint === fingerprint ? roleHistory : createSimulationHistory(fingerprint)
    const nextHistory = recordSimulationHistory(currentHistory, before, after)
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: next }))
    setSimulationHistoriesByProduct(previous => ({
      ...previous,
      [activeProductId]: { ...(previous[activeProductId] ?? {}), [role]: nextHistory }
    }))
    if (nextHistory !== currentHistory) {
      setSimulationHistoryRolesByProduct(previous => ({ ...previous, [activeProductId]: role }))
    }
  }

  const runSimulationHistory = (direction: 'undo' | 'redo') => {
    const committed = commitSimulationEdit()
    const currentRole = committed?.recorded
      ? committed.role
      : simulationHistoryRolesByProduct[activeProductId] ?? simulationState.activeDataset
    const history = committed?.recorded
      ? committed.history
      : simulationHistoriesByProduct[activeProductId]?.[currentRole]
    const currentState = committed?.state ?? simulationState
    const sources = committed?.sources ?? masterDataSnapshots
    const currentDataset = getEffectiveSimulationDataset(sources, currentState, currentRole)
    if (!history || history.basisFingerprint !== currentDataset.basisFingerprint) return
    const currentValues = captureSimulationEditableSnapshot(sources, currentState, currentRole)
    const operation = direction === 'undo'
      ? undoSimulationHistory(history, currentValues)
      : redoSimulationHistory(history, currentValues)
    if (!operation.snapshot) {
      setSimulationHistoriesByProduct(previous => ({
        ...previous,
        [activeProductId]: {
          ...(previous[activeProductId] ?? {}),
          [currentRole]: clearSimulationHistory(previous[activeProductId]?.[currentRole], currentDataset.basisFingerprint)
        }
      }))
      return
    }
    const nextState = applySimulationEditableSnapshot(sources, currentState, operation.snapshot, currentRole)
    if (!nextState) {
      setSimulationHistoriesByProduct(previous => ({
        ...previous,
        [activeProductId]: {
          ...(previous[activeProductId] ?? {}),
          [currentRole]: clearSimulationHistory(previous[activeProductId]?.[currentRole], currentDataset.basisFingerprint)
        }
      }))
      return
    }
    pendingSimulationEditRef.current = null
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: nextState }))
    setSimulationHistoriesByProduct(previous => ({
      ...previous,
      [activeProductId]: { ...(previous[activeProductId] ?? {}), [currentRole]: operation.history }
    }))
  }

  const updateEconomicInput = (role: MasterDataRole, field: EconomicSimulationField, value: string) => {
    updateSimulationState(role, state => setSimulationEconomicInput(state, field, value, role))
  }

  const updateParameter = (recordId: string, parameter: SimulationParameter, value: number | null) => {
    const role = simulationState.activeDataset
    updateSimulationState(role, state => updateSimulationParameter(
      state,
      masterDataSnapshots,
      recordId,
      parameter,
      value,
      role
    ))
  }

  const toggleWorkingTarget = (kind: 'bom' | 'routing', recordId: string) => {
    const role = simulationState.activeDataset
    updateSimulationState(role, state => toggleSimulationWorkingTarget(
      state, masterDataSnapshots, kind, recordId, role
    ))
  }

  const sendSimulation = () => {
    const committed = commitSimulationEdit()
    const current = reconcileSimulationState(committed?.state ?? simulationStatesByProduct[activeProductId] ?? simulationState, masterDataSnapshots)
    const activeDataset = current.activeDataset
    const payload = prepareSimulationSend(current, masterDataSnapshots)
    setSimulationStatesByProduct(previous => ({ ...previous, [activeProductId]: current }))
    return sendSimulationSnapshotToMasterData(activeDataset, payload.snapshot)
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
      cbdReorderUndoRedo={{
        canUndo: candidateReorderHistory.undo.length > 0,
        canRedo: candidateReorderHistory.redo.length > 0,
        undo: () => setCandidateReorderHistory(undoCandidateReorder),
        redo: () => setCandidateReorderHistory(redoCandidateReorder)
      }}
    >
      {(activeTab === 'master' || hasVisitedMasterData) && (
        <div hidden={activeTab !== 'master'} className="min-w-0">
          <MasterDataPage
            searchQuery={masterDataSearchQuery}
            onSearchQueryChange={setMasterDataSearchQuery}
            prepareDatasetNavigationRequest={prepareDatasetNavigationRequest}
            onPrepareDatasetNavigationHandled={requestId => setPrepareDatasetNavigationRequest(current => current?.requestId === requestId ? undefined : current)}
          />
        </div>
      )}
      {(activeTab === 'breakdown' || hasVisitedCostBreakdown) && (
        <div hidden={activeTab !== 'breakdown'}>
          <CostBreakdownPage
            manualOrders={candidateReorderHistory.manualOrders}
            onManualOrderChange={setCandidateManualOrder}
            onResetManualOrderHistory={resetCandidateManualOrderHistory}
          />
        </div>
      )}
      {(activeTab === 'simulation' || hasVisitedSimulation) && (
        <div hidden={activeTab !== 'simulation'} className={activeTab === 'simulation' ? 'xl:flex xl:h-full xl:min-h-0 xl:min-w-0 xl:flex-col' : undefined}>
          <SimulationPage
            key={activeProductId}
            state={activeSimulationDataset}
            workingSelection={activeSimulationDataset.workingSelection}
            analysisBeforeDataset={analysisBeforeDataset}
            analysisAfterDataset={analysisAfterDataset}
            referenceSnapshot={masterDataSnapshots.reference}
            currentSnapshot={masterDataSnapshots.current}
            onSelectActiveDataset={selectActiveDataset}
            onSend={sendSimulation}
            onReset={resetSimulation}
            onUpdateParameter={updateParameter}
            onToggleWorkingTarget={toggleWorkingTarget}
            onUpdateEconomicInput={updateEconomicInput}
            onBeginEdit={beginSimulationEdit}
            onCommitEdit={commitSimulationEdit}
          />
        </div>
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
