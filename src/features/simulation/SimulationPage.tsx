import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { compareSnapshots, formatNumber, safeAdd } from '../../core'
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
  ScenarioStory,
  SnapshotCost
} from '../../core/types'
import { NumericInput } from '../../shared/ui/NumericInput'
import { useTransientInteraction } from '../../shared/ui/transient-interactions'
import { EconomicSimulationPanel } from './EconomicSimulationPanel'
import { SimulationStoryGraph } from './SimulationStoryGraph'
import { calculateEconomicSimulation, type EconomicSimulationField } from './simulation-economics'
import type { SimulationComparisonRow, SimulationRecordKind } from './simulation-engine'
import { calculateParameterSimulation } from './simulation-engine'
import { simulationWorkingTargetKey, type SimulationParameter, type SimulationWorkspaceState } from './simulation-state'

interface SimulationPageProps {
  state: SimulationWorkspaceState
  workingSelection: string[]
  referenceSnapshot: CostSnapshot
  currentSnapshot: CostSnapshot
  onCloneSource: (role: MasterDataRole) => void
  onSendTo: (role: MasterDataRole, snapshot: CostSnapshot) => boolean
  onResetParameters: () => void
  onUpdateParameter: (recordId: string, parameter: SimulationParameter, value: number | null) => void
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onUpdateEconomicInput: (field: EconomicSimulationField, value: string) => void
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

function displayEffect(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${formatNumber(value, 2)}`
}

function displayResultDelta(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatNumber(value, 2)}`
}

function resultChangeClass(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'text-slate-400'
  return value > 0 ? 'text-rose-700' : value < 0 ? 'text-emerald-700' : 'text-slate-700'
}

function displayParameter(value: number | null, parameter: typeof BOM_PARAMETERS[number] | typeof RTG_PARAMETERS[number]): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const displayValue = value * parameter.scale
  return `${formatNumber(displayValue, 2)}${parameter.scale === 100 ? '%' : ''}`
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest('input, button, select, textarea, label, summary, a[href], [role="button"], [role="menuitem"], [contenteditable="true"]') !== null
}

function singleRecord<T extends { id: string }>(records: T[], id: string | undefined): T | undefined {
  if (!id) return undefined
  const matches = records.filter(record => record.id === id)
  return matches.length === 1 ? matches[0] : undefined
}

function rowStatusText(row: SimulationComparisonRow): string {
  if (row.identityIssue === 'ambiguous') return 'Ambiguous identity · protected'
  if (row.identityIssue === 'unmatched') return 'Missing identity · protected'
  if (row.status === 'ADDED') return 'Added in SIM'
  if (row.status === 'REMOVED') return 'Removed from SIM'
  if (row.status === 'CHANGED') return 'Changed'
  if (row.status === 'UNCHANGED') return 'Unchanged'
  return 'Attribution unavailable'
}

function rowIsMatched(row: SimulationComparisonRow): boolean {
  return row.identityIssue === null && (row.status === 'CHANGED' || row.status === 'UNCHANGED')
}

function rowIsSelectable(row: SimulationComparisonRow): boolean {
  return row.identityIssue === null && (row.status === 'CHANGED' || row.status === 'UNCHANGED' || row.status === 'ADDED')
}

function effectUnavailableReason(row: SimulationComparisonRow): string {
  if (row.identityIssue === 'ambiguous') return 'Business identity cannot be matched safely.'
  if (row.identityIssue === 'unmatched') return 'Business identity is missing or unmatched.'
  if (row.status === 'ADDED') return 'The row exists only in SIM.'
  if (row.status === 'REMOVED') return 'The row exists only in Current.'
  return 'Required inputs or Work Center context are unavailable.'
}

