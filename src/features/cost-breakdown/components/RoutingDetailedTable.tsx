import {
  calculateRoutingParameterCostEffects,
  calculateSnapshotRoutingDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey,
  resolveSnapshotRoutingRate,
  isMasterDataNumericValueValid
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

function validFactorValue(
  field: 'manning' | 'capacity' | 'yield' | 'laborRate' | 'burdenRate',
  value: number | null | undefined
): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && isMasterDataNumericValueValid(field, value)
    ? value
    : null
}

function formatReferenceCurrent(
  field: 'manning' | 'capacity' | 'yield' | 'laborRate' | 'burdenRate',
  reference: number | null | undefined,
  current: number | null | undefined,
  format: (value: number) => string
): string {
  const referenceValue = validFactorValue(field, reference)
  const currentValue = validFactorValue(field, current)
  if (referenceValue === null || currentValue === null) return '—'
  if (referenceValue === currentValue) return format(referenceValue)
  return `${format(referenceValue)} → ${format(currentValue)}`
}

/**
 * Emits the Before → After and combined additive LMDI attribution rows
 * directly into the Candidate table's shared column grid.
 */
export function RoutingRecordDetails({ row, referenceRates, currentRates, detailId }: RoutingRecordDetailsProps) {
  const { reference, current, finding } = row
  const referenceRate = resolveSnapshotRoutingRate(reference, referenceRates)
  const currentRate = resolveSnapshotRoutingRate(current, currentRates)
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateRoutingParameterCostEffects(effectInput(reference, referenceRate), effectInput(current, currentRate))
    : null
  const conversionEffects = effect?.status === 'available' ? effect.effects.conversion : null
  const parameterValues = [
    {
      field: 'manning' as const,
      reference: reference?.manning,
      current: current?.manning,
      effect: conversionEffects?.manning,
      format: (value: number) => formatNumber(value, 2),
      effectFormat: (value: number) => formatVariance(value, 2)
    },
    {
      field: 'capacity' as const,
      reference: reference?.capacity,
      current: current?.capacity,
      effect: conversionEffects?.capacity,
      format: (value: number) => formatNumber(value, 2),
      effectFormat: (value: number) => formatVariance(value, 2)
    },
    {
      field: 'yield' as const,
      reference: reference?.yield,
      current: current?.yield,
      effect: conversionEffects?.yield,
      format: (value: number) => formatPercent(value, 2),
      effectFormat: (value: number) => formatVariance(value, 2)
    },
    {
      field: 'laborRate' as const,
      reference: referenceRate?.laborRate,
      current: currentRate?.laborRate,
      effect: conversionEffects?.laborRate,
      format: (value: number) => formatNumber(value, 2),
      effectFormat: (value: number) => formatVariance(value, 2)
    },
    {
      field: 'burdenRate' as const,
      reference: referenceRate?.burdenRate,
      current: currentRate?.burdenRate,
      effect: conversionEffects?.burdenRate,
      format: (value: number) => formatNumber(value, 2),
      effectFormat: (value: number) => formatVariance(value, 2)
    }
  ]

  const renderDetailRow = (label: string, effectRow: boolean, id?: string) => <tr
    key={label}
    id={id}
    className={effectRow
      ? 'border-b border-slate-200 bg-white font-bold text-slate-950'
      : 'border-t border-slate-200 bg-white font-normal text-slate-600'}
  >
    <td aria-hidden="true" className="px-1 py-1.5" />
    <th scope="row" className={`truncate px-2.5 py-1.5 text-left font-sans ${effectRow ? 'font-bold' : 'font-normal'}`}><span className="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">{label}</span></th>
    <td aria-hidden="true" className="px-2 py-1.5" />
    {parameterValues.map(item => <td key={item.field} className="whitespace-nowrap px-1 py-1.5 text-right">
      {effectRow
        ? formatNullable(item.effect ?? null, item.effectFormat)
        : formatReferenceCurrent(item.field, item.reference, item.current, item.format)}
    </td>)}
    <td className={`whitespace-nowrap px-1 py-1.5 text-right ${effectRow ? 'font-mono tabular-nums' : ''}`}>
      {effectRow ? formatNullable(row.conversionGap, value => formatVariance(value, 2)) : ''}
    </td>
    <td aria-hidden="true" className="px-2 py-1.5" />
    <td aria-hidden="true" className="px-1 py-1.5" />
    <td aria-hidden="true" className="px-1 py-1.5" />
  </tr>

  return <>
    {renderDetailRow('Before → After', false, detailId)}
    {renderDetailRow('Parameter Cost Effect', true)}
  </>
}
