import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'primary'
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white'
      case 'primary':
        return 'bg-slate-900 hover:bg-slate-800 text-white'
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${getButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
