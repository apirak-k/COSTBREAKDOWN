import React, { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import type { MasterDataRole, SnapshotImportResult } from '../../core'

interface ExcelUploadDropzoneProps {
  importRole?: MasterDataRole
  hasSelection?: boolean
  onFileSelected: (fileName: string) => void
  onParsed: (result: SnapshotImportResult) => void
  onParsingChange: (isParsing: boolean) => void
}

export const ExcelUploadDropzone: React.FC<ExcelUploadDropzoneProps> = ({
  importRole = 'current',
  hasSelection = false,
  onFileSelected,
  onParsed,
  onParsingChange
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    onFileSelected(file.name)
    onParsed({ success: false, message: '', role: importRole })
    const extension = file.name.toLocaleLowerCase()
    if (!extension.endsWith('.xlsx') && !extension.endsWith('.xls')) {
      onParsed({
        success: false,
        message: 'Choose an Excel workbook (.xlsx or .xls).',
        warnings: [],
        role: importRole
      })
      return
    }

    setIsLoading(true)
    onParsingChange(true)
    try {
      const { parseSnapshotExcelInputFile } = await import('../../services/excel/snapshot-parser')
      onParsed(await parseSnapshotExcelInputFile(file, importRole, { allowLegacy: false }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error'
      onParsed({ success: false, message: `Could not read the workbook: ${message}`, warnings: [], role: importRole })
    } finally {
      setIsLoading(false)
      onParsingChange(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFileProcess(file)
  }

  return (
    <div
      role="group"
      aria-label="Excel workbook file"
      aria-busy={isLoading}
      onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
      onDragLeave={event => { event.preventDefault(); setIsDragging(false) }}
      onDrop={handleDrop}
      className={`border border-dashed px-3 py-3 transition-colors ${
        isDragging ? 'border-slate-700 bg-slate-100' : 'border-slate-300 bg-slate-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        aria-label="Choose an Excel workbook"
        onChange={event => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void handleFileProcess(file)
        }}
      />
      <div className="flex min-h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {isLoading
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-600" aria-hidden="true" />
            : <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />}
          <div className="min-w-0 text-left">
            <p className="text-xs font-medium text-slate-900">{isLoading ? 'Reading workbook…' : 'Drop an Excel file here'}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Supported formats: .xlsx, .xls</p>
          </div>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="min-h-8 shrink-0 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {hasSelection ? 'Choose another file' : 'Browse'}
        </button>
      </div>
    </div>
  )
}
