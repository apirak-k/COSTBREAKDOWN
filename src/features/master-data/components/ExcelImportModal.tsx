import React from 'react'
import { X, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { ComparisonRole, ProductMaster } from '../../../core'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  importRole: ComparisonRole
  product: ProductMaster
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importRole,
  product
}) => {
  if (!isOpen) return null

  const roleLabel = importRole === 'reference' ? 'Reference (Baseline)' : 'Current (Target)'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white border border-slate-300 shadow-xl max-w-xl w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 id="import-modal-title" className="text-sm font-mono font-bold uppercase tracking-tight text-slate-900">
                Import Dataset from Excel
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Target Dataset:{' '}
                <span className="font-mono font-bold text-slate-800">{roleLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs rounded">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Notice on Dataset Replacement:</p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Uploading a file will <strong>replace all existing data</strong> on the{' '}
                <span className="font-mono font-bold uppercase">{importRole}</span> side (Product, Work Centers, BOM, Routing). The opposite dataset will remain unchanged.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded p-1 bg-slate-50/50">
            <ExcelUploadDropzone
              importRole={importRole}
              expectedProductCode={product.productCode}
              disabled={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
