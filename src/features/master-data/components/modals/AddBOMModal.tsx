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
  const [sourceRef, setSourceRef] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setItemCode(initialData?.itemCode || '')
    setDescription(initialData?.description || '')
    setConsumption(textNumber(initialData?.consumption))
    setUnit(initialData?.unit || uomList[0] || '')
    setPrice(textNumber(initialData?.price))
    setLoss(initialData?.loss === null || initialData?.loss === undefined ? '' : String(initialData.loss * 100))
    setSourceRef(initialData?.sourceRef || '')
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
      sourceRef: sourceRef.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">{initialData ? 'Edit BOM Item' : 'Add BOM Item'}</h3><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className="font-semibold text-slate-700">Item Code *<input value={itemCode} onChange={event => { setItemCode(event.target.value); setError('') }} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label>
            <label className="font-semibold text-slate-700">Unit<input value={unit} onChange={event => setUnit(event.target.value)} list="master-data-uoms" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /><datalist id="master-data-uoms">{uomList.map(uom => <option key={uom} value={uom} />)}</datalist></label>
          </div>
          <label className="block font-semibold text-slate-700">Description<input value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-slate-900" /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="font-semibold text-slate-700">Consumption<input type="number" step="any" value={consumption} onChange={event => setConsumption(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label>
            <label className="font-semibold text-slate-700">Price<input type="number" step="any" value={price} onChange={event => setPrice(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label>
            <label className="font-semibold text-slate-700">Loss %<input type="number" step="any" min="0" max="100" value={loss} onChange={event => setLoss(event.target.value)} placeholder="blank = missing" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900" /></label>
          </div>
          <label className="block font-semibold text-slate-700">Source Reference<input value={sourceRef} onChange={event => setSourceRef(event.target.value)} placeholder="optional; keep traceability" className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-slate-900" /></label>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={onClose} className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">Cancel</button><button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"><Check className="w-3.5 h-3.5" /> Save</button></div>
        </form>
      </div>
    </div>
  )
}
