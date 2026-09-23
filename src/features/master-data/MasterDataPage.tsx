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
    setMasterDataRole,
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
        onCloneReferenceToCurrent={cloneReferenceToCurrent}
      />

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
