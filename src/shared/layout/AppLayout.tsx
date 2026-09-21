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
    <div className="factory-app-shell min-h-screen bg-[var(--cb-page)] text-[var(--cb-ink)] flex flex-col text-xs antialiased">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {children}
      </main>

      {/* Factory workbench status strip */}
      <footer className="bg-[var(--cb-page)] text-[var(--cb-muted)] border-t-2 border-[var(--cb-ink)] text-[11px] font-sans py-2 px-4 select-none sticky bottom-0 z-40">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[var(--cb-accent)] font-bold tracking-wide">
              <span className="w-2 h-2 bg-[var(--cb-accent)]" aria-hidden="true" />
              WORKBENCH ACTIVE
            </span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span className="text-[var(--cb-ink)] font-mono font-bold">{product.productCode || 'NO-PRODUCT'}</span>
            <span>({product.uom || 'PC'})</span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span>BOM: <strong className="text-[var(--cb-ink)] font-mono">{bom.length}</strong> items</span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span>Routing: <strong className="text-[var(--cb-ink)] font-mono">{routing.length}</strong> ops</span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span>WC: <strong className="text-[var(--cb-ink)] font-mono">{rates.length}</strong> depts</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Base: <strong className="text-[var(--cb-ink)] font-mono">{formatNumber(costBreakdown.totalBase, 4)}</strong> THB</span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span>Active: <strong className="text-[var(--cb-ink)] font-mono">{formatNumber(costBreakdown.totalActive, 4)}</strong> THB</span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span>
              Net Gap:{' '}
              <strong className={`font-mono ${costBreakdown.totalVariance > 0 ? 'text-[var(--cb-accent)]' : 'text-[var(--cb-ink)]'}`}>
                {formatVariance(costBreakdown.totalVariance, 4)} THB/pc
              </strong>
            </span>
            <span className="text-[var(--cb-border-strong)]">/</span>
            <span className="factory-tag text-[var(--cb-muted)] bg-[var(--cb-surface)]">
              Excel v2 Parity: 100%
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
