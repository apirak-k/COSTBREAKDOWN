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
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Root Cause and Action</h3>
        <p className="mt-1 text-xs text-slate-500">
          Both notes are optional and are saved with this candidate. They do not change simulation values.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`candidate-root-cause-${candidateKey}`} className="mb-1 block text-xs font-medium text-slate-700">
            Root Cause / Why? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id={`candidate-root-cause-${candidateKey}`}
            value={rootCause}
            onChange={event => setRootCause(event.target.value)}
            rows={3}
            className="min-h-24 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor={`candidate-action-${candidateKey}`} className="mb-1 block text-xs font-medium text-slate-700">
            Action <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id={`candidate-action-${candidateKey}`}
            value={action}
            onChange={event => setAction(event.target.value)}
            rows={3}
            className="min-h-24 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onSave({ rootCause, action })}
          className="min-h-10 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
