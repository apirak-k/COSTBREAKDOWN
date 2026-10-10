import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  RotateCcw,
  Save,
  Search,
  Table2,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { formatNumber } from '../../../core'
import type { MasterDataRole, CostSnapshot, ProductMaster } from '../../../core'
import type { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import { downloadBlob } from '../../../services/excel/export'
import {
  areMasterDataDatasetsReady,
  countMasterDataWarningsByRole,
  type MasterDataWarningGroup,
  type MasterDataWarningItem
} from '../prepare-dataset'

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
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  isPrepareDatasetOpen: boolean
  onPrepareDatasetOpenChange: (open: boolean) => void
  prepareDatasetRequestMode: 'all-warnings' | null
  warningGroups: MasterDataWarningGroup[]
  warningCount: number
  onNavigateWarning: (item: MasterDataWarningItem) => void
  mockAction?: React.ReactNode
  tableSelector: React.ReactNode
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

const toolbarButton = 'grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'mt-1 min-h-9 w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-950 focus:border-blue-700 focus:outline-none'
const datasetSummaryColumns = 'grid-cols-[minmax(0,1fr)_5rem_1.25rem_2rem_1.5rem]'
const warningCategoryColumns = datasetSummaryColumns
const datasetSaveStateDotClass = (state: MasterDataSaveState) =>
  `h-1.5 w-1.5 shrink-0 rounded-full ring-[1.5px] ring-inset ring-slate-500/80 ${state === 'Saved' ? 'bg-emerald-500' : 'bg-slate-400'}`
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

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
  onOpenImportModal,
  onOpenSizingModal,
  isPrepareDatasetOpen,
  onPrepareDatasetOpenChange,
  prepareDatasetRequestMode,
  warningGroups,
  warningCount,
  onNavigateWarning,
  mockAction,
  tableSelector,
  searchQuery,
  onSearchQueryChange
}) => {
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false)
  const [expandedWarningCategory, setExpandedWarningCategory] = useState<string | null>(null)
  const [warningRoleFilter, setWarningRoleFilter] = useState<MasterDataRole | null>(null)
  const [prepareDatasetMaxHeight, setPrepareDatasetMaxHeight] = useState<number | null>(null)
  const preparePanelRef = useRef<HTMLDivElement>(null)

  const roleLabel = roleLabels[role]
  const isSaved = saveStates[role] === 'Saved'
  const allWarningItems = warningGroups.flatMap(group => group.items)
  const datasetsReady = areMasterDataDatasetsReady(handoff, allWarningItems)
  const datasetWarningCounts = countMasterDataWarningsByRole(allWarningItems)
  const visibleWarningGroups = warningRoleFilter
    ? warningGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === warningRoleFilter) }))
    : warningGroups
  const visibleWarningCount = warningRoleFilter
    ? datasetWarningCounts[warningRoleFilter]
    : warningCount
  const comparisonStatus = handoff.productMismatch ? 'Mismatch' : 'Match'
  const warningHeadingLabel = `Warnings${warningRoleFilter ? ` · ${roleLabels[warningRoleFilter]}` : ''} ${visibleWarningCount}`
  const hasExpandedWarningCategory = visibleWarningGroups.some(
    group => group.category === expandedWarningCategory && group.items.length > 0
  )
  const preparePortalRoot = typeof document === 'undefined'
    ? null
    : document.getElementById('header-prepare-dataset-portal-root')

  const closePrepareDatasetAndRestoreFocus = () => {
    onPrepareDatasetOpenChange(false)
    document.getElementById('header-prepare-dataset-trigger')?.focus()
  }

  useEffect(() => {
    setCloneMenuOpen(false)
  }, [role])

  useEffect(() => {
    if (!prepareDatasetRequestMode) return
    setWarningRoleFilter(null)
    setExpandedWarningCategory(null)
  }, [prepareDatasetRequestMode])

  useSafeLayoutEffect(() => {
    if (!isPrepareDatasetOpen) {
      setPrepareDatasetMaxHeight(null)
      return
    }

    const main = document.querySelector('main')
    const updatePanelHeight = () => {
      const triggerBottom = document.getElementById('header-prepare-dataset-trigger')?.getBoundingClientRect().bottom
      const mainBottom = main?.getBoundingClientRect().bottom
      if (triggerBottom == null || mainBottom == null) return
      const availableHeight = Math.floor(mainBottom - triggerBottom - 8)
      setPrepareDatasetMaxHeight(Math.max(0, Math.min(480, availableHeight)))
    }

    updatePanelHeight()
    window.addEventListener('resize', updatePanelHeight)
    return () => {
      window.removeEventListener('resize', updatePanelHeight)
    }
  }, [hasExpandedWarningCategory, isPrepareDatasetOpen])

  useEffect(() => {
    if (!isPrepareDatasetOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      const trigger = document.getElementById('header-prepare-dataset-trigger')
      if (preparePanelRef.current?.contains(target) || trigger?.contains(target)) return
      onPrepareDatasetOpenChange(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onPrepareDatasetOpenChange(false)
        document.getElementById('header-prepare-dataset-trigger')?.focus()
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
                <span aria-hidden="true" className={datasetSaveStateDotClass(state)} />
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

        <div role="search" className="relative ml-auto w-40 shrink-0 sm:w-48">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search Master Data"
            value={searchQuery}
            onChange={event => onSearchQueryChange(event.target.value)}
            placeholder="Search…"
            className="h-8 w-full border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>

        {isPrepareDatasetOpen && preparePortalRoot && createPortal(
          <div
              ref={preparePanelRef}
              id="prepare-dataset-panel"
              role="region"
              aria-label="Prepare Dataset status and warnings"
              style={prepareDatasetMaxHeight === null ? undefined : {
                maxHeight: `${prepareDatasetMaxHeight}px`,
                ...(hasExpandedWarningCategory ? { height: `${prepareDatasetMaxHeight}px` } : {})
              }}
              className="flex max-h-[min(30rem,calc(100dvh-6rem))] w-[min(20rem,calc(100vw-2rem))] min-h-0 select-text flex-col overflow-hidden border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-lg"
            >
              <div className="flex min-h-8 shrink-0 items-center gap-1 min-[360px]:gap-2.5 sm:gap-3 border-b border-slate-200 pb-1">
                <h2 id="prepare-dataset-heading" className="shrink-0 text-xs font-semibold text-slate-700">
                  Dataset
                </h2>
                <span
                  aria-label={`Dataset ${datasetsReady ? 'Ready' : 'Incomplete'}`}
                  title={datasetsReady ? 'Reference and Current are ready' : 'Reference or Current needs input'}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${datasetsReady ? 'text-blue-700' : 'text-rose-700'}`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${datasetsReady ? 'bg-blue-600' : 'bg-rose-500'}`} />
                  {datasetsReady ? 'Ready' : 'Incomplete'}
                </span>
                <span
                  aria-label={`Product ${comparisonStatus}`}
                  className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${handoff.productMismatch ? 'text-violet-700' : 'text-emerald-700'}`}
                >
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${handoff.productMismatch ? 'bg-violet-500' : 'bg-emerald-600'}`} />
                    Product {comparisonStatus}
                </span>
                <button
                  type="button"
                  onClick={closePrepareDatasetAndRestoreFocus}
                  aria-label="Close Prepare Dataset"
                  className="ml-auto grid h-7 w-7 shrink-0 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <div role="group" aria-label="Dataset save states and warning counts" className="grid shrink-0 grid-cols-1 divide-y divide-slate-100 border-b border-slate-200 py-1">
                {roles.map(datasetRole => {
                  const saveState = saveStates[datasetRole]
                  const datasetWarningCount = datasetWarningCounts[datasetRole]
                  const isFiltered = warningRoleFilter === datasetRole
                  const rowContents = (
                    <>
                      <span className="min-w-0 truncate pl-3 text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs">
                        <span aria-hidden="true" className={datasetSaveStateDotClass(saveState)} />
                        <span>{saveState}</span>
                      </span>
                      <span className="grid h-7 w-5 place-items-center" aria-hidden="true">
                        <AlertTriangle className={`h-3 w-3 ${datasetWarningCount > 0 ? 'text-amber-800' : 'text-slate-400'}`} />
                      </span>
                      <span className={`w-full text-right font-mono text-xs tabular-nums ${datasetWarningCount > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                        {datasetWarningCount}
                      </span>
                      <span className="h-7 w-6" aria-hidden="true" />
                    </>
                  )
                  const rowClassName = `grid h-8 w-full ${datasetSummaryColumns} items-center gap-2 rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700`
                  return (
                    datasetWarningCount === 0 ? (
                      <div key={datasetRole} aria-label={`${roleLabels[datasetRole]} ${saveState}, no warning items`} className={`${rowClassName} cursor-default`}>
                        {rowContents}
                      </div>
                    ) : (
                      <button
                        key={datasetRole}
                        type="button"
                        aria-label={`Filter warnings to ${roleLabels[datasetRole]}: ${datasetWarningCount}`}
                        aria-pressed={isFiltered}
                        title={`Filter warnings to ${roleLabels[datasetRole]}`}
                        onClick={() => {
                          setWarningRoleFilter(datasetRole)
                          setExpandedWarningCategory(null)
                        }}
                        className={`${rowClassName} ${isFiltered ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      >
                        {rowContents}
                      </button>
                    )
                  )
                })}
              </div>

              <div className={`flex min-h-0 ${hasExpandedWarningCategory ? 'flex-1' : 'shrink-0'} flex-col pt-1`}>
                {warningRoleFilter ? (
                  <button
                    type="button"
                    aria-label={`Show all warning items, ${visibleWarningCount} currently shown`}
                    title="Show all warning items"
                    onClick={() => {
                      setWarningRoleFilter(null)
                      setExpandedWarningCategory(null)
                    }}
                    className={`mb-1 grid h-7 w-full shrink-0 ${warningCategoryColumns} items-center gap-2 rounded-sm text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700`}
                  >
                    <span id="prepare-dataset-warning-heading" role="heading" aria-level={3} className="col-span-3 min-w-0 truncate text-xs font-semibold text-slate-800">
                      {warningHeadingLabel}
                    </span>
                    <span className="w-full text-right text-xs font-medium text-slate-600">All</span>
                    <span className="h-6 w-6" aria-hidden="true" />
                  </button>
                ) : (
                  <div className={`mb-1 grid h-7 shrink-0 ${warningCategoryColumns} items-center gap-2`}>
                    <h3 id="prepare-dataset-warning-heading" className="col-span-3 min-w-0 truncate text-xs font-semibold text-slate-800">
                      {warningHeadingLabel}
                    </h3>
                    <span aria-label="Showing all warning items" className="w-full text-right text-xs font-medium text-slate-500">All</span>
                    <span className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <ul aria-label="Warning categories" className={`${hasExpandedWarningCategory ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'} divide-y divide-slate-100`}>
                  {visibleWarningGroups.map(group => {
                    const expanded = expandedWarningCategory === group.category
                    const groupCount = group.items.length
                    const disabled = groupCount === 0
                    return (
                      <li key={group.category} className={expanded ? 'flex min-h-0 flex-1 flex-col' : undefined}>
                        {disabled ? (
                          <div className={`grid min-h-8 w-full ${warningCategoryColumns} items-center gap-2 py-1 text-left text-xs`}>
                            <span className="col-span-2 min-w-0 truncate pl-3 text-slate-800">{group.label}</span>
                            <span className="h-3 w-5" aria-hidden="true" />
                            <span className="w-full text-right font-mono tabular-nums text-slate-400">0</span>
                            <span className="h-6 w-6" aria-hidden="true" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setExpandedWarningCategory(expanded ? null : group.category)}
                            className={`grid min-h-8 w-full shrink-0 ${warningCategoryColumns} items-center gap-2 py-1 text-left text-xs text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${expanded ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                          >
                            <span className="col-span-2 min-w-0 truncate pl-3">{group.label}</span>
                            <span className="h-3 w-5" aria-hidden="true" />
                            <span className="w-full text-right font-mono tabular-nums text-slate-600">{groupCount}</span>
                            <span className="grid h-6 w-6 place-items-center" aria-hidden="true">
                              {expanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                            </span>
                          </button>
                        )}
                        {expanded && groupCount > 0 && (
                          <ul className="mb-1 ml-8 min-h-0 max-h-36 flex-1 overflow-y-auto overscroll-contain border-l border-slate-200 pl-2">
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

              {mockAction && <div className="mt-auto shrink-0 border-t border-slate-200 pt-2">{mockAction}</div>}
          </div>,
          preparePortalRoot
        )}

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
                  {product.sellingPrice == null ? '—' : `${formatNumber(product.sellingPrice)} THB`}
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
                  {product.sgaPercent == null ? '—' : `${formatNumber(product.sgaPercent)} %`}
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
