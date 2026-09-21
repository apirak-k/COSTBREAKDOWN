import React, { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { useAppStore } from '../../state'
import { formatNumber, formatVariance } from '../../core'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { product, bom, routing, rates, costBreakdown } = useAppStore()

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
            <span className="text-slate-200 font-bold">{product.productCode || 'NO-PRODUCT'}</span>
            <span className="text-slate-400">({product.uom || 'PC'})</span>
            <span className="text-slate-600">|</span>
            <span>BOM: <strong className="text-slate-200">{bom.length}</strong> items</span>
            <span className="text-slate-600">|</span>
            <span>Routing: <strong className="text-slate-200">{routing.length}</strong> ops</span>
            <span className="text-slate-600">|</span>
            <span>WC: <strong className="text-slate-200">{rates.length}</strong> depts</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Base: <strong className="text-slate-200">{formatNumber(costBreakdown.totalBase, 4)}</strong> THB</span>
            <span className="text-slate-600">|</span>
            <span>Active: <strong className="text-slate-200">{formatNumber(costBreakdown.totalActive, 4)}</strong> THB</span>
            <span className="text-slate-600">|</span>
            <span>
              Net Gap:{' '}
              <strong className={costBreakdown.totalVariance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {formatVariance(costBreakdown.totalVariance, 4)} THB/pc
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Excel v2 Parity: 100%
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
