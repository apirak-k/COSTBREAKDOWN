import React, { useEffect, useRef, useState } from 'react'
import { Info, Redo2, Undo2 } from 'lucide-react'
import { useAppStore } from '../../state'
import { resolveHeaderProductContext } from './header-product-context'
import { Tooltip } from '../ui/Tooltip'
import { HeaderValue } from './HeaderValue'
import { HelpDialog, type HelpSectionId } from './HelpDialog'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'simulation', label: 'Simulation' },
] as const

const utilityButton = 'grid h-8 w-8 shrink-0 place-items-center text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-default disabled:opacity-50 disabled:text-slate-600 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'

export interface CBDReorderUndoRedo {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

export interface SimulationUndoRedo {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

interface NavbarProps {
  cbdReorderUndoRedo?: CBDReorderUndoRedo
  simulationUndoRedo?: SimulationUndoRedo
}

export const Navbar: React.FC<NavbarProps> = ({ cbdReorderUndoRedo, simulationUndoRedo }) => {
  const {
    activeTab,
    setActiveTab,
    snapshotPair,
    canUndoMasterDataEdit,
    canRedoMasterDataEdit,
    undoMasterDataEdit,
    redoMasterDataEdit,
    masterDataPrepareDatasetOpen,
    masterDataPrepareDatasetPinned,
    masterDataPrepareDatasetRequested,
    consumeMasterDataPrepareDatasetRequest,
    toggleMasterDataPrepareDataset,
    previewMasterDataPrepareDataset,
    scheduleDismissMasterDataPrepareDatasetPreview
  } = useAppStore()
  const prepareDatasetTriggerRef = useRef<HTMLButtonElement>(null)
  const helpTriggerRootRef = useRef<HTMLDivElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const helpOpenTimerRef = useRef<number | null>(null)
  const helpDismissTimerRef = useRef<number | null>(null)
  const suppressHelpPreviewRef = useRef(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpPinned, setHelpPinned] = useState(false)
  const [helpTooltipDismissSignal, setHelpTooltipDismissSignal] = useState(0)

  const isMasterData = activeTab === 'master'
  const isCostBreakdown = activeTab === 'breakdown'
  const isSimulation = activeTab === 'simulation'
  const canUndo = isMasterData
    ? canUndoMasterDataEdit
    : isCostBreakdown
      ? Boolean(cbdReorderUndoRedo?.canUndo)
      : isSimulation && Boolean(simulationUndoRedo?.canUndo)
  const canRedo = isMasterData
    ? canRedoMasterDataEdit
    : isCostBreakdown
      ? Boolean(cbdReorderUndoRedo?.canRedo)
      : isSimulation && Boolean(simulationUndoRedo?.canRedo)
  const handleUndo = () => isMasterData
    ? undoMasterDataEdit()
    : isCostBreakdown
      ? cbdReorderUndoRedo?.undo()
      : isSimulation ? simulationUndoRedo?.undo() : undefined
  const handleRedo = () => isMasterData
    ? redoMasterDataEdit()
    : isCostBreakdown
      ? cbdReorderUndoRedo?.redo()
      : isSimulation ? simulationUndoRedo?.redo() : undefined
  const productContext = resolveHeaderProductContext(snapshotPair.current.product)
  const currentProductName = snapshotPair.current.product.productName?.trim() ?? ''
  const currentProductUom = snapshotPair.current.product.uom?.trim() ?? ''
  const helpSectionForPage: HelpSectionId = activeTab === 'master'
    ? 'master-data'
    : activeTab === 'breakdown'
      ? 'cost-breakdown'
      : activeTab === 'simulation'
        ? 'simulation'
        : 'workflow'

  const closeHelp = () => {
    const panel = document.getElementById('app-help-dialog')
    const focusHelpButton = panel?.contains(document.activeElement) || document.activeElement === helpButtonRef.current
    if (helpOpenTimerRef.current !== null) window.clearTimeout(helpOpenTimerRef.current)
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
    helpOpenTimerRef.current = null
    helpDismissTimerRef.current = null
    suppressHelpPreviewRef.current = true
    setHelpTooltipDismissSignal(signal => signal + 1)
    setHelpOpen(false)
    setHelpPinned(false)
    if (focusHelpButton) window.requestAnimationFrame(() => helpButtonRef.current?.focus({ preventScroll: true }))
  }

  const scheduleHelpDismiss = () => {
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
    helpDismissTimerRef.current = window.setTimeout(() => {
      if (!helpPinned) setHelpOpen(false)
      helpDismissTimerRef.current = null
    }, 300)
  }

  const handleHelpTriggerPointerEnter = () => {
    if (helpOpenTimerRef.current !== null) window.clearTimeout(helpOpenTimerRef.current)
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
    helpOpenTimerRef.current = null
    helpDismissTimerRef.current = null
    suppressHelpPreviewRef.current = false
    if (helpOpen || helpPinned) return
    helpOpenTimerRef.current = window.setTimeout(() => {
      if (!suppressHelpPreviewRef.current) setHelpOpen(true)
      helpOpenTimerRef.current = null
    }, 650)
  }

  const handleHelpTriggerPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (helpOpenTimerRef.current !== null) window.clearTimeout(helpOpenTimerRef.current)
    helpOpenTimerRef.current = null
    const target = event.relatedTarget
    const panel = document.getElementById('app-help-dialog')
    if (target instanceof Node && (helpTriggerRootRef.current?.contains(target) || panel?.contains(target))) return
    if (helpOpen) scheduleHelpDismiss()
  }

