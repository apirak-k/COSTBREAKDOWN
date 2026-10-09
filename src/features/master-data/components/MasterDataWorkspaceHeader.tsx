import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Edit3,
  Eye,
  Info,
  Redo2,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Upload,
  Undo2,
  X
} from 'lucide-react'
import type { MasterDataRole, CostSnapshot, ProductMaster } from '../../../core'
import type { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import { downloadBlob } from '../../../services/excel/export'
import type { MasterDataWarningGroup, MasterDataWarningItem } from '../prepare-dataset'

interface MasterDataWorkspaceHeaderProps {
  product: ProductMaster
  snapshot: CostSnapshot
  lastSavedSnapshot?: CostSnapshot
  saveStates: Record<MasterDataRole, MasterDataSaveState>
  role: MasterDataRole
  onRoleChange: (role: MasterDataRole) => void
  onSaveWorkingDataset: () => void
  onResetWorkingDataset: () => void
  isEditMode: boolean
  onToggleEditMode: (edit: boolean) => void
  onUpdateProduct: (product: ProductMaster) => void
  onUpdateRemark: (remark: string) => void
  onCloneFrom: (sourceRole: MasterDataRole) => void
  onClearDataset: () => void
  handoff: MasterDataHandoffStatus
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  isPrepareDatasetOpen: boolean
  onPrepareDatasetOpenChange: (open: boolean) => void
  warningGroups: MasterDataWarningGroup[]
  warningCount: number
  onNavigateWarning: (item: MasterDataWarningItem) => void
  mockAction?: React.ReactNode
  tableSelector: React.ReactNode
}

const toolbarButton = 'inline-flex min-h-8 shrink-0 items-center justify-center gap-1 border border-slate-300 bg-white px-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'mt-1 min-h-9 w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-950 focus:border-blue-700 focus:outline-none'

const roleLabels: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  snapshot,
  lastSavedSnapshot,
  saveStates,
  role,
  onRoleChange,
  onSaveWorkingDataset,
  onResetWorkingDataset,
  isEditMode,
  onToggleEditMode,
  onUpdateProduct,
  onUpdateRemark,
  onCloneFrom,
  onClearDataset,
  handoff,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenImportModal,
  onOpenSizingModal,
  isPrepareDatasetOpen,
  onPrepareDatasetOpenChange,
  warningGroups,
  warningCount,
  onNavigateWarning,
  mockAction,
  tableSelector
}) => {
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false)
  const [expandedWarningCategory, setExpandedWarningCategory] = useState<string | null>(null)
  const prepareRegionRef = useRef<HTMLDivElement>(null)
  const prepareTriggerRef = useRef<HTMLButtonElement>(null)

  const roleLabel = roleLabels[role]
  const isSaved = saveStates[role] === 'Saved'

  useEffect(() => {
    if (isPrepareDatasetOpen) prepareTriggerRef.current?.focus()
  }, [isPrepareDatasetOpen])

  useEffect(() => {
    if (!isPrepareDatasetOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!prepareRegionRef.current?.contains(event.target as Node)) {
        onPrepareDatasetOpenChange(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onPrepareDatasetOpenChange(false)
        prepareTriggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPrepareDatasetOpen, onPrepareDatasetOpenChange])

  const handleExportDataset = async () => {
    if (!lastSavedSnapshot) return
    const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
    const blob = await exportSnapshotToExcel(lastSavedSnapshot)
    const fileProductName = (lastSavedSnapshot.product.productName || 'Product')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'Product'
    downloadBlob(blob, `Dataset_${fileProductName}_${roleLabel}.xlsx`)
  }

  const handleResetDatasetWithConfirm = () => {
    if (!lastSavedSnapshot) return
    const ok = window.confirm(`Reset ${roleLabel} dataset? Unsaved working changes will be discarded and the dataset will return to its last saved state.`)
    if (ok) onResetWorkingDataset()
  }

  const handleClearDatasetWithConfirm = () => {
    const ok = window.confirm(`Clear ${roleLabel} dataset? Current working data will be cleared. The last saved dataset will remain available.`)
    if (ok) onClearDataset()
  }

  return (
    <section className="sticky top-0 z-40 overflow-visible border border-slate-300 bg-white" aria-label="Working dataset controls">
      <div role="toolbar" aria-label="Dataset and table actions" className="flex flex-wrap items-center gap-1 border-b border-slate-300 bg-white px-1.5 py-1">
        <div className="inline-flex shrink-0 border border-slate-300 bg-white p-0.5" role="group" aria-label="Master Data workspace">
          {roles.map(datasetRole => {
            const selected = role === datasetRole
            const state = saveStates[datasetRole]
            return (
              <button
                key={datasetRole}
                type="button"
                aria-pressed={selected}
                aria-label={`${roleLabels[datasetRole]} — ${state}`}
                title={state}
                onClick={() => onRoleChange(datasetRole)}
                className={'flex min-h-8 items-center gap-1.5 px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                  (selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
              >
                {roleLabels[datasetRole]}
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${state === 'Saved' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              </button>
            )
          })}
        </div>

        <div className="inline-flex shrink-0 border border-slate-300 bg-white p-0.5" role="group" aria-label="View or edit dataset">
          <button
            type="button"
            aria-pressed={!isEditMode}
            onClick={() => onToggleEditMode(false)}
            className={'inline-flex min-h-7 items-center gap-1 px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (!isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
          </button>
          <button
            type="button"
            aria-pressed={isEditMode}
            onClick={() => onToggleEditMode(true)}
            className={'inline-flex min-h-7 items-center gap-1 px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
        </div>

        <button type="button" onClick={onOpenSizingModal} className={toolbarButton} title="Configure dataset row starting counts">
          <Sliders className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> Sizing
        </button>
        <button type="button" onClick={onOpenImportModal} className={toolbarButton} title="Import Excel file into selected dataset">
          <Upload className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> Import
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setCloneMenuOpen(open => !open)}
            aria-expanded={cloneMenuOpen}
            className={toolbarButton}
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> Clone
          </button>
          {cloneMenuOpen && (
            <div role="group" aria-label={`Clone ${roleLabel} from`} className="absolute left-0 top-full z-50 mt-1 min-w-36 border border-slate-300 bg-white p-1 shadow-lg">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Select source</p>
              {roles.filter(sourceRole => sourceRole !== role).map(sourceRole => (
                <button
                  key={sourceRole}
                  type="button"
                  onClick={() => {
                    onCloneFrom(sourceRole)
                    setCloneMenuOpen(false)
                  }}
                  className="block min-h-8 w-full px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  {roleLabels[sourceRole]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleResetDatasetWithConfirm}
          disabled={!lastSavedSnapshot}
          className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-45'}
          title={lastSavedSnapshot ? `Reset ${roleLabel} Working from Last Saved` : 'No Last Saved state exists for this dataset'}
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> Reset
        </button>
        <button
          type="button"
          onClick={handleClearDatasetWithConfirm}
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 border border-rose-300 bg-rose-50 px-1.5 text-[11px] font-medium text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          title={`Clear ${roleLabel} Working data`}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" /> Clear
        </button>
        <button
          type="button"
          onClick={onSaveWorkingDataset}
          disabled={isSaved}
          className={toolbarButton + (isSaved
            ? ' border-slate-200 bg-slate-50 font-medium text-slate-500'
            : ' border-blue-700 bg-blue-700 font-semibold text-white hover:bg-blue-800 hover:text-white')}
          title={isSaved ? 'Working matches Last Saved' : `Save ${roleLabel} Working as Last Saved`}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save
        </button>
        <button
          type="button"
          onClick={() => { void handleExportDataset() }}
          disabled={!lastSavedSnapshot}
          className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-45'}
          title={lastSavedSnapshot ? 'Export Last Saved dataset to Excel' : 'Save this dataset before exporting'}
        >
          <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" /> Export
        </button>

        <div className="inline-flex shrink-0 items-center gap-0.5 border border-slate-300 bg-white p-0.5" role="group" aria-label="Working edit history">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo Master Data edit"
            title="Undo Master Data edit (Ctrl/Cmd+Z)"
            className="grid h-8 w-8 place-items-center text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo Master Data edit"
            title="Redo Master Data edit (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
            className="grid h-8 w-8 place-items-center text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {tableSelector}

        <div ref={prepareRegionRef} className="relative ml-auto flex shrink-0 items-center">
          <button
            ref={prepareTriggerRef}
            type="button"
            onClick={() => onPrepareDatasetOpenChange(!isPrepareDatasetOpen)}
            aria-expanded={isPrepareDatasetOpen}
            aria-controls="prepare-dataset-panel"
            className="inline-flex min-h-8 items-center gap-1.5 border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {handoff.datasetsPrepared
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              : <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
            Prepare Dataset
          </button>

          {isPrepareDatasetOpen && (
            <div
              id="prepare-dataset-panel"
              role="region"
              aria-label="Prepare Dataset status and warnings"
              className="absolute right-0 top-full z-50 mt-1 w-[min(30rem,calc(100vw-2rem))] border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-lg"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <h2 id="prepare-dataset-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Info aria-hidden="true" className="h-4 w-4 text-slate-500" /> Prepare Dataset
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    onPrepareDatasetOpenChange(false)
                    prepareTriggerRef.current?.focus()
                  }}
                  aria-label="Close Prepare Dataset"
                  className="grid h-7 w-7 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-x-4 border-b border-slate-200 py-2 sm:grid-cols-3" role="group" aria-label="Dataset save and preparation status">
                {roles.map(datasetRole => {
                  const saveState = saveStates[datasetRole]
                  const ready = datasetRole === 'reference' ? handoff.referenceReady
                    : datasetRole === 'current' ? handoff.currentReady : undefined
                  return (
                    <div key={datasetRole} className="flex flex-col gap-1 py-1">
                      <span className="text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${saveState === 'Saved' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        <span>{saveState}</span>
                      </span>
                      {ready !== undefined && (
                        <span className={'text-xs ' + (ready ? 'text-emerald-800' : 'text-amber-800')}>
                          {ready ? 'Prepared' : 'Needs input'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {handoff.productMismatch && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 text-xs">
                  <span className="font-medium text-slate-600">Comparison</span>
                  <span className="font-semibold text-slate-800">Product Mismatch</span>
                </div>
              )}

              <div className="pt-2">
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Warnings {warningCount}
                </h3>
                {warningGroups.length === 0 ? (
                  <p className="py-1 text-xs text-slate-500">No warnings.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {warningGroups.map(group => {
                      const expanded = expandedWarningCategory === group.category
                      const direct = group.items.length === 1
                      return (
                        <li key={group.category}>
                          <button
                            type="button"
                            aria-expanded={!direct ? expanded : undefined}
                            onClick={() => {
                              if (direct) {
                                onNavigateWarning(group.items[0])
                                onPrepareDatasetOpenChange(false)
                              } else {
                                setExpandedWarningCategory(expanded ? null : group.category)
                              }
                            }}
                            className="flex min-h-8 w-full items-center gap-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                          >
                            <span className="w-6 shrink-0 text-right font-mono tabular-nums text-slate-600">{group.items.length}</span>
                            <span className="min-w-0 flex-1">{group.label}</span>
                            {direct
                              ? <span className="w-4" aria-hidden="true" />
                              : expanded
                                ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                : <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />}
                          </button>
                          {expanded && !direct && (
                            <ul className="mb-1 ml-8 border-l border-slate-200 pl-2">
                              {group.items.map(item => (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onNavigateWarning(item)
                                      onPrepareDatasetOpenChange(false)
                                    }}
                                    className="min-h-7 w-full px-1 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                                  >
                                    {item.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {mockAction && <div className="mt-2 border-t border-slate-200 pt-2">{mockAction}</div>}
            </div>
          )}
        </div>

      </div>

      <div className="px-1.5 py-2">
        <dl className="grid min-w-0 grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-[3fr_1fr_2fr_1fr_4fr]">
          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-sans text-[11px] font-medium tracking-wide text-slate-600">Product Name</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  aria-label="Product Name"
                  value={product.productName || 'Product'}
                  onChange={event => onUpdateProduct({ ...product, productName: event.target.value, productDescription: event.target.value })}
                  placeholder="Product"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-xs text-slate-950" title={product.productName || 'Product'}>
                  {product.productName || 'Product'}
                </span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-sans text-[11px] font-medium tracking-wide text-slate-600">UOM</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  aria-label="UOM"
                  value={product.uom || 'PC'}
                  onChange={event => onUpdateProduct({ ...product, uom: event.target.value })}
                  placeholder="PC"
                  className={fieldInput + ' font-mono'}
                />
              ) : (
                <span className="block font-mono text-xs text-slate-950">{product.uom || 'PC'}</span>
              )}
            </dd>
          </div>

          <div className="min-w-0 border-t border-slate-300 py-2">
            <dt className="font-sans text-[11px] font-medium tracking-wide text-slate-600">Selling Price (THB)</dt>
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
            <dt className="font-sans text-[11px] font-medium tracking-wide text-slate-600">SG&amp;A (%)</dt>
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
            <dt className="font-sans text-[11px] font-medium tracking-wide text-slate-600">Dataset Remark</dt>
            <dd className="mt-1 min-w-0">
              {isEditMode ? (
                <input
                  type="text"
                  value={snapshot.remark || ''}
                  onChange={event => onUpdateRemark(event.target.value)}
                  aria-label="Dataset Remark"
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
