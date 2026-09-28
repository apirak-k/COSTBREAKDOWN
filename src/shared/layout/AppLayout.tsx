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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans text-xs antialiased">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {children}
      </main>

      {/* Industrial Console Footer Status Bar */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-[11px] font-mono py-2 px-4 select-none sticky bottom-0 z-40">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </span>
            <span className="text-slate-600">|</span>
            <span>BOM: <strong className="text-slate-200">{bom.length}</strong> items</span>
            <span className="text-slate-600">|</span>
            <span>Routing: <strong className="text-slate-200">{routing.length}</strong> ops</span>
            <span className="text-slate-600">|</span>
            <span>WC: <strong className="text-slate-200">{rates.length}</strong> depts</span>
          </div>

          <div className="flex items-center gap-3">
            {hasCostTotals ? (
              <>
                <span>Reference: <strong className="text-slate-200">{formatNumber(snapshotComparison.referenceCost.total!, 4)}</strong> THB</span>
                <span className="text-slate-600">|</span>
                <span>Current: <strong className="text-slate-200">{formatNumber(snapshotComparison.currentCost.total!, 4)}</strong> THB</span>
                <span className="text-slate-600">|</span>
                <span>
                  Gap:{' '}
                  <strong className={snapshotComparison.totalGap! > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {formatVariance(snapshotComparison.totalGap!, 4)} THB/pc
                  </strong>
                </span>
                {!costsComplete && <span className="text-amber-300">Available with warnings</span>}
              </>
            ) : (
              <span role="status" className="text-amber-300 font-bold">
                Cost values unavailable
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
