import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Send } from 'lucide-react'
import { formatNumber, safeAdd } from '../../core'
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
import { NumericInput } from '../../shared/ui/NumericInput'
import { applyRowDragSelection } from '../../shared/selection/row-drag-selection'
import { useTransientInteraction } from '../../shared/ui/transient-interactions'
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
  onUpdateParameter: (recordId: string, parameter: SimulationParameter, value: number | null) => void
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onUpdateEconomicInput: (role: MasterDataRole, field: EconomicSimulationField, value: string) => void
  onBeginEdit: (role: MasterDataRole) => void
  onCommitEdit: () => void
}

const ROLES: Array<{ role: MasterDataRole; label: string }> = [
  { role: 'reference', label: 'Reference' },
  { role: 'current', label: 'Current' },
  { role: 'custom', label: 'Custom' }
]

const BOM_PARAMETERS = [
  { parameter: 'bom.price', field: 'price', label: 'Price', precision: 2, scale: 1, effectKey: 'price' },
  { parameter: 'bom.consumption', field: 'consumption', label: 'Usage', precision: 4, scale: 1, effectKey: 'usage' },
  { parameter: 'bom.loss', field: 'loss', label: 'Loss', precision: 2, scale: 100, effectKey: 'loss' }
] as const

const RTG_PARAMETERS = [
  { parameter: 'routing.manning', field: 'manning', label: 'Manning', precision: 2, scale: 1, effectKey: 'manning' },
  { parameter: 'routing.capacity', field: 'capacity', label: 'Capacity', precision: 4, scale: 1, effectKey: 'capacity' },
  { parameter: 'routing.yield', field: 'yield', label: 'Yield', precision: 2, scale: 100, effectKey: 'yield' }
] as const

type EffectValues = ReturnType<typeof calculateMultiplicativeCostAttribution>

