import { NumericColumnSlot } from '../../shared/ui/NumericColumnSlot'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Search, Send, X } from 'lucide-react'
import { safeAdd } from '../../core'
import {
  calculateMultiplicativeCostAttribution,
  calculateScenarioBusinessMetrics,
  calculateSnapshotBOMDetail,
  calculateSnapshotRoutingDetail,
  createScenarioFinancialResult,
  createScenarioStory
} from '../../core/calculations'
import type {
  CostSnapshot,
  MasterDataRole,
  ScenarioFinancialResult,
  ScenarioStory,
  SnapshotCost
} from '../../core/types'
import { Tooltip } from '../../shared/ui/Tooltip'
import { COMPARISON_ROLE_LABELS, ComparisonRoleSelector } from '../../shared/ui/ComparisonRoleSelector'
import { SelectedNumber, useSelectedValueSource } from '../../shared/ui/selected-value'
import { formatBusinessNumber } from '../../shared/ui/numeric-display'
import { NumericInput } from '../../shared/ui/NumericInput'
import type { NumericInputProps } from '../../shared/ui/NumericInput'
import { NumericColumnHeader } from '../../shared/ui/NumericColumnHeader'
import { applyRowDragSelection, applyRowSelectionScope, getRowSelectionState } from '../../shared/selection/row-drag-selection'
import { useTransientInteraction } from '../../shared/ui/transient-interactions'
import { RowSelectionButton } from '../../shared/ui/RowSelectionButton'
import { normalizeProductIdentityValue } from '../../core/utils/master-data-effective'
import { parameterEffectPresentation } from './parameter-effect-presentation'
import { EconomicBreakEvenGraphPanel, EconomicSimulationPanel } from './EconomicSimulationPanel'
import { SimulationHistoryInputBoundary } from './SimulationHistoryInputBoundary'
import { SimulationStoryGraph } from './SimulationStoryGraph'
import { calculateEconomicSimulation, type EconomicSimulationField } from './simulation-economics'
import type { SimulationComparisonRow, SimulationRecordKind } from './simulation-engine'
import { calculateParameterSimulation } from './simulation-engine'
import { simulationParameterStatus, simulationWorkingTargetKey, type SimulationDatasetView, type SimulationParameter } from './simulation-state'

interface SimulationPageProps {
  productId: string
  state: SimulationDatasetView
  workingSelection: string[]
  analysisBeforeDataset: SimulationDatasetView
  analysisAfterDataset: SimulationDatasetView
  effectiveDatasets: Record<MasterDataRole, SimulationDatasetView>
  onSelectActiveDataset: (role: MasterDataRole) => void
  onChangeComparison: (before: MasterDataRole, after: MasterDataRole) => void
  onSend: () => void
  onSendAll: () => void
  onReset: () => void
  onResetAll: () => void
  onUpdateParameter: (recordId: string, parameter: SimulationParameter, value: number | null, exactValue?: string) => void
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onSetWorkingSelection: (selection: readonly string[]) => void
  onUpdateEconomicInput: (role: MasterDataRole, field: EconomicSimulationField, value: string) => void
  onBeginEdit: (role: MasterDataRole) => void
  onCommitEdit: () => void
}

const BOM_PARAMETERS = [
  { parameter: 'bom.price', field: 'price', label: 'Price', scale: 1, effectKey: 'price' },
  { parameter: 'bom.consumption', field: 'consumption', label: 'Usage', scale: 1, effectKey: 'usage' },
  { parameter: 'bom.loss', field: 'loss', label: 'Loss', scale: 100, effectKey: 'loss' }
] as const

const RTG_PARAMETERS = [
  { parameter: 'routing.manning', field: 'manning', label: 'Manning', scale: 1, effectKey: 'manning' },
  { parameter: 'routing.capacity', field: 'capacity', label: 'Capacity', scale: 1, effectKey: 'capacity' },
  { parameter: 'routing.yield', field: 'yield', label: 'Yield', scale: 100, effectKey: 'yield' }
] as const

type EffectValues = ReturnType<typeof calculateMultiplicativeCostAttribution>

type ResultSemantic = 'cost' | 'neutral' | 'profit'

function resultChangeClass(value: number | null, semantic: ResultSemantic): string {
  if (value === null || !Number.isFinite(value)) return 'text-slate-400'
  if (value === 0 || semantic === 'neutral') return 'text-slate-700'
  const favorable = semantic === 'cost' ? value < 0 : value > 0
  return favorable ? 'text-emerald-700' : 'text-rose-700'
}

function isInteractiveTarget(target: EventTarget | null, row: Element): boolean {
  if (!(target instanceof Element)) return false
  const control = target.closest('input, button, select, textarea, label, summary, a[href], [role="button"], [role="menuitem"], [contenteditable="true"], [data-safe-workspace-interaction="true"]')
  return control !== null && control !== row && row.contains(control)
}

function singleRecord<T extends { id: string }>(records: T[], id: string | undefined): T | undefined {
  if (!id) return undefined
  const matches = records.filter(record => record.id === id)
  return matches.length === 1 ? matches[0] : undefined
}

function rowStatusText(row: SimulationComparisonRow, parameterStatus: 'CHANGED' | 'UNCHANGED' | null): string {
  if (row.identityIssue === 'ambiguous') return 'Ambiguous identity · protected'
  if (row.identityIssue === 'unmatched') return 'Missing identity · protected'
  return parameterStatus ?? '—'
}

function statusTextClass(status: string): string {
  return `font-sans text-[10px] font-bold ${status === 'CHANGED' ? 'text-amber-700' : 'text-slate-500'}`
}

function rowIsMatched(row: SimulationComparisonRow): boolean {
  return row.identityIssue === null && (row.status === 'CHANGED' || row.status === 'UNCHANGED')
}

function rowIsSelectable(row: SimulationComparisonRow): boolean {
  return row.identityIssue === null && (row.status === 'CHANGED' || row.status === 'UNCHANGED' || row.status === 'ADDED')
}

function bomAttribution(
  row: SimulationComparisonRow,
  baselineSnapshot: CostSnapshot,
  simulationSnapshot: CostSnapshot
): { simCost: number | null; effects: EffectValues } {
  const empty: EffectValues = { totalEffect: null, effects: null, shares: null }
  const simRecord = singleRecord(simulationSnapshot.bom, row.afterRecordId)
  if (!simRecord) return { simCost: null, effects: empty }
  const simCost = calculateSnapshotBOMDetail({ current: simRecord }).currentCost
  if (!rowIsMatched(row)) return { simCost, effects: empty }
  const baselineRecord = singleRecord(baselineSnapshot.bom, row.beforeRecordId)
  if (!baselineRecord) return { simCost, effects: empty }
  const pair = calculateSnapshotBOMDetail({ reference: baselineRecord, current: simRecord })
  const hasInputs = [baselineRecord.price, simRecord.price, baselineRecord.consumption, simRecord.consumption, baselineRecord.loss, simRecord.loss]
    .every(value => value !== null && Number.isFinite(value))
  if (!hasInputs) return { simCost, effects: empty }
  const attribution = calculateMultiplicativeCostAttribution(pair.referenceCost, pair.currentCost, [
    { key: 'price', baseline: baselineRecord.price!, target: simRecord.price! },
    { key: 'usage', baseline: baselineRecord.consumption!, target: simRecord.consumption! },
    { key: 'loss', baseline: 1 + baselineRecord.loss!, target: 1 + simRecord.loss! }
  ])
  return { simCost, effects: attribution }
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function filterSimulationTableRows<T extends { row: { name: string } }>(rows: readonly T[], query: string): T[] {
  const search = normalizeKey(query)
  return search ? rows.filter(({ row }) => normalizeKey(row.name).includes(search)) : [...rows]
}

export function getSimulationTableViewportState(
  rows: readonly { top: number; bottom: number }[],
  viewportTop: number,
  viewportBottom: number,
  scrollPosition?: { top: number; max: number }
) {
  let firstVisible = -1
  let lastVisible = -1
  rows.forEach((row, index) => {
    if (row.bottom > viewportTop && row.top < viewportBottom) {
      if (firstVisible < 0) firstVisible = index
      lastVisible = index
    }
  })
  return {
    start: firstVisible < 0 ? 0 : firstVisible + 1,
    end: lastVisible < 0 ? 0 : lastVisible + 1,
    total: rows.length,
    atTop: scrollPosition ? scrollPosition.top <= 1 : rows.length === 0 || rows[0].top >= viewportTop,
    atBottom: scrollPosition
      ? scrollPosition.top >= scrollPosition.max - 1
      : rows.length === 0 || rows[rows.length - 1].bottom <= viewportBottom
  }
}

function simulationRowBounds(section: HTMLElement): Array<{ top: number; bottom: number }> {
  const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-simulation-row-index]'))
    .filter(row => row.getClientRects().length > 0)
  return rows.map((row, index) => {
    const rect = row.getBoundingClientRect()
    const nextRow = rows[index + 1]
    if (nextRow) return { top: rect.top, bottom: nextRow.getBoundingClientRect().top }
    let bottom = rect.bottom
    let sibling = row.nextElementSibling
    while (sibling && !sibling.hasAttribute('data-simulation-row-index')) {
      if (sibling.getClientRects().length > 0) bottom = sibling.getBoundingClientRect().bottom
      sibling = sibling.nextElementSibling
    }
    return { top: rect.top, bottom }
  })
}

