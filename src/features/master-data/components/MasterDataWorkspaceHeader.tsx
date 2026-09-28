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
  Trash2,
  X
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
  onUpdateRemark: (remark: string) => void
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
  onUpdateRemark,
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
    const blob = await exportSnapshotToExcel(snapshot)
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
    const ok = window.confirm(`Clear all data on ${roleLabel}? Remark, Product, Work Centers, BOM, Routing, and row setup for ${roleLabel} will be reset.`)
    if (!ok) return
    onClearDataset()
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white divide-y divide-slate-200">
      {/* ─── Level 1: Primary Control Bar (Dataset Switcher + Readiness + Primary Action) ─── */}
      <div className="flex flex-col gap-3 bg-slate-900 px-4 py-3 text-white lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Role Switcher Tabs & Clone Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-1 rounded-md border border-slate-700 bg-slate-950/60 p-1" role="group" aria-label="Working dataset side">
            {/* Reference Tab */}
            <button
              type="button"
              aria-pressed={isReference}
              onClick={() => onRoleChange('reference')}
              className={`flex min-h-10 items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isReference
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-all ${isReference ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-500'}`} />
              <span>Reference</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                isReference ? 'bg-blue-50 text-blue-700' : 'bg-slate-800 text-slate-400'
              }`}>
                {referenceCounts.bom > 0 || referenceCounts.routing > 0 || referenceCounts.rates > 0
                  ? `${referenceCounts.bom} BOM · ${referenceCounts.routing} RTG · ${referenceCounts.rates} WC`
                  : 'Empty'}
              </span>
            </button>

            {/* Current Tab */}
            <button
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onRoleChange('current')}
              className={`flex min-h-10 items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isCurrent
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-all ${isCurrent ? 'bg-emerald-600 ring-2 ring-emerald-200' : 'bg-slate-500'}`} />
              <span>Current</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                isCurrent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}>
                {currentCounts.bom > 0 || currentCounts.routing > 0 || currentCounts.rates > 0
                  ? `${currentCounts.bom} BOM · ${currentCounts.routing} RTG · ${currentCounts.rates} WC`
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
              className="flex min-h-10 items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
              className="flex min-h-10 items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:self-auto">
          {/* Readiness Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReadinessPopover(!showReadinessPopover)}
              aria-expanded={showReadinessPopover}
              aria-controls="dataset-readiness-panel"
              className={`flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                handoff.datasetsPrepared
                  ? 'border-emerald-700 bg-emerald-950 text-emerald-200 hover:bg-emerald-900'
                  : 'border-amber-700 bg-amber-950 text-amber-200 hover:bg-amber-900'
              }`}
              title="Click to view readiness status details"
            >
              {handoff.datasetsPrepared ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span>{handoff.datasetsPrepared ? 'Datasets Prepared' : 'Needs Input'}</span>
              <Info aria-hidden="true" className="ml-0.5 h-4 w-4 opacity-80" />
            </button>

            {/* Readiness Popover */}
            {showReadinessPopover && (
              <div id="dataset-readiness-panel" role="region" aria-label="Dataset preparation status" className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-lg sm:left-auto sm:right-0">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Info aria-hidden="true" className="h-4 w-4 text-slate-500" />
                    Dataset Preparation
                  </span>
                    <button
                      type="button"
                      onClick={() => setShowReadinessPopover(false)}
                    aria-label="Close dataset preparation status"
                    className="grid h-9 w-9 place-items-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-sm">
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

                <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600">
                  Preparation shows whether each side has been entered or imported. Missing cost inputs remain visible on Cost Breakdown and do not block navigation.
                </p>

                {handoff.issues.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-semibold text-rose-800">Preparation notes</span>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-rose-800">
                      {handoff.issues.map(iss => <li key={iss}>{iss}</li>)}
                    </ul>
                  </div>
                )}

                {handoff.warnings && handoff.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="block text-xs font-semibold text-amber-800">Notices</span>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-800">
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
            className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-blue-700 bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
          >
            <span>Cost Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Level 2: Context & Operations Toolbar ─── */}
      <div className="grid gap-4 bg-slate-50 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        {/* Left: Product Master Summary / Inputs */}
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {/* Product Code */}
          <div className="min-w-0 rounded-sm border border-slate-200 bg-white px-3 py-2">
            <span className="block text-xs font-medium text-slate-600">
              Product code
            </span>
            {isEditMode ? (
              <input
                type="text"
                aria-label="Product code"
                value={product.productCode}
                onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
                placeholder="Product Code"
                className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-2.5 font-mono text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            ) : (
              <span className="mt-1 block truncate font-mono text-sm font-semibold text-slate-900">
                {product.productCode || '—'}
              </span>
            )}
          </div>

          {/* Product Name */}
          <div className="min-w-0 rounded-sm border border-slate-200 bg-white px-3 py-2">
            <span className="block text-xs font-medium text-slate-600">
              Product description
            </span>
            {isEditMode ? (
              <input
                type="text"
                aria-label="Product description"
                value={product.productDescription}
                onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
                placeholder="Description"
                className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            ) : (
              <span className="mt-1 block truncate text-sm font-medium text-slate-900" title={product.productDescription}>
                {product.productDescription || '—'}
              </span>
            )}
          </div>

          {/* UOM */}
          <div className="min-w-0 rounded-sm border border-slate-200 bg-white px-3 py-2">
            <span className="block text-xs font-medium text-slate-600">
              UOM:
            </span>
            {isEditMode ? (
                <select
                aria-label="Unit of measure"
                value={product.uom}
                onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
                className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-2.5 font-mono text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 cursor-pointer"
              >
                {uomList.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            ) : (
              <span className="mt-1 block font-mono text-sm font-semibold text-slate-900">{product.uom || '—'}</span>
            )}
          </div>

          {/* Product Note */}
          <div className="min-w-0 rounded-sm border border-slate-200 bg-white px-3 py-2">
            <span className="block text-xs font-medium text-slate-600">
              Note:
            </span>
            {isEditMode ? (
              <input
                type="text"
                value={product.note || ''}
                onChange={e => onUpdateProduct({ ...product, note: e.target.value })}
                aria-label="Product Note"
                className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            ) : (
              <span className="mt-1 block truncate text-sm text-slate-900" title={product.note || ''}>{product.note || '—'}</span>
            )}
          </div>

          {/* Dataset Remark */}
          <div className="min-w-0 rounded-sm border border-slate-200 bg-white px-3 py-2">
            <span className="block text-xs font-medium text-slate-600">
              Remark:
            </span>
            {isEditMode ? (
              <input
                type="text"
                value={snapshot.remark || ''}
                onChange={e => onUpdateRemark(e.target.value)}
                aria-label="Dataset Remark"
                className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            ) : (
              <span className="mt-1 block truncate text-sm text-slate-900" title={snapshot.remark || ''}>{snapshot.remark || '—'}</span>
            )}
          </div>
        </div>

        {/* Right: Clean Grouped Actions */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {/* View / Edit Mode Segmented Control */}
          <div className="flex items-center rounded-sm border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              aria-pressed={!isEditMode}
              onClick={() => onToggleEditMode(false)}
              className={`flex min-h-9 items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
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
              aria-pressed={isEditMode}
              onClick={() => onToggleEditMode(true)}
              className={`flex min-h-9 items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
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
            className="flex min-h-9 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title="Configure dataset row starting counts"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Setup</span>
          </button>

          {/* Excel Tools Joined Group */}
          <div className="inline-flex items-center divide-x divide-slate-200 overflow-hidden rounded-sm border border-slate-300 bg-white">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="flex min-h-9 items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Import Excel file into selected dataset"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={handleExportDataset}
              className="flex min-h-9 items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Export selected dataset to Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className="flex min-h-9 items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
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
            className="flex min-h-9 items-center gap-1.5 rounded-sm border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100 hover:text-rose-900 cursor-pointer"
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
