import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { SnapshotBOMItem, formatNumber } from '../../../core'
import { getMasterDataNumericInputDomain } from '../../../core/utils/master-data-validation'
import { useDragSelect } from '../hooks/useDragSelect'
import { useIdentityEditorDrafts } from '../hooks/useIdentityEditorDrafts'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, editableIdentityPlaceholder, editableIdentityValue, hasInvalidNumber, parsePercentage } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'
import type { MasterDataBlockerItem, MasterDataWarningItem } from '../prepare-dataset'
import { MasterDataTableHeader } from './MasterDataTableChrome'
import { MasterDataBlockerMarker } from './MasterDataBlockerMarker'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { NumericInput } from '../../../shared/ui/NumericInput'
import { masterDataActionsColumnClass, masterDataCellFocusClass, masterDataDisplaySlotClass, masterDataIdentityColumnClass, masterDataIndexColumnClass, masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataIssuePlaceholderClass, masterDataNoteColumnClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataPercentageShellClass, masterDataSpreadsheetSelectionClass, masterDataTableClass, masterDataTextEditorClass, masterDataUnitColumnClass } from './master-data-field-styles'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
  isEditMode?: boolean
  historyScope: string
  selectionOwnerScopeKey: string
  activeSelectionOwnerKey: string | null
  onCellInteraction: (field: string) => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  showWarningHighlights?: boolean
  warningCount: number
  warningItems: MasterDataWarningItem[]
  blockerItems: MasterDataBlockerItem[]
  onNavigateWarning: (item: MasterDataWarningItem) => void
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

