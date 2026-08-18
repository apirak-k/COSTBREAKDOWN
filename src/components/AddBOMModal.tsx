import React, { useState } from 'react'
import { X } from 'lucide-react'
import { BOMItem } from '../lib/types'
import { useAppStore } from '../lib/store'

interface AddBOMModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Omit<BOMItem, 'id'>) => void
  initialData?: BOMItem
}

export const AddBOMModal: React.FC<AddBOMModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const { uomList } = useAppStore()

  const [itemCode, setItemCode] = useState(initialData?.itemCode || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [consumption, setConsumption] = useState(initialData ? String(initialData.consumption) : '')
  const [unit, setUnit] = useState(initialData?.unit || 'PC')
  const [basePrice, setBasePrice] = useState(initialData ? String(initialData.basePrice) : '')
  const [activePrice, setActivePrice] = useState(initialData ? String(initialData.activePrice) : '')
  const [baseLoss, setBaseLoss] = useState(initialData ? String(initialData.baseLoss * 100) : '0')
  const [activeLoss, setActiveLoss] = useState(initialData ? String(initialData.activeLoss * 100) : '0')
  const [sourceRef, setSourceRef] = useState(initialData?.sourceRef || 'Price List 07-26')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemCode.trim()) {
      setError('Item Code is required.')
      return
    }
    const q = parseFloat(consumption)
    const p0 = parseFloat(basePrice)
    const p1 = parseFloat(activePrice)
    const l0 = parseFloat(baseLoss) / 100
    const l1 = parseFloat(activeLoss) / 100

    if (isNaN(q) || q < 0) {
      setError('Usage / Consumption (Q) must be a positive number.')
      return
    }
    if (isNaN(p0) || p0 < 0 || isNaN(p1) || p1 < 0) {
      setError('Prices cannot be negative.')
      return
    }
    if (l0 < 0 || l0 > 1 || l1 < 0 || l1 > 1) {
      setError('Loss percentage must be between 0% and 100%.')
      return
    }

    onSave({
      itemCode: itemCode.trim(),
      description: description.trim() || itemCode.trim(),
      consumption: q,
      unit: unit.trim() || 'PC',
      basePrice: p0,
      activePrice: p1,
      baseLoss: l0,
      activeLoss: l1,
      sourceRef: sourceRef.trim() || 'Price List'
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {initialData ? 'Edit BOM Material Item' : 'Add New BOM Material Item'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Item Code *</label>
              <input
                type="text"
                value={itemCode}
                onChange={e => { setItemCode(e.target.value); setError('') }}
                placeholder="e.g. RMMBA1020"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UOM Unit</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {uomList.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. DOTITE Conductive Silver Paste"
              className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Usage (Q) *</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={consumption}
                onChange={e => setConsumption(e.target.value)}
                placeholder="0.0035"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Price P0 (THB)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={basePrice}
                onChange={e => setBasePrice(e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Price P1 (THB)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={activePrice}
                onChange={e => setActivePrice(e.target.value)}
                placeholder="545.60"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Loss % (L0)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={baseLoss}
                onChange={e => setBaseLoss(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Loss % (L1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={activeLoss}
                onChange={e => setActiveLoss(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source Reference</label>
            <input
              type="text"
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              placeholder="e.g. Price List 07-26 row 112"
              className="w-full px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold shadow-xs cursor-pointer"
            >
              {initialData ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
