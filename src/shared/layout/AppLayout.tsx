import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Navbar, type CBDReorderUndoRedo, type SimulationUndoRedo } from './Navbar'
import { useAppStore } from '../../state'
import { formatNumber } from '../../core'
import { normalizeProductIdentityValue } from '../../core/utils/master-data-effective'
import { formatProductIdentityForDisplay, resolveProductComparisonDisplayStatus } from './header-product-context'
import { AlertTriangle, CircleX } from 'lucide-react'
import {
  areMasterDataDatasetsReady,
  buildMasterDataBlockerItems,
  buildMasterDataWarningItems,
  countMasterDataQualityByRole,
  groupMasterDataBlockers,
  groupMasterDataWarnings,
  MASTER_DATA_WARNING_CATEGORY_DEFINITIONS
} from '../../features/master-data/prepare-dataset'
import { MasterDataPrepareDatasetPopover } from '../../features/master-data/components/MasterDataPrepareDatasetPopover'
import { getDatasetSaveState } from '../../core/utils/master-data-effective'
import type { MasterDataQualityItem } from '../../features/master-data/prepare-dataset'
import {
  clearTemporarySpreadsheetCellFocus,
  dismissTopmostTransientInteraction,
  dismissTransientInteractions,
  isSafeWorkspaceDismissTarget
} from '../ui/transient-interactions'
import { installSelectAllOnFirstFocus } from '../ui/select-all-on-first-focus'

const masterDataRoles = ['reference', 'current', 'custom'] as const

interface FooterTooltipProps {
  id: string
  children: ReactNode
  content: ReactNode
}

const FooterTooltip: React.FC<FooterTooltipProps> = ({ id, children, content }) => {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }, [])
  const positionTooltip = useCallback(() => {
    const wrapperElement = wrapperRef.current
    if (!wrapperElement) return
    const wrapper = wrapperElement.getBoundingClientRect()
    const tooltipElement = wrapperElement.querySelector<HTMLElement>('[role="tooltip"]')
    if (!tooltipElement) return
    const previousDisplay = tooltipElement.style.display
    const previousVisibility = tooltipElement.style.visibility
    tooltipElement.style.display = 'block'
    tooltipElement.style.visibility = 'hidden'
    const tooltipRect = tooltipElement.getBoundingClientRect()
    tooltipElement.style.display = previousDisplay
    tooltipElement.style.visibility = previousVisibility
    const tooltipWidth = tooltipRect.width || Math.min(448, window.innerWidth - 16)
    const tooltipHeight = tooltipRect.height
    const preferredLeft = wrapper.left + (wrapper.width - tooltipWidth) / 2
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - tooltipWidth - 8))
    const footerTop = wrapperElement.closest('footer')?.getBoundingClientRect().top ?? wrapper.top
    setPosition({ left, top: Math.max(8, footerTop - tooltipHeight - 8) })
  }, [])

  useEffect(() => {
    if (visible) window.addEventListener('resize', positionTooltip)
    return () => {
      window.removeEventListener('resize', positionTooltip)
      clearHoverTimer()
    }
  }, [clearHoverTimer, positionTooltip, visible])

  const handlePointerEnter = () => {
    hoveredRef.current = true
    clearHoverTimer()
    hoverTimerRef.current = window.setTimeout(() => {
      positionTooltip()
      setVisible(true)
    }, 275)
  }
  const handlePointerLeave = () => {
    hoveredRef.current = false
    clearHoverTimer()
    if (!focusedRef.current) setVisible(false)
  }
  const handleFocus = () => {
    focusedRef.current = true
    clearHoverTimer()
    positionTooltip()
    setVisible(true)
  }
  const handleBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    focusedRef.current = false
    if (hoveredRef.current) return
    clearHoverTimer()
    setVisible(false)
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape') {
      clearHoverTimer()
      focusedRef.current = false
      setVisible(false)
    }
  }

  if (content === null || content === undefined) return <>{children}</>

  return (
    <span
      ref={wrapperRef}
      className="group relative inline-flex"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        style={position === null ? undefined : { left: `${position.left}px`, top: `${position.top}px` }}
        className={`pointer-events-none fixed z-50 ${visible ? 'block' : 'hidden'} w-max max-w-[min(28rem,calc(100vw-1rem))] border border-slate-300 bg-white p-2 text-xs leading-4 text-slate-800 shadow-md`}
      >
        {content}
      </span>
    </span>
  )
}

