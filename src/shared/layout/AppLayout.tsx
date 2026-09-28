import React, { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { useAppStore } from '../../state'
import { areSnapshotCostsComplete, formatNumber, formatVariance } from '../../core'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { bom, routing, rates, snapshotComparison } = useAppStore()
  const hasCostTotals = snapshotComparison.referenceCost.total !== null
    && snapshotComparison.currentCost.total !== null
    && snapshotComparison.totalGap !== null
  const costsComplete = areSnapshotCostsComplete(snapshotComparison.referenceCost, snapshotComparison.currentCost)

  return (
    <div className="min-h-screen min-h-dvh bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-4 sm:py-6 lg:px-6"
      >
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <dt>BOM</dt><dd className="font-mono font-semibold tabular-nums text-slate-900">{bom.length}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>Routing</dt><dd className="font-mono font-semibold tabular-nums text-slate-900">{routing.length}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>Work centers</dt><dd className="font-mono font-semibold tabular-nums text-slate-900">{rates.length}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="status">
            {hasCostTotals ? (
              <>
                <span>Reference <strong className="font-mono text-slate-900">{formatNumber(snapshotComparison.referenceCost.total!, 4)} THB</strong></span>
                <span>Current <strong className="font-mono text-slate-900">{formatNumber(snapshotComparison.currentCost.total!, 4)} THB</strong></span>
                <span>
                  Gap <strong className={`font-mono ${snapshotComparison.totalGap! > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatVariance(snapshotComparison.totalGap!, 4)} THB/pc
                  </strong>
                </span>
                {!costsComplete && <span className="text-amber-800">Available with warnings</span>}
              </>
            ) : (
              <span className="font-medium text-amber-800">Cost values unavailable</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
