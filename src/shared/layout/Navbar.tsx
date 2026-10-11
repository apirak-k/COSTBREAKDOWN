import React, { useEffect, useRef } from 'react'
import { Info, Redo2, Undo2 } from 'lucide-react'
import { useAppStore } from '../../state'
import { resolveHeaderProductContext, resolveProductComparisonDisplayStatus } from './header-product-context'
import { Tooltip } from '../ui/Tooltip'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'simulation', label: 'Simulation' },
] as const

const utilityButton = 'grid h-8 w-8 shrink-0 place-items-center text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-default disabled:opacity-50 disabled:text-slate-600 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'

export const Navbar: React.FC = () => {
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

  const isMasterData = activeTab === 'master'
  const productContext = resolveHeaderProductContext(
    snapshotPair.reference.product,
    snapshotPair.current.product
  )
  const productComparisonStatus = resolveProductComparisonDisplayStatus(
    snapshotPair.reference.product,
    snapshotPair.current.product
  )
  const currentProductName = snapshotPair.current.product.productName?.trim() ?? ''
  const currentProductUom = snapshotPair.current.product.uom?.trim() ?? ''

  useEffect(() => {
    if (masterDataPrepareDatasetRequested) {
      prepareDatasetTriggerRef.current?.focus()
      consumeMasterDataPrepareDatasetRequest()
    }
  }, [masterDataPrepareDatasetRequested, consumeMasterDataPrepareDatasetRequest])

  return (
    <header className="sticky top-0 z-50 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="app-workspace-frame">
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex min-w-0 items-baseline gap-x-2.5 font-sans">
              <span className="shrink-0 text-base font-bold tracking-tight text-slate-100">COSTBREAKDOWN</span>
              <span
                role="group"
                aria-label={`Product context: PRODUCT: ${productContext}`}
                title={`PRODUCT: ${productContext}`}
                className="inline-flex min-w-0 max-w-48 items-baseline gap-1 truncate text-[11px] font-normal text-slate-300"
              >
                <span className="shrink-0 text-[10px] font-medium tracking-wide text-slate-400">PRODUCT:</span>
                {productComparisonStatus === 'match' ? (
                  <>
                    <span className="truncate font-semibold text-slate-100">{currentProductName}</span>
                    <span className="shrink-0 text-slate-400">({currentProductUom})</span>
                  </>
                ) : (
                  <span className="truncate font-medium text-slate-200">{productContext}</span>
                )}
              </span>
            </div>
          </div>

          <nav aria-label="Main navigation" className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center gap-0.5 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex h-10 shrink-0 items-center px-2.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-400 ${
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
            <Tooltip label="Undo · Ctrl/Cmd+Z">
              <button
                type="button"
                onClick={undoMasterDataEdit}
                disabled={!isMasterData || !canUndoMasterDataEdit}
                aria-label="Undo"
                className={utilityButton}
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Redo · Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z">
              <button
                type="button"
                onClick={redoMasterDataEdit}
                disabled={!isMasterData || !canRedoMasterDataEdit}
                aria-label="Redo"
                className={utilityButton}
              >
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <div
              className="relative flex shrink-0 items-center"
              onPointerEnter={previewMasterDataPrepareDataset}
              onPointerLeave={event => {
                const relatedTarget = event.relatedTarget
                const panelRoot = document.getElementById('header-prepare-dataset-portal-root')
                if (relatedTarget instanceof Node && (event.currentTarget.contains(relatedTarget) || panelRoot?.contains(relatedTarget))) return
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
    </header>
  )
}
