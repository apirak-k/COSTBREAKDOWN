import React from 'react'
import type { PrioritizationCandidate } from '../../../core'

interface CandidateSelectorProps {
  candidates: PrioritizationCandidate[]
  selectedCandidateKey: string | null
  onSelectCandidate: (candidateKey: string | null) => void
}

export const CandidateSelector: React.FC<CandidateSelectorProps> = ({
  candidates,
  selectedCandidateKey,
  onSelectCandidate
}) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
    <label
      htmlFor="rca-candidate-selector"
      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
    >
      Select candidate
    </label>
    <select
      id="rca-candidate-selector"
      value={selectedCandidateKey ?? ''}
      onChange={event => onSelectCandidate(event.target.value || null)}
      disabled={candidates.length === 0}
      className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      <option value="" disabled>
        {candidates.length === 0 ? 'No candidates available' : 'Choose a candidate'}
      </option>
      {candidates.map(candidate => (
        <option key={candidate.candidateKey} value={candidate.candidateKey}>
          #{candidate.rank} · {candidate.candidateName} · {candidate.status}
        </option>
      ))}
    </select>
    <p className="mt-2 text-xs text-slate-500">
      Choose the RCA target here. Ranking is context only and does not preselect a candidate.
    </p>
  </section>
)