  const handleHelpPanelPointerEnter = () => {
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
    helpDismissTimerRef.current = null
  }

  const handleHelpButtonClick = () => {
    if (helpOpenTimerRef.current !== null) window.clearTimeout(helpOpenTimerRef.current)
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
    helpOpenTimerRef.current = null
    helpDismissTimerRef.current = null
    if (helpPinned) {
      suppressHelpPreviewRef.current = true
      setHelpTooltipDismissSignal(signal => signal + 1)
      setHelpPinned(false)
      setHelpOpen(false)
      return
    }
    suppressHelpPreviewRef.current = false
    setHelpPinned(true)
    setHelpOpen(true)
  }

  useEffect(() => () => {
    if (helpOpenTimerRef.current !== null) window.clearTimeout(helpOpenTimerRef.current)
    if (helpDismissTimerRef.current !== null) window.clearTimeout(helpDismissTimerRef.current)
  }, [])

  useEffect(() => {
    if (masterDataPrepareDatasetRequested) {
      prepareDatasetTriggerRef.current?.focus()
      consumeMasterDataPrepareDatasetRequest()
    }
  }, [masterDataPrepareDatasetRequested, consumeMasterDataPrepareDatasetRequest])

  return (
    <header className="sticky top-0 z-50 shrink-0 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="app-workspace-frame">
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex min-w-0 items-baseline gap-x-2.5 font-sans">
              <span className="min-w-0 truncate text-base font-bold tracking-tight text-slate-100">COSTBREAKDOWN</span>
              <span
                role="group"
                aria-label={`Product context: PRODUCT: ${productContext}`}
                title={`PRODUCT: ${productContext}`}
                className="inline-flex min-w-0 flex-1 items-baseline gap-1 overflow-hidden text-[11px] font-normal text-slate-300"
              >
                <span className="shrink-0 text-[10px] font-medium tracking-wide text-slate-400">PRODUCT:</span>
                {currentProductName ? (
                  <>
                    <span className="min-w-0 truncate font-semibold text-slate-100">{currentProductName}</span>
                    <span className="shrink-0 text-slate-400">({currentProductUom || 'UOM not set'})</span>
                  </>
                ) : (
                  <span className="min-w-0 truncate font-medium text-slate-200">{productContext}</span>
                )}
              </span>
            </div>
          </div>

          <nav aria-label="Main navigation" className="col-span-2 row-start-2 grid min-w-0 grid-cols-3 items-center justify-center gap-0.5 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex h-10 w-full min-w-0 items-center justify-center px-2.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-400 ${
                    isActive ? 'font-semibold text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {isActive && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 bg-slate-100" />}
                </button>
              )
            })}
          </nav>

          <div role="group" aria-label="Workspace utilities" className="flex min-w-0 items-center justify-end gap-0.5 lg:col-start-3 lg:row-start-1">
            <HeaderValue />
            <Tooltip label="Undo">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className={utilityButton}
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Redo">
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className={utilityButton}
              >
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <div
              ref={helpTriggerRootRef}
              id="header-help-trigger-root"
              className="inline-flex shrink-0"
              onPointerEnter={handleHelpTriggerPointerEnter}
              onPointerLeave={handleHelpTriggerPointerLeave}
            >
              <Tooltip label="Help" showOnFocus={false} dismissSignal={helpTooltipDismissSignal}>
                <button
                  ref={helpButtonRef}
                  id="header-help-trigger"
                  type="button"
                  onClick={handleHelpButtonClick}
                  aria-label="Help"
                  aria-haspopup="dialog"
                  aria-expanded={helpOpen}
                  aria-pressed={helpPinned}
                  aria-controls="app-help-dialog"
                  className={utilityButton}
                >
                  ?
                </button>
              </Tooltip>
            </div>
            <div
              className="relative ml-1 flex shrink-0 items-center"
              onPointerEnter={previewMasterDataPrepareDataset}
              onPointerLeave={event => {
                const relatedTarget = event.relatedTarget
                const panelRoot = document.getElementById('header-prepare-dataset-portal-root')
                if (relatedTarget instanceof Node && (event.currentTarget.contains(relatedTarget) || panelRoot?.contains(relatedTarget))) return
                scheduleDismissMasterDataPrepareDatasetPreview()
              }}
              onFocusCapture={event => {
                const relatedTarget = event.relatedTarget
                if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
                previewMasterDataPrepareDataset()
              }}
              onBlurCapture={event => {
                const relatedTarget = event.relatedTarget
                if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
                scheduleDismissMasterDataPrepareDatasetPreview()
              }}
            >
              <button
                ref={prepareDatasetTriggerRef}
                id="header-prepare-dataset-trigger"
                type="button"
                onClick={toggleMasterDataPrepareDataset}
                aria-expanded={masterDataPrepareDatasetOpen}
                aria-pressed={masterDataPrepareDatasetPinned}
                aria-controls="prepare-dataset-panel"
                aria-label="Prepare Dataset"
                className={utilityButton}
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
              <div
                id="header-prepare-dataset-portal-root"
                className="absolute left-1/2 top-full z-[60] w-max -translate-x-1/2 pt-1"
              />
            </div>
          </div>
        </div>
      </div>
      <div id="header-help-portal-root" className="pointer-events-none" />
      {helpOpen && (
        <HelpDialog
          initialSection={helpSectionForPage}
          isPinned={helpPinned}
          onClose={closeHelp}
          onPointerEnter={handleHelpPanelPointerEnter}
          onPointerLeave={scheduleHelpDismiss}
        />
      )}
    </header>
  )
}
