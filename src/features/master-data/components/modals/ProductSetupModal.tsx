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
  const [uom, setUom] = useState('PC')
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
        setUom(activeSession.product.uom || 'PC')
        setCustomer(activeSession.product.customer || '')
        setEffectiveDate(activeSession.product.effectiveDate || new Date().toISOString().split('T')[0])
        setWcCount(Math.max(1, activeSession.rates.length || 4))
        setBomCount(Math.max(1, activeSession.bom.length || 16))
        setRoutingCount(Math.max(1, activeSession.routing.length || 39))
      } else {
        // Create mode defaults
        setProductCode('')
        setProductDescription('')
        setUom('PC')
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
      uom: uom || 'PC',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            {mode === 'create' ? 'Setup New Product' : 'Edit Product Structure'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Section 1: Product Master Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Product Master Information
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
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                      className="flex-1 px-3 py-1.5 text-xs font-bold font-mono text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      {uomList.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewUom(true)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
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
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewUOM}
                      className="px-2.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewUom(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
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
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            {/* Section 2: Table Sizing Requirements */}
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. Table Structure &amp; Sizing Setup
            </h4>
            <div className="grid grid-cols-3 gap-3">
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
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Departments</span>
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
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Materials</span>
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
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Operations</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              {mode === 'create' ? 'Create Product & Initialize Grid' : 'Apply Sizing Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
