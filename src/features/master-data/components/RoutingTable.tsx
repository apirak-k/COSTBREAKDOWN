import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
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
import { MasterDataFocusedNumber, MasterDataNumericInput, masterDataSelectedValueId } from './MasterDataNumericValue'
import { StickyTableHeader, useSynchronizedTableHeader } from '../../../shared/ui/StickyTableHeader'
import { masterDataActionsColumnClass, masterDataDisplaySlotClass, masterDataIdentityColumnClass, masterDataIndexColumnClass, masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataIssuePlaceholderClass, masterDataNoteColumnClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataPercentageShellClass, masterDataSpreadsheetSelectionClass, masterDataTableClass, masterDataTextEditorClass } from './master-data-field-styles'

interface RoutingTableProps {
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
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
  onAddRoutingStep: () => void
  onUpdateRoutingSteps: (updates: Array<{ id: string; changes: Partial<Omit<SnapshotRoutingStep, 'id' | 'confidence'>> }>) => void
  onDeleteRoutingSteps: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
  onWarningNavigationHandled: (requestId: number) => void
}

const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const RoutingTable: React.FC<RoutingTableProps> = ({
  routing,
  rates,
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
  onAddRoutingStep,
  onUpdateRoutingSteps,
  onDeleteRoutingSteps,
  onReorderRows,
  warningNavigationTarget,
  onWarningNavigationHandled
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(() => new Set())
  const reorderDragRef = useRef<{ movingIds: string[] } | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)
  const valueSourceId = (recordId: string, field: string) => masterDataSelectedValueId(historyScope, selectionDatasetId, 'routing', recordId, field)
  const { headerViewportRef, syncHeaderScroll } = useSynchronizedTableHeader()
  const nextWarningItem = useQualityNavigationCursor<MasterDataWarningItem>(navigationScopeKey)
  const nextBlockerItem = useQualityNavigationCursor<MasterDataBlockerItem>(navigationScopeKey)
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateProcessIds = useMemo(() => duplicateIdentityIds(routing, step => step.id, step => step.processName), [routing])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(routing, step => step.processName), [routing])
  const getIdentityEditorValue = useCallback((step: SnapshotRoutingStep) => editableIdentityValue(step.processName, step.isGeneratedBusinessIdentity), [])
  const identityEditorDrafts = useIdentityEditorDrafts(routing, historyScope, getIdentityEditorValue)
  const knownWorkCenters = useMemo(() => new Set(
    rates.map(rate => rate.workCenterCode.trim().toLocaleLowerCase()).filter(Boolean)
  ), [rates])

  const filteredRouting = useMemo(() => routing.filter(step =>
    [step.processName, step.workCenterId, step.manning, step.capacity, step.yield, step.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [routing, query])
  const cellSelectionRowIds = useMemo(() => routing.map(step => step.id), [routing])

  const {
    selectedIds,
    setSelectedIds,
    toggleAll,
    startDrag,
    handleRowClick,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRouting,
    getItemId: step => step.id,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  const {
    applyCellUpdate,
    applyPasteUpdates,
    applyCutUpdates
  } = useSpreadsheetEditing({
    rows: routing,
    selectedIds,
    isEditMode,
    onUpdateBatch: onUpdateRoutingSteps
  })

  const handlePasteCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotRoutingStep> | null = null
      if (cell.field === 'processName') changes = { processName: cell.value }
      else if (cell.field === 'workCenterId') changes = { workCenterId: cell.value || undefined }
      else if (cell.field === 'manning') changes = { manning: parseNumber(cell.value) }
      else if (cell.field === 'capacity') changes = { capacity: parseNumber(cell.value) }
      else if (cell.field === 'yield') changes = { yield: parsePercentage(cell.value) }
      else if (cell.field === 'note') changes = { note: cell.value }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyPasteUpdates(updates)
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'processName').map(cell => cell.rowId))
  }, [applyPasteUpdates, identityEditorDrafts.clearValues])

  const handleCutCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotRoutingStep> | null = null
      if (cell.field === 'processName') changes = { processName: '' }
      else if (cell.field === 'workCenterId') changes = { workCenterId: undefined }
      else if (cell.field === 'manning') changes = { manning: null }
      else if (cell.field === 'capacity') changes = { capacity: null }
      else if (cell.field === 'yield') changes = { yield: null }
      else if (cell.field === 'note') changes = { note: '' }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyCutUpdates(updates)
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'processName').map(cell => cell.rowId))
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
  const focusedCellIsVisible = filteredRouting.some(step => step.id === focusedCellRowId)
  const viewCellTabIndex = (rowId: string, field: string) => {
    const key = tableCellKey(rowId, field)
    if (focusedCellKey === key) return 0
    if (focusedCellIsVisible) return -1
    return rowId === filteredRouting[0]?.id && field === 'processName' ? 0 : -1
  }

  const handleDeleteRow = (id: string) => {
    const idsToDelete = selectedIds.has(id) ? [...selectedIds] : [id]
    onDeleteRoutingSteps(idsToDelete)
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

  const selectionState = getRowSelectionState(selectedIds, filteredRouting.map(step => step.id))

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
    <section aria-label="Routing rows" className="border border-slate-300 bg-white select-none">
      <MasterDataTableHeader title="Routing" rowCount={routing.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} isEditMode={isEditMode} onNextWarning={handleNextWarning} onNextBlocker={handleNextBlocker} onAddRow={onAddRoutingStep} />

      <StickyTableHeader
        ariaLabel="Routing column header controls"
        tableClassName={masterDataTableClass}
        headerViewportRef={headerViewportRef}
        top="var(--master-data-table-header-top, 0px)"
        backgroundClassName="bg-slate-100"
      >
        <colgroup>
          <col className={masterDataIndexColumnClass} /><col className={masterDataIdentityColumnClass} /><col className={masterDataIdentityColumnClass} />
          <col /><col /><col /><col className={masterDataNoteColumnClass} /><col className={masterDataActionsColumnClass} />
        </colgroup>
        <thead className="border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
          <tr>
            <th scope="col" className={`sticky left-0 z-40 ${masterDataIndexColumnClass} bg-slate-100 p-0 text-center`}>
              <Tooltip label={selectionState === 'all' ? 'Clear visible selection' : 'Select all visible rows'} wrapperClassName="relative flex h-9 w-full items-center justify-center">
                <RowSelectionButton variant="light" state={selectionState} onClick={() => toggleAll(selectionState !== 'all')} disabled={filteredRouting.length === 0} label={selectionState === 'all' ? 'Clear visible selection for Routing rows' : 'Select all visible Routing rows'} />
              </Tooltip>
            </th>
            <th scope="col" className="px-2 py-2 text-left">Process</th>
            <th scope="col" className="px-2 py-2 text-left">Work Center</th>
            <th scope="col" className="py-2 pr-8 pl-2 text-right">Manning</th>
            <th scope="col" className="py-2 pr-8 pl-2 text-right">Capacity</th>
            <th scope="col" className="py-2 pr-12 pl-2 text-right">Yield</th>
            <th scope="col" className="px-2 py-2 text-left">Note</th>
            <th scope="col" className={`${masterDataActionsColumnClass} px-1 py-2 text-center`}>Actions</th>
          </tr>
        </thead>
      </StickyTableHeader>

      <div className="overflow-x-auto" onScroll={syncHeaderScroll}>
        <table ref={tableRef} className={masterDataTableClass}>
          <caption className="sr-only">Routing rows</caption>
          <colgroup>
            <col className={masterDataIndexColumnClass} /><col className={masterDataIdentityColumnClass} /><col className={masterDataIdentityColumnClass} />
            <col /><col /><col /><col className={masterDataNoteColumnClass} /><col className={masterDataActionsColumnClass} />
          </colgroup>
          <thead className="sr-only">
            <tr><th scope="col">Select</th><th scope="col">Process</th><th scope="col">Work Center</th><th scope="col">Manning</th><th scope="col">Capacity</th><th scope="col">Yield</th><th scope="col">Note</th><th scope="col">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              const identityInvalid = !step.processName.trim() || duplicateProcessIds.has(step.id)
              const identityWarning = Boolean(step.isGeneratedBusinessIdentity || step.autoRenamedFrom || duplicateProcessIds.has(step.id))
              const workCenterInvalid = !step.workCenterId?.trim() || !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase())
              const manningMissing = step.manning === null
              const capacityMissing = step.capacity === null
              const yieldMissing = step.yield === null
              const manningInvalid = hasInvalidNumber('manning', step.manning)
              const capacityInvalid = hasInvalidNumber('capacity', step.capacity)
              const yieldInvalid = hasInvalidNumber('yield', step.yield)
              const rowNumber = routing.findIndex(row => row.id === step.id) + 1
              const placeholderNumber = placeholderNumbers.get(step.id)
              const deleteSelectedGroup = selectedIds.has(step.id) && selectedIds.size > 1
              const deleteTooltip = !isEditMode ? 'Switch to Edit to delete rows' : deleteSelectedGroup ? 'Delete selected rows' : 'Delete row'
              const reorderSelectedGroup = isSelected && selectedIds.size > 1
              const reorderTooltip = !isEditMode ? 'Reordering is available in Edit' : reorderSelectedGroup ? 'Drag selected rows to reorder' : 'Drag to reorder'
              const numericClass = (invalid: boolean, blocker: boolean) => `${masterDataNumericEditorClass} ${showWarningHighlights && (blocker || invalid) ? masterDataIssueEditorClass : ''}`

              return (
                <tr
                  key={step.id}
                  data-master-data-row-id={step.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  onDragOver={event => {
                    if (isEditMode) {
                      event.preventDefault()
                      previewRowDrop(event, step.id)
                    }
                  }}
                  onDragLeave={event => handleRowDragLeave(event, step.id)}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, step.id) }}
                  style={dropTarget?.id === step.id ? {
                    boxShadow: dropTarget.position === 'before' ? 'inset 0 2px 0 0 #3b82f6' : 'inset 0 -2px 0 0 #3b82f6'
                  } : undefined}
                  className={`group h-10 transition-colors ${isSelected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 ${masterDataIndexColumnClass} bg-transparent px-1.5 py-0.5 text-center font-mono font-normal text-slate-600`}>
                    <Tooltip label={isSelected ? 'Deselect row' : 'Select row'}>
                      <button
                        type="button"
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(step.id, event)}
                        onClick={event => handleRowClick(step.id, event)}
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
                          value={identityEditorDrafts.getValue(step)}
                          placeholder={editableIdentityPlaceholder(editableIdentityValue(step.processName, step.isGeneratedBusinessIdentity), step.isGeneratedBusinessIdentity ? step.processName : placeholderNumber === undefined ? '' : `Process ${placeholderNumber}`)}
                          onChange={event => {
                            identityEditorDrafts.setValue(step.id, event.target.value)
                            applyCellUpdate(step.id, { processName: event.target.value })
                          }}
                          onBlur={() => identityEditorDrafts.clearValue(step.id)}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="processName"
                          aria-label={`Process for Routing row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`${masterDataTextEditorClass} ${identityWarning && showWarningHighlights ? `${masterDataIssueEditorClass} ${masterDataIssuePlaceholderClass}` : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'processName')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                      ) : <div data-grid-cell="true" data-grid-row-id={step.id} data-grid-field="processName" tabIndex={viewCellTabIndex(step.id, 'processName')} aria-label={`Process identity for Routing row ${rowNumber}`} className={`${masterDataDisplaySlotClass} ${identityWarning && showWarningHighlights ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'processName')) ? masterDataSpreadsheetSelectionClass : ''}`}>{step.processName || <span className="text-slate-500">{placeholderNumber === undefined ? '—' : `Process ${placeholderNumber}`}</span>}</div>}
                    </div>
                  </td>
                  <td className="relative px-2 py-0.5 text-left">
                    {isEditMode ? (
                      <div className="relative w-full min-w-0">
                        <select
                        value={step.workCenterId || ''}
                        onChange={event => applyCellUpdate(step.id, { workCenterId: event.target.value || undefined })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="workCenterId"
                        aria-label={`Work Center for Routing row ${rowNumber}`}
                        aria-invalid={workCenterInvalid}
                        className={`block w-full appearance-none pr-10 text-left ${masterDataTextEditorClass} ${showWarningHighlights && workCenterInvalid ? masterDataIssueEditorClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'workCenterId')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      >
                        <option value="">Select Work Center</option>
                        {step.workCenterId && !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase()) && (
                          <option value={step.workCenterId}>{step.workCenterId} (not in Work Centers table)</option>
                        )}
                        {rates.map(rate => (
                          <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode}</option>
                        ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                        {workCenterInvalid && <MasterDataBlockerMarker label="Missing or unavailable Work Center" />}
                      </div>
                    ) : (
                      <div className="relative flex h-8 w-full items-center justify-start">
                        <span data-grid-cell="true" data-grid-row-id={step.id} data-grid-field="workCenterId" tabIndex={viewCellTabIndex(step.id, 'workCenterId')} aria-label={`Work Center identity for Routing row ${rowNumber}`} className={`${masterDataDisplaySlotClass} truncate ${workCenterInvalid ? 'pr-8' : ''} ${showWarningHighlights && workCenterInvalid ? 'text-amber-900' : ''} ${showWarningHighlights && workCenterInvalid ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'workCenterId')) ? masterDataSpreadsheetSelectionClass : ''}`}>
                          {step.workCenterId || (workCenterInvalid ? 'Unavailable' : '—')}
                        </span>
                        {workCenterInvalid && <MasterDataBlockerMarker label="Missing or unavailable Work Center" />}
                      </div>
                    )}
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative ml-auto w-full max-w-20">
                        <MasterDataNumericInput
                          value={step.manning}
                          onValueChange={value => applyCellUpdate(step.id, { manning: value })}
                          selectionId={valueSourceId(step.id, 'manning')}
                          {...getMasterDataNumericInputDomain('manning')}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="manning"
                          aria-label={`Manning for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={manningMissing || manningInvalid}
                          className={`${numericClass(manningInvalid, manningMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {manningMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <MasterDataFocusedNumber
                      value={step.manning}
                      selectionId={valueSourceId(step.id, 'manning')}
                      data-grid-cell="true"
                      data-grid-row-id={step.id}
                      data-grid-field="manning"
                      tabIndex={viewCellTabIndex(step.id, 'manning')}
                      aria-label={`Manning for ${step.processName || `Routing row ${rowNumber}`}`}
                      aria-invalid={manningMissing || manningInvalid}
                      reserveMarker
                      missingMarker={manningMissing}
                      className={`${masterDataNumericDisplaySlotClass} ml-auto max-w-20 ${showWarningHighlights && (manningMissing || manningInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    />}
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative ml-auto w-full max-w-24">
                        <MasterDataNumericInput
                          value={step.capacity}
                          onValueChange={value => applyCellUpdate(step.id, { capacity: value })}
                          selectionId={valueSourceId(step.id, 'capacity')}
                          {...getMasterDataNumericInputDomain('capacity')}
                          allowSubMinimumDraft
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="capacity"
                          aria-label={`Capacity for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={capacityMissing || capacityInvalid}
                          className={`${numericClass(capacityInvalid, capacityMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {capacityMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <MasterDataFocusedNumber
                      value={step.capacity}
                      selectionId={valueSourceId(step.id, 'capacity')}
                      data-grid-cell="true"
                      data-grid-row-id={step.id}
                      data-grid-field="capacity"
                      tabIndex={viewCellTabIndex(step.id, 'capacity')}
                      aria-label={`Capacity for ${step.processName || `Routing row ${rowNumber}`}`}
                      aria-invalid={capacityMissing || capacityInvalid}
                      reserveMarker
                      missingMarker={capacityMissing}
                      className={`${masterDataNumericDisplaySlotClass} ml-auto max-w-24 ${showWarningHighlights && (capacityMissing || capacityInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? masterDataSpreadsheetSelectionClass : ''}`}
                    />}
                  </td>
                  <td className="relative px-2 py-0.5 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className={masterDataPercentageShellClass}>
                        <div className="relative flex h-8 min-w-0 flex-1 items-center">
                          <MasterDataNumericInput
                            value={step.yield === null ? null : step.yield * 100}
                            onValueChange={value => applyCellUpdate(step.id, { yield: value === null ? null : value / 100 })}
                            selectionId={valueSourceId(step.id, 'yield')}
                            percentage
                            {...getMasterDataNumericInputDomain('yield', true)}
                            allowSubMinimumDraft
                            reserveMarker
                            data-grid-cell="true"
                            data-grid-row-id={step.id}
                            data-grid-field="yield"
                            aria-label={`Yield percentage for ${step.processName || `Routing row ${rowNumber}`}`}
                            aria-invalid={yieldMissing || yieldInvalid}
                            className={`${numericClass(yieldInvalid, yieldMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? masterDataSpreadsheetSelectionClass : ''}`}
                          />
                          {yieldMissing && <MasterDataBlockerMarker />}
                        </div>
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    ) : (
                      <div className={masterDataPercentageShellClass}>
                        <MasterDataFocusedNumber
                          value={step.yield === null ? null : step.yield * 100}
                          selectionId={valueSourceId(step.id, 'yield')}
                          percentage
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="yield"
                          tabIndex={viewCellTabIndex(step.id, 'yield')}
                          aria-label={`Yield percentage for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={yieldMissing || yieldInvalid}
                          reserveMarker
                          missingMarker={yieldMissing}
                          className={`${masterDataNumericDisplaySlotClass} w-0 flex-1 ${showWarningHighlights && (yieldMissing || yieldInvalid) ? masterDataIssueDisplayClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-0.5 font-sans text-slate-600">
                    {isEditMode ? (
                        <input
                        value={step.note || ''}
                        onChange={event => applyCellUpdate(step.id, { note: event.target.value })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="note"
                        aria-label={`Note for ${step.processName || `Routing row ${rowNumber}`}`}
                        className={`${masterDataTextEditorClass} ${selectedCellKeys.has(tableCellKey(step.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <div data-grid-cell="true" data-grid-row-id={step.id} data-grid-field="note" tabIndex={viewCellTabIndex(step.id, 'note')} aria-label={`Note for ${step.processName || `Routing row ${rowNumber}`}`} className={`${masterDataDisplaySlotClass} ${selectedCellKeys.has(tableCellKey(step.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}>{step.note || '—'}</div>}
                  </td>
                  <td className={`${masterDataActionsColumnClass} px-1 py-0.5 text-center`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip label={deleteTooltip}>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleDeleteRow(step.id)}
                          aria-label={!isEditMode ? deleteTooltip : deleteSelectedGroup ? 'Delete selected Routing rows' : `Delete Routing row ${rowNumber}`}
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
                          onDragStart={event => handleDragStart(event, step.id)}
                          onDragEnd={finishReorder}
                          aria-label={!isEditMode ? reorderTooltip : reorderSelectedGroup ? 'Drag selected Routing rows to reorder' : `Drag Routing row ${rowNumber} to reorder`}
                          className={`inline-flex h-8 w-7 items-center justify-center ${draggingIds.has(step.id) ? 'cursor-grabbing text-slate-700' : 'cursor-grab text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400`}
                        >
                          <GripVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredRouting.length === 0 && (
              <tr>
                <td colSpan={8} className="p-0 text-center font-sans text-slate-500">
                  {routing.length === 0 && isEditMode ? (
                    <button type="button" onClick={onAddRoutingStep} className="min-h-10 w-full px-3 text-xs text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Click to add first row</button>
                  ) : (
                    <div role="status" className="min-h-10 px-3 py-3 text-xs text-slate-500">{routing.length === 0 ? 'No rows yet.' : 'No rows match your search.'}</div>
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
