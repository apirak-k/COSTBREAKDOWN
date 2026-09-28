import React, { useState, useEffect } from 'react'
import { X, FileSpreadsheet, Download } from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster, DatasetSizing } from '../../../core'
import { generateDynamicExcelTemplate, downloadBlob } from '../../../services'

interface TemplateSizingModalProps {
  isOpen: boolean
  onClose: () => void
  role: ComparisonRole
  product: ProductMaster
  snapshot: CostSnapshot
  currentSizing: DatasetSizing
}

export const TemplateSizingModal: React.FC<TemplateSizingModalProps> = ({
  isOpen,
  onClose,
  role,
  product,
  snapshot,
  currentSizing
}) => {
  // Default initial values to configured sizing (same as Dataset Setup), falling back to populated rows, or 1
  const defaultWc = currentSizing.wcCount !== undefined && currentSizing.wcCount > 0
    ? currentSizing.wcCount
    : (snapshot.rates.length > 0 ? snapshot.rates.length : 1)
  const defaultBom = currentSizing.bomCount !== undefined && currentSizing.bomCount > 0
    ? currentSizing.bomCount
    : (snapshot.bom.length > 0 ? snapshot.bom.length : 1)
  const defaultRouting = currentSizing.routingCount !== undefined && currentSizing.routingCount > 0
    ? currentSizing.routingCount
    : (snapshot.routing.length > 0 ? snapshot.routing.length : 1)

  const [wcCount, setWcCount] = useState<string>(String(defaultWc))
  const [bomCount, setBomCount] = useState<string>(String(defaultBom))
  const [routingCount, setRoutingCount] = useState<string>(String(defaultRouting))

  const [productCode, setProductCode] = useState(product.productCode || '')
  const [productDescription, setProductDescription] = useState(product.productDescription || '')
  const [uom, setUom] = useState(product.uom || 'PC')

  useEffect(() => {
    const nextWc = currentSizing.wcCount !== undefined && currentSizing.wcCount > 0
      ? currentSizing.wcCount
      : (snapshot.rates.length > 0 ? snapshot.rates.length : 1)
    const nextBom = currentSizing.bomCount !== undefined && currentSizing.bomCount > 0
      ? currentSizing.bomCount
      : (snapshot.bom.length > 0 ? snapshot.bom.length : 1)
    const nextRouting = currentSizing.routingCount !== undefined && currentSizing.routingCount > 0
      ? currentSizing.routingCount
      : (snapshot.routing.length > 0 ? snapshot.routing.length : 1)
    setWcCount(String(nextWc))
    setBomCount(String(nextBom))
    setRoutingCount(String(nextRouting))
    setProductCode(product.productCode || '')
    setProductDescription(product.productDescription || '')
    setUom(product.uom || 'PC')
  }, [currentSizing, snapshot, product, isOpen])

  if (!isOpen) return null

  const roleLabel = role === 'reference' ? 'Reference' : 'Current'

  const handleDownload = async () => {
    const parsedWc = wcCount.trim() === '' ? 1 : Math.max(1, Math.floor(Number(wcCount) || 1))
    const parsedBom = bomCount.trim() === '' ? 1 : Math.max(1, Math.floor(Number(bomCount) || 1))
    const parsedRouting = routingCount.trim() === '' ? 1 : Math.max(1, Math.floor(Number(routingCount) || 1))

    const targetProduct: ProductMaster = {
      ...product,
      productCode: productCode.trim() || product.productCode,
      productDescription: productDescription.trim() || product.productDescription,
      uom: uom.trim() || product.uom || 'PC'
    }

    const blob = await generateDynamicExcelTemplate({
      product: targetProduct,
      snapshot,
      wcCount: parsedWc,
      bomCount: parsedBom,
      routingCount: parsedRouting
    })
    downloadBlob(blob, `MasterData_Template_${targetProduct.productCode || 'PRODUCT'}.xlsx`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 id="template-modal-title" className="text-base font-semibold">
              Download Template (.xlsx)
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
            Configure product identity and starting row slots for <strong className="font-mono text-slate-900 uppercase">{roleLabel}</strong> template.
          </p>

          {/* Product Fields (Blue Group - Identical to Dataset Setup Dialog) */}
          <div className="space-y-3 rounded-sm border border-blue-200 bg-blue-50/60 p-4">
            <div className="text-xs font-semibold text-blue-900">
              Product Identity ({roleLabel})
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="template-sizing-product-code" className="mb-1 block text-xs font-medium text-slate-700">
                  Product Code
                </label>
                <input
                  id="template-sizing-product-code"
                  type="text"
                  placeholder="e.g. FG-1001"
                  value={productCode}
                  onChange={e => setProductCode(e.target.value)}
                  className="min-h-10 w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label htmlFor="template-sizing-uom" className="mb-1 block text-xs font-medium text-slate-700">
                  Base UOM
                </label>
                <input
                  id="template-sizing-uom"
                  type="text"
                  placeholder="e.g. PC, SET"
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="min-h-10 w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div>
              <label htmlFor="template-sizing-product-name" className="mb-1 block text-xs font-medium text-slate-700">
                Product Name / Description
              </label>
              <input
                id="template-sizing-product-name"
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
              <label htmlFor="template-sizing-work-center-rows" className="mb-1 block text-xs font-medium text-slate-700">
                Work Center Rows
              </label>
              <input
                id="template-sizing-work-center-rows"
                type="number"
                min="1"
                step="1"
                max="500"
                placeholder="1"
                value={wcCount}
                onChange={e => setWcCount(e.target.value)}
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="template-sizing-bom-rows" className="mb-1 block text-xs font-medium text-slate-700">
                BOM Rows (Materials)
              </label>
              <input
                id="template-sizing-bom-rows"
                type="number"
                min="1"
                step="1"
                max="1000"
                placeholder="1"
                value={bomCount}
                onChange={e => setBomCount(e.target.value)}
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="template-sizing-routing-rows" className="mb-1 block text-xs font-medium text-slate-700">
                Routing Rows (Operations)
              </label>
              <input
                id="template-sizing-routing-rows"
                type="number"
                min="1"
                step="1"
                max="500"
                placeholder="1"
                value={routingCount}
                onChange={e => setRoutingCount(e.target.value)}
                className="min-h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-sm border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex min-h-10 items-center gap-1.5 rounded-sm border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>
        </div>
      </div>
    </div>
  )
}
