import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
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
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-slate-900 bg-slate-100/60'
            : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
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

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {isLoading ? 'Processing Workbook...' : 'Click to upload or drag and drop Excel Model (.xlsx)'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports Cost Model v2 with sheets: 1_MASTER_RATES, 2_BOM_BREAKDOWN, 3_ROUTING_BREAKDOWN
            </p>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}

          <div className="space-y-1">
            <p className="font-semibold">{statusMessage.text}</p>
            {statusMessage.details && statusMessage.details.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                {statusMessage.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
