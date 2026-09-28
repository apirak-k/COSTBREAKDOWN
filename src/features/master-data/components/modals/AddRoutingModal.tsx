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
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) return setError('Capacity must be zero or a positive number.')
    if (yieldValue !== null && (!Number.isFinite(yieldValue) || yieldValue < 0 || yieldValue > 100)) return setError('Yield must be between 0% and 100%.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"><div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">{initialData ? 'Edit Routing Step' : 'Add Routing Step'}</h3><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">{error}</div>}
        <div className="grid grid-cols-2 gap-3"><label className="font-semibold text-slate-700">Operation Code<input value={operationCode} onChange={event => setOperationCode(event.target.value)} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label><label className="font-semibold text-slate-700">Sequence<input type="number" step="any" value={sequence} onChange={event => setSequence(event.target.value)} placeholder="optional" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label></div>
        <label className="block font-semibold text-slate-700">Process Name<input value={processName} onChange={event => setProcessName(event.target.value)} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md text-slate-900" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="font-semibold text-slate-700">Work Center Code<select value={workCenterId} onChange={event => setWorkCenterId(event.target.value)} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900"><option value="">Not linked / missing</option>{rates.map(rate => <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode} — {rate.description}</option>)}</select></label><label className="font-semibold text-slate-700">Manning<input type="number" step="any" value={manning} onChange={event => setManning(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="font-semibold text-slate-700">Capacity<input type="number" step="any" value={capacity} onChange={event => setCapacity(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label><label className="font-semibold text-slate-700">Yield %<input type="number" step="any" min="0" max="100" value={yieldPercent} onChange={event => setYieldPercent(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label></div>
        <label className="block font-semibold text-slate-700">Note<textarea rows={2} value={note} onChange={event => setNote(event.target.value)} className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md text-slate-900 resize-y" /></label>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={onClose} className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">Cancel</button><button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"><Check className="w-3.5 h-3.5" /> Save</button></div>
      </form>
    </div></div>
  )
}
