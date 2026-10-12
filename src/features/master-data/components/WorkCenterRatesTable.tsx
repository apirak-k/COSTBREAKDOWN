import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { SnapshotWorkCenterRate, SnapshotRoutingStep, formatNumber } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { useIdentityEditorDrafts } from '../hooks/useIdentityEditorDrafts'
import { SpreadsheetPasteCell, tableCellKey, useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { RowChanges, useSpreadsheetEditing } from '../hooks/useSpreadsheetEditing'
import { blankIdentityOrdinals, duplicateIdentityIds, editableIdentityPlaceholder, editableIdentityValue, hasInvalidNumber } from '../table-validation'
import { useWarningNavigationFocus, type WarningNavigationTarget } from '../hooks/useWarningNavigationFocus'
import type { MasterDataBlockerItem, MasterDataWarningItem } from '../prepare-dataset'
import { MasterDataTableHeader } from './MasterDataTableChrome'
import { MasterDataBlockerMarker } from './MasterDataBlockerMarker'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { NumericInput } from '../../../shared/ui/NumericInput'
import { masterDataActionsColumnClass, masterDataDisplaySlotClass, masterDataIndexColumnClass, masterDataIssueDisplayClass, masterDataIssueEditorClass, masterDataIssuePlaceholderClass, masterDataNumericDisplaySlotClass, masterDataNumericEditorClass, masterDataSpreadsheetSelectionClass, masterDataTextEditorClass } from './master-data-field-styles'

interface WorkCenterRatesTableProps {
  rates: SnapshotWorkCenterRate[]
  routing: SnapshotRoutingStep[]
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
  onAddRate: () => void
  onUpdateRates: (
    updates: Array<{ id: string; changes: Partial<Omit<SnapshotWorkCenterRate, 'id' | 'confidence'>> }>,
    options?: { routingRowIdsByRateId?: Record<string, string[]> }
  ) => void
  onDeleteRates: (ids: string[]) => void
  onReorderRows: (movingId: string, targetId: string, position: 'before' | 'after', movingIds?: string[]) => void
  warningNavigationTarget?: WarningNavigationTarget
  onWarningNavigationHandled: (requestId: number) => void
}

const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)

