import React, { useState, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { parseExcelInputFile } from '../lib/excel-parser'
import { useAppStore } from '../lib/store'
import { ExcelImportResult } from '../lib/types'

export const ExcelUploadDropzone: React.FC = () => {
  const { importFromExcel } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState<ExcelImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({
        success: false,
        message: 'Unsupported file type. Please upload an Excel workbook (.xlsx or .xls).'
      })
      return
    }

    setIsParsing(true)
    setResult(null)

    const parseResult = await parseExcelInputFile(file)
    setIsParsing(false)
    setResult(parseResult)

    if (parseResult.success) {
      importFromExcel(parseResult)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept=".xlsx,.xls"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600">
            {isParsing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            ) : (
              <Upload className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {isParsing ? 'Parsing Excel Workbook...' : 'Click to Upload or Drag & Drop Excel File (.xlsx)'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">CostModel_BLANK_TEMPLATE.xlsx</code> or custom input sheets
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
            result.success
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{result.message}</p>
              {result.warnings && result.warnings.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-amber-800 space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              {result.success && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  Data loaded directly into in-memory <span className="font-mono font-bold">sessionStorage</span>. All tables updated below.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
