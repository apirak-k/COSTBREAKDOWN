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
import { applyRowDragSelection, applyRowSelectionScope, getRowSelectionState } from '../../../shared/selection/row-drag-selection'
import { StickyTableHeader, useSynchronizedTableHeader } from '../../../shared/ui/StickyTableHeader'
import { Tooltip } from '../../../shared/ui/Tooltip'
import { RowSelectionButton } from '../../../shared/ui/RowSelectionButton'
import { SelectedNumber } from '../../../shared/ui/selected-value'
import { NumericColumnHeader } from '../../../shared/ui/NumericColumnHeader'
import { COMPARISON_ROLE_LABELS } from '../../../shared/ui/ComparisonRoleSelector'
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
  onSetFindingSelection: (type: CandidateTableType, nextKeys: ReadonlySet<string>) => void
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

function candidatePercentRatio(gap: number | null, totalGap: number | null): number | null {
  if (gap === null || totalGap === null || !Number.isFinite(gap) || !Number.isFinite(totalGap) || totalGap === 0) return null
  const ratio = gap / totalGap
  return Number.isFinite(ratio) ? ratio : null
}

function formatParameterValue(field: MasterDataNumericField, value: number | null | undefined): string {
  const available = validParameter(field, value)
  if (available === null) return '—'
  return field === 'loss' || field === 'yield' ? formatPercent(available, 2) : formatNumber(available, 2)
}

interface DisplayParameter {
  field: MasterDataNumericField
  value: number | null
  display: string
  percentage: boolean
}

