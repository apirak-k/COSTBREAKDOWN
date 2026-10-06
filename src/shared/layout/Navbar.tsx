import React from 'react'
import { useAppStore } from '../../state'
import { resolveWorkflowStatus } from './workflow-status'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'candidate', label: 'Candidate Prioritization' },
  { id: 'rca', label: 'RCA & Simulation' },
] as const

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    snapshotPair,
    snapshotComparison,
    isSelectedComparisonActive,
    masterDataHandoff
  } = useAppStore()
  const currentProduct = snapshotPair.current.product
  const currentProductName = currentProduct.productName || currentProduct.productDescription || '—'
  const currentUom = currentProduct.uom || '—'
  const hasProductMismatch = masterDataHandoff.warnings?.some(warning => warning.startsWith('Product mismatch:')) ?? false
  const missingData = masterDataHandoff.datasetsPrepared && (
    snapshotComparison.totalGap === null || snapshotComparison.warnings.length > 0
  )
  const workflowStatus = resolveWorkflowStatus({
    selectedComparisonActive: isSelectedComparisonActive,
    productMismatch: hasProductMismatch,
    missingData,
    datasetsPrepared: masterDataHandoff.datasetsPrepared
  })
  const statusIsWarning = workflowStatus.destination === 'master'

  return (
    <header className="sticky top-0 z-50 select-none border-b border-slate-800 bg-slate-900 text-white shadow-xs">
      <div className="w-full px-3 sm:px-4 lg:px-4">
        <div className="flex min-h-12 flex-col gap-1 py-1 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <div className="leading-tight">
              <span className="block font-sans text-xs font-semibold tracking-tight text-slate-100">Cost Breakdown</span>
            </div>
            <div
              role="group"
              aria-label={`Current product: ${currentProductName}, UOM: ${currentUom}`}
              className="flex min-w-0 items-center gap-1.5 font-sans text-[11px]"
            >
              <span className="shrink-0 text-slate-400">Product</span>
              <span title={currentProductName} className="max-w-24 truncate font-semibold text-slate-100 sm:max-w-40">
                {currentProductName}
              </span>
              <span className="shrink-0 text-slate-400">({currentUom})</span>
            </div>
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
        </div>
      </div>
    </header>
  )
}
