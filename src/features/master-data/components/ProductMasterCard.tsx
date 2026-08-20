import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ProductMaster } from '../../../core'

interface ProductMasterCardProps {
  product: ProductMaster
  ratesCount: number
  bomCount: number
  routingCount: number
  uomList: string[]
  onUpdateProduct: (product: ProductMaster) => void
  onOpenSetupModal: () => void
}

export const ProductMasterCard: React.FC<ProductMasterCardProps> = ({
  product,
  ratesCount,
  bomCount,
  routingCount,
  uomList,
  onUpdateProduct,
  onOpenSetupModal
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Section A: Product Master &amp; Sizing</h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {ratesCount} WC · {bomCount} BOM · {routingCount} Routing
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSetupModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          title="Edit table row structure"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          Edit Structure
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">Product Code *</label>
          <input
            type="text"
            value={product.productCode}
            onChange={e => onUpdateProduct({ ...product, productCode: e.target.value })}
            placeholder="e.g. RGOM-024"
            className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">UOM Unit</label>
          <select
            value={product.uom}
            onChange={e => onUpdateProduct({ ...product, uom: e.target.value })}
            className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
          >
            {uomList.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">Product Description</label>
          <input
            type="text"
            value={product.productDescription}
            onChange={e => onUpdateProduct({ ...product, productDescription: e.target.value })}
            placeholder="e.g. Membrane Switch"
            className="w-full px-2.5 py-1.5 text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">Effective Date</label>
          <input
            type="date"
            value={product.effectiveDate}
            onChange={e => onUpdateProduct({ ...product, effectiveDate: e.target.value })}
            className="w-full px-2.5 py-1.5 font-mono text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">Customer / Application</label>
          <input
            type="text"
            value={product.customer}
            onChange={e => onUpdateProduct({ ...product, customer: e.target.value })}
            placeholder="e.g. Automotive Display Panel"
            className="w-full px-2.5 py-1.5 text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>
    </div>
  )
}
