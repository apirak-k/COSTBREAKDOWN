import React, { useCallback, useMemo, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { SnapshotBOMItem, formatNumber, formatPercent } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, hasInvalidNumber, parsePercentage } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'
import type { MasterDataBlockerItem } from '../prepare-dataset'
import { MasterDataTableFooter, MasterDataTableHeader } from './MasterDataTableChrome'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
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
  onAddBOMItem: () => void
  onUpdateBOMItems: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>> }>) => void
  onDeleteBOMItems: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
  onWarningNavigationHandled: (requestId: number) => void
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const displayNumber = (value: number | null, digits = 2): string => value === null ? '—' : formatNumber(value, digits)

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
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
  onAddBOMItem,
  onUpdateBOMItems,
  onDeleteBOMItems,
  onReorderRows,
  warningNavigationTarget,
  onWarningNavigationHandled
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const blockerIndexRef = useRef(0)
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateNameIds = useMemo(() => duplicateIdentityIds(bom, item => item.id, item => item.description), [bom])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(bom, item => item.description), [bom])

  const filteredBOM = useMemo(() => bom.filter(item =>
    [item.description, item.consumption, item.unit, item.price, item.loss, item.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [bom, query])

  const {
    selectedIds,
    setSelectedIds,
    toggleAll,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredBOM,
    getItemId: item => item.id,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  const {
    applyCellUpdate,
    applyPasteUpdates
  } = useSpreadsheetEditing({
    rows: bom,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateBOMItems
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotBOMItem> | null = null
      if (cell.field === 'description') changes = { description: cell.value }
      else if (cell.field === 'consumption') changes = { consumption: parseNumber(cell.value) }
      else if (cell.field === 'unit') changes = { unit: cell.value }
      else if (cell.field === 'price') changes = { price: parseNumber(cell.value) }
      else if (cell.field === 'loss') changes = { loss: parsePercentage(cell.value) }
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

  const handleDeleteRow = (id: string) => {
    const idsToDelete = selectedIds.has(id) ? [...selectedIds] : [id]
    onDeleteBOMItems(idsToDelete)
    setSelectedIds(previous => new Set([...previous].filter(selectedId => !idsToDelete.includes(selectedId))))
  }

  const handleNextBlocker = () => {
    if (blockerItems.length === 0) return
    const target = blockerItems[blockerIndexRef.current % blockerItems.length]
    blockerIndexRef.current = (blockerIndexRef.current + 1) % blockerItems.length
    onNavigateBlocker(target)
  }

  const allVisibleSelected = filteredBOM.length > 0 && filteredBOM.every(item => selectedIds.has(item.id))

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
    <section aria-label="Bill of Materials rows" className="overflow-hidden border border-slate-300 bg-white select-none">
      <MasterDataTableHeader title="Bill of Materials" blockerCount={blockerItems.length} isEditMode={isEditMode} onNextBlocker={handleNextBlocker} onAddRow={onAddBOMItem} />

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[860px] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-12" /><col className="w-[200px]" /><col className="w-[120px]" /><col className="w-16" />
            <col className="w-[120px]" /><col className="w-24" /><col /><col className="w-20" />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 p-0 text-center">
                <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredBOM.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear selection for visible BOM rows' : 'Select all visible BOM rows'} title={allVisibleSelected ? 'Clear visible selection' : 'Select visible rows'} className={`h-9 w-full text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400`}>#</button>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Material</th>
              <th scope="col" className="px-2 py-2 text-right">Usage</th>
              <th scope="col" className="px-2 py-2 text-center">Unit</th>
              <th scope="col" className="px-2 py-2 text-right">Price</th>
              <th scope="col" className="px-2 py-2 text-right">Loss</th>
              <th scope="col" className="px-2 py-2 text-left">Note</th>
              <th scope="col" className="w-20 px-1 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredBOM.map(item => {
              const isSelected = selectedIds.has(item.id)
              const identityInvalid = !item.description.trim() || duplicateNameIds.has(item.id)
              const identityWarning = Boolean(item.isGeneratedBusinessIdentity || item.autoRenamedFrom || duplicateNameIds.has(item.id))
              const consumptionInvalid = item.consumption === null || hasInvalidNumber(item.consumption)
              const priceInvalid = item.price === null || hasInvalidNumber(item.price)
              const lossInvalid = item.loss === null || hasInvalidNumber(item.loss)
              const consumptionMissing = item.consumption === null
              const priceMissing = item.price === null
              const lossMissing = item.loss === null
              const rowNumber = bom.findIndex(row => row.id === item.id) + 1
              const placeholderNumber = placeholderNumbers.get(item.id)
              const rowMarkerBackground = isSelected
                ? 'bg-blue-50 group-hover:bg-blue-100'
                : 'bg-white group-hover:bg-slate-50'
              const numericClass = (invalid: boolean, missing: boolean) => `min-h-8 w-full min-w-0 rounded-sm border px-1.5 text-right text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700 ${invalid ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'} ${missing ? 'bg-amber-50' : ''}`

              return (
                <tr
                  key={item.id}
                  data-master-data-row-id={item.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(item.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, item.id) }}
                  className={`group h-10 ${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 w-12 px-1.5 py-0.5 text-center font-mono font-normal text-slate-600 ${rowMarkerBackground}`}>
                    <button
                      type="button"
                      aria-label={`Select BOM row ${rowNumber}`}
                      aria-pressed={isSelected}
                      onMouseDown={event => startDrag(item.id, event)}
                      onClick={event => { if (event.detail === 0) toggleRow(item.id) }}
                      className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                    >
                      {rowNumber}
                    </button>
                  </th>
                  <td className={`px-2 py-0.5 font-sans text-slate-800 ${identityWarning && showWarningHighlights ? 'bg-amber-50' : ''}`}>
                    <div className="min-w-0">
                      {isEditMode ? (
                        <input
                          value={item.description}
                          placeholder={placeholderNumber === undefined ? undefined : String(placeholderNumber)}
                          onChange={event => applyCellUpdate(item.id, { description: event.target.value })}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="description"
                          aria-label={`Name for BOM row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-8 w-full min-w-0 rounded-sm border px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityWarning && showWarningHighlights ? 'border-amber-600 bg-amber-50' : 'border-slate-300 bg-white'} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      ) : item.description || <span className={showWarningHighlights ? 'text-amber-700' : 'text-slate-700'}>{placeholderNumber ?? '—'}</span>}
                    </div>
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${consumptionInvalid ? 'bg-amber-50 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(item.consumption)}
                          onChange={event => applyCellUpdate(item.id, { consumption: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="consumption"
                          aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={consumptionInvalid}
                          className={`${numericClass(consumptionInvalid, consumptionMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {consumptionMissing && <span aria-label="Missing required value" title="Missing required value" className="shrink-0 text-[11px] font-bold text-rose-600">*</span>}
                      </div>
                    ) : <>{displayNumber(item.consumption)}{consumptionMissing && <span aria-label="Missing required value" title="Missing required value" className="ml-1 text-[11px] font-bold text-rose-600">*</span>}</>}
                  </td>
                  <td className="px-2 py-0.5 text-center font-mono">
                    {isEditMode ? (
                      <input
                        value={item.unit}
                        onChange={event => applyCellUpdate(item.id, { unit: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="unit"
                        aria-label={`Unit for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={!item.unit.trim()}
                        className={`min-h-8 w-20 rounded-sm border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${!item.unit.trim() ? 'border-amber-600' : 'border-slate-300'} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : item.unit || <span className="text-amber-700">—</span>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${priceInvalid ? 'bg-amber-50 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(item.price)}
                          onChange={event => applyCellUpdate(item.id, { price: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="price"
                          aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={priceInvalid}
                          className={`${numericClass(priceInvalid, priceMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {priceMissing && <span aria-label="Missing required value" title="Missing required value" className="shrink-0 text-[11px] font-bold text-rose-600">*</span>}
                      </div>
                    ) : <>{displayNumber(item.price, 2)}{priceMissing && <span aria-label="Missing required value" title="Missing required value" className="ml-1 text-[11px] font-bold text-rose-600">*</span>}</>}
                  </td>
                  <td className={`px-2 py-0.5 text-right font-mono tabular-nums ${lossInvalid ? 'bg-amber-50 text-amber-900' : ''}`}>
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.loss === null ? '' : String(item.loss * 100)}
                          onChange={event => {
                            const value = event.target.value.trim()
                            applyCellUpdate(item.id, { loss: value === '' ? null : Number(value) / 100 })
                          }}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="loss"
                          aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={lossInvalid}
                          className={`${numericClass(lossInvalid, lossMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        <span className="text-slate-400">%</span>
                        {lossMissing && <span aria-label="Missing required value" title="Missing required value" className="shrink-0 text-[11px] font-bold text-rose-600">*</span>}
                      </div>
                    ) : <>{item.loss === null ? <span className="text-amber-700">—</span> : formatPercent(item.loss, 2)}{lossMissing && <span aria-label="Missing required value" title="Missing required value" className="ml-1 text-[11px] font-bold text-rose-600">*</span>}</>}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={item.note || ''}
                        onChange={event => applyCellUpdate(item.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={item.id}
                        data-grid-field="note"
                        aria-label={`Note for ${item.description || `BOM row ${rowNumber}`}`}
                        className={`min-h-8 w-full min-w-0 rounded-sm border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-700 ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : item.note || '—'}
                  </td>
                  <td className={`px-1 py-0.5 text-center ${rowMarkerBackground}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => handleDeleteRow(item.id)}
                        aria-label={`Delete BOM row ${rowNumber}`}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                        title={isEditMode ? (selectedIds.has(item.id) && selectedIds.size > 1 ? `Delete ${selectedIds.size} selected rows` : 'Delete row') : 'Switch to Edit to delete rows'}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={!isEditMode}
                        draggable={isEditMode}
                        onDragStart={event => handleDragStart(event, item.id)}
                        aria-label={`Reorder BOM row ${rowNumber}`}
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
            {filteredBOM.length === 0 && (
              <tr>
                <td colSpan={8} className="p-0 text-center font-sans text-slate-500">
                  {bom.length === 0 && isEditMode ? (
                    <button type="button" onClick={onAddBOMItem} className="min-h-10 w-full px-3 text-xs text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Click to add first row</button>
                  ) : (
                    <div role="status" className="min-h-10 px-3 py-3 text-xs text-slate-500">{bom.length === 0 ? 'No rows yet.' : 'No rows match your search.'}</div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MasterDataTableFooter rowCount={bom.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} />
    </section>
  )
}