function simulationTableScrollHost(body: HTMLDivElement, section: HTMLElement): HTMLElement | Window {
  if (body.scrollHeight > body.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(body).overflowY)) return body
  let ancestor = section.parentElement
  while (ancestor && ancestor !== document.documentElement) {
    if (['auto', 'scroll'].includes(getComputedStyle(ancestor).overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) return ancestor
    ancestor = ancestor.parentElement
  }
  return window
}

function isWindowScrollHost(host: HTMLElement | Window): host is Window {
  return host === window
}

function resolveSimulationCostUnit(referenceSnapshot: CostSnapshot, currentSnapshot: CostSnapshot): string {
  const referenceUnit = referenceSnapshot.product.uom?.trim() ?? ''
  const currentUnit = currentSnapshot.product.uom?.trim() ?? ''
  if (!referenceUnit && !currentUnit) return 'Unit'
  if (!referenceUnit) return currentUnit
  if (!currentUnit || normalizeProductIdentityValue(referenceUnit) === normalizeProductIdentityValue(currentUnit)) return referenceUnit
  return 'Unit'
}

function routingAttribution(
  row: SimulationComparisonRow,
  baselineSnapshot: CostSnapshot,
  simulationSnapshot: CostSnapshot
): { simCost: number | null; effects: EffectValues } {
  const empty: EffectValues = { totalEffect: null, effects: null, shares: null }
  const simRecord = singleRecord(simulationSnapshot.routing, row.afterRecordId)
  if (!simRecord) return { simCost: null, effects: empty }
  const simOnly = calculateSnapshotRoutingDetail({ current: simRecord }, simulationSnapshot.rates, simulationSnapshot.rates)
  const simCost = simOnly.currentTotal
  if (!rowIsMatched(row)) return { simCost, effects: empty }
  const baselineRecord = singleRecord(baselineSnapshot.routing, row.beforeRecordId)
  if (!baselineRecord || normalizeKey(baselineRecord.workCenterId) !== normalizeKey(simRecord.workCenterId)) {
    return { simCost, effects: empty }
  }
  const pair = calculateSnapshotRoutingDetail(
    { reference: baselineRecord, current: simRecord },
    baselineSnapshot.rates,
    simulationSnapshot.rates
  )
  const hasInputs = [baselineRecord.manning, simRecord.manning, baselineRecord.capacity, simRecord.capacity, baselineRecord.yield, simRecord.yield]
    .every(value => value !== null && Number.isFinite(value))
  if (!hasInputs || baselineRecord.capacity! <= 0 || simRecord.capacity! <= 0 || baselineRecord.yield! <= 0 || simRecord.yield! <= 0) {
    return { simCost, effects: empty }
  }
  const attribution = calculateMultiplicativeCostAttribution(pair.referenceTotal, pair.currentTotal, [
    { key: 'manning', baseline: baselineRecord.manning!, target: simRecord.manning! },
    { key: 'capacity', baseline: 1 / baselineRecord.capacity!, target: 1 / simRecord.capacity! },
    { key: 'yield', baseline: 1 / baselineRecord.yield!, target: 1 / simRecord.yield! }
  ])
  return { simCost, effects: attribution }
}

const resultActionButton = 'grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-transparent text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function roleLabel(role: MasterDataRole): string {
  return COMPARISON_ROLE_LABELS[role]
}

function CompactActionControl({
  label,
  icon,
  secondaryLabel,
  onPrimary,
  onSecondary
}: {
  label: 'Send' | 'Reset'
  icon: React.ReactNode
  secondaryLabel: 'Send all datasets' | 'Reset all'
  onPrimary: () => void
  onSecondary: () => void
}) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLButtonElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuId = `simulation-${label.toLowerCase()}-actions`
  const helpId = `simulation-${label.toLowerCase()}-all-help`
  const tooltipLabel = label === 'Send' ? 'Send to Master Data' : label
  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }
  const openMenu = (focusAllAction = false) => {
    clearHoverTimer()
    setOpen(true)
    if (focusAllAction) requestAnimationFrame(() => itemRef.current?.focus())
  }
  const close = (restoreFocus = false) => {
    clearHoverTimer()
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useTransientInteraction(open, reason => close(reason === 'escape'))
  useEffect(() => () => clearHoverTimer(), [])
  useSafeLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      const menu = menuRef.current?.getBoundingClientRect()
      if (!trigger || !menu) return
      const centeredLeft = trigger.left + (trigger.width - menu.width) / 2
      const below = trigger.bottom + 4
      const above = trigger.top - menu.height - 4
      const top = below + menu.height <= window.innerHeight - 8 || above < 8
        ? Math.min(below, window.innerHeight - menu.height - 8)
        : above
      setOffset({
        x: Math.max(8, Math.min(centeredLeft, window.innerWidth - menu.width - 8)) - centeredLeft,
        y: top - trigger.bottom
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => setOpen(true), 120)
      }}
      onMouseLeave={() => {
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => {
          if (!rootRef.current?.contains(document.activeElement)) setOpen(false)
        }, 150)
      }}
      onFocusCapture={clearHoverTimer}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
      }}
    >
      <Tooltip label={tooltipLabel}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { close(); onPrimary() }}
          onKeyDown={event => {
            if ((event.altKey && event.key === 'ArrowDown') || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault()
              openMenu(true)
            }
          }}
          aria-label={tooltipLabel}
          aria-expanded={open}
          aria-controls={menuId}
          aria-describedby={helpId}
          aria-keyshortcuts="Alt+ArrowDown"
          className={resultActionButton}
        >
          {icon}
        </button>
      </Tooltip>
      <span id={helpId} className="sr-only">
        Acts on the active dataset. Hover or press Alt plus Down Arrow or Shift plus F10 to access {secondaryLabel}.
      </span>
      <div
        ref={menuRef}
        id={menuId}
        role="group"
        aria-label={`${label} all-dataset action`}
        hidden={!open}
        style={{ marginLeft: `${offset.x}px`, marginTop: `${offset.y}px` }}
        onMouseEnter={clearHoverTimer}
        className="absolute left-1/2 top-full z-50 min-w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 border border-slate-300 bg-white p-1 shadow-lg"
      >
        <button
          ref={itemRef}
          type="button"
          onClick={() => { close(); onSecondary() }}
          className="block min-h-8 w-full whitespace-nowrap px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  )
}

function ParameterNumberSlot({ children, percentage = false, showSuffix = false, className = '', ...props }: React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode
  percentage?: boolean
  showSuffix?: boolean
}) {
  return <NumericColumnSlot {...props} percentage={percentage} showSuffix={showSuffix} suffixAriaHidden className={`pl-[3px] [&>[data-numeric-suffix]]:text-xs [&>[data-numeric-suffix]]:text-slate-500 ${percentage ? 'pr-0' : 'pr-[3px]'} ${className}`}>
    <span className="block min-w-0">{children}</span>
  </NumericColumnSlot>
}

interface SimulationParameterNumericInputProps extends NumericInputProps {
  selectionId: string
  percentage?: boolean
  onBeginEdit: () => void
  onCommitEdit: () => void
}

