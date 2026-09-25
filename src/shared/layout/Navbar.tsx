import React from 'react'
import { useAppStore } from '../../state'

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore()

  const navItems = [
    { id: 'master', label: 'Master Data' },
    { id: 'breakdown', label: 'Cost Breakdown' },
    { id: 'candidate', label: 'Candidate Selection' },
    { id: 'rca', label: 'RCA & Simulation' },
  ] as const

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 select-none shadow-xs">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12 gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 text-slate-200 border border-slate-700 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded">
                CB
              </span>
              <span className="font-bold font-mono tracking-tight text-xs text-slate-200">
                COST BREAKDOWN
              </span>
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
    </header>
  )
}
