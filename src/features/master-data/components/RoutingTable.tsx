import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
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
import { masterDataDisplaySlotClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataTextEditorClass, masterDataWarningEditorFillClass } from './master-data-field-styles'

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

const numberValue = (value: number | null | undefined): string => value === null || value === undefined ? '' : String(value)
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
    toggleRow,
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
        <table ref={tableRef} className="w-max table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-12" /><col className="w-[288px]" /><col className="w-[180px]" />
            <col className="w-24" /><col className="w-28" /><col className="w-[92px]" /><col className="w-[280px]" /><col className="w-[76px]" />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-12 bg-slate-100 p-0 text-center">
                <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredRouting.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear selection for visible Routing rows' : 'Select all visible Routing rows'} title={allVisibleSelected ? 'Clear visible selection' : 'Select visible rows'} className={`h-9 w-full text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}>#</button>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Process</th>
              <th scope="col" className="px-2 py-2 text-center">Work Center</th>
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
              const numericClass = (invalid: boolean, missing: boolean) => `${masterDataNumericEditorClass} ${invalid ? 'border-amber-600' : ''} ${showWarningHighlights && (invalid || missing) ? masterDataWarningEditorFillClass : ''}`

              return (
                <tr
                  key={step.id}
                  data-master-data-row-id={step.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(step.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, step.id) }}
                  className="group h-10"
                >
                  <th scope="row" className="sticky left-0 z-20 w-12 bg-white px-1.5 py-0.5 text-center font-mono font-normal text-slate-600">
                    <button
                      type="button"
                      aria-label={`Select Routing row ${rowNumber}`}
                      aria-pressed={isSelected}
                      onMouseDown={event => startDrag(step.id, event)}
                      onClick={event => { if (event.detail === 0) toggleRow(step.id) }}
                      className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                    >
                      {rowNumber}
                    </button>
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
                          className={`${masterDataTextEditorClass} ${identityWarning ? 'border-amber-600' : ''} ${identityWarning && showWarningHighlights ? masterDataWarningEditorFillClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'processName')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                      ) : <div className={`flex h-8 w-full min-w-0 items-center rounded-sm border border-transparent px-2 text-xs ${identityWarning && showWarningHighlights ? 'bg-amber-50' : ''}`}>{step.processName || <span className="text-slate-500">{placeholderNumber === undefined ? '—' : `Process ${placeholderNumber}`}</span>}</div>}
                    </div>
                  </td>
                  <td className="relative px-2 py-0.5 text-center">
                    {isEditMode ? (
                      <div className="relative min-w-0">
                        <select
                        value={step.workCenterId || ''}
                        onChange={event => applyCellUpdate(step.id, { workCenterId: event.target.value || undefined })}
                        data-grid-cell="true"
                        data-grid-row-id={step.id}
                        data-grid-field="workCenterId"
                        aria-label={`Work Center for Routing row ${rowNumber}`}
                        aria-invalid={workCenterInvalid}
                        className={`mx-auto block max-w-40 pr-6 text-center ${masterDataTextEditorClass} ${workCenterInvalid ? 'border-amber-600' : ''} ${showWarningHighlights && workCenterInvalid ? masterDataWarningEditorFillClass : ''} ${selectedCellKeys.has(tableCellKey(step.id, 'workCenterId')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      >
                        <option value="">Select Work Center</option>
                        {step.workCenterId && !knownWorkCenters.has(step.workCenterId.trim().toLocaleLowerCase()) && (
                          <option value={step.workCenterId}>{step.workCenterId} (not in Work Centers table)</option>
                        )}
                        {rates.map(rate => (
                          <option key={rate.id} value={rate.workCenterCode}>{rate.workCenterCode}</option>
                        ))}
                        </select>
                        {workCenterInvalid && <MasterDataBlockerMarker label="Missing or unavailable Work Center" />}
                      </div>
                    ) : (
                      <span className={`relative inline-block max-w-full truncate rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${workCenterInvalid ? 'text-amber-900' : 'text-slate-700'} ${workCenterInvalid && showWarningHighlights ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                        {step.workCenterId || '—'}
                        {workCenterInvalid && <MasterDataBlockerMarker label="Missing or unavailable Work Center" className="right-0 top-0" />}
                      </span>
                    )}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-20">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(step.manning)}
                          onChange={event => applyCellUpdate(step.id, { manning: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="manning"
                          aria-label={`Manning for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={manningInvalid}
                          className={`${numericClass(manningInvalid, manningMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'manning')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {manningMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-20 ${manningInvalid ? 'text-amber-900' : ''} ${manningInvalid && showWarningHighlights ? 'bg-amber-50' : ''}`}>{step.manning === null ? '—' : formatNumber(step.manning, 2)}{manningMissing && <MasterDataBlockerMarker className="right-0 top-0" />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-24">
                        <input
                          type="number"
                          step="any"
                          value={numberValue(step.capacity)}
                          onChange={event => applyCellUpdate(step.id, { capacity: parseNumber(event.target.value) })}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="capacity"
                          aria-label={`Capacity for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={capacityInvalid}
                          className={`${numericClass(capacityInvalid, capacityMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'capacity')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                        {capacityMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-24 ${capacityInvalid ? 'text-amber-900' : ''} ${capacityInvalid && showWarningHighlights ? 'bg-amber-50' : ''}`}>{step.capacity === null ? '—' : formatNumber(step.capacity, 2)}{capacityMissing && <MasterDataBlockerMarker className="right-0 top-0" />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="mx-auto flex w-fit items-center justify-center gap-1">
                        <div className="relative w-16">
                        <input
                          type="number"
                          step="any"
                          value={step.yield === null ? '' : String(step.yield * 100)}
                          onChange={event => {
                            const value = event.target.value.trim()
                            applyCellUpdate(step.id, { yield: value === '' ? null : Number(value) / 100 })
                          }}
                          data-grid-cell="true"
                          data-grid-row-id={step.id}
                          data-grid-field="yield"
                          aria-label={`Yield percentage for ${step.processName || `Routing row ${rowNumber}`}`}
                          aria-invalid={yieldInvalid}
                          className={`${numericClass(yieldInvalid, yieldMissing)} ${selectedCellKeys.has(tableCellKey(step.id, 'yield')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        />
                          {yieldMissing && <MasterDataBlockerMarker className="right-0 top-0.5" />}
                        </div>
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : (
                      <div className="mx-auto flex h-8 w-[76px] items-center justify-center gap-1">
                        <span className={`${masterDataNumericDisplaySlotClass} relative h-8 w-16 px-0 ${yieldInvalid ? 'text-amber-900' : ''} ${yieldInvalid && showWarningHighlights ? 'bg-amber-50' : ''}`}>
                          {step.yield === null ? '—' : formatNumber(step.yield * 100, 2)}
                          {yieldMissing && <MasterDataBlockerMarker className="right-0 top-0" />}
                        </span>
                        <span className="text-slate-400">%</span>
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
                        className={`${masterDataTextEditorClass} ${selectedCellKeys.has(tableCellKey(step.id, 'note')) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      />
                    ) : <div className={masterDataDisplaySlotClass}>{step.note || '—'}</div>}
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => handleDeleteRow(step.id)}
                        aria-label={`Delete Routing row ${rowNumber}`}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                        title={isEditMode ? (selectedIds.has(step.id) && selectedIds.size > 1 ? `Delete ${selectedIds.size} selected rows` : 'Delete row') : 'Switch to Edit to delete rows'}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={!isEditMode}
                        draggable={isEditMode}
                        onDragStart={event => handleDragStart(event, step.id)}
                        aria-label={`Reorder Routing row ${rowNumber}`}
                        title={isEditMode ? 'Drag to reorder' : 'Reordering is available in Edit'}
                        className={`inline-flex h-8 w-7 cursor-grab items-center justify-center ${isSelected ? 'text-slate-700' : 'text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 group-hover:text-slate-600 group-focus-within:text-slate-700`}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                      </button>
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
