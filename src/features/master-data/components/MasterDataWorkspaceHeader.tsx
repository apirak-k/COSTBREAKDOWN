import React, { useState } from 'react'
import {
  Copy,
  Download,
  Eye,
  Sliders,
  Trash2,
  Upload,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Edit3
} from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster } from '../../../core'
import { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import { downloadBlob } from '../../../services/excel/export'

interface MasterDataWorkspaceHeaderProps {
  product: ProductMaster
  snapshot: CostSnapshot
  lastSavedSnapshot?: CostSnapshot
  role: ComparisonRole
  onRoleChange: (role: ComparisonRole) => void
  onSaveWorkingDataset: () => void
  onResetWorkingDataset: () => void
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
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  developmentAction?: React.ReactNode
  tableSelector: React.ReactNode
}

const toolbarButton = 'inline-flex min-h-8 shrink-0 items-center justify-center gap-1 border border-slate-300 bg-white px-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'mt-1 min-h-9 w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-950 focus:border-blue-700 focus:outline-none'

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  snapshot,
  lastSavedSnapshot,
  role,
  onRoleChange,
  onSaveWorkingDataset,
  onResetWorkingDataset,
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
  onOpenImportModal,
  onOpenSizingModal,
  developmentAction,
  tableSelector
}) => {
  const [showReadinessPopover, setShowReadinessPopover] = useState(false)

  const handleExportDataset = async () => {
    if (!lastSavedSnapshot) return
    const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
    const blob = await exportSnapshotToExcel(lastSavedSnapshot)
    const roleLabel = role === 'reference' ? 'Reference' : 'Current'
    const savedProductName = lastSavedSnapshot.product.productName || lastSavedSnapshot.product.productDescription || 'PRODUCT'
    const fileProductName = savedProductName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'PRODUCT'
    downloadBlob(blob, `Dataset_${fileProductName}_${roleLabel}.xlsx`)
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
    const ok = window.confirm('Clear all data on ' + roleLabel + '? Remark, Product, Work Centers, BOM, Routing, and row setup for ' + roleLabel + ' will be reset.')
    if (!ok) return
    onClearDataset()
  }

  const handleResetDatasetWithConfirm = () => {
    if (!lastSavedSnapshot) return
    const roleLabel = role === 'reference' ? 'Reference' : 'Current'
    const ok = window.confirm(`Reset ${roleLabel} Working to its Last Saved copy? Unsaved changes on this side will be lost.`)
    if (!ok) return
    onResetWorkingDataset()
  }

  return (
    <section className="overflow-visible border border-slate-300 bg-white" aria-label="Working dataset controls">
      <div role="toolbar" aria-label="Dataset and table actions" className="flex flex-wrap items-center gap-1 border-b border-slate-300 bg-white px-1.5 py-1">
      <div className="contents">
        <div className="contents">
          <div className="inline-flex shrink-0 border border-slate-300 bg-white p-0.5" role="group" aria-label="Working dataset side">
            <button
              type="button"
              aria-pressed={isReference}
              onClick={() => onRoleChange('reference')}
              className={'flex min-h-8 items-center px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (isReference ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
            >
              Reference
            </button>
            <button
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onRoleChange('current')}
              className={'flex min-h-8 items-center px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
                (isCurrent ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
            >
              Current
            </button>
          </div>
        </div>

        <div className="relative order-10 flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setShowReadinessPopover(!showReadinessPopover)}
            aria-expanded={showReadinessPopover}
            aria-controls="dataset-readiness-panel"
            aria-label={(handoff.datasetsPrepared ? 'Datasets prepared' : 'Datasets need input') + ' — view preparation status'}
            className={'inline-flex h-8 w-8 items-center justify-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
              (handoff.datasetsPrepared
                ? 'border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100'
                : 'border-amber-300 bg-amber-50 text-slate-900 hover:bg-amber-100')}
            title="Click to view readiness status details"
          >
            {handoff.datasetsPrepared
              ? <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
              : <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />}
          </button>

          {showReadinessPopover && (
            <div
              id="dataset-readiness-panel"
              role="region"
              aria-label="Dataset preparation status"
              className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-slate-300 bg-white p-4 text-sm text-slate-800 shadow-lg"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Info aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  Dataset preparation
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReadinessPopover(false)}
                  aria-label="Close dataset preparation status"
                  className="grid h-9 w-9 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <dl className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Reference</dt>
                  <dd className={'font-medium ' + (handoff.referenceReady ? 'text-blue-800' : 'text-amber-800')}>
                    {handoff.referenceReady ? 'Prepared' : 'Needs input'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Current</dt>
                  <dd className={'font-medium ' + (handoff.currentReady ? 'text-blue-800' : 'text-amber-800')}>
                    {handoff.currentReady ? 'Prepared' : 'Needs input'}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                Preparation shows whether each side has been entered or imported. Missing cost inputs remain visible on Cost Breakdown and do not block navigation.
              </p>

              {handoff.issues.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <h3 className="text-xs font-semibold text-rose-800">Preparation notes</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-rose-800">
                    {handoff.issues.map(issue => <li key={issue}>{issue}</li>)}
                  </ul>
                </div>
              )}

              {handoff.warnings && handoff.warnings.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <h3 className="text-xs font-semibold text-amber-800">Notices</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-800">
                    {handoff.warnings.map(warning => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {developmentAction && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  {developmentAction}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="contents">
        <div className="inline-flex shrink-0 border border-slate-300 bg-white p-0.5" role="group" aria-label="View or edit dataset">
          <button
            type="button"
            aria-pressed={!isEditMode}
            onClick={() => onToggleEditMode(false)}
            className={'inline-flex min-h-7 items-center gap-1 px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (!isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View
          </button>
          <button
            type="button"
            aria-pressed={isEditMode}
            onClick={() => onToggleEditMode(true)}
            className={'inline-flex min-h-7 items-center gap-1 px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
        </div>

        <button type="button" onClick={onOpenSizingModal} className={toolbarButton} title="Configure dataset row starting counts">
          <Sliders className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          Sizing
        </button>

        <div className="inline-flex divide-x divide-slate-300 border border-slate-300 bg-white">
          <button type="button" onClick={onOpenImportModal} className={toolbarButton + ' border-0'} title="Import Excel file into selected dataset">
            <Upload className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Import
          </button>
          <button
            type="button"
            onClick={handleExportDataset}
            disabled={!lastSavedSnapshot}
            className={toolbarButton + ' border-0 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer'}
            title={lastSavedSnapshot ? 'Export Last Saved dataset to Excel' : 'Save this dataset before exporting'}
          >
            <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Export
          </button>
        </div>

        <button
          type="button"
          onClick={isCurrent ? handleCloneRefToCurWithConfirm : handleCloneCurToRefWithConfirm}
          disabled={isCurrent ? !canCloneReference : !canCloneCurrent}
          aria-label={isCurrent ? 'Clone Reference into Current' : 'Clone Current into Reference'}
          className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-50'}
          title={isCurrent
            ? canCloneReference ? 'Copy Reference dataset into Current' : 'Prepare Reference dataset first before copying to Current'
            : canCloneCurrent ? 'Copy Current dataset into Reference' : 'Prepare Current dataset first before copying to Reference'}
        >
          <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          Clone
        </button>

        <button
          type="button"
          onClick={handleResetDatasetWithConfirm}
          disabled={!lastSavedSnapshot}
          className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer'}
          title={lastSavedSnapshot ? 'Reset selected Working dataset from Last Saved' : 'No Last Saved state exists for this dataset'}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>

        <button
          type="button"
          onClick={handleClearDatasetWithConfirm}
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 border border-rose-300 bg-rose-50 px-1.5 text-[11px] font-medium text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          title={'Clear all data on ' + (role === 'reference' ? 'Reference' : 'Current')}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" />
          Clear
        </button>

        <button
          type="button"
          onClick={onSaveWorkingDataset}
          className={toolbarButton + ' border-blue-300 bg-blue-50 font-semibold text-blue-800 hover:bg-blue-100 hover:text-blue-950'}
          title={`Save ${role === 'reference' ? 'Reference' : 'Current'} Working as Last Saved`}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Save
        </button>

        <div className="ml-auto order-20 flex shrink-0 items-center">
          {tableSelector}
        </div>
      </div>
      </div>

      <div className="px-1.5 py-2">
        <dl className="grid min-w-0 grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">Product Name</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  aria-label="Product Name"
                  value={product.productName || product.productDescription || ''}
                  onChange={event => onUpdateProduct({ ...product, productName: event.target.value, productDescription: event.target.value })}
                  placeholder="Product Name"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-xs text-slate-950" title={product.productName || product.productDescription}>
                  {product.productName || product.productDescription || '—'}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">UOM</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <select
                  aria-label="UOM"
                  value={product.uom}
                  onChange={event => onUpdateProduct({ ...product, uom: event.target.value })}
                  className={fieldInput + ' cursor-pointer font-mono'}
                >
                  {uomList.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              ) : (
                <span className="block font-mono text-xs text-slate-950">{product.uom || '—'}</span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">Selling Price (THB)</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="number"
                  step="any"
                  value={product.sellingPrice ?? ''}
                  onChange={event => onUpdateProduct({ ...product, sellingPrice: event.target.value === '' ? null : Number(event.target.value) })}
                  aria-label="Selling Price (THB)"
                  className={fieldInput + ' font-mono'}
                />
              ) : (
                <span className="block truncate font-mono text-xs text-slate-950">
                  {product.sellingPrice == null ? '—' : `${product.sellingPrice.toLocaleString()} THB`}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">SG&amp;A (%)</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="number"
                  step="any"
                  value={product.sgaPercent ?? ''}
                  onChange={event => onUpdateProduct({ ...product, sgaPercent: event.target.value === '' ? null : Number(event.target.value) })}
                  aria-label="SG&A (%)"
                  className={fieldInput + ' font-mono'}
                />
              ) : (
                <span className="block truncate font-mono text-xs text-slate-950">
                  {product.sgaPercent == null ? '—' : `${product.sgaPercent.toLocaleString()} %`}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-600">Dataset remark</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  value={snapshot.remark || ''}
                  onChange={event => onUpdateRemark(event.target.value)}
                  aria-label="Dataset remark"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-xs text-slate-800" title={snapshot.remark || ''}>{snapshot.remark || '—'}</span>
              )}
            </dd>
          </div>
        </dl>

      </div>
    </section>
  )
}
