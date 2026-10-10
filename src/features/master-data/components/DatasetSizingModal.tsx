import React, { useState, useEffect } from 'react'
import { X, Sliders, Check, FileSpreadsheet } from 'lucide-react'
import { MasterDataRole, CostSnapshot, DatasetSizing, ProductMaster } from '../../../core'
import { DATASET_SIZING_LIMITS } from '../../../core/utils/sizing'
import { hasDatasetMetadataChanged, hasDatasetSizingChanged, parseDatasetSizingCounts } from '../dataset-sizing-form'
import { getPopulatedRowsRemovedBySizing } from '../../../state/dataset-sizing'
import { downloadBlob } from '../../../services/excel/export'
import { useDialogFocus } from '../use-dialog-focus'

function currentCount(count: number | undefined, rowCount: number): string {
  if (count !== undefined) return String(count)
  return rowCount > 0 ? String(rowCount) : ''
}

interface DatasetSizingModalProps {
  isOpen: boolean
  onClose: () => void
  role: MasterDataRole
  product: ProductMaster
  snapshot: CostSnapshot
  onUpdateProduct: (product: ProductMaster) => void
  onUpdateRemark: (remark: string) => void
  currentSizing: DatasetSizing
  onSaveSizing: (sizing: Partial<DatasetSizing>) => void
}

