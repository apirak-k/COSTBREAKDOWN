import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MasterDataDirectEditsContext } from './direct-edit-presentation'
import { useAppStore } from '../../state'
import type { MasterDataRole } from '../../core'
import { getDatasetSaveState } from '../../core/utils/master-data-effective'
import { MasterDataWorkspaceHeader } from './components/MasterDataWorkspaceHeader'
import { ExcelImportModal } from './components/ExcelImportModal'
import { DatasetSizingModal } from './components/DatasetSizingModal'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'
import {
  buildMasterDataBlockerItems,
  buildMasterDataWarningItems,
  type MasterDataWarningItem,
  type MasterDataQualityItem
} from './prepare-dataset'
import type { WarningNavigationTarget } from './hooks/useWarningNavigationFocus'
import { hasEnteredMasterData } from '../../state/dataset-sizing'

type TableSubTab = 'bom' | 'wc' | 'routing'

interface MasterDataPageProps {
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  prepareDatasetNavigationRequest?: MasterDataQualityItem & WarningNavigationTarget
  onPrepareDatasetNavigationHandled?: (requestId: number) => void
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const MasterDataPage: React.FC<MasterDataPageProps> = ({
  searchQuery = '',
  onSearchQueryChange = () => undefined,
  prepareDatasetNavigationRequest,
  onPrepareDatasetNavigationHandled
}) => {
  const pageRef = useRef<HTMLDivElement>(null)
  const workspaceHeaderRef = useRef<HTMLElement>(null)
  const {
    activeSession,
    activeTab,
    activeProductId,
    masterDataSnapshots,
    masterDataUiState,
    masterDataRole,
    masterDataSnapshot,
    masterDataLastSavedSnapshots,
    masterDataSizing,
    importSnapshotFromExcel,
    undoMasterDataEdit,
    redoMasterDataEdit,
    setMasterDataRole,
    updateMasterDataUiState,
    saveMasterDataWorkingDataset,
    saveAllMasterDataWorkingDatasets,
    resetMasterDataWorkingDataset,
    resetAllMasterDataWorkingDatasets,
    clearAllMasterDataWorkingDatasets,
    cloneMasterDataWorkspace,
    clearMasterDataDataset,
    updateMasterDataDatasetSizing,
    updateMasterDataProduct,
    updateMasterDataRemark,
    addMasterDataBOMItem,
    updateMasterDataBOMItems,
    deleteMasterDataBOMItems,
    reorderMasterDataBOMItems,
    addMasterDataRoutingStep,
    updateMasterDataRoutingSteps,
    deleteMasterDataRoutingSteps,
    reorderMasterDataRoutingSteps,
    addMasterDataWorkCenterRate,
    updateMasterDataWorkCenterRates,
    deleteMasterDataWorkCenterRates,
    reorderMasterDataWorkCenters
  } = useAppStore()

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [sizingModalOpen, setSizingModalOpen] = useState(false)
  const [showWarningHighlights, setShowWarningHighlights] = useState(true)
  const [warningNavigation, setWarningNavigation] = useState<(WarningNavigationTarget & MasterDataQualityItem) | undefined>()
  const [activeCellSelectionOwnerKey, setActiveCellSelectionOwnerKey] = useState<string | null>(null)

  useSafeLayoutEffect(() => {
    const page = pageRef.current
    const header = workspaceHeaderRef.current
    if (!page || !header) return
    const updateStickyOffset = () => page.style.setProperty('--master-data-table-header-top', `${header.getBoundingClientRect().height}px`)
    updateStickyOffset()
    const observer = new ResizeObserver(updateStickyOffset)
    observer.observe(header)
    return () => {
      observer.disconnect()
      page.style.removeProperty('--master-data-table-header-top')
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'master') return
    setImportModalOpen(false)
    setSizingModalOpen(false)
    setWarningNavigation(undefined)
  }, [activeTab])

  useEffect(() => {
    setImportModalOpen(false)
    setSizingModalOpen(false)
    setWarningNavigation(undefined)
    setActiveCellSelectionOwnerKey(null)
  }, [activeProductId])

  const isEditMode = masterDataUiState.mode === 'edit'
  const isAllTablesVisible = masterDataUiState.tableView === 'all'
  const activeTableTab: TableSubTab = masterDataUiState.tableView === 'all' ? 'bom' : masterDataUiState.tableView
  const product = masterDataSnapshot.product

  const warningItems = useMemo(() => buildMasterDataWarningItems(masterDataSnapshots), [masterDataSnapshots])
  const blockerItems = useMemo(() => buildMasterDataBlockerItems(masterDataSnapshots), [masterDataSnapshots])
  const warningItemsByTable = useMemo(() => Object.fromEntries((['bom', 'wc', 'routing'] as const).map(table => [
    table,
    warningItems.filter(item => item.role === masterDataRole && item.table === table)
  ])) as Record<TableSubTab, MasterDataWarningItem[]>, [masterDataRole, warningItems])
  const blockerItemsByTable = useMemo(() => Object.fromEntries((['bom', 'wc', 'routing'] as const).map(table => [
    table,
    blockerItems.filter(item => item.role === masterDataRole && item.table === table)
  ])) as Record<TableSubTab, ReturnType<typeof buildMasterDataBlockerItems>>, [blockerItems, masterDataRole])
  const saveStates = useMemo(() => Object.fromEntries(roles.map(role => [
    role,
    getDatasetSaveState(masterDataSnapshots[role], masterDataLastSavedSnapshots[role])
  ])) as Record<MasterDataRole, ReturnType<typeof getDatasetSaveState>>, [masterDataSnapshots, masterDataLastSavedSnapshots])
  const handleWarningNavigation = (item: MasterDataQualityItem, preserveAllView = false) => {
    setMasterDataRole(item.role)
    updateMasterDataUiState({ type: 'set-mode', mode: 'edit' })
    if (!preserveAllView || !isAllTablesVisible) {
      updateMasterDataUiState({ type: 'set-table-view', tableView: item.table })
    }
    setWarningNavigation(current => ({ ...item, requestId: (current?.requestId ?? 0) + 1 }))
  }

  const handleWarningNavigationHandled = useCallback((requestId: number) => {
    setWarningNavigation(current => current?.requestId === requestId ? undefined : current)
    if (prepareDatasetNavigationRequest?.requestId === requestId) onPrepareDatasetNavigationHandled?.(requestId)
  }, [onPrepareDatasetNavigationHandled, prepareDatasetNavigationRequest?.requestId])

  useEffect(() => {
    const item = prepareDatasetNavigationRequest
    if (!item) return
    setMasterDataRole(item.role)
    updateMasterDataUiState({ type: 'set-mode', mode: 'edit' })
    updateMasterDataUiState({ type: 'set-table-view', tableView: item.table })
    setWarningNavigation(item)
  }, [prepareDatasetNavigationRequest?.requestId, setMasterDataRole, updateMasterDataUiState])

  const renderTable = (table: TableSubTab) => {
    const selectionOwnerScopeKey = `${masterDataRole}:${table}`
    const navigationScopeKey = `${activeProductId}:${masterDataRole}:${table}`
    const cellSelectionOwnerProps = {
      selectionOwnerScopeKey,
      activeSelectionOwnerKey: activeCellSelectionOwnerKey,
      onCellInteraction: (field: string) => setActiveCellSelectionOwnerKey(`${selectionOwnerScopeKey}:${field}`)
    }
    const warningNavigationTarget = warningNavigation?.table === table ? warningNavigation : undefined
    const tableWarnings = warningItemsByTable[table]
    const tableBlockers = blockerItemsByTable[table]
    const tableChromeProps = {
      navigationScopeKey,
      warningCount: tableWarnings.length,
      warningItems: tableWarnings,
      blockerItems: tableBlockers,
      onNavigateWarning: (item: MasterDataWarningItem) => handleWarningNavigation(item, true),
      onNavigateBlocker: (item: MasterDataQualityItem) => handleWarningNavigation(item, true)
    }
    if (table === 'wc') {
      return (
        <WorkCenterRatesTable
          rates={masterDataSnapshot.rates}
          routing={masterDataSnapshot.routing}
          isEditMode={isEditMode}
          historyScope={masterDataRole}
          selectionDatasetId={activeProductId}
          {...cellSelectionOwnerProps}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          showWarningHighlights={showWarningHighlights}
          {...tableChromeProps}
          warningNavigationTarget={warningNavigationTarget}
          onWarningNavigationHandled={handleWarningNavigationHandled}
          onUndo={undoMasterDataEdit}
          onRedo={redoMasterDataEdit}
          onAddRate={() => addMasterDataWorkCenterRate({
            workCenterCode: '',
            description: '',
            laborRate: null,
            burdenRate: null,
            effectiveDate: product.effectiveDate || new Date().toISOString().split('T')[0],
            sourceRef: 'Direct Input'
          })}
          onUpdateRates={updateMasterDataWorkCenterRates}
          onDeleteRates={deleteMasterDataWorkCenterRates}
          onReorderRows={reorderMasterDataWorkCenters}
        />
      )
    }

    if (table === 'bom') {
      return (
        <BOMTable
          bom={masterDataSnapshot.bom}
          isEditMode={isEditMode}
          historyScope={masterDataRole}
          selectionDatasetId={activeProductId}
          {...cellSelectionOwnerProps}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          showWarningHighlights={showWarningHighlights}
          {...tableChromeProps}
          warningNavigationTarget={warningNavigationTarget}
          onWarningNavigationHandled={handleWarningNavigationHandled}
          onUndo={undoMasterDataEdit}
          onRedo={redoMasterDataEdit}
          onAddBOMItem={() => addMasterDataBOMItem({
            itemCode: '',
            description: '',
            consumption: null,
            unit: 'PC',
            price: null,
            loss: null,
            sourceRef: 'Direct Input'
          })}
          onUpdateBOMItems={updateMasterDataBOMItems}
          onDeleteBOMItems={deleteMasterDataBOMItems}
          onReorderRows={reorderMasterDataBOMItems}
        />
      )
    }

    return (
      <RoutingTable
        routing={masterDataSnapshot.routing}
        rates={masterDataSnapshot.rates}
        isEditMode={isEditMode}
        historyScope={masterDataRole}
        selectionDatasetId={activeProductId}
        {...cellSelectionOwnerProps}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        showWarningHighlights={showWarningHighlights}
        {...tableChromeProps}
        warningNavigationTarget={warningNavigationTarget}
        onWarningNavigationHandled={handleWarningNavigationHandled}
        onUndo={undoMasterDataEdit}
        onRedo={redoMasterDataEdit}
        onAddRoutingStep={() => addMasterDataRoutingStep({
          operationCode: '',
          processName: '',
          sequence: (masterDataSnapshot.routing.length + 1) * 10,
          workCenterId: undefined,
          manning: null,
          capacity: null,
          yield: null,
          sourceRef: 'Direct Input'
        })}
        onUpdateRoutingSteps={updateMasterDataRoutingSteps}
        onDeleteRoutingSteps={deleteMasterDataRoutingSteps}
        onReorderRows={reorderMasterDataRoutingSteps}
      />
    )
  }

  const handleWorkspaceHistoryShortcut = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !isEditMode || !(event.ctrlKey || event.metaKey)) return
    const target = event.target
    if (!(target instanceof HTMLElement)
      || !target.closest('[aria-label="Working dataset controls"]')
      || !target.closest('button')) return

