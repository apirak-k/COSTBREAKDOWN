import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../state'

import { ProductMasterCard } from './components/ProductMasterCard'
import { ExcelImportPanel } from './components/ExcelImportPanel'
import { DatasetRoleSelector } from './components/DatasetRoleSelector'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'
import { AddBOMModal } from './components/modals/AddBOMModal'
import { AddRoutingModal } from './components/modals/AddRoutingModal'
import { AddRateModal } from './components/modals/AddRateModal'

export const MasterDataPage: React.FC = () => {
  const {
    activeSession,
    uomList,
    masterDataRole,
    masterDataSnapshot,
    masterDataHandoff,
    setMasterDataRole,
    setActiveTab,
    cloneReferenceToCurrent,
    cloneActiveToDraft,
    activateDraft,
    updateMasterDataProduct,
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
  const [bomModalOpen, setBomModalOpen] = useState(false)
  const [routingModalOpen, setRoutingModalOpen] = useState(false)
  const [rateModalOpen, setRateModalOpen] = useState(false)
  const canEdit = activeSession.status === 'draft'
  const product = masterDataSnapshot.product

  return (
    <div className="space-y-6">
      <DatasetRoleSelector
        product={product}
        snapshot={masterDataSnapshot}
        status={activeSession.status}
        role={masterDataRole}
        onRoleChange={setMasterDataRole}
      />

      <ProductMasterCard
        product={product}
        ratesCount={masterDataSnapshot.rates.length}
        bomCount={masterDataSnapshot.bom.length}
        routingCount={masterDataSnapshot.routing.length}
        uomList={uomList}
        status={activeSession.status}
        versionLabel={`${activeSession.versionLabel || 'Draft'} · ${masterDataRole === 'reference' ? 'Reference' : 'Current'}`}
        isEditMode={isEditMode && canEdit}
        canEdit={canEdit}
        onToggleEditMode={edit => setIsEditMode(edit && canEdit)}
        onUpdateProduct={updateMasterDataProduct}
        onCloneToDraft={() => cloneActiveToDraft(activeSession.id)}
        onActivateDraft={() => activateDraft(activeSession.id)}
      />

      {masterDataSnapshot.warnings && masterDataSnapshot.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-sans">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div><strong>{masterDataSnapshot.warnings.length} data warning(s)</strong><ul className="mt-1 list-disc pl-4">{masterDataSnapshot.warnings.slice(0, 4).map(warning => <li key={warning}>{warning}</li>)}</ul>{masterDataSnapshot.warnings.length > 4 && <span className="text-[10px]">More warnings are attached to this dataset.</span>}</div>
        </div>
      )}

      <ExcelImportPanel
        product={product}
        snapshot={masterDataSnapshot}
        importRole={masterDataRole}
        canEdit={canEdit}
        canCloneReference={masterDataHandoff.referenceReady}
        onCloneReferenceToCurrent={cloneReferenceToCurrent}
      />

      <section className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs" aria-labelledby="master-data-handoff-title">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 id="master-data-handoff-title" className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">
              Comparison readiness
            </h2>
            <p className="mt-1 text-[10px] text-slate-500 font-sans">
              Cost Breakdown opens only after both datasets are prepared for this Header Product.
            </p>
          </div>
          <span className={`self-start px-2 py-1 text-[10px] font-mono font-bold uppercase border ${masterDataHandoff.canCompare ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
            {masterDataHandoff.canCompare ? 'Ready' : 'Not ready'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="border border-slate-200 bg-slate-50 px-2.5 py-2">
            <span className="block text-slate-500 uppercase">Header Product</span>
            <strong className="block mt-0.5 text-slate-900">{masterDataHandoff.productCode || '—'}</strong>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-2.5 py-2">
            <span className="block text-slate-500 uppercase">Reference</span>
            <strong className={`block mt-0.5 ${masterDataHandoff.referenceReady ? 'text-emerald-700' : 'text-amber-700'}`}>
              {masterDataHandoff.referenceReady ? 'Prepared' : 'Needs input'}
            </strong>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-2.5 py-2">
            <span className="block text-slate-500 uppercase">Current</span>
            <strong className={`block mt-0.5 ${masterDataHandoff.currentReady ? 'text-emerald-700' : 'text-amber-700'}`}>
              {masterDataHandoff.currentReady ? 'Prepared' : 'Needs input'}
            </strong>
          </div>
        </div>

        {masterDataHandoff.issues.length > 0 && (
          <ul className="mt-3 list-disc pl-4 space-y-0.5 text-[10px] text-amber-800 font-sans" role="status">
            {masterDataHandoff.issues.map(issue => <li key={issue}>{issue}</li>)}
          </ul>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            disabled={!masterDataHandoff.canCompare}
            className="px-2.5 py-1 text-[11px] font-mono font-bold text-white bg-slate-900 hover:bg-slate-700 border border-slate-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Open Cost Breakdown
          </button>
        </div>
      </section>

      <WorkCenterRatesTable
        rates={masterDataSnapshot.rates}
        isEditMode={isEditMode && canEdit}
        onAddRate={() => setRateModalOpen(true)}
        onUpdateRate={updateMasterDataWorkCenterRate}
        onDeleteRate={deleteMasterDataWorkCenterRate}
      />

      <BOMTable
        bom={masterDataSnapshot.bom}
        isEditMode={isEditMode && canEdit}
        onAddBOMItem={() => setBomModalOpen(true)}
        onUpdateBOMItem={updateMasterDataBOMItem}
        onDeleteBOMItem={deleteMasterDataBOMItem}
      />

      <RoutingTable
        routing={masterDataSnapshot.routing}
        rates={masterDataSnapshot.rates}
        isEditMode={isEditMode && canEdit}
        onAddRoutingStep={() => setRoutingModalOpen(true)}
        onUpdateRoutingStep={updateMasterDataRoutingStep}
        onDeleteRoutingStep={deleteMasterDataRoutingStep}
      />

      <AddBOMModal isOpen={bomModalOpen} onClose={() => setBomModalOpen(false)} onSave={addMasterDataBOMItem} />
      <AddRoutingModal isOpen={routingModalOpen} rates={masterDataSnapshot.rates} onClose={() => setRoutingModalOpen(false)} onSave={addMasterDataRoutingStep} />
      <AddRateModal isOpen={rateModalOpen} onClose={() => setRateModalOpen(false)} onSave={addMasterDataWorkCenterRate} />
    </div>
  )
}
