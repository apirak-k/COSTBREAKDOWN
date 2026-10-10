import React, { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../../core'

type RoutingDraft = Omit<SnapshotRoutingStep, 'id' | 'confidence'>

interface AddRoutingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (step: RoutingDraft) => void
  rates: SnapshotWorkCenterRate[]
  initialData?: SnapshotRoutingStep
}

const textNumber = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const nullable = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const AddRoutingModal: React.FC<AddRoutingModalProps> = ({ isOpen, onClose, onSave, rates, initialData }) => {
  const [operationCode, setOperationCode] = useState('')
  const [sequence, setSequence] = useState('')
  const [processName, setProcessName] = useState('')
  const [workCenterId, setWorkCenterId] = useState('')
  const [manning, setManning] = useState('')
  const [capacity, setCapacity] = useState('')
  const [yieldPercent, setYieldPercent] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setOperationCode(initialData?.operationCode || '')
    setSequence(textNumber(initialData?.sequence))
    setProcessName(initialData?.processName || '')
    setWorkCenterId(initialData?.workCenterId || '')
    setManning(textNumber(initialData?.manning))
    setCapacity(textNumber(initialData?.capacity))
    setYieldPercent(initialData?.yield === null || initialData?.yield === undefined ? '' : String(initialData.yield * 100))
    setNote(initialData?.note || '')
    setError('')
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const seq = nullable(sequence)
    const m = nullable(manning)
    const cap = nullable(capacity)
    const yieldValue = nullable(yieldPercent)
    if (!operationCode.trim() && !processName.trim()) return setError('Operation Code or Process Name is required.')
    if (seq !== null && (!Number.isFinite(seq) || seq < 0)) return setError('Sequence must be zero or a positive number.')
    if (m !== null && (!Number.isFinite(m) || m < 0)) return setError('Manning must be zero or a positive number.')
    if (cap !== null && (!Number.isFinite(cap) || cap <= 0)) return setError('Capacity must be greater than zero.')
    if (yieldValue !== null && (!Number.isFinite(yieldValue) || yieldValue <= 0 || yieldValue > 100)) return setError('Yield must be greater than 0% and no more than 100%.')
    onSave({
      operationCode: operationCode.trim() || undefined,
      sequence: seq === null ? undefined : seq,
      processName: processName.trim(),
      workCenterId: workCenterId.trim() || undefined,
      manning: m,
      capacity: cap,
      yield: yieldValue === null ? null : yieldValue / 100,
      note: note.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="routing-modal-title">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 id="routing-modal-title" className="text-base font-semibold text-slate-900">{initialData ? 'Edit Routing Step' : 'Add Routing Step'}</h3>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
          {error && <div role="alert" className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="font-medium text-slate-800">Operation Code<input value={operationCode} onChange={event => setOperationCode(event.target.value)} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
            <label className="font-medium text-slate-800">Sequence<input type="number" step="any" value={sequence} onChange={event => setSequence(event.target.value)} placeholder="optional" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          </div>
          <label className="block font-medium text-slate-800">Process Name<input value={processName} onChange={event => setProcessName(event.target.value)} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="font-medium text-slate-800">Work Center Code<select value={workCenterId} onChange={event => setWorkCenterId(event.target.value)} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"><option value="">Not linked / missing</option>{rates.map(rate => <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode} — {rate.description}</option>)}</select></label>
            <label className="font-medium text-slate-800">Manning<input type="number" step="any" value={manning} onChange={event => setManning(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="font-medium text-slate-800">Capacity<input type="number" step="any" value={capacity} onChange={event => setCapacity(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
            <label className="font-medium text-slate-800">Yield %<input type="number" step="any" min="0" max="100" value={yieldPercent} onChange={event => setYieldPercent(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          </div>
          <label className="block font-medium text-slate-800">Note<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-24 w-full resize-y rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={onClose} className="min-h-10 rounded-sm border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer">Cancel</button><button type="submit" className="flex min-h-10 items-center gap-1.5 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><Check className="h-4 w-4" /> Save</button></div>
        </form>
      </div>
    </div>
  )
}
