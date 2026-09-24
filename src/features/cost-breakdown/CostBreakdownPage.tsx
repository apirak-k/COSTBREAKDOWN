import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { ExecutiveKPICards } from './components/ExecutiveKPICards'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { RoutingDetailedTable } from './components/RoutingDetailedTable'
import { WorkCenterComparisonTable } from './components/WorkCenterComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { SourceGroupsCard } from './components/SourceGroupsCard'
import type { ComparisonViewMode } from './components/comparison-view'
import { areSnapshotCostsComplete } from '../../core'

type SubTab = 'bom' | 'routing' | 'work-center'

export const CostBreakdownPage: React.FC = () => {
  const { costBreakdown, snapshotComparison, snapshotPair, bom, routing, rates, masterDataHandoff, setActiveTab } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>('all')
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)
  const allFindings = [
    ...snapshotComparison.bomFindings,
    ...snapshotComparison.routingFindings,
    ...snapshotComparison.workCenterFindings
  ]
  const changedFindingsCount = allFindings.filter(f => f.matchStatus === 'matched' && Object.keys(f.fieldDiffs).length > 0).length
  const addedFindingsCount = allFindings.filter(f => f.matchStatus === 'added').length
  const removedFindingsCount = allFindings.filter(f => f.matchStatus === 'removed').length
  const unchangedFindingsCount = allFindings.filter(f => f.matchStatus === 'matched' && Object.keys(f.fieldDiffs).length === 0).length
  const exactSnapshotCalculation = areSnapshotCostsComplete(snapshotComparison.referenceCost, snapshotComparison.currentCost)

  if (!masterDataHandoff.canCompare) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-amber-300 p-5 shadow-2xs" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-tight">Comparison is not ready</h1>
            <p className="mt-1 text-xs text-slate-600 font-sans">
              Prepare both Reference and Current datasets for Header Product <strong className="font-mono text-slate-900">{masterDataHandoff.productCode || '—'}</strong> in Master Data first.
            </p>
          </div>
        </div>

        <ul className="mt-4 list-disc pl-5 space-y-1 text-xs text-amber-900 font-sans">
          {masterDataHandoff.issues.map(issue => <li key={issue}>{issue}</li>)}
        </ul>

        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Return to Master Data
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Top Executive KPIs */}
      {exactSnapshotCalculation ? (
        <ExecutiveKPICards costBreakdown={costBreakdown} />
      ) : (
        <div className="px-4 py-3 rounded border border-amber-200 bg-amber-50/70 text-[11px] text-amber-900 font-sans" role="status">
          <strong className="font-mono">Exact legacy variance summary is on hold.</strong>{' '}
          Snapshot calculation has missing, invalid, or reviewable inputs. The comparison card below keeps the affected values as N/A and lists the source warnings.
        </div>
      )}

      {costBreakdown.missingWorkCenters.length > 0 && (
        <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/70 text-[11px] text-amber-900 font-sans" role="status">
          <strong className="font-mono">Missing Work Center rates:</strong>{' '}
          {costBreakdown.missingWorkCenters.join(', ')}. Affected conversion values remain unavailable until a rate is configured.
        </div>
      )}

      {/* 2. Independent Reference vs Current comparison */}
      <SnapshotComparisonCard comparison={snapshotComparison} />

      <SourceGroupsCard snapshotPair={snapshotPair} />

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3.5 py-3 bg-white border border-slate-300/80 shadow-2xs" aria-labelledby="comparison-view-title">
        <div>
          <h2 id="comparison-view-title" className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">Comparison view</h2>
          <p className="mt-0.5 text-[10px] text-slate-500 font-sans">Filter itemized comparison rows by canonical status: Unchanged, Changed, Added, or Removed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]" role="group" aria-label="Comparison view">
          {([
            { mode: 'all' as const, label: 'All', count: allFindings.length },
            { mode: 'changed' as const, label: 'Changed', count: changedFindingsCount },
            { mode: 'added' as const, label: 'Added', count: addedFindingsCount },
            { mode: 'removed' as const, label: 'Removed', count: removedFindingsCount },
            { mode: 'unchanged' as const, label: 'Unchanged', count: unchangedFindingsCount }
          ]).map(option => (
            <button
              key={option.mode}
              type="button"
              aria-pressed={comparisonView === option.mode}
              onClick={() => setComparisonView(option.mode)}
              className={`px-2.5 py-1.5 border transition-colors cursor-pointer ${comparisonView === option.mode ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}`}
            >
              {option.label} <span className={comparisonView === option.mode ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Variance Tree Decomposition */}
      {exactSnapshotCalculation && <VarianceTreeCard costBreakdown={costBreakdown} />}

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
            <span>Itemized Cost Breakdown · {comparisonView.toUpperCase()}</span>
          </button>

          {/* Sub-Tab Switcher */}
        <div className="flex flex-wrap items-center justify-end gap-2">
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

      {isDetailedExpanded && (
          <div className="p-0">
            {subTab === 'bom' ? (
              <BOMDetailedTable
                findings={snapshotComparison.bomFindings}
                referenceItems={snapshotPair.reference.bom}
                currentItems={snapshotPair.current.bom}
                viewMode={comparisonView}
              />
            ) : subTab === 'routing' ? (
              <RoutingDetailedTable
                findings={snapshotComparison.routingFindings}
                referenceItems={snapshotPair.reference.routing}
                currentItems={snapshotPair.current.routing}
                referenceRates={snapshotPair.reference.rates}
                currentRates={snapshotPair.current.rates}
                viewMode={comparisonView}
              />
            ) : (
              <WorkCenterComparisonTable
                referenceRates={snapshotPair.reference.rates}
                currentRates={snapshotPair.current.rates}
                findings={snapshotComparison.workCenterFindings}
                viewMode={comparisonView}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
