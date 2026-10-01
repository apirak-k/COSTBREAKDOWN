import React, { useMemo, useState } from 'react'
import { AlertTriangle, Box, ChevronDown, ChevronUp, Factory, GitCommit } from 'lucide-react'
import { useAppStore } from '../../state'

import { MasterDataWorkspaceHeader } from './components/MasterDataWorkspaceHeader'
import { ExcelImportModal } from './components/ExcelImportModal'
import { TemplateSizingModal } from './components/TemplateSizingModal'
import { DatasetSizingModal } from './components/DatasetSizingModal'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'
import { PageHeading } from '../../shared'

type TableSubTab = 'bom' | 'routing' | 'rates'

export const MasterDataPage: React.FC = () => {
  const {
    uomList,
    isDevelopmentReviewFixture,
    masterDataRole,
    masterDataSnapshot,
    masterDataSizing,
    masterDataHandoff,
    snapshotPair,
    setMasterDataRole,
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
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
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
      : 'Work Center Rates'

  return (
    <div className="space-y-6">
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
        role={masterDataRole}
        onRoleChange={setMasterDataRole}
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
        onOpenTemplateModal={() => setTemplateModalOpen(true)}
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
            <h2 className="text-sm font-semibold text-slate-950">Dataset tables</h2>
            <p className="mt-0.5 text-xs text-slate-600">Select a section to review or edit its rows.</p>
          </div>
          <div className="flex min-w-0 gap-1 overflow-x-auto" role="group" aria-label="Dataset table sections">
            <button
              id="master-data-nav-bom"
              type="button"
              aria-pressed={activeTableTab === 'bom'}
              aria-controls="master-data-table-panel"
              onClick={() => setActiveTableTab('bom')}
              className={'flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (activeTableTab === 'bom'
                  ? 'border-b-blue-700 bg-white text-slate-950'
                  : 'border-b-transparent text-slate-600 hover:bg-white hover:text-slate-950')}
            >
              <Box className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>BOM</span>
              <span className={'font-mono text-xs tabular-nums ' + (activeTableTab === 'bom' ? 'text-slate-950' : 'text-slate-500')}>
                {masterDataSnapshot.bom.length}
              </span>
            </button>
            <button
              id="master-data-nav-routing"
              type="button"
              aria-pressed={activeTableTab === 'routing'}
              aria-controls="master-data-table-panel"
              onClick={() => setActiveTableTab('routing')}
              className={'flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (activeTableTab === 'routing'
                  ? 'border-b-blue-700 bg-white text-slate-950'
                  : 'border-b-transparent text-slate-600 hover:bg-white hover:text-slate-950')}
            >
              <GitCommit className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>Routing</span>
              <span className={'font-mono text-xs tabular-nums ' + (activeTableTab === 'routing' ? 'text-slate-950' : 'text-slate-500')}>
                {masterDataSnapshot.routing.length}
              </span>
            </button>
            <button
              id="master-data-nav-rates"
              type="button"
              aria-pressed={activeTableTab === 'rates'}
              aria-controls="master-data-table-panel"
              onClick={() => setActiveTableTab('rates')}
              className={'flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (activeTableTab === 'rates'
                  ? 'border-b-blue-700 bg-white text-slate-950'
                  : 'border-b-transparent text-slate-600 hover:bg-white hover:text-slate-950')}
            >
              <Factory className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>Work Centers</span>
              <span className={'font-mono text-xs tabular-nums ' + (activeTableTab === 'rates' ? 'text-slate-950' : 'text-slate-500')}>
                {masterDataSnapshot.rates.length}
              </span>
            </button>
          </div>
        </div>

        <div
          id="master-data-table-panel"
          role="region"
          aria-label={tableLabel + ' table'}
          aria-labelledby={'master-data-nav-' + activeTableTab}
        >
          {activeTableTab === 'bom' && (
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
          )}

          {activeTableTab === 'routing' && (
            <RoutingTable
              routing={masterDataSnapshot.routing}
              rates={masterDataSnapshot.rates}
              isEditMode={isEditMode}
              onAddRoutingStep={() => addMasterDataRoutingStep({
                operationCode: '',
                processName: '',
                sequence: (masterDataSnapshot.routing.length + 1) * 10,
                workCenterId: masterDataSnapshot.rates[0]?.workCenterCode || undefined,
                manning: null,
                capacity: null,
                yield: null,
                sourceRef: 'Direct Input'
              })}
              onUpdateRoutingStep={updateMasterDataRoutingStep}
              onDeleteRoutingStep={deleteMasterDataRoutingStep}
            />
          )}

          {activeTableTab === 'rates' && (
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
          )}
        </div>
      </section>

      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRole={masterDataRole}
      />

      <TemplateSizingModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        role={masterDataRole}
        product={product}
        snapshot={masterDataSnapshot}
        currentSizing={masterDataSizing}
      />

      <DatasetSizingModal
        isOpen={sizingModalOpen}
        onClose={() => setSizingModalOpen(false)}
        role={masterDataRole}
        product={product}
        onUpdateProduct={updateMasterDataProduct}
        currentSizing={masterDataSizing}
        onSaveSizing={sizing => updateMasterDataDatasetSizing(masterDataRole, sizing)}
      />
    </div>
  )
}
