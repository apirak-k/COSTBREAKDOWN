import React, { useCallback, useMemo, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { SnapshotWorkCenterRate, formatNumber } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, hasInvalidNumber } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'
import type { MasterDataBlockerItem } from '../prepare-dataset'
import { MasterDataTableFooter, MasterDataTableHeader } from './MasterDataTableChrome'

interface WorkCenterRatesTableProps {
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  historyScope: string
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  showWarningHighlights?: boolean
  warningCount: number
  blockerItems: MasterDataBlockerItem[]
  onNavigateBlocker: (item: MasterDataBlockerItem) => void
  onUndo: () => void
  onRedo: () => void
  onAddRate: () => void
  onUpdateRates: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>) => void
  onDeleteRates: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
  onWarningNavigationHandled: (requestId: number) => void
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  isEditMode = false,
  historyScope,
  searchQuery = '',
  onSearchQueryChange = () => undefined,
  showWarningHighlights = true,
  warningCount,
  blockerItems,
  onNavigateBlocker,
  onUndo,
  onRedo,
  onAddRate,
  onUpdateRates,
  onDeleteRates,
  onReorderRows,
  warningNavigationTarget,
  onWarningNavigationHandled
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const blockerIndexRef = useRef(0)
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateWcIds = useMemo(() => duplicateIdentityIds(rates, rate => rate.id, rate => rate.workCenterCode), [rates])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(rates, rate => rate.workCenterCode), [rates])

  const filteredRates = useMemo(() => rates.filter(rate =>
    [rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [rates, query])

  const {
    selectedIds,
    setSelectedIds,
    toggleAll,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRates,
    getItemId: rate => rate.id,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  const {
    applyCellUpdate,
    applyPasteUpdates
  } = useSpreadsheetEditing({
    rows: rates,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateRates
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotWorkCenterRate> | null = null
      if (cell.field === 'workCenterCode') changes = { workCenterCode: cell.value }
      else if (cell.field === 'laborRate') changes = { laborRate: parseNumber(cell.value) }
      else if (cell.field === 'burdenRate') changes = { burdenRate: parseNumber(cell.value) }
      else if (cell.field === 'note') changes = { note: cell.value }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyPasteUpdates(updates)
  }, [applyPasteUpdates])

  const { selectedCellKeys } = useTableKeyboardNav({
    tableRef,
    isEditMode,
    onPasteCells: handlePasteCells,
    onUndo,
    onRedo
  })

  const handleNextBlocker = () => {
    if (blockerItems.length === 0) return
    const target = blockerItems[blockerIndexRef.current % blockerItems.length]
    blockerIndexRef.current = (blockerIndexRef.current + 1) % blockerItems.length
    onNavigateBlocker(target)
  }

  const allVisibleSelected = filteredRates.length > 0 && filteredRates.every(rate => selectedIds.has(rate.id))

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.setData('application/x-costbreakdown-row-ids', JSON.stringify(selectedIds.has(id) ? [...selectedIds] : [id]))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleRowDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    event.preventDefault()
    const movingId = event.dataTransfer.getData('text/plain')
    if (!movingId || movingId === targetId) return
    let movingIds = [movingId]
    try {
      const parsedIds: unknown = JSON.parse(event.dataTransfer.getData('application/x-costbreakdown-row-ids'))
      if (Array.isArray(parsedIds)) {
        const validIds = parsedIds.filter((id): id is string => typeof id === 'string')
        if (validIds.includes(movingId)) movingIds = validIds
      }
    } catch {
      // Keep the existing single-row drag behavior when group data is unavailable.
    }
    if (movingIds.includes(targetId)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    onReorderRows(movingId, targetId, event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before', movingIds)
  }

  return (
    <section aria-label="Work Centers rows" className="overflow-hidden border border-slate-300 bg-white select-none">
      <MasterDataTableHeader title="Work Centers" blockerCount={blockerItems.length} isEditMode={isEditMode} onNextBlocker={handleNextBlocker} onAddRow={onAddRate} />

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[780px] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-12" /><col className="w-[240px]" /><col className="w-[130px]" />
            <col className="w-[130px]" /><col /><col className="w-20" />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 p-0 text-center">
                <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredRates.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear selection for visible Work Centers rows' : 'Select all visible Work Centers rows'} title={allVisibleSelected ? 'Clear visible selection' : 'Select visible rows'} className={`h-9 w-full text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400`}>#</button>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Work Center</th>
              <th scope="col" className="px-2 py-2 text-right">Labor Rate</th>
              <th scope="col" className="px-2 py-2 text-right">Burden Rate</th>
              <th scope="col" className="px-2 py-2 text-left">Note</th>
              <th scope="col" className="w-20 px-1 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRates.map(rate => {
              const isSelected = selectedIds.has(rate.id)
              const identityInvalid = !rate.workCenterCode.trim() || duplicateWcIds.has(rate.id)
              const identityWarning = Boolean(rate.isGeneratedBusinessIdentity || rate.autoRenamedFrom || duplicateWcIds.has(rate.id))
              const laborInvalid = rate.laborRate === null || hasInvalidNumber(rate.laborRate)
              const burdenInvalid = rate.burdenRate === null || hasInvalidNumber(rate.burdenRate)
              const laborMissing = rate.laborRate === null
              const burdenMissing = rate.burdenRate === null
              const rowNumber = rates.findIndex(row => row.id === rate.id) + 1
              const placeholderNumber = placeholderNumbers.get(rate.id)
              const rowMarkerBackground = isSelected
                ? 'bg-blue-50 group-hover:bg-blue-100'
                : 'bg-white group-hover:bg-slate-50'
              const numericClass = (invalid: boolean, missing: boolean) => `min-h-8 w-full min-w-0 rounded-sm border px-1.5 text-right text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700 ${invalid ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'} ${missing ? 'bg-amber-50' : ''}`

              return (
                <tr
                  key={rate.id}
                  data-master-data-row-id={rate.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(rate.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, rate.id) }}
                  className={`group h-10 ${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 w-12 px-1.5 py-0.5 text-center font-mono font-normal text-slate-600 ${rowMarkerBackground}`}>
                    <button
                      type="button"
                      aria-label={`Select Work Centers row ${rowNumber}`}
                      aria-pressed={isSelected}
                      onMouseDown={event => startDrag(rate.id, event)}
                      onClick={event => { if (event.detail === 0) toggleRow(rate.id) }}
                      className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                    >
                      {rowNumber}
                    </button>
                  </th>
                  <td className={`px-2 py-0.5 font-mono font-semibold text-slate-950 ${identityWarning && showWarningHighlights ? 'bg-amber-50' : ''}`}>
                    {isEditMode ? (
                      <div className="min-w-0">
                        <input
                          value={rate.workCenterCode}
                          placeholder={placeholderNumber === undefined ? undefined : String(placeholderNumber)}
                          onChange={event => applyCellUpdate(rate.id, { workCenterCode: event.target.value })}
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="workCenterCode"
                          aria-label={`WC for row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-8 w-full min-w-0 rounded-sm border px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityWarning && showWarningHighlights ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'} ${selectedCellKeys.has(tableCellKey(rate.id, 'workCenterCode')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      </div>
                    ) : (
                      <div>
                        {rate.workCenterCode || <span className={showWarningHighlights ? 'text-amber-700' : 'text-slate-700'}>{placeholderNumber ?? '—'}</span>}
                      </div>
                    )}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${laborInvalid ? 'bg-amber-50 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(rate.laborRate)}
                          onChange={event => applyCellUpdate(rate.id, { laborRate: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="laborRate"
                          aria-label={`Labor Rate for ${rate.workCenterCode || `Work Center row ${rowNumber}`}`}
                          aria-invalid={laborInvalid}
                          className={`${numericClass(laborInvalid, laborMissing)} ${selectedCellKeys.has(tableCellKey(rate.id, 'laborRate')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {laborMissing && <span aria-label="Missing required value" title="Missing required value" className="shrink-0 text-[11px] font-bold text-rose-600">*</span>}
                      </div>
                    ) : <>{rate.laborRate === null ? <span className="text-amber-700">—</span> : formatNumber(rate.laborRate, 2)}{laborMissing && <span aria-label="Missing required value" title="Missing required value" className="ml-1 text-[11px] font-bold text-rose-600">*</span>}</>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${burdenInvalid ? 'bg-amber-50 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(rate.burdenRate)}
                          onChange={event => applyCellUpdate(rate.id, { burdenRate: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="burdenRate"
                          aria-label={`Burden Rate for ${rate.workCenterCode || `Work Center row ${rowNumber}`}`}
                          aria-invalid={burdenInvalid}
                          className={`${numericClass(burdenInvalid, burdenMissing)} ${selectedCellKeys.has(tableCellKey(rate.id, 'burdenRate')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {burdenMissing && <span aria-label="Missing required value" title="Missing required value" className="shrink-0 text-[11px] font-bold text-rose-600">*</span>}
                      </div>
                    ) : <>{rate.burdenRate === null ? <span className="text-amber-700">—</span> : formatNumber(rate.burdenRate, 2)}{burdenMissing && <span aria-label="Missing required value" title="Missing required value" className="ml-1 text-[11px] font-bold text-rose-600">*</span>}</>}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={rate.note || ''}
                        onChange={event => applyCellUpdate(rate.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={rate.id}
                        data-grid-field="note"
                        aria-label={`Note for ${rate.workCenterCode || `WC row ${rowNumber}`}`}
                        className={`min-h-8 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(rate.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : rate.note || '—'}
                  </td>
                  <td className={`px-1 py-0.5 text-center ${rowMarkerBackground}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => {
                          const idsToDelete = selectedIds.has(rate.id) ? [...selectedIds] : [rate.id]
                          onDeleteRates(idsToDelete)
                          setSelectedIds(previous => new Set([...previous].filter(selectedId => !idsToDelete.includes(selectedId))))
                        }}
                        aria-label={`Delete Work Centers row ${rowNumber}`}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                        title={isEditMode ? (selectedIds.has(rate.id) && selectedIds.size > 1 ? `Delete ${selectedIds.size} selected rows` : 'Delete row') : 'Switch to Edit to delete rows'}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={!isEditMode}
                        draggable={isEditMode}
                        onDragStart={event => handleDragStart(event, rate.id)}
                        aria-label={`Reorder Work Centers row ${rowNumber}`}
                        title={isEditMode ? 'Drag to reorder' : 'Reordering is available in Edit'}
                        className={`inline-flex h-8 w-7 cursor-grab items-center justify-center ${isSelected ? 'text-slate-700' : 'text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 group-hover:text-slate-600 group-focus-within:text-slate-700`}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredRates.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0 text-center font-sans text-slate-500">
                  {rates.length === 0 && isEditMode ? (
                    <button type="button" onClick={onAddRate} className="min-h-10 w-full px-3 text-xs text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Click to add first row</button>
                  ) : (
                    <div role="status" className="min-h-10 px-3 py-3 text-xs text-slate-500">{rates.length === 0 ? 'No rows yet.' : 'No rows match your search.'}</div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MasterDataTableFooter rowCount={rates.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} />
    </section>
  )
}
