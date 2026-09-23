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
  const [effectiveDate, setEffectiveDate] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setWorkCenterCode(initialData?.workCenterCode || '')
    setDescription(initialData?.description || '')
    setLaborRate(textNumber(initialData?.laborRate))
    setBurdenRate(textNumber(initialData?.burdenRate))
    setEffectiveDate(initialData?.effectiveDate || '')
    setSourceRef(initialData?.sourceRef || '')
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
      effectiveDate: effectiveDate.trim(),
      sourceRef: sourceRef.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"><div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">{initialData ? 'Edit Work Center Rate' : 'Add Work Center Rate'}</h3><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">{error}</div>}
        <div className="grid grid-cols-2 gap-3"><label className="font-semibold text-slate-700">Work Center Code *<input value={workCenterCode} onChange={event => { setWorkCenterCode(event.target.value); setError('') }} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label><label className="font-semibold text-slate-700">Effective Date<input type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label></div>
        <label className="block font-semibold text-slate-700">Description<input value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-slate-900" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="font-semibold text-slate-700">Labor Rate<input type="number" step="any" value={laborRate} onChange={event => setLaborRate(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label><label className="font-semibold text-slate-700">Burden Rate<input type="number" step="any" value={burdenRate} onChange={event => setBurdenRate(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label></div>
        <label className="block font-semibold text-slate-700">Source Reference<input value={sourceRef} onChange={event => setSourceRef(event.target.value)} placeholder="optional; keep traceability" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-slate-900" /></label>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={onClose} className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">Cancel</button><button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"><Check className="w-3.5 h-3.5" /> Save</button></div>
      </form>
    </div></div>
  )
}
