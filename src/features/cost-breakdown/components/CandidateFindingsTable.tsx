import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import {
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonFindingKey,
  getVarianceClass,
  isMasterDataNumericValueValid,
  resolveSnapshotRoutingRate
} from '../../../core'
import type { MasterDataNumericField } from '../../../core'
import type { ComparisonFinding, ComparisonStatus, CostBreakdownComparisonPair } from '../../../core'
import { applyRowDragSelection } from '../../../shared/selection/row-drag-selection'
import { Tooltip } from '../../../shared/ui/Tooltip'
import type { BOMItemizedRow } from './BOMDetailedTable'
import { BOMRecordDetails } from './BOMDetailedTable'
import type { RoutingItemizedRow } from './RoutingDetailedTable'
import { RoutingRecordDetails } from './RoutingDetailedTable'
import { reorderCandidateRowKeys } from '../candidate-reorder-history'
import type { CandidateTableType } from '../candidate-reorder-history'

export { reorderCandidateRowKeys } from '../candidate-reorder-history'

export interface CandidateTableRow {
  key: string
  type: 'BOM' | 'RTG'
  finding?: ComparisonFinding
  label: string
  gap: number | null
  detail: BOMItemizedRow | RoutingItemizedRow
}

interface CandidateFindingsTableProps {
  type: CandidateTableType
  rows: CandidateTableRow[]
  selectedKeys: ReadonlySet<string>
  totalGap: number | null
  pair: CostBreakdownComparisonPair
  expandedRows: ReadonlySet<string>
  onToggleExpanded: (type: CandidateTableType, rowKey: string) => void
  onToggleFinding?: (type: CandidateTableType, key: string) => void
  onSetFindingSelection?: (type: CandidateTableType, nextKeys: ReadonlySet<string>) => void
  onManualOrderChange: (keys: string[]) => void
}

interface CandidateReorderDrag {
  sourceKey: string
  movingKeys: string[]
}

function readReorderDrag(dataTransfer: DataTransfer, fallback: CandidateReorderDrag | null): CandidateReorderDrag | null {
  if (fallback) return fallback
  const sourceKey = dataTransfer.getData('text/plain')
  if (!sourceKey) return null
  let movingKeys = [sourceKey]
  try {
    const parsedKeys: unknown = JSON.parse(dataTransfer.getData('application/x-costbreakdown-row-ids'))
    if (Array.isArray(parsedKeys)) {
      const validKeys = parsedKeys.filter((key): key is string => typeof key === 'string')
      if (validKeys.includes(sourceKey)) movingKeys = validKeys
    }
  } catch {
    // Keep single-row dragging available when group data is unavailable.
  }
  return { sourceKey, movingKeys }
}

const BOM_COLUMN_WIDTHS = ['4%', '23%', '7%', '13%', '13%', '13%', '12%', '7%', '4%', '4%']
const ROUTING_COLUMN_WIDTHS = ['4%', '23%', '7%', '7.8%', '7.8%', '7.8%', '7.8%', '7.8%', '12%', '7%', '4%', '4%']

export function candidateDetailKey(type: CandidateTableType, rowKey: string): string {
  return `${type}:${rowKey}`
}

