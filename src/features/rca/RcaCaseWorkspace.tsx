import React from 'react'
import type { CandidateRcaDraft, PrioritizationCandidate } from '../../core'
import { formatNumber, formatVariance } from '../../core'

interface RcaAnalysisWorkspaceProps {
  candidates: PrioritizationCandidate[]
  draft: CandidateRcaDraft
  onDraftChange: (draft: CandidateRcaDraft) => void
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

export const RcaAnalysisWorkspace: React.FC<RcaAnalysisWorkspaceProps> = ({
  candidates,
  draft,
  onDraftChange
}) => (
  <section className="space-y-3 border-t border-slate-300 pt-3" aria-labelledby="rca-analysis-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="rca-analysis-title" className="font-sans text-sm font-semibold text-slate-950">RCA Analysis</h2>
      {candidates.length > 0 && (
        <p className="text-xs text-slate-600">
          <span className="font-mono font-semibold tabular-nums">{candidates.length}</span>{' '}
          {candidates.length === 1 ? 'Candidate selected' : 'Candidates selected'}
        </p>
      )}
    </div>

    {candidates.length === 0 ? (
      <p className="border border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        Select one or more Candidates to begin RCA analysis.
      </p>
    ) : (
      <>
        <div className="overflow-x-auto border-y border-slate-300 bg-white" role="region" aria-label="Selected Candidate group" tabIndex={0}>
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <caption className="sr-only">Candidates in the current RCA analysis group.</caption>
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th scope="col" className="px-3 py-2 font-semibold">Selected Candidate</th>
                <th scope="col" className="px-3 py-2 text-center font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Reference (THB/pc)</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Current (THB/pc)</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Gap (THB/pc)</th>
                <th scope="col" className="px-3 py-2 text-center font-semibold">Controllable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidates.map(candidate => (
                <tr key={candidate.candidateKey}>
                  <th scope="row" className="px-3 py-2 font-medium text-slate-900">
                    <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">{candidate.category}</span>
                    {candidate.candidateName}
                  </th>
                  <td className="px-3 py-2 text-center font-mono text-[11px] font-semibold text-slate-700">{candidate.status}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">{formatCost(candidate.referenceCost)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">{formatCost(candidate.currentCost)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                    {candidate.costGap === null ? '—' : formatVariance(candidate.costGap, 4)}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-700">
                    {candidate.controllable ? 'Controllable' : 'Non-controllable'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <label htmlFor="rca-root-cause" className="block text-xs font-medium text-slate-700">
            Root Cause / Why?
            <textarea
              id="rca-root-cause"
              value={draft.rootCause}
              onChange={event => onDraftChange({ ...draft, rootCause: event.target.value })}
              rows={3}
              className="mt-1 block w-full resize-y border border-slate-400 bg-white px-2.5 py-2 text-xs font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label htmlFor="rca-action" className="block text-xs font-medium text-slate-700">
            Action
            <textarea
              id="rca-action"
              value={draft.action}
              onChange={event => onDraftChange({ ...draft, action: event.target.value })}
              rows={3}
              className="mt-1 block w-full resize-y border border-slate-400 bg-white px-2.5 py-2 text-xs font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
      </>
    )}
  </section>
)
