import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Copy,
  Eye,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Table2,
  Trash2,
  Upload
} from 'lucide-react'
import { formatNumber } from '../../../core'
import type { MasterDataRole, CostSnapshot, ProductMaster } from '../../../core'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import { getMasterDataNumericInputDomain } from '../../../core/utils/master-data-validation'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { NumericInput } from '../../../shared/ui/NumericInput'
import { masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataTextEditorClass } from './master-data-field-styles'
import { hasInvalidNumber } from '../table-validation'
import { downloadBlob } from '../../../services/excel/export'
import { useTransientInteraction } from '../../../shared/ui/transient-interactions'

interface MasterDataWorkspaceHeaderProps {
  product: ProductMaster
  snapshot: CostSnapshot
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
  onOpenImportModal: () => void
  onOpenSizingModal: () => void
  tableSelector: React.ReactNode
  tableView: 'bom' | 'wc' | 'routing' | 'all'
  showWarningHighlights: boolean
  onWarningHighlightsChange: (visible: boolean) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

const toolbarButton = 'grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-transparent text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const fieldInput = masterDataTextEditorClass
const metadataGroupDividerClass = "relative after:absolute after:-right-1.5 after:top-1 after:bottom-1 after:hidden after:w-px after:bg-slate-200 after:content-[''] xl:after:block"
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
  destructive?: boolean
  children: React.ReactNode
}

const CurrentAndAllAction: React.FC<CurrentAndAllActionProps> = ({
  label,
  onCurrent,
  onAll,
  destructive = false,
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

  useTransientInteraction(open, reason => closeMenu(reason === 'escape'))

  useEffect(() => () => clearHoverTimer(), [])
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
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
      <Tooltip label={label}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={menuId}
          aria-describedby={helpId}
          aria-keyshortcuts="Alt+ArrowDown"
          onClick={() => {
            closeMenu()
            onCurrent()
          }}
          onKeyDown={event => {
            if ((event.altKey && event.key === 'ArrowDown') || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault()
              openMenu(true)
            }
          }}
          className={`${toolbarButton} ${destructive ? 'hover:!bg-rose-50 hover:!text-rose-700' : ''}`}
        >
          {children}
        </button>
      </Tooltip>
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
          onClick={() => {
            closeMenu()
            onAll()
          }}
          className={`block min-h-8 w-full whitespace-nowrap px-2 text-left text-xs text-slate-800 ${destructive ? 'hover:bg-rose-50 hover:text-rose-700' : 'hover:bg-slate-100'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700`}
        >
          {label} all datasets
        </button>
      </div>
    </div>
  )
}

