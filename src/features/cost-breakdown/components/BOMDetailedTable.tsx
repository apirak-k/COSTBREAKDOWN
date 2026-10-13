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
  const parameterRows = [
    { label: 'REF', usage: reference?.consumption ?? null, price: reference?.price ?? null, loss: reference?.loss ?? null, cost: row.referenceCost },
    { label: 'CUR', usage: current?.consumption ?? null, price: current?.price ?? null, loss: current?.loss ?? null, cost: row.currentCost },
    { label: 'EFFECT', usage: effects?.usage ?? null, price: effects?.price ?? null, loss: effects?.loss ?? null, cost: row.gap, effect: true }
  ]

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <caption className="sr-only">Changed BOM REF, CUR, and EFFECT values by Usage, Price, Loss, and Cost Gap</caption>
          <thead>
            <tr className="bg-slate-100 text-[11px] font-semibold text-slate-700">
              <th scope="col" className="px-2.5 py-1.5">Comparison</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Usage</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Price</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Loss</th>
              <th scope="col" className="px-2.5 py-1.5 text-right">Cost Gap · THB/pc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {parameterRows.map(item => <tr key={item.label} className={item.effect ? 'bg-slate-50 font-semibold' : ''}>
              <th scope="row" className="px-2.5 py-1.5 text-left font-sans text-slate-800">{item.label}</th>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.usage, value => formatVariance(value, 4)) : formatNullable(item.usage, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.price, value => formatVariance(value, 4)) : formatNullable(item.price, value => formatNumber(value, 4))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.loss, value => formatVariance(value, 4)) : formatNullable(item.loss, value => formatPercent(value, 2))}</td>
              <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.cost, value => formatVariance(value, 4)) : formatNullable(item.cost, value => formatNumber(value, 4))}</td>
            </tr>)}
          </tbody>
        </table>
      </div>

      {finding && <ComparisonFieldDetails finding={finding} fieldLabelOverrides={{ description: 'Name' }} hiddenFields={['unit']} />}

    </div>
  )
}
