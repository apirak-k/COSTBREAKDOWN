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
  <section className="rounded-md border border-slate-200 bg-white p-4" aria-label="Candidate selection">
    <label
      htmlFor="rca-candidate-selector"
      className="block text-sm font-semibold text-slate-800"
    >
      Select candidate
    </label>
    <select
      id="rca-candidate-selector"
      value={selectedCandidateKey ?? ''}
      onChange={event => onSelectCandidate(event.target.value || null)}
      disabled={candidates.length === 0}
      className="mt-2 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
    <p className="mt-2 text-sm text-slate-600">
      Choose the RCA target here. Ranking is context only and does not preselect a candidate.
    </p>
  </section>
)
