import React, { useEffect, useRef, useState } from 'react'
import { Redo2, Search, Undo2 } from 'lucide-react'
import { useAppStore } from '../../state'
import { resolveWorkflowStatus } from './workflow-status'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'candidate', label: 'Candidate / RCA' },
  { id: 'simulation', label: 'Simulation' },
] as const

interface NavbarProps {
  masterDataSearchQuery: string
  onMasterDataSearchQueryChange: (query: string) => void
}

const headerUtilityButton = 'grid h-8 w-8 shrink-0 place-items-center border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'

export const Navbar: React.FC<NavbarProps> = ({ masterDataSearchQuery, onMasterDataSearchQueryChange }) => {
  const {
    activeTab,
    setActiveTab,
    snapshotPair,
    snapshotComparison,
    isSelectedComparisonActive,
    masterDataHandoff,
    canUndoMasterDataEdit,
    canRedoMasterDataEdit,
    undoMasterDataEdit,
    redoMasterDataEdit
  } = useAppStore()
  const currentProduct = snapshotPair.current.product
  const currentProductName = currentProduct.productName?.trim() ?? ''
  const currentUom = currentProduct.uom?.trim() ?? ''
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRegionRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const hasProductMismatch = masterDataHandoff.productMismatch
  const missingData = masterDataHandoff.datasetsPrepared && (
    snapshotComparison.totalGap === null || snapshotComparison.warnings.length > 0
  )
  const workflowStatus = resolveWorkflowStatus({
    selectedComparisonActive: isSelectedComparisonActive,
    productMismatch: hasProductMismatch,
    missingData,
    datasetsPrepared: masterDataHandoff.datasetsPrepared
  })
  const statusIsWarning = missingData || !masterDataHandoff.datasetsPrepared

  useEffect(() => {
    if (activeTab !== 'master') setSearchOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!searchRegionRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [searchOpen])

  return (
    <header className="sticky top-0 z-50 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="w-full px-3 sm:px-4 lg:px-4">
        <div className="flex min-h-12 flex-col gap-1 py-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <div className="leading-tight">
              <span className="block font-sans text-xs font-semibold tracking-tight text-slate-100">Cost Breakdown</span>
            </div>
            {(currentProductName || currentUom) && (
              <div
                role="group"
                aria-label={`Current dataset${currentProductName ? `: ${currentProductName}` : ''}${currentUom ? `, UOM ${currentUom}` : ''}`}
                className="flex min-w-0 items-center gap-1.5 font-sans text-[11px]"
              >
                {currentProductName && <span title={currentProductName} className="max-w-24 truncate font-semibold text-slate-100 sm:max-w-40">{currentProductName}</span>}
                {currentUom && <span className="shrink-0 text-slate-400">({currentUom})</span>}
              </div>
            )}
            <div className="flex shrink-0 items-center gap-1.5" aria-label="Global workflow status and review action">
              <div
                role="status"
                aria-live="polite"
                aria-label={`Workflow status: ${workflowStatus.label}`}
                className={`flex items-center gap-1.5 border px-2 py-1 font-sans text-[11px] ${
                  statusIsWarning
                    ? 'border-amber-700 bg-amber-950/40 text-amber-100'
                    : 'border-slate-700 bg-slate-800 text-slate-100'
                }`}
              >
                <span className="text-slate-400">Status</span>
                <span>{workflowStatus.label}</span>
              </div>
              {activeTab !== workflowStatus.destination && (
                <button
                  type="button"
                  onClick={() => setActiveTab(workflowStatus.destination)}
                  aria-label={workflowStatus.actionLabel}
                  className="min-h-7 border border-slate-700 px-2 py-1 font-sans text-[11px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                >
                  {workflowStatus.actionLabel}
                </button>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
          <nav aria-label="Main navigation" className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 lg:mx-0">
            {navItems.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-8 shrink-0 rounded-sm border px-2.5 py-1.5 font-sans text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                    isActive
                      ? 'border-slate-700 bg-slate-800 text-white font-bold shadow-2xs'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
          {activeTab === 'master' && (
            <div ref={searchRegionRef} className="relative flex shrink-0 items-center gap-1" role="group" aria-label="Master Data utilities">
              <button
                type="button"
                onClick={undoMasterDataEdit}
                disabled={!canUndoMasterDataEdit}
                aria-label="Undo Master Data edit"
                title="Undo Master Data edit (Ctrl/Cmd+Z)"
                className={headerUtilityButton}
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={redoMasterDataEdit}
                disabled={!canRedoMasterDataEdit}
                aria-label="Redo Master Data edit"
                title="Redo Master Data edit (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
                className={headerUtilityButton}
              >
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                ref={searchButtonRef}
                type="button"
                onClick={() => setSearchOpen(open => !open)}
                aria-label="Search Master Data tables"
                aria-expanded={searchOpen}
                aria-controls="master-data-header-search"
                title="Search Master Data tables"
                className={headerUtilityButton}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              {searchOpen && (
                <div id="master-data-header-search" role="search" className="absolute right-0 top-full z-[60] mt-2 w-[min(22rem,calc(100vw-1.5rem))] border border-slate-300 bg-white p-2 shadow-lg">
                  <label htmlFor="master-data-search" className="sr-only">Search visible Master Data tables</label>
                  <input
                    ref={searchInputRef}
                    id="master-data-search"
                    type="search"
                    value={masterDataSearchQuery}
                    onChange={event => onMasterDataSearchQueryChange(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setSearchOpen(false)
                        searchButtonRef.current?.focus()
                      }
                    }}
                    placeholder="Search visible table"
                    className="min-h-9 w-full border border-slate-400 bg-white px-2.5 text-xs text-slate-950 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}
