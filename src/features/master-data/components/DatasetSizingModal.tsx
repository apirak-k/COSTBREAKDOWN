import React, { useState, useEffect } from 'react'
import { X, Sliders, Check } from 'lucide-react'
import { ComparisonRole, DatasetSizing, ProductMaster } from '../../../core'

interface DatasetSizingModalProps {
  isOpen: boolean
  onClose: () => void
  role: ComparisonRole
  product: ProductMaster
  onUpdateProduct: (product: ProductMaster) => void
  currentSizing: DatasetSizing
  onSaveSizing: (sizing: Partial<DatasetSizing>) => void
}

export const DatasetSizingModal: React.FC<DatasetSizingModalProps> = ({
  isOpen,
  onClose,
  role,
  product,
  onUpdateProduct,
  currentSizing,
  onSaveSizing
}) => {
  const [wcCount, setWcCount] = useState<string>(currentSizing.wcCount !== undefined ? String(currentSizing.wcCount) : '')
  const [bomCount, setBomCount] = useState<string>(currentSizing.bomCount !== undefined ? String(currentSizing.bomCount) : '')
  const [routingCount, setRoutingCount] = useState<string>(currentSizing.routingCount !== undefined ? String(currentSizing.routingCount) : '')

  const [productCode, setProductCode] = useState(product.productCode || '')
  const [productDescription, setProductDescription] = useState(product.productDescription || '')
  const [uom, setUom] = useState(product.uom || 'PC')

  useEffect(() => {
    setWcCount(currentSizing.wcCount !== undefined ? String(currentSizing.wcCount) : '')
    setBomCount(currentSizing.bomCount !== undefined ? String(currentSizing.bomCount) : '')
    setRoutingCount(currentSizing.routingCount !== undefined ? String(currentSizing.routingCount) : '')
    setProductCode(product.productCode || '')
    setProductDescription(product.productDescription || '')
    setUom(product.uom || 'PC')
  }, [currentSizing, product, isOpen])

  if (!isOpen) return null

  const roleLabel = role === 'reference' ? 'Reference' : 'Current'

  const handleApply = () => {
    onUpdateProduct({
      ...product,
      productCode: productCode.trim(),
      productDescription: productDescription.trim(),
      uom: uom.trim() || 'PC'
    })
    onSaveSizing({
      wcCount: wcCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(wcCount) || 1)),
      bomCount: bomCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(bomCount) || 1)),
      routingCount: routingCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(routingCount) || 1))
    })
    onClose()
  }

  const handleReset = () => {
    onSaveSizing({ wcCount: undefined, bomCount: undefined, routingCount: undefined })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sizing-modal-title"
    >
      <div className="bg-white border border-slate-300 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 id="sizing-modal-title" className="text-sm font-mono font-bold uppercase tracking-tight">
              Dataset Row Setup ({roleLabel})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 font-sans text-xs">
          <p className="text-slate-600 leading-relaxed">
            Configure product identity and starting row slots for <strong className="font-mono text-slate-900 uppercase">{roleLabel}</strong>.
          </p>

          {/* Product Fields (Blue Group) */}
          <div className="space-y-2.5 bg-blue-50/60 p-3 border border-blue-200 rounded font-mono">
            <div className="text-[10px] font-bold uppercase text-blue-900 tracking-wider">
              Product Identity ({roleLabel})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="dataset-sizing-product-code" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Product Code
                </label>
                <input
                  id="dataset-sizing-product-code"
                  type="text"
                  placeholder="e.g. FG-1001"
                  value={productCode}
                  onChange={e => setProductCode(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white text-slate-900 border border-blue-300 rounded text-xs font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label htmlFor="dataset-sizing-uom" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Base UOM
                </label>
                <input
                  id="dataset-sizing-uom"
                  type="text"
                  placeholder="e.g. PC, SET"
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white text-slate-900 border border-blue-300 rounded text-xs font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div>
              <label htmlFor="dataset-sizing-product-name" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Product Name / Description
              </label>
              <input
                id="dataset-sizing-product-name"
                type="text"
                placeholder="Product description / title"
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-blue-300 rounded text-xs font-medium focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-3.5 border border-slate-200 rounded font-mono">
            <div className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
              Starting Blank Rows
            </div>
            <div>
              <label htmlFor="dataset-sizing-work-center-rows" className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Work Center Rows
              </label>
              <input
                id="dataset-sizing-work-center-rows"
                type="number"
                min="1"
                step="1"
                max="500"
                placeholder="Unset"
                value={wcCount}
                onChange={e => setWcCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label htmlFor="dataset-sizing-bom-rows" className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                BOM Rows (Materials)
              </label>
              <input
                id="dataset-sizing-bom-rows"
                type="number"
                min="1"
                step="1"
                max="1000"
                placeholder="Unset"
                value={bomCount}
                onChange={e => setBomCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label htmlFor="dataset-sizing-routing-rows" className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Routing Rows (Operations)
              </label>
              <input
                id="dataset-sizing-routing-rows"
                type="number"
                min="1"
                step="1"
                max="500"
                placeholder="Unset"
                value={routingCount}
                onChange={e => setRoutingCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-mono text-slate-500 hover:text-slate-900 underline cursor-pointer"
          >
            Reset Sizing
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded shadow-2xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Sizing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