function SimulationParameterNumericInput({ selectionId, percentage = false, onBeginEdit, onCommitEdit, onValueChange, ...inputProps }: SimulationParameterNumericInputProps) {
  const source = useSelectedValueSource({
    value: inputProps.value,
    exactValue: inputProps.exactValue,
    editable: true,
    domain: {
      integer: inputProps.integer,
      min: inputProps.min,
      max: inputProps.max,
      minExclusive: inputProps.minExclusive
    },
    percentage,
    onValueChange,
    onBeginEdit,
    onCommitEdit,
    allowSubMinimumDraft: inputProps.allowSubMinimumDraft,
    stopAtMinimum: inputProps.stopAtMinimum
  }, selectionId)

  return <NumericInput
    {...inputProps}
    onValueChange={onValueChange}
    data-selected-value-source={selectionId}
    onPointerEnter={source.preview}
    onPointerLeave={source.clearPreview}
    onFocus={source.focus}
    onBlur={event => {
      const nextSourceId = event.relatedTarget instanceof Element
        ? event.relatedTarget.getAttribute('data-selected-value-source')
        : null
      if (nextSourceId !== selectionId) source.blur()
    }}
  />
}

function parameterValueSelectionId(context: string, kind: SimulationRecordKind, recordId: string, field: string) {
  return `simulation:${context}:${kind}:${encodeURIComponent(recordId)}:${field}`
}

function EffectCell({ amount, percentage = false, selectionId, label }: {
  amount: number | null | undefined
  percentage?: boolean
  selectionId: string
  label: string
}) {
  const effect = parameterEffectPresentation(amount)
  return (
    <td className="border-b border-slate-200 whitespace-nowrap py-1.5 text-right font-mono tabular-nums" style={{ paddingLeft: percentage ? 6 : 5, paddingRight: percentage ? 2 : 5 }}>
      {/* Match the parameter frame region and reserve the same suffix slot. */}
      <span className={effect.className}>
        <ParameterNumberSlot percentage={percentage}>
          <SelectedNumber value={amount} signPositive numericColumn selectionId={selectionId} aria-label={label} className="text-[10px]" />
        </ParameterNumberSlot>
      </span>
    </td>
  )
}

interface SimulationSelectionTarget {
  key: string
  recordId: string
}

interface SimulationSelectionDrag {
  anchorKey: string
  targets: SimulationSelectionTarget[]
  rowKeys: string[]
  initialSelection: Set<string>
  selected: boolean
  moved: boolean
}

