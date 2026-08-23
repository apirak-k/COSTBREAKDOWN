import React from 'react'
import { SlidersHorizontal, Copy, CheckCircle2, History, AlertTriangle } from 'lucide-react'
import { ProductMaster, DatasetStatus } from '../../../core'

interface ProductMasterCardProps {
  product: ProductMaster
  ratesCount: number
  bomCount: number
  routingCount: number
  uomList: string[]
  status?: DatasetStatus
  versionLabel?: string
  onUpdateProduct: (product: ProductMaster) => void
  onOpenSetupModal: () => void
  onCloneToDraft?: () => void
  onActivateDraft?: () => void
}

export const ProductMasterCard: React.FC<ProductMasterCardProps> = ({
  product,
  ratesCount,
  bomCount,
  routingCount,
  uomList,
  status = 'active',
  versionLabel,
  onUpdateProduct,
  onOpenSetupModal,
  onCloneToDraft,
  onActivateDraft
}) => {
  return (
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold font-mono uppercase tracking-tight text-slate-900">
            Section A: Product Master &amp; Sizing Dimensions
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-none border border-slate-200">
            {ratesCount} WC · {bomCount} BOM · {routingCount} ROUTING
          </span>

          {/* Version Status Badge */}
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-none uppercase tracking-wide border ${
              status === 'active'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : status === 'draft'
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            ● {status.toUpperCase()} {versionLabel ? `— ${versionLabel}` : ''}
          </span>
        </div>

        {/* Action Buttons: Version Management & Sizing */}
        <div className="flex items-center gap-2">
          {status === 'active' && onCloneToDraft && (
            <button
              type="button"
              onClick={onCloneToDraft}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-none transition-colors cursor-pointer shadow-2xs"
              title="Create a new Draft version based on this Active dataset"
            >
              <Copy className="w-3 h-3 text-amber-800" />
              Clone Active ➔ Draft
            </button>
          )}

          {status === 'draft' && onActivateDraft && (
            <button
              type="button"
              onClick={onActivateDraft}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 rounded-none transition-colors cursor-pointer shadow-2xs"
              title="Activate this Draft as the live active cost calculation dataset"
            >
              <CheckCircle2 className="w-3 h-3 text-white" />
              Activate Draft (Archive Current Active)
            </button>
          )}

          {status === 'archived' && onCloneToDraft && (
            <button
              type="button"
              onClick={onCloneToDraft}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-colors cursor-pointer"
              title="Clone this archived snapshot into a new working Draft"
            >
              <History className="w-3 h-3 text-slate-600" />
              Clone to New Draft
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSetupModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-none border border-slate-300 transition-colors cursor-pointer"
            title="Configure table row capacity & sizing"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
            Edit Sizing Structure
          </button>
        </div>
      </div>

      {/* Version Alert Banner */}
      {status === 'draft' && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>WORKING DRAFT MODE:</strong> Any edits are saved in this isolated Draft. Click <strong>"Activate Draft"</strong> when ready to make these numbers live.
          </span>
        </div>
      )}

      {status === 'archived' && (
        <div className="flex items-center gap-2 p-2 bg-slate-100 border-l-4 border-slate-500 text-slate-800 text-xs font-mono">
          <History className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            <strong>ARCHIVED SNAPSHOT (READ-ONLY REFERENCE):</strong> This version was archived when a new Draft was activated. Clone to draft to modify.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Product Code *</label>
          <input
            type="text"
            value={product.productCode}
            onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
            placeholder="e.g. RGOM-024"
            className="w-full px-2 py-1 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">UOM Unit</label>
          <select
            value={product.uom}
            onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
            className="w-full px-2 py-1 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            {uomList.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Product Description</label>
          <input
            type="text"
            value={product.productDescription}
            onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
            placeholder="e.g. Membrane Switch"
            className="w-full px-2 py-1 text-slate-900 bg-amber-50 border border-amber-200 rounded-none font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Effective Date</label>
          <input
            type="date"
            value={product.effectiveDate}
            onChange={e => onUpdateProduct({ ...product, effectiveDate: e.target.value })}
            className="w-full px-2 py-1 font-mono text-slate-900 bg-amber-50 border border-amber-200 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Customer / Application</label>
          <input
            type="text"
            value={product.customer}
            onChange={e => onUpdateProduct({ ...product, customer: e.target.value })}
            placeholder="e.g. Automotive Display Panel"
            className="w-full px-2 py-1 text-slate-900 bg-amber-50 border border-amber-200 rounded-none font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
    </div>
  )
}
