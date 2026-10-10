import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Info,
  RotateCcw,
  Save,
  Table2,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import type { MasterDataRole, CostSnapshot, ProductMaster } from '../../../core'
import type { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import { downloadBlob } from '../../../services/excel/export'
import {
  countMasterDataWarningsByRole,
  type MasterDataWarningGroup,
  type MasterDataWarningItem
} from '../prepare-dataset'

interface MasterDataWorkspaceHeaderProps {
  product: ProductMaster
  comparisonProducts: { reference: ProductMaster; current: ProductMaster }
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
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  isPrepareDatasetOpen: boolean
  onPrepareDatasetOpenChange: (open: boolean) => void
  prepareDatasetRequestMode: 'comparison' | 'all-warnings' | null
  warningGroups: MasterDataWarningGroup[]
  warningCount: number
  onNavigateWarning: (item: MasterDataWarningItem) => void
  mockAction?: React.ReactNode
  tableSelector: React.ReactNode
}

const toolbarButton = 'grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'mt-1 min-h-9 w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-950 focus:border-blue-700 focus:outline-none'

const roleLabels: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  comparisonProducts,
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
  onOpenImportModal,
  onOpenSizingModal,
  isPrepareDatasetOpen,
  onPrepareDatasetOpenChange,
  prepareDatasetRequestMode,
  warningGroups,
  warningCount,
  onNavigateWarning,
  mockAction,
  tableSelector
}) => {
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false)
  const [expandedWarningCategory, setExpandedWarningCategory] = useState<string | null>(null)
  const [warningRoleFilter, setWarningRoleFilter] = useState<MasterDataRole | null>(null)
  const [comparisonDetailsOpen, setComparisonDetailsOpen] = useState(false)
  const prepareRegionRef = useRef<HTMLDivElement>(null)
  const prepareTriggerRef = useRef<HTMLButtonElement>(null)

  const roleLabel = roleLabels[role]
  const isSaved = saveStates[role] === 'Saved'
  const allWarningItems = warningGroups.flatMap(group => group.items)
  const datasetWarningCounts = countMasterDataWarningsByRole(allWarningItems)
  const visibleWarningGroups = warningRoleFilter
    ? warningGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === warningRoleFilter) }))
    : warningGroups
  const visibleWarningCount = warningRoleFilter
    ? datasetWarningCounts[warningRoleFilter]
    : warningCount
  const comparisonStatus = handoff.productMismatch ? 'Mismatch' : 'Match'
  const productIdentity = (details: ProductMaster) => {
    const name = details.productName?.trim() || '—'
    const uom = details.uom?.trim() || ''
    return uom ? `${name} (${uom})` : name
  }

  useEffect(() => {
    setCloneMenuOpen(false)
  }, [role])

  useEffect(() => {
    if (isPrepareDatasetOpen) prepareTriggerRef.current?.focus()
  }, [isPrepareDatasetOpen])

  useEffect(() => {
    if (!prepareDatasetRequestMode) return
    setWarningRoleFilter(null)
    setExpandedWarningCategory(null)
    setComparisonDetailsOpen(prepareDatasetRequestMode === 'comparison')
  }, [prepareDatasetRequestMode])

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
    const fileProductName = (lastSavedSnapshot.product.productName || '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim()
    const filenameProductPart = fileProductName ? `_${fileProductName}` : ''
    downloadBlob(blob, `Dataset${filenameProductPart}_${roleLabel}.xlsx`)
  }

  const handleResetDatasetWithConfirm = () => {
    if (!lastSavedSnapshot) return
    const ok = window.confirm(`Reset ${roleLabel} dataset? Draft changes will be discarded and it will return to Last Saved.`)
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
            View
          </button>
          <button
            type="button"
            aria-pressed={isEditMode}
            onClick={() => onToggleEditMode(true)}
            className={'inline-flex min-h-7 items-center gap-1 px-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
              (isEditMode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            Edit
          </button>
        </div>

        <button type="button" onClick={onOpenSizingModal} className={toolbarButton} title="Sizing" aria-label="Sizing">
          <Table2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onOpenImportModal} className={toolbarButton} title="Import" aria-label="Import">
          <Upload className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          className="relative shrink-0"
          onPointerEnter={() => setCloneMenuOpen(true)}
          onPointerLeave={() => setCloneMenuOpen(false)}
          onFocusCapture={() => setCloneMenuOpen(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !event.currentTarget.matches(':hover')) {
              setCloneMenuOpen(false)
            }
          }}
        >
          <button
            type="button"
            onClick={() => setCloneMenuOpen(true)}
            aria-expanded={cloneMenuOpen}
            aria-controls="clone-source-menu"
            aria-label="Clone"
            title="Clone from another dataset"
            className={toolbarButton}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
          {cloneMenuOpen && (
            <div id="clone-source-menu" role="group" aria-label="Clone from another dataset" className="absolute left-0 top-full z-50 min-w-36 border border-slate-300 bg-white p-1 shadow-lg">
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
                  from {roleLabels[sourceRole]}
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
          title={lastSavedSnapshot ? 'Reset to Last Saved' : 'No Last Saved state exists'}
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleClearDatasetWithConfirm}
          className={toolbarButton}
          title="Clear Working data"
          aria-label="Clear"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSaveWorkingDataset}
          disabled={isSaved}
          className={toolbarButton}
          title={isSaved ? 'Already Saved' : 'Save Working changes'}
          aria-label="Save"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => { void handleExportDataset() }}
          disabled={!lastSavedSnapshot}
          className={toolbarButton + ' disabled:cursor-not-allowed disabled:opacity-45'}
          title={lastSavedSnapshot ? 'Export Last Saved' : 'No Last Saved dataset to export'}
          aria-label="Export"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </button>

        {tableSelector}

        <div ref={prepareRegionRef} className="relative ml-auto flex shrink-0 items-center">
          <button
            ref={prepareTriggerRef}
            type="button"
            onClick={() => onPrepareDatasetOpenChange(!isPrepareDatasetOpen)}
            aria-expanded={isPrepareDatasetOpen}
            aria-controls="prepare-dataset-panel"
            className={toolbarButton}
            aria-label="Prepare Dataset"
            title="Prepare Dataset"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>

          {isPrepareDatasetOpen && (
            <div
              id="prepare-dataset-panel"
              role="region"
              aria-label="Prepare Dataset status and warnings"
              className="absolute right-0 top-full z-50 mt-1 flex max-h-[calc(100dvh-6rem)] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-lg"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_1.75rem] items-center gap-2 border-b border-slate-200 pb-2">
                <h2 id="prepare-dataset-heading" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-950">
                  <Info aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  <span className="truncate">Prepare Dataset</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setComparisonDetailsOpen(open => !open)}
                  aria-label={`Comparison status: ${comparisonStatus}. Show compared product identities`}
                  aria-expanded={comparisonDetailsOpen}
                  aria-controls="prepare-dataset-identity-details"
                  title="Inspect compared product identities"
                  className="grid h-7 w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-1 rounded-sm px-1 text-xs font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <span className="justify-self-end">{comparisonStatus}</span>
                  {comparisonDetailsOpen
                    ? <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                    : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
                </button>
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

              <dl
                id="prepare-dataset-identity-details"
                hidden={!comparisonDetailsOpen}
                aria-label="Compared product identities"
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 border-b border-slate-200 py-2 text-[11px]"
              >
                <dt className="text-slate-500">Reference</dt>
                <dd className="min-w-0 truncate font-medium text-slate-800" title={productIdentity(comparisonProducts.reference)}>
                  {productIdentity(comparisonProducts.reference)}
                </dd>
                <dt className="text-slate-500">Current</dt>
                <dd className="min-w-0 truncate font-medium text-slate-800" title={productIdentity(comparisonProducts.current)}>
                  {productIdentity(comparisonProducts.current)}
                </dd>
              </dl>

              <dl className="grid grid-cols-1 gap-x-2 border-b border-slate-200 py-2 sm:grid-cols-3" aria-label="Dataset save states and warning counts">
                {roles.map(datasetRole => {
                  const saveState = saveStates[datasetRole]
                  const datasetWarningCount = datasetWarningCounts[datasetRole]
                  const isFiltered = warningRoleFilter === datasetRole
                  return (
                    <div key={datasetRole} className="flex min-h-8 items-center justify-between gap-2 py-1">
                      <dt className="shrink-0 text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</dt>
                      <dd className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs">
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${saveState === 'Saved' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          <span>{saveState}</span>
                        </span>
                        <button
                          type="button"
                          disabled={datasetWarningCount === 0}
                          aria-label={datasetWarningCount === 0
                            ? `No warnings in ${roleLabels[datasetRole]}`
                            : `Filter warnings to ${roleLabels[datasetRole]}: ${datasetWarningCount}`}
                          aria-pressed={isFiltered}
                          title={datasetWarningCount === 0
                            ? `No warnings in ${roleLabels[datasetRole]}`
                            : `Filter warnings to ${roleLabels[datasetRole]}`}
                          onClick={() => {
                            setWarningRoleFilter(datasetRole)
                            setExpandedWarningCategory(null)
                          }}
                          className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-sm px-1 font-mono text-xs tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${datasetWarningCount === 0
                            ? 'cursor-not-allowed text-slate-400'
                            : isFiltered
                              ? 'bg-amber-50 text-amber-900'
                              : 'text-amber-800 hover:bg-amber-50'}`}
                        >
                          <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                          <span>{datasetWarningCount}</span>
                        </button>
                      </dd>
                    </div>
                  )
                })}
              </dl>

              <div className="flex min-h-0 flex-1 flex-col pt-2">
                <div className="mb-1 flex shrink-0 items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Warnings</span>
                    {warningRoleFilter
                      ? <span className="font-normal">· {roleLabels[warningRoleFilter]} {visibleWarningCount}</span>
                      : <span>{visibleWarningCount}</span>}
                  </h3>
                  {warningRoleFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setWarningRoleFilter(null)
                        setExpandedWarningCategory(null)
                      }}
                      className="min-h-7 px-1 text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-2 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      All
                    </button>
                  )}
                </div>
                <ul aria-label="Warning categories" className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
                    {visibleWarningGroups.map(group => {
                      const expanded = expandedWarningCategory === group.category
                      const groupCount = group.items.length
                      const disabled = groupCount === 0
                      return (
                        <li key={group.category}>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-expanded={disabled ? undefined : expanded}
                            onClick={() => {
                              if (!disabled) {
                                setExpandedWarningCategory(expanded ? null : group.category)
                              }
                            }}
                            className={`grid min-h-8 w-full grid-cols-[minmax(0,1fr)_2rem_1rem] items-center gap-2 py-1 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span className="min-w-0 truncate">{group.label}</span>
                            <span className={`w-8 text-right font-mono tabular-nums ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>{groupCount}</span>
                            <span className="grid w-4 place-items-center" aria-hidden="true">
                              {disabled ? null : expanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                            </span>
                          </button>
                          {expanded && groupCount > 0 && (
                            <ul className="mb-1 ml-8 border-l border-slate-200 pl-2">
                              {group.items.map(item => (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onNavigateWarning(item)
                                      onPrepareDatasetOpenChange(false)
                                    }}
                                    className="flex min-h-7 w-full px-1 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                                  >
                                    <span className="min-w-0 flex-1">{item.label}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                </ul>
              </div>

              {mockAction && <div className="mt-2 shrink-0 border-t border-slate-200 pt-2">{mockAction}</div>}
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
                  value={product.productName || ''}
                  onChange={event => onUpdateProduct({ ...product, productName: event.target.value, productDescription: event.target.value })}
                  placeholder=""
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-xs text-slate-950" title={product.productName || undefined}>
                  {product.productName || ''}
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
                  value={product.uom || ''}
                  onChange={event => onUpdateProduct({ ...product, uom: event.target.value })}
                  placeholder=""
                  className={fieldInput + ' font-mono'}
                />
              ) : (
                <span className="block font-mono text-xs text-slate-950">{product.uom || ''}</span>
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