function bomAttribution(
  row: SimulationComparisonRow,
  currentSnapshot: CostSnapshot,
  simulationSnapshot: CostSnapshot
): { simCost: number | null; effects: EffectValues } {
  const empty: EffectValues = { totalEffect: null, effects: null, shares: null }
  const simRecord = singleRecord(simulationSnapshot.bom, row.simulationRecordId)
  if (!simRecord) return { simCost: null, effects: empty }
  const simCost = calculateSnapshotBOMDetail({ current: simRecord }).currentCost
  if (!rowIsMatched(row)) return { simCost, effects: empty }
  const currentRecord = singleRecord(currentSnapshot.bom, row.currentRecordId)
  if (!currentRecord) return { simCost, effects: empty }
  const pair = calculateSnapshotBOMDetail({ reference: currentRecord, current: simRecord })
  const hasInputs = [currentRecord.price, simRecord.price, currentRecord.consumption, simRecord.consumption, currentRecord.loss, simRecord.loss]
    .every(value => value !== null && Number.isFinite(value))
  if (!hasInputs) return { simCost, effects: empty }
  const attribution = calculateMultiplicativeCostAttribution(pair.referenceCost, pair.currentCost, [
    { key: 'price', baseline: currentRecord.price!, target: simRecord.price! },
    { key: 'usage', baseline: currentRecord.consumption!, target: simRecord.consumption! },
    { key: 'loss', baseline: 1 + currentRecord.loss!, target: 1 + simRecord.loss! }
  ])
  return { simCost, effects: attribution }
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function routingAttribution(
  row: SimulationComparisonRow,
  currentSnapshot: CostSnapshot,
  simulationSnapshot: CostSnapshot
): { simCost: number | null; effects: EffectValues } {
  const empty: EffectValues = { totalEffect: null, effects: null, shares: null }
  const simRecord = singleRecord(simulationSnapshot.routing, row.simulationRecordId)
  if (!simRecord) return { simCost: null, effects: empty }
  const simOnly = calculateSnapshotRoutingDetail({ current: simRecord }, currentSnapshot.rates, currentSnapshot.rates)
  const simCost = simOnly.currentTotal
  if (!rowIsMatched(row)) return { simCost, effects: empty }
  const currentRecord = singleRecord(currentSnapshot.routing, row.currentRecordId)
  if (!currentRecord || normalizeKey(currentRecord.workCenterId) !== normalizeKey(simRecord.workCenterId)) {
    return { simCost, effects: empty }
  }
  const pair = calculateSnapshotRoutingDetail(
    { reference: currentRecord, current: simRecord },
    currentSnapshot.rates,
    currentSnapshot.rates
  )
  const hasInputs = [currentRecord.manning, simRecord.manning, currentRecord.capacity, simRecord.capacity, currentRecord.yield, simRecord.yield]
    .every(value => value !== null && Number.isFinite(value))
  if (!hasInputs || currentRecord.capacity! <= 0 || simRecord.capacity! <= 0 || currentRecord.yield! <= 0 || simRecord.yield! <= 0) {
    return { simCost, effects: empty }
  }
  const attribution = calculateMultiplicativeCostAttribution(pair.referenceTotal, pair.currentTotal, [
    { key: 'manning', baseline: currentRecord.manning!, target: simRecord.manning! },
    { key: 'capacity', baseline: 1 / currentRecord.capacity!, target: 1 / simRecord.capacity! },
    { key: 'yield', baseline: 1 / currentRecord.yield!, target: 1 / simRecord.yield! }
  ])
  return { simCost, effects: attribution }
}

function RoleActionMenu({
  label,
  onSelect
}: {
  label: 'Clone from' | 'Send to'
  onSelect: (role: MasterDataRole) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = `simulation-${label.toLowerCase().replace(' ', '-')}-menu`
  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useTransientInteraction(open, reason => close(reason === 'escape'))
  useEffect(() => {
    if (!open) return
    menuItemRefs.current[0]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(value => !value)}
        className="inline-flex min-h-7 items-center gap-1.5 border border-slate-400 bg-white px-2 text-[11px] font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {label}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
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
          className="absolute right-0 top-full z-50 mt-1 min-w-36 border border-slate-300 bg-white p-1 shadow-lg"
        >
          {ROLES.map(({ role, label: roleLabel }, index) => (
            <button
              key={role}
              ref={element => { menuItemRefs.current[index] = element }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => { onSelect(role); close() }}
              className="block min-h-8 w-full px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {roleLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EffectCell({ amount }: {
  amount: number | null | undefined
}) {
  return (
    <td className="whitespace-nowrap px-1 py-1.5 text-right font-mono tabular-nums text-slate-700">{displayEffect(amount)}</td>
  )
}

function SimulationParameterTable({
  kind,
  rows,
  currentSnapshot,
  simulationSnapshot,
  workingSelection,
  onToggleWorkingTarget,
  onUpdate
}: {
  kind: SimulationRecordKind
  rows: SimulationComparisonRow[]
  currentSnapshot: CostSnapshot
  simulationSnapshot: CostSnapshot
  workingSelection: string[]
  onToggleWorkingTarget: (kind: 'bom' | 'routing', recordId: string) => void
  onUpdate: (recordId: string, parameter: SimulationParameter, value: number | null) => void
}) {
  const isBOM = kind === 'bom'
  const title = isBOM ? 'BOM' : 'RTG'
  const parameters = isBOM ? BOM_PARAMETERS : RTG_PARAMETERS
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const records: Array<{ id: string }> = isBOM ? simulationSnapshot.bom : simulationSnapshot.routing
  const tableRows = rows.filter(row => row.kind === kind).map((row, sourceIndex) => ({ row, sourceIndex }))
  const selectedKeys = new Set(workingSelection)
  const isSelectedRow = (row: SimulationComparisonRow) => Boolean(
    row.simulationRecordId && rowIsSelectable(row) && selectedKeys.has(simulationWorkingTargetKey(kind, row.simulationRecordId))
  )
  const visibleRows = [...tableRows].sort((left, right) => Number(isSelectedRow(right.row)) - Number(isSelectedRow(left.row)) || left.sourceIndex - right.sourceIndex)
  const selectableRecordIds = tableRows.flatMap(({ row }) => {
    const record = singleRecord(records, row.simulationRecordId)
    return record && rowIsSelectable(row) ? [record.id] : []
  })
  const allVisibleSelected = selectableRecordIds.length > 0 && selectableRecordIds.every(id => selectedKeys.has(simulationWorkingTargetKey(kind, id)))
  const selectedCount = selectableRecordIds.filter(id => selectedKeys.has(simulationWorkingTargetKey(kind, id))).length
  const toggleAllVisible = () => {
    const select = !allVisibleSelected
    for (const id of selectableRecordIds) {
      const isSelected = selectedKeys.has(simulationWorkingTargetKey(kind, id))
      if (isSelected !== select) onToggleWorkingTarget(kind, id)
    }
  }
  useTransientInteraction(expandedRows.size > 0, () => setExpandedRows(new Set()))

  return (
    <section className="min-w-0 border border-slate-300 bg-white xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden" aria-labelledby={`${kind}-simulation-title`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <h2 id={`${kind}-simulation-title`} className="text-xs font-semibold text-slate-900">{title}</h2>
        <span className="text-[10px] text-slate-500">{selectedCount} selected</span>
      </div>
      <div className="overflow-x-hidden md:overflow-y-visible xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table className="hidden w-full table-fixed border-collapse text-[11px] md:table">
          <caption className="sr-only">Select eligible {isBOM ? 'BOM' : 'Routing'} records for local Simulation work. Selection does not limit the full Simulation calculation.</caption>
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[25%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-900 text-[10px] font-semibold text-white">
            <tr>
              <th scope="col" className="px-0.5 py-1 text-center">
                <button
                  type="button"
                  aria-pressed={allVisibleSelected}
                  aria-label={allVisibleSelected ? `Clear visible ${title} selection` : `Select all visible eligible ${title} rows`}
                  disabled={selectableRecordIds.length === 0}
                  onClick={toggleAllVisible}
                  className={`grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${allVisibleSelected ? 'border border-slate-300 bg-slate-700 text-white' : 'text-white hover:bg-slate-700'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}
                >#</button>
              </th>
              <th scope="col" className="px-1 py-2 text-left">{isBOM ? 'BOM' : 'RTG'}</th>
              {parameters.map(parameter => <th key={parameter.parameter} scope="col" className="px-0.5 py-2 text-right">{parameter.label}</th>)}
              <th scope="col" className="px-1 py-2 text-right">{isBOM ? 'Material Cost' : 'Conversion Cost'}</th>
              <th scope="col" className="px-0.5 py-2"><span className="sr-only">Expand effects</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {visibleRows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">No {title} rows.</td></tr>}
            {visibleRows.map(({ row, sourceIndex }) => {
              const key = `${row.currentRecordId ?? 'missing'}:${row.simulationRecordId ?? 'missing'}:${sourceIndex}`
              const expanded = expandedRows.has(key)
              const simulationRecord = singleRecord(records, row.simulationRecordId)
              const canEdit = Boolean(simulationRecord && rowIsSelectable(row))
              const selected = isSelectedRow(row)
              const canExpand = true
              const analysis = isBOM
                ? bomAttribution(row, currentSnapshot, simulationSnapshot)
                : routingAttribution(row, currentSnapshot, simulationSnapshot)
              const status = rowStatusText(row)
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

              return (
                <React.Fragment key={key}>
                  <tr
                    aria-expanded={canExpand ? expanded : undefined}
                    aria-controls={canExpand && expanded ? `${kind}-effect-${encodeURIComponent(key)}` : undefined}
                    aria-label={canExpand ? `${title}: ${row.name}; ${status}; activate to ${expanded ? 'collapse' : 'expand'} Parameter Cost Effect` : undefined}
                    tabIndex={canExpand ? 0 : undefined}
                    onClick={event => {
                      if (!canExpand || isInteractiveTarget(event.target)) return
                      toggleExpanded()
                    }}
                    onKeyDown={event => {
                      if (!canExpand || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                      event.preventDefault()
                      toggleExpanded()
                    }}
                    className={`${selected ? 'bg-blue-50' : ''} hover:bg-slate-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 ${canExpand ? 'cursor-pointer' : ''}`}
                  >
                    <th scope="row" className="px-0.5 py-1 text-center font-normal">
                      {canEdit && simulationRecord ? (
                        <button
                          type="button"
                          aria-label={`${selected ? 'Deselect' : 'Select'} ${title} row ${sourceIndex + 1}: ${row.name}`}
                          aria-pressed={selected}
                          onClick={() => onToggleWorkingTarget(kind, simulationRecord.id)}
                          className={`min-h-7 min-w-7 rounded-sm px-1 font-mono text-[10px] ${selected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                        >{sourceIndex + 1}</button>
                      ) : <span className="font-mono text-[10px] tabular-nums text-slate-500">{sourceIndex + 1}</span>}
                    </th>
                    <th scope="row" className="px-2 py-2 text-left font-medium text-slate-900">
                      <span className="block break-words">{row.name}</span>
                      <span className={`mt-0.5 block text-[9px] font-normal ${row.identityIssue ? 'text-amber-800' : 'text-slate-500'}`}>{status}</span>
                    </th>
                    {parameters.map(parameter => {
                      const recordValue = simulationRecord
                        ? (simulationRecord as unknown as Record<string, number | null>)[parameter.field] ?? null
                        : null
                      const value = recordValue === null ? null : recordValue * parameter.scale
                      return (
                        <td key={parameter.parameter} className="px-1 py-1 text-right">
                          {!simulationRecord ? '—' : canEdit ? (
                            <div className="mx-auto min-w-0">
                              <NumericInput
                                value={value}
                                precision={parameter.precision}
                                min={0}
                                minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                                allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                                onValueChange={next => onUpdate(
                                  simulationRecord.id,
                                  parameter.parameter,
                                  next === null ? null : next / parameter.scale
                                )}
                                className="h-7 w-full min-w-0 border border-slate-300 bg-white px-0.5 text-right text-[10px] focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-100"
                                aria-label={`${row.name} ${parameter.label} in SIM`}
                              />
                            </div>
                          ) : displayParameter(recordValue, parameter)}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</td>
                    <td className="px-1 py-1 text-center">
                      {canExpand && <span aria-hidden="true" className="pointer-events-none inline-grid h-7 w-7 place-items-center text-slate-600">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>}
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={`${kind}-effect-${encodeURIComponent(key)}`} data-safe-workspace-interaction="true" className="bg-slate-50/80">
                      <th scope="row" colSpan={2} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">
                        <span className="whitespace-nowrap">Parameter Cost Effect</span>
                        {analysis.effects.effects === null && (
                          <span className="ml-2 font-normal text-slate-500">Unavailable · {effectUnavailableReason(row)}</span>
                        )}
                      </th>
                      {detailParameters.map(parameter => <EffectCell key={parameter.parameter} amount={parameter.amount} />)}
                      <td className="whitespace-nowrap px-1 py-1.5 text-right font-mono text-[10px] font-semibold tabular-nums text-slate-900">
                        {analysis.effects.totalEffect === null ? '—' : `${displayEffect(analysis.effects.totalEffect)} Total`}
                      </td>
                      <td className="px-1 py-1" aria-hidden="true" />
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        <div className="flex min-h-9 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
          <button
            type="button"
            aria-pressed={allVisibleSelected}
            aria-label={allVisibleSelected ? `Clear visible ${title} selection` : `Select all visible eligible ${title} rows`}
            disabled={selectableRecordIds.length === 0}
            onClick={toggleAllVisible}
            className={`grid h-7 w-7 place-items-center rounded-sm text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${allVisibleSelected ? 'border border-slate-800 bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-200'} disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent`}
          >#</button>
          <span className="text-[10px] font-semibold text-slate-600">{title}</span>
        </div>
        {visibleRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">No {title} rows.</p>}
        {visibleRows.map(({ row, sourceIndex }) => {
          const key = `${row.currentRecordId ?? 'missing'}:${row.simulationRecordId ?? 'missing'}:${sourceIndex}`
          const expanded = expandedRows.has(key)
          const simulationRecord = singleRecord(records, row.simulationRecordId)
          const canEdit = Boolean(simulationRecord && rowIsSelectable(row))
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
            ? bomAttribution(row, currentSnapshot, simulationSnapshot)
            : routingAttribution(row, currentSnapshot, simulationSnapshot)
          return (
            <article
              key={key}
              aria-expanded={canExpand ? expanded : undefined}
              aria-controls={canExpand && expanded ? detailId : undefined}
              aria-label={canExpand ? `${title}: ${row.name}; ${rowStatusText(row)}; activate to ${expanded ? 'collapse' : 'expand'} Parameter Cost Effect` : undefined}
              tabIndex={canExpand ? 0 : undefined}
              onClick={event => {
                if (!canExpand || isInteractiveTarget(event.target)) return
                toggleExpanded()
              }}
              onKeyDown={event => {
                if (!canExpand || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                event.preventDefault()
                toggleExpanded()
              }}
              className={`border-b border-slate-200 px-3 py-2.5 last:border-b-0 ${selected ? 'bg-blue-50' : ''} ${canExpand ? 'cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700' : ''}`}
            >
              <div className="flex min-w-0 items-start gap-2">
                {canEdit && simulationRecord ? (
                  <button
                    type="button"
                    aria-label={`${selected ? 'Deselect' : 'Select'} ${title} row ${sourceIndex + 1}: ${row.name}`}
                    aria-pressed={selected}
                    onClick={() => onToggleWorkingTarget(kind, simulationRecord.id)}
                    className={`min-h-7 min-w-7 shrink-0 rounded-sm px-1 font-mono text-[10px] ${selected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                  >{sourceIndex + 1}</button>
                ) : <span className="min-w-7 pt-1 text-center font-mono text-[10px] text-slate-500">{sourceIndex + 1}</span>}
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-xs font-medium text-slate-900">{row.name}</h3>
                  <p className={`mt-0.5 text-[9px] ${row.identityIssue ? 'text-amber-800' : 'text-slate-500'}`}>{rowStatusText(row)}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</span>
                {canExpand && <span aria-hidden="true" className="pointer-events-none grid h-7 w-7 shrink-0 place-items-center text-slate-600">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>}
              </div>
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
                        <NumericInput
                          value={value}
                          precision={parameter.precision}
                          min={0}
                          minExclusive={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                          max={parameter.parameter === 'routing.yield' || parameter.parameter === 'bom.loss' ? 100 : undefined}
                          allowSubMinimumDraft={parameter.parameter === 'routing.capacity' || parameter.parameter === 'routing.yield'}
                          onValueChange={next => onUpdate(simulationRecord.id, parameter.parameter, next === null ? null : next / parameter.scale)}
                          className="mt-0.5 h-8 w-full min-w-0 border border-slate-300 bg-white px-1.5 text-right text-xs focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-100"
                          aria-label={`${row.name} ${parameter.label} in SIM`}
                        />
                      ) : <span className="mt-0.5 block font-mono text-slate-700">{displayParameter(recordValue, parameter)}</span>}
                    </label>
                  )
                })}
              </div>
              {expanded && (
                <div id={detailId} data-safe-workspace-interaction="true" className="mt-2 border-t border-slate-200 pt-2">
                  {analysis.effects.effects === null && (
                    <p className="mb-1 text-[10px] text-slate-500">Unavailable · {effectUnavailableReason(row)}</p>
                  )}
                  <div className="grid grid-cols-[minmax(4.5rem,1.2fr)_repeat(3,minmax(2.25rem,0.8fr))_minmax(4.5rem,1.2fr)] items-center gap-1 text-[9px]">
                    <span className="font-semibold text-slate-700">Effect</span>
                    {parameters.map(parameter => (
                      <span key={parameter.parameter} title={parameter.label} className="text-right font-mono tabular-nums text-slate-700">
                        {displayEffect(analysis.effects.effects?.[parameter.effectKey])}
                      </span>
                    ))}
                    <span className="whitespace-nowrap text-right font-mono font-semibold tabular-nums text-slate-900">
                      {analysis.effects.totalEffect === null ? '— Total' : `${displayEffect(analysis.effects.totalEffect)} Total`}
                    </span>
                  </div>
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
  currentCost,
  simulationCost,
  actions,
  transferMessage,
  transferError
}: {
  currentCost: SnapshotCost
  simulationCost: SnapshotCost
  actions: React.ReactNode
  transferMessage: string
  transferError: boolean
}) {
  const currentConversion = currentCost.labor === null || currentCost.burden === null ? null : safeAdd(currentCost.labor, currentCost.burden)
  const simulationConversion = simulationCost.labor === null || simulationCost.burden === null ? null : safeAdd(simulationCost.labor, simulationCost.burden)
  const rows = [
    { label: 'Material Cost', current: currentCost.material, sim: simulationCost.material },
    { label: 'Labor Cost', current: currentCost.labor, sim: simulationCost.labor },
    { label: 'Burden Cost', current: currentCost.burden, sim: simulationCost.burden },
    { label: 'Conversion Cost', current: currentConversion, sim: simulationConversion },
    { label: 'Standard Cost', current: currentCost.total, sim: simulationCost.total, total: true }
  ]

  return (
    <section data-safe-workspace-interaction="true" className="min-w-0 border border-slate-300 bg-white px-3 py-2" aria-labelledby="simulation-result-title">
      <div className="border-b border-slate-200 pb-1.5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
          <h2 id="simulation-result-title" className="text-xs font-semibold text-slate-900">Result</h2>
          <div className="flex items-center gap-1.5">{actions}</div>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-[10px] text-slate-500">Current → SIM · THB/pc</span>
          {transferMessage && <span role="status" className={`text-[10px] ${transferError ? 'text-rose-800' : 'text-emerald-800'}`}>{transferMessage}</span>}
        </div>
      </div>
      <div className="mt-1 min-w-0">
        <table className="w-full table-fixed text-[10px]">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="text-[9px] text-slate-500">
            <tr>
              <th scope="col" className="whitespace-nowrap py-1 text-left font-medium">Cost</th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-1 text-right font-medium">Current</th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-1 text-right font-medium">SIM</th>
              <th scope="col" className="whitespace-nowrap px-0.5 py-1 text-right font-medium">Change</th>
              <th scope="col" className="py-1 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => {
              const change = row.current === null || row.sim === null ? null : safeAdd(row.sim, -row.current)
              const rawPercent = change === null || row.current === null || row.current === 0 ? null : change / row.current * 100
              const percent = rawPercent !== null && Number.isFinite(rawPercent) ? rawPercent : null
              return (
                <tr key={row.label} className={row.total ? 'border-t border-slate-300 font-semibold text-slate-950' : 'text-slate-700'}>
                  <th scope="row" className="whitespace-nowrap py-1.5 text-left">{row.label}</th>
                  <td className="whitespace-nowrap px-0.5 py-1.5 text-right font-mono tabular-nums">{displayMoney(row.current)}</td>
                  <td className="whitespace-nowrap px-0.5 py-1.5 text-right font-mono tabular-nums">{displayMoney(row.sim)}</td>
                  <td className={`px-1 py-1.5 text-right font-mono tabular-nums ${resultChangeClass(change)}`}>
                    {displayResultDelta(change)}
                  </td>
                  <td className={`py-1.5 text-right font-mono tabular-nums ${resultChangeClass(percent)}`}>
                    {percent === null ? '—' : `${displayResultDelta(percent)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function createStory(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  comparison: ReturnType<typeof compareSnapshots>,
  simulationCost: SnapshotCost,
  economicResult: ReturnType<typeof calculateEconomicSimulation>
): ScenarioStory {
  const referenceBusiness = calculateScenarioBusinessMetrics({
    sellingPrice: referenceSnapshot.product.sellingPrice ?? null,
    sgaPercent: referenceSnapshot.product.sgaPercent ?? null
  }, comparison.referenceCost.total)
  const currentBusiness = calculateScenarioBusinessMetrics({
    sellingPrice: currentSnapshot.product.sellingPrice ?? null,
    sgaPercent: currentSnapshot.product.sgaPercent ?? null
  }, comparison.currentCost.total)
  return createScenarioStory(
    createScenarioFinancialResult(comparison.referenceCost, referenceBusiness),
    createScenarioFinancialResult(comparison.currentCost, currentBusiness),
    createScenarioFinancialResult(simulationCost, economicResult.business)
  )
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  state,
  workingSelection,
  referenceSnapshot,
  currentSnapshot,
  onCloneSource,
  onSendTo,
  onResetParameters,
  onUpdateParameter,
  onToggleWorkingTarget,
  onUpdateEconomicInput
}) => {
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState(false)
  const simulationSnapshot = state.snapshot
  const result = useMemo(
    () => simulationSnapshot ? calculateParameterSimulation(currentSnapshot, simulationSnapshot) : null,
    [currentSnapshot, simulationSnapshot]
  )
  const referenceCurrent = useMemo(
    () => compareSnapshots(referenceSnapshot, currentSnapshot),
    [referenceSnapshot, currentSnapshot]
  )
  const economicResult = useMemo(
    () => calculateEconomicSimulation(currentSnapshot, result?.simulationCost ?? null, result?.parameterSavingPerPiece ?? null, state.economicInputs),
    [currentSnapshot, result, state.economicInputs]
  )
  const story = useMemo(
    () => result && economicResult
      ? createStory(referenceSnapshot, currentSnapshot, referenceCurrent, result.simulationCost, economicResult)
      : null,
    [currentSnapshot, economicResult, referenceCurrent, referenceSnapshot, result]
  )

  if (!simulationSnapshot || !result || !economicResult || !story) {
    return <div role="status" className="py-8 text-sm text-slate-600">Simulation is initializing from Current.</div>
  }

  const actionMenus = (
    <>
      <button
        type="button"
        onClick={() => {
          onResetParameters()
          setTransferError(false)
          setTransferMessage('SIM reset.')
        }}
        className="inline-flex min-h-7 items-center border border-slate-400 bg-white px-2 text-[11px] font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >Reset</button>
      <RoleActionMenu
        label="Clone from"
        onSelect={role => {
          onCloneSource(role)
          setTransferError(false)
          setTransferMessage(`SIM cloned from ${ROLES.find(item => item.role === role)?.label ?? 'dataset'}.`)
        }}
      />
      <RoleActionMenu
        label="Send to"
        onSelect={role => {
          const sent = onSendTo(role, simulationSnapshot)
          setTransferError(!sent)
          setTransferMessage(sent
            ? `SIM sent to ${ROLES.find(item => item.role === role)?.label ?? 'dataset'} Working.`
            : 'Send blocked by Master Data validation.')
        }}
      />
    </>
  )

  return (
    <div className="min-w-0 space-y-3 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-2 xl:space-y-0 xl:overflow-hidden">
      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-[1.8] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-rows-1">
        <SimulationStoryGraph story={story} />
        <div className="grid content-start gap-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <ResultPanel
            currentCost={result.currentCost}
            simulationCost={result.simulationCost}
            actions={actionMenus}
            transferMessage={transferMessage}
            transferError={transferError}
          />
          <EconomicSimulationPanel result={economicResult} draft={state.economicInputs} currentSnapshot={currentSnapshot} onUpdate={onUpdateEconomicInput} />
        </div>
      </div>

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-[minmax(0,1fr)]">
        <SimulationParameterTable
          kind="bom"
          rows={result.records}
          currentSnapshot={currentSnapshot}
          simulationSnapshot={simulationSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onUpdate={onUpdateParameter}
        />
        <SimulationParameterTable
          kind="routing"
          rows={result.records}
          currentSnapshot={currentSnapshot}
          simulationSnapshot={simulationSnapshot}
          workingSelection={workingSelection}
          onToggleWorkingTarget={onToggleWorkingTarget}
          onUpdate={onUpdateParameter}
        />
      </div>
    </div>
  )
}
