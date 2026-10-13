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
import { ComparisonFieldDetails } from './ComparisonFieldDetails'

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
}

const formatNullable = (value: number | null | undefined, format: (value: number) => string) =>
  value === null || value === undefined ? '—' : format(value)

export function getBOMComparisonLabel(finding: ComparisonFinding): ComparisonStatus | null {
  return getComparisonStatusLabels(finding)[0] ?? null
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

export function BOMRecordDetails({ row }: BOMRecordDetailsProps) {
  const { reference, current, finding } = row
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateBOMParameterCostEffects(
        { usage: reference?.consumption ?? null, price: reference?.price ?? null, loss: reference?.loss ?? null },
        { usage: current?.consumption ?? null, price: current?.price ?? null, loss: current?.loss ?? null }
      )
    : null
  const effects = effect?.status === 'available' ? effect.effects : null
  const effectRows = [
    { label: 'Usage', reference: reference?.consumption ?? null, current: current?.consumption ?? null, effect: effects?.usage ?? null, format: (value: number) => formatNumber(value, 4) },
    { label: 'Price', reference: reference?.price ?? null, current: current?.price ?? null, effect: effects?.price ?? null, format: (value: number) => formatNumber(value, 4) },
    { label: 'Loss', reference: reference?.loss ?? null, current: current?.loss ?? null, effect: effects?.loss ?? null, format: (value: number) => formatPercent(value, 2) }
  ]

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <caption className="sr-only">Changed BOM parameter values and cost effects aligned by parameter</caption>
          <thead>
            <tr className="bg-slate-100 text-[11px] font-semibold text-slate-700">
              <th scope="col" className="px-2.5 py-1.5">Parameter</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">REF</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">CUR</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">EFFECT · THB/pc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {effectRows.map(item => <tr key={item.label}>
              <th scope="row" className="px-2.5 py-1.5 text-left font-sans font-medium text-slate-700">{item.label}</th>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(item.reference, item.format)}</td>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(item.current, item.format)}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect === null ? '—' : formatVariance(item.effect, 4)}</td>
            </tr>)}
            <tr className="bg-slate-50 font-semibold">
              <th scope="row" className="px-2.5 py-1.5 text-left font-sans text-slate-800">Cost Gap</th>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.referenceCost, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.currentCost, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{formatNullable(row.gap, value => formatVariance(value, 4))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ description: 'Name' }} hiddenFields={['unit']} />}

    </div>
  )
}
