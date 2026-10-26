import { useMasterDataDirectEdit } from '../direct-edit-presentation'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import type { SnapshotBOMItem } from '../../../core'
import { getMasterDataNumericInputDomain } from '../../../core/utils/master-data-validation'
import { useDragSelect } from '../hooks/useDragSelect'
import { getRowSelectionState } from '../../../shared/selection/row-drag-selection'
import { useIdentityEditorDrafts } from '../hooks/useIdentityEditorDrafts'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, editableIdentityPlaceholder, editableIdentityValue, hasInvalidNumber, parsePercentage } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'
import { useQualityNavigationCursor } from '../hooks/useQualityNavigationCursor'
import type { MasterDataBlockerItem, MasterDataWarningItem } from '../prepare-dataset'
import { MasterDataTableHeader } from './MasterDataTableChrome'
import { MasterDataBlockerMarker } from './MasterDataBlockerMarker'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { RowSelectionButton } from '../../../shared/ui/RowSelectionButton'
import { MasterDataFocusedNumber, MasterDataNumericInput, MasterDataNumericColumnHeader, masterDataSelectedValueId } from './MasterDataNumericValue'
import { StickyTableHeader, useSynchronizedTableHeader } from '../../../shared/ui/StickyTableHeader'
import { masterDataActionsColumnClass, masterDataCellFocusClass, masterDataDisplaySlotClass, masterDataIdentityColumnClass, masterDataIndexColumnClass, masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataIssuePlaceholderClass, masterDataNoteColumnClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataPercentageShellClass, masterDataSpreadsheetSelectionClass, masterDataTableClass, masterDataTextEditorClass, masterDataUnitColumnClass } from './master-data-field-styles'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
  isEditMode?: boolean
  historyScope: string
  selectionDatasetId?: string
  navigationScopeKey: string
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
export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  isEditMode = false,
  historyScope,
  selectionDatasetId = '',
  navigationScopeKey,
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
  const directEditPending = useMasterDataDirectEdit()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(() => new Set())
  const reorderDragRef = useRef<{ movingIds: string[] } | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)
  const valueSourceId = (recordId: string, field: string) => masterDataSelectedValueId(historyScope, selectionDatasetId, 'bom', recordId, field)
  const { headerViewportRef, syncHeaderScroll } = useSynchronizedTableHeader()
  const cellSelectionRowIds = useMemo(() => bom.map(item => item.id), [bom])
  const nextWarningItem = useQualityNavigationCursor<MasterDataWarningItem>(navigationScopeKey)
  const nextBlockerItem = useQualityNavigationCursor<MasterDataBlockerItem>(navigationScopeKey)
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
      const exactField = ['consumption', 'price', 'loss'].includes(cell.field) ? cell.field : null
      const exactText = exactField && cell.value.trim() !== ''
        ? cell.field === 'loss' ? cell.value.trim().replace(/%$/, '').trim() : cell.value.trim()
        : null
      return changes ? [{ id: cell.rowId, changes, ...(exactField ? { exactDecimalUpdates: { [exactField]: exactText } } : {}) }] : []
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
      const exactField = ['consumption', 'price', 'loss'].includes(cell.field) ? cell.field : null
      return changes ? [{ id: cell.rowId, changes, ...(exactField ? { exactDecimalUpdates: { [exactField]: null } } : {}) }] : []
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
    const target = nextBlockerItem(blockerItems)
    if (!target) return
    onNavigateBlocker(target)
  }

  const handleNextWarning = () => {
    const target = nextWarningItem(warningItems)
    if (!target) return
    onNavigateWarning(target)
  }

  const selectionState = getRowSelectionState(selectedIds, filteredBOM.map(item => item.id))

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, id: string) => {
    const movingIds = selectedIds.has(id) ? [...selectedIds] : [id]
    reorderDragRef.current = { movingIds }
    setDraggingIds(new Set(movingIds))
    setDropTarget(null)
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.setData('application/x-costbreakdown-row-ids', JSON.stringify(movingIds))
    event.dataTransfer.effectAllowed = 'move'
  }

  const finishReorder = () => {
    reorderDragRef.current = null
    setDraggingIds(new Set())
    setDropTarget(null)
  }

  const getDropPosition = (event: React.DragEvent<HTMLTableRowElement>): 'before' | 'after' => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before'
  }

  const previewRowDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    const drag = reorderDragRef.current
    if (!drag) return
    if (drag.movingIds.includes(targetId)) {
      setDropTarget(null)
      return
    }
    event.dataTransfer.dropEffect = 'move'
    const position = getDropPosition(event)
    setDropTarget(current => current?.id === targetId && current.position === position ? current : { id: targetId, position })
  }

  const handleRowDragLeave = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
    setDropTarget(current => current?.id === targetId ? null : current)
  }

  const handleRowDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    event.preventDefault()
    const movingId = event.dataTransfer.getData('text/plain')
    if (!movingId || movingId === targetId) {
      finishReorder()
      return
    }
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
    if (movingIds.includes(targetId)) {
      finishReorder()
      return
    }
    onReorderRows(movingId, targetId, getDropPosition(event), movingIds)
    finishReorder()
  }

  return (
    <section aria-label="Bill of Materials rows" className="border border-slate-300 bg-white select-none">
      <MasterDataTableHeader title="Bill of Materials" rowCount={bom.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} isEditMode={isEditMode} onNextWarning={handleNextWarning} onNextBlocker={handleNextBlocker} onAddRow={onAddBOMItem} />

      <StickyTableHeader
        ariaLabel="Bill of Materials column header controls"
        tableClassName={masterDataTableClass}
        headerViewportRef={headerViewportRef}
        top="var(--master-data-table-header-top, 0px)"
        backgroundClassName="bg-slate-100"
      >
        <colgroup>
          <col className={masterDataIndexColumnClass} /><col className={masterDataIdentityColumnClass} /><col /><col className={masterDataUnitColumnClass} />
          <col /><col /><col className={masterDataNoteColumnClass} /><col className={masterDataActionsColumnClass} />
        </colgroup>
        <thead className="border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
          <tr>
            <th scope="col" className={`sticky left-0 z-40 ${masterDataIndexColumnClass} bg-slate-100 p-0 text-center`}>
              <Tooltip label={selectionState === 'all' ? 'Clear visible selection' : 'Select all visible rows'} wrapperClassName="relative flex h-9 w-full items-center justify-center">
                <RowSelectionButton size={32} variant="light" state={selectionState} onClick={() => toggleAll(selectionState !== 'all')} disabled={filteredBOM.length === 0} label={selectionState === 'all' ? 'Clear visible selection for BOM rows' : 'Select all visible BOM rows'} />
              </Tooltip>
            </th>
            <th scope="col" className="px-2 py-2 text-left">Material</th>
            <th scope="col" className="px-2 py-2"><MasterDataNumericColumnHeader>Usage</MasterDataNumericColumnHeader></th>
            <th scope="col" className="px-2 py-2 text-center">Unit</th>
            <th scope="col" className="px-2 py-2"><MasterDataNumericColumnHeader>Price</MasterDataNumericColumnHeader></th>
            <th scope="col" className="px-2 py-2"><MasterDataNumericColumnHeader percentage>Loss</MasterDataNumericColumnHeader></th>
            <th scope="col" className="px-2 py-2 text-left">Note</th>
            <th scope="col" className={`${masterDataActionsColumnClass} px-1 py-2 text-center`}>Actions</th>
          </tr>
        </thead>
      </StickyTableHeader>

      <div className="overflow-x-auto" onScroll={syncHeaderScroll}>
        <table ref={tableRef} className={masterDataTableClass}>
          <caption className="sr-only">Bill of Materials rows</caption>
          <colgroup>
            <col className={masterDataIndexColumnClass} /><col className={masterDataIdentityColumnClass} /><col /><col className={masterDataUnitColumnClass} />
            <col /><col /><col className={masterDataNoteColumnClass} /><col className={masterDataActionsColumnClass} />
          </colgroup>
          <thead className="sr-only">
            <tr><th scope="col">Select</th><th scope="col">Material</th><th scope="col">Usage</th><th scope="col">Unit</th><th scope="col">Price</th><th scope="col">Loss</th><th scope="col">Note</th><th scope="col">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredBOM.map(item => {
              const isSelected = selectedIds.has(item.id)
              const identityInvalid = !item.description.trim() || duplicateNameIds.has(item.id)
              const identityWarning = Boolean(item.isGeneratedBusinessIdentity || item.autoRenamedFrom || duplicateNameIds.has(item.id))
              const consumptionMissing = item.consumption === null
              const priceMissing = item.price === null
              const lossMissing = item.loss === null
              const consumptionInvalid = hasInvalidNumber('consumption', item.consumption)
              const priceInvalid = hasInvalidNumber('price', item.price)
              const lossInvalid = hasInvalidNumber('loss', item.loss)
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
                  onDragOver={event => {
                    if (isEditMode) {
                      event.preventDefault()
                      previewRowDrop(event, item.id)
                    }
                  }}
                  onDragLeave={event => handleRowDragLeave(event, item.id)}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, item.id) }}
                  style={dropTarget?.id === item.id ? {
                    boxShadow: dropTarget.position === 'before' ? 'inset 0 2px 0 0 #e2e8f0' : 'inset 0 -2px 0 0 #e2e8f0'
                  } : undefined}
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
                        className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-sm p-0 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
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
                          className={`${directEditPending('bom', item.id, 'description') ? '!text-blue-700' : ''} ${masterDataTextEditorClass} ${identityWarning && showWarningHighlights ? `${masterDataIssueEditorClass} ${masterDataIssuePlaceholderClass}` : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                      ) : (
                        <div data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="description" tabIndex={viewCellTabIndex(item.id, 'description')} aria-label={`Material identity for BOM row ${rowNumber}`} className={`${directEditPending('bom', item.id, 'description') ? '!text-blue-700' : ''} ${masterDataDisplaySlotClass} ${identityWarning && showWarningHighlights ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'description')) ? masterDataSpreadsheetSelectionClass : ''}`}>
                          {item.description || <span className="text-slate-500">{placeholderNumber === undefined ? '—' : `Material ${placeholderNumber}`}</span>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative ml-auto w-full max-w-[8.5rem]">
                        <MasterDataNumericInput
                          value={item.consumption}
                          exactValue={item.exactDecimalInputs?.consumption}
                          onValueChange={(value, exactValue) => applyCellUpdate(item.id, { consumption: value }, { field: 'consumption', value: exactValue ?? null })}
                          selectionId={valueSourceId(item.id, 'consumption')}
                          {...getMasterDataNumericInputDomain('consumption')}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="consumption"
                          aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={consumptionMissing || consumptionInvalid}
                          className={`${numericClass(consumptionInvalid, consumptionMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {consumptionMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <MasterDataFocusedNumber
                      value={item.consumption}
                      exactValue={item.exactDecimalInputs?.consumption}
                      selectionId={valueSourceId(item.id, 'consumption')}
                      data-grid-cell="true"
                      data-grid-row-id={item.id}
                      data-grid-field="consumption"
                      tabIndex={viewCellTabIndex(item.id, 'consumption')}
                      aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                      aria-invalid={consumptionMissing || consumptionInvalid}
                      reserveMarker
                      missingMarker={consumptionMissing}
                      className={`${masterDataNumericDisplaySlotClass} ml-auto max-w-[8.5rem] ${showWarningHighlights && (consumptionMissing || consumptionInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'consumption')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    />}
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
                        className={`${directEditPending('bom', item.id, 'unit') ? '!text-blue-700' : ''} mx-auto block max-w-20 ${masterDataTextEditorClass} px-1 text-center ${showWarningHighlights && !item.unit.trim() ? masterDataIssueEditorClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <span
                      data-grid-cell="true"
                      data-grid-row-id={item.id}
                      data-grid-field="unit"
                      tabIndex={viewCellTabIndex(item.id, 'unit')}
                      aria-label={`Unit for ${item.description || `BOM row ${rowNumber}`}`}
                      className={`${directEditPending('bom', item.id, 'unit') ? '!text-blue-700' : ''} mx-auto inline-flex h-8 w-full max-w-20 items-center justify-center rounded-sm border border-transparent px-1 text-center text-xs ${masterDataCellFocusClass} ${showWarningHighlights && !item.unit.trim() ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'unit')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    >{item.unit || <span className="text-amber-700">—</span>}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative ml-auto w-full max-w-[8.5rem]">
                        <MasterDataNumericInput
                          value={item.price}
                          exactValue={item.exactDecimalInputs?.price}
                          onValueChange={(value, exactValue) => applyCellUpdate(item.id, { price: value }, { field: 'price', value: exactValue ?? null })}
                          selectionId={valueSourceId(item.id, 'price')}
                          {...getMasterDataNumericInputDomain('price')}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="price"
                          aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={priceMissing || priceInvalid}
                          className={`${numericClass(priceInvalid, priceMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {priceMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <MasterDataFocusedNumber
                      value={item.price}
                      exactValue={item.exactDecimalInputs?.price}
                      selectionId={valueSourceId(item.id, 'price')}
                      data-grid-cell="true"
                      data-grid-row-id={item.id}
                      data-grid-field="price"
                      tabIndex={viewCellTabIndex(item.id, 'price')}
                      aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                      aria-invalid={priceMissing || priceInvalid}
                      reserveMarker
                      missingMarker={priceMissing}
                      className={`${masterDataNumericDisplaySlotClass} ml-auto max-w-[8.5rem] ${showWarningHighlights && (priceMissing || priceInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'price')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    />}
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className={masterDataPercentageShellClass}>
                        <div className="relative flex h-8 min-w-0 flex-1 items-center">
                          <MasterDataNumericInput
                            value={item.loss === null ? null : item.loss * 100}
                            exactValue={item.exactDecimalInputs?.loss}
                            onValueChange={(value, exactValue) => applyCellUpdate(item.id, { loss: value === null ? null : value / 100 }, { field: 'loss', value: exactValue ?? null })}
                            selectionId={valueSourceId(item.id, 'loss')}
                            percentage
                            {...getMasterDataNumericInputDomain('loss', true)}
                            reserveMarker
                            data-grid-cell="true"
                            data-grid-row-id={item.id}
                            data-grid-field="loss"
                            aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                            aria-invalid={lossMissing || lossInvalid}
                            className={`${numericClass(lossInvalid, lossMissing)} ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? masterDataSpreadsheetSelectionClass : ''}`}
                          />
                          {lossMissing && <MasterDataBlockerMarker />}
                        </div>
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    ) : (
                      <div className={masterDataPercentageShellClass}>
                        <MasterDataFocusedNumber
                          value={item.loss === null ? null : item.loss * 100}
                          exactValue={item.exactDecimalInputs?.loss}
                          selectionId={valueSourceId(item.id, 'loss')}
                          percentage
                          data-grid-cell="true"
                          data-grid-row-id={item.id}
                          data-grid-field="loss"
                          tabIndex={viewCellTabIndex(item.id, 'loss')}
                          aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={lossMissing || lossInvalid}
                          reserveMarker
                          missingMarker={lossMissing}
                          className={`${masterDataNumericDisplaySlotClass} w-0 flex-1 ${showWarningHighlights && (lossMissing || lossInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(item.id, 'loss')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
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
                        className={`${directEditPending('bom', item.id, 'note') ? '!text-blue-700' : ''} ${masterDataTextEditorClass} ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <div data-grid-cell="true" data-grid-row-id={item.id} data-grid-field="note" tabIndex={viewCellTabIndex(item.id, 'note')} aria-label={`Note for ${item.description || `BOM row ${rowNumber}`}`} className={`${directEditPending('bom', item.id, 'note') ? '!text-blue-700' : ''} ${masterDataDisplaySlotClass} ${selectedCellKeys.has(tableCellKey(item.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}>{item.note || '—'}</div>}
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
                          onDragEnd={finishReorder}
                          aria-label={!isEditMode ? reorderTooltip : reorderSelectedGroup ? 'Drag selected BOM rows to reorder' : `Drag BOM row ${rowNumber} to reorder`}
                          className={`inline-flex h-8 w-7 items-center justify-center ${draggingIds.has(item.id) ? 'cursor-grabbing text-slate-700' : 'cursor-grab text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400`}
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
