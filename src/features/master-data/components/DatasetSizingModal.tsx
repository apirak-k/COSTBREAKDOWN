import React, { useState, useEffect } from 'react'
import { X, Check, Download } from 'lucide-react'
import { MasterDataRole, CostSnapshot, DatasetSizing, ProductMaster } from '../../../core'
import { DATASET_SIZING_LIMITS } from '../../../core/utils/sizing'
import { getMasterDataNumericInputDomain, isMasterDataNumericInputValid } from '../../../core/utils/master-data-validation'
import { hasDatasetMetadataChanged, hasDatasetSizingChanged, parseDatasetSizingCounts } from '../dataset-sizing-form'
import { getPopulatedRowsRemovedBySizing } from '../../../state/dataset-sizing'
import { downloadBlob } from '../../../services/excel/export'
import { HeaderValue } from '../../../shared/layout/HeaderValue'
import { useDialogFocus } from '../use-dialog-focus'
import { masterDataTextEditorClass } from './master-data-field-styles'
import { MasterDataNumericInput, masterDataSelectedValueId } from './MasterDataNumericValue'

const metadataNumericEditorClass = `${masterDataTextEditorClass} font-mono tabular-nums text-right`
const metadataInlineLabelClass = 'shrink-0 whitespace-nowrap text-left text-[11px] font-medium text-slate-700'
const sizingGroupDividerClass = "relative after:absolute after:-right-1.5 after:top-1 after:bottom-1 after:hidden after:w-px after:bg-slate-200 after:content-[''] md:after:block"

function currentCount(count: number | undefined, rowCount: number): string {
  if (count !== undefined) return String(count)
  return rowCount > 0 ? String(rowCount) : ''
}

interface DatasetSizingModalProps {
  isOpen: boolean
  onClose: () => void
  role: MasterDataRole
  selectionDatasetId?: string
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
  selectionDatasetId = '',
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
  const sizingValueSourceId = (section: string, recordId: string, field: string) => masterDataSelectedValueId(role, selectionDatasetId, section, recordId, field)

  const buildSizingDraft = () => {
    const nextSizing = parseDatasetSizingCounts({ wcCount, bomCount, routingCount })
    const parseOptionalNumber = (value: string, label: string, field: 'sellingPrice' | 'sgaPercent'): number | null => {
      const trimmed = value.trim()
      if (!trimmed) return null
      const parsed = Number(trimmed)
      if (!isMasterDataNumericInputValid(field, parsed)) throw new RangeError(`${label} must be zero or greater.`)
      return parsed
    }
    const nextProductName = productName.trim()
    const nextProduct = {
      ...product,
      productName: nextProductName,
      productDescription: nextProductName,
      uom: uom.trim(),
      sellingPrice: parseOptionalNumber(sellingPrice, 'Selling Price', 'sellingPrice'),
      sgaPercent: parseOptionalNumber(sgaPercent, 'SG&A', 'sgaPercent')
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
      setSizingError(error instanceof RangeError ? error.message : 'Template could not be generated. Please try again.')
    }
  }

