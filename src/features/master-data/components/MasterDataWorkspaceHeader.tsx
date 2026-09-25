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
    <div className="bg-white border border-slate-300 shadow-xs space-y-0 divide-y divide-slate-200">
      {/* ─── Level 1: Command Bar (Role Switcher + Readiness + Primary Action) ─── */}
      <div className="p-3.5 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Role Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-800 border border-slate-700 rounded gap-1" role="tablist" aria-label="Working dataset side">
            {/* Reference Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={isReference}
              onClick={() => onRoleChange('reference')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                isReference
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isReference ? 'bg-blue-600' : 'bg-slate-500'}`} />
              <span>Reference</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isReference ? 'bg-slate-100 text-slate-700' : 'bg-slate-700/80 text-slate-400'
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
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-600' : 'bg-slate-500'}`} />
              <span>Current</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isCurrent ? 'bg-slate-100 text-slate-700' : 'bg-slate-700/80 text-slate-400'
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

        {/* Right: Comparison Status & Primary CTA */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          {/* Readiness Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReadinessPopover(!showReadinessPopover)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded border transition-colors cursor-pointer ${
                handoff.canCompare
                  ? 'border-emerald-500/80 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'border-amber-500/80 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Click to view readiness status details"
            >
              {handoff.canCompare ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{handoff.canCompare ? 'Ready to Compare' : 'Needs Input'}</span>
              <Info className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Readiness Popover */}
            {showReadinessPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white text-slate-800 p-3 shadow-lg border border-slate-300 z-50 text-xs font-sans rounded">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 font-mono text-[11px] font-bold text-slate-900 uppercase">
                  <span>Comparison Readiness</span>
                  <button
                    type="button"
                    onClick={() => setShowReadinessPopover(false)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Header Product:</span>
                    <span className="font-mono font-bold">{handoff.productCode || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className={`font-mono font-bold ${handoff.referenceReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {handoff.referenceReady ? 'Prepared' : 'Needs input'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current:</span>
                    <span className={`font-mono font-bold ${handoff.currentReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {handoff.currentReady ? 'Prepared' : 'Needs input'}
                    </span>
                  </div>
                </div>

                {handoff.issues.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold text-rose-700 uppercase">Remaining Issues:</span>
                    <ul className="mt-1 list-disc pl-3 text-[10px] text-rose-600 space-y-0.5">
                      {handoff.issues.map(iss => <li key={iss}>{iss}</li>)}
                    </ul>
                  </div>
                )}

                {handoff.warnings && handoff.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold text-amber-700 uppercase">Notices:</span>
                    <ul className="mt-1 list-disc pl-3 text-[10px] text-amber-600 space-y-0.5">
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
            disabled={!handoff.canCompare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 border border-blue-500 rounded shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Cost Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Level 2: Product Context & Actions Ribbon (Single Line Toolbar) ─── */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        {/* Left: Product Master Summary / Inline Inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-500">
              Product:
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={product.productCode}
                onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
                placeholder="Product Code"
                className="w-28 px-2 py-0.5 font-mono font-bold text-xs bg-white text-slate-900 border border-slate-300 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            ) : (
              <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">
                {product.productCode || '—'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-500">
              Name:
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={product.productDescription}
                onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
                placeholder="Description"
                className="w-40 sm:w-48 px-2 py-0.5 font-sans text-xs bg-white text-slate-900 border border-slate-300 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            ) : (
              <span className="text-slate-800 font-sans max-w-[180px] sm:max-w-[220px] truncate text-xs" title={product.productDescription}>
                {product.productDescription || '—'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-tight text-slate-500">
              UOM:
            </label>
            {isEditMode ? (
              <select
                value={product.uom}
                onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
                className="px-1.5 py-0.5 font-mono font-bold text-xs bg-white text-slate-900 border border-slate-300 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-800 cursor-pointer"
              >
                {uomList.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-slate-700 px-1 text-xs">{product.uom || '—'}</span>
            )}
          </div>
        </div>

        {/* Right: Clean Grouped Actions in 1 Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View / Edit Mode Switcher */}
          <div className="flex items-center bg-slate-200 p-0.5 rounded border border-slate-300">
            <button
              type="button"
              onClick={() => onToggleEditMode(false)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                !isEditMode
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleEditMode(true)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
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

          {/* Sizing Dialog Trigger */}
          <button
            type="button"
            onClick={onOpenSizingModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer shadow-xs active:translate-y-[1px]"
            title="Configure dataset row starting counts"
          >
            <Sliders className="w-3 h-3 text-slate-500" />
            <span>Setup</span>
          </button>

          {/* Excel Tools Group */}
          <div className="inline-flex items-center rounded border border-slate-300 bg-white shadow-xs divide-x divide-slate-200">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer active:translate-y-[1px]"
              title="Import Excel file into active dataset"
            >
              <Upload className="w-3 h-3 text-slate-500" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={handleExportDataset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer active:translate-y-[1px]"
              title="Export active dataset to Excel"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer active:translate-y-[1px]"
              title="Download blank template with customizable row counts"
            >
              <FileSpreadsheet className="w-3 h-3 text-slate-500" />
              <span>Template</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" aria-hidden="true" />

          {/* Clear Dataset Button */}
          <button
            type="button"
            onClick={handleClearDatasetWithConfirm}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 rounded transition-colors cursor-pointer shadow-xs active:translate-y-[1px]"
            title={`Clear all data on ${role === 'reference' ? 'Reference' : 'Current'}`}
          >
            <Trash2 className="w-3 h-3 text-rose-600" />
            <span>Clear Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
