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
  standardCostGap: number | null
  laborGap: number | null
  burdenGap: number | null
  conversionGap: number | null
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

function ratio(numerator: number | null, denominator: number | null): string {
  return numerator === null || denominator === null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0
    ? '—'
    : formatPercent(numerator / denominator, 2)
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
  { key: 'manning', label: 'Manning' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'yield', label: 'Yield' },
  { key: 'laborRate', label: 'Labor Rate' },
  { key: 'burdenRate', label: 'Burden Rate' }
] as const

export function RoutingRecordDetails({ row, referenceRates, currentRates, standardCostGap, laborGap, burdenGap, conversionGap }: RoutingRecordDetailsProps) {
  const { reference, current, finding } = row
  const referenceRate = matchingRate(reference, referenceRates)
  const currentRate = matchingRate(current, currentRates)
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateRoutingParameterCostEffects(effectInput(reference, referenceRate), effectInput(current, currentRate))
    : null
  const rows = effect?.status === 'available' ? FACTORS.map(({ key, label }) => ({
    key,
    label,
    labor: effect.effects.labor[key],
    burden: effect.effects.burden[key],
    conversion: effect.effects.conversion[key]
  })) : []
  const conversionGapValue = row.conversionGap

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <caption className="sr-only">Routing parameters and snapshot-specific Work Center rates</caption>
          <thead><tr className="bg-slate-100 text-[11px] font-semibold text-slate-700"><th scope="col" className="px-2.5 py-1.5">Parameter</th><th scope="col" className="px-2.5 py-1.5 text-right">Reference</th><th scope="col" className="px-2.5 py-1.5 text-right">Current</th></tr></thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Work Center</th><td className="px-2.5 py-1.5 text-right">{reference?.workCenterId || '—'}</td><td className="px-2.5 py-1.5 text-right">{current?.workCenterId || '—'}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Manning</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.manning, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.manning, value => formatNumber(value, 4))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Capacity</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.capacity, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.capacity, value => formatNumber(value, 4))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Yield</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.yield, value => formatPercent(value, 2))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.yield, value => formatPercent(value, 2))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Labor Rate</th><td className="px-2.5 py-1.5 text-right">{formatNullable(referenceRate?.laborRate, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(currentRate?.laborRate, value => formatNumber(value, 4))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Burden Rate</th><td className="px-2.5 py-1.5 text-right">{formatNullable(referenceRate?.burdenRate, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(currentRate?.burdenRate, value => formatNumber(value, 4))}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[11px]">
          <caption className="sr-only">Reference, Current, and gap for labor, burden, and conversion with total and parent percentages</caption>
          <thead><tr className="bg-slate-100 font-semibold text-slate-700"><th scope="col" className="px-2 py-1.5">Cost element</th><th scope="col" className="px-2 py-1.5 text-right">Reference</th><th scope="col" className="px-2 py-1.5 text-right">Current</th><th scope="col" className="px-2 py-1.5 text-right">Gap</th><th scope="col" className="px-2 py-1.5 text-right">% Total</th><th scope="col" className="px-2 py-1.5 text-right">% Parent</th></tr></thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            <CostRow label="Labor" reference={row.referenceLaborCost} current={row.currentLaborCost} gap={row.laborGap} standardCostGap={standardCostGap} parentGap={laborGap} />
            <CostRow label="Burden" reference={row.referenceBurdenCost} current={row.currentBurdenCost} gap={row.burdenGap} standardCostGap={standardCostGap} parentGap={burdenGap} />
            <CostRow label="Conversion" reference={row.referenceConversion} current={row.currentConversion} gap={conversionGapValue} standardCostGap={standardCostGap} parentGap={conversionGap} />
          </tbody>
        </table>
      </div>

      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ processName: 'Process', workCenterId: 'Work Center' }} />}

      {isMatchedChange && (
        <section aria-label="Routing Parameter Cost Effect" className="border-t border-slate-200 pt-2">
          <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
            <h4 className="text-xs font-semibold text-slate-900">Parameter Cost Effect</h4>
            <span className="text-[11px] text-slate-500">Calculated using LMDI</span>
          </div>
          {effect?.status === 'available' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-[11px]">
                <caption className="sr-only">Labor, burden, and conversion parameter effects by factor</caption>
                <thead><tr className="bg-slate-100 font-semibold text-slate-700"><th scope="col" rowSpan={2} className="px-2 py-1.5">Factor</th><th scope="colgroup" colSpan={3} className="border-l border-slate-300 px-2 py-1.5 text-center">Labor</th><th scope="colgroup" colSpan={3} className="border-l border-slate-300 px-2 py-1.5 text-center">Burden</th><th scope="colgroup" colSpan={3} className="border-l border-slate-300 px-2 py-1.5 text-center">Conversion</th></tr><tr className="bg-slate-100 font-medium text-slate-600"><th scope="col" className="border-l border-slate-300 px-2 py-1">Effect</th><th scope="col" className="px-2 py-1">% Parent</th><th scope="col" className="px-2 py-1">% Total</th><th scope="col" className="border-l border-slate-300 px-2 py-1">Effect</th><th scope="col" className="px-2 py-1">% Parent</th><th scope="col" className="px-2 py-1">% Total</th><th scope="col" className="border-l border-slate-300 px-2 py-1">Effect</th><th scope="col" className="px-2 py-1">% Parent</th><th scope="col" className="px-2 py-1">% Total</th></tr></thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {rows.map(item => <tr key={item.key}><th scope="row" className="px-2 py-1.5 font-sans font-medium text-slate-700">{item.label}</th><EffectCells value={item.labor} parentGap={row.laborGap} standardCostGap={standardCostGap} /><EffectCells value={item.burden} parentGap={row.burdenGap} standardCostGap={standardCostGap} /><EffectCells value={item.conversion} parentGap={row.conversionGap} standardCostGap={standardCostGap} /></tr>)}
                  <tr className="bg-slate-50 font-semibold"><th scope="row" className="px-2 py-1.5 font-sans text-slate-800">Total</th><EffectCells value={row.laborGap} parentGap={row.laborGap} standardCostGap={standardCostGap} /><EffectCells value={row.burdenGap} parentGap={row.burdenGap} standardCostGap={standardCostGap} /><EffectCells value={row.conversionGap} parentGap={row.conversionGap} standardCostGap={standardCostGap} /></tr>
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-slate-600">Unavailable</p>}
        </section>
      )}
    </div>
  )
}

