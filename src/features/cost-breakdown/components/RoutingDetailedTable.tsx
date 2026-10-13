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

const FACTORS = [
  { key: 'manning', label: 'Manning', format: (value: number) => formatNumber(value, 4) },
  { key: 'capacity', label: 'Capacity', format: (value: number) => formatNumber(value, 4) },
  { key: 'yield', label: 'Yield', format: (value: number) => formatPercent(value, 2) },
  { key: 'laborRate', label: 'Labor Rate', format: (value: number) => formatNumber(value, 4) },
  { key: 'burdenRate', label: 'Burden Rate', format: (value: number) => formatNumber(value, 4) }
] as const

export function RoutingRecordDetails({ row, referenceRates, currentRates }: RoutingRecordDetailsProps) {
  const { reference, current, finding } = row
  const referenceRate = matchingRate(reference, referenceRates)
  const currentRate = matchingRate(current, currentRates)
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateRoutingParameterCostEffects(effectInput(reference, referenceRate), effectInput(current, currentRate))
    : null
  const parameterValues = {
    manning: { reference: reference?.manning ?? null, current: current?.manning ?? null },
    capacity: { reference: reference?.capacity ?? null, current: current?.capacity ?? null },
    yield: { reference: reference?.yield ?? null, current: current?.yield ?? null },
    laborRate: { reference: referenceRate?.laborRate ?? null, current: currentRate?.laborRate ?? null },
    burdenRate: { reference: referenceRate?.burdenRate ?? null, current: currentRate?.burdenRate ?? null }
  }

  return (
    <div className="space-y-3">
      {(reference?.workCenterId || current?.workCenterId) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <span>REF Work Center <strong className="font-mono text-slate-800">{reference?.workCenterId || '—'}</strong></span>
        <span>CUR Work Center <strong className="font-mono text-slate-800">{current?.workCenterId || '—'}</strong></span>
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <caption className="sr-only">Changed Routing parameter and Work Center rate values with Reference, Current, and conversion cost effect</caption>
          <thead><tr className="bg-slate-100 text-[11px] font-semibold text-slate-700"><th scope="col" className="px-2.5 py-1.5">Parameter</th><th scope="col" className="px-2.5 py-1.5 text-right">REF</th><th scope="col" className="px-2.5 py-1.5 text-right">CUR</th><th scope="col" className="px-2.5 py-1.5 text-right">EFFECT · THB/pc</th></tr></thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {FACTORS.map(({ key, label, format }) => {
              const values = parameterValues[key]
              const value = effect?.status === 'available' ? effect.effects.conversion[key] : null
              return <tr key={key}>
                <th scope="row" className="px-2.5 py-1.5 text-left font-sans font-medium text-slate-700">{label}</th>
                <td className="px-2.5 py-1.5 text-right">{formatNullable(values.reference, format)}</td>
                <td className="px-2.5 py-1.5 text-right">{formatNullable(values.current, format)}</td>
                <td className="px-2.5 py-1.5 text-right">{formatNullable(value, amount => formatVariance(amount, 4))}</td>
              </tr>
            })}
            <tr className="bg-slate-50 font-semibold">
              <th scope="row" className="px-2.5 py-1.5 text-left font-sans text-slate-800">Cost Gap</th>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.referenceConversion, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.currentConversion, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.conversionGap, value => formatVariance(value, 4))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">EFFECT uses the existing Routing cost calculation. A dash means the value is unavailable.</p>
      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ processName: 'Process', workCenterId: 'Work Center' }} />}
    </div>
  )
}