    const key = event.key.toLowerCase()
    if (key === 'z') {
      event.preventDefault()
      if (event.shiftKey) redoMasterDataEdit()
      else undoMasterDataEdit()
    } else if (key === 'y' && !event.shiftKey) {
      event.preventDefault()
      redoMasterDataEdit()
    }
  }

  const tableSections = [
    { key: 'bom' as const, id: 'master-data-table-bom', label: 'Bill of Materials', navLabel: 'BOM' },
    { key: 'wc' as const, id: 'master-data-table-wc', label: 'Work Centers', navLabel: 'WC' },
    { key: 'routing' as const, id: 'master-data-table-routing', label: 'Routing', navLabel: 'RTG' }
  ]
  const activeSection = tableSections.find(section => section.key === activeTableTab)
  const tableSelector = (
    <div className="grid h-8 w-72 shrink-0 grid-cols-4 items-stretch border border-slate-300 bg-white" role="group" aria-label="Master Data table section">
      {tableSections.map(section => {
        const isActive = !isAllTablesVisible && activeTableTab === section.key
        return (
          <button
            key={section.key}
            type="button"
            aria-pressed={isActive}
            aria-controls="master-data-table-panel"
            onClick={() => updateMasterDataUiState({ type: 'set-table-view', tableView: section.key })}
            className={'relative inline-flex h-full w-full items-center justify-center border-r border-slate-200 px-0.5 text-[10px] font-medium transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (isActive ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
          >
            {isActive && <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 bg-slate-900" />}
            <span className="relative z-10">{section.navLabel}</span>
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={isAllTablesVisible}
        aria-controls="master-data-table-panel"
        onClick={() => updateMasterDataUiState({ type: 'set-table-view', tableView: 'all' })}
        className={'relative inline-flex h-full w-full items-center justify-center px-0.5 text-[10px] font-medium transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
          (isAllTablesVisible ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
      >
        {isAllTablesVisible && <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 bg-slate-900" />}
        <span className="relative z-10">All</span>
      </button>
    </div>
  )

  return (
    <MasterDataDirectEditsContext.Provider value={activeSession?.masterDataDirectEdits?.[masterDataRole] ?? {}}>
    <div ref={pageRef} onKeyDown={handleWorkspaceHistoryShortcut} className="w-full space-y-2">
      <MasterDataWorkspaceHeader
        workspaceHeaderRef={workspaceHeaderRef}
        product={product}
        snapshot={masterDataSnapshot}
        saveStates={saveStates}
        role={masterDataRole}
        selectionDatasetId={activeProductId}
        onRoleChange={setMasterDataRole}
        onSaveWorkingDataset={() => saveMasterDataWorkingDataset(masterDataRole)}
        onSaveAllWorkingDatasets={saveAllMasterDataWorkingDatasets}
        onResetWorkingDataset={() => resetMasterDataWorkingDataset(masterDataRole)}
        onResetAllWorkingDatasets={resetAllMasterDataWorkingDatasets}
        isEditMode={isEditMode}
        onToggleEditMode={mode => updateMasterDataUiState({ type: 'set-mode', mode: mode ? 'edit' : 'view' })}
        onUpdateProduct={updateMasterDataProduct}
        onUpdateRemark={updateMasterDataRemark}
        onCloneFrom={cloneMasterDataWorkspace}
        onClearDataset={() => clearMasterDataDataset(masterDataRole)}
        onClearAllDatasets={clearAllMasterDataWorkingDatasets}
        onOpenImportModal={() => setImportModalOpen(true)}
        onOpenSizingModal={() => setSizingModalOpen(true)}
        tableSelector={tableSelector}
        tableView={masterDataUiState.tableView}
        showWarningHighlights={showWarningHighlights}
        onWarningHighlightsChange={setShowWarningHighlights}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
      />

      <div
        id="master-data-table-panel"
        role="region"
        aria-label={isAllTablesVisible ? 'All dataset tables' : `${activeSection?.label ?? 'Dataset'} table`}
        className={isAllTablesVisible ? 'space-y-3' : ''}
      >
        {isAllTablesVisible
          ? tableSections.map(section => (
            <section
              key={section.key}
              id={section.id}
              tabIndex={-1}
              aria-label={section.label}
              className="scroll-mt-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            >
              {renderTable(section.key)}
            </section>
          ))
          : activeSection && (
            <section
              id={activeSection.id}
              tabIndex={-1}
              aria-label={activeSection.label}
              className="scroll-mt-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            >
              {renderTable(activeSection.key)}
            </section>
          )}
      </div>

      <ExcelImportModal
        isOpen={activeTab === 'master' && importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRole={masterDataRole}
        hasWorkingData={hasEnteredMasterData(masterDataSnapshot)}
        onImport={importSnapshotFromExcel}
      />
      <DatasetSizingModal
        isOpen={activeTab === 'master' && sizingModalOpen}
        onClose={() => setSizingModalOpen(false)}
        role={masterDataRole}
        selectionDatasetId={activeProductId}
        product={product}
        snapshot={masterDataSnapshot}
        onUpdateProduct={updateMasterDataProduct}
        onUpdateRemark={updateMasterDataRemark}
        currentSizing={masterDataSizing}
        onSaveSizing={sizing => updateMasterDataDatasetSizing(masterDataRole, sizing)}
      />
    </div>
    </MasterDataDirectEditsContext.Provider>
  )
}
