import React, { useEffect, useState } from 'react'
import type { CandidateRcaDraft, CandidateRcaRecord } from '../../../core'

interface CandidateRcaFormProps {
  candidateKey: string
  record?: CandidateRcaRecord
  onSave: (draft: CandidateRcaDraft) => void
}

export const CandidateRcaForm: React.FC<CandidateRcaFormProps> = ({
  candidateKey,
  record,
  onSave
}) => {
  const [rootCause, setRootCause] = useState(record?.rootCause ?? '')
  const [action, setAction] = useState(record?.action ?? '')

  useEffect(() => {
    setRootCause(record?.rootCause ?? '')
    setAction(record?.action ?? '')
  }, [candidateKey, record?.rootCause, record?.action])

  return (
    <section aria-labelledby="candidate-rca-heading" className="border-b border-slate-300 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-slate-600">02 / RCA notes</p>
          <h2 id="candidate-rca-heading" className="mt-1 text-base font-semibold text-slate-900">
            Root Cause and Action
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-5 text-slate-600">
          Optional notes saved with this candidate. They explain the response; they do not change simulation values.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
        <div>
          <label htmlFor={`candidate-root-cause-${candidateKey}`} className="mb-1.5 block text-sm font-medium text-slate-800">
            Root Cause / Why? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id={`candidate-root-cause-${candidateKey}`}
            value={rootCause}
            onChange={event => setRootCause(event.target.value)}
            rows={3}
            className="min-h-24 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm leading-5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor={`candidate-action-${candidateKey}`} className="mb-1.5 block text-sm font-medium text-slate-800">
            Action <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id={`candidate-action-${candidateKey}`}
            value={action}
            onChange={event => setAction(event.target.value)}
            rows={3}
            className="min-h-24 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm leading-5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onSave({ rootCause, action })}
          className="min-h-11 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Save notes
        </button>
        {record && (
          <p role="status" className="text-xs text-emerald-700">
            Notes saved for this candidate.
          </p>
        )}
      </div>
    </section>
  )
}
