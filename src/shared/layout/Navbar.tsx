import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, Plus, Copy, Trash2 } from 'lucide-react'
import { ProductSetupModal } from '../../features/master-data/components/modals/ProductSetupModal'

export const Navbar: React.FC = () => {
  const {
    activeTab, setActiveTab,
    productSessions, activeProductId,
    activeSession,
    switchProduct, duplicateProduct, deleteProduct
  } = useAppStore()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navItems = [
    { id: 'master', label: 'Master Data' },
    { id: 'breakdown', label: 'Cost Breakdown' },
    { id: 'candidate', label: 'Candidate Selection' },
    { id: 'rca', label: 'RCA & Simulation' },
  ] as const

  const displayCode = activeSession.product.productCode || 'Select Product'

  return (
    <header className="bg-[var(--cb-page)] text-[var(--cb-ink)] border-b-2 border-[var(--cb-ink)] sticky top-0 z-50 select-none">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 gap-4">

          {/* Brand + Product Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-[var(--cb-ink)] text-[var(--cb-surface)] border border-[var(--cb-ink)] font-mono font-bold text-[11px] px-1.5 py-0.5">
                CB
              </span>
              <span className="font-extrabold tracking-[0.04em] text-xs text-[var(--cb-ink)] hidden sm:inline">
                COST BREAKDOWN
              </span>
            </div>

            <div className="h-5 w-px bg-[var(--cb-ink)]" />

            {/* Product Dropdown Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center justify-between gap-2 px-2.5 py-1 bg-[var(--cb-surface)] hover:bg-[var(--cb-muted-surface)] border border-[var(--cb-ink)] text-left transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--cb-muted)]">PRODUCT:</span>
                  <span className="font-mono font-bold text-[var(--cb-ink)] text-xs">{displayCode}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase border ${
                      activeSession.status === 'active'
                        ? 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] border-[var(--cb-accent)]'
                        : activeSession.status === 'draft'
                        ? 'bg-[var(--cb-muted-surface)] text-[var(--cb-ink)] border-[var(--cb-ink)]'
                        : 'bg-[var(--cb-surface)] text-[var(--cb-muted)] border-[var(--cb-border)]'
                    }`}
                  >
                    {activeSession.status || 'ACTIVE'}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-[var(--cb-ink)] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-84 bg-[var(--cb-surface)] text-[var(--cb-ink)] border-2 border-[var(--cb-ink)] z-50 overflow-hidden text-xs">
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-[var(--cb-muted)] uppercase tracking-wider px-2 py-1">
                      Dataset Versions &amp; Products ({productSessions.length})
                    </p>
                    <div className="space-y-0.5 max-h-72 overflow-y-auto">
                      {productSessions.map(s => {
                        const isActive = s.id === activeProductId
                        const code = s.product.productCode || '(Unnamed Product)'
                        const desc = s.product.productDescription || ''
                        const stat = s.status || 'active'
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between group px-2.5 py-1.5 cursor-pointer transition-colors ${
                              isActive ? 'bg-[var(--cb-muted-surface)] text-[var(--cb-ink)] border-l-2 border-[var(--cb-accent)]' : 'hover:bg-[var(--cb-muted-surface)] text-[var(--cb-ink)]'
                            }`}
                            onClick={() => { switchProduct(s.id); setDropdownOpen(false) }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold truncate text-[var(--cb-ink)]">
                                  {code}
                                </p>
                                <span
                                  className={`px-1 py-0.2 text-[8px] font-mono font-bold uppercase border ${
                                    stat === 'active'
                                      ? 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] border-[var(--cb-accent)]'
                                      : stat === 'draft'
                                      ? 'bg-[var(--cb-muted-surface)] text-[var(--cb-ink)] border-[var(--cb-ink)]'
                                      : 'bg-[var(--cb-surface)] text-[var(--cb-muted)] border-[var(--cb-border)]'
                                  }`}
                                >
                                  {stat}
                                </span>
                              </div>
                              <p className="text-[10px] text-[var(--cb-muted)] truncate">
                                {s.versionLabel ? s.versionLabel : desc || 'No description'}
                              </p>
                            </div>
                            {!isActive && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <button
                                  onClick={e => { e.stopPropagation(); duplicateProduct(s.id); setDropdownOpen(false) }}
                                  className="p-1 text-[var(--cb-muted)] hover:text-[var(--cb-ink)] hover:bg-[var(--cb-muted-surface)]"
                                  title="Duplicate as Draft"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteProduct(s.id) }}
                                  className="p-1 text-[var(--cb-muted)] hover:text-[var(--cb-accent)] hover:bg-[var(--cb-accent-soft)]"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[var(--cb-border)] p-2 bg-[var(--cb-muted-surface)]">
                    <button
                      onClick={() => { setSetupModalOpen(true); setDropdownOpen(false) }}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-bold text-[var(--cb-ink)] hover:text-[var(--cb-accent)] hover:bg-[var(--cb-surface)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-none border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[var(--cb-ink)] border-[var(--cb-accent)] font-bold'
                      : 'border-transparent text-[var(--cb-muted)] hover:text-[var(--cb-ink)] hover:bg-[var(--cb-surface)]'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

        </div>
      </div>

      <ProductSetupModal
        isOpen={setupModalOpen}
        mode="create"
        onClose={() => setSetupModalOpen(false)}
      />
    </header>
  )
}