export const DatasetSizingModal: React.FC<DatasetSizingModalProps> = ({
  isOpen,
  onClose,
  role,
  product,
  snapshot,
  onUpdateProduct,
  onUpdateRemark,
  currentSizing,
  onSaveSizing
}) => {
  const [wcCount, setWcCount] = useState<string>(currentCount(currentSizing.wcCount, snapshot.rates.length))
  const [bomCount, setBomCount] = useState<string>(currentCount(currentSizing.bomCount, snapshot.bom.length))
  const [routingCount, setRoutingCount] = useState<string>(currentCount(currentSizing.routingCount, snapshot.routing.length))

  const [productName, setProductName] = useState(product.productName || '')
  const [uom, setUom] = useState(product.uom || '')
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice == null ? '' : String(product.sellingPrice))
  const [sgaPercent, setSgaPercent] = useState(product.sgaPercent == null ? '' : String(product.sgaPercent))
  const [remark, setRemark] = useState(snapshot.remark || '')
  const [sizingError, setSizingError] = useState('')
  const dialogRef = useDialogFocus(isOpen, onClose)

  useEffect(() => {
    setWcCount(currentCount(currentSizing.wcCount, snapshot.rates.length))
    setBomCount(currentCount(currentSizing.bomCount, snapshot.bom.length))
    setRoutingCount(currentCount(currentSizing.routingCount, snapshot.routing.length))
    setProductName(product.productName || '')
    setUom(product.uom || '')
    setSellingPrice(product.sellingPrice == null ? '' : String(product.sellingPrice))
    setSgaPercent(product.sgaPercent == null ? '' : String(product.sgaPercent))
    setRemark(snapshot.remark || '')
    setSizingError('')
  }, [currentSizing, product, snapshot.bom.length, snapshot.rates.length, snapshot.routing.length, snapshot.remark, isOpen])

  if (!isOpen) return null

  const roleLabel = role === 'reference' ? 'Reference' : role === 'current' ? 'Current' : 'Custom'

  const buildSizingDraft = () => {
    const nextSizing = parseDatasetSizingCounts({ wcCount, bomCount, routingCount })
    const parseOptionalNumber = (value: string, label: string): number | null => {
      const trimmed = value.trim()
      if (!trimmed) return null
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) throw new RangeError(`${label} must be a valid number.`)
      return parsed
    }
    const nextProductName = productName.trim()
    const nextProduct = {
      ...product,
      productName: nextProductName,
      productDescription: nextProductName,
      uom: uom.trim(),
      sellingPrice: parseOptionalNumber(sellingPrice, 'Selling Price'),
      sgaPercent: parseOptionalNumber(sgaPercent, 'SG&A')
    }
    const previousProductFields = {
      productName: product.productName || '',
      uom: product.uom || '',
      sellingPrice: product.sellingPrice ?? null,
      sgaPercent: product.sgaPercent ?? null
    }
    return { nextSizing, nextProduct, previousProductFields }
  }

  const handleApply = () => {
    try {
      const { nextSizing, nextProduct, previousProductFields } = buildSizingDraft()
      const removedData = getPopulatedRowsRemovedBySizing(snapshot, nextSizing)
      if (removedData.length > 0) {
        const removedPreview = removedData.slice(0, 3).join(', ')
        const remainingCount = removedData.length > 3 ? ` and ${removedData.length - 3} more` : ''
        if (!window.confirm(`Reduce ${roleLabel} dataset size? Populated data will be removed: ${removedPreview}${remainingCount}.`)) return
      }
      const nextProductFields = {
        productName: nextProduct.productName || '',
        uom: nextProduct.uom || '',
        sellingPrice: nextProduct.sellingPrice ?? null,
        sgaPercent: nextProduct.sgaPercent ?? null
      }
      if (
        hasDatasetMetadataChanged(previousProductFields, nextProductFields) ||
        product.productDescription !== nextProduct.productDescription
      ) {
        onUpdateProduct(nextProduct)
      }

      if ((snapshot.remark || '') !== remark) onUpdateRemark(remark)
      if (hasDatasetSizingChanged(currentSizing, nextSizing)) onSaveSizing(nextSizing)
      onClose()
    } catch (error) {
      setSizingError(error instanceof Error ? error.message : 'Enter valid metadata and starting row counts.')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const { nextSizing, nextProduct } = buildSizingDraft()
      const templateSnapshot = { ...snapshot, product: nextProduct, remark, sizing: nextSizing }
      const { generateDynamicExcelTemplate } = await import('../../../services/excel/dynamic-excel-generator')
      const blob = await generateDynamicExcelTemplate({
        product: nextProduct,
        snapshot: templateSnapshot,
        wcCount: nextSizing.wcCount ?? Math.max(snapshot.rates.length, 1),
        bomCount: nextSizing.bomCount ?? Math.max(snapshot.bom.length, 1),
        routingCount: nextSizing.routingCount ?? Math.max(snapshot.routing.length, 1)
      })
      const safeProductName = (nextProduct.productName || 'PRODUCT').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').trim() || 'PRODUCT'
      downloadBlob(blob, `MasterData_Template_${safeProductName}_${roleLabel}.xlsx`)
    } catch (error) {
      setSizingError(error instanceof Error ? error.message : 'Template could not be generated.')
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sizing-modal-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto border border-slate-300 bg-white text-slate-900 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <h3 id="sizing-modal-title" className="text-sm font-semibold">Sizing · {roleLabel}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <section aria-label="Dataset metadata" className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Dataset</h4>
            <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-8">
              <div className="sm:col-span-4">
                <label htmlFor="dataset-sizing-product-name" className="mb-1 block text-[11px] font-medium text-slate-700">Product Name</label>
                <input
                  id="dataset-sizing-product-name"
                  type="text"
                  value={productName}
                  onChange={event => { setProductName(event.target.value); setSizingError('') }}
                  className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="dataset-sizing-uom" className="mb-1 block text-[11px] font-medium text-slate-700">UOM</label>
                <input
                  id="dataset-sizing-uom"
                  type="text"
                  value={uom}
                  onChange={event => { setUom(event.target.value); setSizingError('') }}
                  className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="dataset-sizing-selling-price" className="mb-1 block text-[11px] font-medium text-slate-700">Selling Price (THB)</label>
                <input
                  id="dataset-sizing-selling-price"
                  type="number"
                  step="any"
                  value={sellingPrice}
                  onChange={event => { setSellingPrice(event.target.value); setSizingError('') }}
                  className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="dataset-sizing-sga-percent" className="mb-1 block text-[11px] font-medium text-slate-700">SG&amp;A (%)</label>
                <input
                  id="dataset-sizing-sga-percent"
                  type="number"
                  step="any"
                  value={sgaPercent}
                  onChange={event => { setSgaPercent(event.target.value); setSizingError('') }}
                  className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
              <div className="sm:col-span-8">
                <label htmlFor="dataset-sizing-dataset-remark" className="mb-1 block text-[11px] font-medium text-slate-700">Dataset Remark</label>
                <input
                  id="dataset-sizing-dataset-remark"
                  type="text"
                  value={remark}
                  onChange={event => { setRemark(event.target.value); setSizingError('') }}
                  className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            </div>
          </section>

          <section aria-label="Dataset row counts" className="border-t border-slate-200 pt-2">
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Rows</h4>
            <div className="divide-y divide-slate-100">
              <label htmlFor="dataset-sizing-bom-rows" className="flex min-h-9 items-center justify-between gap-3 py-1 text-xs text-slate-800">
                <span>Bill of Materials</span>
                <input id="dataset-sizing-bom-rows" type="number" min="1" step="1" max={DATASET_SIZING_LIMITS.bomCount} placeholder="Unset" value={bomCount} onChange={event => { setBomCount(event.target.value); setSizingError('') }} className="h-7 w-24 border border-slate-300 bg-white px-2 text-right font-mono text-xs tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700" />
              </label>
              <label htmlFor="dataset-sizing-work-center-rows" className="flex min-h-9 items-center justify-between gap-3 py-1 text-xs text-slate-800">
                <span>Work Centers</span>
                <input id="dataset-sizing-work-center-rows" type="number" min="1" step="1" max={DATASET_SIZING_LIMITS.wcCount} placeholder="Unset" value={wcCount} onChange={event => { setWcCount(event.target.value); setSizingError('') }} className="h-7 w-24 border border-slate-300 bg-white px-2 text-right font-mono text-xs tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700" />
              </label>
              <label htmlFor="dataset-sizing-routing-rows" className="flex min-h-9 items-center justify-between gap-3 py-1 text-xs text-slate-800">
                <span>Routing</span>
                <input id="dataset-sizing-routing-rows" type="number" min="1" step="1" max={DATASET_SIZING_LIMITS.routingCount} placeholder="Unset" value={routingCount} onChange={event => { setRoutingCount(event.target.value); setSizingError('') }} className="h-7 w-24 border border-slate-300 bg-white px-2 text-right font-mono text-xs tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700" />
              </label>
            </div>
          </section>
          {sizingError && <p className="text-sm font-medium text-rose-700" role="alert">{sizingError}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => { void handleDownloadTemplate() }} className="inline-flex min-h-8 items-center justify-center gap-1.5 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Download Template
          </button>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-8 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex min-h-8 items-center gap-1.5 border border-slate-900 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
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
