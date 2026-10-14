import {
  calculateRoutingParameterCostEffects,
  calculateSnapshotRoutingDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey,
  safeAdd
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../../core'

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
  detailId?: string
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

/**
 * Emits detail lines into the Candidate table's existing tbody. Routing rate
 * attribution remains in the calculation helper, while the visible grid stays
 * on Manning, Capacity, Yield, and the total Candidate Gap.
 */
export function RoutingRecordDetails({ row, referenceRates, currentRates, detailId }: RoutingRecordDetailsProps) {
  const { reference, current, finding } = row
  const referenceRate = matchingRate(reference, referenceRates)
  const currentRate = matchingRate(current, currentRates)
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateRoutingParameterCostEffects(effectInput(reference, referenceRate), effectInput(current, currentRate))
    : null
  const conversionEffects = effect?.status === 'available' ? effect.effects.conversion : null
  const parameterEffectGap = conversionEffects
    ? safeAdd(conversionEffects.manning, conversionEffects.capacity, conversionEffects.yield)
    : null
  const rateEffectGap = conversionEffects
    ? safeAdd(conversionEffects.laborRate, conversionEffects.burdenRate)
    : null
  const parameterRows = [
    {
      label: 'Reference',
      manning: reference?.manning ?? null,
      capacity: reference?.capacity ?? null,
      yield: reference?.yield ?? null,
      cost: reference ? row.referenceConversion : null
    },
    {
      label: 'Current',
      manning: current?.manning ?? null,
      capacity: current?.capacity ?? null,
      yield: current?.yield ?? null,
      cost: current ? row.currentConversion : null
    },
    {
      label: 'Parameter Effect',
      manning: conversionEffects?.manning ?? null,
      capacity: conversionEffects?.capacity ?? null,
      yield: conversionEffects?.yield ?? null,
      cost: parameterEffectGap,
      effect: true,
      emphasis: true
    },
    {
      label: 'Rate Effect',
      manning: null,
      capacity: null,
      yield: null,
      cost: rateEffectGap,
      effect: true
    }
  ]

  return <>
    {parameterRows.map((item, index) => <tr
      key={item.label}
      id={index === 0 ? detailId : undefined}
      className={item.emphasis ? 'border-b border-slate-200 bg-slate-100 font-semibold' : item.effect ? 'border-b border-slate-200 bg-slate-50 font-medium' : index === 0 ? 'border-t border-slate-200 bg-slate-50/80' : 'bg-slate-50/80'}
    >
      <td aria-hidden="true" className="px-2 py-1.5" />
      <th scope="row" className="truncate border-l-2 border-slate-300 px-2.5 py-1.5 text-left font-sans font-medium text-slate-700">{item.label}</th>
      <td aria-hidden="true" className="px-2.5 py-1.5" />
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.manning, value => formatVariance(value, 4)) : formatNullable(item.manning, value => formatNumber(value, 4))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.capacity, value => formatVariance(value, 4)) : formatNullable(item.capacity, value => formatNumber(value, 4))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.yield, value => formatVariance(value, 4)) : formatNullable(item.yield, value => formatPercent(value, 2))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.cost, value => formatVariance(value, 4)) : formatNullable(item.cost, value => formatNumber(value, 4))}</td>
      <td aria-hidden="true" className="px-2.5 py-1.5" />
      <td aria-hidden="true" className="px-1 py-1.5" />
      <td aria-hidden="true" className="px-1 py-1.5" />
    </tr>)}
  </>
}
