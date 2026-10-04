import React, { useMemo, useState } from 'react'
import { AlertTriangle, Box, ChevronDown, ChevronUp, Factory, GitCommit, Layers } from 'lucide-react'
import { useAppStore } from '../../state'

import { MasterDataWorkspaceHeader } from './components/MasterDataWorkspaceHeader'
import { ExcelImportModal } from './components/ExcelImportModal'
import { DatasetSizingModal } from './components/DatasetSizingModal'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'
import { PageHeading } from '../../shared'

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
    snapshotPair,
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
    addMasterDataRoutingStep,
    updateMasterDataRoutingStep,
    deleteMasterDataRoutingStep,
    addMasterDataWorkCenterRate,
    updateMasterDataWorkCenterRate,
    deleteMasterDataWorkCenterRate
  } = useAppStore()

  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTableTab, setActiveTableTab] = useState<TableSubTab>('bom')
  const [isAllTablesVisible, setIsAllTablesVisible] = useState(true)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [sizingModalOpen, setSizingModalOpen] = useState(false)
  const [warningsExpanded, setWarningsExpanded] = useState(false)

  const handleLoadSyntheticReviewData = async () => {
    if (!import.meta.env.DEV) return
    if (!window.confirm('Load or reset the dedicated mock review session? Your current working session will be kept.')) return

    const { createSyntheticReviewSnapshotPair } = await import('./fixtures/synthetic-review-data')
    loadDevelopmentReviewFixture(createSyntheticReviewSnapshotPair())
  }

  const product = masterDataSnapshot.product

  const referenceCounts = useMemo(() => ({
    bom: snapshotPair.reference.bom.length,
    routing: snapshotPair.reference.routing.length,
    rates: snapshotPair.reference.rates.length
  }), [snapshotPair.reference])

  const currentCounts = useMemo(() => ({
    bom: snapshotPair.current.bom.length,
    routing: snapshotPair.current.routing.length,
    rates: snapshotPair.current.rates.length
  }), [snapshotPair.current])

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

  const tableLabel = activeTableTab === 'bom'
    ? 'BOM'
    : activeTableTab === 'routing'
      ? 'Routing'
      : 'WC'

  const renderTable = (table: TableSubTab) => {
    if (table === 'wc') {
      return (
        <WorkCenterRatesTable
          rates={masterDataSnapshot.rates}
          isEditMode={isEditMode}
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
        />
      )
    }

    if (table === 'bom') {
      return (
        <BOMTable
          bom={masterDataSnapshot.bom}
          isEditMode={isEditMode}
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
        />
      )
    }

    return (
      <RoutingTable
        routing={masterDataSnapshot.routing}
        rates={masterDataSnapshot.rates}
        isEditMode={isEditMode}
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
      />
    )
  }

  const tableSections = [
    { key: 'bom' as const, id: 'master-data-table-bom', label: 'BOM', navLabel: 'BOM', icon: Box },
    { key: 'wc' as const, id: 'master-data-table-wc', label: 'WC', navLabel: 'WC', icon: Factory },
    { key: 'routing' as const, id: 'master-data-table-routing', label: 'Process Routing', navLabel: 'Routing', icon: GitCommit }
  ]
  const activeSection = tableSections.find(section => section.key === activeTableTab)

  return (
    <div className="space-y-5">
      <PageHeading
        title="Master Data"
        description="Prepare independent Reference and Current datasets through direct entry or Excel import."
        actions={import.meta.env.DEV && (isDevelopmentReviewFixture
          ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Return to your previous working session? The mock review session will be kept.')) {
                  returnFromDevelopmentReviewFixture()
                }
              }}
              className="min-h-10 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Return to working session
            </button>
          )
          : (
            <button
              type="button"
              onClick={() => { void handleLoadSyntheticReviewData() }}
              className="min-h-10 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Load mock review data
            </button>
          ))}
      />

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
        referenceCounts={referenceCounts}
        currentCounts={currentCounts}
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
        <div className="flex flex-col gap-2 border-b border-slate-300 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-950">Dataset tables</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">
              {isAllTablesVisible
                ? 'All sections are shown below. Use the links to move between them.'
                : 'Select one section to review or edit its rows.'}
            </p>
          </div>
          {isAllTablesVisible ? (
            <nav className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Jump to dataset table">
              {tableSections.map(section => {
                const Icon = section.icon
                return (
                  <a
                    key={section.key}
                    href={'#' + section.id}
                    onClick={() => setActiveTableTab(section.key)}
                    className="inline-flex min-h-8 items-center gap-1.5 border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {section.navLabel}
                  </a>
                )
              })}
              <button
                type="button"
                onClick={() => setIsAllTablesVisible(false)}
                className="min-h-8 border border-slate-400 bg-slate-200 px-2.5 font-mono text-xs font-medium text-slate-800 transition-colors hover:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Show {tableLabel} only
              </button>
            </nav>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-1" role="group" aria-label="Dataset table sections">
              {tableSections.map(section => {
                const Icon = section.icon
                const isActive = activeTableTab === section.key
                return (
                  <button
                    key={section.key}
                    type="button"
                    aria-pressed={isActive}
                    aria-controls="master-data-table-panel"
                    onClick={() => setActiveTableTab(section.key)}
                    className={'flex min-h-8 items-center gap-1.5 border-b-2 px-2.5 font-mono text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                      (isActive
                        ? 'border-b-blue-700 bg-white text-slate-950'
                        : 'border-b-transparent text-slate-600 hover:bg-white hover:text-slate-950')}
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                    <span>{section.navLabel}</span>
                  </button>
                )
              })}
              <button
                type="button"
                aria-pressed={isAllTablesVisible}
                aria-controls="master-data-table-panel"
                onClick={() => setIsAllTablesVisible(true)}
                className="flex min-h-8 items-center gap-1.5 border border-slate-300 bg-white px-2.5 font-mono text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                All tables
              </button>
            </div>
          )}
        </div>

        <div
          id="master-data-table-panel"
          role="region"
          aria-label={isAllTablesVisible ? 'All dataset tables' : tableLabel + ' table'}
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
