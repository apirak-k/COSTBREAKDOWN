import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronDown, ChevronRight, CircleX, X } from 'lucide-react'
import type { MasterDataRole } from '../../../core'
import type { MasterDataHandoffStatus } from '../../../core/calculations/master-data-handoff'
import type { MasterDataSaveState } from '../../../core/utils/master-data-effective'
import {
  areMasterDataDatasetsReady,
  countMasterDataWarningsByRole,
  countMasterDataQualityByRole,
  type MasterDataBlockerGroup,
  type MasterDataBlockerItem,
  type MasterDataWarningGroup,
  type MasterDataQualityItem
} from '../prepare-dataset'

interface MasterDataPrepareDatasetPopoverProps {
  isOpen: boolean
  requestMode: 'all-warnings' | null
  onClose: () => void
  saveStates: Record<MasterDataRole, MasterDataSaveState>
  handoff: MasterDataHandoffStatus
  productStatus: 'match' | 'mismatch' | 'not-set'
  warningGroups: MasterDataWarningGroup[]
  warningCount: number
  blockerGroups: MasterDataBlockerGroup[]
  blockerItems: MasterDataBlockerItem[]
  blockerCount: number
  onNavigateIssue: (item: MasterDataQualityItem) => void
  onPanelPointerEnter?: () => void
  onPanelPointerLeave?: () => void
  mockAction?: React.ReactNode
}

const roles: MasterDataRole[] = ['reference', 'current', 'custom']
const roleLabels: Record<MasterDataRole, string> = { reference: 'Reference', current: 'Current', custom: 'Custom' }
const datasetSummaryColumns = 'grid-cols-[minmax(0,1fr)_5rem_3.5rem_3.5rem]'
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const saveStateDotClass = (state: MasterDataSaveState) =>
  `h-2 w-2 shrink-0 rounded-full ring-[1.5px] ring-inset ${state === 'Saved' ? 'bg-emerald-500 ring-emerald-700/70' : 'bg-slate-400 ring-slate-600/70'}`