function CostRow({ label, reference, current, gap, standardCostGap, parentGap }: { label: string; reference: number | null; current: number | null; gap: number | null; standardCostGap: number | null; parentGap: number | null }) {
  return <tr><th scope="row" className="px-2 py-1.5 font-sans font-medium text-slate-700">{label}</th><td className="px-2 py-1.5 text-right">{formatNullable(reference, value => formatNumber(value, 4))}</td><td className="px-2 py-1.5 text-right">{formatNullable(current, value => formatNumber(value, 4))}</td><td className="px-2 py-1.5 text-right">{formatNullable(gap, value => formatVariance(value, 4))}</td><td className="px-2 py-1.5 text-right">{ratio(gap, standardCostGap)}</td><td className="px-2 py-1.5 text-right">{ratio(gap, parentGap)}</td></tr>
}

function EffectCells({ value, parentGap, standardCostGap }: { value: number | null; parentGap: number | null; standardCostGap: number | null }) {
  return <><td className="border-l border-slate-200 px-2 py-1.5 text-right">{formatNullable(value, item => formatVariance(item, 4))}</td><td className="px-2 py-1.5 text-right">{ratio(value, parentGap)}</td><td className="px-2 py-1.5 text-right">{ratio(value, standardCostGap)}</td></>
}
