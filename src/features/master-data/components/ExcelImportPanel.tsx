import React from 'react'
import { Copy, Download, FileSpreadsheet, FileUp } from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster } from '../../../core'
import { generateDynamicExcelTemplate, exportSnapshotToExcel, downloadBlob } from '../../../services'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'

interface ExcelImportPanelProps {
  product: ProductMaster
  snapshot: CostSnapshot
  importRole: ComparisonRole
  canEdit: boolean
  canCloneReference: boolean
  onCloneReferenceToCurrent: () => void
}

export const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({
  product,
  snapshot,
  importRole,
  canEdit,
  canCloneReference,
  onCloneReferenceToCurrent
}) => {
  const handleDownloadTemplate = async () => {
    const blob = await generateDynamicExcelTemplate({
      product,
      snapshot,
      wcCount: Math.max(1, snapshot.rates.length),
      bomCount: Math.max(1, snapshot.bom.length),
      routingCount: Math.max(1, snapshot.routing.length)
    })
    downloadBlob(blob, `MasterData_${product.productCode || 'PRODUCT'}_${importRole}.xlsx`)
  }

  const handleExportDataset = async () => {
    const blob = await exportSnapshotToExcel(snapshot, product)
    const roleLabel = importRole === 'reference' ? 'Reference' : 'Current'
    downloadBlob(blob, `Dataset_${product.productCode || 'PRODUCT'}_${roleLabel}.xlsx`)
  }

  return (
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
            Dataset Import / Export / Template
          </h2>
          <p className="text-[10px] text-slate-500 font-sans max-w-2xl">
            One workbook is one Product and one Dataset. The selected dataset above controls where this workbook is imported or exported.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={handleExportDataset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
            title="Export the active Working Dataset into an Excel workbook"
          >
            <FileUp className="w-3 h-3 text-slate-600" />
            Export Dataset
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3 h-3 text-slate-600" />
            Download Dataset Template
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-slate-200 py-2">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tight">Selected dataset</span>
        <span className="px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded">
          {importRole === 'reference' ? 'Reference' : 'Current'}
        </span>
        <span className="text-[10px] font-mono text-slate-500">Product: <strong className="text-slate-800">{product.productCode || '—'}</strong></span>
      </div>

      <ExcelUploadDropzone importRole={importRole} expectedProductCode={product.productCode} disabled={!canEdit} />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <p className="text-[10px] font-sans text-slate-500">
          Upload replaces the data on the selected side. After upload or manual input, edit values freely.
        </p>
        <button
          type="button"
          onClick={onCloneReferenceToCurrent}
          disabled={!canEdit || !canCloneReference}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          title={canCloneReference ? 'Copy the full Reference dataset into Current, then adjust Current values' : 'Prepare the Reference dataset before cloning it into Current'}
        >
          <Copy className="w-3 h-3 text-slate-600" />
          Clone Reference → Current
        </button>
      </div>
    </div>
  )
}
