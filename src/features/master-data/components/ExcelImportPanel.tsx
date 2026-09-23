import React from 'react'
import { Copy, Download, FileSpreadsheet } from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster } from '../../../core'
import { generateDynamicExcelTemplate, downloadBlob } from '../../../services'
import { ExcelUploadDropzone } from '../../../shared/ui/ExcelUploadDropzone'

interface ExcelImportPanelProps {
  product: ProductMaster
  snapshot: CostSnapshot
  importRole: ComparisonRole
  canEdit: boolean
  onImportRoleChange: (role: ComparisonRole) => void
  onCloneReferenceToCurrent: () => void
}

export const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({
  product,
  snapshot,
  importRole,
  canEdit,
  onImportRoleChange,
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

  return (
    <div className="bg-white p-3.5 rounded-none border border-slate-300/80 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
            Dataset Import / Template
          </h2>
          <p className="text-[10px] text-slate-500 font-sans max-w-2xl">
            One workbook is one Product and one Dataset. Choose the dataset role here; Product Code is checked against the Header Product during import.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer self-start shadow-2xs"
        >
          <Download className="w-3 h-3 text-slate-600" />
          Download Dataset Template
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span id="excel-import-role-label" className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-tight">
          Dataset role
        </span>
        <div className="inline-flex overflow-hidden rounded border border-slate-300 shadow-2xs" role="group" aria-labelledby="excel-import-role-label">
          {(['reference', 'current'] as const).map((role, index) => (
            <button
              key={role}
              type="button"
              aria-pressed={importRole === role}
              onClick={() => onImportRoleChange(role)}
              className={`${index > 0 ? 'border-l border-slate-300 ' : ''}px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-1 ${
                importRole === role ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {role === 'reference' ? 'Reference' : 'Current'}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-500">Product: <strong className="text-slate-800">{product.productCode || '—'}</strong></span>
      </div>

      <ExcelUploadDropzone importRole={importRole} expectedProductCode={product.productCode} />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <p className="text-[10px] font-sans text-slate-500">
          Import creates or updates a Draft dataset. Review Missing/Invalid/Warning fields before activation.
        </p>
        <button
          type="button"
          onClick={onCloneReferenceToCurrent}
          disabled={!canEdit}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          title="Copy the full Reference dataset into Current, then adjust Current values"
        >
          <Copy className="w-3 h-3 text-slate-600" />
          Clone Reference → Current
        </button>
      </div>
    </div>
  )
}
