import React from 'react'
import { AlertTriangle, CircleX, Plus } from 'lucide-react'
import { canAddDatasetSizingRow, DATASET_SIZING_LIMITS, type DatasetSizingField } from '../../../core/utils/sizing'
import { Tooltip } from '../../../shared/ui/Tooltip'

interface MasterDataTableHeaderProps {
  title: string
  rowCount: number
  sizingField: DatasetSizingField
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
  sizingField,
  selectedCount,
  warningCount,
  blockerCount,
  isEditMode,
  onNextWarning,
  onNextBlocker,
  onAddRow
}) => {
  const canAddRow = canAddDatasetSizingRow(sizingField, rowCount)
  const addRowDisabled = !isEditMode || !canAddRow
  const addRowLabel = !isEditMode
    ? `Switch to Edit to add a row to ${title}`
    : canAddRow
      ? `Add row to ${title}`
      : `Maximum of ${DATASET_SIZING_LIMITS[sizingField]} rows reached in ${title}`

  return (
    <header className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-2.5 py-1">
      <h3 className="min-w-0 truncate text-xs font-semibold text-slate-800">{title}</h3>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        <span className="w-36 shrink-0 whitespace-nowrap text-right font-mono text-[10px] tabular-nums text-slate-500">{rowCount} rows · {selectedCount} selected</span>
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
          disabled={addRowDisabled}
          aria-label={addRowLabel}
          title={!canAddRow ? `Maximum ${DATASET_SIZING_LIMITS[sizingField]} rows` : undefined}
          className="inline-flex h-7 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-45 disabled:hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add Row
        </button>
      </div>
    </header>
  )
}
