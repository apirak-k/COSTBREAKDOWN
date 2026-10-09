import React, { useEffect, useMemo, useState } from 'react'
import type { CandidateRcaDraft, PrioritizationCandidate, RcaCaseRecord } from '../../core'
import {
  createRcaSimulationHandoffContext,
  type RcaSimulationHandoffContext
} from '../../state/rca-cases'

interface RcaCaseWorkspaceProps {
  candidates: PrioritizationCandidate[]
  cases: RcaCaseRecord[]
  activeCaseId: string | null
  onSelectCase: (id: string | null) => void
  onSave: (id: string, draft: CandidateRcaDraft) => void
  onClose: () => void
  onProceedToSimulation: (context: RcaSimulationHandoffContext) => void
}

export const RcaCaseWorkspace: React.FC<RcaCaseWorkspaceProps> = ({
  candidates,
  cases,
  activeCaseId,
  onSelectCase,
  onSave,
  onClose,
  onProceedToSimulation
}) => {
  const activeCase = cases.find(record => record.id === activeCaseId) ?? null
  const [draft, setDraft] = useState<CandidateRcaDraft>({ rootCause: '', action: '' })
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setDraft({ rootCause: activeCase?.rootCause ?? '', action: activeCase?.action ?? '' })
    setSaved(true)
  }, [activeCase?.id, activeCase?.rootCause, activeCase?.action])

  const candidateNames = useMemo(() => new Map(candidates.map(candidate => [candidate.candidateKey, candidate.candidateName])), [candidates])
  const activeCandidateNames = activeCase?.candidateKeys.map(key => candidateNames.get(key) ?? key) ?? []

  const save = () => {
    if (!activeCase) return
    onSave(activeCase.id, draft)
    setSaved(true)
  }

  const proceedToSimulation = () => {
    if (!activeCase) return
    if (!saved) save()
    onProceedToSimulation(createRcaSimulationHandoffContext(activeCase, draft))
  }

  const close = () => {
    if (!saved) save()
    onClose()
  }

  return (
    <section className="space-y-3 border-t border-slate-300 bg-white py-3" aria-labelledby="rca-case-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <h2 id="rca-case-title" className="font-sans text-sm font-semibold text-slate-950">RCA Case</h2>
          {activeCandidateNames.length > 0 && <p className="mt-0.5 text-xs text-slate-600">Candidates: {activeCandidateNames.join(' · ')}</p>}
        </div>
        <button type="button" onClick={close} className="min-h-8 border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          Back to Candidates
        </button>
      </div>

      {cases.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label htmlFor="rca-case-select" className="min-w-52 flex-1 text-xs font-medium text-slate-700">
            Saved RCA Cases
            <select
              id="rca-case-select"
              value={activeCaseId ?? ''}
              onChange={event => {
                if (!saved && activeCase) onSave(activeCase.id, draft)
                onSelectCase(event.target.value || null)
              }}
              className="mt-1 min-h-9 w-full border border-slate-400 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Choose an RCA Case</option>
              {cases.map(record => (
                <option key={record.id} value={record.id}>
                  {record.candidateKeys.length} {record.candidateKeys.length === 1 ? 'Candidate' : 'Candidates'} · {record.rootCause.trim() || 'Untitled case'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!activeCase ? (
        <p className="py-4 text-center text-xs text-slate-600">Select a saved Case to continue.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">
              Root Cause / Why?
              <textarea
                value={draft.rootCause}
                onChange={event => { setDraft(value => ({ ...value, rootCause: event.target.value })); setSaved(false) }}
                rows={4}
                className="mt-1 block w-full border border-slate-400 px-2.5 py-2 text-xs font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Action
              <textarea
                value={draft.action}
                onChange={event => { setDraft(value => ({ ...value, action: event.target.value })); setSaved(false) }}
                rows={4}
                className="mt-1 block w-full border border-slate-400 px-2.5 py-2 text-xs font-normal text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
            <p role="status" className={`text-[11px] font-medium ${saved ? 'text-emerald-800' : 'text-slate-600'}`}>{saved ? 'Saved' : 'Draft'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={saved} className="min-h-8 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-default disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Save
              </button>
              <button type="button" onClick={proceedToSimulation} className="min-h-8 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                Proceed to Simulation
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
