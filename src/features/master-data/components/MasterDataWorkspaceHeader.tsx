import React, { useState } from 'react'
import {
  Copy,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Edit3,
  Eye,
  Sliders,
  Trash2
} from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster } from '../../../core'
import { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import { exportSnapshotToExcel, downloadBlob } from '../../../services'

interface MasterDataWorkspaceHeaderProps {
  product: ProductMaster
  snapshot: CostSnapshot
  role: ComparisonRole
  onRoleChange: (role: ComparisonRole) => void
  uomList: string[]
  isEditMode: boolean
  onToggleEditMode: (edit: boolean) => void
  onUpdateProduct: (product: ProductMaster) => void
  onCloneReferenceToCurrent: () => void
  onCloneCurrentToReference: () => void
  onClearDataset: () => void
  canCloneReference: boolean
  canCloneCurrent: boolean
  handoff: MasterDataHandoffStatus
  onOpenCostBreakdown: () => void
  onOpenImportModal: () => void
  onOpenTemplateModal: () => void
  onOpenSizingModal: () => void
  referenceCounts: { bom: number; routing: number; rates: number }
  currentCounts: { bom: number; routing: number; rates: number }
}

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  snapshot,
  role,
  onRoleChange,
  uomList,
  isEditMode,
  onToggleEditMode,
  onUpdateProduct,
  onCloneReferenceToCurrent,
  onCloneCurrentToReference,
  onClearDataset,
  canCloneReference,
  canCloneCurrent,
  handoff,
  onOpenCostBreakdown,
  onOpenImportModal,
  onOpenTemplateModal,
  onOpenSizingModal,
  referenceCounts,
  currentCounts
}) => {
  const [showReadinessPopover, setShowReadinessPopover] = useState(false)
  const handleExportDataset = async () => {
    const blob = await exportSnapshotToExcel(snapshot, product)
    const roleLabel = role === 'reference' ? 'Reference' : 'Current'
    downloadBlob(blob, `Dataset_${product.productCode || 'PRODUCT'}_${roleLabel}.xlsx`)
  }

  const isCurrent = role === 'current'
  const isReference = role === 'reference'

  const handleCloneRefToCurWithConfirm = () => {
    const ok = window.confirm('Copy Reference dataset into Current? Current data will be replaced by Reference.')
    if (!ok) return
    onCloneReferenceToCurrent()
  }

  const handleCloneCurToRefWithConfirm = () => {
    const ok = window.confirm('Copy Current dataset into Reference? Reference data will be replaced by Current.')
    if (!ok) return
    onCloneCurrentToReference()
  }

  const handleClearDatasetWithConfirm = () => {
    const roleLabel = role === 'reference' ? 'Reference' : 'Current'
    const ok = window.confirm(`Clear all data on ${roleLabel}? Product, Work Centers, BOM, and Routing for ${roleLabel} will be reset.`)
    if (!ok) return
    onClearDataset()
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-0 divide-y divide-slate-200">
      {/* ─── Level 1: Primary Control Bar (Dataset Switcher + Readiness + Primary Action) ─── */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Role Switcher Tabs & Clone Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-950/60 border border-slate-700/80 rounded-md gap-1 shadow-inner" role="tablist" aria-label="Working dataset side">
            {/* Reference Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={isReference}
              onClick={() => onRoleChange('reference')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                isReference
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-all ${isReference ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-500'}`} />
              <span>Reference</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                isReference ? 'bg-blue-50 text-blue-700' : 'bg-slate-800 text-slate-400'
              }`}>
                {referenceCounts.bom > 0 || referenceCounts.routing > 0
                  ? `${referenceCounts.bom} BOM · ${referenceCounts.routing} RTG`
                  : 'Empty'}
              </span>
            </button>

            {/* Current Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => onRoleChange('current')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-all ${isCurrent ? 'bg-emerald-600 ring-2 ring-emerald-200' : 'bg-slate-500'}`} />
              <span>Current</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                isCurrent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}>
                {currentCounts.bom > 0 || currentCounts.routing > 0
                  ? `${currentCounts.bom} BOM · ${currentCounts.routing} RTG`
                  : 'Empty'}
              </span>
            </button>
          </div>

          {/* Bi-directional Clone Buttons */}
          {isCurrent && (
            <button
              type="button"
              onClick={handleCloneRefToCurWithConfirm}
              disabled={!canCloneReference}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700/90 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.98]"
              title={
                canCloneReference
                  ? 'Copy Reference dataset into Current to quickly modify values'
                  : 'Prepare Reference dataset first before copying to Current'
              }
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Ref → Current</span>
            </button>
          )}

          {isReference && (
            <button
              type="button"
              onClick={handleCloneCurToRefWithConfirm}
              disabled={!canCloneCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700/90 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.98]"
              title={
                canCloneCurrent
                  ? 'Copy Current dataset into Reference'
                  : 'Prepare Current dataset first before copying to Reference'
              }
            >
              <Copy className="w-3.5 h-3.5 text-slate-400 rotate-180" />
              <span>Copy Current → Ref</span>
            </button>
          )}
        </div>

        {/* Right: Comparison Readiness Status & Primary CTA */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          {/* Readiness Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReadinessPopover(!showReadinessPopover)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase rounded-md border transition-all cursor-pointer shadow-2xs ${
                handoff.datasetsPrepared
                  ? 'border-emerald-500/80 bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/80 ring-1 ring-emerald-500/30'
                  : 'border-amber-500/80 bg-amber-950/70 text-amber-300 hover:bg-amber-900/80 ring-1 ring-amber-500/30'
              }`}
              title="Click to view readiness status details"
            >
              {handoff.datasetsPrepared ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span>{handoff.datasetsPrepared ? 'Datasets Prepared' : 'Needs Input'}</span>
              <Info className="w-3 h-3 opacity-70 ml-0.5" />
            </button>

            {/* Readiness Popover */}
            {showReadinessPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white text-slate-800 p-3.5 shadow-xl border border-slate-200 z-50 text-xs font-sans rounded-lg animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-mono text-[11px] font-bold text-slate-900 uppercase">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    Dataset Preparation
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReadinessPopover(false)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2.5 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Reference:</span>
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${handoff.referenceReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {handoff.referenceReady ? 'Prepared' : 'Needs input'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Current:</span>
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${handoff.currentReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {handoff.currentReady ? 'Prepared' : 'Needs input'}
                    </span>
                  </div>
                </div>

                <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-500">
                  Preparation shows whether each side has been entered or imported. Missing cost inputs remain visible on Cost Breakdown and do not block navigation.
                </p>

                {handoff.issues.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold text-rose-700 uppercase">Preparation Notes:</span>
                    <ul className="mt-1 list-disc pl-4 text-[10px] text-rose-600 space-y-0.5">
                      {handoff.issues.map(iss => <li key={iss}>{iss}</li>)}
                    </ul>
                  </div>
                )}

                {handoff.warnings && handoff.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold text-amber-700 uppercase">Notices:</span>
                    <ul className="mt-1 list-disc pl-4 text-[10px] text-amber-600 space-y-0.5">
                      {handoff.warnings.map(w => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary CTA: Open Cost Breakdown */}
          <button
            type="button"
            onClick={onOpenCostBreakdown}
            title="Open Cost Breakdown; missing inputs remain visible there."
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-500 rounded-md shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>Cost Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Level 2: Context & Operations Toolbar ─── */}
      <div className="px-4 py-2.5 bg-slate-50/90 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        {/* Left: Product Master Summary / Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Product Code */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-md px-2.5 py-1 shadow-2xs">
            <span className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-400">
              Product:
            </span>
            {isEditMode ? (
              <input
                type="text"
                value={product.productCode}
                onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
                placeholder="Product Code"
                className="w-28 px-1.5 py-0.5 font-mono font-bold text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            ) : (
              <span className="font-mono font-bold text-slate-900 text-xs">
                {product.productCode || '—'}
              </span>
            )}
          </div>

          {/* Product Name */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-md px-2.5 py-1 shadow-2xs">
            <span className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-400">
              Name:
            </span>
            {isEditMode ? (
              <input
                type="text"
                value={product.productDescription}
                onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
                placeholder="Description"
                className="w-40 sm:w-52 px-1.5 py-0.5 font-sans text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            ) : (
              <span className="text-slate-800 font-sans max-w-[180px] sm:max-w-[240px] truncate text-xs font-medium" title={product.productDescription}>
                {product.productDescription || '—'}
              </span>
            )}
          </div>

          {/* UOM */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-md px-2 py-1 shadow-2xs">
            <span className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-400">
              UOM:
            </span>
            {isEditMode ? (
              <select
                value={product.uom}
                onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
                className="px-1 py-0.5 font-mono font-bold text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                {uomList.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            ) : (
              <span className="font-mono font-bold text-slate-700 text-xs px-1">{product.uom || '—'}</span>
            )}
          </div>
        </div>

        {/* Right: Clean Grouped Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View / Edit Mode Segmented Control */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md border border-slate-300/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onToggleEditMode(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                !isEditMode
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3 text-slate-500" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleEditMode(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" aria-hidden="true" />

          {/* Setup / Sizing Dialog Trigger */}
          <button
            type="button"
            onClick={onOpenSizingModal}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-md transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Configure dataset row starting counts"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Setup</span>
          </button>

          {/* Excel Tools Joined Group */}
          <div className="inline-flex items-center rounded-md border border-slate-300 bg-white shadow-2xs divide-x divide-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer active:bg-slate-100"
              title="Import Excel file into active dataset"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={handleExportDataset}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer active:bg-slate-100"
              title="Export active dataset to Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer active:bg-slate-100"
              title="Download blank template with customizable row counts"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Template</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" aria-hidden="true" />

          {/* Clear Dataset Button */}
          <button
            type="button"
            onClick={handleClearDatasetWithConfirm}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 rounded-md transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            title={`Clear all data on ${role === 'reference' ? 'Reference' : 'Current'}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
