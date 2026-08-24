import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { WorkCenterRate } from '../../../../core'

interface AddRateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rate: Omit<WorkCenterRate, 'id'>) => void
  initialData?: WorkCenterRate
}

export const AddRateModal: React.FC<AddRateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [wc, setWc] = useState(initialData?.wc || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [laborRate, setLaborRate] = useState(initialData ? String(initialData.laborRate) : '105.29')
  const [burdenRate, setBurdenRate] = useState(initialData ? String(initialData.burdenRate) : '95.00')
  const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate || new Date().toISOString().split('T')[0])
  const [sourceRef, setSourceRef] = useState(initialData?.sourceRef || 'Standard Rate')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!wc.trim()) {
      setError('Work Center code (WC) is required.')
      return
    }
    const lr = parseFloat(laborRate)
    const br = parseFloat(burdenRate)

    if (isNaN(lr) || lr < 0 || isNaN(br) || br < 0) {
      setError('Rates cannot be negative numbers.')
      return
    }

    onSave({
      wc: wc.trim(),
      description: description.trim() || wc.trim(),
      laborRate: lr,
      burdenRate: br,
      effectiveDate: effectiveDate.trim() || new Date().toISOString().split('T')[0],
      sourceRef: sourceRef.trim() || 'Standard Rate'
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {initialData ? 'Edit Work Center Rate' : 'Add New Work Center Rate'}
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
              <label className="block font-semibold text-slate-700 mb-1">Department (WC) *</label>
              <input
                type="text"
                value={wc}
                onChange={e => { setWc(e.target.value); setError('') }}
                placeholder="e.g. Cutting"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
                required
                disabled={!!initialData}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Line / Department Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Digital Assembly RGOM Line"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Labor Rate (THB/MHr) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={laborRate}
                onChange={e => setLaborRate(e.target.value)}
                placeholder="105.29"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Burden Rate (THB/MHr) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={burdenRate}
                onChange={e => setBurdenRate(e.target.value)}
                placeholder="95.00"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source Reference</label>
            <input
              type="text"
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              placeholder="e.g. Cost Declare 250331"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
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
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Rate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
