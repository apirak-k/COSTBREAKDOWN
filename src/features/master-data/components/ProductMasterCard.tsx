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
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold font-mono uppercase tracking-tight text-slate-900">
            Section A: Product Master &amp; Sizing Dimensions
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-none border border-slate-200">
            {ratesCount} WC · {bomCount} BOM · {routingCount} ROUTING
          </span>
        </div>
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
