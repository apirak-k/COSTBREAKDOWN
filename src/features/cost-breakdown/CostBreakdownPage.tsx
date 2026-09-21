import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import {
  generateSnapshotComparisonExcel,
  getComparisonExportFilename
} from '../../services/excel/comparison-export'
import { downloadBlob } from '../../services/excel/export'

// Sub-components
import { ExecutiveKPICards } from './components/ExecutiveKPICards'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { RoutingDetailedTable } from './components/RoutingDetailedTable'
import { WorkCenterComparisonTable } from './components/WorkCenterComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'

type SubTab = 'bom' | 'routing' | 'work-center'

export const CostBreakdownPage: React.FC = () => {
  const { product, costBreakdown, snapshotComparison, snapshotPair, bom, routing, rates } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportComparison = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      const blob = await generateSnapshotComparisonExcel({
        product,
        snapshotPair,
        comparison: snapshotComparison
      })
      downloadBlob(blob, getComparisonExportFilename(product.productCode))
    } catch (error) {
      console.error('Failed to export snapshot comparison workbook', error)
      setExportError('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Top Executive KPIs */}
      <ExecutiveKPICards costBreakdown={costBreakdown} />

      {/* 2. Independent Reference vs Current comparison */}
      <SnapshotComparisonCard comparison={snapshotComparison} />

      {/* 3. Variance Tree Decomposition */}
      <VarianceTreeCard costBreakdown={costBreakdown} />

      {/* 4. Detailed Breakdown Tables Panel */}
      <div className="bg-white rounded border border-slate-300/80 shadow-2xs overflow-hidden">
        {/* Section Accordion Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-200">
          <button
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            className="flex items-center gap-2 text-xs font-bold font-mono text-slate-800 uppercase tracking-tight hover:text-slate-950 cursor-pointer"
          >
            {isDetailedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Itemized Cost Breakdown</span>
          </button>

          {/* Sub-Tab Switcher */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={handleExportComparison}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            <Download className="w-3 h-3 text-slate-600" />
            {isExporting ? 'Exporting...' : 'Export Comparison (.xlsx)'}
          </button>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <button
              onClick={() => setSubTab('bom')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                subTab === 'bom'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              BOM ({bom.length})
            </button>
            <button
              onClick={() => setSubTab('routing')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                subTab === 'routing'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Routing ({routing.length})
            </button>
            <button
              onClick={() => setSubTab('work-center')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                subTab === 'work-center'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Work Center ({rates.length})
            </button>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="px-3.5 py-2 border-b border-rose-200 bg-rose-50 text-[10px] font-mono text-rose-700">
          {exportError}
        </div>
      )}

      {isDetailedExpanded && (
          <div className="p-0">
            {subTab === 'bom' ? (
              <BOMDetailedTable
                bom={bom}
                findings={snapshotComparison.bomFindings}
                referenceItems={snapshotPair.reference.bom}
              />
            ) : subTab === 'routing' ? (
              <RoutingDetailedTable
                routing={routing}
                rates={rates}
                findings={snapshotComparison.routingFindings}
                referenceItems={snapshotPair.reference.routing}
              />
            ) : (
              <WorkCenterComparisonTable
                referenceRates={snapshotPair.reference.rates}
                currentRates={snapshotPair.current.rates}
                findings={snapshotComparison.workCenterFindings}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
