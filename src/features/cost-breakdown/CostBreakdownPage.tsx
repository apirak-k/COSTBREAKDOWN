import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { ExecutiveKPICards } from './components/ExecutiveKPICards'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { RoutingDetailedTable } from './components/RoutingDetailedTable'
import { WorkCenterComparisonTable } from './components/WorkCenterComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { isVisibleInComparisonView } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { areSnapshotCostsComplete } from '../../core'
import { PageHeading } from '../../shared'

type SubTab = 'bom' | 'routing' | 'work-center'

export const CostBreakdownPage: React.FC = () => {
  const { costBreakdown, snapshotComparison, snapshotPair, bom, routing, rates } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>('all')
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)
  const allFindings = [
    ...snapshotComparison.bomFindings,
    ...snapshotComparison.routingFindings,
    ...snapshotComparison.workCenterFindings
  ]
  const changedFindingsCount = allFindings.filter(finding => isVisibleInComparisonView(finding, 'changed')).length
  const addedFindingsCount = allFindings.filter(f => f.matchStatus === 'added').length
  const removedFindingsCount = allFindings.filter(f => f.matchStatus === 'removed').length
  const unchangedFindingsCount = allFindings.filter(f => f.matchStatus === 'matched' && Object.keys(f.fieldDiffs).length === 0).length
  const exactSnapshotCalculation = areSnapshotCostsComplete(snapshotComparison.referenceCost, snapshotComparison.currentCost)

  return (
    <div className="space-y-5">
      <PageHeading
        title="Cost Breakdown"
        description="Compare Reference and Current cost, then review the record-level changes that explain the gap."
      />

      {/* 1. Top Executive KPIs */}
      {exactSnapshotCalculation ? (
        <ExecutiveKPICards costBreakdown={costBreakdown} />
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          <strong className="font-mono">Exact legacy variance summary is on hold.</strong>{' '}
          Snapshot calculation has missing, invalid, or reviewable inputs. The comparison card below keeps the affected values as N/A and lists the source warnings.
        </div>
      )}

      {costBreakdown.missingWorkCenters.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          <strong className="font-mono">Missing Work Center rates:</strong>{' '}
          {costBreakdown.missingWorkCenters.join(', ')}. Affected conversion values remain unavailable until a rate is configured.
        </div>
      )}

      {/* 2. Independent Reference vs Current comparison */}
      <SnapshotComparisonCard comparison={snapshotComparison} />

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="comparison-view-title">
        <div>
          <h2 id="comparison-view-title" className="text-sm font-semibold text-slate-900">Comparison view</h2>
          <p className="mt-0.5 text-xs text-slate-600">Filter itemized rows by status: Unchanged, Changed, Added, or Removed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Comparison view">
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
              className={`min-h-9 rounded-sm border px-3 py-1.5 font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${comparisonView === option.mode ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              {option.label} <span className={comparisonView === option.mode ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Variance Tree Decomposition */}
      {exactSnapshotCalculation && <VarianceTreeCard costBreakdown={costBreakdown} />}

      {/* 4. Detailed Breakdown Tables Panel */}
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Itemized cost breakdown">
        {/* Section Accordion Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            aria-expanded={isDetailedExpanded}
            aria-controls="itemized-cost-details"
            className="flex min-h-10 items-center gap-2 text-left text-sm font-semibold text-slate-900 hover:text-blue-800 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isDetailedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Itemized Cost Breakdown <span className="font-normal text-slate-500">· {comparisonView.toUpperCase()}</span></span>
          </button>

          {/* Sub-Tab Switcher */}
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Detailed cost section">
              <button
                type="button"
                aria-pressed={subTab === 'bom'}
                onClick={() => setSubTab('bom')}
                className={`min-h-9 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  subTab === 'bom'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                BOM ({bom.length})
              </button>
              <button
                type="button"
                aria-pressed={subTab === 'routing'}
                onClick={() => setSubTab('routing')}
                className={`min-h-9 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  subTab === 'routing'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Routing ({routing.length})
              </button>
              <button
                type="button"
                aria-pressed={subTab === 'work-center'}
                onClick={() => setSubTab('work-center')}
                className={`min-h-9 rounded-sm border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  subTab === 'work-center'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                Work Center ({rates.length})
              </button>
            </div>
          </div>
        </div>

      {isDetailedExpanded && (
        <div id="itemized-cost-details">
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
      </section>
    </div>
  )
}