function SimulationParameterTable({
  kind,
  selectionContext,
  activeRole,
  rows,
  simulationSnapshot,
  baselineSnapshot,
  workingSelection,
  onToggleWorkingTarget,
  onSetWorkingSelection,
  onUpdate,
  onBeginEdit,
  onCommitEdit
}: {
  kind: SimulationRecordKind
  selectionContext: string
  activeRole: MasterDataRole
  rows: SimulationComparisonRow[]
  simulationSnapshot: CostSnapshot
  baselineSnapshot: CostSnapshot
  workingSelection: string[]
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onSetWorkingSelection: (selection: readonly string[]) => void
  onUpdate: (recordId: string, parameter: SimulationParameter, value: number | null, exactValue?: string) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}) {
  const isBOM = kind === 'bom'
  const shortTitle = isBOM ? 'BOM' : 'RTG'
  const navigationLabel = isBOM ? 'BOM' : 'Routing'
  const tableIdentity = isBOM ? 'Bill of Materials' : 'Routing Process'
  const parameters = isBOM ? BOM_PARAMETERS : RTG_PARAMETERS
  const columnWidths = ['5%', '16.5%', '10.6%', '14.5%', '14.5%', '14.5%', '19.4%', '5%']
  const renderColumnGroup = () => (
    <colgroup>
      {columnWidths.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  )
  const sectionRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [hoveredInputFrame, setHoveredInputFrame] = useState<string | null>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const [viewportState, setViewportState] = useState({ start: 0, end: 0, total: 0, atTop: true, atBottom: true })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const [dragRowOrder, setDragRowOrder] = useState<string[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const previousSearchQueryRef = useRef(searchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const selectionDragRef = useRef<SimulationSelectionDrag | null>(null)
  const suppressSelectionClickRef = useRef(false)
  const records: Array<{ id: string }> = isBOM ? simulationSnapshot.bom : simulationSnapshot.routing
  const tableRows = rows.filter(row => row.kind === kind).map((row, sourceIndex) => ({ row, sourceIndex }))
  const filteredRows = filterSimulationTableRows(tableRows, searchQuery)
  const searchField = isBOM ? 'Material' : 'Process'
  const selectedKeys = new Set(workingSelection)
  const getRowKey = (row: SimulationComparisonRow, sourceIndex: number) => `${row.beforeRecordId ?? 'missing'}:${row.afterRecordId ?? 'missing'}:${sourceIndex}`
  const isSelectedRow = (row: SimulationComparisonRow) => Boolean(
    row.afterRecordId && rowIsSelectable(row) && selectedKeys.has(simulationWorkingTargetKey(kind, row.afterRecordId))
  )
  const selectedFirstRows = [...filteredRows].sort((left, right) => Number(isSelectedRow(right.row)) - Number(isSelectedRow(left.row)) || left.sourceIndex - right.sourceIndex)
  const dragRowIndexes = new Map((dragRowOrder ?? []).map((key, index) => [key, index]))
  const orderedRows = dragRowOrder
    ? [...filteredRows].sort((left, right) => (dragRowIndexes.get(getRowKey(left.row, left.sourceIndex)) ?? Number.MAX_SAFE_INTEGER)
      - (dragRowIndexes.get(getRowKey(right.row, right.sourceIndex)) ?? Number.MAX_SAFE_INTEGER) || left.sourceIndex - right.sourceIndex)
    : selectedFirstRows
  const visibleRange = viewportState.total === orderedRows.length
    ? viewportState
    : { start: orderedRows.length > 0 ? 1 : 0, end: Math.min(4, orderedRows.length), total: orderedRows.length, atTop: true, atBottom: orderedRows.length <= 4 }
  const selectableTargets = filteredRows.flatMap(({ row }) => {
    const record = singleRecord(records, row.afterRecordId)
    return record && rowIsSelectable(row)
      ? [{ key: simulationWorkingTargetKey(kind, record.id), recordId: record.id }]
      : []
  })
  const selectionScope = selectableTargets.map(target => target.key)
  const selectionState = getRowSelectionState(selectedKeys, selectionScope)
  const updateHoveredInputFrame = (clientX: number, clientY: number) => {
    const frames = sectionRef.current?.querySelectorAll<HTMLElement>('[data-simulation-input-frame="true"]') ?? []
    let next: string | null = null
    for (const frame of frames) {
      if (!frame.getClientRects().length) continue
      const bounds = frame.getBoundingClientRect()
      if (clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom) {
        next = frame.dataset.simulationInputFrameKey ?? null
        break
      }
    }
    setHoveredInputFrame(previous => previous === next ? previous : next)
  }
  const setAllSelection = () => onSetWorkingSelection(
    [...applyRowSelectionScope(selectedKeys, selectionScope, selectionState !== 'all')]
  )
  const updateViewportState = useCallback(() => {
    const section = sectionRef.current
    const body = bodyRef.current
    if (!section || !body) return
    const rowBounds = simulationRowBounds(section)
    const scrollHost = simulationTableScrollHost(body, section)
    const viewport = isWindowScrollHost(scrollHost)
      ? { top: 0, bottom: window.innerHeight }
      : scrollHost.getBoundingClientRect()
    const scrollPosition = scrollHost === body
      ? { top: body.scrollTop, max: Math.max(0, body.scrollHeight - body.clientHeight) }
      : undefined
    const next = getSimulationTableViewportState(rowBounds, viewport.top, viewport.bottom, scrollPosition)
    setViewportState(previous => previous.start === next.start
      && previous.end === next.end
      && previous.total === next.total
      && previous.atTop === next.atTop
      && previous.atBottom === next.atBottom
      ? previous
      : next)
  }, [])
  useEffect(() => {
    const section = sectionRef.current
    const body = bodyRef.current
    if (!section || !body) return
    const updateLayout = () => {
      setScrollbarWidth(body.offsetWidth - body.clientWidth)
      updateViewportState()
    }
    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(body)
    observer.observe(section)
    const tableBody = section.querySelector('tbody')
    if (tableBody) observer.observe(tableBody)
    window.addEventListener('scroll', updateViewportState, true)
    window.addEventListener('resize', updateLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateViewportState, true)
      window.removeEventListener('resize', updateLayout)
    }
  }, [updateViewportState])
  useSafeLayoutEffect(() => {
    updateViewportState()
  }, [rows, workingSelection, expandedRows, dragRowOrder, updateViewportState])
  useSafeLayoutEffect(() => {
    if (previousSearchQueryRef.current === searchQuery) {
      updateViewportState()
      return
    }
    previousSearchQueryRef.current = searchQuery
    const section = sectionRef.current
    const body = bodyRef.current
    if (!section || !body) return
    const scrollHost = simulationTableScrollHost(body, section)
    if (scrollHost === body) {
      body.scrollTop = 0
    } else {
      const viewportTop = isWindowScrollHost(scrollHost) ? 0 : scrollHost.getBoundingClientRect().top
      const sectionTop = section.getBoundingClientRect().top
      if (isWindowScrollHost(scrollHost)) window.scrollBy({ top: sectionTop - viewportTop, behavior: 'auto' })
      else scrollHost.scrollBy({ top: sectionTop - viewportTop, behavior: 'auto' })
    }
    updateViewportState()
  }, [searchQuery, updateViewportState])

  const moveOneRow = (direction: -1 | 1) => {
    const section = sectionRef.current
    const body = bodyRef.current
    if (!section || !body) return
    const rowBounds = simulationRowBounds(section)
    if (rowBounds.length === 0) return
    const index = visibleRange.start === 0
      ? direction === 1 ? 0 : rowBounds.length - 1
      : direction === 1 ? visibleRange.start - 1 : visibleRange.start - 2
    if (index < 0 || index >= rowBounds.length) return
    const current = rowBounds[index]
    const distance = rowBounds[index + 1]
      ? rowBounds[index + 1].top - current.top
      : current.bottom - current.top
    const scrollHost = simulationTableScrollHost(body, section)
    if (isWindowScrollHost(scrollHost)) window.scrollBy({ top: direction * distance, behavior: 'auto' })
    else scrollHost.scrollBy({ top: direction * distance, behavior: 'auto' })
  }

  const startSelectionDrag = (recordId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const anchorKey = simulationWorkingTargetKey(kind, recordId)
    const targetsByKey = new Map(selectableTargets.map(target => [target.key, target]))
    const targets = orderedRows.flatMap(({ row }) => {
      if (!row.afterRecordId || !rowIsSelectable(row)) return []
      const record = singleRecord(records, row.afterRecordId)
      const target = record ? targetsByKey.get(simulationWorkingTargetKey(kind, record.id)) : undefined
      return target ? [target] : []
    })
    if (!targets.some(target => target.key === anchorKey)) return

    suppressSelectionClickRef.current = false
    selectionDragRef.current = {
      anchorKey,
      targets,
      rowKeys: orderedRows.map(({ row, sourceIndex }) => getRowKey(row, sourceIndex)),
      initialSelection: new Set(workingSelection),
      selected: !selectedKeys.has(anchorKey),
      moved: false
    }
    setDragRowOrder(selectionDragRef.current.rowKeys)
  }

  const extendSelectionDrag = (recordId: string) => {
    const drag = selectionDragRef.current
    if (!drag) return
    const targetKey = simulationWorkingTargetKey(kind, recordId)
    if (targetKey === drag.anchorKey) return
    const anchorIndex = drag.targets.findIndex(target => target.key === drag.anchorKey)
    const targetIndex = drag.targets.findIndex(target => target.key === targetKey)
    if (anchorIndex < 0 || targetIndex < 0) return

    drag.moved = true
    const traversedTargets = drag.targets.slice(Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1)
    const desiredSelection = applyRowDragSelection(
      drag.initialSelection,
      traversedTargets.map(target => target.key),
      drag.selected
    )
    onSetWorkingSelection([...desiredSelection])
  }

  useEffect(() => {
    const finishSelectionDrag = () => {
      const drag = selectionDragRef.current
      if (!drag) return
      if (drag.moved) {
        suppressSelectionClickRef.current = true
        window.setTimeout(() => { suppressSelectionClickRef.current = false }, 0)
      }
      selectionDragRef.current = null
      setDragRowOrder(null)
    }
    window.addEventListener('mouseup', finishSelectionDrag)
    window.addEventListener('blur', finishSelectionDrag)
    return () => {
      window.removeEventListener('mouseup', finishSelectionDrag)
      window.removeEventListener('blur', finishSelectionDrag)
    }
  }, [])

  return (
    <section ref={sectionRef} data-simulation-table={kind} className="min-w-0 border border-slate-300 bg-white xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden" aria-label={tableIdentity}>
      <div className="hidden md:flex xl:shrink-0">
        <table role="presentation" className="w-full min-w-0 flex-1 table-fixed border-separate border-spacing-0 text-[11px]">
          {renderColumnGroup()}
          <thead className="text-[10px] font-semibold text-white [&_th]:bg-slate-900 [&_th]:shadow-[inset_0_-1px_0_#334155]">
            <tr>
              <th scope="col" className="p-0 text-center">
                <RowSelectionButton
                  state={selectionState}
                  label={selectionState === 'all' ? `Clear eligible ${tableIdentity} selection` : `Select all eligible ${tableIdentity} rows`}
                  disabled={selectionScope.length === 0}
                  onClick={setAllSelection}
                />
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-2 text-left">{tableIdentity}</th>
              <th scope="col" className="px-1 py-2 text-left">Status</th>
              {parameters.map(parameter => <th key={parameter.parameter} scope="col" className="py-2" style={{ paddingLeft: parameter.scale === 100 ? 6 : 5, paddingRight: parameter.scale === 100 ? 2 : 5 }}><ParameterNumberSlot percentage={parameter.scale === 100}><NumericColumnHeader>{parameter.label}</NumericColumnHeader></ParameterNumberSlot></th>)}
              <th scope="col" className="whitespace-nowrap py-2 pl-1 pr-2"><NumericColumnHeader>{isBOM ? 'Material Cost' : 'Conversion Cost'}</NumericColumnHeader></th>
              <th scope="col" className="px-0.5 py-2"><span className="sr-only">Expand Parameter Cost Effect</span></th>
            </tr>
          </thead>
        </table>
        <div aria-hidden="true" className="shrink-0 bg-slate-900 shadow-[inset_0_-1px_0_#334155]" style={{ width: scrollbarWidth }} />
      </div>
      <div ref={bodyRef} data-simulation-table-body="true" className="min-h-0 overflow-x-hidden md:overflow-y-visible xl:flex-1 xl:overflow-y-auto xl:[scrollbar-gutter:stable]">
        <table
          className="hidden w-full table-fixed border-separate border-spacing-0 text-[11px] md:table"
          onPointerMove={event => updateHoveredInputFrame(event.clientX, event.clientY)}
          onPointerLeave={() => setHoveredInputFrame(null)}
        >
          <caption className="sr-only">{tableIdentity} Simulation parameters. Selection is a local working aid and does not limit the full Simulation calculation.</caption>
          {renderColumnGroup()}
          <thead className="sr-only">
            <tr>
              <th scope="col">#</th>
              <th scope="col">{tableIdentity}</th>
              <th scope="col">Status</th>
              {parameters.map(parameter => <th key={parameter.parameter} scope="col">{parameter.label}</th>)}
              <th scope="col">{isBOM ? 'Material Cost' : 'Conversion Cost'}</th>
              <th scope="col">Expand Parameter Cost Effect</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {orderedRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500">{normalizeKey(searchQuery) ? `No ${searchField} matches.` : `No ${tableIdentity} rows.`}</td></tr>}
            {orderedRows.map(({ row, sourceIndex }, orderedIndex) => {
              const key = getRowKey(row, sourceIndex)
              const detailId = `${kind}-effect-${encodeURIComponent(key)}`
              const expanded = expandedRows.has(key)
              const simulationRecord = singleRecord(records, row.afterRecordId)
              const canEdit = Boolean(simulationRecord && rowIsSelectable(row))
              const selected = isSelectedRow(row)
              const canExpand = true
              const analysis = isBOM
                ? bomAttribution(row, baselineSnapshot, simulationSnapshot)
                : routingAttribution(row, baselineSnapshot, simulationSnapshot)
              const status = rowStatusText(row, canEdit && simulationRecord ? simulationParameterStatus(kind, simulationRecord.id, simulationSnapshot, baselineSnapshot) : null)
              const toggleExpanded = () => setExpandedRows(previous => {
                const next = new Set(previous)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
              const detailParameters = parameters.map(parameter => ({
                ...parameter,
                amount: analysis.effects.effects?.[parameter.effectKey] ?? null
              }))
              const totalEffect = parameterEffectPresentation(analysis.effects.totalEffect)
              const groupEndClass = 'border-b border-slate-200'

              return (
                <React.Fragment key={key}>
                  <tr
                    data-simulation-row-index={orderedIndex}
                    data-safe-workspace-interaction="true"
                    aria-selected={selected}
                    aria-expanded={canExpand ? expanded : undefined}
                    aria-controls={canExpand && expanded ? detailId : undefined}
                    aria-label={canExpand ? `${tableIdentity}: ${row.name}; ${status}; activate to ${expanded ? 'collapse' : 'expand'} Parameter Cost Effect` : undefined}
                    tabIndex={canExpand ? 0 : undefined}
                    onClick={event => {
                      if (!canExpand || suppressSelectionClickRef.current || isInteractiveTarget(event.target, event.currentTarget)) return
                      toggleExpanded()
                    }}
                    onKeyDown={event => {
                      if (!canExpand || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                      event.preventDefault()
                      toggleExpanded()
                    }}
                    className={`transition-colors ${selected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 ${canExpand ? 'cursor-pointer' : ''}`}
                  >
                    <td data-safe-workspace-interaction="true" className={`p-0 text-center font-normal ${groupEndClass}`}>
                      {canEdit && simulationRecord ? (
                        <button
                          type="button"
                          aria-label={`${selected ? 'Deselect' : 'Select'} ${shortTitle} row ${sourceIndex + 1}: ${row.name}`}
                          aria-pressed={selected}
                          onMouseDown={event => { event.stopPropagation(); startSelectionDrag(simulationRecord.id, event) }}
                          onMouseEnter={() => extendSelectionDrag(simulationRecord.id)}
                          onClick={event => {
                            event.stopPropagation()
                            if (event.detail === 0) {
                              suppressSelectionClickRef.current = false
                              onToggleWorkingTarget(kind, simulationRecord.id)
                              return
                            }
                            if (suppressSelectionClickRef.current) {
                              suppressSelectionClickRef.current = false
                              return
                            }
                            onToggleWorkingTarget(kind, simulationRecord.id)
                          }}
                          className={`inline-grid h-7 min-w-7 place-items-center rounded-sm px-1 font-mono text-[10px] ${selected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                        >{sourceIndex + 1}</button>
                      ) : <span className="font-mono text-[10px] tabular-nums text-slate-500">{sourceIndex + 1}</span>}
                    </td>
                    <th scope="row" className={`break-words px-2 py-2 text-left font-medium text-slate-900 ${groupEndClass}`}>{row.name}</th>
                    <td className={`${row.identityIssue ? 'break-words' : 'whitespace-nowrap'} px-1 py-2 leading-3 ${statusTextClass(status)} ${groupEndClass}`}>{status}</td>
                    {parameters.map(parameter => {
                      const inputFrameKey = `${kind}:${key}:${parameter.parameter}`
                      const recordValue = simulationRecord
                        ? (simulationRecord as unknown as Record<string, number | null>)[parameter.field] ?? null
                        : null
                      const value = recordValue === null ? null : recordValue * parameter.scale
                      const exactValue = simulationRecord
                        ? (simulationRecord as unknown as { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs?.[parameter.field]
                        : undefined
                      return (
                        <td key={parameter.parameter} className={`py-1 text-right ${groupEndClass}`} style={{ paddingLeft: parameter.scale === 100 ? 6 : 5, paddingRight: parameter.scale === 100 ? 2 : 5 }}>
                          {!simulationRecord ? '—' : canEdit ? (
                            <ParameterNumberSlot
                              data-simulation-input-wrapper="true"
                              className="relative group"
                              percentage={parameter.scale === 100}
                              showSuffix
                            >
                              <div className="relative min-w-0 flex-1">
                                <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                                  <>
                                    <SimulationParameterNumericInput
                                      selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord.id, parameter.parameter)}
                                      percentage={parameter.scale === 100}
                                      onBeginEdit={onBeginEdit}
                                      onCommitEdit={onCommitEdit}
                                      value={value}
                                      exactValue={exactValue}
                                      numericColumn
                                      min={0}
                                      minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                      max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                                      allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                      stopAtMinimum
                                      onValueChange={(next, exact) => {
                                        if (next !== null) onUpdate(simulationRecord.id, parameter.parameter, next / parameter.scale, exact)
                                      }}
                                      className="relative z-10 h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent pl-1.5 pr-0 text-right font-mono text-xs tabular-nums text-slate-900 transition-colors"
                                      style={{
                                        outline: 'none',
                                        clipPath: 'inset(0.5px)'
                                      }}
                                      aria-label={`${row.name} ${parameter.label} in ${roleLabel(activeRole)}`}
                                    />
                                    <span
                                      aria-hidden="true"
                                      data-simulation-input-frame="true"
                                      data-simulation-input-frame-key={inputFrameKey}
                                      data-simulation-input-frame-hovered={hoveredInputFrame === inputFrameKey ? 'true' : 'false'}
                                      className={`pointer-events-none absolute inset-y-0 inset-x-0 z-0 rounded-sm border transition-colors ${hoveredInputFrame === inputFrameKey ? 'border-slate-200 bg-slate-50' : 'border-transparent bg-transparent'} group-focus-within:!border-transparent group-focus-within:!bg-white group-focus-within:!outline group-focus-within:!outline-2 group-focus-within:!outline-blue-700 group-focus-within:!outline-offset-[-2px]`}
                                    />
                                  </>
                                </SimulationHistoryInputBoundary>
                              </div>
                            </ParameterNumberSlot>
                          ) : (
                            <ParameterNumberSlot percentage={parameter.scale === 100} showSuffix>
                              <SelectedNumber value={value} percentage={parameter.scale === 100} numericColumn numericColumnSigned={false} selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, parameter.parameter)} aria-label={`${row.name} ${parameter.label}`} className="text-xs" />
                            </ParameterNumberSlot>
                          )}
                        </td>
                      )
                    })}
                    <td className={`py-2 pl-1 pr-2 text-right font-mono text-xs tabular-nums text-slate-900 ${groupEndClass}`}>
                      <SelectedNumber value={analysis.simCost} numericColumn selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, 'calculated-cost')} aria-label={`${row.name} ${isBOM ? 'Material Cost' : 'Conversion Cost'}`} className="text-xs" />
                    </td>
                    <td className={`px-0.5 py-1 text-center ${groupEndClass}`}>
                      {canExpand && (
                        <span aria-hidden="true" className="inline-grid h-7 w-7 place-items-center text-slate-600">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={detailId} data-safe-workspace-interaction="true" className="bg-white">
                      <td aria-hidden="true" className="border-b border-slate-200" />
                      <th scope="row" colSpan={2} className="border-b border-slate-200 py-2 pl-3 pr-2 text-left text-[10px] font-semibold text-slate-700">
                        <span className="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">Parameter Cost Effect</span>
                      </th>
                      {detailParameters.map(parameter => <EffectCell key={parameter.parameter} amount={parameter.amount} percentage={parameter.scale === 100} selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, `effect:${parameter.effectKey}`)} label={`${row.name} ${parameter.label} Parameter Cost Effect`} />)}
                      <td aria-label={`Total ${formatBusinessNumber(analysis.effects.totalEffect, { signPositive: true, integerDigits: Infinity })}`} className="border-b border-slate-200 whitespace-nowrap py-1.5 pl-1 pr-2 text-right text-[10px] font-semibold">
                        <span className={totalEffect.className}>
                          <SelectedNumber
                            value={analysis.effects.totalEffect}
                            signPositive
                            numericColumn
                            selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, 'effect:total')}
                            aria-label={`${row.name} Total Parameter Cost Effect`}
                            sameLineAnnotation={<span className="font-sans text-[10px] text-slate-600 font-normal">Total</span>}
                          />
                        </span>
                      </td>
                      <td className="border-b border-slate-200 px-0.5 py-1" aria-hidden="true" />
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {orderedRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">{normalizeKey(searchQuery) ? `No ${searchField} matches.` : `No ${tableIdentity} rows.`}</p>}
        {orderedRows.map(({ row, sourceIndex }, orderedIndex) => {
          const key = getRowKey(row, sourceIndex)
          const expanded = expandedRows.has(key)
          const simulationRecord = singleRecord(records, row.afterRecordId)
          const canEdit = Boolean(simulationRecord && rowIsSelectable(row))
          const status = rowStatusText(row, canEdit && simulationRecord ? simulationParameterStatus(kind, simulationRecord.id, simulationSnapshot, baselineSnapshot) : null)
          const selected = isSelectedRow(row)
          const canExpand = true
          const detailId = `${kind}-mobile-effect-${encodeURIComponent(key)}`
          const toggleExpanded = () => setExpandedRows(previous => {
            const next = new Set(previous)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
          })
          const analysis = isBOM
            ? bomAttribution(row, baselineSnapshot, simulationSnapshot)
            : routingAttribution(row, baselineSnapshot, simulationSnapshot)
          const totalEffect = parameterEffectPresentation(analysis.effects.totalEffect)
          return (
            <article
              key={key}
              data-simulation-row-index={orderedIndex}
              data-safe-workspace-interaction="true"
              aria-expanded={canExpand ? expanded : undefined}
              aria-controls={canExpand && expanded ? detailId : undefined}
              aria-label={canExpand ? `${tableIdentity}: ${row.name}; ${status}; activate to ${expanded ? 'collapse' : 'expand'} Parameter Cost Effect` : undefined}
              tabIndex={canExpand ? 0 : undefined}
              onClick={event => {
                if (!canExpand || suppressSelectionClickRef.current || isInteractiveTarget(event.target, event.currentTarget)) return
                toggleExpanded()
              }}
              onKeyDown={event => {
                if (!canExpand || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                event.preventDefault()
                toggleExpanded()
              }}
              className={`border-b border-slate-200 px-3 py-2.5 last:border-b-0 transition-colors ${selected ? 'bg-blue-100/60 hover:bg-blue-100/80' : 'bg-white hover:bg-slate-50'} ${canExpand ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700' : ''}`}
            >
              <div className="flex min-w-0 items-start gap-2">
                {canEdit && simulationRecord ? (
                  <button
                    type="button"
                    aria-label={`${selected ? 'Deselect' : 'Select'} ${shortTitle} row ${sourceIndex + 1}: ${row.name}`}
                    aria-pressed={selected}
                    onMouseDown={event => { event.stopPropagation(); startSelectionDrag(simulationRecord.id, event) }}
                    onMouseEnter={() => extendSelectionDrag(simulationRecord.id)}
                    onClick={event => {
                      event.stopPropagation()
                      if (event.detail === 0) {
                        suppressSelectionClickRef.current = false
                        onToggleWorkingTarget(kind, simulationRecord.id)
                        return
                      }
                      if (suppressSelectionClickRef.current) {
                        suppressSelectionClickRef.current = false
                        return
                      }
                      onToggleWorkingTarget(kind, simulationRecord.id)
                    }}
                    className={`min-h-7 min-w-7 shrink-0 rounded-sm px-1 font-mono text-[10px] ${selected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                  >{sourceIndex + 1}</button>
                ) : <span data-safe-workspace-interaction="true" className="min-w-7 pt-1 text-center font-mono text-[10px] text-slate-500">{sourceIndex + 1}</span>}
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-xs font-medium text-slate-900">{row.name}</h3>
                </div>
                {canExpand && (
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center text-slate-600">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div className="min-w-0">
                  <dt className="text-slate-500">Status</dt>
                  <dd className={`break-words ${statusTextClass(status)}`}>{status}</dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-slate-500"><NumericColumnHeader>{isBOM ? 'Material Cost' : 'Conversion Cost'}</NumericColumnHeader></dt>
                  <dd className="font-mono tabular-nums text-slate-900"><SelectedNumber value={analysis.simCost} numericColumn selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, 'calculated-cost')} aria-label={`${row.name} ${isBOM ? 'Material Cost' : 'Conversion Cost'}`} /></dd>
                </div>
              </dl>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                {parameters.map(parameter => {
                  const recordValue = simulationRecord
                    ? (simulationRecord as unknown as Record<string, number | null>)[parameter.field] ?? null
                    : null
                  const value = recordValue === null ? null : recordValue * parameter.scale
                  const exactValue = simulationRecord
                    ? (simulationRecord as unknown as { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs?.[parameter.field]
                    : undefined
                  return (
                    <label key={parameter.parameter} className="block min-w-0 text-[10px] font-medium text-slate-600">
                      <span className="block pl-1.5"><span className={parameter.scale === 100 ? 'grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1' : 'block'}><NumericColumnHeader>{parameter.label}</NumericColumnHeader>{parameter.scale === 100 && <span aria-hidden="true" />}</span></span>
                      {!simulationRecord ? <span className="mt-0.5 block font-mono text-slate-700">—</span> : canEdit ? (
                        <div className="mt-0.5 min-w-0 pl-1.5">
                          <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                            <SimulationParameterNumericInput
                              selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord.id, parameter.parameter)}
                              percentage={parameter.scale === 100}
                              onBeginEdit={onBeginEdit}
                              onCommitEdit={onCommitEdit}
                              value={value}
                              exactValue={exactValue}
                              numericColumn
                              percentSuffix={parameter.scale === 100}
                              min={0}
                              minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                              max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                              allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                              stopAtMinimum
                              onValueChange={(next, exact) => {
                                if (next !== null) onUpdate(simulationRecord.id, parameter.parameter, next / parameter.scale, exact)
                              }}
                              className="h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-1.5 text-right font-mono text-xs tabular-nums text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:!border-transparent focus:bg-white focus:!outline focus:!outline-2 focus:!outline-blue-700 focus:!outline-offset-[-2px]"
                              aria-label={`${row.name} ${parameter.label} in ${roleLabel(activeRole)}`}
                            />
                          </SimulationHistoryInputBoundary>
                        </div>
                      ) : <span className="mt-0.5 block pl-1.5 font-mono text-xs text-slate-700"><SelectedNumber value={value} percentage={parameter.scale === 100} numericColumn numericColumnSigned={false} selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, parameter.parameter)} aria-label={`${row.name} ${parameter.label}`} /></span>}
                    </label>
                  )
                })}
              </div>
              {expanded && (
                <div id={detailId} data-safe-workspace-interaction="true" className="mt-2 border-t border-slate-200 pt-2">
                  <h4 className="mb-1 ml-11 border-l-2 border-slate-300 pl-2 text-[10px] font-semibold text-slate-700">Parameter Cost Effect</h4>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                    {parameters.map(parameter => {
                      const effect = parameterEffectPresentation(analysis.effects.effects?.[parameter.effectKey])
                      return (
                        <div key={parameter.parameter} className="flex min-w-0 items-baseline justify-between gap-2">
                          <dt className="text-slate-600">{parameter.label} effect</dt>
                          <dd className={`shrink-0 font-mono tabular-nums ${effect.className}`}><SelectedNumber value={analysis.effects.effects?.[parameter.effectKey]} signPositive selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, `effect:${parameter.effectKey}`)} aria-label={`${row.name} ${parameter.label} Parameter Cost Effect`}>{formatBusinessNumber(analysis.effects.effects?.[parameter.effectKey], { signPositive: true })}</SelectedNumber></dd>
                        </div>
                      )
                    })}
                    <div className="flex min-w-0 items-baseline justify-between gap-2 border-t border-slate-200 pt-1 font-semibold">
                      <dt className="text-slate-700">Total</dt>
                      <dd className={`shrink-0 font-mono tabular-nums ${totalEffect.className}`}><SelectedNumber value={analysis.effects.totalEffect} signPositive selectionId={parameterValueSelectionId(selectionContext, kind, simulationRecord?.id ?? row.afterRecordId ?? row.beforeRecordId ?? key, 'effect:total')} aria-label={`${row.name} Total Parameter Cost Effect`}>{formatBusinessNumber(analysis.effects.totalEffect, { signPositive: true })}</SelectedNumber></dd>
                    </div>
                  </dl>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <footer data-simulation-table-footer={kind} className="min-w-0 border-t border-slate-300 bg-slate-100 px-2 py-1 text-[10px] text-slate-600 xl:shrink-0 md:px-0">
        <div
          className="flex min-w-0 items-center justify-between gap-2 md:grid md:gap-0"
          style={{ width: `calc(100% - ${scrollbarWidth}px)`, gridTemplateColumns: columnWidths.join(' ') }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1 md:col-span-4 md:pl-2">
            <div className="relative h-6 w-40 min-w-0 shrink-0 sm:w-48">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                aria-label={`Search ${shortTitle} by ${searchField}`}
                placeholder={searchField}
                className="search-clear-control h-6 w-full min-w-0 rounded-sm border border-slate-300 bg-white pl-7 pr-7 text-[10px] text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  aria-label={`Clear ${searchField} search`}
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-[3px] top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 cursor-pointer place-items-center rounded-sm text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700"
                >
                  <X aria-hidden="true" className="h-[9px] w-[9px]" />
                </button>
              )}
            </div>
          </div>
          <span aria-live="polite" className="shrink-0 whitespace-nowrap font-mono tabular-nums text-slate-600 md:col-start-7 md:mr-6 md:justify-self-end">
            {visibleRange.total === 0 ? '0 of 0' : visibleRange.start === 0 ? `0 of ${visibleRange.total}` : `${visibleRange.start}–${visibleRange.end} of ${visibleRange.total}`}
          </span>
          <div className="relative flex h-6 w-12 shrink-0 items-center md:col-start-8 md:w-6 md:justify-self-center">
            <button
              type="button"
              aria-label={`Previous ${navigationLabel} row`}
              disabled={visibleRange.atTop}
              onClick={() => moveOneRow(-1)}
              className="grid h-6 w-6 place-items-center rounded-sm text-slate-700 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300 md:absolute md:right-full md:top-0"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Next ${navigationLabel} row`}
              disabled={visibleRange.atBottom}
              onClick={() => moveOneRow(1)}
              className="grid h-6 w-6 place-items-center rounded-sm text-slate-700 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300 md:absolute md:left-0 md:top-0"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </section>
  )
}

function ResultPanel({
  selectionContext,
  beforeRole,
  afterRole,
  beforeCost,
  afterCost,
  beforeFinancial,
  afterFinancial,
  onChangeComparison,
  actions
}: {
  selectionContext: string
  beforeRole: MasterDataRole
  afterRole: MasterDataRole
  beforeCost: SnapshotCost
  afterCost: SnapshotCost
  beforeFinancial: ScenarioFinancialResult
  afterFinancial: ScenarioFinancialResult
  onChangeComparison: (before: MasterDataRole, after: MasterDataRole) => void
  actions: React.ReactNode
}) {
  const beforeConversion = beforeCost.labor === null || beforeCost.burden === null ? null : safeAdd(beforeCost.labor, beforeCost.burden)
  const afterConversion = afterCost.labor === null || afterCost.burden === null ? null : safeAdd(afterCost.labor, afterCost.burden)
  const rows = [
    { label: 'Material', before: beforeCost.material, after: afterCost.material, semantic: 'cost' as const },
    { label: 'Labor', before: beforeCost.labor, after: afterCost.labor, semantic: 'cost' as const },
    { label: 'Burden', before: beforeCost.burden, after: afterCost.burden, semantic: 'cost' as const },
    { label: 'Conversion', before: beforeConversion, after: afterConversion, semantic: 'cost' as const, subtotal: true },
    { label: 'Standard Cost', before: beforeCost.total, after: afterCost.total, semantic: 'cost' as const, total: true }
  ]
  const businessRows = [
    { label: 'Selling Price', before: beforeFinancial.sellingPrice, after: afterFinancial.sellingPrice, semantic: 'neutral' as const },
    { label: 'SG&A', before: beforeFinancial.sgaAmountPerPiece, after: afterFinancial.sgaAmountPerPiece, semantic: 'neutral' as const },
    { label: 'Operating Profit', before: beforeFinancial.operatingProfitPerPiece, after: afterFinancial.operatingProfitPerPiece, semantic: 'profit' as const }
  ]
  const formatRows = (items: typeof rows | typeof businessRows) => items.map(row => {
    const before = row.before !== null && Number.isFinite(row.before) ? row.before : null
    const after = row.after !== null && Number.isFinite(row.after) ? row.after : null
    const change = before === null || after === null ? null : safeAdd(after, -before)
    const rawPercent = change === null || before === null || before === 0 ? null : change / before * 100
    const percent = rawPercent !== null && Number.isFinite(rawPercent) ? rawPercent : null
    return { ...row, before, after, change, percent }
  })
  const costRows = formatRows(rows)
  const formattedBusinessRows = formatRows(businessRows)
  const renderRows = (items: typeof costRows | typeof formattedBusinessRows) => items.map(row => {
    const subtotal = 'subtotal' in row && row.subtotal
    const padding = subtotal ? 'py-0.5' : 'py-px'
    const sourceId = (column: string) => `simulation:${selectionContext}:result:${row.label}:${column}`
    return (
      <tr key={row.label} className={
        'total' in row && row.total
          ? 'border-t border-slate-300 font-semibold text-slate-950 !border-slate-300'
          : subtotal
            ? 'border-t border-slate-300 font-semibold text-slate-800 !border-slate-300'
            : 'text-slate-700'
      }>
        <th scope="row" className={`whitespace-nowrap ${padding} text-left`}>{row.label}</th>
        <td className={`whitespace-nowrap px-px ${padding} text-right font-mono tabular-nums`}>
          <SelectedNumber value={row.before} numericColumn selectionId={sourceId('before')} aria-label={`${row.label} Before`} />
        </td>
        <td className={`whitespace-nowrap px-px ${padding} text-right font-mono tabular-nums`}>
          <SelectedNumber value={row.after} numericColumn selectionId={sourceId('after')} aria-label={`${row.label} After`} />
        </td>
        <td className={`px-0.5 ${padding} text-right font-mono tabular-nums ${resultChangeClass(row.change, row.semantic)}`}>
          <SelectedNumber value={row.change} signPositive numericColumn selectionId={sourceId('change')} aria-label={`${row.label} Change`} />
        </td>
        <td className={`${padding} text-right font-mono tabular-nums ${resultChangeClass(row.percent === null ? null : row.change, row.semantic)}`}>
          {row.percent === null ? '—' : (
            <SelectedNumber value={row.percent} percentage signPositive numericColumn selectionId={sourceId('percent')} aria-label={`${row.label} percent change`} />
          )}
        </td>
      </tr>
    )
  })

  return (
    <section data-safe-workspace-interaction="true" className="flex min-w-0 flex-col border border-slate-300 bg-white px-3 py-2 xl:min-h-0 xl:px-1 xl:py-1" aria-labelledby="simulation-result-title">
      <h2 id="simulation-result-title" className="sr-only">Result</h2>
      <header
        data-simulation-result-header="true"
        className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-slate-200 pb-1.5 xl:flex-nowrap xl:gap-x-1"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1 xl:flex-nowrap">
          <div
            role="group"
            aria-label={`Result comparison, Before ${roleLabel(beforeRole)}, After ${roleLabel(afterRole)}`}
            className="flex min-w-0 flex-wrap items-center gap-1 xl:flex-nowrap"
          >
            <ComparisonRoleSelector side="Before" role={beforeRole} onChange={role => onChangeComparison(role, afterRole)} />
            <span aria-hidden="true" className="w-3 text-center text-sm font-semibold text-slate-500">→</span>
            <ComparisonRoleSelector side="After" role={afterRole} onChange={role => onChangeComparison(beforeRole, role)} />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
      </header>
      <div data-simulation-result-body="true" className="mt-1 min-w-0">
        <style>{`
          @media (max-width: 767px) {
            [data-simulation-result-body] table,
            [data-simulation-result-body] thead,
            [data-simulation-result-body] tbody { display: block; }
            [data-simulation-result-body] colgroup { display: none; }
            [data-simulation-result-body] tr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.08fr) minmax(0, 1.18fr); }
            [data-simulation-result-body] th:first-child { grid-column: 1 / -1; white-space: normal; }
            [data-simulation-result-body] tbody th { padding-top: 3px; }
          }
        `}</style>
        <table className="w-full table-fixed text-[9px] leading-3 xl:leading-[11px]">
          <colgroup>
            <col className="w-[23%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[21%]" />
          </colgroup>
          <thead className="text-[8px] text-slate-500">
            <tr>
              <th scope="col" className="whitespace-nowrap py-0.5 text-left font-medium">Cost / Unit</th>
              <th scope="col" className="whitespace-nowrap px-px py-0.5 font-medium xl:py-0"><NumericColumnHeader>Before</NumericColumnHeader><span className="sr-only"> {roleLabel(beforeRole)}</span></th>
              <th scope="col" className="whitespace-nowrap px-px py-0.5 font-medium xl:py-0"><NumericColumnHeader>After</NumericColumnHeader><span className="sr-only"> {roleLabel(afterRole)}</span></th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-0.5 font-medium xl:py-0"><NumericColumnHeader>Change</NumericColumnHeader></th>
              <th scope="col" className="py-0.5 font-medium xl:py-0"><span className="grid grid-cols-[minmax(0,1fr)_0.6rem] gap-1"><NumericColumnHeader>%</NumericColumnHeader><span aria-hidden="true" /></span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {renderRows(costRows)}
            <tr><th scope="rowgroup" colSpan={5} className="border-b border-t border-slate-200 py-0.5 text-left text-[9px] font-semibold text-slate-700">Business Outcome / Unit</th></tr>
            {renderRows(formattedBusinessRows)}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function createStory(effectiveDatasets: Record<MasterDataRole, SimulationDatasetView>): ScenarioStory {
  const financialFor = (role: MasterDataRole): ScenarioFinancialResult => {
    const dataset = effectiveDatasets[role]
    const cost = calculateParameterSimulation(dataset.snapshot, dataset.snapshot).afterCost
    const economics = calculateEconomicSimulation(dataset.snapshot, cost, null, dataset.economicInputs)
    return createScenarioFinancialResult(cost, economics.business)
  }
  return createScenarioStory(
    financialFor('reference'),
    financialFor('current'),
    financialFor('custom')
  )
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  productId,
  state,
  workingSelection,
  analysisBeforeDataset,
  analysisAfterDataset,
  effectiveDatasets,
  onSelectActiveDataset,
  onChangeComparison,
  onSend,
  onSendAll,
  onReset,
  onResetAll,
  onUpdateParameter,
  onToggleWorkingTarget,
  onSetWorkingSelection,
  onUpdateEconomicInput,
  onBeginEdit,
  onCommitEdit
}) => {
  const simulationSnapshot = state.snapshot
  const result = useMemo(
    () => simulationSnapshot ? calculateParameterSimulation(state.baselineSnapshot, simulationSnapshot) : null,
    [simulationSnapshot, state.baselineSnapshot]
  )
  const analysisResult = useMemo(
    () => calculateParameterSimulation(analysisBeforeDataset.snapshot, analysisAfterDataset.snapshot),
    [analysisAfterDataset.snapshot, analysisBeforeDataset.snapshot]
  )
  const economicResult = useMemo(
    () => calculateEconomicSimulation(
      analysisAfterDataset.snapshot,
      analysisResult.afterCost,
      analysisResult.parameterSavingPerPiece,
      analysisAfterDataset.economicInputs
    ),
    [analysisAfterDataset, analysisResult]
  )
  const comparisonBeforeFinancial = useMemo(() => createScenarioFinancialResult(
    analysisResult.beforeCost,
    calculateScenarioBusinessMetrics({
      sellingPrice: analysisBeforeDataset.snapshot.product.sellingPrice ?? null,
      sgaPercent: analysisBeforeDataset.snapshot.product.sgaPercent ?? null
    }, analysisResult.beforeCost.total)
  ), [analysisBeforeDataset, analysisResult])
  const comparisonAfterFinancial = useMemo(
    () => createScenarioFinancialResult(analysisResult.afterCost, economicResult.business),
    [analysisResult, economicResult]
  )
  const story = useMemo(() => createStory(effectiveDatasets), [effectiveDatasets])

  if (!simulationSnapshot || !result || !economicResult || !story) {
    return <div role="status" className="py-8 text-sm text-slate-600">Simulation is initializing.</div>
  }

  const unit = resolveSimulationCostUnit(analysisBeforeDataset.snapshot, analysisAfterDataset.snapshot)
  const resultSelectionContext = `${productId}:comparison:${analysisBeforeDataset.role}:${analysisBeforeDataset.snapshot.id}:${analysisAfterDataset.role}:${analysisAfterDataset.snapshot.id}`
  const economicSelectionContext = `${productId}:economic:${analysisAfterDataset.role}:${analysisAfterDataset.snapshot.id}`
  const parameterSelectionContext = `${productId}:parameters:${state.role}:${simulationSnapshot.id}:${state.baselineSnapshot.id}`
  const graphSelectionContext = `${productId}:graph:${effectiveDatasets.reference.snapshot.id}:${effectiveDatasets.current.snapshot.id}:${effectiveDatasets.custom.snapshot.id}`

  const actionMenus = (
    <>
      <CompactActionControl
        label="Send"
        icon={<Send aria-hidden="true" className="h-4 w-4" />}
        secondaryLabel="Send all datasets"
        onPrimary={onSend}
        onSecondary={onSendAll}
      />
      <CompactActionControl
        label="Reset"
        icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
        secondaryLabel="Reset all"
        onPrimary={onReset}
        onSecondary={onResetAll}
      />
    </>
  )

  return (
    <div data-simulation-layout-root="true" className="min-w-0 space-y-3 xl:grid xl:h-full xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-2 xl:space-y-0 xl:overflow-hidden">
      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-cols-[minmax(0,2.65fr)_minmax(0,1.63fr)_minmax(max-content,.85fr)] xl:grid-rows-1">
        <SimulationStoryGraph story={story} unit={unit} selectionContext={graphSelectionContext} activeRole={state.role} onSelectActiveDataset={onSelectActiveDataset} />
        <div data-simulation-layout-column="result-and-break-even" className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
          <ResultPanel
            selectionContext={resultSelectionContext}
            beforeRole={analysisBeforeDataset.role}
            afterRole={analysisAfterDataset.role}
            beforeCost={analysisResult.beforeCost}
            afterCost={analysisResult.afterCost}
            beforeFinancial={comparisonBeforeFinancial}
            afterFinancial={comparisonAfterFinancial}
            onChangeComparison={onChangeComparison}
            actions={actionMenus}
          />
          <EconomicBreakEvenGraphPanel
            result={economicResult}
            unit={unit}
            batchSizeExactValue={analysisAfterDataset.economicInputs.batchSize}
            selectionContext={economicSelectionContext}
            onBatchSizeChange={value => onUpdateEconomicInput(analysisAfterDataset.role, 'batchSize', value)}
            onBeginEdit={() => onBeginEdit(analysisAfterDataset.role)}
            onCommitEdit={onCommitEdit}
          />
        </div>
        <EconomicSimulationPanel
          selectionContext={economicSelectionContext}
          result={economicResult}
          draft={analysisAfterDataset.economicInputs}
          afterSnapshot={analysisAfterDataset.snapshot}
          unit={unit}
          onUpdate={(field, value) => onUpdateEconomicInput(analysisAfterDataset.role, field, value)}
          onBeginEdit={() => onBeginEdit(analysisAfterDataset.role)}
          onCommitEdit={onCommitEdit}
        />
      </div>

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-cols-2 xl:grid-rows-1 xl:items-stretch">
        <SimulationParameterTable
          kind="bom"
          selectionContext={parameterSelectionContext}
          activeRole={state.role}
          rows={result.records}
          simulationSnapshot={simulationSnapshot}
          baselineSnapshot={state.baselineSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onSetWorkingSelection={onSetWorkingSelection}
          onUpdate={onUpdateParameter}
          onBeginEdit={() => onBeginEdit(state.role)}
          onCommitEdit={onCommitEdit}
        />
        <SimulationParameterTable
          kind="routing"
          selectionContext={parameterSelectionContext}
          activeRole={state.role}
          rows={result.records}
          simulationSnapshot={simulationSnapshot}
          baselineSnapshot={state.baselineSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onSetWorkingSelection={onSetWorkingSelection}
          onUpdate={onUpdateParameter}
          onBeginEdit={() => onBeginEdit(state.role)}
          onCommitEdit={onCommitEdit}
        />
      </div>
    </div>
  )
}