  const renderRowCount = (
    label: string,
    id: string,
    value: string,
    setValue: (value: string) => void,
    max: number,
    tableKey: string,
    showDivider = false
  ) => {
    return (
      <div className={`relative flex min-w-0 items-center gap-1.5 text-xs text-slate-800 ${showDivider ? sizingGroupDividerClass : ''}`}>
        <label htmlFor={id} className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-700">{label} :</label>
        <div className="min-w-0 flex-1">
          <MasterDataNumericInput
            id={id}
            aria-label={label}
            value={value === '' ? null : Number(value)}
            onValueChange={next => { setValue(next === null ? '' : String(next)); setSizingError('') }}
            selectionId={sizingValueSourceId('sizing-rows', tableKey, 'count')}
            integer
            min={1}
            max={max}
            placeholder="Unset"
            className={`${masterDataTextEditorClass} font-mono tabular-nums text-right [&+span]:right-1`}
          />
        </div>
      </div>
    )
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
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[48rem] overflow-y-auto border border-slate-300 bg-white text-slate-900 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 px-3 py-2">
          <h3 id="sizing-modal-title" className="text-sm font-semibold">Sizing · {roleLabel}</h3>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <HeaderValue inDialog />
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-3 py-3">
          <section aria-label="Dataset metadata" className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">METADATA</h4>
            <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-[minmax(0,20fr)_minmax(0,45fr)_minmax(0,35fr)]">
              <div className="flex min-w-0 items-center gap-1.5 md:col-span-3">
                <label htmlFor="dataset-sizing-product-name" className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-700">Product Name :</label>
                <div className="min-w-0 flex-1">
                  <input
                    id="dataset-sizing-product-name"
                    type="text"
                    value={productName}
                    onChange={event => { setProductName(event.target.value); setSizingError('') }}
                    className={masterDataTextEditorClass}
                  />
                </div>
              </div>
              <div className={`flex min-w-0 items-center gap-1.5 ${sizingGroupDividerClass}`}>
                <label htmlFor="dataset-sizing-uom" className={metadataInlineLabelClass}>UOM :</label>
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_1rem] items-center gap-1">
                  <input
                    id="dataset-sizing-uom"
                    type="text"
                    value={uom}
                    onChange={event => { setUom(event.target.value); setSizingError('') }}
                    className={`${masterDataTextEditorClass} font-mono`}
                  />
                  <span aria-hidden="true" className="w-4" />
                </div>
              </div>
              <div className={`flex min-w-0 items-center gap-1.5 ${sizingGroupDividerClass}`}>
                <label htmlFor="dataset-sizing-selling-price" className={metadataInlineLabelClass}>Selling Price (THB) :</label>
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_1rem] items-center gap-1">
                  <MasterDataNumericInput
                    id="dataset-sizing-selling-price"
                    aria-label="Selling Price (THB)"
                    value={sellingPrice === '' ? null : Number(sellingPrice)}
                    onValueChange={value => { setSellingPrice(value === null ? '' : String(value)); setSizingError('') }}
                    selectionId={sizingValueSourceId('sizing-metadata', 'product', 'sellingPrice')}
                    {...getMasterDataNumericInputDomain('sellingPrice')}
                    className={`${metadataNumericEditorClass} [&+span]:right-1`}
                  />
                  <span aria-hidden="true" className="w-4" />
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <label htmlFor="dataset-sizing-sga-percent" className={metadataInlineLabelClass}>SG&amp;A :</label>
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_1rem] items-center gap-1">
                  <MasterDataNumericInput
                    id="dataset-sizing-sga-percent"
                    aria-label="SG&A"
                    value={sgaPercent === '' ? null : Number(sgaPercent)}
                    onValueChange={value => { setSgaPercent(value === null ? '' : String(value)); setSizingError('') }}
                    selectionId={sizingValueSourceId('sizing-metadata', 'product', 'sgaPercent')}
                    percentage
                    {...getMasterDataNumericInputDomain('sgaPercent')}
                    className={`${metadataNumericEditorClass} [&+span]:right-1`}
                  />
                  <span aria-hidden="true" className="w-4 text-center text-xs text-slate-600">%</span>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 md:col-span-3">
                <label htmlFor="dataset-sizing-dataset-remark" className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-700">Dataset Remark :</label>
                <div className="min-w-0 flex-1">
                  <input
                    id="dataset-sizing-dataset-remark"
                    type="text"
                    value={remark}
                    onChange={event => { setRemark(event.target.value); setSizingError('') }}
                    className={masterDataTextEditorClass}
                  />
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Dataset rows" className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">TABLE ROWS</h4>
            <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-3">
              {renderRowCount('Bill of Materials', 'dataset-sizing-bom-rows', bomCount, setBomCount, DATASET_SIZING_LIMITS.bomCount, 'bom', true)}
              {renderRowCount('Work Centers', 'dataset-sizing-work-center-rows', wcCount, setWcCount, DATASET_SIZING_LIMITS.wcCount, 'work-centers', true)}
              {renderRowCount('Routing', 'dataset-sizing-routing-rows', routingCount, setRoutingCount, DATASET_SIZING_LIMITS.routingCount, 'routing')}
            </div>
          </section>
          {sizingError && <p className="text-sm font-medium text-rose-700" role="alert">{sizingError}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => { void handleDownloadTemplate() }} className="inline-flex min-h-8 items-center justify-center gap-1.5 border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download Template
          </button>
          <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
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
