import React from 'react'
import {
  calculateSnapshotRoutingDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonFindingKey
} from '../../../core'
import type {
  ComparisonFinding,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  WorkCenterProcessingFinding
} from '../../../core'
import { isVisibleInComparisonView } from './comparison-view'
import type { ComparisonViewMode } from './comparison-view'

type RouteSide = 'reference' | 'current'

interface RoutingDisplayRow {
  finding?: ComparisonFinding
  reference?: SnapshotRoutingStep
  current?: SnapshotRoutingStep
  movedSide?: RouteSide
  movedWorkCenter?: string
  selectionOwner: boolean
}

interface ProcessingGroup {
  key: string
  workCenterCode: string
  description: string
  finding?: WorkCenterProcessingFinding
  routingRows: RoutingDisplayRow[]
}

interface RouteCostDetail {
  referenceRuntime: number | null
  currentRuntime: number | null
  referenceLaborCost: number | null
  currentLaborCost: number | null
  referenceBurdenCost: number | null
  currentBurdenCost: number | null
  referenceConversion: number | null
  currentConversion: number | null
}

interface RateContextRow {
  key: string
  workCenterCode: string
  description: string
  reference?: SnapshotWorkCenterRate
  current?: SnapshotWorkCenterRate
  sideLabel?: string
}

interface WorkCenterProcessingTableProps {
  referenceRouting: SnapshotRoutingStep[]
  currentRouting: SnapshotRoutingStep[]
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
  routingFindings: ComparisonFinding[]
  processingFindings: WorkCenterProcessingFinding[]
  viewMode: ComparisonViewMode
  selectionMode?: boolean
  selectedFindingKeys?: Set<string>
  onToggleFinding?: (key: string) => void
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function workCenterKey(value: string | undefined): string {
  return normalizeKey(value) || '__unassigned__'
}

function formatNullable(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value)
}

function costGapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function statusClass(status: ReturnType<typeof getCanonicalComparisonStatus>): string {
  if (status === 'CHANGED') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'ADDED') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'REMOVED') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatInputPair(
  reference: SnapshotRoutingStep | undefined,
  current: SnapshotRoutingStep | undefined,
  field: 'manning' | 'capacity' | 'yield',
  formatter: (value: number) => string
): string {
  const referenceValue = reference?.[field] ?? null
  const currentValue = current?.[field] ?? null
  return `${formatNullable(referenceValue, formatter)} → ${formatNullable(currentValue, formatter)}`
}

function matchingRate(step: SnapshotRoutingStep | undefined, rates: SnapshotWorkCenterRate[]): SnapshotWorkCenterRate | undefined {
  if (!step?.workCenterId) return undefined
  const matches = rates.filter(rate => normalizeKey(rate.workCenterCode) === normalizeKey(step.workCenterId))
  return matches.length === 1 ? matches[0] : undefined
}

function buildRouteCostDetail(
  row: RoutingDisplayRow,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): RouteCostDetail {
  const detail = calculateSnapshotRoutingDetail(
    { reference: row.reference, current: row.current },
    referenceRates,
    currentRates
  )

  if (row.reference && row.current) {
    return {
      referenceRuntime: detail.referenceRuntime,
      currentRuntime: detail.currentRuntime,
      referenceLaborCost: detail.referenceLaborCost,
      currentLaborCost: detail.currentLaborCost,
      referenceBurdenCost: detail.referenceBurdenCost,
      currentBurdenCost: detail.currentBurdenCost,
      referenceConversion: detail.referenceTotal,
      currentConversion: detail.currentTotal
    }
  }

  const status = getCanonicalComparisonStatus(row.finding)
  const knownAbsentReference = row.movedSide === 'current' || status === 'ADDED'
  const knownAbsentCurrent = row.movedSide === 'reference' || status === 'REMOVED'

  return {
    referenceRuntime: row.reference ? detail.referenceRuntime : null,
    currentRuntime: row.current ? detail.currentRuntime : null,
    referenceLaborCost: row.reference ? detail.referenceLaborCost : knownAbsentReference ? 0 : null,
    currentLaborCost: row.current ? detail.currentLaborCost : knownAbsentCurrent ? 0 : null,
    referenceBurdenCost: row.reference ? detail.referenceBurdenCost : knownAbsentReference ? 0 : null,
    currentBurdenCost: row.current ? detail.currentBurdenCost : knownAbsentCurrent ? 0 : null,
    referenceConversion: row.reference ? detail.referenceTotal : knownAbsentReference ? 0 : null,
    currentConversion: row.current ? detail.currentTotal : knownAbsentCurrent ? 0 : null
  }
}

