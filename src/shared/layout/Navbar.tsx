import React from 'react'
import { useAppStore } from '../../state'

const navItems = [
  { id: 'master', label: 'Master Data' },
  { id: 'breakdown', label: 'Cost Breakdown' },
  { id: 'candidate', label: 'Candidate Prioritization' },
  { id: 'rca', label: 'RCA & Simulation' },
] as const

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="h-0.5 bg-blue-600" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-3 pt-1 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-h-11 items-center gap-3">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center border border-slate-700 bg-slate-900 font-mono text-[11px] font-bold tracking-tight text-slate-100">
            CB
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-wide text-slate-50">Cost Breakdown</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400 sm:block">Product cost analysis</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 pb-0.5 lg:mx-0 lg:pb-0">
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
                className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                  isActive
                    ? 'border-blue-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
