import React, { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SnapshotWorkCenterRate } from '../../../../core'

type RateDraft = Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>

interface AddRateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rate: RateDraft) => void
  initialData?: SnapshotWorkCenterRate
}

const textNumber = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const nullable = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const AddRateModal: React.FC<AddRateModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [workCenterCode, setWorkCenterCode] = useState('')
  const [description, setDescription] = useState('')
  const [laborRate, setLaborRate] = useState('')
  const [burdenRate, setBurdenRate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setWorkCenterCode(initialData?.workCenterCode || '')
    setDescription(initialData?.description || '')
    setLaborRate(textNumber(initialData?.laborRate))
    setBurdenRate(textNumber(initialData?.burdenRate))
    setNote(initialData?.note || '')
    setError('')
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const labor = nullable(laborRate)
    const burden = nullable(burdenRate)
    if (!workCenterCode.trim()) return setError('Work Center Code is required.')
    if (labor !== null && (!Number.isFinite(labor) || labor < 0)) return setError('Labor Rate must be zero or a positive number.')
    if (burden !== null && (!Number.isFinite(burden) || burden < 0)) return setError('Burden Rate must be zero or a positive number.')
    onSave({
      workCenterCode: workCenterCode.trim(),
      description: description.trim(),
      laborRate: labor,
      burdenRate: burden,
      effectiveDate: initialData?.effectiveDate ?? '',
      note: note.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="rate-modal-title"><div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4"><h3 id="rate-modal-title" className="text-base font-semibold text-slate-900">{initialData ? 'Edit Work Center Rate' : 'Add Work Center Rate'}</h3><button type="button" onClick={onClose} aria-label="Close dialog" className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><X className="h-4 w-4" /></button></div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
        {error && <div role="alert" className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="font-medium text-slate-800">Work Center Code *<input value={workCenterCode} onChange={event => { setWorkCenterCode(event.target.value); setError('') }} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label><label className="font-medium text-slate-800">Work Center Name<input value={description} onChange={event => setDescription(event.target.value)} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="font-medium text-slate-800">Labor Rate<input type="number" step="any" value={laborRate} onChange={event => setLaborRate(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label><label className="font-medium text-slate-800">Burden Rate<input type="number" step="any" value={burdenRate} onChange={event => setBurdenRate(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label></div>
        <label className="block font-medium text-slate-800">Note<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-24 w-full resize-y rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={onClose} className="min-h-10 rounded-sm border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer">Cancel</button><button type="submit" className="flex min-h-10 items-center gap-1.5 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><Check className="h-4 w-4" /> Save</button></div>
      </form>
    </div></div>
  )
}
