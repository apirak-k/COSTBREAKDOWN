import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { WorkCenterRate } from '../lib/types'

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
  const [laborRate, setLaborRate] = useState(initialData ? String(initialData.laborRate) : '102.90')
  const [burdenRate, setBurdenRate] = useState(initialData ? String(initialData.burdenRate) : '79.66')
  const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate || '2026-07-01')
  const [sourceRef, setSourceRef] = useState(initialData?.sourceRef || 'Rate-Std-2026 (Finance)')
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
      wc: wc.trim().toUpperCase(),
      description: description.trim() || wc.trim(),
      laborRate: lr,
      burdenRate: br,
      effectiveDate: effectiveDate.trim() || '2026-07-01',
      sourceRef: sourceRef.trim() || 'Finance Rate'
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {initialData ? 'Edit Work Center Rate' : 'Add New Work Center Rate'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
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
              <label className="block font-semibold text-slate-700 mb-1">WC Code *</label>
              <input
                type="text"
                value={wc}
                onChange={e => { setWc(e.target.value); setError('') }}
                placeholder="e.g. BZP01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Line / Department Name</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Cleanroom Printing Line"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Labor Rate (THB/MHr) *</label>
              <input
                type="number"
                step="any"
                value={laborRate}
                onChange={e => setLaborRate(e.target.value)}
                placeholder="105.29"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Burden Rate (THB/MHr) *</label>
              <input
                type="number"
                step="any"
                value={burdenRate}
                onChange={e => setBurdenRate(e.target.value)}
                placeholder="138.48"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
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
              placeholder="e.g. Rate-Std-2026 (Finance)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center gap-1.5 shadow-sm"
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
