import React from 'react'
import { useAppStore } from '../lib/store'
import { Database, TrendingDown, CheckSquare, Sparkles } from 'lucide-react'

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore()

  const navItems = [
    { id: 'master', label: '1. Master Data & Input', icon: Database },
    { id: 'breakdown', label: '2. Cost Breakdown & Variance', icon: TrendingDown },
    { id: 'candidate', label: '3. Candidate Selection', icon: CheckSquare },
    { id: 'rca', label: '4. RCA & What-If Simulation', icon: Sparkles },
  ] as const

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight">COSTBREAKDOWN</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  RGOM-024
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Standard Cost Breakdown & Kaizen Engine</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
