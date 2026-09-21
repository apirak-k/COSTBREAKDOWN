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
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 select-none shadow-xs">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 gap-4">

          {/* Brand + Product Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 text-slate-200 border border-slate-700 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded">
                CB
              </span>
              <span className="font-bold font-mono tracking-tight text-xs text-slate-200 hidden sm:inline">
                COST BREAKDOWN
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Product Dropdown Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center justify-between gap-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors cursor-pointer text-xs rounded"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">PRODUCT:</span>
                  <span className="font-mono font-bold text-slate-100 text-xs">{displayCode}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase rounded border ${
                      activeSession.status === 'active'
                        ? 'bg-slate-900 text-slate-300 border-slate-600'
                        : activeSession.status === 'draft'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {activeSession.status || 'ACTIVE'}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-84 bg-slate-900 border border-slate-700 rounded shadow-xl z-50 overflow-hidden text-xs">
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 font-mono">
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
                            className={`flex items-center justify-between group rounded px-2.5 py-1.5 cursor-pointer transition-colors ${
                              isActive ? 'bg-slate-800 text-white border-l-2 border-slate-400' : 'hover:bg-slate-800/60 text-slate-300'
                            }`}
                            onClick={() => { switchProduct(s.id); setDropdownOpen(false) }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold font-mono truncate text-slate-100">
                                  {code}
                                </p>
                                <span
                                  className={`px-1 py-0.2 text-[8px] font-mono font-bold uppercase rounded border ${
                                    stat === 'active'
                                      ? 'bg-slate-900 text-slate-300 border-slate-600'
                                      : stat === 'draft'
                                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                                      : 'bg-slate-900 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {stat}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {s.versionLabel ? s.versionLabel : desc || 'No description'}
                              </p>
                            </div>
                            {!isActive && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <button
                                  onClick={e => { e.stopPropagation(); duplicateProduct(s.id); setDropdownOpen(false) }}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                  title="Duplicate as Draft"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteProduct(s.id) }}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded"
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

                  <div className="border-t border-slate-800 p-2 bg-slate-950">
                    <button
                      onClick={() => { setSetupModalOpen(true); setDropdownOpen(false) }}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900 rounded transition-colors cursor-pointer"
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
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
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
