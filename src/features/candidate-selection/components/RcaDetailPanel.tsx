import React, { useEffect, useState } from 'react'
import { CostDriver, DriverRcaDraft, DriverRcaRecord, formatVariance } from '../../../core'

interface RcaDetailPanelProps {
  driver: CostDriver
  record?: DriverRcaRecord
  onSave: (draft: DriverRcaDraft) => void
  onClose: () => void
}

export const RcaDetailPanel: React.FC<RcaDetailPanelProps> = ({ driver, record, onSave, onClose }) => {
  const [draft, setDraft] = useState<DriverRcaDraft>({
    factor: record?.factor ?? driver.rcaParameter,
    rootCause: record?.rootCause ?? '',
    action: record?.action ?? driver.actionPlan
  })

  useEffect(() => {
    setDraft({
      factor: record?.factor ?? driver.rcaParameter,
      rootCause: record?.rootCause ?? '',
      action: record?.action ?? driver.actionPlan
    })
  }, [driver.driverKey, driver.rcaParameter, driver.actionPlan, record])

  const update = (field: keyof DriverRcaDraft, value: string) => {
    setDraft(previous => ({ ...previous, [field]: value }))
  }

  return (
    <section aria-labelledby="rca-detail-heading" className="bg-white rounded-lg border border-amber-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between gap-3">
        <div>
          <h2 id="rca-detail-heading" className="text-xs font-bold font-mono text-slate-800 uppercase tracking-tight">
            RCA Detail
          </h2>
          <p className="text-[11px] text-slate-600 font-sans mt-0.5">
            Record the explanation for this selected driver. Fields remain extensible and optional.
          </p>
        </div>
        {record && <span className="text-[10px] font-mono font-bold uppercase text-emerald-700">RCA saved</span>}
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] font-sans">
          <div><span className="block text-[9px] font-mono uppercase text-slate-400">Driver</span><span className="font-semibold text-slate-800 truncate block" title={driver.driverName}>{driver.driverName}</span></div>
          <div><span className="block text-[9px] font-mono uppercase text-slate-400">Category</span><span className="text-slate-700 truncate block" title={driver.category}>{driver.category}</span></div>
          <div><span className="block text-[9px] font-mono uppercase text-slate-400">Source</span><span className="text-slate-700 truncate block" title={driver.sourceRef || 'Not provided'}>{driver.sourceRef || 'Not provided'}</span></div>
          <div><span className="block text-[9px] font-mono uppercase text-slate-400">Base → Active</span><span className="text-slate-700">{driver.baseParameter ?? '—'} → {driver.activeParameter ?? '—'}</span></div>
          <div><span className="block text-[9px] font-mono uppercase text-slate-400">Gap</span><span className={driver.costGap >= 0 ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>{formatVariance(driver.costGap, 4)}</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label htmlFor={`rca-factor-${driver.driverKey}`} className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Factor / What changed
            <textarea
              id={`rca-factor-${driver.driverKey}`}
              value={draft.factor}
              onChange={event => update('factor', event.target.value)}
              rows={3}
              className="w-full px-2.5 py-2 text-xs normal-case font-sans font-normal text-slate-900 bg-white border border-slate-300 rounded resize-y focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="Observed change or contributing factor"
            />
          </label>
          <label htmlFor={`rca-root-cause-${driver.driverKey}`} className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Root Cause / Why
            <textarea
              id={`rca-root-cause-${driver.driverKey}`}
              value={draft.rootCause}
              onChange={event => update('rootCause', event.target.value)}
              rows={3}
              className="w-full px-2.5 py-2 text-xs normal-case font-sans font-normal text-slate-900 bg-white border border-slate-300 rounded resize-y focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="Evidence-supported explanation"
            />
          </label>
          <label htmlFor={`rca-action-${driver.driverKey}`} className="flex flex-col gap-1 text-[10px] font-mono font-bold uppercase text-slate-500">
            Action / What to do
            <textarea
              id={`rca-action-${driver.driverKey}`}
              value={draft.action}
              onChange={event => update('action', event.target.value)}
              rows={3}
              className="w-full px-2.5 py-2 text-xs normal-case font-sans font-normal text-slate-900 bg-white border border-slate-300 rounded resize-y focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="Proposed countermeasure or next action"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-600 border border-slate-300 rounded hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-white bg-slate-900 border border-slate-900 rounded hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
          >
            Save RCA
          </button>
        </div>
      </div>
    </section>
  )
}
