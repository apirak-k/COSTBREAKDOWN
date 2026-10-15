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
import type { SimulationParameter, SimulationWorkspaceState } from './simulation-state'

interface SimulationPageProps {
  state: SimulationWorkspaceState
  referenceSnapshot: CostSnapshot
  currentSnapshot: CostSnapshot
  onCloneSource: (role: MasterDataRole) => void
  onSendTo: (role: MasterDataRole, snapshot: CostSnapshot) => boolean
  onUpdateParameter: (recordId: string, parameter: SimulationParameter, value: number | null) => void
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

function displayShare(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${formatNumber(value, 2)}%`
}

function displayParameter(value: number | null, parameter: typeof BOM_PARAMETERS[number] | typeof RTG_PARAMETERS[number]): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const displayValue = value * parameter.scale
  return `${formatNumber(displayValue, parameter.precision)}${parameter.scale === 100 ? '%' : ''}`
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

function EffectCell({ amount, share, showShare = false, label }: {
  amount: number | null | undefined
  share?: number | null
  showShare?: boolean
  label?: string
}) {
  return (
    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
      {label && <span className="block text-[9px] font-sans text-slate-500">{label}</span>}
      <span className="block">{displayMoney(amount ?? null)}</span>
      {showShare && <span className="block text-[10px] text-slate-500">{displayShare(share)}</span>}
    </td>
  )
}

function SimulationParameterTable({
  kind,
  rows,
  currentSnapshot,
  simulationSnapshot,
  onUpdate
}: {
  kind: SimulationRecordKind
  rows: SimulationComparisonRow[]
  currentSnapshot: CostSnapshot
  simulationSnapshot: CostSnapshot
  onUpdate: (recordId: string, parameter: SimulationParameter, value: number | null) => void
}) {
  const isBOM = kind === 'bom'
  const title = isBOM ? 'BOM' : 'RTG'
  const parameters = isBOM ? BOM_PARAMETERS : RTG_PARAMETERS
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const records: Array<{ id: string }> = isBOM ? simulationSnapshot.bom : simulationSnapshot.routing
  const tableRows = rows.filter(row => row.kind === kind)

  return (
    <section className="min-w-0 border border-slate-300 bg-white" aria-labelledby={`${kind}-simulation-title`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <h2 id={`${kind}-simulation-title`} className="text-xs font-semibold text-slate-900">{title} Simulation</h2>
        <span className="text-[10px] text-slate-500">Adjust SIM parameters · structure locked</span>
      </div>
      <div className="max-h-[34rem] overflow-y-auto overflow-x-hidden">
        <table className="hidden w-full table-fixed border-collapse text-[11px] md:table">
          <caption className="sr-only">SIM {isBOM ? 'BOM' : 'Routing'} values with expandable Current to SIM parameter cost effects.</caption>
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[25%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-900 text-[10px] font-semibold text-white">
            <tr>
              <th scope="col" className="px-1 py-2 text-right">#</th>
              <th scope="col" className="px-1 py-2 text-left">{isBOM ? 'BOM' : 'RTG'}</th>
              {parameters.map(parameter => <th key={parameter.parameter} scope="col" className="px-0.5 py-2 text-right">{parameter.label}</th>)}
              <th scope="col" className="px-1 py-2 text-right">{isBOM ? 'Material Cost' : 'Conversion Cost'}</th>
              <th scope="col" className="px-0.5 py-2"><span className="sr-only">Expand effects</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tableRows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">No {title} rows.</td></tr>}
            {tableRows.map((row, index) => {
              const key = `${row.currentRecordId ?? 'missing'}:${row.simulationRecordId ?? 'missing'}:${index}`
              const expanded = expandedRows.has(key)
              const simulationRecord = singleRecord(records, row.simulationRecordId)
              const canEdit = Boolean(simulationRecord && row.status && row.status !== 'REMOVED' && !row.identityIssue)
              const analysis = isBOM
                ? bomAttribution(row, currentSnapshot, simulationSnapshot)
                : routingAttribution(row, currentSnapshot, simulationSnapshot)
              const status = rowStatusText(row)
              const detailParameters = parameters.map(parameter => ({
                ...parameter,
                amount: analysis.effects.effects?.[parameter.effectKey] ?? null
              }))

              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-2 py-2 text-right font-mono text-[10px] tabular-nums text-slate-500">{index + 1}</td>
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
                        <td key={parameter.parameter} className="px-1 py-1.5 text-right">
                          {!simulationRecord ? '—' : canEdit ? (
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
                          ) : displayParameter(recordValue, parameter)}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${row.name} parameter cost effect`}
                        onClick={() => setExpandedRows(previous => {
                          const next = new Set(previous)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })}
                        className="grid h-7 w-7 place-items-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                      >
                        {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" /> : <ChevronRight aria-hidden="true" className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-slate-50/80">
                      <th scope="row" colSpan={2} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700">
                        Parameter Cost Effect
                        {analysis.effects.effects === null && (
                          <span className="mt-0.5 block font-normal text-slate-500">
                            {isBOM
                              ? 'Unavailable for unmatched rows or invalid inputs.'
                              : 'Unavailable when identity, inputs, or Work Center context cannot be reconciled.'}
                          </span>
                        )}
                      </th>
                      {detailParameters.map(parameter => <EffectCell key={parameter.parameter} amount={parameter.amount} />)}
                      <EffectCell
                        label="Total"
                        amount={analysis.effects.effects === null ? null : analysis.effects.totalEffect}
                        share={analysis.effects.effects !== null && analysis.effects.totalEffect !== null && analysis.effects.totalEffect !== 0 ? 100 : null}
                        showShare
                      />
                      <td className="px-1 py-1" aria-hidden="true" />
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="max-h-[34rem] overflow-y-auto md:hidden">
        {tableRows.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">No {title} rows.</p>}
        {tableRows.map((row, index) => {
          const key = `${row.currentRecordId ?? 'missing'}:${row.simulationRecordId ?? 'missing'}:${index}`
          const expanded = expandedRows.has(key)
          const simulationRecord = singleRecord(records, row.simulationRecordId)
          const canEdit = Boolean(simulationRecord && row.status && row.status !== 'REMOVED' && !row.identityIssue)
          const analysis = isBOM
            ? bomAttribution(row, currentSnapshot, simulationSnapshot)
            : routingAttribution(row, currentSnapshot, simulationSnapshot)
          return (
            <article key={key} className="border-b border-slate-200 px-3 py-2.5 last:border-b-0">
              <div className="flex min-w-0 items-start gap-2">
                <span className="pt-0.5 font-mono text-[10px] text-slate-500">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-xs font-medium text-slate-900">{row.name}</h3>
                  <p className={`mt-0.5 text-[9px] ${row.identityIssue ? 'text-amber-800' : 'text-slate-500'}`}>{rowStatusText(row)}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-slate-900">{displayMoney(analysis.simCost)}</span>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Hide' : 'Show'} ${row.name} parameter cost effect`}
                  onClick={() => setExpandedRows(previous => {
                    const next = new Set(previous)
                    if (next.has(key)) next.delete(key)
                    else next.add(key)
                    return next
                  })}
                  className="grid h-7 w-7 shrink-0 place-items-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" /> : <ChevronRight aria-hidden="true" className="h-4 w-4" />}
                </button>
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
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="text-[10px] font-semibold text-slate-700">Parameter Cost Effect</p>
                  {analysis.effects.effects === null ? (
                    <p className="mt-0.5 text-[10px] text-slate-500">Unavailable for unmatched rows, invalid inputs, or unreconciled Work Center context.</p>
                  ) : (
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      {parameters.map(parameter => (
                        <div key={parameter.parameter} className="flex justify-between gap-2">
                          <dt className="text-slate-600">{parameter.label}</dt>
                          <dd className="font-mono tabular-nums text-slate-800">{displayMoney(analysis.effects.effects?.[parameter.effectKey] ?? null)}</dd>
                        </div>
                      ))}
                      <div className="flex justify-between gap-2 border-t border-slate-200 pt-1 font-semibold">
                        <dt className="text-slate-700">Total</dt>
                        <dd className="text-right font-mono tabular-nums text-slate-900">
                          {displayMoney(analysis.effects.totalEffect)}{analysis.effects.totalEffect !== null && analysis.effects.totalEffect !== 0 ? ' · 100%' : ' · —'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
      <p className="border-t border-slate-200 px-3 py-1.5 text-[10px] text-slate-500">
        {isBOM ? 'Material Cost = Usage × Price × (1 + Loss).' : 'Conversion Cost uses Current Work Center rates; rates are fixed in Simulation.'}
        {' '}Effects compare Current → SIM.
      </p>
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
    <section className="min-w-0 border border-slate-300 bg-white px-3 py-2.5" aria-labelledby="simulation-result-title">
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
          <thead className="text-[9px] text-slate-500">
            <tr>
              <th scope="col" className="py-1 text-left font-medium">Cost</th>
              <th scope="col" className="px-1 py-1 text-right font-medium">Current</th>
              <th scope="col" className="px-1 py-1 text-right font-medium">SIM</th>
              <th scope="col" className="px-1 py-1 text-right font-medium">Change</th>
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
                  <th scope="row" className="py-1.5 text-left">{row.label}</th>
                  <td className="px-1 py-1.5 text-right font-mono tabular-nums">{displayMoney(row.current)}</td>
                  <td className="px-1 py-1.5 text-right font-mono tabular-nums">{displayMoney(row.sim)}</td>
                  <td className="px-1 py-1.5 text-right font-mono tabular-nums">{displayMoney(change)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{displayShare(percent)}</td>
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
  referenceSnapshot,
  currentSnapshot,
  onCloneSource,
  onSendTo,
  onUpdateParameter,
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
    <div className="min-w-0 space-y-3">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(370px,1fr)]">
        <SimulationStoryGraph story={story} />
        <div className="grid content-start gap-3">
          <ResultPanel
            currentCost={result.currentCost}
            simulationCost={result.simulationCost}
            actions={actionMenus}
            transferMessage={transferMessage}
            transferError={transferError}
          />
          <EconomicSimulationPanel result={economicResult} draft={state.economicInputs} onUpdate={onUpdateEconomicInput} />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <SimulationParameterTable
          kind="bom"
          rows={result.records}
          currentSnapshot={currentSnapshot}
          simulationSnapshot={simulationSnapshot}
          onUpdate={onUpdateParameter}
        />
        <SimulationParameterTable
          kind="routing"
          rows={result.records}
          currentSnapshot={currentSnapshot}
          simulationSnapshot={simulationSnapshot}
          onUpdate={onUpdateParameter}
        />
      </div>
    </div>
  )
}