export function toggleCandidateDetail(
  expandedRows: ReadonlySet<string>,
  type: CandidateTableType,
  rowKey: string
): Set<string> {
  const key = candidateDetailKey(type, rowKey)
  const next = new Set(expandedRows)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function findingKey(type: CandidateTableType, finding: ComparisonFinding | undefined): string | null {
  return finding ? getComparisonFindingKey(type, finding) : null
}

function statusTextClass(status: ComparisonStatus | null): string {
  if (status === 'CHANGED') return 'text-amber-700'
  if (status === 'ADDED') return 'text-sky-700'
  if (status === 'REMOVED') return 'text-rose-700'
  if (status === 'UNCHANGED') return 'text-slate-500'
  return 'text-slate-400'
}

function gapTextClass(gap: number | null): string {
  if (gap === null || !Number.isFinite(gap)) return 'text-slate-400'
  return getVarianceClass(gap)
}

function validParameter(field: MasterDataNumericField, value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && isMasterDataNumericValueValid(field, value)
    ? value
    : null
}

function candidatePercent(gap: number | null, totalGap: number | null): string {
  return gap === null || totalGap === null || !Number.isFinite(gap) || !Number.isFinite(totalGap) || totalGap === 0
    ? '—'
    : formatPercent(gap / totalGap, 2)
}

function formatParameterValue(field: MasterDataNumericField, value: number | null | undefined): string {
  const available = validParameter(field, value)
  if (available === null) return '—'
  return field === 'loss' || field === 'yield' ? formatPercent(available, 2) : formatNumber(available, 2)
}

function parameterDelta(field: MasterDataNumericField, before: number | null | undefined, after: number | null | undefined): string {
  const beforeValue = validParameter(field, before)
  const afterValue = validParameter(field, after)
  if (beforeValue === null || afterValue === null) return '—'
  const difference = afterValue - beforeValue
  if (!Number.isFinite(difference)) return '—'
  return field === 'loss' || field === 'yield' ? formatPercent(difference, 2) : formatVariance(difference, 2)
}

interface DisplayParameter {
  field: MasterDataNumericField
  value: string
  side: 'After' | 'Before' | null
}

function parameterValues(row: CandidateTableRow, status: ComparisonStatus | null, pair: CostBreakdownComparisonPair): DisplayParameter[] {
  const display = (field: MasterDataNumericField, before: number | null | undefined, after: number | null | undefined): DisplayParameter => {
    if (status === 'ADDED') return { field, value: formatParameterValue(field, after), side: 'After' }
    if (status === 'REMOVED') return { field, value: formatParameterValue(field, before), side: 'Before' }
    return { field, value: parameterDelta(field, before, after), side: null }
  }

  if (row.type === 'BOM') {
    const detail = row.detail as BOMItemizedRow
    return [
      display('consumption', detail.reference?.consumption, detail.current?.consumption),
      display('price', detail.reference?.price, detail.current?.price),
      display('loss', detail.reference?.loss, detail.current?.loss)
    ]
  }
  const detail = row.detail as RoutingItemizedRow
  const referenceRate = resolveSnapshotRoutingRate(detail.reference, pair.before.rates)
  const currentRate = resolveSnapshotRoutingRate(detail.current, pair.after.rates)
  return [
    display('manning', detail.reference?.manning, detail.current?.manning),
    display('capacity', detail.reference?.capacity, detail.current?.capacity),
    display('yield', detail.reference?.yield, detail.current?.yield),
    display('laborRate', referenceRate?.laborRate, currentRate?.laborRate),
    display('burdenRate', referenceRate?.burdenRate, currentRate?.burdenRate)
  ]
}

export const CandidateFindingsTable: React.FC<CandidateFindingsTableProps> = ({
  type,
  rows,
  selectedKeys,
  totalGap,
  pair,
  expandedRows,
  onToggleExpanded,
  onToggleFinding,
  onSetFindingSelection,
  onManualOrderChange
}) => {
  const headerSelectionRef = useRef<HTMLButtonElement>(null)
  const selectionDragRef = useRef({ active: false, anchorKey: null as string | null, target: false, moved: false })
  const selectionAnchorRef = useRef<string | null>(null)
  const suppressNextSelectionClickRef = useRef(false)
  const suppressNextRowClickRef = useRef(false)
  const reorderDragRef = useRef<CandidateReorderDrag | null>(null)
  const [draggingKeys, setDraggingKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [dropTarget, setDropTarget] = useState<{ key: string; after: boolean } | null>(null)
  const isBOM = type === 'bom'
  const identityHeader = isBOM ? 'Bill of Material' : 'Routing'
  const parameterHeaders = isBOM
    ? ['Δ Usage', 'Δ Price', 'Δ Loss']
    : ['Δ Manning', 'Δ Capacity', 'Δ Yield', 'Δ LB Rate', 'Δ BD Rate']
  const columnWidths = isBOM ? BOM_COLUMN_WIDTHS : ROUTING_COLUMN_WIDTHS
  const eligibleRows = rows.filter(row => getCanonicalComparisonStatus(row.finding) !== null && findingKey(type, row.finding) !== null)
  const visibleKeys = eligibleRows.map(row => findingKey(type, row.finding) as string)
  const selectedVisibleCount = visibleKeys.filter(key => selectedKeys.has(key)).length
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  useEffect(() => {
    const handleMouseUp = () => {
      const drag = selectionDragRef.current
      if (drag.active && drag.moved) suppressNextSelectionClickRef.current = true
      drag.active = false
      drag.anchorKey = null
      drag.moved = false
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const applySelection = (nextKeys: ReadonlySet<string>) => {
    if (onSetFindingSelection) {
      onSetFindingSelection(type, nextKeys)
      return
    }
    const current = selectedKeys
    const changed = new Set([...current, ...nextKeys])
    changed.forEach(key => {
      if (current.has(key) !== nextKeys.has(key)) onToggleFinding?.(type, key)
    })
  }

  const toggleOne = (key: string) => onToggleFinding?.(type, key)

  const handleHeaderSelection = () => {
    const nextSelected = !allVisibleSelected
    applySelection(applyRowDragSelection(selectedKeys, visibleKeys, nextSelected))
  }

  const startSelectionDrag = (key: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (event.button !== 0) return
    if (event.shiftKey) {
      const anchorKey = selectionAnchorRef.current ?? key
      const anchorIndex = visibleKeys.indexOf(anchorKey)
      const targetIndex = visibleKeys.indexOf(key)
      if (targetIndex < 0) return
      const range = visibleKeys.slice(
        Math.min(anchorIndex < 0 ? targetIndex : anchorIndex, targetIndex),
        Math.max(anchorIndex, targetIndex) + 1
      )
      const base = event.ctrlKey || event.metaKey ? selectedKeys : new Set<string>()
      applySelection(applyRowDragSelection(base, range, true))
      suppressNextSelectionClickRef.current = true
      return
    }
    selectionAnchorRef.current = key
    if (event.ctrlKey || event.metaKey) return
    suppressNextSelectionClickRef.current = false
    selectionDragRef.current = {
      active: true,
      anchorKey: key,
      target: !selectedKeys.has(key),
      moved: false
    }
  }

  const traverseSelectionTo = (key: string) => {
    const drag = selectionDragRef.current
    if (!drag.active || !drag.anchorKey || drag.anchorKey === key) return
    const anchorIndex = visibleKeys.indexOf(drag.anchorKey)
    const targetIndex = visibleKeys.indexOf(key)
    if (anchorIndex < 0 || targetIndex < 0) return
    drag.moved = true
    const traversedKeys = visibleKeys.slice(Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1)
    applySelection(applyRowDragSelection(selectedKeys, traversedKeys, drag.target))
  }

  const startReorder = (event: React.DragEvent<HTMLButtonElement>, row: CandidateTableRow, key: string | null) => {
    const movingKeys = key && selectedKeys.has(key)
      ? rows.filter(candidate => {
        const candidateKey = findingKey(type, candidate.finding)
        return candidateKey !== null && selectedKeys.has(candidateKey)
      }).map(candidate => candidate.key)
      : [row.key]
    reorderDragRef.current = { sourceKey: row.key, movingKeys }
    setDraggingKeys(new Set(movingKeys))
    setDropTarget(null)
    event.dataTransfer.setData('text/plain', row.key)
    event.dataTransfer.setData('application/x-costbreakdown-row-ids', JSON.stringify(movingKeys))
    event.dataTransfer.effectAllowed = 'move'
  }

  const previewDrop = (event: React.DragEvent<HTMLTableRowElement>, targetKey: string) => {
    const drag = readReorderDrag(event.dataTransfer, reorderDragRef.current)
    if (!drag || drag.movingKeys.includes(targetKey)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const after = event.clientY >= event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2
    setDropTarget(current => current?.key === targetKey && current.after === after ? current : { key: targetKey, after })
  }

  const dropOnRow = (event: React.DragEvent<HTMLTableRowElement>, targetKey: string) => {
    const drag = readReorderDrag(event.dataTransfer, reorderDragRef.current)
    if (!drag || drag.movingKeys.includes(targetKey)) return
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const after = event.clientY >= bounds.top + bounds.height / 2
    const orderedKeys = rows.map(row => row.key)
    const nextKeys = reorderCandidateRowKeys(orderedKeys, drag.sourceKey, targetKey, after, drag.movingKeys)
    if (nextKeys.some((key, index) => key !== orderedKeys[index])) {
      onManualOrderChange(nextKeys)
      suppressNextRowClickRef.current = true
    }
    finishReorder()
  }

  const finishReorder = () => {
    reorderDragRef.current = null
    setDraggingKeys(new Set())
    setDropTarget(null)
  }

  const emptyMessage = isBOM ? 'No Bill of Material findings match this filter.' : 'No Routing findings match this filter.'

  return <div className="overflow-x-auto border border-slate-200">
    <table className={`w-full ${isBOM ? 'min-w-[1040px]' : 'min-w-[1260px]'} table-fixed text-left text-[10px]`}>
      <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
      <caption className="sr-only">{identityHeader} Candidate findings. Main parameter columns show After minus Before; CHANGED rows expand Before → After and Parameter Cost Effect details.</caption>
      <thead>
        <tr className="bg-slate-800 font-semibold text-white">
          <th scope="col" className="px-1 py-2 text-center">
            <button
              ref={headerSelectionRef}
              type="button"
              role="checkbox"
              aria-checked={someVisibleSelected ? 'mixed' : allVisibleSelected}
              aria-label={allVisibleSelected ? `Deselect all visible ${identityHeader} findings` : `Select all visible ${identityHeader} findings`}
              disabled={visibleKeys.length === 0}
              onClick={handleHeaderSelection}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm p-0 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white disabled:cursor-default disabled:opacity-40 ${allVisibleSelected ? 'bg-slate-600 text-white' : someVisibleSelected ? 'bg-slate-700 text-white ring-1 ring-inset ring-slate-500' : 'bg-transparent text-white hover:bg-slate-700'}`}
            >#</button>
          </th>
          <th scope="col" className="overflow-hidden px-2.5 py-2">{identityHeader}</th>
          <th scope="col" className="whitespace-nowrap px-1 py-2 text-left">Status</th>
          {parameterHeaders.map(header => <th key={header} scope="col" className="whitespace-nowrap px-1 py-2 text-right">{header}</th>)}
          <th scope="col" className="whitespace-nowrap px-1 py-2 text-right">Gap</th>
          <th scope="col" className="whitespace-nowrap px-1 py-2 text-right">%GAP</th>
          <th scope="col" className="px-1 py-2 text-center"><span className="sr-only">Reorder</span></th>
          <th scope="col" className="px-1 py-2 text-center"><span className="sr-only">Details</span></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
        {rows.length === 0
          ? <tr><td colSpan={isBOM ? 10 : 12} className="px-3 py-8 text-center font-sans italic text-slate-500">{emptyMessage}</td></tr>
          : rows.map((row, index) => {
            const key = findingKey(type, row.finding)
            const status = getCanonicalComparisonStatus(row.finding)
            const selected = key ? selectedKeys.has(key) : false
            const canExpand = status === 'CHANGED'
            const isExpanded = canExpand && expandedRows.has(candidateDetailKey(type, row.key))
            const detailId = 'candidate-detail-' + encodeURIComponent(row.key)
            const parameters = parameterValues(row, status, pair)
            const renderParameter = (parameter: DisplayParameter) => <>{parameter.side && parameter.value !== '—' && <span className="mr-1 font-sans text-[9px] font-medium text-slate-500">{parameter.side}</span>}{parameter.value}</>
            const rowType = type
            return <React.Fragment key={row.key}>
              <tr
                data-candidate-reorder-row={row.key}
                aria-selected={selected}
                aria-expanded={canExpand ? isExpanded : undefined}
                aria-controls={canExpand && isExpanded ? detailId : undefined}
                aria-label={canExpand
                  ? `${identityHeader}: ${row.label}; status ${status}; activate to ${isExpanded ? 'collapse' : 'expand'} detail`
                  : `${identityHeader}: ${row.label}; status ${status ?? 'unavailable'}`}
                tabIndex={canExpand ? 0 : -1}
                onClick={() => {
                  if (suppressNextRowClickRef.current) {
                    suppressNextRowClickRef.current = false
                    return
                  }
                  if (canExpand) onToggleExpanded(type, row.key)
                }}
                onKeyDown={event => {
                  if (!canExpand || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                  event.preventDefault()
                  onToggleExpanded(type, row.key)
                }}
                onDragOver={event => previewDrop(event, row.key)}
                onDrop={event => dropOnRow(event, row.key)}
                className={`group ${selected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'} ${canExpand ? 'cursor-pointer' : 'cursor-default'} ${dropTarget?.key === row.key ? dropTarget.after ? 'border-b-2 border-blue-500' : 'border-t-2 border-blue-500' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700`}
              >
                <td className="px-1 py-2 text-center" onClick={event => event.stopPropagation()}>
                  <button
                    type="button"
                    disabled={!key || status === null}
                    aria-pressed={selected}
                    aria-label={key ? `${selected ? 'Deselect' : 'Select'} ${identityHeader} finding ${row.label}` : `${identityHeader} row is not selectable`}
                    title={key ? (selected ? 'Deselect this finding' : 'Select this finding') : 'This row has no selectable finding'}
                    onMouseDown={event => key && startSelectionDrag(key, event)}
                    onMouseEnter={() => key && traverseSelectionTo(key)}
                    onClick={event => {
                      event.stopPropagation()
                      if (!key) return
                      if (suppressNextSelectionClickRef.current) {
                        suppressNextSelectionClickRef.current = false
                        return
                      }
                      if (event.detail === 0) selectionAnchorRef.current = key
                      toggleOne(key)
                    }}
                    className={selected
                      ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm p-0 font-mono text-[11px] font-semibold tabular-nums text-white bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
                      : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm p-0 font-mono text-[11px] font-semibold tabular-nums text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-40'}
                  >{index + 1}</button>
                </td>
                <th scope="row" className="max-w-0 overflow-hidden px-2.5 py-2 text-left font-sans font-medium text-slate-900">
                  <span className="block truncate whitespace-nowrap" title={row.label}>{row.label}</span>
                </th>
                <td className={`whitespace-nowrap px-1 py-2 text-left font-sans text-[10px] font-bold ${statusTextClass(status)}`}>{status ?? '—'}</td>
                {parameters.map(parameter => <td key={parameter.field} className="whitespace-nowrap px-1 py-2 text-right">{renderParameter(parameter)}</td>)}
                <td className={`whitespace-nowrap px-1 py-2 text-right ${gapTextClass(row.gap)}`}>{row.gap === null ? '—' : formatVariance(row.gap, 2)}</td>
                <td className="whitespace-nowrap px-1 py-2 text-right text-slate-700">{candidatePercent(row.gap, totalGap)}</td>
                <td className="px-1 py-2 text-center" onClick={event => event.stopPropagation()}>
                  <Tooltip label={selected && selectedVisibleCount > 1 ? `Drag selected ${isBOM ? 'BOM' : 'Routing'} findings to reorder` : 'Drag to reorder'}>
                    <button
                      type="button"
                      draggable
                      aria-label={selected && selectedVisibleCount > 1
                        ? `Drag selected ${isBOM ? 'BOM' : 'Routing'} findings to reorder`
                        : `Drag ${isBOM ? 'BOM' : 'Routing'} finding ${row.label} to reorder`}
                      onDragStart={event => startReorder(event, row, key)}
                      onDragEnd={finishReorder}
                      onClick={event => {
                        event.stopPropagation()
                      }}
                      className={`inline-flex h-8 w-7 shrink-0 cursor-grab select-none items-center justify-center rounded-sm ${selected ? 'text-slate-700' : 'text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing group-hover:text-slate-600 group-focus-within:text-slate-700 ${draggingKeys.has(row.key) ? 'cursor-grabbing' : ''}`}
                    ><GripVertical aria-hidden="true" className="h-4 w-4" /></button>
                  </Tooltip>
                </td>
                <td className="px-1 py-2 text-center">
                  {canExpand && <span aria-hidden="true" className="pointer-events-none inline-flex h-7 w-7 items-center justify-center text-slate-500">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>}
                </td>
              </tr>
              {isExpanded && (rowType === 'bom'
                ? <BOMRecordDetails row={row.detail as BOMItemizedRow} detailId={detailId} />
                : <RoutingRecordDetails row={row.detail as RoutingItemizedRow} referenceRates={pair.before.rates} currentRates={pair.after.rates} detailId={detailId} />)}
            </React.Fragment>
          })}
      </tbody>
    </table>
  </div>
}
