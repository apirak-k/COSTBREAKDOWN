import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../../../state'
import { ProductSizingConfig } from '../../../../core'
import { X, Plus } from 'lucide-react'

interface ProductSetupModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  onClose: () => void
}

export const ProductSetupModal: React.FC<ProductSetupModalProps> = ({
  isOpen,
  mode,
  onClose
}) => {
  const {
    activeSession,
    uomList,
    addUOM,
    createProductWithSizing,
    updateProductSizing
  } = useAppStore()

  const [productCode, setProductCode] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [uom, setUom] = useState('')
  const [newUomInput, setNewUomInput] = useState('')
  const [showNewUom, setShowNewUom] = useState(false)
  const [customer, setCustomer] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [wcCount, setWcCount] = useState(4)
  const [bomCount, setBomCount] = useState(16)
  const [routingCount, setRoutingCount] = useState(39)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && activeSession) {
        setProductCode(activeSession.product.productCode || '')
        setProductDescription(activeSession.product.productDescription || '')
        setUom(activeSession.product.uom || '')
        setCustomer(activeSession.product.customer || '')
        setEffectiveDate(activeSession.product.effectiveDate || new Date().toISOString().split('T')[0])
        setWcCount(Math.max(1, activeSession.rates.length || 4))
        setBomCount(Math.max(1, activeSession.bom.length || 16))
        setRoutingCount(Math.max(1, activeSession.routing.length || 39))
      } else {
        // Create mode defaults
        setProductCode('')
        setProductDescription('')
        setUom('')
        setCustomer('')
        setEffectiveDate(new Date().toISOString().split('T')[0])
        setWcCount(4)
        setBomCount(16)
        setRoutingCount(39)
      }
      setError('')
      setShowNewUom(false)
    }
  }, [isOpen, mode, activeSession])

  if (!isOpen) return null

  const handleAddNewUOM = () => {
    const trimmed = newUomInput.trim().toUpperCase()
    if (trimmed) {
      addUOM(trimmed)
      setUom(trimmed)
      setNewUomInput('')
      setShowNewUom(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCode = productCode.trim()
    if (!trimmedCode) {
      setError('Product Code is required.')
      return
    }

    if (wcCount < 1 || bomCount < 1 || routingCount < 1) {
      setError('Counts must be at least 1.')
      return
    }

    const config: ProductSizingConfig = {
      productCode: trimmedCode,
      productDescription: productDescription.trim(),
      uom,
      customer: customer.trim(),
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      wcCount: Math.min(50, Math.max(1, Number(wcCount))),
      bomCount: Math.min(200, Math.max(1, Number(bomCount))),
      routingCount: Math.min(200, Math.max(1, Number(routingCount)))
    }

    if (mode === 'create') {
      createProductWithSizing(config)
    } else {
      updateProductSizing(config)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="product-setup-title">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl animate-in fade-in duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 id="product-setup-title" className="text-base font-semibold text-slate-900">
            {mode === 'create' ? 'Setup New Product' : 'Edit Product Structure'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">
              {error}
            </div>
          )}

          {/* Section 1: Product Master Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">
              Product Master
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productCode}
                  onChange={e => { setProductCode(e.target.value); setError('') }}
                  placeholder="e.g. RGOM-025"
                  className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit of Measure (UOM)
                </label>
                {!showNewUom ? (
                  <div className="flex gap-1.5">
                    <select
                      value={uom}
                      onChange={e => setUom(e.target.value)}
                      className="min-h-10 min-w-0 flex-1 rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                    >
                      {uomList.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewUom(true)}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      title="Add new UOM"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newUomInput}
                      onChange={e => setNewUomInput(e.target.value)}
                      placeholder="NEW UOM"
                      className="min-h-10 min-w-0 flex-1 rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewUOM}
                      className="min-h-10 rounded-sm bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewUom(false)}
                      className="min-h-10 rounded-sm px-3 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Description
              </label>
              <input
                type="text"
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder="e.g. Automotive Display Panel"
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            {/* Section 2: Table Sizing Requirements */}
            <h4 className="text-sm font-semibold text-slate-800">
              Table Sizing
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Centers
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={wcCount}
                  onChange={e => setWcCount(Number(e.target.value))}
                  className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
                <span className="mt-1 block text-xs text-slate-600">Departments</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BOM Items
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={bomCount}
                  onChange={e => setBomCount(Number(e.target.value))}
                  className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
                <span className="mt-1 block text-xs text-slate-600">Materials</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Routing Steps
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={routingCount}
                  onChange={e => setRoutingCount(Number(e.target.value))}
                  className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
                <span className="mt-1 block text-xs text-slate-600">Operations</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-sm border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-sm bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              {mode === 'create' ? 'Create Product' : 'Save Sizing'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
