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
  <section
    aria-labelledby="rca-candidate-heading"
    className="grid grid-cols-1 items-end gap-3 border border-slate-300 bg-white px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,1.2fr)] md:gap-5"
  >
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600">01 / Candidate</p>
      <h2 id="rca-candidate-heading" className="mt-1 font-mono text-xs font-bold uppercase text-slate-900">
        Choose the RCA target
      </h2>
      <p id="rca-candidate-guidance" className="mt-1 text-xs leading-5 text-slate-600">
        {candidates.length === 0
          ? 'The candidate pool is empty. Add findings in Candidate Prioritization first.'
          : 'Ranking is context only. No candidate is selected until you choose one.'}
      </p>
    </div>

    <div>
      <label htmlFor="rca-candidate-selector" className="mb-1 block font-mono text-[10px] font-semibold uppercase text-slate-700">
        Candidate
      </label>
      <select
        id="rca-candidate-selector"
        aria-describedby="rca-candidate-guidance"
        value={selectedCandidateKey ?? ''}
        onChange={event => onSelectCandidate(event.target.value || null)}
        disabled={candidates.length === 0}
        className="min-h-9 w-full rounded-sm border border-slate-400 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
    </div>
  </section>
)