export const WorkCenterRatesTable: React.FC<WorkCenterRatesTableProps> = ({
  rates,
  routing,
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
  onAddRate,
  onUpdateRates,
  onDeleteRates,
  onReorderRows,
  warningNavigationTarget,
  onWarningNavigationHandled
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const warningIndexRef = useRef(0)
  const blockerIndexRef = useRef(0)
  const renameTargetsRef = useRef(new Map<string, string[]>())
  const query = searchQuery.trim().toLocaleLowerCase()
  const duplicateWcIds = useMemo(() => duplicateIdentityIds(rates, rate => rate.id, rate => rate.workCenterCode), [rates])
  const placeholderNumbers = useMemo(() => blankIdentityOrdinals(rates, rate => rate.workCenterCode), [rates])
  const getIdentityEditorValue = useCallback((rate: SnapshotWorkCenterRate) => editableIdentityValue(rate.workCenterCode, rate.isGeneratedBusinessIdentity), [])
  const identityEditorDrafts = useIdentityEditorDrafts(rates, historyScope, getIdentityEditorValue)

  const filteredRates = useMemo(() => rates.filter(rate =>
    [rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [rates, query])

  const {
    selectedIds,
    setSelectedIds,
    toggleAll,
    startDrag,
    handleRowClick,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredRates,
    getItemId: rate => rate.id,
    selectionScope: historyScope
  })

  const selectWarningRow = useCallback((rowId: string) => setSelectedIds(new Set([rowId])), [setSelectedIds])
  useWarningNavigationFocus(tableRef, searchQuery, onSearchQueryChange, warningNavigationTarget, selectWarningRow, onWarningNavigationHandled)

  useEffect(() => {
    warningIndexRef.current = 0
    blockerIndexRef.current = 0
  }, [historyScope, warningItems, blockerItems])

  useEffect(() => {
    renameTargetsRef.current.clear()
  }, [historyScope])

  const captureRenameTargets = useCallback((rateId: string) => {
    if (renameTargetsRef.current.has(rateId)) return
    const rate = rates.find(item => item.id === rateId)
    if (!rate) return
    const identity = rate.workCenterCode.trim().toLocaleLowerCase()
    const routingRowIds = identity
      ? routing.filter(step => step.workCenterId?.trim().toLocaleLowerCase() === identity).map(step => step.id)
      : []
    renameTargetsRef.current.set(rateId, routingRowIds)
  }, [rates, routing])

  const applyWorkCenterCodeUpdate = useCallback((id: string, workCenterCode: string) => {
    const ids = selectedIds.has(id) ? [...selectedIds] : [id]
    ids.forEach(captureRenameTargets)
    const routingRowIdsByRateId = Object.fromEntries(ids.map(rateId => [
      rateId,
      renameTargetsRef.current.get(rateId) ?? []
    ]))
    onUpdateRates(ids.map(rateId => ({ id: rateId, changes: { workCenterCode } })), { routingRowIdsByRateId })
  }, [captureRenameTargets, onUpdateRates, selectedIds])

  const {
    applyCellUpdate,
    applyPasteUpdates,
    applyCutUpdates
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
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'workCenterCode').map(cell => cell.rowId))
  }, [applyPasteUpdates, identityEditorDrafts.clearValues])

  const handleCutCells = useCallback((cells: SpreadsheetPasteCell[]) => {
    const updates = cells.flatMap(cell => {
      let changes: RowChanges<SnapshotWorkCenterRate> | null = null
      if (cell.field === 'workCenterCode') changes = { workCenterCode: '' }
      else if (cell.field === 'laborRate') changes = { laborRate: null }
      else if (cell.field === 'burdenRate') changes = { burdenRate: null }
      else if (cell.field === 'note') changes = { note: '' }
      return changes ? [{ id: cell.rowId, changes }] : []
    })
    applyCutUpdates(updates)
    identityEditorDrafts.clearValues(cells.filter(cell => cell.field === 'workCenterCode').map(cell => cell.rowId))
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
      <MasterDataTableHeader title="Work Centers" rowCount={rates.length} selectedCount={selectedIds.size} warningCount={warningCount} blockerCount={blockerItems.length} isEditMode={isEditMode} onNextWarning={handleNextWarning} onNextBlocker={handleNextBlocker} onAddRow={onAddRate} />

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[56rem] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className={masterDataIndexColumnClass} /><col /><col className="w-56" />
            <col className="w-56" /><col /><col className={masterDataActionsColumnClass} />
          </colgroup>
          <thead className="sticky top-0 z-30 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className={`sticky left-0 z-40 ${masterDataIndexColumnClass} bg-slate-100 p-0 text-center`}>
                <Tooltip label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible rows'} wrapperClassName="relative flex h-9 w-full items-center justify-center">
                  <button type="button" onClick={() => toggleAll(!allVisibleSelected)} disabled={filteredRates.length === 0} aria-pressed={allVisibleSelected} aria-label={allVisibleSelected ? 'Clear visible selection for Work Centers rows' : 'Select all visible Work Centers rows'} className={`grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'border border-slate-800 bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}>#</button>
                </Tooltip>
              </th>
              <th scope="col" className="px-2 py-2 text-left">Work Center</th>
              <th scope="col" className="px-2 py-2 text-center">Labor Rate</th>
              <th scope="col" className="px-2 py-2 text-center">Burden Rate</th>
              <th scope="col" className="px-2 py-2 text-left">Note</th>
              <th scope="col" className={`${masterDataActionsColumnClass} px-1 py-2 text-center`}>Actions</th>
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
              const deleteSelectedGroup = selectedIds.has(rate.id) && selectedIds.size > 1
              const deleteTooltip = !isEditMode ? 'Switch to Edit to delete rows' : deleteSelectedGroup ? 'Delete selected rows' : 'Delete row'
              const reorderSelectedGroup = isSelected && selectedIds.size > 1
              const reorderTooltip = !isEditMode ? 'Reordering is available in Edit' : reorderSelectedGroup ? 'Drag selected rows to reorder' : 'Drag to reorder'
              const numericClass = (invalid: boolean) => `${masterDataNumericEditorClass} ${showWarningHighlights && invalid ? masterDataIssueEditorClass : ''}`

              return (
                <tr
                  key={rate.id}
                  data-master-data-row-id={rate.id}
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => onMouseEnterRow(rate.id)}
                  onDragOver={event => { if (isEditMode) event.preventDefault() }}
                  onDrop={event => { if (isEditMode) handleRowDrop(event, rate.id) }}
                  className={`group h-10 transition-colors ${isSelected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'}`}
                >
                  <th scope="row" className={`sticky left-0 z-20 ${masterDataIndexColumnClass} bg-transparent px-1.5 py-0.5 text-center font-mono font-normal text-slate-600`}>
                    <Tooltip label={isSelected ? 'Deselect row' : 'Select row'}>
                      <button
                        type="button"
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(rate.id, event)}
                        onClick={event => handleRowClick(rate.id, event)}
                        className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                      >
                        {rowNumber}
                      </button>
                    </Tooltip>
                  </th>
                  <td className="px-2 py-0.5 text-left font-mono font-semibold text-slate-950">
                    {isEditMode ? (
                      <div className="min-w-0">
                        <input
                          value={identityEditorDrafts.getValue(rate)}
                          placeholder={editableIdentityPlaceholder(editableIdentityValue(rate.workCenterCode, rate.isGeneratedBusinessIdentity), rate.isGeneratedBusinessIdentity ? rate.workCenterCode : placeholderNumber === undefined ? '' : `Work Center ${placeholderNumber}`)}
                          onFocus={() => captureRenameTargets(rate.id)}
                          onBlur={() => {
                            identityEditorDrafts.clearValue(rate.id)
                            renameTargetsRef.current.delete(rate.id)
                          }}
                          onChange={event => {
                            identityEditorDrafts.setValue(rate.id, event.target.value)
                            applyWorkCenterCodeUpdate(rate.id, event.target.value)
                          }}
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="workCenterCode"
                          aria-label={`WC for row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`block w-full text-left ${masterDataTextEditorClass} ${identityWarning && showWarningHighlights ? `${masterDataIssueEditorClass} ${masterDataIssuePlaceholderClass}` : ''} ${selectedCellKeys.has(tableCellKey(rate.id, 'workCenterCode')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-8 items-center justify-start">
                        <span className={`inline-flex w-full min-w-0 items-center truncate rounded-sm border px-1.5 py-0.5 text-[11px] font-mono font-medium ${identityWarning && showWarningHighlights ? `${masterDataIssueDisplayClass} text-slate-700` : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          {rate.workCenterCode || <span>{placeholderNumber ?? '—'}</span>}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-24">
                        <NumericInput
                          value={rate.laborRate}
                          onValueChange={value => applyCellUpdate(rate.id, { laborRate: value })}
                          min={0}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="laborRate"
                          aria-label={`Labor Rate for ${rate.workCenterCode || `Work Center row ${rowNumber}`}`}
                          aria-invalid={laborInvalid}
                          className={`${numericClass(laborInvalid)} ${selectedCellKeys.has(tableCellKey(rate.id, 'laborRate')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {laborMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-24 ${laborInvalid && showWarningHighlights ? masterDataIssueDisplayClass : ''}`}>{rate.laborRate === null ? '—' : formatNumber(rate.laborRate, 2)}{laborMissing && <MasterDataBlockerMarker />}</span>}
                  </td>
                  <td className="relative px-2 py-0.5 text-center font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="relative mx-auto w-full max-w-24">
                        <NumericInput
                          value={rate.burdenRate}
                          onValueChange={value => applyCellUpdate(rate.id, { burdenRate: value })}
                          min={0}
                          reserveMarker
                          data-grid-cell="true"
                          data-grid-row-id={rate.id}
                          data-grid-field="burdenRate"
                          aria-label={`Burden Rate for ${rate.workCenterCode || `Work Center row ${rowNumber}`}`}
                          aria-invalid={burdenInvalid}
                          className={`${numericClass(burdenInvalid)} ${selectedCellKeys.has(tableCellKey(rate.id, 'burdenRate')) ? masterDataSpreadsheetSelectionClass : ''}`}
                        />
                        {burdenMissing && <MasterDataBlockerMarker />}
                      </div>
                    ) : <span className={`${masterDataNumericDisplaySlotClass} mx-auto w-full max-w-24 ${burdenInvalid && showWarningHighlights ? masterDataIssueDisplayClass : ''}`}>{rate.burdenRate === null ? '—' : formatNumber(rate.burdenRate, 2)}{burdenMissing && <MasterDataBlockerMarker />}</span>}
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
                        className={`${masterDataTextEditorClass} ${selectedCellKeys.has(tableCellKey(rate.id, 'note')) ? masterDataSpreadsheetSelectionClass : ''}`}
                      />
                    ) : <div className={masterDataDisplaySlotClass}>{rate.note || '—'}</div>}
                  </td>
                  <td className={`${masterDataActionsColumnClass} px-1 py-0.5 text-center`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip label={deleteTooltip}>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => {
                            const idsToDelete = selectedIds.has(rate.id) ? [...selectedIds] : [rate.id]
                            onDeleteRates(idsToDelete)
                            setSelectedIds(previous => new Set([...previous].filter(selectedId => !idsToDelete.includes(selectedId))))
                          }}
                          aria-label={!isEditMode ? deleteTooltip : deleteSelectedGroup ? 'Delete selected Work Centers rows' : `Delete Work Centers row ${rowNumber}`}
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
                          onDragStart={event => handleDragStart(event, rate.id)}
                          aria-label={!isEditMode ? reorderTooltip : reorderSelectedGroup ? 'Drag selected Work Centers rows to reorder' : `Drag Work Centers row ${rowNumber} to reorder`}
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
    </section>
  )
}
