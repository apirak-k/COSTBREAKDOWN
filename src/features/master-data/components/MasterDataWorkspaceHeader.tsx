import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
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
  Upload,
  Table2,
  Trash2,
  X
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { formatNumber } from '../../../core'
import type { MasterDataRole, CostSnapshot, ProductMaster } from '../../../core'
import type { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import { resolveProductComparisonDisplayStatus } from '../../../shared/layout/header-product-context'
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
  referenceProduct: ProductMaster
  currentProduct: ProductMaster
  snapshot: CostSnapshot
  lastSavedSnapshot?: CostSnapshot
  saveStates: Record<MasterDataRole, MasterDataSaveState>
  role: MasterDataRole
  onRoleChange: (role: MasterDataRole) => void
  onSaveWorkingDataset: () => void
  onSaveAllWorkingDatasets: () => void
  onResetWorkingDataset: () => void
  onResetAllWorkingDatasets: () => void
  isEditMode: boolean
  onToggleEditMode: (edit: boolean) => void
  onUpdateProduct: (product: ProductMaster) => void
  onUpdateRemark: (remark: string) => void
  onCloneFrom: (sourceRole: MasterDataRole) => void
  onClearDataset: () => void
  onClearAllDatasets: () => void
  hasLastSavedByRole: Record<MasterDataRole, boolean>
  handoff: MasterDataHandoffStatus
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  isPrepareDatasetOpen: boolean
  onClosePrepareDataset: () => void
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

const toolbarButton = 'grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-transparent text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700'
const fieldInput = 'min-h-8 w-full min-w-0 border-b border-slate-300 bg-transparent px-1 py-1 text-xs text-slate-950 focus:border-blue-700 focus:outline-none'
const datasetSummaryColumns = 'grid-cols-[minmax(0,1fr)_5rem_3.5rem_3.5rem]'
const datasetSaveStateDotClass = (state: MasterDataSaveState, size = 'h-1.5 w-1.5') =>
  `${size} shrink-0 rounded-full ring-[1.5px] ring-inset ${state === 'Saved' ? 'bg-emerald-500 ring-emerald-700/70' : 'bg-slate-400 ring-slate-600/70'}`
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const useCenteredPopoverOffset = (open: boolean, popoverRef: { current: HTMLElement | null }) => {
  const [offset, setOffset] = useState(0)
  const offsetRef = useRef(0)

  useSafeLayoutEffect(() => {
    if (!open) {
      offsetRef.current = 0
      setOffset(0)
      return
    }

    const updateOffset = () => {
      const rect = popoverRef.current?.getBoundingClientRect()
      if (!rect) return
      const left = rect.left - offsetRef.current
      const right = rect.right - offsetRef.current
      const nextOffset = left < 8
        ? 8 - left
        : right > window.innerWidth - 8
          ? window.innerWidth - 8 - right
          : 0
      if (nextOffset === offsetRef.current) return
      offsetRef.current = nextOffset
      setOffset(nextOffset)
    }

    updateOffset()
    window.addEventListener('resize', updateOffset)
    return () => window.removeEventListener('resize', updateOffset)
  }, [open, popoverRef])

  return offset
}

const roleLabels: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

interface CurrentAndAllActionProps {
  label: string
  onCurrent: () => void
  onAll: () => void
  currentDisabled?: boolean
  allDisabled?: boolean
  children: React.ReactNode
}

const CurrentAndAllAction: React.FC<CurrentAndAllActionProps> = ({
  label,
  onCurrent,
  onAll,
  currentDisabled = false,
  allDisabled = false,
  children
}) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const allActionRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const horizontalOffset = useCenteredPopoverOffset(open, menuRef)
  const menuId = `master-data-${label.toLocaleLowerCase()}-all-menu`
  const helpId = `master-data-${label.toLocaleLowerCase()}-all-help`

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }
  const openMenu = (focusAllAction = false) => {
    clearHoverTimer()
    setOpen(true)
    if (focusAllAction) requestAnimationFrame(() => allActionRef.current?.focus())
  }
  const closeMenu = (restoreFocus = false) => {
    clearHoverTimer()
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => () => clearHoverTimer(), [])
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeMenu(true)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div
      ref={wrapperRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => setOpen(true), 120)
      }}
      onMouseLeave={() => {
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => {
          if (!wrapperRef.current?.contains(document.activeElement)) setOpen(false)
        }, 150)
      }}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-disabled={currentDisabled}
        aria-expanded={open}
        aria-controls={menuId}
        aria-describedby={helpId}
        aria-keyshortcuts="Alt+ArrowDown"
        title={`${label} current dataset · Alt+↓ for all datasets`}
        onClick={() => {
          if (currentDisabled) return
          closeMenu()
          onCurrent()
        }}
        onKeyDown={event => {
          if ((event.altKey && event.key === 'ArrowDown') || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault()
            openMenu(true)
          }
        }}
        className={`${toolbarButton} ${currentDisabled ? 'opacity-40 hover:bg-transparent hover:text-slate-700' : ''}`}
      >
        {children}
      </button>
      <span id={helpId} className="sr-only">Acts on the current dataset. Hover or press Alt plus Down Arrow to access the all-dataset action.</span>
      <div
        ref={menuRef}
        id={menuId}
        role="group"
        aria-label={`${label} all-dataset action`}
        hidden={!open}
        style={{ marginLeft: `${horizontalOffset}px` }}
        className="absolute left-1/2 top-full z-50 mt-1 min-w-max -translate-x-1/2 border border-slate-300 bg-white p-1 shadow-lg"
        onMouseEnter={clearHoverTimer}
      >
        <button
          ref={allActionRef}
          type="button"
          disabled={allDisabled}
          onClick={() => {
            closeMenu()
            onAll()
          }}
          className="block min-h-8 w-full whitespace-nowrap px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
        >
          {label} all datasets
        </button>
      </div>
    </div>
  )
}

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  referenceProduct,
  currentProduct,
  snapshot,
  lastSavedSnapshot,
  saveStates,
  hasLastSavedByRole,
  role,
  onRoleChange,
  onSaveWorkingDataset,
  onSaveAllWorkingDatasets,
  onResetWorkingDataset,
  onResetAllWorkingDatasets,
  isEditMode,
  onToggleEditMode,
  onUpdateProduct,
  onUpdateRemark,
  onCloneFrom,
  onClearDataset,
  onClearAllDatasets,
  handoff,
  onOpenImportModal,
  onOpenSizingModal,
  isPrepareDatasetOpen,
  onClosePrepareDataset,
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
  const [cloneMenuPinned, setCloneMenuPinned] = useState(false)
  const [expandedWarningCategories, setExpandedWarningCategories] = useState<Set<string>>(() => new Set())
  const [expandedBlockerCategories, setExpandedBlockerCategories] = useState<Set<string>>(() => new Set())
  const [datasetRoleFilter, setDatasetRoleFilter] = useState<MasterDataRole | null>(null)
  const [prepareDatasetMaxHeight, setPrepareDatasetMaxHeight] = useState<number | null>(null)
  const preparePanelRef = useRef<HTMLDivElement>(null)
  const cloneContainerRef = useRef<HTMLDivElement>(null)
  const cloneTriggerRef = useRef<HTMLButtonElement>(null)
  const cloneMenuRef = useRef<HTMLDivElement>(null)
  const cloneHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloneHorizontalOffset = useCenteredPopoverOffset(cloneMenuOpen, cloneMenuRef)
  const preparePanelHorizontalOffset = useCenteredPopoverOffset(isPrepareDatasetOpen, preparePanelRef)

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
    ? 'Search all tables'
    : tableView === 'wc'
      ? 'Search Work Centers'
      : tableView === 'routing'
        ? 'Search Routing'
        : 'Search BOM'
  const productDisplayStatus = resolveProductComparisonDisplayStatus(referenceProduct, currentProduct)
  const comparisonStatus = productDisplayStatus === 'not-set'
    ? 'Not Set'
    : productDisplayStatus === 'mismatch'
      ? 'Mismatch'
      : 'Match'
  const productStatusClass = productDisplayStatus === 'match'
    ? 'text-emerald-700'
    : productDisplayStatus === 'mismatch'
      ? 'text-violet-700'
      : 'text-slate-600'
  const productStatusDotClass = productDisplayStatus === 'match'
    ? 'bg-emerald-600'
    : productDisplayStatus === 'mismatch'
      ? 'bg-violet-500'
      : 'bg-slate-400'
  const activeDatasetFilterLabel = datasetRoleFilter ? roleLabels[datasetRoleFilter] : 'All'
  const warningHeadingLabel = `Warnings ${visibleWarningCount}`
  const blockerHeadingLabel = `Blockers ${visibleBlockerCount}`
  const preparePortalRoot = typeof document === 'undefined'
    ? null
    : document.getElementById('header-prepare-dataset-portal-root')

  const closePrepareDatasetAndRestoreFocus = () => {
    onClosePrepareDataset()
    document.getElementById('header-prepare-dataset-trigger')?.focus()
  }

  const renderIssueSection = (kind: 'warning' | 'blocker') => {
    const isWarning = kind === 'warning'
    const groups = isWarning ? visibleWarningGroups : visibleBlockerGroups
    const heading = isWarning ? warningHeadingLabel : blockerHeadingLabel
    const expandedCategories = isWarning ? expandedWarningCategories : expandedBlockerCategories
    const setExpandedCategories = isWarning ? setExpandedWarningCategories : setExpandedBlockerCategories

    return (
      <section aria-labelledby={`prepare-dataset-${kind}-heading`} className="flex min-h-0 shrink-0 flex-col">
        <div className="grid h-6 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h3 id={`prepare-dataset-${kind}-heading`} className="truncate text-xs font-semibold text-slate-800">{heading}</h3>
          <span aria-label={`Dataset filter: ${activeDatasetFilterLabel}`} title={`Showing ${activeDatasetFilterLabel} dataset`} className="text-right text-[11px] font-medium text-slate-500">
            {activeDatasetFilterLabel}
          </span>
        </div>
        {groups.length > 0 && (
          <ul aria-label={isWarning ? 'Warning categories' : 'Blocker categories'} className="shrink-0 space-y-0.5">
            {groups.map(group => {
              const expanded = expandedCategories.has(group.category)
              const items = group.items
              const label = group.category === 'missing-value'
                ? <>{group.label}<span aria-hidden="true" className="ml-1 font-bold text-rose-600">*</span></>
                : group.label
              return (
                <li key={group.category}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedCategories(current => {
                      const next = new Set(current)
                      if (next.has(group.category)) next.delete(group.category)
                      else next.add(group.category)
                      return next
                    })}
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
                    <ul
                      aria-label={`${group.label} locations`}
                      tabIndex={0}
                      style={{ maxHeight: `${Math.min(items.length, 3) * 28}px` }}
                      className="mb-1 ml-8 min-h-0 overflow-y-auto overscroll-contain border-l border-slate-200 pl-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {items.map(item => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateWarning(item)
                              onClosePrepareDataset()
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

  const clearCloneHoverTimer = () => {
    if (cloneHoverTimerRef.current) clearTimeout(cloneHoverTimerRef.current)
    cloneHoverTimerRef.current = null
  }

  const closeCloneMenu = (restoreFocus = false) => {
    clearCloneHoverTimer()
    setCloneMenuOpen(false)
    setCloneMenuPinned(false)
    if (restoreFocus) cloneTriggerRef.current?.focus()
  }

  useEffect(() => {
    closeCloneMenu()
  }, [role])

  useEffect(() => {
    if (!cloneMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!cloneContainerRef.current?.contains(event.target as Node)) closeCloneMenu()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeCloneMenu(true)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [cloneMenuOpen])

  useEffect(() => () => clearCloneHoverTimer(), [])

  useEffect(() => {
    if (!prepareDatasetRequestMode) return
    setDatasetRoleFilter(null)
    setExpandedWarningCategories(new Set())
    setExpandedBlockerCategories(new Set())
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
      setPrepareDatasetMaxHeight(Math.max(0, Math.min(608, availableHeight)))
    }

    updatePanelHeight()
    window.addEventListener('resize', updatePanelHeight)
    return () => {
      window.removeEventListener('resize', updatePanelHeight)
    }
  }, [isPrepareDatasetOpen])

  useEffect(() => {
    if (!isPrepareDatasetOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      const trigger = document.getElementById('header-prepare-dataset-trigger')
      const footerTrigger = document.getElementById('footer-warning-action')
      if (preparePanelRef.current?.contains(target) || trigger?.contains(target) || footerTrigger?.contains(target)) return
      onClosePrepareDataset()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClosePrepareDataset()
        document.getElementById('header-prepare-dataset-trigger')?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPrepareDatasetOpen, onClosePrepareDataset])

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
        <div className="inline-flex h-8 shrink-0 border border-slate-300 bg-white" role="group" aria-label="Master Data workspace">
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
                className={'flex h-full items-center gap-1.5 px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                  (selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
              >
                {roleLabels[datasetRole]}
                <span aria-hidden="true" className={datasetSaveStateDotClass(state)} />
              </button>
            )
          })}
        </div>

        <div
          role="group"
          aria-label="View and Edit mode"
          onClick={event => {
            if (event.target !== event.currentTarget) return
            onToggleEditMode(!isEditMode)
          }}
          className="relative grid h-8 w-16 shrink-0 grid-cols-2 items-center border border-slate-300 bg-white p-0"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] bg-slate-900 transition-transform duration-150 ease-out ${isEditMode ? 'translate-x-full' : 'translate-x-0'}`}
          />
          <button
            type="button"
            aria-pressed={!isEditMode}
            aria-label="View"
            title="View"
            onClick={() => onToggleEditMode(false)}
            className={`relative grid h-6 w-6 place-items-center justify-self-center rounded-sm transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${!isEditMode ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={isEditMode}
            aria-label="Edit"
            title="Edit"
            onClick={() => onToggleEditMode(true)}
            className={`relative grid h-6 w-6 place-items-center justify-self-center rounded-sm transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${isEditMode ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

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
            onPointerEnter={() => {
              clearCloneHoverTimer()
              if (!cloneMenuPinned) setCloneMenuOpen(true)
            }}
            onPointerLeave={() => {
              clearCloneHoverTimer()
              if (!cloneMenuPinned) {
                cloneHoverTimerRef.current = setTimeout(() => setCloneMenuOpen(false), 140)
              }
            }}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !cloneMenuPinned) closeCloneMenu()
            }}
          >
            <button
              ref={cloneTriggerRef}
              type="button"
              onClick={() => {
                if (cloneMenuPinned) closeCloneMenu()
                else {
                  clearCloneHoverTimer()
                  setCloneMenuPinned(true)
                  setCloneMenuOpen(true)
                }
              }}
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
              <div
                ref={cloneMenuRef}
                id="clone-source-menu"
                role="menu"
                aria-label="Clone source"
                style={{ marginLeft: `${cloneHorizontalOffset}px` }}
                className="absolute left-1/2 top-full z-50 mt-1 min-w-36 -translate-x-1/2 border border-slate-300 bg-white p-1 shadow-lg"
              >
                {roles.filter(sourceRole => sourceRole !== role).map(sourceRole => (
                  <button
                    key={sourceRole}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onCloneFrom(sourceRole)
                      closeCloneMenu()
                    }}
                    className="block min-h-8 w-full px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                  >
                    From {roleLabels[sourceRole]}
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
              {!showWarningHighlights && <span className="absolute left-1/2 top-1/2 h-px w-[17px] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-current" />}
            </span>
          </button>
          <CurrentAndAllAction
            label="Save"
            onCurrent={onSaveWorkingDataset}
            onAll={onSaveAllWorkingDatasets}
            currentDisabled={isSaved}
            allDisabled={Object.values(saveStates).every(state => state === 'Saved')}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <CurrentAndAllAction
            label="Reset"
            onCurrent={handleResetDataset}
            onAll={onResetAllWorkingDatasets}
            currentDisabled={!lastSavedSnapshot}
            allDisabled={!Object.values(hasLastSavedByRole).some(Boolean)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <CurrentAndAllAction
            label="Clear"
            onCurrent={onClearDataset}
            onAll={onClearAllDatasets}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <button
            type="button"
            onClick={() => { void handleExportDataset() }}
            disabled={!lastSavedSnapshot}
            className={toolbarButton}
            title={lastSavedSnapshot ? 'Export Last Saved' : 'No Last Saved dataset to export'}
            aria-label="Export"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
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
            style={{ marginLeft: `${preparePanelHorizontalOffset}px`, ...(prepareDatasetMaxHeight === null ? {} : { maxHeight: `${prepareDatasetMaxHeight}px` }) }}
            className="relative flex max-h-[min(38rem,calc(100dvh-6rem))] w-[min(19rem,calc(100vw-2rem))] min-h-0 select-text flex-col gap-0.5 overflow-hidden border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-lg"
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
                  className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${productStatusClass}`}
                >
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${productStatusDotClass}`} />
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
                  const filterAction = isFiltered
                    ? `Clear ${roleLabels[datasetRole]} dataset filter`
                    : `Filter warnings and blockers to ${roleLabels[datasetRole]}`
                  return (
                    <button
                      key={datasetRole}
                      type="button"
                      aria-label={`${filterAction}: ${saveState}, ${datasetWarningCount} warnings, ${datasetBlockerCount} blockers`}
                      aria-pressed={isFiltered}
                      title={filterAction}
                      onClick={() => {
                        setDatasetRoleFilter(current => current === datasetRole ? null : datasetRole)
                        setExpandedWarningCategories(new Set())
                        setExpandedBlockerCategories(new Set())
                      }}
                      className={`grid h-7 w-full ${datasetSummaryColumns} items-center gap-2 rounded-sm pr-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${isFiltered ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0 truncate pl-3 text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</span>
                      <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs">
                        <span aria-hidden="true" className={datasetSaveStateDotClass(saveState, 'h-2 w-2')} />
                        <span>{saveState}</span>
                      </span>
                      <span className={`inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums ${datasetWarningCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                        <AlertTriangle className={`h-3 w-3 ${datasetWarningCount > 0 ? 'text-amber-700' : 'text-slate-400'}`} aria-hidden="true" />
                        {datasetWarningCount}
                      </span>
                      <span className={`inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums ${datasetBlockerCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        <CircleX className={`h-3 w-3 ${datasetBlockerCount > 0 ? 'text-rose-700' : 'text-slate-400'}`} aria-hidden="true" />
                        {datasetBlockerCount}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex min-h-0 shrink-0 flex-col gap-1 pt-0.5">
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
          <div className={`flex min-w-0 items-center gap-1.5 py-1 ${isEditMode ? 'border-b border-slate-200' : ''}`}>
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

          <div className={`flex min-w-0 items-center gap-1.5 py-1 ${isEditMode ? 'border-b border-slate-200' : ''}`}>
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

          <div className={`flex min-w-0 items-center gap-1.5 py-1 ${isEditMode ? 'border-b border-slate-200' : ''}`}>
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

          <div className={`flex min-w-0 items-center gap-1.5 py-1 ${isEditMode ? 'border-b border-slate-200' : ''}`}>
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

          <div className={`flex min-w-0 items-center gap-1.5 py-1 ${isEditMode ? 'border-b border-slate-200' : ''}`}>
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
