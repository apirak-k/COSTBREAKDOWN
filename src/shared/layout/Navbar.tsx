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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-h-10 items-center gap-2.5">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-sm bg-slate-900 font-mono text-xs font-bold tracking-tight text-white">
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">Cost Breakdown</span>
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
                className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'border-blue-700 text-slate-950'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950'
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
