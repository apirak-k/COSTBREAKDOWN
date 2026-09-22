import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { DriversTable } from './components/DriversTable'
import { getRankingCategories, getVisibleDrivers, type RankingViewState } from './ranking-view'

export const CandidateSelectionPage: React.FC = () => {
  const { topDrivers, updateDriverHumanInput, costBreakdown } = useAppStore()
  const totalVariance = costBreakdown.totalVariance
  const [viewState, setViewState] = useState<RankingViewState>({
    category: 'all',
    impact: 'all',
    sortBy: 'costGap',
    sortDirection: 'desc'
  })
  const categories = useMemo(() => getRankingCategories(topDrivers), [topDrivers])
  const visibleDrivers = useMemo(
    () => getVisibleDrivers(topDrivers, viewState),
    [topDrivers, viewState]
  )

  if (topDrivers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white px-4 py-3 rounded border border-slate-300/80 shadow-2xs">
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Section 3: Cost Driver Prioritization & Candidate Selection
          </h1>
        </div>
        <div className="bg-white py-12 rounded border border-slate-300/80 shadow-2xs text-center text-slate-400 text-xs font-mono">
          No positive cost variance detected. Enter Base vs Active data in Master Data to evaluate drivers.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            Cost Driver Prioritization
          </h1>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
            Ranked by Cost Gap with Controllability Assessment
          </p>
        </div>
        <div className="text-right font-mono flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Net Variance (Δ):</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono tabular-nums bg-slate-100 border border-slate-200 ${
            totalVariance >= 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {formatVariance(totalVariance, 4)} THB/pc
          </span>
        </div>
        <div className="w-full border-t border-slate-100 pt-3 flex flex-wrap items-end gap-2">
          <label htmlFor="ranking-category" className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Category
            <select
              id="ranking-category"
              value={viewState.category}
              onChange={event => setViewState(previous => ({ ...previous, category: event.target.value }))}
              className="min-w-[170px] px-2 py-1.5 text-xs normal-case font-sans font-medium text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="all">All categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>

          <label htmlFor="ranking-impact" className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Impact
            <select
              id="ranking-impact"
              value={viewState.impact}
              onChange={event => setViewState(previous => ({ ...previous, impact: event.target.value as RankingViewState['impact'] }))}
              className="min-w-[150px] px-2 py-1.5 text-xs normal-case font-sans font-medium text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="all">All impacts</option>
              <option value="unfavorable">Unfavorable</option>
              <option value="neutral">Neutral</option>
              <option value="favorable">Favorable</option>
            </select>
          </label>

          <label htmlFor="ranking-sort" className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Sort by
            <select
              id="ranking-sort"
              value={viewState.sortBy}
              onChange={event => setViewState(previous => ({ ...previous, sortBy: event.target.value as RankingViewState['sortBy'] }))}
              className="min-w-[155px] px-2 py-1.5 text-xs normal-case font-sans font-medium text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="costGap">Cost impact</option>
              <option value="rank">Default rank</option>
              <option value="pctContribution">Contribution</option>
              <option value="driverName">Driver name</option>
              <option value="category">Category</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setViewState(previous => ({
              ...previous,
              sortDirection: previous.sortDirection === 'desc' ? 'asc' : 'desc'
            }))}
            aria-label={`Sort ${viewState.sortDirection === 'desc' ? 'ascending' : 'descending'}`}
            className="h-[31px] px-3 text-[10px] font-mono font-bold uppercase text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-800"
          >
            {viewState.sortDirection === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>

          <span role="status" className="ml-auto pb-1 text-[11px] text-slate-500 font-sans">
            Showing {visibleDrivers.length} of {topDrivers.length} findings
          </span>
        </div>
      </div>

      {!topDrivers.some(driver => driver.impact === 'unfavorable') && (
        <div role="status" className="px-3 py-2.5 rounded border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-sans">
          No unfavorable cost gap is currently detected. Neutral and favorable findings remain available for review.
        </div>
      )}

      {/* Drivers Table */}
      {visibleDrivers.length > 0 ? (
        <DriversTable topDrivers={visibleDrivers} onUpdateInput={updateDriverHumanInput} />
      ) : (
        <div role="status" className="bg-white py-12 rounded border border-slate-300/80 shadow-2xs text-center text-slate-500 text-xs font-mono">
          No findings match the selected category and impact filters.
        </div>
      )}
    </div>
  )
}
