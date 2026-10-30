import React, { useRef, useState } from 'react'
import { CloudUpload, Loader2 } from 'lucide-react'
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

  const openFilePicker = () => {
    if (!isLoading) fileInputRef.current?.click()
  }

  const handleFileProcess = async (file: File) => {
    onFileSelected(file.name)
    onParsed({ success: false, message: '', role: importRole })
    const extension = file.name.toLocaleLowerCase()
    if (!extension.endsWith('.xlsx')) {
      onParsed({
        success: false,
        message: 'Choose an Excel workbook (.xlsx).',
        warnings: [],
        role: importRole
      })
      return
    }

    setIsLoading(true)
    onParsingChange(true)
    try {
      const { parseSnapshotExcelInputFile } = await import('../../services/excel/snapshot-parser')
      onParsed(await parseSnapshotExcelInputFile(file, importRole))
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

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setIsDragging(false)
  }

  return (
    <div role="group" aria-label="Excel workbook file">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        aria-label="Choose an .xlsx workbook"
        onChange={event => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void handleFileProcess(file)
        }}
      />
      <button
        type="button"
        disabled={isLoading}
        onClick={openFilePicker}
        onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={hasSelection ? 'Choose another .xlsx workbook' : 'Choose an .xlsx workbook'}
        aria-busy={isLoading}
        className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-5 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-70 disabled:hover:border-slate-400 disabled:hover:bg-slate-50 ${
          isDragging ? 'border-slate-700 bg-slate-100' : 'border-slate-400 bg-slate-50 hover:border-slate-500 hover:bg-slate-100'
        }`}
      >
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center border border-slate-300 bg-white text-slate-700">
          {isLoading
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <CloudUpload className="h-5 w-5" />}
        </span>
        <span className="text-xs font-medium text-slate-900">{isLoading ? 'Reading workbook…' : hasSelection ? 'Drop another .xlsx workbook or click to replace' : 'Drop an .xlsx workbook here'}</span>
        <span className="text-[11px] text-slate-500">.xlsx files only · Click or drop to select</span>
      </button>
    </div>
  )
}
