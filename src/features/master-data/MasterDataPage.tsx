import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { BOMItem, RoutingStep, WorkCenterRate } from '../../core'

// Sub-components
import { ProductMasterCard } from './components/ProductMasterCard'
import { ExcelImportPanel } from './components/ExcelImportPanel'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'

// Modals
import { ProductSetupModal } from './components/modals/ProductSetupModal'
import { AddBOMModal } from './components/modals/AddBOMModal'
import { AddRoutingModal } from './components/modals/AddRoutingModal'
import { AddRateModal } from './components/modals/AddRateModal'

export const MasterDataPage: React.FC = () => {
  const {
    product,
    rates,
    bom,
    routing,
    uomList,
    costBreakdown,
    activeSession,
    cloneActiveToDraft,
    activateDraft,
    updateProduct,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    addRoutingStep,
    updateRoutingStep,
    deleteRoutingStep,
    addWorkCenterRate,
    updateWorkCenterRate,
    deleteWorkCenterRate,
    promoteActiveToBaseline,
    resetToDefault,
    clearAllData
  } = useAppStore()

  // Mode State (Default = View Mode / Read-Only for high cleanliness and error prevention)
  const [isEditMode, setIsEditMode] = useState(false)

  // Modal States
  const [setupModalOpen, setSetupModalOpen] = useState(false)

  const [bomModal, setBomModal] = useState<{
    isOpen: boolean
    data?: BOMItem
  }>({ isOpen: false })

  const [routingModal, setRoutingModal] = useState<{
    isOpen: boolean
    data?: RoutingStep
  }>({ isOpen: false })

  const [rateModal, setRateModal] = useState<{
    isOpen: boolean
    data?: WorkCenterRate
  }>({ isOpen: false })

  return (
    <div className="space-y-6">
      {/* 1. Header & Sizing Card */}
      <ProductMasterCard
        product={product}
        ratesCount={rates.length}
        bomCount={bom.length}
        routingCount={routing.length}
        uomList={uomList}
        status={activeSession.status}
        versionLabel={activeSession.versionLabel}
        isEditMode={isEditMode}
        onToggleEditMode={setIsEditMode}
        onCloneToDraft={() => cloneActiveToDraft(activeSession.id)}
        onActivateDraft={() => activateDraft(activeSession.id)}
        onUpdateProduct={updateProduct}
        onOpenSetupModal={() => setSetupModalOpen(true)}
      />

      {/* 2. Excel Sync & Actions */}
      <ExcelImportPanel
        product={product}
        rates={rates}
        bomCount={bom.length}
        routingCount={routing.length}
        onPromoteActive={promoteActiveToBaseline}
        onResetDefault={resetToDefault}
        onClearAll={clearAllData}
      />

      {/* 3. Section B: Work Center Rates */}
      <WorkCenterRatesTable
        rates={rates}
        isEditMode={isEditMode}
        onAddRate={() => setRateModal({ isOpen: true })}
        onEditRate={r => setRateModal({ isOpen: true, data: r })}
        onUpdateRate={updateWorkCenterRate}
        onDeleteRate={deleteWorkCenterRate}
      />

      {/* 4. Section C: BOM Material Items */}
      <BOMTable
        bom={bom}
        activeMaterialCost={costBreakdown.materialActive}
        isEditMode={isEditMode}
        onAddBOMItem={() => setBomModal({ isOpen: true })}
        onEditBOMItem={b => setBomModal({ isOpen: true, data: b })}
        onUpdateBOMItem={updateBOMItem}
        onDeleteBOMItem={deleteBOMItem}
      />

      {/* 5. Section D: Process Routing Steps */}
      <RoutingTable
        routing={routing}
        rates={rates}
        activeConvCost={costBreakdown.laborActive + costBreakdown.burdenActive}
        isEditMode={isEditMode}
        onAddRoutingStep={() => setRoutingModal({ isOpen: true })}
        onEditRoutingStep={rt => setRoutingModal({ isOpen: true, data: rt })}
        onUpdateRoutingStep={updateRoutingStep}
        onDeleteRoutingStep={deleteRoutingStep}
      />

      {/* Modals */}
      <ProductSetupModal
        isOpen={setupModalOpen}
        mode="edit"
        onClose={() => setSetupModalOpen(false)}
      />

      <AddBOMModal
        isOpen={bomModal.isOpen}
        initialData={bomModal.data}
        onClose={() => setBomModal({ isOpen: false })}
        onSave={item => {
          if (bomModal.data) {
            updateBOMItem(bomModal.data.id, item)
          } else {
            addBOMItem(item)
          }
        }}
      />

      <AddRoutingModal
        isOpen={routingModal.isOpen}
        initialData={routingModal.data}
        rates={rates}
        onClose={() => setRoutingModal({ isOpen: false })}
        onSave={step => {
          if (routingModal.data) {
            updateRoutingStep(routingModal.data.id, step)
          } else {
            addRoutingStep(step)
          }
        }}
      />

      <AddRateModal
        isOpen={rateModal.isOpen}
        initialData={rateModal.data}
        onClose={() => setRateModal({ isOpen: false })}
        onSave={rate => {
          if (rateModal.data) {
            updateWorkCenterRate(rateModal.data.wc, rate)
          } else {
            addWorkCenterRate(rate)
          }
        }}
      />
    </div>
  )
}