export const MasterDataWorkspaceHeader: React.FC<MasterDataWorkspaceHeaderProps> = ({
  product,
  snapshot,
  saveStates,
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
  onOpenImportModal,
  onOpenSizingModal,
  tableSelector,
  tableView,
  showWarningHighlights,
  onWarningHighlightsChange,
  searchQuery,
  onSearchQueryChange
}) => {
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false)
  const [cloneMenuPinned, setCloneMenuPinned] = useState(false)
  const cloneContainerRef = useRef<HTMLDivElement>(null)
  const cloneTriggerRef = useRef<HTMLButtonElement>(null)
  const cloneMenuRef = useRef<HTMLDivElement>(null)
  const cloneHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cloneHorizontalOffset = useCenteredPopoverOffset(cloneMenuOpen, cloneMenuRef)

  const roleLabel = roleLabels[role]
  const sellingPriceInvalid = hasInvalidNumber('sellingPrice', product.sellingPrice)
  const sgaPercentInvalid = hasInvalidNumber('sgaPercent', product.sgaPercent)
  const searchPlaceholder = tableView === 'all'
    ? 'Search all tables'
    : tableView === 'wc'
      ? 'Search Work Centers'
      : tableView === 'routing'
        ? 'Search Routing'
        : 'Search BOM'

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

  const toggleCloneMenu = () => {
    clearCloneHoverTimer()
    if (cloneMenuPinned) {
      closeCloneMenu()
      return
    }
    setCloneMenuPinned(true)
    setCloneMenuOpen(true)
  }

  useTransientInteraction(cloneMenuOpen, reason => closeCloneMenu(reason === 'escape'))

  useEffect(() => () => clearCloneHoverTimer(), [])

  useEffect(() => {
    closeCloneMenu()
  }, [role])

  useEffect(() => {
    if (!cloneMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!cloneContainerRef.current?.contains(event.target as Node)) closeCloneMenu()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [cloneMenuOpen])

  const handleExportDataset = async () => {
    const fileProductName = (snapshot.product.productName || '')
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
      const blob = await exportSnapshotToExcel(snapshot)
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
      blob = await exportSnapshotToExcel(snapshot)
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (!blob) {
        const { exportSnapshotToExcel } = await import('../../../services/excel/snapshot-export')
        blob = await exportSnapshotToExcel(snapshot)
      }
      downloadBlob(blob, filename)
    }
  }

  return (
    <section className="sticky top-0 z-40 overflow-visible border border-slate-300 bg-white" aria-label="Working dataset controls">
      <div role="toolbar" aria-label="Dataset and table actions" className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 bg-white px-1.5 py-1 xl:flex-nowrap">
        <div className="grid h-8 w-60 shrink-0 grid-cols-3 border border-slate-300 bg-white" role="group" aria-label="Master Data workspace">
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
                className={'relative flex h-full w-full min-w-0 items-center justify-center gap-1.5 px-1 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                  (selected ? 'text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
              >
                {selected && <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 bg-slate-900" />}
                <span className="relative z-10">{roleLabels[datasetRole]}</span>
                <span aria-hidden="true" className={`relative z-10 ${datasetSaveStateDotClass(state)}`} />
              </button>
            )
          })}
        </div>

        <Tooltip label={isEditMode ? 'Switch to View' : 'Switch to Edit'} wrapperClassName="relative grid h-8 w-16 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isEditMode}
            aria-label={isEditMode ? 'Switch to View' : 'Switch to Edit'}
            onClick={() => onToggleEditMode(!isEditMode)}
            className="relative grid h-8 w-16 grid-cols-2 items-center border border-slate-300 bg-white p-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] bg-slate-900 transition-transform duration-150 ease-out ${isEditMode ? 'translate-x-full' : 'translate-x-0'}`}
            />
            <span aria-hidden="true" className={`relative z-10 grid h-full w-full place-items-center transition-colors ${!isEditMode ? 'text-white' : 'text-slate-700'}`}>
              <Eye className="h-4 w-4" />
            </span>
            <span aria-hidden="true" className={`relative z-10 grid h-full w-full place-items-center transition-colors ${isEditMode ? 'text-white' : 'text-slate-700'}`}>
              <Pencil className="h-4 w-4" />
            </span>
          </button>
        </Tooltip>

        <div className="inline-flex shrink-0 items-center gap-1" role="group" aria-label="Master Data actions">
          <Tooltip label="Sizing">
            <button type="button" onClick={onOpenSizingModal} className={toolbarButton} aria-label="Sizing">
              <Table2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip label="Import">
            <button type="button" onClick={onOpenImportModal} className={toolbarButton} aria-label="Import">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <div
            ref={cloneContainerRef}
            className="relative shrink-0"
            onMouseEnter={() => {
              clearCloneHoverTimer()
              if (!cloneMenuPinned) cloneHoverTimerRef.current = setTimeout(() => setCloneMenuOpen(true), 120)
            }}
            onMouseLeave={() => {
              clearCloneHoverTimer()
              if (!cloneMenuPinned) cloneHoverTimerRef.current = setTimeout(() => {
                if (!cloneContainerRef.current?.contains(document.activeElement)) closeCloneMenu()
              }, 150)
            }}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeCloneMenu()
            }}
          >
            <Tooltip label="Clone from">
              <button
                ref={cloneTriggerRef}
                type="button"
                onClick={toggleCloneMenu}
                aria-expanded={cloneMenuOpen}
                aria-haspopup="menu"
                aria-controls="clone-source-menu"
                aria-label="Clone from"
                className={toolbarButton}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            {cloneMenuOpen && (
              <div
                ref={cloneMenuRef}
                id="clone-source-menu"
                role="menu"
                aria-label="Clone source"
                style={{ marginLeft: `${cloneHorizontalOffset}px` }}
                className="absolute left-1/2 top-full z-50 mt-1 w-max min-w-8 max-w-[calc(100vw-1rem)] -translate-x-1/2 border border-slate-300 bg-white p-1 shadow-lg"
                onMouseEnter={clearCloneHoverTimer}
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
                    {roleLabels[sourceRole]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Tooltip label={showWarningHighlights ? 'Hide warnings' : 'Show warnings'}>
            <button
              type="button"
              aria-pressed={showWarningHighlights}
              onClick={() => onWarningHighlightsChange(!showWarningHighlights)}
              className={toolbarButton}
              aria-label={showWarningHighlights ? 'Hide warnings' : 'Show warnings'}
            >
              <span aria-hidden="true" className="relative grid h-[18px] w-[18px] place-items-center">
                <span className="font-mono text-base font-bold leading-none">!</span>
                {!showWarningHighlights && <span className="absolute left-1/2 top-1/2 h-px w-[17px] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-current" />}
              </span>
            </button>
          </Tooltip>
          <CurrentAndAllAction
            label="Save"
            onCurrent={onSaveWorkingDataset}
            onAll={onSaveAllWorkingDatasets}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <CurrentAndAllAction
            label="Reset"
            onCurrent={onResetWorkingDataset}
            onAll={onResetAllWorkingDatasets}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <CurrentAndAllAction
            label="Clear"
            onCurrent={onClearDataset}
            onAll={onClearAllDatasets}
            destructive
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </CurrentAndAllAction>
          <Tooltip label="Export">
            <button
              type="button"
              onClick={() => { void handleExportDataset() }}
              className={toolbarButton}
              aria-label="Export"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
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

      </div>

      <div className="px-2 py-1.5">
        <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 xl:grid-cols-[minmax(8rem,2fr)_repeat(3,minmax(8rem,1fr))_minmax(8rem,2fr)]">
          <div className={`flex min-w-0 items-center gap-1.5 ${metadataGroupDividerClass}`}>
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
                <span className="flex h-8 w-full min-w-0 items-center truncate rounded-sm border border-transparent px-2 text-xs text-slate-950" title={product.productName || undefined}>
                  {product.productName || ''}
                </span>
              )}
            </dd>
          </div>

          <div className={`flex min-w-0 items-center gap-1.5 ${metadataGroupDividerClass}`}>
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
                <span className="flex h-8 w-full min-w-0 items-center truncate rounded-sm border border-transparent px-2 font-mono text-xs text-slate-950">{product.uom || ''}</span>
              )}
            </dd>
          </div>

          <div className={`flex min-w-0 items-center gap-1.5 ${metadataGroupDividerClass}`}>
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">Selling Price (THB) :</dt>
            <dd className="min-w-0 flex-1">
              {isEditMode ? (
                <NumericInput
                  value={product.sellingPrice}
                  onValueChange={sellingPrice => onUpdateProduct({ ...product, sellingPrice })}
                  {...getMasterDataNumericInputDomain('sellingPrice')}
                  aria-label="Selling Price (THB)"
                  aria-invalid={sellingPriceInvalid}
                  className={`${fieldInput} font-mono tabular-nums text-right ${showWarningHighlights && sellingPriceInvalid ? masterDataIssueEditorClass : ''}`}
                />
              ) : (
                <span aria-invalid={sellingPriceInvalid} className={`flex h-8 w-full min-w-0 items-center justify-end truncate rounded-sm border border-transparent px-2 text-right font-mono text-xs tabular-nums text-slate-950 ${showWarningHighlights && sellingPriceInvalid ? masterDataIssueDisplayClass : ''}`}>
                  {product.sellingPrice == null ? '' : formatNumber(product.sellingPrice)}
                </span>
              )}
            </dd>
          </div>

          <div className={`flex min-w-0 items-center gap-1.5 ${metadataGroupDividerClass}`}>
            <dt className="shrink-0 whitespace-nowrap font-sans text-[11px] font-medium tracking-wide text-slate-600">SG&amp;A :</dt>
            <dd className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
              {isEditMode ? (
                <NumericInput
                  value={product.sgaPercent}
                  onValueChange={sgaPercent => onUpdateProduct({ ...product, sgaPercent })}
                  {...getMasterDataNumericInputDomain('sgaPercent')}
                  aria-label="SG&A"
                  aria-invalid={sgaPercentInvalid}
                  className={`${fieldInput} font-mono tabular-nums text-right ${showWarningHighlights && sgaPercentInvalid ? masterDataIssueEditorClass : ''}`}
                />
              ) : (
                <span aria-invalid={sgaPercentInvalid} className={`flex h-8 w-full min-w-0 items-center justify-end truncate rounded-sm border border-transparent px-2 text-right font-mono text-xs tabular-nums text-slate-950 ${showWarningHighlights && sgaPercentInvalid ? masterDataIssueDisplayClass : ''}`}>
                  {product.sgaPercent == null ? '' : formatNumber(product.sgaPercent)}
                </span>
              )}
              <span aria-hidden="true" className="text-xs text-slate-600">%</span>
            </dd>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
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
                <span className="flex h-8 w-full min-w-0 items-center truncate rounded-sm border border-transparent px-2 text-xs text-slate-800" title={snapshot.remark || ''}>{snapshot.remark || ''}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
