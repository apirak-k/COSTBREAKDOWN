import React, { useMemo, useState } from 'react'
import { AlertTriangle, Box, ChevronDown, ChevronUp, Factory, GitCommit } from 'lucide-react'
import { useAppStore } from '../../state'

import { MasterDataWorkspaceHeader } from './components/MasterDataWorkspaceHeader'
import { ExcelImportModal } from './components/ExcelImportModal'
import { DatasetSizingModal } from './components/DatasetSizingModal'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'

type TableSubTab = 'bom' | 'wc' | 'routing'

export const MasterDataPage: React.FC = () => {
  const {
    uomList,
    isDevelopmentReviewFixture,
    masterDataRole,
    masterDataSnapshot,
    masterDataLastSavedSnapshot,
    masterDataSizing,
    masterDataHandoff,
    setMasterDataRole,
    saveMasterDataWorkingDataset,
    resetMasterDataWorkingDataset,
    loadDevelopmentReviewFixture,
    returnFromDevelopmentReviewFixture,
    cloneReferenceToCurrent,
    cloneCurrentToReference,
    clearMasterDataDataset,
    updateMasterDataDatasetSizing,
    updateMasterDataProduct,
    updateMasterDataRemark,
    addMasterDataBOMItem,
    updateMasterDataBOMItem,
    deleteMasterDataBOMItem,
    reorderMasterDataBOMItems,
    addMasterDataRoutingStep,
    updateMasterDataRoutingStep,
    deleteMasterDataRoutingStep,
    reorderMasterDataRoutingSteps,
    addMasterDataWorkCenterRate,
    updateMasterDataWorkCenterRate,
    deleteMasterDataWorkCenterRate,
    reorderMasterDataWorkCenters
  } = useAppStore()

  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTableTab, setActiveTableTab] = useState<TableSubTab>('bom')
  const [isAllTablesVisible, setIsAllTablesVisible] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [sizingModalOpen, setSizingModalOpen] = useState(false)
  const [warningsExpanded, setWarningsExpanded] = useState(false)

  const handleLoadSyntheticReviewData = async () => {
    if (!import.meta.env.DEV) return
    if (!window.confirm('Load or reset the dedicated mock review session? Your current working session will be kept.')) return

    const { createSyntheticReviewSnapshotPair } = await import('./fixtures/synthetic-review-data')
    loadDevelopmentReviewFixture(createSyntheticReviewSnapshotPair())
  }

  const developmentAction = import.meta.env.DEV
    ? isDevelopmentReviewFixture
      ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Return to your previous working session? The mock review session will be kept.')) {
              returnFromDevelopmentReviewFixture()
            }
          }}
          className="min-h-8 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Return to working session
        </button>
      )
      : (
        <button
          type="button"
          onClick={() => { void handleLoadSyntheticReviewData() }}
          className="min-h-8 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Load mock review data
        </button>
      )
    : undefined

  const product = masterDataSnapshot.product

  const allNotices = useMemo(() => {
    const list: string[] = []
    if (masterDataSnapshot.warnings) {
      list.push(...masterDataSnapshot.warnings)
    }
    if (masterDataHandoff.warnings) {
      masterDataHandoff.warnings.forEach(warning => {
        if (!list.includes(warning)) list.push(warning)
      })
    }
    return list
  }, [masterDataSnapshot.warnings, masterDataHandoff.warnings])

  const renderTable = (table: TableSubTab) => {
    if (table === 'wc') {
      return (
        <WorkCenterRatesTable
          rates={masterDataSnapshot.rates}
          isEditMode={isEditMode}
          historyScope={masterDataRole}
          onAddRate={() => addMasterDataWorkCenterRate({
            workCenterCode: '',
            description: '',
            laborRate: null,
            burdenRate: null,
            effectiveDate: product.effectiveDate || new Date().toISOString().split('T')[0],
            sourceRef: 'Direct Input'
          })}
          onUpdateRate={updateMasterDataWorkCenterRate}
          onDeleteRate={deleteMasterDataWorkCenterRate}
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
          onAddBOMItem={() => addMasterDataBOMItem({
            itemCode: '',
            description: '',
            consumption: null,
            unit: 'PC',
            price: null,
            loss: 0,
            sourceRef: 'Direct Input'
          })}
          onUpdateBOMItem={updateMasterDataBOMItem}
          onDeleteBOMItem={deleteMasterDataBOMItem}
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
        onUpdateRoutingStep={updateMasterDataRoutingStep}
        onDeleteRoutingStep={deleteMasterDataRoutingStep}
        onReorderRows={reorderMasterDataRoutingSteps}
      />
    )
  }

  const tableSections = [
    { key: 'wc' as const, id: 'master-data-table-wc', label: 'Work Centers', navLabel: 'Work Centers', icon: Factory },
    { key: 'bom' as const, id: 'master-data-table-bom', label: 'BOM', navLabel: 'BOM', icon: Box },
    { key: 'routing' as const, id: 'master-data-table-routing', label: 'Process Routing', navLabel: 'Routing', icon: GitCommit }
  ]
  const activeSection = tableSections.find(section => section.key === activeTableTab)
  const tableSelector = (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Master Data table section">
      {tableSections.map(section => {
        const Icon = section.icon
        const isActive = !isAllTablesVisible && activeTableTab === section.key
        return (
          <button
            key={section.key}
            type="button"
            aria-pressed={isActive}
            aria-controls="master-data-table-panel"
            onClick={() => {
              setActiveTableTab(section.key)
              setIsAllTablesVisible(false)
            }}
            className={'inline-flex min-h-8 items-center gap-1 border px-2 font-mono text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
              (isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {section.navLabel}
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={isAllTablesVisible}
        aria-controls="master-data-table-panel"
        onClick={() => setIsAllTablesVisible(true)}
        className={'min-h-8 border px-2 font-mono text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
          (isAllTablesVisible
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
      >
        All tables
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <MasterDataWorkspaceHeader
        product={product}
        snapshot={masterDataSnapshot}
        lastSavedSnapshot={masterDataLastSavedSnapshot}
        role={masterDataRole}
        onRoleChange={setMasterDataRole}
        onSaveWorkingDataset={() => saveMasterDataWorkingDataset(masterDataRole)}
        onResetWorkingDataset={() => resetMasterDataWorkingDataset(masterDataRole)}
        uomList={uomList}
        isEditMode={isEditMode}
        onToggleEditMode={setIsEditMode}
        onUpdateProduct={updateMasterDataProduct}
        onUpdateRemark={updateMasterDataRemark}
        onCloneReferenceToCurrent={cloneReferenceToCurrent}
        onCloneCurrentToReference={cloneCurrentToReference}
        onClearDataset={() => clearMasterDataDataset(masterDataRole)}
        canCloneReference={masterDataHandoff.referenceReady}
        canCloneCurrent={masterDataHandoff.currentReady}
        handoff={masterDataHandoff}
        onOpenImportModal={() => setImportModalOpen(true)}
        onOpenSizingModal={() => setSizingModalOpen(true)}
        developmentAction={developmentAction}
        tableSelector={tableSelector}
      />

      {allNotices.length > 0 && (
        <aside className="border-y border-slate-300 border-l-4 border-l-amber-600 bg-amber-50 px-4 py-3 text-sm text-slate-800" aria-label="Dataset notices">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="min-w-0 leading-5">
                <span className="mr-2 font-semibold text-slate-950">Data notice</span>
                {allNotices[0]}
              </p>
            </div>
            {allNotices.length > 1 && (
              <button
                type="button"
                onClick={() => setWarningsExpanded(!warningsExpanded)}
                aria-expanded={warningsExpanded}
                className="inline-flex min-h-8 shrink-0 items-center gap-1 px-2 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {warningsExpanded ? 'Hide notices' : 'All ' + allNotices.length}
                {warningsExpanded
                  ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            )}
          </div>
          {warningsExpanded && allNotices.length > 1 && (
            <ul className="mt-3 space-y-1 border-t border-amber-200 pt-3 pl-6 text-sm leading-5 text-slate-700">
              {allNotices.map((notice, index) => <li key={index}>{notice}</li>)}
            </ul>
          )}
        </aside>
      )}

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
                  <h3 id={section.id + '-heading'} className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    {section.label}
                  </h3>
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
                    <h3 id={activeSection.id + '-heading'} className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-900">
                      {activeSection.label}
                    </h3>
                  </header>
                  {renderTable(activeSection.key)}
                </section>
              )}
        </div>
      </section>

      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRole={masterDataRole}
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