function buildRateContextRows(
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): RateContextRow[] {
  const referenceByCode = new Map<string, SnapshotWorkCenterRate[]>()
  const currentByCode = new Map<string, SnapshotWorkCenterRate[]>()

  referenceRates.forEach(rate => {
    const key = workCenterKey(rate.workCenterCode)
    referenceByCode.set(key, [...(referenceByCode.get(key) ?? []), rate])
  })
  currentRates.forEach(rate => {
    const key = workCenterKey(rate.workCenterCode)
    currentByCode.set(key, [...(currentByCode.get(key) ?? []), rate])
  })

  const keys = new Set([...referenceByCode.keys(), ...currentByCode.keys()])
  const rows: RateContextRow[] = []

  keys.forEach(key => {
    const reference = referenceByCode.get(key) ?? []
    const current = currentByCode.get(key) ?? []
    if (reference.length <= 1 && current.length <= 1) {
      const referenceRate = reference[0]
      const currentRate = current[0]
      rows.push({
        key,
        workCenterCode: currentRate?.workCenterCode ?? referenceRate?.workCenterCode ?? '—',
        description: currentRate?.description ?? referenceRate?.description ?? '—',
        reference: referenceRate,
        current: currentRate
      })
      return
    }

    reference.forEach(rate => rows.push({
      key: `${key}:reference:${rate.id}`,
      workCenterCode: rate.workCenterCode || '—',
      description: rate.description || '—',
      reference: rate,
      sideLabel: 'Reference'
    }))
    current.forEach(rate => rows.push({
      key: `${key}:current:${rate.id}`,
      workCenterCode: rate.workCenterCode || '—',
      description: rate.description || '—',
      current: rate,
      sideLabel: 'Current'
    }))
  })

  return rows
}

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({
  referenceRouting,
  currentRouting,
  referenceRates,
  currentRates,
  routingFindings,
  processingFindings,
  viewMode,
  selectionMode = false,
  selectedFindingKeys,
  onToggleFinding
}) => {
  const referenceById = new Map(referenceRouting.map(step => [step.id, step]))
  const currentById = new Map(currentRouting.map(step => [step.id, step]))
  const groupsByKey = new Map<string, ProcessingGroup>()

  const ensureGroup = (key: string, workCenterCode: string, description: string): ProcessingGroup => {
    const existing = groupsByKey.get(key)
    if (existing) {
      if (existing.description === '—' && description !== '—') existing.description = description
      return existing
    }
    const group: ProcessingGroup = { key, workCenterCode, description, routingRows: [] }
    groupsByKey.set(key, group)
    return group
  }

  processingFindings.forEach(finding => {
    const key = workCenterKey(finding.workCenterCode)
    const group = ensureGroup(key, finding.workCenterCode || '—', finding.workCenterDescription || '—')
    group.finding = finding
  })

  const addRouteRow = (step: SnapshotRoutingStep | undefined, side: RouteSide, row: RoutingDisplayRow) => {
    if (!step) return
    const key = workCenterKey(step.workCenterId)
    const rate = matchingRate(step, side === 'reference' ? referenceRates : currentRates)
    const group = ensureGroup(key, step.workCenterId || 'Unassigned Work Center', rate?.description || '—')
    group.routingRows.push(row)
  }

  routingFindings.forEach(finding => {
    if (!isVisibleInComparisonView(finding, viewMode)) return
    const reference = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
    const current = finding.currentId ? currentById.get(finding.currentId) : undefined

    if (reference && current && workCenterKey(reference.workCenterId) !== workCenterKey(current.workCenterId)) {
      addRouteRow(reference, 'reference', {
        finding,
        reference,
        movedSide: 'reference',
        movedWorkCenter: current.workCenterId || 'Unassigned Work Center',
        selectionOwner: false
      })
      addRouteRow(current, 'current', {
        finding,
        current,
        movedSide: 'current',
        movedWorkCenter: reference.workCenterId || 'Unassigned Work Center',
        selectionOwner: true
      })
      return
    }

    if (reference) addRouteRow(reference, 'reference', { finding, reference, current, selectionOwner: true })
    else if (current) addRouteRow(current, 'current', { finding, current, selectionOwner: true })
  })

  const groups = Array.from(groupsByKey.values()).filter(group =>
    group.routingRows.length > 0 || isVisibleInComparisonView(group.finding, viewMode)
  )
  const rateContextRows = buildRateContextRows(referenceRates, currentRates)

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div>
        <h3 className="font-sans text-sm font-semibold text-slate-900">Processing cost by Work Center</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">
          Work Center totals use each side&apos;s full Routing and rates. The status filter applies to findings and Routing Process detail; it does not change WC totals. One-to-one process matching is not required for WC Net Gap.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <caption className="sr-only">Processing cost aggregated by Work Center, with Routing Process detail</caption>
          <thead>
            <tr className="bg-slate-800 text-xs font-semibold text-white">
              <th scope="col" className="p-2.5">Work Center</th>
              <th scope="col" className="p-2.5">Status</th>
              <th scope="col" className="p-2.5 text-right">Reference processing cost (THB/pc)</th>
              <th scope="col" className="p-2.5 text-right">Current processing cost (THB/pc)</th>
              <th scope="col" className="p-2.5 text-right">WC Net Gap (THB/pc)</th>
            </tr>
          </thead>
          {groups.length === 0 ? (
            <tbody>
              <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">No processing rows match this comparison view.</td></tr>
            </tbody>
          ) : groups.map(group => {
            const effect = group.finding?.costEffect
            const status = getCanonicalComparisonStatus(group.finding)
            const visibleProcessCount = group.routingRows.length

            return (
              <tbody key={group.key} className="border-t border-slate-200">
                <tr className="bg-white">
                  <th scope="row" className="p-2.5 font-semibold text-slate-900">
                    <span className="block">{group.workCenterCode}</span>
                    {group.description !== '—' && <span className="mt-0.5 block font-sans text-[11px] font-normal text-slate-500">{group.description}</span>}
                  </th>
                  <td className="p-2.5">
                    {status && status !== 'UNCHANGED'
                      ? <span className={`inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-bold ${statusClass(status)}`}>{status}</span>
                      : <span aria-label={status === 'UNCHANGED' ? 'Unchanged' : undefined}>—</span>}
                  </td>
                  <td className="p-2.5 text-right font-mono tabular-nums text-slate-700">{formatNullable(effect?.reference.total ?? null, value => formatNumber(value, 4))}</td>
                  <td className="p-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">{formatNullable(effect?.current.total ?? null, value => formatNumber(value, 4))}</td>
                  <td className={`p-2.5 text-right font-mono font-semibold tabular-nums ${costGapClass(effect?.gap.total ?? null)}`}>
                    {formatNullable(effect?.gap.total ?? null, value => formatVariance(value, 4))}
                  </td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td colSpan={5} className="px-2.5 pb-2.5">
                    <details>
                      <summary className="cursor-pointer py-1 text-[11px] font-medium text-slate-700 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                        Routing Process details ({visibleProcessCount})
                      </summary>
                      {visibleProcessCount === 0 ? (
                        <p className="py-3 text-center text-[11px] italic text-slate-500">No Routing Process rows match this comparison view.</p>
                      ) : (
                        <RoutingProcessDetailTable
                          rows={group.routingRows}
                          referenceRates={referenceRates}
                          currentRates={currentRates}
                          selectionMode={selectionMode}
                          selectedFindingKeys={selectedFindingKeys}
                          onToggleFinding={onToggleFinding}
                        />
                      )}
                    </details>
                  </td>
                </tr>
              </tbody>
            )
          })}
        </table>
      </div>

      <details className="border-t border-slate-200 pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-800 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          Work Center rate context ({rateContextRows.length})
        </summary>
        <div className="mt-2 w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <caption className="sr-only">All Reference and Current Work Center rates retained as calculation context</caption>
            <thead>
              <tr className="bg-slate-800 text-xs font-semibold text-white">
                <th scope="col" className="p-2.5">Work Center</th>
                <th scope="col" className="p-2.5">Side</th>
                <th scope="col" className="p-2.5">Description</th>
                <th scope="col" className="p-2.5 text-right">Labor Rate · Ref / Current</th>
                <th scope="col" className="p-2.5 text-right">Burden Rate · Ref / Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rateContextRows.length === 0 ? (
                <tr><td colSpan={5} className="p-5 text-center font-sans italic text-slate-500">No Work Center rates configured.</td></tr>
              ) : rateContextRows.map(row => (
                <tr key={row.key}>
                  <th scope="row" className="p-2.5 font-semibold text-slate-900">{row.workCenterCode}</th>
                  <td className="p-2.5 font-sans text-slate-600">{row.sideLabel ?? 'Reference / Current'}</td>
                  <td className="p-2.5 font-sans text-slate-700">{row.description}</td>
                  <td className="p-2.5 text-right tabular-nums text-slate-700">
                    {formatNullable(row.reference?.laborRate ?? null, value => formatNumber(value, 4))} / {formatNullable(row.current?.laborRate ?? null, value => formatNumber(value, 4))}
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-slate-700">
                    {formatNullable(row.reference?.burdenRate ?? null, value => formatNumber(value, 4))} / {formatNullable(row.current?.burdenRate ?? null, value => formatNumber(value, 4))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

interface RoutingProcessDetailTableProps {
  rows: RoutingDisplayRow[]
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
  selectionMode: boolean
  selectedFindingKeys?: Set<string>
  onToggleFinding?: (key: string) => void
}

function RoutingProcessDetailTable({
  rows,
  referenceRates,
  currentRates,
  selectionMode,
  selectedFindingKeys,
  onToggleFinding
}: RoutingProcessDetailTableProps) {
  return (
    <div className="mt-2 w-full overflow-x-auto">
      <table className="w-full min-w-[1320px] text-left text-[11px]">
        <caption className="sr-only">Routing Process input, Work Center rates, and labor, burden, and conversion costs by Reference and Current</caption>
        <thead>
          <tr className="bg-slate-700 font-semibold text-white">
            {selectionMode && <th scope="col" className="p-2">Include</th>}
            <th scope="col" className="p-2">Process</th>
            <th scope="col" className="p-2">Status</th>
            <th scope="col" className="p-2">Routing inputs · Ref → Current</th>
            <th scope="col" className="p-2">WC rates · Ref → Current</th>
            <th scope="col" className="p-2">Labor cost · THB/pc</th>
            <th scope="col" className="p-2">Burden cost · THB/pc</th>
            <th scope="col" className="p-2">Conversion · THB/pc</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row, index) => {
            const status = getCanonicalComparisonStatus(row.finding)
            const findingKey = row.finding ? getComparisonFindingKey('routing', row.finding) : null
            const canSelect = Boolean(row.finding && status && findingKey && row.selectionOwner)
            const detail = buildRouteCostDetail(row, referenceRates, currentRates)
            const referenceRate = matchingRate(row.reference, referenceRates)
            const currentRate = matchingRate(row.current, currentRates)
            const processName = row.current?.processName ?? row.reference?.processName ?? '—'

            return (
              <tr key={`${findingKey ?? 'routing'}:${row.movedSide ?? 'paired'}:${index}`} className="align-top">
                {selectionMode && (
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(canSelect && findingKey && selectedFindingKeys?.has(findingKey))}
                      disabled={!canSelect}
                      onChange={() => { if (canSelect && findingKey) onToggleFinding?.(findingKey) }}
                      aria-label={`Include ${processName} in Selected Comparison`}
                      title={canSelect ? 'Include this Routing finding in Selected Comparison' : 'This finding has no comparable business identity'}
                      className="h-4 w-4 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                    />
                  </td>
                )}
                <th scope="row" className="p-2 font-medium text-slate-900">
                  <span className="block">{processName}</span>
                  {row.movedWorkCenter && <span className="mt-1 block font-sans text-[11px] font-normal text-slate-500">Moved {row.movedSide === 'reference' ? 'to' : 'from'} {row.movedWorkCenter}</span>}
                </th>
                <td className="p-2">
                  {status && status !== 'UNCHANGED'
                    ? <span className={`inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-bold ${statusClass(status)}`}>{status}</span>
                    : <span aria-label={status === 'UNCHANGED' ? 'Unchanged' : undefined}>—</span>}
                </td>
                <td className="p-2 font-mono tabular-nums text-slate-700">
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5">
                    <dt className="text-slate-500">Manning</dt><dd>{formatInputPair(row.reference, row.current, 'manning', value => formatNumber(value, 2))}</dd>
                    <dt className="text-slate-500">Capacity</dt><dd>{formatInputPair(row.reference, row.current, 'capacity', value => formatNumber(value, 2))}</dd>
                    <dt className="text-slate-500">Yield</dt><dd>{formatInputPair(row.reference, row.current, 'yield', value => formatPercent(value, 2))}</dd>
                    <dt className="text-slate-500">Factor</dt><dd>{formatNullable(detail.referenceRuntime, value => formatNumber(value, 6))} → {formatNullable(detail.currentRuntime, value => formatNumber(value, 6))}</dd>
                  </dl>
                </td>
                <td className="p-2 font-mono tabular-nums text-slate-700">
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5">
                    <dt className="text-slate-500">Labor</dt><dd>{formatNullable(referenceRate?.laborRate ?? null, value => formatNumber(value, 4))} → {formatNullable(currentRate?.laborRate ?? null, value => formatNumber(value, 4))}</dd>
                    <dt className="text-slate-500">Burden</dt><dd>{formatNullable(referenceRate?.burdenRate ?? null, value => formatNumber(value, 4))} → {formatNullable(currentRate?.burdenRate ?? null, value => formatNumber(value, 4))}</dd>
                  </dl>
                </td>
                <CostEffectCell reference={detail.referenceLaborCost} current={detail.currentLaborCost} />
                <CostEffectCell reference={detail.referenceBurdenCost} current={detail.currentBurdenCost} />
                <CostEffectCell reference={detail.referenceConversion} current={detail.currentConversion} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CostEffectCell({ reference, current }: { reference: number | null; current: number | null }) {
  const gap = current === null || reference === null ? null : current - reference
  return (
    <td className="p-2 font-mono tabular-nums">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-slate-500">Ref</dt><dd className="text-right text-slate-600">{formatNullable(reference, value => formatNumber(value, 4))}</dd>
        <dt className="text-slate-500">Current</dt><dd className="text-right font-semibold text-slate-900">{formatNullable(current, value => formatNumber(value, 4))}</dd>
        <dt className="text-slate-500">Gap</dt><dd className={`text-right font-semibold ${costGapClass(gap)}`}>{formatNullable(gap, value => formatVariance(value, 4))}</dd>
      </dl>
    </td>
  )
}
