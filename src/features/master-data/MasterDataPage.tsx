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
import { buildMasterDataWarningItems, groupMasterDataWarnings, type MasterDataWarningItem } from './prepare-dataset'
import type { WarningNavigationTarget } from './hooks/useWarningNavigationFocus'

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
    masterDataPrepareDatasetRequested,
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
  const [isPrepareDatasetOpen, setIsPrepareDatasetOpen] = useState(false)
  const [warningNavigation, setWarningNavigation] = useState<(WarningNavigationTarget & MasterDataWarningItem) | undefined>()

  useEffect(() => {
    if (!masterDataPrepareDatasetRequested) return
    setIsPrepareDatasetOpen(true)
    consumeMasterDataPrepareDatasetRequest()
  }, [masterDataPrepareDatasetRequested, consumeMasterDataPrepareDatasetRequest])

  const isEditMode = masterDataUiState.mode === 'edit'
  const isAllTablesVisible = masterDataUiState.tableView === 'all'
  const activeTableTab: TableSubTab = masterDataUiState.tableView === 'all' ? 'bom' : masterDataUiState.tableView
  const product = masterDataSnapshot.product

  const warningItems = useMemo(() => buildMasterDataWarningItems(masterDataSnapshots), [masterDataSnapshots])
  const warningGroups = useMemo(() => groupMasterDataWarnings(warningItems), [warningItems])
  const saveStates = useMemo(() => Object.fromEntries(roles.map(role => [
    role,
    getDatasetSaveState(masterDataSnapshots[role], masterDataLastSavedSnapshots[role])
  ])) as Record<MasterDataRole, ReturnType<typeof getDatasetSaveState>>, [masterDataSnapshots, masterDataLastSavedSnapshots])

  const handleWarningNavigation = (item: MasterDataWarningItem) => {
    setMasterDataRole(item.role)
    updateMasterDataUiState({ type: 'set-mode', mode: 'edit' })
    updateMasterDataUiState({ type: 'set-table-view', tableView: item.table })
    setWarningNavigation(current => ({ ...item, requestId: (current?.requestId ?? 0) + 1 }))
  }

  const handleWarningNavigationHandled = useCallback((requestId: number) => {
    setWarningNavigation(current => current?.requestId === requestId ? undefined : current)
  }, [])

  const handleLoadMockData = async () => {
    if (!import.meta.env.DEV) return
    const fixtures = await import('./fixtures/synthetic-review-data')
    loadDevelopmentMockData(fixtures.createSyntheticDataQualitySnapshotPair())
    setMasterDataRole('current')
  }

  const developmentAction = import.meta.env.DEV ? (
    <button
      type="button"
      onClick={() => { void handleLoadMockData() }}
      className="min-h-8 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      Load Mock Data
    </button>
  ) : undefined

  const renderTable = (table: TableSubTab) => {
    const warningNavigationTarget = warningNavigation?.table === table ? warningNavigation : undefined
    if (table === 'wc') {
      return (
        <WorkCenterRatesTable
          rates={masterDataSnapshot.rates}
          isEditMode={isEditMode}
          historyScope={masterDataRole}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
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
    { key: 'bom' as const, id: 'master-data-table-bom', label: 'BOM', navLabel: 'BOM' },
    { key: 'wc' as const, id: 'master-data-table-wc', label: 'Work Centers', navLabel: 'Work Centers' },
    { key: 'routing' as const, id: 'master-data-table-routing', label: 'Process Routing', navLabel: 'Routing' }
  ]
  const activeSection = tableSections.find(section => section.key === activeTableTab)
  const tableSelector = (
    <div className="flex shrink-0 items-center border border-slate-300 bg-white p-0.5" role="group" aria-label="Master Data table section">
      {tableSections.map(section => {
        const isActive = !isAllTablesVisible && activeTableTab === section.key
        return (
          <button
            key={section.key}
            type="button"
            aria-pressed={isActive}
            aria-controls="master-data-table-panel"
            onClick={() => updateMasterDataUiState({ type: 'set-table-view', tableView: section.key })}
            className={'inline-flex min-h-7 w-24 shrink-0 items-center justify-center border-r border-slate-200 px-1 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
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
        className={'inline-flex min-h-7 w-24 shrink-0 items-center justify-center px-1 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
          (isAllTablesVisible ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
      >
        All
      </button>
    </div>
  )

  return (
    <div className="w-full space-y-4">
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
        isPrepareDatasetOpen={isPrepareDatasetOpen}
        onPrepareDatasetOpenChange={setIsPrepareDatasetOpen}
        warningGroups={warningGroups}
        warningCount={warningItems.length}
        onNavigateWarning={handleWarningNavigation}
        mockAction={developmentAction}
        tableSelector={tableSelector}
      />

      <section className="overflow-hidden border border-slate-300 bg-white" aria-label="Working dataset tables">
        <div
          id="master-data-table-panel"
          role="region"
          aria-label={isAllTablesVisible ? 'All dataset tables' : `${activeSection?.label ?? 'Dataset'} table`}
        >
          {isAllTablesVisible
            ? tableSections.map(section => (
              <section
                key={section.key}
                id={section.id}
                tabIndex={-1}
                aria-labelledby={section.id + '-heading'}
                className="scroll-mt-20 border-b border-slate-300 last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
              >
                <header className="border-b border-slate-200 bg-white px-4 py-2.5">
                  <h3 id={section.id + '-heading'} className="font-sans text-sm font-semibold text-slate-900">{section.label}</h3>
                </header>
                {renderTable(section.key)}
              </section>
            ))
            : activeSection && (
              <section
                id={activeSection.id}
                tabIndex={-1}
                aria-labelledby={activeSection.id + '-heading'}
                className="scroll-mt-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
              >
                <header className="border-b border-slate-200 bg-white px-4 py-2.5">
                  <h3 id={activeSection.id + '-heading'} className="font-sans text-sm font-semibold text-slate-900">{activeSection.label}</h3>
                </header>
                {renderTable(activeSection.key)}
              </section>
            )}
        </div>
      </section>

      <ExcelImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} importRole={masterDataRole} />
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
