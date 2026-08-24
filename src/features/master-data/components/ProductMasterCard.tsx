import React from 'react'
import { ProductMaster, DatasetStatus } from '../../../core'

interface ProductMasterCardProps {
  product: ProductMaster
  ratesCount: number
  bomCount: number
  routingCount: number
  uomList: string[]
  status?: DatasetStatus
  versionLabel?: string
  isEditMode?: boolean
  onToggleEditMode?: (edit: boolean) => void
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
  isEditMode = false,
  onToggleEditMode,
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
            Product Master
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-none border border-slate-200">
            {ratesCount} WC · {bomCount} BOM · {routingCount} ROUTING
          </span>

          {/* Version Status Badge */}
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase tracking-wide border ${
              status === 'active'
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : status === 'draft'
                ? 'bg-slate-100 text-amber-800 border-slate-300'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            ● {status.toUpperCase()} {versionLabel ? `— ${versionLabel}` : ''}
          </span>
        </div>

        {/* Action Buttons: Mode Switcher, Version Management & Sizing */}
        <div className="flex items-center gap-2">
          {/* Overall Mode Switcher */}
          {onToggleEditMode && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-300">
              <button
                type="button"
                onClick={() => onToggleEditMode(false)}
                className={`px-2.5 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                  !isEditMode
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                View Mode
              </button>
              <button
                type="button"
                onClick={() => onToggleEditMode(true)}
                className={`px-2.5 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                  isEditMode
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Edit Mode
              </button>
            </div>
          )}

          {status === 'active' && onCloneToDraft && isEditMode && (
            <button
              type="button"
              onClick={onCloneToDraft}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
              title="Create a new Draft version based on this Active dataset"
            >
              Clone to Draft
            </button>
          )}

          {status === 'draft' && onActivateDraft && isEditMode && (
            <button
              type="button"
              onClick={onActivateDraft}
              className="px-2.5 py-1 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded transition-colors cursor-pointer shadow-2xs"
              title="Activate this Draft as the live active cost calculation dataset"
            >
              Activate Draft
            </button>
          )}

          {status === 'archived' && onCloneToDraft && isEditMode && (
            <button
              type="button"
              onClick={onCloneToDraft}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
              title="Clone this archived snapshot into a new working Draft"
            >
              Clone to Draft
            </button>
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={onOpenSetupModal}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-300 transition-colors cursor-pointer"
              title="Configure table row capacity & sizing"
            >
              Table Sizing
            </button>
          )}
        </div>
      </div>

      {/* Version Alert Banner */}
      {status === 'draft' && (
        <div className="p-2 bg-slate-50 border-l-3 border-amber-500 text-slate-800 text-xs font-mono rounded-r">
          <strong>Draft Mode:</strong> Edits are saved in this isolated draft. Click "Activate Draft" to make numbers live.
        </div>
      )}

      {status === 'archived' && (
        <div className="p-2 bg-slate-50 border-l-3 border-slate-400 text-slate-700 text-xs font-mono rounded-r">
          <strong>Archived Snapshot:</strong> Read-only reference. Clone to draft to modify.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Product Code *</label>
          {isEditMode ? (
            <input
              type="text"
              value={product.productCode}
              onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
              placeholder="e.g. RGOM-024"
              className="w-full px-2 py-1 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
            />
          ) : (
            <div className="py-1 font-mono font-bold text-slate-900 text-xs">{product.productCode || '—'}</div>
          )}
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">UOM Unit</label>
          {isEditMode ? (
            <select
              value={product.uom}
              onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
              className="w-full px-2 py-1 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 cursor-pointer shadow-2xs"
            >
              {uomList.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          ) : (
            <div className="py-1 font-mono font-bold text-slate-900 text-xs">{product.uom || '—'}</div>
          )}
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Product Description</label>
          {isEditMode ? (
            <input
              type="text"
              value={product.productDescription}
              onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
              placeholder="e.g. Membrane Switch"
              className="w-full px-2 py-1 text-slate-900 bg-white border border-slate-300 rounded font-sans focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
            />
          ) : (
            <div className="py-1 font-sans text-slate-800 text-xs">{product.productDescription || '—'}</div>
          )}
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Effective Date</label>
          {isEditMode ? (
            <input
              type="date"
              value={product.effectiveDate}
              onChange={e => onUpdateProduct({ ...product, effectiveDate: e.target.value })}
              className="w-full px-2 py-1 font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
            />
          ) : (
            <div className="py-1 font-mono text-slate-700 text-xs">{product.effectiveDate || '—'}</div>
          )}
        </div>
        <div>
          <label className="block text-slate-500 text-[10px] font-mono font-bold uppercase mb-0.5">Customer / Application</label>
          {isEditMode ? (
            <input
              type="text"
              value={product.customer}
              onChange={e => onUpdateProduct({ ...product, customer: e.target.value })}
              placeholder="e.g. Automotive Display Panel"
              className="w-full px-2 py-1 text-slate-900 bg-white border border-slate-300 rounded font-sans focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
            />
          ) : (
            <div className="py-1 font-sans text-slate-800 text-xs">{product.customer || '—'}</div>
          )}
        </div>
      </div>
    </div>
  )
}
