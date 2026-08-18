import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../lib/store'
import { ChevronDown, Plus, Copy, Trash2 } from 'lucide-react'
import { ProductSetupModal } from './ProductSetupModal'

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
    { id: 'master',    label: 'Master Data' },
    { id: 'breakdown', label: 'Cost Breakdown' },
    { id: 'candidate', label: 'Candidate Selection' },
    { id: 'rca',       label: 'RCA & Simulation' },
  ] as const

  const displayCode = activeSession.product.productCode || 'Select Product'
  const displayDesc = activeSession.product.productDescription || ''

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">

          {/* ── Brand + Product Selector Box ─────────────────────── */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs select-none">
                CB
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-sm">COSTBREAKDOWN</span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            {/* Product Dropdown Selector Box */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center justify-between gap-3 px-3 py-1.5 min-w-[210px] max-w-[280px] bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-2xs cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Product:</span>
                    <span className="font-mono font-bold text-xs text-slate-900 truncate">{displayCode}</span>
                  </div>
                  {displayDesc && (
                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{displayDesc}</p>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Products in Session ({productSessions.length})
                    </p>
                    <div className="space-y-0.5">
                      {productSessions.map(s => {
                        const isActive = s.id === activeProductId
                        const code = s.product.productCode || '(Unnamed Product)'
                        const desc = s.product.productDescription || ''
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between group rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                              isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => { switchProduct(s.id); setDropdownOpen(false) }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold font-mono truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                {code}
                              </p>
                              {desc && (
                                <p className={`text-[11px] truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {desc}
                                </p>
                              )}
                            </div>
                            {/* Action icons — only visible on non-active items */}
                            {!isActive && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <button
                                  onClick={e => { e.stopPropagation(); duplicateProduct(s.id); setDropdownOpen(false) }}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                  title="Duplicate product"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteProduct(s.id) }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete product"
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

                  {/* Footer: New Product */}
                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={() => { setSetupModalOpen(true); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      New Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tab Navigation (Clean text without icons and numbers) ──────────────── */}
          <nav className="flex items-center space-x-1 overflow-x-auto">
            {navItems.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
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
