import {
  calculateRoutingParameterCostEffects,
  calculateSnapshotRoutingDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'
import { ComparisonFieldDetails } from './ComparisonFieldDetails'

export interface RoutingItemizedRow {
  key: string
  finding?: ComparisonFinding
  reference?: SnapshotRoutingStep
  current?: SnapshotRoutingStep
  referenceLaborCost: number | null
  currentLaborCost: number | null
  laborGap: number | null
  referenceBurdenCost: number | null
  currentBurdenCost: number | null
  burdenGap: number | null
  referenceConversion: number | null
  currentConversion: number | null
  conversionGap: number | null
}

interface RoutingRecordDetailsProps {
  row: RoutingItemizedRow
  referenceRates: SnapshotWorkCenterRate[]
  currentRates: SnapshotWorkCenterRate[]
}

const formatNullable = (value: number | null | undefined, format: (value: number) => string) =>
  value === null || value === undefined ? '—' : format(value)

export function getRoutingComparisonLabels(finding: ComparisonFinding): ComparisonStatus[] {
  return getComparisonStatusLabels(finding)
}

function normalized(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function matchingRate(step: SnapshotRoutingStep | undefined, rates: SnapshotWorkCenterRate[]): SnapshotWorkCenterRate | undefined {
  if (!step?.workCenterId) return undefined
  const matches = rates.filter(rate => normalized(rate.workCenterCode) === normalized(step.workCenterId))
  return matches.length === 1 ? matches[0] : undefined
}

function comparisonValues(
  finding: ComparisonFinding | undefined,
  reference: SnapshotRoutingStep | undefined,
  current: SnapshotRoutingStep | undefined,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
) {
  if (finding) {
    const effect = finding.costEffect
    return effect
      ? {
          referenceLaborCost: effect.reference.labor,
          currentLaborCost: effect.current.labor,
          laborGap: effect.gap.labor,
          referenceBurdenCost: effect.reference.burden,
          currentBurdenCost: effect.current.burden,
          burdenGap: effect.gap.burden,
          referenceConversion: effect.reference.total,
          currentConversion: effect.current.total,
          conversionGap: effect.gap.total
        }
      : {
          referenceLaborCost: null, currentLaborCost: null, laborGap: null,
          referenceBurdenCost: null, currentBurdenCost: null, burdenGap: null,
          referenceConversion: null, currentConversion: null, conversionGap: null
        }
  }

  const detail = calculateSnapshotRoutingDetail({ reference, current }, referenceRates, currentRates)
  const laborGap = detail.referenceLaborCost === null || detail.currentLaborCost === null ? null : detail.currentLaborCost - detail.referenceLaborCost
  const burdenGap = detail.referenceBurdenCost === null || detail.currentBurdenCost === null ? null : detail.currentBurdenCost - detail.referenceBurdenCost
  return {
    referenceLaborCost: detail.referenceLaborCost,
    currentLaborCost: detail.currentLaborCost,
    laborGap,
    referenceBurdenCost: detail.referenceBurdenCost,
    currentBurdenCost: detail.currentBurdenCost,
    burdenGap,
    referenceConversion: detail.referenceTotal,
    currentConversion: detail.currentTotal,
    conversionGap: detail.totalGap
  }
}

export function buildRoutingItemizedRows(
  referenceItems: SnapshotRoutingStep[],
  currentItems: SnapshotRoutingStep[],
  findings: ComparisonFinding[],
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): RoutingItemizedRow[] {
  const referenceById = new Map(referenceItems.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )

  const currentRows = currentItems.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const detail = comparisonValues(finding, reference, current, referenceRates, currentRates)
    return {
      key: finding ? getComparisonFindingKey('routing', finding) : `routing:${current.id}`,
      finding,
      reference,
      current,
      ...detail
    }
  })
  const referenceOnlyRows = findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => {
      const reference = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      const detail = comparisonValues(finding, reference, undefined, referenceRates, currentRates)
      return { key: getComparisonFindingKey('routing', finding), finding, reference, ...detail }
    })

  return [...currentRows, ...referenceOnlyRows]
}

function effectInput(step: SnapshotRoutingStep | undefined, rate: SnapshotWorkCenterRate | undefined) {
  return {
    manning: step?.manning ?? null,
    capacity: step?.capacity ?? null,
    yield: step?.yield ?? null,
    laborRate: rate?.laborRate ?? null,
    burdenRate: rate?.burdenRate ?? null
  }
}

