import React from 'react'
import { AlertTriangle, CircleX, Plus } from 'lucide-react'
import { Tooltip } from '../../../shared/ui/Tooltip'

interface MasterDataTableHeaderProps {
  title: string
  rowCount: number
  selectedCount: number
  warningCount: number
  blockerCount: number
  isEditMode: boolean
  onNextWarning: () => void
  onNextBlocker: () => void
  onAddRow: () => void
}

export const MasterDataTableHeader: React.FC<MasterDataTableHeaderProps> = ({
  title,
  rowCount,
  selectedCount,
  warningCount,
  blockerCount,
  isEditMode,
  onNextWarning,
  onNextBlocker,
  onAddRow
}) => (
  <header className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2.5">
    <div className="flex min-w-0 items-baseline gap-2">
      <h3 className="min-w-0 truncate text-xs font-semibold text-slate-800">{title}</h3>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-500">{rowCount} rows · {selectedCount} selected</span>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      <Tooltip label="Jump to next warning">
        <button
          type="button"
          onClick={onNextWarning}
          disabled={warningCount === 0}
          aria-label={warningCount > 0 ? `Jump to next warning, ${warningCount} in ${title}` : `No warnings in ${title}`}
          className={`inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-sm px-1.5 font-mono text-[11px] tabular-nums transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:hover:bg-transparent ${warningCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{warningCount}</span>
        </button>
      </Tooltip>
      <Tooltip label="Jump to next blocker">
        <button
          type="button"
          onClick={onNextBlocker}
          disabled={blockerCount === 0}
          aria-label={blockerCount > 0 ? `Jump to next blocker, ${blockerCount} in ${title}` : `No blockers in ${title}`}
          className={`inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-sm px-1.5 font-mono text-[11px] tabular-nums transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:hover:bg-transparent ${blockerCount > 0 ? 'text-rose-700' : 'text-slate-400'}`}
        >
          <CircleX className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{blockerCount}</span>
        </button>
      </Tooltip>
      <button
        type="button"
        onClick={onAddRow}
        disabled={!isEditMode}
        aria-label={isEditMode ? `Add row to ${title}` : `Switch to Edit to add a row to ${title}`}
        className="inline-flex h-7 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-45 disabled:hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <Plus className="h-3 w-3" aria-hidden="true" /> Add Row
      </button>
    </div>
  </header>
)
