import React from 'react'
import { useAppStore } from '../../state'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'candidate', label: 'Candidate Prioritization' },
  { id: 'rca', label: 'RCA & Simulation' },
] as const

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    snapshotPair,
    isSelectedComparisonActive,
    masterDataHandoff
  } = useAppStore()
  const currentProduct = snapshotPair.current.product
  const currentProductName = currentProduct.productName || currentProduct.productDescription || '—'
  const currentUom = currentProduct.uom || '—'
  const hasProductMismatch = masterDataHandoff.warnings?.some(warning => warning.startsWith('Product mismatch:')) ?? false
  const workflowStatus = isSelectedComparisonActive
    ? 'Selected Comparison Mode'
    : hasProductMismatch
      ? 'Product Mismatch'
      : masterDataHandoff.datasetsPrepared
        ? 'Datasets Prepared'
        : 'Preparation Incomplete'
  const statusIsWarning = !isSelectedComparisonActive && (hasProductMismatch || !masterDataHandoff.datasetsPrepared)

  return (
    <header className="sticky top-0 z-50 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="w-full px-3 sm:px-4 lg:px-4">
        <div className="flex min-h-12 flex-col gap-1 py-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-sm border border-slate-700 bg-slate-800 font-mono text-[11px] font-bold tracking-tight text-slate-200">
              CB
            </span>
            <div className="leading-tight">
              <span className="block font-mono text-xs font-bold tracking-tight text-slate-100">COST BREAKDOWN</span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400 sm:block">Product cost analysis</span>
            </div>
            <div
              role="group"
              aria-label={`Current product: ${currentProductName}, UOM: ${currentUom}`}
              className="flex min-w-0 items-center gap-1.5 font-mono text-[9px]"
            >
              <span className="shrink-0 text-slate-500">PRODUCT</span>
              <span title={currentProductName} className="max-w-24 truncate font-semibold text-slate-100 sm:max-w-40">
                {currentProductName}
              </span>
              <span className="shrink-0 text-slate-400">({currentUom})</span>
            </div>
            <div
              role="status"
              aria-label={`Workflow status: ${workflowStatus}`}
              className={`flex shrink-0 items-center gap-1.5 border px-2 py-1 font-mono text-[9px] ${
                statusIsWarning
                  ? 'border-amber-700 bg-amber-950/40 text-amber-100'
                  : 'border-slate-700 bg-slate-800 text-slate-100'
              }`}
            >
              <span className="text-slate-400">STATUS</span>
              <span>{workflowStatus}</span>
            </div>
          </div>

          <nav aria-label="Main navigation" className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 lg:mx-0">
            {navItems.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`min-h-8 shrink-0 rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
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
        </div>
      </div>
    </header>
  )
}
