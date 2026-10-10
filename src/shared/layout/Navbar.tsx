import React from 'react'
import { Info, Redo2, Search, Undo2 } from 'lucide-react'
import { useAppStore } from '../../state'
import { resolveHeaderProductContext } from './header-product-context'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'simulation', label: 'Simulation' },
] as const

interface NavbarProps {
  masterDataSearchQuery: string
  onMasterDataSearchQueryChange: (query: string) => void
}

const utilityButton = 'grid h-8 w-8 shrink-0 place-items-center text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'

export const Navbar: React.FC<NavbarProps> = ({ masterDataSearchQuery, onMasterDataSearchQueryChange }) => {
  const {
    activeTab,
    setActiveTab,
    snapshotPair,
    canUndoMasterDataEdit,
    canRedoMasterDataEdit,
    undoMasterDataEdit,
    redoMasterDataEdit,
    requestMasterDataPrepareDataset
  } = useAppStore()

  const isMasterData = activeTab === 'master'
  const productContext = resolveHeaderProductContext(
    snapshotPair.reference.product,
    snapshotPair.current.product
  )

  return (
    <header className="sticky top-0 z-50 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="app-workspace-frame">
        <div className="grid min-h-12 grid-cols-1 items-center gap-x-3 gap-y-1.5 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
          <div className="flex min-w-0 items-center gap-2.5 sm:col-start-1 sm:row-start-1">
            <div role="group" aria-label="Page edit tools" className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={undoMasterDataEdit}
                disabled={!isMasterData || !canUndoMasterDataEdit}
                aria-label="Undo"
                title="Undo Master Data edit (Ctrl/Cmd+Z)"
                className={utilityButton}
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={redoMasterDataEdit}
                disabled={!isMasterData || !canRedoMasterDataEdit}
                aria-label="Redo"
                title="Redo Master Data edit (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
                className={utilityButton}
              >
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <span className="h-6 border-l border-slate-700" aria-hidden="true" />

            <div className="flex min-w-0 items-baseline gap-x-2.5 font-sans">
              <span className="shrink-0 text-sm font-semibold tracking-wide text-slate-100">COSTBREAKDOWN</span>
              <span
                role="group"
                aria-label={`Product context: ${productContext}`}
                title={productContext}
                className="max-w-36 truncate text-[11px] font-medium text-slate-300 sm:max-w-48"
              >
                {productContext}
              </span>
            </div>
          </div>

          <nav aria-label="Main navigation" className="flex min-w-0 flex-wrap items-center justify-center gap-0.5 sm:col-span-2 sm:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
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

          <div className="flex min-w-0 items-center justify-end gap-2 sm:col-start-2 sm:row-start-1 lg:col-start-3 lg:row-start-1">
            <div role="search" className="relative min-w-0 w-48 max-w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search data"
                value={isMasterData ? masterDataSearchQuery : ''}
                onChange={event => {
                  if (isMasterData) onMasterDataSearchQueryChange(event.target.value)
                }}
                disabled={!isMasterData}
                placeholder="Search data..."
                className="h-8 w-full border border-slate-700 bg-slate-800 pl-8 pr-2 text-xs text-slate-100 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={() => requestMasterDataPrepareDataset()}
              aria-label="Prepare Dataset"
              title="Prepare Dataset"
              className={utilityButton}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
