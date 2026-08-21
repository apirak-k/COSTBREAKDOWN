import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { parseExcelInputFile } from '../../services'
import { useAppStore } from '../../state'

export const ExcelUploadDropzone: React.FC = () => {
  const { importFromExcel } = useAppStore()
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
      const result = await parseExcelInputFile(file)
      if (result.success) {
        importFromExcel(result)
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-none p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-slate-900 bg-slate-200'
            : 'border-slate-300 hover:border-slate-500 bg-slate-50/50 hover:bg-slate-100/60'
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
          <div className="w-9 h-9 rounded-none bg-white border border-slate-300 shadow-2xs flex items-center justify-center text-slate-700">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-800">
              {isLoading
                ? 'Processing Excel Workbook Data...'
                : 'Click to upload or drag & drop Excel workbook (.xlsx)'}
            </p>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Supports <code className="bg-slate-200 px-1 py-0.2 rounded-none text-[10px] font-mono">CostModel_BLANK_TEMPLATE.xlsx</code> or verified custom models
            </p>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-none border flex items-start justify-between gap-2 text-xs font-mono ${
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
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-slate-700 font-sans">
                  {statusMessage.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