function displayMoney(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

function displayResultDelta(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatNumber(value, 2)}`
}

type ResultSemantic = 'cost' | 'neutral' | 'profit'

function resultChangeClass(value: number | null, semantic: ResultSemantic): string {
  if (value === null || !Number.isFinite(value)) return 'text-slate-400'
  if (value === 0 || semantic === 'neutral') return 'text-slate-700'
  const favorable = semantic === 'cost' ? value < 0 : value > 0
  return favorable ? 'text-emerald-700' : 'text-rose-700'
}

function displayParameter(value: number | null, parameter: typeof BOM_PARAMETERS[number] | typeof RTG_PARAMETERS[number]): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const displayValue = value * parameter.scale
  return `${formatNumber(displayValue, 2)}${parameter.scale === 100 ? '%' : ''}`
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
  return ROLES.find(option => option.role === role)?.label ?? 'Reference'
}

function ComparisonRoleSelector({
  side,
  role,
  onChange
}: {
  side: 'Before' | 'After'
  role: MasterDataRole
  onChange: (role: MasterDataRole) => void
}) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const pinnedRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuId = `simulation-${side.toLowerCase()}-dataset-menu`
  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }
  const close = (restoreFocus = false) => {
    clearHoverTimer()
    pinnedRef.current = false
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }
  const preview = () => {
    clearHoverTimer()
    setOpen(true)
  }
  const scheduleOpen = () => {
    clearHoverTimer()
    if (open || pinnedRef.current) return
    hoverTimerRef.current = setTimeout(preview, 120)
  }
  const scheduleDismiss = () => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      if (pinnedRef.current) return
      if (rootRef.current?.contains(document.activeElement) || rootRef.current?.matches(':hover')) return
      close()
    }, 150)
  }
  const toggleOpen = () => {
    clearHoverTimer()
    if (pinnedRef.current) close()
    else {
      preview()
      pinnedRef.current = true
    }
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
      const top = trigger.bottom
      setOffset({
        x: Math.max(8, Math.min(centeredLeft, window.innerWidth - menu.width - 8)) - centeredLeft,
        y: top + menu.height > window.innerHeight - 8 ? Math.max(8, trigger.top - menu.height) - top : 0
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
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleDismiss}
      onFocusCapture={clearHoverTimer}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleDismiss()
      }}
    >
      <Tooltip label={side}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${side} dataset, ${roleLabel(role)}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggleOpen}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              preview()
              requestAnimationFrame(() => menuItemRefs.current[event.key === 'ArrowUp' ? ROLES.length - 1 : 0]?.focus())
            }
          }}
          className="inline-flex h-8 w-[96px] shrink-0 items-center justify-between gap-1.5 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium leading-none text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <span className="truncate">{roleLabel(role)}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        </button>
      </Tooltip>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          style={{ marginLeft: `${offset.x}px`, marginTop: `${offset.y}px` }}
          aria-label={`${side} dataset`}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault()
              close(true)
              return
            }
            if (event.key === 'Tab') {
              close()
              return
            }
            const activeIndex = menuItemRefs.current.findIndex(item => item === document.activeElement)
            const nextIndex = event.key === 'ArrowDown'
              ? (activeIndex + 1) % ROLES.length
              : event.key === 'ArrowUp'
                ? (activeIndex - 1 + ROLES.length) % ROLES.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? ROLES.length - 1 : null
            if (nextIndex !== null) {
              event.preventDefault()
              menuItemRefs.current[nextIndex]?.focus()
            }
          }}
          onMouseEnter={clearHoverTimer}
          className="absolute left-1/2 top-full z-50 w-max min-w-[96px] max-w-[calc(100vw-1rem)] -translate-x-1/2 border border-slate-300 bg-white p-1 shadow-lg"
        >
          {ROLES.map(({ role: optionRole, label: optionLabel }, index) => (
            <button
              key={optionRole}
              ref={element => { menuItemRefs.current[index] = element }}
              type="button"
              role="menuitemradio"
              aria-checked={optionRole === role}
              tabIndex={0}
              onClick={() => { onChange(optionRole); close(true) }}
              className={`block min-h-8 w-full px-2 text-left text-xs hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${optionRole === role ? 'font-semibold text-blue-800' : 'text-slate-800'}`}
            >
              {optionLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
  secondaryLabel: 'Send all datasets' | 'Reset all datasets'
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
      <Tooltip label={label}>
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
          aria-label={label}
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

function EffectCell({ amount }: {
  amount: number | null | undefined
}) {
  const effect = parameterEffectPresentation(amount)
  return (
    <td className="whitespace-nowrap py-1.5 pl-1 pr-8 text-right font-mono tabular-nums">
      <span className={effect.className}>{effect.text}</span>
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
  activeRole,
  rows,
  simulationSnapshot,
  baselineSnapshot,
  workingSelection,
  onToggleWorkingTarget,
  onUpdate,
  onBeginEdit,
  onCommitEdit
}: {
  kind: SimulationRecordKind
  activeRole: MasterDataRole
  rows: SimulationComparisonRow[]
  simulationSnapshot: CostSnapshot
  baselineSnapshot: CostSnapshot
  workingSelection: string[]
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onUpdate: (recordId: string, parameter: SimulationParameter, value: number | null) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}) {
  const isBOM = kind === 'bom'
  const shortTitle = isBOM ? 'BOM' : 'RTG'
  const tableIdentity = isBOM ? 'Bill of Materials' : 'Routing Process'
  const parameters = isBOM ? BOM_PARAMETERS : RTG_PARAMETERS
  const renderColumnGroup = () => (
    <colgroup>
      {['6%', '18%', '10%', '14.5%', '14.5%', '14.5%', '17%', '5.5%'].map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  )
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const updateGutter = () => setScrollbarWidth(body.offsetWidth - body.clientWidth)
    updateGutter()
    const observer = new ResizeObserver(updateGutter)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  useTransientInteraction(expandedRows.size > 0, () => setExpandedRows(new Set()))
  const [dragRowOrder, setDragRowOrder] = useState<string[] | null>(null)
  const selectionDragRef = useRef<SimulationSelectionDrag | null>(null)
  const suppressSelectionClickRef = useRef(false)
  const records: Array<{ id: string }> = isBOM ? simulationSnapshot.bom : simulationSnapshot.routing
  const tableRows = rows.filter(row => row.kind === kind).map((row, sourceIndex) => ({ row, sourceIndex }))
  const selectedKeys = new Set(workingSelection)
  const getRowKey = (row: SimulationComparisonRow, sourceIndex: number) => `${row.beforeRecordId ?? 'missing'}:${row.afterRecordId ?? 'missing'}:${sourceIndex}`
  const isSelectedRow = (row: SimulationComparisonRow) => Boolean(
    row.afterRecordId && rowIsSelectable(row) && selectedKeys.has(simulationWorkingTargetKey(kind, row.afterRecordId))
  )
  const selectedFirstRows = [...tableRows].sort((left, right) => Number(isSelectedRow(right.row)) - Number(isSelectedRow(left.row)) || left.sourceIndex - right.sourceIndex)
  const dragRowIndexes = new Map((dragRowOrder ?? []).map((key, index) => [key, index]))
  const visibleRows = dragRowOrder
    ? [...tableRows].sort((left, right) => (dragRowIndexes.get(getRowKey(left.row, left.sourceIndex)) ?? Number.MAX_SAFE_INTEGER)
      - (dragRowIndexes.get(getRowKey(right.row, right.sourceIndex)) ?? Number.MAX_SAFE_INTEGER) || left.sourceIndex - right.sourceIndex)
    : selectedFirstRows
  const selectableTargets = tableRows.flatMap(({ row }) => {
    const record = singleRecord(records, row.afterRecordId)
    return record && rowIsSelectable(row)
      ? [{ key: simulationWorkingTargetKey(kind, record.id), recordId: record.id }]
      : []
  })
  const selectableRecordIds = selectableTargets.map(target => target.recordId)
  const allVisibleSelected = selectableRecordIds.length > 0 && selectableRecordIds.every(id => selectedKeys.has(simulationWorkingTargetKey(kind, id)))
  const someVisibleSelected = !allVisibleSelected && selectableRecordIds.some(id => selectedKeys.has(simulationWorkingTargetKey(kind, id)))
  const toggleAllVisible = () => {
    const select = !allVisibleSelected
    for (const id of selectableRecordIds) {
      const isSelected = selectedKeys.has(simulationWorkingTargetKey(kind, id))
      if (isSelected !== select) onToggleWorkingTarget(kind, id)
    }
  }

  const startSelectionDrag = (recordId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const anchorKey = simulationWorkingTargetKey(kind, recordId)
    const targetsByKey = new Map(selectableTargets.map(target => [target.key, target]))
    const targets = visibleRows.flatMap(({ row }) => {
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
      rowKeys: visibleRows.map(({ row, sourceIndex }) => getRowKey(row, sourceIndex)),
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
    for (const target of drag.targets) {
      if (selectedKeys.has(target.key) !== desiredSelection.has(target.key)) {
        onToggleWorkingTarget(kind, target.recordId)
      }
    }
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
    <section data-simulation-table={kind} className="min-w-0 border border-slate-300 bg-white xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden" aria-label={tableIdentity}>
      <div className="hidden md:flex xl:shrink-0">
        <table role="presentation" className="w-full min-w-0 flex-1 table-fixed border-separate border-spacing-0 text-[11px]">
          {renderColumnGroup()}
          <thead className="text-[10px] font-semibold text-white [&_th]:bg-slate-900 [&_th]:shadow-[inset_0_-1px_0_#334155]">
            <tr>
              <th scope="col" className="p-0 text-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={someVisibleSelected ? 'mixed' : allVisibleSelected}
                  aria-label={allVisibleSelected ? `Clear visible ${tableIdentity} selection` : `Select all visible eligible ${tableIdentity} rows`}
                  disabled={selectableRecordIds.length === 0}
                  onClick={toggleAllVisible}
                  className={`mx-auto grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${allVisibleSelected ? 'border border-slate-300 bg-slate-700 text-white' : someVisibleSelected ? 'bg-slate-700 text-white ring-1 ring-inset ring-slate-500' : 'text-white hover:bg-slate-700'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}
                >#</button>
              </th>
              <th scope="col" className="px-2 py-2 text-left">{tableIdentity}</th>
              <th scope="col" className="px-1 py-2 text-left">Status</th>
              {parameters.map(parameter => <th key={parameter.parameter} scope="col" className="py-2 pl-1 pr-8 text-right">{parameter.label}</th>)}
              <th scope="col" className="py-2 pl-1 pr-6 text-right"><span className="relative left-4 inline-block whitespace-nowrap">{isBOM ? 'Material Cost' : 'Conversion Cost'}</span></th>
              <th scope="col" className="px-0.5 py-2"><span className="sr-only">Expand Parameter Cost Effect</span></th>
            </tr>
          </thead>
        </table>
        <div aria-hidden="true" className="shrink-0 bg-slate-900 shadow-[inset_0_-1px_0_#334155]" style={{ width: scrollbarWidth }} />
      </div>
      <div ref={bodyRef} className="overflow-x-hidden md:overflow-y-visible xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:[scrollbar-gutter:stable]">
        <table className="hidden w-full table-fixed border-separate border-spacing-0 text-[11px] md:table">
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
          <tbody className="divide-y divide-slate-200 bg-white">
            {visibleRows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500">No {tableIdentity} rows.</td></tr>}
            {visibleRows.map(({ row, sourceIndex }) => {
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

              return (
                <React.Fragment key={key}>
                  <tr
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
                    <td data-safe-workspace-interaction="true" className="p-0 text-center font-normal">
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
                    <th scope="row" className="break-words px-2 py-2 text-left font-medium text-slate-900">{row.name}</th>
                    <td className={`${row.identityIssue ? 'break-words' : 'whitespace-nowrap'} px-1 py-2 leading-3 ${statusTextClass(status)}`}>{status}</td>
                    {parameters.map(parameter => {
                      const recordValue = simulationRecord
                        ? (simulationRecord as unknown as Record<string, number | null>)[parameter.field] ?? null
                        : null
                      const value = recordValue === null ? null : recordValue * parameter.scale
                      return (
                        <td key={parameter.parameter} className="py-1 pl-1 pr-1 text-right">
                          {!simulationRecord ? '—' : canEdit ? (
                            <div className="min-w-0 pl-1.5">
                              <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                                <NumericInput
                                  value={value}
                                  precision={parameter.precision}
                                  min={0}
                                  minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                  max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                                  allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                  stopAtMinimum
                                  minimumDisplayPrecision={parameter.parameter === 'routing.capacity' ? 4 : undefined}
                                  onValueChange={next => {
                                    if (next !== null) onUpdate(simulationRecord.id, parameter.parameter, next / parameter.scale)
                                  }}
                                  className="h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-1.5 text-right font-mono text-xs tabular-nums text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:!border-transparent focus:bg-white focus:!outline focus:!outline-2 focus:!outline-blue-700 focus:!outline-offset-[-2px]"
                                  aria-label={`${row.name} ${parameter.label} in ${roleLabel(activeRole)}`}
                                />
                              </SimulationHistoryInputBoundary>
                            </div>
                          ) : displayParameter(recordValue, parameter)}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-1 pr-6 text-right font-mono text-xs tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</td>
                    <td className="px-0.5 py-1 text-center">
                      {canExpand && (
                        <span aria-hidden="true" className="inline-grid h-7 w-7 place-items-center text-slate-600">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={detailId} data-safe-workspace-interaction="true" className="bg-slate-50/80">
                      <td aria-hidden="true" />
                      <th scope="row" colSpan={2} className="py-2 pl-3 pr-2 text-left text-[10px] font-semibold text-slate-700">
                        <span className="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">Parameter Cost Effect</span>
                      </th>
                      {detailParameters.map(parameter => <EffectCell key={parameter.parameter} amount={parameter.amount} />)}
                      <td aria-label={`Total ${totalEffect.text}`} className="whitespace-nowrap py-1.5 pl-1 pr-6 text-right text-[10px] font-semibold">
                        <span className="grid grid-cols-[1fr_auto] items-center gap-1">
                          <span className="text-right text-slate-700">Total{' '}</span>
                          <span className={`min-w-[5ch] text-right font-mono tabular-nums ${totalEffect.className}`}>{totalEffect.text}</span>
                        </span>
                      </td>
                      <td className="px-0.5 py-1" aria-hidden="true" />
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {visibleRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">No {tableIdentity} rows.</p>}
        {visibleRows.map(({ row, sourceIndex }) => {
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
                  <dt className="text-slate-500">{isBOM ? 'Material Cost' : 'Conversion Cost'}</dt>
                  <dd className="font-mono tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</dd>
                </div>
              </dl>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                {parameters.map(parameter => {
                  const recordValue = simulationRecord
                    ? (simulationRecord as unknown as Record<string, number | null>)[parameter.field] ?? null
                    : null
                  const value = recordValue === null ? null : recordValue * parameter.scale
                  return (
                    <label key={parameter.parameter} className="block min-w-0 text-[10px] font-medium text-slate-600">
                      <span>{parameter.label}</span>
                      {!simulationRecord ? <span className="mt-0.5 block font-mono text-slate-700">—</span> : canEdit ? (
                        <div className="mt-0.5 min-w-0 pl-1.5">
                          <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                            <NumericInput
                              value={value}
                              precision={parameter.precision}
                              min={0}
                              minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                              max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                              allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                              stopAtMinimum
                              minimumDisplayPrecision={parameter.parameter === 'routing.capacity' ? 4 : undefined}
                              onValueChange={next => {
                                if (next !== null) onUpdate(simulationRecord.id, parameter.parameter, next / parameter.scale)
                              }}
                              className="h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-1.5 text-right font-mono text-xs tabular-nums text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:!border-transparent focus:bg-white focus:!outline focus:!outline-2 focus:!outline-blue-700 focus:!outline-offset-[-2px]"
                              aria-label={`${row.name} ${parameter.label} in ${roleLabel(activeRole)}`}
                            />
                          </SimulationHistoryInputBoundary>
                        </div>
                      ) : <span className="mt-0.5 block font-mono text-slate-700">{displayParameter(recordValue, parameter)}</span>}
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
                          <dd className={`shrink-0 font-mono tabular-nums ${effect.className}`}>{effect.text}</dd>
                        </div>
                      )
                    })}
                    <div className="flex min-w-0 items-baseline justify-between gap-2 border-t border-slate-200 pt-1 font-semibold">
                      <dt className="text-slate-700">Total</dt>
                      <dd className={`shrink-0 font-mono tabular-nums ${totalEffect.className}`}>{totalEffect.text}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ResultPanel({
  beforeRole,
  afterRole,
  beforeCost,
  afterCost,
  beforeFinancial,
  afterFinancial,
  onChangeComparison,
  actions
}: {
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
    const padding = subtotal ? 'py-0.5' : 'py-0'
    return (
      <tr key={row.label} className={
        'total' in row && row.total
          ? 'border-t border-slate-300 font-semibold text-slate-950 !border-slate-300'
          : subtotal
            ? 'border-t border-slate-300 font-semibold text-slate-800 !border-slate-300'
            : 'text-slate-700'
      }>
        <th scope="row" className={`whitespace-nowrap ${padding} text-left`}>{row.label}</th>
        <td className={`whitespace-nowrap px-0.5 ${padding} text-right font-mono tabular-nums`}>{displayMoney(row.before)}</td>
        <td className={`whitespace-nowrap px-0.5 ${padding} text-right font-mono tabular-nums`}>{displayMoney(row.after)}</td>
        <td className={`px-1 ${padding} text-right font-mono tabular-nums ${resultChangeClass(row.change, row.semantic)}`}>
          {displayResultDelta(row.change)}
        </td>
        <td className={`${padding} text-right font-mono tabular-nums ${resultChangeClass(row.percent === null ? null : row.change, row.semantic)}`}>
          {row.percent === null ? '—' : `${displayResultDelta(row.percent)}%`}
        </td>
      </tr>
    )
  })

  return (
    <section data-safe-workspace-interaction="true" className="min-w-0 border border-slate-300 bg-white px-3 py-2 xl:min-h-0 xl:px-2 xl:py-1" aria-labelledby="simulation-result-title">
      <header
        data-simulation-result-header="true"
        className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-slate-200 pb-1.5"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <h2 id="simulation-result-title" className="shrink-0 text-xs font-semibold text-slate-900">Result</h2>
          <div
            role="group"
            aria-label={`Result comparison, Before ${roleLabel(beforeRole)}, After ${roleLabel(afterRole)}`}
            className="flex shrink-0 items-center gap-1"
          >
            <ComparisonRoleSelector side="Before" role={beforeRole} onChange={role => onChangeComparison(role, afterRole)} />
            <span aria-hidden="true" className="w-3 text-center text-sm font-semibold text-slate-500">→</span>
            <ComparisonRoleSelector side="After" role={afterRole} onChange={role => onChangeComparison(beforeRole, role)} />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
      </header>
      <div className="mt-1 min-w-0">
        <table className="w-full table-fixed text-[9px] leading-3 xl:leading-[11px]">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[19%]" />
            <col className="w-[19%]" />
            <col className="w-[21%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="text-[8px] text-slate-500">
            <tr>
              <th scope="col" className="whitespace-nowrap py-0.5 text-left font-medium"><span className="sr-only">Cost or business outcome</span></th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-0.5 text-right font-medium xl:py-0">{roleLabel(beforeRole)}</th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-0.5 text-right font-medium xl:py-0">{roleLabel(afterRole)}</th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-0.5 text-right font-medium xl:py-0">Change</th>
              <th scope="col" className="py-0.5 text-right font-medium xl:py-0">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr><th scope="rowgroup" colSpan={5} className="border-b border-slate-200 py-0.5 text-left text-[9px] font-semibold text-slate-700">Cost / Unit</th></tr>
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
        secondaryLabel="Reset all datasets"
        onPrimary={onReset}
        onSecondary={onResetAll}
      />
    </>
  )

  return (
    <div className="min-w-0 space-y-3 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-2 xl:space-y-0 xl:overflow-hidden">
      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-[1.25] xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-rows-1">
        <SimulationStoryGraph story={story} unit={unit} activeRole={state.role} onSelectActiveDataset={onSelectActiveDataset} />
        <div className="grid min-w-0 gap-2 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] xl:grid-rows-1">
          <EconomicSimulationPanel
            result={economicResult}
            draft={analysisAfterDataset.economicInputs}
            afterSnapshot={analysisAfterDataset.snapshot}
            unit={unit}
            onUpdate={(field, value) => onUpdateEconomicInput(analysisAfterDataset.role, field, value)}
            onBeginEdit={() => onBeginEdit(analysisAfterDataset.role)}
            onCommitEdit={onCommitEdit}
          />
          <div data-simulation-layout-column="result-and-break-even" className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-rows-[minmax(0,1.2fr)_minmax(0,.8fr)]">
            <ResultPanel
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
              onBatchSizeChange={value => onUpdateEconomicInput(analysisAfterDataset.role, 'batchSize', value)}
              onBeginEdit={() => onBeginEdit(analysisAfterDataset.role)}
              onCommitEdit={onCommitEdit}
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-[minmax(0,1fr)]">
        <SimulationParameterTable
          kind="bom"
          activeRole={state.role}
          rows={result.records}
          simulationSnapshot={simulationSnapshot}
          baselineSnapshot={state.baselineSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onUpdate={onUpdateParameter}
          onBeginEdit={() => onBeginEdit(state.role)}
          onCommitEdit={onCommitEdit}
        />
        <SimulationParameterTable
          kind="routing"
          activeRole={state.role}
          rows={result.records}
          simulationSnapshot={simulationSnapshot}
          baselineSnapshot={state.baselineSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onUpdate={onUpdateParameter}
          onBeginEdit={() => onBeginEdit(state.role)}
          onCommitEdit={onCommitEdit}
        />
      </div>
    </div>
  )
}
