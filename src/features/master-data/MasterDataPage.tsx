import React, { useState, useMemo } from 'react'
import { AlertTriangle, Layers, TableProperties, Box, GitCommit, Factory, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../../state'

import { MasterDataWorkspaceHeader } from './components/MasterDataWorkspaceHeader'
import { ExcelImportModal } from './components/ExcelImportModal'
import { TemplateSizingModal } from './components/TemplateSizingModal'
import { DatasetSizingModal } from './components/DatasetSizingModal'
import { WorkCenterRatesTable } from './components/WorkCenterRatesTable'
import { BOMTable } from './components/BOMTable'
import { RoutingTable } from './components/RoutingTable'

type TableSubTab = 'bom' | 'routing' | 'rates'
type LayoutMode = 'tabs' | 'stacked'

export const MasterDataPage: React.FC = () => {
  const {
    uomList,
    masterDataRole,
    masterDataSnapshot,
    masterDataSizing,
    masterDataHandoff,
    snapshotPair,
    setMasterDataRole,
    setActiveTab,
    cloneReferenceToCurrent,
    cloneCurrentToReference,
    clearMasterDataDataset,
    updateMasterDataDatasetSizing,
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
  const [activeTableTab, setActiveTableTab] = useState<TableSubTab>('bom')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked')
  const [collapsedSections, setCollapsedSections] = useState<Record<TableSubTab, boolean>>({
    bom: false,
    routing: false,
    rates: false
  })
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [sizingModalOpen, setSizingModalOpen] = useState(false)
  const [warningsExpanded, setWarningsExpanded] = useState(false)

  const toggleSection = (section: TableSubTab) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
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

  // Combine dataset warnings and handoff notices
  const allNotices = useMemo(() => {
    const list: string[] = []
    if (masterDataSnapshot.warnings) {
      list.push(...masterDataSnapshot.warnings)
    }
    if (masterDataHandoff.warnings) {
      masterDataHandoff.warnings.forEach(w => {
        if (!list.includes(w)) list.push(w)
      })
    }
    return list
  }, [masterDataSnapshot.warnings, masterDataHandoff.warnings])

  return (
    <div className="space-y-4">
      {/* ─── Unified Workspace Header ─── */}
      <MasterDataWorkspaceHeader
        product={product}
        snapshot={masterDataSnapshot}
        role={masterDataRole}
        onRoleChange={setMasterDataRole}
        uomList={uomList}
        isEditMode={isEditMode}
        onToggleEditMode={setIsEditMode}
        onUpdateProduct={updateMasterDataProduct}
        onCloneReferenceToCurrent={cloneReferenceToCurrent}
        onCloneCurrentToReference={cloneCurrentToReference}
        onClearDataset={() => clearMasterDataDataset(masterDataRole)}
        canCloneReference={masterDataHandoff.referenceReady}
        canCloneCurrent={masterDataHandoff.currentReady}
        handoff={masterDataHandoff}
        onOpenCostBreakdown={() => setActiveTab('breakdown')}
        onOpenImportModal={() => setImportModalOpen(true)}
        onOpenTemplateModal={() => setTemplateModalOpen(true)}
        onOpenSizingModal={() => setSizingModalOpen(true)}
        referenceCounts={referenceCounts}
        currentCounts={currentCounts}
      />

      {/* ─── Compact Collapsible Notices & Warnings ─── */}
      {allNotices.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 text-amber-900 rounded p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">
                <strong>Data Notice ({allNotices.length}):</strong> {allNotices[0]}
              </span>
            </div>
            {allNotices.length > 1 && (
              <button
                type="button"
                onClick={() => setWarningsExpanded(!warningsExpanded)}
                className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                <span>{warningsExpanded ? 'Hide' : `Show all (${allNotices.length})`}</span>
                {warningsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          {warningsExpanded && allNotices.length > 1 && (
            <ul className="mt-2 pt-2 border-t border-amber-200/70 list-disc pl-5 space-y-1 text-[11px] text-amber-800 font-sans">
              {allNotices.map((notice, idx) => (
                <li key={idx}>{notice}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ─── Tables Workspace Navigation & Views ─── */}
      <div className="space-y-3">
        {/* Navigation Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-100 p-1.5 border border-slate-300">
          {/* Sub-Tabs */}
          <div className="inline-flex gap-1" role="tablist" aria-label="Dataset table sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTableTab === 'bom'}
              onClick={() => {
                setActiveTableTab('bom')
                setLayoutMode('tabs')
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                activeTableTab === 'bom' && layoutMode === 'tabs'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-slate-500" />
              <span>Bill of Materials (BOM)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTableTab === 'bom' && layoutMode === 'tabs'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {masterDataSnapshot.bom.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTableTab === 'routing'}
              onClick={() => {
                setActiveTableTab('routing')
                setLayoutMode('tabs')
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                activeTableTab === 'routing' && layoutMode === 'tabs'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-slate-500" />
              <span>Routing & Operations</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTableTab === 'routing' && layoutMode === 'tabs'
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {masterDataSnapshot.routing.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTableTab === 'rates'}
              onClick={() => {
                setActiveTableTab('rates')
                setLayoutMode('tabs')
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                activeTableTab === 'rates' && layoutMode === 'tabs'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-slate-500" />
              <span>Work Center Rates</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTableTab === 'rates' && layoutMode === 'tabs'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {masterDataSnapshot.rates.length}
              </span>
            </button>
          </div>

          {/* Layout Mode Switcher (Tab View vs Stacked View) */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setLayoutMode('tabs')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                layoutMode === 'tabs'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-300'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Focus on one table at a time"
            >
              <TableProperties className="w-3 h-3" />
              <span>Tab View</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                layoutMode === 'stacked'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs border border-slate-300'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="View all tables stacked vertically"
            >
              <Layers className="w-3 h-3" />
              <span>View All</span>
            </button>
          </div>
        </div>

        {/* ─── Render Tables Based on Layout Mode ─── */}
        {layoutMode === 'tabs' ? (
          <div>
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
        ) : (
          <div className="space-y-4">
            {/* BOM Section */}
            <div className="border border-slate-300 bg-white">
              <div
                onClick={() => toggleSection('bom')}
                className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 cursor-pointer select-none border-b border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-slate-600" />
                  <span className="font-mono text-xs font-bold text-slate-800">Bill of Materials (BOM)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-200 text-slate-700 font-semibold">
                    {masterDataSnapshot.bom.length} items
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-mono">
                  <span>{collapsedSections.bom ? 'Expand' : 'Collapse'}</span>
                  {collapsedSections.bom ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
              {!collapsedSections.bom && (
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
            </div>

            {/* Routing Section */}
            <div className="border border-slate-300 bg-white">
              <div
                onClick={() => toggleSection('routing')}
                className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 cursor-pointer select-none border-b border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-slate-600" />
                  <span className="font-mono text-xs font-bold text-slate-800">Process Routing</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-200 text-slate-700 font-semibold">
                    {masterDataSnapshot.routing.length} steps
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-mono">
                  <span>{collapsedSections.routing ? 'Expand' : 'Collapse'}</span>
                  {collapsedSections.routing ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
              {!collapsedSections.routing && (
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
            </div>

            {/* Work Center Rates Section */}
            <div className="border border-slate-300 bg-white">
              <div
                onClick={() => toggleSection('rates')}
                className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 cursor-pointer select-none border-b border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-slate-600" />
                  <span className="font-mono text-xs font-bold text-slate-800">Work Center Rates</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-200 text-slate-700 font-semibold">
                    {masterDataSnapshot.rates.length} centers
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-mono">
                  <span>{collapsedSections.rates ? 'Expand' : 'Collapse'}</span>
                  {collapsedSections.rates ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
              {!collapsedSections.rates && (
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
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRole={masterDataRole}
        product={product}
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
