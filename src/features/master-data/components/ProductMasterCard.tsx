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
  canEdit?: boolean
  isEditMode?: boolean
  onToggleEditMode?: (edit: boolean) => void
  onUpdateProduct: (product: ProductMaster) => void
  onOpenSetupModal?: () => void
}

export const ProductMasterCard: React.FC<ProductMasterCardProps> = ({
  product,
  ratesCount,
  bomCount,
  routingCount,
  uomList,
  versionLabel,
  isEditMode = false,
  onToggleEditMode,
  onUpdateProduct,
  onOpenSetupModal
}) => {
  return (
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold font-sans tracking-tight text-slate-900">
            Product Master
          </h2>
          <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 rounded-none border border-slate-200">
            {ratesCount} WC · {bomCount} BOM · {routingCount} ROUTING
          </span>
          {versionLabel && (
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 rounded-none border border-slate-200 uppercase tracking-wide">
              {versionLabel}
            </span>
          )}
        </div>

        {/* Action Buttons: Mode Switcher & Sizing */}
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
                title="Edit this dataset directly"
              >
                Edit Mode
              </button>
            </div>
          )}

          {isEditMode && onOpenSetupModal && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        <div>
          <label className="block text-slate-500 text-[11px] font-mono font-bold uppercase mb-0.5">Product Code *</label>
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
          <label className="block text-slate-500 text-[11px] font-mono font-bold uppercase mb-0.5">UOM Unit</label>
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
          <label className="block text-slate-500 text-[11px] font-mono font-bold uppercase mb-0.5">Product Description</label>
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
          <label className="block text-slate-500 text-[11px] font-mono font-bold uppercase mb-0.5">Effective Date</label>
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
          <label className="block text-slate-500 text-[11px] font-mono font-bold uppercase mb-0.5">Customer / Application</label>
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
