import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  groupMasterDataBlockers,
  groupMasterDataWarnings,
  type MasterDataQualityItem
} from './prepare-dataset'
import type { WarningNavigationTarget } from './hooks/useWarningNavigationFocus'
import { hasEnteredMasterData } from '../../state/dataset-sizing'

type TableSubTab = 'bom' | 'wc' | 'routing'

interface MasterDataPageProps {
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

export const MasterDataPage: React.FC<MasterDataPageProps> = ({ searchQuery = '', onSearchQueryChange = () => undefined }) => {
  const {
    masterDataSnapshots,
    masterDataUiState,
    masterDataRole,
    masterDataSnapshot,
    masterDataLastSavedSnapshot,
    masterDataLastSavedSnapshots,
    masterDataSizing,
    masterDataHandoff,
    importSnapshotFromExcel,
    masterDataPrepareDatasetOpen,
    setMasterDataPrepareDatasetOpen,
    masterDataPrepareDatasetRequested,
    masterDataPrepareDatasetRequestMode,
    undoMasterDataEdit,
    redoMasterDataEdit,
    setMasterDataRole,
    updateMasterDataUiState,
    saveMasterDataWorkingDataset,
    resetMasterDataWorkingDataset,
    loadDevelopmentMockData,
    consumeMasterDataPrepareDatasetRequest,
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

  useEffect(() => {
    if (!masterDataPrepareDatasetRequested) return
    setMasterDataPrepareDatasetOpen(true)
    consumeMasterDataPrepareDatasetRequest()
  }, [masterDataPrepareDatasetRequested, setMasterDataPrepareDatasetOpen, consumeMasterDataPrepareDatasetRequest])

  const isEditMode = masterDataUiState.mode === 'edit'
  const isAllTablesVisible = masterDataUiState.tableView === 'all'
  const activeTableTab: TableSubTab = masterDataUiState.tableView === 'all' ? 'bom' : masterDataUiState.tableView
  const product = masterDataSnapshot.product

  const warningItems = useMemo(() => buildMasterDataWarningItems(masterDataSnapshots), [masterDataSnapshots])
  const blockerItems = useMemo(() => buildMasterDataBlockerItems(masterDataSnapshots), [masterDataSnapshots])
  const warningGroups = useMemo(() => groupMasterDataWarnings(warningItems), [warningItems])
  const blockerGroups = useMemo(() => groupMasterDataBlockers(blockerItems), [blockerItems])
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
  }, [])

  const handleLoadMockData = async (fixture: 'complete' | 'incomplete') => {
    if (!import.meta.env.DEV) return
    const fixtures = await import('./fixtures/synthetic-review-data')
    loadDevelopmentMockData(fixture === 'complete'
      ? fixtures.createCompleteMasterDataMockPair()
      : fixtures.createIncompleteMasterDataMockPair())
    setMasterDataRole('current')
  }

  const developmentAction = import.meta.env.DEV ? (
    <div role="group" aria-label="Development mock datasets" className="grid w-full grid-cols-2 divide-x divide-slate-200 text-[11px]">
      <button
        type="button"
        onClick={() => { void handleLoadMockData('complete') }}
        className="min-h-7 w-full px-1.5 text-center font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        Complete Mock
      </button>
      <button
        type="button"
        onClick={() => { void handleLoadMockData('incomplete') }}
        className="min-h-7 w-full px-1.5 text-center font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        Incomplete Mock
      </button>
    </div>
  ) : undefined

