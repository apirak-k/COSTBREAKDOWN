import React, { useState } from 'react'
import { FileSpreadsheet, RotateCcw, Trash2, ArrowUpCircle, Download } from 'lucide-react'
import { ComparisonRole, ProductMaster, WorkCenterRate } from '../../../core'
import { generateDynamicExcelTemplate, downloadBlob } from '../../../services'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'
import { ConfirmModal } from '../../../shared/ui/ConfirmModal'

interface ExcelImportPanelProps {
  product: ProductMaster
  rates: WorkCenterRate[]
  bomCount: number
  routingCount: number
  onPromoteActive: () => void
  onResetDefault: () => void
  onClearAll: () => void
}

export const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({
  product,
  rates,
  bomCount,
  routingCount,
  onPromoteActive,
  onResetDefault,
  onClearAll
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'promote' | 'reset' | 'clear' | null
  }>({ isOpen: false, type: null })
  const [importRole, setImportRole] = useState<ComparisonRole>('current')

  const handleDownloadTemplate = async () => {
    try {
      const blob = await generateDynamicExcelTemplate({
        product,
        wcCount: rates.length,
        bomCount,
        routingCount,
        existingRates: rates
      })
      const filename = `CostModel_Template_${product.productCode || 'PRODUCT'}.xlsx`
      downloadBlob(blob, filename)
    } catch (e) {
      console.error('Failed to generate dynamic Excel template', e)
    }
  }

  const handleConfirmAction = () => {
    if (modalState.type === 'promote') {
      onPromoteActive()
    } else if (modalState.type === 'reset') {
      onResetDefault()
    } else if (modalState.type === 'clear') {
      onClearAll()
    }
    setModalState({ isOpen: false, type: null })
  }

  return (
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
            Excel Data Sync &amp; Session Management
          </h2>
          <p className="text-[10px] text-slate-500 font-sans">
            Download standard template, import existing model workbooks, or promote active values into baseline standard.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3 h-3 text-slate-600" />
          Download Template (.xlsx)
        </button>
      </div>

      {/* Upload Role */}
      <div className="flex flex-wrap items-center gap-2">
        <span id="excel-import-role-label" className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-tight">
          Import as
        </span>
        <div className="inline-flex overflow-hidden rounded border border-slate-300 shadow-2xs" role="group" aria-labelledby="excel-import-role-label">
          <button
            type="button"
            aria-pressed={importRole === 'reference'}
            onClick={() => setImportRole('reference')}
            className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-1 ${
              importRole === 'reference' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Reference
          </button>
          <button
            type="button"
            aria-pressed={importRole === 'current'}
            onClick={() => setImportRole('current')}
            className={`border-l border-slate-300 px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-1 ${
              importRole === 'current' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Current
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <ExcelUploadDropzone importRole={importRole} expectedProductCode={product.productCode} />

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={() => setModalState({ isOpen: true, type: 'promote' })}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
          title="Promote current active prices/yields to become the new baseline standard"
        >
          <ArrowUpCircle className="w-3 h-3 text-slate-600" />
          Promote Active to Baseline
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalState({ isOpen: true, type: 'reset' })}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            Reset Default
          </button>
          <button
            onClick={() => setModalState({ isOpen: true, type: 'clear' })}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-rose-700 hover:text-rose-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-rose-600" />
            Clear Data
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={modalState.isOpen && modalState.type === 'promote'}
        title="Promote Active to Baseline Standard?"
        message="This action will overwrite Base Price P0 with Active Price P1, Base Loss with Active Loss, and Base Capacity/Yield with Active Capacity/Yield across all BOM and Routing rows. This will reset the cost variance to 0.0000 THB."
        confirmText="Promote & Lock Baseline"
        variant="primary"
        onConfirm={handleConfirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null })}
      />

      <ConfirmModal
        isOpen={modalState.isOpen && modalState.type === 'reset'}
        title="Reset to RGOM-024 Default Seed?"
        message="This will reload the verified RGOM-024 Membrane Switch baseline dataset with 4 Work Centers, 16 BOM Items, and 39 Routing steps. Any unsaved custom entries will be lost."
        confirmText="Reset to Seed Data"
        variant="warning"
        onConfirm={handleConfirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null })}
      />

      <ConfirmModal
        isOpen={modalState.isOpen && modalState.type === 'clear'}
        title="Clear All Session Data?"
        message="This will remove all BOM items, Routing steps, and Work Center rates from this product session."
        confirmText="Clear All Data"
        variant="danger"
        onConfirm={handleConfirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null })}
      />
    </div>
  )
}