function parameterValues(row: CandidateTableRow, status: ComparisonStatus | null, pair: CostBreakdownComparisonPair): DisplayParameter[] {
  const display = (field: MasterDataNumericField, before: number | null | undefined, after: number | null | undefined): DisplayParameter => {
    const beforeValue = validParameter(field, before)
    const afterValue = validParameter(field, after)
    const percentage = field === 'loss' || field === 'yield'
    let rawValue: number | null = null
    let visible = '—'

    if (status === 'ADDED') {
      rawValue = afterValue
      if (rawValue !== null) visible = formatParameterValue(field, rawValue)
    } else if (status === 'REMOVED') {
      rawValue = beforeValue
      if (rawValue !== null) visible = formatParameterValue(field, rawValue)
    } else if ((status === 'CHANGED' || status === 'UNCHANGED') && beforeValue !== null && afterValue !== null) {
      const difference = afterValue - beforeValue
      if (Number.isFinite(difference)) {
        rawValue = difference
        visible = percentage ? formatPercent(difference, 2) : formatVariance(difference, 2)
      }
    }

    return { field, value: rawValue === null ? null : percentage ? rawValue * 100 : rawValue, display: visible, percentage }
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
  const { headerViewportRef, syncHeaderScroll } = useSynchronizedTableHeader()
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
  const selectionState = getRowSelectionState(selectedKeys, visibleKeys)

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
    onSetFindingSelection(type, nextKeys)
  }

  const toggleOne = (key: string) => onToggleFinding?.(type, key)

  const handleHeaderSelection = () => {
    applySelection(applyRowSelectionScope(selectedKeys, visibleKeys, selectionState !== 'all'))
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

  const tableClassName = `w-full ${isBOM ? 'min-w-[1240px]' : 'min-w-[1260px]'} table-fixed text-left text-[10px]`

  return <div className="border border-slate-200">
    <StickyTableHeader
      ariaLabel={`${identityHeader} candidate findings column headers`}
      tableClassName={tableClassName}
      headerViewportRef={headerViewportRef}
      topClassName="top-0 lg:top-[var(--cbd-table-header-top)]"
      backgroundClassName="bg-slate-800"
    >
      <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
      <thead>
        <tr className="bg-slate-800 font-semibold text-white">
          <th scope="col" className="px-1 py-2 text-center">
            <RowSelectionButton
              size={32}
              ref={headerSelectionRef}
              state={selectionState}
              label={selectionState === 'all' ? `Deselect all visible ${identityHeader} findings` : `Select all visible ${identityHeader} findings`}
              disabled={visibleKeys.length === 0}
              onClick={handleHeaderSelection}
            />
          </th>
          <th scope="col" className="overflow-hidden px-2.5 py-2">{identityHeader}</th>
          <th scope="col" className="whitespace-nowrap px-1 py-2 text-left">Status</th>
          {parameterHeaders.map(header => <th key={header} scope="col" className="whitespace-nowrap px-1 py-2"><span className={header.includes('Loss') || header.includes('Yield') ? 'grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1' : 'block'}><NumericColumnHeader>{header}</NumericColumnHeader>{(header.includes('Loss') || header.includes('Yield')) && <span aria-hidden="true" />}</span></th>)}
          <th scope="col" className="whitespace-nowrap px-1 py-2"><NumericColumnHeader>Gap</NumericColumnHeader></th>
          <th scope="col" className="whitespace-nowrap px-1 py-2"><span className="grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1"><NumericColumnHeader>%GAP</NumericColumnHeader><span aria-hidden="true" /></span></th>
          <th scope="col" className="px-1 py-2 text-center"><span className="sr-only">Reorder</span></th>
          <th scope="col" className="px-1 py-2 text-center"><span className="sr-only">Details</span></th>
        </tr>
      </thead>
    </StickyTableHeader>
    <div className="overflow-x-auto" onScroll={syncHeaderScroll}>
    <table className={tableClassName}>
      <caption className="sr-only">{identityHeader} Candidate findings. CHANGED parameter columns show After minus Before; ADDED and REMOVED rows show the present-side value. CHANGED rows expand {COMPARISON_ROLE_LABELS[pair.beforeRole]}, {COMPARISON_ROLE_LABELS[pair.afterRole]}, and Parameter Cost Effect details.</caption>
      <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
      <thead className="sr-only">
        <tr>
          <th scope="col">Select</th><th scope="col">{identityHeader}</th><th scope="col">Status</th>
          {parameterHeaders.map(header => <th key={header} scope="col">{header}</th>)}
          <th scope="col">Gap</th><th scope="col">%GAP</th><th scope="col">Reorder</th><th scope="col">Details</th>
        </tr>
      </thead>
      <tbody className="font-mono tabular-nums">
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
            const selectionIdPrefix = `cbd:${pair.fingerprint}:candidate:${type}:${encodeURIComponent(row.key)}`
            const gapLabel = `${identityHeader} ${row.label} Gap ${row.gap === null ? 'unavailable' : formatVariance(row.gap, 2)} THB/pc`
            const percentRatio = candidatePercentRatio(row.gap, totalGap)
            const percentDisplay = percentRatio === null ? '—' : formatPercent(percentRatio, 2)
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
                className={`group ${selected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'} ${canExpand ? 'cursor-pointer' : 'cursor-default'} ${dropTarget?.key === row.key ? dropTarget.after ? 'border-b-2 border-slate-200' : 'border-t-2 border-slate-200' : ''} border-b border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700`}
              >
                <td className="px-1 py-2 text-center">
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
                {parameters.map((parameter, parameterIndex) => <td key={parameter.field} className="whitespace-nowrap px-1 py-2 text-right"><SelectedNumber numericColumn signPositive={status === 'CHANGED'}
                  value={parameter.value}
                  percentage={parameter.percentage}
                  selectionId={`${selectionIdPrefix}:parameter:${parameter.field}`}
                  aria-label={`${identityHeader} ${row.label} ${parameterHeaders[parameterIndex]} ${parameter.display}`}
                  className="text-right"
                >{parameter.display}</SelectedNumber></td>)}
                <td aria-label={gapLabel} className={`whitespace-nowrap px-1 py-2 text-right ${gapTextClass(row.gap)}`}><SelectedNumber numericColumn signPositive
                  value={row.gap}
                  selectionId={`${selectionIdPrefix}:gap`}
                  aria-label={gapLabel}
                  className={`text-right ${gapTextClass(row.gap)}`}
                >{row.gap === null ? '—' : formatVariance(row.gap, 2)}</SelectedNumber></td>
                <td aria-label={`${identityHeader} ${row.label} percent Gap ${percentDisplay}`} className="whitespace-nowrap px-1 py-2 text-right text-slate-700"><SelectedNumber numericColumn signPositive
                  value={percentRatio === null ? null : percentRatio * 100}
                  percentage
                  selectionId={`${selectionIdPrefix}:percent-gap`}
                  aria-label={`${identityHeader} ${row.label} percent Gap ${percentDisplay}`}
                  className="text-right text-slate-700"
                >{percentDisplay}</SelectedNumber></td>
                <td className="px-1 py-2 text-center">
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
                      className={`inline-flex h-8 w-7 shrink-0 select-none items-center justify-center rounded-sm ${draggingKeys.has(row.key) ? 'cursor-grabbing text-slate-700' : 'cursor-grab text-slate-400'} hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing`}
                    ><GripVertical aria-hidden="true" className="h-4 w-4" /></button>
                  </Tooltip>
                </td>
                <td className="px-1 py-2 text-center">
                  {canExpand && <span aria-hidden="true" className="inline-flex text-slate-500">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>}
                </td>
              </tr>
              {isExpanded && (rowType === 'bom'
                ? <BOMRecordDetails
                    row={row.detail as BOMItemizedRow}
                    beforeRoleLabel={COMPARISON_ROLE_LABELS[pair.beforeRole]}
                    afterRoleLabel={COMPARISON_ROLE_LABELS[pair.afterRole]}
                    selectionIdPrefix={selectionIdPrefix}
                    detailId={detailId}
                  />
                : <RoutingRecordDetails
                    row={row.detail as RoutingItemizedRow}
                    referenceRates={pair.before.rates}
                    currentRates={pair.after.rates}
                    beforeRoleLabel={COMPARISON_ROLE_LABELS[pair.beforeRole]}
                    afterRoleLabel={COMPARISON_ROLE_LABELS[pair.afterRole]}
                    selectionIdPrefix={selectionIdPrefix}
                    detailId={detailId}
                  />)}
            </React.Fragment>
          })}
      </tbody>
    </table>
    </div>
  </div>
}
