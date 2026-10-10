import React from 'react'
import { CircleX, Plus } from 'lucide-react'

interface MasterDataTableHeaderProps {
  title: string
  blockerCount: number
  isEditMode: boolean
  onNextBlocker: () => void
  onAddRow: () => void
}

export const MasterDataTableHeader: React.FC<MasterDataTableHeaderProps> = ({
  title,
  blockerCount,
  isEditMode,
  onNextBlocker,
  onAddRow
}) => (
  <header className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2.5">
    <h3 className="min-w-0 truncate text-xs font-semibold text-slate-800">{title}</h3>
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onNextBlocker}
        disabled={blockerCount === 0}
        aria-label={blockerCount > 0 ? `Go to next blocker, ${blockerCount} in ${title}` : `No blockers in ${title}`}
        title={blockerCount > 0 ? `Next blocker · ${blockerCount}` : 'No blockers'}
        className="inline-flex h-7 min-w-9 items-center justify-center gap-1 border border-transparent px-1.5 font-mono text-[11px] tabular-nums text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-default disabled:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <CircleX className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{blockerCount}</span>
      </button>
      <button
        type="button"
        onClick={onAddRow}
        disabled={!isEditMode}
        title={isEditMode ? `Add row to ${title}` : 'Switch to Edit to add a row'}
        className="inline-flex h-7 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <Plus className="h-3 w-3" aria-hidden="true" /> Add Row
      </button>
    </div>
  </header>
)

interface MasterDataTableFooterProps {
  rowCount: number
  selectedCount: number
  warningCount: number
  blockerCount: number
}

export const MasterDataTableFooter: React.FC<MasterDataTableFooterProps> = ({
  rowCount,
  selectedCount,
  warningCount,
  blockerCount
}) => (
  <footer className="flex min-h-8 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-2.5 text-[10px] text-slate-500">
    <span className="shrink-0 font-mono tabular-nums">{rowCount} rows · {selectedCount} selected</span>
    <span className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap tabular-nums">
      <span>{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>
      <span aria-hidden="true" className="text-slate-400">·</span>
      <span className="inline-flex items-center gap-1 text-slate-500" aria-label={`${blockerCount} blockers`}>
        <CircleX className="h-3 w-3 text-rose-500" aria-hidden="true" /> {blockerCount}
      </span>
    </span>
  </footer>
)
