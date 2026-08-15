import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { RoutingStep, WorkCenterRate } from '../lib/types'

interface AddRoutingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (step: Omit<RoutingStep, 'id'>) => void
  rates: WorkCenterRate[]
  initialData?: RoutingStep
}

export const AddRoutingModal: React.FC<AddRoutingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rates,
  initialData
}) => {
  const [opSeq, setOpSeq] = useState(initialData ? String(initialData.opSeq) : '10')
  const [description, setDescription] = useState(initialData?.description || '')
  const [wc, setWc] = useState(initialData?.wc || (rates[0]?.wc || 'BZP01'))
  const [manning, setManning] = useState(initialData ? String(initialData.manning) : '1')
  const [baseCap, setBaseCap] = useState(initialData ? String(initialData.baseCap) : '1000')
  const [activeCap, setActiveCap] = useState(initialData ? String(initialData.activeCap) : '1000')
  const [baseYield, setBaseYield] = useState(initialData ? String(initialData.baseYield * 100) : '98')
  const [activeYield, setActiveYield] = useState(initialData ? String(initialData.activeYield * 100) : '98')
  const [sourceRef, setSourceRef] = useState(initialData?.sourceRef || 'TimeStudy-2026')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const seq = parseInt(opSeq, 10)
    const m = parseFloat(manning)
    const c0 = parseFloat(baseCap)
    const c1 = parseFloat(activeCap)
    const y0 = parseFloat(baseYield) / 100
    const y1 = parseFloat(activeYield) / 100

    if (isNaN(seq) || seq <= 0) {
      setError('Operation Sequence must be a positive integer (e.g. 10, 20, 30).')
      return
    }
    if (!description.trim()) {
      setError('Operation Description is required.')
      return
    }
    if (isNaN(m) || m < 0.1) {
      setError('Manning (M) must be at least 0.1 headcount.')
      return
    }
    if (isNaN(c0) || c0 <= 0 || isNaN(c1) || c1 <= 0) {
      setError('Capacity (pcs/hr) must be greater than 0.')
      return
    }
    if (y0 <= 0 || y0 > 1 || y1 <= 0 || y1 > 1) {
      setError('Yield % must be greater than 0% and up to 100%.')
      return
    }

    onSave({
      opSeq: seq,
      description: description.trim(),
      wc: wc.trim(),
      manning: m,
      baseCap: c0,
      activeCap: c1,
      baseYield: y0,
      activeYield: y1,
      sourceRef: sourceRef.trim() || 'Routing Log'
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {initialData ? 'Edit Process Routing Step' : 'Add New Process Routing Step'}
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Op Seq # *</label>
              <input
                type="number"
                step="5"
                min="1"
                value={opSeq}
                onChange={e => { setOpSeq(e.target.value); setError('') }}
                placeholder="10"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Work Center (WC) *</label>
              <select
                value={wc}
                onChange={e => setWc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              >
                {rates.map(r => (
                  <option key={r.wc} value={r.wc}>
                    {r.wc} — {r.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operation Description *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Silver Conductor Screen Printing"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Man (M) *</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={manning}
                onChange={e => setManning(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Cap (pc/hr)</label>
              <input
                type="number"
                step="50"
                min="1"
                value={baseCap}
                onChange={e => setBaseCap(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Cap (pc/hr)</label>
              <input
                type="number"
                step="50"
                min="1"
                value={activeCap}
                onChange={e => setActiveCap(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Yield %</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={baseYield}
                onChange={e => setBaseYield(e.target.value)}
                placeholder="98"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Yield %</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={activeYield}
                onChange={e => setActiveYield(e.target.value)}
                placeholder="95"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source Reference</label>
            <input
              type="text"
              value={sourceRef}
              onChange={e => setSourceRef(e.target.value)}
              placeholder="e.g. TimeStudy-2026"
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
              Save Routing Step
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