interface AppLayoutProps {
  children: ReactNode
  onNavigatePrepareDatasetIssue?: (item: MasterDataQualityItem) => void
  cbdReorderUndoRedo?: CBDReorderUndoRedo
  simulationUndoRedo?: SimulationUndoRedo
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onNavigatePrepareDatasetIssue = () => undefined, cbdReorderUndoRedo, simulationUndoRedo }) => {
  const {
    activeTab,
    snapshotPair,
    referenceCurrentComparison,
    masterDataHandoff,
    masterDataSnapshots,
    masterDataLastSavedSnapshots,
    masterDataPrepareDatasetOpen,
    masterDataPrepareDatasetRequestMode,
    closeMasterDataPrepareDataset,
    requestMasterDataPrepareDataset,
    previewMasterDataPrepareDataset,
    scheduleDismissMasterDataPrepareDatasetPreview,
    loadDevelopmentMockData,
    setMasterDataRole
  } = useAppStore()

  useEffect(() => installSelectAllOnFirstFocus(document), [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dismissTopmostTransientInteraction('escape')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return

      const activeElement = document.activeElement
      const isFocusedField = activeElement instanceof HTMLElement
        && activeElement.matches('input,select,textarea,[contenteditable="true"],[data-grid-cell="true"]')
      if (isFocusedField) {
        event.preventDefault()
        event.stopImmediatePropagation()
        activeElement.blur()
      }
      clearTemporarySpreadsheetCellFocus()
    }

    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [])

  const handleWorkspacePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!isSafeWorkspaceDismissTarget(event.target)) return
    dismissTransientInteractions('workspace')
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement
      && activeElement.matches('input,select,textarea,[contenteditable="true"],[data-grid-cell="true"]')) {
      activeElement.blur()
    }
    clearTemporarySpreadsheetCellFocus()
  }, [])

  const warningItems = buildMasterDataWarningItems(masterDataSnapshots)
  const blockerItems = buildMasterDataBlockerItems(masterDataSnapshots)
  const warningCount = warningItems.length
  const blockerCounts = countMasterDataQualityByRole(blockerItems)
  const warningGroups = groupMasterDataWarnings(warningItems)
  const blockerGroups = groupMasterDataBlockers(blockerItems)
  const saveStates = Object.fromEntries(masterDataRoles.map(role => [
    role,
    getDatasetSaveState(masterDataSnapshots[role], masterDataLastSavedSnapshots[role])
  ])) as Record<(typeof masterDataRoles)[number], ReturnType<typeof getDatasetSaveState>>
  const warningBreakdown = MASTER_DATA_WARNING_CATEGORY_DEFINITIONS
    .map(({ category, label }) => ({
      label,
      count: warningItems.filter(item => item.category === category).length
    }))
    .filter(item => item.count > 0)
  const datasetReadiness = [
    {
      label: 'Reference',
      ready: masterDataHandoff.referenceReady && blockerCounts.reference === 0,
      blockerCount: blockerCounts.reference
    },
    {
      label: 'Current',
      ready: masterDataHandoff.currentReady && blockerCounts.current === 0,
      blockerCount: blockerCounts.current
    }
  ]
  const isCostBreakdown = activeTab === 'breakdown'
  const isSimulation = activeTab === 'simulation'
  const datasetsReady = areMasterDataDatasetsReady(masterDataHandoff, blockerItems)
  const productDisplayStatus = resolveProductComparisonDisplayStatus(
    snapshotPair.reference.product,
    snapshotPair.current.product
  )
  const productDisplayLabel = productDisplayStatus === 'not-set'
    ? 'Product Not Set'
    : productDisplayStatus === 'mismatch'
      ? 'Product Mismatch'
      : 'Product Match'
  const handleLoadMockData = async (fixture: 'complete' | 'incomplete') => {
    if (!import.meta.env.DEV) return
    const fixtures = await import('../../features/master-data/fixtures/synthetic-review-data')
    loadDevelopmentMockData(fixture === 'complete'
      ? fixtures.createCompleteMasterDataMockPair()
      : fixtures.createIncompleteMasterDataMockPair())
    setMasterDataRole('current')
  }
  const mockAction = import.meta.env.DEV ? (
    <div role="group" aria-label="Development mock datasets" className="grid w-full grid-cols-2 divide-x divide-slate-200 text-[11px]">
      <button type="button" onClick={() => { void handleLoadMockData('complete') }} className="min-h-7 w-full px-1.5 text-center font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Complete Mock</button>
      <button type="button" onClick={() => { void handleLoadMockData('incomplete') }} className="min-h-7 w-full px-1.5 text-center font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Incomplete Mock</button>
    </div>
  ) : undefined
  const referenceStandardCost = referenceCurrentComparison.referenceCost.total
  const currentStandardCost = referenceCurrentComparison.currentCost.total
  const totalGap = referenceCurrentComparison.totalGap
  const hasNetGap = totalGap !== null && Number.isFinite(totalGap)
  const formatCost = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
  const formattedGap = hasNetGap ? `${totalGap > 0 ? '+' : ''}${formatNumber(totalGap, 2)}` : '—'
  const referenceUom = snapshotPair.reference.product.uom?.trim() ?? ''
  const currentUom = snapshotPair.current.product.uom?.trim() ?? ''
  const costUnit = !referenceUom && !currentUom
    ? 'Unit'
    : !referenceUom
      ? currentUom
      : !currentUom || normalizeProductIdentityValue(referenceUom) === normalizeProductIdentityValue(currentUom)
        ? referenceUom
        : 'Unit'
  const gapTextClass = !hasNetGap
    ? 'text-slate-500'
    : totalGap > 0
      ? 'text-rose-300'
      : totalGap < 0
      ? 'text-emerald-300'
      : 'text-slate-300'
  const productStatusClass = productDisplayStatus === 'match'
    ? 'text-emerald-300'
    : productDisplayStatus === 'mismatch'
      ? 'text-violet-300'
      : 'text-slate-300'
  const productDotClass = productDisplayStatus === 'match'
    ? 'bg-emerald-400'
    : productDisplayStatus === 'mismatch'
      ? 'bg-violet-400'
      : 'bg-slate-400'

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-slate-100/70 font-sans text-[13px] text-slate-900 antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar cbdReorderUndoRedo={cbdReorderUndoRedo} simulationUndoRedo={simulationUndoRedo} />
      <MasterDataPrepareDatasetPopover
        isOpen={masterDataPrepareDatasetOpen}
        requestMode={masterDataPrepareDatasetRequestMode}
        onClose={closeMasterDataPrepareDataset}
        saveStates={saveStates}
        handoff={masterDataHandoff}
        productStatus={productDisplayStatus}
        warningGroups={warningGroups}
        warningCount={warningCount}
        blockerGroups={blockerGroups}
        blockerItems={blockerItems}
        blockerCount={blockerItems.length}
        onNavigateIssue={onNavigatePrepareDatasetIssue}
        onPanelPointerEnter={previewMasterDataPrepareDataset}
        onPanelPointerLeave={scheduleDismissMasterDataPrepareDatasetPreview}
        mockAction={mockAction}
      />
      <main
        id="main-content"
        tabIndex={-1}
        onPointerDownCapture={handleWorkspacePointerDown}
        className={isCostBreakdown
          ? 'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]'
          : `min-h-0 min-w-0 flex-1 overflow-y-auto ${activeTab === 'master' ? 'pt-0 pb-3 [scrollbar-gutter:stable]' : 'py-3'} ${isSimulation ? 'xl:flex xl:overflow-hidden xl:py-0' : ''}`}
      >
        <div className={`app-workspace-frame ${isCostBreakdown ? 'min-h-full min-w-0' : isSimulation ? 'xl:flex xl:h-full xl:min-h-0 xl:min-w-0 xl:flex-col' : ''}`}>{children}</div>
      </main>
      <footer aria-label="Dataset and comparison status" className="w-full shrink-0 border-t border-slate-800 bg-slate-900 py-2 font-sans text-[11px] text-slate-400">
        <div className="app-workspace-frame flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 xl:flex-nowrap">
          <div role="group" aria-label="Reference and Current dataset structure" className="flex min-w-0 flex-wrap cursor-default select-none items-center gap-x-3 gap-y-1 tabular-nums">
            <span aria-label={`Reference dataset: ${snapshotPair.reference.bom.length} BOM items, ${snapshotPair.reference.rates.length} work centers, ${snapshotPair.reference.routing.length} routing operations`} className="whitespace-nowrap">
              <span className="mr-1 font-bold text-slate-300">REF</span>
              BOM {snapshotPair.reference.bom.length} · WC {snapshotPair.reference.rates.length} · RTG {snapshotPair.reference.routing.length}
            </span>
            <span className="hidden text-slate-700 sm:inline" aria-hidden="true">|</span>
            <span aria-label={`Current dataset: ${snapshotPair.current.bom.length} BOM items, ${snapshotPair.current.rates.length} work centers, ${snapshotPair.current.routing.length} routing operations`} className="whitespace-nowrap">
              <span className="mr-1 font-bold text-slate-300">CUR</span>
              BOM {snapshotPair.current.bom.length} · WC {snapshotPair.current.rates.length} · RTG {snapshotPair.current.routing.length}
            </span>
          </div>
          <div role="group" aria-label="Dataset readiness, product comparison, and warnings" className="flex min-w-0 flex-wrap cursor-default select-none items-center gap-x-3 gap-y-1">
            <FooterTooltip
              id="footer-dataset-status-tooltip"
              content={(
                <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  {datasetReadiness.map(({ label, blockerCount }) => (
                    <React.Fragment key={`${label}-blockers`}>
                      <span>{label}</span>
                      <span className={`inline-flex items-center justify-end gap-1 font-mono tabular-nums ${blockerCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        <CircleX className={`h-3 w-3 ${blockerCount > 0 ? 'text-rose-700' : 'text-slate-400'}`} aria-hidden="true" /> {blockerCount}
                      </span>
                    </React.Fragment>
                  ))}
                </span>
              )}
            >
              <span
                tabIndex={0}
                aria-describedby="footer-dataset-status-tooltip"
                aria-label={`Datasets ${datasetsReady ? 'Ready' : 'Incomplete'}`}
                className="flex min-h-7 cursor-default select-none items-center gap-1.5 whitespace-nowrap rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${datasetsReady ? 'bg-blue-400' : 'bg-rose-400'}`} />
                <span className={`font-semibold ${datasetsReady ? 'text-blue-300' : 'text-rose-300'}`}>
                  Datasets {datasetsReady ? 'Ready' : 'Incomplete'}
                </span>
              </span>
            </FooterTooltip>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <FooterTooltip
              id="footer-product-status-tooltip"
              content={(
                <span className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-left">
                  <span className="text-slate-600">Reference</span>
                  <span className="min-w-0 break-words">{formatProductIdentityForDisplay(snapshotPair.reference.product)}</span>
                  <span className="text-slate-600">Current</span>
                  <span className="min-w-0 break-words">{formatProductIdentityForDisplay(snapshotPair.current.product)}</span>
                </span>
              )}
            >
              <span
                tabIndex={0}
                aria-describedby="footer-product-status-tooltip"
                aria-label={productDisplayLabel}
                className={`inline-flex min-h-7 cursor-default select-none items-center gap-1.5 whitespace-nowrap rounded-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${productStatusClass}`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${productDotClass}`} />
                {productDisplayLabel}
              </span>
            </FooterTooltip>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <FooterTooltip
              id="footer-warning-tooltip"
              content={warningBreakdown.length > 0 ? (
                <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  {warningBreakdown.map(({ label, count }) => (
                    <React.Fragment key={label}>
                      <span>{label}</span>
                      <span className="text-right font-mono tabular-nums">{count}</span>
                    </React.Fragment>
                  ))}
                </span>
              ) : null}
            >
              <button
                id="footer-warning-action"
                type="button"
                onClick={() => requestMasterDataPrepareDataset('all-warnings')}
                aria-expanded={masterDataPrepareDatasetOpen}
                aria-describedby={warningBreakdown.length > 0 ? 'footer-warning-tooltip' : undefined}
                aria-label={`Toggle Prepare Dataset showing ${warningCount} warnings`}
                className={`inline-flex min-h-7 cursor-pointer items-center gap-1 whitespace-nowrap rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${warningCount > 0 ? 'text-amber-300 hover:text-amber-200' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <AlertTriangle className={`h-3.5 w-3.5 ${warningCount > 0 ? 'text-amber-300' : 'text-slate-400'}`} aria-hidden="true" />
                <span className="font-mono tabular-nums">{warningCount}</span>
              </button>
            </FooterTooltip>
          </div>
          <div role="group" aria-label={`Full Reference and Current standard costs and net gap in THB/${costUnit}`} className="flex min-w-0 flex-wrap cursor-default select-none items-center gap-x-3 gap-y-1 font-mono tabular-nums">
            <span className="whitespace-nowrap"><span className="mr-1 font-sans font-bold text-slate-300">REF STD</span>{formatCost(referenceStandardCost)}</span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span className="whitespace-nowrap"><span className="mr-1 font-sans font-bold text-slate-300">CUR STD</span>{formatCost(currentStandardCost)}</span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="font-sans font-bold text-slate-300">NET GAP</span>
              <span className={`font-semibold ${gapTextClass}`}>{formattedGap}</span>
            </span>
            <span className="ml-2 max-[359px]:basis-full max-[359px]:ml-0 max-[359px]:text-right cursor-default select-none font-sans font-bold text-slate-300">THB/{costUnit}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