export function RoutingRecordDetails({ row, referenceRates, currentRates }: RoutingRecordDetailsProps) {
  const { reference, current, finding } = row
  const referenceRate = matchingRate(reference, referenceRates)
  const currentRate = matchingRate(current, currentRates)
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateRoutingParameterCostEffects(effectInput(reference, referenceRate), effectInput(current, currentRate))
    : null
  const conversionEffects = effect?.status === 'available' ? effect.effects.conversion : null
  const parameterRows = [
    { label: 'REF', manning: reference?.manning ?? null, capacity: reference?.capacity ?? null, yield: reference?.yield ?? null, cost: row.referenceConversion },
    { label: 'CUR', manning: current?.manning ?? null, capacity: current?.capacity ?? null, yield: current?.yield ?? null, cost: row.currentConversion },
    { label: 'EFFECT', manning: conversionEffects?.manning ?? null, capacity: conversionEffects?.capacity ?? null, yield: conversionEffects?.yield ?? null, cost: row.conversionGap, effect: true }
  ]
  const workCenterChanged = normalized(reference?.workCenterId) !== normalized(current?.workCenterId)
  const laborRateChanged = referenceRate?.laborRate !== currentRate?.laborRate
  const burdenRateChanged = referenceRate?.burdenRate !== currentRate?.burdenRate
  const hasRateContext = laborRateChanged || burdenRateChanged
  const hasCalculationContext = workCenterChanged || hasRateContext

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <caption className="sr-only">Changed Routing REF, CUR, and EFFECT values by Manning, Capacity, Yield, and Cost Gap</caption>
          <thead><tr className="bg-slate-100 text-[11px] font-semibold text-slate-700"><th scope="col" className="px-2.5 py-1.5">Comparison</th><th scope="col" className="px-2.5 py-1.5 text-right">Manning</th><th scope="col" className="px-2.5 py-1.5 text-right">Capacity</th><th scope="col" className="px-2.5 py-1.5 text-right">Yield</th><th scope="col" className="px-2.5 py-1.5 text-right">Cost Gap · THB/pc</th></tr></thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {parameterRows.map(item => <tr key={item.label} className={item.effect ? 'bg-slate-50 font-semibold' : ''}>
              <th scope="row" className="px-2.5 py-1.5 text-left font-sans text-slate-800">{item.label}</th>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.manning, value => formatVariance(value, 4)) : formatNullable(item.manning, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.capacity, value => formatVariance(value, 4)) : formatNullable(item.capacity, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.yield, value => formatVariance(value, 4)) : formatNullable(item.yield, value => formatPercent(value, 2))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.cost, value => formatVariance(value, 4)) : formatNullable(item.cost, value => formatNumber(value, 4))}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      {hasCalculationContext && <section aria-label="Routing calculation context" className="border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
        <h3 className="mb-1 font-sans font-semibold text-slate-700">Calculation context</h3>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
          {workCenterChanged && <>
            <dt className="font-medium">Work Center</dt>
            <dd className="font-mono text-slate-800">{reference?.workCenterId || '—'} → {current?.workCenterId || '—'}</dd>
          </>}
          {laborRateChanged && <>
            <dt className="font-medium">Labor Rate</dt>
            <dd className="font-mono tabular-nums text-slate-800">{formatNullable(referenceRate?.laborRate, value => formatNumber(value, 4))} → {formatNullable(currentRate?.laborRate, value => formatNumber(value, 4))} <span className="ml-2 font-sans text-slate-500">Effect {formatNullable(conversionEffects?.laborRate ?? null, value => formatVariance(value, 4))}</span></dd>
          </>}
          {burdenRateChanged && <>
            <dt className="font-medium">Burden Rate</dt>
            <dd className="font-mono tabular-nums text-slate-800">{formatNullable(referenceRate?.burdenRate, value => formatNumber(value, 4))} → {formatNullable(currentRate?.burdenRate, value => formatNumber(value, 4))} <span className="ml-2 font-sans text-slate-500">Effect {formatNullable(conversionEffects?.burdenRate ?? null, value => formatVariance(value, 4))}</span></dd>
          </>}
        </dl>
        <p className="mt-1 text-slate-500">Rate and Work Center values remain calculation context; their effects are included in the primary conversion cost gap.</p>
      </section>}
      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ processName: 'Process', workCenterId: 'Work Center' }} hiddenFields={['workCenterId']} />}
    </div>
  )
}
