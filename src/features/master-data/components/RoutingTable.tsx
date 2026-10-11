import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import { SnapshotRoutingStep, SnapshotWorkCenterRate, formatNumber } from '../../../core'
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
import { masterDataDisplaySlotClass, masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataIssuePlaceholderClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataPercentageDisplayValueClass, masterDataPercentageEditorClass, masterDataPercentageInputShellClass, masterDataPercentageIssueShellClass, masterDataPercentageShellClass, masterDataSpreadsheetSelectionClass, masterDataTextEditorClass } from './master-data-field-styles'

interface RoutingTableProps {
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
  isEditMode?: boolean
  historyScope: string
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
  const warningIndexRef = useRef(0)
  const blockerIndexRef = useRef(0)
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

  useEffect(() => {
    warningIndexRef.current = 0
    blockerIndexRef.current = 0
  }, [historyScope, warningItems, blockerItems])

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

  const { selectedCellKeys } = useTableKeyboardNav({
    tableRef,
    isEditMode,
    onPasteCells: handlePasteCells,
    onCutCells: handleCutCells,
    onUndo: handleUndo,
    onRedo: handleRedo
  })

  const handleDeleteRow = (id: string) => {
    const idsToDelete = selectedIds.has(id) ? [...selectedIds] : [id]
    onDeleteRoutingSteps(idsToDelete)
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

  const allVisibleSelected = filteredRouting.length > 0 && filteredRouting.every(step => selectedIds.has(step.id))

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
    <section aria-label="Routing rows" className="overflow-hidden border border-slate-300 bg-white select-none">
      <MasterDataTableHeader title="Routing" rowCount={routing.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} isEditMode={isEditMode} onNextWarning={handleNextWarning} onNextBlocker={handleNextBlocker} onAddRow={onAddRoutingStep} />

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[68rem] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-[4.5%]" /><col className="w-[22%]" /><col className="w-[22%]" />
            <col className="w-[9.5%]" /><col className="w-[11.5%]" /><col className="w-[12.5%]" /><col className="w-[11%]" /><col className="w-[7%]" />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 p-0 text-center">
                <Tooltip label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible rows'} wrapperClassName="relative flex h-9 w-full items-center justify-center">
                  <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredRouting.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear visible selection for Routing rows' : 'Select all visible Routing rows'} className={`grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'border border-slate-800 bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}>#</button>
                </Tooltip>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Process</th>
              <th scope="col" className="px-2 py-2 text-left">Work Center</th>
              <th scope="col" className="px-2 py-2 text-center">Manning</th>
              <th scope="col" className="px-2 py-2 text-center">Capacity</th>
              <th scope="col" className="px-2 py-2 text-center">Yield</th>
              <th scope="col" className="px-2 py-2 text-left">Note</th>
              <th scope="col" className="w-20 px-1 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredRouting.map(step => {
              const isSelected = selectedIds.has(step.id)
              const identityInvalid = !step.processName.trim() || duplicateProcessIds.has(step.id)
              const identityWarning = Boolean(step.isGeneratedBusinessIdentity || step.autoRenamedFrom || duplicateProcessIds.has(step.id))
              const workCenterInvalid = !step.workCenterId?.trim() || !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase())
              const manningInvalid = step.manning === null || hasInvalidNumber(step.manning)
              const capacityInvalid = step.capacity === null || hasInvalidNumber(step.capacity) || step.capacity <= 0
              const yieldInvalid = step.yield === null || hasInvalidNumber(step.yield) || step.yield <= 0 || step.yield > 1
              const manningMissing = step.manning === null
              const capacityMissing = step.capacity === null
              const yieldMissing = step.yield === null
              const rowNumber = routing.findIndex(row => row.id === step.id) + 1
              const placeholderNumber = placeholderNumbers.get(step.id)
              const deleteSelectedGroup = selectedIds.has(step.id) && selectedIds.size > 1
              const deleteTooltip = !isEditMode ? 'Switch to Edit to delete rows' : deleteSelectedGroup ? 'Delete selected rows' : 'Delete row'
              const reorderSelectedGroup = isSelected && selectedIds.size > 1
              const reorderTooltip = !isEditMode ? 'Reordering is available in Edit' : reorderSelectedGroup ? 'Drag selected rows to reorder' : 'Drag to reorder'
              const numericClass = (invalid: boolean) => `${masterDataNumericEditorClass} ${showWarningHighlights && invalid ? masterDataIssueEditorClass : ''}`

              return (
                <tr
                  key={step.id}
                  data-master-data-row-id={step.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, step.id) }}
                  className={`group h-10 transition-colors ${isSelected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'}`}
                >
                  <th scope="row" className="sticky left-0 z-20 w-12 bg-transparent px-1.5 py-0.5 text-center font-mono font-normal text-slate-600">
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
                      ) : <div className={`flex h-8 w-full min-w-0 items-center rounded-sm border border-transparent px-2 text-xs ${identityWarning && showWarningHighlights ? masterDataIssueDisplayClass : ''}`}>{step.processName || <span className="text-slate-500">{placeholderNumber === undefined ? '—' : `Process ${placeholderNumber}`}</span>}</div>}
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
                        <span className={`inline-flex h-8 w-full min-w-0 items-center truncate rounded-sm border px-1.5 text-[11px] font-mono font-medium ${workCenterInvalid && showWarningHighlights ? 'pr-8 text-amber-900' : ''} ${workCenterInvalid && showWarningHighlights ? masterDataIssueDisplayClass : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          {step.workCenterId || (workCenterInvalid ? 'Unavailable' : '—')}
                        </span>
                        {workCenterInvalid && <MasterDataBlockerMarker label="Missing or unavailable Work Center" />}
                      </div>
                    )}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-20">
                        <NumericInput
                          value={step.manning}
                          onValueChange={value => applyCellUpdate(step.id, { manning: value })}
                          min={0}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="manning"
                          aria-label={`Manning for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={manningInvalid}
                          className={`${numericClass(manningInvalid)} ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {manningMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-20 ${manningInvalid && showWarningHighlights ? masterDataIssueDisplayClass : ''}`}>{step.manning === null ? '—' : formatNumber(step.manning, 2)}{manningMissing && <MasterDataBlockerMarker />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-24">
                        <NumericInput
                          value={step.capacity}
                          onValueChange={value => applyCellUpdate(step.id, { capacity: value })}
                          min={0}
                          minExclusive
                          allowSubMinimumDraft
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="capacity"
                          aria-label={`Capacity for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={capacityInvalid}
                          className={`${numericClass(capacityInvalid)} ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {capacityMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-24 ${capacityInvalid && showWarningHighlights ? masterDataIssueDisplayClass : ''}`}>{step.capacity === null ? '—' : formatNumber(step.capacity, 2)}{capacityMissing && <MasterDataBlockerMarker />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className={`${masterDataPercentageShellClass} ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? masterDataSpreadsheetSelectionClass : ''}`}>
                        <div className={`${masterDataPercentageInputShellClass} ${showWarningHighlights && yieldInvalid ? masterDataPercentageIssueShellClass : ''}`}>
                          <NumericInput
                            value={step.yield === null ? null : step.yield * 100}
                            onValueChange={value => applyCellUpdate(step.id, { yield: value === null ? null : value / 100 })}
                            min={0}
                            minExclusive
                            max={100}
                            allowSubMinimumDraft
                            reserveMarker
                            data-grid-cell="true"
                            data-grid-row-id={step.id}
                            data-grid-field="yield"
                            aria-label={`Yield percentage for ${step.processName || `Routing row ${rowNumber}`}`}
                            aria-invalid={yieldInvalid}
                            className={masterDataPercentageEditorClass}
                          />
                          {yieldMissing && <MasterDataBlockerMarker />}
                        </div>
                        <span className="w-3 shrink-0 text-center text-[11px] text-slate-400">%</span>
                      </div>
                    ) : (
                      <div className={masterDataPercentageShellClass}>
                        <div className={`${masterDataPercentageInputShellClass} ${showWarningHighlights && yieldInvalid ? masterDataPercentageIssueShellClass : ''}`}>
                          <span className={masterDataPercentageDisplayValueClass}>
                            {step.yield === null ? '—' : formatNumber(step.yield * 100, 2)}
                          </span>
                          {yieldMissing && <MasterDataBlockerMarker />}
                        </div>
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
                    ) : <div className={masterDataDisplaySlotClass}>{step.note || '—'}</div>}
                  </td>
                  <td className="px-1 py-0.5 text-center">
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
                          aria-label={!isEditMode ? reorderTooltip : reorderSelectedGroup ? 'Drag selected Routing rows to reorder' : `Drag Routing row ${rowNumber} to reorder`}
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
