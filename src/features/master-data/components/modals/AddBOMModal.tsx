import React, { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SnapshotBOMItem } from '../../../../core'
import { useAppStore } from '../../../../state'

type BOMDraft = Omit<SnapshotBOMItem, 'id' | 'confidence'>

interface AddBOMModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: BOMDraft) => void
  initialData?: SnapshotBOMItem
}

const textNumber = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
const nullable = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const AddBOMModal: React.FC<AddBOMModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { uomList } = useAppStore()
  const [itemCode, setItemCode] = useState('')
  const [description, setDescription] = useState('')
  const [consumption, setConsumption] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [loss, setLoss] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setItemCode(initialData?.itemCode || '')
    setDescription(initialData?.description || '')
    setConsumption(textNumber(initialData?.consumption))
    setUnit(initialData?.unit || uomList[0] || '')
    setPrice(textNumber(initialData?.price))
    setLoss(initialData?.loss === null || initialData?.loss === undefined ? '' : String(initialData.loss * 100))
    setNote(initialData?.note || '')
    setError('')
  }, [initialData, isOpen, uomList])

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const q = nullable(consumption)
    const p = nullable(price)
    const l = nullable(loss)
    if (!itemCode.trim()) return setError('Item Code is required.')
    if (q !== null && (!Number.isFinite(q) || q < 0)) return setError('Consumption must be zero or a positive number.')
    if (p !== null && (!Number.isFinite(p) || p < 0)) return setError('Price must be zero or a positive number.')
    if (l !== null && (!Number.isFinite(l) || l < 0 || l > 100)) return setError('Loss must be between 0% and 100%.')
    onSave({
      itemCode: itemCode.trim(),
      description: description.trim(),
      consumption: q,
      unit: unit.trim(),
      price: p,
      loss: l === null ? null : l / 100,
      note: note.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="bom-item-modal-title">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 id="bom-item-modal-title" className="text-base font-semibold text-slate-900">{initialData ? 'Edit BOM Item' : 'Add BOM Item'}</h3>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
          {error && <div role="alert" className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="font-medium text-slate-800">Item Code *<input value={itemCode} onChange={event => { setItemCode(event.target.value); setError('') }} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
            <label className="font-medium text-slate-800">Unit<input value={unit} onChange={event => setUnit(event.target.value)} list="master-data-uoms" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /><datalist id="master-data-uoms">{uomList.map(uom => <option key={uom} value={uom} />)}</datalist></label>
          </div>
          <label className="block font-medium text-slate-800">Description<input value={description} onChange={event => setDescription(event.target.value)} className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="font-medium text-slate-800">Consumption<input type="number" step="any" value={consumption} onChange={event => setConsumption(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
            <label className="font-medium text-slate-800">Price<input type="number" step="any" value={price} onChange={event => setPrice(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
            <label className="font-medium text-slate-800">Loss %<input type="number" step="any" min="0" max="100" value={loss} onChange={event => setLoss(event.target.value)} placeholder="blank = missing" className="mt-1 min-h-10 w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          </div>
          <label className="block font-medium text-slate-800">Note<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-24 w-full resize-y rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200" /></label>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={onClose} className="min-h-10 rounded-sm border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer">Cancel</button><button type="submit" className="flex min-h-10 items-center gap-1.5 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"><Check className="h-4 w-4" /> Save</button></div>
        </form>
      </div>
    </div>
  )
}
