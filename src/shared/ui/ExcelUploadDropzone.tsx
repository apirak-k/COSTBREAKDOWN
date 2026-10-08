import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { MasterDataRole } from '../../core'
import { useAppStore } from '../../state'

interface ExcelUploadDropzoneProps {
  importRole?: MasterDataRole
}

export const ExcelUploadDropzone: React.FC<ExcelUploadDropzoneProps> = ({
  importRole = 'current'
}) => {
  const { importSnapshotFromExcel } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
    details?: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please upload an Excel file (.xlsx or .xls).'
      })
      return
    }

    setIsLoading(true)
    setStatusMessage(null)

    try {
      const { parseSnapshotExcelInputFile } = await import('../../services/excel/snapshot-parser')
      const result = await parseSnapshotExcelInputFile(file, importRole, {
        allowLegacy: false
      })
      if (result.success) {
        importSnapshotFromExcel(result)
        setStatusMessage({
          type: result.warnings && result.warnings.length > 0 ? 'warning' : 'success',
          text: result.message,
          details: result.warnings
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown parsing error'
      setStatusMessage({
        type: 'error',
        text: `Error processing Excel workbook: ${msg}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        aria-label="Select or drop an Excel workbook to import"
        className={`rounded-md border-2 border-dashed p-8 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
          isDragging
            ? 'border-slate-900 bg-slate-200 cursor-pointer'
            : 'border-slate-300 hover:border-slate-500 bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0])
            }
          }}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-700">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isLoading
                ? 'Processing Excel Workbook Data...'
                : 'Click to upload or drag & drop Excel workbook (.xlsx)'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Importing into <span className="font-bold text-slate-700">{importRole === 'reference' ? 'Reference' : importRole === 'current' ? 'Current' : 'Custom'}</span>. The workbook supplies the Product information for this dataset.
            </p>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          role="status"
          className={`flex items-start justify-between gap-2 rounded-sm border p-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{statusMessage.text}</p>
              {statusMessage.details && statusMessage.details.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-1 text-xs text-slate-700">
                  {statusMessage.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss import status"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-slate-600 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