  const renderTable = (table: TableSubTab) => {
    const warningNavigationTarget = warningNavigation?.table === table ? warningNavigation : undefined
    const tableWarnings = warningItems.filter(item => item.role === masterDataRole && item.table === table)
    const tableBlockers = blockerItems.filter(item => item.role === masterDataRole && item.table === table)
    const tableChromeProps = {
      warningCount: tableWarnings.length,
      blockerItems: tableBlockers,
      onNavigateBlocker: (item: MasterDataQualityItem) => handleWarningNavigation(item, true)
    }
    if (table === 'wc') {
      return (
        <WorkCenterRatesTable
          rates={masterDataSnapshot.rates}
          isEditMode={isEditMode}
          historyScope={masterDataRole}
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

  const tableSections = [
    { key: 'bom' as const, id: 'master-data-table-bom', label: 'Bill of Materials', navLabel: 'BOM' },
    { key: 'wc' as const, id: 'master-data-table-wc', label: 'Work Centers', navLabel: 'Work Centers' },
    { key: 'routing' as const, id: 'master-data-table-routing', label: 'Routing', navLabel: 'Routing' }
  ]
  const activeSection = tableSections.find(section => section.key === activeTableTab)
  const tableSelector = (
    <div className="grid w-72 shrink-0 grid-cols-4 items-stretch border border-slate-300 bg-white p-0.5" role="group" aria-label="Master Data table section">
      {tableSections.map(section => {
        const isActive = !isAllTablesVisible && activeTableTab === section.key
        return (
          <button
            key={section.key}
            type="button"
            aria-pressed={isActive}
            aria-controls="master-data-table-panel"
            onClick={() => updateMasterDataUiState({ type: 'set-table-view', tableView: section.key })}
            className={'inline-flex min-h-8 w-full items-center justify-center border-r border-slate-200 px-0.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
          >
            {section.navLabel}
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={isAllTablesVisible}
        aria-controls="master-data-table-panel"
        onClick={() => updateMasterDataUiState({ type: 'set-table-view', tableView: 'all' })}
        className={'inline-flex min-h-8 w-full items-center justify-center px-0.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
          (isAllTablesVisible ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
      >
        All
      </button>
    </div>
  )

  return (
    <div className="w-full space-y-2">
      <MasterDataWorkspaceHeader
        product={product}
        snapshot={masterDataSnapshot}
        lastSavedSnapshot={masterDataLastSavedSnapshot}
        saveStates={saveStates}
        role={masterDataRole}
        onRoleChange={setMasterDataRole}
        onSaveWorkingDataset={() => saveMasterDataWorkingDataset(masterDataRole)}
        onResetWorkingDataset={() => resetMasterDataWorkingDataset(masterDataRole)}
        isEditMode={isEditMode}
        onToggleEditMode={mode => updateMasterDataUiState({ type: 'set-mode', mode: mode ? 'edit' : 'view' })}
        onUpdateProduct={updateMasterDataProduct}
        onUpdateRemark={updateMasterDataRemark}
        onCloneFrom={cloneMasterDataWorkspace}
        onClearDataset={() => clearMasterDataDataset(masterDataRole)}
        handoff={masterDataHandoff}
        onOpenImportModal={() => setImportModalOpen(true)}
        onOpenSizingModal={() => setSizingModalOpen(true)}
        isPrepareDatasetOpen={masterDataPrepareDatasetOpen}
        onPrepareDatasetOpenChange={setMasterDataPrepareDatasetOpen}
        prepareDatasetRequestMode={masterDataPrepareDatasetRequestMode}
        warningGroups={warningGroups}
        warningCount={warningItems.length}
        blockerGroups={blockerGroups}
        blockerItems={blockerItems}
        blockerCount={blockerItems.length}
        onNavigateWarning={handleWarningNavigation}
        mockAction={developmentAction}
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
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRole={masterDataRole}
        hasWorkingData={hasEnteredMasterData(masterDataSnapshot)}
        onImport={importSnapshotFromExcel}
      />
      <DatasetSizingModal
        isOpen={sizingModalOpen}
        onClose={() => setSizingModalOpen(false)}
        role={masterDataRole}
        product={product}
        snapshot={masterDataSnapshot}
        onUpdateProduct={updateMasterDataProduct}
        onUpdateRemark={updateMasterDataRemark}
        currentSizing={masterDataSizing}
        onSaveSizing={sizing => updateMasterDataDatasetSizing(masterDataRole, sizing)}
      />
    </div>
  )
}
