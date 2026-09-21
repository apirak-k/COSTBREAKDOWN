import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { AlertTriangle, ChevronDown, ChevronRight, Download } from 'lucide-react'
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

      {costBreakdown.missingWorkCenters.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-sm border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/80 text-[11px] text-amber-900 font-sans" role="status">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Missing Work Center rates:</strong>{' '}
          {costBreakdown.missingWorkCenters.join(', ')}. Conversion cost for these rows is treated as 0 until a rate is configured.
          </p>
        </div>
      )}

      {/* 2. Independent Reference vs Current comparison */}
      <SnapshotComparisonCard comparison={snapshotComparison} />

      {/* 3. Variance Tree Decomposition */}
      <VarianceTreeCard costBreakdown={costBreakdown} />

      {/* 4. Detailed Breakdown Tables Panel */}
      <div className="factory-panel overflow-hidden">
        {/* Section Accordion Header */}
        <div className="flex flex-col gap-3 px-3.5 py-3 bg-slate-50/70 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            aria-expanded={isDetailedExpanded}
            aria-controls="cost-breakdown-details"
            className="flex items-center gap-2 text-sm font-semibold font-sans text-slate-800 tracking-tight hover:text-slate-950 cursor-pointer"
          >
            {isDetailedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Itemized Cost Breakdown</span>
          </button>

          {/* Sub-Tab Switcher */}
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <button
              onClick={handleExportComparison}
              disabled={isExporting}
              className="flex min-h-8 items-center gap-1 px-2.5 py-1 text-[11px] font-sans font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60"
            >
              <Download className="w-3 h-3 text-slate-600" />
              {isExporting ? 'Exporting...' : 'Export Comparison (.xlsx)'}
            </button>

            <div className="flex items-center gap-1 font-sans text-[11px]" role="tablist" aria-label="Cost breakdown detail tabs">
              <button
                onClick={() => setSubTab('bom')}
                role="tab"
                aria-selected={subTab === 'bom'}
                className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                  subTab === 'bom'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                BOM ({bom.length})
              </button>
              <button
                onClick={() => setSubTab('routing')}
                role="tab"
                aria-selected={subTab === 'routing'}
                className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                  subTab === 'routing'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Routing ({routing.length})
              </button>
              <button
                onClick={() => setSubTab('work-center')}
                role="tab"
                aria-selected={subTab === 'work-center'}
                className={`px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                  subTab === 'work-center'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Work Center ({rates.length})
              </button>
            </div>
          </div>
        </div>

      {exportError && (
        <div className="px-3.5 py-2 border-b border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 text-[11px] font-sans text-rose-700" role="alert">
          {exportError}
        </div>
      )}

      {isDetailedExpanded && (
        <div id="cost-breakdown-details" className="p-0">
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
