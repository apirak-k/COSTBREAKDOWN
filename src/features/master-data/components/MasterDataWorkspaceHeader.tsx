import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpFromLine,
  CircleX,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Table2,
  Trash2,
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
  countMasterDataQualityByRole,
  type MasterDataBlockerGroup,
  type MasterDataBlockerItem,
  type MasterDataWarningGroup,
  type MasterDataQualityItem
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
  blockerGroups: MasterDataBlockerGroup[]
  blockerCount: number
  blockerItems: MasterDataBlockerItem[]
  onNavigateWarning: (item: MasterDataQualityItem) => void
  mockAction?: React.ReactNode
  tableSelector: React.ReactNode
  tableView: 'bom' | 'wc' | 'routing' | 'all'
  showWarningHighlights: boolean
  onWarningHighlightsChange: (visible: boolean) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

const toolbarButton = 'grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = 'min-h-8 w-full min-w-0 border-b border-slate-300 bg-transparent px-1 py-1 text-xs text-slate-950 focus:border-blue-700 focus:outline-none'
const datasetSummaryColumns = 'grid-cols-[minmax(0,1fr)_5rem_3.5rem_3.5rem]'
const datasetSaveStateDotClass = (state: MasterDataSaveState, size = 'h-1.5 w-1.5') =>
  `${size} shrink-0 rounded-full ring-[1.5px] ring-inset ${state === 'Saved' ? 'bg-emerald-500 ring-emerald-700/70' : 'bg-slate-400 ring-slate-600/70'}`
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
  blockerGroups,
  blockerCount,
  blockerItems,
  onNavigateWarning,
  mockAction,
  tableSelector,
  tableView,
  showWarningHighlights,
  onWarningHighlightsChange,
  searchQuery,
  onSearchQueryChange
}) => {
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false)
  const [expandedWarningCategory, setExpandedWarningCategory] = useState<string | null>(null)
  const [expandedBlockerCategory, setExpandedBlockerCategory] = useState<string | null>(null)
  const [datasetRoleFilter, setDatasetRoleFilter] = useState<MasterDataRole | null>(null)
  const [prepareDatasetMaxHeight, setPrepareDatasetMaxHeight] = useState<number | null>(null)
  const preparePanelRef = useRef<HTMLDivElement>(null)
  const cloneContainerRef = useRef<HTMLDivElement>(null)
  const cloneTriggerRef = useRef<HTMLButtonElement>(null)

  const roleLabel = roleLabels[role]
  const isSaved = saveStates[role] === 'Saved'
  const allWarningItems = warningGroups.flatMap(group => group.items)
  const datasetsReady = areMasterDataDatasetsReady(handoff, blockerItems)
  const datasetWarningCounts = countMasterDataWarningsByRole(allWarningItems)
  const datasetBlockerCounts = countMasterDataQualityByRole(blockerItems)
  const visibleWarningGroups = (datasetRoleFilter
    ? warningGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === datasetRoleFilter) }))
    : warningGroups).filter(group => group.items.length > 0)
  const visibleBlockerGroups = (datasetRoleFilter
    ? blockerGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === datasetRoleFilter) }))
    : blockerGroups).filter(group => group.items.length > 0)
  const visibleWarningCount = datasetRoleFilter
    ? datasetWarningCounts[datasetRoleFilter]
    : warningCount
  const visibleBlockerCount = datasetRoleFilter
    ? datasetBlockerCounts[datasetRoleFilter]
    : blockerCount
  const searchPlaceholder = tableView === 'all'
    ? 'Search all tables...'
    : tableView === 'wc'
      ? 'Search Work Centers...'
      : tableView === 'routing'
        ? 'Search Routing...'
        : 'Search BOM...'
  const comparisonStatus = handoff.productMismatch ? 'Mismatch' : 'Match'
  const warningHeadingLabel = `Warnings ${visibleWarningCount}`
  const blockerHeadingLabel = `Blockers ${visibleBlockerCount}`
  const hasExpandedWarningCategory = visibleWarningGroups.some(
    group => group.category === expandedWarningCategory && group.items.length > 0
  )
  const hasExpandedBlockerCategory = visibleBlockerGroups.some(
    group => group.category === expandedBlockerCategory && group.items.length > 0
  )
  const hasExpandedIssueCategory = hasExpandedWarningCategory || hasExpandedBlockerCategory
  const preparePortalRoot = typeof document === 'undefined'
    ? null
    : document.getElementById('header-prepare-dataset-portal-root')

  const closePrepareDatasetAndRestoreFocus = () => {
    onPrepareDatasetOpenChange(false)
    document.getElementById('header-prepare-dataset-trigger')?.focus()
  }

  const renderIssueSection = (kind: 'warning' | 'blocker') => {
    const isWarning = kind === 'warning'
    const groups = isWarning ? visibleWarningGroups : visibleBlockerGroups
    const visibleCount = isWarning ? visibleWarningCount : visibleBlockerCount
    const heading = isWarning ? warningHeadingLabel : blockerHeadingLabel
    const expandedCategory = isWarning ? expandedWarningCategory : expandedBlockerCategory
    const setExpandedCategory = isWarning ? setExpandedWarningCategory : setExpandedBlockerCategory

    return (
      <section aria-labelledby={`prepare-dataset-${kind}-heading`} className="shrink-0">
        <div className="grid h-7 grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
          <h3 id={`prepare-dataset-${kind}-heading`} className="truncate text-xs font-semibold text-slate-800">{heading}</h3>
          <button
            type="button"
            aria-label={`Show all ${isWarning ? 'warnings' : 'blockers'}, ${visibleCount} currently shown`}
            aria-pressed={!datasetRoleFilter}
            title={`Show all ${isWarning ? 'warnings' : 'blockers'}`}
            onClick={() => {
              setDatasetRoleFilter(null)
              setExpandedCategory(null)
            }}
            className={`h-7 rounded-sm px-1 text-right text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${datasetRoleFilter ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-950' : 'bg-slate-100 text-slate-800'}`}
          >
            All
          </button>
        </div>
        {groups.length > 0 && (
          <ul aria-label={isWarning ? 'Warning categories' : 'Blocker categories'} className="divide-y divide-slate-100">
            {groups.map(group => {
              const expanded = expandedCategory === group.category
              const items = group.items
              const label = group.category === 'missing-value'
                ? <>{group.label}<span aria-hidden="true" className="ml-1 font-bold text-rose-600">*</span></>
                : group.label
              return (
                <li key={group.category}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedCategory(expanded ? null : group.category)}
                    className={`grid min-h-7 w-full grid-cols-[minmax(0,1fr)_2rem_1.5rem] items-center gap-2 py-0.5 pl-3 text-left text-xs text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${expanded ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0 truncate">{label}</span>
                    <span className="w-full text-right font-mono tabular-nums text-slate-600">{items.length}</span>
                    <span className="grid h-6 w-6 place-items-center" aria-hidden="true">
                      {expanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </span>
                  </button>
                  {expanded && (
                    <ul className="mb-1 ml-8 border-l border-slate-200 pl-2">
                      {items.map(item => (
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
        )}
      </section>
    )
  }

  useEffect(() => {
    setCloneMenuOpen(false)
  }, [role])

  useEffect(() => {
    if (!cloneMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!cloneContainerRef.current?.contains(event.target as Node)) setCloneMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setCloneMenuOpen(false)
      cloneTriggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [cloneMenuOpen])

  useEffect(() => {
    if (!prepareDatasetRequestMode) return
    setDatasetRoleFilter(null)
    setExpandedWarningCategory(null)
    setExpandedBlockerCategory(null)
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
  }, [hasExpandedIssueCategory, isPrepareDatasetOpen])

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
    const fileProductName = (lastSavedSnapshot.product.productName || '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim()
    const filenameProductPart = fileProductName ? `_${fileProductName}` : ''
    const filename = `Dataset${filenameProductPart}_${roleLabel}.xlsx`
    type SaveFileHandle = {
      createWritable: () => Promise<{ write: (value: Blob) => Promise<void>; close: () => Promise<void> }>
    }
    type SaveFilePickerWindow = Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string
        types: Array<{ description: string; accept: Record<string, string[]> }>
      }) => Promise<SaveFileHandle>
    }
    const showSaveFilePicker = (window as SaveFilePickerWindow).showSaveFilePicker
    if (!showSaveFilePicker) {
      const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
      const blob = await exportSnapshotToExcel(lastSavedSnapshot)
      downloadBlob(blob, filename)
      return
    }

    let blob: Blob | undefined
    try {
      const saveFileHandlePromise = showSaveFilePicker.call(window, {
        suggestedName: filename,
        types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
      })
      const handle = await saveFileHandlePromise
      const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
      blob = await exportSnapshotToExcel(lastSavedSnapshot)
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (!blob) {
        const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
        blob = await exportSnapshotToExcel(lastSavedSnapshot)
      }
      downloadBlob(blob, filename)
    }
  }

  const handleResetDataset = () => {
    if (lastSavedSnapshot) onResetWorkingDataset()
  }

  return (
    <section className="sticky top-0 z-40 overflow-visible border border-slate-300 bg-white" aria-label="Working dataset controls">
      <div role="toolbar" aria-label="Dataset and table actions" className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 bg-white px-1.5 py-1 xl:flex-nowrap">
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

        <button
          type="button"
          aria-pressed={!isEditMode}
          aria-label="View"
          title="View"
          onClick={() => onToggleEditMode(false)}
          className={`${toolbarButton} ${!isEditMode ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''}`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={isEditMode}
          aria-label="Edit"
          title="Edit"
          onClick={() => onToggleEditMode(true)}
          className={`${toolbarButton} ${isEditMode ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="inline-flex shrink-0 items-center gap-1" role="group" aria-label="Master Data actions">
          <button type="button" onClick={onOpenSizingModal} className={toolbarButton} title="Sizing" aria-label="Sizing">
            <Table2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenImportModal} className={toolbarButton} title="Import" aria-label="Import">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          </button>
          <div
            ref={cloneContainerRef}
            className="relative shrink-0"
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCloneMenuOpen(false)
            }}
          >
            <button
              ref={cloneTriggerRef}
              type="button"
              onClick={() => setCloneMenuOpen(open => !open)}
              aria-expanded={cloneMenuOpen}
              aria-haspopup="menu"
              aria-controls="clone-source-menu"
              aria-label="Clone"
              title="Clone from another dataset"
              className={toolbarButton}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            {cloneMenuOpen && (
              <div id="clone-source-menu" role="menu" aria-label="Clone source" className="absolute left-0 top-full z-50 min-w-36 border border-slate-300 bg-white p-1 shadow-lg">
                {roles.filter(sourceRole => sourceRole !== role).map(sourceRole => (
                  <button
                    key={sourceRole}
                    type="button"
                    role="menuitem"
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
            aria-pressed={showWarningHighlights}
            onClick={() => onWarningHighlightsChange(!showWarningHighlights)}
            className={toolbarButton}
            title={showWarningHighlights ? 'Hide warning highlights' : 'Show warning highlights'}
            aria-label={showWarningHighlights ? 'Hide warning highlights' : 'Show warning highlights'}
          >
            <span aria-hidden="true" className="relative grid h-[18px] w-[18px] place-items-center">
              <span className="font-mono text-base font-bold leading-none">!</span>
              {!showWarningHighlights && <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rotate-[-45deg] bg-current" />}
            </span>
          </button>
          <button
            type="button"
            onClick={handleResetDataset}
            disabled={!lastSavedSnapshot}
            className={toolbarButton}
            title={lastSavedSnapshot ? 'Reset to Last Saved' : 'No Last Saved state exists'}
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onClearDataset} className={toolbarButton} title="Clear Working data" aria-label="Clear">
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
            className={toolbarButton}
            title={lastSavedSnapshot ? 'Export Last Saved' : 'No Last Saved dataset to export'}
            aria-label="Export"
          >
            <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div role="search" className="relative ml-auto h-8 w-48 min-w-48 max-w-48 shrink-0">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search Master Data"
            value={searchQuery}
            onChange={event => onSearchQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full min-w-0 border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>

        {tableSelector}

        {isPrepareDatasetOpen && preparePortalRoot && createPortal(
          <div
            ref={preparePanelRef}
            id="prepare-dataset-panel"
            role="region"
            aria-label="Prepare Dataset status and warnings"
            style={prepareDatasetMaxHeight === null ? undefined : {
              maxHeight: `${prepareDatasetMaxHeight}px`,
              ...(hasExpandedIssueCategory ? { height: `${prepareDatasetMaxHeight}px` } : {})
            }}
            className="flex max-h-[min(30rem,calc(100dvh-6rem))] w-[min(20rem,calc(100vw-2rem))] min-h-0 select-text flex-col overflow-hidden border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-lg"
          >
              <div className="flex min-h-8 shrink-0 items-center gap-1 border-b border-slate-200 pb-0.5 min-[360px]:gap-2 sm:gap-2.5">
                <h2 id="prepare-dataset-heading" className="shrink-0 text-xs font-semibold text-slate-700">
                  Dataset
                </h2>
                <span
                  aria-label={`Dataset ${datasetsReady ? 'Ready' : 'Incomplete'}`}
                  title={datasetsReady ? 'Reference and Current are ready' : 'Reference or Current needs input'}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${datasetsReady ? 'text-blue-700' : 'text-rose-700'}`}
                >
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${datasetsReady ? 'bg-blue-600' : 'bg-rose-500'}`} />
                  {datasetsReady ? 'Ready' : 'Incomplete'}
                </span>
                <span
                  aria-label={`Product ${comparisonStatus}`}
                  className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${handoff.productMismatch ? 'text-violet-700' : 'text-emerald-700'}`}
                >
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${handoff.productMismatch ? 'bg-violet-500' : 'bg-emerald-600'}`} />
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

              <div role="group" aria-label="Dataset filters, save states, warning counts, and blocker counts" className="grid shrink-0 grid-cols-1 divide-y divide-slate-100 border-b border-slate-200 py-0.5">
                {roles.map(datasetRole => {
                  const saveState = saveStates[datasetRole]
                  const datasetWarningCount = datasetWarningCounts[datasetRole]
                  const datasetBlockerCount = datasetBlockerCounts[datasetRole]
                  const isFiltered = datasetRoleFilter === datasetRole
                  return (
                    <button
                      key={datasetRole}
                      type="button"
                      aria-label={`Filter warnings and blockers to ${roleLabels[datasetRole]}: ${saveState}, ${datasetWarningCount} warnings, ${datasetBlockerCount} blockers`}
                      aria-pressed={isFiltered}
                      title={`Filter warnings and blockers to ${roleLabels[datasetRole]}`}
                      onClick={() => {
                        setDatasetRoleFilter(current => current === datasetRole ? null : datasetRole)
                        setExpandedWarningCategory(null)
                        setExpandedBlockerCategory(null)
                      }}
                      className={`grid h-8 w-full ${datasetSummaryColumns} items-center gap-2 rounded-sm text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${isFiltered ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0 truncate pl-3 text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs">
                        <span aria-hidden="true" className={datasetSaveStateDotClass(saveState, 'h-2 w-2')} />
                        <span>{saveState}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums text-slate-600">
                        <AlertTriangle className={`h-3 w-3 ${datasetWarningCount > 0 ? 'text-amber-700' : 'text-slate-400'}`} aria-hidden="true" />
                        {datasetWarningCount}
                      </span>
                      <span className="inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums text-slate-600">
                        <CircleX className={`h-3 w-3 ${datasetBlockerCount > 0 ? 'text-rose-700' : 'text-slate-400'}`} aria-hidden="true" />
                        {datasetBlockerCount}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain pt-0.5">
                {renderIssueSection('warning')}
                {renderIssueSection('blocker')}
              </div>

              {mockAction && <div className="mt-1 shrink-0 border-t border-slate-200 pt-1">{mockAction}</div>}
          </div>,
          preparePortalRoot
        )}

      </div>

      <div className="px-2 py-1.5">
        <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,4fr)]">
          <div className="flex min-w-0 items-center gap-1.5 border-b border-slate-200 py-1">
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">Product Name :</dt>
            <dd className="min-w-0 flex-1">
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

          <div className="flex min-w-0 items-center gap-1.5 border-b border-slate-200 py-1">
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">UOM :</dt>
            <dd className="min-w-0 flex-1">
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

          <div className="flex min-w-0 items-center gap-1.5 border-b border-slate-200 py-1">
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">Selling Price (THB) :</dt>
            <dd className="min-w-0 flex-1">
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
                  {product.sellingPrice == null ? '' : `${formatNumber(product.sellingPrice)} THB`}
                </span>
              )}
            </dd>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 border-b border-slate-200 py-1">
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">SG&amp;A (%) :</dt>
            <dd className="min-w-0 flex-1">
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
                  {product.sgaPercent == null ? '' : `${formatNumber(product.sgaPercent)}%`}
                </span>
              )}
            </dd>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 border-b border-slate-200 py-1">
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">Remark :</dt>
            <dd className="min-w-0 flex-1">
              {isEditMode ? (
                <input
                  type="text"
                  value={snapshot.remark || ''}
                  onChange={event => onUpdateRemark(event.target.value)}
                  aria-label="Dataset Remark"
                  className={fieldInput}
                />
              ) : (
                <span className="block truncate text-xs text-slate-800" title={snapshot.remark || ''}>{snapshot.remark || ''}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
