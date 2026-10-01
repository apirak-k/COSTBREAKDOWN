import React, { useState } from 'react'
import {
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Sliders,
  Trash2,
  Upload,
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
  onOpenImportModal: () => void
  onOpenTemplateModal: () => void
  onOpenSizingModal: () => void
  referenceCounts: { bom: number; routing: number; rates: number }
  currentCounts: { bom: number; routing: number; rates: number }
}

const toolbarButton = 'inline-flex min-h-9 items-center justify-center gap-1.5 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'mt-1 min-h-9 w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-950 focus:border-blue-700 focus:outline-none'

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
  onOpenImportModal,
  onOpenTemplateModal,
  onOpenSizingModal,
  referenceCounts,
  currentCounts
}) => {
  const [showReadinessPopover, setShowReadinessPopover] = useState(false)

  const handleExportDataset = async () => {
    const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
    const blob = await exportSnapshotToExcel(snapshot)
    const roleLabel = role === 'reference' ? 'Reference' : 'Current'
    downloadBlob(blob, 'Dataset_' + (product.productCode || 'PRODUCT') + '_' + roleLabel + '.xlsx')
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

  const countLabel = (counts: { bom: number; routing: number; rates: number }) => (
    <span className="font-mono text-[11px] tabular-nums">
      BOM {counts.bom} · RTG {counts.routing} · WC {counts.rates}
    </span>
  )

  return (
    <section className="overflow-visible border border-slate-300 bg-white" aria-label="Working dataset controls">
      <div className="flex flex-col gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="inline-flex border border-slate-300 bg-white p-0.5" role="group" aria-label="Working dataset side">
            <button
              type="button"
              aria-pressed={isReference}
              onClick={() => onRoleChange('reference')}
              className={'flex min-h-10 items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (isReference ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
            >
              <span>Reference</span>
              <span className={isReference ? 'text-blue-100' : 'text-slate-500'}>{countLabel(referenceCounts)}</span>
            </button>
            <button
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onRoleChange('current')}
              className={'flex min-h-10 items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
                (isCurrent ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
            >
              <span>Current</span>
              <span className={isCurrent ? 'text-blue-100' : 'text-slate-500'}>{countLabel(currentCounts)}</span>
            </button>
          </div>

          {isCurrent && (
            <button
              type="button"
              onClick={handleCloneRefToCurWithConfirm}
              disabled={!canCloneReference}
              className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-50'}
              title={canCloneReference
                ? 'Copy Reference dataset into Current to quickly modify values'
                : 'Prepare Reference dataset first before copying to Current'}
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Copy Reference to Current</span>
            </button>
          )}

          {isReference && (
            <button
              type="button"
              onClick={handleCloneCurToRefWithConfirm}
              disabled={!canCloneCurrent}
              className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-50'}
              title={canCloneCurrent
                ? 'Copy Current dataset into Reference'
                : 'Prepare Current dataset first before copying to Reference'}
            >
              <Copy className="h-3.5 w-3.5 rotate-180 text-slate-500" aria-hidden="true" />
              <span>Copy Current to Reference</span>
            </button>
          )}
        </div>

        <div className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setShowReadinessPopover(!showReadinessPopover)}
            aria-expanded={showReadinessPopover}
            aria-controls="dataset-readiness-panel"
            className={'inline-flex min-h-10 items-center gap-2 border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ' +
              (handoff.datasetsPrepared
                ? 'border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100'
                : 'border-amber-300 bg-amber-50 text-slate-900 hover:bg-amber-100')}
            title="Click to view readiness status details"
          >
            {handoff.datasetsPrepared
              ? <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
              : <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />}
            <span>{handoff.datasetsPrepared ? 'Datasets prepared' : 'Needs input'}</span>
            <Info aria-hidden="true" className="h-4 w-4 text-slate-500" />
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
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Product context</h2>
          <span className="text-xs text-slate-500">
            {isReference ? 'Reference dataset' : 'Current dataset'}
          </span>
        </div>

        <dl className="mt-2 grid min-w-0 grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Product code</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  aria-label="Product code"
                  value={product.productCode}
                  onChange={event => onUpdateProduct({ ...product, productCode: event.target.value })}
                  placeholder="Product code"
                  className={fieldInput + ' font-mono font-semibold'}
                />
              ) : (
                <span className="block truncate font-mono text-sm font-semibold text-slate-950">
                  {product.productCode || '—'}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Product name</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  aria-label="Product name"
                  value={product.productDescription}
                  onChange={event => onUpdateProduct({ ...product, productDescription: event.target.value })}
                  placeholder="Product name"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-sm text-slate-950" title={product.productDescription}>
                  {product.productDescription || '—'}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Unit of measure</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <select
                  aria-label="Unit of measure"
                  value={product.uom}
                  onChange={event => onUpdateProduct({ ...product, uom: event.target.value })}
                  className={fieldInput + ' cursor-pointer font-mono'}
                >
                  {uomList.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              ) : (
                <span className="block font-mono text-sm text-slate-950">{product.uom || '—'}</span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Product note</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  value={product.note || ''}
                  onChange={event => onUpdateProduct({ ...product, note: event.target.value })}
                  aria-label="Product note"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-sm text-slate-800" title={product.note || ''}>{product.note || '—'}</span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Dataset remark</dt>
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
                <span className="block truncate text-sm text-slate-800" title={snapshot.remark || ''}>{snapshot.remark || '—'}</span>
              )}
            </dd>
          </div>
        </dl>

        <div role="toolbar" aria-label="Dataset actions" className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-300 pt-3">
          <div className="inline-flex border border-slate-300 bg-white p-0.5" role="group" aria-label="View or edit dataset">
            <button
              type="button"
              aria-pressed={!isEditMode}
              onClick={() => onToggleEditMode(false)}
              className={'inline-flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (!isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              View
            </button>
            <button
              type="button"
              aria-pressed={isEditMode}
              onClick={() => onToggleEditMode(true)}
              className={'inline-flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          </div>

          <button type="button" onClick={onOpenSizingModal} className={toolbarButton} title="Configure dataset row starting counts">
            <Sliders className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Setup
          </button>

          <div className="inline-flex divide-x divide-slate-300 border border-slate-300 bg-white">
            <button
              type="button"
              onClick={onOpenImportModal}
              className={toolbarButton + ' border-0'}
              title="Import Excel file into selected dataset"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              onClick={handleExportDataset}
              className={toolbarButton + ' border-0'}
              title="Export selected dataset to Excel"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Export
            </button>
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className={toolbarButton + ' border-0'}
              title="Download blank template using this dataset's configured row counts"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Template
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearDatasetWithConfirm}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 border border-rose-300 bg-rose-50 px-3 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            title={'Clear all data on ' + (role === 'reference' ? 'Reference' : 'Current')}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" />
            Clear dataset
          </button>
        </div>
      </div>
    </section>
  )
}