export const MasterDataPrepareDatasetPopover: React.FC<MasterDataPrepareDatasetPopoverProps> = ({
  isOpen,
  requestMode,
  onClose,
  saveStates,
  handoff,
  productStatus,
  warningGroups,
  warningCount,
  blockerGroups,
  blockerItems,
  blockerCount,
  onNavigateIssue,
  onPanelPointerEnter,
  onPanelPointerLeave,
  mockAction
}) => {
  const [expandedWarningCategories, setExpandedWarningCategories] = useState<Set<string>>(() => new Set())
  const [expandedBlockerCategories, setExpandedBlockerCategories] = useState<Set<string>>(() => new Set())
  const [datasetRoleFilter, setDatasetRoleFilter] = useState<MasterDataRole | null>(null)
  const [maxHeight, setMaxHeight] = useState<number | null>(null)
  const [maxVisibleDetailRows, setMaxVisibleDetailRows] = useState(3)
  const panelRef = useRef<HTMLDivElement>(null)
  const [horizontalOffset, setHorizontalOffset] = useState(0)
  const horizontalOffsetRef = useRef(0)
  const warningItems = warningGroups.flatMap(group => group.items)
  const warningCounts = countMasterDataWarningsByRole(warningItems)
  const blockerCounts = countMasterDataQualityByRole(blockerItems)
  const visibleWarningGroups = (datasetRoleFilter
    ? warningGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === datasetRoleFilter) }))
    : warningGroups).filter(group => group.items.length > 0)
  const visibleBlockerGroups = (datasetRoleFilter
    ? blockerGroups.map(group => ({ ...group, items: group.items.filter(item => item.role === datasetRoleFilter) }))
    : blockerGroups).filter(group => group.items.length > 0)
  const visibleWarningCount = datasetRoleFilter ? warningCounts[datasetRoleFilter] : warningCount
  const visibleBlockerCount = datasetRoleFilter ? blockerCounts[datasetRoleFilter] : blockerCount
  const filterLabel = datasetRoleFilter ? roleLabels[datasetRoleFilter] : 'All'
  const datasetsReady = areMasterDataDatasetsReady(handoff, blockerItems)
  const preparePortalRoot = typeof document === 'undefined' ? null : document.getElementById('header-prepare-dataset-portal-root')

  const updateHorizontalOffset = useCallback(() => {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = rect.left - horizontalOffsetRef.current
    const right = rect.right - horizontalOffsetRef.current
    const nextOffset = left < 8 ? 8 - left : right > window.innerWidth - 8 ? window.innerWidth - 8 - right : 0
    if (nextOffset === horizontalOffsetRef.current) return
    horizontalOffsetRef.current = nextOffset
    setHorizontalOffset(nextOffset)
  }, [])

  const resetUiState = useCallback(() => {
    setDatasetRoleFilter(null)
    setExpandedWarningCategories(new Set())
    setExpandedBlockerCategories(new Set())
  }, [])

  useEffect(() => {
    if (!isOpen) resetUiState()
  }, [isOpen, resetUiState])

  useEffect(() => {
    if (requestMode) resetUiState()
  }, [requestMode, resetUiState])

  useSafeLayoutEffect(() => {
    if (!isOpen) {
      setMaxHeight(null)
      horizontalOffsetRef.current = 0
      setHorizontalOffset(0)
      return
    }
    const updatePanelBounds = () => {
      const triggerBottom = document.getElementById('header-prepare-dataset-trigger')?.getBoundingClientRect().bottom
      if (triggerBottom != null) setMaxHeight(Math.max(0, Math.min(608, Math.floor(window.innerHeight - triggerBottom - 8))))
      updateHorizontalOffset()
    }
    updatePanelBounds()
    const layoutFrame = window.requestAnimationFrame(updatePanelBounds)
    window.addEventListener('resize', updatePanelBounds)
    return () => {
      window.cancelAnimationFrame(layoutFrame)
      window.removeEventListener('resize', updatePanelBounds)
    }
  }, [isOpen, updateHorizontalOffset])

  useSafeLayoutEffect(() => {
    if (!isOpen) {
      setMaxVisibleDetailRows(3)
      return
    }
    const panel = panelRef.current
    if (!panel) return
    const detailLists = [...panel.querySelectorAll<HTMLElement>('ul[aria-label$="locations"]')]
    if (detailLists.length === 0) {
      setMaxVisibleDetailRows(current => current === 3 ? current : 3)
      return
    }
    const visibleDetailHeight = detailLists.reduce((total, list) => total + list.clientHeight, 0)
    const fixedContentHeight = Math.max(0, panel.scrollHeight - visibleDetailHeight)
    const triggerBottom = document.getElementById('header-prepare-dataset-trigger')?.getBoundingClientRect().bottom ?? 0
    const availableHeight = maxHeight ?? Math.min(608, Math.floor(window.innerHeight - triggerBottom - 8))
    const rowsPerList = Math.floor(Math.max(0, availableHeight - fixedContentHeight) / (detailLists.length * 28))
    const nextMaxVisibleRows = Math.max(1, Math.min(3, rowsPerList))
    setMaxVisibleDetailRows(current => current === nextMaxVisibleRows ? current : nextMaxVisibleRows)
  }, [blockerGroups, expandedBlockerCategories, expandedWarningCategories, isOpen, maxHeight, warningGroups])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)
        || document.getElementById('header-prepare-dataset-trigger')?.contains(target)
        || document.getElementById('footer-warning-action')?.contains(target)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      document.getElementById('header-prepare-dataset-trigger')?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const renderIssueSection = (kind: 'warning' | 'blocker') => {
    const isWarning = kind === 'warning'
    const groups = isWarning ? visibleWarningGroups : visibleBlockerGroups
    const count = isWarning ? visibleWarningCount : visibleBlockerCount
    const expanded = isWarning ? expandedWarningCategories : expandedBlockerCategories
    const setExpanded = isWarning ? setExpandedWarningCategories : setExpandedBlockerCategories
    return (
      <section aria-labelledby={`prepare-dataset-${kind}-heading`} className="flex shrink-0 flex-col">
        <div className="grid h-6 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h3 id={`prepare-dataset-${kind}-heading`} className="truncate text-xs font-semibold text-slate-800">
            {isWarning ? 'Warnings' : 'Blockers'} {count}
          </h3>
          <span aria-label={`Dataset filter: ${filterLabel}`} className="text-right text-[11px] font-medium text-slate-500">{filterLabel}</span>
        </div>
        {groups.length > 0 && (
          <ul aria-label={isWarning ? 'Warning categories' : 'Blocker categories'} className="shrink-0 space-y-0.5">
            {groups.map(group => {
              const isExpanded = expanded.has(group.category)
              const label = group.category === 'missing-value'
                ? <>{group.label}<span aria-hidden="true" className="ml-1 font-bold text-rose-600">*</span></>
                : group.label
              return (
                <li key={group.category}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(current => {
                      const next = new Set(current)
                      if (next.has(group.category)) next.delete(group.category)
                      else next.add(group.category)
                      return next
                    })}
                    className={`grid min-h-7 w-full grid-cols-[minmax(0,1fr)_2rem_1.5rem] items-center gap-2 py-0.5 pl-3 text-left text-xs text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${isExpanded ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0 truncate">{label}</span>
                    <span className="w-full text-right font-mono tabular-nums text-slate-600">{group.items.length}</span>
                    <span className="grid h-6 w-6 place-items-center" aria-hidden="true">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </span>
                  </button>
                  {isExpanded && (
                    <ul
                      aria-label={`${group.label} locations`}
                      tabIndex={0}
                      style={{ maxHeight: `${Math.min(group.items.length, maxVisibleDetailRows) * 28}px` }}
                      className="mb-1 ml-8 min-h-0 overflow-y-auto overscroll-contain border-l border-slate-200 pl-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {group.items.map(item => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => { onNavigateIssue(item); onClose() }}
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

  if (!isOpen || !preparePortalRoot) return null

  return createPortal(
    <div
      ref={panelRef}
      id="prepare-dataset-panel"
      role="region"
      aria-label="Prepare Dataset status and warnings"
      onPointerEnter={onPanelPointerEnter}
      onPointerLeave={onPanelPointerLeave}
      style={{ transform: `translateX(${horizontalOffset}px)`, ...(maxHeight === null ? {} : { maxHeight: `${maxHeight}px` }) }}
      className="relative flex max-h-[min(38rem,calc(100dvh-6rem))] w-[min(19rem,calc(100vw-2rem))] min-h-0 select-text flex-col gap-0.5 overflow-hidden border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-lg"
    >
      <div className="flex min-h-8 shrink-0 items-center gap-1 border-b border-slate-200 pb-0.5 min-[360px]:gap-2 sm:gap-2.5">
        <h2 id="prepare-dataset-heading" className="shrink-0 text-xs font-semibold text-slate-700">Dataset</h2>
        <span
          aria-label={`Dataset ${datasetsReady ? 'Ready' : 'Incomplete'}`}
          title={datasetsReady ? 'Reference and Current are ready' : 'Reference or Current needs input'}
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${datasetsReady ? 'text-blue-700' : 'text-rose-700'}`}
        >
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${datasetsReady ? 'bg-blue-600' : 'bg-rose-500'}`} />
          {datasetsReady ? 'Ready' : 'Incomplete'}
        </span>
        <span aria-label={`Product ${productStatusLabel(productStatus)}`} className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${productDisplayClass(productStatus)}`}>
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${productDisplayDotClass(productStatus)}`} />
          Product {productStatusLabel(productStatus)}
        </span>
        <button
          type="button"
          onClick={() => { onClose(); document.getElementById('header-prepare-dataset-trigger')?.focus() }}
          aria-label="Close Prepare Dataset"
          className="ml-auto grid h-7 w-7 shrink-0 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div role="group" aria-label="Dataset filters, save states, warning counts, and blocker counts" className="grid shrink-0 grid-cols-1 divide-y divide-slate-100 border-b border-slate-200 py-0.5">
        {roles.map(datasetRole => {
          const saveState = saveStates[datasetRole]
          const warningCountForRole = warningCounts[datasetRole]
          const blockerCountForRole = blockerCounts[datasetRole]
          const active = datasetRoleFilter === datasetRole
          const filterAction = active ? `Clear ${roleLabels[datasetRole]} dataset filter` : `Filter warnings and blockers to ${roleLabels[datasetRole]}`
          return (
            <button
              key={datasetRole}
              type="button"
              aria-label={`${filterAction}: ${saveState}, ${warningCountForRole} warnings, ${blockerCountForRole} blockers`}
              aria-pressed={active}
              onClick={() => {
                setDatasetRoleFilter(current => current === datasetRole ? null : datasetRole)
                setExpandedWarningCategories(new Set())
                setExpandedBlockerCategories(new Set())
              }}
              className={`grid h-7 w-full ${datasetSummaryColumns} items-center gap-2 rounded-sm pr-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            >
              <span className="min-w-0 truncate pl-3 text-[11px] font-semibold text-slate-700">{roleLabels[datasetRole]}</span>
              <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs">
                <span aria-hidden="true" className={saveStateDotClass(saveState)} />
                <span>{saveState}</span>
              </span>
              <span className={`inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums ${warningCountForRole > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                <AlertTriangle className={`h-3 w-3 ${warningCountForRole > 0 ? 'text-amber-700' : 'text-slate-400'}`} aria-hidden="true" /> {warningCountForRole}
              </span>
              <span className={`inline-flex min-w-0 items-center justify-end gap-1 font-mono text-xs tabular-nums ${blockerCountForRole > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                <CircleX className={`h-3 w-3 ${blockerCountForRole > 0 ? 'text-rose-700' : 'text-slate-400'}`} aria-hidden="true" /> {blockerCountForRole}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex min-h-0 flex-col gap-1">
        {renderIssueSection('warning')}
        {renderIssueSection('blocker')}
      </div>
      {mockAction && <div className="shrink-0 border-t border-slate-200 pt-1">{mockAction}</div>}
    </div>,
    preparePortalRoot
  )
}

function productStatusLabel(status: 'match' | 'mismatch' | 'not-set'): string {
  return status === 'match' ? 'Match' : status === 'mismatch' ? 'Mismatch' : 'Not Set'
}

function productDisplayClass(status: 'match' | 'mismatch' | 'not-set'): string {
  return status === 'match' ? 'text-emerald-700' : status === 'mismatch' ? 'text-violet-700' : 'text-slate-600'
}

function productDisplayDotClass(status: 'match' | 'mismatch' | 'not-set'): string {
  return status === 'match' ? 'bg-emerald-600' : status === 'mismatch' ? 'bg-violet-500' : 'bg-slate-400'
}
