import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { ExecutiveKPICards } from './components/ExecutiveKPICards'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { RoutingDetailedTable } from './components/RoutingDetailedTable'

type SubTab = 'bom' | 'routing'

export const CostBreakdownPage: React.FC = () => {
  const { costBreakdown, bom, routing, rates } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPIs */}
      <ExecutiveKPICards costBreakdown={costBreakdown} />

      {/* 2. Variance Tree Decomposition */}
      <VarianceTreeCard costBreakdown={costBreakdown} />

      {/* 3. Detailed Breakdown Tables Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Accordion Header */}
        <button
          onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isDetailedExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Detailed Cost Breakdown Tables
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {bom.length} BOM Items · {routing.length} Routing Steps
          </span>
        </button>

        {isDetailedExpanded && (
          <div className="border-t border-slate-100">
            {/* Sub-Tab Switcher */}
            <div className="flex items-center bg-slate-50 px-4 py-2.5 border-b border-slate-100">
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setSubTab('bom')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    subTab === 'bom'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  BOM Material ({bom.length})
                </button>
                <button
                  onClick={() => setSubTab('routing')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    subTab === 'routing'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Routing Conversion ({routing.length})
                </button>
              </div>
            </div>

            {/* Sub-Tab Content */}
            {subTab === 'bom' ? (
              <BOMDetailedTable bom={bom} />
            ) : (
              <RoutingDetailedTable routing={routing} rates={rates} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
