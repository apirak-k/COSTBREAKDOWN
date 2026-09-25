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
    const parsedWc = wcCount.trim() === '' ? 1 : Math.max(1, Number(wcCount))
    const parsedBom = bomCount.trim() === '' ? 1 : Math.max(1, Number(bomCount))
    const parsedRouting = routingCount.trim() === '' ? 1 : Math.max(1, Number(routingCount))

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
    downloadBlob(blob, `MasterData_Template_${targetProduct.productCode || 'PRODUCT'}_${roleLabel}.xlsx`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="bg-white border border-slate-300 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 id="template-modal-title" className="text-sm font-mono font-bold uppercase tracking-tight">
              Download Template (.xlsx)
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
            Configure product identity and starting row slots for <strong className="font-mono text-slate-900 uppercase">{roleLabel}</strong> template.
          </p>

          {/* Product Fields (Blue Group - Identical to Dataset Setup Dialog) */}
          <div className="space-y-2.5 bg-blue-50/60 p-3 border border-blue-200 rounded font-mono">
            <div className="text-[10px] font-bold uppercase text-blue-900 tracking-wider">
              Product Identity ({roleLabel})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Product Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FG-1001"
                  value={productCode}
                  onChange={e => setProductCode(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white text-slate-900 border border-blue-300 rounded text-xs font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Base UOM
                </label>
                <input
                  type="text"
                  placeholder="e.g. PC, SET"
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white text-slate-900 border border-blue-300 rounded text-xs font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Product Name / Description
              </label>
              <input
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
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Work Center Rows
              </label>
              <input
                type="number"
                min="1"
                max="500"
                placeholder="1"
                value={wcCount}
                onChange={e => setWcCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                BOM Rows (Materials)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="1"
                value={bomCount}
                onChange={e => setBomCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Routing Rows (Operations)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                placeholder="1"
                value={routingCount}
                onChange={e => setRoutingCount(e.target.value)}
                className="w-full px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>
        </div>
      </div>
    </div>
  )
}
