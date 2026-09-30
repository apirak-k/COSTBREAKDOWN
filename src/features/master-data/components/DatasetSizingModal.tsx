import React, { useState, useEffect } from 'react'
import { X, Sliders, Check } from 'lucide-react'
import { ComparisonRole, DatasetSizing, ProductMaster } from '../../../core'
import { hasDatasetSizingChanged, hasProductSizingFieldsChanged } from '../dataset-sizing-form'

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
    const nextProduct = {
      ...product,
      productCode: productCode.trim(),
      productDescription: productDescription.trim(),
      uom: uom.trim() || 'PC'
    }
    const previousProductFields = {
      productCode: product.productCode || '',
      productDescription: product.productDescription || '',
      uom: product.uom || 'PC'
    }
    if (hasProductSizingFieldsChanged(previousProductFields, nextProduct)) {
      onUpdateProduct(nextProduct)
    }

    const nextSizing = {
      wcCount: wcCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(wcCount) || 1)),
      bomCount: bomCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(bomCount) || 1)),
      routingCount: routingCount.trim() === '' ? undefined : Math.max(1, Math.floor(Number(routingCount) || 1))
    }
    if (hasDatasetSizingChanged(currentSizing, nextSizing)) onSaveSizing(nextSizing)
    onClose()
  }

  const handleReset = () => {
    const resetSizing = { wcCount: undefined, bomCount: undefined, routingCount: undefined }
    if (hasDatasetSizingChanged(currentSizing, resetSizing)) onSaveSizing(resetSizing)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sizing-modal-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 id="sizing-modal-title" className="text-base font-semibold">
              Dataset Row Setup ({roleLabel})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 text-sm">
          <p className="leading-6 text-slate-700">
            Configure product identity and starting row slots for <strong className="font-mono text-slate-900 uppercase">{roleLabel}</strong>.
          </p>

          {/* Product Fields (Blue Group) */}
          <div className="space-y-3 rounded-sm border border-blue-200 bg-blue-50/60 p-4">
            <div className="text-xs font-semibold text-blue-900">
              Product Identity ({roleLabel})
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dataset-sizing-product-code" className="mb-1 block text-xs font-medium text-slate-700">
                  Product Code
                </label>
                <input
                  id="dataset-sizing-product-code"
                  type="text"
                  placeholder="e.g. FG-1001"
                  value={productCode}
                  onChange={e => setProductCode(e.target.value)}
                  className="min-h-10 w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label htmlFor="dataset-sizing-uom" className="mb-1 block text-xs font-medium text-slate-700">
                  Base UOM
                </label>
                <input
                  id="dataset-sizing-uom"
                  type="text"
                  placeholder="e.g. PC, SET"
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="min-h-10 w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div>
              <label htmlFor="dataset-sizing-product-name" className="mb-1 block text-xs font-medium text-slate-700">
                Product Name / Description
              </label>
              <input
                id="dataset-sizing-product-name"
                type="text"
                placeholder="Product description / title"
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                className="min-h-10 w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-800">
              Starting Blank Rows
            </div>
            <div>
              <label htmlFor="dataset-sizing-work-center-rows" className="mb-1 block text-xs font-medium text-slate-700">
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
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="dataset-sizing-bom-rows" className="mb-1 block text-xs font-medium text-slate-700">
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
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="dataset-sizing-routing-rows" className="mb-1 block text-xs font-medium text-slate-700">
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
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-9 self-start text-sm text-slate-700 underline hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            Reset Sizing
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-sm border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex min-h-10 items-center gap-1.5 rounded-sm border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
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
