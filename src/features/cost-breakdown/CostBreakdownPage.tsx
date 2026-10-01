import React, { useState } from 'react'
import { useAppStore } from '../../state'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Sub-components
import { BOMDetailedTable } from './components/BOMDetailedTable'
import { RoutingDetailedTable } from './components/RoutingDetailedTable'
import { WorkCenterComparisonTable } from './components/WorkCenterComparisonTable'
import { SnapshotComparisonCard } from './components/SnapshotComparisonCard'
import { VarianceTreeCard } from './components/VarianceTreeCard'
import { ALL_COMPARISON_STATUSES, areAllComparisonStatusesSelected, getComparisonViewLabel } from './components/comparison-view'
import type { ComparisonViewMode } from './components/comparison-view'
import { areSnapshotCostsComplete, getCanonicalComparisonStatus } from '../../core'
import type { ComparisonStatus } from '../../core'
import { PageHeading } from '../../shared'

type SubTab = 'bom' | 'routing' | 'work-center'

export const CostBreakdownPage: React.FC = () => {
  const { snapshotComparison, snapshotPair, bom, routing, rates } = useAppStore()
  const [subTab, setSubTab] = useState<SubTab>('bom')
  const [comparisonView, setComparisonView] = useState<ComparisonViewMode>(ALL_COMPARISON_STATUSES)
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(true)
  const allFindings = [
    ...snapshotComparison.bomFindings,
    ...snapshotComparison.routingFindings,
    ...snapshotComparison.workCenterFindings
  ]
  const changedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'CHANGED').length
  const addedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'ADDED').length
  const removedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'REMOVED').length
  const unchangedFindingsCount = allFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'UNCHANGED').length
  const exactSnapshotCalculation = areSnapshotCostsComplete(snapshotComparison.referenceCost, snapshotComparison.currentCost)

  const toggleComparisonStatus = (status: ComparisonStatus) => {
    setComparisonView(current => current.includes(status)
      ? current.filter(selected => selected !== status)
      : [...current, status])
  }

  const openDetailSection = (section: SubTab) => {
    setSubTab(section)
    setIsDetailedExpanded(true)
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Cost Breakdown"
        description="Compare Reference and Current cost, then review the record-level changes that explain the gap."
      />

      {!exactSnapshotCalculation && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          <strong className="font-mono">Snapshot cost summary is on hold.</strong>{' '}
          Snapshot calculation has missing, invalid, or reviewable inputs. The comparison card below keeps the affected values as unavailable and lists the source warnings.
        </div>
      )}

      {/* One canonical summary and cost element bridge */}
      <SnapshotComparisonCard comparison={snapshotComparison} />

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="comparison-view-title">
        <div>
          <h2 id="comparison-view-title" className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-900">Comparison view</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Select any combination of statuses. Unmatched rows remain visible under All for review.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Comparison view">
          {([
            { status: 'CHANGED' as const, label: 'Changed', count: changedFindingsCount },
            { status: 'ADDED' as const, label: 'Added', count: addedFindingsCount },
            { status: 'REMOVED' as const, label: 'Removed', count: removedFindingsCount },
            { status: 'UNCHANGED' as const, label: 'Unchanged', count: unchangedFindingsCount }
          ]).map(option => (
            <button
              key={option.status}
              type="button"
              aria-pressed={comparisonView.includes(option.status)}
              onClick={() => toggleComparisonStatus(option.status)}
              className={`min-h-8 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${comparisonView.includes(option.status) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >
              {option.label} <span className={comparisonView.includes(option.status) ? 'text-slate-300' : 'text-slate-400'}>({option.count})</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={areAllComparisonStatusesSelected(comparisonView)}
            onClick={() => setComparisonView(ALL_COMPARISON_STATUSES)}
            className={`min-h-8 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${areAllComparisonStatusesSelected(comparisonView) ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >
            All <span className={areAllComparisonStatusesSelected(comparisonView) ? 'text-slate-300' : 'text-slate-400'}>({allFindings.length})</span>
          </button>
        </div>
      </section>

      <VarianceTreeCard
        comparison={snapshotComparison}
        comparisonView={comparisonView}
        onOpenDetail={openDetailSection}
      />

      {/* Record-level detail */}
      <section id="itemized-cost-details" tabIndex={-1} className="scroll-mt-16 overflow-hidden rounded-md border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label="Itemized cost breakdown">
        {/* Section Accordion Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
            aria-expanded={isDetailedExpanded}
            aria-controls="itemized-cost-details"
            className="flex min-h-8 items-center gap-2 text-left font-mono text-xs font-bold uppercase text-slate-900 hover:text-blue-800 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isDetailedExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Itemized Cost Breakdown <span className="font-normal text-slate-500">· {getComparisonViewLabel(comparisonView)}</span></span>
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
        <div>
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
