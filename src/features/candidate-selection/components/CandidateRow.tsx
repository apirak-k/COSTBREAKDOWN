import React from 'react'
import { PrioritizationCandidate, formatNumber, formatVariance } from '../../../core'
import { CandidateExpandedDetail } from './CandidateExpandedDetail'
import type { CandidateParameterData } from './candidate-detail-data'

interface CandidateRowProps {
  candidate: PrioritizationCandidate
  quickViewKey: string
  parameters: CandidateParameterData
  selectedForRca: boolean
  quickViewSelected: boolean
  expanded: boolean
  onToggleControllable: (candidateKey: string, nextValue: boolean) => void
  onToggleRcaSelection: (candidateKey: string, nextValue: boolean) => void
  onHoverQuickView: (quickViewKey: string | null) => void
  onToggleQuickView: (quickViewKey: string) => void
  onToggleExpanded: (quickViewKey: string) => void
}

const STATUS_STYLES: Record<PrioritizationCandidate['status'], { text: string; marker: string }> = {
  CHANGED: { text: 'text-amber-800', marker: 'bg-amber-700' },
  ADDED: { text: 'text-blue-800', marker: 'bg-blue-700' },
  REMOVED: { text: 'text-rose-800', marker: 'bg-rose-800' }
}

function formatNullable(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value)
}

function hasRedundantFactor(candidate: PrioritizationCandidate): boolean {
  const factor = candidate.factor?.trim().toLocaleLowerCase()
  return (candidate.status === 'ADDED' && (factor === 'item added' || factor === 'added'))
    || (candidate.status === 'REMOVED' && (factor === 'item removed' || factor === 'removed'))
}

export const CandidateRow: React.FC<CandidateRowProps> = ({
  candidate,
  quickViewKey,
  parameters,
  selectedForRca,
  quickViewSelected,
  expanded,
  onToggleControllable,
  onToggleRcaSelection,
  onHoverQuickView,
  onToggleQuickView,
  onToggleExpanded
}) => {
  const statusStyle = STATUS_STYLES[candidate.status]
  const showFactor = Boolean(candidate.factor) && !hasRedundantFactor(candidate)
  const detailId = `candidate-detail-${encodeURIComponent(quickViewKey)}`

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, input, label, summary, a, select, textarea')) return
    onToggleQuickView(quickViewKey)
  }

  return (
    <>
      <tr
        onMouseEnter={() => onHoverQuickView(quickViewKey)}
        onMouseLeave={() => onHoverQuickView(null)}
        onClick={handleRowClick}
        className={`cursor-pointer transition-colors ${quickViewSelected ? 'bg-blue-50' : !candidate.controllable ? 'bg-slate-50 text-slate-600' : 'hover:bg-slate-50/70'}`}
      >
        <td className="px-3 py-2 text-center align-top">
          <input
            type="checkbox"
            checked={selectedForRca}
            onChange={event => onToggleRcaSelection(candidate.candidateKey, event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded-sm border-slate-400 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            aria-label={`Select ${candidate.candidateName} for the current Candidate group`}
          />
        </td>

        <td className="min-w-72 px-4 py-2 align-top">
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <span className="font-mono font-semibold uppercase tracking-wide text-slate-500">{candidate.category}</span>
              {showFactor && <span className="text-slate-500">{candidate.factor}</span>}
            </div>
            <button
              type="button"
              aria-pressed={quickViewSelected}
              onClick={() => onToggleQuickView(quickViewKey)}
              className="break-words text-left text-xs font-semibold leading-4 text-slate-950 underline decoration-transparent underline-offset-2 hover:decoration-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-pressed:decoration-blue-700"
              aria-label={`Show ${candidate.candidateName} in Candidate information`}
            >
              {candidate.candidateName}
            </button>
            <div>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={detailId}
                onClick={() => onToggleExpanded(quickViewKey)}
                className="mt-1 inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
                {expanded ? 'Hide details' : 'Details'}
                <span className="sr-only"> for {candidate.candidateName}</span>
              </button>
            </div>
          </div>
        </td>

        <td className="px-3 py-2 text-center align-top">
          <span className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] font-semibold ${statusStyle.text}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusStyle.marker}`} />
            {candidate.status}
          </span>
        </td>

        <td className="px-3 py-2 text-right align-top font-mono text-xs tabular-nums text-slate-600">
          {formatNullable(candidate.referenceCost, value => formatNumber(value, 4))}
        </td>

        <td className="px-3 py-2 text-right align-top font-mono text-xs font-medium tabular-nums text-slate-950">
          {formatNullable(candidate.currentCost, value => formatNumber(value, 4))}
        </td>

        <td className={`px-3 py-2 text-right align-top font-mono text-xs font-semibold tabular-nums ${
          candidate.costGap === null ? 'text-slate-400' : candidate.costGap > 0 ? 'text-rose-700' : candidate.costGap < 0 ? 'text-emerald-700' : 'text-slate-500'
        }`}>
          {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}
        </td>

        <td className="px-3 py-2 text-center align-top">
          <label className="inline-flex min-h-8 cursor-pointer select-none items-center justify-center gap-1.5 px-1">
            <input
              type="checkbox"
              checked={candidate.controllable}
              onChange={event => onToggleControllable(candidate.candidateKey, event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded-sm border-slate-400 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              aria-label={`Mark ${candidate.candidateName} as controllable`}
            />
            <span className="text-[11px] font-medium text-slate-700">{candidate.controllable ? 'Yes' : 'No'}</span>
          </label>
        </td>
      </tr>

      {expanded && (
        <tr id={detailId} className="bg-slate-50">
          <td colSpan={7} className="px-4 py-3">
            <CandidateExpandedDetail candidate={candidate} parameters={parameters} />
          </td>
        </tr>
      )}
    </>
  )
}
