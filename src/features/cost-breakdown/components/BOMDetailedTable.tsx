import {
  calculateBOMParameterCostEffects,
  calculateSnapshotBOMDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus, SnapshotBOMItem } from '../../../core'
import { ConfidenceBadge } from '../../../shared/ui/ConfidenceBadge'
import { ComparisonFieldDetails } from './ComparisonFieldDetails'
import { DataQualityPairBadge } from './DataQualityPairBadge'

export interface BOMItemizedRow {
  key: string
  finding?: ComparisonFinding
  reference?: SnapshotBOMItem
  current?: SnapshotBOMItem
  referenceCost: number | null
  currentCost: number | null
  gap: number | null
}

interface BOMRecordDetailsProps {
  row: BOMItemizedRow
  standardCostGap: number | null
}

const formatNullable = (value: number | null | undefined, format: (value: number) => string) =>
  value === null || value === undefined ? '—' : format(value)

export function getBOMComparisonLabel(finding: ComparisonFinding): ComparisonStatus | null {
  return getComparisonStatusLabels(finding)[0] ?? null
}

function ratio(numerator: number, denominator: number | null): string {
  return !Number.isFinite(numerator) || denominator === null || !Number.isFinite(denominator) || denominator === 0
    ? '—'
    : formatPercent(numerator / denominator, 2)
}

function comparisonValues(finding: ComparisonFinding | undefined, reference?: SnapshotBOMItem, current?: SnapshotBOMItem) {
  if (!finding) return calculateSnapshotBOMDetail({ reference, current })
  const effect = finding.costEffect
  return effect
    ? { referenceCost: effect.reference.material, currentCost: effect.current.material, costGap: effect.gap.material }
    : { referenceCost: null, currentCost: null, costGap: null }
}

export function buildBOMItemizedRows(
  referenceItems: SnapshotBOMItem[],
  currentItems: SnapshotBOMItem[],
  findings: ComparisonFinding[]
): BOMItemizedRow[] {
  const referenceById = new Map(referenceItems.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )

  const currentRows = currentItems.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const detail = comparisonValues(finding, reference, current)
    return {
      key: finding ? getComparisonFindingKey('bom', finding) : `bom:${current.id}`,
      finding,
      reference,
      current,
      referenceCost: detail.referenceCost,
      currentCost: detail.currentCost,
      gap: detail.costGap
    }
  })
  const referenceOnlyRows = findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => {
      const reference = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      const detail = comparisonValues(finding, reference)
      return {
        key: getComparisonFindingKey('bom', finding),
        finding,
        reference,
        referenceCost: detail.referenceCost,
        currentCost: detail.currentCost,
        gap: detail.costGap
      }
    })

  return [...currentRows, ...referenceOnlyRows]
}

export function BOMRecordDetails({ row, standardCostGap }: BOMRecordDetailsProps) {
  const { reference, current, finding } = row
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateBOMParameterCostEffects(
        { usage: reference?.consumption ?? null, price: reference?.price ?? null, loss: reference?.loss ?? null },
        { usage: current?.consumption ?? null, price: current?.price ?? null, loss: current?.loss ?? null }
      )
    : null
  const effectRows = effect?.status === 'available'
    ? [
        { label: 'Usage', value: effect.effects.usage },
        { label: 'Price', value: effect.effects.price },
        { label: 'Loss', value: effect.effects.loss }
      ]
    : []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="font-semibold text-slate-600">Data quality</span>
        <DataQualityPairBadge reference={reference} current={current} />
        <span className="font-semibold text-slate-600">Confidence</span>
        <ConfidenceBadge status={finding?.confidence ?? 'missing'} showLabel />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-xs">
          <caption className="sr-only">BOM parameters by Reference and Current</caption>
          <thead>
            <tr className="bg-slate-100 text-[11px] font-semibold text-slate-700">
              <th scope="col" className="px-2.5 py-1.5">Parameter</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Reference</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Current</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Usage</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.consumption, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.consumption, value => formatNumber(value, 4))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Unit</th><td className="px-2.5 py-1.5 text-right">{reference?.unit || '—'}</td><td className="px-2.5 py-1.5 text-right">{current?.unit || '—'}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Price</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.price, value => formatNumber(value, 4))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.price, value => formatNumber(value, 4))}</td></tr>
            <tr><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">Loss</th><td className="px-2.5 py-1.5 text-right">{formatNullable(reference?.loss, value => formatPercent(value, 2))}</td><td className="px-2.5 py-1.5 text-right">{formatNullable(current?.loss, value => formatPercent(value, 2))}</td></tr>
          </tbody>
        </table>
      </div>

      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ description: 'Name' }} />}

      {isMatchedChange && (
        <section aria-label="BOM Parameter Cost Effect" className="border-t border-slate-200 pt-2">
          <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
            <h4 className="text-xs font-semibold text-slate-900">Parameter Cost Effect</h4>
            <span className="text-[11px] text-slate-500">Calculated using LMDI</span>
          </div>
          {effect?.status === 'available' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[11px]">
                <caption className="sr-only">BOM cost effect by parameter</caption>
                <thead><tr className="bg-slate-100 font-semibold text-slate-700"><th scope="col" className="px-2.5 py-1.5">Parameter</th><th scope="col" className="px-2.5 py-1.5 text-right">Effect · THB/pc</th><th scope="col" className="px-2.5 py-1.5 text-right">% Parent</th><th scope="col" className="px-2.5 py-1.5 text-right">% Total</th></tr></thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {effectRows.map(item => <tr key={item.label}><th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">{item.label}</th><td className="px-2.5 py-1.5 text-right">{formatVariance(item.value, 4)}</td><td className="px-2.5 py-1.5 text-right">{ratio(item.value, row.gap)}</td><td className="px-2.5 py-1.5 text-right">{ratio(item.value, standardCostGap)}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-slate-600">Unavailable</p>}
        </section>
      )}
    </div>
  )
}
