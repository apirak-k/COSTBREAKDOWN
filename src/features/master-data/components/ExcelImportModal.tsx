import React, { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, FileSpreadsheet, X } from 'lucide-react'
import type { MasterDataRole, SnapshotImportResult } from '../../../core'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'
import { useDialogFocus } from '../use-dialog-focus'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  importRole: MasterDataRole
  hasWorkingData: boolean
  onImport: (result: SnapshotImportResult) => void
}

const roleLabel = (role: MasterDataRole) => role === 'reference' ? 'Reference' : role === 'current' ? 'Current' : 'Custom'

const getImportErrorSummary = (message: string) => {
  if (message.startsWith('Dataset workbook not recognized')) return 'Workbook structure is not supported. Choose a COSTBREAKDOWN dataset workbook.'
  if (message.startsWith('PRODUCT must contain')) return 'Workbook must contain exactly one Product record.'
  if (message.startsWith('Import rejected')) return 'Required values are invalid or a Routing Work Center cannot be resolved.'
  if (message.startsWith('Choose an Excel workbook')) return 'Choose an Excel workbook (.xlsx or .xls).'
  return 'This workbook could not be read. Check the file and try again.'
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importRole,
  hasWorkingData,
  onImport
}) => {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [parsedImport, setParsedImport] = useState<SnapshotImportResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const dialogRef = useDialogFocus(isOpen, onClose)
  const targetLabel = roleLabel(importRole)

  useEffect(() => {
    if (isOpen) {
      setSelectedFileName('')
      setParsedImport(null)
      setIsParsing(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const canImport = !isParsing && parsedImport?.success === true && parsedImport.snapshot !== undefined
  const handleImport = () => {
    if (!canImport || !parsedImport) return
    onImport(parsedImport)
    onClose()
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-slate-300 bg-white text-slate-900 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
            <h2 id="import-modal-title" className="truncate text-sm font-semibold">Import Dataset · {targetLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            aria-label="Close Import"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <ExcelUploadDropzone
            importRole={importRole}
            hasSelection={Boolean(selectedFileName)}
            onFileSelected={fileName => { setSelectedFileName(fileName); setParsedImport(null) }}
            onParsed={setParsedImport}
            onParsingChange={setIsParsing}
          />

          {selectedFileName && (
            <div className="flex min-w-0 items-center gap-2 text-xs" aria-live="polite">
              {parsedImport?.success
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                : parsedImport && !parsedImport.success
                  ? <CircleAlert className="h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                  : <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800" title={selectedFileName}>{selectedFileName}</span>
              {isParsing
                ? <span className="shrink-0 text-slate-500" role="status">Validating…</span>
                : parsedImport?.success
                  ? <span className="shrink-0 font-medium text-emerald-700">Valid</span>
                  : parsedImport && !parsedImport.success
                    ? <span className="shrink-0 font-medium text-rose-700">Invalid</span>
                    : null}
            </div>
          )}

          {!isParsing && parsedImport?.success && parsedImport.snapshot && (
            <div className="space-y-2 border-y border-slate-200 py-2 text-xs text-slate-800" role="status" aria-label="Workbook import summary">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0 text-slate-500">Product Name</span>
                <span className="min-w-0 truncate text-right font-medium">{parsedImport.snapshot.product.productName || '—'}</span>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-2">
                <div className="px-2 first:pl-0">
                  <dt className="text-[11px] text-slate-500">Bill of Materials</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">{parsedImport.snapshot.bom.length} rows</dd>
                </div>
                <div className="px-2">
                  <dt className="text-[11px] text-slate-500">Work Centers</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">{parsedImport.snapshot.rates.length} rows</dd>
                </div>
                <div className="px-2 last:pr-0">
                  <dt className="text-[11px] text-slate-500">Routing</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">{parsedImport.snapshot.routing.length} rows</dd>
                </div>
              </dl>
              {parsedImport.warnings && parsedImport.warnings.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-4 text-amber-900">
                  {parsedImport.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              )}
            </div>
          )}

          {!isParsing && parsedImport && !parsedImport.success && parsedImport.message && (
            <div role="alert" className="border-l-2 border-rose-500 bg-rose-50/70 px-3 py-2 text-xs text-rose-900">
              <p className="font-medium">{getImportErrorSummary(parsedImport.message)}</p>
              {parsedImport.warnings && parsedImport.warnings.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">
                  {parsedImport.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              )}
            </div>
          )}

          {hasWorkingData && parsedImport?.success && (
            <p className="border-l-2 border-slate-300 pl-2 text-[11px] text-slate-600" role="note">
              This will replace {targetLabel} Working data. Last Saved remains unchanged.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-8 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            Cancel
          </button>
          {canImport && (
            <button
              type="button"
              onClick={handleImport}
              className="min-h-8 border border-slate-900 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