const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const displayNumber = (value: number | null, digits = 2): string => value === null ? '—' : formatNumber(value, digits)

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  isEditMode = false,
  historyScope,
  selectionOwnerScopeKey,
  activeSelectionOwnerKey,
  onCellInteraction,
  searchQuery = '',
  onSearchQueryChange = () => undefined,
  showWarningHighlights = true,
  warningCount,
  warningItems,
  blockerItems,
  onNavigateWarning,
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
  const cellSelectionRowIds = useMemo(() => bom.map(item => item.id), [bom])
  const warningIndexRef = useRef(0)
  const blockerIndexRef = useRef(0)
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateNameIds = useMemo(() => duplicateIdentityIds(bom, item => item.id, item => item.description), [bom])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(bom, item => item.description), [bom])
  const getIdentityEditorValue = useCallback((item: SnapshotBOMItem) => editableIdentityValue(item.description, item.isGeneratedBusinessIdentity), [])
  const identityEditorDrafts = useIdentityEditorDrafts(bom, historyScope, getIdentityEditorValue)

  const filteredBOM = useMemo(() => bom.filter(item =>
    [item.description, item.consumption, item.unit, item.price, item.loss, item.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [bom, query])

  const {
    selectedIds,
    setSelectedIds,
    toggleAll,
    startDrag,
    handleRowClick,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredBOM,
    getItemId: item => item.id,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  useEffect(() => {
    warningIndexRef.current = 0
    blockerIndexRef.current = 0
  }, [historyScope, warningItems, blockerItems])

  const {
    applyCellUpdate,
    applyPasteUpdates,
    applyCutUpdates
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
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'description').map(cell => cell.rowId))
  }, [applyPasteUpdates, identityEditorDrafts.clearValues])

  const handleCutCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotBOMItem> | null = null
      if (cell.field === 'description') changes = { description: '' }
      else if (cell.field === 'consumption') changes = { consumption: null }
      else if (cell.field === 'unit') changes = { unit: '' }
      else if (cell.field === 'price') changes = { price: null }
      else if (cell.field === 'loss') changes = { loss: null }
      else if (cell.field === 'note') changes = { note: '' }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyCutUpdates(updates)
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'description').map(cell => cell.rowId))
  }, [applyCutUpdates, identityEditorDrafts.clearValues])

  const handleUndo = useCallback(() => {
    identityEditorDrafts.clearValues()
    onUndo()
  }, [identityEditorDrafts.clearValues, onUndo])
  const handleRedo = useCallback(() => {
    identityEditorDrafts.clearValues()
    onRedo()
  }, [identityEditorDrafts.clearValues, onRedo])

  const { selectedCellKeys, focusedCellKey } = useTableKeyboardNav({
    tableRef,
    isEditMode,
    selectionScopeKey: historyScope,
    selectionOwnerScopeKey,
    activeSelectionOwnerKey,
    onCellInteraction,
    rowIds: cellSelectionRowIds,
    onPasteCells: handlePasteCells,
    onCutCells: handleCutCells,
    onUndo: handleUndo,
    onRedo: handleRedo
  })
  const focusedCellRowId = focusedCellKey?.slice(0, focusedCellKey.indexOf('\u001f'))
  const focusedCellIsVisible = filteredBOM.some(item => item.id === focusedCellRowId)
  const viewCellTabIndex = (rowId: string, field: string) => {
    const key = tableCellKey(rowId, field)
    if (focusedCellKey === key) return 0
    if (focusedCellIsVisible) return -1
    return rowId === filteredBOM[0]?.id && field === 'description' ? 0 : -1
  }

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

  const handleNextWarning = () => {
    if (warningItems.length === 0) return
    const target = warningItems[warningIndexRef.current % warningItems.length]
    warningIndexRef.current = (warningIndexRef.current + 1) % warningItems.length
    onNavigateWarning(target)
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
      <MasterDataTableHeader title="Bill of Materials" rowCount={bom.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} isEditMode={isEditMode} onNextWarning={handleNextWarning} onNextBlocker={handleNextBlocker} onAddRow={onAddBOMItem} />

      <div className="overflow-x-auto">
        <table ref={tableRef} className={masterDataTableClass}>
          <colgroup>
            <col className={masterDataIndexColumnClass} /><col className={masterDataIdentityColumnClass} /><col /><col className={masterDataUnitColumnClass} />
            <col /><col /><col className={masterDataNoteColumnClass} /><col className={masterDataActionsColumnClass} />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className={`sticky left-0 z-40 ${masterDataIndexColumnClass} bg-slate-100 p-0 text-center`}>
                <Tooltip label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible rows'} wrapperClassName="relative flex h-9 w-full items-center justify-center">
                  <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredBOM.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear visible selection for BOM rows' : 'Select all visible BOM rows'} className={`grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'border border-slate-800 bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}>#</button>
                </Tooltip>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Material</th>
              <th scope="col" className="px-2 py-2 text-center">Usage</th>
              <th scope="col" className="px-2 py-2 text-center">Unit</th>
              <th scope="col" className="px-2 py-2 text-center">Price</th>
              <th scope="col" className="px-2 py-2 text-center">Loss</th>
              <th scope="col" className="px-2 py-2 text-left">Note</th>
              <th scope="col" className={`${masterDataActionsColumnClass} px-1 py-2 text-center`}>Actions</th>
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
              const deleteSelectedGroup = selectedIds.has(item.id) && selectedIds.size > 1
              const deleteTooltip = !isEditMode ? 'Switch to Edit to delete rows' : deleteSelectedGroup ? 'Delete selected rows' : 'Delete row'
              const reorderSelectedGroup = isSelected && selectedIds.size > 1
              const reorderTooltip = !isEditMode ? 'Reordering is available in Edit' : reorderSelectedGroup ? 'Drag selected rows to reorder' : 'Drag to reorder'
              const numericClass = (invalid: boolean, blocker: boolean) => `${masterDataNumericEditorClass} ${showWarningHighlights && (blocker || invalid) ? masterDataIssueEditorClass : ''}`

              return (
                <tr
                  key={item.id}
                  data-master-data-row-id={item.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(item.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, item.id) }}
                  className={`group h-10 transition-colors ${isSelected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 ${masterDataIndexColumnClass} bg-transparent px-1.5 py-0.5 text-center font-mono font-normal text-slate-600`}>
                    <Tooltip label={isSelected ? 'Deselect row' : 'Select row'}>
                      <button
                        type="button"
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(item.id, event)}
                        onClick={event => handleRowClick(item.id, event)}
                        className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                      >
                        {rowNumber}
                      </button>
                    </Tooltip>
                  </th>
                  <td className="px-2 py-0.5 font-sans text-slate-800">
                    <div className="min-w-0">
                      {isEditMode ? (
                        <input
                          value={identityEditorDrafts.getValue(item)}
                          placeholder={editableIdentityPlaceholder(editableIdentityValue(item.description, item.isGeneratedBusinessIdentity), item.isGeneratedBusinessIdentity ? item.description : placeholderNumber === undefined ? '' : `Material ${placeholderNumber}`)}
                          onChange={event => {
                            identityEditorDrafts.setValue(item.id, event.target.value)
                            applyCellUpdate(item.id, { description: event.target.value })
                          }}
                          onBlur={() => identityEditorDrafts.clearValue(item.id)}
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="description"
                          aria-label={`Name for BOM row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`${masterDataTextEditorClass} ${identityWarning && showWarningHighlights ? `${masterDataIssueEditorClass} ${masterDataIssuePlaceholderClass}` : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                      ) : (
                        <div data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="description" tabIndex={viewCellTabIndex(item.id, 'description')} aria-label={`Material identity for BOM row ${rowNumber}`} className={`${masterDataDisplaySlotClass} ${identityWarning && showWarningHighlights ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? masterDataSpreadsheetSelectionClass : ''}`}>
                          {item.description || <span className="text-slate-500">{placeholderNumber === undefined ? '—' : `Material ${placeholderNumber}`}</span>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-20">
                        <NumericInput
                          value={item.consumption}
                          onValueChange={value => applyCellUpdate(item.id, { consumption: value })}
                          {...getMasterDataNumericInputDomain('consumption')}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="consumption"
                          aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={consumptionInvalid}
                          className={`${numericClass(consumptionInvalid, consumptionMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {consumptionMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="consumption" tabIndex={viewCellTabIndex(item.id, 'consumption')} aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`} className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-20 ${showWarningHighlights && (consumptionMissing || consumptionInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? masterDataSpreadsheetSelectionClass : ''}`}>{displayNumber(item.consumption)}{consumptionMissing && <MasterDataBlockerMarker />}</span>}
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
                        className={`mx-auto block max-w-20 ${masterDataTextEditorClass} px-1 text-center ${showWarningHighlights && !item.unit.trim() ? masterDataIssueEditorClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <span
                      data-grid-cell="true"
                      data-grid-row-id={item.id}
                      data-grid-field="unit"
                      tabIndex={viewCellTabIndex(item.id, 'unit')}
                      aria-label={`Unit for ${item.description || `BOM row ${rowNumber}`}`}
                      className={`mx-auto inline-flex h-8 w-full max-w-20 items-center justify-center rounded-sm border border-transparent px-1 text-center text-xs ${masterDataCellFocusClass} ${showWarningHighlights && !item.unit.trim() ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    >{item.unit || <span className="text-amber-700">—</span>}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-24">
                        <NumericInput
                          value={item.price}
                          onValueChange={value => applyCellUpdate(item.id, { price: value })}
                          {...getMasterDataNumericInputDomain('price')}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="price"
                          aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={priceInvalid}
                          className={`${numericClass(priceInvalid, priceMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {priceMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="price" tabIndex={viewCellTabIndex(item.id, 'price')} aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`} className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-24 ${showWarningHighlights && (priceMissing || priceInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? masterDataSpreadsheetSelectionClass : ''}`}>{displayNumber(item.price, 2)}{priceMissing && <MasterDataBlockerMarker />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className={masterDataPercentageShellClass}>
                        <div className="relative flex h-8 min-w-0 flex-1 items-center">
                          <NumericInput
                            value={item.loss === null ? null : item.loss * 100}
                            onValueChange={value => applyCellUpdate(item.id, { loss: value === null ? null : value / 100 })}
                          {...getMasterDataNumericInputDomain('loss', true)}
                            reserveMarker
                            data-grid-cell="true"
                            data-grid-row-id={item.id}
                            data-grid-field="loss"
                            aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                            aria-invalid={lossInvalid}
                            className={`${numericClass(lossInvalid, lossMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? masterDataSpreadsheetSelectionClass : ''}`}
                          />
                          {lossMissing && <MasterDataBlockerMarker />}
                        </div>
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    ) : (
                      <div className={masterDataPercentageShellClass}>
                        <span data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="loss" tabIndex={viewCellTabIndex(item.id, 'loss')} aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`} className={`${masterDataNumericDisplaySlotClass} flex-1 ${showWarningHighlights && (lossMissing || lossInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? masterDataSpreadsheetSelectionClass : ''}`}>
                          {item.loss === null ? '—' : formatNumber(item.loss * 100, 2)}
                          {lossMissing && <MasterDataBlockerMarker />}
                        </span>
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    )}
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
                        className={`${masterDataTextEditorClass} ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <div data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="note" tabIndex={viewCellTabIndex(item.id, 'note')} aria-label={`Note for ${item.description || `BOM row ${rowNumber}`}`} className={`${masterDataDisplaySlotClass} ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}>{item.note || '—'}</div>}
                  </td>
                  <td className={`${masterDataActionsColumnClass} px-1 py-0.5 text-center`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip label={deleteTooltip}>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleDeleteRow(item.id)}
                          aria-label={!isEditMode ? deleteTooltip : deleteSelectedGroup ? 'Delete selected BOM rows' : `Delete BOM row ${rowNumber}`}
                          className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>
                      <Tooltip label={reorderTooltip}>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          draggable={isEditMode}
                          onDragStart={event => handleDragStart(event, item.id)}
                          aria-label={!isEditMode ? reorderTooltip : reorderSelectedGroup ? 'Drag selected BOM rows to reorder' : `Drag BOM row ${rowNumber} to reorder`}
                          className={`inline-flex h-8 w-7 cursor-grab items-center justify-center ${isSelected ? 'text-slate-700' : 'text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 group-hover:text-slate-600 group-focus-within:text-slate-700`}
                        >
                          <GripVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </Tooltip>
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
    </section>
  )
}
