import React from 'react'
import { X, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { MasterDataRole } from '../../../core'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'
import { useDialogFocus } from '../use-dialog-focus'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  importRole: MasterDataRole
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importRole
}) => {
  const dialogRef = useDialogFocus(isOpen, onClose)
  if (!isOpen) return null

  const roleLabel = importRole === 'reference' ? 'Reference (Baseline)' : importRole === 'current' ? 'Current (Target)' : 'Custom'

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 id="import-modal-title" className="text-base font-semibold text-slate-900">
                Import Dataset from Excel
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Target Dataset:{' '}
                <span className="font-mono font-bold text-slate-800">{roleLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-2.5 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Notice on Dataset Replacement:</p>
              <p className="text-sm leading-6 text-amber-900">
                Uploading a file will <strong>replace all existing data</strong> in the{' '}
                <span className="font-mono font-bold uppercase">{roleLabel}</span> workspace (Product, Work Centers, BOM, Routing).{' '}
                {importRole === 'custom' ? 'Reference and Current remain unchanged.' : 'The opposite dataset remains unchanged.'}
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-slate-50 p-2">
            <ExcelUploadDropzone
              importRole={importRole}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-sm border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
